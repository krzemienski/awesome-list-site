# Code Map

Quick reference for finding functionality in the codebase.

## Frontend (client/src/)

### Pages
| File | Route | Purpose |
|------|-------|---------|
| `pages/Home.tsx` | `/` | Main resource browser |
| `pages/Category.tsx` | `/category/:slug` | Category view with view modes |
| `pages/Subcategory.tsx` | `/subcategory/:slug` | Subcategory view |
| `pages/SubSubcategory.tsx` | `/sub-subcategory/:slug` | Sub-subcategory view |
| `pages/ResourceDetail.tsx` | `/resource/:id` | Full resource details |
| `pages/Landing.tsx` | `/welcome` | Landing page |
| `pages/About.tsx` | `/about` | About page |
| `pages/Advanced.tsx` | `/advanced` | Advanced search |
| `pages/Login.tsx` | `/login` | Authentication |
| `pages/Profile.tsx` | `/profile` | User profile |
| `pages/Bookmarks.tsx` | `/bookmarks` | User bookmarks |
| `pages/SubmitResource.tsx` | `/submit` | Resource submission form |
| `pages/Journeys.tsx` | `/journeys` | Learning journeys list |
| `pages/JourneyDetail.tsx` | `/journeys/:id` | Journey details |
| `pages/AdminDashboard.tsx` | `/admin` | Admin panel |

### Key Components
| File | Purpose |
|------|---------|
| `components/layout/Sidebar.tsx` | Hierarchical navigation sidebar |
| `components/layout/Header.tsx` | Top navigation bar |
| `components/layout/MobileNav.tsx` | Mobile navigation |
| `components/ResourceCard.tsx` | Resource display card |
| `components/SearchCommand.tsx` | Command palette search (⌘K) |
| `components/SuggestEditDialog.tsx` | Edit suggestion modal |
| `components/ViewModeToggle.tsx` | Grid/List/Compact view toggle |

### Hooks
| File | Purpose |
|------|---------|
| `hooks/use-auth.tsx` | Authentication state |
| `hooks/use-mobile.tsx` | Mobile detection |
| `hooks/use-toast.tsx` | Toast notifications |

### Utilities
| File | Purpose |
|------|---------|
| `lib/queryClient.ts` | TanStack Query configuration |
| `lib/utils.ts` | Utility functions (cn, etc.) |

## Backend (server/)

### Core Files
| File | Purpose |
|------|---------|
| `index.ts` | Server entry point, startup logic |
| `routes.ts` | All API route definitions (2800+ lines) |
| `storage.ts` | Database access layer (Drizzle ORM) |
| `config.ts` | Configuration management |

### Authentication
| File | Purpose |
|------|---------|
| `replitAuth.ts` | Replit OAuth setup |
| `localAuth.ts` | Local email/password auth |
| `passwordUtils.ts` | bcrypt password hashing |

### AI Services (server/ai/)
| File | Purpose |
|------|---------|
| `claudeService.ts` | Claude API integration |
| `enrichmentService.ts` | Batch resource enrichment |
| `recommendationEngine.ts` | Personalized recommendations |
| `learningPathGenerator.ts` | AI learning path generation |
| `urlScraper.ts` | Web scraping (Cheerio) |
| `tagging.ts` | AI-powered tagging |

### GitHub Integration (server/github/)
| File | Purpose |
|------|---------|
| `syncService.ts` | Import/export orchestration |
| `formatter.ts` | Awesome-list markdown generation |
| `parser.ts` | Markdown parsing |
| `client.ts` | GitHub API client |
| `replitConnection.ts` | Replit GitHub connection |

### Validation (server/validation/)
| File | Purpose |
|------|---------|
| `awesomeLint.ts` | Awesome-lint validation |
| `linkChecker.ts` | URL link checking |

### Parsers
| File | Purpose |
|------|---------|
| `parser.ts` | Generic awesome-list parser |
| `awesome-video-parser.ts` | Video-specific parser |
| `awesome-video-parser-clean.ts` | Clean parser version |

### Database
| File | Purpose |
|------|---------|
| `db/index.ts` | Drizzle database connection |
| `seed.ts` | Database seeding logic |

## Shared (shared/)

| File | Purpose |
|------|---------|
| `schema.ts` | Drizzle schema, Zod schemas, types |
| `categoryMapping.ts` | Category slug mappings |

## Scripts (scripts/)

| File | Purpose |
|------|---------|
| `build-static.ts` | Static build generation |
| `reset-admin-password.ts` | Admin password reset |
| `test-awesome-lint.ts` | Lint validation testing |
| `fix-all-critical-bugs.ts` | Bug fix utilities |
| `migrate-audit-log-original-resource-id.ts` | Database migration |

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `vite.config.ts` | Vite build configuration |
| `tailwind.config.ts` | Tailwind CSS configuration |
| `drizzle.config.ts` | Drizzle ORM configuration |
| `replit.md` | Project documentation |

## Feature Location Quick Reference

### Authentication
- OAuth: `server/replitAuth.ts`
- Local: `server/localAuth.ts`
- Frontend: `client/src/hooks/use-auth.tsx`
- Login page: `client/src/pages/Login.tsx`

### Resource CRUD
- API: `server/routes.ts` (lines 377-568)
- Storage: `server/storage.ts`
- Frontend: `client/src/pages/Category.tsx`, `ResourceDetail.tsx`

### Admin Panel
- API: `server/routes.ts` (lines 1059-2527)
- Frontend: `client/src/pages/AdminDashboard.tsx`

### Search
- Frontend: `client/src/components/SearchCommand.tsx`
- Uses Fuse.js for fuzzy search

### GitHub Sync
- Service: `server/github/syncService.ts`
- API: `server/routes.ts` (lines 1888-2053)
- Formatter: `server/github/formatter.ts`

### AI Features
- Claude: `server/ai/claudeService.ts`
- Enrichment: `server/ai/enrichmentService.ts`
- API: `server/routes.ts` (lines 1407-1434, 2418-2527)

### Validation
- awesome-lint: `server/validation/awesomeLint.ts`
- Link checker: `server/validation/linkChecker.ts`
- API: `server/routes.ts` (lines 2207-2326)

### Categories
- Schema: `shared/schema.ts`
- API: `server/routes.ts` (lines 570-1571)
- Sidebar: `client/src/components/layout/Sidebar.tsx`

### User Features
- Bookmarks: `server/routes.ts` (lines 694-735)
- Favorites: `server/routes.ts` (lines 654-693)
- Progress: `server/routes.ts` (lines 737-862)

### Learning Journeys
- API: `server/routes.ts` (lines 891-1057)
- Pages: `client/src/pages/Journeys.tsx`, `JourneyDetail.tsx`

## Database Tables

All defined in `shared/schema.ts`:
- `users` - User accounts
- `resources` - Main resources
- `categories` - Top-level categories
- `subcategories` - Second-level categories
- `subSubcategories` - Third-level categories
- `resourceEdits` - Edit suggestions
- `resourceAuditLog` - Audit trail
- `learningJourneys` - Learning paths
- `journeySteps` - Journey steps
- `userJourneyProgress` - User progress
- `favorites` - User favorites
- `bookmarks` - User bookmarks
- `tags` - Resource tags
- `resourceTags` - Tag associations
- `githubSyncQueue` - Sync queue
- `syncHistory` - Sync history
- `enrichmentJobs` - AI enrichment jobs
