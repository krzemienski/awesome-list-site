# N-14 — Sidebar child rows under a category sum below the category badge
Commit: BEFORE prod `26450e08ba174abf77836fc36eada0e06b2e32a5` (`/api/version`, read-only guest). AFTER dev `ab6da9f940ae994a308857bdc7b44918699fa853+workspace` (fix in the working tree on top of ab6da9f9; `AppSidebar.tsx` is identical in 26450e08 and ab6da9f9).
Persona: guest   Browser: Chromium (Playwright, capture-only)
System/accent/width: editorial/crimson at 1440; editorial/crimson and brutalist/amber in the 375 drawer

**Status: CONFIRMED** (FIXED; round 1 REJECTED, rework confirmed on re-review). Round 1 was rejected for two `aria-current` links on the nested filtered page; see "Rework after review" below.

## Reproduction steps
1. Open `/category/players-clients`. The left sidebar opens the Players & Clients group.
2. Add up the counts on the child rows under Players & Clients and compare the sum with the category's badge (the number on the category row) and the page heading "Resources (N)".
3. Open a child group with nested rows (for example the "+3" on Mobile & Web Players) and add its nested rows against its own badge.
4. After the fix: click the sidebar's **Uncategorized** row. Read the URL, the heading and which row is marked current. Then reload, press Back and press Forward. Click the nested **Uncategorized** row under Mobile & Web Players.
5. At 375, open the drawer ("Toggle sidebar") and find the same row.

## Before — what was seen
- `before-category-prod-chromium-1440.png` (prod 26450e08)
  1. Shows: the Players & Clients sidebar group goes "All in Players & Clients →", Browser Extensions 20, Desktop Players 19, Embedded Players 29, Frameworks & UI Components 26, Hardware Players 46, Mobile & Web Players 83, Mobile Players 16, Set-top Box Players 25, Smart TV Players 39, Web Players 27, and then the next category starts. The badge and heading read 447.
  2. Proves: the child rows add up to **330**, not 447. The 117 resources filed directly under the category have no row (caption `uncategorizedRow:false`, `Resources (447)`).
  3. If fixed: a row would cover the 117, and the rows would add up to 447.
  4. Unexpected: none.
- `../N-15/before-sub-filtered-prod-chromium-1440.png` also shows the nested group under Mobile & Web Players with only Android, Web Players and iOS/tvOS rows: 10+23+29 = 62 against its badge of 83. The same gap exists one level down.

## Root cause
`client/src/components/layout/new/AppSidebar.tsx` renders one row per child node from the `/api/awesome-list` tree, plus an "All in …" row. Resources stored directly on a node (`node.resources`) were counted in its badge, through `getTotalResourceCount`, but no row represented them. N-12 is the same gap on the category page's tile grid.

## Fix
- `directResourceCount(node)` reads the same tree, so the badge, children and the direct count all come from one source. `getTotalResourceCount(node)` = direct + Σ children by construction.
- After the child rows of a category: an **Uncategorized N** row (`sub-<cat>-uncategorized`) linking to `<category>?filter=general`, the filter the category page already supports.
- Inside every nested group: an **Uncategorized** leaf (`subsub-<sub>-uncategorized`) linking to `<subcategory>?filter=general`. The last real child's tree glyph changes from └ to ├ when that leaf follows it.
- Current state: the Uncategorized row is `aria-current="page"` when the listing is on `?filter=general`. "All in …" is current only when that filter is off, so only one row is current at category level. *(Round 1 claimed this for every level, which was wrong for nested groups; see "Rework after review".)* The label matches the N-12 tile and the filter select ("Uncategorized").

## After — what was seen
All nine categories (dev): the sidebar sum equals the badge and the heading, and the sidebar Uncategorized count equals the N-12 tile.

| Category | Sidebar sum = badge | Uncategorized row |
|---|---|---|
| Community & Events | 80 | none (0 direct) |
| Encoding & Codecs | 333 | 92 |
| General Tools | 134 | 72 |
| Infrastructure & Delivery | 191 | 111 |
| Intro & Learning | 187 | 113 |
| Media Tools | 266 | 134 |
| Players & Clients | 239 | 117 |
| Protocols & Transport | 213 | 75 |
| Standards & Industry | 173 | 118 |

Every nested group sums to its own badge too, for example Mobile & Web Players: Android 10 + Web Players 19 + iOS/tvOS 28 + Uncategorized 10 = 67. Per-group figures are in `capture-log.jsonl` (phase `after`).

Navigation on Players & Clients: click → `?filter=general`, "Resources (117)", the row is `aria-current=page`, "All in" is not current, and the N-12 tile is pressed. Reload keeps it. Back → 239 with no row current. Forward → 117 again. The nested row → `/subcategory/mobile-web-players?filter=general`, which lists exactly the 10 resources SQL counts as filed directly under that subcategory (`sub_subcategory IS NULL`: Able Player … streamlit-WebRTC).

- `after-sidebar-players-clients-chromium-1440.png`: the group now ends "Web Players 6, Uncategorized 117".
- `after-sidebar-uncategorized-active-chromium-1440.png`
  1. Shows: the sidebar "Uncategorized 117" row with the active tint, the pressed "Uncategorized 117" tile in the grid, and "Resources (117)". The nested groups (Mobile & Web Players, Smart TV Players) each end in an "Uncategorized" leaf.
  2. Proves: the row lands on the filtered list and is marked current (caption `rowCur:"page"`, `allCur:null`, `tilePressed:"true"`).
  3. If broken: there would be no row, or "All in" would stay current while the filter is on.
  4. Unexpected: none.
