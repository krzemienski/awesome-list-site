# VG-010 — Bookmark date sorting uses `bookmarkedAt` — PASS

**Date:** July 20, 2026 (dev, workflow live)

## Fix
`client/src/pages/Bookmarks.tsx` — both `date-desc` and `date-asc` sort branches now
compare `bookmarkedAt` (when the user saved the bookmark) instead of resource
`createdAt` (when the resource row entered the catalog). No fallback to `createdAt`.
The API (`GET /api/bookmarks` → `UserFeatureRepository.getUserBookmarks`) already
returned `bookmarkedAt` (aliased from `user_bookmarks.created_at`); this was purely a
client sort-key bug.

## Test data (real, via live endpoints — no mocks)
Registered a real local account `__qa_test_run22_bug010@…` via `POST /api/auth/register`
+ `POST /api/auth/local/login`, then bookmarked 4 real approved resources via
`POST /api/bookmarks/:id` with ~1.3s spacing, deliberately in an order that INVERTS
catalog `createdAt` order:

| bookmark order | id | resource createdAt | bookmarkedAt |
|---|---|---|---|
| 1st | 187906 | 2026-06-27 (newest in catalog) | 23:57:49.418Z |
| 2nd | 184739 | 2026-01-20 (oldest in catalog) | 23:57:50.891Z |
| 3rd | 187905 | 2026-06-26 | 23:57:52.335Z |
| 4th | 184740 | 2026-01-20 | 23:57:53.815Z |

API dump: `api-bookmarks-dump.json`.

## Evidence (authed Playwright, session cookie from real login)
- UI "Date: Newest First" row order: **[184740, 187905, 184739, 187906]**
  = API `bookmarkedAt` desc exactly. Screenshot: `bug-010-newest-first.png`.
- Switched via the real Select dropdown → URL synced to `?sort=date-asc`.
- UI "Date: Oldest First" row order: **[187906, 184739, 187905, 184740]**
  = API `bookmarkedAt` asc exactly. Screenshot: `bug-010-oldest-first.png`.
- `createdAt` desc would have been **[187906, 187905, 184740, 184739]** — UI order does
  NOT match it in either direction, proving `createdAt` is not used for this ordering.

## Pass criteria
- [x] Newest First exactly matches descending `bookmarkedAt`
- [x] Oldest First exactly matches ascending `bookmarkedAt`
- [x] UI does not use resource `createdAt` for this ordering

## Teardown (net-zero)
`user_bookmarks` rows (4) deleted, QA user deleted; `users WHERE email LIKE '__qa_test_%'`
count = **0**.

**Verdict: PASS → BUG-011**
