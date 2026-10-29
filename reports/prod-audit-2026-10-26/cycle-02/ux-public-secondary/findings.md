# ux-public-secondary — findings (cycle 02)

- Revision: `c25cd76f9b618e478c2db71b6e6caaf97ad5eaf4`, read from `/api/version` at the start (16:56:40Z) and the end (17:20:15Z). The start gate was already met.
- Signed out throughout. No sign-in and no writes. The contact form was only submitted while invalid; the network list shows no `/api/contact` request. No created-rows.md because nothing was created.
- Tools: chrome-devtools isolatedContext `ux-secondary-c2` at 1440x900, 820x1180 (mobile+touch, pointer:coarse = true) and 390x844 (mobile+touch). Reduced motion was emulated. Consent was declined and `umami.disabled=1` set first. Single curl reads for SSR, robots and sitemap.
- Verdict: **ISSUES (6 findings: 0 CRITICAL / 0 HIGH / 0 MEDIUM / 6 LOW)**. All 8 cycle-1 findings (PS-01..PS-08) are FIXED.

| id | sev | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| PS-09 | LOW | /search?q=zzqxvqq (any zero-result query) | all | With no results, the filter sidebar says "No further filters apply to these results. Use search, **type** or sort to narrow them." /search has no "type" control. Expected copy that names only controls on the page. | `search-nonsense-1440.png` | `client/src/components/search/SearchFilters.tsx:158` (copy shared with TaxonomyListing) |
| PS-10 | LOW | command palette, empty query | all | The footer count is one short. 14 rows (5 categories, 4 featured, 5 Pages incl. "Get in touch") show "**13 suggestions**". With a recent search, 15 rows show "14 suggestions". Expected the count to equal the rows listed. | `palette-open-1440.png`; eval at 1440 and 390: `items:15, footer "14 suggestions"`; `palette-recent-a11y.txt` | `client/src/components/ui/search-dialog.tsx:133-134` counts `PAGES.length` (4) but the Pages group also renders `ContactPaletteItem` (`:248-249`) |
| PS-11 | LOW | /search (no query) | all | The empty state says "Narrow the catalog by category, **provider, format, skill level**, or tag." Those facets never render: the API returns providers, formats and skillLevels = `[{value:"unknown",count:3825}]` for the whole catalog, and `collapseInert` hides them. The copy promises filters that do not exist. | `facets-catalog.txt`; eval of /search facets | `client/src/pages/Search.tsx:284`; `SearchFilters.tsx:149-151` |
| PS-12 | LOW | /continue-learning (signed out) | all | The SSR description and og:description say "Resume journeys, revisit resources, and see learning milestones on Awesome Video." The hydrated signed-out page says "Sign in to resume your learning activity on Awesome Video." The SSR h1 already uses the signed-out copy; only the description diverges. Noindex. | `ssr-heads.txt` vs `hydrated-heads.json`; hard-load eval | `server/og-middleware.ts:796` vs `client/src/pages/ContinueLearning.tsx:200` |
| PS-13 | LOW | /settings (signed out) | all | The SSR ships no h1 or body (`<div id="root"><!--app-html--></div>`, 0 `<h1>`). The hydrated page renders h1 "Settings". Same class as PS-08; commit c8a2b076 left /settings out. Noindex. | `ssr/_settings.html`; hydrated eval `h1:["Settings"]` | `shared/seo-templates.ts:13-34` (no `/settings` in `staticPageHeads`); `server/og-middleware.ts:829` |
| PS-14 | LOW | /sign-in | 820, 390 (touch) | Clerk's "Use phone" toggle (`cl-formFieldAction__identifier`, an `<a>` acting as a button) is **62x16** under pointer:coarse. Every other card control is ≥44 (social 62x44, inputs 44, Show password 50x44, Continue 44, Sign up 47x44). The 24px spacing exception holds (center y 439, next target at 456), so this fails only the 44px touch rule. | `sweep-touch-390.json`, `sweep-touch-820.json` | `client/src/lib/clerk-appearance.ts:405-407`: `formFieldAction` has only `color`, no `minHeight` (cf. `formResendCodeLink` `:424-431`) |

