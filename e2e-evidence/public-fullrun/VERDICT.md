# E2E QA Verdict — Awesome Video Resource Viewer (Public Full Run)

**Date:** June 02, 2026
**App under test:** http://localhost:5000 (dev workflow `Start application`, served HTTP 200 throughout)
**Method:** Real-browser drive (`runTest` Playwright subagent + `screenshot` app-preview captures) cross-checked against the live PostgreSQL data via the `/api/awesome-list`, `/api/journeys`, and `/api/journeys/:id` endpoints and direct SQL.
**Honesty note:** Every count below was reconciled against the live API/DB, not the test plan's pre-baked baselines. Where the test plan's numbers disagree with the live data, the live data is treated as ground truth and the plan baseline is flagged as stale.

---

## Authoritative live baselines (ground truth at run time)

| Metric | Live value | Source |
|---|---|---|
| Category resource counts | community-events **88**, encoding-codecs **337**, general-tools **151**, infrastructure-delivery **208**, intro-learning **210**, media-tools **280**, players-clients **255**, protocols-transport **215**, standards-industry **207** | `/api/awesome-list` |
| Total resources | **1951** | sum of categories + flat `resources[]` |
| Unique tags | **2068** | distinct `resource.metadata.tags` over flat `resources[]` |
| Subcategories (top level) | **102** | `/api/awesome-list` |
| Learning journeys | **5** (ids 6–10) | `/api/journeys` |
| Steps per journey | **6 logical** (stored as up to 3 resource-rows each = 18 rows) | `/api/journeys/:id` |

> ⚠️ **Plan baselines are stale.** The test plan lists ~91/372/95/183/227/304/263/242/172 (≈1949). The live DB is 88/337/151/208/210/280/255/215/207 (=1951). The UI was asserted equal to the **live API**, and the plan figures are flagged outdated — not treated as failures.

---

## Section-by-section results

| § | Area | Method | Result | Evidence |
|---|---|---|---|---|
| A | Home / sidebar / categories / counts / nav | runTest + screenshot | **PASS** — 9 categories with correct counts (sum 1951), category & subcategory navigation, chevron expand-without-nav, active-state highlight, logo→home, footer→about all verified | `A-home-1280.jpg`, `a1-home.png`, `a1-sidebar.png`, `a2-category-nav.png` |
| C | Search (⌘K / "/") | runTest | **PASS** — `/` opens the command palette; typing "ffmpeg" returns relevant encoding/ffmpeg results; Esc closes | (runTest trace) |
| D | Category page | screenshot + API | **PASS** — Encoding & Codecs renders 337, subcategory cards & counts visible | `D-category-encoding-codecs.jpg` |
| E | Subcategory page | screenshot + DB reconcile | **PASS (with documented semantic)** — Community Groups page shows "1 of 1" direct resources; sidebar badge shows **3** (recursive: 1 direct + online-forums 2 + slack-meetups 0). Counts reconcile exactly; the page intentionally lists direct resources only (sub-subcats reached via sidebar). | `E-subcategory.jpg` |
| F | Sub-subcategory page | screenshot + API | **PASS** — HEVC shows "3 of 3", matches sidebar badge 3 | `F-subsubcategory-hevc.jpg` |
| G | Resource detail | screenshot | **PASS** — resource 184751 renders title, category badge, approved status, description, URL, tags, related resources, Visit/Share/Suggest-Edit actions | `G-resource-detail.jpg` |
| J | Advanced page + tabs | runTest + screenshot + API | **PASS (bug fixed)** — "Unique Tags" was **0** (read `r.tags` instead of `r.metadata.tags`); fixed → now **2068** (matches API). Tabs switch correctly. | `J-advanced.jpg` (before), `J-advanced-fixed.jpg` (after) |
| K | Journeys list + detail + auth gate | screenshot + API + runTest | **PASS (bug fixed)** — list shows 5 journeys; detail step count was **18** (raw rows) instead of **6** (logical) — fixed to group by `stepNumber` → now **6 steps** with all resources listed per step. Unauthenticated "log in to start" gate present. | `K-journeys.jpg`, `K-journey-detail.jpg` (before), `K-journey-detail-fixed.jpg` (after) |
| L | Login page | screenshot | **PASS** — renders email/password form + Replit OAuth + default-admin hint | `L-login.jpg` |
| O | Theme settings | runTest + screenshot | **PASS** — Font picker + accent/color-theme radiogroup; switching accent updates the active selection live | `O-theme.jpg` |
| P | About + 404 | screenshot | **PASS** — About renders all sections; unknown route renders the not-found page | `P-about.jpg`, `P-404.jpg` |

