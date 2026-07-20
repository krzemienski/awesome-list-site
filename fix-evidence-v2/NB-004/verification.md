# NB-004 — /api/public/resources?limit=-1 → full-table dump

**Fix**: `server/api/public.ts` list route now validates `limit` through `parseBoundedInt`;
invalid (negative, zero, non-numeric, overflow) → 400; valid values clamped to [1,100].
Previously `limit=-1` passed `Math.min(-1, 100)` unchecked and PG treats `LIMIT -1`
as "no limit" → entire corpus in one response.

**Live verification (dev, July 20, 2026, post-restart):**
```
GET /api/public/resources?limit=-1  -> 400 {"message":"limit must be a positive integer between 1 and 100"}
GET /api/public/resources?limit=0   -> 400
GET /api/public/resources?limit=abc -> 400
GET /api/public/resources?limit=500 -> 200, items: 100 (clamped)
GET /api/public/resources?limit=5   -> 200, items: 5
```
