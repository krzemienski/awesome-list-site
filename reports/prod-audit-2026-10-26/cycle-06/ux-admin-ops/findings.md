# Cycle 6 — ux-admin-ops findings

**Verdict: ISSUES — 5 new defects (3 MEDIUM, 2 LOW). All 132 assigned rows are accounted for below.**

- Target: `https://awesome.video`
- Revision at start and end: `520d6778369bc7ce495204cfcacc7e0533f941cc`
- Evidence root: `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ops/run-20261027T053415Z/`
- Driven as the owner in agent-browser session `c6-admin-ops` at 1440×900, 820×1180 and 390×844; taller viewports and real `scrollintoview` were used for below-fold controls. Accessibility snapshots, screenshots, console/page-error output and network state were inspected. No application console/page errors were printed on the inspected panel loads.
- Analytics was declined and `umami.disabled=1` was set. The owner was never signed out.
- **Real touch is BLOCKED:** `set device` did not produce a coarse pointer (`pointer:coarse=false`, `maxTouchPoints=0`) and no physical touch device was used. Layout, target sizes and programmatic scrolling are not being called real-touch proof.
- **Live 5xx toast is BLOCKED:** no fault injection or mocks were used. Every online export returned 200, so actual 5xx wording was not observed.

## New defects

| id | severity | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| AO-22 | LOW | `/admin#export` | 1440, also repeated at 820/390 | Offline README/Markdown failure toast says only **Export Failed**; JSON, CSV and OPML name their formats. Expected every export failure to identify Markdown. | `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ops/run-20261027T053415Z/export-markdown-offline-toast-1440.png` | `client/src/components/admin/ExportTab.tsx:217-223` (`title: "Export Failed"`) |
| AO-23 | MEDIUM | `/admin#export` history | 1440 | On an uncached page while offline, Export history renders **No exports recorded yet. Downloads above appear here.** with no error or Retry, despite 157 known exports. Reconnect restores `Exports 41–60 of 157`. Expected an explicit failure/Retry, never a false zero-export state. | `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ops/run-20261027T053415Z/export-history-offline-empty-later-1440.png` | `client/src/components/admin/ExportTab.tsx:149-165,668-681` |
| AO-24 | LOW | `/admin#database` Clear & Re-seed | 1440, repeated at 820/390 | Lowercase `reseed` enables **Clear & Re-seed** (`is enabled=true`); incorrect text disables it and trimmed uppercase enables it. Inventory requires only exact trimmed uppercase `RESEED` to enable the destructive action. | `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ops/run-20261027T053415Z/database-reseed-lowercase-enabled-1440.png` | `client/src/components/admin/DatabaseTab.tsx:92` (`.trim().toUpperCase()`) |
| AO-25 | MEDIUM | `/admin/users` | 1440 | Offline search for `offline-c6-user-1026` leaves all 133 previous rows visible under the new query with no stale label, error or Retry. After reconnect the request completes and correctly says no users match. Expected old results to be labelled and failure to be distinguishable from empty results. | `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ops/run-20261027T053415Z/users-offline-search-1440.png` | `client/src/components/admin/UsersTab.tsx:105-109,273` |
| AO-26 | MEDIUM | `/admin/linkhealth` Trends | 390 with `prefers-reduced-motion: reduce` | Recharts still animates: dots were 0 at expansion and 300 ms, then 24 after another 800 ms; line dasharray changed from partial segments to `186px 0px`. Expected reduced motion to suppress chart animation. | `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ops/run-20261027T053415Z/linkhealth-chart-below-fold-390.png`; measured DOM sequence is cited in the run transcript | `client/src/components/admin/LinkHealthTrendChart.tsx:63-97` (no reduced-motion/`isAnimationActive` handling) |

## Earlier-cycle re-checks

