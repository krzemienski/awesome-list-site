# Code Map

Quick reference for finding functionality in the codebase.

> Paths are relative to the repo root. Frontend lives in `client/src/`, backend in
> `server/`, shared types in `shared/`. For the full database schema see
> [DATABASE.md](./DATABASE.md); for architecture see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Frontend (client/src/)

### Pages
Registered in `client/src/App.tsx` (Wouter). Admin and most non-browse pages are lazy-loaded.

| File | Route | Purpose |
|------|-------|---------|
| `pages/Home.tsx` | `/` | Main resource browser |
| `pages/Categories.tsx` | `/categories` | All categories index |
| `pages/Category.tsx` | `/category/:slug` | Category view with view modes |
| `pages/Subcategory.tsx` | `/subcategory/:slug` | Subcategory view |
| `pages/SubSubcategory.tsx` | `/sub-subcategory/:slug` | Sub-subcategory view |
| `pages/ResourceDetail.tsx` | `/resource/:id` | Full resource details |
| `pages/Search.tsx` | `/search` | Search results |
| `pages/Advanced.tsx` | `/advanced` | Advanced search |
| `pages/Recommendations.tsx` | `/recommendations` | Personalized recommendations |
| `pages/Journeys.tsx` | `/journeys` | Learning journeys list |
| `pages/JourneyDetail.tsx` | `/journey/:id` | Journey details |
| `pages/SubmitResource.tsx` | `/submit` | Resource submission form |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | — | Legacy URL redirects to `/sign-in` / `/sign-up` (Clerk); no standalone page files |
| `/sign-in`, `/sign-up` | — | Clerk-hosted auth (inline `SignInPage` / `SignUpPage` in `App.tsx`) |
| `pages/Profile.tsx` | `/profile` | User profile (auth) |
| `pages/BookmarksGate.tsx` | `/bookmarks` | User bookmarks (auth + guest merge) |
| `pages/Settings.tsx` | `/settings` | User settings |
| `pages/ThemeSettings.tsx` | `/settings/theme` | Theme / design-system settings |
| `pages/About.tsx` | `/about` | About page |
| `pages/Terms.tsx` | `/terms` | Terms of service |
| `pages/Privacy.tsx` | `/privacy` | Privacy policy |
| `pages/AdminDashboard.tsx` | `/admin`, `/admin/:section` | Admin panel (lazy, admin-gated) |
| `pages/not-found.tsx` | fallback | 404 page |
| `pages/ErrorPage.tsx` | — | App-level error screen |

### Key Components
| File | Purpose |
|------|---------|
| `components/layout/new/MainLayout.tsx` | App shell (sidebar + header + content) |
| `components/layout/new/AppSidebar.tsx` | Hierarchical navigation sidebar |
| `components/layout/new/AppHeader.tsx` | Top header + search entry point |
| `components/layout/SEOHead.tsx` | Per-page meta/OG tags (react-helmet) |
| `components/layout/Footer.tsx` | Site footer |
| `components/resource/ResourceCard.tsx` | Resource display card |
| `components/resource/resource-view-modes.tsx` | Grid / list / compact renderers |
| `components/resource/BookmarkButton.tsx`, `FavoriteButton.tsx`, `ShareButton.tsx` | Resource actions |
| `components/ui/search-dialog.tsx` | Command-palette search (⌘K / `/`) |
| `components/ui/suggest-edit-dialog.tsx` | Edit suggestion modal |
| `components/ui/view-mode-toggle.tsx` | Grid/List/Compact view toggle |
| `components/ui/theme-provider.tsx` | Theme + design-system provider |
| `components/auth/AuthGuard.tsx`, `AdminGuard.tsx` | Route access guards |

### Hooks
| File | Purpose |
|------|---------|
| `hooks/useAuth.ts` | Authentication state |
| `hooks/use-mobile.tsx` | Mobile detection |
| `hooks/use-toast.ts` | Toast notifications |
| `hooks/use-theme.ts` | Theme / design-system state |
| `hooks/useAdmin.ts` | Admin role checks |
| `hooks/useAIRecommendations.ts` | Recommendation data |

### Utilities
| File | Purpose |
|------|---------|
| `lib/queryClient.ts` | TanStack Query config + `apiRequest` |
| `lib/utils.ts` | Utility functions (`cn`, etc.) |
| `lib/analytics.ts` | Google Analytics init/tracking |
| `lib/static-data.ts` | Nav-tree + corpus fetching |
| `lib/parser.ts` | Client-side awesome-list parsing |
| `lib/authUtils.ts` | Auth helpers |
| `lib/crossTabSync.ts`, `lib/nav-history.ts` | Cross-tab sync & scroll restoration |

