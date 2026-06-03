# Synthesized Specification — Criterion #7: Dockerize, Replace Replit, Functional Audit

> Self-contained spec combining the original Criterion #7 brief + research findings
> (`claude-research.md`) + interview decisions (`claude-interview.md`). This is the
> contract the implementation plan executes against. Decisions here OVERRIDE the
> original spec's defaults where noted.

---

## 1. Goal

Take **awesome-list-site** (Express + Vite SSR + React + Drizzle/Postgres app, originally
built on Replit) to a verifiably production-ready state with:
1. **Zero Replit dependencies** in code or runtime.
2. **`docker compose up`** that builds, migrates, and seeds the full stack with zero manual steps, data persisting across restarts.
3. **Production deploy config** (Railway + DigitalOcean shapes) authored and locally validated — no live deploy.
4. **Exhaustive browser-driven functional audit** of every screen × every breakpoint with a remediation loop to zero defects.

This is a **brownfield** effort. Much infra exists in partial/inconsistent form; the plan
RECONCILES rather than rebuilds.

## 2. Binding Decisions (from interview)

| # | Decision | Value | Notes |
|---|---|---|---|
| D1 | **Auth** | **Finish passport-local; rip out Replit OIDC** | Deviation from spec's better-auth default. Subtractive, not additive. |
| D2 | **Deploy** | **Config-only, no live deploy** | Gate = config schema-valid + documented. |
| D3 | **Deploy shapes** | **Both Railway + DigitalOcean App Platform** | Finalize `railway.json`; author `.do/app.yaml`; delete `vercel.json`. |
| D4 | **Object storage** | **Investigate first (Phase 1 conditional)** | If used → MinIO/S3 in compose; else drop. |
| D5 | **Seed source** | **Decide in Phase 3 based on D4 finding** | live-S3 fetch vs vendored JSON for offline `up`. |
| D6 | **Admin creds** | **Parameterize via `ADMIN_EMAIL`/`ADMIN_PASSWORD` env** | Fallback `admin@example.com`/`admin123` dev-only. |
| D7 | **Audit harness** | **Chrome DevTools MCP primary; Playwright = CI codification** | |
| D8 | **Run scope** | **Plan only (gepetto)** | Phases execute later via ralph-loop / Ralphy. |
| D9 | **External review** | **Gemini + Codex, integrate** | |
| D10 | **Drizzle journal** | **Repair: add 0027/0028 entries (Option a)** | After probing `__drizzle_migrations`. Real schema-drift bug. |

## 3. Current State (verified, from research)

### 3.1 Auth (hybrid; Replit isolated)
- `server/replitAuth.ts` = OIDC via `openid-client`; wired at `routes.ts:47` (import), `:410-418` (REPL_ID branch). Registers `/api/login`, `/api/callback`, `/api/logout`.
- `server/localAuth.ts:6` = passport-local; mints `{ claims:{ sub,email,first_name,last_name,profile_image_url }, expires_at }` (`:41-50`) — **same shape OIDC mints**.
- Local routes: `POST /api/auth/local/login` (`routes.ts:434` + lockout `:438`), `/api/auth/register` (`:505`), `/api/auth/logout` (`:599`), `/api/user/change-password` (`:1048`), `GET /api/auth/user` (`:546`).
- Session store: `connect-pg-simple`, table `sessions` (`shared/schema.ts:19-27`, migration 0000), secret `SESSION_SECRET!`.
- **Landmines**: phantom `SessionUser` import (`types.ts:4`, never exported); raw-SQL session DELETE keyed on OIDC claims path (`routes.ts:1078-1082`); divergent serialize/deserialize (local `routes.ts:421-427` vs OIDC `replitAuth.ts:106-124`); dead refresh-token logic in `isAuthenticated`.

