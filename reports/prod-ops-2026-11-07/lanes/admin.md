STATUS: DONE (admin-r2, 2026-11-07 21:2xZ, revision 1cd25ab06e344b1db198857910a95486efe36082 at /api/version)

# Lane admin: populated pass over all 18 admin tabs

Revision seen at /api/version: 1cd25ab06e344b1db198857910a95486efe36082 (2026-11-07). Sessions: audit admin (role=admin, fetched in page), audit member (role=user), guest. POST /api/recommendations was route-aborted by exact URL before every signed-in load; HAR shows 0 recommendations requests.
Evidence dir (E): /Users/nick/Desktop/awesome-list-site/.claude/worktrees/prod-ops-1107/e2e-evidence/prod-ops-2026-11-07/admin/ (HAR: E/admin-1.har, 4274 requests, gitignored). Every screenshot named below was opened.

Outcome: all 18 tabs load populated at 1280 with empty console and no failed requests. No Primary visitor function is affected by anything in this lane. 0 broken, 3 degraded, 1 open owner question (paid steps).

| tab | loads/populated | widths checked | console/network errors | usage evidence (aggregates, real vs QA) | owner-critical? why | evidence paths | 07b prior |
|---|---|---|---|---|---|---|---|
| Overview | yes, stats cards + System health card | 390, 768, 1280 | none | 4,064 public, 154 rejected, 57 archived, 0 pending, 145 users, 5 journeys | Yes: first screen, shows queue and health | E/overview-390.png, overview-768.png, overview-1280.png | works (carried over) |
| Approvals | yes, empty queue state | 390, 768, 1280 | none | 0 pending approvals now; queue drained | Yes: the daily approve/reject surface, idle only because nothing is pending | E/approvals-390.png, approvals-768.png, approvals-1280.png | works; 390 gutter finding -1 |
| Resources | yes, paged list | 390, 768, 1280 | none | 4,320 rows across statuses (4,064 approved, 154 rejected, 57 archived) | Yes: edit/archive entry point | E/resources-390.png, resources-768.png, resources-1280.png | works |
| Database | yes, tables + backups | 1280 | none | 41 tables, 112,325 rows, 80.5 MB; 34 of 34 migrations applied; 12 backups, latest 2026-11-07 13:47Z, storage configured | Yes: backup is the only restore path | E/database-1280.png | works |
| Pending Edits | yes, empty state | 1280 | none | 0 pending edits | Moderate: needed only when members propose edits | E/edits-1280.png | works; diff wrap bug -2 |
| Link Health | yes | 1280 | none | Scan #15 completed 2026-11-07 06:56Z: 4,046 healthy, 30 broken, 15 suspect of 4,091 | Yes: the only view of dead links | E/linkhealth-1280.png | works |
| Link Reports | yes, empty (rendered inside Link Health) | 1280 | none | 0 member reports, 0 open | Low: no member has used it | E/linkreports-1280.png | works |
| Contact | yes (inside Audit, behind Tools) | 1280 | none | 2 submissions, both QA; 0 real | Low: no real enquiry yet | E/contact-1280.png | works |
| Users | yes | 1280 (+390/768 write below) | none | 145 users; admins 3 after the read-back (audit admins only), rest members | Yes: role changes | E/users-1280.png | works |
| Audit | yes, paged 25 per page | 1280 | none | 19,433 events; newest within seconds of the check | Yes: the only change history | E/audit-1280.png | works; banner finding -1 reproduced |
| Export | yes | 1280 | none | CSV and OPML GET return 200; see export check below | Yes: the only catalog export besides backup | E/export-1280.png | works; pop-in finding -2 reproduced |
| Digest | yes (deep link /admin/digests, no tab trigger) | 1280 | none | transport available; queue email 1 sent, in-app 2 sent; no failure codes | Low: low volume | E/digests-1280.png | works |
| Taxonomy | yes: Categories, Subcategories, Sub-subcategories | 1280 | none | 9 categories, 99 subcategories | Yes: shapes the public nav | E/categories-1280.png, subcategories-1280.png, subsubcategories-1280.png | works |
| Journeys | yes (deep link, no tab trigger) | 1280 | none | 5 journeys | Moderate | E/journeys-1280.png | works |
| Researcher | yes | 1280 | none | 109 jobs total; recent page: 5 completed, 10 cancelled, 4 budget_stopped, 1 failed | No for running the site (paid, optional) | E/researcher-1280.png, E/research-1280.png | works; launch not pressed (paid) |
| Enrichment | yes | 1280 | none | 36 jobs: 25 completed, 8 cancelled, 3 failed; last 2026-11-06 02:13Z | No (paid, optional) | E/enrichment-1280.png | works; run not pressed (paid) |
| GitHub Sync | yes | 1280 | none | 49 sync records; newest 2025-11-18, nothing since | Low: import/export is idle | E/github-1280.png | works |
| Operations | yes: System health card, status ready | 390, 768, 1280 | none | readiness ready; db pool, public cache, heavy work, telemetry sections present | Yes: only live health view | E/operations-390.png, operations-768.png, overview-1280.png | works |

