# Visual parity report

Run: `2026-09-13T14-08-58-481Z-22177`  
Claim: **selected-rows-diagnostic**  
Gate: **NOT PASSED** (exit code 1)  
Identity: disposable Clerk admin `2142670720` "Nick" (torn down: local row deleted, Clerk user deleted, 0 __qa_test_parity_ rows remaining)  
Frozen clock: `2026-09-13T14:08:00.000Z` on both sides.  
Denominator: 0 pass / 16 fail / **16** pixel rows executed. 0 row-incomplete, 0 blocked, 0 evidence-only, 0 token-only, 0 aliases, 0 not selected.

Selected run (`--only app.home.index,app.home.curated,app.shell.palette,app.shell.mobile-drawer --width 375,768,1024,1440`): 16 rows executed; rows outside the selection are not listed and the gate is diagnostic only.

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
| app.home.curated | 375 | pixel | FAIL | 102789 | 4.5404% | 375×6014 vs 375×6037 | [actual](/actual/app.home.curated-375.png) · [expected](/expected/app.home.curated-375.png) · [diff](/diff/app.home.curated-375.png) — 4.540% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.curated | 768 | pixel | FAIL | 89484 | 3.0319% | 768×3843 vs 768×3841 | [actual](/actual/app.home.curated-768.png) · [expected](/expected/app.home.curated-768.png) · [diff](/diff/app.home.curated-768.png) — 3.032% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.curated | 1024 | pixel | FAIL | 104540 | 3.0704% | 1024×3325 vs 1024×3322 | [actual](/actual/app.home.curated-1024.png) · [expected](/expected/app.home.curated-1024.png) · [diff](/diff/app.home.curated-1024.png) — 3.070% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.curated | 1440 | pixel | FAIL | 117381 | 3.0002% | 1440×2715 vs 1440×2717 | [actual](/actual/app.home.curated-1440.png) · [expected](/expected/app.home.curated-1440.png) · [diff](/diff/app.home.curated-1440.png) — 3.000% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.index | 375 | pixel | FAIL | 100554 | 4.3657% | 375×6141 vs 375×6142 | [actual](/actual/app.home.index-375.png) · [expected](/expected/app.home.index-375.png) · [diff](/diff/app.home.index-375.png) — 4.366% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.index | 768 | pixel | FAIL | 151282 | 4.5682% | 768×4312 vs 768×4284 | [actual](/actual/app.home.index-768.png) · [expected](/expected/app.home.index-768.png) · [diff](/diff/app.home.index-768.png) — 4.568% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.index | 1024 | pixel | FAIL | 173712 | 4.4986% | 1024×3771 vs 1024×3743 | [actual](/actual/app.home.index-1024.png) · [expected](/expected/app.home.index-1024.png) · [diff](/diff/app.home.index-1024.png) — 4.499% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.home.index | 1440 | pixel | FAIL | 156679 | 3.3938% | 1440×3206 vs 1440×3190 | [actual](/actual/app.home.index-1440.png) · [expected](/expected/app.home.index-1440.png) · [diff](/diff/app.home.index-1440.png) — 3.394% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.shell.mobile-drawer | 375 | pixel | FAIL | 97873 | 4.2493% | 375×6141 vs 375×6142 | [actual](/actual/app.shell.mobile-drawer-375.png) · [expected](/expected/app.shell.mobile-drawer-375.png) · [diff](/diff/app.shell.mobile-drawer-375.png) — 4.249% differing pixels exceeds the 0.5% ceiling |
| app.shell.mobile-drawer | 768 | pixel | FAIL | 147582 | 4.4565% | 768×4312 vs 768×4284 | [actual](/actual/app.shell.mobile-drawer-768.png) · [expected](/expected/app.shell.mobile-drawer-768.png) · [diff](/diff/app.shell.mobile-drawer-768.png) — 4.456% differing pixels exceeds the 0.5% ceiling |
| app.shell.mobile-drawer | 1024 | pixel | FAIL | 163856 | 4.2433% | 1024×3771 vs 1024×3743 | [actual](/actual/app.shell.mobile-drawer-1024.png) · [expected](/expected/app.shell.mobile-drawer-1024.png) · [diff](/diff/app.shell.mobile-drawer-1024.png) — 4.243% differing pixels exceeds the 0.5% ceiling |
| app.shell.mobile-drawer | 1440 | pixel | FAIL | 156679 | 3.3938% | 1440×3206 vs 1440×3190 | [actual](/actual/app.shell.mobile-drawer-1440.png) · [expected](/expected/app.shell.mobile-drawer-1440.png) · [diff](/diff/app.shell.mobile-drawer-1440.png) — 3.394% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.shell.palette | 375 | pixel | FAIL | 101195 | 4.3936% | 375×6141 vs 375×6142 | [actual](/actual/app.shell.palette-375.png) · [expected](/expected/app.shell.palette-375.png) · [diff](/diff/app.shell.palette-375.png) — 4.394% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)","blur(4px)"] vs reference ["blur(14px)","blur(2px)","blur(4px)"]) |
| app.shell.palette | 768 | pixel | FAIL | 144488 | 4.3631% | 768×4312 vs 768×4284 | [actual](/actual/app.shell.palette-768.png) · [expected](/expected/app.shell.palette-768.png) · [diff](/diff/app.shell.palette-768.png) — 4.363% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)","blur(4px)"] vs reference ["blur(14px)","blur(2px)","blur(4px)"]) |
| app.shell.palette | 1024 | pixel | FAIL | 164975 | 4.2723% | 1024×3771 vs 1024×3743 | [actual](/actual/app.shell.palette-1024.png) · [expected](/expected/app.shell.palette-1024.png) · [diff](/diff/app.shell.palette-1024.png) — 4.272% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)","blur(4px)"] vs reference ["blur(14px)","blur(2px)","blur(4px)"]) |
| app.shell.palette | 1440 | pixel | FAIL | 142254 | 3.0813% | 1440×3206 vs 1440×3190 | [actual](/actual/app.shell.palette-1440.png) · [expected](/expected/app.shell.palette-1440.png) · [diff](/diff/app.shell.palette-1440.png) — 3.081% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)","blur(4px)"] vs reference ["blur(14px)","blur(2px)","blur(4px)"]) |

