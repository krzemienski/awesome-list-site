# Contact retention

## Scope and implementation

Reused the merged retention SQL and existing contact schema; no migrations,
endpoint behavior, auth, consent, UI, or default-off configuration changed.
Confirmed the earlier implementation still explicitly deferred scheduling.
The design-system docs directory is empty in this checkout; no visual sources
were changed or needed for this backend-only task.

Added an hourly maintenance scheduler with a 30-second startup catch-up,
test-environment exclusion, duplicate initialization/overlap guards, bounded
500-row batches (20 per cycle), success counts and PII-free stderr failures.
Disabled intake still gets retention if stored rows remain. Database failures
do not disable future scheduled attempts. Timers are unref'd like digest.

## Integration handoff

The only shared composition edit is one import and one initializer call in
`server/index.ts`, next to the digest scheduler. Preserve those two lines when
integrating parallel changes; `server/routes.ts` and all public contracts are
unchanged. There is no pending route wiring or schema work. Operator policy and
event names are documented in `docs/CONTACT-VARIANTS.md`; assumptions §6 now
points there rather than promising indefinite storage.

The scheduler is in-process, not an external cron. Downtime delays execution
until startup catch-up; a backlog larger than 10,000 rows continues next hour.
Multiple application instances can safely race the same idempotent DELETE;
overlap prevention is per process, not a distributed lease.

## Verification

Evidence: `docs/parity/evidence/contact-retention/`.

- `contact-results.txt`: 18/18 contact integration cases pass against the real
  dedicated test database. New case inserts two expired marker rows and one
  fresh row, verifies a one-row batch followed by the remaining expired row,
  verifies the fresh ID survives and a further purge returns zero. Cleanup
  runs in finally/afterEach. A second case proves initialization creates no
  timers in test mode.
- `typecheck.txt`: `npm run check` passed.
- `openapi.txt`: 177 routes / 177 contracts / 149 paths, PASS.
- `contracts.txt`: 19 endpoint checks, zero real mismatches, PASS.
- `integration-summary.txt`: unchanged serial command ran the whole suite:
  83 passed, 162 failed, 1 skipped. The 162 legacy failures match the earlier
  documented total in `../evidence/contact-api/test-integration-baseline-diff.txt`;
  failures still include old local-auth endpoint expectations (404 instead of
  200). This task does not claim the full integration suite is green or a new
  per-test baseline comparison.
- Restarted `Start application`: listening on 5000, background initialization
  complete, no startup errors. Workflow log was inspected.
- `home-smoke.jpg`: running home page renders header, sidebar, category grid
  and consent banner without a crash or blank screen at 1280×720. This is a
  smoke check only, **not** a pixel-parity or accessibility verdict.

No UI change means the 375/768/1024/1440 contact-variant pixel captures remain
with the already-planned contact-variant verification task. No thresholds were
changed, no frozen sources or aggregate inventory files edited, and nothing
was published. No additional follow-up proposed because that downstream task
already exists.

## Completion gate blocker

The automatic completion run did **not** mark this task complete. Its
repository-wide checks found failures outside the retention-owned files:

- Tablet: consent banner covers footer links on the short page at 1024×768.
- Dead components and exports: unused `layout/new/AppFooter.tsx`.
- Design-system sweep: 22/264 checks failed, including unclassified
  “Operations dashboard” headings and a missing journey-step-editor trigger.
- Canonical token parity: 63 failures, including resource-detail chip styles.

Logs are under `.local/state/workflow-logs/L5PKSPdZD9a84kkBvYtX_/`,
shell steps 3, 21, 24, 26 and 33 respectively. These surfaces belong to
parallel parity/integration work, not contact retention. No exclusions,
thresholds, shared UI files or gate configurations were changed to bypass them.
Completion remains blocked pending that integration work; the backend-specific
checks above passed, as did the completion run's API drift and type checks.

## Completion retry after upstream merges

Rechecked retention implementation and startup wiring: intact, no additional
retention code changes required. Retry `QLPgBgZll9NsE6ssr48eW` now passes
dead-components and dead-exports, plus typecheck and OpenAPI drift. The broad
run could not finish: completion polling ended with `POLL_BUDGET_EXCEEDED`.
Its build and theme-registry processes aborted on `uv_thread_create`,
boot-safety reported `ERR_WORKER_INIT_FAILED`, font-prepaint failed to spawn
with `EAGAIN`, and the pool probe found the app unreachable. These are
environment execution failures, not successful validations.

Restarted the application once afterward; the workflow reports running on
port 5000 with background initialization complete. No validation commands or
thresholds were modified. Requesting completion using the audited environment
skip for the stalled broad run, retaining the earlier real contact integration
and API-contract evidence. This does not claim the repository-wide UI gates
are green; remaining shared parity verification belongs to the integrator.