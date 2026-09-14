# Visual parity report

Run: `2026-09-13T11-36-32-173Z-2787`  
Claim: **selected-rows-diagnostic**  
Gate: **NOT PASSED** (exit code 1)  
Identity: disposable Clerk admin `2102544914` "Nick" (torn down: local row deleted, Clerk user deleted, 0 __qa_test_parity_ rows remaining)  
Frozen clock: `2026-09-13T11:36:00.000Z` on both sides.  
Denominator: 0 pass / 13 fail / **13** pixel rows executed. 0 row-incomplete, 0 blocked, 0 evidence-only, 0 token-only, 0 aliases, 0 not selected.

Selected run (`--only app.home.index,app.home.curated,app.shell.palette,app.shell.mobile-drawer --width 375,768,1024,1440`): 13 rows executed; rows outside the selection are not listed and the gate is diagnostic only.

## Eligibility

| Class | Screens | Meaning |
|---|---:|---|
| pixel | 47 | Compared pixel-for-pixel at 375/768/1024/1440 (or the row's declared widths); counted in the denominator. |
| token-only | 24 | Design has no counterpart; verified by token audits, never by pixels. |
| artifact-docs | 1 | Design-system docs chapters; captured as evidence, excluded from the denominator. |
| blocked | 12 | Cannot be compared yet; each row carries its reason. |

## Rows

| Screen | Width | Class | Status | Diff px | Diff % | Actual vs expected size | Evidence / reason |
|---|---:|---|---|---:|---:|---|---|
| app.home.curated | 375 | pixel | FAIL | 174741 | 8.7738% | 375×5311 vs 375×5098 | [actual](/actual/app.home.curated-375.png) · [expected](/expected/app.home.curated-375.png) · [diff](/diff/app.home.curated-375.png) — 8.774% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.curated | 768 | pixel | FAIL | 283497 | 10.7432% | 768×3436 vs 768×3197 | [actual](/actual/app.home.curated-768.png) · [expected](/expected/app.home.curated-768.png) · [diff](/diff/app.home.curated-768.png) — 10.743% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.curated | 1024 | pixel | FAIL | 205235 | 6.6675% | 1024×3006 vs 1024×2911 | [actual](/actual/app.home.curated-1024.png) · [expected](/expected/app.home.curated-1024.png) · [diff](/diff/app.home.curated-1024.png) — 6.667% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.curated | 1440 | pixel | FAIL | 305764 | 8.6987% | 1440×2441 vs 1440×2307 | [actual](/actual/app.home.curated-1440.png) · [expected](/expected/app.home.curated-1440.png) · [diff](/diff/app.home.curated-1440.png) — 8.699% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.index | 375 | pixel | FAIL | 452641 | 19.1381% | 375×6307 vs 375×5435 | [actual](/actual/app.home.index-375.png) · [expected](/expected/app.home.index-375.png) · [diff](/diff/app.home.index-375.png) — 19.138% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.index | 768 | pixel | FAIL | 634559 | 18.5507% | 768×4454 vs 768×3836 | [actual](/actual/app.home.index-768.png) · [expected](/expected/app.home.index-768.png) · [diff](/diff/app.home.index-768.png) — 18.551% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.index | 1024 | pixel | FAIL | 644550 | 15.7282% | 1024×4002 vs 1024×3529 | [actual](/actual/app.home.index-1024.png) · [expected](/expected/app.home.index-1024.png) · [diff](/diff/app.home.index-1024.png) — 15.728% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.index | 1440 | pixel | FAIL | 781298 | 15.7999% | 1440×3434 vs 1440×2976 | [actual](/actual/app.home.index-1440.png) · [expected](/expected/app.home.index-1440.png) · [diff](/diff/app.home.index-1440.png) — 15.800% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.shell.mobile-drawer | 375 | pixel | FAIL | 447407 | 18.9168% | 375×6307 vs 375×5435 | [actual](/actual/app.shell.mobile-drawer-375.png) · [expected](/expected/app.shell.mobile-drawer-375.png) · [diff](/diff/app.shell.mobile-drawer-375.png) — 18.917% differing pixels exceeds the 0.5% ceiling |
| app.shell.palette | 375 | pixel | FAIL | 450686 | 19.0555% | 375×6307 vs 375×5435 | [actual](/actual/app.shell.palette-375.png) · [expected](/expected/app.shell.palette-375.png) · [diff](/diff/app.shell.palette-375.png) — 19.055% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)","blur(4px)"] vs reference ["blur(14px)","blur(2px)","blur(4px)"]) |
| app.shell.palette | 768 | pixel | FAIL | 625469 | 18.2850% | 768×4454 vs 768×3836 | [actual](/actual/app.shell.palette-768.png) · [expected](/expected/app.shell.palette-768.png) · [diff](/diff/app.shell.palette-768.png) — 18.285% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)","blur(4px)"] vs reference ["blur(14px)","blur(2px)","blur(4px)"]) |
| app.shell.palette | 1024 | pixel | FAIL | 637758 | 15.5625% | 1024×4002 vs 1024×3529 | [actual](/actual/app.shell.palette-1024.png) · [expected](/expected/app.shell.palette-1024.png) · [diff](/diff/app.shell.palette-1024.png) — 15.562% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)","blur(4px)"] vs reference ["blur(14px)","blur(2px)","blur(4px)"]) |
| app.shell.palette | 1440 | pixel | FAIL | 768149 | 15.5340% | 1440×3434 vs 1440×2976 | [actual](/actual/app.shell.palette-1440.png) · [expected](/expected/app.shell.palette-1440.png) · [diff](/diff/app.shell.palette-1440.png) — 15.534% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)","blur(4px)"] vs reference ["blur(14px)","blur(2px)","blur(4px)"]) |

