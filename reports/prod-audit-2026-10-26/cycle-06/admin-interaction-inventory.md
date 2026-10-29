# Cycle-6 measured admin interaction inventory — awesome.video

Baseline: `origin/main` `480a3ace7f6f17e0acce4278626d2830004a2ad7`. Source-only inventory: no interaction was executed and nothing is marked PASS. Every evidence path is `pending`.

`All` = 1440×900, 820×1180 touch, and 390×844 touch, signed-in admin unless stated otherwise. `QA row` = only an auditor-created `[QA-audit-1026]` row, removed by ID during cleanup. `BLOCKED-BY-POLICY` = safe open/cancel inspection may remain PENDING elsewhere, but the live paid/destructive/production mutation must not run.

The code exposes 15 strip tabs plus 3 Settings-only panels = **18 active admin panels**, not 17. All are included.

## Slice: ux-a11y — shared admin shell, navigation, and auth

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| SH-01 | Global desktop header | Activate `Admin` | Opens `/admin`; current Admin navigation state is exposed; `GET /api/auth/user` supplies the admin role. | All; admin | pending | PENDING |
| SH-02 | Global sidebar | Activate `Admin` | Opens `/admin` and marks the sidebar item active; admin role comes from `GET /api/auth/user`. | All; admin | pending | PENDING |
| SH-03 | Account menu | Open menu, then activate `Admin` | Opens `/admin` without signing out or changing the session. | All; admin | pending | PENDING |
| SH-04 | Account menu / owner session | Activate `Sign out` | Would call `POST /api/auth/admin-logout`, Clerk sign-out, and `GET /api/auth/user`; forbidden because it revokes the shared owner session. | All; owner session | pending | BLOCKED-BY-POLICY |
| SH-05 | `/sign-in?admin` | Submit correct owner password | `POST /api/auth/admin-login` succeeds, sets the owner cookie, and redirects to the validated admin return path without exposing the password. | All; signed out, explicitly approved auth check | pending | PENDING |
| SH-06 | `/sign-in?admin` | Submit incorrect password | Shows `Incorrect password.` in an alert; no admin session is created; password is not logged. | All; signed out | pending | PENDING |
| SH-07 | `/sign-in?admin` | Submit after rate limit is reached | HTTP 429 maps to the 15-minute wait message; no session is created. | All; signed out/rate-limited | pending | PENDING |
| SH-08 | `/sign-in?admin` | Submit while offline | Shows the connection error and preserves a usable retry path; no success redirect occurs. | All; offline | pending | PENDING |
| SH-09 | `/admin` guard | Load while `GET /api/auth/user` is pending | Shows `Verifying access…`; no admin panel or privileged query is mounted prematurely. | All; auth loading | pending | PENDING |
| SH-10 | `/admin` signed out | Activate `Sign in to continue →` | Builds a safe return URL preserving the requested admin tab and returns to sign-in; no admin data is exposed. | All; signed out | pending | PENDING |
| SH-11 | `/admin` signed-in non-admin | Activate `Back to home →` | Shows the role-specific forbidden message, not a sign-in demand; Home opens without an admin API call succeeding. | All; non-admin | pending | PENDING |
| SH-12 | `/admin` expired session | Activate `Sign in to continue →` after a protected 401 | Expired-session copy appears and re-auth returns to the original admin route/tab. | All; expired session | pending | PENDING |
| SH-13 | `/admin` initial stats | Open with `GET /api/admin/stats` pending | Shows the dashboard loading state, not empty/zero admin content. | All; admin, loading | pending | PENDING |
| SH-14 | `/admin` initial stats failure | Activate dashboard `Retry` | Reissues `GET /api/admin/stats`; error stays distinct from an empty dashboard and retry remains focusable. | All; admin, request failure | pending | PENDING |
| SH-15 | `/admin/<unknown>` | Open an unknown admin section | Renders the real 404 page; it does not fall back to Overview or claim the user is signed out. | All; signed-out and admin variants | pending | PENDING |
| SH-16 | `/admin/:section`, hash, aliases | Open every canonical section and aliases `link-health`, `sub-subcategories`, `sub-subcats`, `github-sync` | Each resolves to the matching one of the 18 panels; unknown values alone 404; deep-link metadata stays noindex. | All; admin, cold load | pending | PENDING |
| SH-17 | `/admin#<tab>` and `?tab=` | Change hash/query, then use Back/Forward | URL and visible panel stay synchronized; bare `/admin` returns to Overview; focus/scroll restoration follows navigation type. | All; admin | pending | PENDING |
| SH-18 | Admin tab strip overflow | Activate `Scroll tabs left` | Scrolls only the strip, reveals hidden tabs, and hands focus safely when the arrow unmounts. | 820/390; overflow at start | pending | PENDING |
| SH-19 | Admin tab strip overflow | Activate `Scroll tabs right` | Scrolls only the strip, reveals hidden tabs, and hands focus safely when the arrow unmounts. | 820/390; overflow at end | pending | PENDING |
| SH-20 | Admin tab strip | Use arrow keys, Enter, and Space | Roving focus and automatic/manual activation work; Journeys/Digests do not get replaced merely by tabbing into the strip. | All; admin, keyboard | pending | PENDING |
| SH-21 | Strip `Overview` | Activate tab | Opens Overview and updates `/admin#overview`. | All; admin | pending | PENDING |
| SH-22 | Strip `Approvals` | Activate tab | Opens Approvals and updates `/admin#approvals`. | All; admin | pending | PENDING |
| SH-23 | Strip `Edits` | Activate tab | Opens Edit Suggestions and updates `/admin#edits`. | All; admin | pending | PENDING |
| SH-24 | Strip `Enrichment` | Activate tab | Opens Enrichment and updates `/admin#enrichment`. | All; admin | pending | PENDING |
| SH-25 | Strip `Researcher` | Activate tab | Opens Researcher and updates `/admin#researcher`. | All; admin | pending | PENDING |
| SH-26 | Strip `Export` | Activate tab | Opens Export and updates `/admin#export`. | All; admin | pending | PENDING |
| SH-27 | Strip `Database` | Activate tab | Opens Database and updates `/admin#database`. | All; admin | pending | PENDING |
| SH-28 | Strip `Resources` | Activate tab | Opens Resources and updates `/admin#resources`. | All; admin | pending | PENDING |
| SH-29 | Strip `Categories` | Activate tab | Opens Categories and updates `/admin#categories`. | All; admin | pending | PENDING |
| SH-30 | Strip `Subcategories` | Activate tab, including return from Sub-Subcats | Opens Subcategories and updates `/admin#subcategories`; folded parent selection is restored. | All; admin | pending | PENDING |
| SH-31 | Strip `Users` | Activate tab | Opens Users and updates `/admin#users`. | All; admin | pending | PENDING |
| SH-32 | Strip `GitHub` | Activate tab | Opens GitHub and updates `/admin#github`. | All; admin | pending | PENDING |
| SH-33 | Strip `Link Health` | Activate tab | Opens Link Health and updates `/admin#linkhealth`. | All; admin | pending | PENDING |
| SH-34 | Strip `Audit` | Activate tab | Opens Audit and updates `/admin#audit`. | All; admin | pending | PENDING |
| SH-35 | Strip `Research` | Activate tab | Opens the read-only Research workspace and updates `/admin#research`. | All; admin | pending | PENDING |
| SH-36 | Masthead `Settings` | Open/close the Settings menu | Menu exposes current section, keyboard navigation, and focus return without changing tabs accidentally. | All; admin | pending | PENDING |
| SH-37 | Settings menu | Activate `Theme settings` | Opens `/settings/theme`; no admin mutation occurs. | All; admin | pending | PENDING |
| SH-38 | Settings menu, pending count > 0 | Activate `Pending approvals` | Opens Approvals; item is absent when the authoritative count is zero. | All; admin, both count states | pending | PENDING |
| SH-39 | Settings menu, rejected count > 0 | Activate `Rejected resources` | Opens Resources with `?status=rejected` preserved and the rejected filter visibly applied. | All; admin, both count states | pending | PENDING |
| SH-40 | Settings menu | Activate `Sub-Subcats` | Opens Sub-Subcategories with Subcategories highlighted as its parent and the correct current-section announcement. | All; admin | pending | PENDING |
| SH-41 | Settings menu | Activate `Journeys` | Opens Journeys with no strip tab selected and Settings identifying the open section. | All; admin | pending | PENDING |
| SH-42 | Settings menu | Activate `Digests` | Opens Digests with no strip tab selected and Settings identifying the open section. | All; admin | pending | PENDING |
| SH-43 | Masthead `New entry` | Activate twice, including while Resources is already open | Sets `create=1`, opens Resources, and opens a fresh Add Resource dialog each time. | All; admin | pending | PENDING |
| SH-44 | Entire admin shell | Sweep auth, tab, menu, focus, scroll, and motion states at real coarse pointer | No hover-only or clipped control; focus is not dropped to body; reduced motion removes nonessential animation. Cycle-5 real-touch/keyboard/reduced-motion gaps remain explicit. | All; real coarse pointer + keyboard + reduced motion | pending | PENDING |

