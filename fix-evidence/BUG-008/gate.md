# VG-008 — Cold loads fetch the 3.1MB full corpus — PASS

**Fix**: New page-scoped nav endpoint `GET /api/awesome-list/nav` (12,652 bytes vs 2,659,652-byte corpus — a 99.5% reduction) serving the category tree (names/slugs/resourceCount) + totalResources, with 60s server cache + ETag/304, added to the public-method allowlist. Client: sidebar/layout consume the nav payload; the full corpus query is route-gated (`needsCorpusRoute()`) so it only loads on listing routes (`/`, `/categories`, `/advanced`, `/recommendations`, `/category/*`, `/subcategory/*`, `/sub-subcategory/*`). `client/index.html` always early-fetches nav and gates the corpus early-fetch on the same inline route check; ResourceDetail taxonomy slugs read nav.

## Browser network log (Playwright, Chromium 1223, dev @ localhost:5000)

### S1 — cold `/resource/185020` (fresh context)
- corpus requests: **[] — none** → PASS (was: 3.1MB corpus on every cold load)
- nav requests: `[{"path":"/api/awesome-list/nav","status":200,"size":12652,"cc":"public, max-age=0, must-revalidate"}]`
- Page-scoped data correct: sidebar footer "1,814 resources", "Intro & Learning" row present; detail h1 "100ms: RTMP vs WebRTC vs HLS - Live Video Streaming Protocols Compared"; taxonomy links `/category/community-events`, `/subcategory/community-groups`, `/sub-subcategory/online-forums`
- Screenshot: `bug-008-resource-cold.png`

### S1c — SPA nav detail → home
- corpus fetched lazily exactly when a listing route is entered: `[{"status":200,"size":2659652}]` → PASS; category grid renders.

### S2 — cold `/` (fresh context)
- corpus: fetched **exactly once** (200, 2,659,652 bytes); nav also fetched (sidebar).
- Home complete: h1 "Awesome Video Resources", 9 category tiles, count badges ["80","334","128"].
- Screenshot: `bug-008-home-cold.png`

### S3 — cold `/category/intro-learning` (fresh context)
- corpus fetched once; 24 resource cards; h1 "Intro & Learning" → listing content complete.
- Screenshot: `bug-008-category-cold.png`

## Cacheability + demonstrated cache hits

Response headers (both endpoints, `headers-nav.txt` / `headers-corpus.txt`):
`ETag` present, `Cache-Control: public, max-age=0, must-revalidate`, `Vary: Accept-Encoding` only — publicly cacheable, revalidation-based (kept max-age=0 so admin content changes propagate immediately via ETag change).

Conditional-request proof (curl, gzip):
- `GET /api/awesome-list/nav` + `If-None-Match: "c25014cf…"` → **304, 0 bytes**
- `GET /api/awesome-list` + `If-None-Match: "939312f3…"` → **304, 0 bytes**

Browser cache-hit proof (PerformanceResourceTiming, same page, repeat nav fetches):
- fetch #1: `transferSize 3165` (full gzipped body + headers), `decodedBodySize 12652`
- fetch #2/#3: `transferSize 300` (≈ header-only 304 revalidation), `decodedBodySize 12652` — body served from browser cache.
  (Playwright's response event reports the cache-filled 200; the ~300-byte transfer is the 304 wire exchange.)

POST `/api/awesome-list/nav` → 405 (method allowlist), verified via curl during build.

## Verdict

| Criterion | Result |
|---|---|
| Cold resource page does not fetch the 3.1MB corpus | PASS (0 corpus requests) |
| Page-scoped data is correct | PASS (sidebar counts, taxonomy links, detail content) |
| Retained corpus response publicly cacheable + cache hits demonstrated | PASS (ETag + 304 via curl; transferSize 3165→300 in browser) |
| Home and category content complete and correct | PASS (9 tiles + badges; 24 cards on category page) |

**VG-008: PASS** → proceed to BUG-009.
