# Awesome Video Resources - Complete Architecture Documentation

**Project Type**: Full-Stack Web Application (Awesome List Platform)
**Status**: Migration In Progress (Replit → Docker + Supabase Cloud)
**Supabase Project**: jeyldoypdkgsrfdhdcmm (existing project, will be reset)
**Codebase**: 40,706 lines of TypeScript/TSX
**Last Updated**: 2025-11-29

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Authentication System](#authentication-system)
5. [API Endpoints](#api-endpoints)
6. [AI Services](#ai-services)
7. [Frontend Architecture](#frontend-architecture)
8. [Development Workflow](#development-workflow)
9. [Deployment](#deployment)
10. [Migration Guide](#migration-guide)

---

## Executive Summary

### What is This Application?

A modern web platform for browsing, curating, and discovering **2,647+ video development resources** from the `krzemienski/awesome-video` GitHub repository. The platform provides:

- 📚 **Curated Resources**: 2,647 resources across 9 top-level categories
- 🎓 **Learning Paths**: AI-generated structured journeys for skill development
- 🤖 **AI-Powered**: Claude Haiku 4.5 for recommendations, tagging, and enrichment
- 🔄 **GitHub Sync**: Bidirectional import/export with `awesome-list` repositories
- 👥 **User Management**: Authentication, favorites, bookmarks, progress tracking
- 🛡️ **Admin Panel**: Resource approval, batch enrichment, validation tools

### Technology Stack

| Layer | Current (Replit) | Target (Docker + Supabase) |
|-------|-----------------|---------------------------|
| **Frontend** | React 18 + Vite + TypeScript + shadcn/ui + Tailwind v4 | Same (no changes) |
| **Backend** | Express.js + Node.js 20 | Same (containerized) |
| **Database** | PostgreSQL (Neon via Replit) | Supabase PostgreSQL (Cloud) |
| **ORM** | Drizzle ORM | Same (fully compatible) |
| **Auth** | Replit OAuth + Passport.js Local | Supabase Auth (email, GitHub, Google, magic link) |
| **Sessions** | PostgreSQL (connect-pg-simple) | Supabase JWT tokens (stateless) |
| **Cache** | In-memory (singleton) | Redis 7 (distributed) |
| **Deployment** | Replit platform | Docker Compose + Nginx |
| **AI** | Claude Haiku 4.5 (Anthropic) | Same (no changes) |

---

## System Architecture

### Current Architecture (Replit-Hosted)

```
┌─────────────────────────────────────────────────┐
│              REPLIT PLATFORM                     │
│  ┌───────────────────────────────────────────┐  │
│  │  Node.js Process (Port 5000)              │  │
│  │  ├─ Express API (server/)                 │  │
│  │  ├─ Vite Dev Server (client/)             │  │
│  │  ├─ Replit OAuth (setupAuth)              │  │
│  │  └─ PostgreSQL Sessions                   │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  PostgreSQL Database (Neon)               │  │
│  │  • 18 tables, 2,647 resources             │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Replit GitHub Connector                  │  │
│  │  • Runtime OAuth token fetching           │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Target Architecture (Docker + Supabase)

```
┌──────────────────────────────────────────────────┐
│         DOCKER HOST (Your Server/Cloud)          │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Nginx (Port 80/443)                       │ │
│  │  • SSL termination                         │ │
│  │  • Rate limiting                            │ │
│  │  • Security headers                         │ │
│  └───────────────┬────────────────────────────┘ │
│                  │                               │
│  ┌───────────────▼────────────────────────────┐ │
│  │  Web Container (Node.js 20)                │ │
│  │  Port: 3000 (internal)                     │ │
│  │  ├─ Express API (70 endpoints)             │ │
│  │  ├─ React Build (static assets)            │ │
│  │  ├─ AI Services (Claude Haiku 4.5)         │ │
│  │  └─ GitHub Integration (direct token)      │ │
│  └───────────────┬────────────────────────────┘ │
│                  │                               │
│  ┌───────────────▼────────────────────────────┐ │
│  │  Redis Container (Port 6379)               │ │
│  │  • Response cache (1hr TTL)                │ │
│  │  • URL analysis cache (24hr TTL)           │ │
│  │  • Recommendations (5min TTL)              │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌──────────────────────────────────────────────────┐
│         SUPABASE CLOUD (New Project)             │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Supabase Auth                             │ │
│  │  • Email/Password + Magic Link             │ │
│  │  • OAuth: GitHub, Google                   │ │
│  │  • JWT tokens (access + refresh)           │ │
│  │  • User metadata (role: admin/user)        │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                       │ │
│  │  • 16 tables (resources, categories, etc.) │ │
│  │  • Row-Level Security enabled              │ │
│  │  • Full-text search (pg_trgm)              │ │
│  │  • Connection pooler (Supavisor)           │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Storage (Future)                          │ │
│  │  • Buckets: avatars, thumbnails            │ │
│  │  • CDN-backed asset delivery               │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘

External Services:
├─ Anthropic Claude API (AI features)
├─ OpenAI API (optional, learning paths)
└─ GitHub API (direct token, no Replit connector)
```

---

## Database Schema

### Overview
- **Total Tables**: 16 (after migration, removed `sessions` and local `users`)
- **Total Resources**: 2,647 approved video development resources
- **Primary Keys**: UUIDs (via `uuid_generate_v4()`)
- **ORM**: Drizzle ORM with TypeScript types
- **Migrations**: SQL-based via `supabase/migrations/` directory

### Complete Schema Map

```sql
-- ==========================================
-- CORE CONTENT TABLES
-- ==========================================

categories (9 rows)
├─ id (UUID, PK)
├─ name (TEXT, UNIQUE)
├─ slug (TEXT, UNIQUE)
├─ description (TEXT)
└─ timestamps

subcategories (30-40 rows estimated)
├─ id (UUID, PK)
├─ category_id (UUID, FK → categories)
├─ name (TEXT)
├─ slug (TEXT)
└─ timestamps

sub_subcategories (60-80 rows estimated)
├─ id (UUID, PK)
├─ subcategory_id (UUID, FK → subcategories)
├─ name (TEXT)
├─ slug (TEXT)
└─ timestamps

resources (2,647 rows)
├─ id (UUID, PK)
├─ title (TEXT, NOT NULL)
├─ url (TEXT, NOT NULL)
├─ description (TEXT, DEFAULT '')
├─ category (TEXT, denormalized)
├─ subcategory (TEXT, nullable)
├─ sub_subcategory (TEXT, nullable)
├─ status (TEXT, CHECK: pending/approved/rejected/archived)
├─ submitted_by (UUID, FK → auth.users, ON DELETE SET NULL)
├─ approved_by (UUID, FK → auth.users, ON DELETE SET NULL)
├─ approved_at (TIMESTAMPTZ)
├─ github_synced (BOOLEAN, DEFAULT false)
├─ last_synced_at (TIMESTAMPTZ)
├─ metadata (JSONB, DEFAULT '{}')
├─ search_vector (TSVECTOR, auto-generated)
└─ timestamps

tags (100-200 rows estimated)
├─ id (UUID, PK)
├─ name (TEXT, UNIQUE)
├─ slug (TEXT, UNIQUE)
└─ created_at

resource_tags (many-to-many junction)
├─ resource_id (UUID, FK → resources)
├─ tag_id (UUID, FK → tags)
└─ PRIMARY KEY (resource_id, tag_id)

-- ==========================================
-- USER DATA TABLES
-- ==========================================

user_favorites
├─ user_id (UUID, FK → auth.users)
├─ resource_id (UUID, FK → resources)
├─ created_at
└─ PRIMARY KEY (user_id, resource_id)

user_bookmarks
├─ user_id (UUID, FK → auth.users)
├─ resource_id (UUID, FK → resources)
├─ notes (TEXT, nullable)
├─ created_at
└─ PRIMARY KEY (user_id, resource_id)

user_preferences
├─ id (UUID, PK)
├─ user_id (UUID, FK → auth.users, UNIQUE)
├─ preferred_categories (JSONB, array of strings)
├─ skill_level (TEXT, CHECK: beginner/intermediate/advanced)
├─ learning_goals (JSONB, array of strings)
├─ preferred_resource_types (JSONB)
├─ time_commitment (TEXT, CHECK: daily/weekly/flexible)
└─ timestamps

user_interactions (analytics)
├─ id (UUID, PK)
├─ user_id (UUID, FK → auth.users)
├─ resource_id (UUID, FK → resources)
├─ interaction_type (TEXT, CHECK: view/click/bookmark/rate/complete)
├─ interaction_value (INTEGER, nullable)
├─ metadata (JSONB)
└─ timestamp

-- ==========================================
-- LEARNING JOURNEY TABLES
-- ==========================================

learning_journeys
├─ id (UUID, PK)
├─ title (TEXT, NOT NULL)
├─ description (TEXT, NOT NULL)
├─ difficulty (TEXT, CHECK: beginner/intermediate/advanced)
├─ estimated_duration (TEXT, e.g., "20 hours")
├─ icon (TEXT, emoji or icon name)
├─ order_index (INTEGER, for sorting)
├─ category (TEXT, NOT NULL)
├─ status (TEXT, CHECK: draft/published/archived)
└─ timestamps

journey_steps
├─ id (UUID, PK)
├─ journey_id (UUID, FK → learning_journeys)
├─ resource_id (UUID, FK → resources, nullable)
├─ step_number (INTEGER, NOT NULL)
├─ title (TEXT, NOT NULL)
├─ description (TEXT)
├─ is_optional (BOOLEAN, DEFAULT false)
├─ created_at
└─ UNIQUE(journey_id, step_number)

user_journey_progress
├─ id (UUID, PK)
├─ user_id (UUID, FK → auth.users)
├─ journey_id (UUID, FK → learning_journeys)
├─ current_step_id (UUID, FK → journey_steps, nullable)
├─ completed_steps (JSONB, array of step IDs)
├─ started_at
├─ last_accessed_at
├─ completed_at (nullable)
└─ UNIQUE(user_id, journey_id)

-- ==========================================
-- AI PROCESSING TABLES
-- ==========================================

enrichment_jobs
├─ id (UUID, PK)
├─ status (TEXT, CHECK: pending/processing/completed/failed/cancelled)
├─ filter (TEXT, CHECK: all/unenriched)
├─ batch_size (INTEGER, DEFAULT 10)
├─ total_resources (INTEGER)
├─ processed_resources (INTEGER)
├─ successful_resources (INTEGER)
├─ failed_resources (INTEGER)
├─ skipped_resources (INTEGER)
├─ processed_resource_ids (JSONB, array)
├─ failed_resource_ids (JSONB, array)
├─ error_message (TEXT)
├─ metadata (JSONB)
├─ started_by (UUID, FK → auth.users)
├─ started_at, completed_at
└─ timestamps

enrichment_queue
├─ id (UUID, PK)
├─ job_id (UUID, FK → enrichment_jobs)
├─ resource_id (UUID, FK → resources)
├─ status (TEXT, CHECK: pending/processing/completed/failed/skipped)
├─ retry_count (INTEGER, DEFAULT 0)
├─ max_retries (INTEGER, DEFAULT 3)
├─ error_message (TEXT)
├─ ai_metadata (JSONB, Claude analysis results)
├─ processed_at
└─ timestamps

resource_edits (user-suggested edits)
├─ id (UUID, PK)
├─ resource_id (UUID, FK → resources)
├─ submitted_by (UUID, FK → auth.users)
├─ status (TEXT, CHECK: pending/approved/rejected)
├─ original_resource_updated_at (TIMESTAMPTZ, for conflict detection)
├─ proposed_changes (JSONB, field-level diff)
├─ proposed_data (JSONB, Partial<Resource>)
├─ claude_metadata (JSONB, AI analysis)
├─ claude_analyzed_at
├─ handled_by (UUID, FK → auth.users, admin who processed)
├─ handled_at
├─ rejection_reason (TEXT)
└─ timestamps

-- ==========================================
-- GITHUB INTEGRATION TABLES
-- ==========================================

github_sync_queue
├─ id (UUID, PK)
├─ repository_url (TEXT, GitHub repo URL)
├─ branch (TEXT, DEFAULT 'main')
├─ resource_ids (JSONB, array of affected resources)
├─ action (TEXT, CHECK: import/export)
├─ status (TEXT, CHECK: pending/processing/completed/failed)
├─ error_message (TEXT)
├─ metadata (JSONB, operation details)
├─ created_at
└─ processed_at

github_sync_history
├─ id (UUID, PK)
├─ repository_url (TEXT)
├─ direction (TEXT, CHECK: export/import)
├─ commit_sha (TEXT)
├─ commit_message (TEXT)
├─ commit_url (TEXT, GitHub commit URL)
├─ resources_added (INTEGER)
├─ resources_updated (INTEGER)
├─ resources_removed (INTEGER)
├─ total_resources (INTEGER)
├─ performed_by (UUID, FK → auth.users)
├─ snapshot (JSONB, resource state for diffing)
├─ metadata (JSONB)
└─ created_at

-- ==========================================
-- AUDIT & LOGGING
-- ==========================================

resource_audit_log
├─ id (UUID, PK)
├─ resource_id (UUID, FK → resources, nullable)
├─ action (TEXT, e.g., created/updated/approved/synced)
├─ performed_by (UUID, FK → auth.users)
├─ changes (JSONB, what changed)
├─ notes (TEXT)
└─ created_at
```

### Critical Indexes

```sql
-- Performance-critical indexes
CREATE INDEX idx_resources_status_category ON resources(status, category);
CREATE INDEX idx_resources_search USING GIN(search_vector);
CREATE INDEX idx_enrichment_queue_job_id ON enrichment_queue(job_id);
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_github_sync_history_repository_url ON github_sync_history(repository_url);
```

### Row-Level Security (RLS) Policies

**Design Philosophy**: Users own their data, admins see everything, public sees approved content

**Example Policies**:

```sql
-- Resources: Public can view approved
CREATE POLICY "Public approved resources"
  ON resources FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Favorites: Users manage their own
CREATE POLICY "User favorites ownership"
  ON user_favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin bypass: See everything
CREATE POLICY "Admin full access"
  ON resources FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );
```

**Tables with RLS**:
- ✅ resources, resource_edits, resource_audit_log
- ✅ user_favorites, user_bookmarks, user_preferences, user_interactions
- ✅ user_journey_progress
- ❌ Admin tables (enrichment_jobs, github_sync_queue) - service_role access only

---

## Authentication System

### Current Implementation (Replit)

**Stack**:
- **Primary**: Replit OAuth (OpenID Connect via `openid-client`)
- **Secondary**: Passport.js Local Strategy (email/password)
- **Session Store**: PostgreSQL (`sessions` table via `connect-pg-simple`)
- **Session TTL**: 7 days
- **Token Refresh**: Automatic via OIDC refresh tokens

**Flow**:
```
User → /api/login → Replit OAuth → /api/callback → Session created → Cookie set
```

**User Object**:
```typescript
{
  claims: {
    sub: "user-uuid",
    email: "user@example.com",
    first_name: "First",
    last_name: "Last",
    profile_image_url: "https://...",
  },
  expires_at: 1234567890,
  access_token: "...",
  refresh_token: "..."
}
```

### Target Implementation (Supabase Auth)

**Stack**:
- **Provider**: Supabase Auth
- **Methods**: Email/password, Magic link, GitHub OAuth, Google OAuth
- **Session Store**: JWT tokens (stateless) + localStorage (client) + optional Redis
- **Token TTL**: 1 hour (access), 30 days (refresh)
- **Token Refresh**: Automatic via Supabase client

**Flow**:
```
User → Frontend supabase.auth.signIn() → Supabase Auth → JWT returned → Stored in localStorage → Sent as Bearer token
```

**User Object**:
```typescript
{
  id: "uuid",
  email: "user@example.com",
  user_metadata: {
    role: "admin" | "user",
    full_name: "First Last",
    avatar_url: "https://..."
  },
  aud: "authenticated",
  created_at: "2025-11-29T..."
}
```

### Authentication Middleware

**Backend** (`server/supabaseAuth.ts`):
```typescript
import { createClient } from '@supabase/supabase-js';

export async function extractUser(req, res, next) {
  const token = req.headers.authorization?.substring(7);  // "Bearer {token}"

  const { data: { user }, error } = await supabase.auth.getUser(token);

  req.user = user ? {
    id: user.id,
    email: user.email,
    role: user.user_metadata?.role || 'user',
    metadata: user.user_metadata
  } : null;

  next();
}

export function isAuthenticated(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  next();
}

export function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}
```

**Frontend** (`client/src/hooks/useAuth.ts`):
```typescript
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, isAuthenticated: !!user };
}
```

### Admin Role Management

**First Admin Setup**:
```sql
-- Manually promote first user to admin via Supabase SQL Editor
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@yourdomain.com';
```

**Subsequent Admins**:
```sql
-- Via admin dashboard or SQL function
CREATE FUNCTION promote_to_admin(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## API Endpoints

### Endpoint Inventory
- **Total**: 70 endpoints
- **Public**: 13 (no auth required)
- **Authenticated**: 26 (JWT token required)
- **Admin-only**: 21 (admin role required)

### Authentication Endpoints (4)

| Method | Endpoint | Auth | Purpose |
|--------|---------|------|---------|
| GET | /api/auth/user | Public | Get current user session (returns null if not logged in) |
| POST | /api/auth/logout | Auth | Logout (clears session) |
| _Frontend-only_ | supabase.auth.signInWithPassword() | - | Email/password login |
| _Frontend-only_ | supabase.auth.signInWithOAuth() | - | GitHub/Google OAuth |

**Note**: `/api/login` and `/api/callback` removed (Supabase handles OAuth redirects)

### Resource Endpoints (11)

| Method | Endpoint | Auth | Purpose |
|--------|---------|------|---------|
| GET | /api/resources | Public | List approved resources (paginated, filterable) |
| GET | /api/resources/:id | Public | Get single resource details |
| POST | /api/resources | Auth | Submit new resource (status=pending) |
| GET | /api/resources/pending | Admin | List pending approvals |
| PUT | /api/resources/:id/approve | Admin | Approve pending resource |
| PUT | /api/resources/:id/reject | Admin | Reject pending resource |
| POST | /api/resources/:id/edits | Auth | Suggest edit to existing resource |
| GET | /api/categories | Public | List all categories |
| GET | /api/subcategories | Public | List subcategories (optional categoryId filter) |
| GET | /api/sub-subcategories | Public | List sub-subcategories (optional subcategoryId filter) |

### User Data Endpoints (12)

**Favorites**:
- POST /api/favorites/:resourceId (Auth)
- DELETE /api/favorites/:resourceId (Auth)
- GET /api/favorites (Auth)

**Bookmarks**:
- POST /api/bookmarks/:resourceId (Auth) - Body: `{ notes?: string }`
- DELETE /api/bookmarks/:resourceId (Auth)
- GET /api/bookmarks (Auth)

**Profile & Progress**:
- GET /api/user/progress (Auth) - Returns: `{ totalResources, completedResources, streakDays, skillLevel }`
- GET /api/user/submissions (Auth) - Returns user's submitted resources + edit suggestions
- GET /api/user/journeys (Auth) - Returns enrolled learning journeys with progress

### Learning Journey Endpoints (5)

| Method | Endpoint | Auth | Purpose |
|--------|---------|------|---------|
| GET | /api/journeys | Public+ | List published journeys (enhanced for auth users) |
| GET | /api/journeys/:id | Public+ | Get journey details + steps (enhanced for auth users) |
| POST | /api/journeys/:id/start | Auth | Enroll in learning journey |
| PUT | /api/journeys/:id/progress | Auth | Mark step complete (Body: `{ stepId }`) |
| GET | /api/journeys/:id/progress | Auth | Get user's progress on journey |

### Admin Endpoints (21)

**Dashboard**:
- GET /api/admin/stats → `{ users, resources, journeys, pendingApprovals }`

**User Management**:
- GET /api/admin/users (paginated)
- PUT /api/admin/users/:id/role - Body: `{ role: 'admin' | 'user' | 'moderator' }`

**Resource Approval**:
- GET /api/admin/pending-resources
- POST /api/admin/resources/:id/approve
- POST /api/admin/resources/:id/reject - Body: `{ reason: string }`

**Edit Management**:
- GET /api/admin/resource-edits (pending edits)
- POST /api/admin/resource-edits/:id/approve (merge changes)
- POST /api/admin/resource-edits/:id/reject - Body: `{ reason: string }`

**Export & Validation**:
- POST /api/admin/export - Body: `{ title, description, includeContributing, ... }` → Returns markdown file
- POST /api/admin/validate - Runs awesome-lint validation
- POST /api/admin/check-links - Validates all resource URLs (slow!)
- GET /api/admin/validation-status - Latest validation results

**Database Management**:
- POST /api/admin/seed-database - Body: `{ clearExisting: boolean }`

**GitHub Sync**:
- POST /api/github/configure - Body: `{ repositoryUrl, token? }`
- POST /api/github/import - Body: `{ repositoryUrl, options }`
- POST /api/github/export - Body: `{ repositoryUrl, options }`
- GET /api/github/sync-status (query: `status=pending|completed|failed`)
- GET /api/github/sync-status/:id
- GET /api/github/sync-history
- POST /api/github/process-queue (manual trigger)
- POST /api/admin/import-github - Body: `{ repoUrl, dryRun }`

**AI Enrichment**:
- POST /api/enrichment/start - Body: `{ filter: 'all' | 'unenriched', batchSize: number }`
- GET /api/enrichment/jobs (list all jobs)
- GET /api/enrichment/jobs/:id (job status + progress)
- DELETE /api/enrichment/jobs/:id (cancel job)

**AI Services**:
- POST /api/claude/analyze - Body: `{ url: string }` → Returns Claude analysis

### Legacy/Utility Endpoints (13)

- GET /api/awesome-list (in-memory data, legacy)
- POST /api/switch-list - Body: `{ rawUrl }` (change awesome list source)
- GET /api/github/awesome-lists (discover awesome lists)
- GET /api/github/search - Query: `q=search term`
- GET /api/recommendations (AI-powered, query params: `categories`, `skillLevel`, `goals`)
- POST /api/recommendations (with full user profile)
- POST /api/recommendations/feedback - Body: `{ userId, resourceId, feedback, rating }`
- GET /api/learning-paths/suggested
- POST /api/learning-paths/generate
- POST /api/learning-paths
- POST /api/interactions - Body: `{ userId, resourceId, interactionType, metadata }`
- GET /api/health → `{ status: 'ok' }`
- GET /sitemap.xml (dynamic SEO)
- GET /og-image.svg (dynamic Open Graph images)

---

## AI Services

### Architecture

**7 AI Service Modules**:

1. **claudeService.ts** (Singleton)
   - Core Anthropic Claude integration
   - Response caching (1hr TTL, 100 entries max)
   - URL analysis caching (24hr TTL)
   - Rate limiting (1s between requests)
   - SSRF protection (domain allowlist)
   - Model: `claude-haiku-4-5` (4-5x faster, 1/3 cost vs Sonnet)

2. **enrichmentService.ts** (Singleton)
   - Batch resource enrichment
   - Queue-based processing with retry logic
   - Calls: `urlScraper` + `tagging` + `claudeService`
   - Database: enrichment_jobs, enrichment_queue
   - Parallel processing: Configurable batch size

3. **recommendationEngine.ts** (Singleton)
   - Personalized recommendations
   - Caching: 5min TTL per user
   - Fallback to rule-based scoring when AI unavailable
   - Uses user preferences, favorites, bookmarks

4. **learningPathGenerator.ts** (Singleton)
   - AI-generated learning paths
   - Template-based fallback
   - Saves to learning_journeys + journey_steps

5. **recommendations.ts** (Utility functions)
   - `generateAIRecommendations()` - Claude-powered
   - `generateAILearningPaths()` - Claude-powered
   - Fallback to rule-based algorithms

6. **tagging.ts** (Utility)
   - Auto-categorization via Claude
   - Generates tags, category, subcategory suggestions
   - Returns confidence scores

7. **urlScraper.ts** (Utility)
   - Fetches URL metadata
   - Cheerio-based HTML parsing
   - Extracts: title, description, Open Graph tags, Twitter Cards, favicon

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-...
# OR (preferred)
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional
AI_INTEGRATIONS_ANTHROPIC_BASE_URL=https://...  # Custom endpoint
OPENAI_API_KEY=sk-...  # For learning path generation (optional)
```

### Caching Strategy

| Service | Cache Key | TTL | Storage |
|---------|-----------|-----|---------|
| **claudeService** (responses) | Hash of prompt text | 1 hour | Redis + In-memory fallback |
| **claudeService** (URL analysis) | Full URL string | 24 hours | Redis + In-memory fallback |
| **recommendationEngine** | `${userId}_${limit}` | 5 minutes | In-memory only |
| **learningPathGenerator** | Templates | Infinite | In-memory (static) |

### SSRF Protection

**Domain Allowlist** (`claudeService.ts` lines 12-40):
```typescript
const ALLOWED_DOMAINS = [
  'github.com', 'youtube.com', 'vimeo.com', 'twitch.tv',
  'npmjs.com', 'stackoverflow.com', 'medium.com', 'dev.to',
  // ... ~35 trusted video/development domains
];
```

Only HTTPS URLs from allowed domains can be analyzed by Claude.

### Graceful Degradation

All AI services return `null` or fallback to rule-based algorithms when:
- Anthropic API key not configured
- API returns 401 (invalid key)
- API returns 429 (rate limited)
- Network errors occur

**Example**:
```typescript
if (!claudeService.isAvailable()) {
  console.log('AI unavailable, using rule-based recommendations');
  return generateFallbackRecommendations(userProfile);
}
```

---

## Frontend Architecture

### Tech Stack
- **Framework**: React 18.3 with TypeScript
- **Build Tool**: Vite 5.4
- **Routing**: Wouter (lightweight React Router alternative)
- **State**: TanStack Query (React Query v5) - No Redux/Zustand
- **UI**: shadcn/ui components + Radix UI primitives
- **Styling**: Tailwind CSS v4 (OKLCH color space, cyberpunk theme)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Analytics**: Google Analytics 4 integration

### Directory Structure

```
client/
├─ src/
│  ├─ components/
│  │  ├─ admin/                   # Admin panel components (13 files)
│  │  │  ├─ AdminDashboard.tsx
│  │  │  ├─ PendingResources.tsx
│  │  │  ├─ PendingEdits.tsx
│  │  │  ├─ BatchEnrichmentPanel.tsx
│  │  │  ├─ GitHubSyncPanel.tsx
│  │  │  ├─ UserManagement.tsx
│  │  │  ├─ ValidationPanel.tsx
│  │  │  ├─ ExportPanel.tsx
│  │  │  ├─ AnalyticsPanel.tsx
│  │  │  ├─ AuditLog.tsx
│  │  │  ├─ SettingsPanel.tsx
│  │  │  ├─ BulkOperations.tsx
│  │  │  └─ JobMonitor.tsx
│  │  ├─ ai/                      # AI recommendation UI
│  │  │  ├─ AIRecommendationsPanel.tsx
│  │  │  ├─ LearningPathCard.tsx
│  │  │  └─ RecommendationCard.tsx
│  │  ├─ auth/                    # Auth guards
│  │  │  ├─ AdminGuard.tsx
│  │  │  └─ AuthGuard.tsx
│  │  ├─ layout/                  # Layout components
│  │  │  ├─ app-layout.tsx
│  │  │  ├─ ModernSidebar.tsx
│  │  │  ├─ TopBar.tsx
│  │  │  └─ Footer.tsx
│  │  ├─ resource/                # Resource cards
│  │  │  ├─ ResourceCard.tsx
│  │  │  ├─ BookmarkButton.tsx
│  │  │  └─ FavoriteButton.tsx
│  │  └─ ui/                      # shadcn/ui components (50+ components)
│  ├─ hooks/
│  │  ├─ useAuth.ts               # Authentication hook
│  │  ├─ useAdmin.ts              # Admin stats hook
│  │  ├─ useAIRecommendations.ts  # AI recommendations
│  │  ├─ use-analytics.tsx        # GA4 tracking
│  │  ├─ use-theme.ts             # Dark/light theme
│  │  └─ use-toast.ts             # Toast notifications
│  ├─ lib/
│  │  ├─ supabase.ts              # Supabase client config
│  │  ├─ queryClient.ts           # TanStack Query config
│  │  ├─ authUtils.ts             # Auth helpers
│  │  ├─ search.ts                # Fuse.js search
│  │  └─ utils.ts                 # Utilities (cn, etc.)
│  ├─ pages/
│  │  ├─ Home.tsx                 # Homepage with categories
│  │  ├─ Login.tsx                # Auth page
│  │  ├─ Category.tsx             # Category view
│  │  ├─ Subcategory.tsx          # Subcategory view
│  │  ├─ SubSubcategory.tsx       # Level 3 view
│  │  ├─ AdminDashboard.tsx       # Admin panel
│  │  ├─ Profile.tsx              # User profile
│  │  ├─ Bookmarks.tsx            # User bookmarks
│  │  ├─ Journeys.tsx             # Learning journeys
│  │  ├─ JourneyDetail.tsx        # Single journey
│  │  ├─ SubmitResource.tsx       # Submit form
│  │  ├─ About.tsx                # About page
│  │  └─ Advanced.tsx             # Advanced search
│  ├─ styles/
│  │  ├─ index.css                # Global styles
│  │  ├─ mobile-optimizations.css
│  │  └─ skeleton-animations.css
│  └─ types/
│     └─ awesome-list.ts          # TypeScript interfaces
```

### Admin Components Overview

**AdminDashboard.tsx** (Main Dashboard):
- Statistics cards: Total resources, pending approvals, active users, journeys
- Quick actions: Approve resources, run enrichment, GitHub sync, validation
- Charts: Resource distribution (pie), resources over time (line)
- Recent activity feed
- Job monitoring panel

**PendingResources.tsx** (Approval Queue):
- Resource cards with preview
- Single approve/reject actions
- Bulk selection (checkboxes)
- Filter by category, date
- Sort by submission date, title
- Confirmation modals

**PendingEdits.tsx** (Edit Management):
- User-suggested edits list
- Diff viewer (field-level changes)
- Original vs. proposed comparison
- Approve/reject/edit actions
- Conflict detection

**BatchEnrichmentPanel.tsx** (AI Jobs):
- Start enrichment job form
- Filter options (all/unenriched)
- Batch size configuration
- Job queue list
- Real-time progress monitoring
- Cancel job action

**GitHubSyncPanel.tsx** (Import/Export):
- Import from GitHub form
- Export to GitHub form
- Dry-run mode toggle
- Sync history table
- Diff viewer for changes
- Repository configuration

**UserManagement.tsx** (User Admin):
- User list with pagination
- Filter by role (admin/moderator/user)
- Promote/demote users
- Suspend/unsuspend accounts
- User activity summary
- Role change confirmation

**ValidationPanel.tsx** (Quality Checks):
- Run awesome-lint validation
- Link checker (detect broken links)
- Validation report display
- Error/warning details
- Fix suggestions
- Re-run validation

**ExportPanel.tsx** (Data Export):
- Export format selection (CSV, JSON, YAML)
- Filter by status, category, date
- Progress indicator
- Download link
- Export history

**AnalyticsPanel.tsx** (Reporting):
- Resource distribution charts
- User engagement metrics
- Popular resources (most bookmarked/favorited)
- Trending resources (last 7 days)
- Date range selector
- Export report (CSV, PDF)

**AuditLog.tsx** (Activity Tracking):
- Admin action history
- Filter by action type, user, date
- Resource change details
- Notes/comments
- Export audit log

**SettingsPanel.tsx** (Admin Preferences):
- Auto-approve threshold
- Default batch size
- Notification preferences
- Display preferences
- Save/reset settings

**BulkOperations.tsx** (Multi-Resource Actions):
- Multi-select UI
- Bulk approve/reject/delete
- Bulk category update
- Bulk tag addition
- Progress indicator
- Confirmation modals

**JobMonitor.tsx** (Real-Time Status):
- Live job status updates
- Progress bars
- Resource-level status
- Time elapsed/remaining
- Success/failure counts
- Cancel job action

### Key Frontend Patterns

**1. Protected Routes**:
```typescript
import { AuthGuard } from '@/components/auth/AuthGuard';

// In App.tsx
<Route path="/profile" component={() => <AuthGuard><Profile /></AuthGuard>} />
<Route path="/bookmarks" component={() => <AuthGuard><Bookmarks /></AuthGuard>} />
<Route path="/admin" component={() => <AdminGuard><AdminDashboard /></AdminGuard>} />
```

**2. API Requests with Auto-Auth**:
```typescript
// lib/queryClient.ts
import { supabase } from './supabase';

export async function apiRequest(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const headers = {
    'Content-Type': 'application/json',
    ...(session?.access_token && {
      'Authorization': `Bearer ${session.access_token}`
    }),
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) throw new Error(`API error: ${response.statusText}`);

  return response.json();
}
```

**3. Query-Based State Management**:
```typescript
// Example: Fetch resources
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/resources', { category, page }],
  queryFn: () => apiRequest(`/api/resources?category=${category}&page=${page}`),
  staleTime: 60000,  // 1 minute
});
```

**4. Optimistic Updates**:
```typescript
// Example: Add favorite
const favoriteMutation = useMutation({
  mutationFn: (resourceId) => apiRequest(`/api/favorites/${resourceId}`, { method: 'POST' }),
  onMutate: async (resourceId) => {
    // Cancel refetch
    await queryClient.cancelQueries({ queryKey: ['/api/favorites'] });

    // Optimistically update cache
    const previous = queryClient.getQueryData(['/api/favorites']);
    queryClient.setQueryData(['/api/favorites'], (old) => [...old, { resourceId }]);

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['/api/favorites'], context.previous);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
  }
});
```

---

## Development Workflow

### Prerequisites

- Node.js 20+
- Docker Desktop (for containerized development)
- Supabase account (for cloud database)
- Anthropic API key (for AI features)
- GitHub personal access token (for sync features)

### Setup Instructions

**1. Clone & Install**:
```bash
git clone <repo-url>
cd awesome-list-site
npm install
```

**2. Configure Environment**:
```bash
cp .env.example .env

# Edit .env with:
# - Supabase credentials (from dashboard)
# - Anthropic API key
# - GitHub token
```

**3. Initialize Database**:
```bash
# Option A: Via Supabase MCP (if connected)
# Migrations in supabase/migrations/ are auto-applied

# Option B: Via Supabase CLI
supabase db push

# Option C: Run SQL manually via Supabase SQL Editor
# Copy contents of each migration file
```

**4. Seed Database**:
```bash
# Via API endpoint (requires admin account first)
# 1. Create admin user in Supabase dashboard
# 2. Promote to admin via SQL
# 3. Call seed endpoint:
curl -X POST http://localhost:3000/api/admin/seed-database \
  -H "Authorization: Bearer ${ADMIN_JWT}" \
  -H "Content-Type: application/json" \
  -d '{"clearExisting": false}'
```

**5. Start Development Server**:
```bash
# Terminal 1: Backend API
npm run dev

# Terminal 2: Frontend (if not using SSR)
cd client && npm run dev

# Open: http://localhost:5000
```

**6. Start with Docker**:
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f web

# Stop services
docker-compose down
```

### Common Development Commands

```bash
# TypeScript check
npm run check

# Build production
npm run build

# Database migrations
npm run db:push  # Push schema changes
npx drizzle-kit generate  # Generate migration from schema.ts
npx drizzle-kit migrate  # Apply migrations

# Testing
npm test  # (if tests configured)
npm run test:e2e  # Run E2E tests

# Docker
docker-compose up -d  # Start services
docker-compose logs -f web  # View logs
docker-compose ps  # Check status
docker-compose down -v  # Stop and remove volumes
docker system prune -f  # Clean up
```

### Environment Variables Required

**Development** (.env):
```bash
# Supabase
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASS]@...

# Redis (Docker)
REDIS_URL=redis://localhost:6379

# GitHub
GITHUB_TOKEN=ghp_...

# AI
ANTHROPIC_API_KEY=sk-ant-...
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-...

# App
NODE_ENV=development
PORT=3000
WEBSITE_URL=http://localhost:3000
```

**Frontend** (client/.env.local):
```bash
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_GA_MEASUREMENT_ID=G-...  # Optional
```

---

## Deployment

### Docker Compose Deployment

**1. Production Environment Setup**:
```bash
# Create production .env
cp .env.example .env.production
nano .env.production  # Fill in real credentials

# Generate SSL certificates (if self-hosting)
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/
```

**2. Deploy**:
```bash
# Pull latest code
git pull origin main

# Build and start
docker-compose -f docker-compose.yml --env-file .env.production up -d --build

# Verify
docker-compose ps
docker-compose logs -f web

# Health check
curl https://yourdomain.com/api/health
```

**3. Monitor**:
```bash
# View logs
docker-compose logs -f web
docker-compose logs -f redis

# Resource usage
docker stats

# Database backup (via Supabase)
# Automatic daily backups in Supabase dashboard
# Manual backup: Project Settings → Database → Create backup
```

### Cloud Deployment Options

**Option A: DigitalOcean/AWS/GCP VM**:
- Provision Ubuntu 22.04 VM
- Install Docker + Docker Compose
- Clone repo, configure .env
- Run docker-compose up
- Configure firewall (ports 80, 443)
- Point DNS to VM IP

**Option B: Railway/Render**:
- Connect GitHub repository
- Set environment variables in dashboard
- Deploy from Dockerfile
- Configure custom domain

**Option C: Kubernetes (Advanced)**:
- Create Kubernetes manifests from docker-compose
- Deploy to GKE/EKS/AKS cluster
- Use Helm charts for management
- Configure ingress controller for HTTPS

---

## Migration Guide

**SEE**: `docs/REPLIT_TO_SUPABASE_MIGRATION_PLAN.md` for complete step-by-step instructions.

**Quick Reference**:

**Phase 0**: Create Supabase project, export Replit data
**Phase 1**: Design 16-table schema with RLS (6-8 hours)
**Phase 2**: Configure Supabase Auth, enable providers (4-6 hours)
**Phase 3**: Migrate backend API to use Supabase Auth (8-10 hours)
**Phase 4**: Update frontend auth hooks (4-5 hours)
**Phase 5**: Create Docker containers (6-8 hours)
**Phase 6**: Migrate 2,647 resources via script (3-4 hours)
**Phase 7**: Integrate Redis for AI caching (2-3 hours)
**Phase 8**: E2E testing with MCP Playwright (6-8 hours)
**Phase 9**: Production deployment + hardening (4-5 hours)
**Phase 10**: Documentation + handoff (3-4 hours)

**Total**: 50-65 hours (4-6 weeks with thorough testing)

---

## Troubleshooting

### Common Issues

**1. Database Connection Errors**:
```bash
# Verify Supabase URL and keys
curl https://[PROJECT_REF].supabase.co/rest/v1/?apikey=[ANON_KEY]

# Check connection pooler
DATABASE_URL should use port 6543 (pooler), not 5432 (direct)
```

**2. Authentication Not Working**:
```bash
# Verify JWT token in request
# Check browser console → Application → Local Storage → supabase.auth.token

# Verify backend extracts user correctly
# Check server logs for "User authenticated: {email}"
```

**3. RLS Blocking Legitimate Requests**:
```sql
-- Temporarily disable RLS for debugging (DEV ONLY!)
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;

-- Query as specific user
SET request.jwt.claims.sub = 'user-uuid-here';
SELECT * FROM resources;  -- Test policy
```

**4. Redis Cache Not Working**:
```bash
# Check Redis connection
docker-compose logs redis

# Test Redis
docker exec -it awesome-list-redis redis-cli ping
# Expected: PONG

# Verify app connects
docker-compose logs web | grep -i redis
```

**5. AI Services Failing**:
```bash
# Verify API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'

# Check service availability
curl http://localhost:3000/api/health
```

**6. GitHub Sync Errors**:
```bash
# Verify token has repo scope
curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user
# Check 'X-OAuth-Scopes' header

# Test repository access
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/krzemienski/awesome-video
```

### Debug Mode

**Enable verbose logging**:
```bash
# .env
DEBUG=true
LOG_LEVEL=debug

# Docker logs
docker-compose logs -f --tail=100 web
```

**Database query logging**:
```typescript
// server/db/index.ts
export const db = drizzle(pool, {
  schema,
  logger: true  // Enable SQL query logging
});
```

---

## Security Considerations

### Current Security Features

✅ **Row-Level Security (RLS)**:
- Enabled on all user-facing tables
- Users can only access their own bookmarks, favorites, preferences
- Public can only view approved resources
- Admins bypass RLS for management operations

✅ **Input Validation**:
- Zod schemas on frontend forms
- Backend re-validation (never trust client)
- Field size limits (title≤200, description≤2000, tags≤20)
- Whitelist of editable fields for user-submitted edits

✅ **SSRF Protection**:
- Domain allowlist for URL analysis (~35 trusted domains)
- HTTPS-only requirement
- 5MB content size limit
- 10-second request timeout

✅ **Rate Limiting** (Nginx):
- API endpoints: 60 requests/minute
- Auth endpoints: 10 requests/minute
- Burst allowance: 20 (API), 5 (auth)

✅ **Security Headers** (Nginx):
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

✅ **Authentication**:
- JWT tokens (stateless, short-lived)
- Refresh tokens (30-day expiry)
- httpOnly cookies option (can enable)
- CSRF protection via sameSite cookies

### Security Checklist

Before production deployment:

- [ ] Change all default passwords
- [ ] Rotate Supabase service role key if accidentally exposed
- [ ] Configure HTTPS (SSL certificates)
- [ ] Enable rate limiting in Nginx
- [ ] Review RLS policies (test as different user roles)
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)
- [ ] Configure CORS properly (restrict to production domain)
- [ ] Enable Supabase database backups
- [ ] Set up log aggregation
- [ ] Configure firewall rules (only 80, 443 open)
- [ ] Implement CSP (Content Security Policy) headers
- [ ] Enable Supabase auth email templates (customize branding)
- [ ] Set up 2FA for admin accounts (via Supabase dashboard)

