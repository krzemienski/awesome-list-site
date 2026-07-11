# BUG-083 — No OpenAPI / API documentation surface

**Severity:** LOW
**Affected endpoint:** /api/* endpoints

## Reproduction
```bash
for path in /openapi.json /api-docs /api/docs /swagger.json /swagger; do
  echo -n "  $path : "
  curl -sIL -o /dev/null -w '%{http_code}\n' "https://awesome.video$path"
done
```
All return 404.

External integrators have no documentation.

## Expected
At minimum, /api/health and /api/resources should be in an OpenAPI 3.0
spec at /openapi.json.

## Actual
No API documentation site.

## Evidence
- raw curl above

## Fix prompt

```
Task: Generate a basic /openapi.json describing /api/health, /api/resources,
/api/categories, /api/admin/*, and serve it from https://awesome.video/openapi.json.
Add a Swagger UI at /api/docs.

Acceptance:
1. /openapi.json returns 200 with valid OpenAPI 3.0 JSON.
2. The spec documents the listed endpoints.
3. Verifiable with curl + jq.
```
