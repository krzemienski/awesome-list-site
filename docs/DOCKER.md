# Docker Deployment Guide

This is the single home for running the Awesome List Site with Docker and Docker
Compose — for local development, self-hosting, and building images for container
platforms (Railway, Cloud Run, ECS, etc.). It also covers **verifying** a Docker
run and **verifying a build without the Replit environment**.

> Docker cannot be executed inside Replit itself. Run these commands on your own
> machine or CI. Every command and file reference below has been checked against
> the real `Dockerfile`, `docker-compose.yml`, and server code in this repo.

## Table of Contents

- [Prerequisites](#prerequisites)
- [How the image is built](#how-the-image-is-built)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Runnable local recipe](#runnable-local-recipe)
- [Docker Commands](#docker-commands)
- [Volume Management](#volume-management)
- [Accessing Logs](#accessing-logs)
- [Verifying a Docker run](#verifying-a-docker-run)
- [Verifying a build without Replit](#verifying-a-build-without-replit)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

## Prerequisites

- **Docker**: Version 20.10 or higher
  - [Install Docker Desktop](https://docs.docker.com/get-docker/) (macOS/Windows)
  - [Install Docker Engine](https://docs.docker.com/engine/install/) (Linux)
- **Docker Compose**: v2 (included with Docker Desktop; the `docker compose`
  subcommand). The legacy `docker-compose` v1 binary also works.
- **Git**: For cloning the repository

Verify your installation:

```bash
docker --version
docker compose version
```

## How the image is built

The `Dockerfile` is a two-stage build that mirrors the real `npm run build`:

- **Node 20** (`node:20-alpine`) in both stages — matches the project's target runtime.
- **Builder stage**: `npm ci`, copy source, `npm run build`. That command runs
  `vite build` (frontend → `dist/public/`) followed by `esbuild server/index.ts`
  (server bundle → `dist/index.js`).
- **Production stage**: `npm ci --omit=dev`, then copies `dist/`, plus `server/`,
  `shared/`, `migrations/`, `drizzle.config.ts`, and `tsconfig.json`.
  - `migrations/` is required: in production the server runs a **boot-time
    migrator** (`server/migrate.ts`) before it starts listening.
  - `drizzle.config.ts` + `tsconfig.json` let you run `npm run db:push` inside the
    container if you ever need to.
- `ENV NODE_ENV=production`, `EXPOSE 5000`, and a `HEALTHCHECK` that polls
  `http://localhost:$PORT/api/health`.
- `CMD ["node", "dist/index.js"]`.

The container **listens on port 5000** by default; override with the `PORT`
environment variable.

> The image runs as `root` by default. To harden a production image, add a
> `USER node` line before `CMD` (the `node` user exists in the base image) or run
> the container with `--user`. See [Production Deployment](#production-deployment).

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd awesome-list-site
   ```

2. **Set the required secrets.** `docker-compose.yml` ships with sane defaults for
   `DATABASE_URL`, `NODE_ENV`, and `PORT`, and reads `SESSION_SECRET` /
   `ADMIN_PASSWORD` from your shell or a `.env` file (see
   [Environment Variables](#environment-variables)). Create a `.env` next to
   `docker-compose.yml`:
   ```env
   SESSION_SECRET=replace-with-openssl-rand-base64-32
   ADMIN_PASSWORD=choose-a-strong-admin-password
   ```

3. **Start the application**:
   ```bash
   docker compose up -d
   ```

The app is available at `http://localhost:5000` once the containers are healthy
(typically 30–60 seconds). Verify:

```bash
curl http://localhost:5000/api/health
# -> {"status":"ok"}
```

## Environment Variables

`docker-compose.yml` sets the always-needed values and forwards two secrets from
your environment / `.env` file:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Compose wires the app to its `postgres` service automatically. |
| `NODE_ENV` | Yes | Set to `production` — this is what enables the boot migrator. |
| `PORT` | No | Listen port (default `5000`). |
| `SESSION_SECRET` | **Yes** | `express-session` refuses to start without it. Generate with `openssl rand -base64 32`. |
| `ADMIN_PASSWORD` | Recommended | Seeds/rotates the local admin account (`admin@example.com`) on boot. Must be ≥ 8 characters. Omit to skip admin creation. |

Optional feature flags (only needed if you use those features):

```env
# AI enrichment / recommendations (server/ai/*)
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# GitHub import/export (server/github/*)
GITHUB_TOKEN=...
```

The complete, grep-verified list of environment variables lives in
[ENVIRONMENT.md](./ENVIRONMENT.md).

**Security notes**
- **Never commit your `.env`** to version control.
- Use a strong, random `SESSION_SECRET`: `openssl rand -base64 32`.
- Keep API keys secret and rotate them regularly.

## Runnable local recipe

A complete, from-scratch local run with database, migrations, seeding, and admin
login:

```bash
# 1. Provide the two secrets (or put them in a .env file)
export SESSION_SECRET="$(openssl rand -base64 32)"
export ADMIN_PASSWORD="choose-a-strong-admin-password"

# 2. Build and start Postgres + the app
docker compose up -d --build

# 3. Watch the app boot. In production mode the server runs migrations and,
#    if the database is empty, seeds categories/resources and the admin user.
docker compose logs -f app
#   Look for: "Running database migrations..." / "Migrations completed successfully"
#             "🔐 ADMIN USER CREATED" (only on first, empty-DB boot)

# 4. Confirm it is serving
curl http://localhost:5000/api/health          # -> {"status":"ok"}
open http://localhost:5000                      # homepage

# 5. Log in as admin at /login with:
#      email:    admin@example.com
#      password: the ADMIN_PASSWORD you set above
```

Notes:
- **Seeding is automatic** on first boot (both dev and production) *only when the
  database is empty* (no categories and no resources). It never overwrites
  existing data, so restarts preserve your changes.
- If you set `ADMIN_PASSWORD` *after* the DB was already seeded, the app rotates
  the existing admin's password on the next boot — you do not need to reseed.
- To re-run seeding manually against a running container, use the admin API
  (`POST /api/admin/seed-database`) or `docker compose exec app npm run db:push`
  for schema-only sync.

## Docker Commands

### Starting / stopping

```bash
docker compose up -d            # start in the background
docker compose up               # start and stream logs
docker compose down             # stop (keeps the database volume)
docker compose down -v          # stop and DELETE all data
```

### Restarting

```bash
docker compose restart          # all services
docker compose restart app      # just the app
docker compose restart postgres # just the database
```

### Rebuilding after code changes

```bash
docker compose up -d --build           # rebuild changed images and restart
docker compose build --no-cache        # force a clean rebuild
```

### Status

```bash
docker compose ps                                                   # service state
docker stats                                                        # live resource usage
docker inspect --format='{{.State.Health.Status}}' awesome-list-app # health
docker inspect --format='{{.State.Health.Status}}' awesome-list-db
```

## Volume Management

Docker Compose creates one persistent volume, `postgres_data`, holding the
PostgreSQL data files (survives container restarts).

### Backup / restore

```bash
# Backup
docker compose exec postgres pg_dump -U postgres awesome_list > backup.sql

# Restore
docker compose down
docker compose up -d postgres
sleep 5
docker compose exec -T postgres psql -U postgres awesome_list < backup.sql
docker compose up -d
```

### Cleanup

```bash
docker volume ls          # list volumes
docker volume prune       # remove unused volumes
docker compose down -v    # remove THIS project's volume (⚠️ deletes all data)
```

## Accessing Logs

```bash
docker compose logs                 # all services
docker compose logs -f              # follow
docker compose logs app             # one service
docker compose logs -f app          # follow one service
docker compose logs --tail=100 app  # last 100 lines
docker compose logs --since 30m app # last 30 minutes
```

Debug inside the running container:

```bash
docker compose exec app sh
docker compose exec app env
docker compose exec app node -v
```

## Verifying a Docker run

Use these steps to confirm a Docker deployment works end to end. A convenience
script, `scripts/verify-docker-deployment.sh`, exists but predates the current
routes — prefer the manual steps below, which target the real `/api/health`
endpoint.

1. **Clean start**
   ```bash
   docker compose down -v
   docker compose up -d
   ```

2. **Both services running**
   ```bash
   docker compose ps      # postgres and app should show "Up"/"running"
   ```

3. **Database accepting connections**
   ```bash
   docker compose exec postgres pg_isready -U postgres
   # -> /var/run/postgresql:5432 - accepting connections
   ```

4. **Health endpoint** — returns HTTP 200 with `{"status":"ok"}`:
   ```bash
   curl -i http://localhost:5000/api/health
   ```
   > The endpoint reports process liveness only; it does not include database or
   > version fields.

5. **Migrations recorded** — Drizzle keeps its journal in the `drizzle` schema:
   ```bash
   docker compose logs app | grep -i migration
   docker compose exec postgres psql -U postgres -d awesome_list \
     -c "\dt drizzle.__drizzle_migrations"
   ```

6. **Frontend loads**
   ```bash
   curl -s http://localhost:5000 | grep -o "<title>.*</title>"
   ```

7. **API responds**
   ```bash
   curl -s http://localhost:5000/api/resources | head -c 200
   ```

8. **Cleanup**
   ```bash
   docker compose down      # keep data
   docker compose down -v   # wipe data
   ```

**Success criteria**

- `docker compose up -d` starts both services and they report healthy.
- `GET /api/health` returns `200` with `{"status":"ok"}`.
- The frontend is reachable at `http://localhost:5000`.
- `drizzle.__drizzle_migrations` exists and the app log shows no error stack traces.

## Verifying a build without Replit

The build and server run **without** the `REPL_ID` environment variable — the
Replit-only Vite plugins are `optionalDependencies`, dynamically imported in
`vite.config.ts` only when `REPL_ID` is defined, and Replit OAuth is skipped in
`server/routes.ts` when `REPL_ID` is absent (local username/password auth is
always set up). This is exactly the code path Docker uses.

To verify a clean, non-Replit build on any machine (script equivalent:
`scripts/verify-non-replit-build.sh`):

```bash
# 1. Ensure REPL_ID is not set and start from a clean tree
unset REPL_ID
rm -rf dist/

# 2. Build
npm run build

# 3. Confirm artifacts
ls dist/index.js dist/public/index.html   # both must exist

# 4. Run in production mode against a Postgres database
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export SESSION_SECRET="$(openssl rand -base64 32)"
NODE_ENV=production npm run start

# 5. In another shell
curl http://localhost:5000/api/health      # -> {"status":"ok"}
curl -s http://localhost:5000/ | head -c 40 # HTML (<!doctype html> ...)
```

**Expected:** `npm run build` completes with no "Cannot find module
'@replit/…'" errors, `dist/index.js` + `dist/public/` are produced, the server
starts and serves `/api/health` and the SPA, and the login page offers local
auth (not Replit OAuth).

## Troubleshooting

### Port already in use

```bash
lsof -i :5000            # find the process
# or remap in docker-compose.yml, e.g. "3000:5000"
```

### Database connection errors

```bash
docker compose ps postgres
docker compose logs postgres
docker compose exec postgres pg_isready -U postgres
docker compose restart postgres
```

### App exits immediately

Most often a missing `SESSION_SECRET` (express-session throws on boot) or an
unreachable `DATABASE_URL`.

```bash
docker compose logs app          # read the stack trace
docker compose exec app env | grep -E 'SESSION_SECRET|DATABASE_URL|NODE_ENV'
```

### Migrations didn't run

The boot migrator only runs when `NODE_ENV=production`.

```bash
docker compose exec app env | grep NODE_ENV
docker compose exec app ls -la /app/migrations
docker compose logs app | grep -i -E 'migration|error'
```

### Build failures

```bash
docker compose down --rmi all
docker builder prune -a
docker compose build --no-cache
docker compose up -d
```

### Health check keeps failing

```bash
docker compose logs app
docker compose ps
curl http://localhost:5000/api/health
```

## Production Deployment

### Build and push an image

```bash
docker build -t awesome-list-site:latest .
docker tag awesome-list-site:latest your-registry.com/awesome-list-site:latest
docker push your-registry.com/awesome-list-site:latest
```

The same image is used by Railway (`railway.json` sets `builder: DOCKERFILE`) and
works on any container platform (Cloud Run, ECS, Container Apps). See
[DEPLOYMENT.md](./DEPLOYMENT.md) for platform specifics.

### Production best practices

1. **Use an external, managed PostgreSQL** rather than the bundled Compose
   database. Set `DATABASE_URL` accordingly (append `?sslmode=require` for most
   managed providers).
2. **Provide secrets at runtime** — `SESSION_SECRET` (required) and
   `ADMIN_PASSWORD` (to manage the admin account). Prefer your platform's secret
   store or Docker secrets over baking them into the image.
3. **Set resource limits** in `docker-compose.yml`:
   ```yaml
   services:
     app:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```
4. **Run as non-root** — add `USER node` before `CMD` in the `Dockerfile`, or run
   with `--user node`.
5. **Configure health checks** on `/api/health` (already built into the
   `Dockerfile` `HEALTHCHECK`; also referenced by `railway.json`).
6. **Structured logging** via a log driver:
   ```yaml
   services:
     app:
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
   ```

### Scaling

The app keeps sessions in PostgreSQL (`connect-pg-simple`), so multiple replicas
can share state as long as they share one database. For horizontal scaling use an
external PostgreSQL plus a load balancer in front of the replicas.

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)

For cloud platform deployment (Replit, Railway, Vercel, other containers), see
[DEPLOYMENT.md](./DEPLOYMENT.md).

For the full environment-variable reference, see [ENVIRONMENT.md](./ENVIRONMENT.md).

For general setup and local development, see [SETUP.md](./SETUP.md).
