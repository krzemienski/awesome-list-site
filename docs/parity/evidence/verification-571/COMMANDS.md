# Task 571 command ledger

All commands were run from the repository root at
`a1e2a9fc598a34b4e662a27f5c8bdb6a869c8f3e`. This is the concise command
ledger; every sanitized raw gate log, including Vite/Clerk notices,
progress output, debug output, and root-script-drift's informational
recognized-file list, is retained in
[RAW-GATE-LOGS.md](RAW-GATE-LOGS.md).

## Parity selection — exit 2

```text
$ npm run test:parity -- --only app.home.index,app.home.curated,app.category,app.about,app.shell.palette

> rest-express@1.0.0 test:parity
> node tests/parity/runner.mjs --only app.home.index,app.home.curated,app.category,app.about,app.shell.palette

[parity] precondition failure: Error: BASE_URL must be supplied (loopback origin, e.g. http://127.0.0.1:5000)
    at requireLoopback (file:///home/runner/workspace/tests/parity/runner.mjs:311:21)
    at main (file:///home/runner/workspace/tests/parity/runner.mjs:318:19)

[task-571 exit=2]
```

## Parity selection with README prerequisite — exit 2

```text
$ BASE_URL=http://127.0.0.1:5000 npm run test:parity -- --only app.home.index,app.home.curated,app.category,app.about,app.shell.palette

> rest-express@1.0.0 test:parity
> node tests/parity/runner.mjs --only app.home.index,app.home.curated,app.category,app.about,app.shell.palette

Gate lease acquired (db-heavy: parity-baseline)
[identity] creating disposable Clerk admin [redacted-bridge-id]
[identity] teardown after failure also failed: identity teardown incomplete: verification: fetch failed
Gate lease released (db-heavy: parity-baseline)
[parity] infrastructure failure: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5000/sign-in
Call log:
  - navigating to "http://127.0.0.1:5000/sign-in", waiting until "domcontentloaded"

    at createDisposableAdmin (/home/runner/workspace/tests/parity/identity.mjs:267:16)
    at async main (/home/runner/workspace/tests/parity/runner.mjs:373:18)

[task-571 exit=2]
```

This was a changed-input retry, not a repeated identical failure. No third
attempt was made because the loopback prerequisite was unavailable.

## Final five-row attempt after the app workflow started — runner incomplete

```text
$ BASE_URL=http://127.0.0.1:5000 npm run test:parity -- --only app.home.index,app.home.curated,app.category,app.about,app.shell.palette
```

The command was allowed to run once after the workflow became available. The
execution host stopped it at its 300-second limit while the harness was still
running; therefore the harness did not print an exit code, finish the selected
rows, create a baseline result directory, or report identity teardown. The
execution wrapper reported timeout/exit `-1`. Its raw terminal output is
retained in [FINAL-ATTEMPT.log](FINAL-ATTEMPT.log) and
[RAW-GATE-LOGS.md](RAW-GATE-LOGS.md). Exact two-ID cleanup subsequently
completed with exit 0; the shared STATUS/REPORT files were byte-identical
before and after the timeout.

## TypeScript — exit 0

```text
$ npm run check

> rest-express@1.0.0 check
> tsc

[task-571 exit=0]
```

## Unit tests — exit 0

```text
$ npm run test:unit

> rest-express@1.0.0 test:unit
> vitest run tests/unit

 RUN  v4.1.10 /home/runner/workspace
 Test Files  16 passed (16)
      Tests  315 passed (315)
   Duration  8.75s

[task-571 exit=0]
```

Vitest also printed Vite esbuild-deprecation warnings; they did not cause a
test failure.

## Response contracts — exit 0

