# BUG-056 — /api/admin/resources returns 404 on PUT/PATCH/DELETE (verb coverage inconsistent)

**Severity:** LOW (admin API shape)
**Affected endpoint:** https://awesome.video/api/admin/resources

## Reproduction
```bash
for v in GET POST PUT PATCH DELETE; do
  echo -n "  $v : "
  curl -i -s -X $v https://awesome.video/api/admin/resources \
    -H 'Content-Type: application/json' -d '{}' | head -1
done
```

Returns:
- GET → 401 (correctly auth-gated)
- POST → 401
- PUT → 404 "Not found"
- PATCH → 404
- DELETE → 404

## Expected
Either the verb is intentionally unsupported (return 405 Method Not
Allowed) or implemented (return 401 same as GET). Returning 404 for
verbs the route accepts is misleading for REST clients.

## Actual
The route returns 404 for PUT/PATCH/DELETE while the same route name
already exists for GET/POST — clients inferring CRUD support would be
confused.

## Evidence
- `quick4.json`, `admin_resources_<verb>.status` rows

## Fix prompt

```
Task: For /api/admin/resources, GET/POST return 401 (gated), but
PUT/PATCH/DELETE return 404. Either implement the verbs (and gate with
401) or return 405 for the unsupported ones.

Acceptance:
1. PUT /api/admin/resources returns 401 (if implemented, gated) or 405
   (if not).
2. Verifiable with the same curl loop.
```
