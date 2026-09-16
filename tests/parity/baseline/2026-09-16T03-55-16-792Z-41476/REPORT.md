# Visual parity report

Run: `2026-09-16T03-55-16-792Z-41476`  
Claim: **selected-rows-diagnostic**  
Gate: **NOT PASSED** (exit code 1)  
Identity: disposable Clerk admin `2127149343` "Nick Krzemienski" (torn down: local row deleted, Clerk user deleted, 2 __qa_test_parity_ rows remaining)  
Frozen clock: `2026-09-16T03:55:00.000Z` on both sides.  
Denominator: 0 pass / 3 fail / **3** pixel rows executed. 0 row-incomplete, 0 blocked, 0 evidence-only, 0 token-only, 0 aliases, 0 not selected.

Selected run (`--only app.admin.audit,app.admin.categories,app.admin.subcategories --width 768`): 3 rows executed; rows outside the selection are not listed and the gate is diagnostic only.

## Eligibility

| Class | Screens | Meaning |
|---|---:|---|
| pixel | 47 | Compared pixel-for-pixel at 375/768/1024/1440 (or the row's declared widths); counted in the denominator. |
| token-only | 25 | Design has no counterpart; verified by token audits, never by pixels. |
| artifact-docs | 1 | Design-system docs chapters; captured as evidence, excluded from the denominator. |
| blocked | 10 | Cannot be compared yet; each row carries its reason. |

## Rows

| Screen | Width | Class | Status | Diff px | Diff % | Actual vs expected size | Evidence / reason |
|---|---:|---|---|---:|---:|---|---|
| app.admin.audit | 768 | pixel | FAIL | 876381 | 26.0768% | 768×3317 vs 768×4376 | [actual](/actual/app.admin.audit-768.png) · [expected](/expected/app.admin.audit-768.png) · [diff](/diff/app.admin.audit-768.png) — 26.077% differing pixels exceeds the 0.5% ceiling |
| app.admin.categories | 768 | pixel | FAIL | 40899 | 4.8063% | 768×1108 vs 768×1086 | [actual](/actual/app.admin.categories-768.png) · [expected](/expected/app.admin.categories-768.png) · [diff](/diff/app.admin.categories-768.png) — 4.806% differing pixels exceeds the 0.5% ceiling |
| app.admin.subcategories | 768 | pixel | FAIL | 195093 | 10.6332% | 768×2389 vs 768×2213 | [actual](/actual/app.admin.subcategories-768.png) · [expected](/expected/app.admin.subcategories-768.png) · [diff](/diff/app.admin.subcategories-768.png) — 10.633% differing pixels exceeds the 0.5% ceiling |

## Font-face parity

Every executed row declared identical `@font-face` sets for the nine parity families.

## Reference adapter

Catalog snapshot `3787bcda70ba727d…` (9 categories, 1816 resources) bound to the design's `AV_*` globals; admin globals bound: AV_RETAINED_OPERATIONS, AV_RETAINED_CATALOG, AV_TOTAL_USERS, AV_USERS, AV_SYNC_JOBS, AV_ADMIN_RESOURCES, AV_RECENT_ACTIVITY, AV_PENDING_APPROVALS, AV_PENDING_RESOURCES, AV_AUDIT_LOGS, AV_AUDIT_TOTAL, AV_CONTACT_SUBMISSIONS.

| File | Design literal | Served as | Source |
|---|---|---|---|
| home-layouts.jsx | `const recent = AV_RESOURCES.slice(0, 5);` | `const recent = [{"id":188015,"title":"srtdroid","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Native Java/Kotlin SRT protocol implementation for Android mobile streaming applications","tags":[],"featured":false,"url":"https://github.com/ThibaultBee/srtdroid"},{"id":188014,"title":"SRT CookBook - Projects and Applications","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Comprehensive curated directory of SRT-enabled projects and applications including VLC, FFmpeg, GStreamer, Wireshark, OBS Studio, and integration guides","tags":[],"featured":false,"url":"https://srtlab.github.io/srt-cookbook/apps/"},{"id":188013,"title":"HydraSRT","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Open-source SRT gateway and relay tool with multi-protocol conversion capabilities (SRT to RTMP/HLS), alternative to commercial Haivision SRT Gateway","tags":[],"featured":false,"url":"https://github.com/abc3/hydra-srt"},{"id":188012,"title":"CTA-WAVE Device Playback Task Force","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"CTA-WAVE working group repository discussing commercial DRM test coverage for PlayReady, Widevine, and FairPlay across different security levels","tags":[],"featured":false,"url":"https://github.com/cta-wave/device-playback-task-force"},{"id":188011,"title":"DRMreview","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"Android application for checking DRM and HDCP security levels on mobile devices","tags":[],"featured":false,"url":"https://github.com/espio999/DRMreview"}];` | /api/home recent resources in approved/indexed order |
| home-layouts.jsx | `const recent = AV_RESOURCES.slice(6, 12);` | `const recent = [{"id":188015,"title":"srtdroid","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Native Java/Kotlin SRT protocol implementation for Android mobile streaming applications","tags":[],"featured":false,"url":"https://github.com/ThibaultBee/srtdroid"},{"id":188014,"title":"SRT CookBook - Projects and Applications","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Comprehensive curated directory of SRT-enabled projects and applications including VLC, FFmpeg, GStreamer, Wireshark, OBS Studio, and integration guides","tags":[],"featured":false,"url":"https://srtlab.github.io/srt-cookbook/apps/"},{"id":188013,"title":"HydraSRT","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Open-source SRT gateway and relay tool with multi-protocol conversion capabilities (SRT to RTMP/HLS), alternative to commercial Haivision SRT Gateway","tags":[],"featured":false,"url":"https://github.com/abc3/hydra-srt"},{"id":188012,"title":"CTA-WAVE Device Playback Task Force","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"CTA-WAVE working group repository discussing commercial DRM test coverage for PlayReady, Widevine, and FairPlay across different security levels","tags":[],"featured":false,"url":"https://github.com/cta-wave/device-playback-task-force"},{"id":188011,"title":"DRMreview","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"Android application for checking DRM and HDCP security levels on mobile devices","tags":[],"featured":false,"url":"https://github.com/espio999/DRMreview"}];` | /api/home recent resources in approved/indexed order |
| home-layouts.jsx | `'+12 this week'` | `'+0 this week'` | /api/home approvedThisWeek (approvedAt with createdAt fallback) |
| home-layouts.jsx | `CURATED · WEEK 37 ·` | `CURATED · WEEK 38 ·` | ISO week of the frozen clock |
| home-layouts.jsx | `['CONTRIBUTORS', 3, 'reviewing']` | `['APPROVED THIS WEEK', 0, 'newly indexed']` | /api/home approvedThisWeek (approvedAt with createdAt fallback) |
| design-systems.jsx | `'--text-3': 'rgba(244,243,238,0.4)'` | `'--text-3': 'rgba(244,243,238,0.52)'` | approved expected-side Editorial AA contrast reconciliation (3.4:1 reference to 5.2:1 application) |
| admin.jsx | `sub="across 9 categories"` | `sub="across 9 categories"` | nav category count |
| admin.jsx | `const filtered = AV_RESOURCES.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));` | `const filtered = (window.AV_ADMIN_RESOURCES || AV_RESOURCES).filter(r => r.title.toLowerCase().includes(search.toLowerCase()));` | /api/admin/resources default 25-row page (admin session only) |
| admin.jsx | `title={`Resources (${AV_RESOURCES.length} of ${AV_TOTAL.toLocaleString()})`}` | `title={`Resources (${(window.AV_ADMIN_RESOURCES || AV_RESOURCES).length} of ${AV_TOTAL.toLocaleString()})`}` | /api/admin/resources default page size (admin session only) |
| admin.jsx | `sub="2 admins · 1 contributor"` | `sub="5 admins · 5 contributors"` | /api/admin/users roles (admin session only) |
| admin.jsx | `value="7" sub="oldest 14m ago"` | `value="0" sub="nothing waiting"` | /api/admin/stats pendingApprovals + oldest /api/admin/pending-resources createdAt vs frozen clock (admin session only) |
| admin.jsx | `  const pending = [
    { id: 1, title: 'WebCodecs API Reference', cat: 'Standards', user: 'guest', time: '14m ago' },
    { id: 2, title: 'av1-encoder-bench', cat: 'Encoding', user: 'guest', time: '1h ago' },
    { id: 3, title: 'OBS Lua Plugin Helper', cat: 'Media Tools', user: 'mhanssen', time: '3h ago' },
    { id: 4, title: 'low-latency-cmaf-spec.pdf', cat: 'Standards', user: 'guest', time: '5h ago' },
    { id: 5, title: 'react-native-track-player', cat: 'Players', user: 'guest', time: '1d ago' },
  ];` | `  const pending = [];` | /api/admin/pending-resources (same unfiltered queue consumed by the Approvals tab; an empty live queue is authoritative) |
| home-layouts.jsx | `<button className="btn primary" onClick={() => go('submit')} style={{ width: '100%' }}>` | `<button className="btn primary" onClick={() => go('submit')} style={{ width: '100%', minHeight: 44 }}>` | User-approved Home Submit 44px minimum target reconciliation (2026-09-13) |
| home-layouts.jsx | `<button className="btn ghost" onClick={() => go('category', { cat: AV_CATEGORIES[1] })}>Browse all →</button>` | `<button className="btn ghost" style={{ minHeight: 44 }} onClick={() => go('category', { cat: AV_CATEGORIES[1] })}>Browse all →</button>` | User-approved Home Browse 44px minimum target reconciliation (2026-09-13) |
| home-layouts.jsx | `const kindCount = k => AV_RESOURCES.filter(k.match).length;` | `const kindCount = k => Number(window.AV_KIND_COUNTS?.[k.id] ?? AV_RESOURCES.filter(k.match).length);` | /api/resources/kinds/counts |
| home-layouts.jsx | `const featured = AV_RESOURCES.filter(r => r.featured).slice(0, 6);` | `const featured = (window.AV_HOME_FEATURED || AV_RESOURCES.filter(r => r.featured)).slice(0, 6);` | /api/home featured resource identities |
| home-layouts.jsx | `['FEATURED', AV_RESOURCES.filter(r => r.featured).length, 'hand-picked']` | `['FEATURED', Number(window.AV_HOME_FEATURED_COUNT ?? AV_RESOURCES.filter(r => r.featured).length), 'hand-picked']` | /api/home featuredCount |
| home-layouts.jsx | `['FEATURED', featured.length, 'this week']` | `['FEATURED', Number(window.AV_HOME_FEATURED_COUNT ?? featured.length), 'hand-picked']` | /api/home featuredCount and live curated stat label |
| home-layouts.jsx | `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {featured.map((r, i) => <ResCard key={r.id} r={r} go={go} delay={i * 40} />)}
        </div>` | `{featured.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {featured.map((r, i) => <ResCard key={r.id} r={r} go={go} delay={i * 40} />)}
          </div>
        ) : (
          <p className="home-empty-section">No featured resources have been selected yet.</p>
        )}` | /api/home featured[] empty state |

## Capture contract

Chromium 148.0.7778.96; DPR 1; en-US; UTC; dark; reduced motion; viewport heights {"375":812,"768":1024,"1024":768,"1440":900}; pixelmatch threshold 0.1; includeAA false; ceiling 0.5% of the union canvas. Full-page captures; unequal sizes are compared on an unscaled union canvas where every unmatched pixel counts. No masking, no cropping, no post-processing. Normalisations applied to both sides: animations disabled; transitions disabled; caret hidden; backdrop-filter disabled on both sides (blur values compared via computed style); Chromium partial raster disabled (--disable-partial-raster): full-page capture re-rasters tiles per frame and reused tile content flipped single anti-aliased pixels between consecutive frames. Backdrop-filter values are compared per row via computed style before normalisation. Pre-seeded state: theme editorial × crimson on both sides; app localStorage {"ds-system":"editorial","ds-accent":"crimson","analytics-consent":"denied"}.

Determinism proof (standalone `--determinism 3` run `2026-09-12T23-21-07-982Z-38222`, reference side): 3 row/width cells captured 3 times each in fresh contexts — all 3 cells byte-identical (see [determinism.json](../../../../docs/parity/evidence/harness/determinism/determinism.json)).

Recoveries: no rate-limit waits; no deferrals; no document reloads or font-readiness reopens. Every event is listed in results.json under `configuration`.

Machine-readable result: [results.json](/results.json); output hashes: OUTPUT-MANIFEST.json. The reference was served from an in-memory snapshot on an ephemeral loopback port; awesome-list-site-ds/ was not modified (raw and served hashes are both recorded).

Inputs changed during run: no. Live catalog/admin adapter hashes were re-read after the final row; 0 comparisons needed more than one raw frame before two consecutive frames were byte-identical; every attempt is retained.
