# Assumptions — kind-api (resource kinds end to end)

Decisions taken while adding the resolver, the public `kind` / `resolvedKind`
fields, the full-set counts endpoint, the `?kind=` filter and the admin PATCH
endpoints. The home kind strip (`parity-13`) and the admin catalog tabs
(`parity-W3 admin catalog`) consume these; they should not re-derive any of it.

## 1. Resolution precedence: stored → tag mapping → category mapping → `other`

`resolveResourceKind(resource, config)` returns `{ kind, source }` with
`source ∈ { "stored", "inferred", "default" }` and applies, in order:

1. **Stored** — `resources.kind` when it is one of the six enum values
   (`tools`, `libraries`, `standards`, `events`, `protocols`, `other`). A stored
   `other` is honoured as a stored value: an admin who explicitly files a
   resource under `other` wins over any tag that would infer something else.
   An unknown string in the column (impossible through the API, possible by
   hand) is treated as absent, not as an error.
2. **Tag mapping** — `metadata.tags` (the only place tags live; the `tags`
   table is empty) after `normalizeResourceKindTag` (NFKC fold, lower-case,
   trim, runs of `_`/whitespace → `-`, edge hyphens dropped — so `Tools`,
   `TOOLS` and ` tools ` all match; it does **not** singularize, which is why
   the generic defaults list both `tool` and `tools`, `library` and
   `libraries`, … and a configured word must be listed in every form it
   should match). Configured words come from `resource_kinds.tag_mappings` in
   `awesome-list.config.yaml`, and each kind also matches its own name. When a
   resource carries tags for two kinds, **enum order** breaks the tie
   (`tools` before `libraries` before `standards` …) — deterministic, no
   "first tag wins" dependence on tag order.
3. **Category mapping** — `resource_kinds.category_mappings` matched against
   `category`, `subcategory`, `subSubcategory` with the same normaliser. Tags
   beat categories because a tag is a statement about *this* resource while a
   category is a statement about its neighbourhood.
4. **Default** — `other`, `source: "default"`.

`resolvedKind` is never null; `kind` is the raw stored column (null until an
admin sets one). Both are emitted by the single public serializer
(`stripInternalResourceFields`), so every surface that goes through it gets
them without per-route work. Two surfaces build their own resource rows and
resolve the fields per row instead — journey step resources
(`LearningJourneyRepository`) and published bookmark collections
(`CollectionRepository.getPublicCollection`, a hand-picked projection that
selects `metadata` only to resolve the kind and drops it again). Both carry
strict named response contracts so a projection that loses either field
fails the contract gates. The SQL twin (`resolvedResourceKindSql`) is built
from the same mapping tables, and the integration test proves the SQL and the
TypeScript resolver agree row by row over the whole approved corpus.

**Revisit when:** an operator wants category to beat tag for a specific kind.
Do it by adding a stored kind to those resources (or a targeted config rule),
not by flipping the global order — the home strip and the `?kind=` filter must
keep counting the same way.

## 2. `other` is in the counts payload but is never a strip chip

`GET /api/resources/kinds/counts` returns all six buckets plus `total`, and
`total` always equals `SELECT count(*) FROM resources WHERE status='approved'`
(per category when scoped). `other` is included so the payload is
self-checking (`sum(buckets) === total`) and so the admin can see how much of
the corpus is still unclassified. It must **not** render as a chip on the home
kind strip: the canonical strip shows tools / libraries / standards / events /
protocols only, and today `other` is ~91 % of the corpus (1 656 of 1 816), so a
chip would dwarf the real facets and link to a listing that is just "the
catalog minus a few hundred rows". `client/src/lib/static-data.ts` exports
`STRIP_KINDS` (enum order minus `other`) for the strip to iterate.

**Revisit when:** stored kinds have been curated far enough that `other` is a
minority and the brief adds an "Other" chip.

## 3. Counts are full-set, one SQL statement, cached like sibling aggregates

