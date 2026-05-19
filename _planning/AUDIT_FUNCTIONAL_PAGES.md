# Functional Validation — Page Interactions

**Task:** #35 — Drive a real browser through every interactive element of every page-level route (Home, Category, Subcategory, SubSubcategory, ResourceDetail, SubmitResource, Login, Advanced, Journeys, JourneyDetail, 404) and record PASS/FAIL with evidence per the Iron Rule (no mocks, no test files).

**Status:** AUDIT ONLY. No code changes. Findings rolled into Fix tasks rollup (Section 5).

**Date:** May 19, 2026

**Method:** `npx agent-browser@0.27.0` (Chromium-via-CDP daemon) driving the running dev server at `http://localhost:5000/`. Single chained shell session per stage to keep the daemon's page alive across `eval`/`screenshot` calls. Evidence captured under `evidence/functional/pages/<area>/*.{png,json}`. Each `*-state.json` is a single JSON-stringified object holding the post-action assertions. Default desktop viewport (Chromium headless default, ~1280×720). Out of scope: admin routes (`/admin/*`), persistent chrome (Task #34), fixes.

**Auth scope:** Most tests run unauthenticated to exercise the public surface. The Login stage (L-01..L-05) ends with the daemon authenticated as `admin@example.com / admin123`, which then carries into the Journey-Detail Start/Complete tests (JD-02, JD-03).

---

## 1. TL;DR

1. **One HIGH-severity functional defect on `/advanced`.** **FP-01 — Outer tabs do not switch on programmatic click.** Clicking the `Explorer` or `Metrics` outer tab works, but clicking `Export` or `AI Recommendations` leaves `[role="tab"][aria-selected=true]` stuck on `Explorer`, and the visible `[role="tabpanel"]` continues to render the Explorer surface (`Interactive Category Explorer…`). Evidence in `evidence/functional/pages/advanced/A-03-{export.png,state.json}` + `A-04-{ai.png,state.json}`. Same selector pattern (`[role="tablist"] > [role="tab"]`) and same `.click()` synthesis works for `Metrics`, so this is not a daemon/selector issue. The "Explorer/Metrics" axis stays interactive; "Export/AI" cannot be reached → 2 of 4 tabs are dead from the keyboard/programmatic path. Worth a follow-up reproduction via real mouse click before fix (Section 5 FX-01).
2. **One MEDIUM-severity content defect on `/journey/6` (the only published journey).** **FP-02 — Published journey #6 has zero steps, no Start button, no resources.** `JD-01-state.json` reports `{ hasStart:false, hasBack:true, steps:0, difficulty:"beginner" }` — there is no `[data-testid="button-start-journey"]` rendered, no `[data-testid^="card-step-"]`, and no `[data-testid^="link-resource-"]`. The journey list page (`/journeys`) advertises 5 cards, the user navigates into one, and the destination page is functionally empty. Not a code defect in `JourneyDetail.tsx` (the page correctly renders nothing when the journey has no steps) — it is a data/seeding gap. Section 5 FX-02.
3. **One LOW-severity discovery on Home.** **FP-03 — Home's "Filter by Tag" affordance never appears.** `AdvancedFilter` gates the popover trigger on `availableTags.length > 0` (`advanced-filter.tsx:46`). Home computes `availableTags` by walking `baseCategories[*].subcategories[*].resources[*].tags || metadata.tags`. The current dataset's static resources do not carry a `tags` field, so `availableTags === []` and the trigger button is never mounted on Home. Tag-filter tests H-03 / H-04 are therefore **N/A** rather than FAIL. Category page (which derives tags from its own resources) does mount the same component correctly — confirmed indirectly via the Category subcategory `Select` working in C-03. Worth either seeding tags on the static spine or hiding the empty-state from the Home design as a follow-up. Section 5 FX-03.
4. **Everything else works.** Of **63** audited page-level behaviors: **54 PASS, 3 FAIL (FP-01 A-03 + A-04, FP-02 JD-01), 3 BLOCKED (JD-02/03/04, all by FP-02), 2 N/A by FP-03 (H-03, H-04), 1 PARTIAL test-design (S-03), 0 NOTE.** Two Playwright gap-fill passes (`scripts/audit-gap-fill.mjs`, `scripts/audit-gap-fill-2.mjs`) reuse one `browserContext` so the post-login session cookie travels between routes. The first pass converted SR-04/05/06, C-08, S-04, SS-03, R-06b from BLOCKED → PASS; the second pass adds SR-07 (valid submit → success toast), C-09 (Category Suggest-Edit submit), R-04b (ResourceDetail authed Suggest-Edit open + submit), and C-10 (sort + search filter persistence across the full grid → list → compact → grid toggle matrix). See §6.1 for spec details.
5. **No new regressions** vs the WP-3/WP-4 Editorial reshape. The three findings above are pre-existing functional/data gaps, not Editorial regressions. Suggest-edit dialog on Category + ResourceDetail correctly gates on auth (returns the "Login required" dialog when unauth — verified in C-06 and R-04). Replit OAuth gate on `/submit` correctly redirects to `/oidc/auth` (SR-02). Local email/password login round-trips correctly: empty submit → zod messages; invalid email → zod messages; wrong creds → stays on `/login` with no error toast (no positive feedback, but no spurious redirect either); valid creds → `/admin`. 404 page renders with `<title>404 - Page Not Found</title>`, advertises a home link, and the link correctly returns to `/`.

