# Audit r6 — Interaction Inventory (July 10, 2026)

Mirrors r5 (`evidence/audit-r5/INVENTORY.md`) — the app's route/UI surface is unchanged since r5. This file records the r6 baseline and the drift since r5 that this round must additionally cover.

## Baseline (pre-audit, residue-free)
`baseline.txt`: 0 `__qa_test` residue anywhere; approved=1,838, total=1,994, users=6, categories=9, journeys=5; per-category counts identical to r5 (Community 81 · Encoding 325 · General 151 · Infra 199 · Intro 194 · Media 255 · Players 234 · Protocols 200 · Standards 199).

## Drift since r5 (new validation targets)
1. **Migration-drift checker (Task #122)** — `scripts/check-migration-drift.ts`, registered as the `migration-drift` validation workflow. r6 evidence: `migration-drift-validation.log` (journal integrity ✓, scratch-DB schema reproduction ✓, "No migration drift").
2. **Boot migrator rewrite (Task #132)** — `server/migrate.ts` (42P07 swallow removed, `verifyMigrationJournal()` post-migrate assertion). r6 evidence: app boots and serves (workflow log: port 5000, background init complete, LP cache warmed 3 paths); `boot-migration-journal.txt` notes the journal table is absent in dev (expected — `NODE_ENV=production` gate skips `runMigrations` on dev boot) and proves both migrator safety scenarios on scratch DBs (`verify-boot-migration-safety.ts` exit 0).
3. **Two production publishes** — dev-side surface unchanged; prod validation out of scope for this dev-workspace audit (same policy as r4/r5).

## Sweep plan (same as r5)
- **A** Anonymous API (~45): public reads, search honesty vs DB, SEO surface, 401 gates, /api/health/ai cheap+deep, LP hardening, generationType ai×3
- **B** Authed user flow (~31): register→…→relogin cycle with fresh `__qa_test_audit_r6_*` user
- **C** Admin flow (~36): promote via psql, gates, GETs, exports, resource/edit/category CRUD, role endpoint
- **D** Browser UI anon: SPA nav, gotos, 9 redirects, 404, interactions, ⌘K, mobile 390px
- **E** Browser UI authed: real form login, /profile, /bookmarks, /admin + screenshot
- Teardown: memory-guided FK order, reconcile == baseline exactly