| Earlier item | Result | Fresh evidence / remaining gap |
|---|---|---|
| AO-01 export failure toast | **PARTIAL** | Offline failure copy was exercised for all four formats at all widths; Markdown exposed AO-22. Live 5xx remains **BLOCKED** because no safe natural failure occurred. |
| AO-02 journey resource-picker focus | **FIXED** | Clear and keyboard option selection both left focus on `step-resource-toggle`, not the dialog container. Editor was cancelled without saving. `journey-step-editor-820.png`. |
| AO-03 journey remove target | **FIXED** | Remove-resource buttons measured **44×44** at both 820 and 390. `journey-step-editor-820.png`, `journey-steps-390.png`. |
| AO-04 Link Health last-check time | **FIXED** | Summary says `Last check: Aug 4, 2026, 08:18 PM`, matching the completed scan and Recent failures. `linkhealth-more-chart-1440.png`. |
| AO-05 curated database table count | **FIXED** | Panel now reads **Key tables — 6 key tables of 41**. `database-1440-initial.png`. |
| AO-06 empty-validation guidance | **FIXED** | Empty state directs the operator to open **Validation controls**, not the wrong section. `export-full-1440.png`. |
| AO-07 backup confirmation | **FIXED** | Create backup first opens `Create a full database backup?`; Cancel closed it with no POST. `export-backup-confirm-1440.png`. |
| AO-08/AO-12/AO-21 overflow cue | **FIXED** | Users hint is above the table and a visible right fade exists at 820/390; horizontal scrolling reaches Edit. `users-820-initial.png`, `users-390-initial.png`, `users-scrolled-390.png`. |
| AO-09 chart completion timestamps | **FIXED** | Summary, chart and scan data use the completed-check chronology; no start/finish mismatch was seen. `linkhealth-more-chart-1440.png`. |
| AO-10 summary totals/formatting | **FIXED** | Summary reconciles 3,822 current residuals to 3,823 scanned and explains the catalog delta; numbers are grouped. `linkhealth-more-chart-1440.png`. |
| AO-11 unnamed Changes scroller | **FIXED for audit; BLOCKED for validation lists** | Audit dialog exposes focused `region "Changes, scrollable"`. `audit-detail-dialog-1440.png`. No stored validation result exists to inspect the export lists. |
| AO-13 raw tooltip floats | **FIXED** | Real hover shows `Healthy : 98.6%`, `Broken : 0.4%`, `Redirects : 0.0%`, `Timeouts : 0.0%`. `linkhealth-chart-tooltip-1440.png`, `linkhealth-chart-tooltip-390.png`. |
| AO-14/AO-16 chart labels/legend/clipping | **FIXED** | All six ticks fit inside the SVG, the legend is above the plot, and 390 below-fold rendering has no label/legend collision. `linkhealth-more-chart-1440.png`, `linkhealth-chart-tooltip-820.png`, `linkhealth-chart-below-fold-390.png`. |
| AO-15 unnamed tab strip | **FIXED** | Accessibility snapshots expose `tablist "Admin sections"` at all widths. |
| AO-17 inconsistent export chips | **FIXED** | Fresh JSON, CSV, Markdown and OPML rows all render **COMPLETED**. `audit-1440-initial.png`. |
| AO-18 additional status mappings | **PARTIAL** | Create/update/delete, rejected and auth login/register chips were verified truthful. No `ai_enriched_degraded`, unknown or recommendation-invalid row was available, so those fixtures remain **BLOCKED**. `audit-auth-status-chips-1440.png`. |
| AO-19 Users clear target | **FIXED** | Clear user search measured **44×44** at 820 and 390 and returned focus to the input. `users-clear-search-820.png`, `users-clear-search-390.png`. |
| AO-20 auth.* neutral chips | **PARTIAL** | Live legacy `auth login` and `auth register` rows show **COMPLETED**, not RECORDED. No failed-login row was present in the reached page, so that specific variant remains **BLOCKED**. `audit-auth-status-chips-1440.png`. |

## Assigned-row verdicts — Export and backups (27/27)

