# System Architecture

Technical architecture documentation for the Awesome Video Resource Viewer application.

## Overview

The Awesome Video Resource Viewer is a full-stack application built with modern web technologies. It serves as a curated platform for discovering video development resources, featuring AI-powered recommendations, GitHub integration, and admin curation tools.

### System Architecture Diagram

```mermaid
graph TB
    subgraph Client["Client (Browser)"]
        React["React 18<br/>(Components)"]
        TQ["TanStack Query<br/>(State Management)"]
        Router["Wouter Router<br/>(Client Routing)"]
        UI["Tailwind CSS<br/>+ shadcn/ui"]
    end

    subgraph Server["Express.js Server"]
        Routes["API Routes<br/>(RESTful)"]
        Auth["Passport.js<br/>(Authentication)"]
        Middleware["Middleware<br/>(Validation, Auth)"]
        Storage["Drizzle ORM<br/>(Storage Layer)"]
        GitHub["GitHub Sync<br/>(Import/Export)"]
        AI["AI Services<br/>(Claude Integration)"]
    end

    subgraph External["External Services"]
        DB["PostgreSQL<br/>(Database)"]
        GH["GitHub API<br/>(Sync)"]
        Claude["Claude API<br/>(Anthropic)"]
    end

    Client -->|HTTP| Routes
    Client -->|HTTP| Auth
    Routes -->|Query| Storage
    Auth -->|Query| Storage
    Storage -->|SQL| DB
    GitHub -->|Query| Storage
    AI -->|Query| Storage
    Routes -->|REST| GH
    Routes -->|REST| Claude
```

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18+ | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| TanStack Query v5 | Server state management |
| Wouter | Client-side routing |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library |
| Lucide React | Icons |
| Fuse.js | Fuzzy search |

### Backend
| Technology | Purpose |
|------------|---------|
| Express.js | HTTP server |
| TypeScript | Type safety |
| Drizzle ORM | Database ORM |
| Passport.js | Authentication |
| Zod | Schema validation |
| Remark | Markdown parsing |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL (Neon) | Primary database |
| Drizzle Kit | Migrations |

### External Services
| Service | Purpose |
|---------|---------|
| Anthropic Claude | AI analysis & enrichment |
| GitHub API | Repository sync |
| Replit Auth | OAuth authentication |
| Google Analytics | Usage analytics |

## Directory Structure

```
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/         # shadcn/ui primitives
│   │   │   ├── layout/     # Layout components
│   │   │   └── ...
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities & helpers
│   │   └── App.tsx         # Root component & routing
│   └── index.html
├── server/                 # Backend application
│   ├── ai/                 # AI services
│   │   ├── claudeService.ts
│   │   ├── enrichmentService.ts
│   │   ├── recommendationEngine.ts
│   │   └── urlScraper.ts
│   ├── github/             # GitHub integration
│   │   ├── syncService.ts
│   │   ├── formatter.ts
│   │   └── parser.ts
│   ├── validation/         # Validation services
│   │   ├── awesomeLint.ts
│   │   └── linkChecker.ts
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database access layer
│   ├── replitAuth.ts       # OAuth configuration
│   ├── localAuth.ts        # Local auth for dev
│   └── index.ts            # Server entry point
├── shared/                 # Shared code
│   └── schema.ts           # Database schema & types
├── scripts/                # Utility scripts
└── docs/                   # Documentation
```

## Component Hierarchy

```mermaid
graph TD
    App["App<br/>(Root)"]
    MainLayout["MainLayout"]
    ModernSidebar["ModernSidebar<br/>(Navigation)"]
    TopBar["TopBar<br/>(Header)"]
    Content["Content<br/>(Router Outlet)"]
    Pages["Pages"]

    Home["Home Page<br/>(Browse Resources)"]
    Category["Category Page<br/>(Category View)"]
    ResourceDetail["ResourceDetail<br/>(Single Resource)"]
    AdminDash["AdminDashboard<br/>(Admin Panel)"]

    App --> MainLayout
    MainLayout --> ModernSidebar
    MainLayout --> TopBar
    MainLayout --> Content
    Content --> Pages
    Pages --> Home
    Pages --> Category
    Pages --> ResourceDetail
    Pages --> AdminDash

    style App fill:#e1f5ff
    style MainLayout fill:#f3e5f5
    style Pages fill:#fce4ec
    style AdminDash fill:#ffebee
```

## Data Flow

### Request/Response Cycle Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User/Browser
    participant R as React + Query
    participant E as Express.js
    participant D as Drizzle ORM
    participant DB as PostgreSQL

    U->>R: Navigate/User Action
    R->>E: HTTP Request (GET/POST/PUT/DELETE)
    E->>E: Route & Middleware Processing
    E->>D: Build & Execute Query
    D->>DB: SQL Query
    DB-->>D: Result Set
    D-->>E: Typed Data
    E-->>R: JSON Response
    R->>R: Cache & Update State
    R-->>U: Re-render UI
