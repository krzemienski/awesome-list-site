# Lane: admin-content (prod-ops 2026-11-06)

> Layout is mine (LANE-RULES per-feature table + evidence-of-use section); no template was given.
> Production https://awesome.video, owner session imported from the cached header (no login). Viewport 1440x900, 390x844 spot-check of Approvals and Enrichment.
> Evidence dir: `evidence/admin-content/` (R = `reports/prod-ops-2026-11-06`). Session still returned 200 on GET /api/admin/stats at the end. Browser session closed.
> `navigator.webdriver` = true (recorded once at start).

## Method / HAR table
HAR: `evidence/admin-content/admin-content.har` (2241 entries, request/response bodies and cookies stripped; no Cookie/Authorization headers were present).

| Method | Requests to awesome.video | Status |
|---|---|---|
| GET | 2197 | 2043x 200, 66x 304, 88x status 0 (aborted/blocked subresources, e.g. blob/analytics) |
| POST / PUT / PATCH / DELETE | **0** | none |

Auto requests on load: only GETs (`/api/auth/user`, `/api/notifications`, Clerk `__clerk/v1/environment|client`, admin stats/pending/users/audit-logs/health calls). No non-GET fired, from the SPA or from my clicks.
Clicks made: tab links by URL (`/admin/<tab>`), the row **Edit** icon on Resources (opens the dialog; no request sent; closed with Escape), **Review Discoveries** and **Job History** buttons on Researcher, **Logs** on Enrichment job #37 (fires GET `/api/enrichment/jobs/37` and `/events` only). No Save, Approve, Reject, Run, Launch, Sign out clicked.
Direct API reads: GET only, with the owner header.

## Tabs (the page has 15: Overview, Approvals, Edits, Enrichment, Researcher, Export, Database, Resources, Categories, Subcategories, Users, GitHub, Link Health, Audit, Research; Journeys, Digests and Sub-Subcats live under the Settings menu)
Skipped as admin-ops lane: Export, Database, GitHub, Link Health, Digests.

