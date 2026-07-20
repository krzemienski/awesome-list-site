# VG-017 — BUG-017 (LOW): /advanced touch targets under 24×24 CSS px

## Root cause
Three classes of undersized targets at a real 375×812 mobile viewport:
1. **shadcn Checkbox default `h-4 w-4` (16×16)** — used verbatim on the explorer "Show subcategories" toggle, the Export tab's category-filter grid, and the AI Recommendations goal/type checkbox groups.
2. **Pseudo-element hit-area hack didn't count** — the run18 BUG-048 fix enlarged the *hit area* of the export content-option + AI category checkboxes via a centered 24px `before:` pseudo-element, but the element's own bounding rect stayed 16×16, which is what target-size audits measure.
3. **Explorer resource links ~17px tall** — bare inline anchors sized by line-height.

## Fix
- All /advanced checkboxes now render a real 24×24 box (`className="h-6 w-6"`, merged over the base `h-4 w-4` via `cn`): `category-explorer.tsx` (Show subcategories), `export-tools.tsx` (4 content options — pseudo-element hack replaced — + category filter map), `ai-recommendations-panel.tsx` (category/goal/type groups).
- Explorer resource links: `inline-flex min-h-6 items-center` so the anchor box is ≥24px tall.

## Live evidence (dev, real browser @ 375×812 — 6/6 PASS)
Bounding-rectangle log for every actionable target on all four tabs: `bug017-rects.log`.
- tab=explorer: 173 targets, 0 under 24×24
- tab=Metrics: 30 targets, 0 under 24×24
- tab=Export: 47 targets, 0 under 24×24
- tab=AI Recommendations: 52 targets, 0 under 24×24
- **Adjacent controls usable**: `#descriptions` toggled checked→unchecked→checked while neighboring `#tags` never changed state.
- **Export still works through the real interface**: clicking the export button produced a real download — `awesome-video.md`, 588,490 bytes.

Exclusion criteria (documented, not offenders): Radix form shims — `aria-hidden="true"` native `<input>`/`<select>` mirrors with `pointer-events: none` and `tabindex="-1"` that exist only for form autofill/submission and are not actionable by users.

Screenshots: `bug017-explorer.png`, `bug017-metrics.png`, `bug017-export.png`, `bug017-ai-recommendations.png`.

**Verdict: PASS**
