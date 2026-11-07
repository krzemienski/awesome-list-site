# ux-admin-content — cycle-06 findings

**Verdict: ISSUES** — 1 new LOW accessibility defect; AC-19 is fixed at 1440, but the required 820/390, reduced-motion, Sub-Subcategory, and Journeys coverage remains unverified.

- Revision at start and end: `520d6778369bc7ce495204cfcacc7e0533f941cc`.
- Run evidence root: `reports/prod-audit-2026-10-26/cycle-06/ux-admin-content/run-20261027T0529Z/`.
- Driven with the owner session in an isolated `agent-browser` session. Analytics consent was declined and `umami.disabled=1` was set. No real submission, taxonomy row, user, or journey step was mutated.
- `PASS (1440)` below means the named action/state was actually driven at 1440 with an accessibility snapshot and screenshot; console/error checks had no application errors and relevant request/mutation results were observed. Unless explicitly stated otherwise, 820×1180 touch and 390×844 touch remain **UNVERIFIED**.

## Defects

| id | severity | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---:|---|---|---|
| AC-21 | LOW | `/admin#subcategories` | 1440 | Empty Create Subcategory shows `Parent Category is required` only in a banner. Name and Slug receive associated inline errors, but the parent combobox has no `aria-invalid`/`aria-describedby`, and focus goes to `create-name`, not the missing parent. AC-20 requires the missing parent to receive focused, marked, described field feedback just like the other required fields. | `reports/prod-audit-2026-10-26/cycle-06/ux-admin-content/run-20261027T0529Z/step-132-subcategory-create-empty-ac20.txt` and `step-132-subcategory-create-empty-ac20-1440.png` — the parent alert is visible while the two text fields have inline errors; the captured active-element/ARIA evaluation identifies `create-name` and only name/slug as invalid. | `client/src/components/admin/GenericCrudManager.tsx:2202-2232` (create missing-field banner) and `2323-2344` (analogous edit path). |

## Earlier-cycle re-checks

- **AC-19 — FIXED at 1440; responsive widths UNVERIFIED.** Enter stayed on the requested page at 25 (`step-070-ac19-enter-25-page3.txt`), 50 (`step-073-ac19-enter-50-page2.txt`), and 100 (`step-078-ac19-enter-100-page2.txt`) rows, with matching URL and `page=N&limit=M` requests. Tab blur committed page 3 at 100 (`step-079-ac19-blur-100-page3.txt`). Invalid input produced `Enter a whole number between 1 and 39.` without changing the URL (`step-080-paginator-invalid.txt`); 9999 clamped to page 39 (`step-081-paginator-out-of-range.txt`). Public `/category/players-clients` Enter also stayed at page 2 (`step-088-public-enter-page2.txt` and `.png`).
- **AC-20 — FIXED for Categories create/edit at 1440; server-409 transport and other taxonomy levels remain UNVERIFIED.** Empty create (`step-091-category-create-empty-ac20.txt`), duplicate create (`step-097-category-create-duplicate-409.txt`), empty edit (`step-103-category-edit-empty-ac20.txt`), and duplicate edit (`step-104-category-edit-duplicate-409.txt`) all focus the expected name/slug field and set `aria-invalid` plus `aria-describedby`. The duplicate attempts were rejected by the loaded-list client guard, so no raw 409 was observed; this is not claimed as server-transport proof. AC-21 records the newly proved parent-field gap.
- **AC-18 — remains FIXED at 1440.** Real duplicate create POST 409 and edit PUT 409 focused and marked URL with an associated description: `step-032-resource-create-duplicate-409.txt`, `step-047-resource-edit-duplicate-409.txt` and their PNGs.
- **Cycle-5 live-mutation gaps — now exercised on QA resource 190358 only.** Approval POST 200: `step-060-qa-approved.txt`; rejection POST 200: `step-068-qa-rejected-live.txt`. Journey-step saving was not exercised and stays UNVERIFIED.

## QA creation and net-zero cleanup

Created only `[QA-audit-1026]` rows: resource **190358**, categories **1199/1200/1201**, and subcategories **2338/2339**. All were deleted through their admin UI confirmations. The rejected-resource search now shows `Resources (0 of 0)` and `No resources match the current search or filters.` (`step-181-resource-cleanup-absent.txt` and `.png`), and `/resource/190358` renders Page Not Found (`step-182-resource-190358-404.txt` and `.png`). Category and subcategory QA searches show no matches (`step-170-categories-cleanup-empty.txt`, `step-162-subcategories-cleanup-empty.txt`). The final 404 page shows the restored 3,825 public resources, 9 categories, and 99 subcategories. No journey step was created.

## Row-by-row results

### Overview — 15 rows

