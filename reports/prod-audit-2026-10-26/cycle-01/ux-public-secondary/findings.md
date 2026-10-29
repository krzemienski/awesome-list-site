# ux-public-secondary — findings (cycle 01)

- Revision: `f476d79cc83373e34c6249c10bec680e98e2fd51` (`/api/version` at start 08:49:00Z and end 09:10:58Z)
- Window (UTC): 2026-10-26 08:49 – 09:11. Signed out throughout. No sign-in, no submissions, no POST/PUT/DELETE (contact form only submitted while invalid; network list shows no `/api/contact` request).
- Tools: agent-browser session `ux-secondary` (1440/820/390 layout sweeps); chrome-devtools isolatedContext `ux-secondary` (real touch emulation, below-fold clicks, keyboard, reduced motion).
- Verdict: ISSUES (8 findings, 0 CRITICAL / 0 HIGH / 1 MEDIUM / 7 LOW).

| id | sev | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| PS-01 | MEDIUM | any page → command palette | 820, 390 (touch) | The palette's only visible close control (`esc` kbd, sr-name "Close search") measures **33×23**. That is under the 44px touch floor and under 24px tall. Expected ≥44×44 at touch widths. | `palette-hls-390.png`; chrome-devtools 820 touch: `paletteClose:[33,23]`; 390 touch: `["escClose search","33x23"]` | `client/src/styles/shell/palette.css:303-313` (`.search-palette-close` has no min size); `client/src/components/ui/search-dialog.tsx:379-382` |
| PS-02 | LOW | palette, query `hls` | 390 (touch) | The "View all results for “hls”" option is **330×40**, under the 44px touch floor for menu items. Expected ≥44 tall. | 390 touch probe: `["allView all results for “hls”→","330x40"]` | `search-dialog.tsx:454` (`search-view-all`), `palette.css` item min-height |
| PS-03 | LOW | /sign-up | 820, 390 (touch) | Clerk's "Show password" button is **50×38**. Every other control on the Clerk card is held to 44px. Expected ≥44 tall. | `signup-820-touch.png`; chrome-devtools 820 touch `showPw:[50,38]`; `sweep-touch.txt` | `client/src/lib/clerk-appearance.ts:346-387`: the 44px rules cover social, OTP and input, with no `formFieldInputShowPasswordButton` key |
| PS-04 | LOW | /design-system | all | The SSR `<meta name=description>` and `og:description` say "**5 systems** × 10 accents"; the hydrated page says "**2 systems** × 10 accents" and offers 2 systems. Stale server copy that crawlers and social cards see. | `ssr-heads.txt` (/design-system); hydrated read: `"…design system — 2 systems × 10 accents…"` | `server/og-middleware.ts:835` |
| PS-05 | LOW | /search?q=c%2B%2B | 1440 | Searching **"c++"** shows "QUERY TOO SHORT · Keep typing to search · Type a word of at least 2 letters", although 3 characters were typed and the catalog has C++ resources ("VCodec Interface C++ Library", "Google Cloud Video Services C++ Client Library"). The API also drops the `++`: `search=c%2B%2B` returns unrelated results (MediaMTX first). Expected: the C++ results, or an honest message. | eval output in session log (`c%2B%2B` → too-short panel); `curl …/api/resources?search=c%2B%2B` | `shared/searchNormalize.ts` (`tokenizeSearchQuery` / `isSearchableQuery`); `client/src/pages/Search.tsx:189-194,283` |
| PS-06 | LOW | palette (empty query) | all | Featured-item descriptions are cut at exactly 60 characters mid-word with no ellipsis: "…packaging media content (e", "…software for live streamin", "…detailing the SRT protocol,". The footer also says "13 results" before any search. Expected a word-boundary cut with an ellipsis (CSS clamp), and no "results" count for suggestions. | `palette-open-1440.png`, `palette-zero-1440.png` | `client/src/components/ui/search-dialog.tsx:333` (`description.slice(0, 60)`) |
| PS-07 | LOW | /settings/theme | 1440 | With a font override active (JetBrains Mono), the **"System default"** card previews its specimen in JetBrains Mono instead of the system's bundled face (Inter). The preview shows the wrong font for the option it describes. | `theme-font-jetbrains-1440.png`; eval: `["System default…","\"JetBrains Mono\"…"]` while Inter card = `Inter` | `client/src/pages/ThemeSettings.tsx:321` (`fontFamily: f.stack \|\| undefined`) + `client/src/lib/font-options.ts:36` (`stack: ""`) |
| PS-08 | LOW | /search?q=ffmpeg, /sign-in, /sign-in?admin, /sign-up | all | The SSR h1 differs from the hydrated h1: "Search results for “ffmpeg”" → "Search"; "Sign in to Awesome Video" → "Welcome back"; same SSR h1 → "Admin sign-in"; "Create an Awesome Video account" → "Create your account". /bookmarks, /recommendations, /continue-learning, /settings/theme, /design-system and the 404s ship no SSR h1. All are noindex, so the impact is low. | `ssr-heads.txt`, `ssr/*.html`, `sweep-1440.txt` | `server/og-middleware.ts` (prerender h1 per route) |

