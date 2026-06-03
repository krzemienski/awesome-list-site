# Section 02 — Phase 2: Containerize & Harden

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