| id | verdict | evidence / reason |
|---|---|---|
| OV-01 | PASS (1440) | Resources card opened `/admin#resources`; 3,825/9 counts match stats/categories: `step-007-overview-resources-1440.txt`, `.png`, `step-002-admin-stats.json`, `step-003-categories.json`. |
| OV-02 | PASS (1440) | Subcategories card opened the correct 99-row panel: `step-008-overview-subcategories-1440.txt`, `.png`, `step-004-subcategories.json`. |
| OV-03 | PASS (1440) | Active users card opened Users; displayed 20 and 2 admins/18 contributors were visible: `step-009-overview-users-1440.txt`, `.png`. All-page reconciliation was not repeated. |
| OV-04 | PASS (1440, populated); UNVERIFIED zero-pending | Pending card opened 16-item queue: `step-010-overview-approvals-1440.txt`, `.png`, `step-005-pending.json`. |
| OV-05 | UNVERIFIED | Partial/total source failure and Retry were not induced without mocks/fault injection. |
| OV-06 | UNVERIFIED | Pending/loading audit state was not captured. |
| OV-07 | UNVERIFIED | Audit request failure and Retry were not induced. |
| OV-08 | UNVERIFIED | No empty-audit fixture existed; empty copy was not observed. |
| OV-09 | PASS (1440, populated) | Six-entry recent-activity feed was visible with actor/action/target/transaction/time and the six-entry API response was captured: `step-001-overview-1440.png`, `step-006-audit-six.json`. |
| OV-10 | PASS (1440, current populated states only) | Five health rows rendered in `step-001-overview-1440.png`; all health endpoints returned 200 in the captured session. Warn/bad/unknown variants UNVERIFIED. |
| OV-11 | UNVERIFIED | Health-source failures, stale labels, and Retry were not induced. |
| OV-12 | UNVERIFIED | Category loading state was not captured. |
| OV-13 | UNVERIFIED | Category failure and Retry were not induced. |
| OV-14 | UNVERIFIED | No zero-approved-category fixture existed. |
| OV-15 | PASS (1440) | Top-five populated ranking and bars were visible: `step-001-overview-1440.png`; source categories: `step-003-categories.json`. |

### Approvals — 25 rows

| id | verdict | evidence / reason |
|---|---|---|
| AP-01 | UNVERIFIED | Skeleton while pending was not captured. |
| AP-02 | UNVERIFIED | Failed queue load and Retry were not induced. |
| AP-03 | UNVERIFIED | Offline queue retry was not exercised. |
| AP-04 | UNVERIFIED | Queue had 16 real pending rows plus the temporary QA row; empty/offline-empty state was not available. |
| AP-05 | PASS (1440, populated); UNVERIFIED polling | Real pending rows/descriptions/tags/submitter/category/dates matched `step-005-pending.json`; UI: `step-010-overview-approvals-1440.txt`, `.png`. |
| AP-06 | PASS (1440) | Select-all followed by one row deselection produced 15 selected and `checked=mixed`: `step-011-approvals-selection-1440.txt`, `.png`. Touch target remains UNVERIFIED. |
| AP-07 | PASS (1440) | Only FlipReel was removed from the selected set; count changed 16→15: `step-011-approvals-selection-1440.txt`. |
| AP-08 | PASS (1440) | Bulk reject opened with exact `Reject 15` action: `step-012-bulk-reject-open-1440.txt`, `.png`. |
| AP-09 | PASS (1440) | Short reason disabled confirmation; valid reason enabled it: `step-013-bulk-reject-short.txt`, `step-014-bulk-reject-valid.txt`, `.png`. |
| AP-10 | PASS (1440, Escape); UNVERIFIED button/X | Escape closed without a bulk POST and focus returned to `Bulk reject (15)`: `step-015-bulk-reject-cancelled.txt`. |
| AP-11 | BLOCKED-BY-POLICY | No production bulk rejection was confirmed. |
| AP-12 | PASS (1440, selected/unselected); UNVERIFIED 1,000-ID guard | Selected dialog showed Approve 15; unselected showed Approve 16: `step-016-bulk-approve-selected-open.txt`, `step-018-approve-all-open.txt` and PNGs. |
| AP-13 | PASS (1440) | Both approval dialogs were cancelled without a bulk POST: `step-017-approvals-selection-cleared.txt`, `step-019-approve-all-cancelled.txt`. |
| AP-14 | BLOCKED-BY-POLICY | No production bulk approval was confirmed. |
| AP-15 | UNVERIFIED | Success/partial-failure bulk outcome was not produced; no forbidden bulk mutation was attempted. |
| AP-16 | UNVERIFIED | The row-title external icon was not separately activated; the equivalent link was proved inside Resource Details under AP-18. |
| AP-17 | PASS (1440) | Review opened full FlipReel details with no write: `step-020-approval-review-dialog.txt`, `.png`. |
| AP-18 | PASS (1440) | Exact URL, `_blank`, `noopener noreferrer`, and new-tab navigation were observed: `step-020-approval-review-dialog.txt`, `step-021-review-closed.txt`. Malformed/long-URL variants UNVERIFIED. |
| AP-19 | UNVERIFIED | No malformed-URL or missing-description pending fixture was available. |
| AP-20 | PASS (1440, Escape); UNVERIFIED Close/X | Escape closed and focus returned to `Review details for FlipReel`: `step-021-review-closed.txt`. |
| AP-21 | PASS (1440) | Row approval opened and cancelled with no approve POST: `step-022-row-approve-open.txt`, `step-023-row-approve-cancelled.txt`. |
| AP-22 | PASS (1440, QA row only) | QA 190358 was approved through confirmation; POST 200 and queue removal/toast: `step-059-qa-approve-confirm.txt`, `step-060-qa-approved.txt`, `.png`. |
| AP-23 | PASS (1440) | Row rejection short/valid reason and cancel/reset were exercised: `step-024-row-reject-open.txt`, `step-025-row-reject-valid.txt`, `step-026-row-reject-reopened.txt`. |
| AP-24 | PASS (1440, QA row only) | QA 190358 was rejected with a contributor reason; POST 200 and queue removal/toast: `step-067-qa-reject-valid.txt`, `step-068-qa-rejected-live.txt`, `.png`. |
| AP-25 | UNVERIFIED | Narrow horizontal swipe/keyboard-scroll and overflow cues were not exercised. |

