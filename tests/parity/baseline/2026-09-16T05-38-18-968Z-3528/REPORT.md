# Visual parity report

Run: `2026-09-16T05-38-18-968Z-3528`  
Claim: **selected-rows-diagnostic**  
Gate: **NOT PASSED** (exit code 1)  
Identity: disposable Clerk admin `2126533728` "Nick Krzemienski" (torn down: local row deleted, Clerk user deleted, 8 __qa_test_parity_ rows remaining)  
Frozen clock: `2026-09-16T05:38:00.000Z` on both sides.  
Denominator: 0 pass / 5 fail / **5** pixel rows executed. 0 row-incomplete, 0 blocked, 0 evidence-only, 0 token-only, 0 aliases, 0 not selected.

Selected run (`--only app.admin.enrichment,app.admin.linkhealth,app.admin.github,app.admin.users,app.admin.researcher --width 375`): 5 rows executed; rows outside the selection are not listed and the gate is diagnostic only.

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
| app.admin.enrichment | 375 | pixel | FAIL | 10779 | 2.0185% | 375×1424 vs 375×1416 | [actual](/actual/app.admin.enrichment-375.png) · [expected](/expected/app.admin.enrichment-375.png) · [diff](/diff/app.admin.enrichment-375.png) — 2.019% differing pixels exceeds the 0.5% ceiling |
| app.admin.github | 375 | pixel | FAIL | 14895 | 3.7018% | 375×1073 vs 375×1065 | [actual](/actual/app.admin.github-375.png) · [expected](/expected/app.admin.github-375.png) · [diff](/diff/app.admin.github-375.png) — 3.702% differing pixels exceeds the 0.5% ceiling |
| app.admin.linkhealth | 375 | pixel | FAIL | 26277 | 6.0879% | 375×1151 vs 375×1087 | [actual](/actual/app.admin.linkhealth-375.png) · [expected](/expected/app.admin.linkhealth-375.png) · [diff](/diff/app.admin.linkhealth-375.png) — 6.088% differing pixels exceeds the 0.5% ceiling |
| app.admin.researcher | 375 | pixel | FAIL | 16140 | 3.4850% | 375×1235 vs 375×1211 | [actual](/actual/app.admin.researcher-375.png) · [expected](/expected/app.admin.researcher-375.png) · [diff](/diff/app.admin.researcher-375.png) — 3.485% differing pixels exceeds the 0.5% ceiling |
| app.admin.users | 375 | pixel | FAIL | 29908 | 4.2948% | 375×1807 vs 375×1857 | [actual](/actual/app.admin.users-375.png) · [expected](/expected/app.admin.users-375.png) · [diff](/diff/app.admin.users-375.png) — 4.295% differing pixels exceeds the 0.5% ceiling |

## Font-face parity

Every executed row declared identical `@font-face` sets for the nine parity families.

## Reference adapter

Catalog snapshot `6bb17aae6d467696…` (9 categories, 1816 resources) bound to the design's `AV_*` globals; admin globals bound: AV_RETAINED_OPERATIONS, AV_RETAINED_CATALOG, AV_TOTAL_USERS, AV_USERS, AV_SYNC_JOBS, AV_ENRICHMENT_JOBS, AV_ADMIN_RESOURCES, AV_RECENT_ACTIVITY, AV_PENDING_APPROVALS, AV_PENDING_RESOURCES, AV_AUDIT_LOGS, AV_AUDIT_TOTAL, AV_CONTACT_SUBMISSIONS.

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
| admin.jsx | `sub="2 admins · 1 contributor"` | `sub="8 admins · 8 contributors"` | /api/admin/users roles (admin session only) |
| admin.jsx | `value="7" sub="oldest 14m ago"` | `value="0" sub="nothing waiting"` | /api/admin/stats pendingApprovals + oldest /api/admin/pending-resources createdAt vs frozen clock (admin session only) |
| admin.jsx | `  const pending = [
    { id: 1, title: 'WebCodecs API Reference', cat: 'Standards', user: 'guest', time: '14m ago' },
    { id: 2, title: 'av1-encoder-bench', cat: 'Encoding', user: 'guest', time: '1h ago' },
    { id: 3, title: 'OBS Lua Plugin Helper', cat: 'Media Tools', user: 'mhanssen', time: '3h ago' },
    { id: 4, title: 'low-latency-cmaf-spec.pdf', cat: 'Standards', user: 'guest', time: '5h ago' },
    { id: 5, title: 'react-native-track-player', cat: 'Players', user: 'guest', time: '1d ago' },
  ];` | `  const pending = [];` | /api/admin/pending-resources (same unfiltered queue consumed by the Approvals tab; an empty live queue is authoritative) |
