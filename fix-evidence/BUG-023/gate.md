# VG-023 — BUG-023 (LOW): Mobile breadcrumb clips the current item

## Root cause
The page-level (mobile-only, `md:hidden`) `Breadcrumbs` component rendered a single non-wrapping flex row (`flex items-center space-x-1`). At 375px, deep trails with long labels overflowed the row and silently clipped the current item.

## Fix
`client/src/components/ui/breadcrumbs.tsx`: the trail now wraps (`flex-wrap` + `gap-x-1 gap-y-0.5`); each crumb keeps `min-w-0 max-w-full break-words`, separators/home icon are `shrink-0`. Every crumb — including the current page — remains fully readable across as many lines as needed; no horizontal scrolling is introduced.

## Live evidence (Playwright @375px mobile emulation, 11/11 PASS)
Worst-case trail chosen programmatically from the live tree — `/sub-subcategory/cdn-integration` ("Infrastructure & Delivery › CDN Integration & Distribution › CDN Integration", 70 combined chars) plus a second representative route:
- Current item not clipped: `scrollWidth <= clientWidth`, fully inside the viewport on both routes (`bug023-cdn-integration-375.png`, `bug023-community-groups-375.png`).
- Full trail accessible: breadcrumb nav has zero internal clipping (wrapped rendering).
- No horizontal page overflow: `document.scrollWidth - innerWidth = 0` on both routes.
- Links usable: every crumb link in-viewport; real tap on "Infrastructure & Delivery" navigated to `/category/infrastructure-delivery` (`bug023-after-tap.png`).

**Hygiene**: read-only probes, no data created.

**Verdict: PASS**
