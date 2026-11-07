# L06-admin-resources: 74 open rows (from omp todo 5389, 2026-10-27 18:13Z)

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
