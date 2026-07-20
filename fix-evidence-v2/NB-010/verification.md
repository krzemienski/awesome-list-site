# NB-010 — anon /recommendations no longer pulls the 3.1MB corpus

## Fix
`/recommendations` removed from the corpus-eligible route set in BOTH places
that trigger the full `/api/awesome-list` fetch:
- `client/index.html` early-fetch route list
- `needsCorpusRoute()` in `client/src/lib/static-data.ts`

`Recommendations.tsx` already gates its corpus-backed query on
`enabled: isAuthenticated`, so authed users still get corpus-enriched
recommendations; anonymous visitors get the API-served list with zero corpus
transfer.

## Live proof (Playwright, dev, July 20, 2026)
Anonymous context, full request capture on `/recommendations`:

```json
{ "apiPaths": ["/api/awesome-list/nav", "/api/auth/user", "/api/recommendations"],
  "fullCorpusFetches": 0, "navFetches": 1, "pass": true }
```

- ZERO requests to `/api/awesome-list` (the 3.1MB corpus).
- `/api/awesome-list/nav` is the intentional lightweight sidebar-nav endpoint
  from the R-06 nav/corpus split — expected on every route, not the corpus.