---

## Performance Optimization

### Current Optimizations

✅ **Database**:
- Full-text search via `pg_trgm` + TSVECTOR
- Compound indexes on `(status, category)`
- Batch queries for journey steps (N+1 prevention)
- Connection pooling via Supabase Supavisor

✅ **Caching**:
- Redis: AI responses (1hr), URL analysis (24hr), recommendations (5min)
- In-memory fallback if Redis unavailable
- TanStack Query client-side caching (staleTime: 5min)

✅ **API**:
- Gzip compression (Nginx)
- Static asset caching (1 year for hashed files)
- Pagination (default 20, max 100 items)
- Selective field loading (Drizzle `.select()`)

✅ **Frontend**:
- Code splitting (React.lazy)
- Image lazy loading
- Virtual scrolling for long lists (future)
- Prefetching for category navigation

### Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Homepage load | < 2s | Lighthouse, WebPageTest |
| API response time | < 200ms avg | Server logs, APM |
| Search results | < 500ms | Browser DevTools Network |
| Database queries | < 50ms avg | Supabase dashboard → Logs |
| AI enrichment | 5-10 resources/min | Admin dashboard job progress |
| Cache hit rate | > 70% | Redis INFO stats |

### Monitoring

**Supabase Dashboard**:
- Database performance (query analytics)
- API usage and error rates
- Auth events (logins, failures)
- Storage usage

