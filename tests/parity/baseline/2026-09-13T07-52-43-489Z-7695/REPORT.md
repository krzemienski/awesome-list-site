# Visual parity report

Run: `2026-09-13T07-52-43-489Z-7695`  
Claim: **selected-rows-diagnostic**  
Gate: **NOT PASSED** (exit code 1)  
Identity: disposable Clerk admin `2142356914` "Nick" (torn down: local row deleted, Clerk user deleted, 0 __qa_test_parity_ rows remaining)  
Frozen clock: `2026-09-13T07:52:00.000Z` on both sides.  
Denominator: 0 pass / 16 fail / **16** pixel rows executed. 0 row-incomplete, 4 blocked, 0 evidence-only, 0 token-only, 0 aliases, 0 not selected.

Selected run (`--only app.admin.approvals,app.admin.edits,app.admin.enrichment,app.admin.researcher,app.admin.research --width 375,768,1024,1440`): 20 rows executed; rows outside the selection are not listed and the gate is diagnostic only.

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
| app.admin.approvals | 375 | pixel | FAIL | 87352 | 20.9855% | 375×957 vs 375×1110 | [actual](/actual/app.admin.approvals-375.png) · [expected](/expected/app.admin.approvals-375.png) · [diff](/diff/app.admin.approvals-375.png) — 20.985% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.approvals | 768 | pixel | FAIL | 39645 | 5.0411% | 768×1024 vs 768×1024 | [actual](/actual/app.admin.approvals-768.png) · [expected](/expected/app.admin.approvals-768.png) · [diff](/diff/app.admin.approvals-768.png) — 5.041% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.approvals | 1024 | pixel | FAIL | 193749 | 20.8609% | 1024×907 vs 1024×768 | [actual](/actual/app.admin.approvals-1024.png) · [expected](/expected/app.admin.approvals-1024.png) · [diff](/diff/app.admin.approvals-1024.png) — 20.861% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.approvals | 1440 | pixel | FAIL | 51990 | 4.0116% | 1440×900 vs 1440×900 | [actual](/actual/app.admin.approvals-1440.png) · [expected](/expected/app.admin.approvals-1440.png) · [diff](/diff/app.admin.approvals-1440.png) — 4.012% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.edits | 375 | pixel | FAIL | 68951 | 19.7497% | 375×931 vs 375×812 | [actual](/actual/app.admin.edits-375.png) · [expected](/expected/app.admin.edits-375.png) · [diff](/diff/app.admin.edits-375.png) — 19.750% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.edits | 768 | pixel | FAIL | 25135 | 3.1961% | 768×1024 vs 768×1024 | [actual](/actual/app.admin.edits-768.png) · [expected](/expected/app.admin.edits-768.png) · [diff](/diff/app.admin.edits-768.png) — 3.196% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.edits | 1024 | pixel | FAIL | 152075 | 16.8571% | 1024×881 vs 1024×768 | [actual](/actual/app.admin.edits-1024.png) · [expected](/expected/app.admin.edits-1024.png) · [diff](/diff/app.admin.edits-1024.png) — 16.857% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.edits | 1440 | pixel | FAIL | 37693 | 2.9084% | 1440×900 vs 1440×900 | [actual](/actual/app.admin.edits-1440.png) · [expected](/expected/app.admin.edits-1440.png) · [diff](/diff/app.admin.edits-1440.png) — 2.908% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.enrichment | 375 | pixel | FAIL | 153682 | 22.6294% | 375×1811 vs 375×1526 | [actual](/actual/app.admin.enrichment-375.png) · [expected](/expected/app.admin.enrichment-375.png) · [diff](/diff/app.admin.enrichment-375.png) — 22.629% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.enrichment | 768 | pixel | FAIL | 511413 | 40.9282% | 768×1627 vs 768×1024 | [actual](/actual/app.admin.enrichment-768.png) · [expected](/expected/app.admin.enrichment-768.png) · [diff](/diff/app.admin.enrichment-768.png) — 40.928% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.enrichment | 1024 | pixel | FAIL | 737463 | 44.1557% | 1024×1631 vs 1024×970 | [actual](/actual/app.admin.enrichment-1024.png) · [expected](/expected/app.admin.enrichment-1024.png) · [diff](/diff/app.admin.enrichment-1024.png) — 44.156% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.enrichment | 1440 | pixel | FAIL | 850335 | 38.9262% | 1440×1517 vs 1440×970 | [actual](/actual/app.admin.enrichment-1440.png) · [expected](/expected/app.admin.enrichment-1440.png) · [diff](/diff/app.admin.enrichment-1440.png) — 38.926% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.research | 375 | blocked | BLOCKED | — | — | — | Design tab "Research" (the 15th ADMIN_TABS entry) has no app counterpart; the app folds research into the Researcher tab. |
| app.admin.research | 768 | blocked | BLOCKED | — | — | — | Design tab "Research" (the 15th ADMIN_TABS entry) has no app counterpart; the app folds research into the Researcher tab. |
| app.admin.research | 1024 | blocked | BLOCKED | — | — | — | Design tab "Research" (the 15th ADMIN_TABS entry) has no app counterpart; the app folds research into the Researcher tab. |
| app.admin.research | 1440 | blocked | BLOCKED | — | — | — | Design tab "Research" (the 15th ADMIN_TABS entry) has no app counterpart; the app folds research into the Researcher tab. |
| app.admin.researcher | 375 | pixel | FAIL | 317061 | 43.4256% | 375×1947 vs 375×1211 | [actual](/actual/app.admin.researcher-375.png) · [expected](/expected/app.admin.researcher-375.png) · [diff](/diff/app.admin.researcher-375.png) — 43.426% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.researcher | 768 | pixel | FAIL | 516681 | 40.9472% | 768×1643 vs 768×1024 | [actual](/actual/app.admin.researcher-768.png) · [expected](/expected/app.admin.researcher-768.png) · [diff](/diff/app.admin.researcher-768.png) — 40.947% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.researcher | 1024 | pixel | FAIL | 757805 | 44.3671% | 1024×1668 vs 1024×980 | [actual](/actual/app.admin.researcher-1024.png) · [expected](/expected/app.admin.researcher-1024.png) · [diff](/diff/app.admin.researcher-1024.png) — 44.367% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.researcher | 1440 | pixel | FAIL | 607317 | 30.9426% | 1440×1363 vs 1440×980 | [actual](/actual/app.admin.researcher-1440.png) · [expected](/expected/app.admin.researcher-1440.png) · [diff](/diff/app.admin.researcher-1440.png) — 30.943% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |

