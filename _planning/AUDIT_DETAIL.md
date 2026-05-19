# AUDIT_DETAIL — Visual diff for detail surface

> Task #31 deliverable. Audit only — no fixes. Pairs the running app's
> four deep-link routes against the Editorial + Crimson handoff
> references at three breakpoints (400 / 768 / 1280), plus one
> sidebar-state capture proving the 3rd-level accordion is expanded and
> the active rail sits on the leaf row.
> Rubric: `.agents/skills/visual-inspection/SKILL.md` (layout · type ·
> contrast · touch targets · dark-mode · overflow · spacing · a11y).
> Format precedent: `_planning/AUDIT_LANDING.md` + `_planning/AUDIT_CATEGORY.md`.

## Reference & methodology

- **Routes** (per `_planning/REFERENCE_MAP.md` rows 18–21):
  - `subcategory-ai` → `/subcategory/ai-machine-learning-tools` →
    reference `18_subcategory_ai-ml-tools.png` (Subcategory template).
  - `subsub-hls` → `/sub-subcategory/hls` → reference
    `19_sub-subcategory_hls.png` (SubSubcategory template).
  - `subsub-dash` → `/sub-subcategory/dash` → reference
    `20_sub-subcategory_dash.png` (SubSubcategory template).
  - `resource-184739` → `/resource/184739` (MPEG Standards Documentation)
    → reference `21_resource_detail.png` (ResourceDetail template).
- **Current screenshots** captured by `agent-browser` (session `audit31`)
  against the live dev server at `http://localhost:5000`. Per breakpoint:
  `set viewport <w> 900` → `open` → `wait 1500-1800ms` → `screenshot
  --full`. All four routes return HTTP 200.
- **Reference screenshots** = the authoritative 1920×1080 desktop PNGs
  from `awesome-list-site-ds/uploads/`, reused byte-identical at 400 /
  768 / 1280 per the same caveat documented in
  `_planning/AUDIT_LANDING.md` Appendix B.
- **Sidebar 3rd-level accordion verification**: extra viewport capture
  `_sidebar_hls_expanded_1280.jpg` taken on `/sub-subcategory/hls` to
  satisfy the Task #31 "Done looks like" item — see the S-* row below.
- Severity: **CRITICAL / HIGH / MEDIUM / LOW** as in prior audits.
- Verdict per pair: **PASS / FIX / FAIL**.

All paths are relative to the repo root.

---

## TL;DR

| Route (key)             | 400  | 768  | 1280 | Worst severity                                            |
|-------------------------|------|------|------|-----------------------------------------------------------|
| `subcategory-ai`        | FIX  | FIX  | FIX  | HIGH — D-03 (sidebar eyebrows carry over from landing/category audits). Body content matches reference closely. |
| `subsub-hls`            | FIX  | FIX  | FIX  | HIGH — D-03 only. SubSubcategory body matches reference; sidebar accordion correctly shows 3rd-level state. |
| `subsub-dash`           | FIX  | FIX  | FIX  | HIGH — D-03 only. Same template as HLS. |
| `resource-184739`       | FIX  | FIX  | FIX  | HIGH — D-03 only. Resource detail body **strongly matches** reference (R-01…R-09 all pass); only chrome divergence. |
| `_sidebar_hls_expanded` | —    | —    | PASS | LOW — S-01 verified (Protocols & Transport > Adaptive Streaming > HLS leaf row active with crimson rail). |

**Net (per-pair, including the sidebar state)**: **1 PASS**
(`_sidebar_hls_expanded_1280`), **12 FIX**, 0 FAIL. Per-pair total = 13.

The detail surface is materially closer to the reference than the
category and landing surfaces — most divergences collapse to **one
recurring template-level chrome issue (D-03 sidebar eyebrows + brand
line)** that is *already* tracked in `AUDIT_LANDING.md` (H-01 / H-02)
and `AUDIT_CATEGORY.md` (C-08). The downstream "Fix — detail surface"
and "Fix — sidebar/header/MainLayout chrome" tasks already queued by the
planner will pick these up.

---

## Detail-surface findings

