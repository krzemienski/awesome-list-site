# Sanitized raw gate logs

These are complete raw terminal outputs from the task-571 command files after
sanitizing an ephemeral test-user UUID and opaque disposable bridge IDs. No
secrets, email addresses, Clerk IDs, or other personal data are retained.
`FINAL-ATTEMPT.log` is duplicated here for a single complete raw-log record.

## `check.log`

```text
> rest-express@1.0.0 check
> tsc


[task-571 exit=0]
```

## `unit.log`

```text
> rest-express@1.0.0 test:unit
> vitest run tests/unit

10:08:28 PM [vite] warning: `esbuild` option was specified by "vite:react-babel" plugin. This option is deprecated, please use `oxc` instead.
10:08:28 PM [vite] warning: `optimizeDeps.esbuildOptions` option was specified by "vite:react-babel" plugin. This option is deprecated, please use `optimizeDeps.rolldownOptions` instead.
Both esbuild and oxc options were set. oxc options will be used and esbuild options will be ignored. The following esbuild options were set: `{ jsx: 'automatic', jsxImportSource: undefined }`

 RUN  v4.1.10 /home/runner/workspace

◇ injected env (0) from .env // tip: ⌘ override existing { override: true }
🧪 Provisioning dedicated test database "heliumdb_test"...
🧪 Applying schema to test database...
No config path provided, using default 'drizzle.config.ts'
Reading config file '/home/runner/workspace/drizzle.config.ts'
Using 'pg' driver for database querying
[⣷] Pulling schema from database...
[⣯] Pulling schema from database...
[⣟] Pulling schema from database...
[⡿] Pulling schema from database...
[⢿] Pulling schema from database...
[⣻] Pulling schema from database...
[⣽] Pulling schema from database...
[⣷] Pulling schema from database...
[⣯] Pulling schema from database...
[⣟] Pulling schema from database...
[✓] Pulling schema from database...
[i] No changes detected
🧪 Test database is ready.

 Test Files  16 passed (16)
      Tests  315 passed (315)
   Start at  22:08:29
   Duration  8.75s (transform 2.19s, setup 5.77s, import 2.21s, tests 11.61s, environment 3ms)


[task-571 exit=0]
```

## `response-contracts.log`

```text
> rest-express@1.0.0 validate:response-contracts
> tsx scripts/validation/response-contract-drift.ts

Claude service initialized: router router.hack.ski (bearer token); models haiku=cc/claude-haiku-4-5-20251001 sonnet=cc/claude-sonnet-5 opus=cc/claude-opus-5; primary=cc/claude-opus-5
Attention: Clerk collects telemetry data from its SDKs when connected to development instances.
The data collected is used to inform Clerk's product roadmap.
To learn more, including how to opt-out from the telemetry program, visit: https://clerk.com/docs/telemetry.

[clerkAuth] audit-key bypass: GET /api/auth/user
{"event":"ops.db_query","command":"select","durationMs":505,"outcome":"ok"}
{"event":"ops.db_query","command":"select","durationMs":576,"outcome":"ok"}
[COLD-START DEBUG] {
  userId: 'anonymous',
  viewHistoryLength: 0,
  completedResourcesLength: 0,
  ratingsCount: 0,
  bookmarksLength: 0,
  isColdStart: true
}
[COLD-START] Generating popular resources for new user: anonymous
[clerkAuth] audit-key bypass: POST /api/recommendations
[COLD-START DEBUG] {
  userId: '[redacted-test-user-id]',
  viewHistoryLength: 0,
  completedResourcesLength: 0,
  ratingsCount: 1,
  bookmarksLength: 1,
  isColdStart: false
}
[PERSONALIZATION DEBUG] {
  userId: '[redacted-test-user-id]',
  totalResources: 1000,
  eligibleResources: 1000,
  excludedByViews: 0,
  excludedByCompleted: 0,
  excludedByJourneys: 0,
  bookmarksCount: 1,
  viewedCategories: {},
  bookmarkedCategories: { 'Intro & Learning': 1 },
  journeyCategories: {},
  preferredCategories: [],
  activeJourneys: 2,
  completedJourneys: 1
}
[RULE-BASED DEBUG] Category frequency from bookmarks/favorites: { 'Intro & Learning': 1 }
[RULE-BASED DEBUG] Journey category frequency: {}
[RULE-BASED DEBUG] Rating-based category preferences: { 'Infrastructure & Delivery': { positive: 1, negative: 0 } }
[RECOMMENDATIONS DEBUG] {
  userId: '[redacted-test-user-id]',
  totalRecommendations: 10,
  recommendedCategories: [
    {
      category: 'Players & Clients',
      confidence: 90,
      type: 'ai_powered',
      reason: 'Relevant to Players & Clients'
    },
    {
      category: 'Protocols & Transport',
      confidence: 80,
      type: 'ai_powered',
      reason: 'Relevant to Protocols & Transport'
    },
    {
      category: 'Protocols & Transport',
      confidence: 75,
      type: 'ai_powered',
      reason: 'Relevant to Protocols & Transport'
    },
    {
      category: 'General Tools',
      confidence: 70,
      type: 'ai_powered',
      reason: 'Relevant to General Tools'
    },
    {
      category: 'Encoding & Codecs',
      confidence: 65,
      type: 'ai_powered',
      reason: 'Relevant to Encoding & Codecs'
    },
    {
      category: 'Encoding & Codecs',
      confidence: 60,
      type: 'ai_powered',
      reason: 'Relevant to Encoding & Codecs'
    },
    {
      category: 'Protocols & Transport',
      confidence: 58,
      type: 'ai_powered',
      reason: 'Relevant to Protocols & Transport'
    },
    {
      category: 'Intro & Learning',
      confidence: 46,
      type: 'rule_based',
      reason: 'A good fit for getting started'
    },
    {
      category: 'Intro & Learning',
      confidence: 46,
      type: 'rule_based',
      reason: 'A good fit for getting started'
    },
    {
      category: 'Intro & Learning',
      confidence: 46,
      type: 'rule_based',
      reason: 'A good fit for getting started'
    }
  ]
}
[clerkAuth] audit-key bypass: GET /api/admin/pending-resources
[clerkAuth] audit-key bypass: GET /api/auth/me
[clerkAuth] audit-key bypass: GET /api/admin/stats
[clerkAuth] audit-key bypass: GET /api/admin/contact-submissions
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

## `openapi.log`

```text
> rest-express@1.0.0 validate:openapi
> tsx scripts/validation/openapi-drift.ts