| admin.jsx | `        <Stat label="Tables" value="12" />
        <Stat label="Rows" value="3,847" />
        <Stat label="Disk" value="34 MB" />
        <Stat label="Migrations" value="47" sub="0 pending" accent />` | `        <Stat label="Tables" value="39" />
        <Stat label="Rows" value="10,580" />
        <Stat label="Disk" value="29 MB" />
        <Stat label="Migrations" value="27" sub="0 pending" accent />` | /api/admin/stats database (pg_catalog table count, exact row total, pg_database_size, drizzle journal; admin session only) |
| admin.jsx | `            {[
              ['resources', '1,953', '12.4 MB', '2m ago'],
              ['categories', '9', '24 KB', '4d ago'],
              ['subcategories', '102', '88 KB', '4d ago'],
              ['users', '3', '8 KB', '1d ago'],
              ['audit_log', '14,329', '8.7 MB', '12s ago'],
              ['enrichment_jobs', '21', '156 KB', '3h ago'],
            ].map((row, i) => (` | `            {[["resources","1,993","14 MB","24h ago"],["categories","9","96 KB","28d ago"],["subcategories","92","56 KB","28d ago"],["users","16","80 KB","0s ago"],["resource_audit_log","6,221","2.7 MB","4h ago"],["enrichment_jobs","26","168 KB","24h ago"]].map((row, i) => (` | /api/admin/stats database.tableStats (count(*), pg_total_relation_size, newest updated_at/created_at vs frozen clock; admin session only) |
| admin.jsx | `  const edits = [
    { id: 1, target: 'ffmpeg-python', field: 'description', user: 'krzemienski', time: '2h ago' },
    { id: 2, target: 'shaka-player', field: 'tags', user: 'mhanssen', time: '5h ago' },
    { id: 3, target: 'WebRTC.org', field: 'url', user: 'admin', time: '1d ago' },
  ];` | `  const edits = [];` | /api/admin/resource-edits (same list the Edits tab renders; an empty live list is authoritative) |
| admin.jsx | `            {[
              { k: 'Database', v: 'healthy', ok: true },
              { k: 'GitHub sync', v: 'last: 1h ago', ok: true },
              { k: 'Link checker', v: 'running · 47%', ok: true, warn: true },
              { k: 'Enrichment queue', v: '0 pending', ok: true },
              { k: 'Researcher API', v: 'healthy', ok: true },
            ].map((row, i) => (` | `            {[{"k":"Database","v":"ready · 5ms","cls":"ok"},{"k":"GitHub sync","v":"failed · 119d ago","cls":"bad"},{"k":"Link checker","v":"no completed runs","cls":"muted"},{"k":"Enrichment queue","v":"5 failed","cls":"bad"},{"k":"Researcher API","v":"healthy","cls":"ok"}].map((row, i) => (` | /api/admin/operations/health, /api/health/ai, /api/github/sync-status|sync-history, /api/admin/link-health/status|history, /api/enrichment/jobs?limit=100 (AdminOverview.renderHealthRows mirror; admin session only) |
