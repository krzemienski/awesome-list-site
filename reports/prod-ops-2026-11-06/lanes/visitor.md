# Lane: visitor (anonymous, read-only) — prod-ops 2026-11-06

Layout of this file is mine (follows LANE-RULES per-feature record). Evidence dir: `evidence/visitor/` (E).
Run: agent-browser `--session visitor`, 1440×900 and 390×844, plus curl. Never signed in. Consent banner not answered. No form submitted, nothing bookmarked.
`navigator.webdriver` = **true** (checked on home at session start; analytics suppressed). Consent banner shown on every page ("Decline" / "Allow analytics"), left untouched.

## Verdict
No Primary visitor function is down. Browse, search, resource page and outbound link all work at both widths. The only non-GET traffic was 4 automatic telemetry POSTs triggered by my 404 probes (see Writes).

## Facts that differ from the brief
- Catalog is **4,074** resources (home title, /api/categories sum, sitemap has 4,074 /resource URLs), not ~2,600.
- 9 top categories confirmed (Community & Events 135, Encoding & Codecs 650, General Tools 527, Infrastructure & Delivery 402, Intro & Learning 311, Media Tools 749, Players & Clients 461, Protocols & Transport 481, Standards & Industry 358).
- Tags: 1,630 unique. Subcategories: 99. Journeys: 5.

## Per-feature record
| ID | Feature | Entry | What it does | Result + evidence | Console/network errors | Write paths deferred | Essential? |
|---|---|---|---|---|---|---|---|
| V1 | Home | `/` | Index title, search box, stats, kind chips, featured picks | works. E/home-1440.png, m390-home.png; TTFB 0.16 s, total 0.19 s (E/perf.txt) | none | none | core: front door |
| V2 | Category pages (9) | `/category/:slug` | Description, subcategory cards, 48 resources/page, sidebar tree | works, all 9 returned h1 + 48 links. E/w1440-cat-*.png | none | none | core |
| V3 | Subcategory / sub-subcategory | `/subcategory/codecs`, `/subcategory/ffmpeg-based-tools`, `/sub-subcategory/online-forums` | Drill-down lists | works (38 / 48 / 20 resources). E/w1440-sub*.png | none | none | core |
| V4 | Pagination | `?page=2`, `9999`, `0`, `-1`, `abc` | Pager (Previous/1/2/…/28/Next) | works. 9999 clamps to page 28 (4 items); 0, -1, abc fall back to page 1; titles say "Page N" | none | none | core |
| V5 | Kind filter | Category → "Filters & view" → "Limit by resource kind" (native select: Tools, Libraries, Standards, Events, Protocols, Other) | Narrows list, URL gets `?kind=libraries` | works via `select` command. E/w1440-kind-libraries.png | none | none | supporting |
| V6 | Resource detail | `/resource/190924`, `189831`, `188764`, `188325` | Description, tags, related, outbound link | works. Outbound link: `href` = real resource URL, `target=_blank`, `rel="noopener noreferrer"` (all 3). Related Resources: 0 links on 190924 (no tags), 5 on the other two | none | none | core |
| V7 | Header search | Header box / home box | Opens palette | works | none | none | core |
| V8 | ⌘K palette | `Meta+k` | Categories, featured, pages; typing searches; Enter opens item; Esc closes | works. "ffmpeg" gives resource rows, Enter navigates. Zero-result term gives "Open full search for …" row | none | "Get in touch" row opens the contact form (not submitted) | core |
| V9 | /search | `/search?q=` | Results page, sort, narrow-by | works. ffmpeg 451, hls 407, webrtc 131, c++ 51, zzqqxxnothing 0 (friendly empty state with category links). Counts match `/api/search`. E/w1440-search-*.png | none | none | core |
| V10 | Unsafe query | `/search?q=<script>…` | Sanitising | works: query stripped, visitor told "the q parameter contained unsafe content and was removed"; 0 script nodes | none | none | incidental |
| V11 | Tag page | `/tag/ffmpeg` | Resources for a tag | works (48 shown) | none | none | supporting |
| V12 | `/tag` (no slug) | `/tag` | renders "All Categories" page (title/h1 "All Categories") | works but odd: same page as `/categories` | none | none | incidental |
| V13 | Journeys | `/journeys`, `/journey/7` | 5 learning paths; detail has ordered resources (18 links) | works. E/w1440-journey7.png | none | enrol/mark-complete controls not touched | supporting |
| V14 | Advanced | `/advanced` tabs Explorer / Metrics / Export / AI Recommendations | Explorer stats (9 / 4,074 / 1,630 / 99), metrics (+254 this week), export format cards, popular recs | works (real clicks needed on Radix tabs; DOM `.click()` did not switch). E/w1440-advanced-*.png | none | Export tab export buttons not clicked | supporting |
| V15 | About / Terms / Privacy / Code of conduct / Submit / Recommendations / Theme settings | `/about` etc. | static + form page | all render. Submit form looked at only; theme page looked at only | none | Submit form, theme save not touched | supporting / incidental |
| V16 | Guest bookmarks | `/bookmarks` | "Nothing saved on this device" empty state | works; nothing added | none | bookmark icon not clicked | supporting |
| V17 | Consent banner | bottom bar, all pages | Decline / Allow analytics | present on every page; not clicked | none | n/a | core (legal) |
| V18 | Contact dialog | ⌘K → "Get in touch" (last row; reached with 13× ArrowDown, Enter) | Form: name, email, subject, message; "stored for review, no email promised" | opens; Escape closes; nothing sent. A mouse/ref click on that row did NOT open it (likely agent-browser vs cmdk; unconfirmed) | none | form submit | supporting |
| V19 | 404 pages | `/nonexistent-route`, `/resource/99999999`, `/collection/zzzz`, `/category/nope`, `/journey/9999`, `/tag/nope-zzz` | "Page Not Found" with real HTTP 404 | works; HTTP 404 for all six (E/404s.txt) | 404s expected | triggers dead-link POST (see Writes) | supporting |
| V20 | Mobile 390×844 | 15 pages | layout | no horizontal scroll on any (scrollWidth 384 ≤ 390) | none | none | core |