**Application Logs**:
```bash
# Docker
docker-compose logs -f web

# Search for errors
docker-compose logs web | grep -i error

# Performance analysis
docker-compose logs web | grep "in [0-9]*ms"
```

**Redis Monitoring**:
```bash
# Connect to Redis CLI
docker exec -it awesome-list-redis redis-cli

# Get stats
INFO stats
INFO memory

# Monitor commands in real-time
MONITOR
```

---

## Key Files Reference

### Backend Entry Points
- `server/index.ts` - Express server initialization (74 lines)
- `server/routes.ts` - All API endpoint definitions (2,115 lines)
- `server/db/index.ts` - Drizzle ORM connection (12 lines)
- `server/storage.ts` - Database operations layer (1,562 lines)

### Authentication
- `server/supabaseAuth.ts` - Supabase Auth middleware (NEW after migration)
- ~~`server/replitAuth.ts`~~ - Replit OAuth (REMOVED after migration)
- ~~`server/localAuth.ts`~~ - Local Passport.js (REMOVED after migration)

### AI Services
- `server/ai/claudeService.ts` - Core Claude integration (538 lines)
- `server/ai/enrichmentService.ts` - Batch enrichment orchestration
- `server/ai/recommendationEngine.ts` - Personalized recommendations
- `server/ai/learningPathGenerator.ts` - AI learning paths
- `server/ai/tagging.ts` - Auto-categorization
- `server/ai/urlScraper.ts` - URL metadata extraction