## Backend (server/)

### Core Files
| File | Purpose |
|------|---------|
| `index.ts` | Server entry point; runs boot migrations, mounts middleware/routes |
| `routes.ts` | Small route composition root; shared repositories, middleware placement, and registrar order |
| `routes/domains/` | Owned API domain registrars (catalog, auth/user, contributions, journeys, admin, exports/link health, AI/jobs, operations) |
| `routes/non-api.ts` | Crawler-facing security.txt, sitemap, and OG routes (deliberately outside API routers) |
| `contracts/` | Named request/response registry, automatic guards, OpenAPI generation, and runtime drift comparison |
| `openapi.ts` | Builds the live OpenAPI document from registered contracts |
| `storage.ts` | `IStorage` facade delegating to domain repositories |
| `repositories/` | Domain data-access layer (see ARCHITECTURE.md) |
| `config.ts` | Site config derived from env |
| `og-middleware.ts`, `ssr.ts` | Crawler SSR-lite (meta/OG injection) |

### Authentication
| File | Purpose |
|------|---------|
| `clerkAuth.ts` | Clerk OIDC middleware + `requireAuth` gate + per-request user context |
| `passwordUtils.ts` | Retained pre-Clerk password helpers; no active auth consumer |

### AI Services (server/ai/)
| File | Purpose |
|------|---------|
| `claudeService.ts` | Claude API integration |
| `enrichmentService.ts` | Batch resource enrichment |
| `researchService.ts` | Claude Agent SDK research runs |
| `agentRuntime.ts`, `agentEvents.ts`, `runAgentQuery.ts` | Agent execution + event logging |
| `recommendationEngine.ts`, `recommendations.ts` | Personalized recommendations |
| `learningPathGenerator.ts` | AI learning-path generation |
| `embeddingService.ts` | OpenAI embeddings |
| `tagging.ts` | AI-powered tagging |
| `configCrypto.ts` | Encrypt/decrypt per-run agent auth tokens |
| `urlScraper.ts` | Web scraping (Cheerio/Puppeteer) |

### GitHub Integration (server/github/)
| File | Purpose |
|------|---------|
| `syncService.ts` | Import/export orchestration |
| `formatter.ts` | Awesome-list markdown generation |
| `parser.ts` | Markdown parsing |
| `client.ts` | GitHub API client |
| `replitConnection.ts` | Replit GitHub connection |
| `importHygiene.ts` | Import validation/cleanup |

### Validation (server/validation/)
| File | Purpose |
|------|---------|
| `awesomeLint.ts` | Awesome-lint validation |
| `linkChecker.ts` | URL link checking |
| `inputs.ts` | Request input validation helpers |

### API Domain Ownership

`server/routes.ts` is the composition root. Registrar order is a compatibility
contract: notifications precede the API backstop limiter, non-API crawler
routes stay outside API routers, and operations fallbacks remain last.

| File | Owned surface |
|------|---------------|
| `routes/domains/auth-user.ts` | Clerk-backed app identity, deprecated identity probes, all-session revocation |
| `routes/domains/catalog-contributions.ts` | Public catalog/search, resources, submissions, edit suggestions |
| `routes/domains/user-features.ts` | Favorites, bookmarks, collections, preferences, account contributions |
| `routes/domains/journeys-recommendations.ts` | Journeys, progress, recommendations, learning paths, interactions |
| `routes/domains/admin-content.ts` | Admin users, resources, taxonomy, content moderation |
| `routes/domains/export-link-health.ts` | GitHub sync, exports, link health, awesome-list discovery |
| `routes/domains/ai-jobs.ts` | Enrichment and researcher jobs |
| `routes/domains/operations.ts` | Health, public developer API, docs, 405/404 fallbacks |
| `routes/non-api.ts` | Sitemap, security.txt, OG image routes |

Every concrete `/api` registration is intercepted by
`contracts/install.ts`, assigned a stable method/path name, guarded before its
final handler, observed against named responses, and included in OpenAPI.

### Parsers
| File | Purpose |
|------|---------|
| `parser.ts` | Generic awesome-list parser |
| `awesome-video-parser-clean.ts` | Video-specific parser |

