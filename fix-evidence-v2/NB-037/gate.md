# NB-037 — Recent Sync Jobs ordered oldest-first — VG PASS (July 20, 2026)

**Fix**: `GitHubSyncPanel.tsx` `dedupedQueue` now sorts newest→oldest by `processedAt || createdAt` after dedup, so "Recent Sync Jobs" leads with recent jobs.

**Proof (live, dev)**: seeded 3 QA queue rows out of chronological insert order (insert order: middle 60min ago, oldest 180min, newest 5min). Rendered list (Playwright, authed admin, `/admin/github`):

```
export Jul 20, 2026, 08:43 AM completed   <- newest (inserted LAST)
export Jul 20, 2026, 07:48 AM completed   <- middle (inserted FIRST)
export Jul 20, 2026, 05:48 AM completed   <- oldest (inserted SECOND)
import May 20, 2026, 08:42 AM ×3 failed ...
```

Chronological descending regardless of insertion order. Screenshot: `NB-037-github-recent-jobs.png`. QA rows torn down after capture (repository_url LIKE '%__qa_test_run23%' = 0).
