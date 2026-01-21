# Awesome Video Resource Viewer

## Overview

A production-ready React application for browsing and discovering over 2,600 curated video development resources. The project uses PostgreSQL as the single source of truth for all data, providing a modern, mobile-optimized user interface with advanced search and filtering capabilities, dark theme support, and Google Analytics tracking. Features include AI-powered learning platform capabilities, user authentication, admin panel, and bidirectional GitHub synchronization for `awesome-list` repositories. The business vision is to create a leading platform for video development education and resource discovery, leveraging AI for personalized learning paths and an engaged community.

**Production Status**: ✅ Production-ready as of December 4, 2025. All critical bugs fixed, database integrity verified (0 orphaned resources), comprehensive error handling implemented.

## Recent Changes

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
- **Current Data**: 15 categories, 19 subcategories, 26 sub-subcategories, 2,614 resources, 3 users
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