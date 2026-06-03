# Public / End-User Full Functional + Visual Test Plan

**Target:** http://localhost:5001 (containerized, both services healthy)
**Method:** End-user via Chrome DevTools MCP. Every interaction fired (clicked/typed),
result asserted (DOM + screenshot + where relevant the data). Visual-inspection
protocol on every screenshot (overflow, contrast, spacing, hierarchy, dark mode,
44px targets). Anything broken → fixed immediately → re-tested until PASS.
**Scope:** 18 routes + global chrome (sidebar, header, search). Admin already
audited separately — excluded here except the route guard.
**Evidence:** `e2e-evidence/public-fullrun/` screenshots + VERDICT.md.

Legend: each row is one test case. P0=core path, P1=secondary, P2=edge.

---

## A. GLOBAL CHROME — Sidebar (AppSidebar) — persists on every page

| # | Test | Expected | Pri |
|---|------|----------|-----|
| A1 | Sidebar renders with 9 categories + counts | All 9 cats, counts match DB (91/372/95/183/227/304/263/242/172) | P0 |
| A2 | Click category row (e.g. "Encoding & Codecs") | Navigates to /category/encoding-codecs | P0 |
| A3 | Click chevron (Expand) on a category | Expands to show subcategories, does NOT navigate | P0 |
| A4 | Expanded subcategory shows sub-subcategories | Nested tree renders with counts | P1 |
| A5 | Click subcategory row | Navigates to /subcategory/:slug | P0 |
| A6 | Click sub-subcategory row | Navigates to /sub-subcategory/:slug | P0 |
| A7 | Chevron aria-expanded toggles true/false | Accessibility state correct | P1 |
| A8 | Auto-expand active category on route load | Landing on /category/x auto-opens that branch | P1 |
| A9 | Nav items: Home, Submit Resource, Learning Journeys, Advanced, Theme | Each navigates to correct route | P0 |
| A10 | Active nav item highlighted (data-active) | Current route's item visually active | P1 |
| A11 | "Awesome Video" logo/title click | Navigates Home | P1 |
| A12 | Toggle Sidebar button (collapse/expand) | Sidebar collapses/expands | P1 |
| A13 | Categories with 0-count sub-subcats show "(no resources yet)" | Empty descriptor present, link still valid | P2 |
| A14 | About link (sidebar footer) | Navigates /about | P2 |

## B. GLOBAL CHROME — Header (AppHeader)

| # | Test | Expected | Pri |
|---|------|----------|-----|
| B1 | Breadcrumb renders per route | Home / Category / Subcat trail correct | P0 |
| B2 | Breadcrumb links navigate | Clicking a crumb goes to that level | P1 |
| B3 | Search button opens SearchDialog | Dialog opens, input focused | P0 |
| B4 | Theme Settings button | Navigates /settings/theme | P1 |
| B5 | Toggle navigation menu (mobile hamburger) | Sidebar opens on mobile viewport | P1 |
| B6 | Logged-out: Login button visible | Click → /login | P0 |
| B7 | Logged-in: avatar dropdown | Opens menu: Profile, Bookmarks, (Admin if admin), Sign Out | P0 |
| B8 | Dropdown → Profile | Navigates /profile | P1 |
| B9 | Dropdown → Bookmarks | Navigates /bookmarks | P1 |
| B10 | Dropdown → Admin (admin only) | Navigates /admin | P1 |
| B11 | Dropdown → Sign Out | Logs out, returns to logged-out state | P0 |

## C. SEARCH DIALOG (search-dialog / command palette)

| # | Test | Expected | Pri |
|---|------|----------|-----|
| C1 | Open via header Search | Dialog visible | P0 |
| C2 | Open via keyboard shortcut (/ or Cmd-K) | Dialog opens | P1 |
| C3 | Type query (e.g. "ffmpeg") | Results filter live | P0 |
| C4 | Result item shows title/category | Rendered correctly | P1 |
| C5 | Click result | Navigates to that resource/category | P0 |
| C6 | Arrow keys navigate results | Keyboard selection works | P1 |
| C7 | Enter selects highlighted | Navigates | P1 |
| C8 | Empty query state | Shows prompt or recent, no crash | P2 |
| C9 | No-match query (e.g. "zzzzz") | "No results" empty state | P2 |
| C10 | Close (Esc / Cancel / backdrop) | Dialog dismisses | P1 |

## D. HOME (/)

| # | Test | Expected | Pri |
|---|------|----------|-----|
| D1 | Hero shows "Explore N categories with M curated resources" | N=9, M=total (1949-ish) correct | P0 |
| D2 | Category cards render (9) | All visible with counts | P0 |
| D3 | AdvancedFilter "Filter by Tag" opens | Tag selector opens | P0 |
| D4 | Select a tag | Cards filter to matching, counts update | P0 |
| D5 | Select multiple tags | Cumulative filter | P1 |
| D6 | Clear all tags | Resets to full set | P1 |
| D7 | Sort: Name A-Z | Cards re-order alphabetically | P0 |
| D8 | Sort: Name Z-A | Reverse alpha | P1 |
| D9 | Sort: Count high-low | By displayCount desc | P1 |
| D10 | Sort: Count low-high | By displayCount asc | P1 |
| D11 | Tag filter hides 0-match categories | displayCount>0 filter works | P1 |
| D12 | Click a category card | Navigates /category/:slug | P0 |
| D13 | Visual: card grid spacing/alignment | No overflow, aligned | P0 |

