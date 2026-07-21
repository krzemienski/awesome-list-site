---
name: Hand-dropped migration → drift check repair
description: How to legitimize a .sql file dropped into migrations/ without drizzle-kit generate, and why dev DB never gets boot migrations
---

# Hand-dropped migration → drift check repair

A `.sql` file added to `migrations/` without `drizzle-kit generate` fails the drift check twice and silently never runs anywhere:

1. **Journal**: the boot migrator only runs files listed in `migrations/meta/_journal.json`. Add an entry `{idx: <next>, version: "7", when: <ms-ts, monotonically increasing>, tag: "<filename-no-ext>", breakpoints: true}`. Migrator orders by `when`, so keep it increasing; tag↔idx number mismatch is cosmetic.
2. **Schema parity**: the drift check rebuilds a scratch DB from migrations then requires `drizzle-kit push` to report "no changes" against `shared/schema.ts` — so the schema file must mirror the SQL. For tsvector FTS: `customType` returning `"tsvector"`, `.generatedAlwaysAs(() => sql\`...\`)`, and `index(...).using("gin", col)`.

**Caveat:** drizzle-kit push verifies column/index *existence*, not generated-column expression text — editing the expression on one side won't trip the check; sync both manually.

**Dev DB never runs the boot migrator** (`runMigrations` is prod-boot only; dev schema comes from db:push and has no `drizzle.__drizzle_migrations` table). Apply new idempotent migration SQL to dev with `psql "$DATABASE_URL" -f migrations/<file>.sql` or the column simply won't exist in dev.

**Why:** an external merge hand-dropped an FTS migration (search_tsv + GIN index) unjournaled — it would have silently never applied in prod while tsc/dev looked fine.

**How to apply:** whenever a merge or contributor adds files under `migrations/`, run the `migration-drift` workflow before committing; fix journal + schema.ts + dev DB in that order.

Related: `search_tsv` on `resources` is currently unused infra — no server code reads it yet (shipped ahead of an FTS search implementation).

**drizzle-kit generate gotcha:** because the hand-dropped migrations (0029-0031) have no snapshots in `migrations/meta/`, `drizzle-kit generate` diffs against the last real snapshot and RE-EMITS their DDL (e.g. search_tsv + GIN index) plus a wrong sequence name (e.g. `0004_x.sql`). After generating: strip the re-emitted statements down to only the new change, rename the file to the next real sequence number, rename the snapshot to match, and fix the journal tag. The new snapshot correctly captures full schema.ts, so future generates are clean.