## Slice: ux-admin-content — Overview, Approvals, and Edit Suggestions

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| OV-01 | `/admin#overview` Resources card | Activate card or its keyboard equivalent | Opens Resources; approved total and category count reconcile with `GET /api/admin/stats` and `GET /api/categories`. | All; populated | pending | PENDING |
| OV-02 | Overview Subcategories card | Activate card | Opens Subcategories; count reconciles with `GET /api/subcategories`. | All; populated | pending | PENDING |
| OV-03 | Overview Active users card | Activate card | Opens Users; 30-day count and role split reconcile with all pages of `GET /api/admin/users`. | All; populated | pending | PENDING |
| OV-04 | Overview Pending approvals card | Activate card | Opens Approvals; count and oldest age reconcile with `GET /api/admin/stats` and `GET /api/admin/pending-resources`. | All; populated and zero-pending | pending | PENDING |
| OV-05 | Overview metric strip | Trigger partial source failure, then `Retry` | Banner names every failed stats source and retries stats, categories, subcategories, users, and pending queries without discarding last good values. | All; partial and total failure | pending | PENDING |
| OV-06 | Overview Recent activity | Load activity | Shows a loading state while `GET /api/admin/audit-logs?limit=6&offset=0` is pending. | All; loading | pending | PENDING |
| OV-07 | Overview Recent activity | Activate `Retry` after failure | Reissues the six-entry audit request and preserves a meaningful error, not a false empty state. | All; request failure | pending | PENDING |
| OV-08 | Overview Recent activity | Load with no audit rows | Shows `No audit activity recorded.` | All; empty | pending | PENDING |
| OV-09 | Overview Recent activity | Inspect populated six-row feed | Actor, action, target, transaction ID, and relative time match the API; list is capped at six. | All; populated | pending | PENDING |
| OV-10 | Overview System health | Inspect all populated health rows | Database, GitHub, Link checker, Enrichment, and Researcher API states derive from `operations/health`, sync status/history, link status/history, enrichment jobs, and `GET /api/health/ai`; no fake zero-as-healthy state. | All; nominal/warn/bad/unknown | pending | PENDING |
| OV-11 | Overview System health | Trigger one and all health-source failures, then `Retry` | Failed rows say unavailable and one Retry reissues every failed health query; last good data is marked stale where applicable. | All; partial/total failure | pending | PENDING |
| OV-12 | Overview Top categories | Load categories | Shows a loading state while `GET /api/categories` is pending. | All; loading | pending | PENDING |
| OV-13 | Overview Top categories | Activate `Retry` after failure | Reissues `GET /api/categories`; error does not become `No categories`. | All; request failure | pending | PENDING |
| OV-14 | Overview Top categories | Load with no approved-resource categories | Shows `No categories have approved resources.` | All; empty | pending | PENDING |
| OV-15 | Overview Top categories | Inspect top-five populated ranking | Sort is resource count descending then name; bars and counts match API data and only five rows render. | All; populated | pending | PENDING |
| AP-01 | `/admin#approvals` | Load queue | Shows skeleton rows while `GET /api/admin/pending-resources` is pending. | All; loading | pending | PENDING |
| AP-02 | Approvals queue | Activate `Retry` after a failed load | Reissues pending resources; copy says the queue may still contain submissions and does not show a false empty queue. | All; request failure | pending | PENDING |
| AP-03 | Approvals queue offline | Activate `Retry` | Offline copy remains distinct from empty; retry reissues the query when possible and focus survives. | All; offline | pending | PENDING |
| AP-04 | Approvals empty queue | Activate `Check again`, including offline | Revalidates pending resources and announces checked/offline; disabled bulk actions remain inert. | All; empty and offline-empty | pending | PENDING |
| AP-05 | Approvals populated queue | Inspect table and poll update | All pending rows, descriptions, tags, submitter, category, and relative dates match `GET /api/admin/pending-resources`; polling updates the count. | All; populated | pending | PENDING |
| AP-06 | Approvals table header | Toggle `Select all pending resources` | Selects/deselects the full pending set and shows checked/indeterminate state; touch target is at least 44px. | All; populated, keyboard/touch | pending | PENDING |
| AP-07 | Approvals row | Toggle row checkbox | Updates only that row and the selected count used by bulk labels. | All; populated | pending | PENDING |
| AP-08 | Approvals toolbar | Open `Bulk reject (N)` | Requires a selection and opens the rejection dialog with the exact selected IDs/count. | All; selected | pending | PENDING |
| AP-09 | Bulk-reject dialog | Enter short and valid rejection reasons | Fewer than 10 trimmed characters blocks confirmation; valid text enables it and contributor-safe copy remains visible. | All; dialog | pending | PENDING |
| AP-10 | Bulk-reject dialog | Cancel via button, X, or Escape | Closes without `POST /api/admin/resources/bulk/reject`; selected rows remain and focus returns safely. | All; dialog | pending | PENDING |
| AP-11 | Bulk-reject confirmation | Confirm selected rejection | Would call `POST /api/admin/resources/bulk/reject`; production bulk moderation is forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| AP-12 | Approvals toolbar | Open `Approve selected (N)` or `Approve all` | Uses selected IDs, or all pending IDs when none are selected; exact count and 1,000-ID guard are shown. | All; unselected and selected | pending | PENDING |
| AP-13 | Bulk-approve dialog | Cancel | Closes without `POST /api/admin/resources/bulk/approve`; focus returns to a surviving control. | All; dialog | pending | PENDING |
| AP-14 | Bulk-approve confirmation | Confirm approval | Would call `POST /api/admin/resources/bulk/approve`; production bulk approval is explicitly forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| AP-15 | Approvals bulk outcome | Inspect success and partial-failure result banner | Requested/succeeded/failed counts and named failures reconcile with the bulk response; empty queue retains the outcome until next action. | All; post-mutation only on non-production or QA fixture | pending | PENDING |
| AP-16 | Approvals row title | Open external URL icon | Opens the submitted HTTP(S) URL in a new tab with `noopener noreferrer`; no moderation mutation occurs. | All; populated | pending | PENDING |
| AP-17 | Approvals row | Open `Review` | Opens Resource Details with all submitted fields, tags, and provenance; no write occurs. | All; populated | pending | PENDING |
| AP-18 | Resource Details | Activate valid URL | Opens the exact safe HTTP(S) URL in a new tab and wraps long URLs within the dialog. | All; valid URL | pending | PENDING |
| AP-19 | Resource Details | Inspect malformed URL and missing description states | Malformed URL is plain text with invalid-URL explanation; missing description explains approval fallback without inventing content. | All; malformed URL/missing description | pending | PENDING |
| AP-20 | Resource Details | Activate `Close`, X, or Escape | Closes without mutation and returns focus to Review. | All; dialog | pending | PENDING |
| AP-21 | Approvals row | Open `Approve`, then cancel | Confirmation explains public-catalog effect; Cancel produces no `POST .../:id/approve` and restores focus. | All; dialog | pending | PENDING |
| AP-22 | Approvals row approve confirmation | Confirm approval | Would call `POST /api/admin/resources/:id/approve` on a real submission; live approve was unverified in cycle 5 and is forbidden here. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| AP-23 | Approvals row | Open `Reject`, edit reason, then cancel | Reason is required and contributor-visible; Cancel clears reason/error and sends no `POST .../:id/reject`. | All; dialog | pending | PENDING |
| AP-24 | Approvals row reject confirmation | Confirm rejection | Would call `POST /api/admin/resources/:id/reject` with a valid reason; live rejection is forbidden on production. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| AP-25 | Approvals table | Swipe and keyboard-scroll horizontally at narrow widths | Gradient/hint appears only on overflow; all actions remain reachable at 820/390 and arrow keys scroll the region without trapping focus. | 820/390; coarse pointer and keyboard | pending | PENDING |
| ED-01 | `/admin#edits` | Load edit queue | Shows skeleton rows while `GET /api/admin/resource-edits` is pending. | All; loading | pending | PENDING |
| ED-02 | Edit queue | Activate `Retry` after failure | Reissues resource edits and never renders a failed request as `No pending edits`. | All; request failure | pending | PENDING |
| ED-03 | Edit queue offline | Activate `Retry` | Offline copy and query recovery are announced; focus remains usable. | All; offline | pending | PENDING |
| ED-04 | Edit queue empty | Activate `Check again`, including offline | Revalidates and announces checked/offline; no pending rows are fabricated. | All; empty/offline | pending | PENDING |
| ED-05 | Edit queue populated | Inspect pending rows and polling | Fields, masked editor, conflict icon, relative date, and legacy-analysis label match `GET /api/admin/resource-edits`. | All; populated | pending | PENDING |
| ED-06 | Edit row resource title | Activate internal resource link | Opens `/resource/:id` for the suggested edit without changing moderation state. | All; populated | pending | PENDING |
| ED-07 | Edit row external-link icon | Activate external resource URL | Opens the current resource URL in a new tab with safe rel attributes. | All; populated | pending | PENDING |
| ED-08 | Edit row | Open `Diff` | Opens the full old/new proposed-change view and resource metadata; no write occurs. | All; populated | pending | PENDING |
| ED-09 | Edit Details conflict state | Inspect conflict detected after resource changed | Warning explains that approval would overwrite newer changes; same warning appears in approval confirmation. | All; conflict fixture | pending | PENDING |
| ED-10 | Edit Details | Activate resource URL | Opens the external resource URL in a new tab; long URL remains within the dialog. | All; dialog | pending | PENDING |
| ED-11 | Edit Details | Activate `Close`, X, or Escape | Closes without mutation and returns focus to Diff. | All; dialog | pending | PENDING |
| ED-12 | Edit row | Open ordinary `Approve` | Confirmation identifies the resource and merge effect; no conflict wording is shown for a clean row. | All; non-conflict | pending | PENDING |
| ED-13 | Edit row conflict | Open `Approve` on conflicted suggestion | Confirmation explicitly warns about overwriting current changes before any request. | All; conflict | pending | PENDING |
| ED-14 | Approve Edit dialog | Cancel | Clears approval error and sends no `POST /api/admin/resource-edits/:id/approve`. | All; dialog | pending | PENDING |
| ED-15 | Approve Edit confirmation | Confirm `Approve & Merge` | Would merge a real suggestion through `POST /api/admin/resource-edits/:id/approve`; production mutation is forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| ED-16 | Approve Edit dialog | Inspect failed approval state | Inline error names `describeWriteError` outcome and keeps dialog/context available for a safe subsequent refresh. | All; failure on QA/non-production only | pending | PENDING |
| ED-17 | Edit row | Open `Reject` | Opens contributor-safe rejection form and does not mutate on open. | All; dialog | pending | PENDING |
| ED-18 | Reject Edit dialog | Enter short and valid reasons | Trimmed length below 10 disables confirmation; valid reason enables it; character counter is accurate. | All; dialog | pending | PENDING |
| ED-19 | Reject Edit dialog | Cancel | Clears reason/error and sends no `POST /api/admin/resource-edits/:id/reject`. | All; dialog | pending | PENDING |
| ED-20 | Reject Edit confirmation | Confirm rejection | Would call `POST /api/admin/resource-edits/:id/reject`; live rejection is forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| ED-21 | Reject Edit dialog | Inspect failed rejection state | Inline error remains visible without falsely removing the suggestion or claiming success. | All; failure on QA/non-production only | pending | PENDING |
| ED-22 | Edit table | Swipe and keyboard-scroll horizontally | Overflow cue and hint expose Approve/Reject at 820/390; arrow keys scroll and focus is retained. | 820/390; coarse pointer and keyboard | pending | PENDING |

