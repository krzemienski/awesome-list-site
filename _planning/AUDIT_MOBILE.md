# Mobile Parity Audit — Editorial + Crimson

**Task:** #33 — Visual-diff audit of the running app at iPhone form-factor (390×844) versus the mobile screenshots dropped at `awesome-list-site-ds/uploads/IMG_3167..3209.jpeg`.

**Status:** AUDIT ONLY. No code changes. Findings are recorded here and rolled forward into the existing follow-up Fix tasks (see Section 7).

**Date:** May 19, 2026

---

## 1. TL;DR

1. **Task premise is wrong.** Task #33 assumed all 22 `IMG_*.jpeg` files were iPhone-portrait captures, one per public route. They are not. Only **6 of 22** are mobile-form-factor (the JPEG raster width is 880 px = ~2× iPhone CSS). **16 of 22** are desktop captures (raster width 1912 px = ~2× a 956-px desktop window) of the Admin Dashboard. Of the 6 mobile ones, **3 are Admin** (out of scope per the public-site INDEX), leaving only **3 mobile captures of public routes**: Home, Advanced/Export tab, and Submit Resource.
2. **One real headline bug found, in two places.** Both `client/src/pages/ThemeSettings.tsx` and the accent applier in `client/src/components/ui/theme-provider.tsx` read `preset.label`, `preset.dark?.primary`, `preset.light?.primary` from each `ThemePreset`, but the data model in `client/src/lib/shadcn-themes.ts` exposes those fields as `name`, `cssVars.primary`, etc. Result at every viewport: **all 6 color-theme cards show no name and 3 identical black/grey swatches with `#000` hex** — the picker is visually unusable — AND the accent applier never matches, so picking a card has *no visible effect* on `--accent`/`--accent-2`. Severity **HIGH**.
3. **Public-route mobile chrome is otherwise clean.** Home, About, Resource Detail, Category, Sub-Subcategory, Journeys, Journey Detail, Login, Submit (auth-gate), Advanced, 404 all render correctly at 390×844: surfaces stack, primary CTAs are full-width and touch-friendly, the search trigger collapses to a chip, the sidebar collapses to a hamburger trigger, footer is single-line. No horizontal overflow anywhere.
4. **Inherited chrome findings** from prior audits (D-03 sidebar eyebrows / D-08 dev banner / Replit dev injector warning) still hold on mobile and are already queued under "Fix-chrome".
5. **No regressions** vs landing / category / detail / advanced+journeys audits at the new 390 width.

---

## 2. Reference-set reality check (Methodology)

`awesome-list-site-ds/uploads/INDEX.md` documents only the **21 numbered PNGs** (`01..21.png`, plus `Image.png`). The `IMG_3167..3209.jpeg` set is not in the index, and `REFERENCE_MAP.md`'s "mobile" row notes that the IMGs are unlabeled. I read every IMG to classify it; the result:

| IMG | Width-class | Area | Notes |
|---|---|---|---|
| 3167 | desktop ~953 | Admin / Approvals tab | full table, header chrome |
| 3169 | **mobile ~354** | Admin / Approvals | tabbed pills, header chip |
| 3171 | **mobile ~354** | Admin / Enrichment | Job Control + Active Job Monitor |
| 3173 | desktop | Admin / Researcher | – |
| 3175 | desktop | Admin / Export | – |
| 3177 | desktop | Admin / Database | – |
| 3179 | desktop | Admin / Resources | – |
| 3181 | desktop | Admin / Resources + Edit modal | – |
| 3183 | desktop | Admin / Categories | – |
| 3185 | desktop | Admin / Categories + Edit modal | – |
| 3187 | desktop | Admin / Subcategories | – |
| 3189 | desktop | Admin / Subcategories + Create modal | – |
| 3191 | desktop | Admin / Categories + Create modal | – |
| 3193 | desktop | Admin / Users | – |
| 3195 | desktop | Admin / GitHub | – |
| 3197 | desktop | Admin / Link Health | – |
| 3199 | desktop 1912 | Admin / Audit Log | initially mis-classified as mobile in v1 of this doc; raster width confirms desktop. |
| 3201 | desktop | Admin / Researcher + Research-Job modal | – |
| 3203 | **mobile ~354** | Admin / Enrichment (dup of 3171, slight variant) | – |
| 3205 | **mobile ~354** | **Public** /advanced — Export tab active | only public-route IMG with sub-state |
| 3207 | **mobile ~354** | **Public** /submit — authed form | – |
| 3209 | **mobile ~354** | **Public** / (Home) — long-scroll w/ AI Recs | – |

