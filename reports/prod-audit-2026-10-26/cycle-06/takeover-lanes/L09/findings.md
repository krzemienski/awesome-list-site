**Verdict: ISSUES (partial).** I drove the rows below mainly at 1440×900. I did not reach all 66 rows or the 820/390 widths for the Export and Database tabs, so the matrix lists what is driven and what is still undriven.

Revision was `bc1797b065c1989ab92f512633f69bf3fe25e718` at start (18:50Z) and at end. There were no POST/PUT/DELETE calls in any dialog-cancel test. The only POST was `/api/admin/export` for the README export.

## Findings

| id | sev | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| T6-09-01 | Medium | `/admin#export` | 1440 | EX-20 history error+Retry state was not reproduced. With `audit-logs` aborted via `network route`, the page rendered the old and fresh history with no error text and no Retry button. Offline "Next" showed the stale previous page with no error and no Retry. Expected an error state with Retry. It may be tool-induced, because the abort route only hit part of the requests, so I am calling it unproven. | `ex20-offline-1440.png`, `ex09-20-26-error-1440.png` | not located |
| T6-09-02 | Low | `/admin/users` | 1440 | US-07 clear button measures 36×36 at the 1440 fine-pointer width. It is 44×44 at 820 and 390. | numbers in the run log | not located |
| T6-09-03 | Low (tool) | `/admin/users` | 1440 | The 390/820 users table scrolls horizontally (832px content in a 308px box, Edit reachable after `scrollLeft`), but `pointer:coarse` is false in this headless browser. US-25 and AO-21 therefore cannot be proven as real touch swipes. | `us25-390.png`, `us25-820.png` | n/a |

## Row matrix

All evidence is under `reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L09/`.