## Slice: ux-admin-content — Resources

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| RM-01 | `/admin#resources` | Initial load | Shows skeleton only while the first `GET /api/admin/resources` request has no previous data. | All; first load | pending | PENDING |
| RM-02 | Resources table | Activate `Retry` after load failure | Reissues the current query; error is not an empty table and stale rows are explicitly labelled when present. | All; failure with/without stale data | pending | PENDING |
| RM-03 | Resources offline | Request another page, then use `Stay on page N` or `Retry` | Offline banner distinguishes requested versus displayed page; Stay restores the shown page and Retry refetches without URL/page reversion. | All; offline, AC-19 regression watch | pending | PENDING |
| RM-04 | Resources empty catalog | Load with zero total | Shows `No resources yet.` rather than a blank table. | All; empty catalog | pending | PENDING |
| RM-05 | Resources filtered-empty | Activate inline `Clear filters` | Empty message names active filters; action resets search/category/status/featured and returns focus to the results. | All; zero matches | pending | PENDING |
| RM-06 | Resources populated table | Inspect rows, counts, tags, status, and horizontal overflow | Row values and total reconcile with `GET /api/admin/resources`; all columns/actions are reachable without clipping. | All; populated | pending | PENDING |
| RM-07 | Resources header | Type in `Search…` | Debounces the shared search state, resets to page 1, and never unmounts the input mid-typing. | All; populated | pending | PENDING |
| RM-08 | Resources header | Toggle `Show/Hide filters and tools` | Reveals/hides the filter region with accurate `aria-expanded`; active non-default filters start visible after deep-link. | All; admin | pending | PENDING |
| RM-09 | Resource filters | Type in `Search by title or URL...` | Updates the debounced API `search` parameter, resets page 1, and retains focus. | All; populated | pending | PENDING |
| RM-10 | Resource filters | Choose each category including `All Categories` | Sets or omits `category` correctly; resets page and selection; literal `all` is never sent as a real category. | All; populated | pending | PENDING |
| RM-11 | Resource filters | Choose Approved/Pending/Rejected/Withdrawn/All Status | Sets or omits `status`; rejected deep-link is visibly selected and withdrawn is filter-only. | All; each status | pending | PENDING |
| RM-12 | Resource sort | Choose `Newest first` | Sends `sort=newest`, resets page 1, and API order matches displayed order. | All; populated | pending | PENDING |
| RM-13 | Resource sort | Choose `Oldest first` | Sends `sort=oldest`, resets page 1, and API order matches displayed order. | All; populated | pending | PENDING |
| RM-14 | Resource sort | Choose `Title A–Z` | Sends `sort=name-asc`, resets page 1, and case/title ordering matches the API. | All; populated | pending | PENDING |
| RM-15 | Resource sort | Choose `Title Z–A` | Sends `sort=name-desc`, resets page 1, and case/title ordering matches the API. | All; populated | pending | PENDING |
| RM-16 | Resource filters | Toggle `★ Featured only` | Adds/removes `featured=true&status=approved` behavior as implemented, resets page/selection, and count matches `featured` query total. | All; on/off | pending | PENDING |
| RM-17 | Resource filters | Activate Search submit button or Enter | Applies the current search/filter/sort query through `GET /api/admin/resources`; no duplicate conflicting query state. | All; populated | pending | PENDING |
| RM-18 | Resource filters | Activate `Clear filters` icon | Clears every filter, resets page/selection, and returns focus to the table. | All; active filters | pending | PENDING |
| RM-19 | Resources header checkbox | Toggle `Select all resources on this page` | Selects only current-page IDs and shows checked/indeterminate state; disabled on an empty page. | All; populated | pending | PENDING |
| RM-20 | Resource row | Toggle row checkbox | Adds/removes that ID and updates the bulk action bar and count. | All; populated | pending | PENDING |
| RM-21 | Resource selection bar | Activate `Clear Selection` | Clears all selected IDs, hides the bar, and restores focus to the table. | All; selected | pending | PENDING |
| RM-22 | Resource selection bar | Open bulk `Approve` | Confirmation names exact selection count and immediate public-catalog effect; no POST on open. | All; selected | pending | PENDING |
| RM-23 | Bulk Approve dialog | Cancel | Closes without `POST /api/admin/resources/bulk/approve`; selection/focus remain coherent. | All; dialog | pending | PENDING |
| RM-24 | Bulk Approve confirmation | Confirm approval | Would call `POST /api/admin/resources/bulk/approve`; production bulk approval is forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| RM-25 | Resource selection bar | Open bulk `Reject` | Opens rejection dialog with exact count; no mutation occurs on open. | All; selected | pending | PENDING |
| RM-26 | Bulk Reject dialog | Enter short and valid reasons | Trimmed reason below 10 disables confirmation; valid reason enables it. | All; dialog | pending | PENDING |
| RM-27 | Bulk Reject dialog | Cancel | Closes without `POST /api/admin/resources/bulk/reject`; focus returns to the table. | All; dialog | pending | PENDING |
| RM-28 | Bulk Reject confirmation | Confirm rejection | Would call `POST /api/admin/resources/bulk/reject`; production bulk moderation is forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| RM-29 | Resource selection bar | Open bulk `Delete` | Confirmation lists up to five resource titles plus overflow and warns about related user/journey data. | All; selected | pending | PENDING |
| RM-30 | Bulk Delete dialog | Cancel | Closes without `POST /api/admin/resources/bulk/delete`; selection/focus remain coherent. | All; dialog | pending | PENDING |
| RM-31 | Bulk Delete confirmation | Confirm deletion | Would call `POST /api/admin/resources/bulk/delete`; destructive production bulk deletion is forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| RM-32 | Resource row Featured cell | Toggle star on a QA row and induce failure | `PATCH /api/admin/resources/:id/featured` immediately persists on success; failure restores prior value and shows inline row error. | All; QA row only, success/error | pending | PENDING |
| RM-33 | Resource row | Activate `View` | Opens `/resource/:id` without editing the resource. | All; populated | pending | PENDING |
| RM-34 | Resource row | Activate `Edit` | Opens the correct resource form with stored values; deep-linked `?resourceId=N` first fetches `GET /api/resources/:id`. | All; populated and deep-link | pending | PENDING |
| RM-35 | Resource row | Activate `Delete` | Opens the named irreversible-delete confirmation without sending a request. | All; populated | pending | PENDING |
| RM-36 | Delete Resource dialog | Cancel | Closes without `DELETE /api/admin/resources/:id` and restores focus to the row/table. | All; dialog | pending | PENDING |
| RM-37 | Delete Resource confirmation | Delete the auditor's own QA row by ID | `DELETE /api/admin/resources/:id` removes only that QA row; subsequent read is 404 and stats return to baseline. | All; QA cleanup only | pending | PENDING |
| RM-38 | Delete Resource confirmation | Delete a pre-existing production resource | Destructive deletion of real production data is forbidden. | All; confirmation open on real row | pending | BLOCKED-BY-POLICY |
| RM-39 | Resources pagination | Choose 25, 50, and 100 rows per page | Updates `limit`, resets page 1, and table/range/API agree at every size. | All; each size | pending | PENDING |
| RM-40 | Resources paginator | Use Previous, Next, and numbered page links | Correct `page` query and range are loaded; modified clicks preserve real href behavior; edge focus is retained. | All; multi-page | pending | PENDING |
| RM-41 | Resources page-number input | Type a page and press Enter | Commits the requested page without snapping back to the old page or stripping `?page=N`; direct AC-19 regression check. | All; multi-page, keyboard | pending | PENDING |
| RM-42 | Resources page-number input | Commit on blur; try invalid and out-of-range values | Blur also commits valid values; invalid input shows accessible feedback and valid numbers clamp into range. | All; multi-page | pending | PENDING |
| RM-43 | Resources deep links | Open `?create=1`, `?resourceId=N`, `?status=rejected`, and `?page=N`, then reload | Each initializes the correct dialog/filter/page and survives reload without stale state overwriting the URL. | All; cold load | pending | PENDING |
| RM-44 | Edit Resource | Change `Title *` | Updates draft only; blank title produces field-specific accessible validation on Save. | All; QA row dialog | pending | PENDING |
| RM-45 | Edit Resource | Change `URL *`, including duplicate URL | Validates required/URL syntax; duplicate server error focuses/marks URL with `aria-invalid` and `aria-describedby` (AC-18). | All; QA row, duplicate fixture | pending | PENDING |
| RM-46 | Edit Resource | Change `Description` | Updates draft and displays any field-specific validation without losing other input. | All; QA row dialog | pending | PENDING |
| RM-47 | Edit Resource | Change `Category` | Updates category and clears Subcategory/Sub-subcategory so incompatible child values cannot remain. | All; QA row dialog | pending | PENDING |
| RM-48 | Edit Resource | Change `Status` among Approved/Pending/Rejected | Updates draft; selecting Rejected reveals the required contributor-facing reason. | All; QA row dialog | pending | PENDING |
| RM-49 | Edit Resource, rejected status | Edit `Rejection reason *` | Requires at least 10 trimmed characters with field-level error and contributor-safe copy. | All; QA row, rejected | pending | PENDING |
| RM-50 | Edit Resource | Change `Subcategory` | Offers only children of the selected category, disables when unavailable, and clears sub-subcategory. | All; QA row dialog | pending | PENDING |
| RM-51 | Edit Resource | Change `Sub-subcategory` | Offers only children of the selected subcategory and disables until a valid parent exists. | All; QA row dialog | pending | PENDING |
| RM-52 | Edit Resource | Change `Kind override`, including Automatic | Immediately calls `PATCH /api/admin/resources/:id/kind` on the QA row; success shows stored state, failure restores prior value and inline error. | All; QA row only, success/error | pending | PENDING |
| RM-53 | Edit Resource | Toggle `Curated placement` | Immediately calls `PATCH /api/admin/resources/:id/featured` on the QA row; pending locks conflicting saves and failure restores the switch. | All; QA row only, success/error | pending | PENDING |
| RM-54 | Edit Resource | Change `Format` | Selects one allowed resource-format value and includes it in the next full Save. | All; QA row dialog | pending | PENDING |
| RM-55 | Edit Resource | Change `Provider` | Selects one allowed provider value and includes it in the next full Save. | All; QA row dialog | pending | PENDING |
| RM-56 | Edit Resource | Change `Skill level` | Selects one allowed skill-level value and includes it in the next full Save. | All; QA row dialog | pending | PENDING |
| RM-57 | Edit Resource footer | Activate `Save Changes` on a QA row | `PUT /api/admin/resources/:id` persists only draft fields, leaves immediate kind/featured semantics intact, closes on success, and refreshes list/public caches. | All; QA row only | pending | PENDING |
| RM-58 | Edit Resource footer | Activate `Cancel` | Discards unsaved draft fields and closes without full `PUT`; already successful immediate kind/featured changes are not misrepresented as undone. | All; QA row dialog | pending | PENDING |
| RM-59 | Add Resource | Edit `Title *` | Updates create draft and validates blank title inline on submit. | All; create dialog | pending | PENDING |
| RM-60 | Add Resource | Edit `URL *`, including duplicate URL | Validates required/URL syntax; duplicate server error focuses/marks URL (AC-18) and preserves the draft. | All; create dialog, duplicate fixture | pending | PENDING |
| RM-61 | Add Resource | Edit `Description` | Updates create draft and surfaces any description validation accessibly. | All; create dialog | pending | PENDING |
| RM-62 | Add Resource | Choose required `Category *` | Sets category, clears child selections, and missing category yields field-level error. | All; create dialog | pending | PENDING |
| RM-63 | Add Resource | Choose `Status` | Stores Approved/Pending/Rejected selection in create draft. | All; create dialog | pending | PENDING |
| RM-64 | Add Resource | Choose `Subcategory` | Filters choices by category and clears sub-subcategory on change. | All; create dialog | pending | PENDING |
| RM-65 | Add Resource | Choose `Sub-subcategory` | Filters choices by subcategory and disables until a valid parent exists. | All; create dialog | pending | PENDING |
| RM-66 | Add Resource | Choose `Kind override` | Automatic classifies on save; explicit kind is stored with the new resource rather than silently reclassified. | All; create dialog | pending | PENDING |
| RM-67 | Add Resource | Toggle `Feature this resource` | Create draft persists `metadata.featured=true` only when checked. | All; create dialog | pending | PENDING |
| RM-68 | Add Resource | Choose `Format` | Stores the selected allowed format with the new resource. | All; create dialog | pending | PENDING |
| RM-69 | Add Resource | Choose `Provider` | Stores the selected allowed provider with the new resource. | All; create dialog | pending | PENDING |
| RM-70 | Add Resource | Choose `Skill level` | Stores the selected allowed skill level with the new resource. | All; create dialog | pending | PENDING |
| RM-71 | Add Resource footer | Activate `Create Resource` with `[QA-audit-1026]` title | `POST /api/admin/resources` creates exactly one QA row with entered metadata; list/stats refresh and later cleanup uses its ID. | All; QA creation only | pending | PENDING |
| RM-72 | Add Resource footer | Activate `Cancel` | Closes without `POST /api/admin/resources`; no QA row is created. | All; create dialog | pending | PENDING |
| RM-73 | Create/Edit Resource | Exercise client validation, pending, and server-failure states | Required fields and server banner remain in-dialog, submit shows pending without duplicate request, and draft/focus survive failure. | All; QA dialog states | pending | PENDING |
| RM-74 | Edit Resource footer | Activate `Save Changes` on a pre-existing production resource | `PUT /api/admin/resources/:id` would mutate real production data and is forbidden. | All; real-row dialog | pending | BLOCKED-BY-POLICY |

## Slice: ux-admin-content — Categories

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| CAT-01 | `/admin#categories` | Load category list | Shows skeleton rows while `GET /api/admin/categories` is pending. | All; loading | pending | PENDING |
| CAT-02 | Categories | Activate `Retry` after list failure | Reissues categories; failure is not rendered as an empty/search-no-match state. | All; failure with/without stale rows | pending | PENDING |
| CAT-03 | Categories | Search with no matches | Shows an explicit no-match row and accurate filtered-from count. | All; zero matches | pending | PENDING |
| CAT-04 | Categories | Inspect populated rows | Name, slug, icon, approved resource count, and subcategory count reconcile with admin categories and `GET /api/awesome-list/nav`. | All; populated | pending | PENDING |
| CAT-05 | Categories header | Toggle `Search`/`Hide search` | Reveals/hides search with correct expanded state and retains usable focus. | All; admin | pending | PENDING |
| CAT-06 | Categories search | Type name/slug query | Filters client-side, resets to page 1, and reports result counts. | All; populated | pending | PENDING |
| CAT-07 | Categories search | Activate `Clear search` | Clears query, keeps search open, and returns focus to the input. | All; query present | pending | PENDING |
| CAT-08 | Categories header | Open `Add category` | Opens empty Create Category dialog without an API write. | All; admin | pending | PENDING |
| CAT-09 | Create Category | Edit `Name *` | Updates name and auto-generates a transliterated lowercase slug, including diacritics handling. | All; create dialog | pending | PENDING |
| CAT-10 | Create Category | Edit `Slug *` after auto-generation | Manual slug overrides auto-output and is validated as required. | All; create dialog | pending | PENDING |
| CAT-11 | Create Category footer | Submit with `[QA-audit-1026]` name | `POST /api/admin/categories` creates one QA category, refreshes admin/public taxonomy, and supplies its ID for cleanup. | All; QA creation only | pending | PENDING |
| CAT-12 | Create Category footer | Cancel | Closes without `POST /api/admin/categories`; validation/input is not submitted. | All; create dialog | pending | PENDING |
| CAT-13 | Create Category | Submit empty name and duplicate slug | Dialog stays open with alert; expected field receives focus, `aria-invalid`, and `aria-describedby` rather than banner-only feedback (AC-20). | All; validation/server duplicate | pending | PENDING |
| CAT-14 | Category row | Activate `Edit` | Opens the selected category with existing name/slug; no write occurs. | All; populated | pending | PENDING |
| CAT-15 | Edit Category | Change `Name *` | Updates draft without silently rewriting the existing public slug. | All; QA row dialog | pending | PENDING |
| CAT-16 | Edit Category | Change `Slug *` | Allows deliberate slug edit and validates required/duplicate values. | All; QA row dialog | pending | PENDING |
| CAT-17 | Edit Category footer | Save a QA category | `PATCH /api/admin/categories/:id` persists only the QA row and refreshes admin/public lists. | All; QA row only | pending | PENDING |
| CAT-18 | Edit Category footer | Cancel | Closes without `PATCH /api/admin/categories/:id`; unsaved edits are discarded. | All; dialog | pending | PENDING |
| CAT-19 | Edit Category | Submit empty name or duplicate slug | Field-specific focus/ARIA error is required (AC-20), dialog/draft remain available, and no success toast is shown. | All; validation/server duplicate | pending | PENDING |
| CAT-20 | Category row delete flow | Open, cancel, then delete own empty QA category | Open sends nothing; Cancel sends nothing; confirmation `DELETE /api/admin/categories/:id` removes only the empty QA row and refetches. | All; QA cleanup only | pending | PENDING |
| CAT-21 | Category row delete confirmation | Delete a pre-existing category | Deletion is forbidden; rows with resources/subcategories must additionally expose the disabled reason and prevent confirmation. | All; real row and locked-row states | pending | BLOCKED-BY-POLICY |
| CAT-22 | Categories pagination | Change rows per page and use numbered/Previous/Next/jump controls | Page size 10/25/50/100 resets page 1; real hrefs, direct jump, invalid-input feedback, and focus all work. | All; multi-page | pending | PENDING |
| CAT-23 | Edit Category footer | Save a pre-existing category | `PATCH /api/admin/categories/:id` would mutate real taxonomy and is forbidden. | All; real-row dialog | pending | BLOCKED-BY-POLICY |