Claude service initialized: router router.hack.ski (bearer token); models haiku=cc/claude-haiku-4-5-20251001 sonnet=cc/claude-sonnet-5 opus=cc/claude-opus-5; primary=cc/claude-opus-5
OpenAPI drift PASS: 178 API routes, 178 named contracts, 150 paths

[task-571 exit=0]
```

## `boot-migration-safety.log`

```text
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
Migration failed: error: relation "users" already exists
    at /home/runner/workspace/node_modules/pg/lib/client.js:631:17
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async <anonymous> (/home/runner/workspace/node_modules/src/pg-core/dialect.ts:102:7)
    at async PgDialect.migrate (/home/runner/workspace/node_modules/src/pg-core/dialect.ts:95:3)
    at async migrate (/home/runner/workspace/node_modules/src/node-postgres/migrator.ts:10:2)
    at async runMigrations (/home/runner/workspace/server/migrate.ts:98:5)
    at async scenarioB (/home/runner/workspace/scripts/verify-boot-migration-safety.ts:157:5)
    at async main (/home/runner/workspace/scripts/verify-boot-migration-safety.ts:189:5) {
  length: 99,
  severity: 'ERROR',
  code: '42P07',
  detail: undefined,
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'heap.c',
  line: '1152',
  routine: 'heap_create_with_catalog'
}
  ✓ Boot FAILED LOUDLY ("relation "users" already exists...") and nothing was half-applied.

✅ Boot migration safety proven: completes partial schemas, fails loudly on non-idempotent migrations.

[task-571 exit=0]
```

## `migration-drift.log`

```text
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

## `dead-exports.log`

```text
PASS canaries :: export/import extraction + re-export & star following + namespace/dynamic whole-module uses + allowlist contract verified against synthetic modules
PASS dead-exports :: 841 export(s) across 216 module(s) in client/src/ + shared/ checked, 791 imported elsewhere, 50 pinned exception(s)

[task-571 exit=0]
```

## `root-script-drift.log`

