**Verdict: BLOCKED (incomplete).** I drove only 7 of 74 rows, at 1440 wide only, and found no defects. Every row needs All widths, so none of the 7 counts as a full PASS. They are logged as "PASS@1440" below. I stopped early because the brief allows returning the matrix so far when I run low on context. No QA rows were created, so nothing needs cleanup.

Revision at start: `bc1797b065c1989ab92f512633f69bf3fe25e718`, checked 2026-10-27 18:50Z. I did not re-check it at the end, so rows passed here are not yet confirmed against an unchanged revision.

## 1. Findings

None proven.

Tool artifacts I ruled out:
- `agent-browser type` appends to existing input text, and `fill` did not fire onChange reliably. This produced a bogus "15abc4" result. I re-drove with focus, select-all, and `keyboard type`.
- Headless sessions dropped the cookie once (the browser fell to `about:blank`, then redirected to `/sign-in`). The jar was still valid via curl (200). I re-injected it with `cookies set --curl` from the file and did not log in.
- Select options below the viewport are unclickable. I used 7500px-tall viewports for the rows-per-page and sort checks.

## 2. Row matrix

Evidence for every driven row is in `reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L06/`: `rm01-1440.png` (screenshot) and `evidence-log.txt` (pagination notes). The other results are from console output and are not saved to a file.

| Row | Verdict | Widths driven | Evidence |
|---|---|---|---|
| RM-01 | PASS@1440 | 1440 | `GET /api/admin/resources?page=1&limit=25&status=approved` returned 200. After reload I saw no skeleton elements on the page and 25 populated rows. `rm01-1440.png` |
| RM-08 | PASS@1440 | 1440 | The toggle flips between "Show filters and tools" (`aria-expanded` false) and "Hide filters and tools" (true), and the filter region appears. Deep-link auto-open not driven. |
| RM-12 | PASS@1440 | 1440 | Sent `sort=newest` (the default sends no `sort` param). The displayed order matches the API order. |
| RM-13 | PASS@1440 | 1440 | `sort=oldest` was sent, page 1. The first 3 titles match the API (MPEG Standards Documentation, VVC, Publicly Available MPEG Standards). |
| RM-14 | PASS@1440 | 1440 | `sort=name-asc` was sent. The first 3 titles match the API (100-4K…, 100ms…, 151st MPEG…). |
| RM-15 | PASS@1440 | 1440 | `sort=name-desc` was sent. The first 3 titles match the API (µStreamer, µPlayer: Lightweight…, µPlayer). |
| RM-39 | PARTIAL@1440 | 1440 | 25 (default), 50 and 100 each sent the right `limit` and reset to page 1. The 50 and 100 URLs were `?limit=50` and `?limit=100`. The range text and rows matched (1-50 of 3,826 over 77 pages; 1-100 over 39 pages). The API returned 100 rows and total 3,826. Switching back down to 25 never registered, so only "25 as the initial default" is confirmed. |
| RM-41 | PASS@1440 | 1440 | Typing 9 and pressing Enter gave `?page=9` and "Page 9 of 154". It was still there after 2.5s, with no snap-back. Not driven: any width except 1440, or Enter with `?page=N` already in the URL. |
| RM-42 | PASS@1440 | 1440 | Details in the next two lists. |
| RM-06, RM-07, RM-09, RM-10, RM-11, RM-16, RM-17, RM-18, RM-40 | PARTIAL, URLs and requests observed only | 1440 | The Status default sends `status=approved`. I saw that the combobox values are present, but I did not drive these controls individually. |
| RM-02 to RM-05, RM-19 to RM-23, RM-25 to RM-27, RM-29, RM-30, RM-32 to RM-37, RM-43 to RM-73 | UNDRIVEN | none | No evidence. |
| RM-24, RM-28, RM-31, RM-38, RM-74 | BLOCKED-BY-POLICY | none | As the lane file states: bulk approve, reject and delete, deleting a real row, and saving a real row are forbidden. The cancel-path rows RM-23, RM-27 and RM-30 are still drivable and undriven. |

RM-42 results:
- A blur on 12 committed `?page=12`.
- "abc" plus Enter set `aria-invalid=true` and `aria-describedby=input-page-jump-error`, with live-region text "Enter a whole number between 1 and 154."
- 999 clamped to page 154.
- 0 plus blur clamped to page 1 and dropped `?page` from the URL.
- 5x plus Enter showed the same error.
- 4 plus Tab committed `?page=4`.

Not driven at any width: Previous, Next and numbered-link behavior (RM-40). The markup shows real `href`s (`/admin?page=2#resources`), `rel=next`, and 44px targets on touch via `min-h-11`, with `min-[1025px]:h-8`. That is an unmeasured guess about desktop target size.

Not driven at any width: 820×1180 and 390×844 for every row.

## 3. QA rows

None created, so nothing was deleted. An existing `[QA-audit-1026]` resource, id 190364, has status withdrawn and was created 2026-10-27 08:31Z. It is not mine, and I did not touch it.

## 4. Settings changed

None. The only browser state I set was `localStorage umami.disabled=1`, and I clicked "Decline" on the analytics banner.

Also left in the L06 session: a 7500px-tall viewport and the URL `?limit=100`.

## Still undriven, for the next pass

Everything not marked PASS or BLOCKED-BY-POLICY above, plus the remaining widths for the 7 PASS@1440 rows.

Drive these first because they are quick:
- Filters and search: RM-07, RM-09 to RM-11, RM-16 to RM-18.
- Selection and bulk dialog open and cancel: RM-19 to RM-23, RM-25 to RM-27, RM-29, RM-30. Select only QA rows, and create at least one first.
- Deep links: RM-43.
- Create and edit dialogs, which need a QA row (RM-44 to RM-73).
- The offline and Retry rows RM-02 and RM-03, which need network blocking.