| Row | Verdict | Evidence path (relative to evidence root) or exact gap |
|---|---|---|
| EX-01 | PASS | `export-validation-controls-1440.png`; disclosure expanded/collapsed, and controls were driven at all widths. |
| EX-02 | PASS | `export-validation-confirm-1440.png`, `export-validation-confirm-820.png`, `export-validation-confirm-390.png`; opening produced no job request. |
| EX-03 | PASS | Cancel closed at all widths; network log had no `POST /api/admin/validate`. |
| EX-04 | BLOCKED-BY-POLICY | Live awesome-lint/background write was not confirmed. |
| EX-05 | PARTIAL | Idle Run Link Check opened the same confirmation at all widths (`export-linkcheck-confirm-1440.png`). No active job existed for duplicate-start inspection. |
| EX-06 | PASS | Cancel closed with no `POST /api/admin/check-links`. |
| EX-07 | BLOCKED-BY-POLICY | Live full-catalog background job was not started. |
| EX-08 | PARTIAL | Completed scan #8 and its completed counts were seen (`export-validation-controls-1440.png`). Pending/processing/failed/cancelled states were unavailable and could not be created safely. |
| EX-09 | BLOCKED | No status-failure/Retry state appeared; offline tab switching did not produce one, and no mocks were allowed. |
| EX-10 | PASS | Open Link Health navigated to `/admin/linkhealth`; only GETs occurred. |
| EX-11 | BLOCKED-BY-POLICY | No active job was cancelled; no active job was available anyway. |
| EX-12 | PASS | `awesome-list-snapshot.json`, `awesome-list-snapshot-820.json`, `awesome-list-snapshot-390.json`; each GET returned 200 and focus remained on Download. |
| EX-13 | PASS | `awesome-list-resources.csv`, `awesome-list-resources-820.csv`, `awesome-list-resources-390.csv`; expected CSV filename/toast and no duplicate request. |
| EX-14 | PASS | `awesome-list-820.md`, `awesome-list-390.md`; desktop download is retained as `3e3823d1-f1e4-4dae-b643-b8da18b71b72`. All POSTs returned 200 and history refreshed. |
| EX-15 | PASS | `awesome-list.opml`, `awesome-list-820.opml`, `awesome-list-390.opml`; XML downloads and expected OPML toast. |
| EX-16 | **FAIL (AO-22); live-5xx BLOCKED** | `export-markdown-offline-toast-1440.png`, `export-json-offline-toast-1440.png`. No file downloaded offline; JSON/CSV/OPML copy was correct, Markdown was not. No natural 5xx occurred. |
| EX-17 | PASS | `export-full-1440.png`, `export-history-validation-backup-820.png`, `export-history-validation-backup-390.png`; expanded state was correct. |
| EX-18 | PASS | At the first page Previous had `aria-disabled=true`, retained focus and issued no request; Previous also returned 21–40 → 1–20. |
| EX-19 | PASS | Next loaded 1–20 → 21–40 and later windows, exports only, while retaining focus. |
| EX-20 | **FAIL (AO-23)** | `export-history-offline-empty-later-1440.png`. Populated history and reconnect recovery passed; explicit loading was not captured, true zero-total and beyond-last-page states were unavailable. |
| EX-21 | PASS | `export-full-1440.png`: **No validation results yet** plus correct Run Validation guidance, also captured at 820/390. |
| EX-22 | BLOCKED | No stored valid or invalid awesome-lint result exists; running validation is forbidden. |
| EX-23 | BLOCKED | No validation errors exist to expand. |
| EX-24 | BLOCKED | No validation warnings exist to expand. |
| EX-25 | BLOCKED-BY-POLICY | Confirmation was opened and cancelled (`export-backup-confirm-1440.png`); actual backup creation was not executed. |
| EX-26 | PARTIAL | `export-full-1440.png` proves configured-storage empty state **No production backups yet.** Loading/error/unconfigured/populated states were unavailable. |
| EX-27 | BLOCKED | No latest backup/manifest exists, so Show contents cannot be exercised. |

## Assigned-row verdicts — Database (14/14)

