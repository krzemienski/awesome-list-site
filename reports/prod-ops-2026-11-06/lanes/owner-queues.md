# Owner decision queues (B8 approvals, B5 URL clashes)

> Layout is mine (two tables + counts); not a skill format. Read-only: nothing was approved, rejected or archived. Generated 2026-11-06 from GET /api/admin/resources (full catalog, 4,315 rows: approved 4074, pending 23, rejected 148, archived 29, withdrawn 41), plus curl -I liveness (10 s timeout, follow redirects, GET retry on 000/403/404/405).

## B8 - 23 pending submissions

Submitter type: all 23 are **real** (no [AUDIT]/QA marker in title or submitter domain). Duplicate check: URLs normalised (lowercase, no scheme, no www, no query/fragment, no .git, no trailing slash) and compared against every row of every status: **0 exact matches**. Same-host check found one cluster: three videotext.io rows (190943, 190383, 190338), all pending.

| id | title | URL | submitted | submitter | dup check | live | suggested action | reason |
|---|---|---|---|---|---|---|---|---|
| 190943 | VideoText - Fix SRT/VTT subtitles and client style guide transcripts | https://videotext.io/fix-subtitles?src=directory | 2026-11-06 | real | same host as other 2 pending | 200 | **reject: duplicate** | Same site as 190383 and 190338 (videotext.io); URL is a deep page with ?src=directory tracking |
| 190942 | Mago Studio | https://github.com/MagoStudio/MagoStudio | 2026-11-06 | real | none | 200 | **approve** | Live repo, open-source video editor; fits Media Tools / AI |
| 190538 | ClickPop | https://clickpop.ai/ | 2026-11-02 | real | none | 200 | **needs look** | Commercial AI video generator, promo-style text ("40% off"); off-topic for a streaming list? |
| 190537 | imgmov Last-Frame Extractor | https://imgmov.com/extract-last-frame-from-video | 2026-10-31 | real | none | 403 | **needs look** | Site returns 403 to curl (bot block, likely alive); marginal single-purpose frame extractor |
| 190533 | SubtitleMedic | https://www.subtitlemedic.com/ | 2026-10-31 | real | none | 200 | **approve** | Live; client-side subtitle converters, fits Subtitle tools |
| 190453 | FlashKit Subtitle Translator | https://www.flashkit.tools/tool/video-subtitle-translator-free/ | 2026-10-30 | real | none | 200 | **approve** | Live; Whisper subtitle/dub tool in browser |
| 190383 | VideoText | https://videotext.io/?src=directory | 2026-10-29 | real | same host as other 2 pending | 200 | **approve** | Live; keep this one of the three VideoText rows (site root) |
| 190350 | FlipReel | https://github.com/Flipatic/flip-reel | 2026-10-26 | real | none | 200 | **approve** | Live repo; open-source web component for short video |
| 190341 | TranscriptWorks | https://transcriptworks.com/ | 2026-10-24 | real | none | 200 | **approve** | Live; subtitle tools, no account, already sub-categorised |
| 190339 | InstantClone | https://github.com/Soulhackzlol/InstantClone | 2026-10-19 | real | none | 200 | **approve** | Live repo; RTMP delay proxy for OBS, fits Transport |
| 190338 | VideoText Subtitle Tools | https://videotext.io/tools | 2026-10-15 | real | same host as other 2 pending | 200 | **reject: duplicate** | Same site as 190383 (videotext.io/tools) |
| 190336 | Deckboy | https://github.com/Utopian-Academy/Deckboy | 2026-10-12 | real | none | 200 | **approve** | Live repo; live-video show control |
| 190335 | PPPlayer | https://ppplayer.com/ | 2026-10-11 | real | none | 200 | **approve** | Live; open-source media player (generic music/video, borderline scope) |
| 190332 | TrimScript | https://github.com/SilverNine/trimscript | 2026-10-10 | real | none | 200 | **approve** | Live repo; transcript-based video editor |
| 190331 | ChatGPT Image — browser-based AI image and video creation | https://www.chatgptimage.app/ | 2026-10-09 | real | none | 200 | **needs look** | Commercial AI image/video generator; off-topic for a streaming list? |
| 190203 | M3U8 Player (816800.xyz) | https://816800.xyz/m3u8-player/ | 2026-09-30 | real | none | 200 | **approve** | Live; HLS/DASH stream tester |
| 190171 | OpenRTMP Server | https://github.com/OpenRTMP/librtmp2-server | 2026-09-29 | real | none | 200 | **approve** | Live repo; RTMP server (pairs with 190170, keep both) |
| 190170 | librtmp2 (OpenRTMP) | https://github.com/OpenRTMP/librtmp2 | 2026-09-29 | real | none | 200 | **approve** | Live repo; RTMP library |
| 190169 | Frame Player | https://github.com/risenxxx/frame-player | 2026-09-26 | real | none | 200 | **approve** | Live repo; libmpv desktop player |
| 190168 | Clips Kitty | https://github.com/ColinGPT9/clips-studio | 2026-09-19 | real | none | 200 | **approve** | Live repo; local clipping tool (Whisper/FFmpeg) |
| 190155 | Photo2Reel | https://photo2reel.com/ | 2026-09-12 | real | none | 200 | **needs look** | Photo-to-video browser tool; marginal fit |
| 190154 | streamtop - Terminal Live HLS/DASH/IPTV Stream Diagnostics | https://github.com/Jorji49/streamtop | 2026-08-27 | real | none | 200 | **approve** | Live repo; HLS/DASH/IPTV diagnostics |
| 190153 | CosmoEdge | https://github.com/cosmo-wander-ai/cosmo-edge | 2026-08-26 | real | none | 200 | **approve** | Live repo; RTSP edge video analytics (borderline: AI analytics) |

