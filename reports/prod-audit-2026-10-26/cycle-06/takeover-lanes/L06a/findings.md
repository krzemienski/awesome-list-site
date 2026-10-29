**Verdict: ISSUES.** I proved 8 findings. Of the 12 rows, 6 pass at every width they need, 5 have findings and 1 is blocked. I created no QA rows and changed no settings. Production stayed on `bc1797b065c1989ab92f512633f69bf3fe25e718` from start to end (`version-start-run2.txt` at 19:24:14Z, `version-end-run2.txt` at 19:56:46Z), so no rows need re-driving.

All evidence is in `/Users/nick/Desktop/awesome-list-site/reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L06a/`, and the paths below are relative to that folder. Source references are in `client/src/components/admin/ResourceManager.tsx` (RM) unless a CSS file is named.

## 1. Findings

| id | sev | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| T6-06-01 | MED | `/admin#resources` → Next with the page-2 fetch failing | 1440, 820, 390 | **Saw:** when a new page fails to load, the previous rows disappear. The header reads "Resources (0 of 0)", the footer "0 resources", the pager is gone, focus drops to BODY, and there is no "last loaded results" label. **Expected:** stale rows stay visible and labelled. A failed refetch of the same page does keep its rows and label them correctly. The no-stale-data load failure also claims "0 of 0" and "0 resources". | `rm02-820.txt`, `rm02-820-error-stale.png`, `rm02-1440.txt`, `rm02-1440-error-newkey-rowsdropped.png`, `rm02-390.txt` | RM:375 (`keepPreviousData` is discarded on error in react-query v5); counts at RM:1158 and RM:1650; label only when `data` is set at RM:1450 |
| T6-06-02 | MED | `/admin` → Resources tab while offline, first load | 1440, 820, 390 | **Saw:** the offline banner appears, but the table says "No resources yet.", with "Resources (0 of 0)", "0 resources" and no skeleton. That tells the admin the catalog is empty. **Expected:** a skeleton or the offline state only, with no empty-catalog copy. | `rm03-firstload-offline-1440.png`, `rm03-820-offline-firstload.txt`, `rm01-390-offline-firstload-run2.txt` | RM:1546 (`!isLoading && !isError` is true while the query is paused) |
| T6-06-03 | MED | `/admin?status=rejected#resources` with filters open | 820 | **Saw:** the filter row is a single unwrapped line wider than the card. The search box is squeezed to 56px wide with 2px for text, so typed text cannot be seen. Category and Sort are truncated to "All…" and "Newe…", and the Clear-filters button (731–775px) is clipped by the card's hidden overflow (card edge 760px). **Expected:** every control readable and reachable. | `rm09-820-filterrow.json`, `rm09-820-filterrow-crop.png`, `rm11-820-rejected-deeplink.png` | RM:1203 (`flex flex-col sm:flex-row`); `admin-catalog-resources.css`:93 |
| T6-06-04 | LOW | filtered-empty table | 1440, 820, 390 | **Saw:** a generic "No resources match the current search or filters." **Expected:** the message names the active filters (here search, Media Tools, Withdrawn and Featured were all active). | `rm05-1440-crop.png`, `rm05-1440.txt` | RM:1548 |
| T6-06-05 | MED | filtered-empty table | 390 | **Saw:** the empty message is centred across the 1052px table inside a 302px scroll box. It shows as "No resources match th…", and the inline Clear filters sits at x=505, off-screen until the user swipes sideways. **Expected:** visible without a horizontal swipe. | `rm05-390-crop.png`, `rm05-390-geometry.txt`, `rm05-390.txt` | RM:1545 (empty cell spans all 6 columns inside the scrolling table) |
| T6-06-06 | LOW | filter region | 390 touch | **Saw:** "★ Featured only" is 258×41. **Expected:** at least 44px on touch. | `rm09-390-filterrow.json` | RM:1257 `ChipButton`; `client/src/components/ui/chip-button.tsx`:19 sets no minimum height |
| T6-06-07 | MED | `/admin?status=all#resources` | all (same column set at every width) | **Saw:** there is no status column or badge, so approved 190365, withdrawn 190364 and pending 190350 look identical. `getStatusBadge` is defined but never called. **Expected:** each row's status is shown and matches the API. | `rm06-1440-allstatus.json` | RM:1082 (unused); header row RM:1518–1524 |
| T6-06-08 | LOW | populated table | all | **Saw:** tags are cut to 2 with no "+N" indicator. Row 190342 has 5 tags in the API but shows only RTMP and RTSP. **Expected:** tags reconcile with the API or the cut is shown. | `rm06-api-page1.json` vs `rm06-1440-dom.json` | RM:1579 `.slice(0, 2)` |

Things I ruled out as tool problems:
- **Route patterns:** glob patterns in `agent-browser network route` never matched in agent-browser 0.27.0. Only exact URLs aborted requests.
- **Missed clicks:** clicks on the Resources tab, Next and Stay at 1440 missed because of stale refs after a resize, or because the control was off-screen (this tool never scrolls). I re-drove each with keyboard focus plus Enter, or a tall viewport.
- **Row checkboxes:** they are drawn at 32×32 but have a 44px hit area (`admin-catalog-resources.css`:296-302), so they are not a defect.
- **Hung wait:** my own `agent-browser wait 34000` hung, and I stopped it by its PID (91388).

