# Tech stack
- TypeScript 5.6 ESM; Node/npm (`package-lock.json` is canonical).
- Client: React 18, Vite 5, Wouter, TanStack Query 5, Tailwind 4, shadcn/Radix, Fuse.js.
- Server: Express 4, Passport/local + Replit OAuth, Zod, Drizzle ORM.
- Database: PostgreSQL 16 locally via Docker; Neon-backed in deployed environments.
- Integrations: Anthropic, GitHub, Google Analytics/Replit.
- Build: `npm run build` (Vite then esbuild server bundle); production entry `npm run start`.
- Container topology: `docker-compose.yml` has `postgres` and `app`; use containers for execution because the repo supplies Docker.