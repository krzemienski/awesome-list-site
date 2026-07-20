# NB-005 (+NB-057) — /api/health/ai public deep mode + internal counters

**Fix**: `server/routes.ts` `/api/health/ai`:
- Anonymous / non-admin callers get `{status}` ONLY — internal counters
  (`requestCount`, `cacheSize`, `cacheHitRate`, `available`) are admin-only (NB-057).
- `?deep=1` (spends a real paid Claude round-trip) now requires an admin session:
  anonymous → 401, authenticated non-admin → 403 (NB-005).

**Live verification (dev, July 20, 2026, post-restart):**
```
GET /api/health/ai            (anon)  -> 200 {"status":"healthy"}          # no counters
GET /api/health/ai?deep=1     (anon)  -> 401
GET /api/health/ai            (admin) -> 200 {"status":"healthy","available":true,"requestCount":3,"cacheSize":3,"cacheHitRate":0}
GET /api/health/ai?deep=1     (admin) -> 200 {"status":"healthy","connectionOk":true,...}  # real round-trip
```
