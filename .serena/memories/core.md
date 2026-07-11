# Awesome List Site core
- Full-stack Awesome Video resource catalog. Browser client in `client/src/`; Express API/server in `server/`; shared Drizzle/Zod contracts in `shared/`; DB migrations in `migrations/`.
- Canonical architecture detail: `docs/ARCHITECTURE.md`; navigation map: `docs/CODE-MAP.md`.
- Repository-pattern data access under `server/repositories/`; route layer must preserve shared schemas and auth middleware.
- Production surface: https://awesome.video/. Local Docker surface currently maps app to http://localhost:5001 with PostgreSQL on localhost:5432.
- This workspace requires real-system validation; do not create mocks, stubs, test doubles, unit-test files, or test-framework validation. See `mem:task_completion`.
- More detail: stack/build in `mem:tech_stack`; source topology in `mem:repo_tree`; dependency flow in `mem:code_map`; conventions in `mem:conventions`.