## Font-face parity

Every executed row declared identical `@font-face` sets for the nine parity families.

## Reference adapter

Catalog snapshot `6b970393a1bfa397…` (9 categories, 1817 resources) bound to the design's `AV_*` globals; admin globals bound: AV_TOTAL_USERS, AV_USERS, AV_RECENT_ACTIVITY.

| File | Design literal | Served as | Source |
|---|---|---|---|
| home-layouts.jsx | `const recent = AV_RESOURCES.slice(0, 5);` | `const recent = [{"id":188321,"title":"Task549 audit resource 1789306143045-648107","cat":"general-tools","sub":null,"subsub":null,"desc":"A disposable resource for Task549 audit filtering and detail coverage.","tags":[],"featured":true,"url":"https://task549.invalid/audit/1789306143045-648107"},{"id":188015,"title":"srtdroid","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Native Java/Kotlin SRT protocol implementation for Android mobile streaming applications","tags":[],"featured":false,"url":"https://github.com/ThibaultBee/srtdroid"},{"id":188014,"title":"SRT CookBook - Projects and Applications","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Comprehensive curated directory of SRT-enabled projects and applications including VLC, FFmpeg, GStreamer, Wireshark, OBS Studio, and integration guides","tags":[],"featured":false,"url":"https://srtlab.github.io/srt-cookbook/apps/"},{"id":188013,"title":"HydraSRT","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Open-source SRT gateway and relay tool with multi-protocol conversion capabilities (SRT to RTMP/HLS), alternative to commercial Haivision SRT Gateway","tags":[],"featured":false,"url":"https://github.com/abc3/hydra-srt"},{"id":188012,"title":"CTA-WAVE Device Playback Task Force","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"CTA-WAVE working group repository discussing commercial DRM test coverage for PlayReady, Widevine, and FairPlay across different security levels","tags":[],"featured":false,"url":"https://github.com/cta-wave/device-playback-task-force"}];` | /api/home recent resources in approved/indexed order |
| home-layouts.jsx | `const recent = AV_RESOURCES.slice(6, 12);` | `const recent = [{"id":188321,"title":"Task549 audit resource 1789306143045-648107","cat":"general-tools","sub":null,"subsub":null,"desc":"A disposable resource for Task549 audit filtering and detail coverage.","tags":[],"featured":true,"url":"https://task549.invalid/audit/1789306143045-648107"},{"id":188015,"title":"srtdroid","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Native Java/Kotlin SRT protocol implementation for Android mobile streaming applications","tags":[],"featured":false,"url":"https://github.com/ThibaultBee/srtdroid"},{"id":188014,"title":"SRT CookBook - Projects and Applications","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Comprehensive curated directory of SRT-enabled projects and applications including VLC, FFmpeg, GStreamer, Wireshark, OBS Studio, and integration guides","tags":[],"featured":false,"url":"https://srtlab.github.io/srt-cookbook/apps/"},{"id":188013,"title":"HydraSRT","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Open-source SRT gateway and relay tool with multi-protocol conversion capabilities (SRT to RTMP/HLS), alternative to commercial Haivision SRT Gateway","tags":[],"featured":false,"url":"https://github.com/abc3/hydra-srt"},{"id":188012,"title":"CTA-WAVE Device Playback Task Force","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"CTA-WAVE working group repository discussing commercial DRM test coverage for PlayReady, Widevine, and FairPlay across different security levels","tags":[],"featured":false,"url":"https://github.com/cta-wave/device-playback-task-force"}];` | /api/home recent resources in approved/indexed order |
| home-layouts.jsx | `'+12 this week'` | `'+1 this week'` | /api/home approvedThisWeek (approvedAt with createdAt fallback) |
| home-layouts.jsx | `CURATED · WEEK 37 ·` | `CURATED · WEEK 37 ·` | ISO week of the frozen clock |
| home-layouts.jsx | `['CONTRIBUTORS', 3, 'reviewing']` | `['APPROVED THIS WEEK', 1, 'newly indexed']` | /api/home approvedThisWeek (approvedAt with createdAt fallback) |
| design-systems.jsx | `'--text-3': 'rgba(244,243,238,0.4)'` | `'--text-3': 'rgba(244,243,238,0.52)'` | approved expected-side Editorial AA contrast reconciliation (3.4:1 reference to 5.2:1 application) |
| admin.jsx | `sub="across 9 categories"` | `sub="across 9 categories"` | nav category count |
| admin.jsx | `sub="2 admins · 1 contributor"` | `sub="4 admins · 4 contributors"` | /api/admin/users roles (admin session only) |
| admin.jsx | `value="7" sub="oldest 14m ago"` | `value="0" sub="nothing waiting"` | /api/admin/stats pendingApprovals + oldest /api/admin/pending-resources createdAt vs frozen clock (admin session only) |
| home-layouts.jsx | `const kindCount = k => AV_RESOURCES.filter(k.match).length;` | `const kindCount = k => Number(window.AV_KIND_COUNTS?.[k.id] ?? AV_RESOURCES.filter(k.match).length);` | /api/resources/kinds/counts |
| home-layouts.jsx | `const featured = AV_RESOURCES.filter(r => r.featured).slice(0, 6);` | `const featured = (window.AV_HOME_FEATURED || AV_RESOURCES.filter(r => r.featured)).slice(0, 6);` | /api/home featured resource identities |
| home-layouts.jsx | `['FEATURED', AV_RESOURCES.filter(r => r.featured).length, 'hand-picked']` | `['FEATURED', Number(window.AV_HOME_FEATURED_COUNT ?? AV_RESOURCES.filter(r => r.featured).length), 'hand-picked']` | /api/home featuredCount |
| home-layouts.jsx | `['FEATURED', featured.length, 'this week']` | `['FEATURED', Number(window.AV_HOME_FEATURED_COUNT ?? featured.length), 'hand-picked']` | /api/home featuredCount and live curated stat label |