## Slice: ux-admin-content — Subcategories

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| SC-01 | `/admin#subcategories` | Load subcategories | Shows skeleton rows while `GET /api/admin/subcategories` is pending. | All; loading | pending | PENDING |
| SC-02 | Subcategories | Activate `Retry` after list failure | Reissues subcategories; error is distinct from no matches. | All; failure | pending | PENDING |
| SC-03 | Subcategories | Search with no matches | Shows explicit no-match row and filtered-from count. | All; zero matches | pending | PENDING |
| SC-04 | Subcategories | Inspect populated rows | Name, slug, parent, resource count, and navigation order match admin subcategories and `GET /api/awesome-list/nav`. | All; populated | pending | PENDING |
| SC-05 | Subcategories header | Toggle `Search`/`Hide search` | Reveals/hides search with accurate expanded state. | All; admin | pending | PENDING |
| SC-06 | Subcategories search | Type name/slug query | Filters client-side and resets to page 1. | All; populated | pending | PENDING |
| SC-07 | Subcategories search | Activate `Clear search` | Clears query and restores input focus while keeping it open. | All; query present | pending | PENDING |
| SC-08 | Subcategories header | Open `Add subcategory` | Opens create form with parent/name/slug controls and no write. | All; admin | pending | PENDING |
| SC-09 | Create Subcategory | Choose `Parent Category *` | Loads options through `GET /api/admin/categories` and stores the selected parent ID. | All; create dialog | pending | PENDING |
| SC-10 | Create Subcategory | Edit `Name *` | Updates name and auto-generates slug. | All; create dialog | pending | PENDING |
| SC-11 | Create Subcategory | Edit `Slug *` | Allows manual validated slug override. | All; create dialog | pending | PENDING |
| SC-12 | Create Subcategory footer | Submit with `[QA-audit-1026]` name | `POST /api/admin/subcategories` creates one QA row under the selected parent and returns its ID for cleanup. | All; QA creation only | pending | PENDING |
| SC-13 | Create Subcategory footer | Cancel | Closes without `POST /api/admin/subcategories`. | All; create dialog | pending | PENDING |
| SC-14 | Create Subcategory | Submit missing parent/name or duplicate slug | Parent/name/slug errors are accessible; duplicate slug focuses/marks the field rather than showing only a banner (AC-20). | All; validation/server duplicate | pending | PENDING |
| SC-15 | Subcategory row | Activate `Edit` | Opens selected subcategory with current parent/name/slug. | All; populated | pending | PENDING |
| SC-16 | Edit Subcategory | Change `Name *` | Updates draft without auto-changing existing slug. | All; QA row dialog | pending | PENDING |
| SC-17 | Edit Subcategory | Change `Slug *` | Allows deliberate validated slug change. | All; QA row dialog | pending | PENDING |
| SC-18 | Edit Subcategory | Change `Parent Category *` | Updates parent ID in draft using admin category options. | All; QA row dialog | pending | PENDING |
| SC-19 | Edit Subcategory footer | Save a QA subcategory | `PATCH /api/admin/subcategories/:id` persists only the QA row and refreshes related taxonomy. | All; QA row only | pending | PENDING |
| SC-20 | Edit Subcategory footer | Cancel | Closes without `PATCH /api/admin/subcategories/:id`. | All; dialog | pending | PENDING |
| SC-21 | Edit Subcategory | Submit invalid fields or duplicate slug | Dialog retains draft and gives focused, associated field error (AC-20); no false success. | All; validation/server duplicate | pending | PENDING |
| SC-22 | Subcategory row delete flow | Open, cancel, then delete own empty QA subcategory | Open/Cancel send nothing; confirmation `DELETE /api/admin/subcategories/:id` removes only the QA row. | All; QA cleanup only | pending | PENDING |
| SC-23 | Subcategory row delete confirmation | Delete a pre-existing subcategory | Forbidden; rows with resources or sub-subcategories also expose lock reason and disabled confirmation. | All; real and locked rows | pending | BLOCKED-BY-POLICY |
| SC-24 | Subcategories pagination and parent errors | Use 24-row page control/paginator; activate parent-load `Retry` | Pagination preserves navigation order and direct links; parent retry reissues categories and removes the parent-name error only on success. | All; multi-page and parent failure | pending | PENDING |
| SC-25 | Edit Subcategory footer | Save a pre-existing subcategory | `PATCH /api/admin/subcategories/:id` would mutate real taxonomy and is forbidden. | All; real-row dialog | pending | BLOCKED-BY-POLICY |

## Slice: ux-admin-content — Sub-Subcategories

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| SSC-01 | `/admin/subsubcategories` or Settings → Sub-Subcats | Load list | Shows skeleton rows while `GET /api/admin/sub-subcategories` is pending. | All; loading | pending | PENDING |
| SSC-02 | Sub-Subcategories | Activate `Retry` after list failure | Reissues sub-subcategories; error is not an empty result. | All; failure | pending | PENDING |
| SSC-03 | Sub-Subcategories | Search with no matches | Shows explicit no-match row and accurate count. | All; zero matches | pending | PENDING |
| SSC-04 | Sub-Subcategories | Inspect populated rows | Name, slug, both parents, and resource count match admin sub-subcategories/categories/subcategories. | All; populated | pending | PENDING |
| SSC-05 | Sub-Subcategories header | Toggle `Search`/`Hide search` | Reveals/hides search with accurate expanded state. | All; admin | pending | PENDING |
| SSC-06 | Sub-Subcategories search | Type name/slug query | Filters client-side and resets page 1. | All; populated | pending | PENDING |
| SSC-07 | Sub-Subcategories search | Activate `Clear search` | Clears query and restores input focus. | All; query present | pending | PENDING |
| SSC-08 | Sub-Subcategories header | Open `Add sub-subcategory` | Opens create form with cascading parents and no write. | All; admin | pending | PENDING |
| SSC-09 | Create Sub-Subcategory | Choose `Parent Category *` | Loads categories and resets any previously chosen subcategory. | All; create dialog | pending | PENDING |
| SSC-10 | Create Sub-Subcategory | Choose `Parent Subcategory *` | Filters options by category through `GET /api/admin/subcategories`; disabled/empty hint is accurate until a parent exists. | All; create dialog, with/without options | pending | PENDING |
| SSC-11 | Create Sub-Subcategory | Edit `Name *` | Updates name and auto-generates slug. | All; create dialog | pending | PENDING |
| SSC-12 | Create Sub-Subcategory | Edit `Slug *` | Allows manual validated slug override. | All; create dialog | pending | PENDING |
| SSC-13 | Create Sub-Subcategory footer | Submit with `[QA-audit-1026]` name | `POST /api/admin/sub-subcategories` creates one QA row under the selected parents and returns its ID for cleanup. | All; QA creation only | pending | PENDING |
| SSC-14 | Create Sub-Subcategory footer | Cancel | Closes without `POST /api/admin/sub-subcategories`. | All; create dialog | pending | PENDING |
| SSC-15 | Create Sub-Subcategory | Submit missing parents/name or duplicate slug | Parent/name/slug errors are accessible; duplicate slug focuses/marks field (AC-20), and slug-or-name server behavior remains consistent. | All; validation/server duplicate | pending | PENDING |
| SSC-16 | Sub-Subcategory row | Activate `Edit` | Opens selected row with current parents/name/slug. | All; populated | pending | PENDING |
| SSC-17 | Edit Sub-Subcategory | Change `Name *` | Updates draft without auto-changing existing slug. | All; QA row dialog | pending | PENDING |
| SSC-18 | Edit Sub-Subcategory | Change `Slug *` | Allows deliberate validated slug change. | All; QA row dialog | pending | PENDING |
| SSC-19 | Edit Sub-Subcategory | Change parent Category, then parent Subcategory | Category change resets subcategory; only valid cascading options can be submitted. | All; QA row dialog | pending | PENDING |
| SSC-20 | Edit Sub-Subcategory footer | Save a QA row | `PATCH /api/admin/sub-subcategories/:id` persists only the QA row and refreshes related taxonomy. | All; QA row only | pending | PENDING |
| SSC-21 | Edit Sub-Subcategory footer | Cancel | Closes without `PATCH /api/admin/sub-subcategories/:id`. | All; dialog | pending | PENDING |
| SSC-22 | Edit Sub-Subcategory | Submit invalid fields or duplicate slug | Dialog retains draft and gives focused associated field error (AC-20); no false success. | All; validation/server duplicate | pending | PENDING |
| SSC-23 | Sub-Subcategory row delete flow | Open, cancel, then delete own empty QA row | Open/Cancel send nothing; confirmation `DELETE /api/admin/sub-subcategories/:id` removes only the QA row. | All; QA cleanup only | pending | PENDING |
| SSC-24 | Sub-Subcategory row delete confirmation | Delete a pre-existing row | Forbidden; rows with resources expose lock reason and disabled confirmation. | All; real and locked rows | pending | BLOCKED-BY-POLICY |
| SSC-25 | Sub-Subcategories pagination and parent errors | Change page size/use paginator; activate parent-load `Retry` | Page size 10/25/50/100 and jump behavior work; retry reissues failed category and/or subcategory reads without inventing parent names. | All; multi-page and parent failures | pending | PENDING |
| SSC-26 | Edit Sub-Subcategory footer | Save a pre-existing row | `PATCH /api/admin/sub-subcategories/:id` would mutate real taxonomy and is forbidden. | All; real-row dialog | pending | BLOCKED-BY-POLICY |

## Slice: ux-admin-content — Journeys

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| JN-01 | `/admin/journeys` | Load journeys | Shows skeletons while `GET /api/admin/journeys` is pending. | All; loading | pending | PENDING |
| JN-02 | Journeys list | Activate `Retry` after failure | Reissues journeys and labels any retained rows as potentially stale. | All; failure with/without stale data | pending | PENDING |
| JN-03 | Journeys list | Load with no journeys | Shows `No journeys yet.`; no create-journey control is invented. | All; empty | pending | PENDING |
| JN-04 | Journeys list | Inspect populated journeys | Title, category, non-published status, description, and step count match `GET /api/admin/journeys`. | All; populated | pending | PENDING |
| JN-05 | Journey row | Activate `Steps` | Opens the selected journey's step manager and issues `GET /api/admin/journeys/:id/steps`. | All; populated | pending | PENDING |
| JN-06 | Journey Steps dialog | Load steps | Shows step skeletons while the steps request is pending. | All; loading | pending | PENDING |
| JN-07 | Journey Steps dialog | Activate `Retry` after request failure | Reissues the steps request; error is not an empty step list. | All; request failure | pending | PENDING |
| JN-08 | Journey Steps dialog offline | Activate `Retry` | Offline explanation stays distinct from empty and retries on reconnection. | All; offline | pending | PENDING |
| JN-09 | Journey Steps dialog | Open journey with zero steps | Shows `No steps yet — click Add step…`; Add step is enabled once data is available. | All; empty | pending | PENDING |
| JN-10 | Journey Steps dialog | Inspect populated grouped steps | Logical step numbers, grouped resources, optional badges, titles, and descriptions match the API without duplicating groups. | All; populated, single/multi-resource steps | pending | PENDING |
| JN-11 | Journey Steps dialog | Open `Add step` | Opens empty step editor without a write; unavailable/offline steps disable the opener. | All; populated/empty | pending | PENDING |
| JN-12 | Step editor | Edit `Title *`, including blank | Blank title disables submit and shows associated required-field guidance. | All; editor | pending | PENDING |
| JN-13 | Step editor | Edit `Description` | Updates step draft without saving. | All; editor | pending | PENDING |
| JN-14 | Step editor resource picker | Toggle `Pick resource`/`Change`/`Close picker` | Opens/closes search and issues `GET /api/resources?limit=10` only while open. | All; editor | pending | PENDING |
| JN-15 | Resource picker | Type a title search | Debounces/requests `GET /api/resources?search=…&limit=10`, shows searching, and preserves input focus. | All; picker open | pending | PENDING |
| JN-16 | Resource picker results | Choose a resource | Stores its ID in draft, shows `GET /api/resources/:id` title, and closes the picker without saving the step. | All; results populated | pending | PENDING |
| JN-17 | Resource picker selected badge | Activate `Clear resource` | Clears only the draft resource link; step editor remains open. | All; resource selected | pending | PENDING |
| JN-18 | Resource picker | Exercise no-results, error, offline, and `Retry` | Shows No results only on a successful empty response; error/offline offers a working retry and is not mislabeled empty. | All; picker states | pending | PENDING |
| JN-19 | Step editor | Toggle `Mark this step as optional` | Updates the draft optional flag and corresponding step badge only after save. | All; editor | pending | PENDING |
| JN-20 | Add Step footer | Confirm `Add step` on a real journey | `POST /api/admin/journeys/:id/steps` would alter a real journey; no QA journey can be created in this UI, so live save is forbidden. | All; confirmation available | pending | BLOCKED-BY-POLICY |
| JN-21 | Step editor footer | Cancel Add/Edit | Closes without POST/PATCH and discards the draft. | All; editor | pending | PENDING |
| JN-22 | Journey step | Activate `Move … up` | `POST /api/admin/journeys/:id/steps/reorder` would rewrite real step order; first-step disabled state can be inspected, live reorder is forbidden. | All; first/middle steps | pending | BLOCKED-BY-POLICY |
| JN-23 | Journey step | Activate `Move … down` | `POST /api/admin/journeys/:id/steps/reorder` would rewrite real step order; last-step disabled state can be inspected, live reorder is forbidden. | All; middle/last steps | pending | BLOCKED-BY-POLICY |
| JN-24 | Linked journey resource | Activate resource link | Opens `/resource/:id` in a new tab safely; no step mutation occurs. | All; linked steps | pending | PENDING |
| JN-25 | Multi-resource step | Open remove-resource, cancel, or confirm removal | Open/Cancel are safe; confirmation `DELETE /api/admin/journeys/:journeyId/steps/:stepId` would mutate a real journey and is forbidden. | All; multi-resource step | pending | BLOCKED-BY-POLICY |
| JN-26 | Journey step | Open `Edit`, change fields, and save | Editor fields/resource picker behave as inventoried; `PATCH .../steps/:stepId?group=true` on a real journey, including group propagation, is forbidden. | All; single and grouped steps | pending | BLOCKED-BY-POLICY |
| JN-27 | Journey step | Open `Delete`, cancel, or confirm | Open/Cancel sends nothing; confirmation `DELETE .../steps/:stepId?group=true` deletes/renumbers a real journey step and is forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| JN-28 | Journey step mutations | Inspect failure copy on a non-production fixture | Error remains inline and the affected step/dialog is not falsely shown as saved/reordered/deleted. | Non-production only; failure | pending | PENDING |
| JN-29 | Journey manager and step dialogs | Complete keyboard, 44px-target, focus-return, and reduced-motion sweep | Every icon action has a step-specific accessible name, touch target is adequate, dialogs return focus, and long content wraps without clipping. Cycle-5 journey-save and input gaps stay explicit. | All; keyboard/touch/reduced motion | pending | PENDING |

