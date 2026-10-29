# ux-admin-ai — cycle 06 — ISSUES

**Revision:** `520d6778369bc7ce495204cfcacc7e0533f941cc` at start and end.

I used the owner session in agent-browser at 1440×900, 820×1180 and 390×844. I did not start any research, enrichment, import or export job. The active/completed researcher runs #70, #71 and #73 observed below were lead-owned. GitHub calls were dry-run previews only. I created no QA rows and made no production writes. Analytics was declined and `umami.disabled=1`.

## New findings

| id | severity | URL | width | saw | expected | evidence | likely source |
|---|---|---|---|---|---|---|---|
| AI-30 | Low | `/admin/researcher?jobId=64` and `/admin/researcher?jobId=71` | 1440 | Both `Done — go to job history` and `Review later — go to job history` returned to the launch form and focused the compact jobs region, but `All pending discoveries & full job history` stayed `expanded=false`. #64 was no longer even in the compact latest-five rows. | Full job history opens with the selected run highlighted and the jobs region focused. | `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-done-history.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-done-history.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-review-later-history.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-review-later-history.a11y.txt` | `client/src/components/admin/ResearcherTab.tsx:336-342` — `showHistory` sets `historyJobId` and scrolls/focuses, but never expands the history disclosure. |

## Earlier-cycle re-checks

- **AI-01 FIXED:** Relaunch focuses `#budget`; `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-relaunch-focus.json`.
- **AI-02 / AI-29 FIXED:** $0.30 shows the accurate “less than about $0.43” warning; $0.4341 removes it. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-budget-030.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-budget-04341.a11y.txt`.
- **AI-03 FIXED:** launch guidance now explicitly says spend can exceed the cap by one turn; run #68 displays $0.3062 against $0.30 without hiding the overshoot. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-budget-030.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-run-68.png`.
- **AI-04 FIXED:** Preview import shows dry-run counts before Pull. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-1440-preview-result.png`.
- **AI-05 FIXED:** draft target is explicitly distinguished from the configured repository. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-1440-valid-draft-repo.a11y.txt`.
- **AI-06 FIXED:** invalid target has an associated error and disables Pull/Sync. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-1440-invalid-repo.png`.
- **AI-07 FIXED:** fractional batch 2.5 is invalid and disables both launch controls. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-batch-fractional.json`.
- **AI-08 FIXED:** malformed enrichment Base URL is rejected inline before confirmation. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-1440-invalid-url.png`.
- **AI-09 FIXED:** Last enriched is batch #34 with 10 resources, not an empty older batch. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-1440-initial.png`.
- **AI-10 FIXED:** enrichment history is in a named scrollable region at 820. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-820-controls-open.a11y.txt`.
- **AI-11 FIXED:** GitHub status/date content wraps within the 390 card. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-390-more.png`.
- **AI-12 FIXED:** research note targets pass the 44px sweep at 820/390. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-820-targets.json`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-390-targets.json`.
- **AI-13 FIXED:** compact `Show more` and `Load more … in Job History` are distinct. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-full-job-history.a11y.txt`.
- **AI-14 FIXED:** Follow run #70 navigates to `/admin/researcher?jobId=70`. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-run-70-active.png`.
- **AI-15 FIXED:** job costs are neutral rather than red error text. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-initial.png`.
- **AI-16 STILL-OPEN / owner decision:** the catalog/run text still contains `RTMPRTSPHTTP Protocol Servers`. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-run-64.a11y.txt`.
- **AI-17 FIXED:** GitHub scroll regions are named, including `Recent sync jobs, scrollable`. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-1440-more.a11y.txt`.
- **AI-18 BLOCKED-BY-POLICY:** no live Pull was started.
- **AI-19 FIXED:** launch validation clears when the field is corrected. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-error-cleared.a11y.txt`.
- **AI-20 FIXED:** zero-save run says `This run saved no discoveries.` `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-run-68.a11y.txt`.
- **AI-21 FIXED:** enrichment controls are named `View logs/details for job #N`. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-1440-initial.a11y.txt`.
- **AI-22 FIXED:** enrichment plain-HTTP confirmation requires acknowledgement and names the endpoint. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-1440-confirm-http-open.png`.
- **AI-23 FIXED:** preview now separates 1 import warning and 10 README formatting warnings instead of 1,254 URL false positives. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-1440-preview-result.a11y.txt`.
- **AI-24 FIXED:** missing repo reports `Repository not found (or not public)`. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-1440-preview-missing-repo.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-dryrun-missing-repo.json`.
- **AI-25 FIXED:** failed preview leaves `Start Import` disabled. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-1440-pull-dialog-missing-repo.a11y.txt`.
- **AI-26 FIXED:** history uses type-qualified Job IDs and dates. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-1440-more.a11y.txt`.
- **AI-27 FIXED:** static Last Export content is not exposed as an alert. `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-1440-more.a11y.txt`.
- **AI-28:** superseded by AI-29.

