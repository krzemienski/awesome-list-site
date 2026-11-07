**Verdict: ISSUES (open gaps).** I found no new defects. All 12 rows are driven at their required widths, but EX-05 (active-job state) and EX-08 (pending, processing, failed and cancelled states) cannot be reached in production. EX-08's completed state passes. T6-09-01 is not reproduced and I am calling it tool-induced.

Production served `bc1797b065c1989ab92f512633f69bf3fe25e718` at 19:02Z and again at 19:23Z (curl of `/api/version`). It was unchanged, so no row needed re-driving.

## Findings

No new findings. T6-09-01 (earlier lane, EX-20) is withdrawn: with `/api/admin/audit-logs*` fully aborted, Export history shows "Couldn't load export history" with a Retry button. I drove it at 1440, 820 and 390.

The earlier lane's `*audit-logs*` abort pattern did not match anything in this tool. A fetch to the audit-logs URL still returned 200 under it, so it let the audit-logs requests through. `https://awesome.video/api/admin/audit-logs*` does abort them, with a trailing `*` after the full URL.

- **1440 and 820/390:** with every `audit-logs` request aborted, Export history shows "Couldn't load export history. Could not reach the server..." with Retry. The Retry button is 91×44.
- **Retry while still aborted:** reissues one `audit-logs` request, and the error stays.
- **Retry after clearing the abort:** the table loads with 20 rows.
- **Failed Next page (1440):** with data already loaded and requests aborted, clicking Next shows the same error and Retry.
- **Evidence:** `ex20-1440-error.png` (viewed), `ex20-1440-next-fail.png`, `ex20-820-error.png`, `ex20-390-error.png`.

## Row matrix

All evidence is under `reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L09a/`. EX-01, EX-02, EX-03, EX-06 and EX-12 to EX-15 already passed at 1440 in L09, so I drove only 820 and 390 for them.

| row | verdict | widths | evidence and notes |
|---|---|---|---|
| EX-01 | PASS | 820, 390 (1440 re-confirmed) | `details.open` toggles, and the Run Validation and Run Link Check buttons are visible only when open (`checkVisibility` true/false). Buttons measure 147×44 and 154×44. `snap1.txt` vs `snap2.txt` show the accessibility tree adding both buttons. |
| EX-02 | PASS | 820, 390 | `ex02-820-confirm.png`, `ex02-390-confirm.png`. The dialog explains that validation runs in the background and can take a minute, and there was no POST on open. Cancel and Run buttons are 44px tall. |
| EX-03 | PASS | 820, 390 | Cancel closes the dialog, focus returns to Run Validation, and no POST was captured. |
| EX-05 | PASS (idle). Active-job half BLOCKED-BY-LEAD | 1440, 820, 390 | `ex05-1440-confirm.png`, `ex05-820-confirm.png`, `ex05-390-confirm.png`. The dialog describes the full-catalog job that checks every approved resource against the live web, in the background and cancellable. There was no `check-links` request on open. I could not start a job to see the duplicate-start guard. |
| EX-06 | PASS | 820, 390 (1440 re-driven) | Cancel closes the dialog with no `POST /api/admin/check-links`. Focus returns to Run Link Check. |
| EX-08 | PASS (completed state). Other states BLOCKED-BY-LEAD | 1440, 820, 390 | `ex08-*-panel.png`. Job #8 completed. The UI text "3,809 healthy, 12 broken, 0 redirects, 0 timeouts, 2 suspect of 3,823" matches `GET /api/admin/link-health/status`. The "At scan time" label and the note that Link Health counts drop later are shown. There is no horizontal overflow at any width. The pending, processing, failed and cancelled states need a job, so I did not drive them. |
| EX-09 | PASS | 1440, 820, 390 | `ex09-*-nojob-error.png`, `ex09-*-stale.png`. |
| EX-10 | PASS | 1440, 820, 390 | `ex10-1440-linkhealth.png`, `ex10-820-linkhealth.png`, `ex10-390-linkhealth.png`. A real click on "Open Link Health for problem links" lands on `/admin/linkhealth`, with no POST (nothing started or cancelled). |
| EX-12 | PASS | 820, 390 | `dl/json-820.json`, `dl/json-390.json`. One `GET /api/admin/export-json` 200 per click, and `audit-logs` refetched. |
| EX-13 | PASS | 820, 390 | `dl/csv-820.csv`, `dl/csv-390.csv`. One `GET export-csv` 200 per click. |
| EX-14 | PASS | 820, 390 | `dl/readme-820.md`, `dl/readme-390.md`. Keyboard Space gives `POST /api/admin/export` 200 and then an `audit-logs` refetch. The button shows "Generating..." with `aria-busy=true`, stays focused and is not disabled. |
| EX-15 | PASS | 820, 390 | `dl/opml-820.opml`, `dl/opml-390.opml`. One `GET export-opml` 200 per click. |

EX-09 detail:
- **No job:** the status request is aborted. The panel shows "Couldn't load the link check status... This is not evidence that links are healthy." with Retry (91×44).
- **With job #8:** the panel keeps the job and adds "The progress above may be out of date." with Retry.
- **Retry:** reissues the status request (1 request) and keeps the error while the abort holds. After the abort is cleared, Retry recovers the panel and the stale alert disappears.

Export-card checks at 820 and 390:
- Filenames, captured by hooking the anchor's `download` attribute:
  - `awesome-list-catalog-snapshot-2026-10-27.json`
  - `resources-export-2026-10-27.csv`
  - `awesome-list.md`
  - `awesome-video-categories-2026-10-27.opml`
- Content types, from curl against the three GET endpoints:
  - JSON is `application/json`
  - CSV is `text/csv`
  - OPML is `text/x-opml`
- File contents:
  - The JSON has the keys `exportedAt, version, scope, omissions, schema, stats, data`.
  - The CSV header starts `id,title,url,description,category,subcategory`, with 4,019 rows.
  - The OPML has 3,967 outlines.
  - The README starts with `# Awesome Video`.
- Buttons are 44px tall at both widths: 303 wide at 820, 258 at 390.
- The JSON, CSV and OPML buttons show "Downloading..." with `aria-busy=true`, stay enabled and keep focus.

Tool traps I hit, none of them product defects:
- A click on a ref taken from the previous dialog's snapshot opens nothing. Take a fresh snapshot after every dialog closes.
- At 390 the Export tab sits offscreen in the tab strip, and the headless browser won't scroll to it. I used `scrollIntoView` with instant behavior, then clicked the ref.
- Anything below the fold needs a tall viewport. I used 390×2800, 820×2200 and 1440×1800. The `agent-browser download` command hung on below-fold buttons at 390×844.
- The `**` glob in `network route` did not match anything. A full URL with a trailing `*` does.
- Offline mode makes React Query pause the fetch rather than fail it, so it never shows the error state.
- `pointer:coarse` is false in this headless browser (`set device` did not change it). The 820 and 390 rows prove viewport width and 44px target sizes, not real touch input.

## QA rows
None created, none to delete.

## Settings changed
No production settings changed. In my own browser session only, `localStorage umami.disabled=1` was set and the owner cookie was loaded from the header file. No sign-out was done.

## Files and side effects
- My downloads are in `L09a/dl/` and contain real catalog data. Do not commit them. The three `*-820-rerun.*` files are duplicate downloads from my filename-capture run.
- Each export click and my three curl header reads added export audit-history entries in production. This is expected for the lane.