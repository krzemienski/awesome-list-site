# ux-public-core — cycle 02 (rev c25cd76f, 16:56:35Z–17:27:43Z) — ISSUES 10 (1 MEDIUM, 9 LOW) + PC-10 partly open
(saved by lead from the auditor's final message; harness refused the auditor's Write). Signed out, no writes.

| id | sev | URL / width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|
| PC-13 | MEDIUM | / (index+curated), 1440 | home featured-card tag pills: URL → /?tags=UDP but page stays unfiltered (3,825); fresh load of that URL filters (4 of 3,825). Taxonomy pills filter in place fine. | home-index-after-srt-pill-click-1440.png, home-curated-after-udp-pill-click-1440.png | Home.tsx:473-477 (selectedTags read from URL only in useState initializer); HomePresentation.tsx:337-341, 363-369 |
| PC-14 | LOW | pages with footer, 1440 | ~80px of scroll before .app-footer-meta appears, back-to-top covers right end of footer "Contact maintainers" (elementFromPoint = button-back-to-top); home and /category/encoding-codecs?page=2 | home-curated-1440-s2225-contact-overlap.png | MainLayout.tsx:45-63 |
| PC-15 | LOW | / index rail, 1440 | stuck rail is a hidden-scrollbar scroller (1097 vs 724) with no cue; cuts an item mid-line; "Submit a resource" reachable only by scrolling inside the rail | home-1440-s1300*.png | home.css:322 |
| PC-16 | LOW | category after tapping Next; drawer; 390 touch | sticky hover on touch (card glow / sidebar hover box stays) | cat-encoding-390-after-next-page4.png, drawer-390-subsub-android.png | design-system.css:138,144 (.card.hoverable:hover/.card.glow:hover not gated by (hover:hover)); sidebar-tree.css |
| PC-17 | LOW | /category/*, all | hero "← Browse" → / ; header "Browse" and 404 "Browse all categories" → /categories | snap-players-820.txt | TaxonomyListing.tsx:641 |
| PC-18 | LOW | /tag/hls, 1440 | pill focus ring is a square 2px outline around a rounded pill | tag-hls-pill-focus-crop.png | resource-card.css:234,282 |
| PC-19 | LOW | consent banner, 390/1440 | banner bg 94% opaque; pills/headings bleed through behind copy and buttons | consent-banner-bleed-390-crop.png | system-overlays.css:29-36 |
| PC-20 | LOW | /sub-subcategory/android sidebar/drawer, 390/1440 | current row (aria-current=page) differs only by ink; parent gets the accent fill and reads as current | drawer-390-subsub-android.png | AppSidebar.tsx:523-524, 581-582; sidebar-tree.css |
| PC-21 | LOW (cross-screen) | /tag/* vs taxonomy, 1440/820 | tag listings use a different shell: no sidebar, "Back to Home", "Showing 1–24 of 64" vs "Resources (N)", actions always visible vs revealed | tag-hls-1440.png vs cat-encoding-1440-after-next-page4.png | TagLanding.tsx vs TaxonomyListing.tsx |
| PC-22 | LOW (copy) | /?layout=curated, 1440 | "6 of 3,825 resources stand out this week" under stat strip "FEATURED 8" | home-curated-1440.png | HomePresentation.tsx:713 |

## Cycle-1 re-checks
FIXED: PC-01..09, PC-11, PG-02, PG-03 (details: paging focus at 1440/390, reduced-motion instant, L3 4.69/4.93:1, banner DOM order, privacy underline, Topics grid, case-insensitive sort, tnum scoped, no pointer menu ring, sheet full height, pill hover, tab order).
PC-10 STILL-OPEN (partly): Submit CTA never covered, but scroll ≈600–930 (before rail sticks) back-to-top covers rail links. home-1440-s820-btt-over-rail-banner.png
PC-12 STILL-OPEN (owner content decision): MirrorFly approved, tag "enteprise chat software", #02 in Recently indexed.

## Passed: paging status/robots/canonical (page=1 301; invalid → 404 noindex); sort; route focus pointer+keyboard; consent decline/reopen/inset; touch targets ≥44 on resource/home/tag/subsub (390/820) except allowed; 390 drawer 66 controls ≥44, scroll lock; no horizontal overflow.
## UNVERIFIED: light theme (DS has none); SR announcement; backdrop-tap close; PC-16 on real phones; back-to-top overlap on curated at 390/820.
