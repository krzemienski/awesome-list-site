# Visual parity report

Run: `2026-09-17T22-54-02-690Z-16616`  
Claim: **visitor-evidence-only**  
Gate: **NOT PASSED** (exit code 0)  
Identity: visitor (`--as visitor`, --as visitor)  
Frozen clock: `2026-09-17T22:54:00.000Z` on both sides.  
Denominator: 0 pass / 0 fail / **0** pixel rows executed. 0 row-incomplete, 0 blocked, 2 evidence-only, 0 token-only, 0 aliases, 0 not selected.

Selected run (`--only app.category --width 375,768`): 2 rows executed; rows outside the selection are not listed and the gate is diagnostic only.

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
| app.category | 375 | pixel | EVIDENCE (visitor-identity) | 250321 | 5.8761% | 375×11355 vs 375×11360 | [actual](/actual/app.category-375.png) · [expected](/expected/app.category-375.png) · [diff](/diff/app.category-375.png) — 5.876% differing pixels exceeds the 0.5% ceiling |
| app.category | 768 | pixel | EVIDENCE (visitor-identity) | 481623 | 6.9834% | 768×8980 vs 768×8716 | [actual](/actual/app.category-768.png) · [expected](/expected/app.category-768.png) · [diff](/diff/app.category-768.png) — 6.983% differing pixels exceeds the 0.5% ceiling |

## Font-face parity

Every executed row declared identical `@font-face` sets for the nine parity families.

## Reference adapter

Catalog snapshot `b9279d68af696794…` (9 categories, 1816 resources) bound to the design's `AV_*` globals; admin globals bound: none (no admin session).

| File | Design literal | Served as | Source |
|---|---|---|---|
| home-layouts.jsx | `const recent = AV_RESOURCES.slice(0, 5);` | `const recent = [{"id":188015,"title":"srtdroid","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Native Java/Kotlin SRT protocol implementation for Android mobile streaming applications","tags":[],"featured":false,"url":"https://github.com/ThibaultBee/srtdroid"},{"id":188014,"title":"SRT CookBook - Projects and Applications","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Comprehensive curated directory of SRT-enabled projects and applications including VLC, FFmpeg, GStreamer, Wireshark, OBS Studio, and integration guides","tags":[],"featured":false,"url":"https://srtlab.github.io/srt-cookbook/apps/"},{"id":188013,"title":"HydraSRT","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Open-source SRT gateway and relay tool with multi-protocol conversion capabilities (SRT to RTMP/HLS), alternative to commercial Haivision SRT Gateway","tags":[],"featured":false,"url":"https://github.com/abc3/hydra-srt"},{"id":188012,"title":"CTA-WAVE Device Playback Task Force","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"CTA-WAVE working group repository discussing commercial DRM test coverage for PlayReady, Widevine, and FairPlay across different security levels","tags":[],"featured":false,"url":"https://github.com/cta-wave/device-playback-task-force"},{"id":188011,"title":"DRMreview","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"Android application for checking DRM and HDCP security levels on mobile devices","tags":[],"featured":false,"url":"https://github.com/espio999/DRMreview"}];` | /api/home recent resources in approved/indexed order |
| home-layouts.jsx | `const recent = AV_RESOURCES.slice(6, 12);` | `const recent = [{"id":188015,"title":"srtdroid","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Native Java/Kotlin SRT protocol implementation for Android mobile streaming applications","tags":[],"featured":false,"url":"https://github.com/ThibaultBee/srtdroid"},{"id":188014,"title":"SRT CookBook - Projects and Applications","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Comprehensive curated directory of SRT-enabled projects and applications including VLC, FFmpeg, GStreamer, Wireshark, OBS Studio, and integration guides","tags":[],"featured":false,"url":"https://srtlab.github.io/srt-cookbook/apps/"},{"id":188013,"title":"HydraSRT","cat":"protocols-transport","sub":"transport-protocols","subsub":"srt","desc":"Open-source SRT gateway and relay tool with multi-protocol conversion capabilities (SRT to RTMP/HLS), alternative to commercial Haivision SRT Gateway","tags":[],"featured":false,"url":"https://github.com/abc3/hydra-srt"},{"id":188012,"title":"CTA-WAVE Device Playback Task Force","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"CTA-WAVE working group repository discussing commercial DRM test coverage for PlayReady, Widevine, and FairPlay across different security levels","tags":[],"featured":false,"url":"https://github.com/cta-wave/device-playback-task-force"},{"id":188011,"title":"DRMreview","cat":"general-tools","sub":"drm-testing-validation-tools","subsub":null,"desc":"Android application for checking DRM and HDCP security levels on mobile devices","tags":[],"featured":false,"url":"https://github.com/espio999/DRMreview"}];` | /api/home recent resources in approved/indexed order |
| home-layouts.jsx | `'+12 this week'` | `'+0 this week'` | /api/home approvedThisWeek (approvedAt with createdAt fallback) |
| home-layouts.jsx | `CURATED · WEEK 37 ·` | `CURATED · WEEK 38 ·` | ISO week of the frozen clock |
| home-layouts.jsx | `['CONTRIBUTORS', 3, 'reviewing']` | `['APPROVED THIS WEEK', 0, 'newly indexed']` | /api/home approvedThisWeek (approvedAt with createdAt fallback) |
| design-systems.jsx | `'--text-3': 'rgba(244,243,238,0.4)'` | `'--text-3': 'rgba(244,243,238,0.52)'` | approved expected-side Editorial AA contrast reconciliation (3.4:1 reference to 5.2:1 application) |
| admin.jsx | `sub="across 9 categories"` | `sub="across 9 categories"` | nav category count |
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
| admin.jsx | `const filtered = AV_RESOURCES.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));` | *(unchanged)* | /api/admin/resources default 25-row page (admin session only) not available in this run |
| admin.jsx | `title={`Resources (${AV_RESOURCES.length} of ${AV_TOTAL.toLocaleString()})`}` | *(unchanged)* | /api/admin/resources default page size (admin session only) not available in this run |
| admin.jsx | `sub="2 admins · 1 contributor"` | *(unchanged)* | /api/admin/users roles (admin session only) not available in this run |
| admin.jsx | `value="7" sub="oldest 14m ago"` | *(unchanged)* | /api/admin/stats pendingApprovals + oldest /api/admin/pending-resources createdAt vs frozen clock (admin session only) not available in this run |
| admin.jsx | `  const pending = [
    { id: 1, title: 'WebCodecs API Reference', cat: 'Standards', user: 'guest', time: '14m ago' },
    { id: 2, title: 'av1-encoder-bench', cat: 'Encoding', user: 'guest', time: '1h ago' },
    { id: 3, title: 'OBS Lua Plugin Helper', cat: 'Media Tools', user: 'mhanssen', time: '3h ago' },
    { id: 4, title: 'low-latency-cmaf-spec.pdf', cat: 'Standards', user: 'guest', time: '5h ago' },
    { id: 5, title: 'react-native-track-player', cat: 'Players', user: 'guest', time: '1d ago' },
  ];` | *(unchanged)* | /api/admin/pending-resources (same unfiltered queue consumed by the Approvals tab; an empty live queue is authoritative) not available in this run |
