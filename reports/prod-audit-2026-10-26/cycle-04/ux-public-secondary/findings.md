# ux-public-secondary, cycle 04 (rev 582bdf67, signed out): ISSUES, 1 LOW (PS-16 partly open)

| id | sev | URL | width | saw vs expected | evidence | source |
|---|---|---|---|---|---|---|
| PS-16 | LOW | /search?category=encoding-codecs&sort=bogus | 1440 | The invalid-filters state shows the chip "Category: encoding-codecs" (raw slug). With a valid sort the same chip shows "Encoding & Codecs". The 0-count facets are gone. | search-invalid-sort-1440.png | active-filter chip label fallback (Search.tsx / ActiveFilters) |

## Re-checks

- **Fixed:** PS-15, PS-17, PS-18, PS-19, PS-20 and PS-21.
  - All were measured at 390 and 820 touch. Only inline running-text links fall under 44px.
  - The Switch and Checkbox hit areas are 44×44 and centred, and they steal no taps from neighbours.

## Judged not findings

- /about "open an issue": an inline link inside running text, 248×40.
- Legal links: inline links in paragraphs.

## UNVERIFIED (sent to a gap auditor)

- **Not driven:**
  - Offline state.
  - Gutter and footer at 375, 1024 and 1366.
  - Alert announcements.
  - /search paging, facets and keyboard sort.
  - /journeys Start Journey.
  - Keyboard use and reduced motion.
- **Not opened:** the /advanced Metrics, Export and AI tabs.
- **Not re-driven:**
  - The palette open methods (⌘K, Ctrl+K, /), recents and Clear.
  - PS-09 to PS-14, including SSR parity and /sign-in "Use phone".
- **End revision:** not recorded.
