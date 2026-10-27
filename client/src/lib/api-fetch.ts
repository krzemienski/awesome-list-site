/**
 * fetch() for same-origin /api requests. The hosting edge WAF returns its own
 * 403 for any Referer that contains script-like text. The server sends
 * Referrer-Policy: strict-origin; this per-request policy also protects API
 * calls if a document's policy changes or is not applied. Sending only the
 * origin keeps the API reachable from any page URL. The server authorises on
 * cookies, CSRF and Origin, never Referer.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { referrerPolicy: "origin", ...init });
}