| ID   | Pages                      | Rubric    | Severity | Finding |
|------|----------------------------|-----------|----------|---------|
| D-01 | Subcategory + SubSubcat    | type      | LOW      | h1 size (`text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate` — `Subcategory.tsx:222`, `SubSubcategory.tsx:234`) matches reference at 1280; not the C-03-level downsizing seen in the Category template. |
| D-02 | Subcategory + SubSubcat    | spacing   | MEDIUM   | Card density is slightly heavier than reference (`CardHeader p-3 sm:p-4 md:p-6` — `Subcategory.tsx:290`, `SubSubcategory.tsx:299`). The same C-02 family as the category surface, but **less severe** here because the Subcategory / SubSubcategory cards intentionally have **no `View Details` affordance** in either current or reference, so the cards collapse to title + 2-line description + tag chips. Cards render ~ 130–160 px tall in current vs. ~ 95–110 px in reference. |
| D-03 | All 4 detail routes        | type / contrast | HIGH | Sidebar `SidebarGroupLabel` "NAVIGATION" / "CATEGORIES" still rendered as crimson uppercase eyebrows; brand line still reads `1952 RESOURCES` in crimson. Identical to H-01 / H-02 in `AUDIT_LANDING.md` and C-08 in `AUDIT_CATEGORY.md`. Recorded here purely for traceability — the queued "Fix — sidebar/header/MainLayout chrome" task owns the fix. |
| D-04 | Subcategory + SubSubcat    | type      | NOTE     | `deslugify` produces title-case from the slug. Reference and current **both** show the same casing behaviour (`AI Machine Learning Tools`, `Ai Machine Learning Tools` in the header breadcrumb chain depending on slug → label). PASS-equivalent; logged only because the deslugify path is shared with other pages and may need attention in a future fix. |
| D-05 | Subcategory                | layout    | NOTE     | Reference renders the secondary breadcrumb (`home > Media Tools > AI & Machine Learning Tools`) **above** the h1 row, and the `← Back to Media Tools` ghost button **above** that. Current renders the exact same order — `Breadcrumbs` (line 200-210) → `Back to <parent>` button (line 213-218) → h1 row. Matches. |
| D-06 | SubSubcategory             | layout    | NOTE     | Sub-subcategory page in current renders the secondary breadcrumb (`home > Protocols & Transport > Adaptive Streaming > HLS`) **between** the `← Back` button and the h1 (lines 209-230). Reference renders the same order. Matches. |
| D-07 | SubSubcategory             | layout    | NOTE     | Reference has no view-mode toggle on subcategory / sub-subcategory pages; current matches — only the `Default` sort dropdown + `Showing N of N resources` lead text are rendered (`AdvancedFilter` + the `text-results-count` block). Confirmed against `SubSubcategory.tsx:244-259`. |

## Resource-detail-specific verification (Task #31 "Done looks like")

| ID   | Check                       | Verdict | Severity | Evidence |
|------|-----------------------------|---------|----------|----------|
| R-01 | Back button                 | PASS    | —        | `ResourceDetail.tsx:259-264` renders `<Button variant="ghost" data-testid="button-back">← Back</Button>` at top-left. Capture shows it at viewport top-left, identical to reference. |
| R-02 | Share button                | PASS    | —        | `ResourceDetail.tsx:293-302` renders outline `Share` with `Share2` icon at top-right. Capture matches reference exactly. |
| R-03 | Suggest Edit button         | PASS    | —        | `ResourceDetail.tsx:303-312` renders outline `Suggest Edit` with `Edit` icon adjacent to Share. Capture matches reference. |
| R-04 | Status chips                | PASS    | —        | `ResourceDetail.tsx:366-395` renders category badge (`<FolderTree>` + "Standards & Industry"), optional subcategory / sub-subcategory outline badges, and a status badge ("approved" — green pill via `bg-green-500/20 text-green-400 border-green-500/30` line 391). Capture matches reference: category badge present with same icon + label, and the "approved" pill renders green in both. |
| R-05 | OG image                    | PASS    | —        | `ResourceDetail.tsx:318-345` conditionally renders OG image with Blurhash placeholder. Resource 184739 has no `metadata.ogImage`, so both current and reference correctly omit the hero image. Verified the conditional branch is gated on `hasOgImage`. |
| R-06 | Tags                        | PASS    | —        | `ResourceDetail.tsx:458-479` renders tags as `<Badge variant="outline" border-primary/30 text-primary>#tag</Badge>`. Capture shows `#MPEG-standards`, `#video-coding`, `#media-compression`, `#documentation` as crimson outline pills — identical to reference. |
| R-07 | Related resources block     | EXTRA   | —        | Current renders a "Related Resources" `<Card>` in the right column **below** Quick Actions, with 6 items (Matroska Specification, Academy Color Encoding…, Ultra HD Forum Guidelines, W3C Media…, CMAF Specification…, ISO/IEC 14496-12…) + "View all in Standards & Industry" CTA. Reference **does not show** this block for resource 184739 — the right column ends after `Share This Page`. This is a *content* addition, not a styling regression, and the Task #31 check item explicitly listed it as expected on the current implementation; logged as EXTRA. |
| R-08 | Quick Actions sidebar       | PASS    | —        | Right-column `<Card>` titled "Quick Actions" (crimson icon eyebrow) with `Open Resource` crimson primary button + `Share This Page` outline button. Capture matches reference exactly. |
| R-09 | Two-column layout           | PASS    | —        | `ResourceDetail.tsx:316` uses `grid grid-cols-1 lg:grid-cols-3 gap-6` with main content at `lg:col-span-2` and the Quick Actions / Related sidebar at the remaining 1 column. At 1280 this renders as a 2/3 + 1/3 split exactly like reference. Collapses to a single column at < 1024 px as expected. |