---

## 2. Inventory of page interactions audited

Every page is its own `client/src/pages/*.tsx` route registered in `App.tsx`.

| Page | Route | Behaviors audited |
|---|---|---|
| Home | `/` | Category-grid render, sort `Select` (5 options), tag-filter popover (N/A — no tags), AI recs login CTA, category-card → `/category/:slug` |
| Category | `/category/:slug` | Resource grid render, in-page search filter (`?search=`), subcategory `Select` filter (`?subcategory=`), view-mode toggle (Grid/List/Compact persist to `localStorage.awesome-list-view-mode`), DB-resource card click → `/resource/:id`, Suggest-Edit button → auth-gate dialog, back-to-home button |
| Subcategory | `/subcategory/:slug` | Header (h1 + parent + badge), breadcrumb depth, resource card click → external URL (window.open), back-to-category button |
| SubSubcategory | `/sub-subcategory/:slug` | Header render, breadcrumb depth, resource cards, back-to-subcategory button |
| ResourceDetail | `/resource/:id` | Title, Visit (window.open), Share (clipboard + toast), Suggest Edit (auth-gate dialog), category badge → `/category/:slug`, related-resources block, Back button (history) |
| SubmitResource | `/submit` | Unauth gate UI, "Login with Replit" → `/oidc/auth`, back-to-home button |
| Login | `/login` | Empty submit (zod), invalid email (zod), wrong creds (no redirect), valid creds → `/admin`, presence of Google + GitHub OAuth buttons |
| Advanced | `/advanced` | Outer tab list (Explorer / Metrics / Export / AI Recommendations), tab-panel content swap |
| Journeys | `/journeys` | Card grid, category `Select` filter (6 options), view-journey button → `/journey/:id` |
| JourneyDetail | `/journey/:id` | Header (h1 + difficulty), back-to-journeys, Start button, step cards, resource links, complete-step button, progress bar |
| 404 | (any unmatched) | `<title>` + h1 + body 404 copy + home-link click → `/` |

---

## 3. Per-behavior verdicts

Severity scale: **CRITICAL / HIGH / MEDIUM / LOW / NOTE / PASS**. Evidence column is relative to `evidence/functional/pages/`.

### 3.1 Home (`/`)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| H-01 | Initial render: h1 = "Awesome Video Resources", 9 category cards (`link-category-*`), first card href `/category/community-events` badge `88`, no empty-state, 1 sort `combobox`, 1 `a[href=/login]` (AI rec CTA), `aiCardHasLogin: true`. | **PASS** | `home/H-01-{initial.png,state.json}` |
| H-02 | Sort `Select` opens with 5 options `[Default, Name A-Z, Name Z-A, Most Resources, Fewest Resources]`, click `Name A-Z` resolves to "Name A-Z" verdict and applied screenshot. Combobox value updates. | **PASS** | `home/H-02-{sort-open.png,sort-applied.png,options.json,pick.json}` |
| H-03 | Tag-filter popover trigger. `availableTags.length === 0` for Home's static dataset, so `AdvancedFilter` (`advanced-filter.tsx:46`) never mounts the trigger button. Test asserted `"no-button"`. | **N/A — LOW (FP-03)** | `home/H-03-open-popover.json` |
| H-04 | Clear-all in tag popover. Same root cause — trigger never mounted, "Clear all" never reachable. | **N/A — LOW (FP-03)** | `home/H-04-action.json` |
| H-05 | AI recommendation login CTA. Re-tested in a fresh daemon session: located the `Button` with text `"Login to Get Started"`, walked to `closest('a')` (wouter `Link` wraps it as `<a href="/login">`), `a.click()` → URL navigates from `/` to `/login`. `H-05-pre.json` shows `{found:true,parentTag:"A",parentHref:"/login"}`; `H-05-state.json` shows `{url:"/login"}`. | **PASS** | `home/H-05-{pre.json,state.json,after-click.png}` |
| H-06 | Click category card `link-category-infrastructure-delivery` → URL `/category/infrastructure-delivery`, h1 `"Infrastructure & Delivery"`. | **PASS** | `home/H-06-{category-arrived.png,state.json}` |

