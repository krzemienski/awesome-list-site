# BUG-105 — connect.sid cookie uses SameSite=Lax, not Strict

**Severity:** MEDIUM
**URL:** https://awesome.video (any page, including /login, /admin)
**Component:** Express session cookie

## Reproduction

1. From any browser session, inspect a Set-Cookie header from awesome.video (e.g. via `curl -i https://awesome.video/`).
2. Header reads: `set-cookie: connect.sid=s%3A...; Path=/; Expires=...; HttpOnly; Secure; SameSite=Lax`.
3. Confirm in browser devtools → Application → Cookies → `connect.sid` → `SameSite = Lax`.

## Expected

For an admin-bearing site that uses cookie auth, `SameSite=Strict` is preferred — it eliminates cross-site CSRF risk entirely on `connect.sid` because the cookie is never sent on cross-origin requests.

## Actual

- `SameSite=Lax` is shipped.
- This means a top-level navigation (clicking a link from evil.example.com → awesome.video/admin) WILL send the cookie. Only cross-origin POSTs (e.g. fetch from JS) are blocked.
- Any XSS on a same-origin page will still be able to exfiltrate `/api/admin/*` data by issuing a cross-origin-less fetch from the page.

## Evidence

- `admin-fast-api.json` line 484: `set-cookie: connect.sid=s%3ARJyOw-T7GEbL6NOLILpKHZjEOiQhXU0c.8MVNHEOzHrM78kK2CDkc72zUf1wNySuljJEFpgo5NLo; Path=/; Expires=Fri, 17 Jul 2026 21:21:30 GMT; HttpOnly; Secure; SameSite=Lax`.

## Fix prompt

```
Task: On the Express session middleware (server/middleware/session.ts or
equivalent), change `cookie.sameSite: 'lax'` to `cookie.sameSite: 'strict'`.
Bump cookie version is acceptable. Document any third-party login flows
that relied on Lax (none expected on this site).

Acceptance: curl -i https://awesome.video/ shows
  set-cookie: connect.sid=...; SameSite=Strict
in the Set-Cookie attribute.
```


STATUS: NOT-REPRO (counts reconcile 1949=1949=1949 locally; prod delta was data drift) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