| admin.jsx | `'dot ' + (row.warn ? 'warn' : row.ok ? 'ok' : 'bad')` | `'dot ' + row.cls` | AdminOverview StatusChip dot tone (ok/warn/bad/muted) |
| admin.jsx | `          {[
            { k: 'AV1 hardware encoders 2026', n: 12, d: 'Active' },
            { k: 'Emerging WebRTC SFUs', n: 7, d: '2 days ago' },
            { k: 'Subtitle ML pipelines', n: 4, d: '1 week ago' },
            { k: 'Low-latency CMAF survey', n: 9, d: 'Active' },
          ].map((p, i) => (` | `          {[{"k":"Find 3 open-source AV1 encoder tools on GitHub that are not already in the catalog. Use exactly one scout subagent, then finish.","n":3,"d":"24h ago"},{"k":"AUTO-GENERATED RESEARCH BRIEF (2026-07-30) — campaign angle: Community finds.\n\nBias this run toward community venues: Show HN threads, lobste.rs, r/videoengineering discussions. Chase the concrete tools/projects being discussed (their official sites/repos), not the discussion threads themselves.\n\nTARGET GAPS THIS RUN (most under-served first — rotate through several):\n- Encoding & Codecs › Comparative Analysis of Codecs (1 existing)\n- Encoding & Codecs › Software Codecs (1 existing)\n- General Tools › Research Projects & Academic Resources (1 existing)\n- General Tools › Widevine FairPlay PlayReady Integrations (1 existing)\n- Infrastructure & Delivery › Multi-CDN Management (1 existing)\n- Media Tools › Color Grading & Correction Tools (1 existing)\n- Media Tools › Color Science & Histogram Analysis (1 existing)\n- Media Tools › Conversion & Format Tools (1 existing)\n\nRECENT RUNS ALREADY SEARCHED these queries — do NOT repeat them or near-variants; find NEW ground:\n- \"Kodi addon inputstream set-top box DVB PVR github awesome-video\"\n- \"libmpv embedded Linux IoT kiosk video player github\"\n- \"WPE WebKit embedded set-top box video github WPEWebKit\"\n- \"OvenMediaEngine low latency streaming server github WebRTC LLHLS\"\n- \"open source LL-HLS low latency HLS server github\"\n- \"Puffer Stanford video streaming research github Fugu ABR\"\n- \"BOLA MPC robustMPC ABR algorithm implementation github\"\n- \"GStreamer embedded video player kiosk IoT github\"\n- \"RDK Reference Design Kit set-top box open source github rdkcentral\"\n- \"omxplayer github embedded video player raspberry pi\"\n- \"Natron open source compositor Nuke alternative github\"\n- \"Real-ESRGAN video upscaling github open source\"\n- \"VapourSynth video filtering frame server github\"\n- \"RIFE video frame interpolation github open source\"\n- \"Politecnico Torino multimedia video streaming research lab dataset dash\"\n- \"LIVE video quality database University of Texas Austin subjective\"\n- \"Waterloo video streaming QoE database dataset university\"\n- \"GPAC MP4Box remux container tool site:github.com\"\n- \"open source video converter Rust Go 2024 2025 github ffmpeg wrapper\"\n- \"ffmpeg.wasm video codec wasm port openjpeg JPEG2000 github libaom software encoder\"\n\nDOMAINS PAST RUNS ALREADY MINED heavily (skip unless a specific find is exceptional): github.com (37), arxiv.org (7)\n\nVENUE TYPES THAT PRODUCED APPROVED FINDS before (proven hunting grounds worth revisiting with NEW queries): github.com\n\nGoal: save NEW, high-quality resources (confidence ≥ 70) that fill the target gaps, biased toward the campaign angle.","n":0,"d":"48d ago"},{"k":"AUTO-GENERATED RESEARCH BRIEF (2026-07-30) — campaign angle: Curated-list mining.\n\nBias this run toward mining other curated lists: awesome-* repos, roundups, \"top N tools\" posts. The list itself is rarely savable — extract the INDIVIDUAL tools/projects it names and verify each one's official site or repo.\n\nTARGET GAPS THIS RUN (most under-served first — rotate through several):\n- Encoding & Codecs › Comparative Analysis of Codecs (1 existing)\n- Encoding & Codecs › Software Codecs (1 existing)\n- General Tools › Research Projects & Academic Resources (1 existing)\n- General Tools › Widevine FairPlay PlayReady Integrations (1 existing)\n- Infrastructure & Delivery › Multi-CDN Management (1 existing)\n- Media Tools › Color Grading & Correction Tools (1 existing)\n- Media Tools › Color Science & Histogram Analysis (1 existing)\n- Media Tools › Conversion & Format Tools (1 existing)\n\nRECENT RUNS ALREADY SEARCHED these queries — do NOT repeat them or near-variants; find NEW ground:\n- \"SVTA Streaming Video Technology Alliance research project working group\"\n- \"site:arxiv.org neural video codec 2025 open source implementation\"\n- \"DaVinci Resolve scripting API python github color grading automation\"\n- \"HDR color volume analysis tool engineering blog open source\"\n- \"ACM MMSys video streaming dataset research project github\"\n- \"ITEC Alpen-Adria video streaming research DASH dataset project page\"\n- \"waveform vectorscope video analysis open source tool github\"\n- \"OpenColorIO site:github.com config ACES pipeline tool\"\n- \"VVenC Fraunhofer HHI VVC encoder blog open source\"\n- \"rav1e Rust AV1 encoder Xiph blog architecture\"\n- \"Twitch engineering blog CDN video delivery architecture\"\n- \"multi-CDN switching algorithm video streaming engineering blog\"\n- \"license server architecture Widevine PlayReady FairPlay engineering blog\"\n- \"site:bitmovin.com blog multi-DRM Widevine FairPlay PlayReady integration architecture\"\n- \"AV1 vs VVC vs HEVC BD-rate comparison arxiv 2024 2025\"\n- \"SVT-AV1 architecture engineering blog encoder design\"\n- \"subtitle OCR extraction open source github OR arxiv\"\n- \"\"ASS subtitle editor\" OR \"SSA editor\" OR \"aegisub\" alternative open source 2024 2025\"\n- \"\"subtitle timing\" \"synchronization\" OR \"alignment\" open source command-line github\"\n- \"site:github.com subtitle editor SRT VTT stars:>50 language:Rust OR language:TypeScript OR language:Go\"\n\nDOMAINS PAST RUNS ALREADY MINED heavily (skip unless a specific find is exceptional): github.com (16)\n\nVENUE TYPES THAT PRODUCED APPROVED FINDS before (proven hunting grounds worth revisiting with NEW queries): github.com\n\nGoal: save NEW, high-quality resources (confidence ≥ 70) that fill the target gaps, biased toward the campaign angle.","n":45,"d":"48d ago"},{"k":"AUTO-GENERATED RESEARCH BRIEF (2026-07-30) — campaign angle: Vendor & engineering blogs.\n\nBias this run toward deep technical blog posts and niche vendor documentation (engineering blogs of streaming platforms, codec vendors, CDN providers) — NOT marketing pages. Search \"<gap topic> engineering blog\" and \"site:<vendor domain> <topic>\".\n\nTARGET GAPS THIS RUN (most under-served first — rotate through several):\n- Encoding & Codecs › Comparative Analysis of Codecs (1 existing)\n- Encoding & Codecs › Software Codecs (1 existing)\n- General Tools › Research Projects & Academic Resources (1 existing)\n- General Tools › Widevine FairPlay PlayReady Integrations (1 existing)\n- Infrastructure & Delivery › Multi-CDN Management (1 existing)\n- Media Tools › Color Grading & Correction Tools (1 existing)\n- Media Tools › Color Science & Histogram Analysis (1 existing)\n- Media Tools › Conversion & Format Tools (1 existing)\n\nRECENT RUNS ALREADY SEARCHED these queries — do NOT repeat them or near-variants; find NEW ground:\n- \"subtitle OCR extraction open source github OR arxiv\"\n- \"\"ASS subtitle editor\" OR \"SSA editor\" OR \"aegisub\" alternative open source 2024 2025\"\n- \"\"subtitle timing\" \"synchronization\" OR \"alignment\" open source command-line github\"\n- \"site:github.com subtitle editor SRT VTT stars:>50 language:Rust OR language:TypeScript OR language:Go\"\n- \"site:github.com DRM debug player test shaka dash-mpd widevine compliance\"\n- \"license server testing DRM compliance framework multi-DRM streaming\"\n- \"EME testing tools open source encrypted media extensions JavaScript\"\n- \"site:github.com DRM testing validator Widevine PlayReady FairPlay\"\n- \"SRT testing monitoring tools FFmpeg OBS GStreamer integration guide\"\n- \"\"SRT\" streaming protocol Demuxed conference talk OR paper arxiv\"\n- \"SRT relay gateway RTMP HLS converter tools\"\n- \"SRT protocol implementation open source github -haivision\"\n- \"DRM test suite content protection conformance tools GitHub\"\n- \"EME Encrypted Media Extensions testing framework open source\"\n- \"site:github.com DRM validator Widevine PlayReady FairPlay testing\"\n- \"site:github.com dash.js DRM test encrypted\"\n- \"W3C EME test suite specification video\"\n- \"\"test vectors\" DRM video streaming open source\"\n- \"site:github.com Shaka Player EME testing DRM\"\n- \"site:github.com \"DRM test\" video streaming\"\n\nDOMAINS PAST RUNS ALREADY MINED heavily (skip unless a specific find is exceptional): github.com (16)\n\nVENUE TYPES THAT PRODUCED APPROVED FINDS before (proven hunting grounds worth revisiting with NEW queries): github.com\n\nGoal: save NEW, high-quality resources (confidence ≥ 70) that fill the target gaps, biased toward the campaign angle.","n":0,"d":"48d ago"}].map((p, i) => (` | /api/researcher/jobs?limit=4 (ResearchWorkspace.toResearchNote mirror; admin session only) |