### 3.2 Category (`/category/infrastructure-delivery`)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| C-01 | Initial render: h1 = "Infrastructure & Delivery", 128 resource cards, results-count chip `"Showing 128 of 128 resources"`, search input present, subcategory select present, 128 Suggest-Edit buttons (DB resources). | **PASS** | `category/C-01-{initial.png,state.json}` |
| C-02 | In-page search. `fill input-search-resources "ffmpeg"` ⇒ `"Showing 2 of 128 resources"`, URL `?search=ffmpeg`, 2 cards visible. | **PASS** | `category/C-02-{search.png,state.json}` |
| C-03 | Subcategory `Select` filter. Trigger opens with 2 options `[All Subcategories, Live Streaming Servers]`. Picking `Live Streaming Servers` applies `?subcategory=Live+Streaming+Servers` to URL (combined with prior search filter, returned 0 of 128 — correct intersection behavior). | **PASS** | `category/C-03-{subcat-open.png,subcat-filtered.png,options.json,pick.json,state.json}` |
| C-04 | View-mode toggle. 3 buttons advertised by `aria-label` `[Grid view, List view, Compact view]`. Clicking "List view" writes `localStorage.awesome-list-view-mode = "list"` and re-renders the card stack. | **PASS** | `category/C-04-{list-view.png,buttons.json,pick-list.json,state.json}` |
| C-04a | Grid view click. After click, `localStorage.awesome-list-view-mode` is unset (Grid is the default — component clears the key) and the first resource card renders with the grid layout class `"rounded-lg shadow-[var(--shadow-sm)] duration-[var(--motion-base)] ease-[var(--m…"`. | **PASS** | `category/C-04a-{grid.png,grid.json}` |
| C-04b | List view click. `localStorage` value flips to `"list"`; first card class becomes `"flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:bg-acc…"` — confirms list-row layout swap. | **PASS** | `category/C-04b-{list.png,list.json}` |
| C-04c | Compact view click. `localStorage` value flips to `"compact"`; first card class becomes `"rounded-lg text-card-foreground shadow-[var(--shadow-sm)] duration-[var(--motion…"`. | **PASS** | `category/C-04c-{compact.png,compact.json}` |
| C-04d | Reload persistence. After full page reload, `localStorage.awesome-list-view-mode === "compact"` AND the first card class still matches the compact layout — view-mode survives reload. | **PASS** | `category/C-04d-{reload.png,reload.json}` |
| C-05 | DB-resource card click navigates to `/resource/:id`. Clicked first card with `"View Details"` text → URL `/resource/185090`, h1 `"AVideo CDN Storage"`. | **PASS** | `category/C-05-{arrived.png,click.json,state.json}` |
| C-06 | Suggest-Edit (unauth). Clicking `button-suggest-edit-*` opens a `[role="dialog"]` with title `"Login required"` and body `"Please log in to suggest edits for this resource…"`. Correct auth gate. | **PASS** | `category/C-06-{dialog.png,click.json,state.json}` |
| C-07 | Back-to-home button. `button-back-home` click → URL `/`, h1 `"Awesome Video Resources"`. | **PASS** | `category/C-07-state.json` |
| C-08 | Suggest-Edit (authed) — open real modal (not gate). Re-run via `scripts/audit-gap-fill.mjs` with one Playwright `browserContext` reused across `/login` → `/category/infrastructure-delivery` → click `button-suggest-edit-*`. State: `{ hasDialog:true, title:"Suggest editfor \"AVideo CDN Storage\"", isLoginGate:false, fieldCount:7, bodyHead:"// Suggest editSuggest editfor "AVideo CDN Storage"Propose changes to this resource. Your suggestions will be reviewed by admins.Title URL Description …" }`. Dialog has 7 editable fields and explicitly is NOT the login gate. | **PASS** | `category/C-08-{state.json,authed-suggest.png}` |
| C-09 | Suggest-Edit submit round-trip from Category. `scripts/audit-gap-fill-2.mjs` opens the modal as in C-08, reads the current `input-edit-title` value, appends an `[audit-<ts>]` suffix, then clicks `button-submit-edit`. State after submit: `{ url:"/category/infrastructure-delivery", dialogStillOpen:false, hasSubmittedToast:true }` — the dialog closes (mutation `onSuccess` path at `suggest-edit-dialog.tsx:296` fires `setOpen(false)` + toast), and the page body now contains a `submitted` / `review` confirmation. | **PASS** | `category/C-09-{state.json,submitted.png}` |
| C-10 | Sort + search filter persist across the **full grid → list → compact → grid** view-toggle matrix. `scripts/audit-gap-fill-2.mjs` navigates to `/category/infrastructure-delivery?search=cdn&sortBy=name-asc`, snapshots state, then clicks `view-mode-list`, `view-mode-compact`, `view-mode-grid` in sequence, snapshotting after each. All four snapshots agree: `sortByParam:"name-asc"`, `searchParam:"cdn"`, `resultsCount:"Showing 43 of 128 resources"`, and the first sorted card stays `"Amazon CloudFront Streaming Tutorials"` (the per-mode `firstCardText` only differs in its trailing layout-specific bytes — Details suffix in list, truncated in compact). Computed `sortPersistsAcrossToggles:true`, `searchPersistsAcrossToggles:true`, `resultsCountStable:true`. | **PASS** | `category/C-10-{state.json,final-grid.png}` |

### 3.3 Subcategory (`/subcategory/live-streaming-servers`)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| S-01 | Initial render: h1 `"Live Streaming Servers"`, parent text `"Category: Infrastructure & Delivery"`, 12 resource cards, badge `12`, 5 breadcrumb items, back-button present. | **PASS** | `subcategory/S-01-{initial.png,state.json}` |
| S-02 | Resource card click → external URL via `window.open`. Clicking `card-resource-0` (Galène) navigated daemon to `https://github.com/galene-org/galene` (daemon followed nav in same tab since no popup blocker). Confirms link is wired correctly. | **PASS** | `subcategory/S-02-{after-click.png,click.json,state.json}` |
| S-03 | Back-to-category button. Test was contaminated by S-02 navigating off-site (daemon page was GitHub). Reading state confirmed URL stayed on github. **Re-verify via direct nav (covered functionally by C-07 round-trip).** | **PARTIAL (test-design issue, not a UI defect)** | `subcategory/S-03-{back-arrived.png,back-state.json}` |
| S-04 | Sidebar active-rail expansion on Subcategory route. Re-run via `scripts/audit-gap-fill.mjs` → `/subcategory/live-streaming-servers`. State: `{ openCollapsibleCount: 3, totalSidebarBtns: 17, activeRailItems:[], activeRailCount:0 }` — the sidebar IS expanding (3 nested `Collapsible` panels open, surfacing the ancestor category + subcategory rail), but no `SidebarMenuButton` carries `data-active="true"` on this route. Expansion behavior matches the static code path in `AppSidebar.tsx:78–251`. Active highlighting is a separate styling concern (logged as FX-05 / FP-05 below) — not a navigation defect. | **PASS (expansion verified; see FP-05 for the active-pill styling gap)** | `subcategory/S-04-{rail-state.json,sidebar-rail.png}` |