### Database
| File | Purpose |
|------|---------|
| `db/index.ts` | Drizzle connection (pg pool over `drizzle-orm/node-postgres`) |
| `migrate.ts` | Boot-time journaled-migration runner |
| `seed.ts` | Database seeding logic |
| `../migrations/` | Journaled SQL migrations + `meta/_journal.json` |

## Shared (shared/)

| File | Purpose |
|------|---------|
| `schema.ts` | Drizzle schema, Zod insert schemas, types (source of truth) |
| `validation.ts` | Shared content validation rules (names, slugs) |
| `categoryMapping.ts` | Category slug mappings |
| `about-content.ts`, `faq.ts`, `seo-templates.ts` | Static content/SEO copy |

## Scripts (scripts/)

The `scripts/` folder also contains many one-off `run*`/`audit*`/`capture*`/`verify*`
helpers from past QA runs. The durable, canonical scripts are:

| File | Purpose |
|------|---------|
| `build-static.ts` | Static build generation |
| `migrate.ts` | Standalone Drizzle migration runner |
| `migrate-audit-log-original-resource-id.ts` | One-off audit-log backfill |
| `check-migration-drift.ts` | Verify migrations reproduce `shared/schema.ts` |
| `verify-boot-migration-safety.ts` | Assert migrations are idempotent for boot |
| `pre-publish-gate.sh` | Pre-deploy verification gate |
| `audit-sidebar.sh` | Sidebar audit (`npm run audit:sidebar`) |
| `test-awesome-lint.ts` | Lint validation testing |
| `export-openapi-yaml.ts` | Export the OpenAPI spec |
| `validation/openapi-drift.ts` | Block method/path, contract, OpenAPI, auth, and baseline drift |

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `vite.config.ts` | Vite build configuration |
| `tailwind.config.ts` | Tailwind CSS configuration |
| `drizzle.config.ts` | Drizzle Kit configuration |
| `replit.md` | Project documentation / agent notes |

## Feature Location Quick Reference

> Find endpoint implementations in `server/routes/domains/` by path. Keep
> `server/routes.ts` limited to dependency construction and explicit registrar
> order.

### Authentication
- Clerk middleware + user context: `server/clerkAuth.ts` (mounted globally in `server/index.ts`)
- Retained legacy password utility (not wired into Clerk authentication):
  `server/passwordUtils.ts`
- Frontend: `client/src/hooks/useAuth.ts`
- Sign-in/sign-up: inline `SignInPage` / `SignUpPage` components in `client/src/App.tsx` (Clerk-hosted)

### Resource CRUD
- API: `server/routes/domains/catalog-contributions.ts` and `admin-content.ts`
- Data access: `server/repositories/ResourceRepository.ts` (via `server/storage.ts`)
- Frontend: `client/src/pages/Category.tsx`, `ResourceDetail.tsx`

### Admin Panel
- API: `server/routes/domains/admin-content.ts`
- Frontend: `client/src/pages/AdminDashboard.tsx`

### Search
- Frontend: `client/src/components/ui/search-dialog.tsx`, `client/src/pages/Search.tsx`
- Fuzzy search via Fuse.js; server FTS via the `resources.search_tsv` GIN index

### GitHub Sync
- Service: `server/github/syncService.ts`
- API: `server/routes/domains/export-link-health.ts`
- Formatter: `server/github/formatter.ts`

### AI Features
- Claude: `server/ai/claudeService.ts`
- Enrichment: `server/ai/enrichmentService.ts`
- Research agents: `server/ai/researchService.ts`, `agentRuntime.ts`
- API: `server/routes/domains/ai-jobs.ts`

### Validation
- awesome-lint: `server/validation/awesomeLint.ts`
- Link checker: `server/validation/linkChecker.ts`
- API: `server/routes/domains/export-link-health.ts`

### Categories
- Schema: `shared/schema.ts`
- API: `server/routes/domains/catalog-contributions.ts`, `admin-content.ts`
- Sidebar: `client/src/components/layout/new/AppSidebar.tsx`

### User Features
- Bookmarks/favorites/progress: `server/routes/domains/user-features.ts`
- Data access: `server/repositories/UserFeatureRepository.ts`

### Learning Journeys
- API: `server/routes/domains/journeys-recommendations.ts`
- Pages: `client/src/pages/Journeys.tsx`, `JourneyDetail.tsx`

## Database Tables

`shared/schema.ts` is the authority for all 38 `pgTable` definitions. See
[DATABASE.md](./DATABASE.md) for the complete export-to-SQL inventory and
migration workflow; this code map intentionally does not duplicate it.
