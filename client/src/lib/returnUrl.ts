/**
 * Same-origin return URLs for sign-in prompts.
 *
 * Admin tabs live in the URL fragment (/admin#users), which the browser never
 * sends to the server, so every "sign in to continue" link must carry
 * pathname + search + hash explicitly in ?redirect_url=.
 *
 * Validation: an app-relative path only. `startsWith("/")` alone is
 * bypassable via `//evil.com` and `/\evil.com` (backslash normalizes to a
 * slash), and via control characters: the URL parser strips TAB/LF/CR, so a
 * decoded `/\n/evil.com` becomes `//evil.com` on navigation. Values with any
 * C0 control or DEL are refused, then the value is parsed against the current
 * origin and must stay on it; callers navigate to the normalized result.
 */
const SAFE_RETURN_PATH = /^\/(?![/\\])/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** The normalized same-origin path+query+hash for `value`, or null. */
export function normalizeReturnPath(value: string | null | undefined): string | null {
  if (typeof value !== "string" || CONTROL_CHARS.test(value) || !SAFE_RETURN_PATH.test(value)) {
    return null;
  }
  if (typeof window === "undefined") return value;
  let parsed: URL;
  try {
    parsed = new URL(value, window.location.origin);
  } catch {
    return null;
  }
  if (parsed.origin !== window.location.origin) return null;
  const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  return SAFE_RETURN_PATH.test(normalized) ? normalized : null;
}

export function isSafeReturnPath(value: string | null | undefined): value is string {
  return normalizeReturnPath(value) !== null;
}

/** The current location (path, query AND fragment), or the fallback. */
export function currentReturnPath(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;
  const { pathname, search, hash } = window.location;
  const here = `${pathname}${search}${hash}`;
  return isSafeReturnPath(here) ? here : fallback;
}

/** `/sign-in?redirect_url=<current location incl. hash>` */
export function signInHrefForCurrentLocation(fallback = "/"): string {
  return `/sign-in?redirect_url=${encodeURIComponent(currentReturnPath(fallback))}`;
}

/** The validated ?redirect_url= of the current page, if any. */
export function requestedReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("redirect_url");
  return normalizeReturnPath(value);
}

/**
 * When the server's protected-page guard 302s /admin#users to
 * /sign-in?redirect_url=%2Fadmin, the browser keeps "#users" on the sign-in
 * URL but it is missing from redirect_url. Fold that inherited fragment into
 * redirect_url (and drop it from the sign-in URL) before the sign-in form
 * reads the parameter, so a successful sign-in lands on the same tab.
 */
export function foldInheritedHashIntoRedirect(): void {
  if (typeof window === "undefined") return;
  const { hash, pathname } = window.location;
  // Only plain tab-style fragments; never anything Clerk itself might own.
  if (!/^#[A-Za-z0-9_-]+$/.test(hash)) return;
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect_url");
  if (!isSafeReturnPath(redirect) || redirect.includes("#")) return;
  params.set("redirect_url", `${redirect}${hash}`);
  window.history.replaceState(window.history.state, "", `${pathname}?${params.toString()}`);
}

/**
 * Normalize (or drop) ?redirect_url= on the sign-in page before any consumer
 * reads it — Clerk honors the raw parameter, so an unsafe value must never
 * reach it. A safe value is replaced by its parsed same-origin form.
 */
export function sanitizeRedirectParam(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("redirect_url")) return;
  const raw = params.get("redirect_url");
  const normalized = normalizeReturnPath(raw);
  if (normalized === raw) return;
  if (normalized === null) params.delete("redirect_url");
  else params.set("redirect_url", normalized);
  const query = params.toString();
  // Rebuild the query without "=" for valueless flags such as ?admin.
  const search = query ? `?${query.replace(/(^|&)admin=(?=&|$)/, "$1admin")}` : "";
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${search}${window.location.hash}`,
  );
}
