# Tier 3 dry run, read-only parts — 2026-11-06 ~21:05Z

By hand, read-only. Admin GETs via owner header (never printed). Browser `visitor3`; HARs `evidence/visitor/visitor3.har` (207 req) and `visitor3b.har` (185 req). Skipped: enrol, bookmark, export download.

**Write observed (mine, a slip):** 1 POST `/api/telemetry/dead-link` 204 at 21:06:24Z, path `/tag/video-production/tag/video-recording/tag/analytics`. Cause: zsh did not word-split my 3-tag variable, so one malformed URL was opened in the browser (a 404). The rerun (`visitor3b.har`) has 179 GET and 0 other methods; tags were checked by curl first (200) and then the browser.

| ID | Command (runner form) | Value | Verdict | Time (run1/run2) | Notes |
|---|---|---|---|---|---|
| T3-j1 | `curl $B/api/journeys \| jq 'length'` and browser `/journeys` count `a[href^="/journey/"]` | API 5 (ids 7,9,10,6,8); page 5 cards; 0 errors | PASS | 0.2 s; ~3 s | Not flaky. |
| T3-j2 | pick `/journey/:id` from the sitemap (got 7); browser: h1, count `a[href^="/resource/"]` ≥ 1, outbound `a[href^=http]` excluding awesome.video/krzemienski | h1 "Building Your First Streaming Platform"; 18 step links; outbound e.g. norsk.video, velocix.com, forasoft.com; first step `/resource/188703` → 200 | PASS | ~3 s | Not flaky. Only ran once in browser (journey picked at random both times would be 7 on the one run); one journey is a thin sample, consider picking 2. "Outbound links are real" checked by shape (https, non-site host) and first step by HTTP; external hosts not fetched. |
| T3-t | 3 tag URLs from sitemap (video-production, video-recording, analytics): curl 200, browser h1 + ≥ 1 resource | 200 ×3; resources 28 / 10 / 28; 0 errors | PASS | 11 s | Not flaky. Tag slugs from the sitemap come out one per line: loop with an array/`while read`, not an unquoted variable (see slip above). |
| T3-p1 | `/api/public/categories` `.categories\|length` == `/api/categories` length | 9 = 9 | PASS | 0.2 s ×2 | Not flaky. |
| T3-p2 | `/api/public/tags` `.total` == `/api/tags` `.total` and `.tags\|length` | 1630 = 1630, 1630 listed | PASS | 0.3 s ×2 | Not flaky. |
| T3-p3 | `/api/public/resources?limit=1 \| jq .total` == `/api/admin/stats .totalPublic` == sitemap `/resource` count | 4074 = 4074 = 4074 | PASS | 0.2 s ×2 | Not flaky. |
| T3-p4 | `/api/public/resources?limit=100` length | 100 | PASS | 0.3 s | Not flaky. Limit above 100 not probed. |
| T3-p5 | `/api/public/resources/:id` for sitemap id | 190924: 200, title, url present | PASS | 0.2 s | Use a sitemap id, not 190924. |
| T3-p6 | `/api/public/me` without key | 401 | PASS (expected) | 0.1 s | From earlier lane; expected-auth check. |
| T3-en | `GET /api/admin/enrichment/coverage` | approvedTotal 4074, tagged 1091, untagged 2983, **coveragePct 26.8** | PASS on consistency (approvedTotal = totalPublic); **no threshold proposed** | 0.43 s / 0.25 s | Not flaky. Needs a threshold. Also: tags page says 1,630 unique tags but only 1,091 resources are tagged; fine, but 73 % untagged is the real finding. Propose info-only plus a FAIL if coveragePct drops more than 2 points vs last run. |
| T3-gh | `GET /api/github/sync-history \| jq '[.[]\|select(.direction=="export")]\|max_by(.createdAt)'` | newest export 2026-07-20T18:42:40Z, completed, commit be0c146; 27 exports: 5 completed, 22 failed; sync-status total 49 | **Age 109 days.** PASS as "readable", FAIL against any age threshold | 0.42 s / 0.29 s | Not flaky. The route is `/api/github/sync-status` and `/api/github/sync-history` (admin), not under `/api/admin`. Array order is not newest-first by array position (`[0]` happened to be newest here; use `max_by`). Propose: info only. 22 of 27 exports failed historically. |
| T3-dg | `GET /api/admin/digests/health` | transport.available true; queue email sent 1, in_app sent 2; recentFailureCodes []; oldestQueuedAt null | PASS | 0.32 s / 0.26 s | Not flaky. Check: transport.available==true, recentFailureCodes empty, oldestQueuedAt null or < 24 h. Only 3 digests ever sent, so health says little. |
| T3-adv | browser `/advanced` Explorer tab: parse "N CATEGORIES / RESOURCES / UNIQUE TAGS / SUBCATEGORIES" vs APIs | 9 / 4,074 / 1,630 / 99; per-category rows 135, 650, 527, 402, 311, 749, 461, 481, 358 match `/api/categories` | PASS | ~4 s | Not flaky. 99 subcategories has no API counterpart I verified; the per-category subcategory counts shown (2+16+19+10+9+16+10+9+8 = 99) sum correctly. |

## Flags
1. T3-gh has no sane age threshold: last export 109 days ago and most attempts failed. Make it info, not a gate.
2. T3-en needs a baseline for a threshold; none stated in PLAN.
3. Journey sample of one is thin; take 2.
4. Runner must iterate sitemap-derived lists safely (zsh slip above cost one telemetry POST; the Playwright runner should never open a malformed URL: assert curl 200 first).
5. `/api/github/*` and `/api/admin/*` are two different prefixes; both need the owner session.

## Runtime estimate (sequential)
curl-only (public API, journeys, enrichment, GitHub, digests, tag curl): ~5 s. Browser (journeys 3 s, journey 3 s, tags 11 s, advanced 4 s): ~25 s by hand with fixed sleeps, ~12–15 s with proper waits. **Tier 3 read-only total ≈ 30 s** as measured.