## Sidebar 3rd-level accordion verification (Task #31 "Done looks like")

| ID   | Check                                 | Verdict | Severity | Evidence |
|------|---------------------------------------|---------|----------|----------|
| S-01 | Sidebar accordion 3rd-level expanded  | PASS    | LOW      | `screenshots/audit/detail/_sidebar_hls_expanded_1280.jpg` shows the left sidebar with `Protocols & Transport` (level-1) expanded, `Adaptive Streami...` (level-2) expanded, and the two leaf rows `DASH` (11) and `HLS` (18) rendered. The active rail (crimson left border + accent surface) sits on the **HLS leaf row** — confirms the 3rd-level expansion and active-rail-on-leaf behaviour required by the task. Other sibling level-2 entries (`CMAF & fMP4 Packa...`, `DASH Tools`, `HLS Manifest Parsers...`) remain collapsed as expected. |

---

## Per-route sections

### 1. Subcategory — AI & Machine Learning Tools (`/subcategory/ai-machine-learning-tools`)

| Width | Current                                                       | Reference                                                          | Verdict | Worst sev. | Findings           |
|------:|---------------------------------------------------------------|--------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/detail/subcategory-ai_400_current.jpg`     | `screenshots/audit/detail/subcategory-ai_400_reference.jpg`        | FIX     | HIGH       | D-02, D-03         |
| 768   | `screenshots/audit/detail/subcategory-ai_768_current.jpg`     | `screenshots/audit/detail/subcategory-ai_768_reference.jpg`        | FIX     | HIGH       | D-02, D-03         |
| 1280  | `screenshots/audit/detail/subcategory-ai_1280_current.jpg`    | `screenshots/audit/detail/subcategory-ai_1280_reference.jpg`       | FIX     | HIGH       | D-02, D-03, D-05   |

Side-by-side reasoning (1280): hero ("AI & Machine Learning Tools" h1 +
"Category: Media Tools" lead + count badge `7`) matches in content and
order. Top header shows breadcrumb `Home > Subcategory > Ai Machine
Learning Tools`. Body shows `← Back to Media Tools` ghost button, a
secondary breadcrumb (`home > Media Tools > AI & Machine Learning
Tools`), then the h1 row, the `Default` sort dropdown, and a 3-col grid
of 7 cards (line-clamp-2 titles, descriptions, ExternalLink icon
top-right of each title). Reference layout is identical. The sidebar
shows Media Tools expanded with AI & Machine Learning Tools highlighted
on the active rail (correctly rendered in current). Only divergences:
D-02 (cards 130-160 px vs. ref 95-110 px) and D-03 (crimson sidebar
eyebrows + brand line).

### 2. Sub-subcategory — HLS (`/sub-subcategory/hls`)

| Width | Current                                                   | Reference                                                          | Verdict | Worst sev. | Findings           |
|------:|-----------------------------------------------------------|--------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/detail/subsub-hls_400_current.jpg`     | `screenshots/audit/detail/subsub-hls_400_reference.jpg`            | FIX     | HIGH       | D-03               |
| 768   | `screenshots/audit/detail/subsub-hls_768_current.jpg`     | `screenshots/audit/detail/subsub-hls_768_reference.jpg`            | FIX     | HIGH       | D-03               |
| 1280  | `screenshots/audit/detail/subsub-hls_1280_current.jpg`    | `screenshots/audit/detail/subsub-hls_1280_reference.jpg`           | FIX     | HIGH       | D-03, D-06, D-07   |

