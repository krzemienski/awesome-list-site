# AUDIT_CATEGORY — Visual diff for category surface

> Task #30 deliverable. Audit only — no fixes. Pairs the running app's nine
> `/category/<slug>` routes against the Editorial + Crimson handoff
> references at three breakpoints (400 / 768 / 1280), plus the three
> view-mode toggle states (grid / list / compact) at 1280 for one
> representative category. All nine category pages render through the
> single shared template `client/src/pages/Category.tsx`, so most findings
> collapse to one component but every pair is still scored.
> Rubric: `.agents/skills/visual-inspection/SKILL.md` (layout · type ·
> contrast · touch targets · dark-mode · overflow · spacing · a11y).

## Reference & methodology

- **Current screenshots** captured by `agent-browser` (session `audit30`)
  against the live dev server at `http://localhost:5000`. Per breakpoint:
  `set viewport <w> 900` → `open /category/<slug>` → `wait 1500-1800ms` →
  `screenshot --full --jpeg`.
- **Reference screenshots** = authoritative `09…17_category_*.png` PNGs
  copied from `awesome-list-site-ds/uploads/`, per `_planning/REFERENCE_MAP.md`
  ("Use the PNGs in `uploads/` as the authoritative reference; only fall
  back to live-rendering the bundle when a PNG is missing or you need a
  hover/focus state"). Same desktop-only reuse caveat as `AUDIT_LANDING.md`:
  the handoff PNGs are 1920×1080 desktop captures of `new.awesome.video`
  and are reused as the reference frame at 400 / 768 / 1280 because the
  bundle does not ship per-breakpoint renders.
- **View-mode captures** (extra coverage requested by Task #30):
  `_viewmode_grid_1280.jpg`, `_viewmode_list_1280.jpg`,
  `_viewmode_compact_1280.jpg` — all captured against
  `/category/community-events`. The handoff bundle only shows the **grid**
  state, so list / compact are scored against the template's intent +
  visual-inspection rubric rather than a pixel reference.
- **Hover and empty-state** captures: skipped from this pass per Task #30
  scope clarification (full-page screenshots cannot hold a hover state;
  the empty-state branch lives in `Category.tsx` lines 350-369 and is
  read-only validated against the same rubric).
- Severity: **CRITICAL / HIGH / MEDIUM / LOW** as in `AUDIT_LANDING.md`.
- Verdict per pair: **PASS / FIX / FAIL**.

All paths are relative to the repo root.

---

## TL;DR

| Category (slug)              | 400 | 768 | 1280 | Worst severity                                            |
|------------------------------|-----|-----|------|-----------------------------------------------------------|
| `community-events`           | FIX | FIX | FIX  | HIGH — template-wide C-01 (`View Details` is a subordinated outline badge, not the reference's prominent crimson CTA) + C-02 (card density). |
| `encoding-codecs`            | FIX | FIX | FIX  | HIGH — same C-01 / C-02 + the `All Subcategories` dropdown is rendered in the wrong row position (C-05). |
| `general-tools`              | FIX | FIX | FIX  | HIGH — same C-01 / C-02. |
| `infrastructure-delivery`    | FIX | FIX | FIX  | HIGH — same C-01 / C-02. |
| `intro-learning`             | FIX | FIX | FIX  | HIGH — same C-01 / C-02. |
| `media-tools`                | FIX | FIX | FIX  | HIGH — same C-01 / C-02. |
| `players-clients`            | FIX | FIX | FIX  | HIGH — same C-01 / C-02. |
| `protocols-transport`        | FIX | FIX | FIX  | HIGH — same C-01 / C-02. |
| `standards-industry`         | FIX | FIX | FIX  | HIGH — same C-01 / C-02. |
| `_viewmode_grid_1280`        | —   | —   | FIX  | HIGH — same C-01 / C-02 as the per-page grid state. |
| `_viewmode_list_1280`        | —   | —   | FIX  | MEDIUM — V-01 (list row uses `bg-card` not the reference's transparent row); V-02 (per-row Edit + ExternalLink icons crowd the right edge); V-03 (no per-row "Details" crimson chip). |
| `_viewmode_compact_1280`     | —   | —   | FIX  | LOW — compact grid renders cleanly (5-col @ 1280, truncated titles + ExternalLink icon). Only minor: count badge in CardTitle's top-right collides with the ExternalLink icon on narrow tiles. |

**Net (per-pair, including 3 view-mode states)**: 0 PASS, **30 FIX**, 0 FAIL.

The dominant finding cluster (C-01 / C-02 / C-03 / C-05) is **template-level**:
fixing it once in `client/src/pages/Category.tsx` repairs all 9 categories
at all 3 breakpoints. The downstream "Fix — category surface" task is
already queued by the planner.

---

## Template-level findings

Findings tagged `C-*` apply to every `/category/<slug>` route because they
live in the shared `Category.tsx`. The per-page sections below cite these
IDs rather than restating them.

| ID    | Width | Rubric    | Severity | Finding |
|-------|-------|-----------|----------|---------|
| C-01  | all   | layout / contrast | HIGH | Resource cards have only a small **outline-badge** `View Details` affordance for db-backed resources, not the prominent crimson CTA the reference renders. Reference card body = title (h3, bold, ~ 18 px) → 2-line description → crimson `View Details` button (text-only, larger than a badge, sits flush-left in its own row with comfortable padding). Current implementation (`Category.tsx` lines 491-544 grid branch) renders a `CardTitle` with a `flex` row containing the title text + two ghost icon buttons (`ExternalLink`, `Edit`) top-right, then the description, then a footer `CardContent` `flex gap-1.5 flex-wrap` with — for db-backed resources only — a `<Badge variant="outline" className="text-xs border-primary/30 text-primary">View Details</Badge>` (lines 537-539). For non-db resources the `View Details` affordance is absent entirely; the primary action is the whole-card click handler. Even for db-backed resources, the affordance is a 12 px outline badge sharing a row with subcategory/tag badges, not a primary button — visually subordinated to the surrounding metadata chips. Severity stays HIGH because the badge does not meet the reference's intent as a prominent in-card CTA and because non-db cards have no labelled action at all. Related: the badge color path (C-09) compounds the visual mismatch. |
| C-02  | all   | spacing   | HIGH     | Cards render much shorter and denser than reference. Current uses `CardHeader p-3 sm:p-4 md:p-6` and `CardContent p-3 ...` with `line-clamp-2` on the title and a description preview, totalling ~ 110-130 px tall. Reference cards are ~ 210-220 px tall with comfortable `p-6` padding, ~ 40-50 px between title and description, and the `View Details` button anchored to a bottom region with its own vertical rhythm. The net effect is a noisy "wall of cards" at 1280 vs. the reference's calm 3 × N grid. |
| C-03  | all   | type      | MEDIUM   | Category `h1` is `text-xl sm:text-2xl md:text-3xl font-bold tracking-tight` (~ 28-30 px @ 1280). Reference renders the title at ~ 36-40 px bold — one step larger at every breakpoint. The accompanying "N resources available" lead text is correct. |
| C-04  | all   | layout    | MEDIUM   | Header row: current places the count badge **inline** next to the title (`flex items-center justify-between`), so the badge sits ~ 8 px from the h1 right edge. Reference renders the badge as a **round pill** floated far-right of the row (`justify-end`), visually separated from the title block. Both render the same value (`80`, `114`, etc.); only the placement / shape differs. |
| C-05  | all   | layout    | MEDIUM   | Filter row composition: current renders `[Search input full-width] [Subcategory Select md:w-[200px]]` on row 1 and `[AdvancedFilter pill + sort]` on row 2. Reference shows: row 1 = search input full-width across the page width; row 2 = `[Filter by Tag pill] [Default sort dropdown]` LEFT, AND the **Subcategory dropdown floated top-right** of the row containing the h1/badge — not inline with the search row. Visible cleanly in `encoding-codecs_1280_reference.jpg` where `All Subcategories` appears in the upper-right corner of the page header band, not the filter row. |
| C-06  | all   | layout    | LOW      | "Showing X of Y resources" lead sits on the same row as the `ViewModeToggle` in both current and reference; current spacing is `justify-between gap-2`, reference is similar. No fix. |
| C-07  | all   | type      | LOW      | "Back to Home" ghost button is rendered identically (gap-2 ArrowLeft + text) in current and reference. No fix. |
| C-08  | all   | type      | HIGH     | Sidebar `SidebarGroupLabel` "NAVIGATION" / "CATEGORIES" still rendered as crimson uppercase eyebrows; sidebar brand still uses the crimson uppercase "1952 RESOURCES" eyebrow. Same global finding as H-01 + H-02 in `AUDIT_LANDING.md`; recorded here for traceability since it appears in every category screenshot too. |
| C-09  | all   | contrast  | MEDIUM   | "Details" `Badge` on db-backed resources in list view uses `border-primary/30 text-primary` (legacy shadcn `--primary` chain) — same drift pattern as S-01 in `AUDIT_LANDING.md`. Will move under a non-cyberpunk preset. |
| C-10  | 400   | layout    | LOW      | At 400 px the grid correctly collapses to 1-col, no horizontal scroll, no overflow. Touch targets on the per-card icon buttons are `min-h-[44px] min-w-[44px]` (verified at `Category.tsx:439`, `:451`, `:478`) — WCAG 2.5.5 compliant. |
| C-11  | 768   | layout    | LOW      | At 768 px the grid collapses to 2-col (`sm:grid-cols-2`) before the `lg` breakpoint at 1024 — matches reference cadence. |

---

## Per-category sections (1 row per pair)

### 1. Community & Events — `/category/community-events`

| Width | Current                                                              | Reference                                                              | Verdict | Worst sev. | Findings           |
|------:|----------------------------------------------------------------------|------------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/category/community-events_400_current.jpg`        | `screenshots/audit/category/community-events_400_reference.jpg`        | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10 |
| 768   | `screenshots/audit/category/community-events_768_current.jpg`        | `screenshots/audit/category/community-events_768_reference.jpg`        | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11 |
| 1280  | `screenshots/audit/category/community-events_1280_current.jpg`       | `screenshots/audit/category/community-events_1280_reference.jpg`       | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-06, C-08 |

Side-by-side reasoning (1280): hero ("Community & Events" h1 + "80
resources available" lead + count badge `80`) matches in content and
order. Reference renders a single search row, then the
`Filter by Tag` / `Default` row, then the result-count + view toggle, then
a 3-col grid of resource cards each containing title + description +
crimson `View Details` button (no glow). Current renders the same content
but with C-01 (`View Details` exists only as a 12 px outline badge for
db-backed cards in the metadata-chip row, and is absent on non-db cards),
C-02 (cards ~ 110 px vs. ~ 220 px ref), C-03 (h1 one step too small),
C-04 (badge inline not right-pilled).
The sidebar at 1280 shows the same crimson uppercase
"NAVIGATION/CATEGORIES" eyebrows as on the landing pages (C-08). Mobile
collapse at 400/768 is structurally correct, no overflow.

### 2. Encoding & Codecs — `/category/encoding-codecs`

| Width | Current                                                              | Reference                                                              | Verdict | Worst sev. | Findings           |
|------:|----------------------------------------------------------------------|------------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/category/encoding-codecs_400_current.jpg`         | `screenshots/audit/category/encoding-codecs_400_reference.jpg`         | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10 |
| 768   | `screenshots/audit/category/encoding-codecs_768_current.jpg`         | `screenshots/audit/category/encoding-codecs_768_reference.jpg`         | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11 |
| 1280  | `screenshots/audit/category/encoding-codecs_1280_current.jpg`        | `screenshots/audit/category/encoding-codecs_1280_reference.jpg`        | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08 |

Side-by-side reasoning (1280): Encoding & Codecs is the **most diagnostic
of the 9** for C-05 because it has 14 subcategories — the reference clearly
floats `All Subcategories` as a right-aligned dropdown in the same band as
the h1 + count badge, whereas current places it on the search row. Sidebar
in current does correctly expand to show nested subcategories
(`Benchmarking & Perfo... 1`, `Cloud-Based Encodi... 1`, `Codecs 14`,
`Comparative Analysis 1`, `Containerization & Pa... 1`, `Encoding Tools 101`,
`FFmpeg-Based Tools 14`, `Hardware Accelerated... 2`, etc.) — this
matches the reference. The crimson eyebrows and missing `View Details`
CTA findings carry over from C-01 / C-08.

### 3. General Tools — `/category/general-tools`

| Width | Current                                                              | Reference                                                              | Verdict | Worst sev. | Findings           |
|------:|----------------------------------------------------------------------|------------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/category/general-tools_400_current.jpg`           | `screenshots/audit/category/general-tools_400_reference.jpg`           | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10 |
| 768   | `screenshots/audit/category/general-tools_768_current.jpg`           | `screenshots/audit/category/general-tools_768_reference.jpg`           | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11 |
| 1280  | `screenshots/audit/category/general-tools_1280_current.jpg`          | `screenshots/audit/category/general-tools_1280_reference.jpg`          | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08 |

Side-by-side reasoning (1280): Identical to community-events template
divergences. Count badge `126` renders correctly. No category-specific
differences vs. the cluster.

### 4. Infrastructure & Delivery — `/category/infrastructure-delivery`

| Width | Current                                                                       | Reference                                                                       | Verdict | Worst sev. | Findings           |
|------:|-------------------------------------------------------------------------------|---------------------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/category/infrastructure-delivery_400_current.jpg`          | `screenshots/audit/category/infrastructure-delivery_400_reference.jpg`          | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10 |
| 768   | `screenshots/audit/category/infrastructure-delivery_768_current.jpg`          | `screenshots/audit/category/infrastructure-delivery_768_reference.jpg`          | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11 |
| 1280  | `screenshots/audit/category/infrastructure-delivery_1280_current.jpg`         | `screenshots/audit/category/infrastructure-delivery_1280_reference.jpg`         | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08 |

Side-by-side reasoning (1280): Long category name (`Infrastructure &
Delivery`) truncates correctly in the sidebar with the `truncate` class on
the h1 (`Category.tsx:292`) but the sidebar entry is `text-ellipsis` to
`Infrastructure & Deli...`. Reference shows the same truncation behavior.
No category-specific divergence beyond the cluster.

### 5. Intro & Learning — `/category/intro-learning`

| Width | Current                                                              | Reference                                                              | Verdict | Worst sev. | Findings           |
|------:|----------------------------------------------------------------------|------------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/category/intro-learning_400_current.jpg`          | `screenshots/audit/category/intro-learning_400_reference.jpg`          | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10 |
| 768   | `screenshots/audit/category/intro-learning_768_current.jpg`          | `screenshots/audit/category/intro-learning_768_reference.jpg`          | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11 |
| 1280  | `screenshots/audit/category/intro-learning_1280_current.jpg`         | `screenshots/audit/category/intro-learning_1280_reference.jpg`         | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08 |

Side-by-side reasoning (1280): No category-specific divergence beyond the
template cluster.

### 6. Media Tools — `/category/media-tools`

| Width | Current                                                              | Reference                                                              | Verdict | Worst sev. | Findings           |
|------:|----------------------------------------------------------------------|------------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/category/media-tools_400_current.jpg`             | `screenshots/audit/category/media-tools_400_reference.jpg`             | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10 |
| 768   | `screenshots/audit/category/media-tools_768_current.jpg`             | `screenshots/audit/category/media-tools_768_reference.jpg`             | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11 |
| 1280  | `screenshots/audit/category/media-tools_1280_current.jpg`            | `screenshots/audit/category/media-tools_1280_reference.jpg`            | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08 |

Side-by-side reasoning (1280): Count `241` renders correctly in both
header badge and sidebar entry. No category-specific divergence.

### 7. Players & Clients — `/category/players-clients`

| Width | Current                                                              | Reference                                                              | Verdict | Worst sev. | Findings           |
|------:|----------------------------------------------------------------------|------------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/category/players-clients_400_current.jpg`         | `screenshots/audit/category/players-clients_400_reference.jpg`         | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10 |
| 768   | `screenshots/audit/category/players-clients_768_current.jpg`         | `screenshots/audit/category/players-clients_768_reference.jpg`         | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11 |
| 1280  | `screenshots/audit/category/players-clients_1280_current.jpg`        | `screenshots/audit/category/players-clients_1280_reference.jpg`        | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08 |

Side-by-side reasoning (1280): No category-specific divergence.

### 8. Protocols & Transport — `/category/protocols-transport`

| Width | Current                                                                  | Reference                                                                  | Verdict | Worst sev. | Findings           |
|------:|--------------------------------------------------------------------------|----------------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/category/protocols-transport_400_current.jpg`         | `screenshots/audit/category/protocols-transport_400_reference.jpg`         | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10 |
| 768   | `screenshots/audit/category/protocols-transport_768_current.jpg`         | `screenshots/audit/category/protocols-transport_768_reference.jpg`         | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11 |
| 1280  | `screenshots/audit/category/protocols-transport_1280_current.jpg`        | `screenshots/audit/category/protocols-transport_1280_reference.jpg`        | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08 |

Side-by-side reasoning (1280): No category-specific divergence.

### 9. Standards & Industry — `/category/standards-industry`

| Width | Current                                                                 | Reference                                                                 | Verdict | Worst sev. | Findings           |
|------:|-------------------------------------------------------------------------|---------------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/category/standards-industry_400_current.jpg`         | `screenshots/audit/category/standards-industry_400_reference.jpg`         | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10 |
| 768   | `screenshots/audit/category/standards-industry_768_current.jpg`         | `screenshots/audit/category/standards-industry_768_reference.jpg`         | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11 |
| 1280  | `screenshots/audit/category/standards-industry_1280_current.jpg`        | `screenshots/audit/category/standards-industry_1280_reference.jpg`        | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08 |

Side-by-side reasoning (1280): No category-specific divergence.

---

## View-mode toggle states (Task #30 extra)

Representative category: **Community & Events** (`/category/community-events`).
Captured at 1280 px after clicking `[aria-label="List view"]` and
`[aria-label="Compact view"]` on the `ViewModeToggle` in the result-count
row. The handoff bundle only renders the **grid** state, so list / compact
are evaluated against the visual-inspection rubric without a pixel
reference.

| Mode      | Current                                                          | Reference                       | Verdict | Worst sev. | Findings    |
|-----------|------------------------------------------------------------------|---------------------------------|---------|------------|-------------|
| grid      | `screenshots/audit/category/_viewmode_grid_1280.jpg`             | `community-events_1280_reference.jpg` | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05 |
| list      | `screenshots/audit/category/_viewmode_list_1280.jpg`             | (no reference)                  | FIX     | MEDIUM     | V-01, V-02, V-03 |
| compact   | `screenshots/audit/category/_viewmode_compact_1280.jpg`          | (no reference)                  | FIX     | LOW        | V-04 |

### View-mode-specific findings

| ID    | Mode    | Rubric           | Severity | Finding |
|-------|---------|------------------|----------|---------|
| V-01  | list    | layout / contrast | MEDIUM  | List rows use `bg-card hover:bg-accent` (`Category.tsx:408`). Under the cyberpunk preset the hover swap turns the entire row crimson on hover (`bg-accent` resolves to the same crimson as the primary CTA), which is too aggressive — the reference design language treats list rows as transparent surfaces with a subtle border-only hover. Suggest `hover:bg-[var(--surface-2)]` (or similar Editorial surface ladder token) instead of `hover:bg-accent`. |
| V-02  | list    | touch targets    | MEDIUM   | Per-row trailing icon cluster is `[subcategory badge?] [tag x2 badges?] [ExternalLink] [Edit?]`. At 1280 the row contents render OK but the four optional elements can crowd into ~ 200 px on the right edge. Each icon button satisfies `min-h-[44px] min-w-[44px]` (`Category.tsx:439`, `:451`) so WCAG 2.5.5 passes, but the visual rhythm is busy compared to the Editorial restraint of the rest of the design system. |
| V-03  | list    | layout           | MEDIUM   | List rows have no `Details` text affordance for db-backed resources — only the `border-primary/30 text-primary` `Details` outline badge in the row body (`Category.tsx:415-419`). The badge is small and not interactive; the actual "open detail page" action is the whole-row click. Same C-01 / C-09 family. |
| V-04  | compact | spacing          | LOW      | Compact tiles render 5-col at 1280 with `line-clamp-2` titles and the `ExternalLink` icon at top-right of each tile. Acceptable rhythm; only nit is that titles ending mid-word (`"Streaming Media Conne..."`, `"Movie Studio Zen Forum -..."`) wrap awkwardly because of the 2-line clamp + narrow column. Reference makes no claim about compact mode so this stays LOW. |

---

## Findings by severity (planner intake)

- **CRITICAL (0)**: None on the category surface.
- **HIGH (3)**: C-01 (`View Details` rendered as a subordinated outline
  badge for db-backed cards only, not the reference's prominent crimson
  CTA, and absent entirely on non-db cards), C-02 (card density vs.
  reference's calmer p-6 rhythm), C-08 (sidebar eyebrows — carries over
  from H-01 / H-02 in `AUDIT_LANDING.md`).
- **MEDIUM (7)**: C-03 (h1 too small), C-04 (count badge inline vs.
  right-pilled), C-05 (Subcategory dropdown in wrong row), C-09 (`Details`
  badge uses legacy shadcn `--primary` chain), V-01 (`hover:bg-accent` too
  aggressive on list rows), V-02 (list-row trailing icon cluster busy),
  V-03 (no `Details` text affordance on db-backed list rows).
- **LOW (5)**: C-06, C-07, C-10, C-11, V-04.

(The downstream "Fix — category surface" task already queued by the
planner will pick these up; this audit is intentionally read-only.)

## Appendix A — full 30-row pair matrix

Strict single-row-per-pair view: 9 categories × 3 widths + 3 view-mode
states = 30 rows. Paths are repo-relative under
`screenshots/audit/category/`. `Divergence IDs` link back to the
template-level (`C-*`) and view-mode-specific (`V-*`) tables above.

| #  | Slug / mode                  | Width | Current                                                | Reference                                              | Verdict | Worst sev. | Findings                                  |
|---:|------------------------------|------:|--------------------------------------------------------|--------------------------------------------------------|---------|------------|-------------------------------------------|
| 1  | community-events             | 400   | `community-events_400_current.jpg`                     | `community-events_400_reference.jpg`                   | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10              |
| 2  | community-events             | 768   | `community-events_768_current.jpg`                     | `community-events_768_reference.jpg`                   | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11              |
| 3  | community-events             | 1280  | `community-events_1280_current.jpg`                    | `community-events_1280_reference.jpg`                  | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-06, C-08  |
| 4  | encoding-codecs              | 400   | `encoding-codecs_400_current.jpg`                      | `encoding-codecs_400_reference.jpg`                    | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10              |
| 5  | encoding-codecs              | 768   | `encoding-codecs_768_current.jpg`                      | `encoding-codecs_768_reference.jpg`                    | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11              |
| 6  | encoding-codecs              | 1280  | `encoding-codecs_1280_current.jpg`                     | `encoding-codecs_1280_reference.jpg`                   | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08        |
| 7  | general-tools                | 400   | `general-tools_400_current.jpg`                        | `general-tools_400_reference.jpg`                      | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10              |
| 8  | general-tools                | 768   | `general-tools_768_current.jpg`                        | `general-tools_768_reference.jpg`                      | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11              |
| 9  | general-tools                | 1280  | `general-tools_1280_current.jpg`                       | `general-tools_1280_reference.jpg`                     | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08        |
| 10 | infrastructure-delivery      | 400   | `infrastructure-delivery_400_current.jpg`              | `infrastructure-delivery_400_reference.jpg`            | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10              |
| 11 | infrastructure-delivery      | 768   | `infrastructure-delivery_768_current.jpg`              | `infrastructure-delivery_768_reference.jpg`            | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11              |
| 12 | infrastructure-delivery      | 1280  | `infrastructure-delivery_1280_current.jpg`             | `infrastructure-delivery_1280_reference.jpg`           | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08        |
| 13 | intro-learning               | 400   | `intro-learning_400_current.jpg`                       | `intro-learning_400_reference.jpg`                     | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10              |
| 14 | intro-learning               | 768   | `intro-learning_768_current.jpg`                       | `intro-learning_768_reference.jpg`                     | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11              |
| 15 | intro-learning               | 1280  | `intro-learning_1280_current.jpg`                      | `intro-learning_1280_reference.jpg`                    | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08        |
| 16 | media-tools                  | 400   | `media-tools_400_current.jpg`                          | `media-tools_400_reference.jpg`                        | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10              |
| 17 | media-tools                  | 768   | `media-tools_768_current.jpg`                          | `media-tools_768_reference.jpg`                        | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11              |
| 18 | media-tools                  | 1280  | `media-tools_1280_current.jpg`                         | `media-tools_1280_reference.jpg`                       | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08        |
| 19 | players-clients              | 400   | `players-clients_400_current.jpg`                      | `players-clients_400_reference.jpg`                    | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10              |
| 20 | players-clients              | 768   | `players-clients_768_current.jpg`                      | `players-clients_768_reference.jpg`                    | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11              |
| 21 | players-clients              | 1280  | `players-clients_1280_current.jpg`                     | `players-clients_1280_reference.jpg`                   | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08        |
| 22 | protocols-transport          | 400   | `protocols-transport_400_current.jpg`                  | `protocols-transport_400_reference.jpg`                | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10              |
| 23 | protocols-transport          | 768   | `protocols-transport_768_current.jpg`                  | `protocols-transport_768_reference.jpg`                | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11              |
| 24 | protocols-transport          | 1280  | `protocols-transport_1280_current.jpg`                 | `protocols-transport_1280_reference.jpg`               | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08        |
| 25 | standards-industry           | 400   | `standards-industry_400_current.jpg`                   | `standards-industry_400_reference.jpg`                 | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-10              |
| 26 | standards-industry           | 768   | `standards-industry_768_current.jpg`                   | `standards-industry_768_reference.jpg`                 | FIX     | HIGH       | C-01, C-02, C-03, C-08, C-11              |
| 27 | standards-industry           | 1280  | `standards-industry_1280_current.jpg`                  | `standards-industry_1280_reference.jpg`                | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05, C-08        |
| 28 | community-events / grid      | 1280  | `_viewmode_grid_1280.jpg`                              | `community-events_1280_reference.jpg`                  | FIX     | HIGH       | C-01, C-02, C-03, C-04, C-05              |
| 29 | community-events / list      | 1280  | `_viewmode_list_1280.jpg`                              | (no reference — handoff bundle ships grid only)        | FIX     | MEDIUM     | V-01, V-02, V-03                          |
| 30 | community-events / compact   | 1280  | `_viewmode_compact_1280.jpg`                           | (no reference — handoff bundle ships grid only)        | FIX     | LOW        | V-04                                      |

## Appendix B — Reference reuse rationale

Identical to Appendix B of `_planning/AUDIT_LANDING.md`. Reference image
filenames at 400 / 768 / 1280 for the same category are intentionally
byte-identical copies of the desktop PNG from
`awesome-list-site-ds/uploads/`, per `_planning/REFERENCE_MAP.md` ("Use
the PNGs in `uploads/` as the authoritative reference; only fall back to
live-rendering the bundle when a PNG is missing or you need a hover/focus
state"). Findings tagged `Width = 400 / 768` are scored against the
responsive collapse of the *current* app and only record divergences that
would also be flagged at 1280, except the explicit responsive-fold notes
(C-10, C-11).
