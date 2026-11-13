# ux-public-core, cycle 05 (rev 63a1c79d), run A: PARTIAL, 0 findings in the covered scope (not a pass)

## Covered
- **PC-24 fixed.** Browse has aria-current "page" on /categories, and "true" on /, category and sub-subcategory pages.
- **PC-20.** Confirmed in the DOM of the 390 drawer.
- **Drawer backdrop close at 390.** Tested with synthetic events: the scroll lock is released and focus returns to the toggle.
- **Drawer open at 390.** All controls are ≥44px.
- **Sub-subcategory touch sweep at 390.** Clean, apart from breadcrumb links: their spacing exception was not measured.
- **Curated home at 390.** Featured titles sit under the card's tap overlay, so they are exempt.
- **Rail at 1100×800.** Sticky, and back-to-top covers nothing.

## Not run (sent to runs B and C)
- **Re-checks:** PC-01 to PC-23 and PG-02/03, apart from PC-20 and PC-24.
- **Pages:** resource, tag, subcategory, and category sort and paging.
- **Filters sheet.**
- **Back-to-top and consent regression sweep.**
- **Card hover and touch.**
- **Route focus and scroll** across link, keyboard, Back, Forward, fragment and first load.
- **Error and offline pages.**
- **Viewports:** the rail at 1250, full sweeps at 1440 and 820, reduced motion.
- **Breadcrumb spacing exception.**

## Run C (rev 63a1c79d at start and end): 0 findings, all scoped items run
- **Route focus and scroll matrix at 1440 and 390:** PASS.
  - Keyboard navigation draws a ring and pointer navigation does not.
  - Focus always lands on an element that is in view, or on BODY.
  - Back restores the saved scroll.
  - On first load, a fragment scrolls to its target and focuses it with a ring.
- **PS-22 offline auto-recovery:** 3 of 3 runs recovered in about 0.5s with no click.
- **404:** returns HTTP 404 with noindex, and the controls are 44px.
- **Rail at 1250×720 and 1200×700:** sticky, with the last link reachable.
- **Target sweeps:** / and a category page at 1440 and 820 touch, 0 fails. Sub-24px links pass by the spacing exception. The breadcrumb is sr-only, which closes run A's open note.
- **Reduced motion:** 0 animations, and scroll-behavior is auto.
- **UNVERIFIED (to the cycle-6 brief):**
  - First load with no fragment at 390.
  - The fragment → page → Back sequence at 390 using the keyboard.
  - Offline at 390 and 820.
  - Retry while offline on the "You're offline" surface.

## Run B (rev 63a1c79d at start and end): PARTIAL, 1 new LOW finding
| id | sev | where | saw vs expected | source |
|---|---|---|---|---|
| PC-25 | LOW | Filters sheet on /category/players-clients, 820 touch | The tag list overflows the sheet. The sticky footer's Done button sits about 36px above the sheet bottom, so a tag row shows below the footer. Expected: the footer is flush with the bottom and nothing shows below it. | SearchFilters.tsx footer (`sticky bottom-0 -mx-6 mt-6` inside a `p-6` sheet) |

- **Fixed:** PC-01, PC-08, PC-10, PC-14, and PC-11 in part.
- **Still open:** PC-12 (owner).
- **Passed:**
  - Back-to-top and banner sweep: 3 pages × 6 widths, no hits, no overflow, and a 12px gap above the banner.
  - Resource page at 1440.
  - Category paging, typed jump and sort at 1440 and 820.
  - 820 target audit.
  - Breadcrumb spacing exception at 390.
- **UNVERIFIED (to a run-D gap auditor):**
  - Re-checks not done: PC-02 to PC-07, PC-09, PC-13, PC-15 to PC-19, PC-21 to PC-23, PG-02 and PG-03.
  - Pages not done: resource page at 820/390, tag page sweep, subcategory pages, category page at 390.
  - Card hover and touch, and focus rings.

## Run D (rev 63a1c79d): 0 new findings, all scoped items run
- Fixed: PC-02, 03, 04, 05, 06, 07, 09, 13, 15, 16, 17, 18, 19, 21, 22, 23, plus PG-02 and PG-03 (PG-03 checked from DOM and a11y order).
- Passed: resource page at 820 and 390; /tag/hls at 820 and 390, including paging focus; /subcategory/codecs at all widths; category page at 390 with sort, paging and filters; card focus rings.
- UNVERIFIED, carried to cycle 6: a Tab-key walk of a card; the 820 sheet after the PC-25 fix (#97); tag typed jump.
