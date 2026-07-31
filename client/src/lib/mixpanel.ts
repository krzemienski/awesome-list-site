// Mixpanel integration (runs ALONGSIDE GA4 — see client/src/lib/analytics.ts).
//
// Design (mirrors the GA4 consent architecture, Task #232):
//  - Consent-gated with ZERO pre-consent footprint: the mixpanel-browser SDK
//    is loaded via DYNAMIC import only after the visitor explicitly accepts
//    the analytics consent banner (same localStorage gate GA uses via
//    getAnalyticsConsent). Pre-consent, no SDK code executes at all — no
//    module side effects, no cookies, no network. Belt-and-braces: init also
//    passes opt_out_tracking_by_default:true and only opts in post-consent.
//  - Revocation: optOutMixpanel() is called when a previously-granted visitor
//    flips to "denied" via Cookie settings; it opts out at the SDK level AND
//    hard-disables the app-side dispatcher (defense in depth).
//  - Privacy: page_path is sent WITHOUT the query string (URLs can carry
//    sensitive tokens, e.g. /reset-password?token=...); referrer is reduced
//    to its origin. No PII in event properties (no emails/passwords/tokens/
//    raw copied text). People properties ($name/$email/role) are set
//    deliberately on identify.
//  - Naming convention: snake_case object_action (resource_viewed,
//    search_performed). Tracking plan: docs/MIXPANEL.md — add new events there.
import type { OverridedMixpanel } from 'mixpanel-browser';
import { getAnalyticsConsent } from './analytics';
import { getAcquisition } from './acquisition';

const getToken = (): string | undefined =>
  import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;

// The SDK instance, present only after consented init. All helpers no-op
// while null.
let mp: OverridedMixpanel | null = null;
let initStarted = false;
let disabled = false; // set on consent revoke — hard-stops the dispatcher

// Events tracked between init start and SDK load resolve would otherwise be
// dropped (the dynamic import takes a few ms); buffer and flush them.
let pending: Array<{ name: string; props: Record<string, unknown> }> = [];

// Idempotent, consent-gated init. Called at module-load time from main.tsx
// (alongside initGA) and again by the consent banner right after "Accept".
// Fire-and-forget: the SDK loads asynchronously; early events are buffered.
export const initMixpanel = () => {
  if (typeof window === 'undefined') return;
  if (getAnalyticsConsent() !== 'granted') return;

  // Re-grant after an in-session revoke (Cookie settings supports flipping the
  // decision without a reload): the SDK is already loaded/initialized — just
  // re-enable the dispatcher and opt back in.
  if (initStarted) {
    if (disabled) {
      disabled = false;
      if (mp) {
        try {
          if (mp.has_opted_out_tracking()) mp.opt_in_tracking();
        } catch {
          // ignore
        }
        applyPendingIdentity();
      }
      // If the import is still in flight, its .then() sees disabled=false and
      // completes setup normally.
    }
    return;
  }

  const token = getToken();
  if (!token) {
    if (import.meta.env.DEV) console.warn('Missing VITE_MIXPANEL_TOKEN — Mixpanel disabled');
    return;
  }

  initStarted = true;
  disabled = false;
  // Dynamic import — the SDK's module code (which registers globals as a side
  // effect) must not run pre-consent.
  import('mixpanel-browser')
    .then(({ default: mixpanel }) => {
      if (disabled) return; // consent revoked while the SDK was loading
      mixpanel.init(token, {
        // EU/CA compliance: nothing is tracked unless explicitly opted in below.
        opt_out_tracking_by_default: true,
        // Default api host (api-js.mixpanel.com) is allowlisted in the server
        // CSP connect-src (server/index.ts).
        debug: import.meta.env.DEV,
        // Page views are fired manually from use-analytics (single source
        // shared with GA4) so SPA route changes are counted exactly once.
        track_pageview: false,
        persistence: 'localStorage',
      });
      // The visitor has consented (gate above) — enable tracking. Only call
      // opt_in when actually opted out: opt_in_tracking() fires an `$opt_in`
      // event every time, which would add noise on every page load.
      if (mixpanel.has_opted_out_tracking()) {
        mixpanel.opt_in_tracking();
      }
      mp = mixpanel;
      // Identity first (so buffered events attach to the right profile), then
      // events queued while the chunk was loading.
      applyPendingIdentity();
      const flush = pending;
      pending = [];
      flush.forEach(({ name, props }) => mpTrack(name, props));
    })
    .catch(() => {
      initStarted = false; // allow a later retry (e.g. transient load failure)
    });
};

