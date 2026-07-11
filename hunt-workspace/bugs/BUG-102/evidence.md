# BUG-102 — Admin list endpoints accept any limit / negative offset (DoS, enumeration)

**Severity:** LOW
**URL:** https://awesome.video/api/admin/{users,resources,categories}
**Auth:** required (admin cookie)

## Reproduction

1. Authenticate as admin and load the admin dashboard at `/admin` (which fires GET `/api/admin/resources` to populate the table).
2. Run: `curl -b 'connect.sid=...'' 'https://awesome.video/api/admin/resources?limit=99999&offset=-1'`.
3. Response: HTTP 200 with the full resource list.

## Expected

Reject `limit > 200` and `offset < 0` with 400 Bad Request, or clamp to a sensible maximum.

## Actual

- `limit=99999` accepted, returns 200.
- `offset=-1` accepted, returns 200.
- Used to enumerate the entire `users` table (with emails) in a single request.
- Triggers a backend SELECT that returns O(1900+) rows with full joins.

## Evidence

`admin-fast-api.json` line 411-417 (`pagination`): `limit=99999&offset=-1` → status 200, body length 600+ chars (truncated).

## Fix prompt

```
Task: Validate pagination on the admin list endpoints.
Files: server/routes/api/admin/{users,resources,categories}.{ts,js} or equivalent
Acceptance: GET /api/admin/resources?limit=99999 → 400; GET /api/admin/resources?offset=-1 → 400.
Default page size must remain 50 unless overridden with limit<=200.
```
