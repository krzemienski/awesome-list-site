# Awesome Video Resource Viewer

## Overview

A production-ready React application for browsing and discovering 2,000+ curated video development resources from the krzemienski/awesome-video GitHub repository. Features modern UI with dark theme, advanced search/filtering, mobile optimization, and Google Analytics tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a typical client-server architecture:

1. **Frontend**: React-based single-page application built with Vite, using shadcn/ui components, Tailwind CSS, and React Query for data fetching.

2. **Backend**: Express.js server that provides API endpoints for fetching and managing resources.

3. **Database**: Uses Drizzle ORM with PostgreSQL (currently configured but not fully implemented). The schema includes resources, categories, and subcategories.

4. **Integration**: The frontend communicates with the backend via RESTful API endpoints. The backend fetches and parses GitHub's Awesome list content.

## Key Components

### Frontend

- **React with TypeScript**: The frontend is built using React 18+ with TypeScript.
- **Vite**: Used for development server and build process.
- **Tailwind CSS**: Provides styling with utility classes.
- **shadcn/ui**: A collection of reusable UI components.
- **React Query**: Manages server state and data fetching.
- **Wouter**: Lightweight routing solution.
- **Theme System**: Supports light, dark, and system themes.

### Backend

- **Express.js**: Handles HTTP requests and API routes.
- **Drizzle ORM**: Type-safe database operations.
- **Node Fetch**: Used to fetch Awesome list content from GitHub.
- **Remark**: Markdown parser for processing GitHub content.

### Data Storage

- **PostgreSQL**: Database for storing resources, categories, and subcategories.
- **Drizzle Schema**: Defines database tables and relationships.
- **Data Models**: 
  - Resources (id, title, url, description, category, subcategory)
  - Categories (id, name, slug)
  - Subcategories (id, name, slug, categoryId)

## Data Flow

1. **Initialization**:
   - Server starts and attempts to fetch the Awesome list data from GitHub.
   - Parsed resources are stored in memory and can be persisted to the database.

2. **User Interaction**:
   - User visits the site and frontend makes API requests to the backend.
   - Backend responds with Awesome list data.
   - Resources can be filtered by category or subcategory.
   - Search functionality allows users to find specific resources.

3. **Data Management**:
   - Current implementation uses in-memory storage.
   - Database schema is defined but persistence is not fully implemented.

## External Dependencies

### Frontend Dependencies

- React ecosystem (React, React DOM)
- TanStack Query (React Query v5)
- shadcn/ui components (based on Radix UI primitives)
- Tailwind CSS
- Lucide icons
- Various UI libraries (Accordion, Dialog, Popover, etc.)

### Backend Dependencies

- Express.js
- Drizzle ORM
- Node Fetch
- Remark (Markdown parser)

### Development Dependencies

- TypeScript
- Vite
- ESBuild
- TSX (TypeScript execute)

## Deployment Strategy

The application is configured for deployment on Replit:

1. **Development Mode**:
   - `npm run dev` starts both server and client in development mode.
   - Vite provides hot module replacement for the frontend.

2. **Production Build**:
   - `npm run build` creates optimized production builds for both frontend and backend.
   - Frontend is built into static assets.
   - Backend is bundled with ESBuild.

3. **Database Setup**:
   - The application expects a PostgreSQL database and `DATABASE_URL` environment variable.
   - Drizzle migrations can be pushed with `npm run db:push`.

4. **Runtime**:
   - The production server serves both the API and static frontend assets.
   - The server listens on port 5000 by default.

## Production Status

### Completed Features
- ✅ Full React application with 2,011 video resources
- ✅ Advanced search and filtering by 55+ categories
- ✅ Mobile-optimized responsive design with dark theme
- ✅ Google Analytics integration (GA-383541848)
- ✅ GitHub Actions deployment pipeline
- ✅ Static site generation for GitHub Pages
- ✅ Analytics dashboard with resource insights
- ✅ Clean, consolidated codebase ready for deployment
- ✅ AI-powered personalized recommendation engine
- ✅ User preference management and learning profiles
- ✅ Intelligent learning path suggestions
- ✅ Content-based and collaborative filtering algorithms
- ✅ Interactive color palette generator with AI suggestions
- ✅ Mathematical color theory algorithms for harmonious palettes
- ✅ AI-powered color generation based on natural language descriptions
- ✅ Palette library with export capabilities and theme integration

### Repository Cleanup (January 2025)
- Removed development artifacts and debug files
- Consolidated deployment scripts to single build-static.ts
- Optimized GitHub Actions workflow for production
- Updated documentation and README for clarity
- Cleaned up package structure for production deployment

### UI Consistency Fixes (January 2025)
- ✅ Fixed layout inconsistencies between homepage and category pages
- ✅ Removed all react-helmet dependencies and replaced with SEOHead component
- ✅ Updated category and subcategory pages to use consistent MainLayout wrapper
- ✅ Ensured proper responsive design with space-y-6 layout patterns
- ✅ Standardized data fetching and state management across all pages
- ✅ Fixed mobile responsiveness with proper sidebar handling
- ✅ Applied rose theme consistently across all page types

### Hierarchical Navigation Fixes (January 2025)
- ✅ Reorganized media streaming technology hierarchy with proper logical structure
- ✅ Positioned FFMPEG as core infrastructure with encoding tools properly nested
- ✅ Consolidated VP9 and AV1 codecs under the main Codecs category as subcategories
- ✅ Merged duplicate Cloud & CDN categories into single consolidated category
- ✅ Implemented proper hierarchical ordering: Core Infrastructure → Streaming/Delivery → Players/Clients → Learning/Standards
- ✅ Fixed "reversed" category relationships so parent-child structure follows logical technology stack
- ✅ Added visual nesting with dots and proper indentation for subcategories

### AI-Powered Features (January 2025)
- ✅ Implemented AI Color Palette Generator with Anthropic Claude 4.0 Sonnet integration
- ✅ Created comprehensive color theory-based palette generation with accessibility standards
- ✅ Added user-customizable sidebar layout with drag-and-drop category reordering
- ✅ Built sidebar personalization settings with visibility controls and pinned categories
- ✅ Integrated palette export functionality (JSON, CSS variables) with copy-to-clipboard
- ✅ Added predefined prompt suggestions for quick palette generation
- ✅ Implemented comprehensive error handling and loading states for AI features

### Production-Ready Implementation (January 30, 2025)
- ✅ Both AI Color Palette Generator and Customizable Sidebar fully deployed and functional
- ✅ Fixed all navigation conflicts and ensured proper routing integration
- ✅ Color palette generator accessible at `/color-palette` route with full Claude 4.0 integration
- ✅ Sidebar customization available via gear icon with persistent localStorage settings
- ✅ All features tested and confirmed working with 2,011 video resources loaded

### Deployment Configuration
- Target: GitHub Pages at krzemienski.github.io/awesome-list-site
- Build process optimized for large React applications
- Static data generation from krzemienski/awesome-video JSON
- Memory optimizations for GitHub Actions environment