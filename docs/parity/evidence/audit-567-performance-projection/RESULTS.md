# Task 567 Home nav projection evidence

Captured 2026-09-15T02:13:03Z against the development PostgreSQL database. The
comparison was read-only: the legacy loader and the new projection both issued
SELECTs only, and the validation did not insert, update, delete, or alter
schema.

## Implementation

`server/home-ssr-data.ts` now uses the focused
`server/repositories/HomeNavRepository.ts` on a `catalog-nav` cache miss. The
repository selects only the resource fields needed for the public nav:

- `id`, `title`, `url`, `description`
- `category`, `subcategory`, `sub_subcategory`

It projects category, subcategory, and sub-subcategory identifiers/names/slugs
separately, then preserves the legacy tree rules in memory:

- approved resources are ordered by `title`, then `id`;
- normalized URL deduplication is first-row-wins, including trailing-slash
  removal;
- direct counts and the first direct teaser are unchanged;
- teaser fallback remains subcategory resources, then sub-subcategory
  resources, in taxonomy order;
- valid taxonomy matches are placed at their deepest node;
- unmapped sub-subcategory values fold to their subcategory, unmapped
  subcategory values fold to their category, and resources without a matching
  top-level category remain included in `totalResources` but out of category
  counts.

The existing `catalog-nav` namespace, `complete` key, 60-second TTL, payload
compatibility (`{ nav, body, etag }` or `{ body, etag }`), and shared
`publicCache` invalidation path are unchanged. No schema, client, auth, or
independent cache changes were made.

## Real-data parity and timing

The cold-path comparator loaded the existing `LegacyRepository` tree and
derived the old nav projection, then loaded `HomeNavRepository` from the same
database and compared the serialized public nav payloads:

```json
{
  "equal": true,
  "oldMs": 402.22,
  "newMs": 27.48,
  "oldBytes": 15099,
  "newBytes": 15099,
  "oldTotalResources": 1816,
  "newTotalResources": 1816,
  "oldCategories": 9,
  "newCategories": 9
}
```

This is a real development-database observation, not a mock or fixture. The
old and new public nav JSON was byte-for-byte equal.

## Projection query profile

Following `.agents/skills/supabase-postgres-best-practices/SKILL.md` and its
query projection/index guidance, read-only `EXPLAIN (ANALYZE, BUFFERS)` checks
were run for the old `SELECT *` resource query and the new explicit
projection. Both returned 1,816 approved rows with the same ordering and
shared-buffer footprint:

| Query | Plan row width | Sort memory | Execution |
| --- | ---: | ---: | ---: |
| Legacy `SELECT *` | 1,142 | 1,946 kB | 13.860 ms |
| Nav projection | 332 | 655 kB | 2.268 ms |

The projection reduces the selected row width by roughly 71% while retaining
the exact fields required to reproduce the old nav output.

## Static checks

- `npm run type-check -- --pretty false` — PASS
- `npx prettier --check server/home-ssr-data.ts server/repositories/HomeNavRepository.ts` — PASS