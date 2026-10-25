// PostHog integration (runs ALONGSIDE GA4 + Mixpanel — see analytics.ts /
// mixpanel.ts). Same consent architecture as Task #232:
//  - ZERO pre-consent footprint: posthog-js is loaded via DYNAMIC import only
//    after the visitor accepts the analytics consent banner (the shared
//    localStorage gate in getAnalyticsConsent). Belt-and-braces: init passes
//    opt_out_capturing_by_default:true and only opts in post-consent.
//  - "All features" enabled: autocapture, SPA pageview/pageleave tracking,
//    session replay (with all inputs masked), exception capture, feature
//    flags, surveys, heatmaps, web vitals.
//  - Revocation: optOutPosthog() opts out at the SDK level AND hard-disables
//    the app-side dispatcher; in-session re-grant re-enables + re-identifies.
//  - Privacy: session replay masks ALL text inputs; no query strings are sent
//    on manual events (URLs can carry sensitive tokens).
import type { PostHog } from 'posthog-js';
import type { IdentityUser } from './analytics-sdk-options';
import { vendorSdksAllowed } from './analytics';
import { getAcquisition } from './acquisition';

const getKey = (): string | undefined =>
  import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const getHost = (): string =>
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  'https://us.i.posthog.com';

let ph: PostHog | null = null;
// Post-consent options chunk, loaded together with the SDK (set before ph).
let sdkOptions: typeof import('./analytics-sdk-options') | null = null;
let initStarted = false;
let disabled = false;

// Events accepted before the SDK is ready (init under way, or consent already
// granted and the post-paint init not started yet). Flushed once the SDK
// loads; cleared on revoke.
const MAX_PENDING_EVENTS = 100;
let pending: Array<{ name: string; props: Record<string, unknown> }> = [];

// Idempotent, consent-gated init. Called at module load from main.tsx and by
// the consent banner right after "Accept".
export const initPosthog = () => {
  if (typeof window === 'undefined') return;
  if (!vendorSdksAllowed()) return;

  if (initStarted) {
    // Re-grant after an in-session revoke.
    if (disabled) {
      disabled = false;
      if (ph) {
        try {
          if (ph.has_opted_out_capturing()) ph.opt_in_capturing();
          ph.startSessionRecording();
        } catch {
          // ignore
        }
        applyPendingIdentity();
      }
    }
    return;
  }

  const key = getKey();
  if (!key) {
    if (import.meta.env.DEV) console.warn('Missing VITE_POSTHOG_KEY — PostHog disabled');
    return;
  }

  initStarted = true;
  disabled = false;
  // SDK options (incl. the URL scrubber) ship in a post-consent chunk too.
  Promise.all([import('posthog-js'), import('./analytics-sdk-options')])
    .then(([{ default: posthog }, options]) => {
      if (disabled) {
        // Consent revoked while the SDK was loading — abort WITHOUT leaving
        // initStarted latched, so a later re-grant can re-run init from
        // scratch (otherwise ph stays null forever until reload).
        initStarted = false;
        return;
      }
      sdkOptions = options;
      posthog.init(key, options.posthogInitOptions(getHost()));
      if (posthog.has_opted_out_capturing()) {
        posthog.opt_in_capturing();
      }
      ph = posthog;
      // DEV-only: expose the instance for debugging/E2E assertions (the npm
      // build doesn't attach itself to window like the CDN snippet does).
      if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).posthog = posthog;
      applyPendingIdentity();
      const flush = pending;
      pending = [];
      flush.forEach(({ name, props }) => phCapture(name, props));
    })
    .catch(() => {
      initStarted = false; // allow retry on transient load failure
    });
};

// Consent revoked after a prior grant.
export const optOutPosthog = () => {
  disabled = true;
  pending = [];
  identifiedUserId = null;
  if (!ph) return;
  try {
    ph.stopSessionRecording();
    ph.opt_out_capturing();
  } catch {
    // Never let analytics teardown break the UI.
  }
};

const safePath = (): string | undefined =>
  typeof window !== 'undefined' ? window.location.pathname : undefined;

// PostHog half of the shared dispatcher (analytics-dispatch.ts is the only
// caller; props arrive already cleaned). Autocapture/pageviews are handled by
// the SDK itself.
export const phCapture = (name: string, props: Record<string, unknown> = {}) => {
  if (disabled) return;
  // Page context is read now, so a buffered event keeps the page it fired on.
  const merged: Record<string, unknown> = {
    platform: 'web',
    page_path: safePath(),
    ...props,
  };
  if (!ph) {
    // Never buffer before consent, after Decline, or while suppressed.
    if (vendorSdksAllowed() && pending.length < MAX_PENDING_EVENTS) {
      pending.push({ name, props: merged });
    }
    return;
  }
  try {
    ph.capture(name, merged);
  } catch {
    // Analytics must never break the app.
  }
};

// ---------------------------------------------------------------------------
// Identity (called from useAuth — login/session restore/logout)
// ---------------------------------------------------------------------------

let identifiedUserId: string | null = null;


let lastIdentity: IdentityUser | null = null;

const applyIdentity = (user: IdentityUser) => {
  if (!ph || disabled) return;
  if (identifiedUserId === user.id) return;
  identifiedUserId = user.id;
  try {
    // Identify by immutable DB id (never email); anonymous events merge in.
    // Person properties stay PII-minimal (see posthogPersonProps).
    ph.identify(user.id, sdkOptions?.posthogPersonProps(user, getAcquisition()));
  } catch {
    // ignore
  }
};

const applyPendingIdentity = () => {
  if (lastIdentity) applyIdentity(lastIdentity);
};

export const phIdentify = (user: IdentityUser) => {
  lastIdentity = user;
  applyIdentity(user);
};

export const phReset = () => {
  identifiedUserId = null;
  lastIdentity = null;
  if (!ph) return;
  try {
    ph.reset();
  } catch {
    // ignore
  }
};
