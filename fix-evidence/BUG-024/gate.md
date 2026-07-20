# VG-024 — BUG-024 (LOW) — Taxonomy levels use two card designs

**Verdict: PASS (11/11)** — July 20, 2026, live dev app (`http://localhost:5000`), Playwright Chromium.

## Fix
- New shared `client/src/components/ui/taxonomy-card.tsx` (`TaxonomyCard`): icon tile 32×32 (accent-tinted), two-line wrapping title + chevron affordance (NB-017), labelled "N resources" count caption (NB-037), optional `extra` slot for level-specific content, focus-visible ring on the link wrapper.
- `client/src/pages/Home.tsx` category grid converted to `TaxonomyCard` — preserves the `?tags=` drill-down href (run14 BUG-025), aria-label with count, `link-category-*` / `badge-count-*` testids, and the "Featured: …" teaser (run19 BUG-016) via the `extra` slot.
- `client/src/pages/Categories.tsx` grid converted to the same component — keeps `getCategoryIcon`, slug fallback, `category-card-*` testids. Dead imports (Card*, ChevronRight, Link) removed from both pages.
- `tsc --noEmit` clean.

## Gate checks (all PASS)
| Check | 375px | 768px | 1024px | 1440px |
|---|---|---|---|---|
| Home & Categories cards share structure/spacing/typography (padding, title 16px/600, icon tile 32×32, chevron, count caption) | PASS (16px) | PASS (20px) | PASS (20px) | PASS (20px) |
| No clipping / horizontal overflow regression | PASS | PASS | PASS | PASS |

- Level-specific counts correct vs live `/api/awesome-list` tree: **9/9 categories match** (badge = full nested total).
- Home level-specific teaser preserved: 8 teaser blocks render.
- Interaction unchanged: first Home card click navigates to `/category/community-events`.

## Evidence
Screenshots: `bug024-home-{375,768,1024,1440}.png`, `bug024-categories-{375,768,1024,1440}.png` (this directory).
Probe script output: PASS 11/11 (structural parity computed from live `getComputedStyle`, not source inspection).
