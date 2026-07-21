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
| `pages/Login.tsx` | `/login` | Sign in |
| `pages/Register.tsx` | `/register` | Sign up |
| `pages/ForgotPassword.tsx` | `/forgot-password` | Request password reset |
| `pages/ResetPassword.tsx` | `/reset-password` | Complete password reset |
| `pages/Profile.tsx` | `/profile` | User profile (auth) |
| `pages/Bookmarks.tsx` | `/bookmarks` | User bookmarks (auth) |
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
| `components/layout/new/ModernSidebar.tsx`, `AppSidebar.tsx` | Hierarchical navigation sidebar |
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
| `routes.ts` | All API route definitions (~6,600 lines, ~145 routes) |
| `storage.ts` | `IStorage` facade delegating to domain repositories |
| `repositories/` | Domain data-access layer (see ARCHITECTURE.md) |
| `config.ts` | Site config derived from env |
| `og-middleware.ts`, `ssr.ts` | Crawler SSR-lite (meta/OG injection) |

### Authentication
| File | Purpose |
|------|---------|
| `replitAuth.ts` | Replit OIDC OAuth setup + session store |
| `localAuth.ts` | Local email/password auth |
| `passwordUtils.ts` | bcrypt password hashing |

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
| `reset-admin-password.ts` | Admin password reset |
| `migrate.ts` | Standalone Drizzle migration runner |
| `migrate-audit-log-original-resource-id.ts` | One-off audit-log backfill |
| `check-migration-drift.ts` | Verify migrations reproduce `shared/schema.ts` |
| `verify-boot-migration-safety.ts` | Assert migrations are idempotent for boot |
| `pre-publish-gate.sh` | Pre-deploy verification gate |
| `audit-sidebar.sh` | Sidebar audit (`npm run audit:sidebar`) |
| `test-awesome-lint.ts` | Lint validation testing |
| `export-openapi-yaml.ts` | Export the OpenAPI spec |

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

> `server/routes.ts` is large; find endpoints by grepping their path rather than by line
> number (e.g. search `"/api/resources"`).

### Authentication
- OAuth: `server/replitAuth.ts`
- Local: `server/localAuth.ts`
- Frontend: `client/src/hooks/useAuth.ts`
- Login page: `client/src/pages/Login.tsx`

### Resource CRUD
- API: `server/routes.ts` — grep `"/api/resources"`
- Data access: `server/repositories/ResourceRepository.ts` (via `server/storage.ts`)
- Frontend: `client/src/pages/Category.tsx`, `ResourceDetail.tsx`

### Admin Panel
- API: `server/routes.ts` — grep `"/api/admin"`
- Frontend: `client/src/pages/AdminDashboard.tsx`

### Search
- Frontend: `client/src/components/ui/search-dialog.tsx`, `client/src/pages/Search.tsx`
- Fuzzy search via Fuse.js; server FTS via the `resources.search_tsv` GIN index

### GitHub Sync
- Service: `server/github/syncService.ts`
- API: `server/routes.ts` — grep `"/api/admin"` (import/export/sync)
- Formatter: `server/github/formatter.ts`

### AI Features
- Claude: `server/ai/claudeService.ts`
- Enrichment: `server/ai/enrichmentService.ts`
- Research agents: `server/ai/researchService.ts`, `agentRuntime.ts`
- API: `server/routes.ts` — grep `"/api/admin/enrichment"`, `"/api/researcher"`

### Validation
- awesome-lint: `server/validation/awesomeLint.ts`
- Link checker: `server/validation/linkChecker.ts`
- API: `server/routes.ts` — grep `"/api/admin/validation"`, `"/api/admin/link-health"`

### Categories
- Schema: `shared/schema.ts`
- API: `server/routes.ts` — grep `"/api/categories"`
- Sidebar: `client/src/components/layout/new/ModernSidebar.tsx`

### User Features
- Bookmarks/favorites/progress: `server/routes.ts` — grep `"/api/bookmarks"`, `"/api/favorites"`, `"/api/user/progress"`
- Data access: `server/repositories/UserFeatureRepository.ts`

### Learning Journeys
- API: `server/routes.ts` — grep `"/api/journeys"`
- Pages: `client/src/pages/Journeys.tsx`, `JourneyDetail.tsx`

## Database Tables

Defined in `shared/schema.ts` (29 tables). See [DATABASE.md](./DATABASE.md) for full column
detail. Export name → SQL table:

- `users` → `users`, `sessions` → `sessions`, `apiKeys` → `api_keys`, `passwordResetTokens` → `password_reset_tokens`
- `resources` → `resources` (+ generated `search_tsv`)
- `categories`, `subcategories`, `subSubcategories` → `sub_subcategories`
- `tags` → `tags`, `resourceTags` → `resource_tags`, `awesomeLists` → `awesome_lists`
- `resourceEdits` → `resource_edits`, `resourceAuditLog` → `resource_audit_log`
- `learningJourneys` → `learning_journeys`, `journeySteps` → `journey_steps`, `userJourneyProgress` → `user_journey_progress`
- `userFavorites` → `user_favorites`, `userBookmarks` → `user_bookmarks`, `userPreferences` → `user_preferences`, `userInteractions` → `user_interactions`
- `githubSyncQueue` → `github_sync_queue`, `githubSyncHistory` → `github_sync_history`
- `enrichmentJobs` → `enrichment_jobs`, `enrichmentQueue` → `enrichment_queue`
- `researchJobs` → `research_jobs`, `researchDiscoveries` → `research_discoveries`, `agentEvents` → `agent_events`
- `linkHealthJobs` → `link_health_jobs`, `linkHealthChecks` → `link_health_checks`