## E. CATEGORY (/category/:slug) — richest filter screen

| # | Test | Expected | Pri |
|---|------|----------|-----|
| E1 | Resources list/grid renders for category | Count matches sidebar badge | P0 |
| E2 | Subcategory dropdown (Select) populated | All subcats of this category + "All" | P0 |
| E3 | Select a subcategory | Resources filter to that subcat | P0 |
| E4 | Subcategory persists to URL (?subcategory=) | URL param set, reload preserves | P1 |
| E5 | Tag filter (AdvancedFilter) | Filters resources by tag | P0 |
| E6 | Sort dropdown (default/name-asc/name-desc/...) | Re-orders resources | P0 |
| E7 | Sort persists to URL (?sortBy=) | URL param + reload preserves | P1 |
| E8 | View mode toggle: Grid | Grid layout | P0 |
| E9 | View mode toggle: List | List layout | P0 |
| E10 | View mode toggle: Compact | Compact layout | P0 |
| E11 | View mode persists (localStorage) | Reload keeps choice | P1 |
| E12 | Resource card click | Navigates /resource/:id | P0 |
| E13 | Resource card external link | Opens resource URL (new tab) | P1 |
| E14 | Bookmark button on card (logged-out) | Prompts login or hidden | P1 |
| E15 | Favorite button on card (logged-out) | Prompts login or hidden | P1 |
| E16 | Combined filter (subcat + tag + sort) | All compose correctly | P1 |
| E17 | Empty filter result | "No resources" empty state, no crash | P2 |
| E18 | Visual: list/grid/compact each clean | No overflow/clipping in any mode | P0 |
| E19 | Cross-check: filtered count = server count | UI count matches /api/resources?category | P0 |

## F. SUBCATEGORY (/subcategory/:slug)

| # | Test | Expected | Pri |
|---|------|----------|-----|
| F1 | Resources render for subcategory | Correct set | P0 |
| F2 | Tag filter works | Filters | P0 |
| F3 | Sort works (name-asc/desc) | Re-orders | P0 |
| F4 | Filters persist to URL | Reload preserves tags+sort | P1 |
| F5 | Resource card click → detail | Navigates | P0 |
| F6 | Breadcrumb shows category > subcategory | Correct trail | P1 |
| F7 | Empty/zero-resource subcat | Empty state | P2 |
| F8 | Visual pass | Clean | P0 |

## G. SUB-SUBCATEGORY (/sub-subcategory/:slug)

| # | Test | Expected | Pri |
|---|------|----------|-----|
| G1 | Resources render for sub-subcategory | Correct set (e.g. HEVC=10, FFMPEG=65) | P0 |
| G2 | Tag filter works | Filters | P0 |
| G3 | Sort works | Re-orders | P0 |
| G4 | Filters persist to URL | Reload preserves | P1 |
| G5 | Card click → detail | Navigates | P0 |
| G6 | Breadcrumb trail | Correct | P1 |
| G7 | Known-good slug (origin-servers=1) | Renders the 1 resource | P1 |
| G8 | Visual pass | Clean | P0 |

## H. RESOURCE DETAIL (/resource/:id)

| # | Test | Expected | Pri |
|---|------|----------|-----|
| H1 | Resource detail renders (title/desc/url/meta) | Correct data | P0 |
| H2 | Back button | Returns to list/home | P1 |
| H3 | External "Visit" link | Opens resource URL | P0 |
| H4 | Favorite button (logged-out) | Prompts login / disabled | P1 |
| H5 | Favorite toggle (logged-in) | Adds/removes favorite, toast | P0 |
| H6 | Bookmark button (logged-out) | Prompts login / disabled | P1 |
| H7 | Bookmark toggle (logged-in) | Adds/removes bookmark, toast | P0 |
| H8 | Share button | Copies URL / share sheet, toast | P1 |
| H9 | Related resources render | Up to 6 related, clickable | P1 |
| H10 | Invalid id (/resource/999999) | Not-found state, no crash | P2 |
| H11 | Visual pass | Clean | P0 |

## I. ADVANCED (/advanced) — 4 sub-tabs

| # | Test | Expected | Pri |
|---|------|----------|-----|
| I1 | Tab: Explorer (CategoryExplorer) | Renders, interactive | P1 |
| I2 | Tab: Metrics (CommunityMetrics) | Charts/stats render | P1 |
| I3 | Tab: Export (ExportTools) | Export controls work | P1 |
| I4 | Tab: AI Recommendations | Panel renders (may degrade w/o AI) | P2 |
| I5 | Tab switching | Each TabsTrigger switches content | P0 |
| I6 | Explorer interactions (search/filter inside) | Functional | P1 |
| I7 | Export action produces output | File/text output | P1 |
| I8 | Visual pass each tab | Clean | P1 |