Usage reading: the admin console is used for review and maintenance, not content intake. The queue is empty, there are no member reports or edits, contact has only QA rows, researcher and enrichment were last used a day or more ago, and GitHub sync has been idle for a year.

## 07b gaps closed

| item | result | evidence |
|---|---|---|
| Guest denied x8 (users, audit, export, overview at 390/768/1280) | works: each redirects to the Clerk sign-in page; anonymous API returns 401 for admin users, audit-logs, export-csv and operations/health. The 390 card is clipped on the left (07b -3 reproduced) | E/guest-denied-users-768.png, users-1280, audit-390, audit-1280, export-390, export-768, overview-768, overview-1280 (all opened) |
| Role write at 390/768 on the audit member | works: promote then demote at both widths, dialog and toast seen, final read-back user, admins 3 | E/role-write-390-dialog.png, 390-promoted, 390-demoted, 768-dialog, 768-promoted, 768-demote-dialog, 768-demoted |
| CSV/OPML export | works: GET 200, content types text/csv and text/x-opml (server/routes/domains/export-link-health.ts:693,734); counts only, no file contents kept | HAR |
| BUG-t-admin-ops-1 | reproduced, still present: audit load failure banner says "Your filter is still applied" with no filter set | E/bug-ops1-audit-error-1280.png |
| BUG-t-admin-ops-2 | reproduced, still present: Export link-check card pops in after link-health/status resolves (9 s delay injected) and shifts the grid down about 240 px | E/bug-ops2-export-loading-1280.png, bug-ops2-export-loaded-1280.png |
| BUG-t-admin-curation-2 | still present at code level: client/src/components/admin/PendingEdits.tsx:61 uses `break-all`, so words wrap mid-word. Not re-driven visually, since a pending edit needs a member edit on a real row | code read |

## Findings

| id | severity | tab | finding | repro / evidence | status |
|---|---|---|---|---|---|
| ADM-1 | low | Audit | Error banner always appends "Your filter is still applied" even with no filter (07b ops-1) | E/bug-ops1-audit-error-1280.png; fetch to audit-logs rejected in page | open, unchanged since 07b |
| ADM-2 | low | Export | Link-check card pops in after load and shifts the grid (07b ops-2, a layout-shift risk) | E/bug-ops2-export-loading-1280.png vs loaded | open, unchanged |
| ADM-3 | low | Pending Edits | Diff text wraps mid-word (`break-all`) (07b curation-2) | client/src/components/admin/PendingEdits.tsx:61 | open, unchanged |
| ADM-4 | low | sign-in (guest) | Clerk sign-in card clipped on the left at 390 (07b ops-3) | E/guest-denied-audit-390.png | open; the 390 export shot shows it fitting, so it depends on the route |
| ADM-5 | info | Digest, Journeys | No tab trigger; reachable only by deep link or the Settings menu | tab strip in E/export-1280.png | note |
| ADM-6 | info | Contact, Link Reports | Both render inside other tabs (Audit Tools, Link Health), so the 18 "tabs" are 15 triggers | AdminDashboard.tsx CANONICAL_TABS | note |

Not verified: 07b -1 (390 gutter) was not re-measured beyond the no-overflow check (scrollWidth equals viewport minus 6 at 390 and 768). Keyboard-only walk of the admin console was not run.