### Edit Suggestions — 22 rows

| id | verdict | evidence / reason |
|---|---|---|
| ED-01 | UNVERIFIED | Edit queue loading skeleton was not captured. |
| ED-02 | UNVERIFIED | Failed edit load and Retry were not induced. |
| ED-03 | UNVERIFIED | Offline edit retry was not exercised. |
| ED-04 | UNVERIFIED | Stats reported zero pending edits, but the empty UI and Check again were not driven. |
| ED-05 | UNVERIFIED | No populated edit-suggestion fixture was available. |
| ED-06 | UNVERIFIED | No populated row/internal link was available. |
| ED-07 | UNVERIFIED | No populated row/external link was available. |
| ED-08 | UNVERIFIED | Diff dialog was not opened because no suggestion existed. |
| ED-09 | UNVERIFIED | No conflict fixture existed. |
| ED-10 | UNVERIFIED | Edit Details URL/new-tab behavior was not exercised. |
| ED-11 | UNVERIFIED | Edit Details close/focus return was not exercised. |
| ED-12 | UNVERIFIED | Ordinary Approve dialog was not available. |
| ED-13 | UNVERIFIED | Conflict approval wording was not available. |
| ED-14 | UNVERIFIED | Approve Edit cancellation was not exercised. |
| ED-15 | BLOCKED-BY-POLICY | No real suggestion was approved or merged. |
| ED-16 | UNVERIFIED | Non-production/QA failed-approval state was not available. |
| ED-17 | UNVERIFIED | Reject Edit dialog was not available. |
| ED-18 | UNVERIFIED | Reject Edit reason length/counter was not exercised. |
| ED-19 | UNVERIFIED | Reject Edit cancellation was not exercised. |
| ED-20 | BLOCKED-BY-POLICY | No real suggestion was rejected. |
| ED-21 | UNVERIFIED | Non-production/QA failed-rejection state was not available. |
| ED-22 | UNVERIFIED | Narrow horizontal scrolling was not exercised. |

### Resources — 74 rows

