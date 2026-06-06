# Section 03 — Re-baseline Migrations + Idempotent Seed

> 🔴 **HIGHEST-RISK SECTION.** The two BLOCKING defects of this entire effort live here
> (PostgreSQL `42710` + `42P01` on a clean migrate). Read the Background fully before touching
> anything. Self-contained: do not require any other document.

## Background — why we RE-BASELINE (not hand-edit the journal)

The migration chain is **structurally incomplete**, verified 2026-06-01 by reading the SQL:

- `migrations/` has `0000_dry_kingpin.sql` (23 tables), `0027_add_api_keys_table.sql`,
  `0028_add_research_discovery_sub_subcategory.sql`. `migrations/meta/` has ONLY
  `0000_snapshot.json` + a `_journal.json` listing ONLY `0000`.
- Drizzle `migrate()` reads `_journal.json` entries and reads exactly `${tag}.sql` per entry —
  **it does NOT scan the folder.** So 0027/0028 are silently skipped today.
- **`0027:18`** does an unconditional `ADD CONSTRAINT api_keys_user_id_users_id_fk`, but
  **`0000:268` already adds that exact FK** (and `0000:1` creates `api_keys`, `0000:296-298`
  its indexes). Replaying 0027 → **`42710` duplicate_object → ABORT**. 0027 is fully redundant.
- **`0028`** is `ALTER TABLE research_discoveries ADD COLUMN ...`, but `research_discoveries` is
  **CREATEd in ZERO migrations** (only `shared/schema.ts:1214`, reached prod via `drizzle-kit
  push`). On a fresh DB → **`42P01` undefined_table → ABORT**.
- Drift: `shared/schema.ts` defines **25 tables**; `0000` baseline creates **23**. Missing from
  the entire chain: **`research_discoveries`, `research_jobs`** (`shared/schema.ts:1173` +
  `:1214`).

⇒ Adding 0027/0028 to the journal (the original D10) would make `migrate()` **ABORT on a clean
Docker volume** — the exact scenario the gate requires. `shared/schema.ts` is the source of
truth. **Decision D10 was REVISED → re-baseline.** (History-preserving alternative documented
in step 1.)

## Requirements

- Fresh, clean-volume `docker compose up` migrates **all 25 tables** with **zero SQL errors**.
- Seeds ~1949-1953 approved resources + 9 canonical categories + an admin user.
- Idempotent on restart (no duplicate rows); data persists across restart (named volume).
- Admin creds env-parameterized; seed reproducible offline.

## Dependencies

- **Requires:** section-02 (containerized, non-root, healthy, `migrations/` in image).
- **Blocks:** section-04 and section-05 (both need a seeded, migrated DB).

## Implementation steps

1. **Re-baseline migrations from `shared/schema.ts`.**
   - Archive the broken chain: move `migrations/0000_dry_kingpin.sql`, `0027_*`, `0028_*`, and
     `migrations/meta/` into `migrations/_archive-pre-rebaseline/` (keep for history, OUT of the
     active folder the migrator scans).
   - Run `npx drizzle-kit generate` against the current `shared/schema.ts` (`drizzle.config.ts`
     already points at it) → ONE fresh baseline `.sql` covering all 25 tables + a fresh
     `_journal.json` + snapshot.
   - **Inspect the generated SQL before committing**: confirm `research_discoveries`,
     `research_jobs`, `api_keys` (with EXACTLY ONE `api_keys_user_id_users_id_fk` FK),
     `sessions`, and every hierarchy table (`categories`, `subcategories`, `sub_subcategories`,
     `resources`, etc.) are present.
   - **Alternative (history-preserving, only if explicitly chosen):** keep the chain; rewrite
     0028 to `CREATE TABLE IF NOT EXISTS research_discoveries (...)` + `research_jobs (...)`
     (defs from `shared/schema.ts:1173`/`:1214`) then the ALTER; neutralize the redundant 0027
     FK. More fragile + more hand-maintenance — re-baseline preferred.

2. **Migrate-on-startup IN-PROCESS (NOT a one-shot service).**
   - The research-suggested one-shot `drizzle-kit migrate` service is **unrunnable here**:
     `drizzle-kit` is a devDep (`package.json:134`) stripped by `npm ci --omit=dev`
     (`Dockerfile:32`), and no `migrate:deploy` script exists.
   - The app ALREADY has `runMigrations()` (`server/index.ts:53`) using the runtime
     `drizzle-orm/node-postgres/migrator` (a real prod dep). Make it run **regardless of
     `NODE_ENV`** (currently prod-only at `:138`) with a **wait-for-db retry loop**.
   - Single replica → no race. Do **NOT** also add a sidecar migrator (double-migrate race on
     `__drizzle_migrations`).

