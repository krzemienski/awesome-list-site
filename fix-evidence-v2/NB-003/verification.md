# NB-003 — /api/public/resources negative/invalid page → 500

**Fix**: `server/api/public.ts` list route now validates `page` through `parseBoundedInt`
(`server/validation/inputs.ts`): must be an all-digit positive integer ≤ 2147483647.
Anything else → 400. Previously `page=-1` produced a negative SQL OFFSET → 500.

**Live verification (dev, July 20, 2026, post-restart):**
```
GET /api/public/resources?page=-1   -> 400
GET /api/public/resources?page=abc  -> 400
GET /api/public/resources?page=1e20 -> 400
GET /api/public/resources?page=2&limit=5 -> 200, items: 5, total: 1813
```
Valid paging unaffected.