```text
$ npm run validate:response-contracts

> rest-express@1.0.0 validate:response-contracts
> tsx scripts/validation/response-contract-drift.ts

[contract] response mismatch for "get:/api/__contract-drift-probe" (GET /api/__contract-drift-probe) status 401: message: Invalid input: expected string, received undefined
  ok  GET /api/auth/user (anonymous) -> 200
  ok  GET /api/auth/user (audit-key admin) -> 200
  ok  GET /api/resources -> 200
  ok  GET /api/awesome-list/listing (first category) -> 200
  ok  GET /api/recommendations -> 200
  ok  POST /api/recommendations (audit-key admin) -> 200
  ok  GET /api/admin/pending-resources (audit-key) -> 200
  ok  GET /api/resources/:id (id=188015) -> 200
  ok  GET /api/auth/me (audit-key admin) -> 200
  ok  GET /api/admin/stats (audit-key) -> 200
  ok  GET /api/journeys (anonymous) -> 200
  ok  GET /api/config (anonymous) -> 200
  ok  POST /api/contact (default-off) -> 404
  ok  GET /api/admin/contact-submissions (audit-key) -> 200
  ok  GET /api/resources/kinds/counts -> 200
  ok  GET /api/resources/kinds/counts (first category) -> 200
  ok  GET /api/resources?kind=tools -> 200
  ok  GET /api/public/collections/:shareId (no published collection in this database; 404 envelope) -> 404
  ok  GET /api/__contract-drift-probe (observer liveness) -> 401
Response-contract drift PASS: 19 endpoint checks, 0 real mismatches, observer liveness verified

[task-571 exit=0]
```

The probe's expected 401 is logged by the observer and is explicitly excluded
from the real-mismatch count.

## OpenAPI drift — exit 0

```text
$ npm run validate:openapi

> rest-express@1.0.0 validate:openapi
> tsx scripts/validation/openapi-drift.ts

OpenAPI drift PASS: 178 API routes, 178 named contracts, 150 paths

[task-571 exit=0]
```

## Boot migration safety — exit 0

```text
$ npx tsx scripts/verify-boot-migration-safety.ts

=== Scenario A: half-applied schema, empty journal ===
  Applied 47/94 baseline statements (partial schema, no journal).
Found migrations at: ./migrations
Running database migrations...
✓ Migrations completed successfully
✓ Migration journal verified: 27 recorded, all 27 journal entr(y/ies) applied
  ✓ Boot COMPLETED the half-applied schema (all tables + final index present, journal recorded).

=== Scenario B: non-idempotent new migration must fail loudly ===
  Applied full baseline schema directly (journal table absent).
Found migrations at: ./migrations
Running database migrations...
Migration failed with "already exists" (42P07). This means a migration is NOT idempotent — the rest of its batched statements were rolled back and the schema may be incomplete. Fix the migration to use IF NOT EXISTS / duplicate_object guards. Refusing to start with a partial schema.
  ✓ Boot FAILED LOUDLY ("relation "users" already exists...") and nothing was half-applied.

✅ Boot migration safety proven: completes partial schemas, fails loudly on non-idempotent migrations.

[task-571 exit=0]
```

## Migration drift — exit 0

```text
$ npx tsx scripts/check-migration-drift.ts

Step 1/3: journal integrity check...
  ✓ 27 migration file(s), all journaled, no orphans.
Step 2/3: schema reproduction check on scratch database...
  ✓ Created scratch database "mig_drift_check".
  ✓ Legacy goals/types normalize; incomplete and dismissed lifecycle states remain honest.
  ✓ Drizzle migrator ran cleanly against the scratch database.
  ✓ drizzle-kit push reports no changes — migrations reproduce shared/schema.ts exactly.
  ✓ Dropped scratch database "mig_drift_check".
Step 3/3: id-sequence drift check (every serial-id table)...
  ✓ 27 serial-id sequence(s) checked — none behind max(id).

✅ No migration drift: migrations/ fully reproduces shared/schema.ts, and no id-sequence drift.

[task-571 exit=0]
```

## Dead exports — exit 0

```text
$ node scripts/validation/dead-exports.mjs

PASS canaries :: export/import extraction + re-export & star following + namespace/dynamic whole-module uses + allowlist contract verified against synthetic modules
PASS dead-exports :: 841 export(s) across 216 module(s) in client/src/ + shared/ checked, 791 imported elsewhere, 50 pinned exception(s)

[task-571 exit=0]
```

## Root script drift — exit 0

```text
$ node scripts/validation/root-script-drift.mjs

PASS canaries :: reference matching + comment stripping + candidate-import resolution + manifest conditions verified against synthetic samples
PASS root-script-drift :: 28 root + active scripts/ executable file(s) checked, 0 stray

[task-571 exit=0]
```

The command additionally listed the recognized configuration and referenced
manual-runbook files; it reported no stray executable files.