```text
PASS canaries :: reference matching + comment stripping + candidate-import resolution + manifest conditions verified against synthetic samples
PASS root-script-drift :: 28 root + active scripts/ executable file(s) checked, 0 stray
       drizzle.config.ts — recognized-config: drizzle-kit — auto-discovered by drizzle-kit push/studio (npm run db:push)
       eslint.config.js — recognized-config: eslint — flat config auto-discovered by `eslint .` (npm run lint)
       playwright.config.ts — recognized-config: @playwright/test — auto-discovered by `playwright test` (npm run test:e2e)
       postcss.config.js — recognized-config: postcss — auto-discovered by the PostCSS/Tailwind pipeline during vite build
       stylelint.config.mjs — recognized-config: stylelint — auto-discovered by `stylelint` (npm run lint:css and editor diagnostics)
       tailwind.config.ts — recognized-config: tailwindcss — Tailwind config (also named by components.json)
       vite.config.ts — recognized-config: vite — auto-discovered by vite dev/build
       vitest.config.ts — recognized-config: vitest — auto-discovered by `vitest run` (npm run test:unit / test:integration)
       scripts/audit-567-browser.mjs — npm-script: package.json scripts.audit:parity-systems → node scripts/audit-567-browser.mjs
       scripts/audit-sidebar-exhaustive-clicks.mjs — tooling: scripts/audit-sidebar.sh:71 → BASE_URL="$BASE_URL" node scripts/audit-sidebar-exhaustive-clicks.mjs
       scripts/audit-sidebar.sh — npm-script: package.json scripts.audit:sidebar → bash scripts/audit-sidebar.sh
       scripts/build-static.ts — tooling: .github/workflows/deploy.yml jobs.build.steps[3].run → npx tsx scripts/build-static.ts
       scripts/check-awesome-bot.sh — npm-script: package.json scripts.check:awesome-bot → bash scripts/check-awesome-bot.sh
       scripts/check-migration-drift.ts — workflow: .replit workflows.workflow[3].tasks[0].args → npx tsx scripts/check-migration-drift.ts
       scripts/export-awesome-markdown.ts — tooling: scripts/check-awesome-bot.sh:45 → if ! (cd "$REPO_ROOT" && npx tsx scripts/export-awesome-markdown.ts "$MD_FILE"); then
       scripts/export-openapi-yaml.ts — manual-runbook: retained on-demand OpenAPI artifact export used when refreshing checked-in API documentation
       scripts/generate-design-system-artifact.mjs — npm-script: package.json scripts.generate:design-system-artifact → node scripts/generate-design-system-artifact.mjs
       scripts/migrate.ts — manual-runbook: retained standalone migration runner for non-Replit/self-hosted recovery
       scripts/post-merge.sh — workflow: .replit postMerge.path → scripts/post-merge.sh
       scripts/pre-publish-gate.sh — workflow: .replit deployment.build → bash scripts/pre-publish-gate.sh --publish
       scripts/prod-link-scan.ts — manual-runbook: retained resumable production URL sweep; read-only and intentionally run by hand
       scripts/run-digest-dispatch.ts — npm-script: package.json scripts.digest:dispatch → tsx scripts/run-digest-dispatch.ts
       scripts/test-feedback-loop.ts — manual-runbook: retained opt-in database-backed recommendation regression probe with QA-only teardown
       scripts/verify-boot-migration-safety.ts — workflow: .replit workflows.workflow[13].tasks[0].args → npx tsx scripts/verify-boot-migration-safety.ts
       scripts/verify-docker-deployment.sh — manual-runbook: retained self-hosted Docker deployment verification runbook
       scripts/verify-non-replit-build.sh — manual-runbook: retained non-Replit production build verification runbook
       scripts/vg2-ga4-validate.mjs — manual-runbook: retained real-browser GA4 validation runbook, invoked after analytics changes
       scripts/vg2-teardown.ts — manual-runbook: retained cleanup runbook for the GA4 validation harness when automatic cleanup is incomplete

[task-571 exit=0]
```

## `parity.log` — original attempt

```text
> rest-express@1.0.0 test:parity
> node tests/parity/runner.mjs --only app.home.index,app.home.curated,app.category,app.about,app.shell.palette

[parity] precondition failure: Error: BASE_URL must be supplied (loopback origin, e.g. http://127.0.0.1:5000)
    at requireLoopback (file:///home/runner/workspace/tests/parity/runner.mjs:311:21)
    at main (file:///home/runner/workspace/tests/parity/runner.mjs:318:19)

[task-571 exit=2]
```

## `parity-base-url.log`

```text
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

## `final-attempt/parity.log`

```text
> rest-express@1.0.0 test:parity
> node tests/parity/runner.mjs --only app.home.index,app.home.curated,app.category,app.about,app.shell.palette

Gate lease acquired (db-heavy: parity-baseline)
[identity] creating disposable Clerk admin [redacted-bridge-id]
[identity] [redacted-bridge-id] signed in and promoted (display name "Nick")
[parity] app.about @ 375
  FAIL 8.9731% (271683px)
[parity] app.about @ 768
  FAIL 6.4401% (248784px)
[parity] app.about @ 1024
  FAIL 6.5085% (283448px)
[parity] app.about @ 1440
  FAIL 5.5721% (341334px)
[parity] app.category @ 375
  FAIL 58.0711% (6907335px)
[parity] app.category @ 768
  FAIL 58.7279% (7529497px)
[parity] app.category @ 1024
```

## `exact-identity-cleanup.log`

```text
{
  "operation": "exact-parity-identity-cleanup",
  "targetCount": 2,
  "targetSetSha256": "74bc33070572d22ec87a20a8f656b85374096bc96c2e96ddcd56e976f27f8430",
  "local": {
    "matched": 1,
    "deleted": 1,
    "remaining": 0
  },
  "clerk": {
    "matched": 1,
    "deleted": 1,
    "remaining": 0
  },
  "clean": true
}

[task-571 exact cleanup exit=0]
```