## J. JOURNEYS (/journeys) + JOURNEY DETAIL (/journey/:id)

| # | Test | Expected | Pri |
|---|------|----------|-----|
| J1 | Journeys list renders (0 seeded → empty state) | Graceful empty OR list | P0 |
| J2 | Category filter Select | Filters journeys | P1 |
| J3 | "N journeys available" count | Accurate | P1 |
| J4 | Journey card click → /journey/:id | Navigates (if any exist) | P1 |
| J5 | JourneyDetail back button | → /journeys | P1 |
| J6 | Enroll/Start (logged-out) | → /login | P1 |
| J7 | Empty-state messaging clean | No blank screen | P0 |
| J8 | Visual pass | Clean | P1 |

## K. AUTH — LOGIN (/login) + REGISTER (/register)

| # | Test | Expected | Pri |
|---|------|----------|-----|
| K1 | Login form renders (email/password) | Fields present | P0 |
| K2 | Submit empty | Validation errors | P1 |
| K3 | Submit wrong creds | Error toast, no nav | P0 |
| K4 | Submit valid (admin@example.com) | Logs in, redirects | P0 |
| K5 | Link to Register | → /register | P1 |
| K6 | Register form renders | Fields present | P0 |
| K7 | Register validation (short pw <8) | Error shown | P1 |
| K8 | Link to Login | → /login | P1 |
| K9 | Visual pass both | Clean, centered | P1 |

## L. SUBMIT RESOURCE (/submit)

| # | Test | Expected | Pri |
|---|------|----------|-----|
| L1 | Form renders (logged-out shows login prompt) | Login CTA OR form | P0 |
| L2 | Logged-in: all fields (title/url/desc/category selects) | Present | P0 |
| L3 | Category → subcategory → sub-subcategory cascade | Dependent selects populate | P1 |
| L4 | Submit empty | Validation errors | P1 |
| L5 | Submit valid | Creates pending resource, success toast | P0 |
| L6 | (cleanup) delete the submitted test resource | Baseline restored | P0 |
| L7 | Visual pass | Clean | P1 |

## M. PROFILE (/profile) + BOOKMARKS (/bookmarks) — AuthGuard

| # | Test | Expected | Pri |
|---|------|----------|-----|
| M1 | Logged-out /profile | Redirects to login (AuthGuard) | P0 |
| M2 | Logged-in /profile renders | User info, favorites, bookmarks tabs | P0 |
| M3 | Profile favorites list | Renders user favorites | P1 |
| M4 | Profile bookmarks list | Renders user bookmarks | P1 |
| M5 | Profile logout button | Logs out | P1 |
| M6 | /bookmarks renders | Bookmark list | P0 |
| M7 | Bookmarks sort Select | Re-orders | P1 |
| M8 | Bookmarks empty state | Clean message | P2 |
| M9 | Remove bookmark | Removes, list updates | P1 |
| M10 | Visual pass both | Clean | P1 |

## N. THEME SETTINGS (/settings/theme)

| # | Test | Expected | Pri |
|---|------|----------|-----|
| N1 | Page renders | Theme controls | P0 |
| N2 | Pick system mode (light/dark/system) | Theme applies live | P0 |
| N3 | Pick accent color | Accent applies live | P1 |
| N4 | Pick font | Font applies live | P1 |
| N5 | Preview buttons render all variants | default/secondary/outline/ghost/destructive | P1 |
| N6 | Theme persists across reload | Choice saved | P1 |
| N7 | Dark mode visual pass (whole app) | No white-on-dark, contrast OK | P0 |
| N8 | Light mode visual pass | Glass cards opaque enough | P0 |

## O. ABOUT (/about) + 404

| # | Test | Expected | Pri |
|---|------|----------|-----|
| O1 | /about renders | Content + external links | P2 |
| O2 | About external links | Open correct URLs | P2 |
| O3 | /nonexistent-route | NotFound page, no crash | P1 |
| O4 | 404 has way back home | Link/button to / | P2 |

## P. RESPONSIVE / VIEWPORT

| # | Test | Expected | Pri |
|---|------|----------|-----|
| P1 | Mobile (375px) Home | Sidebar collapses, hamburger works | P0 |
| P2 | Mobile category page filters | Filters usable on small screen | P1 |
| P3 | Tablet (768px) layout | No overflow | P1 |
| P4 | Desktop (1280px) layout | Baseline | P0 |

---

## Execution rules
1. App already healthy. Drive everything via Chrome DevTools (real browser, real session).
2. One screen at a time. Screenshot + READ + visual-inspection checklist before PASS.
3. Any FAIL → diagnose root cause → fix in source → rebuild → re-test that case until PASS (no deferring).
4. Cross-check counts against DB/API where the test asserts a number.
5. Restore any seeded data (Submit test resource, bookmarks/favorites) at the end.
6. Final VERDICT.md with per-case PASS/FAIL + evidence citations.

**Total: ~120 test cases across 16 sections.**