## Evidence key

- **EN-A:** desktop stats/table and controls — `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-1440-initial.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-1440-initial.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-1440-initial.console.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-1440-initial.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-1440-controls-open.png`.
- **EN-B:** 820/390 stats/table, targets and safe confirmation — `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-820-initial.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-820-initial.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-820-initial.console.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-820-initial.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-390-initial.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-390-initial.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-390-initial.console.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-390-initial.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-820-confirm.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-390-confirm.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-820-controls-targets.json`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/en-390-controls-targets.json`.
- **RS-A:** desktop launch/config/confirmation — `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-initial.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-initial.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-initial.console.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-initial.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-http-valid-preview.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-launch-confirm-open.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-launch-cancel.network.txt`.
- **RS-B:** 820/390 launch/config/targets — `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-initial.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-initial.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-initial.console.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-initial.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-initial.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-initial.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-initial.console.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-initial.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-targets.json`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-targets.json`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-http-confirmed.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-http-confirmed.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-launch-confirm.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-launch-confirm.a11y.txt`.
- **RS-C:** live/completed runs and details — `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-run-70-active.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-run-70-active.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-run-70-active.console.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-run-70-active.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-run-64-details-open.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-agent-graph.a11y.txt`.
- **RS-D:** 820/390 run/detail states — `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-run-71.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-run-71.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-run-71.console.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-run-71.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-run-71.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-run-71.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-run-71.console.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-run-71.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-agent-graph.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-agent-graph.a11y.txt`.
- **RS-E:** populated pending review and safe bulk-cancel at all widths — `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-pending-populated.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-pending-populated.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-pending-populated.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-pending-populated.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-pending-populated.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-pending-populated.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-approve-all-confirm-open.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-approve-all-confirm.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-approve-all-confirm.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-1440-approve-all-cancel.network.txt`.
- **GH-A:** dry-run API/UI reconciliation — `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-1440-preview-result.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-1440-preview-result.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-1440-preview-result.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-390-preview-result.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-390-preview-result.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-dryrun-strict-false.json`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-dryrun-strict-true.json`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/gh-dryrun-missing-repo.json`. Both strict variants return `dryRun:true`, 36 add / 799 update / 1,448 skip / 0 errors, matching the UI; nothing was written.
- **RW-A:** populated notes at all widths — `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-1440-initial.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-1440-initial.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-1440-initial.console.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-1440-initial.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-820-initial.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-820-initial.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-820-initial.console.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-820-initial.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-390-initial.png`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-390-initial.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-390-initial.console.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-390-initial.network.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-1440-note-71.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-820-note.a11y.txt`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rw-390-note.a11y.txt`.
- **INPUT-A:** keyboard/reduced-motion/touch environment — `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-keyboard-01.json` through `rs-390-keyboard-12.json` (logical order and solid focus ring at every stop), `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-reduced-motion.json` (`reduce=true`; animation/transition durations `1e-05s`), `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-820-environment.json`, `reports/prod-audit-2026-10-26/cycle-06/ux-admin-ai/rs-390-environment.json` (`maxTouchPoints=0`, `pointer: coarse=false`).

## Passed with evidence

| id | verdict | evidence / what was observed |
|---|---|---|
| EN-05 | PASS | EN-A, EN-B — real populated job rows with IDs, effective statuses, timestamps and job-specific Logs at all widths. |
| EN-08 | PASS | EN-A, EN-B — Run job opens the paid confirmation only after idle job state and batch validation; no job starts. |
| EN-16 | PASS | EN-A, EN-B — Cancel closes at 1440/820/390; no `/api/enrichment/start` request. |
| RS-12 | PASS | RS-A, RS-B — Base URL edits resolve preview; custom endpoint requires token and plain HTTP exposes the insecurity control. |
| RS-14 | PASS | RS-A, RS-B — unchecked HTTP acknowledgement blocks launch; checking it enables launch at all widths; label hit areas exceed 44px. |
| RS-17 | PASS | RS-A, RS-B — current and preflight-blocked summaries show host, credential source, models/overrides without exposing a token. |
| RS-20 | PASS | RS-A, RS-B — valid form opens a confirmation naming the paid run, limits and endpoint without launching. |
| RS-21 | PASS | RS-A, RS-B — Cancel closes without `POST /api/researcher/start`. |
| RS-47 | PASS | RS-E — disclosure, Review Discoveries and Job History are keyboard reachable at all widths; badge count 9 matches the populated pending data. |
| RS-49 | PASS | RS-E — Approve All confirmation names 9, duplicate skipping and irreversibility; Cancel sends no approve-all request. |
| GH-23 | PASS | GH-A — strict false/true and missing-repo dry-runs return honest counts/errors and `dryRun:true`; counts reconcile with UI and no import ran. |
| RW-04 | PASS | RW-A — exactly four derived note cards, including active and terminal jobs, with candidate counts and freshness at all widths. |
| RW-05 | PASS | RW-A — each note opens the selected read-only job detail. |

## UNVERIFIED or BLOCKED inventory rows

No row below is being treated as a pass. Reasons name the missing state or the exact policy/environment blocker.

### Enrichment

| id | status | reason / evidence where partially exercised |
|---|---|---|
| EN-01 | UNVERIFIED | Populated stats pass (EN-A/EN-B); unavailable and no-completed-job states were not naturally available. |
| EN-02 | UNVERIFIED | Real initial response completed before a loading snapshot could be captured. |
| EN-03 | UNVERIFIED | Offline tab switching retained cached rows; no list failure/Retry state appeared, so stale/error handling remains unproven. |
| EN-04 | UNVERIFIED | Production has 33 jobs; no empty queue was available. |
| EN-06 | UNVERIFIED | Expansion works (EN-A/EN-B); collapse was not exercised. |
| EN-07 | UNVERIFIED | Show all 33 / Show fewer works at 1440; not repeated at 820/390. |
| EN-09 | UNVERIFIED | All Resources / Unenriched Only selection was exercised only at 1440. |
| EN-10 | UNVERIFIED | Valid 1 and 50 were exercised only at 1440. |
| EN-11 | UNVERIFIED | Blank, 2.5, 0, -3 and 51 all reject correctly at 1440; not repeated at 820/390. |
| EN-12 | UNVERIFIED | Advanced opens at 1440; collapse and active-job disabled editing were not available. |
| EN-13 | UNVERIFIED | Model override/default placeholder exercised only at 1440. |
| EN-14 | UNVERIFIED | URL/token help and validation exercised only at 1440. |
| EN-15 | UNVERIFIED | Password masking is confirmed; token clearing after a real launch is BLOCKED-BY-POLICY. |
| EN-17 | BLOCKED-BY-POLICY | Did not confirm a paid enrichment start. |
| EN-18 | UNVERIFIED | No zero-resource scope was available. |
| EN-19 | UNVERIFIED | Idle guard observed; active/loading/failed job-list guards were not available. |
| EN-20 | BLOCKED | Requires a non-production failed start; no fault injection or mocks were permitted. |
| EN-21 | UNVERIFIED | No active enrichment job existed to observe pending/processing progress. |
| EN-22 | UNVERIFIED | No active enrichment job existed for safe Cancel-open inspection. |
| EN-23 | UNVERIFIED | No active enrichment job existed for Keep running. |
| EN-24 | BLOCKED-BY-POLICY | Did not alter a live job. |
| EN-25 | BLOCKED | Requires a non-production cancellation failure. |
| EN-26 | UNVERIFIED | Logs work at 1440 and 390; not opened at 820. |
| EN-27 | UNVERIFIED | Detail-loading state was not captured before the real response resolved. |
| EN-28 | UNVERIFIED | Detail failure/Retry did not occur. |
| EN-29 | UNVERIFIED | Populated detail and close focus pass at 1440; not repeated at 820. |
| EN-30 | UNVERIFIED | Populated graph/events observed; loading, waiting, empty and failed event states were not available. |
| EN-31 | UNVERIFIED | Event expand/collapse works at 1440 and 390; not expanded at 820. Reduced-motion and target evidence is in INPUT-A/EN-B. |

### Researcher

| id | status | reason / evidence where partially exercised |
|---|---|---|
| RS-01 | UNVERIFIED | Auto-generate is selected by default, but the actual empty-prompt launch payload could not be inspected without starting a job. |
| RS-02 | UNVERIFIED | Custom mode and short-brief validation pass at 1440/820; short-brief launch was not repeated at 390. |
| RS-03 | BLOCKED-BY-POLICY | Generated-brief invocation was not run because it may incur AI work; success/error remain unproven. |
| RS-04 | UNVERIFIED | Character count and short-brief validation pass at 1440/820; text editing not repeated at 390. |
| RS-05 | UNVERIFIED | Category selection was exercised only at 1440. |
| RS-06 | UNVERIFIED | Blank, 0, 1 and 1001 were exercised only at 1440. |
| RS-07 | UNVERIFIED | Budget valid/invalid/uncapped and relaunch focus were exercised only at 1440. |
| RS-08 | UNVERIFIED | Max-turn valid/invalid/blank cases were exercised only at 1440. |
| RS-09 | UNVERIFIED | Advanced opens at all widths; collapse was not exercised. |
| RS-10 | UNVERIFIED | Orchestrator override and debounce were exercised only at 1440. |
| RS-11 | UNVERIFIED | Scout override/default was exercised only at 1440. |
| RS-13 | UNVERIFIED | Masking confirmed at all widths; token clearing after a successful launch remains BLOCKED-BY-POLICY. |
| RS-15 | UNVERIFIED | Launch disabled during debounce at 1440; pending/stale timing was not repeated at 820/390. |
| RS-16 | UNVERIFIED | No config failure was triggered safely. |
| RS-18 | UNVERIFIED | Follow #70 and deep-link update pass at 1440; not repeated at 820/390. |
| RS-19 | UNVERIFIED | Brief/target/budget/turn validation passes at 1440 and short brief at 820; not repeated at 390. |
| RS-22 | BLOCKED-BY-POLICY | Did not confirm a paid launch. |
| RS-23 | UNVERIFIED | Active and preflight guards observed; loading/failed-job and stale-preview guards were not available. |
| RS-24 | BLOCKED | Requires a non-production failed launch. |
| RS-25 | UNVERIFIED | Detail-loading state was not captured before resolution. |
| RS-26 | UNVERIFIED | 99999 and Start another pass at 1440; not repeated at 820/390. |
| RS-27 | UNVERIFIED | Non-404 detail failure/Retry did not occur. |
| RS-28 | UNVERIFIED | Active run #70 was observed at 1440 and active #73 at 390; no active run view at 820. |
| RS-29 | UNVERIFIED | Cancel-open works at 1440; not repeated at 820/390. |
| RS-30 | UNVERIFIED | Keep running closes without DELETE at 1440; not repeated at 820/390. |
| RS-31 | BLOCKED-BY-POLICY | Did not confirm live cancellation. |
| RS-32 | UNVERIFIED | With `navigator.onLine=false`, polling continued returning HTTP 200, so the required stale-data warning never appeared; failure handling is not proven. |
| RS-33 | UNVERIFIED | Completed runs and reduced-motion rendering observed; focus-on-completion to Review discoveries was not measured. |
| RS-34 | UNVERIFIED | Cancelled terminal rows observed; detailed failed/cancelled reasons were not inspected at all widths. |
| RS-35 | UNVERIFIED | Relaunch focuses budget at 1440; not repeated at 820/390. |
| RS-36 | UNVERIFIED | Active-empty and ended-empty copy observed at 1440; not repeated at 820/390. |
| RS-37 | UNVERIFIED | Discovery-load failure/Retry did not occur. |
| RS-38 | UNVERIFIED | Populated items verified; external link opened safely with `noopener noreferrer` at 1440 only. |
| RS-39 | BLOCKED-BY-POLICY | Did not approve real pending discoveries. |
| RS-40 | UNVERIFIED | Reject reason draft and Cancel work at 1440 and 390; not repeated at 820. |
| RS-41 | BLOCKED-BY-POLICY | Did not confirm rejection. |
| RS-42 | FAIL | AI-30 above. |
| RS-43 | UNVERIFIED | Start another clears jobId at 1440; not repeated at 820/390. |
| RS-44 | UNVERIFIED | Run details opens at all widths; collapse was not exercised. |
| RS-45 | UNVERIFIED | Event/Agent graph tabs and event expansion work at all widths; loading/waiting/empty/error/retry states remain unobserved. |
| RS-46 | UNVERIFIED | Full-history Load more grows 20→40 at 1440; compact/other-width Load more and offline Show-more remain unproven because offline requests returned cached 200s. |
| RS-48 | UNVERIFIED | Empty and populated pending lists observed; loading/error/Retry were not available. |
| RS-50 | BLOCKED-BY-POLICY | Did not bulk-approve. |
| RS-51 | UNVERIFIED | Load more, Details and active Cancel were exercised at 1440; not repeated at 820/390. |
| RS-52 | UNVERIFIED | Populated details and close-focus work at 1440; loading/error states and other widths remain unverified. |
| RS-53 | UNVERIFIED + BLOCKED | Keyboard walks and 820 reduced motion are evidenced (INPUT-A). Offline Show-more remains ambiguous; reduced motion was not repeated at 1440/390. Real touch is BLOCKED because emulation reports `maxTouchPoints=0` and `pointer: coarse=false`. |

### GitHub synchronization

| id | status | reason / evidence where partially exercised |
|---|---|---|
| GH-01 | UNVERIFIED | Repository-loading state was not captured. |
| GH-02 | UNVERIFIED | Config failure/Retry did not occur. |
| GH-03 | UNVERIFIED | Configured repository exists; unconfigured state unavailable. |
| GH-04 | UNVERIFIED | Pull confirmation works at 1440/820; not repeated at 390. |
| GH-05 | UNVERIFIED | Pull Cancel sends no import at 1440/820; not repeated at 390. |
| GH-06 | BLOCKED-BY-POLICY | Did not confirm Start Import. |
| GH-07 | UNVERIFIED | Sync confirmation works at 1440/390; not repeated at 820. |
| GH-08 | UNVERIFIED | Sync Cancel sends no export at 1440/390; not repeated at 820. |
| GH-09 | BLOCKED-BY-POLICY | Did not confirm Start Export. |
| GH-10 | UNVERIFIED | More opens at all widths; Less/collapse was not exercised. |
| GH-11 | UNVERIFIED | Valid target/draft identity was exercised only at 1440. |
| GH-12 | UNVERIFIED | Invalid target handling was exercised only at 1440. |
| GH-13 | UNVERIFIED | Reset works at 1440; other widths and unconfigured state remain unverified. |
| GH-14 | UNVERIFIED | Populated status observed; loading and no-activity states unavailable. |
| GH-15 | UNVERIFIED | Completed/failed/grouped rows observed; pending, processing, partial and committed-despite-error fixtures were not all present. |
| GH-16 | UNVERIFIED | Queue failure/Retry did not occur. |
| GH-17 | UNVERIFIED | History failure/Retry did not occur. |
| GH-18 | UNVERIFIED | Recorded commit opened in a new tab with safe rel at 1440; not repeated at 820/390. |
| GH-19 | UNVERIFIED | Logs open correctly at 1440; not repeated at 820/390. |
| GH-20 | UNVERIFIED | Failed error detail and close-focus pass at 1440; not repeated at 820/390. |
| GH-21 | UNVERIFIED | Production history is populated; empty state unavailable. |
| GH-22 | UNVERIFIED | Default five and More/all ordered rows work at all widths; Less/collapse was not exercised. |

### Research workspace

| id | status | reason / evidence where partially exercised |
|---|---|---|
| RW-01 | UNVERIFIED | Notes-loading state was not captured. |
| RW-02 | UNVERIFIED | Notes failure/Retry did not occur. |
| RW-03 | UNVERIFIED | Production has notes; empty workspace unavailable. |
| RW-06 | UNVERIFIED | Detail-loading state was not captured. |
| RW-07 | UNVERIFIED | Detail failure/Retry did not occur. |
| RW-08 | UNVERIFIED | Review candidates opens `/admin/researcher?jobId=N` at 1440 and 390; not repeated at 820. |
| RW-09 | UNVERIFIED | Escape closes with focus return at 1440/820; close was not repeated at 390 and X was not separately exercised. |

## Bottom line

**ISSUES:** AI-30 is a new reproducible navigation defect; AI-16 remains an owner/data decision. Thirteen inventory rows have full PASS evidence, RS-42 FAILs, and every other row is explicitly UNVERIFIED or BLOCKED above rather than silently upgraded.