# AUDIT_REPORT — Master consolidation

**Task:** #36 — Consolidate the 8 audits delivered in Tasks #28–#35 into a single read-only master report. **No fixes, no re-running.** Every finding from every input audit is preserved (no silent drops). Each finding is given a stable master ID, a normalized severity (BLOCK / FIX / NIT), a code area, an evidence pointer, and a routing assignment to one of the 6 already-queued remediation tasks (or to Carve-outs).

**Date:** May 19, 2026.

**Sources (8):**

1. `_planning/AUDIT_DS_STRUCTURAL.md` — Task #28, Editorial+Crimson DS compliance (stages 1–11)
2. `_planning/AUDIT_LANDING.md` — Task #29, Home/About/Login/Submit-gate/Theme/404 × 400/768/1280
3. `_planning/AUDIT_CATEGORY.md` — Task #30, 9 category pages × 3 widths + view-mode + hover + breadcrumb
4. `_planning/AUDIT_DETAIL.md` — Task #31, Subcategory / SubSubcategory / ResourceDetail + sidebar accordion
5. `_planning/AUDIT_ADVANCED_JOURNEYS.md` — Task #32, /advanced + 4 tabs + /journeys + /journey/6
6. `_planning/AUDIT_MOBILE.md` — Task #33, iPhone 390×844 mobile parity sweep
7. `_planning/AUDIT_FUNCTIONAL_CHROME.md` — Task #34, persistent-chrome interaction validation
8. `_planning/AUDIT_FUNCTIONAL_PAGES.md` — Task #35, page-level interaction validation

---

## 1. Executive summary

### 1.1 Normalized severity rollup

Severities across the 8 audits use three different scales. They are unified here as follows:

| Source scale | BLOCK | FIX | NIT |
|---|---|---|---|
| DS structural (skill rubric) | BLOCK | FIX | NIT |
| Visual audits (landing/category/detail/adv/mobile) | CRITICAL | HIGH, MEDIUM | LOW, NOTE |
| Functional audits (chrome/pages) | (none observed) | FAIL — HIGH, FAIL — MEDIUM | FAIL — LOW, PARTIAL, NOTE |
| Functional `BLOCKED` rows | — | — | — (routed to **Carve-outs** §4) |

**Net tally across all 8 audits, after de-duplication of cross-audit clones:**

| Bucket | Count | Notes |
|---|---:|---|
| **BLOCK** | **1** | Theme picker is functionally broken (DS-T-01 / M-02 / FC-02 / FC-03 — one root cause, 2 files) |
| **FIX** | **42** | Real code changes required; split across the 6 remediation tasks below |
| **NIT** | **41** | Polish, NOTEs, intentional DS-OK escapes, info-only verification rows |
| **PASS** (informational, no row in master table) | **~80** | Verification rows from functional audits #34/#35 + visual PASSes from mobile #33 + tab/sidebar verifications from #31/#32 |
| **Carve-outs** (deferred / blocked / out-of-scope) | **8** | See §4 |

**Cross-audit clones de-duplicated:**

| Same root cause | Audit IDs | Master ID |
|---|---|---|
| Theme picker reads wrong field shape (`preset.label` / `preset.dark/light`) → labels empty + swatches identical | LANDING T-01 / T-06; MOBILE M-02; CHROME FC-03 | **MR-DS-01** |
| Theme accent applier reads wrong field shape (`activeTheme?.dark?.primary`) → `--accent` never updates | LANDING T-01 (same para); MOBILE M-02 (compounding bug); CHROME FC-02; CHROME M (reload persistence partial) | **MR-DS-02** |
| Sidebar `NAVIGATION` / `CATEGORIES` rendered as crimson uppercase eyebrows | LANDING H-01; CATEGORY C-08; DETAIL D-03; ADV D-03 (MOBILE M-16 is *inherited / verification-only*, not actionable — referenced for traceability only) | **MR-CH-01** |
| Sidebar brand `1952 RESOURCES` crimson uppercase eyebrow | LANDING H-02; CATEGORY C-08; DETAIL D-03; ADV D-03 | **MR-CH-02** |
| Primary `Button` perceptible accent glow vs. reference flat fill | LANDING L-02 / S-04 / N-02 | **MR-LP-04** |

### 1.2 Routing to the 6 already-queued remediation tasks

Counts below are master rows, not raw input rows.

| Remediation task (already queued) | BLOCK | FIX | NIT | Total |
|---|---:|---:|---:|---:|
| **Fix — Landing + Theme** (`Home.tsx`, `About.tsx`, `Login.tsx`, `SubmitResource.tsx` gate, `NotFound.tsx`) | 0 | 12 | 8 | 20 |
| **Fix — Category surface** (`Category.tsx` template + view-mode toggle + hover) | 0 | 8 | 5 | 13 |
| **Fix — Detail surface** (`Subcategory.tsx`, `SubSubcategory.tsx`, `ResourceDetail.tsx`) | 0 | 2 | 5 | 7 |
| **Fix — Advanced + Journeys** (`Advanced.tsx`, `Journeys.tsx`, `JourneyDetail.tsx`) | 0 | 2 | 7 | 9 |
| **Fix — Sidebar/Header/MainLayout chrome** | 0 | 5 | 4 | 9 |
| **Fix — DS structural compliance** (incl. the theme picker root cause + `/` shortcut + recharts/palette/radii) | 1 | 13 | 12 | 26 |
| **Carve-outs** (deferred / data-blocked / out-of-scope) | — | — | — | 8 |

Total master rows surfaced: 92 (counts above include cloned rows that route to the same task — see §3 for the canonical de-duplicated table). Every input-audit finding is represented; nothing is silently dropped.

### 1.3 What's truly broken vs. what's polish

**The one BLOCK** is the **Theme Settings color picker**, which is dead at runtime *and* unreadable in the UI:

- Picking any of the 6 color theme cards persists `theme-preset` to `localStorage` but never updates `--accent` / `--accent-2` (FC-02, reproducible across browser reload — see FUNCTIONAL_CHROME §3.1 row L+M).
- All 6 cards render with empty `<span>` labels + three identical `#000/#444/#888` fallback swatches + `#000` hex caption (FC-03, T-01, M-02).
- Root cause is a single field-shape mismatch between `ThemePreset` (`name` / `cssVars.primary` / `preview.{accent,secondary,bg}`) and the two readers (`ThemeSettings.tsx:97–129` + `theme-provider.tsx:129–139`). Two files, two block-of-lines edits.

**The two HIGH cross-cutting FIXes** are the sidebar's crimson uppercase `NAVIGATION` / `CATEGORIES` eyebrows (MR-CH-01) and the matching crimson `1952 RESOURCES` brand eyebrow (MR-CH-02). They appear in every screenshot of every page in every visual audit. One change in `AppSidebar.tsx` repairs every page.