| admin.jsx | `        <Stat label="Tables" value="12" />
        <Stat label="Rows" value="3,847" />
        <Stat label="Disk" value="34 MB" />
        <Stat label="Migrations" value="47" sub="0 pending" accent />` | *(unchanged)* | /api/admin/stats database (pg_catalog table count, exact row total, pg_database_size, drizzle journal; admin session only) not available in this run |
| admin.jsx | `            {[
              ['resources', '1,953', '12.4 MB', '2m ago'],
              ['categories', '9', '24 KB', '4d ago'],
              ['subcategories', '102', '88 KB', '4d ago'],
              ['users', '3', '8 KB', '1d ago'],
              ['audit_log', '14,329', '8.7 MB', '12s ago'],
              ['enrichment_jobs', '21', '156 KB', '3h ago'],
            ].map((row, i) => (` | *(unchanged)* | /api/admin/stats database.tableStats (count(*), pg_total_relation_size, newest updated_at/created_at vs frozen clock; admin session only) not available in this run |
| admin.jsx | `  const edits = [
    { id: 1, target: 'ffmpeg-python', field: 'description', user: 'krzemienski', time: '2h ago' },
    { id: 2, target: 'shaka-player', field: 'tags', user: 'mhanssen', time: '5h ago' },
    { id: 3, target: 'WebRTC.org', field: 'url', user: 'admin', time: '1d ago' },
  ];` | *(unchanged)* | /api/admin/resource-edits (same list the Edits tab renders; an empty live list is authoritative) not available in this run |
