# Lane visitor-r2 (prod-ops 2026-11-07) -- anonymous visitor

Revision under test: 1cd25ab06e344b1db198857910a95486efe36082 (GET /api/version, 200, seen this run).
Evidence root: /Users/nick/Desktop/awesome-list-site/.claude/worktrees/prod-ops-1107/e2e-evidence/prod-ops-2026-11-07/visitor/
Status: Step 1 (SEO from predecessor files) DONE. Step 2 IN PROGRESS: 13 routes + palette done at 3 widths; consent flows and outbound links NOT yet; Step 3 NOT STARTED (see Checkpoint log).

## Function table
| function | route/template | nav clicks from home | 390/768/1280 result | console errors | failed network | evidence | 07b prior |
|---|---|---|---|---|---|---|---|
| home | / | 0 | 390 works, 768 works, 1280 works (all: title ok, hero, 4,064 stats, featured cards, consent banner shown) | 0 / 0 / 0 (console+pageerror empty) | none non-2xx | visitor/shots/home-{390,768,1280}.png (opened) | not re-read yet |
| search page | /search?q=ffmpeg (home form + /search) | 1 (header search or home Search button) | 390 works (451 results, Filters button), 768 works, 1280 works (Narrow results facets) | 0 / 0 / 0 | none | visitor/shots/search-{390,768,1280}.png (opened) | t-search.md |
| categories | /categories | 1 (header Browse) | 390/768/1280 works (9 category cards, counts 135/643/525/401/311/752/462/477/358 sum 4,064; Sort select) | 0/0/0 | none | shots/categories-{390,768,1280}.png (opened) | t-discovery |
| category | /category/community-events | 2 (Browse > card, or sidebar category = 1) | works x3 (135 resources, 2 subcategories, subcat cards, resource cards with favorite/bookmark) | 0/0/0 | none | shots/category-*.png (opened) | t-discovery |
| subcategory | /subcategory/community-groups | 2 via sidebar expand/chip, 3 via Browse | works x3 (breadcrumb, 60 resources, Topics chips 10+8+42=60) | 0/0/0 | none | shots/subcategory-*.png (opened) | t-discovery |
| sub-subcategory | /sub-subcategory/podcasts | 3 (sidebar category > subcategory > topic) | works x3 (11 resources, 3-level breadcrumb wraps onto 2 lines at 390/768) | 0/0/0 | none | shots/subsub-*.png (opened) | t-discovery |
| resource detail | /resource/188624 | 3+ (home search or category card) | works x3 (description, View on GitHub, Favorite(account), Bookmark(this device), Share, Suggest Edit, Report broken link, Keep exploring). No sidebar on this template at any width. | 0/0/0 | none | shots/resource-*.png (opened) | t-discovery |
| tag | /tag/open-source | 1 (home tag chips use /?tags=, not /tag/); /tag/* reached from resource tag chips or related topics | works x3 (169 resources, related tags) | 0/0/0 | none | shots/tag-*.png (opened) | t-discovery |
| journeys list | /journeys | 1 (sidebar footer link "Learning Journeys"; not in header nav; at 390 not in the visible-before-menu anchors) | works x3 (5 journeys, category filter, Start Journey) | 0/0/0 | none | shots/journeys-*.png (opened) | t-discovery |
| journey detail | /journey/7 | 2 | works x3 (6 steps, "Please log in to start" gate for anonymous) | 0/0/0 | none | shots/journey-*.png (opened) | t-discovery |
| advanced | /advanced | 1 (sidebar footer link "Advanced"; no header entry) | works x3 (Explorer tab: 9 / 4,064 / 1,655 tags / 99 subcats, Metrics, Export, AI Recommendations tabs) | 0/0/0 | none | shots/advanced-*.png (opened) | prior ssr only |
| design-system | /design-system | 2 (sidebar "Theme" /settings/theme > "Explore the full design-system"); noindex, not in sitemap | works x3 (Editorial/Geist, 10 accents) | 0/0/0 | none | shots/dsystem-*.png, shots/settings-theme-1280.png | prior ssr only |
| header/palette search | Ctrl+K or header Search button, any page | 1 | works x3: opens combobox, suggestions (cats, featured, pages), typing "hls low latency" gives 30 matches top 15, ArrowDown+Enter opens /resource/185974 (1280) and /resource/186444 (768/390, a RECENT row comes first so the 2nd option shifts) | 0/0/0 | none | shots/palette-{390,768,1280}.png (opened) | t-search |

Observations from the browser pass (revision 1cd25ab0):
- O-1 (info): at 390px the page gutter is 20px left and 60px right (`.page-content-wrap` computed padding 20/60), so content is 304 of 384px. Intentional back-to-top lane, client/src/styles/shell/layout.css:47-66. Costs ~16% of phone width on every page; owner design call.
- O-2 (info): no horizontal overflow at any width on any of the 13 routes (scrollWidth == clientWidth).
- O-3 (info): consent banner covers the bottom ~70-150px of every first view at all widths until a choice is made.

## SEO section (analysed from predecessor raw files, no refetch except /api/version)

### robots.txt (api/robots.txt, 200, text/plain)
- `User-agent: *`, `Allow: /`, explicit Allow for /category/ /subcategory/ /sub-subcategory/ /resource/ /journey/ /journeys /advanced /about.
- Disallow: `/api/` and `/admin` only (robots.txt lines 39-40).
- FINDING S-1 (low): no `Sitemap:` line (grep -ci sitemap = 0). Crawlers only find /sitemap.xml by convention or Search Console.
- /profile, /bookmarks, /sign-in, /design-system are not disallowed in robots (design-system carries meta noindex, so OK; /bookmarks serves 200 per status-matrix, robots meta not checked).

### sitemap.xml (api/sitemap.xml, 200 application/xml, 4759 URLs, all with lastmod, 4464 `<lastmod>` tags counted in grep)
Template counts (api/sitemap-urls.txt): resource 4064, tag 286, subcategory 177, category 172, sub-subcategory 46, journey 5, plus 10 singles (/ /categories /journeys /advanced /about /privacy /terms /code-of-conduct /submit). Resource count equals the "4,064+" on the home title.
- qa-audit leaks: `grep -ci qa-audit` = 0. No QA rows in sitemap.
- /design-system is not in the sitemap (correct, it is noindex).
- Note: the `<lastmod>` count 4464 vs 4759 URLs means 295 URLs (static/list templates) have no lastmod. Cosmetic.

### SSR sample, 34 sitemap pages (ssr/s1..s34.html, re-parsed from the saved HTML because the predecessor's title column was empty)
All 34: HTTP 200, title present, meta description present, canonical equals the requested URL, og:title present, og:image `https://awesome.video/og-image.png?path=<path>`, robots `index, follow`. No `NaN`, no `[object Object]`. The 5 "undefined" hits per file are inline boot-script text (`window.__awvPendingPalette = undefined`), not rendered content: not a bug.
| file | URL | title | H1 | JSON-LD @types |
|---|---|---|---|---|
| s1 | / | Awesome Video -- 4,064+ Curated Video & Streaming Resources | ~/awesome.video | WebSite, SearchAction, EntryPoint, Organization, Person, ImageObject |
| s2 | /about | About -- Awesome Video | A field journal for video engineers | FAQPage, Question, Answer, BreadcrumbList |
| s3 | /advanced | Advanced -- Awesome Video | Advanced Features | WebPage, BreadcrumbList |
| s4 | /categories | All Categories -- Awesome Video | All Categories | CollectionPage, ItemList, BreadcrumbList |
| s5 | /category/community-events | Video Community & Streaming Conferences -- Awesome Video | Community & Events | CollectionPage, ItemList |
| s6-s9 | /category/{general-tools p8, intro-learning p9, players-clients p4, standards-industry p4} | "<name> -- Page N -- Awesome Video" | name + "Page N of M" | CollectionPage, ItemList |
| s10, s14, s34 | /code-of-conduct /privacy /terms | "<name> -- Awesome Video" | matches | WebPage, BreadcrumbList |
| s11, s12 | /journey/7, /journey/9 | journey name -- Awesome Video | journey name | Course, Syllabus, WebPage |
| s13 | /journeys | Learning Journeys -- Awesome Video | Learning Journeys | CollectionPage, ItemList |
| s15-s20 | /resource/{185019,188436,188624,188627,188954,190060} | "<resource title> -- Awesome Video" | resource title | CreativeWork, WebPage, CollectionPage, BreadcrumbList |
| s21-s24 | /sub-subcategory/{ios-tvos,online-forums,podcasts,vendor-docs} | "<name> -- <parent> -- Awesome Video" | name | CollectionPage, ItemList |
| s25-s28 | /subcategory/{audio-subtitles p3, cmaf-fmp4-packaging, community-groups, drm-testing-validation-tools p2} | name (-- Page N) -- Awesome Video | name | CollectionPage, ItemList |
| s29 | /submit | Submit a Resource -- Awesome Video | Add to the index | WebPage |
| s30-s33 | /tag/{developer-forum,open-source,subtitle-editing,video} | "<Tag> Video Resources & Tools -- Awesome Video" | tag name | CollectionPage, ItemList |
Observations:
- FINDING S-2 (low, SEO): paginated pages (`?page=8`, `?page=9`, `?page=4`, `?page=3`, `?page=2`) have canonical = the paginated URL itself (self-canonical, correct) but og:image path drops the query (`path=%2Fcategory%2Fgeneral-tools`). Fine, informational.
- FINDING S-3 (low): `/submit` has 2 meta description tags (`desc=2` in the predecessor extract). Duplicate tag, search engines usually take the first. Repro: `curl -s https://awesome.video/submit | grep -c 'name="description"'`. File: client page head code for Submit (not located this run).
- FINDING S-4 (low): H1 on `/` is `~/awesome.video` plus an sr-only span (decorative terminal style); the descriptive keyword text lives in title only.
- Resource H1 sometimes concatenates the "Description" label in the extracted text (s16 "...(CMSD)Description...") because the extractor strips tags, not a rendering bug.

### 404 / 410
- `/nope-page`, `/resource/999999999`, `/resource/0`, `/resource/abc`, `/category/zz-nope`, `/tag/zz-nope`, `/journey/99999`, `/journey/abc`, `/subcategory/zz`, `/sub-subcategory/zz`: all real HTTP 404 text/html (api/status-matrix.txt). Good (no soft 404).
- Body (ssr/404.html): title "Page Not Found -- Awesome Video", H1 "Page Not Found", `robots noindex, nofollow`, no canonical, no JSON-LD.
- `/resource/184997` (a deleted id from the gap list): HTTP **410**, `cache-control: no-store` (api/gone-184997.hdr), body is the same "Page Not Found" template with noindex (ssr/gone-184997.html). Works as intended; the 410 visitor sees the generic 404 copy, not "this resource was removed".
- Redirects (all 301, status-matrix): /explore->/search, /resource->/search, /category /subcategory /tag->/categories, /journey->/journeys, /favorites->/profile?tab=favorites, /account->/profile, /subsubcategory/av1->/sub-subcategory/av1, /?q=ffmpeg->/search?q=ffmpeg. Auth: /admin and /profile 302 to /sign-in?redirect_url=...; /bookmarks serves 200.
- Static: /sitemap.xml 200, /robots.txt 200, /.well-known/security.txt 200, /llms.txt 200, /favicon.ico 200, /og-image.png 200.

### /advanced and /design-system
- /advanced: 200, indexable (`index, follow`), title "Advanced -- Awesome Video", JSON-LD WebPage + BreadcrumbList, listed in sitemap and robots Allow. Rendered content to be checked in browser (Step 2).
- /design-system: 200, `noindex, nofollow`, title "Design System -- Awesome Video", description "2 systems x 10 accents, live tokens", no JSON-LD, no canonical, absent from sitemap. Publicly reachable page with no nav entry known yet (verify Step 2).

## Findings (LANE-RULES schema: severity, repro, file:line, evidence)
| id | severity | summary | repro | file:line | evidence |
|---|---|---|---|---|---|
| S-1 | low | robots.txt has no Sitemap: directive | `curl -s https://awesome.video/robots.txt \| grep -i sitemap` returns nothing | robots source not located | e2e-evidence/.../visitor/api/robots.txt |
| S-3 | low | /submit emits 2 meta description tags | `curl -s https://awesome.video/submit \| grep -c 'name="description"'` = 2 | not located | ssr/s29.html |
(Browser-derived findings appended below as they occur.)

## Non-GET table
| method | path | trigger | count | status | auth | note |
|---|---|---|---|---|---|---|
| POST | /api/telemetry/dead-link | opening a 404 or 410 page | 1 per visit (7 visits) | 204 | public | fire-and-forget; no row I created is user-visible |
| (none) | localStorage `analytics-consent` | Decline / Allow click | n/a | n/a | n/a | client-only |
No QA writes to the catalog, accounts or members. No sign-in, no Sign out.

## Checkpoint log
- Step 1 done (SEO).
- Step 2: home + search /search?q=ffmpeg at 390/768/1280 done, screenshots opened, console/pageerror empty. Consent banner is visible on every first load (bottom bar, Decline / Allow analytics). Next: categories, category, subcategory, sub-subcategory, resource, tag, journeys, journey, advanced, design-system, header palette search, consent flows, outbound links.

- Step 2 (part 2): categories..design-system + palette at 390/768/1280, 41 screenshots opened, console/pageerror empty everywhere, no 4xx/5xx. Next: consent decline 390+1280 and accept 1280, 10 outbound links, then Step 3.
- Step 2 (part 3): consent flows done. Decline at 390 and 1280: banner gone, localStorage analytics-consent=denied, zero requests to posthog/mixpanel/amplitude/gtm, stays gone after reload (shots/consent-decline-{390,1280}.png opened). Accept at 1280: analytics-consent=granted, banner gone; zero SDK requests seen because navigator.webdriver=true suppresses SDKs (per lane rules), so the "allowed" tracking path is UNVERIFIED in-browser (owner unblock: none needed, covered by analytics lane / PostHog; not a visitor-lane blocker). shots/consent-accept-1280.png.
- Outbound links, 10 resources one per category (ids 190687 190884 190867 190864 190846 190893 190813 190765 190774 190957): page CTA href == API url on all 10, target=_blank rel="noopener noreferrer" on all, curl HEAD of the third-party host = 200 on all 10 (9 github.com, 1 forum.videolan.org). Only one third-party host family (github) in the sample because the API sample was by category order; no click-through made.
- Next: Step 3 re-checks (CLS, loading, error, offline, dead-link POST count).
- Step 3a CLS (buffered PerformanceObserver layout-shift, summed after 5.3 s, rev 1cd25ab0, non-input shifts only):
  - BUG-t-discovery-1 REPRODUCES: /subcategory/codecs at 768x1024: run1 0.0001 (first cold open in the session), runs 2,3 and reload 0.2219 (single shift at ~240 ms, sources accordion-item + av-sidebar-l2-row). Same cause as 07b (0.244). Pattern: first visit clean, repeat visits shift: consistent with the sidebar restoring disclosure state from localStorage (AppSidebar.tsx:98-132, accordion-item at :361 and :847) after hydration.
  - BUG-t-discovery-2 REPRODUCES: / at 1280x900: 0.1069 on 4 of 4 loads (single shift 263-593 ms, accordion-item x2). Over the 0.1 budget by 0.007.
  - Category page community-events at 768: 0.0001 (first visit).
- Step 3b loading states: agent-browser has no init-script command, so I patched window.fetch in-page (delay every /api/* by 5 s) after load and SPA-navigated (history.pushState + popstate) to /search?q=hls at 390/768/1280. Result at t=1.2 s: 67 skeleton nodes, role=status "Loading search results…", 6 skeleton cards, header + filters rendered (shots/loading-search-{390,768,1280}-t1s.png opened); t=7.7 s: 24 real cards, h1 Search (1280 t7s opened: "Page 1 of 17 · 402 results for hls"). Console/pageerror 0 at all widths. Works.
- Step 3b (cont.) 5 s /api delay via in-page fetch patch + SPA navigation, home / category / resource at 390/768/1280, 9 screenshots opened (shots/loading-{home,category,resource}-{390,768,1280}.png): all three show skeletons at t=1.2 s (home 91 skeleton nodes, category 102, resource 18 + status "Loading related resources…") and fully resolve by t=7.7 s with 0 skeletons left, 0 console errors, 0 page errors. Works. Two cosmetic gaps seen: (L-1, low) category loading shows a ~170 px blank band under the title skeleton before the first card skeleton (shots/loading-category-*.png); (L-2, low) resource detail loading shows the "MORE LIKE THIS" eyebrow over ~150 px of empty black with no visible skeleton (shots/loading-resource-*.png), though 18 skeleton nodes exist (not painted visibly). Both then fill without error.
- Step 3c error states (route-abort, each abort probed with an in-page fetch first: "ABORTED Failed to fetch"; note `**/api/**` glob did NOT intercept, exact URLs did; same trap as 07b):
  - Resource: aborted GET /api/resources/190884 and /related, SPA nav to /resource/190884 at 390 and 768: role=alert "ERROR · UNAVAILABLE / Resource temporarily unavailable / We couldn't load this resource. Please try again." + Retry button. After unroute, Retry click at 768 reloads the real resource (h1 Bjontegaard_metric). Works. shots/error-resource-{390,768}.png, error-resource-retry-768.png. 0 console errors, 0 page errors.
  - Home: aborted GET /api/home and /api/resources/kinds/counts, SPA nav to / at 390 and 768: "ERROR · UNAVAILABLE / We couldn't load the catalog / The home index is temporarily unavailable. Please try again." + Retry. Works. shots/error-home-{390,768}.png (opened). 0 console / 0 page errors.
  - Finding E-1 (info): a full-page load of home or a resource never shows these panels when /api is blocked, because the data is server-embedded; only SPA navigation exercises them. Not a bug.
- Step 3d offline (context offline at 390 and 1280, /subcategory/codecs): "You're offline" panel with Retry; reconnect auto-loads the page (h1 "CMAF & fMP4 Packaging"); console clean. shots/offline-subcat-{390,1280}.png. Works. 768 pending (see below).
- Step 3e BUG-t-telemetry-1 NOT reproduced on 1cd25ab0: POST /api/telemetry/dead-link = 1 per visit on /zz-no-such-page-r2-1280, /zz-no-such-page-r2-390, /resource/1 (x2 visits), /category/zz-nope and the 410 /resource/184997; each 204. 07b saw 2 POSTs 0.76 s apart on /resource/1.
- Unopened shots viewed this checkpoint: gone-1280 (shows the standard "Page Not Found" shell, footer present), consent-accept-1280 (banner gone, home renders).
- Nav reachability: /advanced, /journeys, /settings/theme are sidebar-footer links (no /journeys in header); /design-system only via /settings/theme > "Explore the full design-system" (2 clicks). Home tag chips link to /?tags=, not /tag/. Palette via Ctrl+K or header search button. O-1: at 390 `.page-content-wrap` leaves 304 of 384 px (layout.css:47-66, back-to-top lane).
- Step 3f closing cells: offline at 768 (shots/offline-subcat-768.png, "You're offline" + Retry, reconnect restores h1 "Page Not Found"-free page: OK), 404 at 768 and 1280 (h1 "Page Not Found", footer present), home error at 1280 (role=alert "We couldn't load the catalog" + Retry, shots/error-home-1280.png), 390 hamburger (shots/hamburger-390.png: Home, Browse, Submit, About, 9 categories; /journeys /advanced /settings/theme links present in DOM), keyboard-only at 1280 (Tab order skip link > logo > search > Browse > Submit > About, 2px solid focus outline on each, Enter on About lands /about; shots/keyboard-1280.png). 0 console/page errors.
- Round 2 closing cells (lead 21:31Z):
  - Resource error state 1280: abort /api/resources/190884 (+/related), probe "ABORTED Failed to fetch", SPA nav: role=alert "Resource temporarily unavailable" + Retry, 0 console errors. shots/error-resource-1280.png (opened).
  - Keyboard-only 1280 on home, search, category, resource: Tab order skip link > logo > search > Browse/Submit/About/Docs > Sign in > sidebar (or Back) > main; 2px solid focus outline on every stop, all visible in viewport; main content reachable (home tag chips and search input, search facets, category Filters & view and subcategory/resource links, resource Back, breadcrumb, 3 related, "View on GitHub" at Tab 15, then Favorite/Bookmark). Observations: skip link activates #main OK; search page autofocuses its input; home focus starts on BODY; resource page has no skip-nav surprises. shots/kbd-main-*-1280.png, kbd-resource-late-1280.png (opened). No finding.
  - Accept consent with navigator.webdriver=false (own Chrome 157, temp profile, port 9351, no --enable-automation, own PID killed): webdriver false, consent null -> granted; over /, /about, /search?q=ffmpeg vendors received: googletagmanager (GET 200), www.google-analytics.com/g/collect (POST 204 x3), api-js.mixpanel.com (POST 200), api2.amplitude.com (POST 200, OPTIONS 200) + gs/cdn/sr-client-cfg.amplitude.com (GET 200), us.i.posthog.com (POST 200) + us-assets.i.posthog.com (GET 200), i.replit.com (Umami, POST 200). No first-party non-GET. Names/status only, bodies/cookies not read. api/r2-accept-vendors.txt, shots/accept-real-chrome-1280.png. Matches 07b accept.1280.
- STATUS: DONE. Every function has a result at 390/768/1280; no remaining open cells. Findings: CLS-1, CLS-2 (degraded), S-1, S-3, L-1, L-2 (low), O-1 (info).
