# BUG-005 — Inconsistent auth API surface: /api/auth/login & /api/auth/status 404

**Severity:** MEDIUM
**Affected endpoint:** https://awesome.video/api/auth/login, https://awesome.video/api/auth/status

## Reproduction
1. From a host shell, GET https://awesome.video/api/auth/login — `404 {"message":"Not found"}`.
2. GET https://awesome.video/api/auth/status — `404 {"message":"Not found"}`.
3. Compare: /api/health → 200, /api/resources → 200, /api/admin/resources → 401 (without auth) / 200 (with auth).
4. Yet the UI flow at /login, /register, /forgot-password, /reset-password all work. So the auth UI is wired to a different endpoint (presumably a different route shape — e.g. /api/users/login or a Next.js route) but the canonical /api/auth/* namespace returns 404 for any consumer.

## Expected
A consistent REST API surface. `POST /api/auth/login` (or `POST /api/users/login`) should be the documented login endpoint, and `GET /api/auth/status` should return the session info for an authenticated user.

## Actual
The /api/auth/* namespace is empty (404). Consumers (e.g. mobile clients, integrations, or external scripts) cannot reliably introspect session. The HTTP-vs-UI inconsistency also creates a debugging hazard: a developer reading the OpenAPI doc / swagger will assume a route that 404s.

## Evidence
- `security-probe.json`, `/api/auth/login` → 404, `/api/auth/status` → 404

## Fix prompt

```
Task: Reconcile the authentication API surface on https://awesome.video/.
Currently:
  GET  /api/auth/login   → 404 {"message":"Not found"}
  GET  /api/auth/status  → 404 {"message":"Not found"}
  GET  /api/auth/me      → not tested
The /login HTML form works (returns to /admin on success) but no JSON
endpoint at the canonical /api/auth/* path exists. Add the routes:

  POST /api/auth/login    with body {email, password} → 200 {user, session} or 401
  GET  /api/auth/status   with cookie → 200 {user} or 401
  POST /api/auth/logout   with cookie → 204

(Or rename to /api/users/login if there is a stronger convention.)

Acceptance:
1. POST /api/auth/login with the test creds returns the same session
   cookie that the HTML /login flow sets.
2. GET /api/auth/status with the session cookie returns the authenticated
   user JSON.
3. POST /api/auth/logout clears the cookie.
4. Verifiable with curl + Playwright.
```


STATUS: NOT-A-DEFECT (real contract: GET /api/auth/user + POST /api/auth/logout; auditor probed wrong path names) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