| Row | Verdict | Evidence path or exact gap |
|---|---|---|
| DB-01 | PARTIAL | `database-1440-initial.png`, `database-820-initial.png`, `database-390-initial.png`; populated values match stats. Loading was not captured. |
| DB-02 | PASS | `database-seeding-1440.png`; details revealed/hid Seed and Clear & Re-seed with correct state. |
| DB-03 | PASS | `database-seed-confirm-1440.png`; additive-import confirmation opened at all widths without POST. |
| DB-04 | PASS | Cancel returned focus to Seed Database and issued no seed request. |
| DB-05 | BLOCKED-BY-POLICY | Additive production import was not confirmed. |
| DB-06 | PASS | `database-reseed-confirm-1440.png`; destructive dialog opened with reset input. |
| DB-07 | **FAIL (AO-24)** | `database-reseed-lowercase-enabled-1440.png`; lowercase enables the action contrary to the exact-uppercase requirement. |
| DB-08 | PASS | Cancel closed, reset the typed value on reopen and sent no `POST /api/admin/seed-database`. |
| DB-09 | BLOCKED-BY-POLICY | Destructive replacement was not confirmed. |
| DB-10 | BLOCKED | Requires non-production success results; production seed was not run. |
| DB-11 | BLOCKED | Requires non-production partial-failure results; no mocks were used. |
| DB-12 | BLOCKED | Requires non-production request-failure results; no mocks were used. |
| DB-13 | PASS | `database-1440-initial.png`: six curated PostgreSQL tables show row counts, sizes and **Newest row**, not delete-aware “last write”. |
| DB-14 | BLOCKED | Missing/empty/failed stats could not be produced safely; no fault injection or mocks. |

## Assigned-row verdicts — Users (25/25)

| Row | Verdict | Evidence path or exact gap |
|---|---|---|
| US-01 | UNVERIFIED | Skeleton was too transient to capture during real navigation; not inferred from code. |
| US-02 | **FAIL (AO-25)** | `users-offline-search-1440.png`; live server failure/Retry remains unavailable, and offline stale behavior is wrong. |
| US-03 | PARTIAL | `users-filtered-empty-1440.png` proves query-specific empty results. An actually empty user catalog is unavailable. |
| US-04 | PASS | `users-1440-initial.png`: 133 total, fallback identity, masked email, role and joined date; no password hashes. |
| US-05 | PASS | `users-row-actions-1440.png`; Hide/Row actions toggles `aria-expanded` and reveals Reveal/Delete without mutation. |
| US-06 | PASS | Debounced `q=gmail` reset to page 1, returned 37 and kept `input-user-search` focused. |
| US-07 | PASS | `users-clear-search-820.png`, `users-clear-search-390.png`; 44×44 target and focus restoration. |
| US-08 | PARTIAL | Users CSV downloaded at 1440 (134 lines including header) and produced no transcript of unmasked contents. Touch-width downloads, failure behavior and a malicious-formula fixture were not available/executed. |
| US-09 | PASS | Disabled control has title `Invitations are not supported by the admin API.` |
| US-10 | PASS | Name alternated asc/desc with matching `aria-sort` and API queries at all widths. |
| US-11 | PASS | Email alternated asc/desc with matching `aria-sort` and API queries at all widths. |
| US-12 | PASS | Role alternated asc/desc with matching `aria-sort` and API queries at all widths. |
| US-13 | PASS | Joined alternated desc/asc with matching `aria-sort` and API queries at all widths. |
| US-14 | PARTIAL | Reveal/Mask exposed exactly one row and remasked at 1440 and by keyboard at 390. 820 was not re-driven. No raw email was captured in evidence. |
| US-15 | PASS | Other-user Edit opened a selector with current role checked; current admin had no Edit. |
| US-16 | PARTIAL | Escape at 1440 cancelled and returned focus to Edit. Touch widths used selection/Cancel paths rather than another Escape close. |
| US-17 | PARTIAL | Current-role selection at 1440 did not open confirmation; changed role opened it at all widths (`users-role-change-confirm-1440.png`). Current-role non-confirmation was not repeated at 820/390. |
| US-18 | PASS | Cancel closed without PUT and returned focus to Edit at all widths. |
| US-19 | BLOCKED-BY-POLICY | Real role privilege change was not confirmed. |
| US-20 | PASS | Auth identity was on the current page and had neither self-Edit nor self-Delete. |
| US-21 | PASS | `users-delete-confirm-1440.png`; Delete opened masked destructive confirmation at all widths without DELETE. |
| US-22 | PASS | Cancel closed without DELETE and returned focus to the row action. |
| US-23 | BLOCKED-BY-POLICY | Real account/Clerk deletion was not confirmed. |
| US-24 | PARTIAL | Next/Previous and first-page focus handoff passed at all widths; last-page handoff to Previous passed at 1440 (`users-last-page-1440.png`). Last edge was not repeated at 820/390. |
| US-25 | PARTIAL | `users-820-initial.png`, `users-390-initial.png`, `users-scrolled-390.png`: fade and overflow are discoverable; Edit is reachable and 44×44. **Real swipe/touch is BLOCKED**; scrolling was driven programmatically. |

