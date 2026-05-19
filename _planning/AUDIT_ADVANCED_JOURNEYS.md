# AUDIT_ADVANCED_JOURNEYS — Visual diff for advanced + journeys surface

> Task #32 deliverable. Audit only — no fixes. Pairs the running app's
> three "discovery & guided learning" routes against the Editorial +
> Crimson handoff references at three breakpoints (400 / 768 / 1280),
> plus four Advanced-tab active-state captures @ 1280 to prove all tab
> views render.
> Rubric: `.agents/skills/visual-inspection/SKILL.md` (layout · type ·
> contrast · touch targets · dark-mode · overflow · spacing · a11y).
> Format precedent: `_planning/AUDIT_LANDING.md`,
> `_planning/AUDIT_CATEGORY.md`, `_planning/AUDIT_DETAIL.md`.

## Reference & methodology

- **Routes** (per `_planning/REFERENCE_MAP.md` rows 03–05):
  - `advanced` → `/advanced` → `03_advanced.png` (`Advanced.tsx`).
  - `journeys` → `/journeys` → `04_learning_journeys.png` (`Journeys.tsx`).
  - `journey-6` → `/journey/6` → `05_journey_detail.png` (`JourneyDetail.tsx`,
    "Video Streaming Fundamentals", beginner, 0 steps — same journey as
    in the reference render).
- **Current screenshots** captured by `agent-browser` (sessions
  `audit32`, `audit32d`, `audit32e`) against the live dev server at
  `http://localhost:5000`. Per breakpoint: `set viewport <w> 900` →
  `open` → `wait 2000-3000ms` → `screenshot --full`. All three routes
  return HTTP 200.
