# BUG-072 — SameSite=Lax connect.sid cookie allows cross-origin GET to /api/* with cookies

**Severity:** MEDIUM (CSRF surface)
**Affected endpoint:** /api/* endpoints

## Reproduction
A cookie with `SameSite=Lax` is sent on top-level GET navigations but
not on cross-origin sub-resource fetches. However, an attacker site
could:
1. Embed <img src="https://awesome.video/api/admin/resources"> or
   <iframe src="...api/admin/resources"> on a phishing site.
2. If the user is logged in to awesome.video and visits the phishing
   page, the cookie is sent with the cross-site request.
3. The admin API may have endpoints where a GET mutates state.

The current SameSite=Lax is the default-safe behavior, but for an admin
endpoint you want SameSite=Strict or an explicit CSRF token.

## Expected
Either:
- `SameSite=Strict` (or `__Host-` prefix + Secure) on connect.sid.
- A CSRF token check on every /api/admin/* state-changing endpoint.

## Actual
Lax is the default. CSRF risk is borderline.

## Evidence
- `bug-deep-hunt.json`, `postLoginCookies[].connect.sid.sameSite: 'Lax'`

## Fix prompt

```
Task: connect.sid cookie is `SameSite=Lax`. For an admin app, prefer
SameSite=Strict OR add explicit CSRF tokens to /api/admin/* state-
changing endpoints.

Acceptance:
1. connect.sid cookie is set with SameSite=Strict (or HttpOnly+__Host-
   prefix).
2. Verifiable via ctx.cookies and Set-Cookie header inspection.
```
