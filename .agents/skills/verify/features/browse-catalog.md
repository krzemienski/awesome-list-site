# Browse the catalog

A visitor moves from the home dashboard into a category, narrows to a subcategory or sub-subcategory, pages through cards and opens a resource. Every count shown for the same node agrees across the sidebar, headers, cards and footer.

## Sub-features

- BR-HOME: home dashboard with stat strip, kind chips, category list with counts, home search field.
- BR-CAT: `/category/:slug` listing with subcategory filter, kind filter, view mode, pagination, sibling tiles.
- BR-SUB: `/subcategory/:slug` and `/sub-subcategory/:slug` listings using the same shared cards.
- BR-NAV: sidebar (desktop 280px, tablet 240px) and mobile drawer navigation with counts.
- BR-COUNT: counts agree everywhere for one node.
- BR-BACK: Back/Forward and `?page=` keep page and scroll.

## How to get to it (user POV)

- Land on `/` and click a category (`link-category-<slug>`).
- Click a sidebar row (`row-cat-<slug>`, `sub-<slug>`, `subsub-<slug>`); at 390 open the menu (`mobile-drawer-trigger`) first.
- Deep link: `/category/players-clients`, `/subcategory/codecs`, `/sub-subcategory/av1`.
- Legacy README anchors: `/#hevc` replaces to `/sub-subcategory/hevc`.

## Driving it with chrome-devtools MCP

Preconditions: guest context, consent decided, local data (9 categories, 1949 approved resources; players-clients has 263).

- **Open a category.** On `/`, click `link-category-players-clients` → URL `/category/players-clients`, `text-results-count` shows the total, cards `card-resource-<id>` render.
- **Counts agree (BR-COUNT).** On `/category/players-clients` read the header total, the sidebar `row-cat-players-clients` badge, and the subcategory cards plus Uncategorized. They must be equal. Compare the sidebar footer `sidebar-resource-count` with the home total. Cross-check `curl -s localhost:$P/api/categories` `resourceCount` for that slug.
- **Narrow and page.** Pick `select-subcategory-filter` → URL gains `?subcategory=`, count drops to that subcategory. Go to page 2 via the paginator link → `?page=2`; scroll down; go to page 3; Back → page 2 at the old scroll; Back again → leaves to the previous page.
- **Card to detail.** Click `link-resource-title-<id>` on a category, a subcategory (`/subcategory/codecs`) and a sub-subcategory (`/sub-subcategory/av1`) card → each opens `/resource/<id>`.
- **Drawer (390).** Click `mobile-drawer-trigger` → `.av-sidebar-drawer[data-state="open"]`; scroll inside it; Escape closes it and focus returns to the trigger.
- **Tablet (820).** Deep-link `/sub-subcategory/av1`: the AV1 leaf is visible in the 240px sidebar, and again in the drawer.
- **Look.** At each width run `references/visual-checklist.md` §2.1 (overflow), §2.2 (shell geometry, sticky header after an 800px instant scroll).

## Gotchas

- **Fixed 2026-10-25 (merge e5a0abf0):** the tree builders (`LegacyRepository`, `HomeNavRepository`) hid approved rows whose URL matched another row after trim, lowercase and trailing-slash strip, so listings and the footer read 1,934 while `/api/categories` read 1,949. Exact-URL duplicate checks miss this; compare `count(distinct regexp_replace(lower(trim(url)),'/+$',''))` with `count(*)`. Expected now: Players & Clients 263 (general 150) and 1,949 everywhere. The 15 normalized-URL twin pairs show as two cards each until curated.
- Listing tag pills are filter chips (`?tags=`), not links to tag pages; only detail-page tags navigate.
- Home has no resource cards; it is a dashboard.
- Catalog GETs cache 60 s; after an admin write, soft-navigate in the same tab or reload with ignoreCache.
- History: counts disagreeing across surfaces broke at least 6 times (`references/regression-watchlist.md` §1a); Back being swallowed by URL-sync effects broke twice (§1b).