## Write log (all on QA rows or the audit member; all undone and read back)

| # | write | target | undo | read-back |
|---|---|---|---|---|
| 1 | member POST /api/resources (201, pending, id 190990) | `qa-audit-20261107c-admin-1`, URL https://awesome.video/qa-audit-20261107c/admin-1 | see 2 and 3 | status pending confirmed |
| 2 | admin POST /api/admin/resources/190990/reject (200, reason 10+ chars, title read back first) | same row | | status rejected |
| 3 | admin DELETE /api/admin/resources/190990 (200) | same row | deleted | admin pending list and rejected list: absent; public GET by id: 404; /sitemap.xml: absent; search: absent |
| 4 | admin PUT role user to admin, then admin to user, at 390 (UI) | audit member only | demoted | /api/admin/users: role user, admins 3 |
| 5 | same at 768 (first demote click missed, ref went stale; retried) | audit member only | demoted | role user, admins 3 |

Approve was not used. No real row touched. Hidden writes: 6 Clerk token POSTs (200) in the admin session. I did not open any /resource/:id or 404 page, so those two hidden writes were not exercised.

## Non-GET table

| method | route | count | status | Origin |
|---|---|---|---|---|
| POST | Clerk session token refresh | 6 | 200 | clerk |
| PUT | /api/admin/users/:id/role | 4 | 200 | https://awesome.video |
| POST | /api/resources (member) | 1 | 201 | https://awesome.video |
| POST | /api/admin/resources/190990/reject | 1 | 200 | https://awesome.video |
| DELETE | /api/admin/resources/190990 | 1 | 200 | https://awesome.video |

## Owner question (paid steps)

Researcher launch and Enrichment run were not pressed (budget is zero). To exercise them the owner must approve a spend cap, then press Launch in Researcher and Run in Enrichment on a QA category. Both tabs otherwise load, list history and show their confirm paths.

## Secrets

None exposed. The HAR contains a Clerk session id inside a URL path (not a secret value); the HAR is gitignored.

## Addendum: QA approve for the member lane (20:51Z)

Requested by lane member through the lead, under 07b safety.md section 3. Conditions checked before approving: GET /api/admin/digests/health showed an empty queue (nothing processing, oldestQueuedAt null); no backup in flight; I ran no export; category "Community & Events" is the smallest and the audit member has preferences null; title read back as qa-audit-20261107c-member-2.

