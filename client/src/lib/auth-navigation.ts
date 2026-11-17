import { requestedReturnPath } from "@/lib/returnUrl";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/** The two arguments Clerk hands a `finalize({ navigate })` callback. */
interface FinalizeNavigateArgs {
  session: { currentTask?: { key: string } | null };
  decorateUrl: (url: string) => string;
}

/** wouter's setLocation prepends the base itself, so a full path must lose it. */
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

/**
 * Where a completed sign-in goes: a pending session task first, else the
 * validated ?redirect_url=, else the fallback. Clerk's decorateUrl may return
 * an absolute URL (cookie sync across origins), which needs a real navigation;
 * a relative one stays inside the SPA like the prebuilt form's routerPush.
 */
export function navigateAfterAuth(
  { session, decorateUrl }: FinalizeNavigateArgs,
  setLocation: (to: string) => void,
  fallbackPath = "/",
): void {
  const task = session.currentTask;
  const target = task
    ? `${basePath}/sign-in/tasks/${task.key}`
    : (requestedReturnPath() ?? fallbackPath);
  const decorated = decorateUrl(target);
  if (/^https?:\/\//.test(decorated)) {
    window.location.assign(decorated);
    return;
  }
  setLocation(stripBase(decorated));
}

/**
 * An in-app auth link (for wouter's Link, which adds the base itself) that
 * keeps the current query, so redirect_url and any invitation ticket survive,
 * but drops the `form` flag so the target renders the standard form.
 */
export function standardFormHref(pathname: "/sign-in" | "/sign-up"): string {
  const params = new URLSearchParams(window.location.search);
  params.delete("form");
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

/** Where an OAuth provider sends the visitor back to, handled by SsoCallback. */
export function ssoCallbackUrl(): string {
  return `${basePath}/sign-in/sso-callback?form=custom`;
}

/** Where an OAuth sign-in lands once complete: the validated return path or Home. */
export function ssoRedirectUrl(): string {
  return requestedReturnPath() ?? `${basePath}/`;
}