| admin.jsx | `<p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>All systems nominal</p>` | `<p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>One or more systems need attention</p>` | AdminOverview healthSubtitle derived from the bound health rows |
| admin.jsx | `        <Stat label="Last enriched" value="3h ago" sub="batch #21 · 47 entries" />
        <Stat label="Queue" value="0" sub="idle" />
        <Stat label="Avg cost" value="$0.34" sub="per batch" />` | `        <Stat label="Last enriched" value="72d ago" sub="batch #38 · 3 entries" />
        <Stat label="Queue" value="0" sub="idle" />
        <Stat label="Avg cost" value="$0.05" sub="per batch" />` | /api/enrichment/jobs (last completed job vs frozen clock, pending+processing count, mean recorded metadata.agent.estimatedCostUsd) |
| admin.jsx | `  const stats = [
    { k: '200 OK', v: '1,847', color: '#34d08c' },
    { k: '301/302', v: '78', color: '#ffb84d' },
    { k: '404', v: '21', color: '#ff5c7a' },
    { k: 'Timeout', v: '7', color: '#ff5c7a' },
  ];` | `  const stats = [{"k":"200 OK","v":"0","color":"#34d08c"},{"k":"301/302","v":"0","color":"#ffb84d"},{"k":"404","v":"0","color":"#ff5c7a"},{"k":"Timeout","v":"0","color":"#ff5c7a"}];` | /api/admin/link-health/status latest job totalLinks + /api/admin/link-health/broken-links status counts (LinkHealthDashboard summary arithmetic) |
| admin.jsx | `            {[
              { t: 'AviSynth', u: 'http://avisynth.org/', s: '404', when: '2h ago' },
              { t: 'OpenVisualCloud/Smart-City', u: 'github.com/OpenVisualCloud/...', s: 'timeout', when: '2h ago' },
              { t: 'M3U8Kit/M3U8Parser', u: 'github.com/M3U8Kit/...', s: '301', when: '2h ago' },
            ].map((r, i) => (` | `            {[].map((r, i) => (` | /api/admin/link-health/broken-links flagged/broken/dns_failure/timeout checks (an empty live list is authoritative) |
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

Inputs changed during run: YES — stale. Live catalog/admin adapter hashes were re-read after the final row; 0 comparisons needed more than one raw frame before two consecutive frames were byte-identical; every attempt is retained.