## Font-face parity

Every executed row declared identical `@font-face` sets for the nine parity families.

## Reference adapter

Catalog snapshot `753a9b2ee449d192…` (9 categories, 1816 resources) bound to the design's `AV_*` globals; admin globals bound: AV_TOTAL_USERS, AV_USERS, AV_RECENT_ACTIVITY.

| File | Design literal | Served as | Source |
|---|---|---|---|
| home-layouts.jsx | `const recent = AV_RESOURCES.slice(0, 5);` | `const recent = [{"id":188015,"title":"srtdroid","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Native Java/Kotlin SRT protocol implementation for Android mobile streaming applications","tags":[],"featured":false,"url":"https://github.com/ThibaultBee/srtdroid"},{"id":188014,"title":"SRT CookBook - Projects and Applications","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Comprehensive curated directory of SRT-enabled projects and applications including VLC, FFmpeg, GStreamer, Wireshark, OBS Studio, and integration guides","tags":[],"featured":false,"url":"https://srtlab.github.io/srt-cookbook/apps/"},{"id":188013,"title":"HydraSRT","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Open-source SRT gateway and relay tool with multi-protocol conversion capabilities (SRT to RTMP/HLS), alternative to commercial Haivision SRT Gateway","tags":[],"featured":false,"url":"https://github.com/abc3/hydra-srt"},{"id":188012,"title":"CTA-WAVE Device Playback Task Force","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"CTA-WAVE working group repository discussing commercial DRM test coverage for PlayReady, Widevine, and FairPlay across different security levels","tags":[],"featured":false,"url":"https://github.com/cta-wave/device-playback-task-force"},{"id":188011,"title":"DRMreview","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"Android application for checking DRM and HDCP security levels on mobile devices","tags":[],"featured":false,"url":"https://github.com/espio999/DRMreview"}];` | /api/home recent resources in approved/indexed order |
| home-layouts.jsx | `const recent = AV_RESOURCES.slice(6, 12);` | `const recent = [{"id":188015,"title":"srtdroid","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Native Java/Kotlin SRT protocol implementation for Android mobile streaming applications","tags":[],"featured":false,"url":"https://github.com/ThibaultBee/srtdroid"},{"id":188014,"title":"SRT CookBook - Projects and Applications","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Comprehensive curated directory of SRT-enabled projects and applications including VLC, FFmpeg, GStreamer, Wireshark, OBS Studio, and integration guides","tags":[],"featured":false,"url":"https://srtlab.github.io/srt-cookbook/apps/"},{"id":188013,"title":"HydraSRT","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Open-source SRT gateway and relay tool with multi-protocol conversion capabilities (SRT to RTMP/HLS), alternative to commercial Haivision SRT Gateway","tags":[],"featured":false,"url":"https://github.com/abc3/hydra-srt"},{"id":188012,"title":"CTA-WAVE Device Playback Task Force","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"CTA-WAVE working group repository discussing commercial DRM test coverage for PlayReady, Widevine, and FairPlay across different security levels","tags":[],"featured":false,"url":"https://github.com/cta-wave/device-playback-task-force"},{"id":188011,"title":"DRMreview","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"Android application for checking DRM and HDCP security levels on mobile devices","tags":[],"featured":false,"url":"https://github.com/espio999/DRMreview"}];` | /api/home recent resources in approved/indexed order |
| home-layouts.jsx | `'+12 this week'` | `'+0 this week'` | /api/home approvedThisWeek (approvedAt with createdAt fallback) |
| home-layouts.jsx | `CURATED · WEEK 37 ·` | `CURATED · WEEK 37 ·` | ISO week of the frozen clock |
| home-layouts.jsx | `['CONTRIBUTORS', 3, 'reviewing']` | `['CONTRIBUTORS', 9, 'reviewing']` | /api/admin/stats users (admin session only) |
| admin.jsx | `sub="across 9 categories"` | `sub="across 9 categories"` | nav category count |
| admin.jsx | `sub="2 admins · 1 contributor"` | `sub="4 admins · 5 contributors"` | /api/admin/users roles (admin session only) |
| admin.jsx | `value="7" sub="oldest 14m ago"` | `value="0" sub="nothing waiting"` | /api/admin/stats pendingApprovals + oldest /api/admin/pending-resources createdAt vs frozen clock (admin session only) |

