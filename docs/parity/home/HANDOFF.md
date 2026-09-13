# Home Index / Curated integration handoff

## Owned implementation

- Home uses the live navigation tree, the existing full-set kind counts endpoint,
  and a bounded new `/api/home` feed. Index is the default. Curated has no hero.
- Kind chips filter Home by `resolvedKind`; the full-set count labels do not
  change. The corpus is fetched only after kind/tag filtering is activated.
- Real approval/creation dates order recent items. The rolling seven-day metric
  uses `coalesce(approved_at, created_at)` for legacy imports lacking approval
  timestamps. Edited resources do not become newly indexed.
- Home totals intentionally equal `/api/resources` and kind counts, per the
  acceptance contract. SEO continues to use the unchanged deduplicated nav
  totals. If normalized-URL duplicates exist these totals can differ; this task
  does not redefine the catalog API's count semantics.
- Empty featured data is stated explicitly rather than replaced with mock picks.
- Existing tag/sort and account surfaces remain available through the bottom
  Quick access links. Optional account widgets are contextual rather than
  inserted into the canonical default layout.

## Applied integration changes

1. `/settings` mounts `HomeLayoutPreferenceControl` for visitors and signed-in
   users. Home still has no forbidden layout toggle.
2. Aggregate inventory now uses `/?layout=index|curated`; Curated keeps only its
   reference-side action. Generated inventory was refreshed.
3. `docs/api/openapi.yaml` and the route baseline include `/api/home`.
4. **Migration integration:** retain the journaled idempotent
   `0049_home_layout_preferences.sql`. It was applied only to development for
   verification. No production data or deployment was changed.
5. **Kind drilldown:** Home category/subcategory links retain supported tag
   filters. Kind filtering is currently Home-scoped; listing routes do not
   implement kind filtering, so Home does not append a misleading ignored kind.

## Visual eligibility and remaining closure

These rows remain **pixel**, not token-only. No ceiling, threshold, canvas,
masking, or cropping rule was relaxed.

The existing full-page harness measured Index at **14.3547% (375)** and
**25.0419% (768)**, both failures against 0.5%. It was interrupted by the shell
time limit while working on 1024, so 1024/1440 do not have valid pixel verdicts.
Curated is blocked in that harness at all four widths by its obsolete action.
The interrupted run's own disposable account was removed from both stores;
no broad cleanup of another worker's identity was performed.

The independent live-browser evidence includes both layouts at all four widths
for visitors and a disposable administrator named Nick. Those are functional
captures, **not frozen-clock pixel passes**. Do not use them to claim the
two-pass Curated rule or final full-page parity. The current shell/sidebar/footer
are visibly different from the reference and require the planned integration.
Home's real empty featured state, real rolling metric, real recent ordering,
real taxonomy size, clickable kind buttons, and bottom utility links are
intentional data/behavior differences that the reference binding must account for.

Still required at final integration: merge the canonical footer/shell leaves,
then close the full-page pixel rows and reassess production link-count
equality. Loading anchors and Lighthouse are measured and pass; the production
comparison is measured and fails link equality. Curated has completed its
required second measured pass after the real Home feed was bound into the
reference adapter.

See `page-notes.md`, `preferences-notes.md`, and the evidence directory for
implementation details and observed checks. A listed handoff is not a passing gate.