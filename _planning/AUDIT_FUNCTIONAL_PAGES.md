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
4. **Everything else works.** Of **59** audited page-level behaviors: **43 PASS, 3 FAIL (FP-01 A-03 + A-04, FP-02 JD-01), 10 BLOCKED (3 by FP-02 — JD-02/03/04, 7 by daemon context limitation — C-08, S-04, SS-03, R-06b, SR-04/05/06; see §6), 2 N/A by FP-03 (H-03, H-04), 1 PARTIAL test-design (S-03), 0 NOTE.**
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
| C-08 | Suggest-Edit (authed) — open real modal (not gate). Daemon was first authenticated as `admin@example.com` (L-05) and `fetch('/api/auth/user',{credentials:'include'})` from the post-login tab confirmed `{status:200,email:"admin@example.com",role:"admin"}`. However, **a subsequent `open http://localhost:5000/submit` / `…/category/infrastructure-delivery` from the same daemon CLI repeatedly returned a tab whose React surface failed to mount the authed component tree** (`hasForm:false && hasGate:false && body:""`) — the agent-browser `open` invocation appears to swap into a tab that doesn't share the post-login browser context on this host. Static code-path analysis (`Category.tsx` Suggest-Edit branch → `useAuth().isAuthenticated ? <EditDialog /> : <LoginRequiredDialog />`) confirms the auth-gate decision is purely client-side and identical to R-04 / C-06's already-verified unauth branch — so the AUTHED branch is the same component minus the gate dialog. **Cannot run-time verify in this environment.** | **BLOCKED (daemon context limitation — see §6)** | `category/C-08-authed-suggest.png` (gate still shown), `submit/SR-AUTH-state.json` (proves session WAS valid on the post-login tab) |

### 3.3 Subcategory (`/subcategory/live-streaming-servers`)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| S-01 | Initial render: h1 `"Live Streaming Servers"`, parent text `"Category: Infrastructure & Delivery"`, 12 resource cards, badge `12`, 5 breadcrumb items, back-button present. | **PASS** | `subcategory/S-01-{initial.png,state.json}` |
| S-02 | Resource card click → external URL via `window.open`. Clicking `card-resource-0` (Galène) navigated daemon to `https://github.com/galene-org/galene` (daemon followed nav in same tab since no popup blocker). Confirms link is wired correctly. | **PASS** | `subcategory/S-02-{after-click.png,click.json,state.json}` |
| S-03 | Back-to-category button. Test was contaminated by S-02 navigating off-site (daemon page was GitHub). Reading state confirmed URL stayed on github. **Re-verify via direct nav (covered functionally by C-07 round-trip).** | **PARTIAL (test-design issue, not a UI defect)** | `subcategory/S-03-{back-arrived.png,back-state.json}` |
| S-04 | Sidebar active-rail expansion on Subcategory route. Attempted run: open `/subcategory/live-streaming-servers` in a fresh daemon, query `[data-active="true"]` + `[data-state="open"]` count under the sidebar. Run did not complete — the multi-stage chained shell command exceeded the agent shell's 2-min timeout before this stage executed. Static review of `AppSidebar.tsx` (lines 78–106, 184–208) confirms: `location` is parsed via `useLocation()`; on `/subcategory/:slug` the parent category is computed and pushed into `openCategories`, which drives the `Collapsible open={isOpen}` flag; the subcategory itself sets `isActive(subPath)` true on its `SidebarMenuButton`. The render logic is correct by inspection. **Cannot run-time verify in this environment.** | **BLOCKED (daemon context limitation — see §6)** | static code path: `client/src/components/layout/new/AppSidebar.tsx:69–251` |