## Capture contract

Chromium 148.0.7778.96; DPR 1; en-US; UTC; dark; reduced motion; viewport heights {"375":812,"768":1024,"1024":768,"1440":900}; pixelmatch threshold 0.1; includeAA false; ceiling 0.5% of the union canvas. Full-page captures; unequal sizes are compared on an unscaled union canvas where every unmatched pixel counts. No masking, no cropping, no post-processing. Normalisations applied to both sides: animations disabled; transitions disabled; caret hidden; backdrop-filter disabled on both sides (blur values compared via computed style); Chromium partial raster disabled (--disable-partial-raster): full-page capture re-rasters tiles per frame and reused tile content flipped single anti-aliased pixels between consecutive frames. Backdrop-filter values are compared per row via computed style before normalisation. Pre-seeded state: theme editorial × crimson on both sides; app localStorage {"ds-system":"editorial","ds-accent":"crimson","analytics-consent":"denied"}.

Determinism proof (standalone `--determinism 3` run `2026-09-12T23-21-07-982Z-38222`, reference side): 3 row/width cells captured 3 times each in fresh contexts — all 3 cells byte-identical (see [determinism.json](../../../../docs/parity/evidence/harness/determinism/determinism.json)).

Recoveries: no rate-limit waits; no deferrals; no document reloads or font-readiness reopens. Every event is listed in results.json under `configuration`.

Machine-readable result: [results.json](/results.json); output hashes: OUTPUT-MANIFEST.json. The reference was served from an in-memory snapshot on an ephemeral loopback port; awesome-list-site-ds/ was not modified (raw and served hashes are both recorded).

Inputs changed during run: no. Live catalog/admin adapter hashes were re-read after the final row; 2 comparisons needed more than one raw frame before two consecutive frames were byte-identical; every attempt is retained.
