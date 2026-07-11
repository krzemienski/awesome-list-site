# BUG-080 — Deeper admin paths (/admin/users, /admin/resources) currently SPA-render but bypass auth check at HTTP level

**Severity:** MEDIUM (defense-in-depth)
**Affected page:** /admin/users, /admin/resources, etc.

## Reproduction
```bash
curl -sIL -o /dev/null -w '%{http_code}\n' https://awesome.video/admin/users
# 200 (SPA shell)
curl -sIL -o /dev/null -w '%{http_code}\n' https://awesome.video/admin/resources
# 404 (hard 404) ← INCONSISTENT
```

## Expected
Both routes return 200 (SPA shell) + the client-side auth check fires,
OR both return 302 to /login when authenticated.

## Actual
/admin/users → 200, /admin/resources → 404. Inconsistent.

## Evidence
- `bug-deep-hunt.json`, `navCheck[]` for `/admin/categories` and `/admin/resources` returning 404

## Fix prompt

```
Task: /admin/users and /admin/categories and /admin/resources should all
return the same status code to anonymous clients (either all 200 with
client-side gate, or all 302 to /login, or all 404 by design).

Acceptance:
1. The status codes are consistent for any /admin/* route.
2. Verifiable with curl in a tight loop.
```
