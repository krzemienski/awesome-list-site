# D-12 — The mobile drawer's close button covers the counts of rows scrolled under it
Commit: dev `ab6da9f940ae994a308857bdc7b44918699fa853+workspace` (BEFORE frames taken with the N-14 working tree; AFTER with the fix below on top)   Persona: guest   Browser: Chromium (Playwright, capture-only)
System/accent/width: editorial/crimson and brutalist/amber at 375 and 768

**Status: CONFIRMED** (FIXED, independently reviewed). *(Discovered in N-14; predates it, since the close button and drawer scroll geometry were untouched by that change.)*

## Reproduction steps
1. At 375×812 (and at 768×1024), open `/category/players-clients` and tap "Toggle sidebar".
2. Scroll the drawer list until a category row sits at the top, under the close button (X).
3. Read that row's count.
4. After the fix, also open the drawer on `/subcategory/video-codec-specifications`, whose active row sits below the fold. The drawer should scroll it into view on open.

## Before — what was seen
- `before-drawer-close-over-count-brutalist-chromium-375.png`
  1. Shows: the drawer scrolled to Players & Clients. The bordered close button floats on top of the "General Tools" row, and that row's "134" count is hidden behind it.
  2. Proves: the close button stays fixed while the list scrolls underneath, so it covers list content and the count can't be read.
  3. If fixed: the close button would leave with its header row, and every count would stay readable.
  4. Unexpected: none beyond this row.
- `before-drawer-close-over-count-editorial-chromium-375.png`: the same overlap in Editorial. The X is borderless there, so "134" is partly visible around it.

## Root cause
In the frozen reference (`awesome-list-site-ds-20260929/layout.jsx` MobileDrawer and `styles.css` `.mobile-drawer`), the drawer element itself is the scroller (`overflow-y: auto`) and the close button sits inside the header row, so it scrolls away with the header. The app's drawer (`client/src/components/ui/sidebar.tsx`) keeps the Radix close button as a sibling of the navigation, absolutely placed at `top: 10px` against the fixed drawer. Scrolling was moved to the inner `[data-sidebar="drawer-navigation"]` element (`client/src/styles/shell/drawer.css` and `shell/sidebar.css`), so the header scrolled away while the close button, anchored to the non-scrolling drawer, stayed put on top of the rows.

## Fix
CSS only, no markup, focus-order or landmark change:
- `shell/drawer.css`: `.av-sidebar-drawer` becomes the scroller (`overflow-y: auto; overflow-x: clip`), as `.mobile-drawer` is in the reference. The navigation column keeps its natural height (`flex: 0 0 auto; min-height: 100%`), so the footer still ends the list.
- `shell/sidebar.css`: removed the drawer-only `overflow-y: auto` on the navigation, which would otherwise keep the inner scroller.

The close button's containing block is now the scrolling element, so it moves with the header row. The deep-link reveal (`revealInSidebarScrollport`) already searches for the nearest scrolling ancestor and needs no change.

## After — what was seen
| Width / system | Opened | Scrolled to Players & Clients | End of list | Close |
|---|---|---|---|---|
| 375 editorial | X in the header (top 10, header 0), no count under it | drawer scrollTop 432, X at −422 with its header (−432), **0 counts under the X** | footer bottom 812 = drawer bottom | drawer closes, focus back on "Toggle sidebar" |
| 375 brutalist | same | scrollTop 430, X at −420, 0 counts under it | 812 = 812 | same |
| 768 editorial | same | scrollTop 220, X at −210, 0 counts under it | 1024 = 1024 | same |
| 768 brutalist | same | scrollTop 218, X at −208, 0 counts under it | 1024 = 1024 | same |

The inner navigation no longer scrolls (scrollTop 0, overflow visible); the drawer does. No console errors apart from Clerk's development-key warning.

Deep-link reveal: on `/subcategory/video-codec-specifications`, the drawer opens already scrolled (375: scrollTop 223; 768: 11) with the active "Video Codec Specifications 11" row on its bottom edge (375: top 768, bottom 812 of 812; 768: 980–1024 of 1024). This is the same `block: nearest` behaviour as before, now applied to the drawer.

- `after-drawer-scrolled-brutalist-chromium-375.png`
  1. Shows: the drawer scrolled the same way as the BEFORE frame, with "General Tools 134" as the top row and Players & Clients open below. No close button on screen.
  2. Proves: the count the X used to hide is readable; caption `countsUnderClose: []`, close at −420 with its header.
  3. If broken: the X would sit over "134" again.
  4. Unexpected: none.
- `after-drawer-opened-editorial-chromium-375.png`
  1. Shows: the drawer just opened. The logo, wordmark and X share the header row; search, Home/Submit/About and the categories follow.
  2. Proves: at the top of the list the X is still where the reference puts it, so the header is unchanged.
  3. If broken: the X would be missing or out of line with the wordmark.
  4. Unexpected: none.
- `after-drawer-deeplink-reveal-chromium-375.png`: opened on the deep subcategory link, already scrolled to Standards & Industry. The active row sits under the caption band at the very bottom, so the caption's measurement is the proof for that row.
- The other `after-drawer-{opened,scrolled}-{system}-chromium-{375,768}.png`, `after-drawer-end-brutalist-chromium-{375,768}.png` and `after-drawer-deeplink-reveal-chromium-768.png` frames show the same states. Measurements are in `capture-log.jsonl` (phases `after`, `after-reveal`).
- Scripts: `capture-script.mjs`, `capture-script-reveal.mjs`.

## Unexpected items → new rows
None.

## Reviewer verdict
**CONFIRMED** by independent reviewer `review-batch1` (own persona `__qa_test_final_review_final_r07_…` where sign-in was needed), revision `2349a26c27f732e515acdfafdf042c7f4e9b25cc+workspace`, 2026-10-11. The reviewer captured first and read this packet afterwards.
- Seen: Both systems and widths scroll the X away with the header; top-row counts remain readable. Opening the deep link reveals Video Codec Specifications at the bottom edge, and the footer is reachable. X closes the drawer and returns focus to Toggle sidebar.
- Compared with this packet: Same outcome; retained expanded groups produce larger scroll offsets. Clean supplemental screenshots expose the active row and footer without caption obstruction.
- Reviewer evidence: `review/review-375-editorial-scrolled-clean.png`, `review/review-375-brutalist-active-on-open-clean.png`, `review/review-768-brutalist-footer-clean.png`, `review/review-measurements.jsonl`
