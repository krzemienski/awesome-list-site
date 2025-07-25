# Awesome List Static Site Generator

## Overview

This is a sophisticated static site generator that transforms GitHub "awesome lists" into beautiful, SEO-optimized websites. The application is currently configured for "Awesome Video" - a curated collection of video-related tools and resources. The system provides a modern, searchable interface with advanced features like analytics, theming, and deployment automation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18.3 with TypeScript for type safety and modern development
- **Build Tool**: Vite 5.4 for fast development and optimized builds
- **Styling**: TailwindCSS for utility-first styling with Shadcn/ui component library
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state and data fetching
- **Animations**: Framer Motion for smooth UI transitions

### Backend Architecture
- **Development Server**: Express.js for local development features
- **AI Integration**: Anthropic Claude API for intelligent resource tagging and categorization
- **Data Processing**: Custom parsers for awesome list markdown and JSON formats
- **Static Generation**: Build-time data processing for GitHub Pages deployment

### Data Storage Solutions
- **Database**: Drizzle ORM with PostgreSQL support (optional, with memory fallback)
- **Static Data**: JSON files in `client/public/data/` for production builds
- **Schema**: Defined in `shared/schema.ts` with proper TypeScript types

## Key Components

### Data Processing Pipeline
1. **Data Sources**: Supports both markdown parsing and direct JSON consumption
2. **Parser System**: Custom parsers for different awesome list formats
3. **AI Enhancement**: Optional AI-powered tagging and categorization using Anthropic Claude
4. **Static Generation**: Build-time data processing for optimized delivery

### User Interface Components
- **Search System**: Fuse.js-powered fuzzy search across all resources
- **Category Browser**: Hierarchical navigation with subcategory support
- **Resource Cards**: Multiple layout options (cards, list, compact)
- **Theme System**: Custom theme manager with Shadcn/ui theme variants
- **Analytics Dashboard**: Comprehensive usage tracking and metrics

### Deployment System
- **GitHub Actions**: Automated deployment workflows
- **Static Builds**: Optimized for GitHub Pages hosting
- **SEO Optimization**: Dynamic meta tags, sitemaps, and social sharing

## Data Flow

1. **Development Mode**:
   - Data fetched from GitHub APIs or local sources
   - Express server handles API requests and AI processing
   - Hot module replacement for fast development

2. **Production Build**:
   - Static data generation via `scripts/build-static.ts`
   - Vite builds optimized React application
   - Static files deployed to GitHub Pages

3. **User Interaction**:
   - Client-side routing with Wouter
   - TanStack Query manages data fetching and caching
   - Analytics tracking for user behavior insights

## External Dependencies

### Required Services
- **GitHub**: Source data from awesome list repositories
- **Anthropic Claude API**: AI-powered features (optional)
- **Google Analytics**: User behavior tracking (optional)

### Build Dependencies
- **Node.js**: Runtime environment
- **Vite**: Build tool and development server
- **TypeScript**: Type checking and compilation
- **PostCSS**: CSS processing with TailwindCSS

### Runtime Dependencies
- **Fuse.js**: Client-side search functionality
- **Framer Motion**: Animation library
- **React Query**: Data fetching and caching

## Deployment Strategy

### Development Workflow
1. Local development with `npm run dev`
2. Data fetching from APIs or static files
3. Hot module replacement for rapid iteration

### Production Deployment
1. **Data Generation**: Run `npx tsx scripts/build-static.ts` to fetch and process data
2. **Build Process**: `npm run build` creates optimized static files
3. **GitHub Pages**: Automated deployment via GitHub Actions
4. **CDN Distribution**: Static files served from GitHub's CDN

### Configuration Management
- **awesome-list.config.yaml**: Main configuration file
- **Environment Variables**: API keys and deployment settings
- **Build Scripts**: Automated setup and deployment tools

The architecture prioritizes performance, SEO, and maintainability while providing a rich user experience for browsing curated resources. The system supports both simple static deployments and advanced features like AI enhancement and analytics tracking.