## Cycle-1 re-checks
| id | status | evidence |
|---|---|---|
| PS-01 palette close 33x23 | FIXED | 390 touch: `Close search 44x44` (`palette-hls-390.png`); 1440: 33x24 |
| PS-02 View-all row 330x40 | FIXED | 390 touch: 330x44; Recent row 330x44 |
| PS-03 Clerk Show password 50x38 | FIXED | /sign-up and /sign-in at 820 and 390 touch: 50x44 |
| PS-04 /design-system SSR "5 systems" | FIXED | SSR and hydrated both say "2 systems × 10 accents" |
| PS-05 c++ too short | FIXED | /search?q=c%2B%2B: 47 results (VCodec Interface C++ Library first). c# 11, .net 16 (Axinom CPIX (.NET) first). Palette 47 matches. API `c%2B%2Bfoo` → 0 |
| PS-06 featured 60-char cut / "13 results" | FIXED | Clamped with an ellipsis at a word boundary (`palette-open-1440.png`); footer says "suggestions" (off-by-one count is new PS-10) |
| PS-07 System default previews override font | FIXED | With JetBrains Mono: the Editorial card shows Inter, the Geist card shows Geist |
| PS-08 SSR h1 ≠ hydrated h1 | FIXED | 25 routes identical in title, h1, description, canonical, og:url and robots between SSR and hydrated. Exceptions: the PS-12 description and /settings (PS-13, not in the cycle-1 list) |

## Passed (driven, with evidence)
- **/search:**
  - c++, c#, .net, ffmpeg (433), nonsense (designed no-results with category chips), empty, `++`/`#` (No query state), `a/b` typed live (URL `q=a%2Fb`; `/` inside the field does not open the palette);
  - `page=999` → `page=19` with a notice;
  - Sort listbox options 136x44; keyboard → `sort=name-asc`, A–Z order, focus on the results region;
  - category facet chip plus Clear all (171);
  - legacy `?tags=hls,dash&category=encoding-codecs` → chips, 2 results; `?tag=hls&tags=dash&sort=bogus` → chips plus the invalid-filters panel;
  - 390 touch: controls and pagination ≥44; the Filters sheet has no sub-44 control and Escape returns focus to Filters (`search-filters-sheet-390.png`).
- **Palette:**
  - Opens from the header click, ⌘K, Ctrl+K and `/`. Escape returns focus to the trigger. End selects only View all; Enter → /search and saves a recent search.
  - Clear (44x44 on touch) removes the group and the storage key and keeps focus in the input.
- **/journeys:** 5 journeys; keyboard filter → `?category=Encoding+%26+Codecs` (1 journey); a bogus category gives an honest empty state. **/journey/8:** 6 steps, guest log-in link with `redirect_url`, step rows 716x44, external icons 44x44.
- **/settings/theme:** 2 systems × 10 accents (20/20) apply `data-system`, `data-accent` and the right `--accent` hex; Geist + Rose + JetBrains Mono persists across reload (`theme-geist-rose-jbmono-1440.png`); reset to Editorial/Crimson/System default.
- **Contact dialog (390 touch):** fits the viewport; controls ≥44. An empty submit gives 4 aria-invalid fields and focus on Name. A bad email plus short message gives 3 invalid fields and focus on replyTo. No `/api/contact` request. Close returns focus. No console errors.
- **Cookie settings:** Decline stores `denied` in localStorage and the cookie; reopen moves focus into the region; Escape closes it, returns focus and keeps the choice.
- **Static and guest pages:** one h1 each and no horizontal overflow at 390 or 820. Target failures only PS-14. Inline-text exceptions: the Privacy cookie button 141x24 and the "log in" links. The /settings radios sit in 64px labels.
- `/notifications` → 302 to `/sign-in?redirect_url=%2Fnotifications` (curl and browser).
- **404s:**
  - 15 variants return 404 with SSR h1 "Page Not Found" and noindex (`404-variants.txt`), including subcategory, sub-subcategory, tag, resource abc/-1/1.5, journey abc, collection(s), deep path and unicode;
  - the hydrated page matches (`404-resource-390.png`);
  - `/api/nope` → 404 JSON; trailing slash and uppercase paths 301 to canonical.
- **robots.txt:** 200 text/plain, Sitemap line, private routes disallowed in every group. **sitemap.xml:** 4,493 unique URLs, no noindex routes, 14 random samples 200; each category's last page is 200 and the next page is 404.
- **Reduced motion:** `scroll-behavior` auto, palette has 0 running animations, paging scroll is instant.

## UNVERIFIED
- Offline search card: not driven.
- 1440 target sweep: not run page by page (the touch sweeps at 820 and 390 cover every page with stricter floors).
- Hydrated parity: 23 of 25 routes were read after in-app navigation (pushState + popstate); hard loads only for /design-system, /search?q=ffmpeg, /continue-learning, /settings, /resource/999999999 and /journey/8.
- Keyboard: the full Tab order was not re-walked beyond the palette, sort, journeys filter and contact dialog.
- Visual review: screenshots were reviewed only for the palette, Filters sheet, theme, no-results and 404 pages; other pages by DOM probe.
- Guest "Start Journey" button on /journeys: not clicked this cycle.
