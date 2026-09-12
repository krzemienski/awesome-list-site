# npm run baseline:compare -- --baseline tests/parity/production-baseline/2026-09-12 --against http://127.0.0.1:5000 --routes /about --no-strips
# (the compare tool always captures the full API set; --routes only limits browser routes, so /about was used as the cheapest page)

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

Reading: the two task routes show only key additions (+resources[].kind, +resources[].resolvedKind / +kind, +resolvedKind); count deltas are the prod-vs-dev corpus size (3824 vs 1816) and the recommendations −metadata.tags is data-dependent — both already present in the prod-baseline task's own compare (docs/parity/evidence/prod-baseline/compare-local-2026-09-12.md, rows /api/resources?limit=24 and /api/recommendations).
