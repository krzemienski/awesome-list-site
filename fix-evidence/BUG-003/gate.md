# VG-003 — Card title clipping on taxonomy pages (BUG-003) — PASS

**Finding**: At 1024px (lg), category-page resource-card titles were clipped
mid-word/mid-line — 9/12 visible titles X-clipped on /category/encoding-codecs
(before: `vg003-probe-1024.png`). Root causes:

1. **Grid squeeze**: `lg:grid-cols-3` beside the pinned 256px sidebar left
   ~229px cards / ~65px heading widths at 1024–1279px.
2. **line-clamp defeated by inline-block child**: the title `h2`/`span`
   carried `line-clamp-2`, but the text inside is wrapped in an
   `inline-block` anchor (run16 BUG-049 hit-box). A block-level child inside
   a `-webkit-box` defeats `-webkit-line-clamp` — all lines render with no
   ellipsis (verified live: 3-line titles at 1024/1440 even after grid fix).
3. `leading-none` on the Category h2 vertically shaved descenders on line 2.

**Fixes** (client-only, no server/schema changes):
- `Category.tsx`, `Subcategory.tsx`, `SubSubcategory.tsx` grid:
  `lg:grid-cols-3` → `lg:grid-cols-2 xl:grid-cols-3`.
- Clamp moved onto the anchor itself (replacing `inline-block` — line-clamp's
  box is block-level so the BUG-049 py-1/-my-1 ≥24px hit-box holds):
  - `Category.tsx` inline `titleAnchor(label, clampClass)` + both call sites
    (full-card h2, compact span); h2 `leading-none` → `leading-snug`.
  - `ResourceCard.tsx` title Link/anchor → `line-clamp-2 break-words`.
  - `resource-view-modes.tsx` `titleAnchor(..., clampClass)`; compact-card
    span passes `line-clamp-2 break-words`; list-row keeps `inline-block`
    (single-line `truncate` layout, unchanged).

**Gate evidence** (live dev, Playwright, 24 title anchors sampled/route):

/category/encoding-codecs — 375/768/1024/1100/1200/1279/1440px:
`xClipped=0`, `over2Lines=0` at ALL widths (raw JSON in probe output;
screenshots `vg003-final-*.png`). Computed style on anchor:
`-webkit-line-clamp: 2`, `-webkit-box-orient: vertical`, `overflow: hidden`,
scrollHeight 82 > clientHeight 58 → truncation active with ellipsis
(visible in `vg003-final-1024.png`: "AMD Advanced Media Acceleration…").

/subcategory/encoding-tools + /sub-subcategory/ffmpeg — 375/768/1024/1279/1440px:
`xClipped=0`, `over2=0` at all widths (ResourceCard path;
`vg003-subcategory-1024.png`, `vg003-sub-subcategory-1024.png`).

**Before**: `vg003-probe-1024/1100/1200/1279.png` (9/12 titles clipped @1024).

**Verdict: PASS** — titles wrap at word boundaries, clamp at 2 lines with
ellipsis, no horizontal or vertical clipping at any tested width; full title
remains available via the native `title` tooltip.