### 3.2 DB + migrations
- `server/db/index.ts` = `drizzle-orm/node-postgres` + `pg.Pool` over `DATABASE_URL` (Neon cosmetic only).
- `runMigrations()` (`server/index.ts:53`) runs only when `NODE_ENV=production`; fallback masks missing migrations.
- **Journal defect**: `migrations/` has `0000`, `0027`, `0028`; `_journal.json` lists only `0000` → drizzle `migrate()` (reads journal entries, never scans folder) silently skips `0027`/`0028` → API-keys table + research sub-subcategory columns MISSING at runtime.

### 3.3 Docker (exists, gaps)
- `Dockerfile` multi-stage (builder→production) — **runs as root**, healthcheck probes `/api/health`.
- `docker-compose.yml` (postgres:16-alpine + app) — **app has no healthcheck**, no migrate/seed step, maps host `5000:5000` (macOS AirPlay conflict).
- `.dockerignore` exists.

### 3.4 Health route mismatch
- App serves `/api/health` (`routes.ts:3769`).
- `railway.json healthcheckPath` + `vercel.json` route `/health` (no `/api`). **Mismatch.**

### 3.5 App surface (audit inventory)
- 17 client routes (`App.tsx:66-87`) + 14-tab admin. Public browse + auth-gated `/profile`,`/bookmarks`,`/admin`.
- Counts DB-sourced at top level (`GET /api/categories` resourceCount, SQL `count(*) WHERE status='approved'`); sub-levels still client-side recursive sum (drift risk).
- Seed (`server/seed.ts`): live S3 fetch (`:208`), ~1949-1953 approved resources, 9 canonical categories (21→9 via `mapCategoryName`), admin `admin@example.com`/`admin123`, idempotent.
- Known defects to re-verify: **M-02** (`/settings/theme` color picker blank+no-op), **FP-01** (`/advanced` Export+AI tabs need pointer-event sequence), **FP-02** (`/journey/6` 0 steps), FP-03/FX-04/FP-05 LOW.
- Reusable: `playwright.config.ts`, `tests/e2e/*`, `scripts/audit-gap-fill*.mjs`, `_planning/AUDIT_*.md`, `SITE_MAP.md`.

### 3.6 Replit removal inventory
`server/replitAuth.ts` (whole), `types.ts:4`, `routes.ts:47,:409-418`, `vite.config.ts:8-22`, `package.json:152-153`+`:82`(memorystore dead)+openid-client+memoizee(if OIDC-only), `client/index.html:83,:96,:158-159`, `authUtils.ts:28-29`, OIDC login links (`Login.tsx:94`,`SubmitResource.tsx:274,:336`), `.replit`, `.env NEON_DATABASE_URL`. GitHub `REPL_IDENTITY` (`replitConnection.ts:39-40`) = separate concern, evaluate.

## 4. Phased Requirements + Hard Gates

### Phase 0 — Branch
Create + switch to `feat/dockerize-replace-replit`. Confirm active. **GATE**: `git branch --show-current` == the branch.

### Phase 1 — Replace Replit deps (auth + investigate storage)
- Rip out `replitAuth.ts` + OIDC routes/env/deps; extract reusable `getSession` + `isAuthenticated` (expiry-only, no refresh) into a vendor-neutral module.
- Make session middleware + `setupLocalAuth()` unconditional (remove REPL_ID branch).
- Fix phantom `SessionUser` (define real type or delete).
- Unify serialize/deserialize; keep raw-SQL session DELETE working against the (unchanged) `{claims:{sub}}` shape.
- Remove client Replit banner/host-check/OIDC links; clean `authUtils.ts`.
- Drop `@replit/*`, `openid-client`, `memorystore`(dead), `memoizee`(if OIDC-only) deps + `vite.config.ts` plugin wiring; delete `.replit`; clean `.env`.
- **Investigate object storage** (D4): grep for `@replit/object-storage`/bucket usage → branch.
- **GATE**: app runs locally (non-Docker, `npm run dev`) against local Postgres; register + login + session persistence work; zero Replit refs in `server/`+`client/`+`shared/` (grep proof); `tsc` clean.

