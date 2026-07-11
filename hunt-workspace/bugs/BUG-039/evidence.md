# BUG-039 — /api/resources pagination is broken (no `nextCursor`)

**Severity:** MEDIUM (API client broken — clients cannot paginate beyond first page)
**Affected endpoint:** https://awesome.video/api/resources

## Reproduction
```bash
curl -s 'https://awesome.video/api/resources?limit=10' | jq
```
Returns: `{"resources": [...10 items...]}` (no `nextCursor` field at all).

For comparison, even though the response contains 10 items, repeating
the request with no cursor returns the same first 10 items — there is
no way to fetch items 11–20.

```bash
for i in 1 2 3; do
  curl -s 'https://awesome.video/api/resources?limit=10' | jq -r '.resources[0].id'
done
# All three return the same id (the first page's first resource).
```

## Expected
A paginated API should:
1. Include `nextCursor` (or `nextPage`, `cursor`) in the response when more items exist.
2. Return distinct content on subsequent calls when the cursor is supplied.

## Actual
The response omits any cursor, defaulting to "always first page."
With 1,946+ entries, only the top N are reachable through this endpoint.

## Evidence
- `wider-bugs.json`, `pagination = { limit10_count: 10, hasNext: false }` — no nextCursor

## Fix prompt

```
Task: GET https://awesome.video/api/resources?limit=10 returns
{"resources":[...10 items...]} with no `nextCursor`. Calling again
returns the same first 10. Clients cannot paginate past page 1.

Reproduction:
  curl -s 'https://awesome.video/api/resources?limit=10' | jq '.nextCursor'
→ null

Acceptance:
1. /api/resources returns either an opaque `nextCursor` (cursored) or
   an explicit `hasMore`+`nextPage` field when items remain.
2. GET ...&cursor=<token> returns the next 10 distinct items.
3. Verifiable by repeating the call and confirming distinct first ids.
```


STATUS: INTENDED (offset+total pagination consumed by ResourceManager/UsersTab; no cursor needed) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
