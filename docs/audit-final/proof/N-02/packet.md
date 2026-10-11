# N-02 — Count agreement for every subcategory and sub-subcategory
Commit: dev `0f986c357d37ad03563c88d31af06c47c9943a33+workspace` (UI sweep; the tree-vs-SQL pass ran on `2349a26c…+workspace`, and nothing touching counts changed between them), prod `26450e08ba174abf77836fc36eada0e06b2e32a5`   Persona: guest   Browser: Chromium (Playwright, capture-only)
System/accent/width: editorial/crimson at 1440

**Status: NOT-REPRODUCED** on the current code (awaiting reviewer). Production disagrees in one place: the current sidebar row on all 32 sub-subcategory pages. That is the double-`aria-current` defect already fixed and confirmed under [N-14](../N-14/packet.md), so it is not a new row.

## What was compared
For every subcategory and sub-subcategory node in the tree the site fetches (`/api/awesome-list`), "expected" means direct resources plus resources in nested sub-subcategories. Each page was opened by SPA navigation (pushState and popstate, like a sidebar click). After the page's own h1 matched the node name (so a read can't catch the previous page), the sweep read:
- the accent badge under the title ("N resources")
- the results heading (`text-results-count`)
- resource cards on page 1, which must equal min(24, N)
- the last pagination page, which must equal ceil(N/24)
- the count on the sidebar's `aria-current="page"` row

Separately, the API tree was compared with a direct SQL count of approved resources grouped by category, subcategory and sub-subcategory labels (`tree-vs-sql-dev.json`).

## Reproduction steps
1. `node capture-script-tree-vs-sql.mjs` (dev): API tree vs SQL per node.
2. `node capture-script-ui.mjs` (dev, `BASE_URL=http://127.0.0.1:5000`): the UI sweep across all nodes.
3. `A=0 Z=131 node capture-script-ui-prod.mjs` (prod, read-only guest): the same sweep against https://awesome.video.

## Results
| Where | Nodes | Badge = heading = expected | Page-1 cards and page count | Sidebar current row | h1 matched before read |
|---|---|---|---|---|---|
| Dev tree vs SQL (2349a26c) | 119 | 0 mismatches | n/a | n/a | n/a |
| Dev UI (0f986c35) | 119 | 119/119 | 119/119 | 119/119 | 119/119 |
| Prod UI (26450e08) | 131 | 131/131 | 131/131 | 99/131: the 32 failures are exactly the 32 sub-subcategory pages | 131/131 |

- **SQL-only label:** one SQL label has no node of its own, "players & clients / web players / web players" (n = 1). It's a sub-subcategory label equal to its own subcategory, and the tree folds it into the subcategory's direct list. The subcategory total therefore still equals SQL, and no page shows a different number.
- **Prod sidebar cause:** on `/sub-subcategory/hevc`, prod marks two links current, "Codecs 68" and "HEVC 18", so the first current row read is the parent group. Dev at 0f986c35 marks only "HEVC 10". This is the N-14 re-review fix and needs the publish to reach prod.
- **A false lead, and what fixed the sweep:** the first prod pass reported `/subcategory/player-development-documentation` showing "Learning Resources 19" and Online Forums as 0. The read had caught the previous page still on screen. Waiting for the page's own h1 removed both, and the slugs are distinct in `/api/subcategories` (ids 2186 and 2267).
- **Console and network:** across the final runs, no console errors beyond Clerk's development-key warning, and no responses ≥ 400. An earlier dev pass logged one transient 429 without a URL; the known off-origin 429 source is the GitHub thumbnail host (N-13).

## Frames
- `sweep-subcategory-mobile-web-players-chromium-1440.png` (dev)
  1. Shows: "Mobile & Web Players" with a "67 RESOURCES" badge. The sidebar's current row "Mobile & Web Players +3 67" sits under Hardware Players / Roku. The caption reads SQL 67, badge 67, heading 67, cards p1 24, pages 3, sidebar 67.
  2. Proves: a subcategory with nested sub-subcategories counts them in its total on every surface, and pagination matches the total.
  3. If broken: the badge or sidebar would show only direct resources, or the page count would differ from ceil(67/24) = 3.
  4. Unexpected: none.
- `sweep-sub-subcategory-hevc-chromium-1440.png` (dev)
  1. Shows: "HEVC" with a "10 RESOURCES" badge. In the sidebar, Codecs +3 23 has AV1 5, HEVC 10, VP9 1 and Uncategorized 7 nested. HEVC is the current row, styled text-only (decided not a defect earlier).
  2. Proves: sub-subcategory totals agree, and the nested rows add up to the group: 5 + 10 + 1 + 7 = 23.
  3. If broken: the HEVC numbers would disagree, or the group sum would fall short.
  4. Unexpected: none.
- `prod-sweep-sub-subcategory-online-forums-chromium-1440.png` (prod 26450e08)
  1. Shows: "Online Forums" with an "8 RESOURCES" badge and 8 cards. In the sidebar, Community Groups 58 is highlighted, with child rows Online Forums 8 and Slack & Meetups 8. The caption's sidebar value is 58.
  2. Proves: the page's own counts are right on prod. The sidebar reading 58 is the parent marked current, and the 8 + 8 ≠ 58 children are the missing Uncategorized row. Both are N-14, fixed in dev and not yet published.
  3. If fixed on prod: the sidebar would read 8, and an Uncategorized row would make the children add up to 58.
  4. Unexpected: nothing beyond N-14.
- `prod-sweep-subcategory-codecs-chromium-1440.png` (prod): the subcategory-level counterpart, with every count equal.
- Measurements for every node are in `capture-log.jsonl` (phases `ui-sweep` and `ui-sweep-prod 0-131`).

## Unexpected items → new rows
None. The prod sidebar disagreement is N-14.

## Reviewer verdict
Pending.