## Assigned-row verdicts — Link Health and member reports (32/32)

| Row | Verdict | Evidence path or exact gap |
|---|---|---|
| LH-01 | PARTIAL | `linkhealth-1440-initial.png`, `linkhealth-820-initial.png`, `linkhealth-390-initial.png` prove populated load at all widths. Initial loading was not captured. |
| LH-02 | BLOCKED | No status/history/problem-link/coverage failure banner appeared. Offline tab switching did not create a safe failure; no mocks were used. |
| LH-03 | BLOCKED | Completed scan #8 exists, so the no-scan state is unavailable. |
| LH-04 | PASS | `linkhealth-1440-initial.png`: 3,809 healthy, 0 redirect, 11 broken, 0 timeout, 2 suspect, 99.7%, with scan-time/current-residual reconciliation. |
| LH-05 | PASS | Available Run full check and Run Check Now opened the same full-catalog confirmation (`linkhealth-run-confirm-1440.png`). No-scan-only entry is covered by LH-03. |
| LH-06 | PASS | Cancel closed at all widths with no `POST /api/admin/link-health/run`. |
| LH-07 | BLOCKED-BY-POLICY | Live production scan was not started. |
| LH-08 | BLOCKED | No active job exists and starting one is forbidden. |
| LH-09 | BLOCKED | No active scan/Cancel scan control exists. |
| LH-10 | BLOCKED | No active scan means Keep scanning cannot be exercised. |
| LH-11 | BLOCKED-BY-POLICY | Live scan cancellation was not executed; no active job existed. |
| LH-12 | BLOCKED | No failed/cancelled scan or Run scan again state was available. |
| LH-13 | BLOCKED | A completed result exists, so no-result dashes are unavailable. |
| LH-14 | BLOCKED | No active+previous or degraded fixture exists; no mocks were used. |
| LH-15 | PASS | Open filter returned `No open reports.` and `0 open` at all widths. |
| LH-16 | PASS | Resolved returned `No resolved reports.` and no action buttons at all widths. |
| LH-17 | PASS | Dismissed returned `No dismissed reports.` and no action buttons at all widths. |
| LH-18 | BLOCKED | Error/Retry and explicit loading were not observed; no safe failure was available. |
| LH-19 | PASS | All three successful empty messages were verified at all widths. |
| LH-20 | BLOCKED | There are no populated member reports to open. |
| LH-21 | BLOCKED-BY-POLICY | No real report was resolved; no open row exists. |
| LH-22 | BLOCKED-BY-POLICY | No real report was dismissed; no open row exists. |
| LH-23 | PARTIAL | `linkhealth-1440-initial.png` proves populated Recent failures. No-run, in-progress and no-failure empty variants are unavailable. |
| LH-24 | PARTIAL | Internal `/resource/189956` and the external flagged URL were opened at 1440 and the external tab closed. Touch-width links were not re-activated. |
| LH-25 | PARTIAL | Direct More/Less collapsed and expanded at 1440; More was also activated at 820/390. Direct Less was not repeated at touch widths. |
| LH-26 | PARTIAL | Summary Run Check Now opened confirmation at 1440. Active-job disabling is blocked; touch widths used Run full check instead. |
| LH-27 | PARTIAL | `linkhealth-more-chart-1440.png`, `linkhealth-chart-tooltip-820.png`, `linkhealth-chart-below-fold-390.png`, `linkhealth-chart-tooltip-390.png`: populated legend/ticks/tooltips and actual 390 below-fold display passed. Explicit lazy-loading text was not captured. |
| LH-28 | PASS | All Issues=13, Broken=11, Timeouts/Redirects correct empty copy, Suspect=2; long selected label is unclipped (`linkhealth-suspect-filter-1440.png`). No dns_failure row exists for that subtype check. |
| LH-29 | PARTIAL | Timeout/redirect filtered-empty copy passed. Loading/unavailable/no-scan/running states are unavailable. |
| LH-30 | PASS | `linkhealth-problem-table-horizontal-820.png`, `linkhealth-problem-table-right-edge-390.png`; both axes were scrolled and Flagged became reachable at 390 (`scrollLeft=749`, x=174.7–301.3). |
| LH-31 | BLOCKED | Non-production mutation failure is required; production mutations and mocks were not used. |
| LH-32 | **FAIL (AO-26); real touch and full keyboard walk remain open** | `linkhealth-chart-below-fold-390.png` plus measured reduced-motion sequence. Horizontal/vertical sweeps passed at 820/390; **real touch is BLOCKED**, and reduced-motion animation is defective. |

