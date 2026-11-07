# L05-admin-overview-approvals-edits-journeys: 91 open rows (from omp todo 5389, 2026-10-27 18:13Z)

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