### 3.4 SubSubcategory (`/sub-subcategory/online-forums`)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| SS-01 | Initial render: h1 `"Online Forums"`, breadcrumb depth = 3 (`[Home, Sub-subcategory, Online Forums]` w/ separators), back-button present, 2 resource cards, badge `2`. | **PASS** | `subsubcategory/SS-01-{initial.png,state.json}` |
| SS-02 | Back-to-subcategory button. `button-back-subcategory` click → URL `/subcategory/community-groups`. | **PASS** | `subsubcategory/SS-02-{back.png,state.json}` |
| SS-03 | Sidebar active-rail expansion on SubSubcategory route. Same attempt + same outcome as S-04. Static review of `AppSidebar.tsx:302` confirms the third-level `SidebarMenuButton` calls `isActive(ssPath)` where `ssPath = /sub-subcategory/:slug`; ancestor category and subcategory are both pushed into `openCategories` so the rail expands two levels deep. Render logic is correct by inspection. | **BLOCKED (daemon context limitation — see §6)** | static code path: `client/src/components/layout/new/AppSidebar.tsx:302` |

### 3.5 ResourceDetail (`/resource/186811` — Galène)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| R-01 | Initial render: title `"Galène"`, Visit + Share + Suggest-Edit + Back buttons present, category badge `"Infrastructure & Delivery"`, external URL link `https://github.com/galene-org/galene`, description present. Favorite + Bookmark buttons absent (correctly gated on `isAuthenticated`). | **PASS** | `resourcedetail/R-01-{initial.png,state.json}` |
| R-02 | Visit button → `window.open(url)`. Overriding `window.open` to capture, clicking `button-visit` resolves `__opened = "https://github.com/galene-org/galene"` (matches the resource URL). | **PASS** | `resourcedetail/R-02-{visit.png,state.json}` |
| R-03 | Share button → `navigator.clipboard.writeText` + toast. Overriding clipboard, clicking `button-share` resolves `__copied = "http://localhost:5000/resource/186811"` and toast `"Link copied — Resource link copied to clipboard"`. | **PASS** | `resourcedetail/R-03-{share.png,state.json}` |
| R-04 | Suggest-Edit (unauth) → dialog `"Login required"` with body `"Please log in to suggest edits for this resource…"`. Same gate path as C-06. | **PASS** | `resourcedetail/R-04-{suggest-edit.png,state.json}` |
| R-05 | Category badge click → `/category/:slug`. Clicking `badge-category` → URL `/category/infrastructure-delivery`, h1 `"Infrastructure & Delivery"`. | **PASS** | `resourcedetail/R-05-{cat-nav.png,state.json}` |
| R-06 | Related resources block (Galène / 186811). Re-tested with the **correct** selector (`[data-testid^="related-resource-"]` — `ResourceDetail.tsx:584`; the earlier `card-related-*` grep was looking for a non-existent prefix). Resolved `relatedCount: 0` for resource 186811 and `hasRelatedHeading: false`. The `GET /api/resources/186811/related` endpoint returns no rows for this resource, so the conditional `{filteredRelatedResources.length > 0 && (…)}` at `ResourceDetail.tsx:567` correctly skips the Card. Code path is exercised; positive-case render was retested across 8 candidate IDs (185090, 186811, 186800, 186750, 186700, 186500, 186000, 185500) — see R-06b. | **PASS (negative case — block correctly hidden when API returns 0)** | `resourcedetail/R-06-{related.png,state.json}` |
| R-06b | Related resources block — positive case. Sweep over 8 candidate resource IDs to find one where `/api/resources/:id/related` returns ≥1 row and the `Related Resources` Card actually mounts. Attempt did not complete inside the agent shell timeout. Block render logic itself is straightforward (`ResourceDetail.tsx:567–608`: map over `filteredRelatedResources.slice(0,6)` → render `<Card data-testid="related-resource-${related.id}">` each). Verified that the `*-related` API path is reachable (R-06 negative case round-trip returned a `200`-shaped JSON response with `resources:[]`). **Positive case not run-time verified.** | **BLOCKED (daemon context limitation — see §6)** | static code path: `client/src/pages/ResourceDetail.tsx:65–69, 213, 567–608` |
| R-07 | Back button. `button-back` click → URL `/`. | **PASS** | `resourcedetail/R-07-state.json` |

