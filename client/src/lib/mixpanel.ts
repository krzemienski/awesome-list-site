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
//    search_performed). Tracking plan + shared catalog: docs/ANALYTICS.md.
//  - App code never calls mpTrack directly: custom events go through the
//    typed helpers in analytics.ts → the shared dispatcher
//    (analytics-dispatch.ts), which cleans properties and fans out to GA4,
//    Mixpanel, PostHog and Amplitude.
import type { OverridedMixpanel } from 'mixpanel-browser';
import type { IdentityUser } from './analytics-sdk-options';
import { vendorSdksAllowed } from './analytics';
import { getAcquisition } from './acquisition';

const getToken = (): string | undefined =>
  import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;

// The SDK instance, present only after consented init. All helpers no-op
// while null.
let mp: OverridedMixpanel | null = null;
// Post-consent options chunk, loaded together with the SDK (set before mp).
let sdkOptions: typeof import('./analytics-sdk-options') | null = null;
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
  if (!vendorSdksAllowed()) return;

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
  // SDK options ship in a post-consent chunk with the SDK.
  Promise.all([import('mixpanel-browser'), import('./analytics-sdk-options')])
    .then(([{ default: mixpanel }, options]) => {
      if (disabled) {
        // Consent revoked while the SDK was loading — abort without latching
        // initStarted, so a later re-grant re-runs init (ph/mp otherwise stay
        // null until reload).
        initStarted = false;
        return;
      }
      sdkOptions = options;
      mixpanel.init(token, options.mixpanelInitOptions);
      // The visitor has consented (gate above) — enable tracking. Only call
      // opt_in when actually opted out: opt_in_tracking() fires an `$opt_in`
      // event every time, which would add noise on every page load.
      if (mixpanel.has_opted_out_tracking()) {
        mixpanel.opt_in_tracking({ track_properties: autoUrlOverrides() });
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

// Privacy helper: never send query strings (tokens live there).
const safePath = (): string | undefined =>
  typeof window !== 'undefined' ? window.location.pathname : undefined;

// The SDK auto-adds $current_url (full href, query + fragment) and $referrer
// (full referrer URL) to every event. Event properties override them, so each
// send replaces both with origin + path / origin only.
const autoUrlOverrides = (): Record<string, unknown> => {
  if (typeof window === 'undefined') return {};
  const overrides: Record<string, unknown> = {
    $current_url: window.location.origin + window.location.pathname,
  };
  try {
    if (document.referrer) overrides.$referrer = new URL(document.referrer).origin;
  } catch {
    // Malformed referrer: let the blank SDK default stand.
  }
  return overrides;
};

// Mixpanel half of the shared dispatcher (analytics-dispatch.ts is the only
// caller; props arrive already cleaned). PostHog and Amplitude receive the
// same event from the dispatcher, each behind its own consent gate.
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
    ...autoUrlOverrides(),
    ...props,
  };
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
    if (sdkOptions) mp.people.set(sdkOptions.mixpanelPeopleProps(user, getAcquisition()));
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

// ---------------------------------------------------------------------------
// Server-side conversion tracking support (Task #233)
// ---------------------------------------------------------------------------
// The two critical conversion events (sign_up_completed, resource_submitted)
// are emitted SERVER-side from the Express handlers that confirm them, so ad
// blockers can't undercount them. The client's job is only to signal consent
// (same localStorage gate as the SDKs) and pass its current Mixpanel
// distinct_id so server events land on the same profile. Attach these headers
// to the register / resource-submit requests. Empty object = no consent =
// server tracks nothing.
export const serverConversionHeaders = (): Record<string, string> => {
  if (!vendorSdksAllowed()) return {};
  const headers: Record<string, string> = { 'x-analytics-consent': 'granted' };
  if (mp && !disabled) {
    try {
      const id = mp.get_distinct_id();
      if (id) headers['x-mixpanel-distinct-id'] = String(id);
    } catch {
      // fall through — server falls back to the DB user id
    }
  }
  // First-touch acquisition (utm_* + referrer_domain, already PII-free and
  // value-capped in acquisition.ts). The server merges these onto the two
  // conversion events so they keep "where did this user come from" context.
  // Size-capped: skip if serialization is unexpectedly huge (defensive; the
  // server re-validates independently).
  try {
    const acquisition = getAcquisition();
    if (Object.keys(acquisition).length > 0) {
      const json = JSON.stringify(acquisition);
      if (json.length <= 1024) headers['x-mixpanel-acquisition'] = json;
    }
  } catch {
    // acquisition is best-effort — never block the conversion request
  }
  return headers;
};

// Task #307: primeOidcAnalyticsConsent (Task #235's OIDC-redirect consent
// bridge) was removed with the Replit OIDC flow — Clerk sign-ups are counted
// server-side at JIT provisioning, gated by the standard consent cookie.
