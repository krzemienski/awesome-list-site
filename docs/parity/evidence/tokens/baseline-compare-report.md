# Production baseline compare — 2026-09-12

- baseline: `tests/parity/production-baseline/2026-09-12` (captured from https://awesome.video)
- candidate: `http://127.0.0.1:5000` → `../../../tmp/parity-tokens/baseline-compare/candidate`
- compared at 2026-09-12T19:15:36.961Z · tool commit 6ee20a60cda3b56f8310359e441ee71495715516 · chromium chromium-1223 · axe-core 4.13.0
- routes: 3 · endpoints: 12 · strips: 12 (visual only, never a pixel gate)
- tracked deltas: **14** (3 routes, 7 endpoints)

Tracked delta columns: status, redirect chain, final URL, visible data-testids (any viewport), title, h1, axe serious+critical rules/nodes (375/1440), document counts + body (own origin normalised), API status, key paths, item/total counts. Everything else lands in *notes*.

## Routes

| route | status | redirects | testids (+/−) | title | h1 | axe S+C rules/nodes 375 | axe S+C rules/nodes 1440 | deltas | notes |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | same | +1 / −14 | changed | same | 0/0 | 0/0 | title, testids | nav labels +125 −137 |
| `/category/encoding-codecs` | 200 | same | +11 / −20 | same | same | 0/0 | 0/0 | testids | nav labels +126 −138 |
| `/settings/theme` | 200 | same | +1 / −14 | same | same | 0/0 | 0/0 | testids | nav labels +125 −137 |

### Route details

#### `/`

- title: `Awesome Video — 3824+ Curated Video & Streaming Resources` → `Awesome Video — 1816+ Curated Video & Streaming Resources`
- testids @1024: +[expand-sub-industry-forums-standards-bodies] −[expand-sub-vendors-hdr, sub-browser-extensions, sub-closed-captioning-subtitling-standards, sub-dash-manifest-tools, sub-ffmpeg-tools, sub-non-linear-editing-suites, sub-performance-monitoring-tools, sub-uncategorized-community-events, sub-vendors-hdr, subsub-advertising, subsub-conferences, subsub-rtmp, subsub-slack-meetups, subsub-vendor-docs]
- testids @1440: +[expand-sub-industry-forums-standards-bodies] −[expand-sub-vendors-hdr, sub-browser-extensions, sub-closed-captioning-subtitling-standards, sub-dash-manifest-tools, sub-ffmpeg-tools, sub-non-linear-editing-suites, sub-performance-monitoring-tools, sub-uncategorized-community-events, sub-vendors-hdr, subsub-advertising, subsub-conferences, subsub-rtmp, subsub-slack-meetups, subsub-vendor-docs]

#### `/category/encoding-codecs`

- testids @375: +[button-more-tags-185016, button-suggest-edit-185016, button-visit-185016, card-resource-185016, link-page-14, link-resource-title-185016, link-view-details-185016, tag-pill-185016-HandBrake, tag-pill-185016-transcoding, tag-pill-185016-web] −[button-suggest-edit-189535, button-visit-189535, card-resource-189535, link-page-25, link-resource-title-189535, link-view-details-189535]
- testids @768: +[button-more-tags-185016, button-suggest-edit-185016, button-visit-185016, card-resource-185016, link-page-14, link-resource-title-185016, link-view-details-185016, tag-pill-185016-HandBrake, tag-pill-185016-transcoding, tag-pill-185016-web] −[button-suggest-edit-189535, button-visit-189535, card-resource-189535, link-page-25, link-resource-title-189535, link-view-details-189535]
- testids @1024: +[button-more-tags-185016, button-suggest-edit-185016, button-visit-185016, card-resource-185016, expand-sub-industry-forums-standards-bodies, link-page-14, link-resource-title-185016, link-view-details-185016, tag-pill-185016-HandBrake, tag-pill-185016-transcoding, tag-pill-185016-web] −[button-suggest-edit-189535, button-visit-189535, card-resource-189535, expand-sub-vendors-hdr, link-page-25, link-resource-title-189535, link-view-details-189535, sub-browser-extensions, sub-closed-captioning-subtitling-standards, sub-dash-manifest-tools, sub-ffmpeg-tools, sub-non-linear-editing-suites, sub-performance-monitoring-tools, sub-uncategorized-community-events, sub-vendors-hdr, subsub-advertising, subsub-conferences, subsub-rtmp, subsub-slack-meetups, subsub-vendor-docs]
- testids @1440: +[button-more-tags-185016, button-suggest-edit-185016, button-visit-185016, card-resource-185016, expand-sub-industry-forums-standards-bodies, link-page-14, link-resource-title-185016, link-view-details-185016, tag-pill-185016-HandBrake, tag-pill-185016-transcoding, tag-pill-185016-web] −[button-suggest-edit-189535, button-visit-189535, card-resource-189535, expand-sub-vendors-hdr, link-page-25, link-resource-title-189535, link-view-details-189535, sub-browser-extensions, sub-closed-captioning-subtitling-standards, sub-dash-manifest-tools, sub-ffmpeg-tools, sub-non-linear-editing-suites, sub-performance-monitoring-tools, sub-uncategorized-community-events, sub-vendors-hdr, subsub-advertising, subsub-conferences, subsub-rtmp, subsub-slack-meetups, subsub-vendor-docs]

#### `/settings/theme`

- testids @1024: +[expand-sub-industry-forums-standards-bodies] −[expand-sub-vendors-hdr, sub-browser-extensions, sub-closed-captioning-subtitling-standards, sub-dash-manifest-tools, sub-ffmpeg-tools, sub-non-linear-editing-suites, sub-performance-monitoring-tools, sub-uncategorized-community-events, sub-vendors-hdr, subsub-advertising, subsub-conferences, subsub-rtmp, subsub-slack-meetups, subsub-vendor-docs]
- testids @1440: +[expand-sub-industry-forums-standards-bodies] −[expand-sub-vendors-hdr, sub-browser-extensions, sub-closed-captioning-subtitling-standards, sub-dash-manifest-tools, sub-ffmpeg-tools, sub-non-linear-editing-suites, sub-performance-monitoring-tools, sub-uncategorized-community-events, sub-vendors-hdr, subsub-advertising, subsub-conferences, subsub-rtmp, subsub-slack-meetups, subsub-vendor-docs]

## API

| endpoint | status | key paths (+/−) | items | counts | deltas | notes |
|---|---|---|---|---|---|---|
| `/api/resources?limit=24` | 200 | +1 / −0 | 24 | total 3824 → 1816 (-2008); pagination.total 3824 → 1816 (-2008); pagination.totalPages 160 → 76 (-84) | key-paths, counts | first/last id 190152…190114 → 188015…186687; cache-control "private" → "–" |
| `/api/resources/185020` | 200 | +1 / −0 | – | same | key-paths | cache-control "private" → "–" |
| `/api/categories` | 200 | +0 / −0 | 9 | same | — | cache-control "private, max-age=60, must-revalidate" → "public, max-age=60, must-revalidate" |
| `/api/subcategories` | 200 | +0 / −0 | 99 → 92 (-7) | $[] 99 → 92 (-7) | item-count | cache-control "private, max-age=60, must-revalidate" → "public, max-age=60, must-revalidate" |
| `/api/sub-subcategories` | 200 | +0 / −0 | 32 → 27 (-5) | $[] 32 → 27 (-5) | item-count | cache-control "private, max-age=60, must-revalidate" → "public, max-age=60, must-revalidate" |
| `/api/tags` | 200 | +0 / −0 | 1541 → 1535 (-6) | tags[] 1541 → 1535 (-6); total 1541 → 1535 (-6) | item-count, counts | cache-control "private, max-age=60, must-revalidate" → "public, max-age=60, must-revalidate" |
| `/api/awesome-list/listing?level=category&slug=encoding-codecs` | 200 | +1 / −0 | 24 | tags[] 275 → 271 (-4); total 579 → 333 (-246); totalPages 25 → 14 (-11); totalAll 579 → 333 (-246); generalCount 96 → 92 (-4) | key-paths, counts | first/last id 184847…186240 → 184847…185016; cache-control "private, max-age=0, must-revalidate" → "public, max-age=0, must-revalidate" |
| `/api/journeys` | 200 | +0 / −0 | 5 | same | — | cache-control "private" → "–" |
| `/api/journeys/7` | 200 | +0 / −0 | 18 | same | — | cache-control "private" → "–" |
| `/api/recommendations` | 200 | +1 / −2 | 10 | same | key-paths | first/last id 190135…190122 → 188015…186821; cache-control "private" → "–" |
| `/api/health` | 200 | +0 / −0 | – | same | — | byte-identical body |
| `/api/health/ready` | 200 | +0 / −0 | – | same | — | byte-identical body |

### Key-path details

- `/api/resources?limit=24`: +[resources[].kind] −[]
- `/api/resources/185020`: +[kind] −[]
- `/api/awesome-list/listing?level=category&slug=encoding-codecs`: +[resources[].kind] −[]
- `/api/recommendations`: +[[].resource.kind] −[[].resource.metadata.tags, [].resource.metadata.tags[]]

## Strips

- `strips/home@375.png`
- `strips/home@768.png`
- `strips/home@1024.png`
- `strips/home@1440.png`
- `strips/category-encoding-codecs@375.png` (dimensions differ)
- `strips/category-encoding-codecs@768.png`
- `strips/category-encoding-codecs@1024.png` (dimensions differ)
- `strips/category-encoding-codecs@1440.png` (dimensions differ)
- `strips/settings-theme@375.png`
- `strips/settings-theme@768.png`
- `strips/settings-theme@1024.png`
- `strips/settings-theme@1440.png`

<!-- The strips/ images listed above are visual-only side-by-sides and were not committed (kept in /tmp/parity-tokens/baseline-compare/strips at run time); the route and API rows are the record. -->
