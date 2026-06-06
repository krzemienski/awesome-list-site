# Integration Notes — External/Adversarial Review + Deepen Pass

> Step 11 (gepetto) fused with `/deepen-prompt-plan`. Records what review feedback was
> integrated into `claude-plan.md`, what was rejected, and — critically — one **reversal of a
> user-confirmed decision (D10)** forced by decisive new evidence.

## Review provenance (honest accounting)

- **Gemini CLI** (planned): **FAILED** — cached OAuth forces a dead local proxy
  (`ECONNREFUSED 127.0.0.1:8319`); `GEMINI_API_KEY` present but `--api-key` flag invalid in
  v0.44.0 and env var alone doesn't override the broken auth-type. No usable output.
- **Codex CLI** (planned): **FAILED** — `codex exec` hangs on stdin in background; with stdin
  closed it exits empty (skill-loading YAML errors in `~/.agents/skills/*` pollute startup).
- **Substitution (stronger)**: two internal `critic` agents (opus) with **full repo access**,
  which verified the plan's `file:line` claims against actual code — something the external
  CLIs structurally could not do (they can't read the migration SQL). Reviews saved to
  `reviews/internal-review-auth-migration.md` + `reviews/internal-review-docker-audit.md`.
- Every BLOCKING finding below was **independently re-verified by me** against the real files
  (commands + output captured in session) before integration — per the rule that a critic
  claim is not propagated into a plan without confirmation.

---

## DECISION REVERSAL — D10 (surface to user)

**Original D10 (user-confirmed in interview):** "Drizzle journal repair = add 0027/0028
entries to `_journal.json` (Option a)."

**Why it was chosen:** the research agent recommended Option (a) and advised against
re-baselining — but that agent **never read the contents of 0027/0028** and **never measured
schema-vs-migration drift.** It reasoned about the journal mechanism in the abstract.

**New evidence (verified by me, this session):**
- `migrations/0000_dry_kingpin.sql` already creates `api_keys` (`:1`), its FK
  `api_keys_user_id_users_id_fk` (`:268`), and 3 indexes (`:296-298`).
- `migrations/0027_*.sql:18` does an **unconditional** `ADD CONSTRAINT api_keys_user_id_users_id_fk`
  → duplicate → **PostgreSQL 42710** on a fresh `migrate()`. 0027 is fully absorbed by 0000.
- `migrations/0028_*.sql` is `ALTER TABLE research_discoveries ADD COLUMN ...`, but
  `research_discoveries` is **CREATEd in zero migrations** (only in `shared/schema.ts:1214`,
  reached prod via `db:push`) → **42P01 undefined_table** on a fresh `migrate()`.
- Drift measurement: `shared/schema.ts` = **25 tables**; `0000` baseline = **23 tables**;
  **`research_discoveries` + `research_jobs` are missing from the entire migration chain.**

**Consequence:** adding 0027/0028 to the journal (original D10) would make `migrate()` **ABORT**
on a clean Docker volume — the precise scenario Phase 3's gate requires to pass. Original D10
is not just suboptimal, it is **incorrect** for this repo.

**Revised D10 → Re-baseline from `shared/schema.ts`:**
- `npx drizzle-kit generate` against the current schema → one fresh, complete baseline
  migration (all 25 tables) + regenerated journal + snapshot.
- Archive the old `migrations/0000|0027|0028` + `meta/` (keep for history; out of the active
  folder).
- Fresh `docker compose up` → `migrate()` builds the full correct schema deterministically.
- The research agent's anti-re-baseline caution applied to "an existing DB that already has the
  objects" — **Docker always starts from a clean volume, so that objection does not apply.**

This rule-compliant reversal (audit found a new issue prior verification missed) is surfaced to
the user at the Step 12 review gate as the headline change. **Alternative if the user prefers to
preserve migration history:** patch the chain instead (make 0028 `CREATE TABLE IF NOT EXISTS
research_discoveries`+`research_jobs` then ALTER; neutralize redundant 0027) — more fragile, more
hand-maintenance. Re-baseline recommended.

---

## INTEGRATED (accepted, evidence-backed)

| # | Finding (verified) | Plan change |
|---|---|---|
| I1 | **0027/0028 break fresh migrate** (42710 / 42P01) | Phase 3 strategy → re-baseline (revised D10). |
| I2 | **One-shot `drizzle-kit migrate` service can't run** — drizzle-kit is devDep, stripped by `npm ci --omit=dev` (`Dockerfile:32`); no `migrate:deploy` script exists | **Cut the one-shot service** (over-engineering for single-replica). Use the existing in-process `runMigrations()` (`server/index.ts:53`, uses runtime `drizzle-orm/node-postgres/migrator` — a real dep), made to run regardless of `NODE_ENV` with a wait-for-db loop. Resolves the double-migrator race too. |
| I3 | **Seed runs AFTER `listen`, non-awaited, errors swallowed** (`server/index.ts:191` → `runBackgroundInitialization` `routes.ts:3818`); healthcheck flips healthy before ~1950 rows land | Phase 3 gate must **poll `/api/resources?limit=1 .total` until stable + assert `✅ Database seeding completed!` log** — NOT trust the healthcheck. |
| I4 | **Dockerfile does not COPY `migrations/`**; `runMigrations()` searches `__dirname/../migrations` etc. | Phase 2: COPY `migrations/` (post-re-baseline) into the production image; the `index.ts:88-112` "tables exist" fallback otherwise masks a missing folder as success. |
| I5 | **`SESSION_SECRET!` non-null assertion** (`replitAuth.ts:31`, moving to `session.ts`); compose `app` sets no `SESSION_SECRET` → crash | Phase 2: require `SESSION_SECRET` in compose env; document. |
| I6 | **Playwright baseURL `:5000` + `webServer: npm run dev`** (`playwright.config.ts:31,77`) ≠ Docker `:5001` → CI would test a different stack | Phase 5: set `BASE_URL=http://localhost:5001`, disable the `webServer` block when auditing the container. |
| I7 | **No graceful shutdown / `pool.end()`** (`server/index.ts:186`) | Phase 2: add SIGTERM handler + `pool.end()` (real container hygiene for the DoD). |
| I8 | **MCP `list_network_requests` has no status filter** | Phase 5 procedure already filters ≥400 in-script — keep explicit; add to gate evidence. |
| I9 | **`@neondatabase/serverless` (`package.json:25`) likely dead** (app uses node-postgres) | Fold into Phase 1 Neon cleanup (verify no import, then remove). |
| I10 | **D5 seed-source must be binding** — offline `down -v && up` reproducibility needs the JSON vendored (live S3 `seed.ts:208` needs network) | D5 → **binding: vendor the JSON** into the repo; `seed.ts` reads disk, falls back to S3. Note it's a real code edit, not config. |
| I11 | **Partial-seed never self-heals** — guard `needsReseeding = categories===0 && resources===0` (`routes.ts:3846`); S3 dying mid-resources leaves it half-seeded forever | Phase 3: note + optional guard hardening (resource-count threshold, not just zero). |
| I12 | **`isAuthenticated` refresh branch uses openid-client** (`replitAuth.ts:166-176`) | Phase 1: "simplify to expiry-check" is now marked **necessary** (not optional) — the refresh branch literally imports openid-client. |
| I13 | Divergent serialize/deserialize is NOT a regression (verified: `isAdmin` + `/api/auth/user` re-fetch from DB) | Phase 1: document so the executor does not port OIDC `dbUser` hydration. |

## Validation-gate restructuring (deepen Phase 4)
- Added `<mock_detection_protocol>` preamble (functional-validation Iron Rule).
- Converted prose gates in Phase 1/2/3/5 → structured `<validation_gate>` blocks with
  `prerequisites / execute / capture / pass_criteria / review / verdict` and evidence paths
  under `e2e-evidence/`.
- Added `<gate_manifest>` (VG-0…VG-5 sequence, all blocking, regression policy).

## REJECTED / not integrated (with reason)
- **Keep the one-shot migrate service "because research B4 preferred it"** — REJECTED. B4's
  preference was generic (multi-replica). This app is single-replica self-host; the service
  introduces the unrunnable-drizzle-kit problem (I2). Simpler in-process path is correct here.
  (Documented as the scale-out option only.)
- **Patch the migration chain instead of re-baselining** — NOT chosen as primary (offered as
  the history-preserving alternative for the user). Re-baseline is mechanically simpler and
  eliminates the whole drift class.
- **Add DB pool `max` tuning beyond making it env-configurable** — deferred. `max:3`
  (`db/index.ts:9`) flagged as M-tier; plan notes "make env-configurable or document" — no
  speculative tuning (YAGNI).
- **doctl-based `.do/app.yaml` validation as a hard gate** — softened: doctl likely absent;
  gate = YAML-lint + explicit DO-spec field checklist (don't block on a tool that may not exist).
- **No new product requirements invented.** Scope unchanged.