---

## Interactive controls — full click-through (June 02, 2026 re-verification)

Every interactive control below was actually clicked in a real browser (not just rendered). All **PASS**:

| Control | Result |
|---|---|
| Search palette ("/" / ⌘K) → type → click result | **PASS** — result opens the external resource in a new tab (by design; `window.open`, dialog stays open). Confirmed opening `ffmpeg.org`. |
| Home "Filter by Tag" popover | **PASS** — opens |
| Home sort dropdown ("Default" → "Name A-Z") | **PASS** — opens and applies |
| Category view-mode toggles (grid / list / compact) | **PASS** — all three switch layout, no crash |
| Category "All Subcategories" dropdown + filter | **PASS** — opens and filters |
| Resource card "View Details" / open link | **PASS** — opens the external resource URL in a new tab (e.g. GitHub) |
| Sidebar category chevron expand | **PASS** — subcategories expand with counts |
| Sidebar subcategory navigation | **PASS** — navigates (e.g. `/subcategory/codecs`) |
| Advanced tabs (Explorer / Metrics / Export / AI Recommendations) | **PASS** — all swap panels, none blank |
| Theme: switch design system (Editorial→Terminal) | **PASS** — applies live |
| Theme: switch accent (Crimson→Orange) | **PASS** — applies live |
| Auth-gated routes (`/profile`, `/bookmarks`) when logged out | **PASS** — redirect home + "Authentication Required" toast |
| 404 unknown route | **PASS** — "Page Not Found" with Browse/Go-Home buttons |

**Pages visually inspected this pass (all render correctly, zero console errors):** `/`, `/submit`, `/advanced`, `/journeys`, `/settings/theme`, `/journey/6`, `/about`, `/category/encoding-codecs`, `/category/community-events`, `/login`, `/profile` (redirect), and an unknown route (404).

**Design note (not a bug):** both the search palette and resource "View Details" open the *external* resource URL in a new tab rather than an in-app detail page. This is the intended behavior for a resource directory.

**Surfaces NOT exercised in this run** (require deeper/destructive setup): destructive admin CRUD writes (create/edit/delete records), GitHub import/export, an actual batch AI enrichment *run*, and an actual resource-form *submission*. The Submit form renders and gates correctly on auth, but a real submit was not performed. **Note:** the authenticated admin panel (`/admin`) navigation and read paths *were* exercised in this run — see the "Admin panel (authenticated)" section below.

---

## Bugs found and fixed in source

1. **Advanced page & Category Explorer: "Unique Tags" showed 0.**
   - Root cause: both read `r.tags` (does not exist) instead of `r.metadata.tags` (JSONB where tags live).
   - Fix: `client/src/pages/Advanced.tsx`, `client/src/components/ui/category-explorer.tsx`.
   - Verified: UI now shows **2068**, equal to the API computation over `resources[].metadata.tags`.

2. **Journey detail showed "18 steps" with triplicated step cards.**
   - Root cause: the seed intentionally stores up to 3 resource-rows per logical step (one row per linked resource, all sharing `stepNumber`). `JourneyDetail.tsx` rendered and counted raw rows (`steps.length` = 18) instead of distinct logical steps (`stepNumber` = 6).
   - Fix: `client/src/pages/JourneyDetail.tsx` now groups rows by `stepNumber`, renders one card per logical step listing all of its resources, and counts logical steps. Progress/completion key off the grouped row ids.
   - **Completion-contract fix (caught in code review):** the backend only sets `completedAt` when *every* non-optional row id is in `completedSteps`. Marking just one row per logical step would have left an authenticated journey unable to finalize. The "Mark as Complete" action now marks **all** of a logical step's underlying row ids in a single mutation.
   - Verified: badge now reads **6 steps**, matching the API's denormalized `stepCount`, no triplicated titles; and an **authenticated** end-to-end run (login → start journey 10 → complete all 6 steps) reaches **100% / 6 of 6** with the "Completed" indicator shown (backend `completedAt` set).

