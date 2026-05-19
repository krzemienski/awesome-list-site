# SITE_MAP.md — Current Live Site

**Repo:** this Replit project (root)
**Captured:** May 19, 2026 (Phase 1 comprehension)

---

## STACK
- React 18.3 + TypeScript + Vite 5.4
- Routing: **wouter 3.3**
- Data: TanStack Query v5
- Styles: **Tailwind v4** (`@tailwindcss/vite` + `@tailwindcss/postcss`) + shadcn/ui (Radix)
- Icons: lucide-react
- Backend: Express + Drizzle ORM + PostgreSQL (Neon-compatible)
- Auth: Passport.js — Replit OIDC (`openid-client`) + Local strategy
- Workflow: `npm run dev` on port 5000 (Express serves Vite middleware)

---

## ROUTES (from `client/src/App.tsx`)

| Path | Component | Auth | Description |
|---|---|---|---|
| `/` | `Home` | public | Landing — search/explorer |
| `/login` | `Login` | public | Replit OAuth + local email/password |
| `/category/:slug` | `Category` | public | Top-level category browse |
| `/subcategory/:slug` | `Subcategory` | public | Subcategory browse |
| `/sub-subcategory/:slug` | `SubSubcategory` | public | Tertiary category browse |
| `/resource/:id` | `ResourceDetail` | public | Resource details + metadata + related |
| `/about` | `About` | public | Project info |
| `/advanced` | `Advanced` | public | Advanced search / analytics |
| `/submit` | `SubmitResource` | public (API gated) | Suggest a new resource |
| `/journeys` | `Journeys` | public | List AI learning paths |
| `/journey/:id` | `JourneyDetail` | public | Single journey stepper |
| `/profile` | `Profile` | **AuthGuard** | Account / preferences |
| `/bookmarks` | `Bookmarks` | **AuthGuard** | Saved resources |
| `/admin` | `AdminDashboard` | **AdminGuard** | 14-tab management |
| `/settings/theme` | `ThemeSettings` | public | Terminal accent tweaks (will be repurposed / removed) |
| `*` | `NotFound` | public | 404 |

**Total: 16 routes** (15 named + 1 wildcard)

---

## ADMIN TABS (all under `/admin`, in `AdminDashboard.tsx`)

| Tab | Component file |
|---|---|
| Approvals | `admin/PendingResources.tsx` |
| Edits | `admin/PendingEdits.tsx` |
| Enrichment | `admin/BatchEnrichmentPanel.tsx` |
| Researcher | `admin/ResearcherTab.tsx` |
| Export | `admin/ExportTab.tsx` |
| Database | `admin/DatabaseTab.tsx` |
| Resources | `admin/ResourceManager.tsx` |
| Categories | `admin/CategoryManager.tsx` |
| Subcategories | `admin/SubcategoryManager.tsx` |
| Sub-Subcats | `admin/SubSubcategoryManager.tsx` |
| Users | `admin/UsersTab.tsx` |
| GitHub | `admin/GitHubSyncPanel.tsx` |
| Link Health | `admin/LinkHealthDashboard.tsx` |
| Audit | `admin/AuditTab.tsx` |

**14 admin surfaces.**

---

## COMPONENTS (grouped)

**`ui/`** (shadcn primitives + custom)
button, card, badge, input, tabs, dialog, skeleton, theme-provider, awesome-list-explorer, analytics-dashboard, …

**`admin/`**
AdminStats, GenericCrudManager, per-tab configs.

**`layout/new/`**
MainLayout (app shell), AppSidebar, AppHeader, Footer, SEOHead.

**`auth/`**
AuthGuard, AdminGuard.

**`resource/`**
ResourceCard, BookmarkButton, FavoriteButton.

**`ai/`**
RecommendationCard, LearningPathCard.

---

## THEMING (current state)

- Hard-locked dark mode: `document.documentElement.classList.add('dark')` in `main.tsx`.
- Foundation order: `client/src/index.css` imports `./styles/design-system.css` first, then `tailwindcss`.
- `@theme inline` block in `index.css` already aliases shadcn keys (`--color-card`, `--color-primary`, etc.) onto DS tokens (`--surface`, `--accent`).
- Radius ladder collapsed to `0` (Terminal contract).
- Font tokens currently set to **`'IBM Plex Mono', ui-monospace, monospace`** for body / display / mono.
- Accent token currently **`#00ff88` (Matrix green)**.

This means the foundation is already wired to consume DS tokens — but the token **values** are Terminal, not Editorial. The migration is mostly a token-value swap + a small set of skin changes (radius reintroduction, eyebrow weight, italic accent rule).

---

## AUTH

- Two paths:
  1. **Replit Auth** — `/api/login` → `/api/callback` (production)
  2. **Local Auth** — `/api/auth/local/login` (dev/admin)
- Middlewares: `isAuthenticated`, `isAdmin` in `server/routes.ts`
- Required env vars: `REPL_ID`, `DATABASE_URL`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`, `VITE_GA_MEASUREMENT_ID`, `ISSUER_URL`

---

## RUN INSTRUCTIONS
- Workflow: **`Start application`** → `npm run dev`
- Port: **5000**
- DB seed: automatic on first boot (`runBackgroundInitialization()` → `seedDatabase()`)
- Admin password reset: `tsx scripts/reset-admin-password.ts`

---

## EXISTING STATES
- Loading: `ui/skeleton.tsx`; auth/data spinner in `App.tsx`
- Empty: inline in Category/ResourceCard grids
- Error: `pages/ErrorPage.tsx` (global) + `pages/not-found.tsx` (404) + red banners in AdminDashboard
