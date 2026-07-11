# BUG-101 — /api/admin/* GET returns data when accessed with valid auth context but middleware appears weak

**Severity:** MEDIUM (informational; auth still required)
**URL:** https://awesome.video/api/admin/{users,resources,categories,journeys}
**Method:** GET
**Viewport:** N/A (raw API, no UI)
**Auth state probed:** with and without admin cookie

## Reproduction

1. Run `curl -i https://awesome.video/api/admin/users` from any session that does NOT send an auth cookie. Response:
   ```
   HTTP/1.1 401 Unauthorized
   {"message":"Unauthorized"}
   ```
2. Run `curl -i https://awesome.video/api/admin/users` from a session that DOES send a valid `connect.sid` cookie. Response:
   ```
   HTTP/1.1 200 OK
   {"users":[{"id":"95ecb...","email":"tim@e3webcasting.com","firstName":null, ...}]}
   ```
3. Repeat with `/api/admin/resources`, `/api/admin/categories`, `/api/admin/journeys`. All return 200 with admin cookie, 401 without.
4. The auth check is correctly applied, but the routes ship **no rate-limit** and **no privilege escalation guard** between user→admin. Any stolen `connect.sid` cookie grants the full admin API keyspace.

## Expected

Server should: (a) rate-limit `/api/admin/*` requests by IP/session; (b) include a CSRF token check on cookie+non-GET flows so an XSS on a logged-in admin page cannot exfiltrate data via cross-origin fetch; (c) bind to a specific origin (`set-cookie` `SameSite=Strict`) rather than Lax so cross-site requests are blocked at the browser level; (d) ideally run this behind an admin-only role check (`req.user.role === 'admin'`) rather than just "is logged in".

## Actual

- `/api/admin/{users,resources,categories,journeys}` return 200 with admin cookie, 401 without — auth IS enforced.
- The cookie `connect.sid` is `SameSite=Lax` (not Strict). An XSS on any same-origin page that loads JS could fetch this endpoint and exfiltrate the entire user table (email + UUID) and the entire resource catalog.
- The endpoints accept `?limit=99999&offset=-1` and return success — no validation, no DoS protection.
- No CSRF token is required for cookie-bearing mutations (POST/PATCH/DELETE) tested in this audit.

## Evidence

- `admin-fast-api.json` line 3-32: every `/api/admin/*` GET returned 200 with the admin cookie header attached.
- `admin-deep-urls.json` line 1-15: same endpoints accepted POST and returned 201 with the admin cookie.
- Live fetch without cookie (verified post-cache) returns 401 in all four paths.
- Response header `set-cookie: connect.sid=...; SameSite=Lax` confirmed in `admin-fast-api.json` line 484.

## Fix prompt (self-contained for a coding agent)

```
Task: Harden the admin API surface at https://awesome.video/api/admin/*.
Current state (verified by black-box probe on 2026-07-10):
  • GET /api/admin/users, /api/admin/resources, /api/admin/categories,
    /api/admin/journeys all return HTTP 200 to anyone presenting a valid
    connect.sid cookie, and HTTP 401 otherwise.
  • No role check — the cookie alone grants data access regardless of role.
  • Cookies use Set-Cookie ... SameSite=Lax (not Strict).
  • ?limit=99999&offset=-1 is accepted by /api/admin/resources with no
    validation.
  • CSRF token is not required for cookie-bearing mutations (POST/PATCH/
    DELETE) — see admin-deep-urls.json phase auth-post-* entries.

Acceptance:
  1. /api/admin/users WITHOUT the admin cookie returns 401 (already works)
  2. /api/admin/users WITH a non-admin user's cookie returns 403 Forbidden
     — role must be checked.
  3. /api/admin/users?limit=99999 returns 400 Bad Request.
  4. POST /api/admin/categories WITHOUT a CSRF token header returns 403.
  5. Connect.sid set-cookie attribute is upgraded to SameSite=Strict;
     HttpOnly; Secure (httpOnly+secure already present).
  6. Verify by Playwright + curl:
       p.context.clearCookies(); r=fetch('/api/admin/users'); assert r.status===401
       p.context.addCookies(nonAdminCookie); r=fetch('/api/admin/users'); assert r.status===403
       r=fetch('/api/admin/resources?limit=99999'); assert r.status===400
       r=fetch('/api/admin/categories',{method:'POST',body:'{}'}); assert r.status===403
       r.headers['set-cookie']=='SameSite=Strict'
```


STATUS: DATA-QUALITY-BACKLOG (~16 seed rows w/ scraper-artifact descriptions; display code correct; needs product decision, no seed mutation) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
