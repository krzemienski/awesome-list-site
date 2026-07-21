# Development Setup Guide

How to set up and run the Awesome Video Resource Viewer locally. The stack is a
single Node process: an **Express** API and a **Vite** React client served on
the same port (`5000`).

## Prerequisites

- **Node.js 20+** (the repo is developed on Node 20)
- **PostgreSQL 14+** (local install, Docker, or a managed provider such as Neon)
- **Git**

On Replit, `DATABASE_URL`, `PORT`, and `REPL_ID` are provided automatically —
skip the manual database/env steps and just set your secrets.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Create a .env at the project root (see docs/ENVIRONMENT.md).
#    There is no .env.example shipped — the minimum is:
cat > .env <<'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/awesome_list"
SESSION_SECRET="change-me-use-a-long-random-string"
NODE_ENV="development"
ADMIN_PASSWORD="a-strong-admin-password"
EOF

# 3. Create the schema in your database
npm run db:push

# 4. Start the dev server (Express + Vite HMR on http://localhost:5000)
npm run dev
```

Open http://localhost:5000. See [ENVIRONMENT.md](./ENVIRONMENT.md) for the full
list of environment variables and optional integrations (AI, GitHub, analytics).

## Database

Schema is managed with **Drizzle Kit**.

```bash
npm run db:push          # sync shared/schema.ts to the database
npm run db:push --force  # sync, dropping/altering when prompts would block
npm run db:studio        # open Drizzle Studio (GUI)
```

- In **development**, run `npm run db:push` after pulling schema changes.
- In **production** (`NODE_ENV=production`), the server runs SQL migrations from
  `migrations/` automatically at boot before accepting traffic.

## Seeding & admin account

- **Auto-seed on first boot**: when the database is empty the server seeds
  categories, sample resources, and an admin user (`admin@example.com`) using the
  `ADMIN_PASSWORD` secret. If `ADMIN_PASSWORD` is unset or shorter than 8
  characters, admin seeding is skipped.
- **Password sync**: on every boot `syncAdminPasswordFromEnv()` updates the admin
  password to match the current `ADMIN_PASSWORD`.
- **Reset the admin password manually**:

  ```bash
  ADMIN_PASSWORD="a-strong-admin-password" tsx scripts/reset-admin-password.ts
  ```

  This resets `admin@example.com` (requires the DB to already contain the user).
- **Manual re-seed** (admin session required):

  ```bash
  curl -X POST http://localhost:5000/api/admin/seed-database
  ```

## Development commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Express + Vite dev server on `:5000` |
| `npm run build` | Build client (Vite) and bundle server (esbuild) to `dist/` |
| `npm run start` | Run the production build (`NODE_ENV=production`) |
| `npm run check` / `npm run type-check` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run format` / `npm run format:check` | Prettier write / check |
| `npm run db:push` | Sync schema to the database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run test:unit` | Vitest unit tests (`tests/unit`) |
| `npm run test:integration` | Vitest integration tests (`tests/integration`) |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run audit:sidebar` | Sidebar/navigation audit script |

> Only these scripts exist in `package.json`. Do not assume a `seed` or `migrate`
> npm script — use the flows described above.

## Project structure

```
├── client/src/          # React + Vite frontend
│   ├── components/       # UI + feature components (shadcn/ui in components/ui)
│   ├── pages/           # Route pages (wouter)
│   ├── hooks/           # Custom hooks
│   ├── lib/             # queryClient, analytics, utils
│   └── App.tsx          # Router + providers
├── server/              # Express backend
│   ├── index.ts         # App entry (boot migrations in prod, middleware, listen)
│   ├── routes.ts        # Route registration (~145 routes)
│   ├── openapi.ts       # OpenAPI spec → served at /api/docs & /api/openapi.json
│   ├── storage.ts       # IStorage data-access interface
│   ├── repositories/    # DB repositories
│   ├── api/public.ts    # Public API (/api/public/*)
│   ├── ai/              # Claude/OpenAI enrichment, embeddings, agents
│   ├── github/          # GitHub import/export/sync
│   ├── seed.ts          # Seeding + admin bootstrap
│   └── migrate.ts       # Boot-time SQL migrator
├── shared/schema.ts     # Drizzle schema + Zod types (source of truth)
├── migrations/          # SQL migrations (run in production)
├── scripts/             # Maintenance scripts (tsx)
├── tests/               # unit / integration / e2e (+ helpers)
└── docs/                # Documentation
```

## Testing

```bash
npm run test:unit          # fast unit tests
npm run test:integration   # API/integration tests (needs a test DATABASE_URL)
npm run test:e2e           # Playwright (starts the app; see playwright.config.ts)
```

Integration and e2e tests expect a reachable PostgreSQL database. Point
`DATABASE_URL` at a disposable/test database before running them.

## Troubleshooting

- **`npm run dev` exits immediately** — check `DATABASE_URL` and `SESSION_SECRET`
  are set; the server refuses to start without a usable database connection.
- **Schema errors / missing tables** — run `npm run db:push`.
- **Port 5000 in use** — set `PORT` in `.env` (note: on Replit the platform sets
  the port for you).
- **Can't log in as admin** — ensure `ADMIN_PASSWORD` is ≥ 8 chars, then run
  `tsx scripts/reset-admin-password.ts` or restart to trigger the password sync.
- **AI/GitHub features missing** — those require optional keys; see
  [ENVIRONMENT.md](./ENVIRONMENT.md).

## See also

- [ENVIRONMENT.md](./ENVIRONMENT.md) — all environment variables
- [API.md](./API.md) — API reference (+ live docs at `/api/docs`)
- [DEPLOYMENT.md](./DEPLOYMENT.md) — production deployment
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — contribution workflow