## Slice: ux-admin-ai — Enrichment

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| EN-01 | `/admin#enrichment` stats | Inspect Last enriched, Queue, and Avg cost | Values derive from `GET /api/enrichment/jobs`; unavailable/no-completed states are not rendered as fake zero cost or healthy idle. | All; populated/empty/error | pending | PENDING |
| EN-02 | Enrichment jobs | Initial load | Shows loading while `GET /api/enrichment/jobs` is pending; launch remains disabled until active-job state is known. | All; loading | pending | PENDING |
| EN-03 | Enrichment jobs | Activate `Retry` after list failure | Reissues jobs; retained rows are marked possibly stale and the error is not an empty queue. | All; failure with/without stale rows | pending | PENDING |
| EN-04 | Enrichment jobs | Load with no jobs | Shows `No enrichment jobs found.` / start-first-job guidance without inventing a run. | All; empty | pending | PENDING |
| EN-05 | Enrichment jobs | Inspect populated table | Job IDs, effective status, started/completed times, and Logs match API data; impossible processed counts are not displayed. | All; populated | pending | PENDING |
| EN-06 | Enrichment `Job controls & monitoring` | Expand/collapse details | Reveals/hides full job controls and monitoring with correct expanded state. | All; admin | pending | PENDING |
| EN-07 | Enrichment jobs | Toggle `Show all N jobs`/`Show fewer` | Expands/collapses beyond canonical row limit and preserves table/focus context. | All; > canonical rows | pending | PENDING |
| EN-08 | Enrichment Run job controls | Open Run job from header or Job Control | Validates active-job state and batch size, then opens paid-run confirmation without starting a job. | All; idle | pending | PENDING |
| EN-09 | Job Control | Choose `All Resources` or `Unenriched Only` | Updates filter and confirmation scope; unenriched uses the same no-tags predicate as `GET /api/admin/enrichment/coverage`. | All; idle | pending | PENDING |
| EN-10 | Job Control | Enter batch size 1–50 | Accepts a whole number in range and uses it in confirmation/API payload. | All; idle | pending | PENDING |
| EN-11 | Job Control | Enter blank, fractional, 0, negative, or >50 batch size | Shows inline range error and disables both Run job controls; no paid confirmation opens. | All; invalid inputs | pending | PENDING |
| EN-12 | Job Control | Toggle advanced enrichment settings | Reveals/hides model, base URL, and token with accurate expanded state; active job disables editing. | All; idle and active | pending | PENDING |
| EN-13 | Advanced enrichment | Edit `Model` | Uses explicit override only when nonblank; placeholder reflects `GET /api/health/ai` default. | All; advanced open | pending | PENDING |
| EN-14 | Advanced enrichment | Edit `Base URL` | Explains HTTP/HTTPS and token requirement; blank uses server endpoint and no secret is exposed. | All; advanced open | pending | PENDING |
| EN-15 | Advanced enrichment | Edit `Auth Token` | Password input does not reveal the token; only last four would appear in saved details and token clears after launch. | All; advanced open | pending | PENDING |
| EN-16 | Start Enrichment confirmation | Cancel | Closes without `POST /api/enrichment/start`; no job or charge is created. | All; confirmation open | pending | PENDING |
| EN-17 | Start Enrichment confirmation | Confirm `Start enrichment` | Would start a paid `POST /api/enrichment/start`; live paid AI work is forbidden on production. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| EN-18 | Start Enrichment confirmation | Open with zero resources matching filter | Shows nothing-to-enrich state and disables confirmation; no zero-resource paid job can start. | All; zero scope | pending | PENDING |
| EN-19 | Enrichment launch guards | Inspect active job, loading jobs, and failed jobs states | Active/unknown job state disables launch; failed list explains retry is required before any paid run. | All; active/loading/error | pending | PENDING |
| EN-20 | Start Enrichment confirmation | Inspect failed start on non-production | Inline error stays in the open dialog, suggests checking job list before retry, and does not claim success. | Non-production; start failure | pending | PENDING |
| EN-21 | Enrichment active job | Observe pending/processing progress | Polls every 3s, shows processed/total, success/failure/skip counts and estimate; completed legacy statuses map honestly. | All; active and terminal fixtures | pending | PENDING |
| EN-22 | Active enrichment job | Open `Cancel` | Confirmation explains processed resources remain and unprocessed stay unchanged; no cancellation on open. | All; active job | pending | PENDING |
| EN-23 | Cancel Enrichment dialog | Choose `Keep running` | Closes without `DELETE /api/enrichment/jobs/:id`; job continues. | All; confirmation open | pending | PENDING |
| EN-24 | Cancel Enrichment confirmation | Confirm cancellation | Would call `DELETE /api/enrichment/jobs/:id` and alter a live production job; forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| EN-25 | Cancel Enrichment dialog | Inspect cancellation failure on non-production | Dialog stays open with outcome-aware error; retry cannot issue duplicates and job list can be refreshed. | Non-production; cancel failure | pending | PENDING |
| EN-26 | Enrichment job row | Open `Logs` | Opens the correct job details and issues `GET /api/enrichment/jobs/:id`; no job mutation occurs. | All; populated | pending | PENDING |
| EN-27 | Enrichment Job Details | Load selected job | Shows loading rather than default/empty stats while job detail is unresolved. | All; detail loading | pending | PENDING |
| EN-28 | Enrichment Job Details | Activate `Retry` after detail failure | Reissues the selected job endpoint and marks any stale detail; error does not become empty logs. | All; detail failure | pending | PENDING |
| EN-29 | Enrichment Job Details | Inspect populated configuration/statistics/resources/errors and close | Values match selected job; token is masked; processed/failed IDs cap at 50 with overflow count; close returns focus to Logs. | All; populated detail | pending | PENDING |
| EN-30 | Job Details Agent Graph and Agent Events | Inspect loading, waiting, empty, populated, and failed states | Graph/event states derive from `GET /api/enrichment/jobs/:id/events`; failure offers Retry from Agent Events and never implies no activity. | All; event states, active/terminal | pending | PENDING |
| EN-31 | Agent Events | Expand/collapse a structured event and navigate by keyboard | Shows/hides only that event's details with accurate accessible name/expanded state; reduced-motion and touch targets remain usable. | All; populated events | pending | PENDING |

## Slice: ux-admin-ai — Researcher

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| RS-01 | `/admin#researcher` Brief step | Choose `Auto-generate at launch` | Launch payload uses an empty custom prompt so the server builds a gap-aware brief; no run starts on selection. | All; launch form | pending | PENDING |
| RS-02 | Researcher Brief step | Choose `Write my own` | Reveals brief textarea/generate control and requires at least 10 trimmed characters at launch. | All; launch form | pending | PENDING |
| RS-03 | Custom brief | Activate `Start from a generated brief` | `GET /api/researcher/brief` fills editable prompt and switches to custom mode; failure shows a destructive toast and no run starts. | All; success/error | pending | PENDING |
| RS-04 | Custom brief | Edit `Research brief` | Updates custom prompt and character count; short input yields inline launch validation without a POST. | All; custom mode | pending | PENDING |
| RS-05 | Researcher Focus step | Choose category or `All categories` | Sets `categoryFocus` only for a specific category; catalog categories come from shared catalog data. | All; launch form | pending | PENDING |
| RS-06 | Researcher Limits | Edit `Stop after (discoveries)` | Blank means no target; only whole 1–1000 values pass and the hint/launch summary matches. | All; valid/invalid | pending | PENDING |
| RS-07 | Researcher Limits | Edit `Budget cap (USD)` | Blank means no cap with explicit warning; positive values pass and invalid/nonpositive values block launch. | All; valid/invalid, relaunch focus | pending | PENDING |
| RS-08 | Researcher Limits | Edit `Max turns` | Blank means no turn cap; only positive whole values pass and summary matches. | All; valid/invalid | pending | PENDING |
| RS-09 | Researcher Endpoint & model | Toggle advanced settings | Reveals/hides advanced fields with accurate expanded state; changing them re-resolves config preview. | All; launch form | pending | PENDING |
| RS-10 | Advanced researcher | Edit `Orchestrator model` | Debounced override is included in `GET /api/researcher/config?model=…`; blank uses server default. | All; advanced open | pending | PENDING |
| RS-11 | Advanced researcher | Edit `Scout model` | Debounced override is included in config preview; blank uses the server's scout/haiku-tier default. | All; advanced open | pending | PENDING |
| RS-12 | Advanced researcher | Edit `Base URL` | Custom endpoint requires token and refreshes resolved host/preflight; plain HTTP reveals explicit insecurity control. | All; HTTPS and HTTP inputs | pending | PENDING |
| RS-13 | Advanced researcher | Edit `Auth token` | Password stays masked, only `hasAuthToken=1` reaches preview, and token clears after a successful launch. | All; advanced open | pending | PENDING |
| RS-14 | Advanced researcher plain HTTP | Toggle insecure-transport acknowledgement | Required before `allowInsecureHttp=1` can be sent; warning explains network exposure and preflight otherwise blocks launch. | All; plain HTTP | pending | PENDING |
| RS-15 | Researcher config preview | Change overrides and observe resolution | Shows resolving state and never treats a stale placeholder preview as current; launch remains disabled during debounce/request. | All; preview pending/stale | pending | PENDING |
| RS-16 | Researcher config preview | Trigger `GET /api/researcher/config` failure | Shows outcome-aware inline error and launch remains disabled; no endpoint is guessed. | All; preview error | pending | PENDING |
| RS-17 | Researcher config preview | Inspect current populated/preflight-blocked summaries | Endpoint host, credential source, models, overrides, and preflight match the server response; no secret token appears. | All; current ok/blocked | pending | PENDING |
| RS-18 | Researcher active-run notice | Activate `Follow run #N` | Switches from launch form to that run's live view and updates the jobId deep-link state. | All; active run | pending | PENDING |
| RS-19 | Researcher launch | Submit invalid brief/limits | Displays precise inline validation and does not open confirmation or call `POST /api/researcher/start`. | All; invalid form | pending | PENDING |
| RS-20 | Researcher launch | Open `Launch research run` with valid form | Confirmation names paid agent, limits, endpoint, and uncapped-spend warning where applicable; no run starts on open. | All; valid form | pending | PENDING |
| RS-21 | Launch confirmation | Cancel | Closes without `POST /api/researcher/start`; no paid run is created. | All; confirmation open | pending | PENDING |
| RS-22 | Launch confirmation | Confirm `Launch` | Would call `POST /api/researcher/start` and incur real AI cost; forbidden on production. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| RS-23 | Researcher launch guards | Inspect loading/failed jobs, active run, preflight failure, and stale preview states | Each state disables launch with an accurate reason; an active run offers Follow instead of a second launch. | All; guard states | pending | PENDING |
| RS-24 | Launch confirmation | Inspect failed launch on non-production | Dialog remains open with inline outcome-aware error; jobs table can be checked before retry and no success view is shown. | Non-production; start failure | pending | PENDING |
| RS-25 | Research run view | Open `?jobId=N` while detail loads | Shows a real loading state, not missing-run or zero-progress content. | All; detail loading | pending | PENDING |
| RS-26 | Research run view missing ID | Open nonexistent `?jobId=N`, then `Start another run` | 404 explains the run may be deleted/wrong; Start another returns to launch steps without inventing a run. | All; 404 | pending | PENDING |
| RS-27 | Research run view | Activate `Retry` after non-404 detail failure | Reissues `GET /api/researcher/jobs/:id`; Start another remains available and error is not empty progress. | All; detail failure | pending | PENDING |
| RS-28 | Active research run | Observe phase timeline and discovery/turn/spend meters | Values and liveness derive from job/events/discoveries; active zero cost/turns says reported at end rather than fake final zero. | All; active phases | pending | PENDING |
| RS-29 | Active research run | Open `Cancel run` | Opens paid-run cancellation confirmation without issuing DELETE. | All; active run | pending | PENDING |
| RS-30 | Cancel Research Run dialog | Dismiss/keep run | Closes without `DELETE /api/researcher/jobs/:id`; run remains active. | All; confirmation open | pending | PENDING |
| RS-31 | Cancel Research Run confirmation | Confirm cancellation | Would alter a live paid run through `DELETE /api/researcher/jobs/:id`; forbidden on production. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| RS-32 | Research run polling | Interrupt job/events/discoveries poll after good data | Shows `Live updates failed; showing last good data and retrying`; stale values are not presented as current. | All; poll failure with stale data | pending | PENDING |
| RS-33 | Research run completed | Inspect completion outcome and review focus | Completion copy/counts match job/discoveries and focus moves to Review discoveries; no extra phase animation under reduced motion. | All; completed | pending | PENDING |
| RS-34 | Research run failed/cancelled | Inspect terminal failure/cancel outcome | Reason and saved counts match the run; error is not rendered as successful completion. | All; failed/cancelled | pending | PENDING |
| RS-35 | Research run budget stopped | Activate `Relaunch with a higher cap` | Returns to launch steps, scrolls/focuses budget field, and preserves a clear new-run flow without starting it. | All; budget_stopped | pending | PENDING |
| RS-36 | Research run discoveries | Observe active-empty and ended-empty states | Active says saved discoveries will appear; ended run with none says it saved no discoveries; neither is an error. | All; empty active/ended | pending | PENDING |
| RS-37 | Research run discoveries | Activate `Retry` after discovery-load failure | Reissues `GET /api/researcher/discoveries?jobId=N`; failure does not become zero discoveries. | All; discovery failure | pending | PENDING |
| RS-38 | Research run discovery | Inspect populated item and open external URL | Title, status, verification badges, and URL match API; URL opens safely in a new tab. | All; populated | pending | PENDING |
| RS-39 | Discovery review (run, pending table, job details) | Confirm `Approve` | Would publish a discovery via `POST /api/researcher/discoveries/:id/approve`; real production write is forbidden. | All; pending discovery | pending | BLOCKED-BY-POLICY |
| RS-40 | Discovery review | Open `Reject`, edit optional reason, then Cancel | Dialog records reason only in local draft; Cancel closes without `POST .../:id/reject`. | All; rejection dialog | pending | PENDING |
| RS-41 | Reject Discovery confirmation | Confirm rejection | Would call `POST /api/researcher/discoveries/:id/reject`; production mutation is forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| RS-42 | Ended research run | Activate `Done` or `Review later — go to job history` | Shows full job history with the run highlighted and moves focus to the jobs region. | All; ended run, both pending counts | pending | PENDING |
| RS-43 | Research run view | Activate `Start another run` | Returns to launch steps without starting a job and clears stale jobId from the URL. | All; ended/missing run | pending | PENDING |
| RS-44 | Research run details | Toggle raw event log and agent graph region | Reveals/hides detail with accurate expanded state; no extra network mutation occurs. | All; run loaded | pending | PENDING |
| RS-45 | Research run detail tabs | Switch `Event log` and `Agent graph`; expand an event | Correct tab renders from `GET /api/researcher/jobs/:id/events`; loading/waiting/empty/error/retry and event expansion states are honest. | All; event states | pending | PENDING |
| RS-46 | Researcher canonical jobs | Exercise loading/error/empty/populated states and `Show more`/`Load more` | Rows match `GET /api/researcher/jobs?limit=N`; error is not empty; each More increases the window to 200 and retains focus. | All; >20 jobs and offline Show-more | pending | PENDING |
| RS-47 | `All pending discoveries & full job history` | Expand details and switch `Review Discoveries`/`Job History` | Details and both tabs are keyboard/touch reachable at 390; pending badge count matches API. | All; admin | pending | PENDING |
| RS-48 | Pending discoveries | Exercise loading/error/empty/populated states | Loading is distinct; error offers Retry; empty says no pending discoveries; populated rows match `GET /api/researcher/discoveries`. | All; each state | pending | PENDING |
| RS-49 | Pending discoveries | Open `Approve All`, then Cancel | Confirmation names count, duplicate skipping, and irreversibility; Cancel sends no `POST /approve-all`. | All; pending discoveries | pending | PENDING |
| RS-50 | Approve All confirmation | Confirm bulk approval | Would call `POST /api/researcher/discoveries/approve-all` and publish real resources; production bulk write is forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| RS-51 | Full Job History | Use `Load more`, open row Details, or open active-job Cancel | Load more grows API window; Details opens selected job; Cancel only opens the same confirmation covered above and sends nothing yet. | All; >20 jobs, active/terminal | pending | PENDING |
| RS-52 | Research Job Details dialog | Inspect loading/error/populated discoveries/log/graph states and close | Selected job/config/cost/turns/token mask match API; detail/discovery errors offer Retry; empty logs are honest; close returns focus. | All; detail states | pending | PENDING |
| RS-53 | Researcher end-to-end input/motion/offline sweep | Keyboard-walk launch, run, discovery, history, and dialog controls at 820/390 | No clipped launch fields or ambiguous offline Show-more behavior; dialog focus returns and reduced motion skips phase animation. Cycle-5 gaps remain explicit. | All; real touch + keyboard + reduced motion + offline | pending | PENDING |

