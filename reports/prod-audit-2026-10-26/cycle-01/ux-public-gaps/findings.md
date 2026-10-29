# ux-public-gaps — cycle 01 (ux-validator-7)

- Site: https://awesome.video, revision `229f004d6cf10eea93a69bf3120d3f66fda7de99` (checked at start 2026-10-26T09:56:21Z and end 10:21:37Z).
- Browser: chrome-devtools MCP, isolated context `ux-gaps`, signed out, consent denied by initScript. No writes and no submissions.
- Touch emulation `390x844x3,mobile,touch` and `820x1180x2,mobile,touch`: `matchMedia('(pointer: coarse)')` = true and `(hover: none)` = true on every page probed. Fine pointer is `1440x900x1`.
- Theme on every capture: `data-system=editorial`, `data-accent=crimson`.

## Verdict: ISSUES (1 medium, 2 low). Every brief item was driven.

## Findings

### PG-01 — Medium — In-app navigation announces nothing and drops focus to `<body>`
- **Pages / widths:** every public route (tag → tag, journeys → journey detail, search → resource); 820 and 1440.
- **Saw:** after a client-side route change, `document.activeElement` is `BODY` and the page has no `aria-live` or `role=status` region (`announcers: []`). An a11y snapshot taken right after search → `/resource/184998` has no focused node and no live region (`snap-route-change-resource-1440.txt`). Only `document.title` changes (for example "Videojs Contrib HLS — Awesome Video"), and screen readers do not reliably announce title changes in a single-page app. `/journey/7` passes through the transient title "Loading journey — Awesome Video" first. The next Tab lands on the page's first control in `<main>` ("Back"), so sighted keyboard users are fine.
- **Expected:** a route announcer (polite live region with the new page title or H1), or focus moved to the H1 or `<main>` on path change.
- **Exception (works):** the paginator moves focus to the `region "Search results"` (snapshot shows `focusable focused`), so page changes inside /search are announced.
- **Evidence:** `snap-route-change-resource-1440.txt`; eval output in this run (tag/hls → tag/dash: `focus: BODY`, `live: []`).
- **Likely source:** `client/src/App.tsx:517` (router shell) and `client/src/lib/nav-history.ts:83-88`. A path change only calls `window.scrollTo(0,0)`. No announcer component exists; grep for `RouteAnnouncer` / shell-level `aria-live` finds none.

### PG-02 — Low — Tag pills have no hover state (1440, fine pointer)
- **Pages:** home featured cards (`.home-resource-tag`) and category/taxonomy resource cards (`Filter by tag …` links).
- **Saw:** computed color, background and border are identical at rest and on `:hover` (home: `rgba(244,243,238,.66)` / `.024` / `.08` both states; category: `rgb(244,243,238)` / transparent / `.08` both states). The cursor is `pointer`, but nothing else signals that the pill is a separate link from the card. On home the parent card does react (border, glow, title turns accent).
- **Expected:** a distinct hover affordance on an independently clickable pill.
- **Evidence:** `hover-tag-pill-default-1440.png` and `hover-tag-pill-hover-1440.png`, `hover-cat-pill-hover-1440.png`.
- **Likely source:** `client/src/styles/pages/home.css:596-602` (`.home-resource-tag` has no `:hover` rule); `.resource-card__tag-link` in the taxonomy card styles.

### PG-03 — Low — Category card keyboard order runs bottom to top (1440)
- **Page:** `/category/encoding-codecs` (taxonomy cards), 1440.
- **Saw:** with real Tab presses the order is title → tag pills (bottom of card) → "View details" / "Show 2 more tags" / "Open Link". The last three sit in `.resource-card__reveal`, which is absolutely positioned at the top-right. Focus jumps from the bottom of the card back up to its top. Every stop has a visible 2px accent ring, and `:focus-within` correctly reveals the row (it is `visibility:hidden; opacity:0` at rest under a fine pointer).
- **Expected:** DOM order matches visual order: reveal actions before the tags, or the tags placed after the actions.
- **Evidence:** `kb-cat-card-reveal-focus-1440.png`; eval output (`View details …` focused at 496,244 after `Filter by tag SDK`).
- **Likely source:** `client/src/components/resource/ResourceCard.tsx` (markup order); `client/src/styles/pages/taxonomy.css:388-405`.

