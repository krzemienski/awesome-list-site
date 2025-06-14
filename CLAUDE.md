# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static site generator that transforms GitHub "awesome lists" into SEO-optimized websites. Currently configured for "Awesome Video" - a curated collection of video-related tools and resources.

## Essential Commands

```bash
# Development
npm install          # Install dependencies
npm run dev         # Start dev server (http://localhost:5000)

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

## Development Guidelines

### Adding Features
- Components go in `client/src/components/`
- Use existing Shadcn/ui components when possible
- Follow TypeScript types in `client/src/types/`

### Deployment
The site deploys to GitHub Pages via:
1. Build process creates static files
2. GitHub Actions workflow handles deployment
3. Analytics automatically integrated if configured

### Testing Changes
Always verify:
1. `npm run build` succeeds
2. No TypeScript errors
3. Site works at http://localhost:5000 in dev mode