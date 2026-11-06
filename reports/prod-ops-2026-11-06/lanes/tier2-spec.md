# Tier 2 write-path spec (#76 audit account, #77 `[QA-` cleanup)

> Layout is mine; no template was given. Design only: no production contact, no code edits. All paths are in `server/routes/domains/` unless noted. Line numbers read from the `prod-ops` worktree on 2026-11-06. Anything marked **UNVERIFIED** was not confirmed in code or on prod.

Actors: **M** = audit member (non-admin, the dedicated audit account, #76). **A** = audit admin (separate dedicated account). Both sign in through the normal flow and send the session cookie on every call. `<run>` = UTC timestamp, e.g. `20261107T0300Z`. Every created row title starts with `[QA-<run>]`.

## 0. Findings that change the plan

1. **example.com is refused in production.** `catalog-contributions.ts:~804` returns 400 `RESERVED_TEST_HOST_MESSAGE` when `NODE_ENV==='production' && isReservedTestHost(url)` (`shared/validation.ts:165`, RFC 2606 hosts). Step 1 cannot use an example.com URL. Use a unique path on our own host: `https://awesome.video/qa-probe/<run>-1`. It passes the https check, is not a reserved host, and cannot clash with a real resource (duplicate-URL check 409 at `catalog-contributions.ts:~835`). Alternative (needs a code change and owner yes): a server-side QA-host allowlist. Recommended: the own-host path.
2. **Bookmarks need an approved row** (`user-features.ts:161`, 404 unless `status==='approved'`). A pending `[QA-` row cannot be bookmarked. Step 5 bookmarks one existing real approved resource (fixed id chosen at setup) on the audit member only, then removes it. No QA row is involved.
3. **The edit fixture must not be public.** Editing an approved row changes public counts and the sitemap, which Tier 1 checks to ±0. Step 6 therefore edits the *rejected* `[QA-` row left by step 3 (not public).
4. **Rate limit:** 20 accepted submissions per member per hour (`catalog-contributions.ts:128`). Tier 2 submits 2.
5. **The audit log is append-only** (the Audit tab says so). QA runs leave audit rows that the cleanup must not delete (see §2.5). Expected growth per run: about 10 rows.

## 1. Sequence

### Step 1: submit a `[QA-<run>]` resource
- **Actor:** M.
- **Endpoint:** `POST /api/resources` (alias `POST /api/submit`), `catalog-contributions.ts:949-950`; handler `createResourceHandler` `:771`; limiter `:128`.
- **Body:** `{"title":"[QA-<run>] submit probe","url":"https://awesome.video/qa-probe/<run>-1","description":"QA probe, safe to delete. Created by the prod-check Tier 2 run <run>.","category":"Media Tools","metadata":{"tags":["qa-probe"]}}` (category is a name or slug of an existing category; `subcategory` optional).
- **Expected:** `201`, JSON resource with `id`, `status:"pending"`, `submittedBy` = M, `kind:null`. Save `id1`.
- **Read-back:** (a) M: `GET /api/user/contributions` (`user-features.ts:1123`) lists `id1` as pending; (b) A: `GET /api/admin/pending-resources` (`admin-content.ts:523`) contains `id1` (step 2).
- **Undo:** M `POST /api/user/contributions/resource/<id1>/withdraw` (`user-features.ts:1353`) while still pending; after that, cleanup (§2). Never leave it pending: the pending counter shows on Overview and the owner reads it.
- **Side effects:** server analytics `trackServerEvent('resource_submitted')` (`:914`) fires only when the request carries `x-analytics-consent: granted`. **Do not send that header** (and keep `navigator.webdriver`/Playwright). No email. A pending row can be picked up by the link checker (404 on `/qa-probe/...`, one extra "broken" in the scan), so remove it in the same run.

### Step 2: it appears in the approvals queue
- **Actor:** A. **Endpoint:** `GET /api/admin/pending-resources`, `admin-content.ts:523`. No body.
- **Expected:** `200 {resources:[…], total:N}`; one element has `id==id1`, `title` starting `[QA-<run>]`, `status:"pending"`; `total` is the baseline + 1.
- **Read-back:** this is the read-back. Also `GET /api/admin/stats` → `pendingApprovals` = baseline + 1 (`admin-content.ts:171`).
- **Undo:** step 3 or the member's withdraw.

### Step 3: admin rejects it
- **Actor:** A. **Endpoint:** `POST /api/admin/resources/<id1>/reject`, `admin-content.ts:572`.
- **Body:** `{"reason":"QA run <run>: rejecting a test submission."}` (10-5000 chars, `resourceRejectionSchema` `:100`).
- **Expected:** `200`, full resource with `status:"rejected"`. A second call returns 409 (only pending rows can be rejected, `:~595`).
- **Read-back:** A `GET /api/admin/resources?status=rejected&limit=5` contains `id1`; `GET /api/admin/pending-resources` no longer does; M `GET /api/user/contributions` shows `rejected` with the reason; public `GET /api/resources/<id1>` is not 200 (**UNVERIFIED**; should be 404 for non-approved).
- **Undo:** no unreject; cleanup deletes the row. No email or notification found in `rejectResource` (`ResourceRepository.ts:1330`) or the route; grep for email/notification senders in server routes found only `digestService`, which is not called here.

### Step 4: member withdraws a second `[QA-]` submission
- **Actor:** M.
- **4a submit:** repeat Step 1 with title `[QA-<run>] withdraw probe` and url `…/qa-probe/<run>-2`; save `id2`.
- **4b withdraw:** `POST /api/user/contributions/resource/<id2>/withdraw`, `user-features.ts:1353` (calls `withdrawContribution` `:1264`). No body.
- **Expected:** `200 {message:"Resource submission withdrawn", current:{id:id2,kind:"resource",status:"withdrawn",changedAt}}`. Second call: `409` "already withdrawn". Another user's id: `404`.
- **Read-back:** M `GET /api/user/contributions` shows `id2` as withdrawn; A `GET /api/admin/pending-resources` does not contain it; `GET /api/admin/resources?status=withdrawn` does.
- **Undo:** none needed (non-public). Cleanup deletes it.

### Step 5: bookmark add / remove
- **Actor:** M. Target: one existing approved resource, `rid` fixed in the config (not a QA row).
- **Add:** `POST /api/bookmarks/<rid>`, `user-features.ts:161`. Body `{"notes":"QA <run>"}` (optional, ≤500 chars, no control characters).
- **Expected:** `200 {message:"Bookmark added successfully",isBookmarked:true,notes:"QA <run>"}`.
- **Read-back:** `GET /api/bookmarks` (`:222`) contains `rid`.
- **Remove:** `DELETE /api/bookmarks/<rid>` (`:208`). **Expected:** `200 {message:"Bookmark removed successfully"}`. **Read-back:** `GET /api/bookmarks` no longer contains `rid`. Start by confirming `rid` is not already bookmarked by M, so the undo cannot remove a pre-existing bookmark.
- **Undo:** the DELETE is the undo (idempotent; it also cascades if the resource is deleted). Writes to `user_bookmarks` only; no email or analytics seen on these two routes.

### Step 6: admin edit of the `[QA-` fixture row and its revert
- **Actor:** A. Fixture: `id1` (rejected, non-public) from Step 3.
- **Read first:** `GET /api/admin/resources?status=rejected&limit=50` → note `description0` for `id1`.
- **Edit:** `PUT /api/admin/resources/<id1>`, `admin-content.ts:649`. Body `{"description":"[QA-<run>] edited by Tier 2"}` (only this field; do **not** send `status`, `url` or `title`, so nothing changes visibility and the prefix is kept).
- **Expected:** `200`, resource with the new description, `updatedAt` newer.
- **Read-back:** `GET /api/admin/resources?status=rejected` shows the new description.
- **Revert:** `PUT /api/admin/resources/<id1>` with `{"description":"<description0>"}`. **Read-back:** equals `description0`. The audit log gets 2 `updated` rows (not removable).
- **Side effects:** invalidates the public cache (harmless). Whether PUT on a non-approved row enqueues a GitHub sync was **not confirmed**; the checker must read `GET /api/github/sync-status` before and after and stop if the queue grew. Check this before the first run.
- **Optional 6b (edit suggestion path):** M `POST /api/resources/<id1>/edits` (`catalog-contributions.ts:1037`), body `{"proposedData":{"description":"[QA-<run>] suggestion"}}`, then A `POST /api/admin/resource-edits/<eid>/reject` (`admin-content.ts:1281`). Leaves a `resource_edits` row that cleanup removes through the `deleteResource` cascade.

## 2. #77 cleanup endpoint contract (does not exist yet; all new code)

All routes: `isAuthenticated, isAdmin`, plus the **audit-admin allowlist** in 2.4. Mounted in `admin-content.ts` as `/api/admin/qa-rows`. Prefix is a server constant `QA_PREFIX = "[QA-"`; the `prefix` query parameter is accepted only if it equals that constant (400 otherwise), so a client can never widen it.

### 2.1 `GET /api/admin/qa-rows?prefix=[QA-`
Lists everything that carries the prefix. Tables:

| table | match column | deletable here? |
|---|---|---|
| `resources` | `title LIKE '[QA-%'` | yes (via existing `deleteResource`, `ResourceRepository.ts:1214`) |
| `resource_edits` | parent resource title, or `proposed_data->>'title'`/`'description'` starts with prefix | yes, removed with parent (`deleteResource` deletes them) |
| `user_bookmarks` | `notes LIKE '[QA-%'` or parent is a QA resource | yes: cascade with the resource; stray notes listed only |
| `bookmark_collections` | `name LIKE '[QA-%'` | yes (own delete, owner = audit accounts only) |
| `contact_submissions` | `subject LIKE '[QA-%'` | list only (Tier 2 does not submit contact; see §3) |
| `resource_audit_log` | `notes`/`changes` mention a QA title | **list count only, never deleted** (append-only; `resource_id` becomes null after delete) |
| `research_discoveries` | `created_resource_id` in QA ids | detached automatically by `deleteResource` |

Response `200`:
```json
{"prefix":"[QA-","generatedAt":"…","counts":{"resources":2,"resource_edits":1,"user_bookmarks":0,"bookmark_collections":0,"contact_submissions":0,"resource_audit_log":9},
 "rows":{"resources":[{"id":190960,"title":"[QA-…] …","status":"rejected","submittedBy":"<user id>","createdAt":"…","deletable":true}],
         "resource_edits":[{"id":1,"resourceId":190960,"status":"pending","deletable":true}], "…":[]},
 "blocked":[]}
```
Rows where `deletable` is false carry a `reason`. Submitter emails are never returned.

### 2.2 JSON backup format
The checker saves the **full `GET` response plus full row dumps** before any delete, to `reports/prod-check/<UTC>/qa-backup.json`:
```json
{"version":1,"prefix":"[QA-","takenAt":"…","base":"https://awesome.video","tables":{"resources":[{ …all columns… }],"resource_edits":[…],"user_bookmarks":[…]},"auditLogCount":9}
```
`GET /api/admin/qa-rows?prefix=[QA-&full=1` returns the `tables` block with all columns (admin-only, no password-type fields exist in these tables). Delete refuses unless the request carries `backupSha256` equal to the SHA-256 of the `tables` JSON just served (the server keeps the last hash for 10 minutes), so deletion without a fresh backup is impossible.

### 2.3 Delete by id
`DELETE /api/admin/qa-rows/resources/<id>` body `{"backupSha256":"…","expectedTitle":"[QA-…] …"}`.
- `200 {deleted:true, cleanup:{removedEdits,removedPendingEdits,removedJourneySteps,detachedDiscoveries}}` (the existing `deleteResource` summary, one transaction, writes one `deleted` audit row).
- Same shape for `/collections/<id>` (and `/bookmarks` stray-notes cleanup).
- Errors: `400` prefix/hash mismatch, `403` caller not in the allowlist, `404` unknown id, `409` title no longer starts with the prefix (changed since the list) or FK conflict.

### 2.4 Guards (all server-side)
1. **Prefix check inside the DB statement**, not only in the handler: load the row `FOR UPDATE` in the same transaction as the delete and require `title LIKE '[QA-%'` there; if not, roll back with `409`. This closes the window where a row is renamed between list and delete.
2. `expectedTitle` must equal the stored title exactly (second independent check).
3. **No wildcard or bulk delete.** One id per call; no "delete all matching". A run deleting N rows makes N calls.
4. **Allowlist:** only the dedicated audit-admin user id(s) in a server env var (`QA_CLEANUP_USER_IDS`) can call it; the owner and other admins get `403`. Rows may only be deleted if `submittedBy` or `createdBy` is an audit account (member or admin), so a real contributor who happens to type `[QA-` cannot have a row removed.
5. Reject ids whose `status` is `approved` unless the title matches and the audit allowlist applies; Tier 2 never approves, so approved QA rows should be zero and any found are reported as `blocked`.
6. The guards apply in every environment; there is no dev-only bypass.
7. The route never touches `resource_audit_log`, `users`, or any table not listed in 2.1.
8. Every call writes an audit row `qa_cleanup` with the id and title (so the cleanup itself is visible in the Audit tab).

### 2.5 Re-read 404
After each delete: `GET /api/admin/resources?status=…` no longer lists the id; `GET /api/resources/<id>` returns `404`; `GET /api/admin/qa-rows?prefix=[QA-` has `counts.resources==0`, `counts.resource_edits==0`. The run fails if any QA row remains, or if `GET /api/admin/stats` `pendingApprovals` differs from the baseline taken before Step 1.

## 3. Analytics and email summary

| Step | Analytics | Email | How to avoid |
|---|---|---|---|
| 1, 4a submit | server `resource_submitted` (`catalog-contributions.ts:914`) only if header `x-analytics-consent: granted` is sent | none found | send no consent header; use `fetch`/Playwright with `navigator.webdriver` true; no PostHog/Mixpanel cookie consent |
| 3 reject | none found | none found in route or repo | none needed |
| 4b withdraw, 5 bookmarks, 6 edit | none found | none found | none needed |
| Digest / contact | digest job is scheduled separately (`services/digestService.ts`); contact form sends mail | yes | Tier 2 must not touch `/api/contact` or digest preferences; those are Tier 3 or off-limits |
| Browser sign-in for A and M | client analytics (Clerk, PostHog) | Clerk sends none on sign-in | use headless Playwright; webdriver true suppresses analytics (LANE-RULES) |

## 4. Open items before first run
- Decide the URL approach (own-host path recommended; allowlist needs code).
- Confirm no GitHub sync enqueue on PUT of a rejected row (Step 6).
- Confirm public `GET /api/resources/<rejected id>` returns 404.
- Create the audit admin; do not reuse the owner session (sign-out revokes all owner sessions).
- Tables other than `resources` list their match columns from `shared/schema.ts`; confirm `user_bookmarks.notes` and `resource_edits` JSON paths when writing the endpoint.

## 5. Resolved (2026-11-06; code reads + owner-header GET + anonymous curl)

**(1) Admin PUT on a rejected row: no GitHub sync, no email.** Trace: `PUT /api/admin/resources/:id` (`admin-content.ts:649`) → validation (`adminResourceWriteSchema.partial()`, `:~700`) → `runInTransaction` → `ensureSubSubcategoryExists` (only touches sub_subcategories if a sub-subcategory is in the body; omit it) → `resourceRepo.updateResource` (`ResourceRepository.ts:1107`) → `withResourcePublication` → `transitionResourceInTransaction` (`repositories/resourcePublication.ts:26-100`): row lock, `UPDATE resources`, one `resource_audit_log` insert (`action:'updated'`, as `status` is unchanged), then `invalidatePublicCache('resource-mutation')` after commit (`:17`). A grep of `ResourceRepository.ts` for `githubSyncQueue`/`enqueue` found nothing, and the route contains no analytics, email or notification call. Only side effects: the audit row (permanent) and a public-cache flush. **Do not send `status`**: a status change would also set approvedAt/statusChangedAt and add a status audit row.

**(2) Public GET on a rejected id: 404 on both.** Rejected id 190945 (an `[AUDIT]` row; chosen from `GET /api/admin/resources?status=rejected&limit=1`), anonymous curl: `/api/resources/190945` → **404**, `/resource/190945` → **404**. Step 3's read-back can assert 404 on both.

**(3) Read-back JSON paths.**
- Edit suggestion (Step 6b): `GET /api/admin/resource-edits/recent` returns an array of `{id, resourceId, resourceTitle, status, fields:[…], rejectionReason, createdAt, resolvedAt, submittedByEmail}`. Match on `resourceTitle` starting `[QA-` (or `resourceId` in the QA ids); `fields` lists the changed field names (e.g. `["description"]`). The pending list is `GET /api/admin/resource-edits?status=pending` (empty array now). Strip `submittedByEmail` before saving.
- Backup/cleanup match for edits: `resource_edits.proposed_data->>'description'` and `proposed_changes` (jsonb `{field:{old,new}}`) in the DB; the API exposes only `fields`, so the endpoint should match through the parent resource title.
- Bookmark: `GET /api/bookmarks` (`user-features.ts:222`, repo `UserFeatureRepository.getUserBookmarks`) returns the resource rows joined to the bookmark with `notes`, `bookmarkedAt`, `queueStatus`, `archivedAt`, `personalTags`; it only includes approved resources. Assert on `id == rid` and `notes == "QA <run>"`. Match column for cleanup is `user_bookmarks.notes`; the join key is `resourceId`.
- Not exercised: I did not call `/api/bookmarks` (needs the audit member session) so the exact top-level wrapper (array vs object) is from the repo return type, not a live response. Confirm on the first run.
