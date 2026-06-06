# Mission

Take `awesome-list-site` off Replit, Dockerize it, and run an exhaustive browser-driven functional audit until it is production-ready. Auth is finished on `passport-local` (decision D1 — NOT better-auth) by ripping out the Replit OIDC provider while keeping the identical minted session-user contract. The container is hardened (non-root, healthcheck, graceful shutdown, migrations copied, host port 5001). The migration chain is **re-baselined** from `shared/schema.ts` (decision D10 — NOT journal-editing) to eliminate the blocking `42710` / `42P01` defects on a clean volume, plus an idempotent vendored-JSON seed. Deploy is **config-only** (decision D2 — no live deploy this run) authoring both Railway and DigitalOcean App Platform shapes (decision D3) and deleting `vercel.json`. Finally a real Chrome-DevTools-MCP browser audit drives every screen and admin tab at every breakpoint with captured evidence until zero defects remain.

## Execution rules

- **Strict dependency order:** `00 → 01 → 02 → 03 → {04, 05}`. Section 04 and 05 may proceed in parallel only AFTER section 03's gate (VG-3) PASSes; both require a seeded, migrated DB.
- **Do NOT advance past a FAILing gate.** Each section ends in a blocking validation gate (VG-0 .. VG-5). The next section may not begin until the current section's gate PASSes with real captured evidence under `e2e-evidence/`.
- **Iron Rule:** build and run the REAL system. No mocks, no stubs, no test doubles, no test files, no fabricated output. Every PASS verdict must cite real executed-output evidence files by path.
- **On failure, fix the REAL system** (the actual source/config files named in the section) and **re-run from the gate's prerequisites** — for section 03 that means `docker compose down -v` and a fresh clean-volume up. Never weaken a healthcheck, hand-insert rows, or stub an endpoint to make a gate pass.
- **Branch discipline:** all work on `feat/dockerize-replace-replit` only, never `main`. One atomic conventional commit per section (`feat:`/`fix:`/`chore:`/`docs:`/`refactor:`), no AI attribution, no co-author trailers.
- **Secrets:** never commit secret values; everything env/secret-driven (`SESSION_SECRET`, `ADMIN_*`, `DATABASE_URL`, tokens).
- **Section 03 is the highest-risk section** — read its full Background before touching anything.

---

## Full content of sections/index.md

<!-- SECTION_MANIFEST
section-00-branch-setup
section-01-replace-replit-auth
section-02-containerize-harden
section-03-rebaseline-migrate-seed
section-04-deploy-config
section-05-functional-audit-loop
-->

# Section Index — Criterion #7 Dockerize & Replace Replit

Implementation units derived from `../claude-plan.md`. Each section is **self-contained**: an
implementer should not need to read any other document. Execute in dependency order; each
section ends with its blocking validation gate (VG-N). Do not advance on a FAIL.

## Dependency graph

```
section-00 (branch)
  └─→ section-01 (auth / Replit removal, VG-1)
        └─→ section-02 (containerize + harden, VG-2)
              └─→ section-03 (re-baseline migrate + seed, VG-3)   ← HIGHEST RISK
                    ├─→ section-04 (deploy config, VG-4)          ← parallel-OK with 05 prep
                    └─→ section-05 (functional audit loop, VG-5)  ← needs 03 green
```

| Section | Title | Gate | Depends on | Risk |
|---|---|---|---|---|
| 00 | Branch setup | VG-0 (branch active) | — | trivial |
| 01 | Replace Replit auth (subtractive) | VG-1 | 00 | medium |
| 02 | Containerize + harden (non-root, healthcheck, shutdown) | VG-2 | 01 | medium |
| 03 | Re-baseline migrations + idempotent seed | VG-3 | 02 | **HIGH** |
| 04 | Production deploy config (Railway + DO, no live deploy) | VG-4 | 03 | low |
| 05 | Exhaustive functional audit + remediation loop | VG-5 | 03 | high (volume) |

## Cross-cutting rules (apply to every section)
- Branch `feat/dockerize-replace-replit` only; atomic conventional commits per section.
- Iron Rule: build/run the REAL system. No mocks, stubs, test doubles, or test files.
- Every gate proven by real executed output captured to `e2e-evidence/`.
- No secrets committed; env/secret-driven (`SESSION_SECRET`, `ADMIN_*`, `DATABASE_URL`, tokens).
- Decisions locked: D1 passport-local (not better-auth) · D2 config-only deploy · D3 Railway+DO ·
  D4 no object storage · D5 vendor seed JSON · D6 env admin creds · D10 **re-baseline** (not journal-edit).

---

# SECTION 00 — Branch Setup (Phase 0)

## Background

First phase of taking `awesome-list-site` off Replit, Dockerizing it, and auditing it. All work for this effort happens on a dedicated feature branch, never on `main`. Keeping `main` clean protects the deployable baseline while the migration is in progress and lets the whole effort be reviewed (or abandoned) as a single unit.