- **Advanced tab activation**: Radix tabs do not honour a bare
  `Element.click()` in the headless context — `data-state` stayed
  `inactive` after `b.click()`. Activated by dispatching the full
  pointer sequence (`pointerdown` → `mousedown` → `pointerup` →
  `mouseup` → `click`) on the tab trigger via `eval`. Each tab's
  `data-state="active"` was re-verified after the 1500 ms settle wait
  before screenshotting. Methodology logged here so the downstream
  "Functional validation — page interactions" task can reuse it for any
  Radix `Tabs`-based interaction. **Out of scope for this audit**:
  testing keyboard arrow navigation across tabs (covered by Task #35).
- **Reference screenshots** = the authoritative 1920×1080 desktop PNGs
  from `awesome-list-site-ds/uploads/`, reused byte-identical at 400 /
  768 / 1280 per the same caveat documented in prior audits' Appendix B.
- Severity: **CRITICAL / HIGH / MEDIUM / LOW** as in prior audits.
- Verdict per pair: **PASS / FIX / FAIL**.

All paths are relative to the repo root.

---

## TL;DR

| Route (key)       | 400  | 768  | 1280 | Worst severity                                            |
|-------------------|------|------|------|-----------------------------------------------------------|
| `advanced`        | FIX  | FIX  | FIX  | HIGH — D-03 sidebar chrome (carries from prior audits). Body matches reference, including stat colors (crimson/blue/green/purple) and 3×3 category grid. |
| `journeys`        | FIX  | FIX  | FIX  | HIGH — AJ-01 (journey icon glyph renders as missing-glyph box) + D-03. Layout, cards, badges, CTAs all match. |
| `journey-6`       | FIX  | FIX  | FIX  | HIGH — AJ-01 (icon glyph) + D-03. Header card, badges, unauthenticated alert, Learning Path empty-state all match reference exactly. |

**Advanced tab states @ 1280** (verifies all four tab views render):

| Tab key             | Verdict | Notes |
|---------------------|---------|-------|
| `advanced-tab-explorer`        | PASS | Default state; identical to base `advanced_1280_current.jpg`. |
| `advanced-tab-metrics`         | PASS | Renders "Community Analytics Dashboard" (Activity Level / Quality Score / Completeness stat row) + `CommunityMetrics` (Overview/Contributors/Popular/Categories sub-tabs + Recent Activity list). Tab activation required full pointer-event dispatch — logged under T-02. |
| `advanced-tab-export`          | PASS | Renders "Multi-Format Export System" (6 format mini-cards) + `ExportTools` (format selector, content options, category filter, "Export 1952 Resources" crimson primary button). T-03 same activation note as T-02. |
| `advanced-tab-recommendations` | PASS | Renders `AIRecommendationsPanel` (Skill Level / Preferred Categories / Learning Goals / Preferred Resource Types / Time Commitment + "Generate AI Recommendations" crimson primary button + "Ready to Get Started" footer). T-04 same activation note as T-02. |

**Net (per-pair, including the four tab states)**: **4 PASS** (all
Advanced tabs render), **9 FIX**, 0 FAIL. Per-pair total = 13.

This surface is roughly on par with the detail surface: most
divergences again collapse to the recurring **D-03 sidebar chrome** bug
plus one **new HIGH** specific to this surface (AJ-01 — journey icon
glyph). All four Advanced tab views render their intended content.

---

## Surface-level findings

| ID    | Pages                      | Rubric            | Severity | Finding |
|-------|----------------------------|-------------------|----------|---------|
| D-03  | All 3 routes + all 4 tabs  | type / contrast   | HIGH     | Sidebar `SidebarGroupLabel` "NAVIGATION" / "CATEGORIES" rendered as crimson uppercase eyebrows; brand line reads `1952 RESOURCES` in crimson. Identical to H-01/H-02 (`AUDIT_LANDING.md`), C-08 (`AUDIT_CATEGORY.md`), D-03 (`AUDIT_DETAIL.md`). Owned by the queued "Fix — sidebar/header/MainLayout chrome" task; logged for traceability only. |
| AJ-01 | Journeys + JourneyDetail   | content / type    | HIGH     | The journey "icon" (`journey.icon || "📚"` — `Journeys.tsx:177`, `JourneyDetail.tsx:215`) renders as an empty/missing-glyph rectangle in current at every breakpoint. Reference renders a clearly visible stacked-books colour glyph. Cause is almost certainly a missing-emoji-font issue in our render path (Chromium in the Replit container has no system colour-emoji font), but the user-visible result is a divergence vs. reference: ~ 40×40 (Journeys card) / ~ 60×60 (JourneyDetail card) empty boxes where the reference shows colourful book-stack icons. The "Fix — advanced + journeys" task needs to decide between: (a) shipping a colour-emoji web-font, (b) replacing the emoji with a lucide `BookOpen` (or similar) icon coloured via the design tokens, or (c) treating it as environment-only and ignoring. Option (b) is recommended because it keeps the icon legible across all platforms regardless of font availability. |
| AJ-02 | Advanced + Journeys        | content (data)    | NOTE     | Resource count drift — reference reads `1953 Resources` / sidebar brand `1953 RESOURCES`, current reads `1952 Resources` / `1952 RESOURCES`. Pure data drift between the reference capture date and today; not a styling regression. Logged for completeness. |
| AJ-03 | Advanced                   | colour / type     | NOTE     | Stat cards in the Explorer tab intentionally use accent colours per file: `text-primary` crimson (Categories), `text-blue-600` (Resources), `text-green-600` (Unique Tags), `text-purple-600` (Subcategories) — `Advanced.tsx:111-141`. Reference shows the same colour mapping. This deliberately diverges from the otherwise-monochrome Editorial palette and is *correctly* honoured by current; logged as a verification note so any future "DS structural compliance" pass does not strip the colour coding by accident. |
| AJ-04 | Advanced                   | layout            | NOTE     | Bottom "Explore More Features" CTA card (`Advanced.tsx:255-276`) present in current with `Browse All Resources` crimson primary + `Explore Categories` outline. Reference also shows it at the bottom of the page. Matches. |
| AJ-05 | Journeys                   | layout / a11y     | NOTE     | "Filter by category" `Select` + "{n} journeys available" header row (`Journeys.tsx:112-132`) matches reference exactly. Touch target on the Select trigger is `min-h` per shadcn defaults (≥ 36 px); at 400 it stretches full-width as `w-full sm:w-[200px]` — verified in `journeys_400_current.jpg`. |
| AJ-06 | JourneyDetail              | layout / empty    | NOTE     | Empty-state for "no steps yet" (`JourneyDetail.tsx:418-423`) and unauthenticated alert (`JourneyDetail.tsx:275-286`) both render exactly as reference shows them. The reference is captured against journey 6 which genuinely has 0 steps; current displays identical messaging. PASS-equivalent. |

## Tab-state verification (Task #32 "Done looks like")

| ID   | Tab                | Verdict | Severity | Evidence |
|------|--------------------|---------|----------|----------|
| T-01 | Explorer (default) | PASS    | —        | `advanced-tab-explorer_1280_current.jpg` shows `TabsTrigger value="explorer"` active (crimson tinted, `data-state="active"`) with `CategoryExplorer` + the 4-card stat grid below. Identical content to the base `advanced_1280_current.jpg`. |
| T-02 | Metrics            | PASS    | NOTE     | `advanced-tab-metrics_1280_current.jpg` shows Metrics tab active and renders "Community Analytics Dashboard" (3-card stat row) + the `CommunityMetrics` component with its own nested `Tabs` (Overview / Contributors / Popular / Categories) plus a Recent Activity list with crimson-eyebrowed `#1…#5` rows. Tab activation required dispatching the pointer-event sequence noted in Methodology. |
| T-03 | Export             | PASS    | NOTE     | `advanced-tab-export_1280_current.jpg` shows Export tab active and renders "Multi-Format Export System" (6 format mini-cards: Markdown / JSON / CSV / PDF / HTML / YAML) followed by `ExportTools` (format dropdown, content-option checkboxes, category filter, Export Summary, big "Export 1952 Resources" crimson primary button). |
| T-04 | AI Recommendations | PASS    | NOTE     | `advanced-tab-recommendations_1280_current.jpg` shows AI Recommendations tab active and renders `AIRecommendationsPanel`: "Configure Your Preferences" (Skill Level select, Preferred Categories checkbox grid, Learning Goals checkbox grid, Preferred Resource Types checkbox grid, Time Commitment select), "Generate AI Recommendations" crimson primary button, and "Ready to Get Started" footer. |

---

## Per-route sections

### 1. Advanced (`/advanced`)

| Width | Current                                                       | Reference                                                          | Verdict | Worst sev. | Findings          |
|------:|---------------------------------------------------------------|--------------------------------------------------------------------|---------|------------|-------------------|
| 400   | `screenshots/audit/advanced-journeys/advanced_400_current.jpg`   | `screenshots/audit/advanced-journeys/advanced_400_reference.jpg`   | FIX     | HIGH       | D-03, AJ-02, AJ-03 |
| 768   | `screenshots/audit/advanced-journeys/advanced_768_current.jpg`   | `screenshots/audit/advanced-journeys/advanced_768_reference.jpg`   | FIX     | HIGH       | D-03, AJ-02, AJ-03 |
| 1280  | `screenshots/audit/advanced-journeys/advanced_1280_current.jpg`  | `screenshots/audit/advanced-journeys/advanced_1280_reference.jpg`  | FIX     | HIGH       | D-03, AJ-02, AJ-03, AJ-04 |

Side-by-side reasoning (1280): hero (`Sparkles` crimson icon + "Advanced
Features" h1 + subtitle) matches in content, font weight, and spacing.
4-tab `TabsList` with `grid-cols-4` matches reference layout. Explorer
tab (default) renders the "Interactive Category Explorer" Card with
4-card stat grid — colour mapping (crimson 9 / blue 1952 / green 0 /
purple 102) matches reference's (crimson 9 / blue 1953 / green 0 /
purple 102). "Category Explorer" Card with search + sort + show-
subcategories toggle matches. 3×3 category grid below shows the same 9
top-level categories with the same 3-resource previews. Bottom CTA card
matches. Only divergences: D-03 sidebar chrome, AJ-02 count drift.

### 2. Journeys (`/journeys`)

| Width | Current                                                       | Reference                                                          | Verdict | Worst sev. | Findings   |
|------:|---------------------------------------------------------------|--------------------------------------------------------------------|---------|------------|------------|
| 400   | `screenshots/audit/advanced-journeys/journeys_400_current.jpg`   | `screenshots/audit/advanced-journeys/journeys_400_reference.jpg`   | FIX     | HIGH       | D-03, AJ-01 |
| 768   | `screenshots/audit/advanced-journeys/journeys_768_current.jpg`   | `screenshots/audit/advanced-journeys/journeys_768_reference.jpg`   | FIX     | HIGH       | D-03, AJ-01 |
| 1280  | `screenshots/audit/advanced-journeys/journeys_1280_current.jpg`  | `screenshots/audit/advanced-journeys/journeys_1280_reference.jpg`  | FIX     | HIGH       | D-03, AJ-01, AJ-05 |

Side-by-side reasoning (1280): hero (`BookOpen` crimson icon +
"Learning Journeys" h1 + subtitle "Explore structured learning paths to
master new skills step by step") matches reference exactly. Filter row
("Filter by category: All Categories" select + "5 journeys available")
matches. 3-column grid (2 rows × 5 cards) renders all five seeded
journeys: Video Streaming Fundamentals (Beginner), Building Your First
Streaming Platform (Intermediate), FFMPEG Mastery (Intermediate),
Advanced Live Streaming Architecture (Advanced), DRM & Content
Protection (Advanced). Each card has correct difficulty badge colour
(green / yellow / red), time badge, category badge, step-count badge,
and crimson "Start Journey" CTA with chevron. Only divergences:
**AJ-01** (the journey "icon" in current renders as an empty box where
the reference shows a colourful stacked-books icon) and **D-03**.

At 400, sidebar correctly collapses off-canvas (verified in
`journeys_400_current.jpg`) and cards stack to single column with full
width. CTAs remain ≥ 44 px tall.

### 3. Journey Detail — Video Streaming Fundamentals (`/journey/6`)

| Width | Current                                                          | Reference                                                          | Verdict | Worst sev. | Findings   |
|------:|------------------------------------------------------------------|--------------------------------------------------------------------|---------|------------|------------|
| 400   | `screenshots/audit/advanced-journeys/journey-6_400_current.jpg`     | `screenshots/audit/advanced-journeys/journey-6_400_reference.jpg`  | FIX     | HIGH       | D-03, AJ-01 |
| 768   | `screenshots/audit/advanced-journeys/journey-6_768_current.jpg`     | `screenshots/audit/advanced-journeys/journey-6_768_reference.jpg`  | FIX     | HIGH       | D-03, AJ-01 |
| 1280  | `screenshots/audit/advanced-journeys/journey-6_1280_current.jpg`    | `screenshots/audit/advanced-journeys/journey-6_1280_reference.jpg` | FIX     | HIGH       | D-03, AJ-01, AJ-06 |

Side-by-side reasoning (1280): `← Back to Journeys` ghost button top-
left matches reference. Hero Card renders the journey icon (rectangle
in current vs. colour glyph in reference — AJ-01), `Beginner` green
outline badge top-right, h1 "Video Streaming Fundamentals", description
text, then the 3 meta badges (`8-10 hours`, `Intro & Learning`,
`0 steps`). Below the meta row, the unauthenticated alert renders
identically to reference: `[i] Please log in to start this journey and
track your progress.` Below the hero card, the `Learning Path` h2 is
followed by the "no steps yet" alert. All copy and structure match
reference exactly. Only divergences are AJ-01 and D-03.

#### Task #32 "Done looks like" — JourneyDetail explicit checks

| ID  | Check                                                | Verdict | Evidence |
|-----|------------------------------------------------------|---------|----------|
| J-1 | Step list                                            | PASS    | Journey 6 has 0 steps; current correctly renders the empty-state alert at `JourneyDetail.tsx:418-423` instead of a step list. When steps exist, the `journey.steps` map at line 311-416 produces the numbered step cards (verified in code; not exercised in this audit since the reference also shows the empty state). |
| J-2 | Progress indicator                                   | N/A     | Only rendered for enrolled users (`JourneyDetail.tsx:256-272`, gated on `isEnrolled = !!journey?.progress`). Reference is captured unauthenticated → no progress bar → current also correctly omits it. |
| J-3 | "Start Journey" CTA                                  | N/A     | Only rendered for authenticated, not-yet-enrolled users (line 287-303). Reference is unauthenticated → shows the login alert instead → current matches. The CTA itself exists in code as a `<Button className="w-full mt-6"><Play /> Start Journey</Button>`. |
| J-4 | Resource lookup state                                | N/A     | Per-step resource link (`JourneyDetail.tsx:365-383`) is conditional on `step.resource`. With 0 steps there is nothing to render; matches reference. |

The J-2 / J-3 / J-4 N/A entries are **expected** for this exact journey
ID; verifying their authenticated/enrolled-state rendering is the
domain of the "Functional validation — page interactions" task (#35),
not this visual audit.

---

## Findings by severity (planner intake)

- **CRITICAL (0)**: None on the advanced + journeys surface.
- **HIGH (2)**: D-03 (sidebar chrome — global, owned by separate task),
  AJ-01 (journey icon glyph rendering as empty box).
- **MEDIUM (0)**: None.
- **LOW (0)**: None user-visible.
- **NOTE / verification (8)**: AJ-02 (count drift, data not styling),
  AJ-03 (intentional stat-card accent colours), AJ-04 (bottom CTA card
  matches), AJ-05 (Journeys filter row matches), AJ-06 (JourneyDetail
  empty states match), T-02 / T-03 / T-04 (tab activation requires
  non-trivial pointer-event dispatch — implementation-risk metadata
  for the downstream E2E task #35; not user-visible).
- **PASS (verified)**: T-01, T-02, T-03, T-04 (all four Advanced tabs
  render correctly).

(The downstream "Fix — advanced + journeys" task already queued by the
planner will pick up AJ-01; D-03 is owned by "Fix — sidebar/header/
MainLayout chrome".)

## Appendix A — full 13-row pair matrix

Strict single-row-per-pair view: 3 routes × 3 widths + 4 tab states =
13 rows. Paths are repo-relative under
`screenshots/audit/advanced-journeys/`.

| #  | Route / tab state                       | Width | Current                                            | Reference                                            | Verdict | Worst sev. | Findings           |
|---:|-----------------------------------------|------:|----------------------------------------------------|------------------------------------------------------|---------|------------|--------------------|
| 1  | advanced                                | 400   | `advanced_400_current.jpg`                         | `advanced_400_reference.jpg`                         | FIX     | HIGH       | D-03, AJ-02, AJ-03 |
| 2  | advanced                                | 768   | `advanced_768_current.jpg`                         | `advanced_768_reference.jpg`                         | FIX     | HIGH       | D-03, AJ-02, AJ-03 |
| 3  | advanced                                | 1280  | `advanced_1280_current.jpg`                        | `advanced_1280_reference.jpg`                        | FIX     | HIGH       | D-03, AJ-02, AJ-03, AJ-04 |
| 4  | journeys                                | 400   | `journeys_400_current.jpg`                         | `journeys_400_reference.jpg`                         | FIX     | HIGH       | D-03, AJ-01        |
| 5  | journeys                                | 768   | `journeys_768_current.jpg`                         | `journeys_768_reference.jpg`                         | FIX     | HIGH       | D-03, AJ-01        |
| 6  | journeys                                | 1280  | `journeys_1280_current.jpg`                        | `journeys_1280_reference.jpg`                        | FIX     | HIGH       | D-03, AJ-01, AJ-05 |
| 7  | journey-6                               | 400   | `journey-6_400_current.jpg`                        | `journey-6_400_reference.jpg`                        | FIX     | HIGH       | D-03, AJ-01        |
| 8  | journey-6                               | 768   | `journey-6_768_current.jpg`                        | `journey-6_768_reference.jpg`                        | FIX     | HIGH       | D-03, AJ-01        |
| 9  | journey-6                               | 1280  | `journey-6_1280_current.jpg`                       | `journey-6_1280_reference.jpg`                       | FIX     | HIGH       | D-03, AJ-01, AJ-06 |
| 10 | advanced — tab: explorer (default)      | 1280  | `advanced-tab-explorer_1280_current.jpg`           | `advanced-tab-explorer_1280_reference.jpg` (= row 3) | PASS    | —          | T-01               |
| 11 | advanced — tab: metrics                 | 1280  | `advanced-tab-metrics_1280_current.jpg`            | `advanced-tab-metrics_1280_reference.jpg` (= row 3)  | PASS    | NOTE       | T-02               |
| 12 | advanced — tab: export                  | 1280  | `advanced-tab-export_1280_current.jpg`             | `advanced-tab-export_1280_reference.jpg` (= row 3)   | PASS    | NOTE       | T-03               |
| 13 | advanced — tab: AI Recommendations      | 1280  | `advanced-tab-recommendations_1280_current.jpg`    | `advanced-tab-recommendations_1280_reference.jpg` (= row 3) | PASS    | NOTE       | T-04               |

> Rows 10–13 reuse the same `03_advanced.png` reference because the
> handoff renders only the default Explorer tab. We treat each tab-state
> capture as a **rendering correctness verification** (does the tab
> view mount and lay out without errors?) rather than a pixel-diff
> against a non-existent reference. Comparing each tab state pixel-by-
> pixel against the Explorer-tab reference would produce false
> failures and is explicitly out of scope.

## Appendix B — Reference reuse rationale

Identical to Appendix B of `_planning/AUDIT_LANDING.md`,
`_planning/AUDIT_CATEGORY.md`, and `_planning/AUDIT_DETAIL.md`.
Reference image filenames at 400 / 768 / 1280 for the same route are
intentionally byte-identical copies of the desktop PNG from
`awesome-list-site-ds/uploads/`, per `_planning/REFERENCE_MAP.md`. The
tab-state reference filenames are also byte-identical copies of
`03_advanced.png` for the same reason — the handoff has no per-tab
references — and the tab pairs are scored on rendering correctness, not
pixel match (see appendix A footnote).