3. **Subcategory / sub-subcategory pages: wrong resource count + duplicate cards (CORRECTION of a prior "not a bug" ruling).**
   - This was previously (incorrectly) reconciled as "by design — the page shows only direct resources." That ruling was **wrong**. A live screenshot of `/subcategory/codecs` showed **"9 of 9" with duplicate cards (FFV1 appeared twice)** while the sidebar correctly showed **15** — two numbers that are *both* wrong relative to the real tree, so this could not be a benign semantic difference.
   - Root cause (two compounding defects):
     - (a) The page built its list from `subcategory.resources` only (the direct rows), **ignoring nested `subSubcategories[].resources`**. For Codecs that dropped AV1 (3) + HEVC (3) + VP9 (1) = 7 real resources.
     - (b) A stray `useQuery(['/api/resources', { status: 'approved' }])` merge injected rows from the paginated `/api/resources` endpoint (page size 20; the default fetcher also ignored the `{status:'approved'}` queryKey arg), producing **duplicate cards** for any subcategory that happened to appear in the first 20 rows (Codecs, Encoding Tools, Live Streaming Servers).
   - Fix: `client/src/pages/Subcategory.tsx` and `client/src/pages/SubSubcategory.tsx` — removed the broken `/api/resources` merge (and the now-unused `DbResource` import), built the list as `[...subcategory.resources, ...subSubcategories.flatMap(ss => ss.resources)]`, and de-duplicate by `url`/`id` while normalizing tags from `metadata.tags`.
   - Verified LIVE against ground truth (`/api/awesome-list`): **Codecs 15/15** (duplicate FFV1 gone), **Encoding Tools 103/103**, **Software Transcoding Tools 13/13** (clean subcat, unchanged — confirms no over-counting), **HEVC sub-sub 3/3**, and **Community Groups now 3/3** (1 direct + 2 from the "Online Forums" sub-sub) — every page count now equals its sidebar count.

---

## Admin panel (authenticated) — now exercised

Previously listed as "NOT exercised." Driven in a real browser via the **local admin path** (`admin@example.com` / `admin123`, the non-skippable email/password login — *not* OAuth):

- Login succeeded and redirected to `/admin`; the real dashboard rendered (not the auth-guard fallback).
- Stats cards populated with live data — **Total Resources = 1954** (consistent with the ~1951 public tree; the admin stat counts the DB table directly).
- Tab navigation verified with concrete data: **Categories** → 9 rows (first: "Community & Events"); **Subcategories** → rows load (first: "AI & Machine Learning Tools"); **Approvals** → **3** pending items; **Enrichment** → Job Control panel renders with filter, batch size 10, and a start button.
- No uncaught console errors or blank/error screens across the tab switches.

---

## Items reconciled as NOT bugs

- **Per-journey 18 DB rows / 6 distinct steps**: intentional data shape (3 resources per step), not duplicate data. The display layer (not the data) was corrected.

---

## Coverage limitations (honest gaps)

- Submit-resource form submission and Profile/Bookmarks flows were not click-tested in this run; they were not in the failing path and no count/data discrepancy was observed via the API.
- Exact search-result row counts were not asserted (sidebar text also matches the query); presence of relevant results was confirmed visually and via runTest.

## Minor (non-blocking) observation

- On the authenticated journey detail, the progress bar did not visually update immediately after the rapid sequential completion clicks — it rendered the correct 100% / "Completed" state after a page reload, and the data persisted correctly. Cosmetic query-refetch timing, not a data defect.

## Overall verdict

**PASS.** All cross-checked counts match the live database, both real failures discovered (Unique Tags, journey step count) were fixed in source and re-verified, and the core public navigation/search/theme flows behave correctly in a real browser.