- `after-sidebar-nested-uncategorized-chromium-1440.png`
  1. Shows: `/subcategory/mobile-web-players?filter=general`; the nested "Uncategorized 10" leaf is current.
  2. Proves: the nested row links to the filtered subcategory list.
  3. If broken: the link would land on the unfiltered 67.
  4. Unexpected: **yes**. The page still reads "67 RESOURCES" with no visible sign that only 10 are listed: the count heading is screen-reader-only at this level and the filter sits in the closed "Filters & view" panel. This becomes new row **N-15**, which was fixed in the same pass.
- `after-drawer-editorial-chromium-375.png`, `after-drawer-brutalist-chromium-375.png`
  1. Shows: the 375 drawer with Players & Clients open. Its last row is "Uncategorized 117", tinted in the system accent (crimson / amber).
  2. Proves: the drawer, a separate mount of the same component, has the row. It is 44 px tall, and its count's right edge (293.5) sits inside the row (305.5) at a 375 viewport.
  3. If broken: the drawer list would end at Web Players.
  4. Unexpected: **yes**. The drawer's floating close button covers the "General Tools 134" count of the row scrolled under it; in Brutalist the count is fully hidden. It predates this change, so it becomes new row **D-12**.
- No console errors (only Clerk's development-key warning) and no ≥400 responses in any run.
- Scripts: `capture-script.mjs` (1440 sweep + navigation), `capture-script-drawer.mjs`, `capture-script-subcategory.mjs`, `capture-script-before-prod.mjs`.

## Unexpected items → new rows
- **N-15**: a subcategory page narrowed by `?filter=general` gives no visible sign of the filter.
- **D-12**: the drawer close button overlays the counts of the rows scrolled beneath it at 375.

## Reviewer verdict
**REJECTED** by independent reviewer `review-batch1` (own persona `__qa_test_final_review_final_r07_…` where sign-in was needed), revision `2349a26c27f732e515acdfafdf042c7f4e9b25cc+workspace`, 2026-10-11. The reviewer captured first and read this packet afterwards.
- Seen: Counts are corrected: category 239 and nested 10+19+28+10=67; category navigation/history and the mobile row work. However, clicking nested Uncategorized marks both its filtered link and the unfiltered Mobile & Web Players link aria-current="page". Reload preserves both current-page declarations; the unfiltered parent retains the accent highlight.
- Compared with this packet: Contradicts “only one row is ever current”; two sidebar links are current on the nested filtered page.
- Reviewer evidence: `review/review-mobile-nested.png`, `review/review-nested-current-detail.png`, `review/review-nested-current-reload.png`, `review/review-measurements.jsonl`

## Rework after review
**Root cause.** The nested group's parent link (`av-sidebar-l2-link`) took `aria-current="page"` from `subActive`, which means "this group contains the current page" and also drives the row's ancestor highlight. So the parent claimed to be the current page whenever any page inside the group was current: the nested Uncategorized listing (the reviewer's case) and also every sub-subcategory page. The second case predates this work: production 26450e08 marks both "Mobile & Web Players" and "Android" current on `/sub-subcategory/android` (`before2-subsub-two-current-prod-chromium-1440.png`).

**Fix.** `AppSidebar.tsx`: the parent link is `aria-current="page"` only on its own unfiltered listing (`activePath === subPath && !generalActive`). The row's `.active` highlight and `data-active` (the drawer's scroll-into-view target) still mark the containing group, as on sub-subcategory pages.

**AFTER (round 2).** Dev, working tree on 2349a26c, guest, Chromium, editorial/crimson. Links with `aria-current="page"` in the sidebar:
| URL | Current link(s) | Highlighted group |
|---|---|---|
| `/subcategory/mobile-web-players?filter=general` | Uncategorized 10 only (same after reload; same in the 375 drawer) | Mobile & Web Players |
| `/subcategory/mobile-web-players` | Mobile & Web Players only | Mobile & Web Players |
| `/sub-subcategory/android` | Android only (prod: Android **and** Mobile & Web Players) | Mobile & Web Players |
| `/category/players-clients?filter=general` | Uncategorized 117 only | none |
| `/category/players-clients` | All in Players & Clients → only | none |

- `after2-nested-current-chromium-1440.png`
  1. Shows: the filtered subcategory page with "10 of 67 resources match" and the scope chip; in the sidebar the Mobile & Web Players row keeps its group highlight and the nested "Uncategorized 10" row is the current one.
  2. Proves: one current link (caption: only the `?filter=general` link).
  3. If broken: the caption would list the unfiltered parent too.
  4. Unexpected: none.
- `before2-subsub-two-current-prod-chromium-1440.png` (prod, read-only): two current links on a sub-subcategory page. `after2-subsub-current-chromium-1440.png`: Android alone. `after2-nested-current-drawer-chromium-375.png`: drawer, one current link.
- Measurements: `capture-log.jsonl` phases `after2-aria-current` and `before2-prod`. Scripts: `capture-script-aria-current.mjs`, `capture-script-aria-current-before.mjs`.

## Re-review verdict
**CONFIRMED** by `review-batch1` on `0f986c357d37ad03563c88d31af06c47c9943a33+workspace`. The reviewer captured first, then read this section.
- Seen: exactly one `aria-current="page"` link, the one for the exact URL, on every route at 1440 (sidebar) and 375 (drawer): the nested filtered page (direct, reload, clicked from the category, Back/Forward), the unfiltered subcategory, Android, iOS/tvOS, the filtered and unfiltered category. The parent keeps its group highlight. Counts unchanged (239; 10+19+28+10=67). The drawer reveals the active link, with no overflow and no console errors.
- Compared with this packet: agrees; the reviewer additionally checked iOS/tvOS and the drawer on every route.
- Reviewer evidence: `review/r2/` (measurements + 7 frames).
