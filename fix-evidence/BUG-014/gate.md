# VG-014 — BUG-014 (MEDIUM): Sticky header never sticks

## Root cause
`AppHeader` is `position: sticky; top: 0`, but two of its ancestors in `client/src/components/ui/sidebar.tsx` carried `overflow-x-hidden`:
- the `SidebarProvider` wrapper (`group/sidebar-wrapper …`), and
- `SidebarInset` (the chrome column that directly contains the header).

`overflow-x: hidden` turns an element into a scroll container (its `overflow-y` computes to `auto`), so the header was sticking to a scrollport that never scrolls — the page scroll happens on `body`. The header therefore scrolled away with content.

## Fix
Both ancestors now use `overflow-x-clip` — identical horizontal clipping, but `clip` does **not** create a scroll container, so sticky resolves against the viewport. (Same pattern already used app-wide in `scrolling-fix.css` for `html/body/#root`.)

## Live evidence (dev, real browser)
Scroll test — goto route, record header rect, scroll 900px (or to page bottom), re-measure:

| Route | Viewport | position | header top after scroll | scrolled Y | visible | hit-test inside header |
|---|---|---|---|---|---|---|
| / (home) | 1440×900 | sticky | 0 | 321 (page bottom) | yes | yes |
| / (home) | 375×812 | sticky | 0 | 900 | yes | yes |
| /category/community-events | 1440×900 | sticky | 0 | 900 | yes | yes |
| /category/community-events | 375×812 | sticky | 0 | 900 | yes | yes |
| /resource/186111 | 1440×900 | sticky | 0 | 689 (page bottom) | yes | yes |
| /resource/186111 | 375×812 | sticky | 0 | 900 | yes | yes |

- `top` = 0 after scrolling on every route/width; `elementFromPoint` at the header's center resolves inside the header (usable, nothing overlays it).
- Screenshots (top + scrolled per route/width, 12 total) inspected — header visibly pinned with content scrolled beneath (see `bug014-category-desktop-scrolled.png`, `bug014-home-mobile-scrolled.png`).

Horizontal overflow sweep — 3 routes × {320, 375, 768, 1024, 1440, 1920}px:
- 18/18 checks: `document.scrollWidth ≤ clientWidth` — **zero horizontal overflow** introduced by the clip change.

## Checks
- tsc --noEmit: clean (checked with BUG-013 batch; sidebar.tsx change is class-string only).

**Verdict: PASS**