Side-by-side reasoning (1280): hero (`HLS` h1 + count badge `18` +
`Showing 18 of 18 resources` lead) matches reference. `← Back to
Adaptive Streaming` ghost button + secondary breadcrumb (`home >
Protocols & Transport > Adaptive Streaming > HLS`) appear in the same
order as reference. 3-col grid of 18 cards renders identically. Sidebar
correctly shows the 3rd-level accordion expanded with HLS active —
matches S-01 verification.

### 3. Sub-subcategory — DASH (`/sub-subcategory/dash`)

| Width | Current                                                    | Reference                                                           | Verdict | Worst sev. | Findings           |
|------:|------------------------------------------------------------|---------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/detail/subsub-dash_400_current.jpg`     | `screenshots/audit/detail/subsub-dash_400_reference.jpg`            | FIX     | HIGH       | D-03               |
| 768   | `screenshots/audit/detail/subsub-dash_768_current.jpg`     | `screenshots/audit/detail/subsub-dash_768_reference.jpg`            | FIX     | HIGH       | D-03               |
| 1280  | `screenshots/audit/detail/subsub-dash_1280_current.jpg`    | `screenshots/audit/detail/subsub-dash_1280_reference.jpg`           | FIX     | HIGH       | D-03, D-06, D-07   |

Side-by-side reasoning (1280): identical SubSubcategory template as HLS.
Hero shows `DASH` h1 + count badge `11`. Grid renders 11 cards 3-wide.
Sidebar expansion identical to HLS state (Protocols & Transport >
Adaptive Streami... > DASH active). No DASH-specific divergence beyond
D-03.

### 4. Resource Detail — MPEG Standards Documentation (`/resource/184739`)

| Width | Current                                                          | Reference                                                          | Verdict | Worst sev. | Findings           |
|------:|------------------------------------------------------------------|--------------------------------------------------------------------|---------|------------|--------------------|
| 400   | `screenshots/audit/detail/resource-184739_400_current.jpg`       | `screenshots/audit/detail/resource-184739_400_reference.jpg`       | FIX     | HIGH       | D-03               |
| 768   | `screenshots/audit/detail/resource-184739_768_current.jpg`       | `screenshots/audit/detail/resource-184739_768_reference.jpg`       | FIX     | HIGH       | D-03               |
| 1280  | `screenshots/audit/detail/resource-184739_1280_current.jpg`      | `screenshots/audit/detail/resource-184739_1280_reference.jpg`      | FIX     | HIGH       | D-03, R-07         |

Side-by-side reasoning (1280): this is the **closest-to-reference page in
the whole audit series**. Top row: `← Back` ghost button left, `Share` +
`Suggest Edit` outline buttons right — matches reference exactly. Main
card (2/3 col): title "MPEG Standards Documentation" with `Visit
Resource` crimson primary button on the right; below it the category
pill (`📁 Standards & Industry`) + status pill (`approved` green). Then
Description section (crimson `Globe` icon eyebrow + body text), URL
section (crimson `Link2` icon eyebrow + crimson hyperlink with
ExternalLink), Tags section (4 crimson outline pills with `#` prefix),
`Added on 1/20/2026` footer with `Calendar` icon. All present and
visually aligned with reference.