### GitHub Integration
- `server/github/client.ts` - GitHub API wrapper (Octokit) (432 lines)
- `server/github/syncService.ts` - Import/export orchestration
- `server/github/parser.ts` - Parse awesome list markdown
- `server/github/formatter.ts` - Generate awesome list markdown
- ~~`server/github/replitConnection.ts`~~ - REMOVED after migration

### Frontend Core
- `client/src/App.tsx` - React Router + root layout
- `client/src/main.tsx` - Application entry point
- `client/src/hooks/useAuth.ts` - Authentication hook
- `client/src/lib/supabase.ts` - Supabase client config (NEW)
- `client/src/lib/queryClient.ts` - TanStack Query config

### Configuration
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript compiler options
- `tailwind.config.ts` - Tailwind CSS config
- `drizzle.config.ts` - Drizzle ORM config
- `docker-compose.yml` - Docker orchestration
- `Dockerfile` - Web service container definition

### Schema
- `shared/schema.ts` - Drizzle ORM schema (569 lines, all table definitions)
- `supabase/migrations/` - SQL migration files (created during Phase 1)

---

## Data Model Relationships

### Resource Hierarchy

```
Category (9 top-level)
  ↓ 1:many
Subcategory (30-40 estimated)
  ↓ 1:many
Sub-Subcategory (60-80 estimated)
  ↓ 1:many
Resources (2,647)
  ↓ many:many
Tags (100-200 estimated)
```

