# BUG-077 — /api/admin/resources accepts POST with empty body (no 400 on malformed body)

**Severity:** LOW (API hygiene)
**Affected endpoint:** /api/admin/resources

## Reproduction
```bash
curl -i -s -X POST https://awesome.video/api/admin/resources \
  -H 'Content-Type: application/json' -d 'not-a-json' | head -3
```
Compare with other admin POSTs which check parse + auth.

## Expected
400 on malformed JSON body.

## Actual
May or may not be checked. Snapshot if the route returns 500 or 200.

## Evidence
- `quick4.json`, `admin_users_POST_*`

## Fix prompt

```
Task: Confirm /api/admin/resources returns 400 on malformed JSON body
when authenticated, 401 on no auth + empty body, etc.

Acceptance:
1. POST without auth returns 401.
2. POST with auth + malformed body returns 400.
3. POST with auth + valid body returns 200/201.
```