| admin.jsx | `            {[
              { k: 'Database', v: 'healthy', ok: true },
              { k: 'GitHub sync', v: 'last: 1h ago', ok: true },
              { k: 'Link checker', v: 'running · 47%', ok: true, warn: true },
              { k: 'Enrichment queue', v: '0 pending', ok: true },
              { k: 'Researcher API', v: 'healthy', ok: true },
            ].map((row, i) => (` | *(unchanged)* | /api/admin/operations/health, /api/health/ai, /api/github/sync-status|sync-history, /api/admin/link-health/status|history, /api/enrichment/jobs?limit=100 (AdminOverview.renderHealthRows mirror; admin session only) not available in this run |
| admin.jsx | `'dot ' + (row.warn ? 'warn' : row.ok ? 'ok' : 'bad')` | *(unchanged)* | AdminOverview StatusChip dot tone (ok/warn/bad/muted) not available in this run |
| admin.jsx | `          {[
            { k: 'AV1 hardware encoders 2026', n: 12, d: 'Active' },
            { k: 'Emerging WebRTC SFUs', n: 7, d: '2 days ago' },
            { k: 'Subtitle ML pipelines', n: 4, d: '1 week ago' },
            { k: 'Low-latency CMAF survey', n: 9, d: 'Active' },
          ].map((p, i) => (` | *(unchanged)* | /api/researcher/jobs?limit=4 (ResearchWorkspace.toResearchNote mirror; admin session only) not available in this run |
| admin.jsx | `<p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>All systems nominal</p>` | *(unchanged)* | AdminOverview healthSubtitle derived from the bound health rows not available in this run |
| admin.jsx | `        <Stat label="Last enriched" value="3h ago" sub="batch #21 · 47 entries" />
        <Stat label="Queue" value="0" sub="idle" />
        <Stat label="Avg cost" value="$0.34" sub="per batch" />` | *(unchanged)* | /api/enrichment/jobs (last completed job vs frozen clock, pending+processing count, mean recorded metadata.agent.estimatedCostUsd) not available in this run |
| admin.jsx | `  const stats = [
    { k: '200 OK', v: '1,847', color: '#34d08c' },
    { k: '301/302', v: '78', color: '#ffb84d' },
    { k: '404', v: '21', color: '#ff5c7a' },
    { k: 'Timeout', v: '7', color: '#ff5c7a' },
  ];` | *(unchanged)* | /api/admin/link-health/status latest job totalLinks + /api/admin/link-health/broken-links status counts (LinkHealthDashboard summary arithmetic) not available in this run |
| admin.jsx | `            {[
              { t: 'AviSynth', u: 'http://avisynth.org/', s: '404', when: '2h ago' },
              { t: 'OpenVisualCloud/Smart-City', u: 'github.com/OpenVisualCloud/...', s: 'timeout', when: '2h ago' },
              { t: 'M3U8Kit/M3U8Parser', u: 'github.com/M3U8Kit/...', s: '301', when: '2h ago' },
            ].map((r, i) => (` | *(unchanged)* | /api/admin/link-health/broken-links flagged/broken/dns_failure/timeout checks (an empty live list is authoritative) not available in this run |

## Capture contract

Chromium 148.0.7778.96; DPR 1; en-US; UTC; dark; reduced motion; viewport heights {"375":812,"768":1024,"1024":768,"1440":900}; pixelmatch threshold 0.1; includeAA false; ceiling 0.5% of the union canvas. Full-page captures; unequal sizes are compared on an unscaled union canvas where every unmatched pixel counts. No masking, no cropping, no post-processing. Normalisations applied to both sides: animations disabled; transitions disabled; caret hidden; backdrop-filter disabled on both sides (blur values compared via computed style); Chromium partial raster disabled (--disable-partial-raster): full-page capture re-rasters tiles per frame and reused tile content flipped single anti-aliased pixels between consecutive frames. Backdrop-filter values are compared per row via computed style before normalisation. Pre-seeded state: theme editorial × crimson on both sides; app localStorage {"ds-system":"editorial","ds-accent":"crimson","analytics-consent":"denied"}.

Determinism proof (standalone `--determinism 3` run `2026-09-12T23-21-07-982Z-38222`, reference side): 3 row/width cells captured 3 times each in fresh contexts — all 3 cells byte-identical (see [determinism.json](../../../../docs/parity/evidence/harness/determinism/determinism.json)).

Recoveries: no rate-limit waits; no deferrals; no document reloads or font-readiness reopens. Every event is listed in results.json under `configuration`.

Machine-readable result: [results.json](/results.json); output hashes: OUTPUT-MANIFEST.json. The reference was served from an in-memory snapshot on an ephemeral loopback port; awesome-list-site-ds/ was not modified (raw and served hashes are both recorded).

Inputs changed during run: no. Live catalog/admin adapter hashes were re-read after the final row; 
