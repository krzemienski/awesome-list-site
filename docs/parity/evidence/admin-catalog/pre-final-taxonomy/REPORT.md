# Visual parity report

Run: `2026-09-13T01-26-34-850Z-3542`  
Claim: **selected-rows-diagnostic**  
Gate: **NOT PASSED** (exit code 1)  
Identity: disposable Clerk admin `2101520500` "Nick" (torn down: local row deleted, Clerk user deleted, 1 __qa_test_parity_ rows remaining)  
Frozen clock: `2026-09-13T01:26:00.000Z` on both sides.  
Denominator: 0 pass / 8 fail / **8** pixel rows executed. 0 row-incomplete, 0 blocked, 0 evidence-only, 4 token-only, 0 aliases, 0 not selected.

Selected run (`--only app.admin.categories,app.admin.subcategories,app.admin.subsubcategories --width 375,768,1024,1440`): 12 rows executed; rows outside the selection are not listed and the gate is diagnostic only.

## Eligibility

| Class | Screens | Meaning |
|---|---:|---|
| pixel | 26 | Compared pixel-for-pixel at 375/768/1024/1440 (or the row's declared widths); counted in the denominator. |
| token-only | 14 | Design has no counterpart; verified by token audits, never by pixels. |
| artifact-docs | 22 | Design-system docs chapters; captured as evidence, excluded from the denominator. |
| blocked | 12 | Cannot be compared yet; each row carries its reason. |

## Rows

| Screen | Width | Class | Status | Diff px | Diff % | Actual vs expected size | Evidence / reason |
|---|---:|---|---|---:|---:|---|---|
| app.admin.categories | 375 | pixel | FAIL | 301080 | 42.3237% | 375×1897 vs 375×1216 | [actual](actual/app.admin.categories-375.png) · [expected](expected/app.admin.categories-375.png) · [diff](diff/app.admin.categories-375.png) — 42.324% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.categories | 768 | pixel | FAIL | 436691 | 36.0792% | 768×1576 vs 768×1086 | [actual](actual/app.admin.categories-768.png) · [expected](expected/app.admin.categories-768.png) · [diff](diff/app.admin.categories-768.png) — 36.079% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.categories | 1024 | pixel | FAIL | 670631 | 40.7791% | 1024×1606 vs 1024×1009 | [actual](actual/app.admin.categories-1024.png) · [expected](expected/app.admin.categories-1024.png) · [diff](diff/app.admin.categories-1024.png) — 40.779% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.categories | 1440 | pixel | FAIL | 600133 | 30.0909% | 1440×1385 vs 1440×1009 | [actual](actual/app.admin.categories-1440.png) · [expected](expected/app.admin.categories-1440.png) · [diff](diff/app.admin.categories-1440.png) — 30.091% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.subcategories | 375 | pixel | FAIL | 178724 | 18.1838% | 375×2325 vs 375×2621 | [actual](actual/app.admin.subcategories-375.png) · [expected](expected/app.admin.subcategories-375.png) · [diff](diff/app.admin.subcategories-375.png) — 18.184% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.subcategories | 768 | pixel | FAIL | 273068 | 16.0668% | 768×1972 vs 768×2213 | [actual](actual/app.admin.subcategories-768.png) · [expected](expected/app.admin.subcategories-768.png) · [diff](diff/app.admin.subcategories-768.png) — 16.067% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.subcategories | 1024 | pixel | FAIL | 236451 | 11.4311% | 1024×2020 vs 1024×1876 | [actual](actual/app.admin.subcategories-1024.png) · [expected](expected/app.admin.subcategories-1024.png) · [diff](diff/app.admin.subcategories-1024.png) — 11.431% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.subcategories | 1440 | pixel | FAIL | 355206 | 13.4646% | 1440×1647 vs 1440×1832 | [actual](actual/app.admin.subcategories-1440.png) · [expected](expected/app.admin.subcategories-1440.png) · [diff](diff/app.admin.subcategories-1440.png) — 13.465% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.subsubcategories | 375 | token-only | UNVERIFIED | — | — | — | App tab "Sub-subcategories" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.subsubcategories | 768 | token-only | UNVERIFIED | — | — | — | App tab "Sub-subcategories" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.subsubcategories | 1024 | token-only | UNVERIFIED | — | — | — | App tab "Sub-subcategories" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |
| app.admin.subsubcategories | 1440 | token-only | UNVERIFIED | — | — | — | App tab "Sub-subcategories" has no design counterpart tab in ADMIN_TABS; verified through table and form tokens. |

## Font-face parity

Every executed row declared identical `@font-face` sets for the nine parity families.

## Reference adapter

Catalog snapshot `97b794cb99d8e4cc…` (9 categories, 1816 resources) bound to the design's `AV_*` globals; admin globals bound: AV_TOTAL_USERS, AV_USERS, AV_RECENT_ACTIVITY.

| File | Design literal | Served as | Source |
|---|---|---|---|
| home-layouts.jsx | `'+12 this week'` | `'+0 this week'` | count of catalog resources with createdAt inside the 7 days before the frozen clock |
| home-layouts.jsx | `CURATED · WEEK 37 ·` | `CURATED · WEEK 37 ·` | ISO week of the frozen clock |
| home-layouts.jsx | `['CONTRIBUTORS', 3, 'reviewing']` | `['CONTRIBUTORS', 9, 'reviewing']` | /api/admin/stats users (admin session only) |
| admin.jsx | `sub="across 9 categories"` | `sub="across 9 categories"` | nav category count |
| admin.jsx | `sub="2 admins · 1 contributor"` | `sub="5 admins · 4 contributors"` | /api/admin/users roles (admin session only) |
| admin.jsx | `value="7" sub="oldest 14m ago"` | `value="0" sub="nothing waiting"` | /api/admin/stats pendingApprovals + oldest /api/admin/pending-resources createdAt vs frozen clock (admin session only) |

## Capture contract

Chromium 148.0.7778.96; DPR 1; en-US; UTC; dark; reduced motion; viewport heights {"375":812,"768":1024,"1024":768,"1440":900}; pixelmatch threshold 0.1; includeAA false; ceiling 0.5% of the union canvas. Full-page captures; unequal sizes are compared on an unscaled union canvas where every unmatched pixel counts. No masking, no cropping, no post-processing. Normalisations applied to both sides: animations disabled; transitions disabled; caret hidden; backdrop-filter disabled on both sides (blur values compared via computed style); Chromium partial raster disabled (--disable-partial-raster): full-page capture re-rasters tiles per frame and reused tile content flipped single anti-aliased pixels between consecutive frames. Backdrop-filter values are compared per row via computed style before normalisation. Pre-seeded state: theme editorial × crimson on both sides; app localStorage {"ds-system":"editorial","ds-accent":"crimson","analytics-consent":"denied"}.

Determinism proof (standalone `--determinism 3` run `2026-09-12T23-21-07-982Z-38222`, reference side): 3 row/width cells captured 3 times each in fresh contexts — all 3 cells byte-identical (see [determinism.json](../../harness/determinism/determinism.json)).

Recoveries: no rate-limit waits; no deferrals; no document reloads or font-readiness reopens. Every event is listed in results.json under `configuration`.

Machine-readable result: [results.json](results.json); output hashes: OUTPUT-MANIFEST.json. The reference was served from an in-memory snapshot on an ephemeral loopback port; awesome-list-site-ds/ was not modified (raw and served hashes are both recorded).

Inputs changed during run: no. Live catalog/admin adapter hashes were re-read after the final row; 0 comparisons needed more than one raw frame before two consecutive frames were byte-identical; every attempt is retained.
