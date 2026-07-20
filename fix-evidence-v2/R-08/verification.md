# R-08 — Unified card component on category pages (LOW, relates BUG-024)

**Date:** July 20, 2026 · **Status:** FIXED · **Verified live against dev**

## Change

`client/src/pages/Category.tsx` previously rendered its own bespoke inline card
markup for all three view modes (grid/list/compact) — external-link + suggest-edit
only, no favorite/bookmark/Open-Link. It now renders the SAME shared trio used by
/subcategory and /sub-subcategory:

- grid → `ResourceCard` (favorite, bookmark, Open Link, Suggest Edit, View Details,
  interactive tag pills wired to the page's tag filter via `onTagClick`)
- list → `ResourceListRow`
- compact → `ResourceCompactCard`

~300 lines of duplicated inline card markup deleted, along with the now-dead
page-level suggest-edit dialog state (`ResourceCard` owns its own dialog),
`expandedTagCards` state, `toDbResource`/`handleSuggestEdit` helpers, and unused
imports. tsc clean.

## Evidence (probe.mjs, dev, 1440×900)

| Feature (first card) | /category/community-events | /subcategory/encoding-tools |
|---|---|---|
| favorite button | true | true |
| bookmark button | true | true |
| Open Link button | true ("Open Link") | true ("Open Link") |
| suggest edit | true | true |
| View Details link | true | true |
| title is real anchor | true | true |

PARITY verdict: **true** (all five affordances identical).

- List view: 24× `row-resource-*` (shared `ResourceListRow`); compact view: 24×
  `compact-resource-*` (shared `ResourceCompactCard`) — same testid families the
  subcategory pages emit.
- Tag pill still filters: clicking `#AOSP` → "Showing 1–24 of 80 resources" →
  "Showing 1–1 of 1 resource (1 tag)".
- Cards carry real DB ids (`card-resource-185563`) so title anchors go to
  /resource/:id (memory: the static tree carries real numeric DB ids).

Screenshots: `r08-category-grid.png`, `r08-subcategory-grid.png`,
`r08-category-list.png`, `r08-category-compact.png`.
