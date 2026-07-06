# Functional Validation — awesome.video QA Bug Fixes (BUG-001..011)

**Date:** July 6, 2026
**Method:** Real running system only (dev server on localhost:5000 backed by real Postgres). No mocks, no TEST_MODE, no test files. Validated through real HTTP APIs, real SSR HTML (crawler UA), and real browser rendering via Playwright (Chromium 1208) with screenshots read + DOM assertions.
**Dev DB scale:** 1944 approved resources in the hierarchy (prod has ~2209; dev is the real system under test here).

> **BUG-ID source:** the BUG-001..011 numbering below comes from the external gate spec attached to this task. It is NOT the same numbering as the in-repo `_planning/QA_BUG_FIX_REPORT.md` (BUG-001..025). Each row carries its own behavior description — cross-reference by behavior, not by ID.

## Verdict: 11/11 PASS — 0 failing bugs, no code changes required

| Bug | Description | Gate | Verdict | Evidence |
|---|---|---|---|---|
| BUG-001 | Recursive counts / one complete tree | VG-1 | ✅ PASS | tree total 1944 == `/api/resources` total 1944; per-category rollups consistent (`evidence/vg1-integrity.json`) |
| BUG-003 | Duplicate resources | VG-1 | ✅ PASS | 1944 total = 1944 unique IDs = 1944 unique URLs; every category dup_ids:0; all 8 named resources distinct_ids:1 |
| BUG-004 | FFmpeg categorization | VG-1 | ✅ PASS | `ffmpeg-tools` subcat contains ffmpeg-concat / ffmpeg-gl-transition / ffmpeg-static + docs (7 resources) (`evidence/vg1-ffmpeg-tools.json`) |
| BUG-009 | Count reconciliation | VG-1 | ✅ PASS | search "video" = 1088, returned==unique==total, and 1088 ≤ homepage 1944 (`evidence/vg1-search-video.json`) |
| BUG-002 | Empty-state, no infinite skeleton | VG-2 | ✅ PASS | ffmpeg-tools renders 7 cards (no skeleton); empty `/sub-subcategory/srt` shows "No resources found — There are no resources in this sub-subcategory yet" + count 0 (`evidence/vg2-empty-srt.png`, `vg2-ffmpeg-tools.png`) |
| BUG-011 | Zero-resource nodes hidden/disabled | VG-2 | ✅ PASS | media-tools page shows 11 "(empty)" labels matching the 11 empty sub-subcategories (from the tree); at least one node also carries `aria-disabled` (`evidence/vg2-media-tools.png`) |
| BUG-008 | Pagination on large category | VG-2 | ✅ PASS | encoding-codecs: "333 resources available", "Showing 333 of 333", footer "Previous / Page 1 of 14 / Next" (`evidence/vg2-pagination.png`) |
| BUG-005 | Journey steps render | VG-3 | ✅ PASS | journey/6 "Video Streaming Fundamentals" = 18 steps via API; UI renders the full Learning Path (steps 1–18) with titles + descriptions (`evidence/vg3-journey.json`, `vg3-journey6.png`). Per-step progress UI is only shown to signed-in users; not asserted for the anon capture. |
| BUG-006 | Resource detail integrity | VG-3 | ✅ PASS | resource/185214 shows category badges, "approved" status, description, URL, 5 tags, added-date, 5 related resources; OG meta present in SSR HTML (`evidence/vg3-resource.html`, `vg3-resource.png`) |
| BUG-010 | External-link security (CRITICAL) | VG-4 | ✅ PASS | "Visit Resource" anchor rendered with `target="_blank" rel="noopener noreferrer"`; allSecured=true (DOM-verified) |
| BUG-007 | URL normalization | VG-4 | ✅ PASS | `/category/intro--learning` → HTTP 404 with "Did you mean Intro & Learning?" + properly-spaced "Intro Learning" breadcrumb (no merged words) (`evidence/vg4-404.png`) |

## End-to-end happy path (VG-INT)
Home (1944 resources) → search "video" (1088 real results) → resource/185214 detail (real FFmpeg metadata + secured external link) → journey/6 (18 real steps). All hops render real DB data; counts reconcile across tree/flat/search; zero duplicate IDs.

## Notes
- No application code was changed: BUG-001..025 were fixed in a prior commit; this task confirmed the fixes hold on the real system.
- Evidence this run (Jul 6): `vg1-*.json`, `vg3-journey.json`, `vg3-resource.html`, `vg2-vg3-results.json`, and screenshots `vg2-*.png` / `vg3-*.png` / `vg4-404.png`.
- Validation harness: `.local/vg-validate.mjs` (drives the real app through the browser; not a unit test / not a mock).
