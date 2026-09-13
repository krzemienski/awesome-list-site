# Visual parity report

Run: `2026-09-13T00-21-01-043Z-890`  
Claim: **visitor-evidence-only**  
Gate: **NOT PASSED** (exit code 0)  
Identity: visitor (`--as visitor`, --as visitor)  
Frozen clock: `2026-09-13T00:21:00.000Z` on both sides.  
Denominator: 0 pass / 0 fail / **0** pixel rows executed. 0 row-incomplete, 0 blocked, 5 evidence-only, 0 token-only, 4 aliases, 0 not selected.

Selected run (`--only app.shell.default,app.shell.mobile-drawer --width 375,768,1024,1440`): 9 rows executed; rows outside the selection are not listed and the gate is diagnostic only.

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
| app.home.index | 375 | pixel | EVIDENCE (visitor-identity) | 1121298 | 54.8345% | 375×2683 vs 375×5453 | [actual](/actual/app.home.index-375.png) · [expected](/expected/app.home.index-375.png) · [diff](/diff/app.home.index-375.png) — 54.835% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.index | 768 | pixel | EVIDENCE (visitor-identity) | 1678818 | 56.9854% | 768×1758 vs 768×3836 | [actual](/actual/app.home.index-768.png) · [expected](/expected/app.home.index-768.png) · [diff](/diff/app.home.index-768.png) — 56.985% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.index | 1024 | pixel | EVIDENCE (visitor-identity) | 2299039 | 63.6202% | 1024×1358 vs 1024×3529 | [actual](/actual/app.home.index-1024.png) · [expected](/expected/app.home.index-1024.png) · [diff](/diff/app.home.index-1024.png) — 63.620% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.index | 1440 | pixel | EVIDENCE (visitor-identity) | 2545203 | 59.3919% | 1440×1278 vs 1440×2976 | [actual](/actual/app.home.index-1440.png) · [expected](/expected/app.home.index-1440.png) · [diff](/diff/app.home.index-1440.png) — 59.392% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.shell.default | 375 | pixel | ALIAS | — | — | — | [actual](/actual/app.home.index-375.png) · [expected](/expected/app.home.index-375.png) · [diff](/diff/app.home.index-375.png) — Shares app.home.index's exact capture identity; excluded from the denominator to prevent double counting. |
| app.shell.default | 768 | pixel | ALIAS | — | — | — | [actual](/actual/app.home.index-768.png) · [expected](/expected/app.home.index-768.png) · [diff](/diff/app.home.index-768.png) — Shares app.home.index's exact capture identity; excluded from the denominator to prevent double counting. |
| app.shell.default | 1024 | pixel | ALIAS | — | — | — | [actual](/actual/app.home.index-1024.png) · [expected](/expected/app.home.index-1024.png) · [diff](/diff/app.home.index-1024.png) — Shares app.home.index's exact capture identity; excluded from the denominator to prevent double counting. |
| app.shell.default | 1440 | pixel | ALIAS | — | — | — | [actual](/actual/app.home.index-1440.png) · [expected](/expected/app.home.index-1440.png) · [diff](/diff/app.home.index-1440.png) — Shares app.home.index's exact capture identity; excluded from the denominator to prevent double counting. |
| app.shell.mobile-drawer | 375 | pixel | EVIDENCE (visitor-identity) | 1114174 | 54.4862% | 375×2683 vs 375×5453 | [actual](/actual/app.shell.mobile-drawer-375.png) · [expected](/expected/app.shell.mobile-drawer-375.png) · [diff](/diff/app.shell.mobile-drawer-375.png) — 54.486% differing pixels exceeds the 0.5% ceiling |

## Font-face parity

Every executed row declared identical `@font-face` sets for the nine parity families.

## Reference adapter

Catalog snapshot `97b794cb99d8e4cc…` (9 categories, 1816 resources) bound to the design's `AV_*` globals; admin globals bound: none (no admin session).

| File | Design literal | Served as | Source |
|---|---|---|---|
| home-layouts.jsx | `'+12 this week'` | `'+0 this week'` | count of catalog resources with createdAt inside the 7 days before the frozen clock |
| home-layouts.jsx | `CURATED · WEEK 37 ·` | `CURATED · WEEK 37 ·` | ISO week of the frozen clock |
| admin.jsx | `sub="across 9 categories"` | `sub="across 9 categories"` | nav category count |
| home-layouts.jsx | `['CONTRIBUTORS', 3, 'reviewing']` | *(unchanged)* | /api/admin/stats users (admin session only) not available in this run |
| admin.jsx | `sub="2 admins · 1 contributor"` | *(unchanged)* | /api/admin/users roles (admin session only) not available in this run |
| admin.jsx | `value="7" sub="oldest 14m ago"` | *(unchanged)* | /api/admin/stats pendingApprovals + oldest /api/admin/pending-resources createdAt vs frozen clock (admin session only) not available in this run |

## Capture contract

Chromium 148.0.7778.96; DPR 1; en-US; UTC; dark; reduced motion; viewport heights {"375":812,"768":1024,"1024":768,"1440":900}; pixelmatch threshold 0.1; includeAA false; ceiling 0.5% of the union canvas. Full-page captures; unequal sizes are compared on an unscaled union canvas where every unmatched pixel counts. No masking, no cropping, no post-processing. Normalisations applied to both sides: animations disabled; transitions disabled; caret hidden; backdrop-filter disabled on both sides (blur values compared via computed style); Chromium partial raster disabled (--disable-partial-raster): full-page capture re-rasters tiles per frame and reused tile content flipped single anti-aliased pixels between consecutive frames. Backdrop-filter values are compared per row via computed style before normalisation. Pre-seeded state: theme editorial × crimson on both sides; app localStorage {"ds-system":"editorial","ds-accent":"crimson","analytics-consent":"denied"}.

Determinism proof (standalone `--determinism 3` run `2026-09-12T23-21-07-982Z-38222`, reference side): 3 row/width cells captured 3 times each in fresh contexts — all 3 cells byte-identical (see [determinism.json](../../../../docs/parity/evidence/harness/determinism/determinism.json)).

Recoveries: no rate-limit waits; no deferrals; no document reloads or font-readiness reopens. Every event is listed in results.json under `configuration`.

Machine-readable result: [results.json](/results.json); output hashes: OUTPUT-MANIFEST.json. The reference was served from an in-memory snapshot on an ephemeral loopback port; awesome-list-site-ds/ was not modified (raw and served hashes are both recorded).

Inputs changed during run: no. Live catalog/admin adapter hashes were re-read after the final row; 
