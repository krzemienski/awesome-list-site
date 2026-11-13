# B9: `GET /api/admin/usage` design

> Layout is mine; no template given. Design only: no code edits, no prod writes. Line numbers are from `shared/schema.ts` in the `prod-ops` worktree (2026-11-06). Prod row counts from my earlier GETs: users 143, resources 4,315.

## 1. Purpose
One admin GET that returns, per member feature, how many **real** people used it in the last 28 d, 90 d and all time, with test/audit accounts reported separately. This makes member-feature tiering measurable instead of guessed. Today `auth.*` audit rows stopped in Aug 2026 and 29 of 143 users have `[AUDIT]`-style names, so audit rows and raw table counts cannot answer it.

## 2. Test-account definition (server-side)

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. `users.is_test boolean not null default false`** (recommended) | New column on `users` (`schema.ts:107`). Set by a one-time backfill from the heuristic below and by the admin user-create path for the audit accounts (#76). | Exact, indexable, one source of truth; the cleanup endpoint (#77) can reuse it as the "audit account" test; survives renames. | Needs a schema change (`db:push`, owner approval) and a backfill; must be set on every new audit account or it silently counts as real. |
| B. Heuristic at query time | `users.first_name/last_name ILIKE '[AUDIT%' OR '[QA-%'`, or `email` domain in a server env list (`USAGE_TEST_EMAIL_DOMAINS`, e.g. `fldubai.com,example.com`), or the audit user ids from `QA_CLEANUP_USER_IDS` | No schema change; works now. | Misses a test account with a normal name; a real person with `fldubai.com` mail is miscounted; drifts. |
| C. A `role` value such as `test` | `users.role` (`:~114`, text: user/admin/moderator) | No new column. | Breaks every `role==='admin'`/`'user'` check and the Users tab; rejected. |

There is **no existing server-side test-account flag**: I searched server, client, shared and scripts for `is_test`, `isTestAccount`, `isInternal` and found nothing. The analytics suppression is client-side (`navigator.webdriver`) and cannot be reused on the server.
**Recommendation:** ship B first behind a single SQL fragment (`testUserPredicate`), then replace its body with `u.is_test` when A lands. The response states `testDefinition: "heuristic"|"column"` so readers know which one they got. The backfill for A is `UPDATE users SET is_test = true WHERE <heuristic>`; review the 29 name matches before running it.

## 3. Metrics, tables and columns

Windows: `w28 = now()-28d`, `w90 = now()-90d`, `all`. Each metric returns `{rows, users}` (event count and distinct users) for each window and for `real` / `test` (join `users u ON u.id = t.user_id`).

| Metric | Table (schema.ts line) | Columns used | Window column | Notes |
|---|---|---|---|---|
| bookmarks | `userBookmarks` (:946) | `userId`, `resourceId`, `createdAt`, `archivedAt`, `queueStatus` | `createdAt` | also `activeNow` = `archivedAt IS NULL` |
| favorites | `userFavorites` (:915) | `userId`, `resourceId`, `createdAt` | `createdAt` | |
| collections | `bookmarkCollections` (:1005) | `userId`, `createdAt`, `archivedAt`, `publishedAt`, `shareId` | `createdAt` | `published` = `publishedAt IS NOT NULL`; window for published = `publishedAt` |
| collection items | `bookmarkCollectionItems` (:1032) | `collectionId`, `userId`, `createdAt` | `createdAt` | depth signal |
| journey enrolments | `userJourneyProgress` (:1089) | `userId`, `journeyId`, `startedAt`, `completedAt`, `lastAccessedAt`, `completedSteps` | `startedAt` | `progressed` = `jsonb_array_length(completed_steps)>0`; `completed` window = `completedAt` |
| recommendation feedback | `userRecommendationFeedback` (:1567) | `userId`, `feedback`, `createdAt`, `updatedAt` | `createdAt` | grouped by `feedback` value (helpful, hidden, not_for_me, already_known, restored) |
| submissions | `resources` (:285) | `submittedBy` (:307), `status` (:306), `createdAt` (:319) | `createdAt` | `submittedBy IS NULL` = system/import/research bucket, shown as `system`; split by status |
| edit suggestions | `resourceEdits` (:474) | `submittedBy`, `status`, `createdAt`, `withdrawnAt` | `createdAt` | by status |
| API keys created | `apiKeys` (:195) | `userId`, `createdAt`, `revokedAt` | `createdAt` | |
| API keys used | `apiKeys` | `lastUsedAt` (+`revokedAt IS NULL`) | `lastUsedAt` | "active keys" = used in window; `lastUsedAt` is last use only, so a window count is "keys whose last use falls in window" |
| digest opt-ins | `notificationPreferences` (:1291) | `userId`, `emailDigestEnabled`, `inAppEnabled`, `emailOptedInAt`, `emailUnsubscribedAt`, `inAppOptedInAt`, `lastEmailDigestAt` | `emailOptedInAt`/`inAppOptedInAt` | `currentEmail` = enabled and `emailUnsubscribedAt IS NULL`; `sent28d` = `lastEmailDigestAt` in window |
| notifications read | `inAppNotifications` (:1362) | `userId`, `kind`, `readAt` (:~1385), `createdAt` | `readAt` | plus created, so a read rate can be derived |
| interactions by type | `userInteractions` (:1533) | `userId`, `interactionType`, `timestamp` | `timestamp` | grouped by `interactionType` (view, click, bookmark, rate, complete) |
| sign-ups by month | `users` (:107) | `id`, `createdAt` (:123) | `date_trunc('month', created_at)` | last 24 months, real vs test; replaces the lost `auth.register` audit rows |
| totals | `users` | `role`, `deletionRequestedAt` | n/a | members, admins, deletion requests |

Caveat to print in the response (`notes`): FKs to `users` cascade on delete (`onDelete: "cascade"`, e.g. :~919, :~950, :307), so deleted accounts' history is gone and `deletedUserTombstones` (:146) is the only trace. Historical all-time numbers are a floor.

## 4. Response shape
```json
{"generatedAt":"…","testDefinition":"heuristic","windows":{"w28":"…","w90":"…"},
 "signupsByMonth":[{"month":"2026-07","real":78,"test":7}],
 "features":{"bookmarks":{"w28":{"real":{"rows":0,"users":0},"test":{"rows":0,"users":0}},"w90":{…},"all":{…}},
   "favorites":{…},"collections":{…,"published":{…}},"journeys":{"enrolled":{…},"progressed":{…},"completed":{…}},
   "recommendationFeedback":{"byValue":{"helpful":{…}}},"submissions":{"byStatus":{…},"system":{…}},
   "editSuggestions":{…},"apiKeys":{"created":{…},"usedLastInWindow":{…}},
   "digest":{"emailOptedIn":{…},"currentEmail":N,"inApp":{…}},"notificationsRead":{…},
   "interactions":{"byType":{"view":{…}}}},
 "totals":{"users":{"real":N,"test":N},"admins":N}}
```
No emails, names or user ids are returned; only counts.

## 5. Query cost and indexes
- All tables are small now (users 143; resources 4,315), so a sequential scan per table is milliseconds. Use one `SELECT … COUNT(*) FILTER (WHERE …)` per table (about 12 queries), run in parallel with `Promise.all`, instead of per-window queries.
- Distinct users: `COUNT(DISTINCT t.user_id) FILTER (…)`.
- Existing indexes cover joins by user (`idx_user_bookmarks_queue`, `idx_user_journey_progress_user_id`, `idx_user_interactions_user_id`, `idx_api_keys_user_id`, `idx_in_app_notifications_user_read`). **No new index is needed now.** The only table that can grow is `user_interactions` (index on `interaction_type`, none on `timestamp`); if it passes ~1M rows add `(timestamp)` or `(interaction_type, timestamp)`.
- With option A, add `CREATE INDEX … ON users (is_test)` only if users passes ~100k; not needed.
- Set `statement_timeout` for this connection to 5 s so a bad plan cannot hold a pool connection.

## 6. Guard, caching, size
- Route: `app.get('/api/admin/usage', isAuthenticated, isAdmin, asyncHandler(…))`, same guard as `admin-content.ts:171`. Read-only; no audit row.
- Caching: **not** the public cache (`server/cache/publicCache.ts` is for visitor data and is invalidated on resource writes). Use a 60 s in-process memo keyed on nothing, and `Cache-Control: private, no-store`. Admin-only; staleness of 1 minute is fine.
- Size: new file `server/routes/domains/admin-usage.ts`, about 130-160 lines (helpers `windowCounts`, `testPredicate`, route), registered next to the other domain routes (1 line), plus for option A a 1-line `schema.ts` column and a migration (about 10 lines). Under the 500-line limit.
- Verify after build on prod GET only: response 200 as owner, 403/401 anonymous, `totals.users.real + test` equals `GET /api/admin/stats` `users` (143 now).

## 7. Use by Tier 2 extension steps and the daily anomaly check (PLAN §7)
- **Tier 2 isolation check (lead edit 2026-11-06; Tier 3 stays read-only per consistency-review row 8):** Tier 2 extension round-trips, which run after #77 ships, (journey enrol/unenrol, collections, digest preferences) run only on the audit member. Read `/api/admin/usage` before and after: `test` counts must rise by the expected deltas and **`real` counts must be unchanged**. A real-count change during a Tier 3 run means either a test write hit a real user or a real user acted meanwhile; log it, do not fail the deploy.
- **Daily anomaly check (store yesterday's JSON, compare):**
  1. any feature whose `real.w28.users` was > 0 in the previous snapshot and is now 0 (feature silently broke or died);
  2. `signupsByMonth` current month `real` = 0 after day 10 (sign-up path down; Clerk or webhook);
  3. `real.w28.rows` for submissions/bookmarks dropping > 70 % week over week;
  4. `test` share of all-time rows > 50 % (audit noise drowning the signal);
  5. `apiKeys.usedLastInWindow.w28` = 0 while keys exist (API consumers gone);
  6. `digest.currentEmail` falling or `lastEmailDigestAt` older than the cadence (digest not running).
  Output goes in the daily summary; none of these blocks a deploy.
- **Tiering:** features with `real.w90.users` of 0-2 are candidates for Tier 3 (weekly, non-blocking); features above, for example, 10 real users in 28 d move up to Tier 2 write-path checks. Thresholds are the owner's to set.

## 8. Open items
- Owner decision: A (column, `db:push`) or B only.
- Confirm the exact heuristic list by reviewing the 29 `[AUDIT]`-named users and any real users on test domains before backfill.
- `inAppNotifications.readAt` and `createdAt` lines are approximate (+-3) because I read them from a 35-line window; re-check when coding.

## 9. Heuristic check (2026-11-06; GET /api/admin/users, both pages, 143 users; counts only)

| Rule | Users caught |
|---|---|
| R1 name starts `[AUDIT` or `[QA-` | 1 |
| R2 email domain in a test list (`example.com/.org/.net`, `*.example.com`, `example.invalid`, `test.com`, `mail.tm`, `mailinator.com`, `fldubai.com`, `vqa*`) | 63 with a narrower first list; 83 after adding `test.com` (18 users incl. one malformed `test.com<script>` domain) |
| R3 email local part has an `audit` or `qa` token (`audit`, `qa-`, `qa_`, `qa.`, `+qa`, `qa<digit>`) | 2 more |
| R1 or R2 or R3 (recommended) | **85** |
| Analytics lane regex (`analytics.md:21`) | 85 |

- **Overlap with analytics' 85:** 85 of 85, in both directions (0 only-mine, 0 only-theirs). My first, narrower list (no `test.com`) caught 63, missing 22 `test.com` users; the two last stragglers were an audit alias on the awesome.video domain and one alias on another domain, both caught by R3.
- **Correction to my first report:** I wrote that 29 users have `[AUDIT]`-style names. That count came from a loose case-insensitive match on `AUDIT|QA|[` that also hit ordinary names containing "qa". Only **1** user has a bracketed marker name. Test accounts are identified by their email domain, not their name. Please use 85 (not 29) and treat my earlier "29" as wrong.
- **Admins:** 3 of the 4 admin-role accounts are flagged (test.com/example/audit addresses). The 4th, unflagged, is the real owner. So `is_test` must never be used as a permission or deletion gate for admins; for #77 use the explicit `QA_CLEANUP_USER_IDS` allowlist, not this predicate.
- **Risk:** R2/R3 are keyword rules. A real user with `qa-` or `+qa` in their address would be flagged; none among the 143 today (the 85 equal the analytics regex, which a human reviewed lane-side only by pattern, so this is not a manual check of each row).

**Recommended predicate (SQL-equivalent, lower-cased):**
```sql
lower(coalesce(first_name,'')||' '||coalesce(last_name,'')) ~ '^\s*\[(audit|qa)'
OR split_part(lower(email),'@',2) ~ '^(mail\.tm|mailinator\.com|fldubai\.com|vqa.*|test\.com.*|example\.invalid)$|(^|\.)example\.(com|org|net)$'
OR split_part(lower(email),'@',1) ~ '(^|[^a-z])(audit|qa)[-_.+0-9]'
```
Keep the domain list in a server constant so a new audit domain is one line. Then backfill `is_test` from it once (decision 19) and review the diff against the 85 before running.
