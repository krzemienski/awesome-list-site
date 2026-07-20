# NB-018 — /api/user/journeys staleness (Profile journeys card)

## Fix (both halves of the staleness)
1. **Server**: `GET /api/user/journeys` now sends `Cache-Control: no-store`
   (server/routes.ts) — the browser can never serve a stale journeys payload
   from HTTP cache.
2. **Client**: `client/src/pages/JourneyDetail.tsx` — both the start-journey
   mutation (`onSuccess`) and the step-progress mutation (`onSettled`) now
   also invalidate `['/api/user/journeys']` (previously only
   `/api/journeys*` was invalidated, so Profile's "My Journeys" query —
   `queryKey: ['/api/user/journeys']` — stayed fresh-but-wrong until reload).

## Live proof (dev, July 20, 2026)
- Header: `curl -i /api/user/journeys` (authed) → `Cache-Control: no-store`.
- End-to-end repro (Playwright, authed admin session, SPA navigation so the
  React Query cache stays alive):
  1. `/profile` → baseline: 1 fetch of `/api/user/journeys`.
  2. SPA-nav to `/journey/6`, click a step toggle (PUT progress fires).
  3. SPA-nav back to `/profile` → the invalidated query REFETCHES:

```json
{ "hasToggle": true, "toggled": true, "baselineFetches": 1, "afterFetches": 2,
  "refetchedOnReturn": true, "cacheControl": "no-store", "pass": true }
```

  4. Step toggled back afterward (net-zero on journey progress).

Before the fix, step 3 served the cached pre-toggle payload (0 new fetches).
