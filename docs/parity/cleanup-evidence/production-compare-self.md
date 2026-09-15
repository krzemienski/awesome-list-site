# Production baseline compare — candidate

- baseline: `.cache/task569/compare/candidate` (captured from http://127.0.0.1:5000)
- candidate: `http://127.0.0.1:5000` → `.cache/task569/compare-self/candidate`
- compared at 2026-09-15T05:57:30.583Z · tool commit d41ae833d22cdbb9ddedde353f420ce1cf5b5cc7 · chromium chromium-1228 · axe-core 4.13.0
- routes: 3 · endpoints: 12 · strips: 12 (visual only, never a pixel gate)
- tracked deltas: **0** (0 routes, 0 endpoints)

Tracked delta columns: status, redirect chain, final URL, visible data-testids (any viewport), title, h1, axe serious+critical rules/nodes (375/1440), document counts + body (own origin normalised), API status, key paths, item/total counts. Everything else lands in *notes*.

## Routes

| route | status | redirects | testids (+/−) | title | h1 | axe S+C rules/nodes 375 | axe S+C rules/nodes 1440 | deltas | notes |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/about` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |
| `/category/encoding-codecs` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | — |  |

## API

| endpoint | status | key paths (+/−) | items | counts | deltas | notes |
|---|---|---|---|---|---|---|
| `/api/resources?limit=24` | 200 | +0 / −0 | 24 | same | — | byte-identical body |
| `/api/resources/185020` | 200 | +0 / −0 | – | same | — | byte-identical body |
| `/api/categories` | 200 | +0 / −0 | 9 | same | — | byte-identical body |
| `/api/subcategories` | 200 | +0 / −0 | 92 | same | — | byte-identical body |
| `/api/sub-subcategories` | 200 | +0 / −0 | 27 | same | — | byte-identical body |
| `/api/tags` | 200 | +0 / −0 | 1535 | same | — | byte-identical body |
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
- `strips/about@375.png`
- `strips/about@768.png`
- `strips/about@1024.png`
- `strips/about@1440.png`
- `strips/category-encoding-codecs@375.png`
- `strips/category-encoding-codecs@768.png`
- `strips/category-encoding-codecs@1024.png`
- `strips/category-encoding-codecs@1440.png`
