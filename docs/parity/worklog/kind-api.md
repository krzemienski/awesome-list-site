# Worklog — kind-api (resource kinds API end to end)

Task: give the home kind strip and the admin catalog a complete, contract-tested
backend for resource *kinds* — a deterministic read-time resolver, `kind` +
`resolvedKind` on every public resource payload, full-set counts, a `?kind=`
list filter and admin editing of `kind` / `featured` — without any UI and
without backfilling stored kinds. Decisions later tasks must honour are in
`docs/parity/assumptions/kind-api.md`; evidence is in
`docs/parity/evidence/kind-api/`.

## What was found

- `shared/resourceKinds.ts` held the enum and the tag mappings but no resolver;
  `server/lib/resourceKindPresentation.ts` was a stub with no importers
  (`dead-exports` would have flagged it the moment it gained one — it was
  removed rather than kept as a second home).
- Every public resource payload already funnels through ONE serializer,
  `stripInternalResourceFields` in `server/lib/publicResource.ts` (the "public
  serializer choke point" note), so adding the two fields there covers every
  surface. Send sites walked (all confirmed live in
  [curl-surfaces.txt](../evidence/kind-api/curl-surfaces.txt)):

  | surface | route file | how the fields get there |
  |---|---|---|
  | `GET /api/resources` (list, `?tags=` tag landing, `?kind=`) | `server/routes/domains/catalog-contributions.ts` | `toPublicResource` → `stripInternalResourceFields` |
  | `GET /api/resources/:id`, `/related` | same | same |
  | `GET /api/search` | same | same |
  | `GET /api/awesome-list` (tree) | `server/repositories/LegacyRepository.ts` | `stripInternalResourceFields` per row |
  | `GET /api/awesome-list/listing` | `catalog-contributions.ts` | same |
  | `GET /api/public/resources`, `/:id` | `server/api/public.ts` | same |
  | `GET /api/journeys/:id` step resources | `server/repositories/LearningJourneyRepository.ts` | `resolveResourceKind` inline (the repo shapes its own step-resource rows and never went through the serializer) |
  | `GET/POST /api/recommendations` | `server/routes/domains/journeys-recommendations.ts` | `stripInternalResourceFields` on `item.resource` |
  | `GET /api/public/collections/:shareId` (published bookmark collections; also read by `og-middleware.ts` for meta) | `server/routes/domains/user-features.ts` → `CollectionRepository.getPublicCollection` | `withResourceKindFields` per row in the repository: the projection is a hand-picked column list (never the raw row), so it selects `kind` + `metadata` only to resolve the fields and drops `metadata` again. **Missed by the first walk** — found by completion review round 2; the walk had been scoped to routes that serialize a `Resource`, and this one builds its own projection. Now pinned by a strict named contract (`PublicCollectionResponse`) plus an integration case. |

- Admin edits: `admin-content.ts` edits resources through per-field routes
  (`PUT /:id/approve`, `/reject`, …), not one big PATCH, so the two new PATCH
  routes follow that shape. The audit repository is `AuditRepository`
  (`auditRepo.logResourceAudit(...)`), not the `AuditLogRepository` the plan
  named; the plan's `asyncHandler` exists but has zero route usages, so the
  sibling `try/catch + sendOperationalFailure` pattern was kept.
- The `resources.kind` column and typed `resource_kinds` config landed in
  `parity-foundation`; the foundation assumptions left two open questions
  (precedence, `other`) that this task closes (pointers added in
  `docs/parity/assumptions/foundation.md` §3/§4).

## What was changed

| file | change |
|---|---|
| `shared/resourceKinds.ts` | `RESOURCE_KIND_VALUES`, `resourceKindSchema`, `normalizeResourceKindTag` (NFKC + lower-case + trim + whitespace/underscore → hyphen; it does **not** singularize — singular and plural forms are both listed as mapping words), `buildResourceKindTagMappings`, `buildResourceKindCategoryMappings`, pure `resolveResourceKindFrom` |
| `server/lib/resourceKinds.ts` (new) | `resolveResourceKind(resource, config?)` → `{ kind, source: "stored" \| "inferred" \| "default" }`; `withResourceKindFields`; `resolvedResourceKindSql()` — the SQL twin of the resolver (stored → tag CASE → category CASE → `'other'`); `emptyResourceKindCounts` |
| `server/lib/publicResource.ts` | `stripInternalResourceFields` now emits `kind` (stored or `null`) and `resolvedKind` |
| `server/repositories/ResourceRepository.ts` | `kind` list filter on the resolved expression; `getResourceKindCounts({ category? })` as one grouped statement; `setResourceKind`, `setResourceFeatured` (targeted jsonb merge, no metadata rewrite) |
| `server/repositories/LearningJourneyRepository.ts` | step resources carry both fields |
| `server/routes/domains/catalog-contributions.ts` | `GET /api/resources/kinds/counts` (60 s `catalog-taxonomy` cache, listing `Cache-Control`, unknown category → uncached zeros), `?kind=` with the controlled-facet 400 envelope, `X-Total-Count` on every list response |
| `server/routes/domains/admin-content.ts` | `PATCH /api/admin/resources/:id/kind` `{ kind: ResourceKind \| null }`, `PATCH …/featured` `{ featured: boolean }` — strict Zod, admin-only, origin-checked, audit-logged; `kind` accepted by the admin create/update bodies |
| `server/config.ts`, `awesome-list.config.yaml`, `shared/schema.ts` | typed `category_mappings`; `kind` is admin-owned: it lives in `adminResourceWriteSchema` (admin create/update) and is deliberately absent from the contributor `insertResourceSchema`, so `POST /api/resources` strips it and pins `kind: null` (assumption 5a) |
| `server/contracts/endpointSchemas.ts`, `docs/api/openapi.yaml` | response + query + body contracts for the three endpoints and the two new fields; spec regenerated |
| `scripts/validation/openapi-drift.ts`, `scripts/validation/response-contract-drift.ts` | route baseline 174, three new GET probes (counts, scoped counts, `?kind=tools`) |
| `client/src/types/awesome-list.ts`, `client/src/lib/static-data.ts` | `kind?`, `resolvedKind?` on `Resource`; `fetchKindCounts()`, `kindCountsUrl()`, `STRIP_KINDS` (no UI) |
| `docs/API.md` | content-table rows, "Resource kinds" section, admin PATCH rows, data model |
| tests | `tests/unit/resource-kinds.test.ts` (22), `tests/unit/client-resource-kinds.test.ts` (6), `tests/integration/api/resource-kinds.test.ts` (18) |

Rejected alternatives:

- **Resolving kinds in JS after the query** for the counts and the filter — an
  O(n) walk per request and a second source of truth; the SQL expression is
  generated from the same mappings the TS resolver reads, and the integration
  test proves row-by-row agreement between the two on seeded data.
- **Removing `other` from the counts payload** — the strip never shows it, but
  dropping it would make `total` unexplainable; it stays in the payload and
  `STRIP_KINDS` excludes it on the client.
- **A `featured` column** — the brief's admin toggle only needs a flag the
  public payload already carries in `metadata`; a column would need a migration
  plus a publish-diff idempotency check for a boolean.
- **Mutating PATCH probes in `response-contract-drift`** — the gate runs against
  the live dev database; probes stay GET-only and the PATCH contracts are proven
  by the integration test instead.

## Gates and checks

| check | result | evidence |
|---|---|---|
| `npx tsc --noEmit` | clean | run inline; no file |
| `npm run validate:openapi` | PASS 174 routes / 174 spec / 146 documented before the rebase; 177 / 177 / 149 on the rebased tree (unchanged by the round-2 collection contract: it replaces the generic `JsonResponse` on an existing path) | [gates-contracts.txt](../evidence/kind-api/gates-contracts.txt) |
| `npm run validate:response-contracts` | PASS 15 checks before the rebase, 18 on the rebased tree (contact probes merged in), 19 after round 2 (public collection probe), 0 mismatches, observer liveness verified | same; [round2-public-collection.md](../evidence/kind-api/round2-public-collection.md) |
| mutation probe: drop `resolvedKind` in the serializer | gate FAILS with 6 mismatches, file restored byte-identical | [contract-mutation-probe.md](../evidence/kind-api/contract-mutation-probe.md) |
| mutation probe: drop `kind` and keep `metadata` in the collection projection | `published bookmark collections` integration case FAILS on the observer's `PublicCollectionResponse` mismatch line (`kind: Invalid option`, `Unrecognized key: "metadata"`), file restored | [round2-public-collection.md](../evidence/kind-api/round2-public-collection.md) |
| `dead-exports` | PASS | [gates-contracts.txt](../evidence/kind-api/gates-contracts.txt) |
| `npm run test:unit` | 298 passed (15 files) | [test-unit.txt](../evidence/kind-api/test-unit.txt) |
| `test:integration` | new file 21/21 (18 at the baseline measurement + two admin-ownership cases after review round 1 + the published-collection case after round 2); failing set identical to HEAD (162 → 162, name-for-name) | [test-integration-baseline.txt](../evidence/kind-api/test-integration-baseline.txt) |
| mutation probe: persist `req.body.kind` on the contributor insert | `never persists a kind … sent by a contributor` FAILS; file restored | run inline (see assumption 5a) |
| `dead-components` (dead-file reachability) | PASS after moving the client helpers into `client/src/lib/static-data.ts`; a standalone `client/src/lib/resourceKinds.ts` with only a test importer is unreachable from `client/index.html` and the gate cannot be pinned | run inline |
| eslint (per file vs HEAD) | no new rule classes; +1 `no-misused-promises` per new async route, the pattern every sibling route already carries | [eslint-baseline.txt](../evidence/kind-api/eslint-baseline.txt) |
| counts total == `SELECT count(*) … status='approved'` (1816), scoped 333 == 333 | PASS | [curl-counts.txt](../evidence/kind-api/curl-counts.txt) |
| `?kind=events&limit=5` only `resolvedKind:"events"`; every bucket == filter `total` == walked rows, 0 mismatches | PASS | [curl-kind-filter.txt](../evidence/kind-api/curl-kind-filter.txt) |
| admin PATCH set/clear kind + featured, 4 audit rows, 400/401/403/404 | PASS (row and audit rows restored afterwards) | [curl-admin-patch.txt](../evidence/kind-api/curl-admin-patch.txt) |
| every public surface carries both fields | PASS (list, tag landing, detail, related, search, tree 1816/1816, listing, public API, journey steps 18/18, recommendations; published collection added in round 2) | [curl-surfaces.txt](../evidence/kind-api/curl-surfaces.txt), [round2-public-collection.md](../evidence/kind-api/round2-public-collection.md) |
| counts endpoint under burst (60 concurrent cold-cache requests) | 60/60 200, p95 0.25 s, listing healthy afterwards | [counts-burst.txt](../evidence/kind-api/counts-burst.txt) |
| `seo-snapshot --gate --parity`, `taxonomy-listing-parity`, `taxonomy-no-corpus-fetch`, `guest-recommendations`, `pool-probe` | all PASS | [gates-no-regression.txt](../evidence/kind-api/gates-no-regression.txt) |
| `baseline:compare` (prod snapshot vs local) | `/api/resources?limit=24` and `/api/resources/185020`: key additions only (`kind`, `resolvedKind`); count deltas are corpus size and were already in the prod-baseline task's compare | [baseline-compare.md](../evidence/kind-api/baseline-compare.md) |

Notes on the measurements:

- The integration suite must be compared **sequentially**
  (`--no-file-parallelism`): every file truncates the shared test database in
  `beforeEach`, so the default parallel run destroys sibling files' rows
  mid-test (182 failures, 12 of them in the new file). Sequentially the
  pre-existing set is exactly the 162 the trustworthiness task describes and
  the new file is green in both modes of measurement that isolate it. The suite
  defect itself is out of scope here.
- Live admin curl checks need `Origin` to match the request host exactly
  (`http://localhost:5000` against `localhost`, not `127.0.0.1`), or every
  mutation is a `403 Cross-origin request rejected` before auth runs.
- The 403-for-signed-in-non-admin path is proven in the integration test with
  a real non-admin `users` row; the live server has no non-admin header
  identity, so the transcript covers 401 (anonymous) and the origin 403.
- The `openapi-drift` route baseline moved 171 → 174 for the three new routes
  in isolation and to 177 after rebasing onto the merged contact task (its
  three routes + these three); the count and hash were recomputed from the
  gate's own "got N/hash" line on the rebased tree, not added by hand. The
  same rebase surfaced that this task's dev database was behind main's schema
  (migration 0048, contact provenance columns) — applied with psql, since dev
  never runs the boot migrator.

## Known gaps left on purpose

- No UI: the strip and the admin select/toggle are page tasks; `fetchKindCounts`
  and `STRIP_KINDS` are exported from `client/src/lib/static-data.ts` (next to
  the listing/nav fetchers, so the file stays reachable from the SPA) for
  them; until a page imports them their only importer is
  `tests/unit/client-resource-kinds.test.ts`, which `dead-exports` counts by
  design (its usage scope includes `tests/`).
- Completion review round 1 (recorded here on purpose): the first cut put
  `kind` on the shared `insertResourceSchema`, which the contributor submit
  handler parses from the raw body — any signed-in user could have pinned a
  stored kind on a pending submission. Fixed by splitting the schema
  (assumption 5a) and covered by two new integration cases.
- Completion review round 2: the send-site walk missed
  `GET /api/public/collections/:shareId`, whose resources come from a
  hand-picked projection in `CollectionRepository.getPublicCollection` and
  never touch the serializer. Lesson for the next surface sweep: enumerate
  every route that *sends resource-shaped rows*, not only the ones that
  serialize a `Resource` — grep the repositories for `.from(resources)` with a
  custom `select({...})`. Fixed in the repository (fields resolved per row,
  `metadata` never leaves), typed on both `PublicCollectionResource`
  interfaces, pinned by a strict named response contract, a gate probe (real
  200 when the database has a published collection, else the 404 envelope)
  and an integration case that publishes a collection and asserts zero
  observer mismatches.
- No stored-kind backfill: 1656 of 1816 approved resources resolve to `other`
  today because the tag mappings are narrow; widening them is a config change,
  not a migration.
