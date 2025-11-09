# Awesome Video Resource Viewer

## Overview

A production-ready React application for browsing and discovering over 2,000 curated video development resources from the `krzemienski/awesome-video` GitHub repository. The project aims to provide a modern, mobile-optimized user interface with advanced search and filtering capabilities, including dark theme support and Google Analytics tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application employs a client-server architecture. The frontend is a React-based single-page application built with Vite, utilizing `shadcn/ui` components, Tailwind CSS, and React Query for data fetching. The backend is an Express.js server providing RESTful API endpoints for resource management and data fetching. Data is stored in a PostgreSQL database using Drizzle ORM, with a defined schema for resources, categories, and subcategories.

### UI/UX Decisions
- **Pure black cyberpunk theme** - Dark mode only, using OKLCH color space with vivid neon accents:
  - Pure black background: oklch(0 0 0)
  - Vivid neon pink primary: oklch(0.7017 0.3225 328.3634) - high chroma for intense glow
  - Cyan accent: oklch(0.7072 0.1679 242.0420) - electric blue highlights
  - No shadows, no rounded corners, pure terminal aesthetic
- JetBrains Mono monospace font throughout entire application
- Zero border-radius enforced (--radius: 0rem) for perfectly sharp, square corners
- Dark mode only - no light mode support, no theme switching
- Mobile-optimized responsive design with 44x44px touch targets (WCAG AAA) and collapsible hierarchical sidebar

### Technical Implementations
- **Frontend**: React 18+ with TypeScript, Vite, Tailwind CSS, `shadcn/ui`, React Query for state management, Wouter for routing.
- **Backend**: Express.js, Drizzle ORM, Node Fetch for external data, Remark for Markdown parsing.
- **Data Architecture**: Pure JSON-driven parser for dynamic hierarchy building, eliminating hardcoded dependencies. Resources are categorized into a 3-level hierarchical structure.
- **Sidebar Layout**: CSS Grid-based layout on desktop using `grid-cols-[var(--sidebar-width)_1fr]`, dynamically adjusting to `grid-cols-[var(--sidebar-width-icon)_1fr]` when collapsed. Sidebar width: 16rem (256px) expanded, 3rem (48px) collapsed.
- **Sidebar Features**: 
  - **Header**: Logo and Search button with keyboard shortcut (⌘K)
  - **Navigation**: Home with hierarchical category navigation
  - **Categories**: Collapsible 3-level hierarchy (category → subcategory → sub-subcategory) with resource count badges
  - **Footer**: GitHub repository link
  - **Mobile**: 44x44px minimum touch targets, smooth scroll-into-view, Sheet component overlay
- **Deployment**: Configured for deployment on Replit, with optimized production builds and static site generation for platforms like GitHub Pages.

### Feature Specifications
- **Search & Discovery**: Advanced fuzzy search across all 2,011 resources with keyboard shortcut (⌘K), powered by Fuse.js
- **AI Recommendations**: Personalized resource recommendations based on user profile, skill level, and learning goals
- **User Preferences**: Comprehensive preference management including preferred categories, skill level, learning goals, resource types, and time commitment
- **Color Customization**: Interactive color palette generator for custom theme creation
- **Advanced Features**: Dedicated page with tabs for Resource Explorer, Analytics & Metrics, Data Export, and AI Recommendations
- **Hierarchical Navigation**: 3-level category structure (category → subcategory → sub-subcategory) with accurate resource counts and visual hierarchy
- **Mobile-Optimized**: Responsive design with WCAG AAA compliant 44x44px touch targets, scroll-into-view behavior, and Sheet-based sidebar overlay

### Category Resource Counts
Resource counts include all resources at category level, subcategory level, and sub-subcategory level. The `calculateTotalCount` function in Home.tsx aggregates resources across all three hierarchy levels:

**Main Categories (Total Counts):**
- **Intro & Learning**: 329 resources (229 category + 100 subcategories)
- **Encoding & Codecs**: 745 resources (392 category + 269 subcategories + 84 sub-subcategories)
- **Standards & Industry**: 226 resources (174 category + 41 subcategories + 11 sub-subcategories)
- **Media Tools**: 504 resources (317 category + 103 subcategories + 84 sub-subcategories)
- **Protocols & Transport**: Direct resources only
- **Players & Clients**: Direct resources only
- **Infrastructure & Delivery**: Direct resources only
- **General Tools**: Direct resources only
- **Community & Events**: Direct resources only

**Resource Counting Logic:**
1. Category-level resources: Direct resources under the main category
2. Subcategory resources: Resources under each subcategory
3. Sub-subcategory resources: Resources under each sub-subcategory
4. Total count = Sum of all three levels

This hierarchical counting ensures accurate representation of all available resources within each category's complete tree structure.

## External Dependencies

### Frontend
- React ecosystem (React, React DOM)
- TanStack Query (React Query v5)
- shadcn/ui components (based on Radix UI primitives)
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