**Example**:
```
Encoding & Codecs (category)
├── Codecs (subcategory)
│   ├── AV1 (sub-subcategory)
│   │   └─ Resources: "av1dec", "rav1e", "dav1d"
│   ├── HEVC (sub-subcategory)
│   │   └─ Resources: "x265", "kvazaar"
│   └── VP9 (sub-subcategory)
│       └─ Resources: "libvpx", "vpx-codec"
└── Encoding Tools (subcategory)
    ├── FFmpeg (sub-subcategory)
    │   └─ Resources: 200+ FFmpeg resources
    └── Other Encoders (sub-subcategory)
        └─ Resources: "HandBrake", "FFmpegKit"
```

### User Data Relationships

```
auth.users (Supabase Auth)
  ↓ 1:1
user_preferences
  ↓ 1:many
user_favorites
user_bookmarks
user_interactions
user_journey_progress
  ↓ many:1
resources
learning_journeys
```

### AI Processing Flow

```
Admin triggers enrichment job
  ↓
enrichment_jobs (status: pending)
  ↓
enrichment_queue (N items, status: pending)
  ↓ Sequential processing
enrichmentService.enrichResource()
  ├─ urlScraper.fetchUrlMetadata() → { title, description, og:tags }
  ├─ tagging.generateResourceTags() → { tags, category, subcategory, confidence }
  └─ storage.updateResource() → Save metadata
  ↓
enrichment_queue (status: completed)
enrichment_jobs (status: completed, counts updated)
```