Counts: approve 17, reject: duplicate 2, reject: dead 0, needs look 4. Total 23.

Notes: all 23 URLs answered 200, except imgmov.com (403 to both HEAD and GET from curl; cannot confirm from here). 'Fits' judgements are mine from the submitted description only; I did not open the sites in a browser.

## B5 - 29 clash pairs from evidence/admin-ops/rewrite-clash.tsv

Structure of each pair: **A** = the row whose URL the rewrite would change; **B** = the row that already holds the rewrite target URL. Liveness: A's old URL and the target both return 200 and resolve to the target in all 27 approved pairs (GitHub renames/redirects), so the target is the live canonical URL. Rule applied: keep B (live target); flag where A has richer metadata. 'meta' = description chars / tags / metadata keys.

### B5a - 27 approved pairs (suggested action: archive A)

| # | keep B (id, category, created, meta) | archive A (id, category, created, meta) | titles A -> B | action | note |
|---|---|---|---|---|---|
| 1 | 189438, General Tools, 2026-07-30, 103/0/3 | 184997, General Tools, 2026-01-20, 242/5/2 | PallyCon Multi-DRM Integration Samples -> html5-player-drm-samples (DoveRunner) | **archive 184997** | A has richer metadata (5 tags vs 0): copy tags/description into B before archiving |
| 2 | 190799, Players & Clients, 2026-11-03, 109/0/3 | 185112, Protocols & Transport, 2026-01-20, 254/5/2 | OvenPlayer -> OvenPlayer | **archive 185112** | A has richer metadata (5 tags vs 0): copy tags/description into B before archiving |
| 3 | 187982, Players & Clients, 2026-07-10, 123/0/3 | 185575, Protocols & Transport, 2026-01-20, 76/5/2 | HLS Downloader Chrome Extension -> hls-downloader browser extension | **archive 185575** | A has richer metadata (5 tags vs 0): copy tags/description into B before archiving |
| 4 | 186625, Media Tools, 2026-01-20, 166/0/6 | 185596, Media Tools, 2026-01-20, 47/4/2 | Subsync -> ffsubsync | **archive 185596** | A has richer metadata (4 tags vs 0): copy tags/description into B before archiving |
| 5 | 187955, Players & Clients, 2026-07-10, 120/0/3 | 185667, Players & Clients, 2026-01-20, 74/5/2 | Rooibos (georgejecook) -> rooibos | **archive 185667** | A has richer metadata (5 tags vs 0): copy tags/description into B before archiving |
| 6 | 190827, Infrastructure & Delivery, 2026-11-03, 135/0/3 | 185751, Protocols & Transport, 2026-01-20, 42/0/6 | Hlsdownloader (nmrony) -> HLS Downloader for Edge Prefetching | **archive 185751** | categories differ: check B placement |
| 7 | 188387, Protocols & Transport, 2026-07-16, 61/0/3 | 185778, Protocols & Transport, 2026-01-20, 52/0/6 | Python Mpegdash -> python-mpegdash — Python MPD parser | **archive 185778** |  |
| 8 | 184924, Protocols & Transport, 2026-01-20, 369/5/2 | 185932, Encoding & Codecs, 2026-01-20, 71/0/6 | Python FFmpeg Video Streaming (aminyaz -> python-ffmpeg-video-streaming | **archive 185932** | categories differ: check B placement |
| 9 | 185329, Infrastructure & Delivery, 2026-01-20, 270/5/2 | 186216, Encoding & Codecs, 2026-01-20, 248/0/6 | Mixwave -> SuperStreamer | **archive 186216** | categories differ: check B placement |
| 10 | 189513, Media Tools, 2026-07-30, 112/0/3 | 186217, Encoding & Codecs, 2026-01-20, 47/0/6 | Video Transcoding -> video_transcoding | **archive 186217** | categories differ: check B placement |
| 11 | 188241, Encoding & Codecs, 2026-07-16, 146/0/3 | 186237, Encoding & Codecs, 2026-01-20, 127/0/6 | Av1an -> Av1an (GitHub) | **archive 186237** |  |
| 12 | 185370, Media Tools, 2026-01-20, 148/5/2 | 186316, Infrastructure & Delivery, 2026-01-20, 108/0/6 | ThreeFive SCTE35 -> threefive | **archive 186316** | categories differ: check B placement |
| 13 | 188392, Players & Clients, 2026-07-16, 124/0/3 | 186325, Players & Clients, 2026-01-20, 104/0/6 | React Native Video -> react-native-video — React Native vide | **archive 186325** |  |
| 14 | 189586, Infrastructure & Delivery, 2026-07-30, 67/0/3 | 186340, Protocols & Transport, 2026-01-20, 156/0/5 | gortsplib -> gortsplib | **archive 186340** | categories differ: check B placement |
| 15 | 187936, Protocols & Transport, 2026-07-10, 120/0/3 | 186341, Encoding & Codecs, 2026-01-20, 137/0/6 | mp4ff -> mp4ff (Eyevinn) | **archive 186341** | categories differ: check B placement |
| 16 | 188100, Infrastructure & Delivery, 2026-07-16, 96/0/3 | 186350, Infrastructure & Delivery, 2026-01-20, 148/0/6 | OvenMediaEngine -> OvenMediaEngine — Sub-Second Live Stre | **archive 186350** |  |
| 17 | 189926, General Tools, 2026-07-30, 90/0/3 | 186450, Media Tools, 2026-01-20, 266/0/6 | Shaka Packager -> Shaka Packager | **archive 186450** | categories differ: check B placement |
| 18 | 188262, Players & Clients, 2026-07-16, 117/0/3 | 186598, Players & Clients, 2026-01-20, 116/0/5 | mpv.net -> mpv.net (GitHub) | **archive 186598** |  |
| 19 | 188079, Encoding & Codecs, 2026-07-16, 104/0/3 | 186618, Encoding & Codecs, 2026-01-20, 153/0/5 | oneVPL (oneAPI Video Processing Librar -> Intel libvpl — oneVPL Dispatcher | **archive 186618** |  |
| 20 | 189736, Media Tools, 2026-07-30, 110/0/3 | 186624, Encoding & Codecs, 2026-01-20, 169/0/5 | RIFE (AI Frame Interpolation) -> RIFE (ECCV2022) | **archive 186624** | categories differ: check B placement |
| 21 | 189757, Protocols & Transport, 2026-07-30, 84/0/3 | 188052, Media Tools, 2026-07-16, 101/0/3 | codem-isoboxer — Browser ISOBMFF Box P -> codem-isoboxer | **archive 188052** | categories differ: check B placement |
| 22 | 189427, Media Tools, 2026-07-30, 103/0/3 | 188109, Media Tools, 2026-07-16, 130/0/3 | Revideo — Programmatic Video via Motio -> Revideo | **archive 188109** |  |
| 23 | 188162, Protocols & Transport, 2026-07-16, 128/0/3 | 188227, Protocols & Transport, 2026-07-16, 147/0/3 | HydraSRT -> HydraSRT — open-source SRT gateway | **archive 188227** |  |
| 24 | 190854, General Tools, 2026-11-03, 107/0/3 | 188749, Media Tools, 2026-07-25, 130/0/3 | threefive (SCTE35_threefive) — Maintai -> threefive (SCTE-35) | **archive 188749** | categories differ: check B placement |
| 25 | 188435, General Tools, 2026-07-16, 105/0/3 | 189251, General Tools, 2026-07-30, 136/0/3 | DRMSense -> DRMSense — browser DRM capability test | **archive 189251** |  |
| 26 | 188955, General Tools, 2026-07-26, 102/0/3 | 189495, Players & Clients, 2026-07-30, 133/0/3 | WebAV -> WebAV — browser audio/video processing | **archive 189495** | categories differ: check B placement |
| 27 | 188167, Media Tools, 2026-07-16, 148/0/3 | 189549, Media Tools, 2026-07-30, 108/0/3 | Vship (Vapoursynth-HIP-SSIMU2) -> Vship — GPU visual fidelity metrics | **archive 189549** |  |

### B5b - 2 pairs whose clash is with a rejected row

| A (approved, www URL) | B (rejected, target URL) | action |
|---|---|---|
| 184931 Video Electronics Standards Association (VESA, Standards & Industry, 2026-01-20, 316/5/2, https://www.vesa.org/ | 185280 VESA - Interface Standards for The Displ, Standards & Industry, 2026-01-20, 205/5/2, https://vesa.org/ | keep 184931 (approved); **archive 185280** (already rejected) so the rewrite target is free; if the unique check ignores rejected rows no action needed |
| 185204 MPEG-DASH (Dynamic Adaptive Streaming over HT, Protocols & Transport, 2026-01-20, 296/5/2, https://www.dashif.org/ | 186355 DASH Industry Forum (DASH-IF), Protocols & Transport, 2026-01-20, 162/5/2, https://dashif.org/ | keep 185204 (approved); **archive 186355** (already rejected) so the rewrite target is free; if the unique check ignores rejected rows no action needed |

Counts: archive A in 27 approved pairs; 5 of those carry a 'copy tags first' flag (A has more tags than B) and 12 more are flagged 'categories differ' (B sits in a different category than A, so check placement before archiving A); 2 rejected-row pairs (archive the rejected B, or no action if rejected rows are excluded from the check). vesa.org returns 403 to curl for both URLs (bot block); dashif.org 200.