## Passed (driven, with evidence)
- **/search:**
  - empty, `ffmpeg` (433 results, typed live: URL updates, focus is kept), nonsense (no-results with category chips), whitespace-only, `100%`, `"hls" & dash`, `a < b` (text kept);
  - `<img src=x>` is scrubbed with a visible notice;
  - `page=999` clamps to 19 with a notice; `sort=bogus` shows an invalid-filter panel;
  - Sort Name A–Z → `sort=name-asc`, and the order changes;
  - the category facet adds a chip plus Clear all;
  - legacy `?tag=` / `?tags=a,b` / repeated `tags` all resolve to Tag chips (83 and 141 results); `?category=<slug>` resolves to its name.
- **Palette:**
  - opens from the header button, ⌘K, Ctrl+K and `/`; Escape closes it and returns focus to the trigger;
  - groups are Jump to / Pages (empty query) and Resources (query); count "433 matches — showing top 15";
  - ArrowUp/Down, Home/End and Enter open the right resource; only one row is highlighted;
  - End+Enter on "View all" → `/search?q=hls`; zero results show the fallback rows.
- **/journeys:** 5 published journeys. The category filter goes into the URL and survives a reload. "Start Journey" → `/journey/8` with 6 steps; the guest "log in" link carries `redirect_url`; step links point to `/resource/<id>`, and external links open in a new tab with aria labels.
- **/settings/theme:**
  - both systems × all 10 accents apply `data-system`, `data-accent` and `--accent`, and persist across reload;
  - the font override applies and persists; "System default" resets it;
  - keyboard: the Tab order is skip link → header → Back → showcase link → system radios; Arrow keys move between and select radios; a visible ring shows (`kbd-theme-tab11.png`).
- **Contact dialog:** opens. An empty submit shows 4 field errors, sets aria-invalid on each field and focuses Name; no request is sent. Escape closes it and returns focus. The dialog is 512px with no overflow.
- **Cookie settings:** reopens the consent region with focus moved to it; Decline stores `denied` in localStorage and the cookie.
- **Other pages:** /about, /terms, /privacy, /code-of-conduct, /design-system, /sign-in (4 providers, named), /sign-in?admin (render only), /sign-up, /bookmarks (guest empty state), /recommendations (guest popular picks), /continue-learning (guest panel), /submit (guest read-only form with a login link) all render with one h1, no hold overlay and no page errors.
- `/notifications` → 302 to `/sign-in?redirect_url=%2Fnotifications`.
- **404s:** unknown route, category, tag, resource (`999999999`, `abc`), journey and collection all return HTTP 404 and render the designed not-found page.
- **Overflow and target size:**
  - no horizontal overflow on any page at 1440, 820 or 390 (`sweep-1440.txt`, `sweep-touch.txt`);
  - no 24px-rule failures at 1440;
  - the touch sweep found only PS-01–03, plus the Privacy inline cookie-settings link (138×24, an accepted exception in visual-checklist §5).
- **Reduced motion:** the media query matches, `scroll-behavior` is `auto`, and the palette opens with no running animations.
- **Console:** no errors or warnings on chrome-devtools pages; agent-browser `errors` were empty on every swept page.
- **robots.txt:** 200, with a Sitemap line and the private routes disallowed.
- **sitemap.xml:** 200, 4,493 URLs. Five random URLs all return 200 (`sitemap-sample-status.txt`).
- **SSR head:** titles match the hydrated titles on every page; canonical and og:url are present on indexable pages, and noindex pages carry `noindex, nofollow`.

## Not filed (by rule)
- The phone content gutter is 40px. visual-checklist says 14–24px, but the shipped CSS states 40px is intended (`client/src/styles/pages/admin-shell.css:6`, `shell/layout.css:35-40`). Code wins per checklist §0. This is shell-wide, so it belongs to the core slice if anyone wants to revisit it.
- Choosing Geist resets a default Crimson accent to Cyan. The page copy documents this behaviour.

## UNVERIFIED
- Offline search card: not driven.
- Card hover states: not captured.
- `/` pressed while focus is in a text field: not tested.
- Public collections: no public collection exists (`/collections` and `/collection/nope` → 404; none in the sitemap), so there was nothing to audit.
- 820 screenshots: captured while the agent-browser session was still on Geist·Cyan from my theme test. The overflow and target probes for 820 are valid, but I did not visually review the 820 captures in Editorial.
- Touch sweeps: 24px and 44px sizes were measured under agent-browser's fine pointer with the 44px rule forced on. Real `pointer:coarse` was spot-checked in chrome-devtools only on /search, the Filters sheet, the palette and /sign-up. Hover-only controls under coarse pointer were not checked on the other pages.
- Keyboard-only on /search results: not walked beyond typing and sort.