Raster widths verified with `file(1)` on the JPEGs: the 6 mobile captures are 880 px wide (×2 DPR → ~440 CSS px frame, taken at iPhone Display-Zoom width ~390–414 plus chrome); the desktop captures (incl. 3199) are 1912 px wide (×2 DPR → ~956 CSS px). The "mobile ~354" estimate elsewhere in this doc refers to the *body content* width inside that frame after the iPhone safe-area and gutters.

**Conclusion.** The IMG set is not a per-route iPhone parity reference. It is mostly desktop admin screenshots with a handful of real mobile captures, the majority of which depict authenticated admin UI that the public-site audit scope explicitly excludes. The audit therefore proceeds in two passes:

* **Pass A — 1:1 pairs.** Compare the 3 public-route mobile IMGs (Home, Advanced/Export, Submit) against the running app at 390×844.
* **Pass B — Mobile-form-factor sweep.** Independently audit the 11 other in-scope public routes at 390×844 for mobile-specific concerns (touch-target ≥44 px, drawer behavior, horizontal overflow, header chip behavior, font-scale, footer wrap) using the desktop reference (PNGs 01–21) as a structural baseline. Same caveat as Appendix B in `AUDIT_ADVANCED_JOURNEYS.md`.

Captures, both passes, written to `screenshots/audit/mobile/<page>_390_{current,reference}.jpg`. Where no mobile reference exists, only the `_current.jpg` is stored.

Viewport: 390×844 (iPhone 14 logical). Theme: cyberpunk (default). Anonymous user.

Severity scale: **CRITICAL / HIGH / MEDIUM / LOW / NOTE / PASS** per `.agents/skills/visual-inspection/SKILL.md`.

---

## 2a. Net rollup

| Bucket | Count | IDs |
|---|---|---|
| CRITICAL | 0 | – |
| HIGH | 1 | M-02 |
| MEDIUM | 0 | – |
| LOW | 2 | M-05, M-06 |
| NOTE | 5 | M-01, M-03, M-04, M-07, plus methodology Section 2 |
| PASS | 8 | M-08, M-08b, M-09, M-10, M-11, M-12, M-13, M-14, M-15 |
| INHERITED | 2 | M-16, M-17 |

Net: **1 HIGH owned by Fix-DS task**, no new code-change tasks proposed by this audit.

## 3. Findings table