| id | verdict | evidence / reason |
|---|---|---|
| RM-01 | UNVERIFIED | First-load skeleton was not captured. |
| RM-02 | UNVERIFIED | Load failure/stale rows and Retry were not induced. |
| RM-03 | UNVERIFIED | Offline requested-page versus displayed-page behavior was not exercised. |
| RM-04 | UNVERIFIED | Empty-catalog fixture was not available. |
| RM-05 | UNVERIFIED | Filtered-empty state was reached, but inline Clear filters was not activated. |
| RM-06 | PASS (1440, populated); UNVERIFIED narrow overflow | Populated rows and totals rendered: `step-007-overview-resources-1440.txt`, `.png`. |
| RM-07 | PASS (1440) | Header search accepted `[QA-audit-1026]`, synchronized the filter input, retained focus, and returned 0 of 0 after deletion: `step-181-resource-cleanup-absent.txt`, `.png`. |
| RM-08 | UNVERIFIED | Show/Hide filters was not toggled; rejected deep-link initially exposed the region. |
| RM-09 | UNVERIFIED | Filter input was synchronized from the header but not independently typed into. |
| RM-10 | UNVERIFIED | Category choices including All Categories were not exercised. |
| RM-11 | PASS (1440, Rejected deep-link only); UNVERIFIED other statuses | `?status=rejected` showed Rejected selected: `step-171-resources-rejected-deep-link.txt`. |
| RM-12 | UNVERIFIED | Newest sort was visible but not compared to a changed API order. |
| RM-13 | UNVERIFIED | Oldest sort was not selected. |
| RM-14 | UNVERIFIED | Title A–Z was not selected. |
| RM-15 | UNVERIFIED | Title Z–A was not selected. |
| RM-16 | UNVERIFIED | Featured-only toggle was not exercised. |
| RM-17 | UNVERIFIED | Explicit Search submit/Enter was not exercised. |
| RM-18 | UNVERIFIED | Clear filters was not activated. |
| RM-19 | UNVERIFIED | Page-selection header checkbox was not exercised. |
| RM-20 | UNVERIFIED | Individual resource selection was not exercised. |
| RM-21 | UNVERIFIED | Clear Selection was not exercised. |
| RM-22 | UNVERIFIED | Resource bulk Approve dialog was not opened. |
| RM-23 | UNVERIFIED | Resource bulk Approve cancellation was not exercised. |
| RM-24 | BLOCKED-BY-POLICY | No production bulk approval was confirmed. |
| RM-25 | UNVERIFIED | Resource bulk Reject dialog was not opened. |
| RM-26 | UNVERIFIED | Resource bulk-reject reason validation was not exercised. |
| RM-27 | UNVERIFIED | Resource bulk-reject cancellation was not exercised. |
| RM-28 | BLOCKED-BY-POLICY | No production bulk rejection was confirmed. |
| RM-29 | UNVERIFIED | Resource bulk Delete dialog was not opened. |
| RM-30 | UNVERIFIED | Resource bulk Delete cancellation was not exercised. |
| RM-31 | BLOCKED-BY-POLICY | No production bulk deletion was confirmed. |
| RM-32 | UNVERIFIED | Row-star success/failure was not exercised; only the edit-dialog featured switch was changed. |
| RM-33 | UNVERIFIED | View was not activated. |
| RM-34 | PASS (1440, QA row) | Edit loaded stored values and `?resourceId=190358` fetched/opened the same row: `step-041-resource-edit-open.txt`, `.png`, `step-045-resource-edit-deep-link-owner.txt`, `.png`. |
| RM-35 | PASS (1440, QA row) | Delete opened the named QA confirmation without a request: `step-176-resource-delete-open.txt`. Real-row open was not performed. |
| RM-36 | PASS (1440) | Cancel closed the QA delete confirmation without DELETE: `step-177-resource-delete-cancelled.txt`. |
| RM-37 | PASS (1440, QA cleanup) | DELETE 200, absent search, and rendered 404: `step-180-resource-190358-deleted.txt`, `step-181-resource-cleanup-absent.txt`, `step-182-resource-190358-404.txt` and PNGs. |
| RM-38 | BLOCKED-BY-POLICY | No pre-existing production resource was deleted. |
| RM-39 | PASS (1440) | 25/50/100 reset to page 1 with matching limit/table state: `step-072-resources-50-per-page.txt`, `step-077-resources-100-per-page.txt`, and 25-row baseline `step-069-resources-page2-deep-link.txt`. |
| RM-40 | PASS (1440); UNVERIFIED edge focus | Previous, Next, and numbered page href/new-tab behavior worked: `step-084-paginator-previous-38.txt`, `step-085-next-visible.txt`, `step-086-page39-next-done.txt`, `step-087-public-category.txt`. |
| RM-41 | PASS (1440) | Enter stayed at the requested page at all three sizes: `step-070-ac19-enter-25-page3.txt`, `step-073-ac19-enter-50-page2.txt`, `step-078-ac19-enter-100-page2.txt` and PNGs. |
| RM-42 | PASS (1440) | Blur commit, invalid feedback, and out-of-range clamp: `step-079-ac19-blur-100-page3.txt`, `step-080-paginator-invalid.txt`, `step-081-paginator-out-of-range.txt`. |
| RM-43 | PASS (1440, resourceId/status/page); UNVERIFIED create=1 reload | Deep links: `step-045-resource-edit-deep-link-owner.txt`, `step-171-resources-rejected-deep-link.txt`, `step-069-resources-page2-deep-link.txt`. `?create=1` opened the dialog (`step-027-resource-create-deep-link.txt`) but its reload persistence was not proved. |
| RM-44 | PASS (1440, QA edit) | Blank title produced focused associated `Title is required`: `step-046-resource-edit-blank-title.txt`, `.png`. |
| RM-45 | PASS (1440, QA duplicate); UNVERIFIED syntax cases | Duplicate PUT 409 focused/marked/described URL and preserved the draft: `step-047-resource-edit-duplicate-409.txt`, `.png`. |
| RM-46 | PASS (1440, QA edit) | Updated description survived full save: `step-048-resource-edit-kind-libraries.txt`, `step-057-resource-190358-saved.json`. |
| RM-47 | UNVERIFIED | Changing Category and clearing incompatible children was not exercised. |
| RM-48 | PASS (1440, status draft transitions); UNVERIFIED required-reason transition | Pending/Rejected transitions were driven (`step-051-resource-edit-pending-draft.txt`, `step-053-resource-edit-rejected-selected.txt`), but a fresh non-rejected→rejected reason reveal was not completed. |
| RM-49 | UNVERIFIED | Rejection-reason length and field error were not exercised. |
| RM-50 | UNVERIFIED | Edit Subcategory dependency/reset was not exercised. |
| RM-51 | PASS (1440, no-child disabled state only); UNVERIFIED populated children | Desktop Players left Sub-subcategory disabled: `step-041-resource-edit-open.txt`. |
| RM-52 | PASS (1440, QA success); UNVERIFIED failure | Libraries immediate kind PATCH 200: `step-048-resource-edit-kind-libraries.txt`, `step-057-resource-190358-saved.json`. |
| RM-53 | PASS (1440, QA keyboard success); UNVERIFIED failure/pending lock | Featured switch PATCH 200 and stored false: `step-050-resource-edit-feature-off-keyboard.txt`, `step-057-resource-190358-saved.json`. |
| RM-54 | PASS (1440, create/full-save value) | Player format was selected and persisted: `step-036-resource-create-full-draft.txt`, `step-040-resource-190358-created.json`. |
| RM-55 | PASS (1440, create/full-save value) | Self-hosted provider was selected and persisted: `step-035-resource-create-provider-selfhosted.txt`, `step-040-resource-190358-created.json`. |
| RM-56 | PASS (1440, create/full-save value) | Intermediate skill level was selected and persisted: `step-036-resource-create-full-draft.txt`, `step-040-resource-190358-created.json`. |
| RM-57 | PASS (1440, QA full save) | PUT 200 saved Pending/description while kind=libraries and featured=false stayed intact: `step-056-resource-edit-saved.txt`, `step-057-resource-190358-saved.json`. |
| RM-58 | UNVERIFIED | Cancel/discard semantics were not exercised. |
| RM-59 | PASS (1440) | Empty create produced focused associated title error: `step-028-resource-create-empty-validation.txt`, `.png`. |
| RM-60 | PASS (1440, duplicate); UNVERIFIED syntax cases | Duplicate POST 409 focused/marked/described URL: `step-032-resource-create-duplicate-409.txt`, `.png`. |
| RM-61 | PASS (1440, draft/persistence); UNVERIFIED description error variant | Description was entered and persisted: `step-036-resource-create-full-draft.txt`, `step-040-resource-190358-created.json`. |
| RM-62 | PASS (1440, required/category selection); UNVERIFIED child reset | Missing category had associated error (`step-028-resource-create-empty-validation.txt`); Players & Clients was selected (`step-030-resource-create-category-chosen.txt`). |
| RM-63 | PASS (1440, Pending/Rejected); UNVERIFIED Approved | Pending default and Rejected draft were exercised (`step-036-resource-create-full-draft.txt`, `step-037-resource-create-rejected-draft.txt`); created status was confirmed in `step-040-resource-190358-created.json`. |
| RM-64 | PASS (1440, filtered selection); UNVERIFIED reset | Desktop Players was chosen from Players & Clients children: `step-031-resource-create-subcategory-chosen.txt`. |
| RM-65 | PASS (1440, disabled/no-child state); UNVERIFIED valid-child options | Sub-subcategory remained disabled for Desktop Players: `step-031-resource-create-subcategory-chosen.txt`. |
| RM-66 | PASS (1440, explicit kind); UNVERIFIED Automatic | Tools override was selected and stored: `step-033-resource-create-kind-tools.txt`, `step-040-resource-190358-created.json`. |
| RM-67 | PASS (1440, checked) | Feature checkbox was checked and `metadata.featured=true` persisted: `step-036-resource-create-full-draft.txt`, `step-040-resource-190358-created.json`. |
| RM-68 | PASS (1440) | Format Player stored with the QA row: `step-034-resource-create-format-player.txt`, `step-040-resource-190358-created.json`. |
| RM-69 | PASS (1440) | Provider Self-hosted stored with the QA row: `step-035-resource-create-provider-selfhosted.txt`, `step-040-resource-190358-created.json`. |
| RM-70 | PASS (1440) | Skill Intermediate stored with the QA row: `step-036-resource-create-full-draft.txt`, `step-040-resource-190358-created.json`. |
| RM-71 | PASS (1440, QA create/cleanup) | Exactly one QA resource, ID 190358, POST 201 and entered metadata: `step-039-resource-created.txt`, `step-040-resource-190358-created.json`; deletion proof under RM-37. |
| RM-72 | UNVERIFIED | Add Resource Cancel was not exercised. |
| RM-73 | PASS (1440, client/server error states); UNVERIFIED duplicate-submit prevention | Empty validation and 409 drafts are in `step-028-resource-create-empty-validation.txt`, `step-032-resource-create-duplicate-409.txt`, `step-046-resource-edit-blank-title.txt`, `step-047-resource-edit-duplicate-409.txt`; pending duplicate-request suppression was not measured. |
| RM-74 | BLOCKED-BY-POLICY | No pre-existing production resource was saved. |

