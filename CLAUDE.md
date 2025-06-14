# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static site generator that transforms GitHub "awesome lists" into SEO-optimized websites. Currently configured for "Awesome Video" - a curated collection of video-related tools and resources.

## Essential Commands

```bash
# Development
npm install          # Install dependencies
npm run dev         # Start dev server (http://localhost:5001)

# Build & Deploy
npm run build       # Build client and server
npx tsx scripts/deploy-simple.ts  # Deploy to GitHub Pages

# Configuration
npx tsx scripts/setup-wizard.ts   # Interactive setup
```

## Architecture

### Core Structure
- **client/**: React app with Vite, TypeScript, TailwindCSS, and Shadcn/ui components
- **server/**: Express backend for development features (AI tagging, parsing)
- **scripts/**: Deployment and configuration utilities
- **client/public/data/**: JSON data files for the awesome list content

### Key Technologies
- React 18.3 + Vite 5.4 for fast development
- TypeScript for type safety
- Shadcn/ui (Radix UI) for component library
- Wouter for routing
- Tanstack Query for data fetching
- Framer Motion for animations

### Data Flow
1. Awesome list data stored in `client/public/data/` as JSON
2. Client fetches data via Tanstack Query
3. Components render with search, filtering, and categorization
4. Builds to static files for GitHub Pages deployment

### Configuration
Main config: `awesome-list.config.yaml`
- Site metadata (title, description, theme)
- Analytics settings
- Deployment configuration

## Data Format Compatibility

The parser (`client/src/lib/parser.ts`) handles two data formats:

1. **API Format** (from development server):
   - `resources` array
   - `category` as string
   - `url` field for links

2. **Static Format** (from JSON files):
   - `projects` array
   - `category` as array (uses first element)
   - `homepage` field for links

## Development Guidelines

### Port Configuration
- Development server runs on port 5001 (changed from 5000 to avoid conflicts)
- Static preview server runs on port 8080

### Adding Features
- Components go in `client/src/components/`
- Use existing Shadcn/ui components when possible
- Follow TypeScript types in `client/src/types/`

### Building for Production
```bash
npm run build
cp client/public/data/* dist/public/data/  # Copy data files
```

### Testing Static Site Locally
```bash
npx serve dist/public -p 8080 -s  # Serve with SPA mode
```

### Deployment
The site deploys to GitHub Pages via:
1. Build process creates static files
2. GitHub Actions workflow handles deployment
3. Analytics automatically integrated if configured

### Common Issues & Fixes
1. **Parser errors**: Check data format (API vs static)
2. **Missing resources**: Ensure flat `resources` array exists in AwesomeList
3. **Category issues**: Handle both string and array formats
4. **Port conflicts**: Dev server uses 5001, static preview uses 8080

### Testing Changes
Always verify:
1. `npm run build` succeeds
2. No TypeScript errors (`npm run check`)
3. Dev server works at http://localhost:5001
4. Static build works: `cd dist/public && python -m http.server 8080`
5. Both show the same content and functionality

## Recent Refactoring (December 2024)

### Removed Dependencies (28 total)
- Authentication packages (passport, express-session)
- Database packages (@neondatabase/serverless, connect-pg-simple)
- Next.js and related packages
- Unused utilities (date-fns, react-icons, ws, openai)

### Removed Components (21 total)
- Unused Shadcn/ui components (calendar, carousel, table, etc.)
- Legacy SidebarNav component

### Cleanup Performed
- Removed old documentation files (moved essential docs to README and CLAUDE.md)
- Removed backup directories and temporary files
- Simplified GitHub Actions to single `deploy.yml` workflow
- Removed redundant deployment scripts

### Current Structure
- Minimal dependencies focused on core functionality
- Clean component library with only used components
- Single, reliable deployment workflow
- Clear documentation in README.md and CLAUDE.md