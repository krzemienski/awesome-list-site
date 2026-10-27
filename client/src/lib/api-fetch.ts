/**
 * fetch() for same-origin /api requests. The hosting edge WAF returns its own
 * 403 for any Referer that contains script-like text, and the site-wide
 * Referrer-Policy (strict-origin-when-cross-origin, which analytics relies on
 * for document.referrer) would otherwise attach the full page URL, query
 * string included. Sending only the origin keeps the API reachable from any
 * page URL. The server authorises on cookies, CSRF and Origin, never Referer.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { referrerPolicy: "origin", ...init });
}