## 2. Row matrix

| Row | Verdict | Widths | Evidence |
|---|---|---|---|
| RM-01 | ISSUES (T6-06-02) | 820, 390 driven; 1440 passed in L06 | Online first load: 6 skeletons, then 25 rows. Remounting from cache shows no skeleton and sends no request: `rm01-820-observer-run2.txt`, `rm01-820-remount.txt`, `rm01-390-observer-run2.txt`, `rm01-820-loaded.png`. The offline first load fails at all widths. |
| RM-02 | FAIL (T6-06-01) | 1440, 820, 390 | Retry reissues the query (1 request), recovers without the URL reverting, and focuses the table: `rm02-*.txt`. |
| RM-03 | PASS | 1440, 820, 390 | The banner reads "Page 2 will load… still showing page 1". Stay goes back to page 1 and clears `?page`. Retry while offline keeps `?page=2`, and reconnecting loads page 2 with no snap-back. Stay is 116×44 and Retry 59×44: `rm03-820.txt`, `rm03-1440.txt`, `rm03-390.txt`, `rm03-1440-offline-banner.png`. Focus after Stay lands on the panel heading, not the table. I noted that and did not file it. |
| RM-04 | BLOCKED | none | Production has 3,827 approved resources. Reaching a true zero total would need deleting real rows or mocking, and the brief forbids both. Copy path is RM:1550. Related defect: T6-06-02. |
| RM-05 | FAIL (T6-06-04, T6-06-05) | 1440, 820, 390 | Inline Clear resets search, category, status and featured, and focuses the table at all three widths. At 390 it only works after a swipe: `rm05-1440.txt`, `rm05-820b.txt`, `rm05-390.txt`. |
| RM-06 | FAIL (T6-06-07, T6-06-08) | 1440, 820, 390 | "25 of 3,826" and "Page 1 of 154" match the API. IDs, titles and categories match (all 25 rows at 1440, the first 3 at 820 and 390). All columns are reachable by scrolling the table sideways (1052px of content in a 718px or 302px box), with no page-level overflow: `rm06-1440-dom.json`, `rm06-820-dom.json`, `rm06-390-dom.json`. |
| RM-07 | PASS | 1440, 820, 390 | Starting from page 3: one debounced request for the full string, page reset to 1, same input node, focus kept. The vp9 total of 45 and the first IDs match the API: `rm07-1440.txt`, `rm07-820.txt`, `rm07-390.txt`. |
| RM-08 | ISSUES (T6-06-06 at 390) | 820, 390; 1440 passed in L06 | The toggle is 44×44 and `aria-expanded` flips correctly. The `?status=rejected` and `?featured=true` deep links open the panel, and the default link leaves it closed: `rm08-390.txt`, `rm08-820-open.png`, `rm08-11-390-deeplink.txt`. |
| RM-09 | FAIL at 820 (T6-06-03); PASS at 1440 and 390 | 1440, 820, 390 | Behaviour is correct at all widths: the request is sent, the page resets and focus stays. Single key presses typed correctly. The scrambled `keyboard type` result came from the tool: `rm09-820-keypress-caret.txt`, `rm09-1440.txt`, `rm09-390.txt`. |
| RM-10 | PASS | 1440 (all 9 categories plus All), 820, 390 | Every category sets `category` in the request. "All Categories" leaves it out, so a literal "all" is never sent. The page resets from 2, and a selection made at 1440 cleared: `rm10-1440-allcats.txt`, `rm10-11-1440.txt`, `rm10-11-12-390.txt`, plus the earlier `stageA-820.txt` and `stageA-390.txt`. |
| RM-11 | PASS | 1440, 820, 390 | Every status sets `status`, and All Status leaves it out. The rejected deep link shows "Rejected" selected at all widths. Withdrawn is filter-only: the Add dialog offers only Approved, Pending and Rejected, and I cancelled it. Evidence: `rm11-820-rejected-deeplink.png`, `rm11-820-addstatus-options.txt`. |
| RM-12 | PASS | 820, 390; 1440 passed in L06 | Choosing Oldest and then Newest from page 2 resets to page 1, and the first IDs (190359, 190342, 190152) match the API. "Newest" sends no `sort` parameter and relies on the server default, the same reading L06 used: `rm12-820.txt`, `rm12-390.txt`. |

## 3. QA rows

I created none and deleted none. QA resource 190364 (withdrawn) belongs to an earlier run; I left it alone, and `/api/resources/190364` returns 404 publicly. At 1440 I ticked its row checkbox in the browser only, with no write, to test that changing a filter clears the selection.

The catalog total rose from 3,826 to 3,827 during my run. The new row is 190365, "[QA-audit-1026] L10b link report probe". L10b's lane must delete it, not me.

## 4. Settings

None changed. In my own session I set `umami.disabled=1` in localStorage and clicked Decline on the analytics banner. The L06a browser session is closed and all network routes are removed.