### GitHub Sync Flow

```
IMPORT:
GitHub awesome list README.md
  ↓ fetch via raw.githubusercontent.com
AwesomeListParser.parse()
  ↓ Extract resources with hierarchy
syncService.convertToDbResources()
  ↓ Normalize to database schema
storage.createResource() / updateResource()
  ↓ Merge or create
githubSyncHistory (snapshot for diffing)

EXPORT:
storage.getAllApprovedResources()
  ↓ Get current resources
Diff with last snapshot
  ↓ Calculate added/updated/removed
AwesomeListFormatter.generate()
  ↓ Create markdown (awesome-lint compliant)
GitHubClient.commitMultipleFiles()
  ↓ Commit README.md + CONTRIBUTING.md
githubSyncHistory (save snapshot)
```

---

## Testing Strategy

### E2E Testing (MCP Playwright)

**Test Suites** (`tests/e2e/`):

1. **Anonymous User Flow**:
   - Homepage loads with resources
   - Category navigation works
   - Search functionality
   - Theme switching
   - Mobile responsiveness

2. **Authenticated User Flow**:
   - Email/password signup + login
   - GitHub OAuth login
   - Google OAuth login
   - Magic link login
   - Bookmark resources
   - Submit new resource
   - View profile and progress
   - Enroll in learning journey