| ID | Feature | Entry | What it does | Result + evidence | Console/network errors | Write paths deferred | Essential? |
|---|---|---|---|---|---|---|---|
| AC-01 | Overview | `/admin/overview` | Counts (resources 4,074, 99 subcategories, active users 26, pending approvals 23 "oldest 73d"), latest 6 audit events, system health (DB, GitHub sync, link checker, enrichment, researcher) | works. `tab-overview-1440.png`, `stats.json`. Health banner reads "Some systems are still working" (GitHub sync completed 109d ago, link checker 27 broken) | none | none | core: the admin landing page |
| AC-02 | Approvals queue | `/admin/approvals` | Lists pending submissions with Review / Approve / Reject per row, bulk "Approve all" and "Bulk reject" | works. 23 pending, see evidence of use. `tab-approvals-1440-masked.png`, `tab-approvals-390.png` (no horizontal overflow, scrollWidth = clientWidth = 384) | none | Approve / Reject per row (POST `/api/admin/resources/:id/approve|reject`), Approve all / Bulk reject (POST `/api/admin/resources/bulk/*`), Review dialog | core: only moderation path for public submissions |
| AC-03 | Edit suggestions | `/admin/edits` | "Edit history": pending edits (0) + last 10 resolved (approved/rejected/withdrawn/superseded); "Check again" refetches | works. `tab-edits-1440.png` | none | per-edit approve/reject (POST `/api/admin/resource-edits/:id/approve|reject`), none shown because queue is empty | core: contributor edit moderation |
| AC-04 | Enrichment | `/admin/enrichment` | LLM metadata enrichment: job table, "Run job", per-job Logs with agent comm graph, cost per batch | works (history + log viewer load). `tab-enrichment-1440.png`, `tab-enrichment-390.png`, `enrichment-jobs.json` | none | Run job (POST `/api/enrichment/start`), cancel/delete job (DELETE `/api/enrichment/jobs/:id`), backfill-suggestions (POST) | supporting: batch metadata enrichment, rarely used (see below) |
| AC-05 | Researcher | `/admin/researcher` | 5-step run launcher (brief, focus, limits $3 cap / 40 turns, endpoint, launch), Review Discoveries, Job History | works. `tab-researcher-1440.png`, `researcher-job-history-1440.png`, `researcher-jobs.json`. Config shows router.hack.ski, orchestrator cc/claude-sonnet-5, scout cc/claude-haiku-4-5 | none | Launch research run (POST `/api/researcher/start`), cancel/delete (DELETE `/api/researcher/jobs/:id`), discoveries approve/reject/approve-all (POST) | supporting: the main source of new catalog entries (2,307 approved discoveries) |
| AC-06 | Research workspace | `/admin/research` | Read-only briefs from the latest four research jobs (title, candidates, age) | works. `tab-research-1440.png`: 0, 0, 2, 0 candidates | none | none | incidental: read-only view of the Researcher history |
| AC-07 | Resources | `/admin/resources` | Paginated table (25/page of 4,074), filters (category, status, featured, search, sort), Add, per-row Select / Feature / Edit / Delete, bulk select | works. Edit dialog opened with no network call (fields: title, URL, description, category, status, subcategory, sub-subcategory, kind override, featured, format, provider; Cancel/Save Changes). `tab-resources-1440.png`, `resource-edit-dialog-open-1440.png` | none | Save Changes (PUT `/api/admin/resources/:id`), Delete (DELETE), Add (POST `/api/admin/resources`), Feature toggle (PATCH), bulk approve/reject/delete | core |
| AC-08 | Categories | `/admin/categories` | Table of 9 categories with resource and subcategory counts; Search, Add, Edit | works. Category counts sum to 4,074 (135+650+527+402+311+749+461+481+358), equal to the public total. `tab-categories-1440.png` | none | Add/Edit/Delete (POST/PATCH/DELETE `/api/admin/categories`) | core |
| AC-09 | Subcategories | `/admin/subcategories` | 99 subcategories with parent and counts | works. `tab-subcategories-1440.png` | none | Add/Edit/Delete (`/api/admin/subcategories`) | core |
| AC-10 | Sub-subcategories | Settings menu, "Sub-Subcats" (`/admin/subsubcategories`, rendered under Subcategories) | 32 third-level groupings | API read works (`GET /api/admin/sub-subcategories` -> 32). UI not walked separately: it shares the Subcategories tab | none | Add/Edit/Delete (`/api/admin/sub-subcategories`) | supporting |
| AC-11 | Tags | No dedicated admin tab. Tags show as chips in the Resources table; `GET /api/tags` returns 1,630 | Tag admin = edit tags inside a resource; bulk tag cleanup is `POST /api/admin/maintenance/canonicalize-tags` (admin-ops file) | works read-only | none | canonicalize-tags (POST), `maintenance_canonicalize_tags` ran 11 times 2026-07-20..24 | supporting |
| AC-12 | Journeys admin | Settings menu > Journeys (`/admin/journeys`) | Edit steps of each learning journey, "Changes go live immediately" | works. 5 journeys, all published, 6 steps each. Last updated: FFmpeg Mastery 2026-11-06, Video Streaming Fundamentals 11-03, DRM & Content Protection 10-30, two on 07-12 | none | step create/update/delete/reorder (`journey.*` audit actions) | supporting |
| AC-13 | Users | `/admin/users` | User table (name, email, role, joined), Edit, Export CSV, "Invite unavailable" | works. 143 users (no screenshot kept: it shows names and emails) | none | role change (PUT), name edit (PATCH), delete (DELETE), link-clerk (POST), Export CSV (GET, but audit-logged as `users.exported`, so not clicked) | supporting |
| AC-14 | Audit log | `/admin/audit` | Append-only log, 25 per page, actor / action / target / status / when | works. 19,155 entries. `tab-audit-1440-masked.png`, `audit-log-by-action.json`, `audit-log-by-month.json` | none | none | core: the only change history |
| AC-15 | AI health/config | `GET /api/health/ai`, shown in Overview and Researcher | AI router config | works: status healthy, available, endpoint router.hack.ski, primary cc/claude-sonnet-5, flows per task (tagging, enrichment, researchScout on haiku; journeySeeding, researchOrchestrator on sonnet). requestCount 0, cacheSize 0 (counter is per process, so it reads 0 after a restart) | none | none | supporting |
| AC-16 | Claude analyze | `POST /api/claude/analyze` (admin-content.ts:1321) | URL analysis helper used from the add-resource flow | not exercised (POST, rate-limited AI call) | n/a | POST, deferred | incidental |

## Evidence of use (all read from GET responses; dates are 2026)

**Catalog:** 4,315 resource rows = 4,074 approved/public + 23 pending + 148 rejected + 29 archived + 41 other (stats: totalPublic 4074, totalPending 23, totalRejected 148). Latest resources write 2026-11-06T18:09Z.

**Approvals queue (real):** 23 pending, oldest 2026-08-26 (CosmoEdge, 73d) and newest 2026-11-06 (two VideoText entries, Mago Studio). Dates: Aug 2, Sep 6, Oct 12, Nov 3. They look like real outside submissions (product names, no QA markers). The queue is not being drained: 23 waiting, median age more than 3 weeks. Approvals in the audit log stop after 2026-11-05.

**Edit suggestions:** pending 0. Last 10 resolved: 9 rejected + 1 withdrawn. The rejected ones are almost all `[AUDIT]` / `[AUDIT-TEST]` edits made by audit accounts (most recent 2026-11-06, "C22 test edit"). No real contributor edit has been approved recently (audit log: 38 `edit_approved` since 2026-07-02, 77 `edit_rejected`, 139 `edit_suggested`).

