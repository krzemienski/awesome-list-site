# NB-015 — recommendation/learning-path payloads leaked internal resource fields

**Fix**: `server/routes.ts` — all recommendation and learning-path send sites now
pass embedded resources through `stripInternalResourceFields` (the shared public
serializer; strips `searchTsv`, `submittedBy`, `approvedBy`, `githubSynced`,
`lastSyncedAt` + AI-pipeline metadata keys):
- GET + POST `/api/recommendations` → `stripRecommendationInternals` (maps `item.resource`)
- GET `/api/learning-paths/suggested` (anon + authed branches) → `stripPathInternals`
- POST `/api/learning-paths/generate` → `stripPathInternals`
- legacy POST `/api/learning-paths` → `stripPathInternals`
`stripPathInternals` covers both top-level `resources[]` and `milestones[].resources[]`.

**Live verification (dev, July 20, 2026, post-restart):**
```
GET /api/recommendations?limit=3 -> 200
  item keys: [resource, confidence, reason, type, score]
  resource leaks: NONE   metadata leaks: NONE
GET /api/learning-paths/suggested?limit=2 -> 200
  paths: 2, path resource leaks (top-level + milestones): NONE
```
