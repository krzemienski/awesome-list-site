# BUG-016 — REFUSAL

**Bug:** GAESA cookie missing HttpOnly and Secure attributes.
**Decision:** REFUSE — the application has no code path that sets the GAESA cookie.

## Evidence

- `grep -rn "GAESA\|setCookie\|res.cookie\|Set-Cookie" server/ shared/ client/` returns **zero** application-level matches (searched 2026-07-07 baseline).
- The only response-header security configuration in the app is `server/index.ts` lines 27–50, which sets `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, and `Content-Security-Policy`. **No `Set-Cookie` is emitted by the app.**
- Baseline probe `.audit/fix-baseline/probes/home-headers.txt` shows the GAESA cookie arriving on the response from `https://awesome.video/`:
  `set-cookie: GAESA=Cp4BMDAy...; expires=Thu, 06-Aug-2026 05:47:12 GMT; path=/`
  with no HttpOnly, no Secure, and no `__Host-` prefix — but the cookie name and value are opaque tokens issued by Google Frontend, not by the application.
- `server/replitAuth.ts` (the only session-cookie configuration in the app) sets attributes on the **`connect.sid`** cookie only (HttpOnly, Secure in production, SameSite=lax, line 35–40). It does not affect the GAESA cookie.

## Why the application cannot fix this

The deployment topology is `Browser → Google Frontend CDN → Replit deployment → Express app (this repo)`. The GAESA cookie is injected on the **response egress** by the Google Frontend CDN layer (a Google Analytics Experiment/Session Analytics token bound to Google Frontend), on the route back to the browser. The Express application:

1. Has no code path that reads, sets, or renames the GAESA cookie — confirmed by exhaustive grep.
2. Cannot unset, rewrite, or add attributes to a `Set-Cookie` header that did not originate from it; any `res.removeHeader('Set-Cookie')` the app called would be overridden on egress by the CDN injecting GAESA again.
3. Cannot add `HttpOnly`/`Secure`/`__Host-` to a cookie it did not set — those attributes are properties of the `Set-Cookie` directive, which is controlled by the CDN.

The correct remediation is a **CDN / hosting configuration change** (GCP / Replit hosting dashboard, or ask Google Frontend to apply the `__Host-` prefix and the HttpOnly/Secure attributes to GAESA). That is outside the application repository and outside this bug-fix campaign's blast radius.

## Recommended manual follow-up

1. File a request with the hosting operator (Replit + Google Cloud / Google Frontend team) to harden the GAESA cookie: rename `GAESA` → `__Host-GAESA`, add `HttpOnly`, `Secure`, `SameSite=Lax`, drop any `Domain=`.
2. Concurrently evaluate whether the GAESA cookie is actually required by Google Frontend for the site; if it is not load-bearing for the deployment, disable it on the CDN.

## Status

`UNFIXED — REFUSED` (GAESA cookie is set by upstream CDN, not the application; cannot be hardened from app code).