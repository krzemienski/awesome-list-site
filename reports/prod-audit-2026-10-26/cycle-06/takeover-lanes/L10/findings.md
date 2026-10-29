**Verdict: INCOMPLETE.** I drove 1440 only, and only the states production shows naturally. I found no defects, but about 43 of the 66 rows are undriven. This is a partial matrix. I stopped because of context budget, not because of a block.

Production revision was `bc1797b065c1989ab92f512633f69bf3fe25e718` at start and at the last check, so no row needs re-driving. Nothing was created or mutated on production: no QA rows, no settings changes, no POST, PATCH or DELETE. The owner session stayed signed in, and cookies went in only by shell expansion.

## Findings
None proven. No `T6-10-NN` rows.

## Evidence quality
- Evidence is under `reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L10/`.
- Files named `admin-*-820 1180.png`, `admin-*-390 844.png`, `admin#audit-*.png` and `admin-*-390.png` are bad or unreviewed. The first four are 1440-wide captures from a zsh word-split bug in my loop, so ignore them. The `-390` and `-820` captures are viewport-correct but I did not review them.
- The only 390 evidence I reviewed is `lh-390-more.png`.

## Row matrix
Evidence for driven rows is in `L10/`: `lh-1440-initial.png`, `lh-1440-more.png`, `lh-1440-run-dialog.png`, `dg-1440.png`, `au-1440.png`, `au-1440-tools.png`, `au-1440-detail.png`, `cs-1440-revealed.png`, `lh-390-more.png`, and the `raw-*.json` API reads.

**Driven, 1440 only.** The 820 and 390 widths are an open gap for each of these rows, so they are not full passes.

| Row | Verdict | What I saw |
|---|---|---|
| LH-04 | PASS at 1440 | Status API: checked 3823, healthy 3809, broken 12, suspect 2. UI tiles show 3,809 / 11 / 2, with the note "scan recorded 12 broken; 11 still listed". Problem Links shows "13 ISSUES" and the Recent failures table has 13 rows. Also seen at 390 (`lh-390-more.png`). |
| LH-05 | PASS at 1440 | "Run Check Now" and "Run full check" both open "Run link health check?" with the same full-catalog copy ("every approved resource … currently 3,826"). |
| LH-06 | PASS at 1440 | Cancel closes the dialog. Network log shows no POST. |
| LH-15 | PARTIAL | Open list is empty and the open count is 0. I did not drive the status select. |
| LH-16, LH-17 | PARTIAL | API returns no reports for Resolved or Dismissed. The UI select was not driven. |
| LH-25 | PASS at 1440 | More shows Summary, Trends and Problem Links, with `aria-expanded` true. Less hides them. No scan request fired. |
| LH-26 | PARTIAL | Run Check Now opens the same dialog. The active-job disabled state is undriven. |
| DG-04 | PARTIAL | Refresh button and "Updated … refreshes every 30s" are present. Busy and aria-disabled behaviour is undriven. |
| DG-05 | PASS at 1440 | UI shows Transport Available, Queue total 0, Oldest queued None, in_app Sent 1. This matches `raw-dg-health.json`. |
| DG-07 | PASS at 1440 | "No recent failure codes recorded." appears with `recentFailureCodes: []`. |
| AU-04 | PASS at 1440 | Actor masked as `a•••@example.com`. "1–25 of 16,946 entries" shows the full-log total. |
| AU-05 | PASS at 1440 | Tools reveals the Resource ID filter, rows select and Contact submissions. I did not check `aria-expanded`. |
| AU-06 | PASS at 1440 | Enter on ID 190364 sent `GET …audit-logs?limit=25&offset=0&resourceId=190364`. Range showed "1–2 of 2". |
| AU-07 | PASS at 1440 | 0, -5 and 99999999999 each showed "Enter a Resource ID between 1 and 2,147,483,647." and disabled Search. No request was sent. |
| AU-08 | PARTIAL | 50 rows sent `limit=50&offset=0` and showed "1–50". I did not try 100 or 200. |
| AU-09 | PASS at 1440 | Enter submits the filter. The Search button also applied the 50-row limit. |
| AU-10 | PASS at 1440 | Clear refetched with no `resourceId`. Focus landed on the emptied Resource ID input. |
| AU-12, AU-13 | PARTIAL | Next gave `offset=25` and "26–50". Previous returned to "1–25". Focus, scroll and edge behaviour were not checked. |
| AU-14 | PARTIAL | Opened by the detail button and showed notes plus the full changes JSON. Row click, Enter and Space were not driven. |
| AU-15 | PASS at 1440 | "View details for audit entry 27616" has a unique accessible name. The dialog is "Audit entry #27616". |
| AU-16 | PARTIAL | Escape closed the dialog and focus returned to the detail button. The X button was not driven. |
| AU-22 | PARTIAL | The one submission shows name, masked reply-to `q•••@awesome.video`, subject and date. It matches `raw-cs.json`. The second page is undriven. |
| AU-24 | PARTIAL | Enter on the row opened the detail with the email still masked. Click and Space were not driven. |
| AU-25 | PASS at 1440 | Reveal showed `qa698@awesome.video`. Mask re-masked it. |
| AU-26 | PARTIAL | The link href is `mailto:qa698@awesome.video?subject=Re%3A%20QA%20698%20analytics%20check`. I did not activate it. |
| AU-27 | PARTIAL | Escape closed the dialog and focus returned to the row. "Clears revealed state on reopen" is undriven. |

I ran a size and overflow check at 820 and 390 on all three pages. The page had no horizontal scroll and no under-44px buttons, tabs or comboboxes (links excluded). This is evidence for LH-32, DG and AU width checks, but is not a full row pass.

**BLOCKED-BY-POLICY (as the lane file states).** I did not touch LH-07, LH-11, LH-21 or LH-22. LH-07 and LH-11 would start or cancel a production scan. LH-21 and LH-22 would mutate real member reports, and none exist anyway.

**Undriven (need a state production does not offer, or I ran out of budget).**
- LH-01, LH-02, LH-03, LH-08, LH-09, LH-10, LH-12, LH-13, LH-14, LH-18 and LH-31 need a loading, failure, active-scan or no-scan state. LH-31 is also non-production only.
- LH-19 to LH-24, LH-27 to LH-30 and LH-32 are undriven in full. LH-19 needs a loading or failure state. LH-20 and LH-24 need a populated report or link row. LH-23 and LH-27 to LH-30 need loading, empty or filter states, or the trend chart at 390 below the fold.
- DG-01 to DG-03 and DG-06 are undriven. They need loading, failure, stale or empty-queue states.
- AU-01 to AU-03, AU-11, AU-17 to AU-21 and AU-23 are undriven, with these exceptions: AU-17 and AU-23 were not driven because they need fixtures (production's completed/pending/approved chips in `au-1440.png` are not the full AU-17 set), and AU-23 also needs more than 20 submissions.
- I could have forced the failure and loading states with `agent-browser network route --abort`, which adds no production writes. I did not get to it.

## QA rows and settings
- QA rows created or deleted: none.
- Settings changed or restored: none.

Nothing was fabricated. Everything above was seen in the browser, on the network log, or in the curl reads under `L10/`.