# Awesome Video Resource Viewer

## Overview
This project is a production-ready React application designed for browsing and discovering over 2,600 curated video development resources. It features a modern, mobile-optimized user interface with advanced search and filtering capabilities, dark theme support, and Google Analytics tracking. The application uses PostgreSQL as the single source of truth for all data. Key capabilities include AI-powered learning platform features, user authentication, an admin panel, and bidirectional GitHub synchronization for `awesome-list` repositories. The ambition is to provide a comprehensive and intuitive platform for video development education and resource discovery.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application uses a client-server architecture. The frontend is a React-based single-page application built with Vite, leveraging `shadcn/ui` components, Tailwind CSS, and React Query. The backend is an Express.js server providing RESTful API endpoints. Data is stored in a PostgreSQL database using Drizzle ORM.

### UI/UX Decisions
- **Theme**: Pure black cyberpunk aesthetic using OKLCH color space with vivid neon accents (pink primary, cyan accent). Features a terminal-like design with no shadows or rounded corners.
- **Typography**: JetBrains Mono monospace font is used throughout.
- **Responsiveness**: Mobile-optimized design with WCAG AAA compliant 44x44px touch targets and a collapsible hierarchical sidebar.

### Technical Implementations
- **Frontend**: React 18+ with TypeScript, Vite, Tailwind CSS, `shadcn/ui`, React Query for state management, and Wouter for routing.
- **Backend**: Express.js, Drizzle ORM, Node Fetch for external data, and Remark for Markdown parsing.
- **Data Architecture**: PostgreSQL is the single source of truth. A `getAwesomeListFromDatabase()` method constructs a complete hierarchical data structure from database tables (categories → subcategories → sub-subcategories) with accurate resource counts.
- **Deployment**: Optimized for deployment on Replit, with production builds requiring database seeding via `/api/admin/seed-database`.

### Feature Specifications
- **Search & Discovery**: Advanced fuzzy search across all resources via Fuse.js, accessible with a keyboard shortcut (⌘K).
- **Hierarchical Navigation**: A 3-level category structure with accurate aggregated resource counts for intuitive browsing.
- **Authentication**: Supports dual authentication via Replit Auth (GitHub, Google, Apple, X) and local email/password for admin access, with secure session management and bcrypt hashing.
- **GitHub Integration**: Includes a system for importing raw resource URLs from public GitHub repositories and an export system leveraging Replit GitHub OAuth to commit `awesome-lint` compliant markdown.
- **Batch Enrichment System**: Integrates Claude AI for automated metadata extraction from resources, featuring sequential processing, configurable batch sizes, rate limiting, URL validation, retry logic, and an admin UI for monitoring. Web scraping via Cheerio extracts page metadata (title, description, Open Graph images, Twitter Cards, favicon).

## External Dependencies

### Frontend
- React
- TanStack Query (React Query v5)
- shadcn/ui
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
- TSX