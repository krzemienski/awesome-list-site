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
- **Seeding**: on first boot (dev or prod) the app seeds categories/resources
  only when the database is empty; it never overwrites existing catalog data.
- **Health**: `/api/health` and `/api/health/live` are process liveness;
  `/api/health/ready` checks migration state plus a bounded database probe.
- **Authentication**: Clerk owns credentials and sessions in every environment.
  `REPL_ID` only controls Replit development plugins.

## Prerequisites

1. **A PostgreSQL database** — managed (Neon, Supabase, RDS, Cloud SQL, Azure) or
   self-hosted (see [DOCKER.md](./DOCKER.md)).
2. **Environment variables** — at minimum `DATABASE_URL`,
   `VITE_CLERK_PUBLISHABLE_KEY` at build time, and
   `CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` at runtime.
3. **A platform account** for wherever you deploy.

## Replit Deployment

Replit is the primary deployment target for this project (`.replit` is
preconfigured).

- **Build** runs `bash scripts/pre-publish-gate.sh --publish`: typecheck,
  journal-only migration-drift validation, production build, then the bundle
  budget. It deliberately does not boot the app or touch the production
  database during the build. Print and responsive audits are separate
  validation workflows; non-publish preflight runs them when a dev app is
  already serving on port 5000.
- **Run**: `npm run start`.
- **Target**: `autoscale`, exposing internal port 5000 as external port 80.

Steps:

1. Open the project on Replit.
2. Add Replit PostgreSQL (or another reachable PostgreSQL provider), then set
   the Clerk keys and any optional feature keys in **Secrets**. The application
   receives `DATABASE_URL` from the database integration.
3. Click **Deploy**. The build gate runs; on success the app is published.

Replit provides managed PostgreSQL with separate development and production
databases. An external PostgreSQL provider also works.

## Docker / Self-Hosting

The repo ships a production `Dockerfile` and a `docker-compose.yml` (app +
PostgreSQL). This is the recommended path for self-hosting and for building the
image used by container platforms.

See **[DOCKER.md](./DOCKER.md)** for the full guide, including a runnable local
recipe, the required env vars, and verification steps. Quick start:

```bash
# Put VITE_CLERK_PUBLISHABLE_KEY, CLERK_PUBLISHABLE_KEY, and
# CLERK_SECRET_KEY in .env first.
docker compose up -d --build
curl http://localhost:5000/api/health/ready
```

## Railway

Railway builds the `Dockerfile` directly (`railway.json` is preconfigured):

```json
{
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/api/health/ready",
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
3. Set `NODE_ENV=production`, `DATABASE_URL` if it was not injected, and the
   Clerk build/runtime keys.
4. Deploy — Railway builds the Dockerfile and health-checks
   `/api/health/ready`.

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
  "framework": null,
  "regions": ["iad1"],
  "env": { "NODE_ENV": "production" }
}
```

As-is, a Vercel deploy serves only the static frontend from `dist/public`; the
API will not run. To actually host the backend on Vercel you would need to wrap
the Express app in a serverless handler under `api/` (e.g. an `api/index.ts`
shim) — that work has not been done. The checked-in configuration remains
static-only; no backend runtime variables are consumed by that static deploy.

## Other Container Platforms

Any platform that runs a container works with the same `Dockerfile` (Google Cloud
Run, AWS ECS/Fargate, Azure Container Apps, Fly.io, etc.). The general recipe:

1. Build and push the image:
   ```bash
   docker build \
     --build-arg VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY" \
     --build-arg VITE_CLERK_PROXY_URL="${VITE_CLERK_PROXY_URL:-/api/__clerk}" \
     -t <registry>/awesome-list-site:latest .
   docker push <registry>/awesome-list-site:latest
   ```
2. Deploy it with:
   - **Port** `5000` (or set `PORT`).
   - **Env** `NODE_ENV=production`, `DATABASE_URL`,
     `CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
   - **Readiness check** path `/api/health/ready`.
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
VITE_CLERK_PUBLISHABLE_KEY=pk_...          # build time
CLERK_PUBLISHABLE_KEY=pk_...               # runtime
CLERK_SECRET_KEY=sk_...                    # runtime, server-only
```

Optional feature keys (AI enrichment, GitHub import/export, analytics, etc.) are
documented — with where each one is read — in [ENVIRONMENT.md](./ENVIRONMENT.md).

Set them via each platform's mechanism: Replit Secrets, Railway variables, Vercel
env, or a Docker `.env` file / `--env`.

## Health Checks

```text
GET /api/health       -> 200 {"status":"ok"}      # liveness alias
GET /api/health/live  -> 200 {"status":"ok"}      # process-only
GET /api/health/ready -> 200 {"status":"ready"}   # DB/migrations ready
```

Use liveness to decide whether the process should be restarted. Use readiness
to decide whether it should receive traffic; readiness returns `503` while
migrations or the bounded catalog-database probe are unavailable.

- **Replit**: automatic.
- **Railway**: `healthcheckPath: "/api/health/ready"` in `railway.json`.
- **Docker**: readiness is built into the `Dockerfile` `HEALTHCHECK`.
- **Container platforms**: configure the target group / probe path to
  `/api/health/ready`; configure a separate liveness probe when supported.

There is also `GET /api/health/ai` for AI-service status (public callers get
availability only; detailed stats require an admin session).

## Troubleshooting

**Build fails**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**App exits on start** — check `DATABASE_URL`, migration logs, and server Clerk
keys. A client that renders a missing-key error was built without
`VITE_CLERK_PUBLISHABLE_KEY`.

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