### Phase 2 — Containerize (harden)
- Dockerfile: add non-root user (`addgroup/adduser`, `COPY --chown`, writable dirs pre-created, `USER`), keep multi-stage.
- compose: add app healthcheck (pure-Node fetch `/api/health`), `depends_on` health conditions, map host port **5001:5000** (avoid macOS AirPlay), env via `env_file`/secrets (no baked secrets); add MinIO service IF D4 finds object storage in use.
- **GATE**: `docker compose up --build` → all containers healthy, no crash loop, app reachable; container runs as non-root (`docker exec ... whoami` ≠ root).

### Phase 3 — Migrate + seed (idempotent on startup)
- **Repair drizzle journal** (D10): probe `__drizzle_migrations`; add `0027`/`0028` entries to `_journal.json` (mark applied vs pending per probe).
- Add a **one-shot migrate service** (or hardened entrypoint) gated `db: service_healthy`; app waits `migrate: service_completed_successfully`.
- Make migrate run regardless of NODE_ENV in container; seed idempotently; parameterize admin creds (D6); decide seed source (D5: live-S3 vs vendored JSON for offline).
- **GATE**: fresh `docker compose up` (clean volume) → fully migrated (all 3 migrations applied — verify `__drizzle_migrations` has api_keys + research columns) + seeded (~1949-1953 resources, 9 categories, admin user); restart → idempotent (no dupes, data survives — volume persistence).

### Phase 4 — Production deploy config (no live deploy)
- Finalize `railway.json` (fix `healthcheckPath` → `/api/health`); author `.do/app.yaml` (DO App Platform + managed PG, backups/PITR documented); delete `vercel.json`.
- Document secrets management (env/secret store, no baked secrets), managed-PG/persistence/backups, monitoring (health checks, logs).
- **GATE**: both configs schema-valid (lint/validate); secrets externalized; docs complete. NO live deploy.

### Phase 5 — Functional audit + remediation loop
- Precondition: Phase 3 gate green (Dockerized app running locally, seed verified).
- Capture live count baseline (`/api/categories`, `/api/resources?limit=1`, `/api/subcategories`, `/api/sub-subcategories`, `/api/journeys`).
- For EVERY screen × {320,375,768,1024,1280,1440,1920}: zero console errors, zero failed network (≥400) requests, correct rendered data (counts == DB baseline), all controls exercised (nav/filters/tabs/modals/forms/sort/paginate), auth flows (register/login/session/protected routes), responsive integrity (no overflow/clipping, mobile nav).
- Harness (D7): Chrome DevTools MCP (`resize_page`→`navigate`→`wait_for` hydration marker→`list_console_messages`→`list_network_requests` filter ≥400→`evaluate_script` overflow probe→`take_snapshot`/`take_screenshot`); codify into Playwright for CI.
- Remediation loop: detect→diagnose(root cause: frontend/API/data/config)→fix→rebuild→re-verify affected area + whole-app smoke. Exit only at zero defects across all screens AND breakpoints.
- Re-verify known defects M-02, FP-01, FP-02, FP-03, FX-04, FP-05.
- **GATE**: audit matrix 100% pass; defect changelog zero open.

## 5. Definition of Done

All simultaneously: clean-state `docker compose up` builds+migrates+seeds with zero manual
steps; zero Replit deps; every screen×breakpoint passes (zero console errors, zero failed
network, correct data); counts/badges/nav/filters data-accurate on click; auth + CRUD persist
and survive restart; Railway + DO configs valid with externalized secrets + monitoring docs;
audit matrix 100%, zero open defects.

## 6. Constraints

Branch only (never main); no secrets in images/commits; audit only after Dockerized+seeded;
real-browser evidence for every "works"; hard gates (prove with executed output); non-root
containers; volume persistence; remediation loop exits only at zero defects. **No mocks, no
test files, no unit tests** (functional-validation mandate) — audit drives the real running app.