## Brief items — results

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Hover-only controls under coarse pointer: home, categories, category, subcategory, sub-subcategory, tag, resource, search, journeys, journey detail, about, submit (signed out), settings/theme | **PASS**: 0 elements hidden at rest on all 13 page types at 390 (and 820 for category, subcategory, sub-subcategory, tag, search, journeys, journey/7). Taxonomy card actions are revealed by `@media (hover:none)` (taxonomy.css). Every interactive element under 44px was a plain link (breadcrumbs, the inline "PRs welcome" link, the about inline link, journey title links of 39–43px) or a stretched-overlay card title, all of which are excluded or pass the 24px rule. Pagination links are ≥44 at touch widths (32×32 only at 1440). | eval outputs in run; `share-390-after-tap.png` |
| 1 | Tap each card, pill and control type once | **PASS**: home card body → `/resource/186450`; "Show 2 more tags" (80×44) expands to 5 tags with `aria-expanded=true`; tag pill → `/tag/dash`; subcategory link; "Start Journey" → `/journey/7`; Filters & view disclosure; Filters sheet; drawer; palette; account menu; Contact maintainers; Share | snapshots `snap-*.txt` |
| 2 | Backdrop tap: Filters sheet (390 + 820), mobile drawer (820), search palette (820), account menu (820), contact dialog (820) | **PASS**: each one closes. Focus returns to the trigger ("Filters", "Toggle sidebar", "Search 3,825 resources", "Contact maintainers"). A tap on the backdrop over a link does not activate the link. The account menu, tapped outside on the H1, closes with focus on `<main>` (standard behaviour for an outside pointer); Escape returns focus to the trigger. The contact draft survives an accidental backdrop tap (reopened with `name="a/b"`). | `snap-filters-sheet-390.txt`, `snap-drawer-820*.txt`, `snap-palette-820-verbose.txt` |
| 3 | Keyboard on /search (1440) | **PASS**: input → Sort combobox → 9 category facets → 3 `<summary>` groups (their contents are correctly skipped while closed) → per result: Favorite, Bookmark, title, View details, Open Link, Suggest edit. Every stop shows `:focus-visible` with a 2px `#ff3d52` outline. Enter on a title opens the resource; Enter on Next loads page 2 and focuses the results region. Escape in the input clears the query and URL and shows the "NO QUERY" empty state with focus kept in the input. | `kb-search-1440-facet-focus.png`, `kb-search-1440-next-focus.png` |
| 4 | `/` typed inside text inputs | **PASS**: /search input `hls/dash` (820), palette input `a/b`, contact name field `a/b`, home "Search the catalog" `hls/dash`. No palette opened in any of them. Control: `/` from `<body>` opens the palette with an empty input. | eval outputs in run |
| 5 | Offline (820) | **PASS**: typing in /search while offline shows the card "OFFLINE · You're offline · Search couldn't reach the catalog… Results will load on their own when you reconnect · Retry". A footer link to /category/encoding-codecs shows "You're offline · This page couldn't load…" plus Retry, with title "You're offline — Awesome Video" and the sidebar/footer intact. After restoring the network, the category loads by itself (24 cards). | `offline-search-820.png`, `offline-category-820.png` |
| 6 | Route announcement | **FAIL → PG-01**. Announced only via `document.title`; there is no live region and focus lands on `<body>`. | `snap-route-change-resource-1440.txt` |
| 7 | Hover states (1440) | Home featured card: border `.08→.16`, bg `.024→.05`, accent ring plus glow, `translateY(-2px)`, title goes to accent ink `color(srgb 1 .30 .376)` on near-black, about **6.0:1** (passes 4.5). Category card: same treatment. Tag pills: none → **PG-02**. | `hover-home-card-default-1440.png`, `hover-home-card-hover-1440.png`, `hover-cat-card-default-1440.png`, `hover-cat-card-hover-1440.png`, `hover-tag-pill-*.png` |
| 8 | Share button (390, mobile emulation) | `navigator.share` is a function in emulation, so `handleShare` takes the `web_share` branch (`client/src/pages/ResourceDetail.tsx:531-575`). Tapping Share produced no toast, no console message and no visible change; focus stayed on the button. The copy-link toast appears only when `share()` rejects or Web Share is missing. **UNVERIFIED**: the automation browser has no native share sheet, so the user-visible outcome can't be observed here. | `share-390-after-tap.png` |
| 9 | 820 Editorial × Crimson screenshots | **PASS** (looked at each one): home, category, resource and search all render Editorial × Crimson with no horizontal overflow (`scrollWidth 820`). Home and category show the persistent 240px sidebar; resource and search are full width. The home H1 shows "~/awesome.video" in mono by design (`aria-hidden` caret plus sr-only "Awesome Video Resources", `HomePresentation.tsx:622-625`). | `home-820-editorial.png`, `cat-encoding-820-editorial.png`, `resource-820-editorial.png`, `search-820-editorial.png` |

## Not filed / notes
- The roughly 6px horizontal shift between default and hover captures at 1440 is an automation artifact: the classic scrollbar appears after the first synthetic mouse move (`clientWidth 1440→1434`). Real users always have the scrollbar, because the page is always taller than the viewport.
- Real taps on a backdrop over **non-interactive** content could not use the MCP `click` (it waits for the target to be uncovered). Those were driven with a dispatched touch `pointerdown/pointerup/click` on the overlay element at a real coordinate (Filters sheet at 390, palette, contact dialog). The drawer and Filters sheet at 820 were closed with genuine MCP clicks on uids under the overlay.
- After the offline test, `navigate_page` kept a 10s timeout, and one home navigation reported a timeout even though the page loaded. That's tool state, not a site issue.

## Still unverifiable
- Native share-sheet result (item 8): there's no share UI in automation Chrome.
- Real screen-reader speech: the a11y tree shows what is exposed; no VoiceOver or NVDA was run.