### Categories — 23 rows

| id | verdict | evidence / reason |
|---|---|---|
| CAT-01 | UNVERIFIED | Loading skeleton was not captured. |
| CAT-02 | UNVERIFIED | List failure/stale rows and Retry were not induced. |
| CAT-03 | PASS (1440) | No-match row and filtered-from-10 count: `step-108-category-search-no-match.txt`, `.png`. |
| CAT-04 | PASS (1440, populated basics); UNVERIFIED nav reconciliation | Name/slug/counts populated in `step-089-categories-1440.txt`, `.png`; admin source `step-095-admin-categories-with-qa.json`. |
| CAT-05 | PASS (1440, open); UNVERIFIED hide | Search opened with `expanded=true` and usable input: `step-107-category-search-open.txt`. |
| CAT-06 | PASS (1440) | Name/slug query filtered client-side and reported counts: `step-108-category-search-no-match.txt`. Page-reset was not separately measured. |
| CAT-07 | PASS (1440) | Clear search emptied input, kept it open, and focus returned to `Search categories...`: `step-109-category-search-cleared.txt`. |
| CAT-08 | PASS (1440) | Empty Create Category dialog opened without a write: `step-090-category-create-open.txt`, `.png`. |
| CAT-09 | PASS (1440) | `[QA-audit-1026] Cáfé c6` generated `qa-audit-1026-cafe-c6`: `step-092-category-auto-slug.txt`. |
| CAT-10 | PASS (1440) | Manual slug override to `qa-audit-1026-c6-category`: `step-093-category-slug-override.txt`. |
| CAT-11 | PASS (1440, QA create/cleanup) | QA category 1199 created and later deleted: `step-094-category-created.txt`, `step-095-admin-categories-with-qa.json`, `step-170-categories-cleanup-empty.txt`. |
| CAT-12 | PASS (1440) | Duplicate create was cancelled without creating another row: `step-098-category-duplicate-create-cancelled.txt`. |
| CAT-13 | PASS (1440, empty/duplicate UI); UNVERIFIED raw 409 | Empty name/slug and duplicate slug focus/mark/description: `step-091-category-create-empty-ac20.txt`, `step-097-category-create-duplicate-409.txt` and PNGs. Duplicate was client-guarded. |
| CAT-14 | PASS (1440, QA edit) | Existing QA name/slug loaded without a write: `step-102-category-edit-open.txt`, `.png`. |
| CAT-15 | PASS (1440, QA edit) | Rename saved while slug remained unchanged: `step-105-category-edit-saved.txt`, `step-106-category-after-edit.json`. |
| CAT-16 | PASS (1440, deliberate/duplicate slug); UNVERIFIED required-empty slug | Slug changed to `community-events` and rejected accessibly: `step-104-category-edit-duplicate-409.txt`. |
| CAT-17 | PASS (1440, QA save) | PATCH 200 and refreshed source: `step-105-category-edit-saved.txt`, `step-106-category-after-edit.json`. |
| CAT-18 | UNVERIFIED | Edit Category Cancel was not exercised. |
| CAT-19 | PASS (1440, empty/duplicate UI); UNVERIFIED raw 409 | Empty name and duplicate slug focus/mark/description: `step-103-category-edit-empty-ac20.txt`, `step-104-category-edit-duplicate-409.txt` and PNGs. |
| CAT-20 | PASS (1440, open/delete own QA); UNVERIFIED cancel | QA categories 1199/1200/1201 deleted and QA search is empty: `step-165-category-1201-delete-open.txt`, `step-167-category-1200-delete-open.txt`, `step-169-category-1199-delete-open.txt`, `step-170-categories-cleanup-empty.txt`. |
| CAT-21 | BLOCKED-BY-POLICY for live deletion; PASS locked-row reason (1440) | Real rows were not deleted. Disabled reasons were visible in `step-089-categories-1440.txt`, `.png`. |
| CAT-22 | PASS (1440, 10/25/50/100 and numbered/Previous/Next); UNVERIFIED jump/focus | Two-page navigation `step-121-categories-paginator-visible.txt`, `step-122-categories-page2.txt`; sizes `step-123-categories-25-per-page.txt`, `step-128-categories-50-per-page.txt`, `step-129-categories-100-per-page.txt`. No multi-page jump input was exposed at two pages. |
| CAT-23 | BLOCKED-BY-POLICY | No pre-existing category was saved. |