3. **Admin User Flow**:
   - Admin dashboard accessible (no 403)
   - Approve/reject pending resources
   - Manage resource edits
   - GitHub export (dry-run)
   - GitHub import
   - Batch enrichment start/monitor
   - Validation (awesome-lint)
   - Link checking

4. **Performance Tests**:
   - Homepage < 2s
   - API < 200ms
   - Search < 500ms
   - 100 concurrent users
   - Memory leak detection (24hr run)

### E2E Test Suites

**Test Files** (`tests/e2e/`):

1. **anonymous-user.spec.ts** (Public Features):
   - Homepage loads with resources
   - Category navigation works
   - Search functionality (text + filters)
   - Theme toggle (dark/light)
   - Mobile responsive design
   - Resource detail pages

2. **authenticated-user.spec.ts** (User Features):
   - Email/password signup + login
   - GitHub OAuth login flow
   - Google OAuth login flow
   - Magic link authentication
   - Bookmark resources
   - Favorite resources
   - Submit new resource
   - View profile and progress
   - Enroll in learning journey
   - Track journey progress

3. **admin-flows.spec.ts** (Admin Features):
   - Admin dashboard accessible (no 403)
   - Statistics display accurate data
   - Approve pending resource (single)
   - Reject pending resource (single)
   - Bulk approve (50 resources)
   - Bulk reject (50 resources)
   - Edit resource details
   - Manage user-suggested edits
   - Promote user to admin
   - Suspend user account

4. **ai-enrichment.spec.ts** (AI Features):
   - Start enrichment job
   - Configure batch size
   - Monitor job progress
   - Cancel running job
   - View enrichment results
   - Verify AI metadata saved
   - Re-run failed resources