Right column (1/3): Quick Actions card with `Open Resource` crimson
primary + `Share This Page` outline — matches reference. Current adds a
**Related Resources** card below Quick Actions (6 items + "View all in
Standards & Industry" CTA) that reference does not show. Logged as R-07
(EXTRA / content addition); the queued "Fix — detail surface" task
should explicitly decide whether to keep, restyle, or hide this block.

Two-column layout collapses correctly to single column at < 1024 px;
verified at 768 / 400 — main card and right-column cards stack.

---

## Findings by severity (planner intake)

- **CRITICAL (0)**: None on the detail surface.
- **HIGH (1)**: D-03 (sidebar eyebrows + brand line — recurring global
  chrome issue, owned by "Fix — sidebar/header/MainLayout chrome").
- **MEDIUM (1)**: D-02 (Subcategory / SubSubcategory card density vs.
  reference's calmer rhythm).
- **LOW (1)**: D-01 (h1 size OK).
- **NOTE / verification (4)**: D-04 (deslugify casing acceptable),
  D-05 (Subcategory breadcrumb order matches), D-06 (SubSubcategory
  breadcrumb order matches), D-07 (no view-mode toggle on subcategory
  pages, matches reference) — kept in the findings table for traceability
  but not actual deltas. S-01 (sidebar 3rd-level accordion) is PASS.
- **PASS (verified)**: R-01, R-02, R-03, R-04, R-05, R-06, R-08, R-09,
  S-01 (resource-detail "Done looks like" + sidebar accordion check).
- **EXTRA (informational)**: R-07 (Related Resources block in current,
  not in reference).

(The downstream "Fix — detail surface" task already queued by the
planner will pick these up; this audit is intentionally read-only.)

## Appendix A — full 13-row pair matrix

Strict single-row-per-pair view: 4 routes × 3 widths + 1 sidebar-state
capture = 13 rows. Paths are repo-relative under `screenshots/audit/detail/`.

| #  | Route / state                          | Width | Current                                       | Reference                                       | Verdict | Worst sev. | Findings           |
|---:|----------------------------------------|------:|-----------------------------------------------|-------------------------------------------------|---------|------------|--------------------|
| 1  | subcategory-ai                         | 400   | `subcategory-ai_400_current.jpg`              | `subcategory-ai_400_reference.jpg`              | FIX     | HIGH       | D-02, D-03         |
| 2  | subcategory-ai                         | 768   | `subcategory-ai_768_current.jpg`              | `subcategory-ai_768_reference.jpg`              | FIX     | HIGH       | D-02, D-03         |
| 3  | subcategory-ai                         | 1280  | `subcategory-ai_1280_current.jpg`             | `subcategory-ai_1280_reference.jpg`             | FIX     | HIGH       | D-02, D-03, D-05   |
| 4  | subsub-hls                             | 400   | `subsub-hls_400_current.jpg`                  | `subsub-hls_400_reference.jpg`                  | FIX     | HIGH       | D-03               |
| 5  | subsub-hls                             | 768   | `subsub-hls_768_current.jpg`                  | `subsub-hls_768_reference.jpg`                  | FIX     | HIGH       | D-03               |
| 6  | subsub-hls                             | 1280  | `subsub-hls_1280_current.jpg`                 | `subsub-hls_1280_reference.jpg`                 | FIX     | HIGH       | D-03, D-06, D-07   |
| 7  | subsub-dash                            | 400   | `subsub-dash_400_current.jpg`                 | `subsub-dash_400_reference.jpg`                 | FIX     | HIGH       | D-03               |
| 8  | subsub-dash                            | 768   | `subsub-dash_768_current.jpg`                 | `subsub-dash_768_reference.jpg`                 | FIX     | HIGH       | D-03               |
| 9  | subsub-dash                            | 1280  | `subsub-dash_1280_current.jpg`                | `subsub-dash_1280_reference.jpg`                | FIX     | HIGH       | D-03, D-06, D-07   |
| 10 | resource-184739                        | 400   | `resource-184739_400_current.jpg`             | `resource-184739_400_reference.jpg`             | FIX     | HIGH       | D-03               |
| 11 | resource-184739                        | 768   | `resource-184739_768_current.jpg`             | `resource-184739_768_reference.jpg`             | FIX     | HIGH       | D-03               |
| 12 | resource-184739                        | 1280  | `resource-184739_1280_current.jpg`            | `resource-184739_1280_reference.jpg`            | FIX     | HIGH       | D-03, R-07         |
| 13 | subsub-hls / sidebar accordion expanded| 1280  | `_sidebar_hls_expanded_1280.jpg`              | `subsub-hls_1280_reference.jpg`                 | PASS    | LOW        | S-01               |

## Appendix B — Reference reuse rationale

Identical to Appendix B of `_planning/AUDIT_LANDING.md` and
`_planning/AUDIT_CATEGORY.md`. Reference image filenames at 400 / 768 /
1280 for the same route are intentionally byte-identical copies of the
desktop PNG from `awesome-list-site-ds/uploads/`, per
`_planning/REFERENCE_MAP.md` ("Use the PNGs in `uploads/` as the
authoritative reference; only fall back to live-rendering the bundle
when a PNG is missing or you need a hover/focus state"). Findings tagged
`Width = 400 / 768` are scored against the responsive collapse of the
*current* app and only record divergences that would also be flagged at
1280.
