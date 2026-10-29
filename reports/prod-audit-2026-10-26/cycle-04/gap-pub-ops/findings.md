# Cycle-4 gap audit, public (signed out) and admin ops (owner): ISSUES, 1 MEDIUM and 2 LOW (rev 582bdf67 at start and end)

The cookie was loaded only with `agent-browser cookies set --curl` and `$(cat …)` expansion, so it never reached a transcript.

| id | sev | where | saw vs expected | source |
|---|---|---|---|---|
| PS-22 | MEDIUM (intermittent, 1 of 3 runs) | /category/community-events at 1440: go offline, navigate in the app, press Retry while still offline, then reconnect | The page stayed on "Something went wrong / The catalog couldn't be loaded" and did not recover on its own. The offline copy promises "It will load on its own when you reconnect". A manual Retry did recover it. | App.tsx:243-330, ErrorPage.tsx (offline-retry to error transition) |
| PS-23 | LOW | /search Filters sheet at 390 touch | Each facet tap closes the sheet (applyChange calls setOpen(false)), so combining facets means reopening it once per facet. Focus then lands on the results section, not on the Filters button. | SearchFilters.tsx:115-117 |
| PS-24 | LOW | /advanced?tab=export, Content Options checkboxes at 390 touch | Each 24px box has a 44px ::after, but the rows are on a 32px pitch, so the hit areas overlap by 12px. A tap 10px below a box's centre, still inside that box, toggles the next row. | export-tools.tsx row spacing (with the #80 checkbox hit area) |

**PASS:**
- Gutters and footer at 375, 1024 and 1366 on 4 routes: 0 hits under back-to-top and no overflow.
- Search paging, keyboard sort, and facet hit areas and focus ring.
- /journeys Start Journey while signed out.
- /advanced Metrics, Export and AI tabs, and the client-side exports.
- Command palette: ⌘K, Ctrl+K and /, Enter, recents and Clear.
- PS-09 to PS-14 fixed, with SSR and hydrated parity.
- Keyboard use and reduced motion.
- Admin ops: Contact submissions, Users search, sort and paging, the Markdown, OPML and JSON exports, Audit filters, paging and invalid ids, and dark contrast with 0 failures.

**Side effects:** audit rows 27466 to 27468 from the exports. They cannot be deleted.

**UNVERIFIED:**
- Part B touch was checked by viewport size only.
- Reduced motion was checked on /search only.
- PS-22 could not be reproduced again (1 of 3 runs).
