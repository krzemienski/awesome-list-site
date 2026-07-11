# Repository tree
- `client/` — Vite React frontend; `client/src/App.tsx` route registry; `client/src/pages/` screens; `client/src/components/` UI/layout/admin/resource components; `client/src/hooks/`; `client/src/lib/`; `client/src/styles/`.
- `server/` — Express entry/middleware/routes, auth, SSR/OG/SEO, domain services and repositories; `server/index.ts`, `server/routes.ts`, `server/og-middleware.ts`, `server/repositories/`.
- `shared/` — Drizzle database schema, Zod schemas, cross-layer types, category mappings.
- `migrations/` — PostgreSQL schema/data migrations.
- `scripts/` — operational/import/repair utilities.
- `docs/` — architecture, API, deployment, DB, admin, code-map documentation.
- `plans/awesome-video-bughunt-fixes/` — ignored multi-phase remediation plans; phases 03, 07, 10 were absent at reconnaissance.
- `hunt-workspace/` — generated production-audit evidence and report; preserve as source evidence.
- `e2e-evidence/` — run-scoped fresh functional-validation artifacts.