| ID  | Severity | Area              | Route               | Summary |
|-----|----------|-------------------|---------------------|---------|
| M-01 | NOTE    | Audit methodology | n/a                 | 19/22 reference IMGs are out of scope (desktop or admin). Only 3 1:1 pairs possible. |
| M-02 | HIGH    | Theme Settings + accent applier | /settings/theme + global | All 6 color-theme cards render no name and identical `#000` swatches because `ThemeSettings.tsx` reads `preset.label` / `preset.dark.primary` from a model that exposes `name` / `cssVars.primary`. The same `activeTheme?.dark?.primary` mismatch in `theme-provider.tsx` line 134 means picking a card never updates `--accent` / `--accent-2` either — the click is a no-op everywhere, not just visually broken inside the picker. |
| M-03 | NOTE    | Submit Resource   | /submit             | Reference shows authed form (Title / URL / Description / Category / Tags / Submit + Submission Guidelines). Current shows the anonymous Auth-Required gate. **Not a defect** — same gate copy/CTA renders correctly. |
| M-04 | NOTE    | Advanced          | /advanced           | Reference captures the **Export** sub-tab active; current default-state lands on **Explorer**. Both tabs render Editorial Card surfaces and the crimson primary CTA correctly. Expected behavior, not a defect. |
| M-05 | LOW     | Home              | /                   | Reference shows 8 categories / 1713 resources (authed snapshot); current shows 9 / 1712. Data drift only — card grid, eyebrow, count badges, descriptions all match the Editorial spec from WP-4. |
| M-06 | LOW     | Header chip       | all                 | At 390×844 the header search chip collapses to icon+placeholder only and the `kbd` "/" is hidden (correct, Tailwind `sm:` shows kbd at ≥640). Worth documenting because the WP-3 reference was captured at desktop and showed the kbd. |
| M-07 | NOTE    | Header right rail | all                 | At 390 the header right rail shows: Theme palette icon (with crimson notification dot), Login icon. On Home the sidebar trigger is the leftmost icon. No overflow; spacing OK. |
| M-08 | PASS    | Sidebar drawer    | all                 | Sidebar collapses off-canvas at 390. Hamburger `SidebarTrigger` is reachable in header. Trigger button hit-area ≥44×44 verified. |
| M-08b | PASS  | Sidebar drawer-open | all (evidence: home_390_drawer_open.jpg) | Drawer opens off-canvas, takes ~85% viewport width, shows brand line "Awesome Video / 1952 RESOURCES" in crimson eyebrow + the 5 NAVIGATION items (Home / Submit Resource / Learning Journeys / Advanced / Theme) + 9 CATEGORIES with count pills + About at the bottom. Content underneath is dimmed but visible. Backdrop tap or trigger re-click closes. No row overflow at 390. |
| M-09 | PASS    | Footer            | all                 | "Built with React and shadcn/ui · About" wraps gracefully to two lines on the very narrow routes (Login, Submit-gate, 404) — readable and tap-target on "About" link ≥44 px. |
| M-10 | PASS    | Login             | /login              | WP-4 plain-bold-Inter "Welcome back" centered, email/password inputs stacked, full-width Sign In CTA, OR-CONTINUE-WITH separator with eyebrow letterspacing, Google + GitHub side-by-side at 50/50, default admin info line + crimson "Change password after first login" warning. Matches the Editorial spec. |
| M-11 | PASS    | 404 / NotFound    | /this-does-not-exist| Card centered, "Page Not Found" h1, paragraph, two CTAs (Browse Categories + Go Home) side-by-side, primary CTA last per platform-side convention. No overflow. |
| M-12 | PASS    | Resource Detail   | /resource/184739    | Hero title + crimson Visit CTA wraps cleanly. Description / URL / Tags / Quick Actions / Related Resources cards each take full width. Open Resource primary CTA is full-width; Share is full-width below. Related Resources items use crimson numbered eyebrows + truncated descriptions. |
| M-13 | PASS    | Category page     | /category/encoding-codecs | Header + filter chips stack; resource list collapses to single column; long page (>10k px) scrolls without horizontal overflow. |
| M-14 | PASS    | Journey Detail    | /journey/6          | Eyebrow + step cards stack vertically; CTAs full-width; no overflow. |
| M-15 | PASS    | About             | /about              | WP-4 plain-bold "About" h1 + crimson Sparkles icon; 5 section cards stack with plain bold titles (Fraunces removed per the WP-4 reset). |
| M-16 | INHERITED | Sidebar chrome  | all                 | Crimson eyebrow NAVIGATION / CATEGORIES labels and the brand line are correct in the open sidebar; this matches the post-WP-4 spec. No change required vs prior chrome audit. |
| M-17 | INHERITED | Dev-injector warning | all          | The Replit dev-toolbar `data-replit-metadata` warning still flashes briefly. Already mitigated in `AppHeader.tsx` breadcrumb (WP-3) but not elsewhere — owned by the existing Fix-chrome task. |

---

## 4. Per-route detail

### 4.1 Home — `/` (pair: `home_390_reference.jpg` = IMG_3209, `home_390_current.jpg`)

