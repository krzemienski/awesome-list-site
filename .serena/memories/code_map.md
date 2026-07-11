# Code/import map
- Browser flow: `client/src/main.tsx` → `client/src/App.tsx` → Wouter route page → layout/components → TanStack Query/fetch client.
- Request flow: React/TanStack Query → Express middleware/routes (`server/index.ts`, `server/routes.ts`) → domain repository (`server/repositories/*`) → Drizzle (`server/db`, `shared/schema.ts`) → PostgreSQL.
- Auth flow: login page/use-auth → local/Replit auth routes → Passport/session store → `isAuthenticated`/`isAdmin` middleware → protected API/admin UI.
- SEO/static flow: incoming page → `server/og-middleware.ts`/`server/seo-content.ts` → SPA shell/SSR metadata; sitemap/robots/OG image endpoints are server-owned.
- Resource flow: Home/category/search/resource-detail pages → `/api/resources*` → ResourceRepository/LegacyRepository → resources/tags/categories/users.
- Admin flow: `AdminDashboard`/admin components + hooks → `/api/admin/*` → auth/role middleware → repositories/audit/jobs.
- Shared-contract risk points: `shared/schema.ts`, resource response payloads, auth session shape, route aliases, pagination fields, sitemap canonical URLs.