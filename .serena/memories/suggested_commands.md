# Suggested commands
- Canonical local environment: `docker compose up --build` (app + PostgreSQL); inspect with `docker compose ps` and `docker compose logs`.
- Health/user surfaces: `curl http://localhost:5001/api/health`; browser at `http://localhost:5001`.
- Build gate: `npm run build` inside the app container/environment.
- Static gates: `npm run lint`, `npm run type-check`, `npm run format:check`.
- Production binary: `npm run start` after build.
- Database schema tooling: `npm run db:push` is mutating and requires explicit approval for production.
- Production deployment/mutations require an explicit user approval gate; never infer approval from a local PASS.