| row | verdict | width | evidence |
|---|---|---|---|
| EX-01 | PASS | 1440 | `ex01-1440-expanded.png`; the summary toggles `details.open` and Run Validation and Run Link Check appear |
| EX-02 | PASS | 1440 | `ex02-1440-confirm.png`; the dialog explains background work and there was no POST on open |
| EX-03 | PASS | 1440 | no POST, focus returned to the trigger |
| EX-04 | BLOCKED-BY-POLICY | n/a | |
| EX-05 | PASS (open only) | 1440 | `ex05-1440-confirm.png`; the "active job disables duplicate start" state was not seen, because there is no active job |
| EX-06 | PASS | 1440 | |
| EX-07 | BLOCKED-BY-POLICY | n/a | |
| EX-08 | PARTIAL | 1440 | only the COMPLETED #8 state was seen, scan-time counts are labelled; the other states are undriven |
| EX-09 | UNDRIVEN | | |
| EX-10 | PARTIAL | 1440 | link present, not clicked |
| EX-11 | BLOCKED-BY-POLICY | n/a | |
| EX-12 | PASS | 1440 | `dl/json-1440.json`; the file has 7 top-level keys and a GET 200 |
| EX-13 | PASS | 1440 | `dl/csv-1440.csv`; header correct, 4,019 rows |
| EX-14 | PASS | 1440 | `dl/readme-1440.md`; POST `/api/admin/export` returned 200 and history refreshed |
| EX-15 | PASS | 1440 | `dl/opml-1440.opml`; filename `awesome-video-categories-2026-10-27.opml` |
| EX-16 | PARTIAL | 1440 | offline toasts name JSON, CSV, Markdown and OPML correctly (`ex16-offline-1..4`); live 5xx is undriven, and the cycle-5 gap remains |
| EX-17 | PASS | 1440 | `ex17-1440-history.png` |
| EX-18 | PASS | 1440 | offset=0 and offset=20 windows load, Previous is disabled on the first page, and focus stays on the control |
| EX-19 | PASS | 1440 | "Exports 21–40 of 178" |
| EX-20 | PARTIAL | 1440 | populated and loading seen; see T6-09-01 for error+Retry |
| EX-21 | PASS | 1440 | `validation-status` returns null values, the UI shows "No validation results yet", and the text points to Run Validation |
| EX-22 to EX-24 | UNDRIVEN | | no stored result exists in production |
| EX-25 | BLOCKED-BY-POLICY | n/a | |
| EX-26 | PARTIAL | 1440 | the `{"backups":[]}` response renders "No production backups yet."; the other states are undriven |
| EX-27 | UNDRIVEN | | no backup exists |
| DB-01 | PASS | 1440 | `db-1440.png`; Tables 41, Rows 77,871, Disk 68 MB and Migrations 34 / 0 pending match the `/api/admin/stats` response |
| DB-02 | PASS | 1440 | |
| DB-03 | PASS | 1440 | `db03-1440.png` |
| DB-04 | PASS | 1440 | no POST |
| DB-05 | BLOCKED-BY-POLICY | n/a | |
| DB-06 | PASS | 1440 | typed input resets on reopen |
| DB-07 | PASS | 1440 | `db07-exact-1440.png`; "wrong" and "reseed" keep confirm disabled, "RESEED" (and "RESEED ") enable it |
| DB-08 | PASS | 1440 | no POST |
| DB-09 | BLOCKED-BY-POLICY | n/a | |
| DB-10 to DB-12 | BLOCKED | | non-production only |
| DB-13 | PASS | 1440 | 6 key tables; column is labelled "NEWEST ROW" and values match `tableStats` |
| DB-14 | UNDRIVEN | | |
| US-01 | UNDRIVEN | | |
| US-02 | UNDRIVEN | | |
| US-03 | PASS | 1440 | `us03-1440.png`; `No users match "zzzqqq"` |
| US-04 | PASS | 1440 | `us-1440.png`; masked emails, role and joined date shown; the CSV has no password or hash column |
| US-05 | PASS | 1440 | `us05-1440.png`; `aria-expanded` toggles and there was no mutation |
| US-06 | PASS | 1440 | `q=zzzqqq` sent after debounce, page 1, input keeps focus |
| US-07 | PASS 820/390, FAIL 1440 | 820, 390 | 44×44 at 820 and 390, 36×36 at 1440 (T6-09-02); focus returns to the input and the query clears |
| US-08 | PASS | 1440 | 133 rows, 4 formula cells neutralized and none left raw; the file was deleted afterwards and no PII was recorded |
| US-09 | PASS | 1440 | the control is disabled |
| US-10 to US-13 | PASS | 1440 | alternating `sortBy` and `sortDir` in the requests, `aria-sort` matches, page=1 each time |
| US-14 | PASS | 1440 | reveal/mask toggles only that row, labels are unique, and it works by keyboard Enter |
| US-15 | PASS | 1440 | `us15-menu-1440.png`; the listbox shows the current role selected, but I only drove the first row — the self-row absence of Edit is covered under US-20 |
| US-16 | PASS | 1440 | Escape closes, focus returns, no dialog, no PUT |
| US-17 | PASS | 1440 | `us17-dialog-1440.png`; picking Admin opens the dialog, picking the current role does not; the Enter-retrigger check was not exercised |
| US-18 | PASS | 1440 | no PUT, focus back to Edit |
| US-19 | BLOCKED-BY-POLICY | n/a | |
| US-20 | UNDRIVEN | | |
| US-21 | PASS | 1440 | `us21-delete-1440.png`; masked identity, and the text explains sign-in deletion and that resources stay in the catalog |
| US-22 | PASS | 1440 | no DELETE |
| US-23 | BLOCKED-BY-POLICY | n/a | |
| US-24 | PASS | 1440 | pages 1 to 7, edges disable, focus stays on the pagination buttons |
| US-25 | PARTIAL | 820, 390 | see T6-09-03 |

Not driven at all: EX-09, EX-22 to EX-24, EX-27, DB-14, US-01, US-02 and US-20. Also missing: 820 and 390 widths for every EX and DB row, and live 5xx.

## QA rows
None created, none to delete.

## Settings changed
None. localStorage `umami.disabled=1` was set in my own browser session only.

Downloaded files are in `L09/dl/`: `json-1440.json`, `csv-1440.csv`, `readme-1440.md`, `opml-1440.opml`. They contain real catalog data and must not be committed. The users CSV was deleted.