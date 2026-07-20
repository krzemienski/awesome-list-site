# NB-007 — /api/recommendations limit unvalidated (limit=-5 / limit=500)

**Fix**: `server/routes.ts` — shared `parseRecommendationLimit` applied to BOTH
GET and POST `/api/recommendations`: missing → default 10; invalid (negative, zero,
non-numeric, overflow) → 400; valid values capped at 50.

**Live verification (dev, July 20, 2026, post-restart):**
```
GET /api/recommendations?limit=-5   -> 400 {"error":"limit must be a positive integer (max 50)"}
GET /api/recommendations?limit=abc  -> 400
GET /api/recommendations?limit=0    -> 400
GET /api/recommendations?limit=1e20 -> 400
GET /api/recommendations?limit=3    -> 200, items: 3
```
