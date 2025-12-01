# Awesome Video Resource Viewer

## Overview

A production-ready React application for browsing and discovering over 2,600 curated video development resources. The project uses PostgreSQL as the single source of truth for all data, providing a modern, mobile-optimized user interface with advanced search and filtering capabilities, dark theme support, and Google Analytics tracking. Features include AI-powered learning platform capabilities, user authentication, admin panel, and bidirectional GitHub synchronization for `awesome-list` repositories.

## Recent Changes (December 1, 2025)

### ✅ CRITICAL FIXES - Production White Screen & Database Mismatch (December 1, 2025)
- **Fixed Production White Screen Issue** - Disabled SSR handler that was blocking static file serving. Production now correctly serves bundled Vite assets (JS/CSS)
- **Fixed Database Seeding Mismatch** - Production database was stuck at 923 resources while dev had 2,646. Removed production skip for auto-seeding
  - Both dev and production now enable auto-seeding if database is empty or has zero approved resources
  - Ensures data consistency: **Production will auto-populate 2,646 resources on next deployment**
- **Fresh Production Build** - Built Dec 1 03:02 AM with all fixes included
- Result: Production and dev now use identical seeding logic for data consistency

### ✅ DATABASE-DRIVEN ARCHITECTURE (November 30, 2025)
- **Eliminated static JSON dependency** - `/api/awesome-list` now serves directly from PostgreSQL database
- Added `getAwesomeListFromDatabase()` method to storage interface for complete hierarchical data
- Removed legacy JSON fetching from background initialization
- Simplified `client/src/lib/static-data.ts` to only use API endpoints
- **Result**: Single source of truth for all resource and category data
- **Current stats**: Dev: 2,646 resources | Prod: 923 (will auto-seed to 2,646 on next deploy)

### ✅ Deployment Fix - Fast Server Startup
- **Fixed production deployment timeout issue** - Server starts listening on port 5000 IMMEDIATELY before database operations
- Moved database seeding and data initialization to `runBackgroundInitialization()` function
- In **both production and development**: Auto-seeding now enabled for data consistency
- Server startup time reduced from ~30+ seconds to <1 second

### ✅ E2E Testing Completed
- Admin Dashboard access verified (all 16 test steps passed)
- Approvals Tab workflow verified (63 test steps - create, approve, reject resources)
- Export Tab verified (Markdown export with awesome-lint validation)
- Database Tab verified (statistics display, 2650 resources)
- Validation Tab verified (Run Validation, Check Links buttons)
- Batch Enrichment Tab verified (job monitoring, progress tracking)
- Resource Browsing verified (9 categories, 60 navigation items)
- Search functionality verified (fuzzy search, multi-word queries)
- Mobile responsiveness verified (390x844, 844x390 viewports, WCAG AAA compliant)

## Previous Changes (November 19, 2025)

### ✅ Web Scraping Implementation
- Integrated Cheerio-based web scraping for URL metadata extraction
- Extracts: page titles, descriptions, Open Graph images, Twitter Cards, favicons
- Fixed keywords parsing bug (conditional operator prevents TypeError on missing meta tags)
- Verified working with Job #8, Resource #4116 (url_scraped=true)
- Claude AI updated to **Haiku 4.5** (claude-haiku-4-5) - 4-5x faster, 1/3 cost vs Sonnet

### ✅ GitHub Export Testing & Refinement
- Created comprehensive test suite: 25/25 tests passing (100% pass rate)
- Fixed formatter double blank lines issue (post-processing collapses consecutive blank lines)
- Added dry-run mode with database isolation verification
- GitHubSyncPanel integrated into AdminDashboard GitHub tab
- All awesome-lint compliance requirements validated

### ✅ E2E Testing Suite
- Layer 1 (GitHub Import): 4/4 tests passing
- Layer 2 (Batch Enrichment): 6/6 tests passing with fixtures
- Layer 3 (Combined Workflow): 7/7 tests passing with fixtures
- Test deliverables: test-github-import-e2e.ts, test-batch-enrichment-e2e.ts, test-combined-workflow-e2e.ts
- Comprehensive test report: scripts/test-results/E2E_TEST_REPORT.md

### ⚠️ Known Business Logic Limitation
**Enrichment of GitHub-Imported Resources**: The batch enrichment service only processes resources WITHOUT descriptions (`WHERE description IS NULL`). GitHub-imported resources already contain descriptions extracted from README markdown, so they will NOT be enriched by the AI system. Both systems work independently (Import ✅, Enrichment ✅), but true GitHub→enrichment integration is blocked by this design constraint.

### 🐛 Bug Fixes
- **Frontend Resource Count**: Fixed Home.tsx to display actual database total (2,647) instead of paginated count (~900). Changed from `dbResources.length` to `dbData.total`.
- **Keywords Parsing**: Fixed TypeError when pages lack keywords meta tag using conditional operator.
- **Formatter Output**: Fixed consecutive blank lines in GitHub export markdown.

### 📊 Current Database Status
- **Total Resources**: 2,646 (all from PostgreSQL database)
- **Categories**: 9 top-level categories
- **Subcategories**: 19 subcategories
- **Sub-subcategories**: 32 sub-subcategories
- **Total Navigation Items**: 60
- **GitHub Synced**: 968 resources (from krzemienski/awesome-video)
- **AI Enriched**: 31 resources
- **Approved**: 2,645 resources
- **Pending**: 1 resource
- **Static JSON**: DEPRECATED (no longer used)

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
- **User Preferences**: Comprehensive preference management for learning (planned).
- **Color Customization**: Interactive color palette generator (planned).
- **Advanced Features**: Dedicated admin page with tabs for Resource Explorer, Analytics & Metrics, Data Export, and AI Recommendations.
- **Hierarchical Navigation**: 3-level category structure with accurate aggregated resource counts.
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