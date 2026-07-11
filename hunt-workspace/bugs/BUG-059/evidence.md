# BUG-059 — /api/admin/resources GET returns 400 (not 401) for anonymous — auth-error inconsistency

**Severity:** LOW (info disclosure + UX drift)
**Affected endpoint:** /api/admin/resources

## Reproduction
```bash
curl -i -s https://awesome.video/api/admin/resources
# → HTTP/1.1 400 Bad Request
```
Other admin endpoints return 401; this one returns 400 even without
authentication. The 400 implies the server is unhappy about the
request shape, not the credentials.

## Expected
401 Unauthorized for anonymous requests, like /api/admin/users.

## Actual
400 — interpreted as "the params are wrong" rather than "you must log in."

## Evidence
- `quick4.json`, `admin_resources_GET.status: 400`

## Fix prompt

```
Task: GET /api/admin/resources returns 400 (not 401) for anonymous.
Pick consistent auth-error semantics across /api/admin/*.

Acceptance:
1. GET /api/admin/resources for an anonymous client returns 401 with
   the same body shape as other admin endpoints.
2. Verifiable with curl.
```
