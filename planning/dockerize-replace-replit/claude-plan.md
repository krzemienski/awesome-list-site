# Implementation Plan — Criterion #7: Dockerize, Replace Replit, Functional Audit

> **Read this first if you have no prior context.** This plan takes a web app called
> **awesome-list-site** off the Replit platform and makes it run anywhere via Docker, then
> proves the whole UI works through a real browser. It is written to be executed by an
> engineer or autonomous agent with zero prior knowledge of the codebase. Every file path and
> line number was verified on 2026-06-01 against the `main` branch.
>
> **Deepened 2026-06-01** via adversarial code-grounded review (see `claude-integration-notes.md`).
> Two BLOCKING migration defects were found + independently verified; user-decision D10 was
> reversed with evidence (journal-edit → re-baseline). Validation gates restructured.

```xml
<mock_detection_protocol>
This plan builds and runs a REAL system. Validation is functional, against the real app.
Before executing ANY task, check intent:
- Creating .test.* / *.spec.* / __tests__/ / test_* files → STOP
- Importing mock/stub/test-double libraries, fixtures, or in-memory DB substitutes → STOP
- Adding TEST_MODE / NODE_ENV=test shortcuts to dodge a real dependency → STOP
Fix the REAL system instead. Every gate below is proven by real executed output
(curl / docker / psql / browser), captured to e2e-evidence/. No exceptions.
</mock_detection_protocol>
```

---

## 0. What this app is (orientation)

**awesome-list-site** is a curated directory of ~1950 video-engineering resources, organized
into a category hierarchy, with a public browse UI, search, "learning journeys", a resource
submission flow, and an admin dashboard.

- **Stack**: Node 20 + Express 4 (backend) · Vite + React 18 + wouter + TanStack Query +
  Tailwind v4/shadcn (frontend) · Drizzle ORM over PostgreSQL (`pg` / node-postgres) ·
  Passport for auth · the server also does SSR.
- **One process**: `server/index.ts` boots Express, runs migrations (in production), serves
  the API, does SSR, and serves the built client. Build = `vite build && esbuild server/index.ts`.
  Dev = `tsx server/index.ts`. Listens on `PORT` (default 5000).