### Subcategories — 25 rows

| id | verdict | evidence / reason |
|---|---|---|
| SC-01 | UNVERIFIED | Loading skeleton was not captured. |
| SC-02 | UNVERIFIED | List failure and Retry were not induced. |
| SC-03 | PASS (1440, no-match text); UNVERIFIED count | QA cleanup search shows `No subcategories match your search.`: `step-162-subcategories-cleanup-empty.txt`. |
| SC-04 | PASS (1440, populated basics); UNVERIFIED nav order reconciliation | Populated names/slugs/parents/counts: `step-130-subcategories-1440.txt`, `.png`; admin source `step-138-subcategories-with-qa.json`. |
| SC-05 | PASS (1440, open); UNVERIFIED hide | Search opened with `expanded=true`: `step-154-subcategories-cleanup-search-open.txt`. |
| SC-06 | PASS (1440, filter); UNVERIFIED page reset | QA query filtered to the two QA rows: `step-155-subcategories-cleanup-filtered.txt`. |
| SC-07 | UNVERIFIED | Clear search/focus return was not activated. |
| SC-08 | PASS (1440) | Create dialog exposed parent/name/slug with no write: `step-131-subcategory-create-open.txt`. |
| SC-09 | PASS (1440) | Parent options loaded and a QA parent was selected with real mouse input: `step-148-subcategory-parent-pointer-selected.txt`. |
| SC-10 | PASS (1440) | QA name generated a lowercase slug: `step-149-subcategory-duplicate-name.txt`, `step-152-subcategories-duplicates-created.json`. |
| SC-11 | UNVERIFIED | A deliberate manual slug override was not successfully exercised. |
| SC-12 | PASS (1440, QA create/cleanup) | QA subcategories 2338/2339 were created and then deleted: `step-152-subcategories-duplicates-created.json`, `step-159-subcategory-2338-deleted.txt`, `step-162-subcategories-cleanup-empty.txt`. |
| SC-13 | UNVERIFIED | Create Subcategory Cancel was not exercised. |
| SC-14 | FAIL (AC-21, empty parent); UNVERIFIED duplicate | Empty parent is banner-only with wrong focus/no parent ARIA: `step-132-subcategory-create-empty-ac20.txt`, `.png`. Name/slug errors are associated. A true duplicate-slug submission was not completed. |
| SC-15 | UNVERIFIED | Edit dialog was not opened. |
| SC-16 | UNVERIFIED | Edit name/no-slug-rewrite was not exercised. |
| SC-17 | UNVERIFIED | Deliberate edit slug was not exercised. |
| SC-18 | UNVERIFIED | Edit parent change was not exercised. |
| SC-19 | UNVERIFIED | QA subcategory edit-save was not exercised. |
| SC-20 | UNVERIFIED | Edit Subcategory Cancel was not exercised. |
| SC-21 | UNVERIFIED | Edit invalid/duplicate feedback was not exercised. |
| SC-22 | PASS (1440, open/cancel/delete own QA) | Cancel then DELETE 200 for 2338 and DELETE 200 for 2339; final no-match state: `step-156-subcategory-delete-open-1440.png`, `step-157-subcategory-delete-cancelled.txt`, `step-159-subcategory-2338-deleted.txt`, `step-162-subcategories-cleanup-empty.txt`. |
| SC-23 | BLOCKED-BY-POLICY for live deletion; PASS locked-row reason (1440) | Real rows were not deleted. Locked reasons are visible in `step-130-subcategories-1440.txt`, `.png`. |
| SC-24 | UNVERIFIED | Pagination and parent-load Retry were not exercised. |
| SC-25 | BLOCKED-BY-POLICY | No pre-existing subcategory was saved. |

