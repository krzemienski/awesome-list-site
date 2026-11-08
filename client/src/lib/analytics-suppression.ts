// Which sessions and pages must never reach an analytics tool (tracking plan:
// docs/ANALYTICS.md → "Admin sessions and QA paths").
//
// - Admin sessions. A localStorage marker is set when /api/auth/user reports
//   role "admin" (any sign-in path) or the owner password sign-in succeeds,
//   and cleared on every sign-out path and when a non-admin account signs in
//   on the device. It is read synchronously, so a signed-in admin's next load
//   is suppressed before Clerk or the auth check has answered.
// - Automated browsers. `navigator.webdriver === true` (WebDriver, CDP-driven
//   Chrome, agent-browser, chrome-devtools MCP, Playwright) is a synchronous
//   property, so the very first page view is already covered.
// - QA paths: `/qa-*`, the all-nines sentinel resource ids test runs use, and
//   the owner sign-in page `/sign-in?admin`.
//
// The shared sender (`track()` / the dispatcher) and every vendor SDK init
// check `isAnalyticsSuppressed()`. Replit's own page views come from the
// platform-injected Umami tracker, which skips every send while
// `localStorage['umami.disabled']` is set; `syncReplitPageviewOptOut` sets it
// while suppressed or while the visitor has declined analytics, and removes it
// again only if this module set it. This module is the only writer of the key.

const ADMIN_SESSION_KEY = 'analytics-admin-session';
const UMAMI_DISABLED_KEY = 'umami.disabled';
const UMAMI_SET_BY_APP_KEY = 'analytics-umami-disabled-by-app';
const CONSENT_KEY = 'analytics-consent';

const SENTINEL_RESOURCE_PATH = /^\/resource\/9{8,}\/?$/;

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the in-page checks still read the same answer.
  }
};

export const isAdminAnalyticsSession = (): boolean => read(ADMIN_SESSION_KEY) === '1';

/**
 * The owner password session lives in an HttpOnly cookie scripts cannot see;
 * the server sets this script-readable twin (no secret) beside it.
 */
export const hasOwnerSessionHint = (): boolean =>
  typeof document !== 'undefined' && /(?:^|;\s*)av_admin_hint=1(?:;|$)/.test(document.cookie);

export const isSuppressedAnalyticsPath = (pathname: string, search = ''): boolean =>
  pathname.startsWith('/qa-') ||
  SENTINEL_RESOURCE_PATH.test(pathname) ||
  (/^\/sign-in(\/|$)/.test(pathname) && new URLSearchParams(search).has('admin'));

export const isAutomatedBrowser = (): boolean =>
  typeof navigator !== 'undefined' && navigator.webdriver === true;

/**
 * True once the visitor chose Decline. The localStorage choice wins; the
 * mirror cookie covers a decision that exists only there (the server-rendered
 * Home shell trusts it). Kept here, not in analytics.ts, so the sync below
 * needs no circular import.
 */
export const hasDeclinedAnalytics = (): boolean => {
  const stored = read(CONSENT_KEY);
  if (stored === 'granted' || stored === 'denied') return stored === 'denied';
  return typeof document !== 'undefined' && /(?:^|;\s*)analytics-consent=denied(?:;|$)/.test(document.cookie);
};

export const isAnalyticsSuppressed = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    isAutomatedBrowser() ||
    isAdminAnalyticsSession() ||
    isSuppressedAnalyticsPath(window.location.pathname, window.location.search)
  );
};

/**
 * Keeps the platform Umami tracker quiet while suppressed or declined. A value
 * the owner set by hand (no app flag beside it) is never changed or removed.
 */
export const syncReplitPageviewOptOut = () => {
  if (typeof window === 'undefined') return;
  const setByApp = read(UMAMI_SET_BY_APP_KEY) === '1';
  if (isAnalyticsSuppressed() || hasDeclinedAnalytics()) {
    if (read(UMAMI_DISABLED_KEY) === null) {
      // Marker first: a flag without its marker could never be removed again.
      write(UMAMI_SET_BY_APP_KEY, '1');
      write(UMAMI_DISABLED_KEY, '1');
    }
  } else if (setByApp) {
    write(UMAMI_DISABLED_KEY, null);
    write(UMAMI_SET_BY_APP_KEY, null);
  }
};

/**
 * Records whether this device is in an admin session. Returns true when the
 * value changed, so the caller can stop vendor SDKs that already started.
 */
export const setAdminAnalyticsSession = (isAdmin: boolean): boolean => {
  const changed = isAdminAnalyticsSession() !== isAdmin;
  if (changed) write(ADMIN_SESSION_KEY, isAdmin ? '1' : null);
  syncReplitPageviewOptOut();
  return changed;
};

const BENIGN_BROWSER_MESSAGE = /^ResizeObserver loop (completed with undelivered notifications|limit exceeded)/;

/**
 * Window `error` events that are not a fault in this site: browser-internal
 * ResizeObserver notices, errors from scripts served by another origin
 * (browser extensions, injected translate/ad tools, third-party tags) and the
 * opaque "Script error." the browser substitutes for those. Counting them made
 * the site-error series report visitors' extensions as site bugs.
 */
export const isForeignScriptError = (event: { message?: string; filename?: string }): boolean => {
  if (BENIGN_BROWSER_MESSAGE.test(event.message ?? '')) return true;
  if (!event.filename) return event.message === 'Script error.';
  try {
    return new URL(event.filename, window.location.href).origin !== window.location.origin;
  } catch {
    return true;
  }
};

/** A request the page itself cancelled (navigation, unmount) is not an API failure. */
export const isCancelledRequestError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