- **Origin**: built on Replit. It still carries Replit-specific code (OIDC "Log in with
  Replit", Replit Vite plugins, a Replit dev banner, `.replit` config). **This plan removes
  all of it.**

### Why this work exists (the problem)
1. The app can't be deployed off Replit cleanly while Replit OIDC + plugins are wired in.
2. A working email/password auth (`passport-local`) already exists alongside the Replit OIDC —
   it's a half-finished migration. We finish it.
3. Docker exists but is unhardened (runs as root, no migrate/seed-on-startup, app has no
   healthcheck, host-port collides with macOS AirPlay on :5000).
4. A real database migration bug: 2 of 3 migration files are invisible to the migrator
   (journal out of sync) → tables/columns silently missing at runtime.
5. The UI has never been audited end-to-end across breakpoints against a seeded Docker stack.

### The end state (Definition of Done)
`docker compose up` from clean state → builds, migrates (all 3 migrations), seeds (~1950
resources, 9 categories, an admin user) with zero manual steps; data survives restart; zero
Replit references anywhere; Railway + DigitalOcean deploy configs authored + validated (no
live deploy); every screen × {320,375,768,1024,1280,1440,1920}px passes with zero console
errors, zero failed network requests, correct data; auth + CRUD persist; audit matrix 100%,
zero open defects.

---

## 1. Binding decisions (already made — do not re-litigate)

| # | Decision | Consequence for this plan |
|---|---|---|
| D1 | **Auth = finish passport-local; remove Replit OIDC** | Phase 1 is SUBTRACTIVE. Do NOT install better-auth. Deviation from the original brief's better-auth default — intentional, because the app already mints the shared session shape and (a) is mostly deletions. |
| D2 | **Deploy = config-only, no live deploy** | Phase 4 authors + validates config; never runs a cloud deploy. No cloud account/secrets needed. |
| D3 | **Deploy shapes = Railway + DigitalOcean** | Finalize `railway.json`; author `.do/app.yaml`; **delete `vercel.json`**. |
| D4 | **Object storage = NOT used (verified)** | No MinIO/S3 service. Only network dependency is the seed's S3 JSON fetch (D5). |
| D5 | **Seed source decided in Phase 3** | Choose: keep live-S3 fetch (needs network at `up`) vs vendor the JSON for offline. Default lean: vendor it for reproducibility. |
| D6 | **Admin creds via env** | Seed reads `ADMIN_EMAIL`/`ADMIN_PASSWORD`, fallback `admin@example.com`/`admin123` dev-only. |
| D7 | **Audit harness = Chrome DevTools MCP primary; Playwright = CI codification** | Phase 5 uses MCP tools; stabilized checks go into existing Playwright suite. |
| D8 | **Run scope = plan only** | This document + sections + execution files are the deliverable. Phases execute later via ralph-loop / Ralphy. |
| D10 | **REVISED → Re-baseline migrations from `shared/schema.ts`** | Phase 3. ⚠️ Original "add 0027/0028 to journal" was REVERSED: verified that 0027 duplicates the 0000 FK (→42710) and 0028 ALTERs `research_discoveries`, a table NO migration creates (→42P01) — both ABORT `migrate()` on a clean volume. `shared/schema.ts` (25 tables) is the true source of truth; the chain is missing `research_discoveries`+`research_jobs`. Re-baseline via `drizzle-kit generate`. See `claude-integration-notes.md` §Decision Reversal. |

---

## 2. Verified current state (ground truth, path:line)

### 2.1 Auth wiring (the half-finished migration)
- `server/replitAuth.ts` — Replit OIDC via `openid-client`. Exports `getOidcConfig`(:11),
  `getSession`(:21), `updateUserSession`(:44), `upsertUser`(:54), `setupAuth`(:67),
  `isAuthenticated`(:154). **Note `getSession` and `isAuthenticated` are vendor-neutral and
  still used by the local path — they must be EXTRACTED before the file is deleted.**
- `server/routes.ts:407-431` `registerRoutes()` does:
  ```
  if (process.env.REPL_ID) { await setupAuth(app); }      // Replit path (dead off-Replit)
  else { const {getSession} = await import("./replitAuth"); // LOCAL PATH = what actually runs
         app.set("trust proxy",1); app.use(getSession());
         app.use(passport.initialize()); app.use(passport.session());
         passport.serializeUser(...); passport.deserializeUser(...); }
  setupLocalAuth();                                          // always
  ```
- `server/localAuth.ts:6` `setupLocalAuth()` registers passport-local, mints session
  `{ claims:{ sub,email,first_name,last_name,profile_image_url }, expires_at }` (:41-50).
- Local auth routes in `routes.ts`: `POST /api/auth/local/login`(:434, lockout :438),
  `POST /api/auth/register`(:505), `POST /api/auth/logout`(:599),
  `POST /api/user/change-password`(:1048), `GET /api/auth/user`(:546, public).
- Session store: `connect-pg-simple` over `DATABASE_URL`, table `sessions`
  (`shared/schema.ts:19-27`, in `migrations/0000`), secret `process.env.SESSION_SECRET!`
  (`replitAuth.ts:31` — non-null assertion, crashes if unset).
- `server/types.ts:4` `import type { SessionUser } from "./replitAuth"` — **PHANTOM: replitAuth
  never exports `SessionUser`**. Compiles only because handlers use `req: any`. Fix or delete.
- `routes.ts:1078-1082` change-password DELETEs other sessions via
  `sess->'passport'->'user'->'claims'->>'sub'`. **Works unchanged under passport-local** (same
  shape). No SQL change needed.
- `isAuthenticated`(`replitAuth.ts:154`) contains OIDC token-refresh logic dead under local
  auth (static `expires_at`, no refresh_token). Simplify to expiry-check when extracting.

### 2.2 DB + migrations — ⚠️ chain is STRUCTURALLY INCOMPLETE (verified 2026-06-01)
- `server/db/index.ts` — `drizzle-orm/node-postgres` + `pg.Pool` over `DATABASE_URL`, `max:3`
  (`:9` — low for a container; make env-configurable). "Neon" cosmetic; `.env` has unused
  `NEON_DATABASE_URL`; `@neondatabase/serverless` (`package.json:25`) likely dead — verify+remove.
- `server/index.ts:53` `runMigrations()` runs only when `NODE_ENV==='production'`; fallback
  (:88-112) treats "tables exist" as success — **masks both a missing folder AND a broken chain**.
- `migrations/`: `0000_dry_kingpin.sql` (23 tables), `0027_add_api_keys_table.sql`,
  `0028_add_research_discovery_sub_subcategory.sql`. `meta/` has ONLY `0000_snapshot.json`
  + `_journal.json` listing ONLY `0000`.
- **Drizzle `migrate()` reads `_journal.json` entries and reads exactly `${tag}.sql` per entry —
  it does NOT scan the folder.** So 0027/0028 are silently skipped today.
- **THE REAL BUG (why D10 was reversed — both verified by reading the SQL):**
  - `shared/schema.ts` defines **25 tables**; `0000` baseline creates **23**. Missing from the
    entire migration chain: **`research_discoveries`, `research_jobs`** (they reached prod only
    via `drizzle-kit push`; `grep "CREATE TABLE.*research_discoveries" migrations/` → NONE).
  - `0027:18` does unconditional `ADD CONSTRAINT api_keys_user_id_users_id_fk` — but `0000:268`
    ALREADY adds that exact FK (and `0000:1` creates `api_keys`, `0000:296-298` its indexes).
    Replaying 0027 → **42710 duplicate_object → ABORT**. 0027 is fully redundant.
  - `0028` is `ALTER TABLE research_discoveries ADD COLUMN ...` on a table no migration creates
    → **42P01 undefined_table → ABORT**.
  - ⇒ **Adding 0027/0028 to the journal (original D10) makes `migrate()` ABORT on a clean
    volume** — the exact Phase 3 gate scenario. Fix = re-baseline (Phase 3, revised D10).
- `__drizzle_migrations` (schema `drizzle`) tracks applied migrations.

### 2.3 Docker (exists, gaps)
- `Dockerfile` multi-stage (builder→production, node:20-alpine). **Runs as root.** HEALTHCHECK
  uses Node http.get `/api/health`. `npm ci --omit=dev` in prod stage. Copies dist+server+shared.
- `docker-compose.yml`: `postgres:16-alpine` (healthcheck `pg_isready`, named volume
  `postgres_data`) + `app` (build target production, `DATABASE_URL` inline,
  `depends_on: postgres service_healthy`). **app has no healthcheck. No migrate/seed step.
  Maps host `5000:5000`.** Inline DB creds (postgres/postgres) — fine for local, not prod.
- `.dockerignore` exists.

### 2.4 Health route mismatch
- App serves `/api/health`(`routes.ts:3769`, returns `{status:"ok"}` or similar).
- `railway.json` `healthcheckPath: "/health"`; `vercel.json` routes `/health`. **`/health`
  ≠ `/api/health`.** Railway healthcheck would fail.

### 2.5 App surface (audit inventory) — full enumeration in §Phase 5
17 client routes (`client/src/App.tsx:66-87`) + 14-tab admin (`AdminDashboard.tsx`). Counts
DB-sourced at top level (`GET /api/categories` resourceCount, SQL `count(*) WHERE
status='approved'`); sub-levels client-side (drift risk). Seed: live S3 fetch
(`server/seed.ts:208`), ~1949-1953 approved resources, 9 canonical categories, admin user,
idempotent. Known defects: M-02, FP-01, FP-02, FP-03, FX-04, FP-05 (see Phase 5).

### 2.6 Replit reference removal map
| Ref | Location | Action |
|---|---|---|
| OIDC file | `server/replitAuth.ts` | Extract `getSession`+`isAuthenticated`→`server/session.ts`; delete rest |
| Phantom type | `server/types.ts:4` | Define real `SessionUser` in `session.ts` or inline; re-point import |
| Import | `routes.ts:47` `{setupAuth,isAuthenticated}` | → import `isAuthenticated` from `session.ts`; drop `setupAuth` |
| REPL_ID branch | `routes.ts:407-431` | Collapse to the local path only (unconditional getSession+passport+setupLocalAuth) |
| Vite plugins | `vite.config.ts:8-22` | Remove both `@replit/*` plugin blocks |
| Deps | `package.json:152-153` (`@replit/vite-plugin-*` optional), `openid-client`, `memoizee`(if OIDC-only), `memorystore`(:82, dead) | Remove |
| Client banner | `client/index.html:83`(comment),`:96`(.replit.dev),`:158-159`(banner script) | Remove |
| Client comment | `client/src/lib/authUtils.ts:28-29` | Clean |
| OIDC login links | `Login.tsx:94`, `SubmitResource.tsx:274,:336` (`/api/login`) | Repoint to `/login` or remove the OAuth buttons |
| Replit project cfg | `.replit` | Delete |
| Cosmetic | `.env` `NEON_DATABASE_URL`, "Neon" pool comments | Clean |
| GitHub identity | `server/github/replitConnection.ts:39-40` (`REPL_IDENTITY`) | SEPARATE concern (GitHub connection). Evaluate; likely leave a documented fallback. |

---

## 3. Phases (dependency graph + hard gates)

```
Phase 0 (branch) → Phase 1 (auth/replit removal) → Phase 2 (containerize)
   → Phase 3 (migrate+seed) → Phase 4 (deploy config) → Phase 5 (audit loop)
Each gate is hard: prove with executed output before advancing.
Phase 4 may run in parallel with Phase 5 prep (config authoring is independent of the audit).
```

### Phase 0 — Branch (gate: branch active)
1. `git checkout -b feat/dockerize-replace-replit` from `main`.
2. Confirm: `git branch --show-current` → `feat/dockerize-replace-replit`.
3. Commit each phase atomically with conventional messages (no AI attribution).
**GATE**: branch confirmed active.

### Phase 1 — Replace Replit dependencies (auth subtractive + verify storage)
Goal: app runs locally (non-Docker) with passport-local only, zero Replit refs.

1. **Create `server/session.ts`** — move `getSession()` (the connect-pg-simple session
   middleware factory, `replitAuth.ts:21-42` — verified zero openid-client/memoizee coupling, so
   safe to isolate) and a simplified `isAuthenticated`. **The OIDC refresh branch
   (`replitAuth.ts:166-176`) imports openid-client — stripping it to an expiry-only check is
   NECESSARY, not optional**, or the extracted module drags openid-client back in. Define a real
   `SessionUser` type here matching the minted shape (`{ claims:{ sub:string; email?:string;
   first_name?:string; last_name?:string; profile_image_url?:string }; expires_at:number }`).
2. **Edit `server/routes.ts`**:
   - `:47` → `import { isAuthenticated } from "./session";` (drop `setupAuth`).
   - `:407-431` → collapse to unconditional: `app.set("trust proxy",1); app.use(getSession());
     app.use(passport.initialize()); app.use(passport.session()); passport.serializeUser(...);
     passport.deserializeUser(...); setupLocalAuth();` (delete the `if(REPL_ID)` block + the
     dynamic `import("./replitAuth")`). Import `getSession` from `./session`.
   - Leave `routes.ts:1078-1082` SQL untouched (works under local auth — passport stores
     `{claims:{sub}}` identically). Also leave the divergent serialize/deserialize as-is: it is
     NOT a regression (`isAdmin`:97 + `/api/auth/user`:560 re-fetch the user from DB) — do NOT
     port the OIDC `dbUser` hydration from `replitAuth.ts:106-124`.
3. **Edit `server/types.ts:4`** → import `SessionUser` from `./session` (or inline the type).
4. **Delete `server/replitAuth.ts`** after extraction. Grep to confirm no remaining importers.
5. **Edit `vite.config.ts`** → remove lines 8-22 (`@replit/*` plugin blocks). Keep `react()`.
6. **Edit `client/index.html`** → remove `:158-159` (banner script), `:96` (.replit.dev host
   check — replace with a plain dev check or remove), `:83` (comment).
7. **Edit `client/src/lib/authUtils.ts:28-29`** → remove REPL_ID comment.
8. **Repoint OIDC login links**: `Login.tsx:94`, `SubmitResource.tsx:274,:336` — remove the
   "Login with Replit"/`/api/login` buttons or point them to `/login`.
9. **Edit `package.json`** → remove `@replit/vite-plugin-cartographer`,
   `@replit/vite-plugin-runtime-error-modal` (optionalDependencies), `openid-client`,
   `memoizee` (grep-verified OIDC-only — safe), `memorystore` (`:82`, dead — zero imports),
   `@neondatabase/serverless` (`:25`, dead — app uses node-postgres; verify no import then
   remove). Run `npm install` to update lock.
10. **Delete `.replit`.** Clean `.env` (`NEON_DATABASE_URL`, Neon comments in
    `server/db/index.ts`).
11. **Object storage**: VERIFIED not used (no `@replit/object-storage`/`REPLIT_DB_URL`/GCS).
    No action. Document the verification.
12. **GitHub `REPL_IDENTITY`** (`replitConnection.ts:39-40`): evaluate — if it's a fallback for
    a `GITHUB_TOKEN` that's already env-provided, leave with a comment; otherwise ensure
    `GITHUB_TOKEN` env path works without Replit identity.

```xml
<validation_gate id="VG-1" blocking="true">
  <prerequisites>Local Postgres reachable; DATABASE_URL + SESSION_SECRET set in shell.</prerequisites>
  <execute>npm run build; then npm run dev against local Postgres; exercise auth via curl.</execute>
  <capture>
    rg -i "replit|REPL_ID" server client shared --glob '!*.md' | tee e2e-evidence/phase1/replit-refs.txt
    npm run build 2>&1 | tee e2e-evidence/phase1/build.txt
    curl -s localhost:5000/api/health | tee e2e-evidence/phase1/health.json
    curl -s -c /tmp/cj -X POST localhost:5000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"t@t.io","password":"Test1234!"}' | tee e2e-evidence/phase1/register.json
    curl -s -c /tmp/cj -b /tmp/cj -X POST localhost:5000/api/auth/local/login -H 'Content-Type: application/json' -d '{"email":"t@t.io","password":"Test1234!"}' | tee e2e-evidence/phase1/login.json
    curl -s -b /tmp/cj localhost:5000/api/auth/user | tee e2e-evidence/phase1/me.json
  </capture>
  <pass_criteria>
    replit-refs.txt empty (only allowed: a documented GitHub-connection fallback line if kept);
    build.txt ends with exit 0 (vite + esbuild succeed); health.json status ok;
    me.json returns the registered user with isAuthenticated:true (session persists across requests).
  </pass_criteria>
  <review>cat each evidence file; confirm me.json is the registered user, not null.</review>
  <verdict>PASS → Phase 2 | FAIL → fix real system → re-run from prerequisites</verdict>
  <mock_guard>Do NOT stub auth or fake a session to make me.json pass. Fix the real wiring.</mock_guard>
</validation_gate>
```

### Phase 2 — Containerize (harden)
Goal: `docker compose up --build` runs the whole stack cleanly, non-root.

1. **Dockerfile** — add to the `production` stage: create non-root user
   (`RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs`), `COPY
   --from=builder --chown=nodejs:nodejs` for dist/server/shared/migrations, pre-create any
   writable dir, `USER nodejs` before CMD. Keep multi-stage + the Node-based HEALTHCHECK (it
   already targets `/api/health`). **Ensure `migrations/` is COPYed into the production image**
   (currently only dist/server/shared/config are copied — `server/index.ts` looks for
   `./migrations` and `__dirname/../migrations`).
2. **App healthcheck — reconcile, do NOT duplicate (I2/B2)**: the `Dockerfile:50-51`
   HEALTHCHECK (`require('http').get(/api/health)`) already works. Add a compose-level
   healthcheck ONLY if you want shorter intervals; if so, reuse the SAME probe — do not author a
   divergent second one. Wire `depends_on: app: condition: service_healthy` for any downstream.
3. **docker-compose.yml**:
   - Change app `ports` to **`5001:5000`** (host 5001 avoids macOS AirPlay on :5000;
     container stays 5000).
   - Move DB creds + `SESSION_SECRET` + `ADMIN_EMAIL`/`ADMIN_PASSWORD` to `env_file: .env` (or
     `environment` referencing host env) — no hardcoded secrets beyond local dev placeholders.
     **`SESSION_SECRET` is REQUIRED** — `session.ts` keeps the non-null assertion from
     `replitAuth.ts:31`; an unset value crashes the app at boot. Compose must provide it.
   - Keep postgres healthcheck + named volume.
4. **Graceful shutdown (I7)**: add a SIGTERM/SIGINT handler in `server/index.ts` that closes the
   HTTP server and calls `pool.end()` (`server/db/index.ts` exports `pool`) — container restart
   hygiene the DoD requires.
5. **.dockerignore** — verify it excludes node_modules, dist, .git, e2e-evidence, _planning,
   .env (so secrets never enter build context — `.env` already listed; confirm).

```xml
<validation_gate id="VG-2" blocking="true">
  <prerequisites>Phase 1 PASS; .env has DATABASE_URL (compose-internal), SESSION_SECRET, ADMIN_*.</prerequisites>
  <execute>docker compose up --build -d; wait for health; probe.</execute>
  <capture>
    docker compose up --build -d 2>&1 | tee e2e-evidence/phase2/up.txt
    sleep 45; docker compose ps | tee e2e-evidence/phase2/ps.txt
    docker exec awesome-list-app whoami | tee e2e-evidence/phase2/whoami.txt
    curl -s localhost:5001/api/health | tee e2e-evidence/phase2/health.json
    docker exec awesome-list-app sh -c 'ls -la /app/migrations | head' | tee e2e-evidence/phase2/migrations-present.txt
  </capture>
  <pass_criteria>
    ps.txt shows postgres + app both (healthy), no Restarting/crash loop;
    whoami.txt == "nodejs" (non-root); health.json status ok on host port 5001;
    migrations-present.txt lists the .sql files (folder COPYed into image).
  </pass_criteria>
  <review>cat ps.txt + whoami.txt + health.json; confirm non-root + healthy + migrations present.</review>
  <verdict>PASS → Phase 3 | FAIL → fix Dockerfile/compose → re-run from prerequisites</verdict>
  <mock_guard>Do NOT mark healthy by removing the healthcheck. Fix why the container is unhealthy.</mock_guard>
</validation_gate>
```

### Phase 3 — Migrations + seeding (idempotent on startup) — HIGHEST-RISK PHASE
Goal: fresh `up` fully migrates + seeds; restart is idempotent; data persists.

> **⚠️ Revised D10 — RE-BASELINE, do NOT hand-edit the journal.** Verified: 0027 duplicates the
> 0000 api_keys FK (→42710) and 0028 ALTERs `research_discoveries`, a table no migration creates
> (→42P01); the chain is missing `research_discoveries`+`research_jobs` (only in `shared/schema.ts`,
> pushed via `db:push`). Adding 0027/0028 to the journal would ABORT `migrate()` on a clean
> volume. `shared/schema.ts` is the source of truth → regenerate one complete baseline.

1. **Re-baseline migrations from `shared/schema.ts`**:
   - Archive the broken chain: move `migrations/0000_dry_kingpin.sql`, `0027_*`, `0028_*`, and
     `migrations/meta/` to `migrations/_archive-pre-rebaseline/` (keep for history; out of the
     active folder the migrator scans).
   - `npx drizzle-kit generate` against the current `shared/schema.ts` (`drizzle.config.ts`
     points at it) → one fresh baseline `.sql` covering ALL 25 tables + a fresh `_journal.json`
     + snapshot. Inspect the generated SQL: confirm `research_discoveries`, `research_jobs`,
     `api_keys` (with exactly ONE FK), `sessions`, and all hierarchy tables are present.
   - **Alternative (history-preserving, if user prefers):** keep the chain; rewrite 0028 to
     `CREATE TABLE IF NOT EXISTS research_discoveries (...)` + `research_jobs (...)` (defs from
     `shared/schema.ts:1214+`) then the ALTER; neutralize redundant 0027. More fragile — re-baseline preferred.
2. **Migrate-on-startup — in-process (NOT a one-shot service)**: the research-suggested one-shot
   `drizzle-kit migrate` service is unrunnable here — `drizzle-kit` is a devDep (`package.json:134`)
   stripped by `npm ci --omit=dev` (`Dockerfile:32`), and no `migrate:deploy` script exists. The
   app ALREADY has `runMigrations()` (`server/index.ts:53`) using the runtime
   `drizzle-orm/node-postgres/migrator` (a real prod dep). Make it run **regardless of `NODE_ENV`**
   (currently prod-only, `:138`) with a `wait-for-db` retry loop. Single-replica → no race; do
   NOT also add a sidecar migrator (double-migrate race on `__drizzle_migrations`).
3. **Seed**: runs via `runBackgroundInitialization()` (`routes.ts:3818`, fired after `listen`).
   Idempotent (skip-if-exists per entity). Parameterize admin creds (D6): edit
   `server/seed.ts:138-139` (`seedAdminUser`) to read `process.env.ADMIN_EMAIL` /
   `process.env.ADMIN_PASSWORD`, fallback `admin@example.com` / `admin123`. Harden the reseed
   guard (`routes.ts:3846` `needsReseeding = categories===0 && resources===0`) so a partial seed
   (S3 died mid-resources) can self-heal (e.g. resources-below-threshold also triggers reseed).
4. **Seed source (D5) — BINDING: vendor the JSON.** `seed.ts:208` fetches
   `recategorized_with_researchers_2010_projects.json` from a live S3 URL → `docker compose up`
   would need network and is not reproducible offline. Vendor the JSON into the repo
   (`server/seed-data/`), read from disk, fall back to the S3 URL only if the file is absent.
   This is a real `seed.ts` code edit, not config.

```xml
<validation_gate id="VG-3" blocking="true">
  <prerequisites>Phase 2 PASS. Start from a CLEAN volume: docker compose down -v.</prerequisites>
  <execute>Fresh up; wait for migrate + seed to COMPLETE (do not trust healthcheck — seed runs
    async AFTER listen, I3); query DB; then restart and re-count for idempotency.</execute>
  <capture>
    docker compose down -v; docker compose up --build -d 2>&1 | tee e2e-evidence/phase3/up.txt
    # Poll seed completion — healthcheck flips healthy BEFORE ~1950 rows land:
    docker compose logs -f app 2>&1 | grep -m1 "✅ Database seeding completed" | tee e2e-evidence/phase3/seed-done.txt
    docker exec awesome-list-db psql -U postgres -d awesome_list -c "SELECT count(*) FROM drizzle.__drizzle_migrations;" | tee e2e-evidence/phase3/migrations-applied.txt
    docker exec awesome-list-db psql -U postgres -d awesome_list -c "\dt" | tee e2e-evidence/phase3/tables.txt
    docker exec awesome-list-db psql -U postgres -d awesome_list -c "SELECT to_regclass('research_discoveries'), to_regclass('research_jobs'), to_regclass('api_keys');" | tee e2e-evidence/phase3/missing-tables-check.txt
    curl -s localhost:5001/api/categories | jq 'length' | tee e2e-evidence/phase3/cat-count.txt
    curl -s "localhost:5001/api/resources?limit=1" | jq '.total' | tee e2e-evidence/phase3/res-total.txt
    # Idempotency: restart WITHOUT -v, recount
    docker compose restart app; sleep 30
    curl -s "localhost:5001/api/resources?limit=1" | jq '.total' | tee e2e-evidence/phase3/res-total-after-restart.txt
  </capture>
  <pass_criteria>
    No 42710 / 42P01 / "already exists" / "does not exist" in up.txt;
    seed-done.txt contains the completion line; migrations-applied.txt count ≥ 1 with NO error;
    missing-tables-check.txt shows all three tables non-NULL (research_discoveries + research_jobs
    + api_keys ALL exist — proves the re-baseline fixed the chain);
    cat-count.txt == 9; res-total.txt ≈ 1949-1953;
    res-total-after-restart.txt EQUALS res-total.txt (no dupes, data persisted across restart).
  </pass_criteria>
  <review>cat up.txt for SQL errors; cat missing-tables-check.txt — the whole point is these
    tables now exist; compare the two res-total files for exact equality.</review>
  <verdict>PASS → Phase 4 | FAIL → fix migrations/seed → docker compose down -v → re-run from prerequisites</verdict>
  <mock_guard>Do NOT seed by hand-inserting rows to make counts pass. The seed pipeline must produce them.</mock_guard>
</validation_gate>
```

### Phase 4 — Production deploy config (no live deploy) — can parallelize with Phase 5 prep
Goal: Railway + DO configs authored + validated; secrets externalized; monitoring documented.

1. **Railway**: edit `railway.json` `deploy.healthcheckPath` → `/api/health` (fixes the
   mismatch). Confirm `build.builder=DOCKERFILE`. Document Railway managed-Postgres
   provisioning (auto `DATABASE_URL`), setting `SESSION_SECRET`/`ADMIN_*`/`GITHUB_TOKEN`/
   `ANTHROPIC_API_KEY` as Railway variables (runtime, not baked).
2. **DigitalOcean**: author `.do/app.yaml` App Platform spec — service from Dockerfile,
   `http_port` 5000, health-check `http_path: /api/health`, env vars as `SECRET` type, a DO
   Managed Postgres `databases:` block (or documented external `DATABASE_URL`). Document
   backups + PITR (DO managed-PG feature).
3. **Delete `vercel.json`** (dead end for a long-lived Express+SSR container).
4. **Monitoring**: document health-check endpoints, where logs go (platform log streams),
   restart policy (already in railway.json: ON_FAILURE, 10 retries).
5. **Secrets doc**: a `docs/DEPLOYMENT.md` (exists — update) section listing every env var,
   which are secret, and that none are baked into the image.

```xml
<validation_gate id="VG-4" blocking="true">
  <prerequisites>Phase 3 PASS (proves /api/health + the app the configs point at actually work).</prerequisites>
  <execute>Validate both config shapes; confirm vercel.json gone + no committed secrets.</execute>
  <capture>
    jq -e '.deploy.healthcheckPath=="/api/health" and .build.builder=="DOCKERFILE"' railway.json | tee e2e-evidence/phase4/railway-check.txt
    (command -v doctl &amp;&amp; doctl apps spec validate .do/app.yaml || python3 -c "import yaml,sys;yaml.safe_load(open('.do/app.yaml'));print('yaml-ok')") 2>&amp;1 | tee e2e-evidence/phase4/do-spec-check.txt
    ls vercel.json 2>&amp;1 | tee e2e-evidence/phase4/vercel-removed.txt
    rg -n '"/health"' . --glob '!*.md' --glob '!e2e-evidence/**' | tee e2e-evidence/phase4/health-path-refs.txt
    git grep -nE "$(grep -oE '^[A-Z_]+' .env | paste -sd'|' -)=." -- . ':!.env' ':!*.md' 2>/dev/null | tee e2e-evidence/phase4/committed-secrets.txt
  </capture>
  <pass_criteria>
    railway-check.txt == true; do-spec-check.txt == "yaml-ok" or doctl validation success;
    vercel-removed.txt == "No such file"; health-path-refs.txt has no non-/api "/health" route;
    committed-secrets.txt empty (no secret VALUES in tracked files).
  </pass_criteria>
  <review>cat each; confirm healthcheckPath fixed, vercel.json gone, zero committed secrets.</review>
  <verdict>PASS → Phase 5 | FAIL → fix config → re-run</verdict>
  <mock_guard>doctl may be absent — YAML-lint + the documented DO field checklist is the accepted
    fallback. Do NOT fabricate a "valid" verdict; capture whichever validator actually ran.</mock_guard>
</validation_gate>
```

### Phase 5 — Exhaustive functional audit + remediation loop
Precondition: Phase 3 gate green (Dockerized app at `localhost:5001`, seed verified).

**Audit inventory** (screen → controls → data assertions):

| # | Screen | Route | Key controls | Data assertion | Auth |
|---|---|---|---|---|---|
| 1 | Home | `/` | sort select, category cards, tag-filter popover (mounts only if tags), clear-filters | card count == # categories displayCount>0 (~9); each `badge-count-<slug>` == `/api/categories` resourceCount; subhead total == `/api/resources?limit=1` `.total` | no |
| 2 | Login | `/login` | email/pw, submit, (OAuth buttons removed in P1) | valid admin → `/admin`; wrong creds rejected | gate |
| 3 | Register | `/register` | form + submit | new role=user row | no |
| 4 | Category | `/category/:slug` | search, subcategory filter, sort, view-mode toggle, resource cards, suggest-edit (gated) | `text-results-count` Y == DB count for category == sidebar badge | no |
| 5 | Subcategory | `/subcategory/:slug` | cards, back | h1==name; badge==count | no |
| 6 | SubSubcategory | `/sub-subcategory/:slug` | cards, back | h1==name; badge==count | no |
| 7 | ResourceDetail | `/resource/:id` | visit, share, suggest-edit(gated), related, favorite/bookmark(authed) | title/url match; related from `/api/resources/:id/related` | partial |
| 8 | About | `/about` | static cards, nav | renders | no |
| 9 | Advanced | `/advanced` | 4 tabs (Explorer/Metrics/Export/AI) — **use full pointer-event sequence (FP-01)**, search, export CTA | export CTA "Export {N}" == total | no |
| 10 | SubmitResource | `/submit` | unauth gate; authed form (title/url/desc/category/tags) | authed submit → `POST /api/resources` pending; category opts == DB | form gated |
| 11 | Journeys | `/journeys` | journey cards, category select, view-journey | card count == published journeys | no |
| 12 | JourneyDetail | `/journey/:id` | start(authed), steps, complete-step | steps render (verify FP-02 `/journey/6` 0-steps fixed) | partial |
| 13 | Profile | `/profile` | account form, change-password | `/api/auth/user` 200 | AuthGuard |
| 14 | Bookmarks | `/bookmarks` | saved cards, remove | `/api/bookmarks` | AuthGuard |
| 15 | Admin | `/admin` | 14 tabs (approvals…audit) | `/api/admin/stats` cards | AdminGuard |
| 16 | ThemeSettings | `/settings/theme` | font picker (works), **color picker (verify M-02 blank+no-op fixed)** | swatches render, selection applies | no |
| 17 | 404 | `*` | home link, browse CTA | title "404 - Page Not Found" | no |

Plus **persistent chrome** every screen: header (mobile-drawer-trigger, search dialog via `/`
+ Cmd/Ctrl+K, theme link, login/avatar dropdown), sidebar (brand count, nav, CATEGORIES
accordion with DB badges, About), search dialog (Fuse.js). Plus **14 admin tabs** each exercised.

**Per-screen × per-breakpoint procedure** (breakpoints 320/375/768/1024/1280/1440/1920):
1. `resize_page(width=BP, height=900)`.
2. `navigate_page(url=...)` (or reload).
3. `wait_for(text=<known post-hydration string for that screen>)` — NOT networkidle alone.
4. `list_console_messages(types:["error"])` → assert empty (regex for hydration-mismatch
   patterns too).
5. `list_network_requests(...)` → filter status ≥400 yourself (MCP has no status filter) →
   assert none.
6. `evaluate_script(<overflow+clipping probe>)` → assert `scrollWidth<=clientWidth+1`, no
   off-viewport interactive controls.
7. `take_snapshot()` (a11y/UIDs) + `take_screenshot(filePath=e2e-evidence/audit/<screen>-<bp>.png)`.
8. Exercise controls (click/fill via snapshot UIDs); for `/advanced` tabs use full
   pointer-event dispatch; assert each control's result (filtered set/count/nav/modal).
9. Auth flows: register → login → session persists → protected route reachable → logout.

**Harness note (I6)**: the audit drives the Docker container at `http://localhost:5001` via the
Chrome DevTools MCP. If codifying stabilized checks into the existing Playwright suite, override
`baseURL` → `http://localhost:5001` and DISABLE the `webServer` block (`playwright.config.ts:31`
baseURL + `:77` webServer `npm run dev`) — otherwise Playwright boots a SEPARATE dev stack on
:5000 and tests the wrong app. The MCP pass is primary; Playwright codification is for CI.

**Remediation loop** (do not exit early):
```
while defects_found:
  record defect (screen, breakpoint, control, expected vs actual, console/network evidence)
  diagnose root cause (frontend | API | data/seed | container/config)
  fix the real system
  rebuild/redeploy affected container(s)
  re-verify affected area + whole-app smoke pass
exit when defects_found == 0 across ALL screens AND ALL breakpoints
```

**Known defects to confirm fixed or fix**: M-02 (theme color picker field-shape mismatch
`ThemeSettings.tsx`↔`shadcn-themes.ts`↔`theme-provider.tsx`), FP-01 (advanced tabs pointer
events), FP-02 (journey 6 zero steps — seed fix), FP-03 (home tag filter never mounts), FX-04
(login no error toast), FP-05 (sidebar active-pill never lights).

```xml
<validation_gate id="VG-5" blocking="true">
  <prerequisites>Phase 3 PASS (seeded Docker app at :5001); count baseline captured from
    /api/categories, /api/resources?limit=1, /api/subcategories, /api/sub-subcategories, /api/journeys.</prerequisites>
  <execute>For EVERY screen (17) + EVERY admin tab (14) × EVERY breakpoint (7) run the
    per-breakpoint procedure above. Maintain an audit matrix + defect changelog file.</execute>
  <capture>
    e2e-evidence/audit/matrix.md  (rows = screens/tabs, cols = 7 breakpoints, cell = PASS/FIXED/FAIL)
    e2e-evidence/audit/defects.md (DEFECT-NN: screen, bp, control, expected vs actual, root cause, fix, re-verify)
    e2e-evidence/audit/&lt;screen&gt;-&lt;bp&gt;.png + per-cell console-errors.txt + failed-requests.txt (status ≥400)
  </capture>
  <pass_criteria>
    matrix.md every cell == PASS (or FIXED then re-verified PASS); defects.md zero OPEN items;
    every cell: console-errors.txt empty (incl. no hydration-mismatch), failed-requests.txt empty
    (no ≥400), overflow probe scrollWidth ≤ clientWidth+1, rendered counts == DB baseline;
    auth register/login/session/logout + a CRUD write persist and survive `docker compose restart`;
    known defects M-02, FP-01, FP-02 confirmed FIXED with screenshot evidence.
  </pass_criteria>
  <review>Open the screenshots (Read tool) and confirm CONTENT — not just file existence;
    read matrix.md + defects.md; a skeptical reviewer would agree zero cells are FAIL/OPEN.</review>
  <verdict>PASS → DONE | any FAIL/OPEN → remediation loop → re-verify affected area + whole-app smoke → re-run</verdict>
  <mock_guard>Do NOT mark a cell PASS from code-reading or assumption. Every PASS needs a real
    browser screenshot + captured console/network for that exact screen×breakpoint.</mock_guard>
</validation_gate>
```

---

## 3b. Gate manifest

```xml
<gate_manifest>
  <total_gates>6</total_gates>
  <sequence>VG-0 (branch) → VG-1 (auth/replit removal) → VG-2 (containerize) → VG-3 (migrate+seed) → VG-4 (deploy config) → VG-5 (audit loop)</sequence>
  <policy>All gates BLOCKING. No advancement on FAIL. VG-3 and VG-5 require a CLEAN-volume / real-browser run respectively — no shortcuts.</policy>
  <evidence_dir>e2e-evidence/ (phase1..phase4 subdirs + audit/)</evidence_dir>
  <regression>If ANY gate FAILS: fix the REAL system → re-run from that gate's prerequisites → do NOT skip. VG-5 remediation re-runs the affected area AND a whole-app smoke pass.</regression>
  <highest_risk>VG-3 — re-baseline + clean-volume migrate+seed. The two BLOCKING defects (42710/42P01) live here.</highest_risk>
</gate_manifest>
```

---

## 4. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Deleting `replitAuth.ts` breaks the local session path (it imports `getSession` from there) | EXTRACT `getSession`+expiry-only `isAuthenticated` to `server/session.ts` FIRST; build before deleting (verified: getSession has no openid-client coupling; the refresh branch does — strip it) |
| `memoizee` removed but used elsewhere | RESOLVED: grep-verified OIDC-only — safe to remove |
| **Migration chain incomplete (0027 dup-FK →42710; 0028 ALTERs uncreated table →42P01; research_discoveries/research_jobs missing)** | **Re-baseline from `shared/schema.ts` (revised D10); archive old chain; clean-volume migrate gate (VG-3) proves all 25 tables build** |
| Re-baseline regenerates a snapshot that drifts from prod | Docker starts clean → no existing-object conflict; VG-3 runs on a fresh volume; the generated SQL is inspected before commit |
| Seed S3 fetch fails offline → empty/partial DB → audit meaningless | D5 binding: vendor the JSON into the repo, read from disk, S3 fallback only; harden the reseed guard so partial seeds self-heal |
| Double-migrator race | Use in-process `runMigrations()` only (no sidecar); single replica |
| macOS :5000 AirPlay collision | host port 5001 in compose |
| `SESSION_SECRET` unset → crash (non-null assertion) | require it in compose env; document |
| No graceful shutdown / leaked PG pool on restart | add SIGTERM handler + `pool.end()` (Phase 2 step 4) |
| Audit false-greens from SSR hydration race | hydration-marker wait (not networkidle) + re-query; capture hydration-mismatch console errors as defects |
| MCP network list lacks status filter | filter ≥400 in script; cross-check with `get_network_request` |
| Playwright CI tests wrong stack (:5000 dev vs :5001 container) | override baseURL→:5001, disable webServer block |
| Counts drift (sub-level client-side vs DB) | assert top-level == DB; flag sub-level drift as a defect candidate |

## 5. Out of scope (do not do)
- Installing better-auth (D1 chose passport-local).
- Live cloud deploy (D2 config-only).
- MinIO/object storage (D4 not used).
- Writing unit tests / mocks / test files (functional-validation mandate — audit uses the real
  running app).
- Refactors beyond what Replit-removal + hardening + the known defects require.

## 6. Success criteria checklist (Definition of Done)
- [ ] Branch `feat/dockerize-replace-replit` used throughout.
- [ ] Zero Replit refs (grep-proven) in server/client/shared (GitHub-conn fallback documented if kept).
- [ ] `npm run build` / `tsc` clean.
- [ ] `docker compose up --build` from clean volume: postgres + app all healthy, non-root, in-process migrate ran.
- [ ] Re-baselined chain applies cleanly (no 42710/42P01); ALL 25 schema tables exist — incl. `research_discoveries`, `research_jobs`, `api_keys` (single FK).
- [ ] Seed: ~1949-1953 resources, 9 categories, admin user (env-parameterized creds); seed completion confirmed by log poll (not healthcheck).
- [ ] Restart → idempotent, data persists (volume).
- [ ] register/login/session/logout + change-password work; protected routes gated.
- [ ] `railway.json` healthcheck `/api/health`; `.do/app.yaml` valid; `vercel.json` deleted; no secrets committed.
- [ ] Audit matrix 17 screens + 14 admin tabs × 7 breakpoints = 100% PASS; zero open defects; M-02/FP-01/FP-02 confirmed fixed.
- [ ] Evidence captured per audit cell (screenshots + console/network).
