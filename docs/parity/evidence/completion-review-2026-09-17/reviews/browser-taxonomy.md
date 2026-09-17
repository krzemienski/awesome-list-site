# Scoped native browser verification: browser-taxonomy

MAIN-app taxonomy/filter journey passed at `http://127.0.0.1:5000` in a fresh guest context. No credentials, auth, data mutations, source writes, restarts, mocks, or suite reruns were used.

Resource and category navigation:
- Loaded `/resource/188015` at exactly 768×812. Live page was the real `srtdroid` resource detail.
- Observed category breadcrumb/link hrefs:
  - `Protocols & Transport` → `/category/protocols-transport`
  - `Transport Protocols` → `/subcategory/transport-protocols`
  - `SRT` → `/sub-subcategory/srt`
- Clicked the visible `Protocols & Transport` category link normally. The authoritative category route loaded as `/category/protocols-transport` with title `Protocols & Transport`, live collection data `213 resources`, `8 subcategories`, `Resources (213)`, real resource cards, and pagination `Page 1 of 9`.
- Category sidebar at exact 768px measured `{x:0, y:56, width:240, height:610}`. Eight measured `L3` indicators were approximately `20.97×16.39px`, all above the 9px minimum. Document horizontal overflow was zero (`scrollWidth === clientWidth`, overflow 0).
- Filters & view opened normally and exposed both native selects. At 768px both were native `SELECT` elements with canonical class `select min-h-11`, computed height exactly `44px`, readable themed text `rgb(244, 243, 238)`, and dark translucent backgrounds.
- Selected the real resource kind `Protocols`: URL became `/category/protocols-transport?kind=protocols`, the page reported `8 resources`, `Kind: Protocols`, and rendered real Protocols cards (not an empty state).
- Cleared/reset the native kind select to `All resource kinds`: URL returned exactly `/category/protocols-transport`, count restored to `213 resources`, filters remained usable, and real cards/pagination returned.

Back and related-resource path:
- Browser Back traversed the actual history: cleared category → `?kind=protocols` → unfiltered `/category/protocols-transport` → `/resource/188015`.
- On the restored resource detail, `View all in Protocols & Transport` was directly visible; no More expansion was required. Clicking it normally returned to the same authoritative `/category/protocols-transport` route, again showing title `Protocols & Transport`, `213 resources`, `8 subcategories`, real cards, and Page 1 of 9.

375px verification:
- Switched the same guest page to 375×812 on `/category/protocols-transport`; document overflow remained 0 (`scrollWidth 369`, `clientWidth 369`).
- Opened Filters & view normally. After scrolling the panel into view, both native selects were fully inside the viewport:
  - Subcategory: `{x:40, right:329, width:289, height:44}`
  - Kind: `{x:40, right:329, width:289, height:44}`
  Both retained class `select min-h-11`, `44px` height, and readable themed text/background. The narrow filter controls were usable with no sideways document overflow.

Representative screenshots:
- `4ty4un` — 768px `srtdroid` resource detail.
- `lazwr2` / `046hho` — loaded category with 213 resources, sidebar, and exact 240px measurement evidence.
- `1mlh4z` — 768px expanded Filters & view.
- `vh0epq` — `Protocols` filter result showing 8 resources.
- `87ye4n` — cleared/reset category restored to 213 resources.
- `5m3eg3` — resource restored via browser Back.
- `hmx6xo` — View all return to authoritative category route.
- `ewqp86` — 375px category with zero document overflow.
- `74vxam` — 375px expanded filter state.
- `wo1bbn` — 375px native filter controls visibly in view.

Minor verification note: the initial navigation call reached the correct resource URL and rendered usable content but hit Playwright’s 5-second `load` wait timeout; subsequent page interactions and all requested verifications completed successfully. The analytics consent banner remained visible throughout as expected guest UI and was not interacted with.