The counts endpoint runs one grouped query (`GROUP BY` the resolved-kind CASE
expression) and never touches the pagination path. It is cached in the
`catalog-taxonomy` namespace (60 s, the same TTL as the nav tree) and sends
`Cache-Control: public, max-age=60, must-revalidate` like the listing
endpoints. A `?category=` that resolves to nothing answers zeros with
`max-age=0` and is not cached (so a typo cannot pin an empty payload), and a
blank, repeated or >200-character `category` is a `400` (the query contract's
`validation_failed` envelope, or `invalid_category` for a whitespace-only or
over-long value that passes the contract's `min(1)`).
`?category=` accepts a slug **or** an exact name because the nav tree exposes
both and callers should not have to know which one they hold.

**Revisit when:** kinds get their own sidebar node; then the counts should join
the taxonomy tree cache instead of living beside it.

## 4. `?kind=` filters by *resolved* kind and reports the same totals

`GET /api/resources?kind=tools` applies the SQL resolver (stored OR inferred)
so its `total` and `X-Total-Count` equal the `tools` bucket of the counts
endpoint for the same scope. Filtering only by the stored column would make
the strip count 23 and the click-through list 0. The value is case-insensitive
and an unknown kind is `400 invalid_kind` with the `allowed` list — the same
controlled-facet envelope the other typed filters use, rather than the "empty
list, 200" behaviour that hides typos.

`X-Total-Count` is now sent on every `/api/resources` response (with or
without `kind`) because the strip's click-through wants the total without
parsing the body.

## 5. Featured lives in `metadata.featured`; kind is a real column

There is no `featured` column and this task does not add one (the brief scopes
out data migrations). `PATCH /api/admin/resources/:id/featured` writes
`metadata.featured` with a targeted jsonb merge that leaves every other
metadata key alone (proved on a row with NULL metadata too). The stored kind
uses the existing nullable `resources.kind` column; `PATCH …/kind` with
`{ kind: null }` clears it and the resource falls back to inference at once.
Both endpoints write one `resource_audit_log` row (`action: "updated"`,
`changes: { kind, previousKind }` / `{ featured, previousFeatured }`) through
the injected `auditRepo.logResourceAudit`, which is what the sibling admin
routes use (the brief's `AuditLogRepository` name does not exist in the tree;
`AuditRepository` in `server/repositories/AuditRepository.ts` is the class).

**Revisit when:** featured becomes a sort key or a filter on a hot path; then
promote it to a column with an index and keep the PATCH contract unchanged.

### 5a. The stored kind is admin-owned — contributors can never set it

Because a stored value beats inference on every public surface, letting a
signed-in contributor pin one on a pending submission would let that value
survive approval and steer public classification, `?kind=` filters and the
strip counts until an admin noticed. So `kind` is **not** part of the
contributor `insertResourceSchema` (zod strips it from the raw body on
`POST /api/resources` / `/api/submit`, and the insert pins `kind: null`
explicitly); only `adminResourceWriteSchema`, used by the admin create/update
routes, and the two admin PATCH routes accept it. The integration test
`stored kind is admin-owned` posts `kind: "events"` as a contributor through
both aliases, reads the row back as `NULL`, and proves the admin routes still
set and clear it. The completion code review caught the original leak (the
first cut had added `kind` to the shared insert schema).

**Revisit when:** contributors get a kind field on the submit form; then it
must arrive as a *suggestion* (e.g. `metadata.suggestedKind`) that an admin
promotes, never as the stored column.

## 6. No backfill: kinds are resolved at read time

No migration writes stored kinds. Inference is cheap (one CASE expression, the
mapping arrays are bound once per query) and keeping the column sparse means
the admin table can tell "chosen by a human" (`kind`) from "guessed"
(`resolvedKind`, `source`). The resolver is memoised per row object so the
SSR prerender and the JSON path do not resolve the same tree twice.

**Revisit when:** the mapping tables grow past a few dozen words or the counts
query stops fitting in the pool budget (`pool-probe` gate); then backfill
`kind` in a migration and keep the resolver as the fallback.

## 7. Earlier foundation assumptions this task closes

- `foundation.md` §3 ("`kind` is not accepted on the resource insert schema
  yet"): still true for the contributor `insertResourceSchema` — on purpose
  (section 5a). The stored kind is accepted only by the admin-only
  `adminResourceWriteSchema` (admin POST/PUT) and the two admin PATCH routes.
- `foundation.md` §4 (shared helpers stay un-exported): `shared/resourceKinds.ts`
  now exports the enum values, the Zod schema, the normaliser, the mapping
  builders and the pure resolver because `server/lib/resourceKinds.ts`, the
  contracts and the unit tests import them. `resourceKindPresentation.ts`
  (label map, no importer) was deleted rather than exported; labels are a
  page-task concern.
