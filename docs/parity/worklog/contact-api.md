# Worklog — contact-api (default-off contact endpoint)

Task: make the drafted contact backend real and proven — `GET /api/config`
carries a `contact` object, `POST /api/contact` is disabled by default, and an
admin-only inbox listing exists — without changing any existing route.
Starting point `6ee20a60`. Evidence: `docs/parity/evidence/contact-api/`.
Decisions that later tasks inherit: `docs/parity/assumptions/contact-api.md`.

## Starting state

- `server/routes/domains/contact.ts` and `server/repositories/ContactRepository.ts`
  existed as drafts (compiled, never mounted, never tested).
- `contact_submissions` existed with a table comment promising "no IP" while
  the plan required an IP *hash*; there was no `user_id` column.
- `shared/contact.ts` accepted the honeypot field by name only.
- No integration test, no OpenAPI entries, no response contracts, no docs.

## What was built

| Area | Change |
|---|---|
| Schema | Migration `0048_contact_submission_provenance`: `ip_hash varchar(64)`, `user_id` → `users` (ON DELETE CASCADE) + index, truthful table comment. Applied to dev through the real migrator; `migration-drift` green. |
| Config | `contact.ip_hash_secret` (env-only `CONTACT_IP_HASH_SECRET`, ≥16 chars or treated as unset). `issues_url` is no longer derived from `source.url`. YAML comments corrected. |
| Routes | `registerContactRoutes` mounted in `server/routes.ts` before the operations registrar: `GET /api/config` (5-minute public cache), `POST /api/contact` (404 while disabled → same-origin → `contact` limiter → Zod → honeypot → persist), `GET /api/admin/contact-submissions` (admin-only, `{ submissions, total, limit, offset }`, `no-store`). |
| Repository | `createSubmission`, `listSubmissions(limit, offset)`, `countSubmissions`, `purgeExpiredContactSubmissions` (implemented, **not scheduled**). |
| Contracts | `PublicConfigResponse`, `ContactSubmissionReceipt`, `AdminContactSubmissionsResponse` (+ query schema) in `server/contracts/endpointSchemas.ts`; `docs/api/openapi.yaml` regenerated (3 new paths). |
| Gates | `openapi-drift` baseline recomputed (174 routes); `response-contract-drift` gained three contact checks (200 / 404 default-off / 200 audit-key admin). |
| Tests | `tests/integration/api/contact.test.ts` (16) and `tests/unit/contact-config-precedence.test.ts` (11): default-off 404 and config shape, misconfigured 503, happy path with keyed IP hash and user id, honeypot, 400 envelopes, origin 403s, sixth request 429 with `RateLimit-*`/`Retry-After` and a `limiter = 'contact'` row, admin list auth/pagination/400. Test rows carry the `__qa_test_contact` marker and are deleted in-suite; `cleanupDatabase()` now clears `contact_submissions` too. |
| Docs | `docs/ENVIRONMENT.md` (quick-reference rows + "Contact" section), `docs/CONTACT-VARIANTS.md` "Backend" section. |

## Verification

All transcripts are in `evidence/contact-api/`.

- **Disabled path on the running app** (`disabled-path-curl.txt`): `POST
  /api/contact` → `404 {"message":"Not found"}` for `{}` and for a fully valid
  body; `/api/config` → every destination `available: false`, form reason
  "The contact form is disabled"; `Cache-Control: public, max-age=300`.
- **Enabled path** (`enabled-path-curl.txt`): a second instance on port 5055
  with `CONTACT_ENABLED=true` and a throwaway `CONTACT_IP_HASH_SECRET` set only
  in the launching shell. Six valid posts → five `200 { id, status: "received" }`
  then `429` with `RateLimit-Policy: 5;w=3600`, `RateLimit-Limit: 5`,
  `RateLimit-Remaining: 0`, `RateLimit-Reset: 3600`, `Retry-After: 3600`.
  Honeypot → receipt-shaped 200 and a `[contact] honeypot triggered` log line
  carrying only a 12-char hash prefix; invalid payload → canonical 400
  envelope; wrong/missing Origin → 403. Dev `contact_submissions` held exactly
  the 5 accepted rows (64-hex `ip_hash`, no honeypot row, `user_id` null);
  the `rate_limit_hits` row for `contact` was separate from the `api-backstop`
  rows. The 5 rows and the contact limiter row were deleted; `0` `__qa_test_`
  rows remain.
- **Limiter prefix uniqueness** (`limiter-prefix-uniqueness.txt`):
  `PgRateLimitStore` names in `server/` are `ai-generation`, `api-backstop`,
  `contact`, `resource-read`, `tier:{free,standard,premium}` — `contact` is
  unique.
- **Gates** (`gates.txt`): `npm run check`, `openapi-drift` (174/174/146),
  `response-contract-drift` (15 checks), `root-script-drift`, `pool-probe`
  (60/60), `task302-resilience` (all PASS), `migration-drift`, `test:unit`
  (271), `security-headers.test.ts` (7) — all green.
- **`test:integration`** (`test-integration-baseline-diff.txt`): HEAD was
  extracted to `/tmp/base506` and run with the same `node_modules` and test DB
  so the legacy red baseline could be measured, not guessed. In the default
  parallel mode every file runs `cleanupDatabase()` against the one shared
  test DB, so sibling files wiped `users` and `rate_limit_hits` in the middle
  of the contact tests (4 false failures) and the legacy files' failing set
  drifted between identical runs. `test:integration` now runs with
  `--no-file-parallelism`: base 44 passed / 162 failed → after 60 passed /
  162 failed, **0 tests regressed, 0 drifted**, contact 16/16, wall time
  21 s → 47 s. The 162 remaining failures are the pre-existing mock-era
  baseline (`admin`, `auth`, `favorites`, most of `resources`/`categories`).
- **Lint** (`lint-baseline-diff.txt`): the repository lint baseline is red
  (see `docs/parity/worklog/foundation.md`). Per-file comparison against
  `/tmp/base506`: every touched file is unchanged except `contact.ts`
  (3 → 4: one more `no-misused-promises` for the new async admin handler, the
  same shape as every sibling domain file) and `routes.ts` (24 → 25: the new
  `registerContactRoutes(app, { isAuthenticated, isAdmin, … })` call trips
  the same rule the existing `registerOperationsRoutes` call already trips).
  No new rule family was introduced.

## Baselines recomputed

- `scripts/validation/openapi-drift.ts` `BASELINES`: 171 → 174 routes, new
  hash for both environments. Any task that merges another route after this
  one must recompute (`npx tsx scripts/export-openapi-yaml.ts` then rerun the
  gate) — the comment next to the constant says how.

## Not done (deliberately)

- Admin delete endpoint (optional in the plan) — the admin ops task can add it
  with its UI.
- Scheduling `purgeExpiredContactSubmissions` — see assumptions §6.
- Email delivery, client rendering, screenshots — other tasks.