**Everything else** is per-page polish (heading sizes, padding, icon coloring, button glow), one HIGH functional defect on `/advanced` (Export + AI Recs tabs are dead under programmatic `.click()` — FP-01), and a small set of legitimately deferred items (mobile swipe-to-close, journey #6 empty steps, login silent-rejection toast).

**No PASS row from functional audits #34/#35 was downgraded.** PASS rows are preserved as the source of truth for what is already working; they are not enumerated in the master table because they require no remediation, only re-verification after each fix lands.

---

## 2. Severity mapping conventions

For full traceability:

- **Visual `CRITICAL`** → BLOCK. (Only one observed: T-01.)
- **Visual `HIGH`** → FIX.
- **Visual `MEDIUM`** → FIX.
- **Visual `LOW`** → NIT.
- **Visual `NOTE`** → NIT (kept in the table for traceability per the no-silent-drop rule).
- **Functional `FAIL — HIGH`** → FIX.
- **Functional `FAIL — MEDIUM`** → FIX.
- **Functional `FAIL — LOW`** → NIT *or* Carve-out (case by case — see §4).
- **Functional `PARTIAL` / `BLOCKED`** → Carve-out (test-design or data-gap, not a code defect).
- **Functional `N/A`** → Carve-out (gated affordance never mounts; root cause is data-side).
- **DS `FIX` / `NIT`** → preserved as-is (rubric already matches).
- **DS `BLOCK`** → preserved as-is (none observed).
- **Visual `PASS`, Functional `PASS`** → not represented in the master table; counted only in the executive summary §1.1.

### 2.1 Normalization exceptions (explicit, with justification)

Per the task spec's hard rule, FAIL→FIX and BLOCKED→carve-out is the default. The following rows deviate; each deviation is enumerated here so the planner can approve, reject, or re-route. Nothing is hidden — these are the only exceptions in the report.

| Master ID | Source severity | Default mapping | This report routes to | Justification |
|---|---|---|---|---|
| MR-XO-01 | FP-02 + JD-02/03/04 FAIL — MEDIUM / BLOCKED | FIX (for FP-02) + Carve-out (for the BLOCKED chain) | **Carve-out** | FP-02 is "journey #6 has 0 published steps." The root cause is an empty `journey_steps` table, not a code defect; the empty-state UI already PASSes. JD-02/03/04 are BLOCKED on the same data gap. Routing FP-02 to a code-fix task would assign engineering work for a content-seed problem. Planner may re-route to a content/seed task if one is queued. |
| MR-XO-03 | S-03 PARTIAL | Carve-out | **Carve-out** | Default mapping is satisfied. |
| MR-XO-04 | FC-04 FAIL — LOW | FIX | **Carve-out** | Mobile drawer swipe-to-close is unimplemented and unadvertised; ESC + hamburger toggle + Radix overlay scrim all close it (3 working dismissal paths, all verified PASS in #34). Implementing requires adding `vaul` or `framer-motion drag="x"` — a sprint-scope feature, not a defect repair. Planner may promote to FIX (and into Chrome task) if drawer gesture support is in roadmap. |
| MR-LP-20 | FP-03 FAIL — LOW (recorded as N/A — H-03/H-04) | Carve-out (N/A) | **NIT inside Landing+Theme** (with carve-able note) | The Home tag filter trigger is gated on `availableTags.length > 0` and the static spine has no `tags` field, so the popover never mounts — H-03/H-04 record this as N/A, FP-03 as LOW. Routed to Landing+Theme because the resolution is a 1-line product call between (a) backfill tags or (b) hide affordance with explicit copy — both edits live in `Home.tsx`. Planner may re-route to Carve-outs if backfill is owned elsewhere. |
| MR-CT-12, MR-DT-03..07, MR-AJ-03..09, MR-CH-06..09, MR-DS-23..26 | Visual NOTE / PASS-adjacent verification | (not in table) | **NIT inside owner task** | Kept as NITs (not dropped, not promoted) so the verification rows survive into the master table per the no-silent-drop rule. Each has "verification only — no fix" in the proposed-fix cell. Removing them would silently drop the verification evidence; promoting them would invent work. |
| MR-XO-05..MR-XO-07 | PAGES gaps G1/G2/G6 (unverified) | (no spec — gaps are unverified, not failed) | **Carve-out** | These are coverage gaps from #35, not findings. Carved out because the report can neither confirm nor refute them; they survive in §4 so a future audit pass can pick them up. |

All other rows follow the default mapping mechanically.

---

## 3. Master findings table

Columns: **ID** (stable master id) | **Source** (audit + native id) | **Severity** (normalized) | **Code area** (file or surface) | **Description** (1–2 sentence summary) | **Proposed fix** (1-line direction; no code changes happen in this audit) | **Evidence** (path or §-anchor in source audit).

Rows are grouped by remediation task (the same grouping is used in §5).

### 3.1 Fix — Landing + Theme (route: `client/src/pages/{Home,About,Login,SubmitResource,NotFound}.tsx`)

| ID | Source | Severity | Code area | Description | Proposed fix | Evidence |
|---|---|---|---|---|---|---|
| MR-LP-01 | LANDING H-03 | FIX | `Home.tsx` category cards | Card internal padding heavier (~110 px) and gap looser than reference (~90 px). | Drop card vertical padding one tier + tighten `gap-4` → `gap-3`. | `screenshots/audit/landing/home_1280_{current,reference}.jpg` |
| MR-LP-02 | LANDING A-01 | FIX | `About.tsx` hero | h1 `text-4xl sm:text-5xl` (~48 px) one step too large; Sparkles `h-7 w-7` correspondingly oversized. | Step both down one tier (h1 `text-3xl sm:text-4xl`, icon `h-5 w-5`). | `screenshots/audit/landing/about_1280_{current,reference}.jpg` |
| MR-LP-03 | LANDING A-02 | FIX | `About.tsx` section CardTitle icons | Every section icon rendered crimson; reference uses neutral/muted gray for non-hero section icons. | Restrict crimson to the page-hero Sparkles + "What is this?" Rocket; neutralize the rest. | `screenshots/audit/landing/about_1280_*.jpg` |
| MR-LP-04 | LANDING A-03 | FIX | `About.tsx` Features grid icons | All Features tile icons rendered crimson; reference shows neutral icons with only the first row tinted. | Strip accent class from per-tile icons; keep first-row tint. | `screenshots/audit/landing/about_1280_*.jpg` |
| MR-LP-05 | LANDING A-04 | FIX | `About.tsx` Tech Stack bullets | Bullets alternate `bg-primary`/`bg-accent` → both resolve to crimson under cyberpunk; reference uses filled+outlined rhythm. | Replace half the dots with `border-accent bg-transparent` outline. | `screenshots/audit/landing/about_1280_*.jpg` |
| MR-LP-06 | LANDING L-01 | FIX | `Login.tsx` header icon | Header `LogIn` glyph wrapped in `bg-accent/12` round bubble + crimson ring; reference shows plain crimson glyph. | Remove bubble + ring; keep crimson icon on bare card surface. | `screenshots/audit/landing/login_1280_*.jpg` |
| MR-LP-07 | LANDING L-02 + S-04 + N-02 (clone) | FIX | shadcn `Button` primary variant on Login / Submit-gate / 404 | Primary CTA paints with perceptible glow/elevation; reference is flat crimson fill. | Remove `box-shadow`/elevation off `Button` primary variant in the shadcn config. | `login/login_1280_*.jpg`, `submit/submit_1280_*.jpg`, `notfound/notfound_1280_*.jpg` |
| MR-LP-08 | LANDING L-03 | FIX | `Login.tsx` default-admin block | One-paragraph layout; reference has 2 stacked rows (label row + mono creds row) + explicit warning glyph. | Split into label row + `<code>` row + warning row with `AlertTriangle`. | `login/login_1280_*.jpg` |
| MR-LP-09 | LANDING S-01 | FIX | `SubmitResource.tsx` auth gate | Uses shadcn `--primary` chain (`bg-primary/10`, `text-primary`, `border-primary/20`) instead of DS `var(--accent)` chain; breaks under non-cyberpunk preset. | Swap to `bg-[color-mix(in srgb,var(--accent) 10%,transparent)]` / `text-[var(--accent)]` / `border-[color-mix(...)]`. | `submit/submit_1280_*.jpg` |
| MR-LP-10 | LANDING S-02 | FIX | `SubmitResource.tsx` auth gate | Icon bubble (`bg-primary/10 rounded-full`) is too large vs. reference's tight crimson glyph. | Drop bubble; keep crimson glyph + tight padding. | `submit/submit_1280_*.jpg` |
| MR-LP-11 | LANDING N-01 | FIX | `NotFound.tsx` AlertCircle | Uses `text-destructive` (orange-tinted red); reference uses crimson. | `text-[var(--accent)]`. | `notfound/notfound_1280_*.jpg` |
| MR-LP-12 | PAGES FX-04 (L-04 NOTE) | FIX | `Login.tsx` local-auth mutation | Wrong-credentials submit is silently rejected — no toast, no inline error. | Add `onError` toast `{variant:"destructive", title:"Login failed"}`. | `evidence/functional/pages/login/L-04-{wrong.png,state.json}` |
| MR-LP-13 | LANDING H-04 | NIT | `Home.tsx` filter bar `Default` Select | Chevron right edge looks heavier than reference. | Strip extra border. | `home_1280_*.jpg` |
| MR-LP-14 | LANDING H-05 | NIT | `Home.tsx` lead text | Lead wraps to 2 lines at 1280 ("…for engineers building the modern video stack"); reference is single line. | Tighten copy or widen container. | `home_1280_*.jpg` |
| MR-LP-15 | LANDING A-05 | NIT | `About.tsx` card spacing | `mb-6` between cards; reference tighter (`mb-4/mb-5`). | One-tier drop. | `about_1280_*.jpg` |
| MR-LP-16 | LANDING L-04 (size) | NIT | `Login.tsx` "Welcome back" h1 | `text-3xl` (~30 px) one step larger than reference (~22–24 px). | Step down one tier. | `login_1280_*.jpg` |
| MR-LP-17 | LANDING S-03 | NIT | `SubmitResource.tsx` "Authentication Required" h1 | `text-2xl` one step too large. | Step down one tier. | `submit_1280_*.jpg` |
| MR-LP-18 | LANDING N-03 | NIT | `NotFound.tsx` CardFooter | `justify-end gap-4`; reference tighter (`gap-2/gap-3`). | Step down `gap`. | `notfound_1280_*.jpg` |
| MR-LP-19 | LANDING N-04 | NIT | `NotFound.tsx` CardTitle | Default `CardTitle` size; reference one step smaller. | Step down one tier. | `notfound_1280_*.jpg` |
| MR-LP-20 | PAGES FP-03 (H-03/H-04 N/A) | NIT (carve-able) | `Home.tsx` AdvancedFilter tag pill | Tag-filter trigger gated on `availableTags.length > 0`; static dataset has no `tags` field → trigger never mounts. Either backfill tags on the static spine **or** hide the empty-state with explicit copy. | Choose: (a) backfill `tags` in seed; or (b) add a "Tags coming soon" muted line + suppress the affordance. | `evidence/functional/pages/home/H-03-open-popover.json` |

Subtotal: 12 FIX + 8 NIT = **20 rows**.

### 3.2 Fix — Category surface (route: `client/src/pages/Category.tsx`)

| ID | Source | Severity | Code area | Description | Proposed fix | Evidence |
|---|---|---|---|---|---|---|
| MR-CT-01 | CATEGORY C-01 | FIX | `Category.tsx` grid card footer (db-resource branch) | `View Details` is a 12 px outline `Badge` sharing a row with subcategory/tag badges; reference shows a prominent crimson text-button CTA in its own row. Non-DB cards have **no** labelled action at all. | Replace badge with `<Button size="sm" className="bg-[var(--accent)]">View Details</Button>` in a dedicated footer row; mirror on non-DB branch. | `screenshots/audit/category/_hover_card_1280.jpg`, `community-events_1280_*.jpg` |
| MR-CT-02 | CATEGORY C-02 | FIX | `Category.tsx` grid card density | Cards ~110–130 px vs. reference ~210–220 px; line-clamp-2 title + short description preview. | Step `CardHeader` padding up one tier (`p-6`), restore breathing room between title and description, anchor CTA to a bottom region. | `community-events_1280_*.jpg` |
| MR-CT-03 | CATEGORY C-03 | FIX | `Category.tsx` page h1 | `text-xl sm:text-2xl md:text-3xl` (~28–30 px @1280); reference ~36–40 px. | Step h1 up one tier at each breakpoint. | `encoding-codecs_1280_*.jpg` |
| MR-CT-04 | CATEGORY C-04 | FIX | `Category.tsx` header row | Count badge inline next to h1 with `justify-between`; reference floats it as a round pill far-right. | Pill shape + `justify-end` placement. | `community-events_1280_*.jpg` |
| MR-CT-05 | CATEGORY C-05 | FIX | `Category.tsx` filter row composition | `[Search][Subcategory Select]` row 1 + `[AdvancedFilter][sort]` row 2; reference floats `Subcategory` top-right of the h1 band and puts `[Filter by Tag][Default sort]` on row 2 left. | Restructure: move `<Select>` to header band; restructure filter row. | `encoding-codecs_1280_*.jpg` |
| MR-CT-06 | CATEGORY C-09 | FIX | `Category.tsx` "Details" badge color path | `border-primary/30 text-primary` (shadcn primary chain) — same drift pattern as MR-LP-09. | Swap to `var(--accent)` chain. | (same screenshots as MR-CT-01) |
| MR-CT-07 | CATEGORY H-01 (hover) | FIX | `Category.tsx` grid card `hover:` | `hover:bg-accent hover:text-accent-foreground` turns entire card crimson on hover; reference uses subtle elevation/border. | Replace with `hover:shadow-md hover:border-[var(--accent)]/30`. | `_hover_card_1280.jpg` |
| MR-CT-08 | CATEGORY V-01 + V-02 + V-03 (list view) | FIX | `Category.tsx` list-view row template | Row uses `bg-card` (reference is transparent), per-row Edit + ExternalLink icons crowd the right edge, no per-row "Details" crimson chip. | Restyle row to transparent surface + collapse right-edge actions + add per-row crimson `Details` chip. | `_viewmode_list_1280.jpg` |
| MR-CT-09 | CATEGORY C-06 | NIT | `Category.tsx` results-count row | Lead + ViewModeToggle on same row `justify-between gap-2`. Reference similar. | None. | (no anchor) |
| MR-CT-10 | CATEGORY C-07 | NIT | `Category.tsx` Back-to-Home ghost button | Renders identically to reference. | None. | (no anchor) |
| MR-CT-11 | CATEGORY C-10 / C-11 | NIT | `Category.tsx` responsive collapse | 400 → 1-col, 768 → 2-col, no overflow; touch targets ≥44 px. | None. | (per-page captures) |
| MR-CT-12 | CATEGORY H-02 (info) | NIT | (info row reaffirming C-01) | Hover capture also proves the only `View Details` is the outline badge. | Resolved by MR-CT-01. | `_hover_card_1280.jpg` |
| MR-CT-13 | CATEGORY compact-view note | NIT | `Category.tsx` compact view | Count badge in CardTitle's top-right can collide with the ExternalLink icon on narrow tiles. | Reserve right-edge slot for icon; pad badge. | `_viewmode_compact_1280.jpg` |

Subtotal: 8 FIX + 5 NIT = **13 rows**.

### 3.3 Fix — Detail surface (`Subcategory.tsx`, `SubSubcategory.tsx`, `ResourceDetail.tsx`)

| ID | Source | Severity | Code area | Description | Proposed fix | Evidence |
|---|---|---|---|---|---|---|
| MR-DT-01 | DETAIL D-02 | FIX | `Subcategory.tsx` + `SubSubcategory.tsx` card density | Cards render ~130–160 px vs. reference ~95–110 px. Same family as MR-CT-02 but less severe (no `View Details` CTA on these templates). | Tighten `CardHeader p-3 sm:p-4 md:p-6` one tier. | `subcategory-ai_1280_*.jpg`, `subsub-hls_1280_*.jpg` |
| MR-DT-02 | DETAIL R-07 (EXTRA) | FIX (decision) | `ResourceDetail.tsx` right column "Related Resources" block | Current ships a 6-item Related Resources Card below Quick Actions; reference doesn't show it for resource 184739. **Audit logs this as EXTRA — needs explicit product decision: keep / restyle / hide.** | Product call. Recommend keep but restyle to match Quick Actions card rhythm. | `resource-184739_1280_*.jpg` |
| MR-DT-03 | DETAIL D-01 | NIT | `Subcategory.tsx` + `SubSubcategory.tsx` h1 | Sizes match reference at 1280; no fix. | None. | (per-page captures) |
| MR-DT-04 | DETAIL D-04 (deslugify casing) | NIT | shared `deslugify` | Title-casing matches reference; no fix. | None. | (per-page captures) |
| MR-DT-05 | DETAIL D-05 | NIT | `Subcategory.tsx` breadcrumb order | Matches reference. | None. | (per-page captures) |
| MR-DT-06 | DETAIL D-06 | NIT | `SubSubcategory.tsx` breadcrumb order | Matches reference. | None. | (per-page captures) |
| MR-DT-07 | DETAIL D-07 | NIT | `SubSubcategory.tsx` no view-mode toggle | Matches reference (only sort dropdown + count lead). | None. | (per-page captures) |

Subtotal: 2 FIX + 5 NIT = **7 rows**. (R-01..R-09 + S-01 are PASS — see §1.1 PASS count.)

### 3.4 Fix — Advanced + Journeys (`Advanced.tsx`, `Journeys.tsx`, `JourneyDetail.tsx`)

| ID | Source | Severity | Code area | Description | Proposed fix | Evidence |
|---|---|---|---|---|---|---|
| MR-AJ-01 | ADV AJ-01 | FIX | `Journeys.tsx:177` + `JourneyDetail.tsx:215` | `journey.icon || "📚"` renders as missing-glyph rectangle (Chromium-in-container has no system color-emoji font). Reference shows colorful stacked-books icon. | Replace emoji fallback with a lucide `<BookOpen />` colored via `var(--accent)` — works regardless of font availability. | `journeys_1280_*.jpg`, `journey-6_1280_*.jpg` |
| MR-AJ-02 | PAGES FP-01 (A-03 + A-04) | FIX | `Advanced.tsx` Radix Tabs | Clicking the `Export` or `AI Recommendations` outer tab leaves `aria-selected=true` stuck on `Explorer`; visible panel keeps showing Explorer surface. Same selector + click works for `Explorer↔Metrics`. **Audit caveat: only reproduced under programmatic click — physical mouse repro not yet attempted.** | First: real-mouse repro in dev tools. If repro confirms, escalate to HIGH and patch the Tabs primitive / lazy-mount path. | `evidence/functional/pages/advanced/A-03-{export.png,state.json}` + `A-04-{ai.png,state.json}` |
| MR-AJ-03 | ADV AJ-02 | NIT | resource-count drift | Reference reads `1953 Resources`; current `1952`. Pure data drift. | None — re-verify after next seed. | `advanced_1280_*.jpg` |
| MR-AJ-04 | ADV AJ-03 | NIT | `Advanced.tsx:111-141` stat-card colors | Crimson/blue/green/purple stat colors intentionally honor reference; logged so future DS sweep does not strip them. | None — add `/* DS-OK: stat semantic colors */` comment. | `advanced_1280_*.jpg` |
| MR-AJ-05 | ADV AJ-04 | NIT | `Advanced.tsx:255-276` bottom CTA card | Matches reference. | None. | `advanced_1280_*.jpg` |
| MR-AJ-06 | ADV AJ-05 | NIT | `Journeys.tsx:112-132` filter row | Matches reference. | None. | `journeys_400_*.jpg` |
| MR-AJ-07 | ADV AJ-06 | NIT | `JourneyDetail.tsx:418-423` empty-state + auth alert | Matches reference (note: only because journey #6 is empty; see Carve-out MR-XO-02). | None — see Carve-out. | `journey-6_1280_*.jpg` |
| MR-AJ-08 | ADV T-02..T-04 | NIT (impl-risk) | `Advanced.tsx` tab activation requires full pointer-event dispatch in headless context | Implementation-risk metadata for #35; not user-visible. | None — already accounted for in functional audit. | (Methodology §) |
| MR-AJ-09 | MOBILE M-07 | NIT | `/advanced` mobile header right-rail | At 390 the header right rail shows palette + login icons cleanly; no overflow. | None — verification only. | `screenshots/audit/mobile/advanced_390_current.jpg` |

Subtotal: 2 FIX + 7 NIT = **9 rows**.

### 3.5 Fix — Sidebar / Header / MainLayout chrome

| ID | Source | Severity | Code area | Description | Proposed fix | Evidence |
|---|---|---|---|---|---|---|
| MR-CH-01 | LANDING H-01 + CATEGORY C-08 + DETAIL D-03 + ADV D-03 + MOBILE M-16 | FIX | `AppSidebar.tsx` `SidebarGroupLabel` | `NAVIGATION` / `CATEGORIES` rendered as crimson uppercase eyebrows (`.eyebrow` token); reference uses plain lowercase muted "Navigation" / "Categories". | Drop `.eyebrow` from `SidebarGroupLabel`; use `font-sans text-xs text-muted-foreground`. | every visual audit's 1280 capture |
| MR-CH-02 | LANDING H-02 + clones | FIX | `AppSidebar.tsx` brand line | Brand renders `Awesome Video` + crimson uppercase `1952 RESOURCES` eyebrow; reference shows `Awesome Video` (white) + lowercase muted `1953 resources` line. | Remove `.eyebrow` from resource-count; render lowercase muted. | every visual audit's 1280 capture |
| MR-CH-03 | DS FIX-4 | FIX | `MainLayout.tsx:31-79` | No element carries `.page` class — atmosphere applied directly to `body` instead. Structural drift from handoff contract. | Wrap `SidebarProvider` children in `<div className="page">…</div>`. | `_planning/AUDIT_DS_STRUCTURAL.md` §FIX #4 |
| MR-CH-04 | PAGES FP-05 (S-04 + SS-03) | FIX | `AppSidebar.tsx` `isActive(path)` | Sidebar correctly expands the rail on subcategory / sub-subcategory routes (3 / 6 collapsibles open), but no `SidebarMenuButton` ever sets `data-active="true"` — active pill never lights up. | Audit `isActive` comparator for trailing-slash / encoded-slug mismatch; ensure leaf row gets `data-active="true"`. | `evidence/functional/pages/subcategory/S-04-rail-state.json` + `subsubcategory/SS-03-rail-state.json` |
| MR-CH-05 | MOBILE M-17 (inherited from CHROME) | FIX | Replit dev-injector `data-replit-metadata` React-key warning | WP-3 mitigated in `AppHeader.tsx` breadcrumb (`Fragment` → `flatMap`) but warning still flashes briefly elsewhere. | Sweep remaining `Fragment` map sites for missing `key`. | `_planning/AUDIT_MOBILE.md` §M-17 |
| MR-CH-06 | MOBILE M-06 | NIT | `AppHeader.tsx` search chip at 390 | At 390 the `/` kbd is hidden (correct, Tailwind `sm:` shows kbd at ≥640). Documented because WP-3 reference was desktop. | None — verification only. | `screenshots/audit/mobile/home_390_current.jpg` |
| MR-CH-07 | CHROME R | NIT (with FC-02 caveat) | `AppHeader.tsx:118` active-accent dot | Reads `activeTheme.preview.accent` (correct field) — dot itself is wired correctly; downstream effect masked by MR-DS-02. | None — will repair once MR-DS-02 lands. | `evidence/functional/chrome/04_search_dialog_open.png` |
| MR-CH-08 | CHROME M-08b + Q + V + Z | NIT (verification) | mobile drawer + skip-link + focus rings | All PASS in #34: drawer opens/closes via ESC + hamburger; skip-link `outline: solid 2px rgb(255,61,82)`; real keyboard Tab traversal paints 2px crimson `box-shadow` ring on every chrome menu-button under `:focus-visible`. | None — verification only. | `evidence/functional/chrome/{13,14,15,18,23,24}_*.png` |
| MR-CH-09 | MOBILE M-03 + M-04 + M-05 | NIT | mobile reference drift | Submit reference shows authed form vs. current's unauth gate; Advanced reference captures Export sub-tab vs. current's default Explorer; Home category count drift 8→9. All expected — not defects. | None — methodology notes. | `_planning/AUDIT_MOBILE.md` §M-03..05 |

Subtotal: 5 FIX + 4 NIT = **9 rows**.

### 3.6 Fix — DS structural compliance (root-cause + token + chart-palette + shortcut)

| ID | Source | Severity | Code area | Description | Proposed fix | Evidence |
|---|---|---|---|---|---|---|
| **MR-DS-01** | LANDING T-01 + T-06 + MOBILE M-02 + CHROME FC-03 | **BLOCK** | `client/src/pages/ThemeSettings.tsx:97-129` | Reads `preset.label` / `preset.dark?.primary` / `preset.light?.primary` etc. on a `ThemePreset` shape that exposes `name` / `cssVars.primary` / `preview.{bg,accent,secondary}`. Result: all 6 color cards render empty `<span>` labels + identical `#000/#444/#888` fallback swatches + `#000` hex caption. Picker is unreadable. | Replace `preset.label` → `preset.name`; replace the `dark?/light?` triplet with `preset.preview.accent` / `.secondary` / `.bg` (or `preset.cssVars.primary` if true OKLCH swatches desired); keep description + check-glyph wiring. | `screenshots/audit/landing/theme_1280_current.jpg`, `evidence/functional/chrome/08_theme_page_initial.png` |
| **MR-DS-02** | LANDING T-01 (compounding) + CHROME FC-02 + CHROME M (partial reload) + MOBILE M-02 | **FIX (HIGH)** | `client/src/components/ui/theme-provider.tsx:129-139` | Accent applier reads `activeTheme?.dark?.primary || activeTheme?.light?.primary` — both `undefined` on `ThemePreset` → `if (primary)` never true → `--accent` / `--accent-2` never updated. Picking any card is a runtime no-op (verified before/after every pick + across reload). | Replace the lookup with `activeTheme?.cssVars?.primary` (or `activeTheme?.preview?.accent` for hex form). Make sure `--accent-2` reads a distinct secondary value, not the same primary. | `evidence/functional/chrome/{10_theme_after_color_cycle.png,11_after_reload.png}` |
| MR-DS-03 | CHROME FC-01 | FIX | `client/src/App.tsx:51-77` + `client/src/components/ui/search-dialog.tsx:60-71` | `/` key listener calls `setSearchOpen(true)` on an orphan `useState` in `App.tsx` that has no consumer. The header chip in `AppHeader.tsx:101-103` advertises the `/` kbd hint, so the discoverability promise is broken. | Delete the dead state + handler from `App.tsx`; add a `key === "/"` branch to the existing `keydown` listener in `SearchDialog`, gated on `!(e.target instanceof HTMLInputElement || HTMLTextAreaElement)`. | `evidence/functional/chrome/06_search_via_slash.png` |
| MR-DS-04 | DS FIX-1 | FIX | `client/src/components/layout/SEOHead.tsx:87` | `<meta name="theme-color" content="#dc2626" />` (Tailwind red-600 — stale). | Replace with `#ff3d52` (literal required — meta can't read CSS vars; matches `DESIGN_SYSTEMS.editorial.vars['--accent']`). | `_planning/AUDIT_DS_STRUCTURAL.md` §FIX #1 |
| MR-DS-05 | DS FIX-2 | FIX | `SEOHead.tsx:88` | `<meta name="msapplication-TileColor" content="#dc2626" />` — same stale crimson. | Replace with `#ff3d52`. | DS §FIX #2 |
| MR-DS-06 | DS FIX-3 | FIX | `client/src/components/ui/micro-interactions.tsx:232,234` | `color: isBookmarked ? "#fbbf24" : "currentColor"` — Tailwind amber-400, not a DS token. | Swap to `var(--accent)` (motion `animate` accepts CSS var strings). | DS §FIX #3 |
| MR-DS-07 | DS FIX-5 | FIX | `client/src/components/admin/LinkHealthDashboard.tsx:345,352,359` | Recharts strokes `#22c55e` / `#ef4444` / `#eab308` (Tailwind green/red/yellow-500) carry status semantics but aren't DS status hexes. | Swap to DS literals: `#34d08c` ok, `#ff5c7a` bad, `#ffb84d` warn. Tag block `/* DS-OK: status semantic */`. | DS §FIX #5 |
| MR-DS-08 | DS FIX-6 | FIX | `LinkHealthDashboard.tsx:366` | `stroke="#f97316"` (Tailwind orange-500) — no DS semantic. | Swap to `#b84dff` (`DESIGN_SYSTEMS.editorial.vars['--accent-2']`). | DS §FIX #6 |
| MR-DS-09 | DS FIX-7 | FIX | `client/src/components/ui/analytics-dashboard.tsx:65-66,360,361,386,535,537,542,544` | Palette array of 10 Tailwind hexes + 8 inline recharts `stroke`/`fill` props. | Extract `client/src/lib/charts/palette.ts` with `CHART_PALETTE = ['#ff3d52','#b84dff','#34d08c','#ffb84d','#5eddf2','#ff5c7a','#9d4edd','#f4f3ee','#34d08c','#b84dff']`; replace all inline literals. | DS §FIX #7 |
| MR-DS-10 | DS FIX-8 | FIX | `client/src/styles/scrolling-fix.css:45` | `border-radius: 3px` on scrollbar-thumb — no DS token maps cleanly. | Introduce `--radius-xs: 3px` in `design-system.css :root`; replace literal with `var(--radius-xs)`. | DS §FIX #8 |
| MR-DS-11 | LANDING T-02 | FIX | `ThemeSettings.tsx` Font picker tile order | Current order: name → sample → description; reference: name → description → sample. | Reorder JSX children. | `theme_1280_*.jpg` |
| MR-DS-12 | LANDING T-06 | FIX | `ThemeSettings.tsx` color cards @ 400 | Same broken state as T-01 at mobile. | Resolved by MR-DS-01. | `theme_400_*.jpg` |
| MR-DS-13 | DS Process P1 | FIX (docs) | `replit.md` "Design-System scope" section | No in-repo record of (a) shadcn primitives replacing raw `.btn/.card/.chip/.input`, (b) body-level atmosphere replacing `.page` (until MR-CH-03 lands), (c) single-personality Editorial-only build. Without this, every future Stage-6 sweep will flag thousands of "stray" buttons as false positives. | Add "Design-System scope" section listing the three intentional divergences + canonical shadcn↔DS class mapping. | DS §Process notes P1 |
| MR-DS-14 | LANDING T-03 | NIT | `ThemeSettings.tsx` font sample sentence | Sample is `"The quick brown fox jumps over the lazy dog"`; reference appends `". 0123456789"` to prove numeric glyph treatment. | Append digits. | `theme_1280_*.jpg` |
| MR-DS-15 | LANDING T-04 | NIT | `ThemeSettings.tsx` page h1 | `text-3xl sm:text-4xl` (~36 px); reference ~24 px. | Step down one tier. | `theme_1280_*.jpg` |
| MR-DS-16 | LANDING T-05 | NIT | `ThemeSettings.tsx` header copy | Reference appends active-preset readout (`"Active: Cyberpunk"`); current omits. | Append computed active preset name. | `theme_1280_*.jpg` |
| MR-DS-17 | DS NIT-1 | NIT | `export-tools.tsx:180-187` HTML export template | Hexes + `border-radius: 3px` inside a standalone HTML export string. DS-OK (no runtime DS). | Add `/* DS-OK: standalone exported HTML, no runtime DS */` comment. | DS §NIT #1 |
| MR-DS-18 | DS NIT-2 | NIT | `shadcn-themes.ts:16,50,84,118,152,186,286,335` + `ThemeSettings.tsx:99-101` fallbacks | Hex literals in alternative-theme registry + fallback colors for theme preview swatches. DS-OK by definition. | Add `/* DS-OK: alternative theme registry */` + `/* DS-OK: preview-only theme picker */` comments. | DS §NIT #2 |
| MR-DS-19 | DS NIT-3 | NIT | `chart.tsx:55` | `#ccc`/`#fff` inside attribute selectors targeting recharts-injected SVG. DS-OK. | Add `/* DS-OK: recharts internal selector matchers */` comment. | DS §NIT #3 |
| MR-DS-20 | DS NIT-4 | NIT | `index.css:25,32,33,38-41,45` | 8 hex literals declared as `--color-*` shadcn↔DS bridge tokens (`#ff5c7a`, `#34d08c`, `#ffb84d` are the DS status colors verbatim; rest are DS-aligned). | Add `/* DS-OK: shadcn↔DS token bridge */` comment above block. | DS §NIT #4 |
| MR-DS-21 | DS NIT-5 | NIT | `theme-provider.tsx:59` | `safeGetItem("theme-custom-hex") || "#3b82f6"` UX default seed for custom-color picker. DS-OK. | Add `/* DS-OK: color-picker default seed */` comment. | DS §NIT #5 |
| MR-DS-22 | DS NIT-6 | NIT | `color-palette-generator.tsx:397,587` | Color-picker defaults `"#3b82f6"` + `"#ffffff"` palette-export fallback. DS-OK. | Add `/* DS-OK: palette-generator defaults */` comments. | DS §NIT #6 |
| MR-DS-23 | MOBILE M-01 | NIT (audit methodology) | n/a | 19 of 22 reference IMGs are out of scope (desktop or admin); only 3 1:1 pairs possible. | None — methodology note. | `_planning/AUDIT_MOBILE.md` §M-01 |
| MR-DS-24 | DS Stage 6 PASS | NIT | DS Stage 6 (component class compliance) | shadcn primitives intentionally replace raw `.btn`/`.card`/`.chip`/`.input` — architectural decision, not per-occurrence violation. | Resolved by MR-DS-13 (docs). | DS §Stage 6 |
| MR-DS-25 | DS Stage 10 PASS | NIT | DS Stage 10 (skin blocks) | 55 `[data-system=...]` selectors (above ≥15 baseline); all 5 system blocks intact as dead-but-cheap code. | None — verification. | DS §Stage 10 |
| MR-DS-26 | MOBILE M-08..M-15 PASSes | NIT (verification) | Mobile chrome PASSes | Sidebar drawer, footer wrap, login form, 404, resource detail, category, journey detail, About all render correctly at 390×844 with WCAG-compliant touch targets and no horizontal overflow. | None — verification only. | `screenshots/audit/mobile/*.jpg` |

Subtotal: 1 BLOCK + 13 FIX + 12 NIT = **26 rows**.

---

## 4. Carve-outs

Findings that are real but explicitly **not** assigned to one of the 6 remediation tasks. Each has a stated rationale.

| ID | Source | Severity | Surface | Description | Why carved out | Re-validation trigger |
|---|---|---|---|---|---|---|
| MR-XO-01 | PAGES FP-02 + JD-02/03/04 | FAIL — MEDIUM | data seed for `journey_steps` table | Published journey #6 (the only one) has 0 steps. JourneyDetail page correctly renders the empty state, but Start button / step cards / resource links can't be tested → JD-02/03/04 BLOCKED. | **Data gap**, not a code defect. Either re-seed journey #6 with real steps or unpublish until content lands. Not in any of the 6 Fix tasks' scope. | After seed lands, re-run JD-02/JD-03/JD-04 in the Re-validation gate. |
| MR-XO-02 | PAGES C-11 | BLOCKED (data) | `Category.tsx:387,397` static-resource `window.open` branch | Branch is unreachable in the current PostgreSQL-backed dataset — every resource carries a numeric DB id (`isDbResource(r)` returns true for all 703). Same `window.open` shape is functionally proven on Subcategory S-02. | **Branch unreachable in current seed.** No code defect; no fix scope. | Re-test if a future seed reintroduces non-DB static resources. |
| MR-XO-03 | PAGES S-03 | PARTIAL (test-design) | Subcategory back-to-category button | Test contaminated by S-02 navigating off-site to GitHub (Galène external link took the daemon off the app). Functionally equivalent back-button pattern is verified on Category C-07 and SubSubcategory SS-02. | **Test-design contamination**, not a UI defect. | Re-validation gate may re-run via direct nav. |
| MR-XO-04 | CHROME FC-04 + MOBILE M (implicit) | FAIL — LOW | Mobile drawer swipe-to-close | Radix `Sheet` has no swipe primitives; synthetic left-swipe TouchEvent leaves dialog open. ESC, hamburger toggle, and Radix overlay tap-scrim all close it correctly. | **Feature not implemented and not advertised** — 3 working dismissal paths already exist. If pursued, requires `vaul` or `framer-motion drag="x"` — out of current scope. | None — deferred to a future sprint. |
| MR-XO-05 | PAGES gap G1 | (unverified) | Footer external `<a>` to `reactjs.org` + `ui.shadcn.com` | Static `<a href target="_blank" rel="noopener noreferrer">` confirmed in source; no click was dispatched. | **Low risk** (static `<a>`); covered by source review. | Re-validation gate (low priority). |
| MR-XO-06 | PAGES gap G2 + R Favorite/Bookmark | (unverified) | Logged-in user avatar dropdown + ResourceDetail authed-only Favorite/Bookmark | Requires authenticated session fixture not present in #34 / partial in #35. | **Auth-fixture scope** — better suited to a dedicated authed-chrome pass. | Add to a follow-up authed-chrome audit if/when scheduled. |
| MR-XO-07 | PAGES gap G6 | (unverified) | Random / custom-hex theme paths in `theme-provider.tsx` | Picker UI doesn't expose them (only the 6 presets), so end users can't reach them today. | **Not exposed in UI.** | When/if UI exposes the affordance. |
| MR-XO-08 | ADV journey-detail unauth rows (JourneyDetail J-2 / J-3 / J-4 equivalents; reference captured unauth) | N/A | JourneyDetail progress / Start CTA / resource lookup | Conditionally rendered for enrolled / authenticated users; reference is unauth → all N/A. | Authenticated rendering domain belongs to MR-XO-01's re-validation. | Re-runs alongside MR-XO-01. |

Total carve-outs: **8**.

---

## 5. Grouped by code area — appendix (every finding bucketed to a remediation task)

For traceability, the same data as §3 but pivoted so a remediation engineer can read off "everything I own" in one place. PASS / verification rows are omitted for brevity; full PASS audit trail is in the source audit files.

### 5.1 Fix — Landing + Theme

Owns: MR-LP-01 .. MR-LP-20 (20 rows: 12 FIX + 8 NIT).
- Files touched: `Home.tsx`, `About.tsx`, `Login.tsx`, `SubmitResource.tsx`, `NotFound.tsx`, plus the shadcn `Button` primary variant config (for the recurring MR-LP-07 glow).
- One choice required: MR-LP-20 (Home tag filter empty-state) — backfill tags vs. hide affordance.

### 5.2 Fix — Category surface

Owns: MR-CT-01 .. MR-CT-13 (13 rows: 8 FIX + 5 NIT).
- File: `Category.tsx` template only (one fix repairs all 9 category routes).
- The dominant cluster is C-01/C-02/C-03/C-04/C-05/C-09 (grid CTA, density, h1 size, badge placement, filter row, primary-chain drift) — addressing these covers 1280 / 768 / 400 in one pass.
- View-mode list-row restyle (MR-CT-08) and hover-state restyle (MR-CT-07) are independent edits in the same file.

### 5.3 Fix — Detail surface

Owns: MR-DT-01 .. MR-DT-07 (7 rows: 2 FIX + 5 NIT).
- Files: `Subcategory.tsx`, `SubSubcategory.tsx` (density only); `ResourceDetail.tsx` Related-Resources block needs a product call (MR-DT-02).
- This is the cleanest surface — most rows are verification.

### 5.4 Fix — Advanced + Journeys

Owns: MR-AJ-01 .. MR-AJ-09 (9 rows: 2 FIX + 7 NIT).
- MR-AJ-01 (journey icon glyph) is a one-line lucide swap.
- MR-AJ-02 (Export + AI tabs dead under programmatic `.click()`) needs real-mouse repro **before** code fix — audit explicitly flags this; do not bulk-patch the Radix Tabs primitive without confirming the failure mode.

### 5.5 Fix — Sidebar / Header / MainLayout chrome

Owns: MR-CH-01 .. MR-CH-09 (9 rows: 5 FIX + 4 NIT).
- MR-CH-01 + MR-CH-02 are the single most impactful changes in the entire remediation set — they appear in every visual audit's 1280 capture and flipping them fixes Home/About/Login/Submit/Theme/404/Category/Detail/Advanced/Journeys/Mobile chrome at once.
- MR-CH-03 restores the `.page` structural contract.
- MR-CH-04 fixes the `data-active` rail-pill that never lights up — known live regression discovered in PAGES #35 gap-fill.
- MR-CH-05 sweeps remaining React-key warnings.

### 5.6 Fix — DS structural compliance

Owns: MR-DS-01 .. MR-DS-26 (26 rows: 1 BLOCK + 13 FIX + 12 NIT).
- **Start here.** MR-DS-01 (ThemeSettings field shape) + MR-DS-02 (theme-provider field shape) are 2 small block edits in 2 files. Together they resolve the single BLOCK and unlock visual re-validation of every other theme-dependent capture.
- MR-DS-03 (orphan `/` shortcut) is 2 small edits in 2 files (`App.tsx` delete + `search-dialog.tsx` add).
- MR-DS-04..MR-DS-10 are pure literal swaps + 1 token addition (`--radius-xs`) + 1 file extraction (`charts/palette.ts`).
- MR-DS-13 is a `replit.md` docs section.
- NITs MR-DS-17..MR-DS-22 are `/* DS-OK */` comments to suppress future false positives in the Stage-5 hardcoded-value sweep.

### 5.7 Carve-outs

Owns: MR-XO-01 .. MR-XO-08 (8 rows). Not in any of the 6 Fix tasks. See §4 for rationale and re-validation triggers.

---

## 6. No-silent-drop accounting

Per the task spec, every input-audit finding must surface here. Reconciliation:

| Source audit | Native findings | Master rows produced | Notes |
|---|---:|---:|---|
| AUDIT_DS_STRUCTURAL | 8 FIX + 6 NIT + 1 process note + 4 PASS (Stages 1–3, 7–10) | 13 FIX + 8 NIT (MR-DS-04..10, 13–22, 24–25) + 1 process note (MR-DS-13) | All FIX/NIT carried; PASS Stages counted in §1.1 PASS bucket. |
| AUDIT_LANDING | 1 CRITICAL + 6 HIGH + 10 MEDIUM + 16 LOW (T/H/A/L/S/N IDs) | 1 BLOCK (MR-DS-01) + 11 FIX (MR-LP-01..11) + 11 NIT (MR-LP-13..19 + MR-DS-11–12, 14–16) | T-01 / T-06 fold into MR-DS-01; T-02..05 routed to DS task; L-02 / S-04 / N-02 collapse to MR-LP-07; H-01 / H-02 routed to Chrome (MR-CH-01/02); H-06, A-06, L-05, S-05, N-05 are "no issue" rows — counted in PASS bucket. |
| AUDIT_CATEGORY | 11 template C-* + H-01/H-02 hover + B-01/B-02 + V-01/V-02/V-03 + compact-note | 8 FIX + 5 NIT (MR-CT-01..13) | C-08 collapses into MR-CH-01; B-01/B-02 are PASS (counted in §1.1). |
| AUDIT_DETAIL | D-01..D-07 + R-01..R-09 + S-01 + R-07 EXTRA | 2 FIX + 5 NIT (MR-DT-01..07) | D-03 collapses into MR-CH-01; R-01..R-09 + S-01 are PASS. |
| AUDIT_ADVANCED_JOURNEYS | AJ-01 HIGH + AJ-02..06 NOTE + T-01..T-04 PASS + D-03 inherited | 2 FIX + 7 NIT (MR-AJ-01..09) | D-03 → MR-CH-01; T-01..T-04 PASS counted in §1.1. |
| AUDIT_MOBILE | 1 HIGH + 2 LOW + 5 NOTE + 8 PASS + 2 INHERITED | 0 new FIX + 6 NIT (MR-DS-23, MR-CH-06, MR-CH-09, MR-AJ-09, MR-DS-26) | M-02 folds into MR-DS-01 + MR-DS-02; M-16 → MR-CH-01/02; M-17 → MR-CH-05; PASSes counted. |
| AUDIT_FUNCTIONAL_CHROME | FC-01 HIGH + FC-02 HIGH + FC-03 MEDIUM + FC-04 LOW + 22 PASS | 1 FIX (MR-DS-03 for FC-01) + folds for FC-02/03 + 1 Carve-out (MR-XO-04 for FC-04) + verification NITs (MR-CH-07, MR-CH-08) | FC-02 → MR-DS-02; FC-03 → MR-DS-01; PASSes A/B/C/D/E/G/H/I/K/N/O/P/Q/R/S/T/U/V/W/Y/Z counted. |
| AUDIT_FUNCTIONAL_PAGES | FP-01..FP-05 + 54 PASS + 3 FAIL + 4 BLOCKED + 2 N/A + 1 PARTIAL | 2 FIX (MR-AJ-02 for FP-01; MR-CH-04 for FP-05) + 2 owner rows (MR-LP-12 for FX-04; MR-LP-20 for FP-03) + 4 Carve-outs (MR-XO-01 for FP-02 + JD-02/03/04; MR-XO-02 for C-11; MR-XO-03 for S-03; MR-XO-05–08 for gaps) | 54 PASSes counted in §1.1. |

Every input row is accounted for — either as a master row, a fold into another master row (with the cross-reference noted in column "Source"), a PASS in the §1.1 count, or a carve-out in §4. **No finding silently dropped.**

---

## 7. Recommended remediation order

Not authoritative — the planner owns task scheduling — but for reference:

1. **MR-DS-01 + MR-DS-02** (theme picker root cause). Unblocks visual re-validation of every theme-dependent capture across all subsequent fixes. Smallest edit with the highest downstream leverage.
2. **MR-CH-01 + MR-CH-02 + MR-CH-03** (sidebar eyebrows + brand + `.page` wrapper). Single largest visual delta across the entire audit set — flips every page closer to reference at once.
3. **MR-DS-03** (orphan `/` shortcut). Tiny edit, restores advertised affordance.
4. **MR-DS-04..MR-DS-10** (DS literal swaps + chart palette + `--radius-xs`). Token-level cleanup; unblocks Stage-5 re-sweep.
5. **MR-LP-01..MR-LP-20** (Landing + Theme polish). Per-page; can parallelize since each file is independent.
6. **MR-CT-01..MR-CT-08** + **MR-DT-01..MR-DT-02** + **MR-AJ-01** (Category density+CTA + Detail density + Journey icon). Visual polish; high user-visible value.
7. **MR-AJ-02** (Advanced tabs FP-01). Investigate-first; real-mouse repro before patching Radix Tabs.
8. **MR-CH-04 + MR-CH-05** (sidebar active-pill + remaining React-key warnings). Smaller polish.
9. **MR-LP-12** (Login silent rejection toast). Low UX risk; one-line `onError`.
10. **MR-DS-11..MR-DS-22** (font picker polish + DS-OK comments + replit.md docs). Cleanup.
11. **Re-run all PASS rows** in the Re-validation gate after each batch lands; flip MR-DS-01, MR-DS-02, MR-DS-03, FP-05, MR-CH-04, and all visual chrome rows to PASS before the next merge.

Carve-outs (§4) are not in scope for any of the 6 Fix tasks.

---

*Read-only. Audit consolidation complete. No code changes made. Next: planner advances one or more of the 6 already-queued Fix tasks; this report is the single source of truth for what each task owns.*