**Enrichment (`/api/enrichment/jobs`, 36 jobs):** statuses cancelled 8 / completed 25 / failed 3. First 2025-11-18, last 2026-11-06 (job #37, cancelled after 1 resource, $0.0231). Recorded cost totals only $0.34, but cost is recorded only from Oct 2026; earlier jobs have none, so total spend is a lower bound. Jobs per month: 2025-11 x15, 2025-12 x1, 2026-02 x4, 2026-06 x3, 2026-07 x8 (all 0 resources succeeded), 2026-10 x4, 2026-11 x1. 276 resources processed, 238 ok, 18 failed. All four Oct-Nov jobs are 1-30 resources and were cancelled: looks like probing of the batch=1 path, not production use. 3,009 resources still unenriched. Audit log: 83 `ai_enriched` events 2026-02-12..2026-11-06.

**Researcher (109 jobs; list returned 100):** completed 47, cancelled 33, budget_stopped 11, failed 9 (of the 100 listed). First 2026-06-25, last 2026-11-06 02:11 (cancelled, $0.08). By month: 2026-06 4 runs $4.46; 2026-07 50 runs **$487.34** (2,019 discoveries, 2,017 approved); 2026-10 43 runs $99.09 (277 discoveries); 2026-11 3 runs $1.31 (2 discoveries). Total about **$592** across the 100 listed runs, 2,310 discoveries, 2,307 approved, 4 rejected, 2,185 duplicates skipped. Last 90 days (from 2026-08-08): 46 runs, $100.40, 18 completed. Prompts are mostly "AUTO-GENERATED RESEARCH BRIEF" campaigns plus five "Five-pass sustained catalog audit" and three "qa5 probe prompt" runs (QA noise). Two starter identities: one account started 81, another started 19 (ids not recorded here). Discoveries queue (`/api/researcher/discoveries`) is empty: nearly everything is auto-approved, the 4 rejections are the only human-style rejects. Heavy use in July, steady since late October, three runs in the last 4 days all yielded 0 to 2 discoveries.

**Users:** 143 (admin 4, user 139). Joined: 2025-11 x2, 2026-05 x4, 06 x6, **07 x85**, 08 x8, 09 x13, 10 x20, 11 x5. ~~29 have [AUDIT]/QA-style names~~ CORRECTED by this lane (2026-11-06, usage-aggregate-design.md §9): 1 bracket-named user; the test-account predicate flags 85 (= analytics lane), 11 have a deletion request. Overview says "active users 26". No last-login field in the admin API.

**Audit log (19,155 rows):** by month 2026-02 1,431; 05 2; 06 4,794; 07 6,839; 08 1,883; 09 166; 10 2,869; 11 (to the 6th) 1,171. Top actions: updated 12,771, created 1,083, deleted 1,036, approved 446, auth.login 430 (only 2026-07-17..08-10), imported 402, rejected 296. 10,562 rows have no actor (system/import jobs); 7,448 come from the owner admin account; about 895 from one audit user in Sep-Oct 2026 and 45 from another on 2026-11-06 (audit lane noise); the remaining actors are 1-41 rows each. **Audit-lane noise:** rows whose notes match QA/AUDIT/probe = 1,648 (crude keyword match, treat as a lower-bound estimate): category_created 129 + category_deleted 128 + category_updated 81 + deleted 574 + edit_rejected 75 + journey.step_* 44 are test fixtures. Last 7 days: 1,739 of 1,900 rows are the owner account (380 approved, 297 created, 74 rejected, 65 edit_suggested, 29 archived), i.e. the current bulk-approval/archive work; I cannot separate owner from automated runs under that one account. `database.exported` x104 and `users.exported` x107 are exports clicked often (admin-ops lane owns Export).

**Journeys admin:** edits as recent as 2026-11-06 (journey.steps_reordered x29 since 10-28), so it is in active use.

## Findings
1. No write fired from the SPA on load or during my clicks (0 of 2197 requests non-GET).
2. **Approvals backlog:** 23 real submissions waiting, oldest 73 days. Queue needs human decisions; nothing is broken in the UI.
3. Overview health banner "Some systems are still working": GitHub sync last completed 109 days ago, link checker last run 9h ago with 27 broken. These belong to admin-ops; recorded here because Overview displays them.
4. Researcher spend is large: about $592 over 100 runs, $487 of it in July (50 runs, about $9.70 each, consistent with the tile's "past runs cost $0.08-$10.08"). Since late October runs are cheaper and yield few discoveries (3 runs in the last 4 days: 2 discoveries total).
5. Enrichment cost is recorded only on recent jobs (Oct 2026+); the "AVG COST $0.05 per batch" tile averages only those.
6. AI counters `requestCount 0 / cacheSize 0` at `/api/health/ai` are per-process, so they say nothing about usage.
7. No standalone Tags admin tab and no Sub-Subcategories strip tab (menu only). `GET /api/tags` = 1,630 tags.

## Unverified / not done
- Row-level Review dialog on Approvals and the Users Edit dialog were not opened.
- Sub-Subcats view not opened separately in the browser (API only).
- Digests tab (admin-ops) skipped.
- Researcher totals come from `researcher-jobs.json` (100 of 109 jobs); the 9 other runs were not fetched, so spend is a lower bound.
- "41 other" resource rows is the remainder of 4,315 minus the four statuses I counted; I did not query that status.