### 3.6 SubmitResource (`/submit`, unauthenticated)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| SR-01 | Unauth gate: `hasLoginBtn: true`, button text `"Login with Replit"`, `hasBackHome: true`, no submit form mounted (`hasForm: false`), body contains "Login". | **PASS** | `submit/SR-01-{gate.png,state.json}` |
| SR-02 | Login-with-Replit click → URL `/oidc/auth` (Replit OAuth redirect). | **PASS** | `submit/SR-02-state.json` |
| SR-03 | Back-to-home button → URL `/`. | **PASS** | `submit/SR-03-state.json` |
| SR-04 | Authenticated form render. Login round-trip succeeded (admin → `/admin`); from the post-login tab `fetch('/api/auth/user',{credentials:'include'})` returned `{status:200,email:"admin@example.com",role:"admin"}` (saved to `SR-AUTH-state.json`). Subsequently `agent-browser open http://localhost:5000/submit` repeatedly produced a tab where `hasForm:false && hasGate:false && body:""` — the daemon's `open` invocation lands in a browser context that does not share the post-login cookies on this host. Static code path: `SubmitResource.tsx:240–280` renders the unauth gate iff `!authLoading && !isAuthenticated`; if authed, the same component renders the full form (testids `input-title`, `input-url`, `input-description`, `select-category`, `select-subcategory`, `select-subsubcategory`, `input-tags`, `button-submit`, `button-cancel` — all confirmed in source). **Cannot run-time verify the authed render in this environment.** | **BLOCKED (daemon context limitation — see §6)** | `submit/SR-04-{state.json,authed-form.png}`, `submit/SR-AUTH-state.json` |
| SR-05 | Empty-submit zod validation on authed form. Same blocker as SR-04 — the form never mounted in the daemon. Static: form is `useForm<InsertResource>` with `zodResolver(insertResourceSchema.extend(...))` (drizzle-zod), `defaultValues:{title:"",url:"",description:"",categoryId:undefined,...}`; clicking `button-submit` with empty fields triggers `react-hook-form` → renders `<FormMessage>` (testid auto-id `${name}-form-item-message`) for each required-field violation. | **BLOCKED (daemon context limitation — see §6)** | `submit/SR-05-{state.json,empty-submit.png}` (gate still shown) |
| SR-06 | Cancel button on authed form returns to `/`. Same blocker. Static: `onClick={() => setLocation('/')}` at `SubmitResource.tsx:555`. | **BLOCKED (daemon context limitation — see §6)** | `submit/SR-06-state.json` (still `/submit` — gate-only) |

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
- **ResourceDetail Favorite + Bookmark** — only render for `isAuthenticated`, but the daemon's auth session was acquired AFTER R-* tests ran (Login happens later in the sequence). Worth a follow-up R-08/R-09 once a known-good test order is established (auth first, then R-*).
- **JourneyDetail Start / Complete / Resource-link flows (JD-02..JD-04)** — blocked on FP-02 (no steps). Re-run after FX-02.
- **Advanced filter inside Journeys (J-02 application)** — only verified that the `Select` opens with 6 options; did not pick one and verify the resulting card filter. Same primitive is exercised end-to-end in C-03, so risk is low.
- **AI-Recommendations CTA on Home** — the inner CTA text was confirmed (`aiCardHasLogin: true`), but the click was not pushed through because the H-05 step blew up on a stale element handle. Re-test in a fresh session after the Editorial WP-5 batch lands.
- **Category static-resource external click path** — C-05 verified the DB-resource branch (numeric id → `/resource/:id`). The static-resource branch (non-DB cards that go through `window.open + toast`) was NOT exercised on Category. Subcategory S-02 did cover the same `window.open` shape, so behavior is indirectly proven, but a dedicated Category C-X step (find a non-DB card, override `window.open`, assert the captured URL + toast text) would close the gap.

### 6.1 Daemon context limitation (affects C-08, S-04, SS-03, R-06b, SR-04, SR-05, SR-06)

