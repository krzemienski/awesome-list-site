# NB-038 — sync-status / sync-history megapayloads — VG PASS (July 20, 2026)

**Fix**: `server/routes.ts` — `/api/github/sync-status` and `/api/github/sync-history` now map rows to summary fields only; `resourceIds` array, `snapshot`, and `metadata` blobs are stripped from list responses. Full detail remains available per-job on `/api/github/sync-status/:id`.

**Proof (live, dev, authed admin curl)**:
- `/api/github/sync-status`: **45,287 B → 8,434 B** (pre-fix vs post-fix, same dev data). The prod 2.7 MB payload was the same shape at prod scale — same strip applies.
- `/api/github/sync-history`: 11,865 B, 38 entries; keys per entry: `id, repositoryUrl, direction, commitSha, commitMessage, commitUrl, resourcesAdded, resourcesUpdated, resourcesRemoved, totalResources, performedBy, createdAt` — **no `snapshot`/`metadata` present** (programmatic scan over all entries: false).
- `/api/github/sync-status` entries scanned for `resourceIds`/`metadata`: none.

Payloads saved: `sync-history.json`, `sync-status.json`.