* **Reference (IMG_3209, authed):** Page heading "Awesome Video Resources", subhead "Explore 8 categories with 1713 curated resources for engineers building the modern video stack." Filter chip + Default sort. Eight category rows rendered as cards with crimson eyebrow numbers (`## 01 / ## 02 …`), category icon, count pill, title, 1-line description. Below the grid: **AI-Powered Recommendations** section + a long anonymous-state CTA card + a logged-in "Configure Your Preferences" form with skill-level, preferred categories, learning goals, preferred resource types and a "Generate AI Recommendations" pink CTA, followed by a "Ready to Get Started" footer card.
* **Current:** Same heading + subhead (count drift 9/1712). Card grid renders exactly per WP-4 changelog: 3-column on desktop, 1-column at 390. Cards have the icon + count badge + plain bold title + 1-line description preview. Empty-state card with "Clear filters" CTA when filtered list is empty (verified via filter chip). Below the grid: "AI-Powered Recommendations" heading + a single **Login to See Personalized Recommendations** card (anonymous-state CTA with a "Login to Get Started" pink button).
* **Verdict:** **PASS** with a NOTE — the reference is an authed snapshot, so the form vs login-gate divergence is expected. Anon CTA copy + crimson primary CTA + Editorial card surface all match the spec.

### 4.2 Advanced — `/advanced` (pair: `advanced-export_390_reference.jpg` = IMG_3205, `advanced_390_current.jpg`)

* **Reference (IMG_3205):** Lands on **Export** sub-tab. Multi-Format Export System card with 6 format tiles (Markdown / JSON / CSV / PDF / HTML / YAML), each in a square card with format icon + tagline. Below: Export Tools form (Format dropdown, content option checkboxes, Category Filter chips with Select All / Clear All, an Export Summary tile, a giant crimson `Export 1953 Resources` button), and a final "Explore More Features" footer card.
* **Current:** Lands on **Explorer** sub-tab (the route default). Same Editorial chrome: Category Explorer header, "Show all" toggle, search input, breakdown cards, etc. Both tabs use the same Card surface treatment, the same crimson primary CTA color, and stack cleanly at 390.
* **Verdict:** **PASS**. Tab-state divergence is task-spec drift, not a defect.

### 4.3 Submit Resource — `/submit` (pair: `submit-resource_390_reference.jpg` = IMG_3207, `submit_390_current.jpg`)

* **Reference (IMG_3207):** Authenticated user — full form: Title (placeholder "e.g. FFmpeg – Video encoding tool"), URL, Description, Category select, Tags, Submit Resource (pink) + Cancel (black) buttons side-by-side, plus a Submission Guidelines info card below with 5 crimson bullet points.
* **Current:** Anonymous user — Auth-Required card: crimson login icon in a circular crimson chip, "Authentication Required" h2, copy "You need to be logged in to submit resources. Please login to continue.", `Login with Replit` primary CTA, `Back to Home` secondary CTA.
* **Verdict:** **PASS** (functional). The form itself is not reachable in this audit because the page is auth-gated. Auth-gate card matches Editorial spec — no design defect to log.

### 4.4 Theme Settings — `/settings/theme` (no mobile reference)