```

### Authentication Flow (Detailed)

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant E as Express
    participant P as Passport.js
    participant S as Session Store
    participant DB as Database

    U->>C: Click Login
    C->>E: POST /api/auth/local/login
    E->>P: authenticate('local')
    P->>DB: Verify credentials
    DB-->>P: User record
    P->>S: Create session
    S-->>P: Session ID
    P-->>E: Set connect.sid cookie
    E-->>C: 200 OK + Set-Cookie
    C->>C: Store auth state

    Note over C,E: Subsequent Requests (Protected)
    C->>E: GET /api/admin/* (with cookie)
    E->>S: Validate session
    S-->>E: Session valid
    E->>E: Check req.isAuthenticated()
    E-->>C: Protected data
```

### GitHub Sync Flow (Import & Export)

```mermaid
flowchart TD
    subgraph Import["Import Flow"]
        I1["POST /api/admin/import-github"]
        I2["Fetch README.md from GitHub"]
        I3["AwesomeListParser.parse"]
        I4["Validate categories & resources"]
        I5["Drizzle: Upsert to database"]
        I6["Return import summary"]

        I1 --> I2 --> I3 --> I4 --> I5 --> I6
    end

    subgraph Export["Export Flow"]
        E1["POST /api/admin/export"]
        E2["Query all categories & resources"]
        E3["AwesomeListFormatter.format"]
        E4["Generate awesome-lint compliant markdown"]
        E5["Return markdown string"]

        E1 --> E2 --> E3 --> E4 --> E5
    end

    subgraph Validation["Validation Layer"]
        V1{{"Valid awesome-list<br/>format?"}}
        V2["Category hierarchy<br/>check"]
        V3["Resource URL<br/>validation"]
        V4["Duplicate<br/>detection"]
    end

    I3 --> V1
    V1 -->|Yes| V2
    V2 --> V3
    V3 --> V4
    V4 --> I4
```

### AI Enrichment Flow

```mermaid
flowchart TD
    A1["Admin starts<br/>enrichment job"]
    A2["Query unenriched<br/>resources"]
    A3["Create enrichment_job<br/>record"]
    A4["For each resource"]
    A5["Scrape URL metadata<br/>title, description, OG tags"]
    A6["Send to Claude API<br/>for analysis"]
    A7["Store enriched metadata<br/>JSONB"]
    A8["Update enrichment_job<br/>progress"]
    A9["Mark job complete"]

    A1 --> A2 --> A3 --> A4 --> A5 --> A6 --> A7 --> A8 --> A9
```

## Database Schema

### Core Tables

**users**
- Primary user accounts (Replit OAuth or local)
- Roles: user, admin, moderator

**resources**
- Core resource entries
- Status: pending, approved, rejected
- Metadata stored as JSONB

**categories / subcategories / sub_subcategories**
- 3-level hierarchy for navigation
- Slugs for URL routing

**resource_edits**
- User-submitted edit suggestions
- Conflict detection via originalResourceUpdatedAt

**resource_audit_log**
- Complete audit trail of all changes

### Support Tables

**learning_journeys / journey_steps / user_journey_progress**
- Learning path functionality

**favorites / bookmarks**
- User engagement tracking

**github_sync_queue / sync_history**
- GitHub sync state management

**enrichment_jobs**
- AI batch processing tracking

**tags / resource_tags**
- Tag management (many-to-many)

## Security Measures

### Authentication
- Passport.js session management
- bcrypt password hashing (local auth)
- Session stored in PostgreSQL
- HTTPS enforced in production

### Authorization
- Role-based access control (RBAC)
- isAuthenticated middleware
- isAdmin middleware for admin routes

### Input Validation
- Zod schemas for all inputs
- Whitelisted editable fields for edit suggestions
- Field size limits enforced
- SQL injection prevented via Drizzle ORM

### API Security
- CORS configured for production
- Rate limiting on external APIs
- Secrets stored in environment variables

## Performance Considerations

### Caching
- TanStack Query client-side caching
- Database query optimization with indexes
- Static asset caching via Vite

### Database
- Connection pooling via Neon
- Indexes on frequently queried columns
- JSONB for flexible metadata storage

### Frontend
- Code splitting via dynamic imports
- Lazy loading of heavy components
- Optimized bundle size

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
REPLIT_DOMAINS=...
REPLIT_IDENTITY_TOKEN=...
SESSION_SECRET=...

# External Services
AI_INTEGRATIONS_ANTHROPIC_API_KEY=...
GITHUB_TOKEN=...
GITHUB_REPO_URL=...

# Optional
NODE_ENV=development|production
GA_TRACKING_ID=...
```

## Deployment

The application is designed for Replit deployment:

1. **Development**: `npm run dev` starts Vite + Express
2. **Production**: `npm run build` → `npm run start`
3. **Database**: Replit PostgreSQL (Neon-backed)
4. **Secrets**: Managed via Replit Secrets tab
5. **Deploy**: Replit's built-in deployment system

## Monitoring & Logging

- Console logging for debugging
- Audit log for resource changes
- Google Analytics for frontend tracking
- Health endpoint: `GET /api/health`