| # | write | result |
|---|---|---|
| 6 | POST /api/admin/resources/190991/approve (Origin https://awesome.video) at 20:51:56Z | 200, approved |
| 7 | POST /api/admin/resources/190991/unapprove | 200 |
| 8 | DELETE /api/admin/resources/190991 at 20:53:44Z (title re-read first) | 200 |

Window approved: about 1 min 50 s. Read-back: public GET by id 404, search absent, /sitemap.xml absent, admin pending list absent. The member lane ran its own edit (157, withdrawn by member) on the row. Non-GET table: add 1 approve, 1 unapprove, 1 DELETE, all 200.

## Round 2 (admin-r2, 21:2xZ): remaining items, revision 1cd25ab0

No writes by me except the audit rows that the export GETs create themselves (see 2). Admin session po1107-admin-r2-2 (state loaded read-only, role admin read in page, POST /api/recommendations* route-aborted before any load); guest session po1107-admin-r2-3 (no state). All three r2 sessions closed.

### 1. Guest-denied x8, re-driven fresh (works)
Why redone: the predecessor's 8 shots are byte-identical sign-in pages with no URL on screen, so they did not show which route was asked for. Each row below records the final URL read from the browser, the card geometry and the screenshot.

| route | width | final URL | sign-in card | screenshot (opened) |
|---|---|---|---|---|
| /admin/users | 768 | /sign-in?redirect_url=%2Fadmin%2Fusers | x=171 w=400, no overflow | E/r2-guest-users-768.png (opened) |
| /admin/users | 1280 | same, users | x=427 w=400 | E/r2-guest-users-1280.png |
| /admin/audit | 390 | /sign-in?redirect_url=%2Fadmin%2Faudit | x=-28 w=400 (clipped left) | E/r2-guest-audit-390.png |
| /admin/audit | 1280 | same, audit | x=427 w=400 | E/r2-guest-audit-1280.png |
| /admin/export | 390 | /sign-in?redirect_url=%2Fadmin%2Fexport | x=-28 w=400 (clipped left) | E/r2-guest-export-390.png (opened: card left edge and border cut off) |
| /admin/export | 768 | same, export | x=171 w=400 | E/r2-guest-export-768.png |
| /admin/overview | 768 | /sign-in?redirect_url=%2Fadmin%2Foverview | x=171 w=400 | E/r2-guest-overview-768.png |
| /admin/overview | 1280 | same, overview | x=427 w=400 | E/r2-guest-overview-1280.png |

API as guest (curl, no cookies): GET /api/admin/users, /api/admin/audit-logs, /api/admin/export-csv, /api/admin/operations/health all 401.
All 8 r2 shots were opened after capture (the 8 predecessor shots were opened too). Each shows the Clerk "Welcome back" sign-in card; the 390 shots (audit, export) show the card clipped on the left, the 768 and 1280 shots show it centred.
Finding ADM-4 (clipped card at 390) is confirmed on the audit and export redirects: x=-28 w=400 in a 390 viewport. The predecessor's remark that the 390 export shot "fits" was wrong; that file is byte-identical to the audit one and is clipped too. ADM-4 applies to every guest redirect at 390.

### 2. CSV / OPML / JSON (read-only GETs in the admin page; no bodies stored)
| export | status | content-type | size | count |
|---|---|---|---|---|
| CSV /api/admin/export-csv | 200 | text/csv; charset=utf-8, attachment resources-export-2026-11-07.csv | 1,580,521 bytes | 4,324 newline-split lines (header plus 4,320 resource rows; a few cells hold newlines) |
| OPML /api/admin/export-opml | 200 | text/x-opml; charset=utf-8, attachment awesome-video-categories-2026-11-07.opml | 509,193 bytes | 4,204 outline elements |
| JSON /api/admin/export-json (HEAD only) | 200 | application/json; charset=utf-8 | not measured | n/a |

The JSON snapshot holds user data (07b: F-AOPS-03). I sent HEAD, not GET, and read no body. Express routes HEAD to the GET handler, so the server probably built the snapshot before dropping the body; I did not confirm that. The CSV handler writes an audit row `resources.exported` (server/routes/domains/export-link-health.ts:701-706), so each CSV/OPML GET adds one audit row. Exports run by this lane (predecessor plus r2): at least 2 CSV and 2 OPML, so up to 4 audit rows, and possibly 1-2 from the JSON HEAD. Admin audit rows are not on QA rows; this is a hidden write that the rules did not list.

### 3. Re-check on 1cd25ab0
- BUG-t-admin-ops-1 (ADM-1): still present. client/src/components/admin/AuditTab.tsx:364 passes the constant `note="Your filter is still applied."` into AdminLoadError with no condition on an active filter (read this round). Predecessor reproduced it visually at E/bug-ops1-audit-error-1280.png on this revision.
- BUG-t-admin-curation-2 (ADM-3): code-confirmed only. client/src/components/admin/PendingEdits.tsx:61 renders the diff value in `<span className="break-all">`. The Pending Edits queue is empty (0), so there is no pending edit on a qa- row to view; I did not create one. Visual re-check: not done, and it needs a member edit on a QA row (a write the brief says not to make).

### 4. Per-tab table
The table at the top has 18 rows, each with loads/populated, widths, errors, usage evidence (aggregates, real vs QA) and an owner-critical column, from the predecessor's screenshots and GETs. I did not need a new GET for any tab. Gaps I could not fill: widths 390/768 were captured only for Overview, Approvals, Resources and Operations; the other 14 tabs have a 1280 shot only. Keyboard-only walk of the console was not run.

### Non-GET additions in r2
| method | route | count | status |
|---|---|---|---|
| POST | Clerk token refresh | not counted | 200 |
(no admin non-GET was sent in r2; the two CSV/OPML GETs and one JSON HEAD are GETs that log audit rows as noted)
