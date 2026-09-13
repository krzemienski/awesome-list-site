# Visual parity report

Run: `2026-09-13T00-21-03-288Z-1418`  
Claim: **selected-rows-diagnostic**  
Gate: **NOT PASSED** (exit code 1)  
Identity: disposable Clerk admin `2095453255` "Nick" (torn down: local row deleted, Clerk user deleted, 1 __qa_test_parity_ rows remaining)  
Frozen clock: `2026-09-13T00:21:00.000Z` on both sides.  
Denominator: 0 pass / 4 fail / **4** pixel rows executed. 0 row-incomplete, 0 blocked, 0 evidence-only, 0 token-only, 0 aliases, 0 not selected.

Selected run (`--only app.shell.palette --width 375,768,1024,1440`): 4 rows executed; rows outside the selection are not listed and the gate is diagnostic only.

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
| app.shell.palette | 375 | pixel | FAIL | 1245609 | 39.7466% | 375×8357 vs 375×5453 | [actual](/actual/app.shell.palette-375.png) · [expected](/expected/app.shell.palette-375.png) · [diff](/diff/app.shell.palette-375.png) — 39.747% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)","blur(4px)"] vs reference ["blur(14px)","blur(2px)","blur(4px)"]) |
| app.shell.palette | 768 | pixel | FAIL | 1097494 | 28.3313% | 768×5044 vs 768×3836 | [actual](/actual/app.shell.palette-768.png) · [expected](/expected/app.shell.palette-768.png) · [diff](/diff/app.shell.palette-768.png) — 28.331% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)","blur(4px)"] vs reference ["blur(14px)","blur(2px)","blur(4px)"]) |
| app.shell.palette | 1024 | pixel | FAIL | 1107220 | 24.4410% | 1024×4424 vs 1024×3529 | [actual](/actual/app.shell.palette-1024.png) · [expected](/expected/app.shell.palette-1024.png) · [diff](/diff/app.shell.palette-1024.png) — 24.441% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)","blur(4px)"] vs reference ["blur(14px)","blur(2px)","blur(4px)"]) |
| app.shell.palette | 1440 | pixel | FAIL | 1694410 | 29.2269% | 1440×4026 vs 1440×2976 | [actual](/actual/app.shell.palette-1440.png) · [expected](/expected/app.shell.palette-1440.png) · [diff](/diff/app.shell.palette-1440.png) — 29.227% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)","blur(4px)"] vs reference ["blur(14px)","blur(2px)","blur(4px)"]) |

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

Determinism proof (standalone `--determinism 3` run `2026-09-12T23-21-07-982Z-38222`, reference side): 3 row/width cells captured 3 times each in fresh contexts — all 3 cells byte-identical (see [determinism.json](../../../../docs/parity/evidence/harness/determinism/determinism.json)).

Recoveries: no rate-limit waits; no deferrals; no document reloads or font-readiness reopens. Every event is listed in results.json under `configuration`.

Machine-readable result: [results.json](/results.json); output hashes: OUTPUT-MANIFEST.json. The reference was served from an in-memory snapshot on an ephemeral loopback port; awesome-list-site-ds/ was not modified (raw and served hashes are both recorded).

Inputs changed during run: no. Live catalog/admin adapter hashes were re-read after the final row; 0 comparisons needed more than one raw frame before two consecutive frames were byte-identical; every attempt is retained.
