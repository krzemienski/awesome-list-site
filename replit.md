# Awesome Video Resource Viewer

## Overview

A production-ready React application for browsing and discovering over 2,600 curated video development resources. The project uses PostgreSQL as the single source of truth for all data, providing a modern, mobile-optimized user interface with advanced search and filtering capabilities, dark theme support, and Google Analytics tracking. Features include AI-powered learning platform capabilities, user authentication, admin panel, and bidirectional GitHub synchronization for `awesome-list` repositories. The business vision is to create a leading platform for video development education and resource discovery, leveraging AI for personalized learning paths and an engaged community.

**Production Status**: ✅ Production-ready as of December 4, 2025. All critical bugs fixed, database integrity verified (0 orphaned resources), comprehensive error handling implemented.

## Recent Changes

### Editorial + Crimson — Pixel-Perfect Alignment to Claude Design Handoff (May 19, 2026)
- **Audit vs `/tmp/handoff/.../uploads/01..21.png`**: identified that WP-4 over-applied Fraunces italic eyebrows/hero accents to Home/About/Login, while the reference renders plain bold Inter for all page headings (Editorial is a token system only).
- **Home (`Home.tsx`)**: removed `// Indexed · Atlas` eyebrow + giant Fraunces italic "awesome.video" hero; replaced numbered `<ol>` row list with 3×3 `<Card>` grid (icon + count badge + plain bold title + 1-line description preview). Added empty-state card with "Clear filters" CTA when `filteredCategories` is empty. AI Recommendations heading switched to plain bold Inter.
- **About (`About.tsx`)**: removed `// About the project` eyebrow + Fraunces italic "About **Awesome Video**"; now plain bold "About" h1 with crimson Sparkles icon. Stripped `font-display font-medium tracking-tight` from all five section `CardTitle`s.
- **Login (`Login.tsx`)**: removed `// Authentication` eyebrow + Fraunces italic "Welcome **back**"; now plain bold "Welcome back" centered. Default-admin block rebuilt as plain tiny text under separator (was an eyebrow-styled surface card).
- **Sidebar brand (`AppSidebar.tsx:129`)**: `font-display text-base font-medium tracking-tight` → `font-sans text-sm font-semibold tracking-tight` (plain bold Inter per reference).
- **Theme Settings (`ThemeSettings.tsx`)**: full rebuild from 10-accent token swatch picker → Font picker (6 fonts: Inter / DM Sans / Source Sans 3 / IBM Plex Sans / JetBrains Mono / System Default, each with live sample-text preview) + Color Theme picker (6 presets: Cyberpunk / Limes / Black & Pink / Flat Pink / Purples / Flat Purples, each with primary/secondary/accent swatch row). Both grids properly wrapped in `role="radiogroup"` with aria-labels.
- **theme-provider re-wiring (`theme-provider.tsx`)**: re-enabled `applyFont(activeFont)` effect (writes `--font-sans` globally). Added scoped accent applier effect that writes ONLY `--accent` and `--accent-2` from `activeTheme.dark.primary` — Editorial atmosphere (bg, surface ladder, text ladder, radii, shadows) stays locked. Default theme remains `cyberpunk` per existing localStorage key, but only its primary color leaks into the DS layer.