### Sub-Subcategories — 26 rows

| id | verdict | evidence / reason |
|---|---|---|
| SSC-01 | UNVERIFIED | Panel was not driven; loading state not captured. |
| SSC-02 | UNVERIFIED | Panel/list failure and Retry were not driven. |
| SSC-03 | UNVERIFIED | No-match search was not driven. |
| SSC-04 | UNVERIFIED | Populated rows were not inspected. |
| SSC-05 | UNVERIFIED | Search toggle was not driven. |
| SSC-06 | UNVERIFIED | Name/slug filtering was not driven. |
| SSC-07 | UNVERIFIED | Clear search/focus return was not driven. |
| SSC-08 | UNVERIFIED | Add dialog was not opened. |
| SSC-09 | UNVERIFIED | Parent Category cascade was not exercised. |
| SSC-10 | UNVERIFIED | Parent Subcategory cascade/options were not exercised. |
| SSC-11 | UNVERIFIED | Name/auto-slug was not exercised. |
| SSC-12 | UNVERIFIED | Manual slug override was not exercised. |
| SSC-13 | UNVERIFIED | QA create was not exercised. |
| SSC-14 | UNVERIFIED | Create Cancel was not exercised. |
| SSC-15 | UNVERIFIED | Empty/duplicate AC-20 behavior was not exercised. |
| SSC-16 | UNVERIFIED | Edit dialog was not opened. |
| SSC-17 | UNVERIFIED | Edit name behavior was not exercised. |
| SSC-18 | UNVERIFIED | Edit slug behavior was not exercised. |
| SSC-19 | UNVERIFIED | Parent cascade edit was not exercised. |
| SSC-20 | UNVERIFIED | QA edit-save was not exercised. |
| SSC-21 | UNVERIFIED | Edit Cancel was not exercised. |
| SSC-22 | UNVERIFIED | Edit invalid/duplicate feedback was not exercised. |
| SSC-23 | UNVERIFIED | QA delete flow was not exercised. |
| SSC-24 | BLOCKED-BY-POLICY | No pre-existing sub-subcategory was deleted; locked-row inspection was not performed. |
| SSC-25 | UNVERIFIED | Pagination and parent-load Retry were not exercised. |
| SSC-26 | BLOCKED-BY-POLICY | No pre-existing sub-subcategory was saved. |