## Assigned-row verdicts — Digests (7/7)

| Row | Verdict | Evidence path or exact gap |
|---|---|---|
| DG-01 | UNVERIFIED | Initial skeleton was not captured. Populated health is proven under DG-05. |
| DG-02 | BLOCKED | Initial request failure/Retry could not be triggered safely. |
| DG-03 | UNVERIFIED | Offline Refresh did not produce a failed-poll stale snapshot; it retained the last good data and timestamp. No failed poll or mock was available. `digests-offline-stale-1440.png`. |
| DG-04 | PASS | Refresh reissued health at all widths and kept focus; `aria-disabled=false` after completion and updated time was shown. `digests-1440-initial.png`, `digests-820-initial.png`, `digests-390-initial.png`. |
| DG-05 | PASS | `digests-1440-initial.png`: Transport Available, Queue total 0, in_app sent 1, oldest None; no recipient/message/secret data. |
| DG-06 | BLOCKED | Queue is not empty: in_app sent 1 exists, so `No digest jobs recorded.` cannot be inspected. |
| DG-07 | PARTIAL | `digests-1440-initial.png` proves **No recent failure codes recorded.** Populated aggregate failure codes are unavailable. |

## Assigned-row verdicts — Audit log and Contact submissions (27/27)

| Row | Verdict | Evidence path or exact gap |
|---|---|---|
| AU-01 | UNVERIFIED | Skeleton was not captured; populated log is proven under AU-04. |
| AU-02 | UNVERIFIED | Offline Refresh retained old rows and did not produce an error/Retry. `audit-offline-error-1440.png`. No live failure or Retry was available. |
| AU-03 | PARTIAL | `audit-empty-filter-1440.png`: successful no-match state at 1440. Touch widths drove populated filtering, not another no-match response. |
| AU-04 | PASS | `audit-1440-initial.png`: ID, masked actor, action, target, status and time; range reflects the full 16,874-entry log. |
| AU-05 | PASS | `audit-tools-1440.png`; Tools/Hide tools controls `aria-expanded` and reveals filters plus Contact submissions. |
| AU-06 | PASS | Resource 190345 returned `1–15 of 15 entries` at all widths; blank was valid. |
| AU-07 | PARTIAL | At 1440, 0, nonnumeric, negative and >int4 all produced the inline range error, disabled Search and made no API call. Only 0 was repeated at 820/390. |
| AU-08 | PARTIAL | 25/50/100/200 produced ranges 1–25/50/100/200 at 1440. Touch-width limit changes were not repeated. |
| AU-09 | PASS | Enter applied 190345; Search applied 2147483647; both hit the expected GET. Touch used Enter successfully. |
| AU-10 | PASS | Clear reset filter/offset and focused the empty Resource ID input at all widths. |
| AU-11 | PARTIAL | `audit-tools-1440.png` plus live refresh updated the timestamp, retained focus and `aria-busy=false` after completion. Touch Refresh was not repeated. |
| AU-12 | PARTIAL | Previous returned 2,001–2,200 → 1,801–2,000 at 1440 and stayed usable. Touch Previous was not repeated. |
| AU-13 | PARTIAL | Next advanced 0→200→…→2,000 at 1440 and scrolled the focused pager into view. Touch Next was not repeated. |
| AU-14 | PARTIAL | `audit-detail-dialog-1440.png`: Enter and Space opened full details without page scroll at 1440. Touch-width audit-row activation was not repeated. |
| AU-15 | PARTIAL | ID-cell button opened the same #27544 entry with unique accessible name at 1440. Not repeated at touch widths. |
| AU-16 | PARTIAL | X and Escape closed and returned focus to `View details for audit entry 27544` at 1440. Touch-width dialog close was not repeated. |
| AU-17 | PARTIAL | `audit-200-status-chips-1440.png`, `audit-auth-status-chips-1440.png`: create/update/delete, rejected, exports and auth login/register are truthful. Failed login, degraded, recommendation-invalid and unknown fixtures were unavailable. |
| AU-18 | UNVERIFIED | Contact skeleton was not captured. Populated inbox is proven under AU-22. |
| AU-19 | BLOCKED | Endpoint returned data, not 404; no fault injection was used. |
| AU-20 | BLOCKED | Non-404 inbox failure/Retry was not available. |
| AU-21 | BLOCKED | Inbox has one submission, so successful empty state is unavailable. |
| AU-22 | PASS | `audit-tools-1440.png`: newest QA 698 row, masked reply-to, subject, date, total 1 and disabled edge pagers. |
| AU-23 | PARTIAL | With total 1, Previous/Next are correctly disabled at both edges. >20 paging is unavailable. |
| AU-24 | PARTIAL | Enter and Space opened the masked private detail at 1440; Enter also passed at 820/390. Plain click was not separately exercised. `contact-detail-masked-1440.png`. |
| AU-25 | PASS | Reveal changed only the open submission to a mailto link; Mask restored masked text at all widths. Other rows stayed masked. |
| AU-26 | PARTIAL | At 1440 the activated link used `mailto:` and `subject=Re%3A%20QA%20698%20analytics%20check`; no mutation occurred. Touch-width mailto activation was not repeated. |
| AU-27 | PASS | X/Escape closed without mutation, reopening was masked again, and focus returned to the row; Escape also passed at 820/390. |