## Slice: ux-admin-ai — GitHub synchronization

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| GH-01 | `/admin#github` repository card | Load `GET /api/config` | Shows repository-loading state and does not enable Pull/Sync against a guessed destination. | All; config loading | pending | PENDING |
| GH-02 | GitHub repository config | Activate `Retry` after config failure | Reissues `/api/config`; Pull/export remain disabled until repository settings resolve. | All; config failure | pending | PENDING |
| GH-03 | GitHub repository config | Load with no configured repository | Shows `Repository not configured` and branch unavailable; actions requiring a normalized target are disabled. | All; unconfigured | pending | PENDING |
| GH-04 | GitHub repository card | Open `Pull` with valid target | Confirmation names source and that local resources may be added/updated; no import starts on open. | All; valid target | pending | PENDING |
| GH-05 | GitHub Pull confirmation | Cancel | Closes without `POST /api/github/import`; no catalog or queue write occurs. | All; confirmation open | pending | PENDING |
| GH-06 | GitHub Pull confirmation | Confirm `Start Import` | Would call `POST /api/github/import` and update production catalog/queue; forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| GH-07 | GitHub repository card | Open `Sync now` with valid target | Confirmation names destination and real README commit effect; no export starts on open. | All; valid target | pending | PENDING |
| GH-08 | GitHub Sync confirmation | Cancel | Closes without `POST /api/github/export`; no remote commit or queue write occurs. | All; confirmation open | pending | PENDING |
| GH-09 | GitHub Sync confirmation | Confirm `Start Export` | Would call `POST /api/github/export`, push a real commit, and write queue state; forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| GH-10 | GitHub `More` | Toggle More/Less | Reveals/hides target editor, detailed status, and full history with accurate expanded state. | All; admin | pending | PENDING |
| GH-11 | Target Repository editor | Enter valid `owner/repository` or GitHub URL | Normalizes target and enables Pull/Sync; configured card identity remains distinct from draft target. | All; editor open | pending | PENDING |
| GH-12 | Target Repository editor | Enter invalid repository | Shows associated inline error and disables Pull/Sync before a queue job can be created. | All; invalid input | pending | PENDING |
| GH-13 | Target Repository editor | Activate `Reset to configured repository` | Restores configured target and touched state; button is disabled when no configured repo exists. | All; edited and unconfigured | pending | PENDING |
| GH-14 | GitHub Sync Status | Observe loading and no-activity states | Loading says Loading sync activity; successful empty says No sync activity with next-step guidance, not an error. | All; loading/empty | pending | PENDING |
| GH-15 | GitHub Sync Status | Inspect pending, processing, completed, failed, partial, and committed-despite-error rows | Counts/outcomes/repeated-job grouping and error details match `GET /api/github/sync-status`; a failed latest sync is never green. | All; each status fixture | pending | PENDING |
| GH-16 | GitHub Sync Status | Activate `Retry` after queue failure | Reissues sync status and does not replace failure with No sync activity. | All; queue failure | pending | PENDING |
| GH-17 | GitHub Sync jobs history | Activate `Retry` after history failure | Reissues `GET /api/github/sync-history`; failure is not rendered as no operations. | All; history failure | pending | PENDING |
| GH-18 | Last sync / history detail | Activate `View Commit on GitHub` | Opens the recorded `commitUrl` in a new tab with safe rel attributes; no new commit is made. | All; commit URL present | pending | PENDING |
| GH-19 | Sync jobs row | Open `Logs` | Opens the correct run's direction, repository, status, resource deltas, commit/error details without a mutation. | All; populated history | pending | PENDING |
| GH-20 | Sync job details | Inspect partial/failed errors, then close | Every per-item error is visible with wrapping; close returns focus to Logs and sends no sync request. | All; partial/failed detail | pending | PENDING |
| GH-21 | Sync jobs history | Load successful empty history | Shows `No import/export operations yet` and next-step guidance, not a loading or failure state. | All; empty | pending | PENDING |
| GH-22 | Sync jobs history | Inspect populated rows and More/Less full-list behavior | Default shows last five; More shows all ordered history with correct IDs/types/statuses. | All; >5 history rows | pending | PENDING |
| GH-23 | GitHub dry-run API (no current UI control in 480a3ace) | `POST /api/admin/import-github` with `{repoUrl, dryRun:true, strictMode}` variants | Returns would-add/update/skip/error counts and `dryRun:true`, writes no resources/taxonomy/sync queue/audit rows, and dry-run counts reconcile with the same parsed input. Cycle-5 count-comparison gap remains PENDING; do not run the real import control. | All; dry-run only, valid/invalid/missing repo | pending | PENDING |

## Slice: ux-admin-ai — Research workspace (read-only)

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| RW-01 | `/admin#research` | Load research notes | Shows Loading research notes while `GET /api/researcher/jobs?limit=4` is pending. | All; loading | pending | PENDING |
| RW-02 | Research workspace | Activate `Retry` after notes failure | Reissues latest four jobs; retained notes are marked potentially stale and failure is not an empty workspace. | All; failure with/without stale notes | pending | PENDING |
| RW-03 | Research workspace | Load with no jobs | Shows `No research notes yet.` and an empty grid, with no fabricated note cards. | All; empty | pending | PENDING |
| RW-04 | Research workspace | Inspect populated notes | At most four cards show derived brief title, candidate count, freshness, and active state matching the jobs API. | All; populated active/terminal | pending | PENDING |
| RW-05 | Research note | Open note | Fetches `GET /api/researcher/jobs/:id` and opens a read-only detail dialog for the selected run. | All; populated | pending | PENDING |
| RW-06 | Research note dialog | Load selected job detail | Shows Loading research details while unresolved, not stale/blank brief content. | All; detail loading | pending | PENDING |
| RW-07 | Research note dialog | Activate `Retry` after detail failure | Reissues selected job detail and labels any retained details as potentially stale. | All; detail failure | pending | PENDING |
| RW-08 | Research note dialog | Activate `Review candidates for job #N` | Opens `/admin/researcher?jobId=N` and the full Researcher run view; workspace itself remains read-only. | All; populated detail | pending | PENDING |
| RW-09 | Research note dialog | Close via X/Escape | Closes without mutation and returns focus to the originating note, including after active-job polling. | All; dialog | pending | PENDING |

