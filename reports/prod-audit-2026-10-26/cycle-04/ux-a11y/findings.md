# ux-a11y, cycle 04 (rev 582bdf67, signed out): ISSUES, 1 LOW (PG-08 still open)

| id | sev | URL | width | saw vs expected | source |
|---|---|---|---|---|---|
| PG-08 | LOW | /tag/hls#related-topics-heading → /categories → Back | 820 touch | Focus lands on H2#related-topics-heading, but scrollY is 0 and the heading's top is at 8436px, so focus is far off-screen. Expected: the focused heading is in view, or scroll and focus agree. In cycle 3 the scroll was restored to 19px, which suggests the first fragment load never scrolled to the heading either. | client/src/lib/nav-history.ts (back + fragment) |

## Re-checks
- **PG-10 FIXED:**
  - Keyboard: the ring shows. Pointer: no ring. Checked in editorial and Geist at 1440 and 390, and editorial at 820.
  - The ring also shows after back-to-top and after offline reconnect.
- **Also fixed:** PG-04, PG-05, PG-06, PG-07, PG-09 and OF-01.
- **PG-01..03:** observed working, but not re-driven in detail.

## Passed
- **#81 Alert:** static notices are role=note. Notices after an action are announced: the bookmark toast and the contact errors.
- **#80 Checkbox:** the focus ring is visible at 390.
- **Contrast:**
  - 0 failures on home, tag, resource, search, about and category pages across 6 accent/system combinations. The only sub-4.5 text is the disabled /submit form, which is WCAG-exempt.
  - The site is dark-only.
- **Reduced motion:** OK.
- **Landmarks and headings:** OK.

## UNVERIFIED (to cycle-5 brief)
- Switch focus ring (no signed-out Switch).
- Screen-reader speech.
- Geist pointer at 820.
- Offline at 820.
- Accents lime, rose, emerald, amber and matrix.
- Favorite toast.
