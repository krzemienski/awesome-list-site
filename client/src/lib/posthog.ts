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
import { getAnalyticsConsent } from './analytics';
import { getAcquisition } from './acquisition';

const getKey = (): string | undefined =>
  import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const getHost = (): string =>
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  'https://us.i.posthog.com';

let ph: PostHog | null = null;
let initStarted = false;
let disabled = false;

let pending: Array<{ name: string; props: Record<string, unknown> }> = [];

// Idempotent, consent-gated init. Called at module load from main.tsx and by
// the consent banner right after "Accept".
export const initPosthog = () => {
  if (typeof window === 'undefined') return;
  if (getAnalyticsConsent() !== 'granted') return;

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
  import('posthog-js')
    .then(({ default: posthog }) => {
      if (disabled) {
        // Consent revoked while the SDK was loading — abort WITHOUT leaving
        // initStarted latched, so a later re-grant can re-run init from
        // scratch (otherwise ph stays null forever until reload).
        initStarted = false;
        return;
      }
      posthog.init(key, {
        api_host: getHost(),
        // Modern defaults (2025-05-24): history-change pageviews for SPAs,
        // pageleave, sane autocapture config.
        defaults: '2025-05-24',
        // EU/CA compliance: nothing captured unless explicitly opted in below.
        opt_out_capturing_by_default: true,
        persistence: 'localStorage+cookie',
        // Full feature set:
        autocapture: true,
        capture_pageview: 'history_change',
        capture_pageleave: true,
        capture_exceptions: true, // Error tracking
        capture_performance: true, // Web vitals / network timing
        enable_heatmaps: true,
        disable_session_recording: false, // Session replay ON post-consent
        session_recording: {
          // Privacy: never record what people type OR read. Replays show
          // layout + interactions with all text redacted — loosen deliberately
          // (per-selector) if readable replays are ever needed.
          maskAllInputs: true,
          maskTextSelector: '*',
        },
        // Privacy: automatic events ($pageview etc.) carry full URLs by
        // default; query strings can hold sensitive tokens (e.g.
        // /reset-password?token=...). Strip query+hash from every URL-ish
        // property, and reduce referrers to their origin.
        sanitize_properties: (props: Record<string, unknown>) => {
          for (const k of Object.keys(props)) {
            const v = props[k];
            if (typeof v !== 'string' || !/^https?:\/\//.test(v)) continue;
            if (/referrer/i.test(k)) {
              try { props[k] = new URL(v).origin; } catch { delete props[k]; }
            } else if (/url|href/i.test(k)) {
              try {
                const u = new URL(v);
                props[k] = u.origin + u.pathname;
              } catch { delete props[k]; }
            }
          }
          return props;
        },
        debug: import.meta.env.DEV,
      });
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

// Central dispatcher for manual events (autocapture/pageviews are handled by
// the SDK itself). Mirrors mpTrack's naming convention: snake_case
// object_action.
export const phCapture = (name: string, props: Record<string, unknown> = {}) => {
  if (disabled) return;
  if (!ph) {
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
    ph.capture(name, merged);
  } catch {
    // Analytics must never break the app.
  }
};

// ---------------------------------------------------------------------------
// Identity (called from useAuth — login/session restore/logout)
// ---------------------------------------------------------------------------

let identifiedUserId: string | null = null;

type IdentityUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  createdAt?: string | Date | null;
};

let lastIdentity: IdentityUser | null = null;

const applyIdentity = (user: IdentityUser) => {
  if (!ph || disabled) return;
  if (identifiedUserId === user.id) return;
  identifiedUserId = user.id;
  try {
    // Deliberately NO name/email person properties: PostHog also records
    // session replays, so it stays PII-minimal — the immutable DB id is
    // enough to join against other systems when needed.
    const person: Record<string, unknown> = {
      role: user.role ?? 'user',
      ...getAcquisition(),
    };
    if (user.createdAt) person.created_at = new Date(user.createdAt).toISOString();
    // Identify by immutable DB id (never email); anonymous events merge in.
    ph.identify(user.id, person);
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

// ---------------------------------------------------------------------------
// Feature flags — safe wrappers (no-op defaults pre-consent / pre-load)
// ---------------------------------------------------------------------------

export const phIsFeatureEnabled = (flag: string): boolean => {
  if (!ph || disabled) return false;
  try {
    return ph.isFeatureEnabled(flag) === true;
  } catch {
    return false;
  }
};

export const phGetFeatureFlag = (flag: string): string | boolean | undefined => {
  if (!ph || disabled) return undefined;
  try {
    return ph.getFeatureFlag(flag);
  } catch {
    return undefined;
  }
};

/** Run a callback once feature flags are loaded (or immediately if already). */
export const phOnFeatureFlags = (cb: () => void) => {
  if (!ph || disabled) return;
  try {
    ph.onFeatureFlags(cb);
  } catch {
    // ignore
  }
};
