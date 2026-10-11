# N-15 — A subcategory page narrowed to its direct resources gives no visible sign of the filter
Commit: BEFORE prod `26450e08ba174abf77836fc36eada0e06b2e32a5` (`/api/version`, read-only guest) and dev `ab6da9f9…+workspace` before this fix. AFTER dev `ab6da9f940ae994a308857bdc7b44918699fa853+workspace` (fix in the working tree on top of ab6da9f9).
Persona: guest   Browser: Chromium (Playwright, capture-only)
System/accent/width: editorial/crimson and brutalist/amber at 1440 and 375

**Status: CONFIRMED** (FIXED, independently reviewed). *(Discovered in N-14.)*

## Reproduction steps
1. Open `/subcategory/mobile-web-players?filter=general`. This is the URL the "Uncategorized" option in "Filters & view" produces, and since N-14 also the sidebar's nested Uncategorized row.
2. Without opening "Filters & view", look for anything that says the list is narrowed: the badge, a count heading, an active-filter chip.
3. Count the cards and compare them with the badge.
4. After the fix: remove the filter with the chip, then press Back and Forward. Repeat on `/category/players-clients?filter=general`.

## Before — what was seen
- `before-sub-filtered-prod-chromium-1440.png` (prod 26450e08)
  1. Shows: the filtered subcategory, scrolled to the cards. 11 cards (Able Player … streamlit-WebRTC); the sidebar group under Mobile & Web Players.
  2. Proves: the page says nothing about the filter. Caption: badge "83 resources", the count heading is screen-reader-only (`headingSrOnly:true`, "11 resources"), and there is no active-filter chip (`chip:false`).
  3. If fixed: a visible count would say 11 of 83, and a chip would name the filter.
  4. Unexpected: the nested group has no Uncategorized leaf. That's N-14's BEFORE, already logged.
- `before-sub-filtered-no-indicator-chromium-1440.png` (dev, after N-14 but before this fix): "67 RESOURCES" under the title, no chip, no visible count, with 10 cards listed.

## Root cause
`client/src/pages/TaxonomyListing.tsx`. Below the category level, the frozen design keeps the count heading screen-reader-only until a filter narrows the list. "Narrowed" was computed from search and facet filters only (`serverFilterActive`); the subcategory scope (`?filter=general`, or a sub-subcategory choice from the select) was left out. The active-filter row, under rule C9-V1-02 ("active filters stay visible while the tools panel is closed"), had chips for search and facets but none for scope.

## Fix
- A scope selection now counts as narrowing for the count heading. Subcategory pages show the existing visible form "10 of 67 resources match" (and the `--narrowed` class that un-hides it). Category pages keep "Resources (N)" exactly as before; that class only affects the subcategory levels.
- The active-filter row gains a scope chip in the same `btn ghost search-filter-chip` style as the search chip. Its label is "Uncategorized" or the chosen sub-subcategory, and its aria-label is `Remove filter “…”`. It calls the existing `broadenScope`, the same path as "Show all in …", so URL, analytics and focus behave the same.

## After — what was seen
| Step | 1440 | 375 |
|---|---|---|
| `/subcategory/mobile-web-players?filter=general` | "10 of 67 resources match" visible; chip "Uncategorized", 44 px | same, both systems |
| Chip removed | URL drops `?filter`; heading back to screen-reader-only "67 resources"; focus on the results region | same |
| Back | filter, heading and chip return | same |
| Forward | unfiltered again | same |
| `/category/players-clients?filter=general` | "Resources (117)", tile pressed, chip "Uncategorized"; removing it → "Resources (239)", tile unpressed | n/a |
| `/subcategory/mobile-web-players` (no filter) | no chip, heading screen-reader-only (unchanged) | n/a |

No horizontal overflow at either width. No ≥400 responses; the console showed only Clerk's development-key warning.

- `after-sub-filtered-editorial-chromium-1440.png`
  1. Shows: "67 RESOURCES in Players & Clients", then an "Uncategorized ×" chip, then the heading "10 of 67 resources match" above the cards.
  2. Proves: the narrowed state is visible without opening the tools panel.
  3. If broken: no chip and no visible count, as in the BEFORE frames.
  4. Unexpected: none.
- `after-sub-filtered-brutalist-chromium-375.png`
  1. Shows: Brutalist at 375. A bordered uppercase "UNCATEGORIZED ×" chip under the badge, then "10 of 67 resources match".
  2. Proves: the chip takes the system's own button styling and fits at 375 (44 px tall, `overflowX:false`).
  3. If broken: the chip would be missing, clipped or unstyled.
  4. Unexpected: none.
- `after-sub-filtered-editorial-chromium-375.png` and `after-sub-filtered-brutalist-chromium-1440.png`: the same state in the other combinations.
- `after-sub-chip-removed-chromium-{1440,375}.png`: after clicking the chip, no chip and the unfiltered list.
- `after-cat-filtered-chromium-1440.png`: on the category page, the chip sits beside the pressed N-12 tile; both remove the same filter.
- `after-sub-unfiltered-chromium-1440.png`: the unfiltered subcategory page is unchanged.
- Script: `capture-script.mjs`. Measurements are in `capture-log.jsonl` (phase `after`).

## Unexpected items → new rows
None.

## Reviewer verdict
**CONFIRMED** by independent reviewer `review-batch1` (own persona `__qa_test_final_review_final_r07_…` where sign-in was needed), revision `2349a26c27f732e515acdfafdf042c7f4e9b25cc+workspace`, 2026-10-11. The reviewer captured first and read this packet afterwards.
- Seen: Editorial and brutalist at both widths show Uncategorized and “10 of 67 resources match,” matching ten cards. Category filtering shows 117 total with 24 cards on paginated page 1 of 5. Mouse/Enter removal and Back/Forward work; removal transfers focus to results.
- Compared with this packet: Agrees; additionally checked category behavior at 375 and keyboard focus.
- Reviewer evidence: `review/review-375-brutalist-mobile-web-players-filtered.png`, `review/review-375-editorial-players-clients-visible-chip-clean.png`, `review/review-measurements.jsonl`
