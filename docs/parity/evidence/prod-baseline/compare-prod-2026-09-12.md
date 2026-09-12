<!-- Evidence for docs/parity/worklog/prod-baseline.md. Verbatim copy of
     /tmp/validation/pb-compare-prod-2026-09-12/compare-report.md produced by
     `node scripts/validation/production-baseline-compare.mjs --baseline tests/parity/production-baseline/2026-09-12 --against https://awesome.video --out /tmp/validation/pb-compare-prod-2026-09-12`
     on 2026-09-12, ~15 minutes after the baseline capture (exit 0 = zero tracked
     deltas; all 12 API bodies byte-identical). -->

# Production baseline compare — 2026-09-12

- baseline: `tests/parity/production-baseline/2026-09-12` (captured from https://awesome.video)
- candidate: `https://awesome.video` → `../../../tmp/validation/pb-compare-prod-2026-09-12/candidate`
- compared at 2026-09-12T06:39:40.707Z · tool commit 98f1b0cc4806c65b423f09a68650ee50a3c78c40 · chromium chromium-1223 · axe-core 4.13.0
- routes: 26 · endpoints: 12 · strips: 96 (visual only, never a pixel gate)
- tracked deltas: **0** (0 routes, 0 endpoints)

Tracked delta columns: status, redirect chain, final URL, visible data-testids (any viewport), title, h1, axe serious+critical (375/1440), API status, key paths, item/total counts. Everything else lands in *notes*.

## Routes

| route | status | redirects | testids (+/−) | title | h1 | axe S+C 375 | axe S+C 1440 | deltas | notes |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/categories` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/category/encoding-codecs` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/category/community-events?page=2` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/subcategory/community-groups` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/sub-subcategory/ffmpeg` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/resource/185020` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/resource/186190` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/about` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/submit` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/search?q=ffmpeg` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/search?q=zzqxv-nothing` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/advanced` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/journeys` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/journey/7` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/tag/open-source` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/settings/theme` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/recommendations` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/design-system` | 200 | same | +0 / −0 | same | same | 1 | 1 | — |  |
| `/terms` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/privacy` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/code-of-conduct` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/sign-in` | 200 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/this-route-does-not-exist` | 404 | same | +0 / −0 | same | same | 0 | 0 | — |  |
| `/sitemap.xml` | 200 | same | n/a | n/a | n/a | n/a | n/a | — |  |
| `/robots.txt` | 200 | same | n/a | n/a | n/a | n/a | n/a | — |  |

## API

| endpoint | status | key paths (+/−) | items | counts | deltas | notes |
|---|---|---|---|---|---|---|
| `/api/resources?limit=24` | 200 | +0 / −0 | 24 | same | — | byte-identical body |
| `/api/resources/185020` | 200 | +0 / −0 | – | same | — | byte-identical body |
| `/api/categories` | 200 | +0 / −0 | 9 | same | — | byte-identical body |
| `/api/subcategories` | 200 | +0 / −0 | 99 | same | — | byte-identical body |
| `/api/sub-subcategories` | 200 | +0 / −0 | 32 | same | — | byte-identical body |
| `/api/tags` | 200 | +0 / −0 | 1541 | same | — | byte-identical body |
| `/api/awesome-list/listing?level=category&slug=encoding-codecs` | 200 | +0 / −0 | 24 | same | — | byte-identical body |
| `/api/journeys` | 200 | +0 / −0 | 5 | same | — | byte-identical body |
| `/api/journeys/7` | 200 | +0 / −0 | 18 | same | — | byte-identical body |
| `/api/recommendations` | 200 | +0 / −0 | 10 | same | — | byte-identical body |
| `/api/health` | 200 | +0 / −0 | – | same | — | byte-identical body |
| `/api/health/ready` | 200 | +0 / −0 | – | same | — | byte-identical body |

## Strips

- `strips/home@375.png` 
- `strips/home@768.png` 
- `strips/home@1024.png` 
- `strips/home@1440.png` 
- `strips/categories@375.png` 
- `strips/categories@768.png` 
- `strips/categories@1024.png` 
- `strips/categories@1440.png` 
- `strips/category-encoding-codecs@375.png` 
- `strips/category-encoding-codecs@768.png` 
- `strips/category-encoding-codecs@1024.png` 
- `strips/category-encoding-codecs@1440.png` 
- `strips/category-community-events-page-2@375.png` 
- `strips/category-community-events-page-2@768.png` 
- `strips/category-community-events-page-2@1024.png` 
- `strips/category-community-events-page-2@1440.png` 
- `strips/subcategory-community-groups@375.png` 
- `strips/subcategory-community-groups@768.png` 
- `strips/subcategory-community-groups@1024.png` 
- `strips/subcategory-community-groups@1440.png` 
- `strips/sub-subcategory-ffmpeg@375.png` 
- `strips/sub-subcategory-ffmpeg@768.png` 
- `strips/sub-subcategory-ffmpeg@1024.png` 
- `strips/sub-subcategory-ffmpeg@1440.png` 
- `strips/resource-185020@375.png` 
- `strips/resource-185020@768.png` 
- `strips/resource-185020@1024.png` 
- `strips/resource-185020@1440.png` 
- `strips/resource-186190@375.png` 
- `strips/resource-186190@768.png` 
- `strips/resource-186190@1024.png` 
- `strips/resource-186190@1440.png` 
- `strips/about@375.png` 
- `strips/about@768.png` 
- `strips/about@1024.png` 
- `strips/about@1440.png` 
- `strips/submit@375.png` 
- `strips/submit@768.png` 
- `strips/submit@1024.png` 
- `strips/submit@1440.png` 
- `strips/search-q-ffmpeg@375.png` 
- `strips/search-q-ffmpeg@768.png` 
- `strips/search-q-ffmpeg@1024.png` 
- `strips/search-q-ffmpeg@1440.png` 
- `strips/search-q-zzqxv-nothing@375.png` 
- `strips/search-q-zzqxv-nothing@768.png` 
- `strips/search-q-zzqxv-nothing@1024.png` 
- `strips/search-q-zzqxv-nothing@1440.png` 
- `strips/advanced@375.png` 
- `strips/advanced@768.png` 
- `strips/advanced@1024.png` 
- `strips/advanced@1440.png` 
- `strips/journeys@375.png` 
- `strips/journeys@768.png` 
- `strips/journeys@1024.png` 
- `strips/journeys@1440.png` 
- `strips/journey-7@375.png` 
- `strips/journey-7@768.png` 
- `strips/journey-7@1024.png` 
- `strips/journey-7@1440.png` 
- `strips/tag-open-source@375.png` 
- `strips/tag-open-source@768.png` 
- `strips/tag-open-source@1024.png` 
- `strips/tag-open-source@1440.png` 
- `strips/settings-theme@375.png` 
- `strips/settings-theme@768.png` 
- `strips/settings-theme@1024.png` 
- `strips/settings-theme@1440.png` 
- `strips/recommendations@375.png` 
- `strips/recommendations@768.png` 
- `strips/recommendations@1024.png` 
- `strips/recommendations@1440.png` 
- `strips/design-system@375.png` 
- `strips/design-system@768.png` 
- `strips/design-system@1024.png` 
- `strips/design-system@1440.png` 
- `strips/terms@375.png` 
- `strips/terms@768.png` 
- `strips/terms@1024.png` 
- `strips/terms@1440.png` 
- `strips/privacy@375.png` 
- `strips/privacy@768.png` 
- `strips/privacy@1024.png` 
- `strips/privacy@1440.png` 
- `strips/code-of-conduct@375.png` 
- `strips/code-of-conduct@768.png` 
- `strips/code-of-conduct@1024.png` 
- `strips/code-of-conduct@1440.png` 
- `strips/sign-in@375.png` 
- `strips/sign-in@768.png` 
- `strips/sign-in@1024.png` 
- `strips/sign-in@1440.png` 
- `strips/this-route-does-not-exist@375.png` 
- `strips/this-route-does-not-exist@768.png` 
- `strips/this-route-does-not-exist@1024.png` 
- `strips/this-route-does-not-exist@1440.png` 

