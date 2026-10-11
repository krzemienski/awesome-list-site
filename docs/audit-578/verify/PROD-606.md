# Production confirmation of H02–H08 and H10 on https://awesome.video

**Run:** 2026-10-10, 23:20–23:40 UTC. Read-only: GET requests and anonymous browser page loads only. No sign-in and no writes. The dead-link telemetry beacon was intercepted inside the test browser and answered locally with 204, so no telemetry rows were written to production.

**Revision live:** `/api/version` → `b051a2e4`. That commit contains the H01–H10 fix commit (`git merge-base --is-ancestor cbb6fff0 b051a2e4` succeeds). Server-behaviour markers agree: filtered search/taxonomy server HTML now matches the API, and compatibility aliases keep their query. The pre-publish production behaviour recorded in H02/H03/H05 is gone.

Scripts and raw outputs: `evidence-606/`. These are the `evidence-587` scripts with the base URL taken from `B=https://awesome.video`. The H07/H08 script is a production-only version that intercepts telemetry. Screenshots (opened and viewed): `evidence-606/shots/`.

Production totals are higher than the DEV totals in H02/H03 because the production catalogue is larger (3,824 vs 1,816 resources). Parity is measured inside each environment.

## Verdict per item

| Item | Expected (DEV result) | Production result | Verdict |
|---|---|---|---|
| H02 search SSR parity | SSR ids = API ids = DOM ids, totals and titles equal, `noindex, nofollow`, no canonical | 7/7 URLs × 2 combos (editorial 1440, brutalist 390): ids equal for all three, titles and descriptions equal. Totals 296/296, 126/126, 579/579, 433/433, 367/367. `q=player&format=library` → 0 results; both server and DOM say "No results found for “player”" (the `totalEq:false` on that row is the harness reading no number, same as DEV). Pagination → `page=2` keeps filters; Back restores page 1 ids (`backIdsEqP1: true`). | **PASS** |
| H03 taxonomy SSR parity | Filtered SSR = scoped listing API, filtered pages clamp | 16/16 URLs × 2 combos ids equal across SSR/API/DOM. `?kind=libraries` 9/9 (page 2 clamps to 9), `?subcategory=Codecs` 68/68, `?filter=general` 92/92, `?search=ffmpeg` 171/171, sub-subcategory `?search=vmaf` 5/5; the `tags+format` zero case renders 0 both sides. | **PASS** |
| H04 encoded taxonomy URLs | `%2D`/`%2d` → one 301 to the plain slug | **No 301.** Every variant returns 200 at the escaped address, and the canonical is the plain URL (`h04-prod-node.txt`, `h04-curl.txt`, `h04b-out.txt`). The cause is the hosting edge, not missing code — see below. The duplicate-content problem H04 was about (an escaped, self-canonical page) does not exist in production. | **Differs from DEV by platform; SEO goal met** |
| H05 query-preserving aliases | `/subsubcategory/av1?page=2` keeps `page`, etc. | `/subsubcategory/av1?page=2` → 301 `/sub-subcategory/av1?page=2`; `/explore?category=…&sort=…` → 301 `/search?category=…&sort=…`; `/explore?q=ffmpeg&tags=open-source&page=2` keeps all three; `/category/encoding-codecs/codecs?page=2&sort=name-asc` → 301 `/subcategory/codecs?sort=name-asc&page=2`; unknown child → 404. Browser: document loads and SPA navigation reach the same final URLs; Back/Forward do not loop. | **PASS** |
| H07 missing-page titles | Missing resource/journey = "Page Not Found — Awesome Video", reload and SPA = SSR | `/resource/99999999`, `/journey/99999999`, `/journey/2147483000` → 404, title "Page Not Found — Awesome Video", `noindex, nofollow`, 0 canonicals. `/bookmarks` → "Bookmarks — Awesome Video". In the browser, reload and SPA heads equal the SSR head for empty bookmarks, populated bookmarks, missing resource and missing journey, at both combos. | **PASS** |
| H08 dead-link telemetry | Exactly 1 beacon per missing page; none on 5xx or healthy pages | `/resource/99999999`, `/category/nope-xyz-606`, `/no-such-route-606`, `/journey/2147483000` → exactly 1 beacon each, body `{"path":…,"referrer":null,"ts":…}`. Resource with a browser-injected 503 → "Resource temporarily unavailable", 0 beacons. Healthy resource → 0 beacons. | **PASS** |
| H10 category chip glyph | Chip glyph = home card glyph | 20/20 rows (5 systems × 375/1440 × 2 resources) match: ◉ for Standards & Industry, ⟁ for Protocols & Transport. `ALL_MATCH true`. | **PASS** |

**Not re-checked in production:**
- H09 (theme account-save failure). Proving it needs a signed-in account and real preference writes; that is not read-only.
- H01 (Explorer tag filter) and H06 (resource 5xx/offline states). They were not in this task's done criteria. H08 shows H06's 503 branch rendering "Resource temporarily unavailable" in production.

## H04: why production cannot return the 301

Production requests pass through Google Frontend, which decodes percent-escaped unreserved characters (RFC 3986 §6.2.2.2) before the request reaches the app. The app therefore receives `/category/encoding-codecs`, which is already canonical, so it has nothing to redirect. Proof (`evidence-606/h04-edge-probe.txt`), using the app's generic trailing-slash redirect, whose `Location` echoes the path the app received:

```
http://127.0.0.1:5000/abo%75t/  -> 301 location=/abo%75t     (DEV: app sees the raw escape)
https://awesome.video/abo%75t/  -> 301 location=/about        (prod: edge already decoded %75 → u)
```

Result: in production, `/category/encoding%2Dcodecs` serves the plain page with `<link rel="canonical" href="https://awesome.video/category/encoding-codecs">`. Search engines consolidate to the plain URL, and no escaped self-canonical duplicate exists. The browser address bar may keep showing the escaped form; that is cosmetic. The app's 301 still protects any host that forwards raw escapes (DEV, a local production build, other hosting).
