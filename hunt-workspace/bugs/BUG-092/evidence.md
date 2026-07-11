# BUG-092 — /logout GET route does not clear session cookie (silent no-op)

**Severity:** MEDIUM
**Affected endpoint:** https://awesome.video/logout

## Reproduction
```bash
curl -i -s https://awesome.video/logout | head -3
# Returns the SPA shell — no Set-Cookie clearing.
```
The /logout GET route renders the SPA shell but does not issue a
`Set-Cookie: connect.sid=; HttpOnly; SameSite=...; Max-Age=0` header.

## Expected
Either:
- /logout accepts POST and clears the cookie, or
- /logout (GET/POST) actively clears the cookie via Set-Cookie.

## Actual
GET /logout is a no-op for session invalidation.

## Evidence
- `more-bugs.json`, `logoutGet`

## Fix prompt

```
Task: GET /logout does not clear the session cookie. Implement cookie
invalidation on /logout.

Acceptance:
1. POST /logout (or GET) returns Set-Cookie: connect.sid=; Max-Age=0.
2. Subsequent /api/admin/* requests return 401.
3. Verifiable with curl.
```


STATUS: FIXED (server/routes.ts logout: session.destroy + clearCookie) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
