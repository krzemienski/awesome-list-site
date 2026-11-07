# ux-public-core, cycle 04 (rev 582bdf67 at start and end): ISSUES, 1 new LOW (PC-24); PC-12 is the owner's decision

| id | sev | where | saw vs expected | source |
|---|---|---|---|---|
| PC-24 | LOW | `/`, `/category/*`, `/sub-subcategory/*` at 390 and 1440 | The header "Browse" link (/categories) has aria-current="page" on routes that aren't /categories, so screen readers announce the wrong current page. Expected: aria-current on /categories only. Seen in the hydrated DOM. | header nav active-match logic |
| PC-12 | LOW | /resource/190151 | MirrorFly is still live. Owner content decision. | content |

## Re-checks

- **Fixed:** PC-10, PC-13, PC-14, PC-15, PC-17, PC-18, PC-19, PC-20 (DOM only), PC-21, PC-22, PC-23 (sticky at 1440×900, 1366×768 and 1280×720), and PG-02/03.
- **PC-16:** fixed, checked by emulation only.

## Passed

- **#82 back-to-top regression sweep:** run at 1440, 1366, 1280, 1024, 820, 390 and 375. No covered elements and no horizontal overflow.
- **#80 card titles:** 44px or more on touch.
- **Filters, sort and paging:** the Filters sheet, sort, paging (clamping and 404s), card focus order and keyboard route focus all work.
- **Drawer at 390:** every control is at least 44px.

## UNVERIFIED

- Real devices and screen readers.
- The rail at widths between 1100 and 1250.
- Closing the drawer by tapping the backdrop.
- A full touch sweep of sub-subcategory pages.
- PC-01 to PC-09 and PC-11.
- The indexed count moved from 3,825 to 3,826 during the run, probably another slice's QA row. The lead is checking.
