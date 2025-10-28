# Awesome Video Resource Viewer

## Overview

A production-ready React application for browsing and discovering over 2,000 curated video development resources from the `krzemienski/awesome-video` GitHub repository. The project aims to provide a modern, mobile-optimized user interface with advanced search and filtering capabilities, including dark theme support and Google Analytics tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application employs a client-server architecture. The frontend is a React-based single-page application built with Vite, utilizing `shadcn/ui` components, Tailwind CSS, and React Query for data fetching. The backend is an Express.js server providing RESTful API endpoints for resource management and data fetching. Data is stored in a PostgreSQL database using Drizzle ORM, with a defined schema for resources, categories, and subcategories.

### UI/UX Decisions
- Modern UI with a "Hyper term pink" cyberpunk theme using OKLCH color space.
- JetBrains Mono font for a terminal aesthetic.
- Zero border-radius on most UI elements (sharp, square corners).
- Supports light, dark, and system themes with localStorage persistence.
- Mobile-optimized responsive design with touch-friendly elements and a collapsible hierarchical sidebar.

### Technical Implementations
- **Frontend**: React 18+ with TypeScript, Vite, Tailwind CSS, `shadcn/ui`, React Query for state management, Wouter for routing.
- **Backend**: Express.js, Drizzle ORM, Node Fetch for external data, Remark for Markdown parsing.
- **Data Architecture**: Pure JSON-driven parser for dynamic hierarchy building, eliminating hardcoded dependencies. Resources are categorized into a 3-level hierarchical structure.
- **Deployment**: Configured for deployment on Replit, with optimized production builds and static site generation for platforms like GitHub Pages.

### Feature Specifications
- Advanced search and filtering by 3-level categories (category, subcategory, sub-subcategory).
- Comprehensive 3-level hierarchical navigation with accurate resource counts.
- Mobile-optimized interface with a dedicated sidebar component for navigation.
- Theme switching (light, dark, system).

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