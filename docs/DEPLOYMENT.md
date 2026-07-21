# Deployment Guide

This guide covers deploying the Awesome List Site. The app is a single
**Express + Vite** server: `npm run build` produces a static frontend
(`dist/public/`) and a bundled server (`dist/index.js`), and `npm run start`
serves both from **one port (5000)**. That makes it a natural fit for **Replit
Deployments** and any **container** platform (Docker, Railway, Cloud Run, ECS,
Container Apps).

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Replit Deployment](#replit-deployment)
- [Docker / Self-Hosting](#docker--self-hosting)
- [Railway](#railway)
- [Vercel](#vercel)
- [Other Container Platforms](#other-container-platforms)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

## Overview

Key runtime facts (verified against the code in this repo):

- **Stack**: React 18 + Vite frontend, Express + Drizzle ORM backend, PostgreSQL.
  There is no Next.js/serverless framework — it's a long-running Node process.
- **Build**: `npm run build` = `vite build` (→ `dist/public/`) + `esbuild
  server/index.ts` (→ `dist/index.js`). Node 20.
- **Start**: `npm run start` = `NODE_ENV=production node dist/index.js` on port
  5000 (override with `PORT`).
- **Migrations**: when `NODE_ENV=production`, a boot-time migrator
  (`server/migrate.ts`) applies `migrations/` before the server listens, and the
  process refuses to start if migrations fail. Ship the `migrations/` folder with
  the app (the `Dockerfile` already copies it).
- **Seeding**: on first boot (dev or prod) the app seeds categories/resources and
  the admin account **only when the database is empty**; it never overwrites
  existing data.
- **Health**: `GET /api/health` returns `{"status":"ok"}` (HTTP 200). There is no
  `/health` route.
- **Replit-optional**: Replit OAuth and the Replit Vite plugins load only when
  `REPL_ID` is set; otherwise the app uses local username/password auth. It runs
  anywhere without Replit.

## Prerequisites

1. **A PostgreSQL database** — managed (Neon, Supabase, RDS, Cloud SQL, Azure) or
   self-hosted (see [DOCKER.md](./DOCKER.md)).
2. **Environment variables** — at minimum `DATABASE_URL`, `NODE_ENV=production`,
   and `SESSION_SECRET` (see [Environment Variables](#environment-variables)).
3. **A platform account** for wherever you deploy.

## Replit Deployment

Replit is the primary deployment target for this project (`.replit` is
preconfigured).

- **Build** runs the pre-publish gate: `bash scripts/pre-publish-gate.sh`, which
  executes, in order — `tsc` typecheck → migration-drift check
  (`scripts/check-migration-drift.ts`) → print-audit → responsive-audit →
  `npm run build`. Any failing step blocks the publish.
- **Run**: `npm run start`.
- **Target**: `autoscale`, exposing internal port 5000 as external port 80.

Steps:

1. Open the project on Replit.
2. Set **Secrets** (Tools → Secrets): `DATABASE_URL`, `SESSION_SECRET`,
   `ADMIN_PASSWORD`, and any optional feature keys (see
   [ENVIRONMENT.md](./ENVIRONMENT.md)). `NODE_ENV=production` is set by the run
   command. The pre-publish gate's browser audits require `ADMIN_PASSWORD`.
3. Click **Deploy**. The build gate runs; on success the app is published.

Replit does not provide managed PostgreSQL — use Neon or another external
provider for `DATABASE_URL`.

## Docker / Self-Hosting

The repo ships a production `Dockerfile` and a `docker-compose.yml` (app +
PostgreSQL). This is the recommended path for self-hosting and for building the
image used by container platforms.

See **[DOCKER.md](./DOCKER.md)** for the full guide, including a runnable local
recipe, the required env vars, and verification steps. Quick start:

```bash
export SESSION_SECRET="$(openssl rand -base64 32)"
export ADMIN_PASSWORD="choose-a-strong-admin-password"
docker compose up -d --build
curl http://localhost:5000/api/health   # -> {"status":"ok"}
```

## Railway

Railway builds the `Dockerfile` directly (`railway.json` is preconfigured):

```json
{
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Steps:

1. Create a project from your GitHub repo at [railway.app](https://railway.app).
2. Add a **PostgreSQL** plugin (Railway sets `DATABASE_URL` automatically) or point
   `DATABASE_URL` at an external database.
3. Set variables: `NODE_ENV=production`, `SESSION_SECRET`, `ADMIN_PASSWORD`.
4. Deploy — Railway builds the Dockerfile and health-checks `/api/health`.

## Vercel

> ⚠️ Vercel is **serverless**. This app is a long-running Express process with a
> boot-time migrator and background seeding, which does not map cleanly to
> ephemeral serverless functions (cold starts re-run boot work; long tasks hit the
> function timeout). For production, prefer Replit, Railway, or a container
> platform. Use Vercel only if you understand these constraints.

`vercel.json` is intentionally minimal — it only defines the build (no
`functions` or `rewrites` blocks, because the Express server is not structured
as Vercel serverless functions):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "framework": null
}
```

As-is, a Vercel deploy serves only the static frontend from `dist/public`; the
API will not run. To actually host the backend on Vercel you would need to wrap
the Express app in a serverless handler under `api/` (e.g. an `api/index.ts`
shim) — that work has not been done. If you attempt it, set `DATABASE_URL` (use
a pooled connection such as Neon) and `SESSION_SECRET` in the Vercel dashboard.

## Other Container Platforms

Any platform that runs a container works with the same `Dockerfile` (Google Cloud
Run, AWS ECS/Fargate, Azure Container Apps, Fly.io, etc.). The general recipe:

1. Build and push the image:
   ```bash
   docker build -t <registry>/awesome-list-site:latest .
   docker push <registry>/awesome-list-site:latest
   ```
2. Deploy it with:
   - **Port** `5000` (or set `PORT`).
   - **Env** `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET`,
     `ADMIN_PASSWORD`.
   - **Health check** path `/api/health`.
3. Provision a managed PostgreSQL and set `DATABASE_URL` (use connection pooling
   for serverless container runtimes).

## Database Setup

Any PostgreSQL 14+ database works. Managed options:

| Provider | Notes |
|----------|-------|
| [Neon](https://neon.tech) | Serverless Postgres with built-in pooling; good for Vercel/Railway. |
| [Supabase](https://supabase.com) | Full-featured managed Postgres. |
| [Railway PostgreSQL](https://railway.app) | Auto-wired `DATABASE_URL` on Railway. |
| AWS RDS / GCP Cloud SQL / Azure Database | Managed Postgres for the respective clouds. |

1. Create the instance and grab the connection string:
   ```
   postgresql://user:password@host:5432/database?sslmode=require
   ```
2. Set it as `DATABASE_URL`.
3. **Migrations** apply automatically on production startup. For dev or a
   schema-only push you can run `npm run db:push`. See
   [DATABASE.md](./DATABASE.md#migrations--schema-changes) for the full workflow.

## Environment Variables

Required for any deployment:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
NODE_ENV=production
SESSION_SECRET=<openssl rand -base64 32>   # express-session will not start without it
```

Recommended:

```bash
ADMIN_PASSWORD=<>=8 chars>   # seeds/rotates the admin@example.com account on boot
```

Optional feature keys (AI enrichment, GitHub import/export, analytics, etc.) are
documented — with where each one is read — in [ENVIRONMENT.md](./ENVIRONMENT.md).

Set them via each platform's mechanism: Replit Secrets, Railway variables, Vercel
env, or a Docker `.env` file / `--env`.

## Health Checks

```bash
GET /api/health   ->   200 {"status":"ok"}
```

The endpoint reports process liveness only (no database/version fields). Point
platform health checks at `/api/health`:

- **Replit**: automatic.
- **Railway**: `healthcheckPath: "/api/health"` in `railway.json`.
- **Docker**: built into the `Dockerfile` `HEALTHCHECK`.
- **Container platforms**: configure the target group / probe path to
  `/api/health`.

There is also `GET /api/health/ai` for AI-service status (public callers get
availability only; detailed stats require an admin session).

## Troubleshooting

**Build fails**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**App exits on start** — usually a missing `SESSION_SECRET` (express-session
throws) or an unreachable `DATABASE_URL`. Check the logs and confirm both are set.

**Migrations fail on boot** — the process exits by design if migrations fail.
Verify `DATABASE_URL`, that the DB user can create/alter tables, and that the
`migrations/` folder is present in the deployed artifact.

**Port binding** — don't hardcode 5000; the server reads `PORT`. Most platforms
inject it automatically.

**Database connection errors** — check the `DATABASE_URL` format (correct
host/port, `sslmode=require` for managed providers, URL-encoded password) and any
firewall/security-group rules.

---

For local development with Docker, see [DOCKER.md](./DOCKER.md). For the full
environment reference, see [ENVIRONMENT.md](./ENVIRONMENT.md).
