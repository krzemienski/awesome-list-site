# Awesome List Viewer Application

## Overview

This is a full-stack web application that displays curated resources from GitHub's "Awesome" lists. It features a React frontend with Tailwind CSS and shadcn/ui components, and a Node.js/Express backend. The application uses Drizzle ORM for database operations and follows a modern architecture with shared schemas between frontend and backend.

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

## Current Status

✅ **Data Processing**: Successfully fetches and processes 2011 authentic awesome-video resources from GitHub JSON source
✅ **GitHub Actions Deployment**: Automated deployment pipeline configured for GitHub Pages at krzemienski.github.io/awesome-list-site
✅ **Configuration**: Complete site configuration with Google Analytics (G-383541848) and customizable themes
✅ **Build System**: Streamlined build process that generates static data and deploys automatically
✅ **Import Path Resolution**: Fixed complex import path issues that were blocking production builds

## Deployment Architecture

- **Source Data**: krzemienski/awesome-video repository (JSON format, 2011 resources)
- **Deployment Target**: krzemienski.github.io/awesome-list-site
- **Build Process**: GitHub Actions automatically fetches data, builds static site, and deploys to GitHub Pages
- **Analytics**: Google Analytics 4 integration for tracking user interactions
- **Theme**: Dark theme with red accent color (#dc2626)

## Recent Changes (January 14, 2025)

✓ **Project Structure Cleanup**: Removed all deprecated GitHub Actions workflows and build scripts
✓ **Single Deployment Workflow**: Created `deploy-clean.yml` as the only deployment method
✓ **Documentation Updates**: Updated README.md with clear deployment architecture and usage instructions
✓ **Simplified Build Process**: Eliminated complex React build dependencies in favor of static site generation
✓ **Zero Maintenance Deployment**: Automated GitHub Pages deployment with authentic data fetching
✓ **Clean Architecture**: Streamlined project structure focusing on core functionality