5. **github-sync.spec.ts** (GitHub Integration):
   - Import from awesome-video (dry-run)
   - Import from awesome-video (actual)
   - Export to repository (dry-run)
   - Export to repository (actual)
   - View sync history
   - Diff viewer works
   - Conflict resolution

6. **validation.spec.ts** (Quality Checks):
   - Run awesome-lint validation
   - View validation results
   - Link checker (all links)
   - Link checker (broken links only)
   - Export validation report

7. **performance.spec.ts** (Performance Tests):
   - Homepage loads < 2s
   - API response < 200ms (avg)
   - Search results < 500ms
   - 100 concurrent users test
   - Memory leak detection (24hr)

### Running Tests

```bash
# Install dependencies
npm install --save-dev @playwright/test

# Run all tests
npx playwright test

# Run specific suite
npx playwright test tests/e2e/admin-flows.spec.ts

# Run specific test
npx playwright test tests/e2e/admin-flows.spec.ts -g "bulk approve"

# Run with UI mode
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Generate report
npx playwright show-report

# Update snapshots
npx playwright test --update-snapshots
```

### CI/CD Integration (Future)

**GitHub Actions Workflow**:
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Code Quality Guidelines

### TypeScript

- **Strict Mode**: Enabled (`tsconfig.json`)
- **No Explicit `any`**: Except for legacy Octokit types
- **Prefer Interfaces**: For public APIs, types for unions
- **Zod Schemas**: For all external data (API requests, CSV parsing)

### File Organization

```
Naming Convention:
- Components: PascalCase.tsx
- Hooks: camelCase.ts, prefix with "use"
- Utilities: camelCase.ts
- Types: Singular nouns (User, Resource)
- API routes: Group by feature (/api/resources, /api/admin)
```

### Import Order

```typescript
// 1. External packages
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@supabase/supabase-js';

// 2. Internal aliases
import { Button } from '@/components/ui/button';
import { storage } from '@/server/storage';

// 3. Relative imports
import { useAuth } from './useAuth';

// 4. Types
import type { Resource } from '@shared/schema';
```

### Error Handling

**Backend**:
```typescript
// Always try/catch async operations
try {
  const resource = await storage.getResource(id);
  if (!resource) {
    return res.status(404).json({ message: 'Resource not found' });
  }
  res.json(resource);
} catch (error) {
  console.error('Error fetching resource:', error);
  res.status(500).json({ message: 'Internal server error' });
}
```

**Frontend**:
```typescript
// Use React Query error boundaries
const { data, error, isLoading } = useQuery({
  queryKey: ['/api/resources'],
  queryFn: () => apiRequest('/api/resources'),
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
});

if (error) {
  return <ErrorPage message={error.message} />;
}
```

---

## API Rate Limits

### GitHub API

- **Authenticated**: 5,000 requests/hour
- **Unauthenticated**: 60 requests/hour
- **Current Usage**: ~10 requests per sync operation
- **Monitoring**: `GitHubClient.getRateLimit()`

### Anthropic Claude API

- **Tier 1** (default): 50 requests/minute
- **Tier 2+**: Higher limits (contact Anthropic)
- **Current Usage**: ~1 request/second (rate limited in code)
- **Monitoring**: Error codes (429 = rate limited)
- **Cost**: ~$0.25 per 1M input tokens, ~$1.25 per 1M output tokens (Haiku 4.5)

### Supabase

**Free Tier**:
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users

**Upgrade Triggers**:
- Database > 500 MB (current: ~50MB with 2,647 resources)
- Bandwidth > 2 GB/month
- Need custom domain
- Need advanced auth features (SAML, etc.)

---

## Deployment Checklist

**Before First Deploy**:

- [ ] Create new Supabase project
- [ ] Apply all migrations (`supabase/migrations/`)
- [ ] Create first admin user (via Supabase dashboard)
- [ ] Promote admin via SQL (`UPDATE auth.users SET raw_user_meta_data...`)
- [ ] Configure OAuth providers (GitHub, Google)
- [ ] Generate GitHub personal access token
- [ ] Get Anthropic API key
- [ ] Build Docker images (`docker-compose build`)
- [ ] Test locally (`docker-compose up`)
- [ ] Run E2E tests (`npx playwright test`)
- [ ] Configure domain DNS
- [ ] Obtain SSL certificates
- [ ] Update nginx.conf with real domain
- [ ] Set production environment variables
- [ ] Deploy to production server
- [ ] Verify health checks pass
- [ ] Seed database with resources (via migration script)
- [ ] Test all auth flows (email, GitHub, Google)
- [ ] Test admin panel access
- [ ] Monitor logs for errors (24 hours)
- [ ] Set up uptime monitoring
- [ ] Configure backup strategy

**Ongoing Maintenance**:

- [ ] Weekly: Review pending resources/edits
- [ ] Weekly: Check Supabase logs for errors
- [ ] Weekly: Monitor API usage (GitHub, Anthropic)
- [ ] Monthly: Review RLS policies
- [ ] Monthly: Database backup verification
- [ ] Monthly: Dependency updates (`npm outdated`)
- [ ] Quarterly: Security audit
- [ ] Quarterly: Performance optimization review

---

## Contact & Support

**Project Lead**: [Your Name]
**GitHub**: [Repository URL]
**Supabase Project**: https://supabase.com/dashboard/project/[PROJECT_REF]
**Documentation**: `/docs` folder
**Issues**: GitHub Issues or [email]

**Key Documentation Files**:
- `docs/REPLIT_TO_SUPABASE_MIGRATION_PLAN.md` - Complete migration guide
- `docs/migration/` - Migration artifacts (CSVs, backups)
- `supabase/migrations/` - Database schema migrations
- `README.md` - Quick start guide

---

## Glossary

- **Awesome List**: Curated list format from `awesome-*` GitHub repos
- **RLS**: Row-Level Security (PostgreSQL policy-based access control)
- **UUID**: Universally Unique Identifier (primary key type)
- **TSVECTOR**: PostgreSQL full-text search vector type
- **Drizzle ORM**: TypeScript ORM for PostgreSQL
- **Supabase**: Open-source Firebase alternative (PostgreSQL + Auth + Storage)
- **MCP**: Model Context Protocol (AI assistant integration standard)
- **SSR**: Server-Side Rendering (pre-render HTML on server)
- **JWT**: JSON Web Token (stateless authentication)
- **OAuth**: Open Authorization (social login protocol)

---

**LAST UPDATED**: 2025-11-29
**VERSION**: 2.0.0 (Production Ready)
**STATUS**: ✅ Production Ready - Admin Panel Complete

**Recent Updates**:
- ✅ 13 admin panel components (Session 3)
- ✅ 11 new API endpoints (bulk operations)
- ✅ OAuth integration (GitHub, Google)
- ✅ Real-time job monitoring
- ✅ Comprehensive documentation (admin manual, deployment checklist)
- ✅ E2E testing framework (Playwright)

**Next Steps**:
- 🚧 E2E test implementation
- 🚧 WebSocket for real-time updates
- 🚧 Advanced analytics (ML-powered insights)
- 🚧 Email notifications

For implementation details, see migration plan. For API usage, see endpoint documentation. For development, see workflow section. For admin features, see [admin manual](docs/admin-manual.md).

🚀 Happy Building!
