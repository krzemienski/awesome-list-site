// Which sessions and pages must never reach an analytics tool (tracking plan:
// docs/ANALYTICS.md → "Admin sessions and QA paths").
//
// - Admin sessions. A localStorage marker is set when /api/auth/user reports
//   role "admin" (any sign-in path) or the owner password sign-in succeeds,
//   and cleared on every sign-out path and when a non-admin account signs in
//   on the device. It is read synchronously, so a signed-in admin's next load
//   is suppressed before Clerk or the auth check has answered.
// - QA paths: `/qa-*`, the all-nines sentinel resource ids test runs use, and
//   the owner sign-in page `/sign-in?admin`.
//
// The shared sender (`track()` / the dispatcher) and every vendor SDK init
// check `isAnalyticsSuppressed()`. Replit's own page views come from the
// platform-injected Umami tracker, which skips every send while
// `localStorage['umami.disabled']` is set; `syncReplitPageviewOptOut` sets it
// while suppressed and removes it again only if this module set it.

const ADMIN_SESSION_KEY = 'analytics-admin-session';
const UMAMI_DISABLED_KEY = 'umami.disabled';
const UMAMI_SET_BY_APP_KEY = 'analytics-umami-disabled-by-app';

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

export const isSuppressedAnalyticsPath = (pathname: string, search = ''): boolean =>
  pathname.startsWith('/qa-') ||
  SENTINEL_RESOURCE_PATH.test(pathname) ||
  (/^\/sign-in(\/|$)/.test(pathname) && new URLSearchParams(search).has('admin'));

export const isAnalyticsSuppressed = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    isAdminAnalyticsSession() ||
    isSuppressedAnalyticsPath(window.location.pathname, window.location.search)
  );
};

/**
 * Keeps the platform Umami tracker quiet while suppressed. A value the owner
 * set by hand (no app flag beside it) is never changed or removed.
 */
export const syncReplitPageviewOptOut = () => {
  if (typeof window === 'undefined') return;
  const setByApp = read(UMAMI_SET_BY_APP_KEY) === '1';
  if (isAnalyticsSuppressed()) {
    if (read(UMAMI_DISABLED_KEY) === null) {
      write(UMAMI_DISABLED_KEY, '1');
      write(UMAMI_SET_BY_APP_KEY, '1');
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
