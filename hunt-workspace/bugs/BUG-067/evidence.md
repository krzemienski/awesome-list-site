# BUG-067 — /api/v1/* namespace is empty (no versioning)

**Severity:** LOW (API hygiene)
**Affected endpoint:** https://awesome.video/api/v1/*

## Reproduction
```bash
curl -sIL -o /dev/null -w '%{http_code}\n' https://awesome.video/api/v1/resources
# → 404
```

The /api/ namespace exists but is unversioned (no /v1, /v2). Today's
API is fragile to breaking changes — clients can't pin to a known
schema.

## Expected
Either:
- /api/v1/* exists mirroring current /api/* and /api is an alias.
- The team adopts the convention to never break /api/* contracts and
  ships /api/v2/* for non-breaking changes.

## Actual
Single namespace, no versioning.

## Evidence
- `quickprobe.json`, `api__api_v2_*` etc

## Fix prompt

```
Task: Document the API versioning policy. Either start a /api/v1 alias
or update a CONTRIBUTING/API.md to define the stability promise of
/api/*.

Acceptance:
1. /api/v1/resources returns the same shape as /api/resources (today).
2. /api continues to work as an alias.
3. CI runs /api/* contract tests.
```