## Slice: ux-admin-ops — Export and backups

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| EX-01 | `/admin#export` `Validation controls` | Expand/collapse details | Reveals/hides Run Validation and Run Link Check with correct expanded state. | All; admin | pending | PENDING |
| EX-02 | Export validation controls | Open `Run Validation` | Opens awesome-lint confirmation explaining background work; no validation job starts on open. | All; idle | pending | PENDING |
| EX-03 | Export job confirmation | Cancel validation | Closes without `POST /api/admin/validate`; no result/audit entry is created. | All; confirmation open | pending | PENDING |
| EX-04 | Export job confirmation | Confirm `Run validation` | Would call `POST /api/admin/validate` and write validation/audit state; production execution is forbidden under the audit's no-POST job rule. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| EX-05 | Export validation controls | Open `Run Link Check` | Opens full-catalog network/job confirmation; no job starts on open and active job disables duplicate start. | All; idle and active | pending | PENDING |
| EX-06 | Export job confirmation | Cancel link check | Closes without `POST /api/admin/check-links`; no link-health job is created. | All; confirmation open | pending | PENDING |
| EX-07 | Export job confirmation | Confirm `Run link check` | Would call `POST /api/admin/check-links` and launch a production background job; forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| EX-08 | Export link-check panel | Observe pending/processing/completed/failed/cancelled states | Job ID, status, progress, completion counts, and reason match `GET /api/admin/link-health/status`; scan-time counts are distinguished from current Link Health counts. | All; each job state | pending | PENDING |
| EX-09 | Export link-check panel | Activate `Retry` after status failure | Reissues status and says missing progress is not evidence of healthy links; stale progress is labelled. | All; status failure with/without job | pending | PENDING |
| EX-10 | Export link-check panel | Activate `Open Link Health for problem links` | Opens `/admin/linkhealth` without starting/cancelling a scan. | All; job present | pending | PENDING |
| EX-11 | Export active link check | Activate `Cancel link check` | Would issue `DELETE /api/admin/link-health/jobs/:id` and discard live partial production progress; forbidden. | All; active job | pending | BLOCKED-BY-POLICY |
| EX-12 | Export JSON Snapshot card | Activate `Download` | `GET /api/admin/export-json` downloads the named non-restorable snapshot; busy state is focusable and history invalidates. | All; success | pending | PENDING |
| EX-13 | Export CSV card | Activate `Download` | `GET /api/admin/export-csv` downloads the resource table with expected filename/content type and no duplicate click. | All; success | pending | PENDING |
| EX-14 | Export README.md card | Activate `Generate` | `POST /api/admin/export` downloads `awesome-list.md`; generating state does not drop focus and audit history refreshes. | All; success | pending | PENDING |
| EX-15 | Export OPML card | Activate `Download` | `GET /api/admin/export-opml` downloads the hierarchical category tree with expected filename/content type. | All; success | pending | PENDING |
| EX-16 | All four export cards | Exercise offline and live 5xx failures for JSON/CSV/Markdown/OPML | No file downloads; each toast names the correct export and outcome, including actual 5xx wording rather than code-only inference. Cycle-5 live-5xx gap remains explicit. | All; offline and 5xx per format | pending | PENDING |
| EX-17 | `Export history & validation results` | Expand/collapse details | Reveals/hides export history and validation result panels with correct expanded state. | All; admin | pending | PENDING |
| EX-18 | Export history pagination | Activate `Previous exports` | Loads the prior `GET /api/admin/audit-logs?actions=…` window only when available; aria-disabled/focus remains coherent. | All; multi-page | pending | PENDING |
| EX-19 | Export history pagination | Activate `Next exports` | Loads the next export-only audit window; total counts exports only and focus does not drop while data changes. | All; multi-page | pending | PENDING |
| EX-20 | Export history | Exercise loading, error+Retry, zero-total, empty-page, and populated states | Loading is explicit; error retries; zero says no exports; empty later page directs Previous; populated type/format/status/rows/date match audit API. | All; each state | pending | PENDING |
| EX-21 | Validation Results | Load with no stored awesome-lint result | Shows `No validation results yet` and directs the operator to Run Validation, not `Passed`. | All; empty | pending | PENDING |
| EX-22 | Validation Results | Inspect populated valid/invalid summaries | `GET /api/admin/validation-status` drives Passed/Failed chip, resource/category counts, and last-validated time. | All; valid and invalid | pending | PENDING |
| EX-23 | Validation Results | Toggle `Errors (N)` | Expands/collapses errors grouped by rule with counts and line numbers; touch target is at least 44px. | All; errors present | pending | PENDING |
| EX-24 | Validation Results | Toggle `Warnings (N)` | Expands/collapses warnings grouped by rule with counts and line numbers; touch target is at least 44px. | All; warnings present | pending | PENDING |
| EX-25 | Full database backup | Activate `Create backup` | Would call `POST /api/admin/database-backups` and write a full production backup to private storage; forbidden. | All; configured storage | pending | BLOCKED-BY-POLICY |
| EX-26 | Full database backup list | Exercise loading, error+Retry, unconfigured, empty, and populated states | `GET /api/admin/database-backups` drives each distinct state; populated latest-ten metadata and create failure wording never claim a backup exists when unknown. Cycle-5 no-data gap remains explicit. | All; each state | pending | PENDING |
| EX-27 | Latest database backup | Toggle `Show contents`/`Hide contents` | Reveals/hides the latest backup manifest/table details with accurate expanded state; archives are never served over HTTP. | All; populated backup list | pending | PENDING |

## Slice: ux-admin-ops — Database

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| DB-01 | `/admin#database` stats | Observe loading and populated Tables/Rows/Disk/Migrations | Values and pending migration count derive from `GET /api/admin/stats`; missing stats show dashes/waiting, not zero. | All; loading/populated | pending | PENDING |
| DB-02 | Database `Database seeding` | Expand/collapse details | Reveals/hides Seed Database and Clear & Re-seed controls with correct expanded state. | All; admin | pending | PENDING |
| DB-03 | Database seeding | Open `Seed Database` | Confirmation explains additive import and skipping existing resources; no POST on open. | All; idle | pending | PENDING |
| DB-04 | Seed Database confirmation | Cancel | Closes without `POST /api/admin/seed-database`; no rows are inserted. | All; confirmation open | pending | PENDING |
| DB-05 | Seed Database confirmation | Confirm `Seed Database` | Would call `POST /api/admin/seed-database` with `clearExisting:false` and insert production rows; forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| DB-06 | Database seeding | Open `Clear & Re-seed` | Opens destructive replacement confirmation and resets typed confirmation; no POST on open. | All; idle | pending | PENDING |
| DB-07 | Clear & Re-seed dialog | Type incorrect text, lowercase `reseed`, then exact `RESEED` | Only exact trimmed uppercase RESEED enables destructive confirmation; other input stays disabled. | All; dialog | pending | PENDING |
| DB-08 | Clear & Re-seed dialog | Cancel | Closes without `POST /api/admin/seed-database`; catalog remains untouched. | All; dialog | pending | PENDING |
| DB-09 | Clear & Re-seed confirmation | Confirm with exact `RESEED` | Would call `POST /api/admin/seed-database` with `clearExisting:true` and destructively replace production catalog data; forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| DB-10 | Database seed result | Inspect success result on non-production | Persistent completed panel reports inserted category/subcategory/sub-subcategory/resource counts and preserved rows where applicable. | Non-production; success | pending | PENDING |
| DB-11 | Database seed result | Inspect partial-failure result on non-production | Warning panel reports exact errors/not-imported count and per-item messages; it does not claim full success. | Non-production; partial failure | pending | PENDING |
| DB-12 | Database seed result | Inspect request failure on non-production | Failure panel explains whether rows may have been added/changed and directs count verification; no rollback claim beyond the server contract. | Non-production; failure | pending | PENDING |
| DB-13 | Database Tables panel | Inspect populated PostgreSQL table stats | Name, row count, size, and newest-current-row timestamp match `stats.database.tableStats`; timestamp is not mislabeled as delete-aware last write. | All; populated | pending | PENDING |
| DB-14 | Database Tables panel | Observe missing stats/empty tableStats and upstream stats failure | No rows or dashes are shown as unavailable, not as a healthy zero-table database; shared stats Retry remains available. | All; missing/error | pending | PENDING |

## Slice: ux-admin-ops — Users

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| US-01 | `/admin/users` | Load users | Shows skeleton table while `GET /api/admin/users?page=1&limit=20` is pending. | All; loading | pending | PENDING |
| US-02 | Users table | Activate `Retry` after failure | Reissues current page/search/sort; error is not `No users found` and stale rows are labelled. | All; failure with/without stale data | pending | PENDING |
| US-03 | Users table | Load empty catalog and zero search matches | Empty catalog says No users found; filtered empty names the query and is distinct from request failure. | All; empty/filtered-empty | pending | PENDING |
| US-04 | Users table | Inspect populated rows | Total, name/fallback identity, masked email, role, and joined date match `GET /api/admin/users`; password hashes never appear. | All; populated | pending | PENDING |
| US-05 | Users header | Toggle `Row actions`/`Hide row actions` | Reveals/hides the row-action affordances with accurate expanded state and no user mutation. | All; admin | pending | PENDING |
| US-06 | Users search | Type email or name | After debounce sends `q`, resets page 1, and retains input focus while previous results display. | All; populated | pending | PENDING |
| US-07 | Users search | Activate `Clear user search` | Clears query and returns focus to input; hit area is at least 44×44 on coarse pointers (AO-19 regression check). | 820/390 touch; query present | pending | PENDING |
| US-08 | Users header | Activate `Export CSV` | `GET /api/admin/users/export` downloads the users CSV; formula neutralization works and unmasked PII stays out of transcript/evidence. | All; success and failure | pending | PENDING |
| US-09 | Users header | Inspect `Invite unavailable` disabled control | Remains disabled with title explaining invitations are unsupported by the admin API; no fake invite request occurs. | All; admin | pending | PENDING |
| US-10 | Users table | Activate `Sort by Name` repeatedly | Alternates name asc/desc and resets page 1; `sortBy=name&sortDir=…` and `aria-sort` match rows. | All; populated | pending | PENDING |
| US-11 | Users table | Activate `Sort by Email` repeatedly | Alternates email asc/desc and resets page 1; query and `aria-sort` match rows. | All; populated | pending | PENDING |
| US-12 | Users table | Activate `Sort by Role` repeatedly | Alternates role asc/desc and resets page 1; query and `aria-sort` match rows. | All; populated | pending | PENDING |
| US-13 | Users table | Activate `Sort by Joined` repeatedly | Alternates createdAt desc/asc and resets page 1; query and `aria-sort` match rows. | All; populated | pending | PENDING |
| US-14 | User row email | Toggle Reveal/Mask email | Switches only that row between masked and raw email with unique accessible label; default/raw DOM exposure follows the explicit toggle. | All; populated, keyboard/touch | pending | PENDING |
| US-15 | Other user row | Activate `Edit` role | Opens role selector with current role checked; own account has no Edit control. | All; other/self rows | pending | PENDING |
| US-16 | Role selector | Close without choosing | Cancels role editing, remounts Edit, and returns focus without opening confirmation or calling PUT. | All; role menu open | pending | PENDING |
| US-17 | Role selector | Choose `User` or `Admin` | A changed role opens Change user role confirmation; selecting the current role does not open one; Enter does not retrigger Edit. | All; role menu, keyboard | pending | PENDING |
| US-18 | Change user role dialog | Cancel | Closes without `PUT /api/admin/users/:id/role`; role remains unchanged and focus returns to Edit. | All; confirmation open | pending | PENDING |
| US-19 | Change user role confirmation | Confirm `Change Role` | Would change a real account's privileges through `PUT /api/admin/users/:id/role`; production mutation is forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| US-20 | Current admin row | Inspect self role/delete controls | Self-demote and self-delete controls are absent, matching server guards; no hidden request is emitted. | All; current admin | pending | PENDING |
| US-21 | Other user row | Activate `Delete` | Opens confirmation with masked identity and explains account/sign-in deletion plus resource detachment; no DELETE on open. | All; other user | pending | PENDING |
| US-22 | Delete user dialog | Cancel | Closes without `DELETE /api/admin/users/:id`; account and session remain unchanged. | All; confirmation open | pending | PENDING |
| US-23 | Delete user confirmation | Confirm `Delete User` | Would delete a real user and Clerk identity through `DELETE /api/admin/users/:id`; explicitly forbidden on production. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| US-24 | Users pagination | Activate Previous and Next at middle and edge pages | Correct page query and focus result occur; edge buttons disable without dropping focus to body. | All; multi-page | pending | PENDING |
| US-25 | Users table | Swipe horizontally at 390/820 and reach Edit | Horizontal overflow is actually discoverable and row actions reachable; the swipe hint alone is not treated as proof (AO-21). | 820/390 coarse pointer | pending | PENDING |

