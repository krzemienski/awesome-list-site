# Full Functional Audit r4 — Interaction Inventory (Phase 1)

Date: July 9, 2026. App: Awesome Video (React SPA + Express + PostgreSQL, dev workspace).

## Frontend routes (19) — client/src/App.tsx
| Route | Page | Guard |
|---|---|---|
| `/` | Home (category grid, 1,838 resources) | — |
| `/categories` | Categories overview | — |
| `/category/:slug` | Category listing (24/page pagination) | — |
| `/subcategory/:slug` | Subcategory listing | — |
| `/sub-subcategory/:slug` | Sub-subcategory listing | — |
| `/resource/:id` | Resource detail (h1 + external link) | — |
| `/search` (`?q=`) | Search results | — |
| `/about` | About + FAQ | — |
| `/advanced` | Advanced browse | — |
| `/journeys` | Learning journeys list | — |
| `/journey/:id` | Journey detail + steps | — |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth pages | — |
| `/submit` | Resource submission | prompts sign-in |
| `/recommendations` | Recommendations | — |
| `/profile` | User profile | AuthGuard |
| `/bookmarks` | Bookmarks/favorites | AuthGuard |
| `/admin` | Admin panel | AdminGuard (role==='admin') |
| `/settings`, `/settings/theme` | Settings / theme picker | — |

## Redirects (9)
`/auth/login`→`/login`, `/auth/register`→`/register`, `/category`→`/`,
`/category/:slug/:sub`→`/subcategory/:sub`, `/subsubcategory/:slug`→`/sub-subcategory/:slug`,
`/journey`→`/journeys`, `/favorites`→`/bookmarks`, `/account`→`/profile`, `/?q=`→`/search?q=` (server 301 + client).
Unknown route → 404 page.

## Backend endpoints (~100) — server/routes.ts + server/api/public.ts
- **Public reads**: awesome-list tree, categories, resources (+pagination/filter), resource by id, search (`/api/search?q=`), journeys (+detail), sitemap/SEO routes, learning-paths/suggested.
- **Auth**: register, local login (423 lockout), logout, `/api/auth/user`, forgot/reset password.
- **User (session)**: favorites/bookmarks CRUD, interactions, progress, submissions, journeys, journey start/progress, resource submit (`/api/resources` + `/api/submit` alias, status forced `pending`), edit suggestions (whitelisted fields), change-password (invalidates other sessions), API keys CRUD (plaintext once).
- **Public API (Bearer key)**: `/api/public/me` + documented public endpoints (server/api/public.ts).
- **Admin (isAdmin)**: stats, users (+role PUT), pending-resources (+`/api/resources/pending` alias), resource approve/reject/delete, resource-edits approve/reject, taxonomy CRUD (categories/subcategories/sub-subcategories, slug required), audit-logs, journeys+steps CRUD, exports (markdown POST /api/admin/export, JSON GET /api/admin/export-json).
- **AI/automation (admin)**: enrichment jobs (`/api/enrichment/*`), researcher jobs/discoveries, GitHub sync status/history/import/export.

## Deliberately skipped (destructive/expensive) — auth gates verified instead
Real AI runs (enrichment/researcher start), GitHub import/export POSTs (mutate repo), bulk delete/approve on real data.