## SSR / OG (curl, Googlebot and Twitterbot get identical bytes)
All four page types: HTTP 200, `<title data-react-helmet>`, meta description, canonical, og:* (title/description/url/type/image/locale/image dims+alt), twitter:*, JSON-LD. E/bots.txt, E/bot-*.html.
- Home: WebSite + SearchAction, Organization, Person. 130 KB, 0.25 s.
- Category: CollectionPage, ItemList, BreadcrumbList.
- Resource: CreativeWork/WebPage, BreadcrumbList.
- Journey: Course + Syllabus, BreadcrumbList.
- og:image = `/og-image.png?path=…` → 200 image/png.
- Home response headers: `cache-control: no-store`, strong CSP, HSTS, X-Frame-Options DENY (E/home-headers.txt).

## Sitemap / robots / meta endpoints
- `sitemap.xml` 200, 0.7 s, **4,766 URLs**: 4,074 resource, 280 tag, 178 subcategory, 174 category, 46 sub-subcategory, 5 journey, 7 static. (Includes `?page=2` URLs.) 5 random spot-checks all 200 (E/sitemap-spot.txt).
- `robots.txt` 200 (allow /, disallows /api/, /admin, auth routes). `/.well-known/security.txt` 200, expires 2027-05-05.
- `/api/docs` 200 html; `/api/openapi.json` 200, OpenAPI 3.0.0, 166 paths. `/api/version` 200 `{revision: 6cb1a93e…}`, `/api/health` 200.
- `/api/public/*` (server/routes): resources (200), resources/:id (200), categories (200), tags (200, total 1630), me (401 "Missing Authorization header", correct), collections/:shareId (404 for bogus id, correct). E/public-api.txt. Not tested: a real public collection share link (no shareId available to an anonymous visitor).

## Performance
Home HTML: TTFB 0.16–0.19 s, total 0.19–0.22 s over 4 runs; nothing near the 5 s Promote limit. Slowest page fetch seen: sitemap 0.71 s, `/api/search` zero-result 0.65 s.

## Console / network
`agent-browser errors` returned nothing on every page at both widths. HAR: only expected 404s (my probes) plus one external 429 (see below).

## Findings / oddities
1. **Dead-link telemetry POSTs on 404 pages** (below) — automatic, every 404 page view sends one.
2. `https://i.replit.com/script.js` loads on every page (72 requests in this run, all 200). It is allowed in the CSP. This is the Replit script, and it loads regardless of the analytics consent choice.
3. `opengraph.githubassets.com` image for resource simple-whep-server returned **429** once (external; the resource page shows GitHub preview images). Page still rendered.
4. `/api/config` and `/api/auth/user` are requested on every single page view (72 each) even for an anonymous visitor; `/api/awesome-list/nav` 65 times. Candidate caching/dedupe target.
5. `/tag` with no slug shows the "All Categories" page.
6. Resource 190924 has `tags: null`, so its Related Resources section is empty.
7. Brief said ~2,600 resources; live count is 4,074.

## Writes observed (HAR)
Four POSTs, all `https://awesome.video/api/telemetry/dead-link`, all 204, body `{path, referrer:null, ts}`. Source `client/src/lib/route-monitor.ts:53`. Cause: my navigations to bad URLs (`/nonexistent-route` ×2, `/resource/99999999`, `/collection/zzzz`). No click involved; the 404 page fires it on load. Reported, not hidden: any visitor (or lane) opening a 404 URL writes this.

Itemized (all POST, all 204, no click, page load only):
| # | Time (UTC) | Width | Triggering URL | Body path |
|---|---|---|---|---|
| 1 | 20:40:36 | 1440 | `/nonexistent-route` | `/nonexistent-route` |
| 2 | 20:40:40 | 1440 | `/resource/99999999` | `/resource/99999999` |
| 3 | 20:40:44 | 1440 | `/collection/zzzz` | `/collection/zzzz` (not in the brief's 404 list; my extra probe) |
| 4 | 20:43:40 | 390 | `/nonexistent-route` | `/nonexistent-route` |

Per lead's instruction (20:4xZ), no further 404 URLs will be opened by this lane. Curl 404 checks (`/category/nope`, `/journey/9999`, `/tag/nope-zzz`, etc.) do not run client JS, so they sent no POST (HAR shows only the 4 above). Bad resource id was not repeated at 390.

## HAR method table (awesome.video only; 4,328 requests, file `evidence/visitor/visitor.har`)
| Method | Count |
|---|---|
| GET | 4324 |
| POST | 4 |
| HEAD / OPTIONS / PUT / PATCH / DELETE | 0 |

Other hosts: i.replit.com 72, opengraph.githubassets.com 9, avatars.githubusercontent.com 1.

## Not covered
- A real public collection page (`/collection/:shareId`): no share ID discoverable anonymously; only the 404 path tested.
- Outbound click-through to the external site (href/target verified only, as instructed).
- Sub-subcategory beyond one example; about 99 subcategories not individually walked.
- Mobile pass checked layout/overflow/heading/errors only; screenshots saved (E/m390-*.png) but I did not eyeball each one.
- Kind-filter, advanced tabs and contact dialog tested at 1440 only.