// Consent revoked after a prior grant: stop tracking and drop stored state.
export const optOutMixpanel = () => {
  disabled = true;
  pending = [];
  identifiedUserId = null;
  if (!mp) return;
  try {
    mp.opt_out_tracking(); // also clears the SDK's persisted state
  } catch {
    // Never let analytics teardown break the UI.
  }
};

// Privacy helpers: never send query strings (tokens live there) or full
// referrer URLs.
const safePath = (): string | undefined =>
  typeof window !== 'undefined' ? window.location.pathname : undefined;

const referrerOrigin = (): string | undefined => {
  if (typeof document === 'undefined' || !document.referrer) return undefined;
  try {
    return new URL(document.referrer).origin;
  } catch {
    return undefined;
  }
};

// Central dispatcher — every Mixpanel event funnels through here.
export const mpTrack = (name: string, props: Record<string, unknown> = {}) => {
  if (disabled) return;
  if (!mp) {
    // SDK still loading (or never consented). Buffer only when init is under
    // way; otherwise drop — pre-consent events must never be queued.
    if (initStarted) pending.push({ name, props });
    return;
  }
  const merged: Record<string, unknown> = {
    platform: 'web',
    page_path: safePath(),
    ...props,
  };
  Object.keys(merged).forEach((k) => {
    if (merged[k] === undefined || merged[k] === null) delete merged[k];
  });
  try {
    mp.track(name, merged);
  } catch {
    // Analytics must never break the app.
  }
};

// ---------------------------------------------------------------------------
// Identity management (called from useAuth — login/session restore/logout)
// ---------------------------------------------------------------------------

let identifiedUserId: string | null = null;

type IdentityUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  createdAt?: string | Date | null;
};

// Latest known identity. Kept even while the SDK is loading or consent is
// revoked so that (a) session-restore identify isn't dropped during the
// dynamic import, and (b) an in-session revoke → re-grant re-identifies
// without waiting for another auth render. Cleared only on logout (mpReset).
let lastIdentity: IdentityUser | null = null;

const applyIdentity = (user: IdentityUser) => {
  if (!mp || disabled) return;
  if (identifiedUserId === user.id) return; // avoid re-identify churn per render
  identifiedUserId = user.id;
  try {
    // Identify by immutable DB id (never email — emails change and fragment
    // profiles). Anonymous pre-login events merge into this identity.
    mp.identify(user.id);
    // Deliberate people properties (profile, not event, data).
    const people: Record<string, unknown> = {
      role: user.role ?? 'user',
      ...getAcquisition(),
    };
    if (user.name) people.$name = user.name;
    if (user.email) people.$email = user.email;
    if (user.createdAt) people.$created = new Date(user.createdAt).toISOString();
    mp.people.set(people);
  } catch {
    // ignore
  }
};

// Called once the SDK becomes ready (init resolve) or tracking is re-enabled
// (consent re-grant) to sync the buffered identity.
const applyPendingIdentity = () => {
  if (lastIdentity) applyIdentity(lastIdentity);
};

export const mpIdentify = (user: IdentityUser) => {
  lastIdentity = user; // always remember — applied when/if the SDK is ready
  applyIdentity(user);
};

export const mpReset = () => {
  identifiedUserId = null;
  lastIdentity = null;
  if (!mp) return;
  try {
    mp.reset();
  } catch {
    // ignore
  }
};

// Referrer origin is exposed for trackPageView (analytics.ts) so page_viewed
// carries attribution without leaking full referrer URLs.
export const mpReferrerOrigin = referrerOrigin;