### Journeys — 29 rows

| id | verdict | evidence / reason |
|---|---|---|
| JN-01 | UNVERIFIED | Journeys panel/loading skeleton was not driven. |
| JN-02 | UNVERIFIED | List failure/stale rows and Retry were not driven. |
| JN-03 | UNVERIFIED | Empty-journeys state was not available/driven. |
| JN-04 | UNVERIFIED | Populated journey rows were not inspected. |
| JN-05 | UNVERIFIED | Steps manager was not opened. |
| JN-06 | UNVERIFIED | Step loading skeleton was not captured. |
| JN-07 | UNVERIFIED | Steps request failure and Retry were not driven. |
| JN-08 | UNVERIFIED | Offline steps retry was not driven. |
| JN-09 | UNVERIFIED | Zero-step journey was not available/driven. |
| JN-10 | UNVERIFIED | Grouped populated steps were not inspected. |
| JN-11 | UNVERIFIED | Add step editor was not opened. |
| JN-12 | UNVERIFIED | Blank Title validation was not exercised. |
| JN-13 | UNVERIFIED | Description draft was not exercised. |
| JN-14 | UNVERIFIED | Resource picker open/close and request scoping were not exercised. |
| JN-15 | UNVERIFIED | Resource-picker title search was not exercised. |
| JN-16 | UNVERIFIED | Resource selection was not exercised. |
| JN-17 | UNVERIFIED | Clear resource was not exercised. |
| JN-18 | UNVERIFIED | Picker no-results/error/offline/retry states were not exercised. |
| JN-19 | UNVERIFIED | Optional flag was not exercised. |
| JN-20 | UNVERIFIED | A new `[QA-audit-1026]` journey-step save was not performed; no real step was added. |
| JN-21 | UNVERIFIED | Add/Edit Cancel was not exercised. |
| JN-22 | BLOCKED-BY-POLICY | No real journey was reordered upward; disabled-first-step inspection was not performed. |
| JN-23 | BLOCKED-BY-POLICY | No real journey was reordered downward; disabled-last-step inspection was not performed. |
| JN-24 | UNVERIFIED | Linked resource new-tab behavior was not exercised. |
| JN-25 | BLOCKED-BY-POLICY for real-resource removal; UNVERIFIED open/cancel | No real grouped resource was removed; dialogs were not inspected. |
| JN-26 | BLOCKED-BY-POLICY for pre-existing steps; UNVERIFIED QA-step edit | No real step was edited and no QA step was available to edit. |
| JN-27 | BLOCKED-BY-POLICY for pre-existing steps; UNVERIFIED open/cancel/QA cleanup | No real step was deleted and no QA-step deletion was needed/performed. |
| JN-28 | UNVERIFIED | Non-production mutation failure fixture was not available. |
| JN-29 | UNVERIFIED | Keyboard, 44px target, focus-return, long-content, and reduced-motion sweeps were not performed. |

## Cross-cutting UNVERIFIED / BLOCKED

- **820×1180 and 390×844 touch emulation:** UNVERIFIED for every row above unless explicitly stated otherwise; those viewports were not driven before the browser was closed.
- **Reduced motion:** UNVERIFIED across the slice; no reduced-motion pass was executed.
- **Real coarse pointer:** BLOCKED — no physical coarse-pointer device was exercised. Forced/emulated touch must not be promoted to a real-touch PASS.
- **Real screen-reader speech:** BLOCKED — no screen reader was exercised; accessibility-tree snapshots are not speech proof.
- **Loading, server-5xx, and partial-failure states:** UNVERIFIED where listed above; no mocks, route rewrites, or production fault injection were used.