* **Current:** "Theme Settings" h1 + Palette icon. **Font** picker — 6 cards (Inter / DM Sans / Source Sans 3 / IBM Plex Sans / JetBrains Mono / System Default), each with bold label, sample sentence in the actual font, description line, single-column at 390. **Color Theme** picker — 6 cards in a single column, **all six rendering empty top-left labels and identical black/dark-grey swatches with `#000` underneath.**
* **Root cause** (`client/src/pages/ThemeSettings.tsx:97-129`):

  ```ts
  const colorPresets = presets.filter((p) =>
    ["cyberpunk", "limes", "black-pink", "flat-pink", "purples", "flat-purples"].includes(p.value)
  );
  // …
  const primary   = preset.dark?.primary   || preset.light?.primary   || "#000";
  const secondary = preset.dark?.secondary || preset.light?.secondary || "#444";
  const accent    = preset.dark?.accent    || preset.light?.accent    || "#888";
  // …
  <span className="font-semibold text-sm">{preset.label}</span>
  ```

  But `ThemePreset` in `client/src/lib/shadcn-themes.ts` declares:

  ```ts
  export interface ThemePreset {
    name: string;
    value: string;
    description: string;
    preview: { bg, sidebar, accent, text, secondary };
    cssVars: Record<string, string>;
  }
  ```

  i.e. `name` (not `label`), `cssVars.primary` (not `dark.primary`), `preview.bg / preview.accent / preview.secondary` for swatch use. Every read into `preset.label`, `preset.dark`, `preset.light` is `undefined`, so all 6 cards render `<span>{undefined}</span>` (empty) and all 3 swatch flex children fall back to the placeholder `#000 / #444 / #888`. The hex `<code>` block also prints `#000` for all 6.
* **Compounding bug in `theme-provider.tsx` (lines 129-139):**

  ```ts
  const primary = activeTheme?.dark?.primary || activeTheme?.light?.primary;
  if (primary) {
    root.style.setProperty('--accent', primary);
    root.style.setProperty('--accent-2', primary);
  }
  ```

  Same field-shape mismatch — `activeTheme.dark` / `.light` are undefined on every `ThemePreset`, so the `if (primary)` branch is never entered and `--accent` / `--accent-2` are never updated from the DS default. **Net effect: picking any theme card has zero visible effect anywhere in the app.** The earlier draft of this doc claimed "the accent applies globally" — that claim was wrong and is retracted.
* **Effect:** Color-theme picker is unusable at every viewport — the user cannot tell which card is which, *and* the click does not propagate to live tokens. Functional UI fully broken at every breakpoint.
* **Severity:** **HIGH** (M-02). Two-site fix required.
* **Suggested fix (for Fix-DS task, not this audit):**
  * In `ThemeSettings.tsx` color-preset block: `preset.label` → `preset.name`; replace the `preset.dark?.primary || preset.light?.primary || "#000"` triplet with `preset.preview.accent`, `preset.preview.secondary`, `preset.preview.bg` (or read `preset.cssVars.primary` if true OKLCH swatches are wanted).
  * In `theme-provider.tsx` accent effect: replace the `activeTheme?.dark?.primary || activeTheme?.light?.primary` lookup with `activeTheme?.cssVars?.primary` (or `activeTheme?.preview?.accent` for hex form).
  * The Font picker block is correct (uses `font.label` which matches `FONT_OPTIONS` shape) and needs no change.

### 4.5 All other public routes

Captured at 390×844 and inspected; no defects beyond those already enumerated in M-08..M-15. Captures:

* `about_390_current.jpg`
* `category-encoding-codecs_390_current.jpg`
* `sub-subcategory-hls_390_current.jpg`
* `resource-184739_390_current.jpg`
* `journeys_390_current.jpg`
* `journey-6_390_current.jpg`
* `login_390_current.jpg`
* `not-found_390_current.jpg`

---

## 5. Touch-target sample

Spot-checked at 390×844:

