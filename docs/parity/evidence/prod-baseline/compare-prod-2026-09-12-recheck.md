<!-- Re-run of the committed same-day production candidate through the hardened compare (offline, --candidate, --no-strips); the live run is compare-prod-2026-09-12.md  Run from the uncommitted working tree that became the hardening commit, so the "tool commit" in the header still names the previous commit. -->
# Production baseline compare — 2026-09-12

- baseline: `tests/parity/production-baseline/2026-09-12` (captured from https://awesome.video)
- candidate: `https://awesome.video` (pre-captured) → `../../../tmp/validation/pb-compare-prod-2026-09-12/candidate`
- compared at 2026-09-12T06:52:59.174Z · tool commit ac1be030fe8803c2af47f2b06693bcf42b0e773b · chromium chromium-1223 · axe-core 4.13.0
- routes: 26 · endpoints: 12 · strips: 0 (visual only, never a pixel gate)
- tracked deltas: **0** (0 routes, 0 endpoints)

Tracked delta columns: status, redirect chain, final URL, visible data-testids (any viewport), title, h1, axe serious+critical rules/nodes (375/1440), document counts + body (own origin normalised), API status, key paths, item/total counts. Everything else lands in *notes*.

## Routes

| route | status | redirects | testids (+/−) | title | h1 | axe S+C rules/nodes 375 | axe S+C rules/nodes 1440 | deltas | notes |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/categories` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/category/encoding-codecs` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/category/community-events?page=2` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/subcategory/community-groups` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/sub-subcategory/ffmpeg` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/resource/185020` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/resource/186190` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/about` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/submit` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/search?q=ffmpeg` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/search?q=zzqxv-nothing` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/advanced` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/journeys` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/journey/7` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/tag/open-source` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/settings/theme` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/recommendations` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/design-system` | 200 | same | +0 / −0 | same | same | 1/1 | 1/1 | — |  |
| `/terms` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/privacy` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/code-of-conduct` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/sign-in` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/this-route-does-not-exist` | 404 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
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

No strips written (no route had a PNG on both sides, or --no-strips).

