# Visual parity report

Run: `2026-09-13T03-02-57-145Z-9888`  
Claim: **selected-rows-diagnostic**  
Gate: **NOT PASSED** (exit code 1)  
Identity: disposable Clerk admin `2131539660` "Nick" (torn down: local row deleted, Clerk user deleted, 0 __qa_test_parity_ rows remaining)  
Frozen clock: `2026-09-13T03:02:00.000Z` on both sides.  
Denominator: 0 pass / 24 fail / **24** pixel rows executed. 0 row-incomplete, 0 blocked, 0 evidence-only, 0 token-only, 0 aliases, 0 not selected.

Selected run (`--only app.admin.export,app.admin.database,app.admin.users,app.admin.github,app.admin.linkhealth,app.admin.audit --width 375,768,1024,1440`): 24 rows executed; rows outside the selection are not listed and the gate is diagnostic only.

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
| app.admin.audit | 375 | pixel | FAIL | 1060505 | 66.9511% | 375×4224 vs 375×1498 | [actual](/actual/app.admin.audit-375.png) · [expected](/expected/app.admin.audit-375.png) · [diff](/diff/app.admin.audit-375.png) — 66.951% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.audit | 768 | pixel | FAIL | 1900125 | 65.9942% | 768×3749 vs 768×1355 | [actual](/actual/app.admin.audit-768.png) · [expected](/expected/app.admin.audit-768.png) · [diff](/diff/app.admin.audit-768.png) — 65.994% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.audit | 1024 | pixel | FAIL | 2746062 | 70.8882% | 1024×3783 vs 1024×1158 | [actual](/actual/app.admin.audit-1024.png) · [expected](/expected/app.admin.audit-1024.png) · [diff](/diff/app.admin.audit-1024.png) — 70.888% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.audit | 1440 | pixel | FAIL | 3602196 | 69.1985% | 1440×3615 vs 1440×1158 | [actual](/actual/app.admin.audit-1440.png) · [expected](/expected/app.admin.audit-1440.png) · [diff](/diff/app.admin.audit-1440.png) — 69.198% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.database | 375 | pixel | FAIL | 486907 | 44.4512% | 375×2921 vs 375×1763 | [actual](/actual/app.admin.database-375.png) · [expected](/expected/app.admin.database-375.png) · [diff](/diff/app.admin.database-375.png) — 44.451% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.database | 768 | pixel | FAIL | 803940 | 44.1686% | 768×2370 vs 768×1412 | [actual](/actual/app.admin.database-768.png) · [expected](/expected/app.admin.database-768.png) · [diff](/diff/app.admin.database-768.png) — 44.169% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.database | 1024 | pixel | FAIL | 854193 | 41.2548% | 1024×2022 vs 1024×1259 | [actual](/actual/app.admin.database-1024.png) · [expected](/expected/app.admin.database-1024.png) · [diff](/diff/app.admin.database-1024.png) — 41.255% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.database | 1440 | pixel | FAIL | 678539 | 28.0648% | 1440×1679 vs 1440×1259 | [actual](/actual/app.admin.database-1440.png) · [expected](/expected/app.admin.database-1440.png) · [diff](/diff/app.admin.database-1440.png) — 28.065% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.export | 375 | pixel | FAIL | 689160 | 61.1771% | 375×3004 vs 375×1425 | [actual](/actual/app.admin.export-375.png) · [expected](/expected/app.admin.export-375.png) · [diff](/diff/app.admin.export-375.png) — 61.177% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.export | 768 | pixel | FAIL | 1270457 | 65.7227% | 768×2517 vs 768×1024 | [actual](/actual/app.admin.export-768.png) · [expected](/expected/app.admin.export-768.png) · [diff](/diff/app.admin.export-768.png) — 65.723% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.export | 1024 | pixel | FAIL | 1335124 | 66.0168% | 1024×1975 vs 1024×768 | [actual](/actual/app.admin.export-1024.png) · [expected](/expected/app.admin.export-1024.png) · [diff](/diff/app.admin.export-1024.png) — 66.017% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.export | 1440 | pixel | FAIL | 1090773 | 48.2472% | 1440×1570 vs 1440×900 | [actual](/actual/app.admin.export-1440.png) · [expected](/expected/app.admin.export-1440.png) · [diff](/diff/app.admin.export-1440.png) — 48.247% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.github | 375 | pixel | FAIL | 1518894 | 80.8299% | 375×5011 vs 375×1065 | [actual](/actual/app.admin.github-375.png) · [expected](/expected/app.admin.github-375.png) · [diff](/diff/app.admin.github-375.png) — 80.830% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.github | 768 | pixel | FAIL | 2716373 | 79.0732% | 768×4473 vs 768×1024 | [actual](/actual/app.admin.github-768.png) · [expected](/expected/app.admin.github-768.png) · [diff](/diff/app.admin.github-768.png) — 79.073% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.github | 1024 | pixel | FAIL | 3769450 | 81.7297% | 1024×4504 vs 1024×877 | [actual](/actual/app.admin.github-1024.png) · [expected](/expected/app.admin.github-1024.png) · [diff](/diff/app.admin.github-1024.png) — 81.730% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.github | 1440 | pixel | FAIL | 4910323 | 79.9144% | 1440×4267 vs 1440×900 | [actual](/actual/app.admin.github-1440.png) · [expected](/expected/app.admin.github-1440.png) · [diff](/diff/app.admin.github-1440.png) — 79.914% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.linkhealth | 375 | pixel | FAIL | 448070 | 50.1618% | 375×2382 vs 375×1270 | [actual](/actual/app.admin.linkhealth-375.png) · [expected](/expected/app.admin.linkhealth-375.png) · [diff](/diff/app.admin.linkhealth-375.png) — 50.162% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.linkhealth | 768 | pixel | FAIL | 801458 | 51.8671% | 768×2012 vs 768×1024 | [actual](/actual/app.admin.linkhealth-768.png) · [expected](/expected/app.admin.linkhealth-768.png) · [diff](/diff/app.admin.linkhealth-768.png) — 51.867% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.linkhealth | 1024 | pixel | FAIL | 904553 | 54.2600% | 1024×1628 vs 1024×790 | [actual](/actual/app.admin.linkhealth-1024.png) · [expected](/expected/app.admin.linkhealth-1024.png) · [diff](/diff/app.admin.linkhealth-1024.png) — 54.260% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.linkhealth | 1440 | pixel | FAIL | 828806 | 39.9694% | 1440×1440 vs 1440×900 | [actual](/actual/app.admin.linkhealth-1440.png) · [expected](/expected/app.admin.linkhealth-1440.png) · [diff](/diff/app.admin.linkhealth-1440.png) — 39.969% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.users | 375 | pixel | FAIL | 249706 | 38.2691% | 375×1740 vs 375×1165 | [actual](/actual/app.admin.users-375.png) · [expected](/expected/app.admin.users-375.png) · [diff](/diff/app.admin.users-375.png) — 38.269% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.users | 768 | pixel | FAIL | 241501 | 22.5093% | 768×1397 vs 768×1146 | [actual](/actual/app.admin.users-768.png) · [expected](/expected/app.admin.users-768.png) · [diff](/diff/app.admin.users-768.png) — 22.509% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.users | 1024 | pixel | FAIL | 455025 | 31.1395% | 1024×1427 vs 1024×1031 | [actual](/actual/app.admin.users-1024.png) · [expected](/expected/app.admin.users-1024.png) · [diff](/diff/app.admin.users-1024.png) — 31.139% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.users | 1440 | pixel | FAIL | 514049 | 28.3541% | 1440×1259 vs 1440×936 | [actual](/actual/app.admin.users-1440.png) · [expected](/expected/app.admin.users-1440.png) · [diff](/diff/app.admin.users-1440.png) — 28.354% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |

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
