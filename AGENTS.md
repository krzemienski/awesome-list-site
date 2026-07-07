# AGENTS.md

## Cursor Cloud specific instructions

This is a single full-stack app ("Awesome Video Resource Viewer", package name `rest-express`):
Express + Vite/React (one process) backed by PostgreSQL via Drizzle ORM. The Express
server also serves the frontend, so there is only **one app service** plus a **database**.

Standard commands live in `package.json` scripts and are documented in `README.md`,
`DEVELOPMENT.md`, and `docs/SETUP.md` / `docs/ENVIRONMENT_VARIABLES.md`. Only the
non-obvious, environment-specific caveats are captured here.

### Package manager
- Use **npm** (there is a `package-lock.json`; the `pnpm-lock.yaml` in the repo is stale — ignore it).
- The committed lockfile originally pointed 41 `resolved` URLs at a dead Replit-internal
  registry (`package-firewall.replit.local`); these have been rewritten to
  `registry.npmjs.org`. If you ever regenerate the lockfile, do not reintroduce that host.

### PostgreSQL (must be running before the app or tests)
- Postgres 16 is installed locally (not Docker). It does **not** auto-start on a fresh VM boot.
  Start it each session with: `sudo pg_ctlcluster 16 main start`
- Connection (already in `.env`): `postgresql://postgres:postgres@127.0.0.1:5432/awesome_list`
  (role `postgres`, password `postgres`, database `awesome_list`).
- `.env` is git-ignored and persists in the VM snapshot (contains `DATABASE_URL` and a
  generated `SESSION_SECRET`). If it is ever missing, recreate it with those two vars plus
  `NODE_ENV=development` and `PORT=5000`.

### Running the app
- `npm run dev` → http://localhost:5000 (API + frontend via Vite middleware, HMR enabled).
- On first startup against an empty DB the server **auto-seeds** ~1,900+ resources /
  9 categories from the upstream awesome-video list (takes ~20s; watch the startup logs).
  Migrations only run automatically in `NODE_ENV=production`; in dev the schema is applied
  via `npm run db:push`.

### Auth / admin
- Local email/password auth is used (Replit OAuth is disabled off-Replit).
- No admin user is seeded unless `ADMIN_PASSWORD` is set before the first seed. To get one:
  set `ADMIN_PASSWORD` and reseed, OR register any user (UI "Create account" or
  `POST /api/auth/register`) and promote it via SQL: `UPDATE users SET role='admin' WHERE email='...';`
- `scripts/reset-admin-password.ts` only *updates* an existing `admin@example.com`; it does not create one.

### Lint / build / test status (baseline on `main`)
- `npm run build` — passes. `npm run type-check` (`tsc --noEmit`) — passes.
- `npm run lint` — currently reports many **pre-existing** errors (unrelated to env setup); it runs fine.
- `npm run test:e2e` — Playwright; the Chromium binary is installed and the config reuses the
  running dev server on :5000. Works (e.g. `tests/e2e/favorites.spec.ts` is green).
- `npm run test:unit` / `npm run test:integration` — currently **fail to start**: `vitest` is
  referenced by the scripts but is **not declared** in `package.json` (pre-existing gap).
  The vitest harness would auto-provision an `awesome_list_test` database from the `postgres`
  maintenance DB if vitest were installed.