## Font-face parity

Every executed row declared identical `@font-face` sets for the nine parity families.

## Reference adapter

Catalog snapshot `97b794cb99d8e4cc…` (9 categories, 1816 resources) bound to the design's `AV_*` globals; admin globals bound: AV_TOTAL_USERS, AV_USERS, AV_RECENT_ACTIVITY.

| File | Design literal | Served as | Source |
|---|---|---|---|
| home-layouts.jsx | `'+12 this week'` | `'+0 this week'` | count of catalog resources with createdAt inside the 7 days before the frozen clock |
| home-layouts.jsx | `CURATED · WEEK 37 ·` | `CURATED · WEEK 37 ·` | ISO week of the frozen clock |
| home-layouts.jsx | `['CONTRIBUTORS', 3, 'reviewing']` | `['CONTRIBUTORS', 8, 'reviewing']` | /api/admin/stats users (admin session only) |
| admin.jsx | `sub="across 9 categories"` | `sub="across 9 categories"` | nav category count |
| admin.jsx | `sub="2 admins · 1 contributor"` | `sub="4 admins · 4 contributors"` | /api/admin/users roles (admin session only) |
| admin.jsx | `value="7" sub="oldest 14m ago"` | `value="0" sub="nothing waiting"` | /api/admin/stats pendingApprovals + oldest /api/admin/pending-resources createdAt vs frozen clock (admin session only) |

## Capture contract

Chromium 148.0.7778.96; DPR 1; en-US; UTC; dark; reduced motion; viewport heights {"375":812,"768":1024,"1024":768,"1440":900}; pixelmatch threshold 0.1; includeAA false; ceiling 0.5% of the union canvas. Full-page captures; unequal sizes are compared on an unscaled union canvas where every unmatched pixel counts. No masking, no cropping, no post-processing. Normalisations applied to both sides: animations disabled; transitions disabled; caret hidden; backdrop-filter disabled on both sides (blur values compared via computed style); Chromium partial raster disabled (--disable-partial-raster): full-page capture re-rasters tiles per frame and reused tile content flipped single anti-aliased pixels between consecutive frames. Backdrop-filter values are compared per row via computed style before normalisation. Pre-seeded state: theme editorial × crimson on both sides; app localStorage {"ds-system":"editorial","ds-accent":"crimson","analytics-consent":"denied"}.

Determinism proof (standalone `--determinism 3` run `2026-09-12T23-21-07-982Z-38222`, reference side): 3 row/width cells captured 3 times each in fresh contexts — all 3 cells byte-identical (see [determinism.json](../../../../docs/parity/evidence/harness/determinism/determinism.json)).

Recoveries: no rate-limit waits; no deferrals; no document reloads or font-readiness reopens. Every event is listed in results.json under `configuration`.

Machine-readable result: [results.json](/results.json); output hashes: OUTPUT-MANIFEST.json. The reference was served from an in-memory snapshot on an ephemeral loopback port; awesome-list-site-ds/ was not modified (raw and served hashes are both recorded).

Inputs changed during run: no. Live catalog/admin adapter hashes were re-read after the final row; 0 comparisons needed more than one raw frame before two consecutive frames were byte-identical; every attempt is retained.
