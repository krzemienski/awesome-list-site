# Criterion #7 — Dockerize & Replace Replit + Exhaustive Functional Audit

> Materialized from the inline `/shannon:gepetto` invocation (no `@file.md` was passed).
> Source of truth for goals; the **Reconciliation Addendum** below records the *actual*
> brownfield repo state discovered during recon and must override any greenfield assumption.

## Objective (Criterion #7)

Deliver a complete, reproducible **Docker Compose** deployment of the full app stack with
locally hosted services, **fully replacing every Replit-specific dependency** (Replit Auth,
Replit DB, Replit object storage/secrets/sidecars), prepare a **production deployment** on a
researched/justified target, then run an **exhaustive browser-driven functional audit** of
every screen at every breakpoint against the live, seeded, Dockerized app — fixing bugs in a
relentless remediation loop until verifiably production-ready.

## Hard Gates (phased, no advance on failure)

- **Phase 1** — Replace Replit deps: app runs locally (non-Docker) against local Postgres + chosen auth.
- **Phase 2** — Containerize: `docker compose up` builds + starts all containers cleanly; non-root.
- **Phase 3** — Migrate/seed: fresh `docker compose up` yields fully migrated + seeded DB; idempotent on restart; seed counts/relationships verified.
- **Phase 4** — Production deploy: config + secrets + monitoring in place on chosen target.
- **Phase 5** — Functional audit + remediation loop: every screen × every breakpoint passes (zero console errors, zero failed network requests, correct rendered data), loop exits only at zero defects.

## Breakpoints (minimum)

320, 375, 768, 1024, 1280, 1440, 1920 px.

## Definition of Done

All simultaneously true:
- `docker compose up` from clean state builds, migrates, seeds — zero manual steps.
- Zero Replit dependencies anywhere in code or runtime.
- Every screen × breakpoint: zero console errors, zero failed network requests, correct data.
- Sidebar counts/badges, nav items, all filters produce correct data-accurate results on click.
- Auth (register/login/session) + full CRUD persist; data survives container restart.
- Production deploy config + secrets + monitoring verified.
- Audit matrix 100% pass; defect changelog zero open items.

## Constraints

- Work on a dedicated branch — never `main`.
- No library/deploy selection without documented research-backed rationale.
- No secrets in images or committed files.
- Audit only after Dockerized app runs locally with seeding verified.
- Audit in a real browser (Chrome DevTools); every "works" backed by observed evidence.
- Containers run non-root; volumes ensure persistence.

---

## Reconciliation Addendum — Actual Repo State (recon 2026-06-01)

**This is brownfield.** Much of Criterion #7's infra already exists in partial/inconsistent
form. The plan must RECONCILE, not rebuild from scratch.

### What already exists
- **DB driver**: `server/db/index.ts` already uses `drizzle-orm/node-postgres` + `pg.Pool`
  over `DATABASE_URL`. **Replit DB already gone at the driver level.** `.env` still carries a
  `NEON_DATABASE_URL` and pool comments reference "Neon free tier" — cosmetic cleanup remains.
- **Auth — HYBRID (core problem)**:
  - `server/replitAuth.ts` — Replit OIDC via `openid-client`; still invoked at `routes.ts:411`
    (`await setupAuth(app)`), `routes.ts:414` (`getSession`), and `server/types.ts:4`
    (`SessionUser` type import).
  - `server/localAuth.ts` — passport-local strategy (email/password) over `UserRepository`.
  - `server/loginLockout.ts`, `server/passwordUtils.ts`, register + change-password flows exist
    (prior commit `c891773`).
  - Session shape is Replit-OIDC-shaped (`{ claims: { sub, email, ... }, expires_at }`) and
    `localAuth` mints the same shape — so consumers read `req.user.claims.sub`.
- **Docker**: `Dockerfile` (multi-stage builder→production) + `docker-compose.yml` (postgres
  16-alpine + app) + `.dockerignore` all exist. **Gaps**: app runs as **root** (no non-root
  user), compose `app` service has **no healthcheck**, no migrate/seed entrypoint, compose maps
  host `5000:5000`.
- **Health route mismatch**: app serves `/api/health` (`routes.ts:3769`); `railway.json` +
  Dockerfile HEALTHCHECK probe `/api/health` but `railway.json healthcheckPath` + `vercel.json`
  route `/health` (no leading `/api`). Path inconsistency to resolve.
- **Migrations**: `migrations/` has `0000_dry_kingpin.sql`, `0027_add_api_keys_table.sql`,
  `0028_add_research_discovery_sub_subcategory.sql`, but `migrations/meta/_journal.json` lists
  **only `0000`**. `drizzle migrate` would apply 0000 and SKIP 0027/0028 → schema drift hazard.
  `runMigrations()` (`server/index.ts:53`) only runs when `NODE_ENV=production`; has a fallback
  path that treats "tables already exist" as success (masks the journal gap).
- **Seed**: `server/seed.ts` exists (category hierarchy + resources + users); invoked via
  `runBackgroundInitialization()` after listen — not as a gated startup step.
- **Deploy configs present**: `railway.json` (DOCKERFILE builder) + `vercel.json` (@vercel/node)
  already in repo — prior work leaned Railway/Vercel. Spec's default research target is
  DigitalOcean. **Target must be reconciled, not assumed.**
- **Prior audit corpus**: `_planning/AUDIT_*.md`, `SITE_MAP.md`, `REMEDIATION_PLAN.md`,
  `e2e-evidence/`, `audit-evidence/`, `playwright.config.ts` — a prior audit already mapped the
  site. Reuse the existing site map as the audit inventory seed.

### Replit references to remove (Phase 1 inventory)
- `server/replitAuth.ts` (whole file) + its 3 import sites.
- `client/index.html:96` (`.replit.dev` host check), `:158-159` (replit-dev-banner script).
- `client/src/lib/authUtils.ts:29` (`REPL_ID` comment/logic).
- `.replit` (Replit project config — remove or leave inert; it is not consumed at runtime).
- `package.json optionalDependencies`: `@replit/vite-plugin-cartographer`,
  `@replit/vite-plugin-runtime-error-modal` (+ their `vite.config.ts` wiring).
- Cosmetic: `NEON_DATABASE_URL` in `.env`, "Neon" pool comments.

### Host environment facts
- Docker 29.5.2 + Compose v5.1.4 present on host.
- macOS: host port `:5000` is AirPlay Receiver → local compose should map a non-5000 host port.
- npm v8.5.1 + Node v25.5.0 on host can fail in non-interactive shells; prefer direct binaries.

### Known-decision inputs (to confirm in interview, not assume)
- Auth: spec defaults to **better-auth**, but a working **passport-local** stack already exists.
  This is the single biggest fork in the plan — finish passport-local vs rip-and-replace with
  better-auth. Must be a researched, explicit decision.
- Deploy target: DigitalOcean (spec default) vs Railway (config already present) vs others.
