# Developer Onboarding Guide

**Awesome Video Resources Platform**

A comprehensive guide for new developers joining the project. This document covers architecture, setup, development workflows, testing, and contribution guidelines.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [Technology Stack](#technology-stack)
6. [Development Workflow](#development-workflow)
7. [Testing Guide](#testing-guide)
8. [Code Standards](#code-standards)
9. [Contribution Guidelines](#contribution-guidelines)
10. [Troubleshooting](#troubleshooting)
11. [Additional Resources](#additional-resources)

---

## Project Overview

### What is This?

A full-stack web application for browsing and curating **2,647 video development resources** from the `krzemienski/awesome-video` GitHub repository.

### Key Features

- **Hierarchical Browsing**: 21 categories, 102 subcategories, 90 sub-subcategories
- **Full-Text Search**: PostgreSQL `pg_trgm` + `tsvector` powered search
- **User Accounts**: Favorites, bookmarks, learning journeys
- **AI Integration**: Claude Haiku 4.5 for auto-tagging and recommendations
- **GitHub Sync**: Bidirectional sync with awesome-list repositories
- **Admin Dashboard**: Resource approval workflows, bulk operations

### Project Status

- **Production Ready**: 94% verified (31/33 features)
- **Security**: Passed audit (Session 9)
- **Performance**: Benchmarked and optimized

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                 │
│  ┌──────────────┐    ┌──────────────┐                               │
│  │ Web Browser  │    │Mobile Browser│                               │
│  └──────────────┘    └──────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Docker Host (localhost)                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Nginx Reverse Proxy (:80/:443)                               │   │
│  │ - SSL Termination, Rate Limiting (60 req/min)                │   │
│  │ - Security Headers, Gzip Compression                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────┐  ┌──────────────────┐   │
│  │ Web Container (:3000)                  │  │ Redis (:6379)    │   │
│  │ - Express API (70 endpoints)           │──│ - AI Cache (1hr) │   │
│  │ - React Build (Static Assets)          │  │ - URL Cache(24hr)│   │
│  │ - AI Services (Claude Haiku 4.5)       │  └──────────────────┘   │
│  │ - GitHub Integration (Octokit)         │                         │
│  └────────────────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Supabase Cloud                                  │
│  ┌──────────────────┐  ┌────────────────────────────────────────┐   │
│  │ Supabase Auth    │  │ PostgreSQL Database                    │   │
│  │ - Email/Password │  │ - 16 Tables, 2,647 Resources           │   │
│  │ - GitHub OAuth   │  │ - Row-Level Security (RLS)             │   │
│  │ - Google OAuth   │  │ - Full-Text Search Indexes             │   │
│  └──────────────────┘  └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Denormalized Resources** | TEXT category fields (not FK) for flexibility in categorization |
| **Row-Level Security** | User data isolation via `user_id = auth.uid()` policies |
| **JWT Auth** | Stateless authentication via localStorage (no server sessions) |
| **Redis Cache** | AI responses (1hr), URL analysis (24hr), recommendations (5min) |
| **Drizzle ORM** | Type-safe, zero-cost abstractions, full SQL control |

### Database Schema Overview

```
Core Navigation (3 tables)
├── categories (21 rows)
├── subcategories (102 rows)
└── sub_subcategories (90 rows)

Content (3 tables)
├── resources (2,647 rows) ← Main data table
├── tags
└── resource_tags (junction)

User Data (5 tables, RLS protected)
├── user_favorites
├── user_bookmarks
├── user_preferences
├── user_interactions
└── user_journey_progress

Admin/System (5 tables)
├── learning_journeys + journey_steps
├── enrichment_jobs + enrichment_queue
├── github_sync_queue + github_sync_history
├── resource_edits
└── resource_audit_log
```

For complete schema documentation, see `/docs/DATABASE_SCHEMA.md`.

---

## Development Setup

### Prerequisites

- **Node.js**: v20 LTS or higher
- **Docker**: Docker Desktop (for Docker Compose)
- **Git**: Latest version
- **IDE**: VS Code recommended (with ESLint, Prettier, Tailwind CSS IntelliSense)

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/awesome-list-site.git
cd awesome-list-site
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Configuration

Create `.env` file in project root:

```bash
# Supabase Configuration (Required)
SUPABASE_URL=https://jeyldoypdkgsrfdhdcmm.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Redis Configuration
REDIS_URL=redis://localhost:6379

# AI Services (Optional for development)
ANTHROPIC_API_KEY=your_anthropic_key_here

# GitHub Integration (Optional for development)
GITHUB_TOKEN=your_github_token_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

Create `client/.env.local` for frontend:

```bash
VITE_SUPABASE_URL=https://jeyldoypdkgsrfdhdcmm.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Getting Credentials:**

1. **Supabase**: Request credentials from team lead or create a development project at [supabase.com](https://supabase.com)
2. **Anthropic**: Sign up at [console.anthropic.com](https://console.anthropic.com) (optional for dev)
3. **GitHub**: Create Personal Access Token at GitHub Settings > Developer Settings

### Step 4: Start Development Server

**Option A: Local Development (Recommended for Frontend Work)**

```bash
npm run dev
```

Server runs at `http://localhost:5000`

**Option B: Docker Compose (Full Stack)**

```bash
docker-compose up -d
```

Application runs at `http://localhost:3000`

### Step 5: Verify Setup

```bash
# Health check
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}

# Check resources
curl http://localhost:3000/api/resources?limit=5
# Expected: Array of 5 resources
```

### Test User Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | admin@test.com | TestAdmin123! | Full admin access |
| User A | testuser-a@test.com | TestUserA123! | Regular user |
| User B | testuser-b@test.com | TestUserB123! | For isolation testing |

---

## Project Structure

```
awesome-list-site/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── admin/         # Admin-specific components
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useAuth.ts     # Authentication hook
│   │   │   └── use-*.ts       # Feature-specific hooks
│   │   ├── lib/               # Utilities and helpers
│   │   │   ├── supabase.ts    # Supabase client
│   │   │   └── queryClient.ts # TanStack Query setup
│   │   ├── pages/             # Route components
│   │   └── App.tsx            # Main application
│   └── .env.local             # Frontend environment
│
├── server/                    # Express Backend
│   ├── index.ts               # Server entry point
│   ├── routes.ts              # API routes (70 endpoints)
│   ├── storage.ts             # Database operations
│   ├── supabaseAuth.ts        # Auth middleware
│   ├── ai/                    # AI services
│   │   ├── claudeService.ts   # Claude integration
│   │   └── urlAnalyzer.ts     # URL analysis
│   └── github/                # GitHub sync
│       ├── syncService.ts     # Import/export logic
│       └── markdownParser.ts  # Awesome list parsing
│
├── shared/                    # Shared Code
│   └── schema.ts              # Database schema (Drizzle)
│
├── tests/                     # Test Suite
│   ├── e2e/                   # Playwright E2E tests
│   └── helpers/               # Test utilities
│
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # System architecture
│   ├── DATABASE_SCHEMA.md     # Complete schema docs
│   └── plans/                 # Execution plans
│
├── .claude/                   # Claude Code Skills
│   └── skills/                # Testing methodology
│
├── docker-compose.yml         # Docker orchestration
├── Dockerfile                 # Container build
├── playwright.config.ts       # E2E test config
└── package.json               # Dependencies
```

---

## Technology Stack

### Frontend

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| **React 18** | UI Framework | [reactjs.org](https://reactjs.org) |
| **TypeScript** | Type Safety | [typescriptlang.org](https://typescriptlang.org) |
| **Vite** | Build Tool | [vitejs.dev](https://vitejs.dev) |
| **shadcn/ui** | Component Library | [ui.shadcn.com](https://ui.shadcn.com) |
| **Tailwind v4** | Styling | [tailwindcss.com](https://tailwindcss.com) |
| **TanStack Query** | Data Fetching | [tanstack.com/query](https://tanstack.com/query) |
| **Wouter** | Routing | [github.com/molefrog/wouter](https://github.com/molefrog/wouter) |
| **React Hook Form** | Form Handling | [react-hook-form.com](https://react-hook-form.com) |
| **Zod** | Validation | [zod.dev](https://zod.dev) |

### Backend

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| **Express.js** | Web Framework | [expressjs.com](https://expressjs.com) |
| **Node.js 20** | Runtime | [nodejs.org](https://nodejs.org) |
| **Drizzle ORM** | Database ORM | [orm.drizzle.team](https://orm.drizzle.team) |
| **PostgreSQL** | Database | [postgresql.org](https://postgresql.org) |
| **Supabase Auth** | Authentication | [supabase.com/docs/auth](https://supabase.com/docs/auth) |
| **Redis** | Caching | [redis.io](https://redis.io) |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Docker Compose** | Container Orchestration |
| **Nginx** | Reverse Proxy |
| **Supabase Cloud** | Hosted PostgreSQL + Auth |

### AI & Integrations

| Technology | Purpose |
|------------|---------|
| **Claude Haiku 4.5** | AI Tagging, Recommendations |
| **Octokit** | GitHub API Integration |

---

## Development Workflow

### Git Branching Strategy

```
main                 # Production-ready code
├── feature/*        # New features
├── fix/*            # Bug fixes
├── refactor/*       # Code improvements
└── docs/*           # Documentation updates
```

### Typical Development Flow

1. **Create Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Develop & Test**
   ```bash
   npm run dev          # Start dev server
   npm run test:e2e     # Run E2E tests
   npm run check        # TypeScript check
   ```

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

4. **Push & Create PR**
   ```bash
   git push -u origin feature/your-feature-name
   # Create PR via GitHub UI
   ```

### Commit Message Format

Follow [Conventional Commits](https://conventionalcommits.org):

```
<type>(<scope>): <description>

Types:
- feat:     New feature
- fix:      Bug fix
- docs:     Documentation
- style:    Formatting (no code change)
- refactor: Code restructuring
- test:     Adding tests
- chore:    Maintenance tasks
```

Examples:
```
feat(admin): add bulk resource approval
fix(auth): resolve token refresh issue
docs(api): update endpoint documentation
refactor(storage): optimize database queries
```

### Code Review Checklist

- [ ] Code follows project style guide
- [ ] TypeScript has no errors (`npm run check`)
- [ ] Tests pass (`npm run test:e2e`)
- [ ] New features have tests
- [ ] Documentation updated if needed
- [ ] No console.log statements
- [ ] No hardcoded credentials

---

## Testing Guide

### Test Stack

| Tool | Purpose |
|------|---------|
| **Playwright** | E2E Testing |
| **Vitest** | Unit Testing |
| **Testing Library** | Component Testing |

### Running Tests

```bash
# All E2E tests
npm run test:e2e

# Specific test file
npx playwright test tests/e2e/01-anonymous-user.spec.ts

# UI mode (interactive debugging)
npm run test:e2e:ui

# Specific viewport
npm run test:e2e:desktop
npm run test:e2e:mobile
npm run test:e2e:tablet

# View test report
npm run test:e2e:report
```

### Test Structure

```
tests/
├── e2e/
│   ├── 01-anonymous-user.spec.ts    # 23 tests - Public features
│   ├── 02-authentication.spec.ts    # 15 tests - Auth flows
│   ├── 03-user-features.spec.ts     # 14 tests - User functionality
│   └── 04-admin-features.spec.ts    # 16 tests - Admin dashboard
└── helpers/
    └── test-utils.ts                # Shared utilities
```

### Writing New Tests

```typescript
import { test, expect } from '@playwright/test';
import { loginAsUser, waitForNetworkIdle } from '../helpers/test-utils';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'testuser-a@test.com', 'TestUserA123!');
  });

  test('should perform expected action', async ({ page }) => {
    // Arrange
    await page.goto('/feature-page');

    // Act
    await page.click('[data-testid="action-button"]');
    await waitForNetworkIdle(page);

    // Assert
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Test Best Practices

1. **Use data-testid selectors**: `[data-testid="button-submit"]`
2. **Wait for network**: Use `waitForNetworkIdle()` after actions
3. **Independent tests**: Each test should work in isolation
4. **Clean up**: Remove test data after tests
5. **Three viewports**: Test desktop, tablet, and mobile

### Frontend-Driven Testing Methodology

This project uses a specialized testing approach documented in `.claude/skills/frontend-driven-testing/SKILL.md`:

**3-Layer Validation:**
1. **Layer 1 - API**: Verify HTTP requests succeed
2. **Layer 2 - Database**: Confirm data persists correctly
3. **Layer 3 - UI**: Visual verification at 3 viewport sizes

**Self-Correcting Loop:**
```
Test Feature → Find Bug → Debug → Fix → Rebuild Docker → Retest
```

For detailed methodology, see the skill documentation.

---

## Code Standards

### TypeScript

- Strict mode enabled
- No `any` types (use `unknown` if necessary)
- Explicit return types on functions
- Use interfaces over types for objects

```typescript
// Good
interface Resource {
  id: string;
  title: string;
  url: string;
}

function getResource(id: string): Promise<Resource | null> {
  // ...
}

// Avoid
const getResource = (id: any) => {
  // ...
}
```

### React Components

- Functional components with hooks
- Props interface defined above component
- Use `data-testid` for testable elements

```typescript
interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Button({ onClick, disabled = false, children }: ButtonProps) {
  return (
    <button
      data-testid="button-action"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-primary text-white rounded"
    >
      {children}
    </button>
  );
}
```

### API Endpoints

- RESTful conventions
- Consistent error responses
- Input validation with Zod

```typescript
// Route pattern
app.get('/api/resources/:id', async (req, res) => {
  try {
    const resource = await storage.getResource(req.params.id);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.json(resource);
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

### Database Queries

- Use Drizzle ORM for type safety
- Parameterized queries (automatic with Drizzle)
- Batch operations with transactions

```typescript
// Good - Using Drizzle
const resource = await db.select()
  .from(resources)
  .where(eq(resources.id, id))
  .limit(1);

// Transaction for atomicity
await db.transaction(async (tx) => {
  await tx.update(resources).set({ status: 'approved' }).where(eq(resources.id, id));
  await tx.insert(resourceAuditLog).values({ resourceId: id, action: 'approved' });
});
```

### CSS/Tailwind

- Mobile-first responsive design
- Use Tailwind utility classes
- Component variants with CVA

```tsx
// Responsive pattern
<div className="flex flex-col md:flex-row gap-4">
  <Card className="w-full md:w-1/2" />
  <Card className="w-full md:w-1/2" />
</div>

// CVA for variants
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

---

## Contribution Guidelines

### Before You Start

1. **Check existing issues**: Look for related issues or discussions
2. **Create an issue**: For significant changes, discuss first
3. **Assign yourself**: Prevent duplicate work

### Pull Request Process

1. **Fork & Branch**: Create a feature branch from `main`
2. **Develop**: Follow code standards and write tests
3. **Test**: Run full test suite before submitting
4. **Document**: Update relevant documentation
5. **PR Description**: Include:
   - Summary of changes
   - Related issue number
   - Screenshots for UI changes
   - Testing steps

### PR Template

```markdown
## Summary
Brief description of changes

## Related Issue
Fixes #123

## Changes Made
- Change 1
- Change 2

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots
(If UI changes)

## Checklist
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
```

### Code Review

All PRs require:
- 1 approval from maintainer
- Passing CI checks
- No merge conflicts

### Release Process

1. PRs merged to `main`
2. Automated tests run
3. Docker image built
4. Deployed to production

---

## Troubleshooting

### Common Issues

#### "Cannot connect to database"

```bash
# Check DATABASE_URL in .env
# Verify Supabase project is active
# Test connection:
psql $DATABASE_URL -c "SELECT 1"
```

#### "Unauthorized (401) on API calls"

```bash
# Check SUPABASE_ANON_KEY is correct
# Verify user exists in Supabase Auth
# Check localStorage for token:
localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token')
```

#### "Docker build fails"

```bash
# Clear Docker cache
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### "Tests fail with timeout"

```bash
# Increase timeout in playwright.config.ts
# Check if server is running
# Verify test users exist in database
```

#### "TypeScript errors on fresh clone"

```bash
# Install dependencies
npm install

# Check TypeScript version
npx tsc --version  # Should be 5.6.x

# Run type check
npm run check
```

### Getting Help

1. **Search documentation**: Check `/docs/` folder
2. **Check Serena memories**: `mcp__serena__list_memories()`
3. **Ask team**: Slack/Discord channel
4. **Create issue**: GitHub Issues for bugs

---

## Additional Resources

### Project Documentation

| Document | Description |
|----------|-------------|
| `/CLAUDE.md` | Project overview and quick reference |
| `/docs/ARCHITECTURE.md` | Detailed architecture with diagrams |
| `/docs/DATABASE_SCHEMA.md` | Complete database documentation |
| `/tests/README.md` | E2E testing guide |
| `/.claude/skills/frontend-driven-testing/` | Testing methodology |

### External Resources

- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Playwright Documentation](https://playwright.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)

### Useful Commands Reference

```bash
# Development
npm run dev              # Start local dev server (port 5000)
docker-compose up -d     # Start Docker stack (port 3000)
docker-compose logs -f   # View Docker logs

# Building
npm run build            # Build for production
docker-compose build     # Rebuild Docker images

# Testing
npm run test:e2e         # Run all E2E tests
npm run test:e2e:ui      # Interactive test UI
npm run check            # TypeScript check

# Database
npm run db:push          # Push schema changes

# Utilities
docker-compose down      # Stop all containers
docker system prune      # Clean Docker cache
```

---

## Onboarding Checklist

Use this checklist to track your onboarding progress:

- [ ] Clone repository and install dependencies
- [ ] Set up environment variables
- [ ] Start development server successfully
- [ ] Run E2E tests successfully
- [ ] Login with test user account
- [ ] Login with admin account
- [ ] Browse resources and categories
- [ ] Test search functionality
- [ ] Review architecture documentation
- [ ] Review database schema
- [ ] Create a test PR (can be documentation fix)
- [ ] Get first PR merged

---

**Welcome to the team! If you have questions, don't hesitate to ask.**

---

*Last Updated: 2025-12-02*
*Maintainer: Awesome List Site Team*