| Element | Page | Hit area | Verdict |
|---|---|---|---|
| Header `SidebarTrigger` (hamburger) | all | 44×44 | PASS |
| Header search chip | all | full-width × 36 | PASS (chip itself; opens a Cmd-K modal with its own ≥44 targets) |
| Header palette icon | all | 36×36 | LOW — under 44 but matches shadcn icon-button default; consistent with Editorial reference |
| Header login icon | all | 36×36 | LOW — same as above |
| Card row (category list) | / | full-width × ≥80 | PASS |
| "Visit" CTA | /resource/* | full-width × 40 | PASS |
| "Open Resource" CTA | /resource/* | full-width × 48 | PASS |
| Font-picker card | /settings/theme | full-width × ~100 | PASS |
| Theme-picker card | /settings/theme | full-width × ~100 | PASS (but unreadable per M-02) |
| Login button | /login | full-width × 44 | PASS |
| Google / GitHub social buttons | /login | 50% × 44 | PASS |
| Browse Categories / Go Home (404) | /not-found | ~150 × 44 each | PASS |

The two "LOW" header icon-buttons are consistent with prior audits and not a regression — flagged here for completeness only.

---

## 6. Horizontal overflow / page-height sanity

Verified by full-page screenshots at 390×844. No horizontal scroll on any route. Long pages confirmed:

* `/category/encoding-codecs` — ≈10 700 px tall, single column.
* `/sub-subcategory/hls` — ≈9 300 px tall, single column.
* `/resource/184739` — ≈2 100 px, hero + cards stacked.
* `/` — ≈1 950 px, header + intro + 9-card grid + AI-Recs CTA + footer.
* `/advanced` — ≈3 400 px, tab strip + Explorer tab content + footer card.
* `/settings/theme` — ≈2 050 px, header + 6 font cards + 6 theme cards + footer note.

---

## 7. Follow-up routing

All findings in this audit are absorbed by **existing queued Fix tasks** — no new task is proposed:

| Finding(s) | Owner task (already queued) |
|---|---|
| M-02 (Theme Settings color picker broken) | Fix-DS (Design System) task. |
| M-16 (inherited sidebar chrome PASS) | No action — already correct post-WP-4. |
| M-17 (Replit dev-injector warning elsewhere) | Fix-chrome task. |
| M-01 / M-03 / M-04 / M-05 / M-06 / M-07 (NOTE/LOW) | Filed for visibility; no code change required. |
| All PASS rows | Roll into Consolidate-audits → master report. |

The Re-validation gate after Fix-DS lands should re-screenshot `/settings/theme` at 390 and 1440 and verify the 6 color cards render labels + per-preset swatches.

---

## 8. Appendix A — captured artifacts

`screenshots/audit/mobile/`:

* Mobile references (copied from `awesome-list-site-ds/uploads/`):
  * `admin-approvals_390_reference.jpg` (IMG_3169) — *out of scope, kept for completeness*
  * `admin-enrichment_390_reference.jpg` (IMG_3171) — *out of scope*
  * `admin-enrichment-alt_390_reference.jpg` (IMG_3203) — *out of scope*
  * `admin-audit_390_reference.jpg` (IMG_3199) — *out of scope*
  * `advanced-export_390_reference.jpg` (IMG_3205)
  * `submit-resource_390_reference.jpg` (IMG_3207)
  * `home-longscroll_390_reference.jpg` (IMG_3209)
* Current captures at 390×844:
  * `home_390_current.jpg`
  * `about_390_current.jpg`
  * `advanced_390_current.jpg`
  * `journeys_390_current.jpg`
  * `journey-6_390_current.jpg`
  * `login_390_current.jpg`
  * `submit_390_current.jpg` (auth gate)
  * `theme_390_current.jpg`
  * `theme_390_colorgrid_viewport.jpg` (focused viewport for M-02 evidence)
  * `home_390_drawer_open.jpg` (mobile sidebar drawer-open evidence for M-08b)
  * `category-encoding-codecs_390_current.jpg`
  * `sub-subcategory-hls_390_current.jpg`
  * `resource-184739_390_current.jpg`
  * `not-found_390_current.jpg`

## 9. Appendix B — IMG ↔ public-route reference-reuse caveat

Same caveat as the previous two audits: the only iPhone-portrait references that map to public routes are IMG_3205 (Advanced/Export tab), IMG_3207 (Submit, authed), and IMG_3209 (Home long-scroll, authed). For the remaining 8 public routes audited here, the **desktop** references in `awesome-list-site-ds/uploads/01..21.png` were used as the structural baseline, the same way prior audits did at 400 px. The Editorial design system tokens (typography ramp, surface ladder, spacing, radii, crimson primary) are viewport-independent, so this reuse is valid for verifying the Editorial spec; it does *not* substitute for a future per-route mobile reference set, which should be requested from the Claude Design handoff if one becomes available.
