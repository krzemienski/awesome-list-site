# BUG-015 — /subcategory/ffmpeg returns HTTP 404 on every viewport

**Severity:** HIGH
**Affected page:** https://awesome.video/subcategory/ffmpeg
**Affected viewports:** 1440, 768, 375 (all three — page is broken for everyone)

## Reproduction
1. Open https://awesome.video/subcategory/ffmpeg in a fresh chromium.
2. Observe network panel: the document itself returns 404.
3. Console shows: `Failed to load resource: the server responded with a status of 404 ()`.

## Expected
A subcategory page exists for "ffmpeg" and should render its resources.

## Actual
The page returns HTTP 404. The URL is referenced in the sitemap (and from the BFS crawl of the public surface), so external links to this path 404.

## Evidence
- `screenshots/public2_subcategory-ffmpeg_1440.png` (404 page rendered)
- `screenshots/public2_subcategory-ffmpeg_768.png`
- `screenshots/public2_subcategory-ffmpeg_375.png`
- `public-deep-pass1.json` — netErrs: `["404 https://awesome.video/subcategory/ffmpeg"]` and console: `["Failed to load resource: the server responded with a status of 404 ()"]` at every viewport
- Confirmed twice — re-run reproduces identical 404.

## Fix prompt
Task: /subcategory/ffmpeg (referenced in the sitemap and linked from other category pages) returns HTTP 404. Either create the page with the ffmpeg-related subcategories (the sidebar shows "FFmpeg-based tools" and other ffmpeg entries — match the routing), or update internal links so they don't point at /subcategory/ffmpeg.

Reproduction: `curl -I https://awesome.video/subcategory/ffmpeg` → 404.
Acceptance: page returns 200 with ffmpeg-tagged resources.

STATUS: NOT-REPRO/FIXED-in-source (q= reaches filter: ffmpeg→5, nonsense→0) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