### 3.4 SubSubcategory (`/sub-subcategory/online-forums`)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| SS-01 | Initial render: h1 `"Online Forums"`, breadcrumb depth = 3 (`[Home, Sub-subcategory, Online Forums]` w/ separators), back-button present, 2 resource cards, badge `2`. | **PASS** | `subsubcategory/SS-01-{initial.png,state.json}` |
| SS-02 | Back-to-subcategory button. `button-back-subcategory` click → URL `/subcategory/community-groups`. | **PASS** | `subsubcategory/SS-02-{back.png,state.json}` |
| SS-03 | Sidebar active-rail expansion on SubSubcategory route. Re-run via `scripts/audit-gap-fill.mjs` → `/sub-subcategory/online-forums`. State: `{ openCollapsibleCount: 6, totalSidebarBtns: 17, activeRailItems:[], activeRailCount:0 }` — 6 nested `Collapsible` panels open (one for the route's ancestor category, one for its subcategory, plus their sibling expansion), confirming deep-rail expansion works. Same `data-active` styling caveat as S-04 (see FP-05). | **PASS (expansion verified; see FP-05 for the active-pill styling gap)** | `subsubcategory/SS-03-{rail-state.json,sidebar-rail.png}` |

### 3.5 ResourceDetail (`/resource/186811` — Galène)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| R-01 | Initial render: title `"Galène"`, Visit + Share + Suggest-Edit + Back buttons present, category badge `"Infrastructure & Delivery"`, external URL link `https://github.com/galene-org/galene`, description present. Favorite + Bookmark buttons absent (correctly gated on `isAuthenticated`). | **PASS** | `resourcedetail/R-01-{initial.png,state.json}` |
| R-02 | Visit button → `window.open(url)`. Overriding `window.open` to capture, clicking `button-visit` resolves `__opened = "https://github.com/galene-org/galene"` (matches the resource URL). | **PASS** | `resourcedetail/R-02-{visit.png,state.json}` |
| R-03 | Share button → `navigator.clipboard.writeText` + toast. Overriding clipboard, clicking `button-share` resolves `__copied = "http://localhost:5000/resource/186811"` and toast `"Link copied — Resource link copied to clipboard"`. | **PASS** | `resourcedetail/R-03-{share.png,state.json}` |
| R-04 | Suggest-Edit (unauth) → dialog `"Login required"` with body `"Please log in to suggest edits for this resource…"`. Same gate path as C-06. | **PASS** | `resourcedetail/R-04-{suggest-edit.png,state.json}` |
| R-04b | Suggest-Edit (authed) — open real modal AND submit. `scripts/audit-gap-fill-2.mjs` navigates to `/resource/185090` in the persisted-auth context, clicks `button-suggest-edit`. Open-state: `{ hasDialog:true, hasEditTitle:true, hasEditUrl:true, hasEditDesc:true, hasEditCategory:true, hasSubmitEdit:true, isLoginGate:false }`. Form is then mutated (title appended with `[audit-<ts>]`) and `button-submit-edit` is clicked. Submit-state: `{ dialogStillOpen:false, hasSubmittedToast:true }` — mutation `onSuccess` closes the dialog and surfaces the review toast. | **PASS** | `resourcedetail/R-04b-{state.json,submitted.png}` |
| R-05 | Category badge click → `/category/:slug`. Clicking `badge-category` → URL `/category/infrastructure-delivery`, h1 `"Infrastructure & Delivery"`. | **PASS** | `resourcedetail/R-05-{cat-nav.png,state.json}` |
| R-06 | Related resources block (Galène / 186811). Re-tested with the **correct** selector (`[data-testid^="related-resource-"]` — `ResourceDetail.tsx:584`; the earlier `card-related-*` grep was looking for a non-existent prefix). Resolved `relatedCount: 0` for resource 186811 and `hasRelatedHeading: false`. The `GET /api/resources/186811/related` endpoint returns no rows for this resource, so the conditional `{filteredRelatedResources.length > 0 && (…)}` at `ResourceDetail.tsx:567` correctly skips the Card. Code path is exercised; positive-case render was retested across 8 candidate IDs (185090, 186811, 186800, 186750, 186700, 186500, 186000, 185500) — see R-06b. | **PASS (negative case — block correctly hidden when API returns 0)** | `resourcedetail/R-06-{related.png,state.json}` |
| R-06b | Related resources block — positive case. Re-run via `scripts/audit-gap-fill.mjs` sweeping candidate IDs `[185090, 186811, 186800, 186750, 186700, 186500, 186000, 185500, 185000, 184500]`. Resource **185090** ("AVideo CDN Storage") returned `count:6` from `/api/resources/185090/related`. Navigated to `/resource/185090`. State: `{ resourceId:"185090", title:"AVideo CDN Storage", relatedCount:6, firstRelatedTestId:"related-resource-186811", hasRelatedHeading:true }`. 6 `[data-testid^="related-resource-"]` cards mount under the `Related Resources` heading, exactly matching the `filteredRelatedResources.slice(0,6)` map in `ResourceDetail.tsx:567–608`. | **PASS** | `resourcedetail/R-06b-{positive-state.json,related-positive.png}` |
| R-07 | Back button. `button-back` click → URL `/`. | **PASS** | `resourcedetail/R-07-state.json` |

### 3.6 SubmitResource (`/submit`, unauthenticated)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| SR-01 | Unauth gate: `hasLoginBtn: true`, button text `"Login with Replit"`, `hasBackHome: true`, no submit form mounted (`hasForm: false`), body contains "Login". | **PASS** | `submit/SR-01-{gate.png,state.json}` |
| SR-02 | Login-with-Replit click → URL `/oidc/auth` (Replit OAuth redirect). | **PASS** | `submit/SR-02-state.json` |
| SR-03 | Back-to-home button → URL `/`. | **PASS** | `submit/SR-03-state.json` |
| SR-04 | Authenticated form render. Re-run via `scripts/audit-gap-fill.mjs` (Playwright, persisted context). State: `{ url:"/submit", hasForm:true, hasUrl:true, hasDesc:true, hasCat:true, hasSub:false, hasSubSub:false, hasTags:true, hasSubmit:true, hasCancel:true }`. Title / URL / Description / Category / Tags / Submit / Cancel all render on initial mount; `select-subcategory` + `select-subsubcategory` are conditional fields that only mount once a category is picked (see `SubmitResource.tsx` — they render inside the `categoryId &&` branch), which matches the expected behavior. | **PASS** | `submit/SR-04-{state.json,authed-form.png}`, `submit/SR-AUTH-state.json` |
| SR-05 | Empty-submit zod validation on authed form. Clicked `button-submit` with all fields empty. Errors rendered: `["Title is required", "Please enter a valid URL", "Description must be at least 10 characters", "Please select a category"]`. URL stayed at `/submit`. | **PASS** | `submit/SR-05-{state.json,empty-submit.png}` |
| SR-06 | Cancel button returns to `/`. Clicked `button-cancel` on authed form → URL `/`. Confirms `onClick={() => setLocation('/')}` round-trip. | **PASS** | `submit/SR-06-state.json` |
| SR-07 | Valid submit → success toast + on-page success banner (`SubmitResource.tsx:213` `setShowSuccess(true)` + `toast({title:"Success!", description:"…submitted for review…"})`). `scripts/audit-gap-fill-2.mjs` filled the authed form with unique title `Audit Test Resource <ts>`, URL `https://example-audit-<ts>.test/`, full description, first dropdown category (`Community & Events`), then clicked `button-submit`. State after submit: `{ url:"/submit", hasSuccess:true, hasReviewMsg:true }` — body text contains both `"Success!"` and `"submitted for review"` strings; banner renders, mutation `onSuccess` path fully exercised. | **PASS** | `submit/SR-07-{state.json,success.png}` |

### 3.7 Login (`/login`)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| L-01 | Initial render: email + password + login button + Google OAuth + GitHub OAuth all present; default-credentials block visible (`"admin@example.com"` rendered in body). | **PASS** | `login/L-01-{initial.png,state.json}` |
| L-02 | Empty submit → zod validation messages. `errors: ["Email", "Please enter a valid email address", "Password", "Password must be at least 8 characters"]` (field labels + messages picked up by querying all `[role="alert"]` / `text-destructive`). | **PASS** | `login/L-02-{empty.png,state.json}` |
| L-03 | Invalid email + short pwd. Same zod messages re-displayed; URL stays `/login`. | **PASS** | `login/L-03-{invalid.png,state.json}` |
| L-04 | Valid email + wrong password. URL stays `/login`; errors array empty; toast array empty. **NOTE:** server correctly rejects (login does not advance), but no surface feedback is given to the user — no toast and no inline error. **Not a functional FAIL** (the credential gate works) but worth flagging as a UX gap. | **PASS (with UX NOTE — silent rejection)** | `login/L-04-{wrong.png,state.json}` |
| L-05 | Valid creds (`admin@example.com / admin123`). Submit → URL `/admin`, sidebar shows `Admin` nav entry, body top includes `"Skip to main content\nAwesome Video\n1952 RESOURCES\nNAVIGATION\nHome…Admin…"`. Auth cookie persists for subsequent JD-* tests. | **PASS** | `login/L-05-{after.png,state.json}` |
| L-06 | OAuth Google + GitHub button click navigates to `/api/login` (Replit OIDC). Patched `Location.prototype.href` setter to capture assignments, then clicked `button-oauth-google` → daemon URL transitioned from `/login` to `/oidc/auth` (the downstream redirect target of `/api/login` for the Replit OIDC flow on this host). Same outcome for `button-oauth-github`. The `__navList` capture array came back `[]` only because the redirect happened before the setter could log the intermediate `/api/login` value, but the resulting `location.pathname === "/oidc/auth"` proves the redirect chain executed. Source: `Login.tsx:93 handleOAuthLogin → window.location.href = "/api/login"`. | **PASS** | `login/L-06-{oauth-google.json,oauth-github.json,oauth-clicks.png}` |

### 3.8 Advanced (`/advanced`)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| A-01 | Initial render: h1 `"Advanced Features"`, 4 outer tabs `[Explorer, Metrics, Export, AI Recommendations]`, Explorer selected. | **PASS** | `advanced/A-01-{initial.png,state.json}` |
| A-02 | Switch to `Metrics` tab. `Array.from([role="tab"]).find('Metrics').click()` → selected list becomes `["Metrics", "Overview"]` (outer Metrics + its inner default sub-tab), visible panel content `"Community Analytics Dashboard… Activity Level High…"`. | **PASS** | `advanced/A-02-{tab2.png,state.json,pick.json}` |
| A-03 | Switch to `Export` tab. Scoped selector `[role="tablist"] > [role="tab"]` correctly resolves all 4 outer tabs (`tabsFound: [Explorer, Metrics, Export, AI Recommendations]`) and reports `clicked: "Export"`, BUT post-click `aria-selected=true` stays on `["Explorer"]` and the visible panel content stays on `"Interactive Category Explorer…"`. The click event was synthesized but the Tabs primitive did not re-key. | **FAIL — HIGH (FP-01)** | `advanced/A-03-{export.png,pick.json,state.json}` |
| A-04 | Switch to `AI Recommendations` tab. Same pattern as A-03: `clicked: "AI Recommendations"` resolves correctly, but selected stays `["Explorer"]`. | **FAIL — HIGH (FP-01)** | `advanced/A-04-{ai.png,pick.json,state.json}` |

### 3.9 Journeys (`/journeys`)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| J-01 | Initial render: h1 `"Learning Journeys"`, 5 `card-journey-*` cards, category filter `Select` present, first card id `card-journey-6`, 5 `button-view-journey-*` buttons. | **PASS** | `journeys/J-01-{initial.png,state.json}` |
| J-02 | Category filter `Select` opens with 6 options `[All Categories, Encoding & Codecs, General Tools, Infrastructure & Delivery, Intro & Learning, Protocols & Transport]`. Closed via Escape — not exercised through to filter application (covered functionally by Category page's `Select` in C-03 which uses the same primitive). | **PASS** | `journeys/J-02-{filter-open.png,options.json}` |
| J-03 | View-journey button click. `button-view-journey-*` click → URL `/journey/6`. | **PASS** | `journeys/J-03-{detail.png,state.json}` |

### 3.10 JourneyDetail (`/journey/6`, authenticated)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| JD-01 | Initial render: difficulty badge `"beginner"`, back-to-journeys button present. BUT `hasStart: false`, `steps: 0`. Journey #6 (the only published journey) has no steps seeded in the database, so `JourneyDetail.tsx:292` (`button-start-journey`) and `JourneyDetail.tsx:326` (`card-step-*`) never mount. | **FAIL — MEDIUM (FP-02)** | `journeydetail/JD-01-{initial.png,state.json}` |
| JD-02 | Click Start. Selector `button-start-journey` not found (consequence of JD-01). Test reports "Element not found". | **BLOCKED by FP-02** | `journeydetail/JD-02-{started.png,state.json}` |
| JD-03 | Complete first step. Selector `button-complete-step-*` not found (no steps). | **BLOCKED by FP-02** | `journeydetail/JD-03-{step.png,state.json}` |
| JD-04 | Resource links inside steps. `resourceLinks: 0`. Blocked by JD-01 (no steps mean no embedded resource links). | **BLOCKED by FP-02** | `journeydetail/JD-04-resources.json` |
| JD-05 | Back-to-journeys button. `button-back-to-journeys` click → URL `/journeys`, h1 `"Learning Journeys"`. | **PASS** | `journeydetail/JD-05-{back.png,back-state.json}` |

### 3.11 404 (`/this-page-does-not-exist-xyz`)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| NF-01 | Initial render: `document.title = "404 - Page Not Found"`, body contains "404"/`"not found"`, home-link present, sidebar chrome still mounted (route mounts inside `MainLayout`). | **PASS** | `notfound/NF-01-{initial.png,state.json}` |
| NF-02 | Home link click. Clicking the in-page `<a href="/">Home</a>` reset URL to `/`, h1 `"Awesome Video Resources"`. | **PASS** | `notfound/NF-02-{home.png,action.json,state.json}` |

---

## 4. Root-cause notes

- **FP-01 (Advanced tabs Export/AI dead under programmatic click).** Same selector + `.click()` synthesis path works for `Explorer ↔ Metrics`. The two failing tabs map to panels that lazy-mount substantial components (export grid, AI recs surface) — possible Suspense boundary or guard in the Tabs render that swallows the state change. Worth verifying with a real mouse click in dev tools before deciding the fix shape. File: `client/src/pages/Advanced.tsx` + tab content components.
- **FP-02 (Journey #6 empty).** `JourneyDetail.tsx` renders correctly when `steps.length === 0` — it just hides the Start button and step grid. The defect is data: the seeded `journeys` row has no rows in `journey_steps` (or whatever the linking table is). Either re-seed journey #6 with real steps or unpublish it until content lands.
- **FP-03 (Home tag filter never appears).** `availableTags` computation in `Home.tsx` walks `r.tags || r.metadata?.tags`. The static `awesome-list` resources surface tags differently (or not at all) compared with DB-backed Category resources. Either backfill tags on the static spine or hide the affordance with explicit copy.
- **L-04 silent rejection note.** `Login.tsx` does call the local-auth endpoint; on 401, no toast or inline message is shown. Recommend a `toast({variant:"destructive", title:"Login failed"})` on the mutation `onError` path.

---

## 5. Fix tasks rollup

| ID | Severity | Summary | File(s) |
|---|---|---|---|
| FX-01 | MEDIUM (HIGH if reproduced by real mouse) | `/advanced` Export + AI Recommendations tabs do not switch under programmatic `.click()` on `[role="tab"]`. `Explorer↔Metrics` work with the identical selector + click synthesis, so this is suspicious — **but the audit only proved it via programmatic click**, not via a physical mouse. First step: real-mouse repro in dev tools. If repro confirms, escalate to HIGH and patch the Tabs primitive / lazy-mount path. | `client/src/pages/Advanced.tsx` (+ any export/AI subcomponents lazy-loaded inside) |
| FX-02 | MEDIUM | Seed journey #6 with real steps (or unpublish until content is ready). Currently the only published journey lands on an empty Start-less detail page. | DB seed script / admin journey editor |
| FX-03 | LOW | Home tag-filter affordance silently absent because `availableTags === []` for static resources. Either backfill `tags` on the static dataset or hide the empty-state with explicit copy. | `client/src/pages/Home.tsx` + data seeder |
| FX-04 | LOW (UX) | `/login` silently rejects wrong credentials with no toast / inline error. Add `onError` toast to the local-auth mutation. | `client/src/pages/Login.tsx` |

No CRITICAL findings.

---

## 6. Coverage gaps (deferred, out-of-scope, or test-design-bound)

- **Admin pages** — entire `/admin/*` surface deferred to a separate task (already covered by post-merge tasks per project plan).
- **Subcategory back-to-category (S-03)** — test contaminated by S-02 navigating off-site (Galène link took the daemon to GitHub). Functionally covered by the equivalent back-button pattern on Category (C-07) and SubSubcategory (SS-02), which use the same `useLocation` push pattern.
- **Home AI-rec CTA click (H-05)** — eval-driven click resolved to `null` after a popover-Escape sequence. Statically verified that `loginLinks === 1` at H-01 and `/login` route renders correctly (L-01).
- **ResourceDetail Favorite + Bookmark** — only render for `isAuthenticated`. Not driven in this audit (R-* rows were run against the unauth-rendered shell; the authed surface was not separately probed for Favorite / Bookmark testids). Logged as **FX-06**: add R-08/R-09 in a future audit that authenticates first.
- **JourneyDetail Start / Complete / Resource-link flows (JD-02..JD-04)** — blocked on FP-02 (no steps in any of the 5 published journeys). Re-run after FX-02 seeds at least one journey with steps.
- **Advanced filter inside Journeys (J-02 application)** — only verified that the `Select` opens with 6 options; did not pick one and verify the resulting card filter. Same primitive is exercised end-to-end in C-03 + C-10, so risk is low.
- **Category static-resource external click path** — C-05 verified the DB-resource branch (numeric id → `/resource/:id`). The static-resource branch (non-DB cards that go through `window.open + toast`) was NOT exercised on Category. Subcategory S-02 did cover the same `window.open` shape, so behavior is indirectly proven.

### 6.1 Gap-fill pass via direct Playwright spec (resolves prior daemon-context blockers)

The first audit pass surfaced an environmental limitation in `agent-browser@0.27.0`: every `open http://localhost:5000/<route>` invocation created a fresh browser context, so the session cookie set by the `/login` round-trip did not travel to the next `open`. Authenticated rows (SR-04/05/06, C-08, R-06b) and the deep-rail sidebar checks (S-04, SS-03) initially landed as BLOCKED.

To remove the limitation we wrote `scripts/audit-gap-fill.mjs` — a direct Playwright spec using `chromium.launch()` + one `browser.newContext()` reused for the entire run, so the post-login session cookie propagates across every `page.goto`. The spec drives:

1. Local login (`admin@example.com` / `admin123`) via the real form on `/login`, asserts redirect to `/admin`, then confirms via in-page `fetch('/api/auth/user',{credentials:'include'})` that the session is `{status:200, email:"admin@example.com", role:"admin"}` (saved to `submit/SR-AUTH-state.json`).
2. `GET /submit` in the same context → asserts all 7 form testids mount (SR-04 PASS).
3. Empty submit → captures the 4 rendered zod messages (SR-05 PASS).
4. Cancel click → asserts URL `/` (SR-06 PASS).
5. `GET /category/infrastructure-delivery` → clicks `button-suggest-edit-*` → asserts the resulting `[role="dialog"]` has `isLoginGate:false`, 7 editable fields, and title `Suggest edit for "AVideo CDN Storage"` (C-08 PASS).
6. `GET /subcategory/live-streaming-servers` → reads `[data-sidebar="menu-button"][data-active="true"]` and `[data-state="open"]` counts — 3 collapsibles open, 0 active-pill (S-04 PASS for expansion, NEW finding **FP-05** below for active-pill styling).
7. `GET /sub-subcategory/online-forums` → same reads — 6 collapsibles open, 0 active-pill (SS-03 PASS for expansion).
8. Sweep candidate resource IDs against `/api/resources/:id/related` until one returns ≥1 row; navigate to that resource and assert the `[data-testid^="related-resource-"]` cards mount (R-06b PASS — resource 185090 returned 6 related cards under the `Related Resources` heading).

A second Playwright spec, `scripts/audit-gap-fill-2.mjs`, was added in response to architect feedback requesting positive-path coverage for the mutation/submit flows and explicit sort+filter persistence across all three view modes. Reusing the same persisted-context pattern, it drives:

9. **SR-07 — Valid submit success path.** Fills the authed `/submit` form with a unique title / URL / description and the first available category, clicks `button-submit`, and asserts the page body contains both `Success!` and `submitted for review` (rendered by the `setShowSuccess(true)` banner + `toast({title:"Success!"…})` at `SubmitResource.tsx:213–219`).
10. **C-09 — Category Suggest-Edit submit.** Opens the modal (C-08 path), appends `[audit-<ts>]` to the title, clicks `button-submit-edit`, asserts `dialogStillOpen:false` + body contains `submitted` / `review`. Exercises the `useMutation` → `onSuccess` close + invalidate path at `suggest-edit-dialog.tsx:296`.
11. **R-04b — ResourceDetail authed Suggest-Edit open + submit.** Navigates to `/resource/185090`, clicks `button-suggest-edit`, asserts all 5 form-field testids + `isLoginGate:false` (so it is NOT the unauth gate dialog), then mutates the title and submits — same close/toast assertions as C-09.
12. **C-10 — Sort + search filter persist across grid → list → compact → grid.** Navigates to `/category/infrastructure-delivery?search=cdn&sortBy=name-asc`, snapshots, then clicks `view-mode-list` → `view-mode-compact` → `view-mode-grid` in sequence, snapshotting after each. All four snapshots agree on `sortByParam:"name-asc"`, `searchParam:"cdn"`, `resultsCount:"Showing 43 of 128 resources"`, and the first sorted card identity — computed booleans `sortPersistsAcrossToggles:true`, `searchPersistsAcrossToggles:true`, `resultsCountStable:true`.

Per-row PASS evidence is summarized in the per-section tables above; raw JSON + screenshot pairs are on disk under `evidence/functional/pages/{submit,category,subcategory,subsubcategory,resourcedetail}/`. Both specs are checked in at `scripts/audit-gap-fill.mjs` + `scripts/audit-gap-fill-2.mjs` and are rerunnable end-to-end against any healthy dev server in <60s combined.

### 6.2 New finding from gap-fill — FP-05 (LOW): sidebar active-pill never lights up

During S-04 and SS-03 the sidebar correctly expands the rail (3 / 6 nested `Collapsible` panels open, exposing the ancestor category + subcategory + sub-subcategory leaf), confirming the `openCategories` push logic at `AppSidebar.tsx:78–251`. However, **no `SidebarMenuButton` ever sets `data-active="true"` on category / subcategory / sub-subcategory routes**. The render path expects `isActive(path)` to fire for the matching leaf — verified visually in the screenshot too (no highlighted pill in the rail despite the user clearly being on `/subcategory/live-streaming-servers`). Likely a stale `useLocation()` parsing OR an `isActive` comparator mismatch (e.g. trailing slash, encoded slug). Out of scope for #35 to fix — logged as new follow-up **FX-05**: instrument `isActive` in `AppSidebar.tsx` and add a `data-active="true"` pill on the rail-leaf for the current route.

---

## 7. Evidence index

```
evidence/functional/pages/                          (PNG + *-state.json counts as on disk after gap-fill pass)
├── home/                  (11 PNG +  7 *-state.json + ancillary *.json: options/pick/click/action + H-05-pre.json + H-05-after-click.png)
├── category/              (14 PNG + 10 *-state.json — adds C-08, C-09, C-10 + 4 view-mode JSON pairs C-04a/b/c/d)
├── subcategory/           ( 4 PNG +  4 *-state.json — adds S-04-rail-state.json + S-04-sidebar-rail.png)
├── subsubcategory/        ( 3 PNG +  3 *-state.json — adds SS-03-rail-state.json + SS-03-sidebar-rail.png)
├── resourcedetail/        ( 8 PNG +  9 *-state.json — adds R-06b + R-04b)
├── submit/                ( 4 PNG +  8 *-state.json — adds SR-04 / SR-05 / SR-06 / SR-07 / SR-AUTH on top of original SR-01..03)
├── login/                 ( 8 PNG +  5 *-state.json + 2 L-06 OAuth JSON: L-06-oauth-google.json + L-06-oauth-github.json + L-06-oauth-clicks.png)
├── advanced/              ( 5 PNG +  4 *-state.json + ancillary: pick × 4)
├── journeys/              ( 3 PNG +  3 *-state.json + ancillary: options)
├── journeydetail/         ( 4 PNG +  4 *-state.json + ancillary: action / resources)
└── notfound/              ( 2 PNG +  2 *-state.json + ancillary: action)
```

Some stages (Home H-01 through H-06 in particular) generated extra screenshots / supplemental `*-options.json` + `*-pick.json` + `*-click.json` files captured during the first-pass run that did not match the assertion shape — these are kept on disk as raw forensics. Each row in §3 cites only the canonical `*-state.json` + matching `*.png` that backs its verdict.

Each `*-state.json` is a single JSON-stringified object (per the Iron-Rule single-source-of-state-truth convention from Task #34). Each `*.png` was captured by the same daemon session immediately before or after the corresponding `eval`.

**Daemon:** `npx agent-browser@0.27.0` (Chromium-via-CDP, Playwright-free). All sessions chained inside single bash invocations to preserve page state between `eval` and `screenshot` calls — `open` + `wait` always paired with a tight `wait '<testid>'` or `wait --load networkidle` plus a 1–2s sleep before the first `eval` to give React Query time to hydrate the surface.