3. **Seed (idempotent) + env admin creds.**
   - Seed runs via `runBackgroundInitialization()` (`routes.ts:3818`, fired after `listen`);
     idempotent (skip-if-exists per entity: admin by email, categories by slug, resources by URL).
   - Parameterize admin creds (D6): edit `server/seed.ts:138-139` (`seedAdminUser`) to read
     `process.env.ADMIN_EMAIL` / `process.env.ADMIN_PASSWORD`, fallback `admin@example.com` /
     `admin123` (dev only).
   - Harden the reseed guard (`routes.ts:3846`
     `needsReseeding = categories.length===0 && actualResourceCount===0`) so a **partial** seed
     (S3 died mid-resources after categories landed) self-heals — e.g. also reseed when
     resource count is below a sane threshold, not only when exactly zero.

4. **Seed source (D5) — BINDING: vendor the JSON.**
   - `server/seed.ts:208` fetches `recategorized_with_researchers_2010_projects.json` from a
     live S3 URL → `docker compose up` would need network and is not reproducible offline.
   - Vendor the JSON into the repo (`server/seed-data/`), read it from disk; fall back to the S3
     URL only if the file is absent. This is a real `seed.ts` code edit, not config.

## Validation gate VG-3 (blocking)

```xml
<validation_gate id="VG-3" blocking="true">
  <prerequisites>section-02 PASS. Start from a CLEAN volume: docker compose down -v.</prerequisites>
  <execute>Fresh up; wait for migrate + seed to COMPLETE (do NOT trust the healthcheck — seed
    runs async AFTER listen); query the DB; then restart and re-count for idempotency.</execute>
  <capture>
    docker compose down -v; docker compose up --build -d 2>&1 | tee e2e-evidence/phase3/up.txt
    docker compose logs -f app 2>&1 | grep -m1 "✅ Database seeding completed" | tee e2e-evidence/phase3/seed-done.txt
    docker exec awesome-list-db psql -U postgres -d awesome_list -c "SELECT count(*) FROM drizzle.__drizzle_migrations;" | tee e2e-evidence/phase3/migrations-applied.txt
    docker exec awesome-list-db psql -U postgres -d awesome_list -c "\dt" | tee e2e-evidence/phase3/tables.txt
    docker exec awesome-list-db psql -U postgres -d awesome_list -c "SELECT to_regclass('research_discoveries'), to_regclass('research_jobs'), to_regclass('api_keys');" | tee e2e-evidence/phase3/missing-tables-check.txt
    curl -s localhost:5001/api/categories | jq 'length' | tee e2e-evidence/phase3/cat-count.txt
    curl -s "localhost:5001/api/resources?limit=1" | jq '.total' | tee e2e-evidence/phase3/res-total.txt
    docker compose restart app; sleep 30
    curl -s "localhost:5001/api/resources?limit=1" | jq '.total' | tee e2e-evidence/phase3/res-total-after-restart.txt
  </capture>
  <pass_criteria>
    No 42710 / 42P01 / "already exists" / "does not exist" in up.txt;
    seed-done.txt contains the completion line; migrations-applied.txt count >= 1 with NO error;
    missing-tables-check.txt shows all THREE non-NULL (research_discoveries + research_jobs +
    api_keys ALL exist — proves the re-baseline fixed the chain);
    cat-count.txt == 9; res-total.txt ~ 1949-1953;
    res-total-after-restart.txt EQUALS res-total.txt (no dupes, data persisted across restart).
  </pass_criteria>
  <review>cat up.txt for SQL errors; cat missing-tables-check.txt (the whole point is these
    tables now exist); compare the two res-total files for exact equality.</review>
  <verdict>PASS -> section-04 + section-05 | FAIL -> fix migrations/seed -> docker compose down -v -> re-run from prerequisites</verdict>
  <mock_guard>Do NOT hand-insert rows to make counts pass — the seed pipeline must produce them.
    Do NOT trust the healthcheck for seed completion (seed runs async AFTER listen) — poll the log.</mock_guard>
</validation_gate>
```

## Acceptance criteria

- [ ] Old chain (0000/0027/0028 + meta) archived to `migrations/_archive-pre-rebaseline/`.
- [ ] `npx drizzle-kit generate` produced one baseline covering all 25 schema tables; SQL inspected.
- [ ] `runMigrations()` runs regardless of `NODE_ENV` with a wait-for-db loop; no sidecar migrator.
- [ ] Admin creds read `ADMIN_EMAIL`/`ADMIN_PASSWORD` (fallback dev defaults).
- [ ] Reseed guard hardened for partial-seed self-heal.
- [ ] Seed JSON vendored to `server/seed-data/`; disk-first, S3 fallback.
- [ ] VG-3 passes from a clean volume: no 42710/42P01; all 3 tables exist; 9 categories; ~1950 resources; restart idempotent + persistent.

## Files to create/modify

- **Create:** `migrations/_archive-pre-rebaseline/` (moved old chain + meta); new baseline
  migration `.sql` + regenerated `meta/` (via `drizzle-kit generate`); `server/seed-data/<vendored>.json`.
- **Modify:** `server/index.ts` (`runMigrations()` NODE_ENV-agnostic + wait-for-db loop);
  `server/seed.ts` (admin env creds + vendored-JSON source); `server/routes.ts` (reseed guard).
