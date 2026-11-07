# UX audit — public browsing core (signed out) — cycle 01

- Auditor: ux-validator-1 (read-only)
- Site: https://awesome.video
- Revision audited: `f476d79cc83373e34c6249c10bec680e98e2fd51` (`/api/version` at start and at end)
- UTC window: 2026-10-26T08:48:46Z → 2026-10-26T09:19:52Z
- Tools: chrome-devtools MCP (isolatedContext `ux-core`, plus `ux-core-cookie` for the banner) and agent-browser session `ux-core`. Consent was denied and umami was disabled before every load, except in the cookie-banner context, where only umami was disabled.
- Widths: 1440×900, 820×1180 (mobile, touch) and 390×844 (mobile, touch). Passes: keyboard, reduced motion, Editorial/Geist, cookie banner.
- Status: **ISSUES** (0 critical, 0 high, 4 medium, 8 low)

## Findings

| id | sev | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| PC-01 | MEDIUM | /category/encoding-codecs?page=3 → Next / page-jump | 1440, 390 | **Saw:** after Next, the window scrolls to `scrollY 0` and focus goes to the results region with `preventScroll`. The new results start below the fold: about 984px down at 1440 and 2271px down at 390 (first card at 2384), so the user sees an unchanged hero and filter panel. **Expected:** the viewport lands on the results heading, or the hero collapses. | cat-encoding-1440-after-next-page4.png, cat-encoding-390-after-next-page2.png | client/src/pages/TaxonomyListing.tsx:566-570 (`window.scrollTo({top:0})` plus `requestResultsFocus` with preventScroll) |
| PC-02 | MEDIUM | /category/encoding-codecs?page=3 → Next, with `prefers-reduced-motion: reduce` emulated | 1440 | **Saw:** with reduced motion on (`matchMedia` true), clicking Next animated a smooth scroll from 3774 to 0 over 160 distinct frames, about 1445ms (rAF-sampled). **Expected:** an instant jump when reduced motion is set. Home itself honours it: 0 running animations and 0 transitions. | inline rAF sample in this run (no screenshot; motion) | TaxonomyListing.tsx:569 `behavior:"smooth"` unguarded. Same pattern: TagLanding.tsx:261, Search.tsx:255, MainLayout.tsx:73 |
| PC-03 | MEDIUM | every page with the sidebar (e.g. /, /category/encoding-codecs) | 1440, 820 | **Saw:** L3 nested-group counts render in `--text-4` (rgba(244,243,238,0.22)) at 9.5px, about 1.7:1 on the sidebar background. **Expected:** ≥4.5:1 for informational text (WCAG 1.4.3). | home-1440.png, cat-encoding-1440.png | client/src/styles/shell/sidebar-tree.css:128-131 |
| PC-04 | MEDIUM | / (fresh visitor, no consent stored) | 390 | **Saw:** below 640px the consent banner is `order-first`, so it renders at the top (top 0–141, header pushed to 141). In the DOM it sits after `<footer>` (`compareDocumentPosition` = FOLLOWING; a11y tree has the Decline/Allow buttons after "Cookie settings"). A keyboard or switch user must tab through the whole page before reaching the controls they see first (WCAG 2.4.3). **Expected:** visual and focus order agree. The App.tsx comment says the banner "stays fixed at the bottom visually", which is only true at ≥sm. | consent-banner-390.png, snap-consent.txt (lines 229 vs 240) | client/src/components/ui/consent-banner.tsx:214,258 (`order-first … sm:order-none`) + client/src/App.tsx:826-833 |
| PC-05 | LOW | / consent banner | 390 | **Saw:** the "Privacy Policy" link has `text-decoration: none` and differs from the surrounding copy only by colour: rgb(244,243,238) vs rgba(…,0.66), about 2.3:1 between them (WCAG 1.4.1 needs 3:1 or a non-colour cue). Its `inline-flex min-h-10` (40px) line box also adds a visibly larger gap between banner text lines 2 and 3. **Expected:** an underlined inline link with normal leading. | consent-banner-390.png | consent-banner.tsx:222,277; client/src/styles/pages/system-overlays.css:49-53 |
| PC-06 | LOW | /subcategory/mobile-web-players | 1440, 390 | **Saw:** this subcategory has 3 sub-subcategories (Android 20, Web Players 23, iOS/tvOS 29), but main content has no links or tiles to them (0 `a[href^="/sub-subcategory/"]` in `<main>`). They appear only as options in the collapsed "Filters & view" select, or in the sidebar, which is hidden on phones. "More in Players & Clients" lists sibling subcategories only. **Expected:** child tiles, as category pages have. | sub-mobile-web-players-1440.png, sub-mobile-web-players-1440-bottom.png | TaxonomyListing.tsx:657 (child tiles gated to `level === "category"`) |
| PC-07 | LOW | /category/encoding-codecs (page 4, page 25) | 1440 | **Saw:** the default A–Z order is case-sensitive: "avpipe" and "transcode2H265" sort after "Vireo" on the last page, and "ffmpeg-apple-arm64-build" and "libVLC" after capitalised titles. **Expected:** case-insensitive order, as ResourceRepository uses `lower(title)`. | cat-encoding-1440-page25-pagination.png, cat-encoding-1440-listview.png | server/repositories/LegacyRepository.ts:107 `asc(resources.title)` |
| PC-08 | LOW | site-wide, Editorial system | 1440, 820, 390 | **Saw:** global `font-feature-settings: "tnum"` gives hyphens figure width, leaving visible gaps: "go - astisub", "Hand - picked", "speed - versus - efficiency", "20 - 40". At Inter 700 48px the hyphen measures 31px with tnum vs 22.5px without. Geist renders hyphens normally. **Expected:** tnum scoped to numeric UI. | res-186335-1440.png, res-186335-390-report-toast.png, res-190152-820.png, home-1440.png (vs res-186335-1440-geist.png) | client/public/ds/design-system.css:51 |
| PC-09 | LOW | any page → account menu opened with a mouse click | 1440 | **Saw:** after a pointer click, the open Radix menu content draws a full 2px crimson focus outline. **Expected:** no ring on pointer open; the ring only on keyboard focus of items. | account-menu-1440.png | client/src/styles/app-bridge.css:208-216 (`:where(…,[tabindex]):focus-visible` matches the content's tabindex=-1) |
| PC-10 | LOW | / scrolled to y≈1700 | 1440 | **Saw:** the fixed back-to-top button (1366–1410 × 832–876) overlaps the "Submit a resource" CTA (`link-submit-resource`, right 1375, bottom 841). `elementFromPoint` at the overlap returns back-to-top. **Expected:** no overlap, e.g. a bottom inset or reserved gutter. | home-1440-s1700.png | client/src/components/layout/new/MainLayout.tsx (back-to-top) + client/src/components/home/HomePresentation.tsx:572 |
| PC-11 | LOW | /category/players-clients → "Filters & view" → "Filters" sheet | 820 | **Saw:** the sheet is full height (360×1180), but the tag list sits in a 224px box (`max-h-56`, scrollHeight 1056), so only 5 of 24 tags show and more than half the sheet is empty. There's no scroll hint (other facets have one), and the footer "Showing 24 of 268 tags" reads as if 24 are on screen. **Expected:** the list uses the sheet height, or shows a scroll cue. | cat-players-820-filters-sheet.png | client/src/components/search/SearchFilters.tsx:160-165 |
| PC-12 | LOW (content) | /resource/190151 and home "Recently indexed" | 1440 | **Saw:** "MirrorFly IM Software" is an off-topic commercial chat SDK, carrying the tag typo "#ENTEPRISE CHAT SOFTWARE", and it is promoted on the home rail. **Expected:** on-topic entries with correctly spelled tags. | res-190151-longdesc-1440.png | data (resources/tags rows), not code |

## Verified working (no finding)

- **Counts:** `/api/categories` sums to 3825, and every category count shown matches. Category-page and filter-select counts are consistent: Mobile & Web Players 20+23+29+11 = 83; Players & Clients 447 / 19 pages. Tag counts match `/api/tags` (hls 64, av1 19, go 7).
- **SEO head:** title, canonical and robots are correct on every page checked (home, categories, category, subcategory, sub-subcategory, tag, resource). `/settings/theme` is `noindex, nofollow`.
- **Overflow:**
  - scrollWidth equals viewport width on every page at every width.
  - The only right-edge offenders at 390 were inside `.sr-only`.
  - The 390 drawer's footer status and list overhang the drawer edge by 4px, which isn't visible.
- **Target size:**
  - **820:** no failures on home, the category page (with the filters panel and sheet), the resource page, the tag page or the footer.
  - **390:** no failures on home, the category page, the resource page or the subcategory page.
  - **Hit areas:** card controls (favorite, bookmark, view-details, tag pills, "+N more", visit, suggest-edit) are all 44px hit areas at touch widths. Sidebar "+N" expanders are 58×44 buttons.
- **Hover-only controls:** none are hidden at rest at touch widths.
- **Drawer:**
  - 820: 340px wide, all 62 controls ≥44px.
  - 390: 335px wide, page scroll locked.
  - Escape closes it and focus returns to "Toggle sidebar".
- **Filters:**
  - The "Filters & view" panel opens, selects are 310×44 at 390, and the view radios are 44×44.
  - The Filters sheet closes on Escape and returns focus to `button-open-filters`.
- **Signed-out actions:**
  - Favorite, Suggest Edit and Report broken link each show a sign-in toast with a working "Sign in" (`/sign-in?redirect_url=…`).
  - The toast's Sign in and Dismiss buttons are 44px at 390.
  - Bookmark saves on the device and shows a toast.
- **Keyboard:**
  - "Skip to main content" is the first stop, and Enter moves focus to `main#main`.
  - Order: logo → search → nav → account → sidebar, with a visible 2–3px ring on every stop.
  - ⌘K opens the search dialog with focus in the input, and Escape closes it and returns focus.
  - The card title gets a visible ring and its hidden card controls reveal on focus-within; Enter opens the resource.
  - The account menu closes on Escape with focus returned (1440).
- **Reduced motion:** home has 0 running animations and 0 transitions under `reduce`. Only the programmatic smooth scroll fails (PC-02).
- **Themes:**
  - Geist (cyan default accent) renders home and resource cleanly with no overflow.
  - Restored to Editorial × Crimson through the picker afterwards (`data-system=editorial`, `data-accent=crimson`).
- **Cookie banner:**
  - It appears on a fresh visit, in flow at the top at 390.
  - Escape dismisses it for the session without storing a choice.
  - Decline stores `analytics-consent=denied`, removes the banner and moves focus to main.
  - Footer "Cookie settings" reopens it, scrolls to the top and focuses it.
  - No GA, Mixpanel, PostHog or Amplitude requests before consent.
  - No console errors or warnings.
- **Console:** no console errors on any page checked.

## Not verified / notes

- **Share:** it hands off to native `navigator.share` under mobile emulation and showed no observable result in automation, so it is **UNVERIFIED**.
- **Known issue #42 (`?page=abc`):** seen as already known and not re-filed.
- **Replit script:** `https://i.replit.com/script.js` (Replit hosting analytics) loads before any consent choice. umami.disabled was set, and no beacons were observed. This is hosting-injected; I didn't investigate further.
- **Slow tag load:** a single `navigate_page` to `/tag/av1` at 820 hit the tool's 10s load timeout, but the page was rendered and correct. It didn't recur, so it isn't filed.
- **Backdrop tap:** closing the drawer and sheet by tapping the backdrop was not exercised (no coordinate tap tool), only Escape and the Close button.
- **Route-change announcement:** after SPA navigation (category → resource), activeElement is `<body>` and no populated live-region announcement was found. The next Tab lands on "Back" in main. Not filed: no screen reader was available to confirm what is announced.