Each subsequent phase produces an atomic, conventional commit (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`) scoped to that phase's work. Commit messages contain no AI attribution and no co-author trailers.

## Requirements

- A branch named `feat/dockerize-replace-replit` exists, created from `main`.
- That branch is the active (checked-out) branch before any later phase begins.

## Dependencies

- **Requires:** nothing.
- **Blocks:** section-01.

## Implementation steps

1. From `main`, create and switch to the working branch:
   ```bash
   git checkout main
   git checkout -b feat/dockerize-replace-replit
   ```
2. Confirm the active branch:
   ```bash
   git branch --show-current
   ```

## Validation gate VG-0 (blocking)

**Pass criteria:** `git branch --show-current` outputs exactly `feat/dockerize-replace-replit`.

Capture the evidence:
```bash
mkdir -p e2e-evidence/phase0
git branch --show-current | tee e2e-evidence/phase0/branch.txt
```

Gate fails (do not proceed to section-01) if `e2e-evidence/phase0/branch.txt` contains anything other than `feat/dockerize-replace-replit`.

## Acceptance criteria

- [ ] Branch `feat/dockerize-replace-replit` created from `main`.
- [ ] `git branch --show-current` outputs `feat/dockerize-replace-replit`.
- [ ] Evidence captured to `e2e-evidence/phase0/branch.txt`.

## Files to create/modify

None — git state only.

---

# SECTION 01 — Replace Replit Auth (SUBTRACTIVE) + Remove All Replit References

> Goal: app builds and runs **locally, non-Docker**, on `passport-local` only. Zero Replit references in `server/`, `client/`, `shared/` (grep-proven). Replit OIDC ripped out; the working local auth stays.

## Background

The app has **hybrid auth**. Two systems coexist:

- **Replit OIDC** — `server/replitAuth.ts`, an `openid-client`-based OIDC flow, wired into `server/routes.ts:47` (import) and gated behind a `process.env.REPL_ID` branch at `server/routes.ts:407-431` (dynamic `import("./replitAuth")`).
- **Local passport-local** — `server/localAuth.ts`, `setupLocalAuth()` at `server/localAuth.ts:6`. It mints a session user of shape `{ claims: { sub, email, first_name, last_name, profile_image_url }, expires_at }` at `server/localAuth.ts:41-50`. This already works.

**Decision D1: finish `passport-local`, rip out Replit OIDC.** (Not better-auth — out of scope.)

Why this is safe: the session-user shape minted by local auth is **identical** to the shape the OIDC flow minted. The roughly **45 `req.user.claims.sub` reads** and roughly **90 `isAuthenticated` / `isAdmin` middleware sites** across the codebase are therefore **auth-agnostic** — they read the minted shape, not the auth provider — so they keep working unchanged. We are removing the *provider*, not the *contract*.

## Requirements

- Zero `replit` / `REPL_ID` references in `server/`, `client/`, `shared/` (proven by `rg`, `.md` files excluded). The **only** allowed surviving reference is the documented GitHub-connection `GITHUB_TOKEN` fallback (see step 12).
- App builds (`npm run build` exits 0) and runs locally without Docker.
- Register, login, session persistence, and logout all work via `passport-local`.

## Dependencies

- **Requires:** section-00 (repo/env baseline, local Postgres reachable).
- **Blocks:** section-02.

## Implementation Steps

1. **Create `server/session.ts`.** Move `getSession()` out of `server/replitAuth.ts:21-42` (the `connect-pg-simple` session-middleware factory — verified to have **no** `openid-client` / `memoizee` coupling). Add a **simplified** `isAuthenticated` middleware that does an **expiry check only**. The OIDC token-refresh branch at `server/replitAuth.ts:166-176` imports `openid-client`; stripping it is **necessary, not optional** (keeping it re-introduces the dependency we are deleting). Define a real `SessionUser` type matching the minted shape:
   ```ts
   export interface SessionUser {
     claims: {
       sub: string;
       email: string;
       first_name: string;
       last_name: string;
       profile_image_url: string;
     };
     expires_at: number;
   }
   ```
   `isAuthenticated`: reject if not authenticated or if `req.user.expires_at` is in the past; otherwise `next()`.

2. **Edit `server/routes.ts`.**
   - Line 47: change the import to `import { isAuthenticated } from "./session";` — **drop** `setupAuth`.
   - Lines 407-431: **collapse to unconditional**. Delete the entire `if (process.env.REPL_ID) { ... }` block and the `await import("./replitAuth")` dynamic import. Replace with:
     ```ts
     app.set("trust proxy", 1);
     app.use(getSession());            // from ./session
     app.use(passport.initialize());
     app.use(passport.session());
     passport.serializeUser((user: any, done) => done(null, user));
     passport.deserializeUser((user: any, done) => done(null, user));
     setupLocalAuth(app);
     ```
   - **Leave `server/routes.ts:1078-1082` UNTOUCHED** — the raw-SQL session DELETE `sess->'passport'->'user'->'claims'->>'sub'` works under local auth (same minted shape).
   - **Do NOT** port the OIDC `dbUser` hydration. Divergent serialize/deserialize (pass-through vs. DB hydration) is **not a regression**: `isAdmin` (`server/routes.ts:97`) and `/api/auth/user` (`server/routes.ts:560`) both re-fetch from the DB.

3. **Edit `server/types.ts:4`** — change to `import { SessionUser } from "./session";` (or inline the interface). Ensure the Express `Request.user` augmentation references `SessionUser`.

4. **Delete `server/replitAuth.ts`** after extraction. Then grep to confirm no importers remain:
   ```
   rg -n "replitAuth" server
   ```
   Expect zero hits.

5. **Edit `vite.config.ts`** — remove lines 8-22 (the `@replit/*` plugin blocks: cartographer + runtime-error-modal). **Keep** `react()`.

6. **Edit `client/index.html`** — remove:
   - `:158-159` — the `replit-dev-banner` script tag.
   - `:96` — the `.replit.dev` host check.
   - `:83` — the related comment.

7. **Edit `client/src/lib/authUtils.ts:28-29`** — remove the `REPL_ID` comment.

8. **Repoint OIDC login links.** Remove the "Login with Replit" `/api/login` buttons, or point them to `/login`:
   - `client/src/pages/Login.tsx:94`
   - `client/src/pages/SubmitResource.tsx:274`
   - `client/src/pages/SubmitResource.tsx:336`

9. **Edit `package.json`** — remove dependencies:
   - `@replit/vite-plugin-cartographer` (optionalDep)
   - `@replit/vite-plugin-runtime-error-modal` (optionalDep)
   - `openid-client` (OIDC-only)
   - `memoizee` (grep-verified OIDC-only)
   - `memorystore` (`:82` dead — zero imports)
   - `@neondatabase/serverless` (`:25` dead — app uses node-postgres; **verify no import first**, then remove)

   Then `npm install` to update the lockfile.

10. **Delete `.replit`.** Clean `.env`: remove `NEON_DATABASE_URL`. Remove "Neon" comments in `server/db/index.ts`.

11. **Object storage — VERIFIED not used.** No `@replit/object-storage`, no `REPLIT_DB_URL`, no GCS. **No action required.** Documented here for completeness.

12. **GitHub `REPL_IDENTITY` is a SEPARATE concern.** `server/github/replitConnection.ts:39-40` is a GitHub *connection* token, **not auth**. **Leave it**, with a documented `GITHUB_TOKEN`-env fallback. This is the single allowed surviving `replit`-named reference (it lives in a connection module, not the auth path).

## Validation Gate VG-1 (BLOCKING)

**Prerequisites:** local Postgres reachable; `DATABASE_URL` and `SESSION_SECRET` set in env.

**Capture (run exactly):**
```
mkdir -p e2e-evidence/phase1

rg -i "replit|REPL_ID" server client shared --glob '!*.md' | tee e2e-evidence/phase1/replit-refs.txt

npm run build 2>&1 | tee e2e-evidence/phase1/build.txt

# start the server, then with a cookie jar:
curl -s http://localhost:5001/api/health | tee e2e-evidence/phase1/health.json
curl -s -c e2e-evidence/phase1/jar.txt -X POST http://localhost:5001/api/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"vg1@example.com","password":"Vg1-passw0rd","firstName":"VG","lastName":"One"}' \
  | tee e2e-evidence/phase1/register.json
curl -s -c e2e-evidence/phase1/jar.txt -b e2e-evidence/phase1/jar.txt -X POST http://localhost:5001/api/local/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"vg1@example.com","password":"Vg1-passw0rd"}' \
  | tee e2e-evidence/phase1/login.json
curl -s -b e2e-evidence/phase1/jar.txt http://localhost:5001/api/auth/user \
  | tee e2e-evidence/phase1/auth-user.json
```

**Pass criteria:**
- `replit-refs.txt` is **empty** (the only allowed line is the documented GitHub-connection fallback from step 12).
- `build.txt` shows build **exit 0**.
- `auth-user.json` returns the registered user with `isAuthenticated: true` (the session persists across the cookie jar).

**Mock guard:** Do **NOT** stub auth or fake a session to make the gate pass. If it fails, fix the real wiring (`server/session.ts`, `server/routes.ts`).

## Acceptance Criteria

- [ ] `server/session.ts` created with `getSession()`, simplified expiry-only `isAuthenticated`, and `SessionUser` type.
- [ ] `server/routes.ts:47` imports `isAuthenticated` from `./session`; `setupAuth` no longer imported.
- [ ] `server/routes.ts:407-431` collapsed to unconditional local-auth wiring; `REPL_ID` branch + dynamic `import("./replitAuth")` deleted.
- [ ] `server/routes.ts:1078-1082` raw-SQL session DELETE left untouched.
- [ ] `server/types.ts:4` references `SessionUser`.
- [ ] `server/replitAuth.ts` deleted; `rg "replitAuth" server` returns zero hits.
- [ ] `vite.config.ts` `@replit/*` plugin blocks removed; `react()` kept.
- [ ] `client/index.html` lines `:158-159`, `:96`, `:83` removed.
- [ ] `client/src/lib/authUtils.ts:28-29` `REPL_ID` comment removed.
- [ ] `/api/login` "Login with Replit" buttons removed/repointed in `Login.tsx:94`, `SubmitResource.tsx:274` & `:336`.
- [ ] `package.json` Replit/OIDC/dead deps removed; lockfile updated via `npm install`.
- [ ] `.replit` deleted; `.env` `NEON_DATABASE_URL` removed; Neon comments removed from `server/db/index.ts`.
- [ ] GitHub `REPL_IDENTITY` left with documented `GITHUB_TOKEN` fallback (only allowed surviving ref).
- [ ] VG-1 passes: `replit-refs.txt` empty, build exit 0, `/api/auth/user` returns user with `isAuthenticated: true`.

## Files to Create / Modify / Delete

**Create:**
- `server/session.ts`

**Modify:**
- `server/routes.ts`
- `server/types.ts`
- `vite.config.ts`
- `client/index.html`
- `client/src/lib/authUtils.ts`
- `client/src/pages/Login.tsx`
- `client/src/pages/SubmitResource.tsx`
- `package.json`
- `server/db/index.ts`
- `.env`

**Delete:**
- `server/replitAuth.ts`
- `.replit`

---

# SECTION 02 — Containerize & Harden

Make `docker compose up --build` bring the whole stack up cleanly, non-root, with migrations present and a healthy app on host port 5001.

## Background

Docker infrastructure ALREADY exists — this phase fixes gaps, it does not author from scratch.

**`Dockerfile`** (multi-stage `builder` -> `production`, both `node:20-alpine`):
- Builder runs `npm ci` then `npm run build` (vite build + esbuild `server/index.ts` -> `dist/`).
- Production stage runs `npm ci --omit=dev`, then `COPY --from=builder` of `dist`, `server`, `shared`, `drizzle.config.ts`, `tsconfig.json`.
- `ENV NODE_ENV=production`, `EXPOSE 5000`, `CMD ["node", "dist/index.js"]`.
- A working Node-based `HEALTHCHECK` (Dockerfile ~:50-51): `node -e "require('http').get('http://localhost:'+(process.env.PORT||5000)+'/api/health', r => process.exit(r.statusCode===200?0:1))"`.

**Gaps in Dockerfile:**
1. Container RUNS AS ROOT — no user created, no `USER` directive.
2. `migrations/` is NOT copied. `server/index.ts:53` `runMigrations()` searches `./migrations`, `__dirname/migrations`, `__dirname/../migrations`, `cwd/migrations` (lines 61-64). In the production image `dist/index.js` is the entrypoint and `cwd` is `/app`, so NONE of these paths resolve to the real SQL files — migrations are absent, and on a fresh DB the server throws `Migrations folder not found and database schema is missing` (index.ts:106) and exits. `migrations/` contains real files (`0000_dry_kingpin.sql` .. `0028_add_research_discovery_sub_subcategory.sql`).

**`docker-compose.yml`** (`version: '3.8'`):
- `postgres` service: `postgres:16-alpine`, container `awesome-list-db`, healthcheck `pg_isready -U postgres`, named volume `postgres_data`, host port `5432:5432`, `restart: unless-stopped`. KEEP healthcheck + volume.
- `app` service: builds target `production`, container `awesome-list-app`, `depends_on: postgres: condition: service_healthy`, `restart: unless-stopped`.

**Gaps in compose:**
1. App maps `5000:5000` — host `:5000` collides with macOS AirPlay Receiver. Must move host side to `5001`.
2. App has NO compose-level healthcheck (the Dockerfile one still applies; do not duplicate unless you want shorter intervals).
3. Secrets hardcoded inline: `POSTGRES_PASSWORD: postgres`, `DATABASE_URL: postgresql://postgres:postgres@postgres:5432/awesome_list`. No `SESSION_SECRET` is passed — and after section-01 `server/session.ts` reads `SESSION_SECRET` with a non-null assertion, so an unset value crashes the app at startup. No `ADMIN_EMAIL` / `ADMIN_PASSWORD` passed either.

**`server/index.ts`** server boot (~:186): `server.listen(listenOptions, ...)` with `.on('error', ...)` chained. No SIGTERM/SIGINT handler — `docker compose down` / orchestrator stop sends SIGTERM, container is hard-killed after the grace period, DB pool never drained. `server/db/index.ts:23` exports `pool`.

**`.dockerignore`** already excludes `node_modules/`, `dist/`, `.git/`, `.env` (+ `.env.*`), `coverage/`, `logs/`, `attached_assets/`. Does NOT exclude `e2e-evidence/` or `_planning/` / `planning/` — these would bloat the build context.

## Requirements

- `docker compose up --build` succeeds; both `postgres` and `app` reach `healthy`, no crash loop.
- App container runs as a NON-ROOT user (`nodejs`, uid 1001).
- `migrations/` is present inside the image at a path `runMigrations()` finds; migrations apply on a fresh DB.
- App reachable on HOST port `5001` (container stays `5000`).
- `SESSION_SECRET` is provided (REQUIRED); DB creds + admin seed come from env, not hardcoded inline.
- Graceful shutdown: SIGTERM/SIGINT closes the HTTP server and calls `pool.end()`.

## Dependencies

- Requires **section-01** (auth/session work; `SESSION_SECRET` is now a hard dependency in `server/session.ts`).
- Blocks **section-03**.

## Implementation steps

1. **Dockerfile — non-root user + copy migrations.** In the `production` stage, BEFORE the `COPY --from=builder` lines, create the user:
   ```dockerfile
   RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
   ```
   Change every artifact copy to chown to that user and ADD a copy of `migrations/`:
   ```dockerfile
   COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
   COPY --from=builder --chown=nodejs:nodejs /app/server ./server
   COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared
   COPY --from=builder --chown=nodejs:nodejs /app/migrations ./migrations
   COPY --from=builder --chown=nodejs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
   COPY --from=builder --chown=nodejs:nodejs /app/tsconfig.json ./tsconfig.json
   ```
   `./migrations` resolves to `/app/migrations`, matching the `cwd/migrations` (`process.cwd()` is `/app`) branch of `runMigrations()`. If any writable runtime dir is needed, pre-create it and `chown` it before dropping privileges. Add `USER nodejs` immediately before `CMD`. Keep the existing `HEALTHCHECK` line unchanged — it works as the non-root user (no privileged port, `/api/health` is plain HTTP). Do NOT remove `EXPOSE 5000` / `ENV NODE_ENV=production`.

2. **Healthcheck — reconcile, do not duplicate.** The Dockerfile `HEALTHCHECK` already drives container health, which is what compose `service_healthy` reads. Only add a compose-level `healthcheck:` on the `app` service if you specifically want shorter intervals than the Dockerfile's 30s — and if so, reuse the SAME probe (`node -e "require('http').get(... /api/health ...)"`), do not invent a second one. Any downstream service that must wait on the app uses `depends_on: app: condition: service_healthy`.

3. **docker-compose.yml — ports + secrets.** Change the `app` `ports` to `"5001:5000"` (host 5001 dodges AirPlay; container listens on 5000 via `PORT`). Move secrets out of inline literals: add `env_file: .env` to BOTH services (or reference host env, e.g. `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}`), and pass through `SESSION_SECRET` (REQUIRED), `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Local-dev placeholder values may remain in `.env` only — never commit real secrets. Keep `NODE_ENV: production` and `PORT: 5000` on the app, the postgres `healthcheck`, and the `postgres_data` named volume.

4. **server/index.ts — graceful shutdown.** Near the `server.listen(...)` block (~:186), register handlers that close the HTTP server then drain the pool. Import `pool` from `./db` (exported at `server/db/index.ts:23`). Pattern:
   ```ts
   const shutdown = (signal: string) => {
     log(`received ${signal}, shutting down`);
     server.close(() => {
       pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
     });
     setTimeout(() => process.exit(1), 10000).unref();
   };
   process.on('SIGTERM', () => shutdown('SIGTERM'));
   process.on('SIGINT', () => shutdown('SIGINT'));
   ```
   Place after `server` is assigned so `server.close` is valid. Keep the existing `.on('error', ...)` handler.

5. **.dockerignore — confirm + tighten.** Verify `node_modules/`, `dist/`, `.git/`, `.env` (and `.env.*`) are excluded (they are). ADD lines for build-context bloat that is not yet covered: `e2e-evidence/`, `_planning/`, `planning/`. Re-confirm `.env` stays ignored so secrets never enter the build context.

## Validation gate VG-2 (BLOCKING)

**Prerequisites:** section-01 PASS. `.env` contains `DATABASE_URL` (compose-internal host `postgres`), `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

**Capture (run from repo root, real system — no mocks):**
```bash
mkdir -p e2e-evidence/phase2 && cd e2e-evidence/phase2
docker compose -f ../../docker-compose.yml up --build -d | tee up.txt
sleep 45
docker compose -f ../../docker-compose.yml ps | tee ps.txt
docker exec awesome-list-app whoami | tee whoami.txt
curl -s localhost:5001/api/health | tee health.json
docker exec awesome-list-app sh -c 'ls -la /app/migrations | head' | tee migrations-present.txt
```

**Pass criteria:**
- `ps.txt` shows BOTH `awesome-list-db` (postgres) and `awesome-list-app` up and `(healthy)` — no `Restarting` / crash loop.
- `whoami.txt` == `nodejs` (NOT `root`).
- `health.json` returns an OK payload from `localhost:5001` (host 5001 reaches container 5000).
- `migrations-present.txt` lists `.sql` files (e.g. `0000_dry_kingpin.sql`).

**Mock guard:** Do NOT make the app "healthy" by deleting or weakening the `HEALTHCHECK`, by removing `depends_on` conditions, or by hardcoding a 200 `/api/health` stub. If the app is unhealthy, find and fix the root cause (missing `SESSION_SECRET`, migrations not found, wrong port, root-user permission error) — then re-capture. A PASS verdict must cite the evidence files above by path.

## Acceptance criteria

- [ ] `docker compose up --build` brings up postgres + app; both reach `healthy`.
- [ ] `docker exec awesome-list-app whoami` returns `nodejs` (non-root).
- [ ] `/app/migrations` inside the image contains the `.sql` files and migrations apply on a fresh DB.
- [ ] App responds on host port `5001`; no `:5000` AirPlay collision.
- [ ] `SESSION_SECRET` and DB/admin creds are supplied via env_file / host env, not hardcoded.
- [ ] SIGTERM/SIGINT closes the HTTP server and calls `pool.end()` before exit.
- [ ] `.dockerignore` excludes `node_modules`, `dist`, `.git`, `.env`, `e2e-evidence`, `_planning`/`planning`.
- [ ] VG-2 captured with passing evidence under `e2e-evidence/phase2/`.

## Files to create/modify

- **Modify** `Dockerfile` — non-root `nodejs` user, `--chown` copies, copy `migrations/`, `USER nodejs` before `CMD`; keep existing `HEALTHCHECK`.
- **Modify** `docker-compose.yml` — app `ports: "5001:5000"`; `env_file: .env` + pass `SESSION_SECRET`/`DATABASE_URL`/`ADMIN_*`; keep postgres healthcheck + named volume.
- **Modify** `server/index.ts` (~:186) — SIGTERM/SIGINT graceful shutdown closing `server` and calling `pool.end()`.
- **Modify (verify)** `.dockerignore` — confirm secret/artifact excludes; add `e2e-evidence/`, `_planning/`, `planning/`.

---

# SECTION 03 — Re-baseline Migrations + Idempotent Seed

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
  <execute>Fresh up; wait for migrate + seed to COMPLETE (do NOT trust the healthcheck; seed
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
    api_keys ALL exist; proves the re-baseline fixed the chain);
    cat-count.txt == 9; res-total.txt ~ 1949-1953;
    res-total-after-restart.txt EQUALS res-total.txt (no dupes, data persisted across restart).
  </pass_criteria>
  <review>cat up.txt for SQL errors; cat missing-tables-check.txt (the whole point is these
    tables now exist); compare the two res-total files for exact equality.</review>
  <verdict>PASS -> section-04 + section-05 | FAIL -> fix migrations/seed -> docker compose down -v -> re-run from prerequisites</verdict>
  <mock_guard>Do NOT hand-insert rows to make counts pass; the seed pipeline must produce them.
    Do NOT trust the healthcheck for seed completion (seed runs async AFTER listen); poll the log.</mock_guard>
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

---

# SECTION 04 — Production Deploy Config (Railway + DigitalOcean)

## Background

The repo already ships two deploy configs, both partly wrong for a long-lived Express + SSR container:

- `railway.json`: `build.builder = "DOCKERFILE"` (correct), `deploy.healthcheckPath = "/health"`, `restartPolicyType = "ON_FAILURE"`, `restartPolicyMaxRetries = 10`, `startCommand = "node dist/index.js"`.
- `vercel.json`: `@vercel/node` serverless function wrapping `dist/index.js` with `maxDuration: 10`.

The app serves its health endpoint at **`/api/health`** (`server/routes.ts:3769`), **not** `/health`. So `railway.json`'s healthcheck path is a **MISMATCH** — Railway would poll a route that 404s and mark every deploy unhealthy. `vercel.json` also routes a dead `/health`.

Decision **D2** = config-only, **NO LIVE DEPLOY** this phase. Decision **D3** = author BOTH Railway + DigitalOcean App Platform shapes, then **delete `vercel.json`** (a 10s-maxDuration serverless function is a dead end for a persistent Express + SSR server that holds DB connections and serves SSR'd HTML).

Research scoring: Railway **8.9** (config already present, runtime-env secret injection, ~$10-20/mo) > DO App Platform **7.9** (managed Postgres with automated backups + point-in-time recovery). Both are authored so the operator can pick at deploy time.

## Requirements

- `railway.json` `deploy.healthcheckPath` fixed to `/api/health`; `build.builder` stays `DOCKERFILE`.
- `.do/app.yaml` authored and schema-valid (App Platform spec).
- `vercel.json` deleted.
- No secret VALUES committed anywhere; all secrets externalized to platform runtime config.
- Monitoring (health endpoints, log streams, restart policy) documented in `docs/DEPLOYMENT.md`.

## Dependencies

- **Requires section-03 PASS** — section-03 proves `/api/health` responds and the container the configs point at actually boots and serves. Pointing deploy configs at an unverified app is wasted work.
- **Blocks: nothing.** Terminal phase alongside section-05; the two can run in parallel.

## Implementation steps

1. **Railway** — edit `railway.json`: set `deploy.healthcheckPath` to `"/api/health"`. Confirm `build.builder` is still `"DOCKERFILE"` and `build.dockerfilePath` is `"Dockerfile"`. Leave `restartPolicyType`/`restartPolicyMaxRetries`/`startCommand` untouched. Document in `docs/DEPLOYMENT.md`: Railway's managed Postgres add-on auto-injects `DATABASE_URL` at runtime; the remaining secrets (`SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`) are set as **Railway variables** — runtime env, never baked into the image.

2. **DigitalOcean** — author `.do/app.yaml` (App Platform spec). One `service` built from the `Dockerfile` (`dockerfile_path: Dockerfile`); `http_port: 5000`; `health_check.http_path: /api/health`. All secrets declared as env entries with `type: SECRET` (`SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`); `NODE_ENV: production` as a plain RUN_AND_BUILD_TIME var. Provision Postgres via a `databases:` block (DO Managed Postgres) which injects `DATABASE_URL`, OR document an external `DATABASE_URL` set as a SECRET. Document DO Managed Postgres **automated daily backups + point-in-time recovery (PITR)** as the differentiator vs Railway.

3. **Delete `vercel.json`.** Persistent Express + SSR container does not fit a 10s serverless function; keeping it invites a broken deploy target.

4. **Monitoring** — in `docs/DEPLOYMENT.md`, document: health-check endpoint is `/api/health` on both platforms; logs go to each platform's log stream (Railway deploy/runtime logs, DO App Platform runtime logs / `doctl apps logs`); restart policy is already encoded in `railway.json` (`ON_FAILURE`, max 10 retries) and DO App Platform auto-restarts unhealthy containers by default.

5. **Secrets doc** — update `docs/DEPLOYMENT.md` with a table of every env var, marking which are SECRET (`SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`, `DATABASE_URL`) vs non-secret (`NODE_ENV`, `PORT`), and state explicitly that **none are baked into the image** — all injected at runtime by the platform.

## Validation gate VG-4 (blocking)

**Prerequisites:** section-03 PASS.

**Capture** (run from repo root; write evidence under `e2e-evidence/phase4/`):

```bash
mkdir -p e2e-evidence/phase4 && cd e2e-evidence/phase4

# railway.json shape
jq -e '.deploy.healthcheckPath=="/api/health" and .build.builder=="DOCKERFILE"' \
  ../../railway.json | tee railway-check.txt

# DO spec validity: prefer doctl, fall back to YAML parse
if command -v doctl >/dev/null 2>&1; then
  doctl apps spec validate ../../.do/app.yaml 2>&1 | tee do-spec-check.txt
else
  python3 -c "import yaml,sys; yaml.safe_load(open('../../.do/app.yaml')); print('yaml-ok')" \
    2>&1 | tee do-spec-check.txt
fi

# vercel.json must be gone
ls ../../vercel.json 2>&1 | tee vercel-removed.txt

# no non-/api "/health" route refs remain (docs + evidence excluded)
rg '"/health"' ../.. --glob '!*.md' --glob '!e2e-evidence/**' \
  2>&1 | tee health-path-refs.txt || echo "(no matches)" | tee health-path-refs.txt

# no committed secret VALUES (scan tracked files for assigned secret-looking values)
git -C ../.. grep -nE '(SESSION_SECRET|ADMIN_PASSWORD|GITHUB_TOKEN|ANTHROPIC_API_KEY|DATABASE_URL)\s*[:=]\s*["'\'']?[A-Za-z0-9_./+-]{12,}' \
  -- ':!*.md' ':!.do/app.yaml' ':!railway.json' \
  2>&1 | tee committed-secrets.txt || echo "(none)" | tee committed-secrets.txt
```

**Pass criteria:**
- `railway-check.txt` == `true` (jq exit 0).
- `do-spec-check.txt` shows `yaml-ok` OR doctl reports the spec valid.
- `vercel-removed.txt` contains `No such file` (deletion confirmed).
- `health-path-refs.txt` has no non-`/api` `/health` route references (the placeholder route is gone).
- `committed-secrets.txt` empty / `(none)` — no secret values in tracked files.

**Mock guard:** `doctl` may be absent on the runner. The accepted fallback is `python3 yaml.safe_load` + the documented DO field checklist (service from Dockerfile, `http_port: 5000`, `health_check.http_path: /api/health`, all secrets `type: SECRET`). Capture whichever validator **actually ran** into `do-spec-check.txt`. Do **NOT** fabricate a `doctl`-valid verdict when doctl never executed — a YAML-only PASS must say so in the evidence file.

## Acceptance criteria

- [ ] `railway.json` `deploy.healthcheckPath == "/api/health"` and `build.builder == "DOCKERFILE"`.
- [ ] `.do/app.yaml` exists, parses, declares service-from-Dockerfile, `http_port: 5000`, `health_check.http_path: /api/health`, secrets as `type: SECRET`.
- [ ] DO Managed Postgres backups + PITR documented (or external `DATABASE_URL` path documented).
- [ ] `vercel.json` deleted.
- [ ] No `/health` (non-`/api`) route references remain outside docs.
- [ ] No secret VALUES committed; secrets externalized to platform runtime + documented in `docs/DEPLOYMENT.md`.
- [ ] Monitoring (health endpoints, log streams, restart policy) documented.
- [ ] VG-4 evidence captured under `e2e-evidence/phase4/`.

## Files to create / modify / delete

- **Create:** `.do/app.yaml`
- **Modify:** `railway.json` (healthcheckPath), `docs/DEPLOYMENT.md` (secrets table + monitoring + DO/Railway provisioning notes)
- **Delete:** `vercel.json`

---

# SECTION 05 — Exhaustive Browser-Driven Functional Audit + Remediation Loop

Drive a REAL browser against the live seeded Dockerized app at `http://localhost:5001` until every screen and every admin tab passes at every breakpoint, then loop on remediation until zero defects remain.

## Background

Precondition: **section-03 PASS** — the Dockerized stack is up on host `:5001`, migrations applied, seed verified (admin user + categories + resources + journeys present in the DB). If the app is not seeded and reachable, this phase cannot start.

The audit drives a real browser via the **Chrome DevTools MCP** harness. Tools used: `mcp__chrome-devtools__navigate_page`, `resize_page`, `take_snapshot`, `take_screenshot`, `list_console_messages`, `list_network_requests`, `evaluate_script`, `click`, `fill`, `wait_for`. Every "works" claim requires OBSERVED evidence — captured console output, captured network requests, and a screenshot — not code reading.

Decision **D7** = Chrome DevTools MCP is the PRIMARY audit harness; the existing Playwright suite is CI codification only (run after the MCP pass converges, never as the source of truth for this phase).

Breakpoints (px width): **320, 375, 768, 1024, 1280, 1440, 1920**.

## Requirements

Every screen (17) plus every admin tab (14) is exercised at every breakpoint (7) and passes:

- **Zero console errors** (including no React hydration-mismatch errors).
- **Zero failed network requests** — no response with status `>= 400`.
- **Correct rendered data** — rendered counts equal the DB baseline (captured from the API).
- **All interactive controls exercised** — every button, link, select, popover, dialog, tab, and form actually actuated and its result asserted.
- **Auth flows + CRUD persist** — register, login, session persistence, protected-route access, logout; at least one CRUD write persists and survives a `docker compose restart`.
- **Responsive integrity** — no horizontal overflow or clipping (`scrollWidth <= clientWidth + 1`), no off-viewport or zero-size interactive controls; mobile nav (drawer) works at narrow widths.

Exit state: audit matrix is 100% PASS (or FIXED then re-verified PASS) and the defect changelog has zero OPEN entries.

## Dependencies

- **Requires section-03 PASS.** Without a seeded, reachable container the audit has nothing real to drive.
- **Blocks: nothing** — terminal phase (runs in parallel with section-04).

## Audit inventory

| # | Screen | Route | Key controls | Data assertion | Auth |
|---|--------|-------|--------------|----------------|------|
| 1 | Home | `/` | sort select, category cards, tag-filter popover (mounts only if tags exist), clear-filters | card count == # categories with displayCount>0 (~9); each `badge-count-<slug>` == `/api/categories` resourceCount; subhead total == `/api/resources?limit=1` `.total` | no |
| 2 | Login | `/login` | email/pw, submit (OAuth buttons removed in section-01) | valid admin -> `/admin`; wrong creds rejected | gate |
| 3 | Register | `/register` | form + submit | new `role=user` row created | no |
| 4 | Category | `/category/:slug` | search, subcategory filter, sort, view-mode toggle, resource cards, suggest-edit (gated) | `text-results-count` Y == DB count for category == sidebar badge | no |
| 5 | Subcategory | `/subcategory/:slug` | cards, back | `h1` == name; badge == count | no |
| 6 | SubSubcategory | `/sub-subcategory/:slug` | cards, back | `h1` == name; badge == count | no |
| 7 | ResourceDetail | `/resource/:id` | visit, share, suggest-edit (gated), related, favorite/bookmark (authed) | title/url match; related from `/api/resources/:id/related` | partial |
| 8 | About | `/about` | static cards, nav | renders | no |
| 9 | Advanced | `/advanced` | 4 tabs Explorer/Metrics/Export/AI (USE FULL POINTER-EVENT SEQUENCE — FP-01: bare `.click()` is dead on Export+AI tabs), search, export CTA | export CTA "Export {N}" == total | no |
| 10 | SubmitResource | `/submit` | unauth gate; authed form (title/url/desc/category/tags) | authed submit -> `POST /api/resources` pending; category opts == DB | form gated |
| 11 | Journeys | `/journeys` | journey cards, category select, view-journey | card count == published journeys | no |
| 12 | JourneyDetail | `/journey/:id` | start (authed), steps, complete-step | steps render (verify FP-02 `/journey/6` 0-steps fixed) | partial |
| 13 | Profile | `/profile` | account form, change-password | `/api/auth/user` 200 | AuthGuard |
| 14 | Bookmarks | `/bookmarks` | saved cards, remove | `/api/bookmarks` | AuthGuard |
| 15 | Admin | `/admin` | 14 tabs (approvals, edits, enrichment, researcher, export, database, resources, categories, subcategories, subsubcategories, journeys, users, github, linkhealth, audit) | `/api/admin/stats` cards | AdminGuard |
| 16 | ThemeSettings | `/settings/theme` | font picker (works), color picker (verify M-02 blank + no-op fixed) | swatches render, selection applies | no |
| 17 | 404 | `*` | home link, browse CTA | title "404 - Page Not Found" | no |

**Persistent chrome (every screen):** header (mobile-drawer-trigger, search dialog via `/` and `Cmd/Ctrl+K`, theme link, login/avatar dropdown), sidebar (brand count, nav, CATEGORIES accordion with DB badges, About), search dialog (Fuse.js). Plus the **14 admin tabs**, each individually exercised.

## Per-breakpoint procedure

For each screen at each breakpoint BP:

1. `resize_page(width=BP, height=900)`.
2. `navigate_page(url)`.
3. `wait_for(text=<known post-hydration string for that screen>)` — NOT networkidle alone. SSR hydration races networkidle; capture any hydration-mismatch console errors as defects.
4. `list_console_messages(types:["error"])` -> assert empty.
5. `list_network_requests` then FILTER `status >= 400` YOURSELF (MCP has NO status filter) -> assert none.
6. `evaluate_script` overflow + clipping probe (snippet below) -> assert pass.
7. `take_snapshot` (a11y tree + UIDs) and `take_screenshot(filePath="e2e-evidence/audit/<screen>-<bp>.png")`.
8. Exercise every control via snapshot UIDs and assert each result. For `/advanced` tabs use the full pointer-event dispatch (FP-01), not a bare click.
9. Auth flow (run once per breakpoint where chrome auth controls appear): register -> login -> session persists across navigation -> protected route reachable -> logout.

Overflow + clipping probe (inline):

```js
() => {
  const de = document.documentElement;
  const overflow = de.scrollWidth - de.clientWidth;
  const vw = window.innerWidth, vh = window.innerHeight;
  const bad = [];
  for (const el of document.querySelectorAll('button, a, input, select, [role="button"], [role="tab"]')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) { bad.push({ why: 'zero-size', tag: el.tagName, txt: (el.textContent||'').trim().slice(0,40) }); continue; }
    if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) { bad.push({ why: 'off-viewport', tag: el.tagName, txt: (el.textContent||'').trim().slice(0,40) }); }
  }
  return { overflow, overflowPass: overflow <= 1, scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, badControls: bad, pass: overflow <= 1 && bad.length === 0 };
}
```

**Harness note (I6 — Playwright codification only):** if codifying the converged pass into the existing Playwright suite, override `baseURL` -> `http://localhost:5001` and DISABLE the `webServer` block (`playwright.config.ts:31` baseURL + `:77` webServer `npm run dev`). Otherwise Playwright boots a SEPARATE `:5000` dev stack and tests the wrong app. The MCP pass against `:5001` is primary; Playwright is downstream CI only.

## Remediation loop

```
while defects_found:
    record defect (screen, bp, control, expected vs actual, console/network evidence) in defects.md
    diagnose root cause -> classify: frontend | API | data/seed | container/config
    fix the REAL system (source files only — no speculative changes)
    rebuild/redeploy affected container(s)
    re-verify the affected screen x breakpoint
    run whole-app smoke pass (all screens, one mid breakpoint, key flows)
exit only when defects_found == 0 across ALL screens AND ALL breakpoints
```

Known defects to confirm FIXED or fix:

- **M-02** — theme color picker blank + no-op. Field-shape mismatch across `ThemeSettings.tsx` <-> `shadcn-themes.ts` <-> `theme-provider.tsx`. Selecting an accent swatch must render swatches and apply.
- **FP-01** — `/advanced` Export + AI tabs dead under bare `.click()`. Use full pointer-event dispatch to actuate.
- **FP-02** — `/journey/6` renders zero steps. Seed fix (journey 6 has no steps in the DB).
- **FP-03** — Home tag-filter popover never mounts. Confirm tags exist in seed and popover mounts.
- **FX-04** — Login shows no error toast on wrong creds. Confirm rejection surfaces a visible error.
- **FP-05** — sidebar active-pill never lights for the current route. Confirm active state renders.

## Validation gate VG-5 (blocking)

**prerequisites:** section-03 PASS; count baseline captured from `/api/categories`, `/api/resources?limit=1`, `/api/subcategories`, `/api/sub-subcategories`, `/api/journeys`.

**capture:**
- `e2e-evidence/audit/matrix.md` — rows = screens + admin tabs, cols = 7 breakpoints, cell = PASS / FIXED / FAIL.
- `e2e-evidence/audit/defects.md` — `DEFECT-NN` entries (screen, bp, control, expected vs actual, evidence paths, status OPEN/FIXED).
- Per cell: `<screen>-<bp>.png` + `console-errors.txt` + `failed-requests.txt` (the `>= 400` set).

**pass_criteria:**
- Every matrix cell PASS (or FIXED then re-verified PASS).
- `defects.md` has zero OPEN entries.
- Every cell: console-errors empty (incl. no hydration-mismatch) + failed-requests empty + overflow probe `scrollWidth <= clientWidth + 1` + rendered counts == DB baseline.
- Auth register/login/session/logout works AND at least one CRUD write persists and survives `docker compose restart`.
- M-02 / FP-01 / FP-02 confirmed FIXED with screenshot evidence.

**review:**
- OPEN the screenshots with the Read tool and confirm CONTENT (correct screen, correct data), not just file existence.
- Read `matrix.md` and `defects.md` end to end.
- A skeptical reviewer would agree zero cells are FAIL and zero defects are OPEN.

**mock_guard:** do NOT mark any cell PASS from code-reading or assumption. Every PASS requires a real browser screenshot + captured console + captured network for that EXACT screen x breakpoint.

## Acceptance criteria

- [ ] Count baseline captured from all 5 API endpoints before auditing.
- [ ] All 17 screens audited at all 7 breakpoints; cells recorded in `matrix.md`.
- [ ] All 14 admin tabs audited at all 7 breakpoints.
- [ ] Persistent chrome (header, sidebar accordion, search dialog) exercised per breakpoint.
- [ ] Every cell: zero console errors (no hydration-mismatch) + zero `>= 400` network responses + overflow probe pass.
- [ ] Rendered counts == DB baseline on every data screen.
- [ ] Auth register/login/session/logout verified; one CRUD write persists across `docker compose restart`.
- [ ] M-02, FP-01, FP-02, FP-03, FX-04, FP-05 each confirmed FIXED (or fixed) with screenshot evidence.
- [ ] `matrix.md` 100% PASS/FIXED; `defects.md` zero OPEN.
- [ ] Screenshots opened (Read) and content-confirmed.

## Files to create / modify

- **Create (evidence):** `e2e-evidence/audit/matrix.md`, `e2e-evidence/audit/defects.md`, per-cell `e2e-evidence/audit/<screen>-<bp>.png` + `console-errors.txt` + `failed-requests.txt`.
- **Modify (source only as remediation requires):** frontend components, API/server handlers, seed/data, or container/compose config — driven strictly by recorded defects. No speculative edits.
- **Optionally (CI codification only):** `playwright.config.ts` — `baseURL` -> `http://localhost:5001` and disable the `webServer` block — applied AFTER the MCP pass converges.

---

## Completion signal

When ALL six gates VG-0, VG-1, VG-2, VG-3, VG-4, and VG-5 have PASSed with real captured evidence under `e2e-evidence/`, output exactly:

<promise>ALL-SECTIONS-COMPLETE</promise>
