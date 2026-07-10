# E2E Validation Analysis

Generated: 2026-07-10
## Platform: fullstack (React 18 + Vite frontend, Express backend, PostgreSQL via Drizzle)
## Startup: workflow "Start application" (`npm run dev`) — single port serves API + SPA
## URL/Port: http://localhost:5000

## Architecture
- Entry: `server/index.ts` → Express + Vite middleware; client entry `client/src/App.tsx` (wouter routing)
- Auth: dual — passport-local (email/password, bcrypt) + Replit OIDC (`/api/login` → replit.com/oidc); session store in `sessions` table
- Data: PostgreSQL is single source of truth; 27 tables; resources link to taxonomy by TEXT name (no FK)
- Public resource gate: status **approved** (not "published"); journeys use status **published**
- No hot-reload on server files (tsx without --watch) — restart workflow after server edits

## Live DB Baseline (verified 2026-07-10)
| Invariant | Value |
|---|---|
| users | 6 |
| resources (total) | 1,994 |
| resources (approved) | 1,838 |
| categories | 9 |
| published journeys | 5 |
| `__qa_test` residue | 0 |

Category counts (must sum to 1,838): Community 81 · Encoding 325 · General 151 · Infra 199 · Intro 194 · Media 255 · Players 234 · Protocols 200 · Standards 199.

## User Journeys Identified
1. **Database integrity** — schema present, invariants hold, 0 category-orphans
2. **Backend API core** — health, awesome-list tree, categories parity, search, pagination, clamps
3. **Authentication** — local register/login/logout, `/api/auth/user` (no hash leak), Replit OIDC 302, oauth-error toast
4. **Frontend browse** — home, category count parity (badge == API), pagination advance, resource detail, search page
5. **CRUD integration** — bookmark + favorite via UI → verify via API → verify in DB → remove (net-zero)
6. **Learning journeys** — list shows 5, detail groups steps by stepNumber
7. **Responsive** — 375 / 768 / 1440, no horizontal overflow on mobile
8. **Error propagation** — bad login toast, 404 resource id, invalid limit params don't 500

## Endpoints (subset of 126 routes in server/routes.ts — key public surface)
| Method | Path | Description |
|---|---|---|
| GET | /api/health | liveness |
| GET | /api/health/ai | AI availability + cache stats (cheap) |
| GET | /api/awesome-list | full 3-level tree, 1,838 approved |
| GET | /api/categories | 9 categories w/ counts |
| GET | /api/resources?limit&offset | paginated approved list |
| GET | /api/resources/:id | resource detail |
| GET | /api/search?q= | search (limit clamped [1,200], q<2 → empty) |
| POST | /api/auth/register, /api/auth/local/login, /api/auth/logout | local auth |
| GET | /api/auth/user | session user (redacted: id/email/role) |
| GET | /api/login, /api/callback | Replit OIDC (302 → replit.com/oidc) |
| GET/POST/DELETE | /api/bookmarks, /api/favorites | user CRUD |
| GET | /api/journeys, /api/journeys/:id | published journeys |
| GET | /api/learning-paths/suggested | cached AI paths (limit clamp [1,10]) |
| GET | /sitemap.xml, /og-image.png | SEO surface |

## Client Routes (30)
`/`, `/about`, `/account`, `/admin`, `/advanced`, `/auth/login`, `/auth/register`, `/bookmarks`, `/categories`, `/category/:slug(/:subSlug)`, `/favorites`, `/forgot-password`, `/journey(/:id)`, `/journeys`, `/login`, `/profile`, `/recommendations`, `/register`, `/reset-password`, `/resource/:id`, `/search`, `/settings`, `/settings/theme`, `/subcategory/:slug`, `/submit`, `/sub-subcategory/:slug`, `/subsubcategory/:slug`

## Risk Areas
- Auth session shape divergence (OIDC vs local both build `{claims:{sub}}`) — validated recently but auth is highest-risk surface — severity: high
- OIDC email-collision (local account + same-email Replit login → graceful `/login?error=oauth`, linking deferred) — known/accepted — severity: medium
- Bookmark/favorite CRUD cascades on user delete — teardown must NULL non-cascade FKs (resource_edits) before deleting QA user — severity: medium (test-hygiene)
- Count parity across sidebar/badges/API — historical drift source — severity: medium
- `/api/learning-paths/suggested` cold-start ~17s warm-up on boot — first hit after restart may be slow — severity: low

## Recommended Validation Order (bottom-up)
1. Layer 1: Database (schema + invariants)
2. Layer 2: Backend API (curl suite)
3. Layer 3: Frontend (Playwright, pinned Chromium)
4. Layer 4: Integration (UI action → API → DB, net-zero teardown)

## Environment Notes
- Playwright: use pinned executable `.cache/ms-playwright/chromium-1208/chrome-linux64/chrome` with `NODE_PATH=/home/runner/workspace/node_modules` and `--no-sandbox`
- SPA pushState navigation reuses cached tree (~0.75s/route) — full goto only where fresh load matters
- QA users: email prefix `__qa_test_` + full teardown sweep afterward (net-zero)
