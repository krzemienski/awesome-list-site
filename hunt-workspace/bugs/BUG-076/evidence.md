# BUG-076 — /admin/users POST without auth returns 404 (defensive enumeration)

**Severity:** LOW
**Affected endpoint:** /api/admin/users

## Reproduction
```bash
curl -i -s -X POST https://awesome.video/api/admin/users -H 'Content-Type: application/json' -d '{}' | head -1
```
Returns `HTTP/1.1 404 Not Found`. Compare:
- GET /api/admin/users (no auth) → 401.
- POST /api/admin/users (no auth) → 404.

## Expected
The verb should return 401, same as GET — so attackers can't enumerate
unauthenticated POST routes vs routes that exist.

## Actual
Different status across verbs leaks implementation details.

## Evidence
- `quick4.json`, `admin_users_POST_2_{}.status: 404`

## Fix prompt

```
Task: /api/admin/users returns 401 on GET but 404 on POST for anonymous.
Match: all verbs return 401 when the route exists but requires auth.

Acceptance:
1. POST /api/admin/users returns 401 (same body as the GET 401).
2. Verifiable with curl.
```