## Slice: ux-admin-ops — Link Health and member link reports

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| LH-01 | `/admin/linkhealth` | Initial load | Shows loading while status/history/problem-link/coverage requests are unresolved; no healthy zero is inferred. | All; loading | pending | PENDING |
| LH-02 | Link Health | Trigger failures in status/history/problem links/coverage, then `Retry` | Banner names each failed source and retries all; missing counts are explicitly unverified, not evidence of healthy links. | All; partial and total failure | pending | PENDING |
| LH-03 | Link Health | Load before any scan completes | Shows no-scan guidance and does not claim `All links are healthy`; run-empty summary offers the correct Run Link Check label. | All; no completed scan | pending | PENDING |
| LH-04 | Link Health | Inspect populated completed scan | Counts, scope, health percentage, and latest job match status/history/broken-links data; current-catalog residuals reconcile with the table. | All; completed | pending | PENDING |
| LH-05 | Link Health | Open any `Run Link Check`/`Run Check Now`/`Run full check` control | All entry points open the same full-catalog confirmation and never imply a per-row recheck. | All; idle | pending | PENDING |
| LH-06 | Run Link Health confirmation | Cancel | Closes without `POST /api/admin/link-health/run`; no scan starts. | All; confirmation open | pending | PENDING |
| LH-07 | Run Link Health confirmation | Confirm `Run check` | Would start a production background scan through `POST /api/admin/link-health/run`; forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| LH-08 | Link Health active scan | Observe pending/processing progress and polling | Job ID, checked/total, percentage, and active status update from `GET /api/admin/link-health/status`; previous completed counts remain labelled. | All; active with/without previous scan | pending | PENDING |
| LH-09 | Link Health active scan | Open `Cancel scan` | Confirmation explains in-flight requests stop and partial results are discarded while previous completed results remain. | All; active scan | pending | PENDING |
| LH-10 | Cancel scan dialog | Choose `Keep scanning` | Closes without `DELETE /api/admin/link-health/jobs/:id`; scan continues. | All; confirmation open | pending | PENDING |
| LH-11 | Cancel scan confirmation | Confirm `Cancel scan` | Would cancel a live production scan and discard partial progress through DELETE; forbidden. | All; confirmation open | pending | BLOCKED-BY-POLICY |
| LH-12 | Link Health failed/cancelled scan | Inspect terminal reason and open `Run scan again` | Failure/cancel reason is visible; previous completed counts are identified or absent; Rerun opens confirmation without starting it. | All; failed/cancelled | pending | PENDING |
| LH-13 | Link Health count tiles | Observe no-result state | Healthy/Redirect/Broken/Timeout/Suspect show dashes with `No result yet`, not numeric zeros, until a completed scan exists. | All; no completed scan | pending | PENDING |
| LH-14 | Link Health counts/status | Observe previous-completed snapshot and `degraded` status | Snapshot source is named and not mixed with active progress; degraded renders as warn, not recorded/neutral (AO-18 regression). | All; active + previous scan, degraded fixture | pending | PENDING |
| LH-15 | Member link reports | Choose `Open` status | `GET /api/admin/link-reports?status=open` loads only open member reports and openCount is consistent. | All; reports panel | pending | PENDING |
| LH-16 | Member link reports | Choose `Resolved` status | Loads only resolved reports; action buttons are not shown for terminal rows. | All; reports panel | pending | PENDING |
| LH-17 | Member link reports | Choose `Dismissed` status | Loads only dismissed reports; action buttons are not shown for terminal rows. | All; reports panel | pending | PENDING |
| LH-18 | Member link reports | Exercise loading and error+Retry | Loading is explicit; `Retry` reissues current status filter and error is not an empty report list. | All; loading/failure | pending | PENDING |
| LH-19 | Member link reports | Load empty Open/Resolved/Dismissed lists | Shows the correct status-specific `No … reports.` message only after a successful response. | All; each empty status | pending | PENDING |
| LH-20 | Member link report row | Open resource title and external resource URL | Title opens `/resource/:id`; URL opens the flagged external site safely; reporter identity stays masked. | All; populated reports | pending | PENDING |
| LH-21 | Open member link report | Activate `Resolve` | Would mutate report state via `PATCH /api/admin/link-reports/:resourceId/:reporter` with `status=resolved`; real production mutation is forbidden. | All; open report | pending | BLOCKED-BY-POLICY |
| LH-22 | Open member link report | Activate `Dismiss` | Would mutate report state via the same PATCH with `status=dismissed`; real production mutation is forbidden. | All; open report | pending | BLOCKED-BY-POLICY |
| LH-23 | Link Health Recent failures | Load with no failures, before a scan, and during a scan | Empty copy distinguishes no-run/in-progress/no-failures; unavailable problem links are not called healthy. | All; empty states | pending | PENDING |
| LH-24 | Link Health Recent failures | Open a populated resource title and external URL | Resource title opens internal detail; URL opens safely; broken/DNS/timeout/review-flag rows match the same problem-link dataset as counters. | All; populated | pending | PENDING |
| LH-25 | Link Health `More` | Toggle More/Less | Reveals/hides summary, trend chart, and Problem Links with accurate expanded state and no scan mutation. | All; admin | pending | PENDING |
| LH-26 | Link Health Summary | Activate `Run Check Now` | Opens the same confirmation as other run controls; active job disables duplicate start. | All; summary open, idle/active | pending | PENDING |
| LH-27 | Link Health Trends | Observe chart loading, populated tooltip/legend, and 390 below-fold layout | Lazy loading is explicit; completed runs only plot; legend stays above, ticks inside SVG, tooltip values match history, including 390 below fold (AO-16/cycle-5 gap). | All, especially 390 tall scroll | pending | PENDING |
| LH-28 | Problem Links filter | Choose All Issues, Broken Links, Timeouts, Redirects, and Suspect | Client-side filter uses the same full dataset as counters; Broken includes `dns_failure`; selected long label is not clipped. | All; each filter | pending | PENDING |
| LH-29 | Problem Links | Exercise loading, unavailable, and filtered-empty states | Loading is explicit; failed status/problem links says unverified; empty copy distinguishes no scan/running/all-clear/filter-no-match. | All; each state | pending | PENDING |
| LH-30 | Problem Links populated table | Scroll both axes and open resource/external links | All six columns remain reachable at 390/820; statuses, error detail, failures, and flags match API rows. | 820/390; populated | pending | PENDING |
| LH-31 | Member link reports | Inspect failed resolve/dismiss on non-production | Inline action error is shown and row remains in its prior status; it is not silently removed as if updated. | Non-production; mutation failure | pending | PENDING |
| LH-32 | Link Health and reports | Complete keyboard, real-touch, reduced-motion, and horizontal/vertical sweep | All run/cancel/filter/link controls remain reachable with adequate targets; no chart-only information is required and motion respects preference. | All; keyboard/real touch/reduced motion | pending | PENDING |

## Slice: ux-admin-ops — Digests

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| DG-01 | `/admin/digests` | Load delivery health | Shows skeletons while `GET /api/admin/digests/health` is pending. | All; loading | pending | PENDING |
| DG-02 | Digest delivery health | Activate `Retry` after initial failure | Reissues health and shows a real error rather than empty/zero queue health. | All; initial failure | pending | PENDING |
| DG-03 | Digest delivery health | Fail a poll after a good snapshot | Keeps the last good snapshot but marks it stale with last-good-update time; no recipient/message/secret data appears. | All; stale snapshot | pending | PENDING |
| DG-04 | Digest delivery health | Activate `Refresh` | Reissues health only when not already fetching; aria-disabled/busy and updated time are accurate. | All; populated/stale | pending | PENDING |
| DG-05 | Digest delivery health | Inspect populated transport, queue, totals, and failure codes | Aggregate values match `GET /api/admin/digests/health`; queue totals reconcile across channels/statuses. | All; populated | pending | PENDING |
| DG-06 | Digest jobs by channel/status | Load with no digest jobs | Shows `No digest jobs recorded.` rather than zero-valued chart cards implying measured health. | All; empty queue | pending | PENDING |
| DG-07 | Recent digest failures | Load with no recent failure codes | Shows `No recent failure codes recorded.`; populated failures display only aggregate codes/counts, never message contents. | All; empty and populated failures | pending | PENDING |

## Slice: ux-admin-ops — Audit log and Contact submissions

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| AU-01 | `/admin#audit` | Load audit log | Shows skeleton rows while `GET /api/admin/audit-logs?limit=25&offset=0` is pending. | All; loading | pending | PENDING |
| AU-02 | Audit log | Activate `Retry` after failure | Reissues current filter/limit/offset; filter stays applied and failure is not shown as no entries. | All; failure with/without stale rows | pending | PENDING |
| AU-03 | Audit log | Load with no matching entries | Shows `No audit log entries found` only after a successful empty response. | All; empty | pending | PENDING |
| AU-04 | Audit log | Inspect populated rows | ID, actor masking, action, target, status, and timestamps match API; range/total reflect the full log, not one page. | All; populated | pending | PENDING |
| AU-05 | Audit header | Toggle audit tools | Reveals/hides filters and Contact submissions with correct expanded state. | All; admin | pending | PENDING |
| AU-06 | Audit Resource ID filter | Enter blank or positive int4 ID and submit | Applies `resourceId`, resets offset, and fetches matching entries. | All; tools open | pending | PENDING |
| AU-07 | Audit Resource ID filter | Enter 0, nonnumeric, negative, or >int4 value | Shows inline validation and disables Search; invalid ID never reaches the API. | All; invalid inputs | pending | PENDING |
| AU-08 | Audit tools | Choose 25/50/100/200 rows and apply | Updates limit on Search, resets offset, and range/API page size agree. | All; each limit | pending | PENDING |
| AU-09 | Audit tools | Activate Search button or Enter | Applies the current valid filter and limit through `GET /api/admin/audit-logs`. | All; tools open | pending | PENDING |
| AU-10 | Audit active filter | Activate `Clear` | Clears input/applied filter, resets offset, and returns focus to the now-empty Resource ID field. | All; active filter | pending | PENDING |
| AU-11 | Audit tools | Activate `Refresh` | Reissues current query only when not fetching; aria-disabled/busy retains focus. | All; tools open | pending | PENDING |
| AU-12 | Audit pagination | Activate `Previous` | Decrements offset by limit without going below zero and moves focus appropriately at the first page. | All; multi-page | pending | PENDING |
| AU-13 | Audit pagination | Activate `Next` | Increments offset by limit only while rows remain; new page scrolls focused pager into view and edge focus is retained. | All; multi-page | pending | PENDING |
| AU-14 | Audit row | Activate row via click, Enter, or Space | Opens the full audit entry detail with notes and complete changes payload; keyboard activation prevents page scroll. | All; populated | pending | PENDING |
| AU-15 | Audit row ID cell | Activate `View details for audit entry N` | Opens the same entry while stopping row-click duplication; accessible name is unique. | All; populated | pending | PENDING |
| AU-16 | Audit entry dialog | Close via X/Escape | Closes without mutation and returns focus to the originating row/detail control. | All; dialog | pending | PENDING |
| AU-17 | Audit status chips | Inspect create/update/delete, auth.*, recommendation invalid, unknown, and degraded rows | Each has truthful status: failed login is not neutral, rejected operations are not failed requests, deletion is not failure, unknown is not success, degraded is warn (AO-17/18/20). | All; corresponding fixtures | pending | PENDING |
| AU-18 | Contact submissions | Load inbox | Shows skeletons while `GET /api/admin/contact-submissions?limit=20&offset=0` is pending. | All; tools open, loading | pending | PENDING |
| AU-19 | Contact submissions 404 | Activate `Retry` | Distinct endpoint-unavailable panel says no inbox data is available and reissues the request; not a false empty inbox. | All; 404 | pending | PENDING |
| AU-20 | Contact submissions failure | Activate `Retry` after non-404 failure | Reissues inbox and keeps failure distinct from empty/unavailable. | All; request failure | pending | PENDING |
| AU-21 | Contact submissions | Load successful empty inbox | Shows `No contact submissions found` and total zero. | All; empty | pending | PENDING |
| AU-22 | Contact submissions | Inspect populated inbox | Newest-first name, masked reply-to, subject, and received date match API; total and range are real and emails stay masked by default. | All; populated | pending | PENDING |
| AU-23 | Contact submissions pagination | Activate Previous and Next | Changes offset by 20 only within bounds, disables during fetch, and range updates correctly. | All; >20 submissions | pending | PENDING |
| AU-24 | Contact submission row | Open via click, Enter, or Space | Opens full private submission detail and does not reveal email until explicitly requested. | All; populated, keyboard | pending | PENDING |
| AU-25 | Contact submission detail | Toggle `Reveal/Mask reply-to email` | Explicitly reveals only the open submission's email and remasks on demand; other submissions stay masked. | All; dialog | pending | PENDING |
| AU-26 | Contact submission detail revealed email | Activate `mailto:` link | Opens the mail client with `Re: <subject>` encoded; no inbox delete or other mutation occurs. | All; email revealed | pending | PENDING |
| AU-27 | Contact submission detail | Close via X/Escape | Closes without mutation, clears revealed state for the next opening, and returns focus to the row. | All; dialog | pending | PENDING |

# Inventory reconciliation

**Total: 531 interaction rows** — 44 shared-shell rows plus 487 rows across 18 admin panels. Verdicts are exclusively `PENDING` or `BLOCKED-BY-POLICY`; no row is marked PASS from source reading.

| Slice | Panels | Rows |
|---|---|---:|
| ux-a11y | Shared admin shell, navigation, auth | 44 |
| ux-admin-content | Overview 15; Approvals 25; Edits 22; Resources 74; Categories 23; Subcategories 25; Sub-Subcategories 26; Journeys 29 | 239 |
| ux-admin-ai | Enrichment 31; Researcher 53; GitHub 23; Research workspace 9 | 116 |
| ux-admin-ops | Export 27; Database 14; Users 25; Link Health 32; Digests 7; Audit/Contact 27 | 132 |
| **Total** | **18 panels + shared shell** | **531** |

Cycle-5 regressions/gaps are explicitly carried by RM-03/41/42 (AC-19), CAT-13/19, SC-14/21, SSC-15/22 (AC-20), US-07 (AO-19), AU-17 (AO-20), US-25 (AO-21), EX-16 (live 5xx), EX-20–27 (empty validation/backups), LH-14/27 (degraded and 390 chart), GH-23 (dry-run counts), RS-46/53 (offline Show more), and SH-44 plus panel-specific sweeps (real touch, keyboard, reduced motion). Live approve/reject, paid jobs, destructive writes, and production-forbidden confirmations remain BLOCKED-BY-POLICY rather than omitted.

Exclusions: no active panel was excluded. Generic taxonomy bulk/export/undo/audit/file/richtext/multiselect capabilities are not configured and therefore are not active controls. Journey create/delete and journey-metadata editing have no current UI. Server-only endpoints without current UI callers are not measured as UI interactions. GitHub dry-run is included as GH-23 because it was explicitly required and is non-mutating with `dryRun:true`. User invitation is included as disabled US-09.

Open questions: none.
