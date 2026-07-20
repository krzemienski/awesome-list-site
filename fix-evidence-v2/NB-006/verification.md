# NB-006 — /api/github/search unauthenticated proxy of GitHub search quota

**Fix**:
- `server/routes.ts`: `/api/github/search` now requires `isAuthenticated` + `isAdmin`
  (it only serves the admin GitHub-import discovery surface; no public client callers).
  `page` clamped to [1,50].
- `server/github-api.ts` `searchAwesomeLists`: sends `Authorization: Bearer <token>`
  from `getFallbackToken()` (GITHUB_PERSONAL_ACCESS_TOKEN / GITHUB_PUSH_TOKEN) when
  configured, so the server stops burning GitHub's anonymous 10-req/min shared-IP quota.

**Live verification (dev, July 20, 2026, post-restart):**
```
GET /api/github/search?q=video          (anon)  -> 401
GET /api/github/search?q=video&page=1   (admin) -> 200 {"lists":[{"id":"ellisonleao/magictools",...}],"totalCount":230,"hasMore":true}
```
Real GitHub results returned under admin session; anonymous access fully closed.
