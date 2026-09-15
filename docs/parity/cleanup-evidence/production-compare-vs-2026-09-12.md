# Production baseline compare — 2026-09-12

- baseline: `tests/parity/production-baseline/2026-09-12` (captured from https://awesome.video)
- candidate: `http://127.0.0.1:5000` → `.cache/task569/compare/candidate`
- compared at 2026-09-15T05:56:04.863Z · tool commit d41ae833d22cdbb9ddedde353f420ce1cf5b5cc7 · chromium chromium-1228 · axe-core 4.13.0
- routes: 3 · endpoints: 12 · strips: 12 (visual only, never a pixel gate)
- tracked deltas: **16** (3 routes, 8 endpoints)

Tracked delta columns: status, redirect chain, final URL, visible data-testids (any viewport), title, h1, axe serious+critical rules/nodes (375/1440), document counts + body (own origin normalised), API status, key paths, item/total counts. Everything else lands in *notes*.

## Routes

| route | status | redirects | testids (+/−) | title | h1 | axe S+C rules/nodes 375 | axe S+C rules/nodes 1440 | deltas | notes |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | same | +112 / −172 | changed | same | 0/0 | 0/0 | title, testids | nav labels +21 −167 |
| `/about` | 200 | same | +14 / −199 | same | changed | 0/0 | 0/0 | h1, testids | nav labels +11 −176 |
| `/category/encoding-codecs` | 200 | same | +14 / −156 | same | same | 0/0 | 0/0 | testids | nav labels +41 −168 |

### Route details

#### `/`

- title: `Awesome Video — 3824+ Curated Video & Streaming Resources` → `Awesome Video — 1816+ Curated Video & Streaming Resources`
- testids @375: +[home-kind-chip-events, home-kind-chip-libraries, home-kind-chip-protocols, home-kind-chip-standards, home-kind-chip-tools, home-kind-count-other, home-kind-strip, home-layout-index, home-stat-categories, home-stat-featured, home-stat-nested-groups, home-stat-resources, home-stat-strip, link-home-recent-188011, link-home-recent-188012, link-home-recent-188013, link-home-recent-188014, link-home-recent-188015, link-subcategory-adaptive-bitrate-algorithms-tools, link-subcategory-adaptive-streaming, link-subcategory-adaptive-streaming-standards, link-subcategory-ads-qoe, link-subcategory-ai-machine-learning-tools, link-subcategory-api-libraries-sdks, link-subcategory-audio-analysis-processing, …] −[button-browse-recommendations, link-recommendations-heading]
- testids @768: +[home-kind-chip-events, home-kind-chip-libraries, home-kind-chip-protocols, home-kind-chip-standards, home-kind-chip-tools, home-kind-count-other, home-kind-strip, home-layout-index, home-stat-categories, home-stat-featured, home-stat-nested-groups, home-stat-resources, home-stat-strip, link-home-recent-188011, link-home-recent-188012, link-home-recent-188013, link-home-recent-188014, link-home-recent-188015, link-subcategory-adaptive-bitrate-algorithms-tools, link-subcategory-adaptive-streaming, link-subcategory-adaptive-streaming-standards, link-subcategory-ads-qoe, link-subcategory-ai-machine-learning-tools, link-subcategory-api-libraries-sdks, link-subcategory-audio-analysis-processing, …] −[button-browse-recommendations, link-recommendations-heading, rail-about, rail-advanced, rail-home, rail-learning-journeys, rail-submit-resource, rail-theme]
- testids @1024: +[home-kind-chip-events, home-kind-chip-libraries, home-kind-chip-protocols, home-kind-chip-standards, home-kind-chip-tools, home-kind-count-other, home-kind-strip, home-layout-index, home-stat-categories, home-stat-featured, home-stat-nested-groups, home-stat-resources, home-stat-strip, link-home-recent-188011, link-home-recent-188012, link-home-recent-188013, link-home-recent-188014, link-home-recent-188015, link-subcategory-adaptive-bitrate-algorithms-tools, link-subcategory-adaptive-streaming, link-subcategory-adaptive-streaming-standards, link-subcategory-ads-qoe, link-subcategory-ai-machine-learning-tools, link-subcategory-api-libraries-sdks, link-subcategory-audio-analysis-processing, …] −[button-browse-recommendations, expand-sub-adaptive-streaming, expand-sub-ads-qoe, expand-sub-audio-subtitles, expand-sub-best-practices-guidelines, expand-sub-cdn-integration-distribution, expand-sub-cloud-cdn, expand-sub-codecs, expand-sub-community-groups, expand-sub-containerization-packaging-tools, expand-sub-encoding-tools, expand-sub-events-conferences, expand-sub-hardware-players, expand-sub-mobile-web-players, expand-sub-smart-tv-players, expand-sub-specs-standards, expand-sub-streaming-servers, expand-sub-transport-protocols, expand-sub-vendors-hdr, expand-sub-webinars-conference-talks, link-recommendations-heading, nav-advanced, nav-learning-journeys, nav-submit-resource, nav-theme, …]
- testids @1440: +[home-kind-chip-events, home-kind-chip-libraries, home-kind-chip-protocols, home-kind-chip-standards, home-kind-chip-tools, home-kind-count-other, home-kind-strip, home-layout-index, home-stat-categories, home-stat-featured, home-stat-nested-groups, home-stat-resources, home-stat-strip, link-home-recent-188011, link-home-recent-188012, link-home-recent-188013, link-home-recent-188014, link-home-recent-188015, link-subcategory-adaptive-bitrate-algorithms-tools, link-subcategory-adaptive-streaming, link-subcategory-adaptive-streaming-standards, link-subcategory-ads-qoe, link-subcategory-ai-machine-learning-tools, link-subcategory-api-libraries-sdks, link-subcategory-audio-analysis-processing, …] −[button-browse-recommendations, expand-sub-adaptive-streaming, expand-sub-ads-qoe, expand-sub-audio-subtitles, expand-sub-best-practices-guidelines, expand-sub-cdn-integration-distribution, expand-sub-cloud-cdn, expand-sub-codecs, expand-sub-community-groups, expand-sub-containerization-packaging-tools, expand-sub-encoding-tools, expand-sub-events-conferences, expand-sub-hardware-players, expand-sub-mobile-web-players, expand-sub-smart-tv-players, expand-sub-specs-standards, expand-sub-streaming-servers, expand-sub-transport-protocols, expand-sub-vendors-hdr, expand-sub-webinars-conference-talks, link-recommendations-heading, mobile-drawer-trigger, nav-advanced, nav-learning-journeys, nav-submit-resource, …]

#### `/about`

- h1: `["About"]` → `["A field journal for video engineers"]`
- testids @375: +[button-about-faq-0, button-about-faq-1, button-about-faq-2, button-about-faq-3, button-about-faq-4, button-about-faq-5, button-about-faq-6, button-about-faq-7, button-about-faq-8, button-about-faq-9, link-breadcrumb-home, page-breadcrumb, site-footer] −[]
- testids @768: +[breadcrumb-mobile-current, button-about-faq-0, button-about-faq-1, button-about-faq-2, button-about-faq-3, button-about-faq-4, button-about-faq-5, button-about-faq-6, button-about-faq-7, button-about-faq-8, button-about-faq-9, link-breadcrumb-home, page-breadcrumb, site-footer] −[rail-about, rail-advanced, rail-home, rail-learning-journeys, rail-submit-resource, rail-theme]
- testids @1024: +[breadcrumb-mobile-current, button-about-faq-0, button-about-faq-1, button-about-faq-2, button-about-faq-3, button-about-faq-4, button-about-faq-5, button-about-faq-6, button-about-faq-7, button-about-faq-8, button-about-faq-9, link-breadcrumb-home, page-breadcrumb, site-footer] −[accordion-cat-community-events, accordion-cat-encoding-codecs, accordion-cat-general-tools, accordion-cat-infrastructure-delivery, accordion-cat-intro-learning, accordion-cat-media-tools, accordion-cat-players-clients, accordion-cat-protocols-transport, accordion-cat-standards-industry, expand-sub-adaptive-streaming, expand-sub-ads-qoe, expand-sub-audio-subtitles, expand-sub-best-practices-guidelines, expand-sub-cdn-integration-distribution, expand-sub-cloud-cdn, expand-sub-codecs, expand-sub-community-groups, expand-sub-containerization-packaging-tools, expand-sub-encoding-tools, expand-sub-events-conferences, expand-sub-hardware-players, expand-sub-mobile-web-players, expand-sub-smart-tv-players, expand-sub-specs-standards, expand-sub-streaming-servers, …]
- testids @1440: +[breadcrumb-mobile-current, button-about-faq-0, button-about-faq-1, button-about-faq-2, button-about-faq-3, button-about-faq-4, button-about-faq-5, button-about-faq-6, button-about-faq-7, button-about-faq-8, button-about-faq-9, link-breadcrumb-home, page-breadcrumb, site-footer] −[accordion-cat-community-events, accordion-cat-encoding-codecs, accordion-cat-general-tools, accordion-cat-infrastructure-delivery, accordion-cat-intro-learning, accordion-cat-media-tools, accordion-cat-players-clients, accordion-cat-protocols-transport, accordion-cat-standards-industry, expand-sub-adaptive-streaming, expand-sub-ads-qoe, expand-sub-audio-subtitles, expand-sub-best-practices-guidelines, expand-sub-cdn-integration-distribution, expand-sub-cloud-cdn, expand-sub-codecs, expand-sub-community-groups, expand-sub-containerization-packaging-tools, expand-sub-encoding-tools, expand-sub-events-conferences, expand-sub-hardware-players, expand-sub-mobile-web-players, expand-sub-smart-tv-players, expand-sub-specs-standards, expand-sub-streaming-servers, …]

#### `/category/encoding-codecs`

- testids @375: +[button-more-tags-185016, button-suggest-edit-185016, button-visit-185016, card-resource-185016, link-breadcrumb-home, link-page-14, link-resource-title-185016, link-view-details-185016, page-breadcrumb, site-footer, tag-pill-185016-HandBrake, tag-pill-185016-transcoding, tag-pill-185016-web] −[button-suggest-edit-189535, button-visit-189535, card-resource-189535, link-page-25, link-resource-title-189535, link-view-details-189535]
- testids @768: +[breadcrumb-mobile-current, button-more-tags-185016, button-suggest-edit-185016, button-visit-185016, card-resource-185016, link-breadcrumb-home, link-page-14, link-resource-title-185016, link-view-details-185016, page-breadcrumb, site-footer, tag-pill-185016-HandBrake, tag-pill-185016-transcoding, tag-pill-185016-web] −[button-suggest-edit-189535, button-visit-189535, card-resource-189535, link-page-25, link-resource-title-189535, link-view-details-189535, rail-about, rail-advanced, rail-home, rail-learning-journeys, rail-submit-resource, rail-theme]
- testids @1024: +[breadcrumb-mobile-current, button-more-tags-185016, button-suggest-edit-185016, button-visit-185016, card-resource-185016, link-breadcrumb-home, link-page-14, link-resource-title-185016, link-view-details-185016, page-breadcrumb, site-footer, tag-pill-185016-HandBrake, tag-pill-185016-transcoding, tag-pill-185016-web] −[button-suggest-edit-189535, button-visit-189535, card-resource-189535, expand-sub-adaptive-streaming, expand-sub-ads-qoe, expand-sub-audio-subtitles, expand-sub-best-practices-guidelines, expand-sub-cdn-integration-distribution, expand-sub-cloud-cdn, expand-sub-community-groups, expand-sub-events-conferences, expand-sub-hardware-players, expand-sub-mobile-web-players, expand-sub-smart-tv-players, expand-sub-specs-standards, expand-sub-streaming-servers, expand-sub-transport-protocols, expand-sub-vendors-hdr, expand-sub-webinars-conference-talks, link-page-25, link-resource-title-189535, link-view-details-189535, nav-advanced, nav-learning-journeys, nav-submit-resource, …]
- testids @1440: +[breadcrumb-mobile-current, button-more-tags-185016, button-suggest-edit-185016, button-visit-185016, card-resource-185016, link-breadcrumb-home, link-page-14, link-resource-title-185016, link-view-details-185016, page-breadcrumb, site-footer, tag-pill-185016-HandBrake, tag-pill-185016-transcoding, tag-pill-185016-web] −[button-suggest-edit-189535, button-visit-189535, card-resource-189535, expand-sub-adaptive-streaming, expand-sub-ads-qoe, expand-sub-audio-subtitles, expand-sub-best-practices-guidelines, expand-sub-cdn-integration-distribution, expand-sub-cloud-cdn, expand-sub-community-groups, expand-sub-events-conferences, expand-sub-hardware-players, expand-sub-mobile-web-players, expand-sub-smart-tv-players, expand-sub-specs-standards, expand-sub-streaming-servers, expand-sub-transport-protocols, expand-sub-vendors-hdr, expand-sub-webinars-conference-talks, link-page-25, link-resource-title-189535, link-view-details-189535, mobile-drawer-trigger, nav-advanced, nav-learning-journeys, …]

## API

| endpoint | status | key paths (+/−) | items | counts | deltas | notes |
|---|---|---|---|---|---|---|
| `/api/resources?limit=24` | 200 | +2 / −0 | 24 | total 3824 → 1816 (-2008); pagination.total 3824 → 1816 (-2008); pagination.totalPages 160 → 76 (-84) | key-paths, counts | first/last id 190152…190114 → 188015…186687; cache-control "private" → "–" |
| `/api/resources/185020` | 200 | +2 / −0 | – | same | key-paths | cache-control "private" → "–" |
| `/api/categories` | 200 | +0 / −0 | 9 | same | — | cache-control "private, max-age=60, must-revalidate" → "public, max-age=60, must-revalidate" |
| `/api/subcategories` | 200 | +0 / −0 | 99 → 92 (-7) | $[] 99 → 92 (-7) | item-count | cache-control "private, max-age=60, must-revalidate" → "public, max-age=60, must-revalidate" |
| `/api/sub-subcategories` | 200 | +0 / −0 | 32 → 27 (-5) | $[] 32 → 27 (-5) | item-count | cache-control "private, max-age=60, must-revalidate" → "public, max-age=60, must-revalidate" |
| `/api/tags` | 200 | +0 / −0 | 1541 → 1535 (-6) | tags[] 1541 → 1535 (-6); total 1541 → 1535 (-6) | item-count, counts | cache-control "private, max-age=60, must-revalidate" → "public, max-age=60, must-revalidate" |
| `/api/awesome-list/listing?level=category&slug=encoding-codecs` | 200 | +2 / −0 | 24 | tags[] 275 → 271 (-4); total 579 → 333 (-246); totalPages 25 → 14 (-11); totalAll 579 → 333 (-246); generalCount 96 → 92 (-4) | key-paths, counts | first/last id 184847…186240 → 184847…185016; cache-control "private, max-age=0, must-revalidate" → "public, max-age=0, must-revalidate" |
| `/api/journeys` | 200 | +0 / −0 | 5 | same | — | cache-control "private" → "–" |
| `/api/journeys/7` | 200 | +2 / −0 | 18 | same | key-paths | cache-control "private" → "–" |
| `/api/recommendations` | 200 | +2 / −2 | 10 | same | key-paths | first/last id 190135…190122 → 188015…186821; cache-control "private" → "–" |
| `/api/health` | 200 | +0 / −0 | – | same | — | byte-identical body |
| `/api/health/ready` | 200 | +0 / −0 | – | same | — | byte-identical body |

### Key-path details

- `/api/resources?limit=24`: +[resources[].kind, resources[].resolvedKind] −[]
- `/api/resources/185020`: +[kind, resolvedKind] −[]
- `/api/awesome-list/listing?level=category&slug=encoding-codecs`: +[resources[].kind, resources[].resolvedKind] −[]
- `/api/journeys/7`: +[steps[].resource.kind, steps[].resource.resolvedKind] −[]
- `/api/recommendations`: +[[].resource.kind, [].resource.resolvedKind] −[[].resource.metadata.tags, [].resource.metadata.tags[]]

## Strips

- `strips/home@375.png` (dimensions differ)
- `strips/home@768.png` (dimensions differ)
- `strips/home@1024.png` (dimensions differ)
- `strips/home@1440.png` (dimensions differ)
- `strips/about@375.png` (dimensions differ)
- `strips/about@768.png` (dimensions differ)
- `strips/about@1024.png` (dimensions differ)
- `strips/about@1440.png` (dimensions differ)
- `strips/category-encoding-codecs@375.png` (dimensions differ)
- `strips/category-encoding-codecs@768.png` (dimensions differ)
- `strips/category-encoding-codecs@1024.png` (dimensions differ)
- `strips/category-encoding-codecs@1440.png` (dimensions differ)