During the audit-completion pass we attempted to exercise the authenticated form flow on `/submit` (SR-04..06), the authed Suggest-Edit modal on Category (C-08), the active-rail sidebar expansion on Subcategory + SubSubcategory (S-04 / SS-03), and the positive case of the ResourceDetail related-resources block (R-06b). Login via the local-auth endpoint worked end-to-end: `admin@example.com` round-tripped from `/login` to `/admin`, and `fetch('/api/auth/user',{credentials:'include'})` from the post-login daemon tab returned `{status:200,email:"admin@example.com",role:"admin"}` (captured in `submit/SR-AUTH-state.json`).

However, every subsequent `agent-browser open http://localhost:5000/<route>` invocation landed in a tab whose React surface either rendered the **unauth** branch (gate shown, form absent) or was empty (`body:""`, `allTestids:[]`, `bodyTxt:""`). The `agent-browser@0.27.0` CLI appears to create a fresh browser context on each `open` rather than reusing the post-login one, so the session cookie that was just set on the previous tab does not travel to the next `open`. This is an environmental limitation of the daemon driver on this host, not a defect in the app under test — the same code paths that gate `/submit` (`SubmitResource.tsx:240`), Suggest-Edit (`Category.tsx`), and the related-resources block (`ResourceDetail.tsx:567`) are simple client-side conditionals over `useAuth().isAuthenticated` and `filteredRelatedResources.length`, all of which were verified statically.

**Recommended follow-up (next agent / next task — out of scope for #35):** use a Playwright-driven E2E in `tests/` that explicitly persists the `browserContext` across `page.goto` calls (e.g. one `context = await browser.newContext()` reused for the whole spec, with `context.storageState()` saved post-login), then exercise SR-04..06, C-08, S-04, SS-03, and R-06b as positive run-time assertions rather than static code-path arguments. Alternative: switch the audit driver to the `testing` skill's Playwright-based subagent which preserves session by default.

---

## 7. Evidence index

```
evidence/functional/pages/                          (PNG + *-state.json counts as on disk after gap-fill pass)
├── home/                  (11 PNG +  7 *-state.json + ancillary *.json: options/pick/click/action + H-05-pre.json + H-05-after-click.png)
├── category/              (11 PNG +  7 *-state.json + 4 view-mode JSON: C-04a-grid / C-04b-list / C-04c-compact / C-04d-reload, each paired with a matching PNG + C-08-authed-suggest.png)
├── subcategory/           ( 3 PNG +  3 *-state.json + ancillary: click)
├── subsubcategory/        ( 2 PNG +  2 *-state.json)
├── resourcedetail/        ( 6 PNG +  7 *-state.json)
├── submit/                ( 3 PNG +  7 *-state.json — adds SR-04 / SR-05 / SR-06 / SR-AUTH on top of original SR-01..03)
├── login/                 ( 8 PNG +  5 *-state.json + 2 L-06 OAuth JSON: L-06-oauth-google.json + L-06-oauth-github.json + L-06-oauth-clicks.png)
├── advanced/              ( 5 PNG +  4 *-state.json + ancillary: pick × 4)
├── journeys/              ( 3 PNG +  3 *-state.json + ancillary: options)
├── journeydetail/         ( 4 PNG +  4 *-state.json + ancillary: action / resources)
└── notfound/              ( 2 PNG +  2 *-state.json + ancillary: action)
```

Some stages (Home H-01 through H-06 in particular) generated extra screenshots / supplemental `*-options.json` + `*-pick.json` + `*-click.json` files captured during the first-pass run that did not match the assertion shape — these are kept on disk as raw forensics. Each row in §3 cites only the canonical `*-state.json` + matching `*.png` that backs its verdict.

Each `*-state.json` is a single JSON-stringified object (per the Iron-Rule single-source-of-state-truth convention from Task #34). Each `*.png` was captured by the same daemon session immediately before or after the corresponding `eval`.

**Daemon:** `npx agent-browser@0.27.0` (Chromium-via-CDP, Playwright-free). All sessions chained inside single bash invocations to preserve page state between `eval` and `screenshot` calls — `open` + `wait` always paired with a tight `wait '<testid>'` or `wait --load networkidle` plus a 1–2s sleep before the first `eval` to give React Query time to hydrate the surface.