### Editorial + Crimson Design System — WP-3 Layout/Header/Sidebar + WP-4 Pages (May 19, 2026)
- **WP-3 Layout/Header/Sidebar**: `AppHeader.tsx` — search trigger now a `rounded-lg` surface chip with crimson-tinted hover/focus border + eyebrow-styled `kbd`; header bg uses `color-mix(var(--bg) 85%)` for blur+transparency; breadcrumb map switched from `Fragment` to `flatMap` to eliminate the Replit dev-injector `data-replit-metadata` warning; `Fragment` import removed. `AppSidebar.tsx` — brand "Awesome Video" rendered in Fraunces `font-display font-medium tracking-tight`; resource count line uses mono eyebrow styling; both `SidebarGroupLabel`s adopt the `.eyebrow` class (mono 11px / 0.18em / crimson). `MainLayout` already correct from WP-1.
- **WP-4 Pages (Home / About / Login)**:
  - **`Home.tsx`** — added `// Index` eyebrow + Fraunces h1 with crimson italic "Video" accent word; removed manual hover/border/bg classes on category cards (DS Card already provides it); category title now Fraunces tracking-tight; count badge switched from `secondary` to new `chip` variant (mono uppercase 10px tracked); AI section heading rebuilt as eyebrow + Fraunces h2 with crimson italic "AI"; all secondary text moved to `var(--text-2)`.
  - **`About.tsx`** — hero rebuilt with eyebrow + Fraunces h1 + crimson italic "Awesome Video"; removed five `border-{primary,accent}/20` overrides (DS handles borders); all five section `CardTitle`s adopt `font-display font-medium tracking-tight` + crimson section icons.
  - **`Login.tsx`** — removed `bg-gradient-to-br from-background via-background to-muted` wrapper (was double-painting on top of `MainLayout`'s radial atmosphere); switched logo halo to `color-mix(var(--accent) 12%)` bg with crimson ring; added `// Authentication` eyebrow + Fraunces title with crimson italic "back"; separator label switched to mono 0.18em tracked; default-credentials block rebuilt as a real surface card (`var(--surface)` bg + `var(--border)` + `rounded-[var(--radius-sm)]`) instead of bare text on background.
- **Fetch hardening (mobile reliability)**: `client/src/lib/static-data.ts` `fetchStaticAwesomeList` rewritten with `AbortController`-backed 45s timeout, 1 retry with linear backoff, explicit `credentials: 'same-origin'`, and a typed error message that surfaces the actual failure cause (`HTTP <status>`, `request timed out after Ns`, or content-type mismatch). Replaces Safari's opaque `"Load failed"` on flaky mobile networks with an actionable error in the existing ErrorPage card.

### Editorial + Crimson Design System — WP-2 Primitives (May 19, 2026)
- **Scope**: token-mapped shadcn primitives already pick up Editorial colors/radii via the bridge in `client/src/index.css @theme inline`; WP-2 adds Editorial-specific micro-behaviors per DS_SPEC §primitives without scope-creeping into per-call rewrites.
- **Card** (`client/src/components/ui/card.tsx`): default class now `shadow-[var(--shadow-sm)] transition-[...] duration-[var(--motion-base)] ease-[var(--motion-ease)] hover:border-[var(--border-strong)]` — soft DS shadow + 240ms hover border-lift.
- **Input** (`client/src/components/ui/input.tsx`): `bg-background` → `bg-[var(--surface)]` (warm-ink alpha tint), added `transition-colors duration-[var(--motion-fast)]`, `hover:border-[var(--border-strong)]`, `focus-visible:border-[color-mix(in_srgb,var(--accent)_60%,transparent)]` for crimson-tinted focus.
- **Select trigger** (`client/src/components/ui/select.tsx`): same surface + crimson-focus treatment as Input; added missing `rounded-lg` (was square in source).
- **Dialog** (`client/src/components/ui/dialog.tsx`): now uses `rounded-[var(--radius)]` (12px Editorial), `bg-popover` (was `bg-background`), `shadow-[var(--shadow-lg)]` (Editorial soft 60px falloff).
- **Tabs** (`client/src/components/ui/tabs.tsx`): `TabsList` rebuilt as a `rounded-full` pill on `var(--surface)` with hairline border; `TabsTrigger` active state = `bg-[var(--surface-3)]` + `text-[var(--accent)]` crimson ink + soft shadow — Editorial pill-tab aesthetic.
- **Badge** (`client/src/components/ui/badge.tsx`): added two new variants per DS chip contract — `chip` (mono uppercase 10px tracking 0.12em on `var(--surface)` with text-2) and `accent` (crimson-tinted variant for hot chips). Existing `default/secondary/destructive/outline` variants unchanged; no breaking changes to call sites.
- **Button** intentionally untouched — its variants already resolve Editorial through `bg-primary`/`border-input`/`rounded-lg` via the token bridge; per DS_SPEC the only required behaviors (44px touch target, hover bg-primary/90, active translateY) are already present.

### Editorial + Crimson Design System — WP-1 Foundations (May 19, 2026)
- **Scope locked**: applying Claude Design Editorial personality with Crimson accent only (single personality, no switcher).
- **Token swap**: `client/src/styles/design-system.css` `:root` now carries Editorial values — warm-ink alpha surfaces on near-black, `#f4f3ee` text ladder, `#ff3d52` crimson accent, Fraunces (serif display) / Inter (body) / JetBrains Mono (code), 12px / 8px / 999px radius ladder, soft drop shadows, radial-gradient page atmosphere, SVG grain overlay at 0.32 opacity.
- **Boot lock**: `client/index.html` boot script sets `<html data-system="editorial" data-accent="crimson">` before any module paints; Google Fonts link now loads Fraunces + Inter + JetBrains Mono.
- **Runtime applier neutralized**: `client/src/lib/design-system.ts` previously pushed inline `style.setProperty('--bg', '#000')` etc. on `documentElement` at boot (Terminal values), which silently overrode the CSS layer. The self-init block is now a globals-only registration; `applyDesignSystem()` remains callable but isn't invoked at boot. `DESIGN_SYSTEMS` map now contains the Editorial config.
- **Shadcn radius re-wired**: `client/src/index.css` `@theme inline` radius keys un-collapsed from `0` to the Editorial 8/12 px ladder so `rounded-*`, `<Card>`, `<Input>`, `<Dialog>` automatically pick up Editorial geometry without per-call class overrides.
- **Atmosphere overlay**: `client/src/components/layout/new/MainLayout.tsx` now mounts a fixed `<div class="grain" />` overlay (`aria-hidden`, `pointer-events: none`).
- **Legacy theme-provider effects disabled**: `client/src/components/ui/theme-provider.tsx` had two `useEffect`s that called `applyTheme(activeTheme)` and `applyFont(activeFont)` whenever `data-system !== 'terminal'` — i.e. exactly in our new Editorial mode. Those effects wrote inline CSS variables (`--font-sans`, `--radius`, theme color set) onto `documentElement`, silently overriding the DS layer. Both effects are now permanent no-ops; React state is preserved for the deferred /settings/theme picker UI.
- **Planning artifacts**: `_planning/{DS_SPEC,SITE_MAP,DELTA_CATALOG,REMEDIATION_PLAN}.md` capture the Editorial+Crimson contract, current site inventory, 82-item delta catalog, and 8-work-package remediation plan with per-gate evidence requirements.
- **Known issue (pre-existing, not migration-related)**: `AppHeader.tsx:75` uses `<Fragment>` inside a `.map()`; Replit's dev injector adds `data-replit-metadata` to those Fragments, producing a React warning. Tracked for a follow-up cleanup pass.

### Admin Panel Audit – Remaining Tabs (May 2, 2026)
- **Removed broken Research tab** from `client/src/pages/AdminDashboard.tsx`. `CostDashboard` + `ResearchPanel` were calling `/api/research/*` endpoints that were never wired up in `server/routes.ts` (the active routes file). The working `Researcher` tab (different component, hits `/api/researcher/*`) remains.
- **Deleted dead client code**: removed entire `client/src/components/admin/research/` directory (CostDashboard, ResearchPanel, JobMonitor, ReportViewer, ResearchDashboard, ResearchJobsTable, etc.) — nothing else imported it.
- **Removed duplicate / dead server route trees**: `server/routes.ts` is the only registered route surface. Deleted `server/routes/` directory (parallel modular files including duplicate `routes/admin/enrichment.ts`) and `server/modules/` directory (parallel module-architecture files including duplicate `modules/enrichment/routes.ts` and `modules/research/routes.ts`). None of these were imported anywhere.
- **Audit verified**: Categories, Subcategories, Sub-Subcategories, Export, Database, GitHub Sync, Link Health, Researcher, Pending Resources/Edits, AdminStats, Users, Audit tabs all hit endpoints that exist in `server/routes.ts` and respond with 401 (auth required) when called unauthenticated.
- **Fixed Resources tab bulk actions**: Added missing `POST /api/admin/resources/bulk/{approve,reject,delete}` endpoints in `server/routes.ts`. The `ResourceManager` UI was wired to call these but they were never implemented, so bulk approve/reject/delete buttons silently 200'd a Vite HTML page instead of mutating data.

### Deployment Fix & Re-Audit (February 2, 2026)
- **Deployment Migration Fix**: Enhanced `server/index.ts` migration handling with:
  - Multi-path search for migrations folder
  - Fail-fast verification when migrations missing - checks if database schema exists
  - More precise PostgreSQL error handling (42P07 for "already exists")
- **Generated Migrations**: Created proper Drizzle migrations with `meta/_journal.json`
- **Re-Audit Completed**: Full 291-item checklist verified
- **All Tests Passing**: API endpoints, database integrity, frontend UI, responsive design
- **Current Data**: 9 categories, 19 subcategories, 32 sub-subcategories, 1949 resources

### Comprehensive Testing Audit (February 1, 2026)
- **Testing Scope**: 150+ individual test steps executed across all functionality
- **Bug Fix**: Updated `isDbResource()` in Category.tsx to handle `db-` prefixed IDs correctly
- **Security Testing**: SQL injection and XSS protection verified
- **API Testing**: 15+ endpoints tested with authenticated and unauthenticated requests
- **UI Testing**: All three screen sizes (400px, 768px, 1280px) verified
- **Admin Panel**: All 11 tabs verified functional
- **Database Integrity**: 0 orphaned resources, 1949 approved resources
- **Feature Gap Identified**: SubSubcategory/Subcategory pages missing edit buttons
- **Documentation**: Created comprehensive ISSUES-FOUND.md with all test results

### Awesome-Lint Compliance Fixes (January 21, 2026)
- **Major Export Overhaul**: Reduced awesome-lint errors from 191+ to just 2 (unavoidable structural requirements)
- **Badge Placement**: Badge now on same line as main heading per awesome-lint spec
- **ToC Anchor Generation**: Fixed GitHub anchor format - "Community & Events" now correctly links to `#community--events`
- **URL Deduplication**: Now handles http/https and www/non-www variations
- **Description Sanitization**: 
  - Removes item name from description start (no-repeat-item-in-description)
  - Skips empty/punctuation-only descriptions (awesome-list-item compliance)
  - Handles underscore-containing tool names with "A " prefix for valid casing
- **Unicode Quote Handling**: Converts curly quotes to straight quotes using Unicode escape sequences
- **Spelling Corrections**: TensorFlow, CentOS, macOS, WebAssembly, FFmpeg, WebRTC, OpenAI, etc.
- **Lowercase Starter Preservation**: macOS, npm, webpack, iOS terms preserved when starting descriptions
- **Remaining 2 Errors**: awesome-contributing (requires CONTRIBUTING.md) and awesome-github (requires git repo) - expected for standalone exports

### Production Readiness Audit (January 28, 2026)
- **Repository Cleanup**: Removed 263MB+ of dead weight (client/my-app/, test screenshots, 90+ obsolete test scripts)
- **Documentation Suite**: Created comprehensive documentation in /docs:
  - ARCHITECTURE.md - System design and data flows
  - API.md - Complete API reference (75+ endpoints)
  - SETUP.md - Development environment guide
  - ADMIN-GUIDE.md - Administrator documentation
  - CODE-MAP.md - Codebase navigation guide
  - CONTRIBUTING.md - Contribution guidelines
- **README Overhaul**: Updated with accurate feature list, documentation links, and quick start
- **Essential Scripts Retained**: build-static.ts, reset-admin-password.ts, test-awesome-lint.ts, migrate-audit-log-original-resource-id.ts
- **File Count**: Reduced from 2,517 to 216 essential project files (excluding node_modules, .git, .cache, .config)
- **Size Reduction**: From 619MB to 2.7MB of project code (excluding dependencies)
- **Removed**: 740 test screenshots, 142 attached_assets, obsolete test reports, unused parsers, stale build artifacts

### Resource Details Page Implementation (January 28, 2026)
- **Comprehensive Resource Details Page**: New `/resource/:id` route displays full resource information including OG images, favicon, tags, scraped metadata, related resources, and share functionality
- **Dual Navigation System**: Database resources (numeric IDs) navigate to details page; static resources open external links in new tab
- **Navigation Bug Fix**: Fixed `isDbResource()` check in Category.tsx - was incorrectly looking for `db-` prefix, now correctly detects numeric IDs
- **Universal Suggest Edit**: SuggestEditDialog now works for all users - authenticated users see edit form, unauthenticated users see login prompt with redirect
- **Share Functionality**: Web Share API with clipboard fallback and error handling
- **Responsive Design**: Tested across desktop (1280x720), tablet (768x1024), and mobile (400x720) with WCAG AAA touch targets

### Feature Updates (January 22, 2026)
- **Suggest Edit on Category Page**: Added suggest edit buttons to all three view modes (grid, list, compact) on the Category page. Edit buttons only appear for authenticated users and database-backed resources (id starts with "db-"). Clicking the edit button opens the SuggestEditDialog modal without triggering resource link navigation.

### Feature Updates (January 20, 2026)
- **View Mode Toggle**: Added three content card view modes (grid, list, compact) using ShadCN ToggleGroup component in the Category page
- **JSON Export Endpoint**: Added `GET /api/admin/export-json` for full database backup including all resources (all statuses), users, category hierarchies, tags, learning journeys, and sync queue with schema documentation
- **Tag Filtering Fix**: Fixed tag filtering by transforming resources to include `tags` at root level (extracted from `metadata.tags`) for frontend compatibility
- **GitHub Import Improvements**: 
  - Added category hierarchy database integration with `ensureCategoryHierarchy()` function
  - Resources now store hierarchy IDs (categoryId, subcategoryId, subSubcategoryId) in metadata
  - Update path also populates hierarchy IDs for consistency

### Bug Fixes (December 4, 2025)
- **Bug #8 - Duplicate Slug Validation**: Fixed duplicate slug error handling to return proper 409 Conflict status code instead of 500 Internal Server Error. Applied to categories, subcategories, and sub-subcategories. Users now see clear error messages: "Category with slug 'X' already exists".

### System Health Check
- **Database Integrity**: 0 orphaned resources (100% data integrity maintained)
- **Active Constraints**: 7 UNIQUE and FOREIGN KEY constraints properly enforced
- **Current Data**: 9 categories, 19 subcategories, 32 sub-subcategories, 1,949 approved resources, 3 users
- **API Status**: All endpoints responding correctly (authentication, awesome-list, admin)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application employs a client-server architecture. The frontend is a React-based single-page application built with Vite, utilizing `shadcn/ui` components, Tailwind CSS, and React Query for data fetching. The backend is an Express.js server providing RESTful API endpoints. Data is stored in a PostgreSQL database using Drizzle ORM, with a defined schema for resources, categories, and subcategories.

### UI/UX Decisions
- **Pure black cyberpunk theme**: Dark mode only, using OKLCH color space with vivid neon accents (pink primary, cyan accent). No shadows, no rounded corners, pure terminal aesthetic.
- JetBrains Mono monospace font used throughout.
- Zero border-radius enforced (`--radius: 0rem`).
- Mobile-optimized responsive design with WCAG AAA compliant 44x44px touch targets and a collapsible hierarchical sidebar.

### Technical Implementations
- **Frontend**: React 18+ with TypeScript, Vite, Tailwind CSS, `shadcn/ui`, React Query for state management, Wouter for routing.
- **Backend**: Express.js, Drizzle ORM, Node Fetch for external data, Remark for Markdown parsing.
- **Data Architecture**: PostgreSQL database serves as single source of truth. `getAwesomeListFromDatabase()` method builds complete hierarchical structure from database tables (categories → subcategories → sub-subcategories with LEFT JOINs). Supports 3-level hierarchy with accurate resource counts at each level.
- **Sidebar Layout**: CSS Grid-based layout on desktop (`grid-cols-[var(--sidebar-width)_1fr]`), dynamically adjusting when collapsed.
- **Deployment**: Configured for deployment on Replit, with optimized production builds. Database must be seeded for production (`/api/admin/seed-database`).

### Feature Specifications
- **Search & Discovery**: Advanced fuzzy search across all resources with keyboard shortcut (⌘K), powered by Fuse.js.
- **AI Recommendations**: Personalized resource recommendations based on user profiles, skill levels, and learning goals (planned).
- **Authentication System**: Supports dual authentication via Replit Auth (GitHub, Google, Apple, X) and local email/password for development/admin, with secure session management and bcrypt hashing.
- **GitHub Integration**: Implemented GitHub import system for fetching raw resource URLs from public repositories, and an export system leveraging Replit GitHub OAuth to commit `awesome-lint` compliant markdown directly to GitHub.
- **Batch Enrichment System**: Claude AI integration for automated metadata extraction from resources. Features include sequential processing with configurable batch sizes, rate limiting, smart URL validation, retry logic, accurate tracking, and a dedicated admin UI for monitoring and control. Integrated web scraping extracts page metadata (title, description, Open Graph images, Twitter Cards, favicon) using Cheerio with proper error handling for missing meta tags.

## External Dependencies

### Frontend
- React ecosystem (React, React DOM)
- TanStack Query (React Query v5)
- shadcn/ui components
- Tailwind CSS
- Lucide icons

### Backend
- Express.js
- Drizzle ORM
- Node Fetch
- Remark

### Development
- TypeScript
- Vite
- ESBuild
- TSX (TypeScript execute)