## Capture contract

Chromium 148.0.7778.96; DPR 1; en-US; UTC; dark; reduced motion; viewport heights {"375":812,"768":1024,"1024":768,"1440":900}; pixelmatch threshold 0.1; includeAA false; ceiling 0.5% of the union canvas. Full-page captures; unequal sizes are compared on an unscaled union canvas where every unmatched pixel counts. No masking, no cropping, no post-processing. Normalisations applied to both sides: animations disabled; transitions disabled; caret hidden; backdrop-filter disabled on both sides (blur values compared via computed style); Chromium partial raster disabled (--disable-partial-raster): full-page capture re-rasters tiles per frame and reused tile content flipped single anti-aliased pixels between consecutive frames. Backdrop-filter values are compared per row via computed style before normalisation. Pre-seeded state: theme editorial × crimson on both sides; app localStorage {"ds-system":"editorial","ds-accent":"crimson","analytics-consent":"denied"}.

Determinism proof (standalone `--determinism 3` run `2026-09-12T23-21-07-982Z-38222`, reference side): 3 row/width cells captured 3 times each in fresh contexts — all 3 cells byte-identical (see [determinism.json](../../../../docs/parity/evidence/harness/determinism/determinism.json)).

Recoveries: no rate-limit waits; no deferrals; no document reloads or font-readiness reopens. Every event is listed in results.json under `configuration`.

Machine-readable result: [results.json](/results.json); output hashes: OUTPUT-MANIFEST.json. The reference was served from an in-memory snapshot on an ephemeral loopback port; awesome-list-site-ds/ was not modified (raw and served hashes are both recorded).

Inputs changed during run: no. Live catalog/admin adapter hashes were re-read after the final row; 1 comparisons needed more than one raw frame before two consecutive frames were byte-identical; every attempt is retained.