## QA cleanup and side effects

- No `[QA-audit-1026]` content rows were created by this lane, so there were no run-owned content IDs to delete or confirm absent.
- Thirteen expected export actions generated append-only audit events: JSON/CSV/Markdown/OPML at each of 1440/820/390 (12), plus Users CSV (1). The four most recent catalog-export rows seen were TX#27520–27523 and Users export was TX#27531; not every older export ID was re-read. These audit records are not deletable through the UI.
- Every validation, link-check, backup, seed/reseed, role-change and user-delete confirmation was cancelled. No paid/writing AI job, scan, validation, backup, seed, role change, account deletion, report mutation, bulk approval or sign-out was executed. Journey edits were local only and cancelled without saving.
- The temporary Users CSV was removed from `/tmp`; catalog export artifacts remain only in the run evidence directory. No cookie value was printed or placed in an MCP argument.

## Final finding lines

- **AO-22 LOW:** Markdown offline failure toast omits the export format.
- **AO-23 MEDIUM:** Offline uncached Export history is presented as zero exports with no error/Retry.
- **AO-24 LOW:** Lowercase `reseed` enables the destructive confirmation despite the exact-uppercase requirement.
- **AO-25 MEDIUM:** Offline Users search presents unlabelled stale rows under a new query with no error/Retry.
- **AO-26 MEDIUM:** Link Health chart animates despite `prefers-reduced-motion: reduce`.
