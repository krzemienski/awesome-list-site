# NB-008 — 20-digit numeric ids overflow int4 → 500

**Root cause**: all-digit ids past 2^31−1 (e.g. `99999999999999999999`) pass `\d+`
route regexes and `parseInt`, then overflow PostgreSQL int4 inside the query → 500.
(Literal `1e20` already failed parseInt → 404; the 500 repro is the digit form.)

**Fix**: new `parseBoundedInt` + `PG_INT_MAX` in `server/validation/inputs.ts`
applied at every numeric-id read path:
- `server/routes.ts`: resource detail (both aliases), `/api/resources/:id/related`,
  `/api/journeys/:id`, `/api/subcategories?categoryId`, `/api/sub-subcategories?subcategoryId`
- `server/api/public.ts`: `/api/public/resources/:id`

**Live verification (dev, July 20, 2026, post-restart):**
```
GET /api/resources/99999999999999999999        -> 404 (was 500)
GET /api/resource/99999999999999999999         -> 404
GET /api/journeys/99999999999999999999         -> 404
GET /api/public/resources/99999999999999999999 -> 400
GET /api/resources/2147483648                  -> 404 (first out-of-range int)
GET /api/resources/99999999999999999999/related -> 200 {"similar":[],"prerequisites":[],"nextSteps":[],"totalFound":0}
GET /api/subcategories?categoryId=99999999999999999999      -> 400
GET /api/sub-subcategories?subcategoryId=99999999999999999999 -> 400
Sanity: /api/resources/186820 -> 200 ; /api/journeys/8 -> 200
```
