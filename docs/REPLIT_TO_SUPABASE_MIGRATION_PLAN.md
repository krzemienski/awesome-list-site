# Replit → Supabase Cloud Migration Plan
## Comprehensive Roadmap for Docker + Supabase Migration

**Plan ID**: `replit-to-supabase-2025-11-29`
**Created**: 2025-11-29
**Supabase Project**: jeyldoypdkgsrfdhdcmm (existing - will be reset)
**Complexity Score**: 0.72/1.00 (MEDIUM-HIGH)
**Estimated Duration**: 48-63 hours (4-6 weeks)
**Risk Level**: MEDIUM (schema reset, comprehensive auth changes)

---

## Executive Summary

This plan migrates the **Awesome Video Resources** application from Replit-hosted services to a **fully self-managed Docker + Supabase Cloud architecture**. The migration involves:

✅ **What's Being Migrated**:
- 2,647 approved video development resources
- 18-table PostgreSQL schema (resources, categories, learning journeys, AI enrichment)
- 70 API endpoints (13 public, 26 authenticated, 21 admin)
- 7 AI service modules (Claude Haiku 4.5 integration)
- GitHub bidirectional sync (import/export awesome lists)
- React 18 frontend (40,706 lines of TypeScript)

❌ **What's NOT Being Migrated**:
- Existing user accounts (fresh start per user request)
- User preferences, favorites, bookmarks (tied to old auth system)
- Session history and audit logs (architecture change)
- Existing Supabase data (11 tables from different app - will be destroyed)

🎯 **Migration Strategy**:
- **Database**: Reuse existing Supabase project (jeyldoypdkgsrfdhdcmm) → **Destroy old schema completely** → Rebuild fresh with 16 tables
- **Auth**: Replace Replit OAuth → Supabase Auth (email, GitHub, Google)
- **Infrastructure**: Docker Compose → Web app container + Supabase Cloud integration
- **Data**: Sanitized resource migration (no PII, admin accounts recreated)
- **Testing**: MCP browser automation for complete E2E validation

**⚠️ IMPORTANT**: Existing Supabase project will be **COMPLETELY WIPED** - all 11 tables destroyed, rebuilt from scratch for awesome-video.

---

## Architecture Transformation

### Current State (Replit-Hosted)

```
┌─────────────────────────────────────────────────────────────┐
│                    REPLIT PLATFORM                           │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Node.js Application (Port 5000)               │        │
│  │  ├─ Express API (70 endpoints)                 │        │
│  │  ├─ React SPA (Vite SSR + Static)              │        │
│  │  ├─ AI Services (7 modules, Claude Haiku 4.5)  │        │
│  │  └─ GitHub Sync (import/export awesome lists)  │        │
│  └────────────────┬───────────────────────────────┘        │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────┐          │
│  │  Replit OAuth (OpenID Connect)               │          │
│  │  • Providers: GitHub, Google, Apple, X       │          │
│  │  • Env: REPL_ID, ISSUER_URL                  │          │
│  │  • Session: PostgreSQL (sessions table)      │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Replit PostgreSQL (Neon-powered)              │        │
│  │  • 18 tables (resources, users, enrichment)    │        │
│  │  • 2,647 approved resources                    │        │
│  │  • Drizzle ORM migrations                      │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Replit GitHub Connector                       │        │
│  │  • Env: REPL_IDENTITY, REPLIT_CONNECTORS_HOST  │        │
│  │  • Runtime OAuth token fetching                │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

External Services (Unchanged):
├─ Anthropic Claude API (ANTHROPIC_API_KEY)
└─ OpenAI API (OPENAI_API_KEY)
```

### Target State (Docker + Supabase Cloud)

```
┌─────────────────────────────────────────────────────────────┐
│                  DOCKER HOST (Your Server)                   │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Web Service Container (Node.js 20)            │        │
│  │  Port: 3000 (internal) → 80/443 (nginx)        │        │
│  │                                                 │        │
│  │  ├─ Express API (70 endpoints)                 │        │
│  │  │  └─ Supabase Auth middleware (JWT verify)   │        │
│  │  ├─ React Build (static assets)                │        │
│  │  ├─ AI Services (Claude Haiku 4.5)             │        │
│  │  │  └─ Redis cache for distributed caching     │        │
│  │  └─ GitHub Integration (direct token)          │        │
│  │                                                 │        │
│  │  Env Variables:                                │        │
│  │  • SUPABASE_URL                                │        │
│  │  • SUPABASE_ANON_KEY                           │        │
│  │  • SUPABASE_SERVICE_ROLE_KEY                   │        │
│  │  • GITHUB_TOKEN (direct, not Replit)          │        │
│  │  • ANTHROPIC_API_KEY                           │        │
│  └─────────────────┬──────────────────────────────┘        │
│                    │                                         │
│  ┌─────────────────▼──────────────────────────────┐        │
│  │  Redis Container (Cache + Sessions)            │        │
│  │  Port: 6379                                    │        │
│  │  • AI response caching (1hr TTL)               │        │
│  │  • URL analysis caching (24hr TTL)             │        │
│  │  • Recommendation caching (5min TTL)           │        │
│  │  • Session storage (optional, can use JWT)     │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Nginx Reverse Proxy                           │        │
│  │  Ports: 80 (HTTP) → 443 (HTTPS)                │        │
│  │  • SSL termination                             │        │
│  │  • Rate limiting                                │        │
│  │  • Security headers                             │        │
│  │  • Proxy to web:3000                           │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
└───────────────────┬──────────────────────────────────────────┘
                    │ HTTPS
                    ↓
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE CLOUD (New Project)                    │
│           Project: awesome-video-production                  │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Supabase Auth                                 │        │
│  │  • Email/Password (magic link)                 │        │
│  │  • OAuth: GitHub, Google                       │        │
│  │  • JWT tokens (access + refresh)               │        │
│  │  • User metadata (role: admin/user)            │        │
│  │  • Row-Level Security helpers (auth.uid())     │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  PostgreSQL Database (Supabase-managed)        │        │
│  │  • 16 tables (no sessions, no local users)     │        │
│  │  • RLS enabled on all user-facing tables       │        │
│  │  • Full-text search (pg_trgm enabled)          │        │
│  │  • Automatic backups                           │        │
│  │  • Connection pooler (Supavisor)               │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Storage (for future: resource images/videos)  │        │
│  │  • Buckets: avatars, resource-thumbnails       │        │
│  │  • CDN integration                              │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

External Services:
├─ Anthropic Claude API (AI enrichment, recommendations)
├─ OpenAI API (optional, for learning path generation)
└─ GitHub API (direct token, no Replit connector)
```

---

## Phase 0: Pre-Migration Setup (3-4 hours)

**Purpose**: Reset existing Supabase project, document baseline, prepare environment

### Task 0.1: Destroy Existing Supabase Schema (30 min)
**Validation Tier**: Infrastructure

**⚠️ WARNING**: This will PERMANENTLY DELETE all data in the current Supabase project!

**Existing Project Info**:
- Project Ref: `jeyldoypdkgsrfdhdcmm`
- Project URL: https://jeyldoypdkgsrfdhdcmm.supabase.co
- Current tables: 11 (users, projects, ideas, awesome_*, etc.)
- Status: Will be completely destroyed and rebuilt

**Steps via Supabase MCP**:

```sql
-- 1. Drop all existing tables in cascade order
-- Execute via: mcp__supabase__execute_sql()

-- Drop awesome list tables
DROP TABLE IF EXISTS awesome_project_tags CASCADE;
DROP TABLE IF EXISTS awesome_project_categories CASCADE;
DROP TABLE IF EXISTS awesome_tags CASCADE;
DROP TABLE IF EXISTS awesome_projects CASCADE;
DROP TABLE IF EXISTS awesome_categories CASCADE;
DROP TABLE IF EXISTS awesome_lists CASCADE;

-- Drop application tables
DROP TABLE IF EXISTS shared_templates CASCADE;
DROP TABLE IF EXISTS prompt_templates CASCADE;
DROP TABLE IF EXISTS template_categories CASCADE;
DROP TABLE IF EXISTS researcher_projects CASCADE;
DROP TABLE IF EXISTS project_categories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS researchers CASCADE;
DROP TABLE IF EXISTS prompts CASCADE;
DROP TABLE IF EXISTS code_generations CASCADE;
DROP TABLE IF EXISTS ideas CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS user_projects CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Verify all tables dropped
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- Expected: Empty result (no tables)

-- 3. Drop any remaining sequences/functions/triggers
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all sequences
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
    END LOOP;

    -- Drop all functions (except built-in)
    FOR r IN (SELECT proname FROM pg_proc p
              JOIN pg_namespace n ON p.pronamespace = n.oid
              WHERE n.nspname = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || ' CASCADE';
    END LOOP;
END $$;

-- 4. Save current credentials for reference
```

**Credentials to Document**:
```bash
mkdir -p docs/secrets
cat > docs/secrets/supabase-project-info.txt << 'EOF'
Project Ref: jeyldoypdkgsrfdhdcmm
Project URL: https://jeyldoypdkgsrfdhdcmm.supabase.co
Anon Key: (get from Supabase dashboard → Settings → API)
Service Role Key: (get from dashboard - KEEP SECRET!)
Database Password: (from dashboard → Settings → Database)
EOF
```

**Validation Gate 0.1**:
```bash
# Via Supabase MCP
✓ All tables dropped (list_tables returns empty for public schema)
✓ No orphaned sequences
✓ No orphaned functions
✓ Project still accessible (not deleted)
✓ Credentials documented
```

**Pass Criteria**:
- [ ] All existing tables destroyed
- [ ] Public schema clean (no tables)
- [ ] Project remains active and healthy
- [ ] Credentials saved to docs/secrets/

**Rollback**: Cannot rollback (data destroyed). **MAKE SURE YOU WANT TO DO THIS FIRST!**

---

### Task 0.2: Document Current Replit Environment (45 min)
**Validation Tier**: Documentation

**Steps**:
```bash
# 1. Export current database schema
cd /Users/nick/Desktop/awesome-list-site
npx drizzle-kit introspect

# 2. Count current resources
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM resources GROUP BY status;"
# Expected: approved=2647, pending=1, etc.

# 3. Export resource data (no users)
psql $DATABASE_URL -c "
  COPY (
    SELECT id, title, url, description, category, subcategory, sub_subcategory,
           metadata, created_at, updated_at
    FROM resources
    WHERE status = 'approved'
    ORDER BY category, subcategory, title
  ) TO STDOUT WITH CSV HEADER
" > docs/migration/replit-resources-export.csv

# 4. Export category hierarchy
psql $DATABASE_URL -c "SELECT * FROM categories ORDER BY name;" > docs/migration/categories.csv
psql $DATABASE_URL -c "SELECT * FROM subcategories ORDER BY category_id, name;" > docs/migration/subcategories.csv
psql $DATABASE_URL -c "SELECT * FROM sub_subcategories ORDER BY subcategory_id, name;" > docs/migration/sub_subcategories.csv

# 5. Document environment variables
printenv | grep -E "DATABASE|REPL|ISSUER|GITHUB|ANTHROPIC|OPENAI|SESSION" > docs/migration/replit-env-vars.txt
```

**Validation Gate 0.2**:
```bash
✓ Resource CSV contains 2,647 rows
✓ Category hierarchy exported (9 categories expected)
✓ Environment variables documented
✓ Files created in docs/migration/
```

**Pass Criteria**:
- [ ] Resource data exported completely
- [ ] Category hierarchy captured
- [ ] Baseline documented

**Rollback**: N/A (documentation only)

---

### Task 0.3: Set Up Local Docker Environment (90 min)
**Validation Tier**: Infrastructure

**Steps**:
```bash
# 1. Install Docker Desktop (if not installed)
# macOS: brew install --cask docker
# Verify: docker --version

# 2. Create project structure
mkdir -p docker/{web,nginx,redis}

# 3. Create .env.example
cat > .env.example << 'EOF'
# Supabase Configuration (NEW)
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # KEEP SECRET

# Database (Supabase-managed, for reference)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Redis Cache (Local Docker)
REDIS_URL=redis://redis:6379

# GitHub Integration (Direct Token)
GITHUB_TOKEN=ghp_your_personal_access_token

# AI Services
ANTHROPIC_API_KEY=sk-ant-api03-...
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-api03-...  # Preferred
OPENAI_API_KEY=sk-...  # Optional

# Application Settings
NODE_ENV=production
PORT=3000
WEBSITE_URL=https://yourdomain.com

# OAuth Providers (Supabase handles redirects)
# Configure these in Supabase dashboard → Authentication → Providers
EOF

# 4. Copy and customize actual .env
cp .env.example .env
# DO NOT COMMIT .env
echo ".env" >> .gitignore
echo "docs/secrets/" >> .gitignore
```

**Validation Gate 0.3**:
```bash
✓ Docker Desktop running
✓ .env.example created
✓ .env created (not in git)
✓ Directory structure ready
```

**Pass Criteria**:
- [ ] Docker installed and running
- [ ] Environment template created
- [ ] Git ignores configured

**Rollback**: N/A (local setup only)

---

### Task 0.4: Enable Supabase Extensions (20 min)
**Validation Tier**: Configuration

**Steps via Supabase MCP**:
```bash
# Run these SQL commands via Supabase SQL Editor or MCP
```

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable pgcrypto for secure functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verify extensions
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_trgm', 'pgcrypto');
```

**Validation Gate 0.4**:
```bash
✓ All 3 extensions enabled
✓ uuid_generate_v4() function available
✓ pg_trgm similarity() function available
```

**Pass Criteria**:
- [ ] Extensions enabled successfully
- [ ] Functions verified

**Rollback**: Drop extensions (safe, no data)

---

## Phase 1: Supabase Database Schema Design (6-8 hours)

**Purpose**: Create 16-table schema with Row-Level Security policies

### Task 1.1: Create Core Tables (120 min)
**Validation Tier**: Schema

**Migration File**: `supabase/migrations/20251129000001_create_core_tables.sql`

```sql
-- =====================================================
-- CORE TABLES: Resources, Categories, Tags
-- =====================================================

-- Categories (Top Level)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);

-- Subcategories (Level 2)
CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX idx_subcategories_slug ON subcategories(slug);

-- Sub-Subcategories (Level 3)
CREATE TABLE sub_subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  subcategory_id UUID NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subcategory_id, slug)
);

CREATE INDEX idx_sub_subcategories_subcategory_id ON sub_subcategories(subcategory_id);
CREATE INDEX idx_sub_subcategories_slug ON sub_subcategories(slug);

-- Resources (Main Content Table)
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,  -- Denormalized for query performance
  subcategory TEXT,
  sub_subcategory TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  github_synced BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  search_vector TSVECTOR,  -- Full-text search
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_resources_status_category ON resources(status, category);
CREATE INDEX idx_resources_github_synced ON resources(github_synced);
CREATE INDEX idx_resources_submitted_by ON resources(submitted_by);

-- Full-text search index
CREATE INDEX idx_resources_search ON resources USING GIN(search_vector);

-- Auto-update search vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_resources_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_search_vector_update
  BEFORE INSERT OR UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_search_vector();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subcategories_updated_at
  BEFORE UPDATE ON subcategories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sub_subcategories_updated_at
  BEFORE UPDATE ON sub_subcategories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tags_slug ON tags(slug);

-- Resource Tags (Many-to-Many)
CREATE TABLE resource_tags (
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (resource_id, tag_id)
);

CREATE INDEX idx_resource_tags_resource_id ON resource_tags(resource_id);
CREATE INDEX idx_resource_tags_tag_id ON resource_tags(tag_id);
```

**Validation via Supabase MCP**:
```bash
# After applying migration via Supabase dashboard or MCP
supabase migration list  # Should show migration applied
supabase db pull  # Verify schema matches
```

**Pass Criteria**:
- [ ] All 6 core tables created
- [ ] Indexes created successfully
- [ ] Triggers functional (test INSERT)
- [ ] Foreign keys enforced

---

### Task 1.2: Create User Interaction Tables (60 min)
**Validation Tier**: Schema

**Migration File**: `supabase/migrations/20251129000002_user_interactions.sql`

```sql
-- =====================================================
-- USER INTERACTION TABLES
-- =====================================================

-- User Favorites
CREATE TABLE user_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, resource_id)
);

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_resource_id ON user_favorites(resource_id);

-- User Bookmarks
CREATE TABLE user_bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, resource_id)
);

CREATE INDEX idx_user_bookmarks_user_id ON user_bookmarks(user_id);

-- User Preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_categories JSONB DEFAULT '[]'::jsonb,
  skill_level TEXT NOT NULL DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  learning_goals JSONB DEFAULT '[]'::jsonb,
  preferred_resource_types JSONB DEFAULT '[]'::jsonb,
  time_commitment TEXT DEFAULT 'flexible' CHECK (time_commitment IN ('daily', 'weekly', 'flexible')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- User Interactions (Analytics)
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'click', 'bookmark', 'rate', 'complete')),
  interaction_value INTEGER,  -- Rating (1-5) or time spent (seconds)
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_resource_id ON user_interactions(resource_id);
CREATE INDEX idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX idx_user_interactions_timestamp ON user_interactions(timestamp);
```

**Pass Criteria**:
- [ ] 4 user tables created
- [ ] Foreign keys to auth.users working
- [ ] Indexes created

---

### Task 1.3: Create Learning Journey Tables (60 min)
**Validation Tier**: Schema

```sql
-- =====================================================
-- LEARNING JOURNEY TABLES
-- =====================================================

-- Learning Journeys
CREATE TABLE learning_journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration TEXT,  -- e.g., "20 hours"
  icon TEXT,
  order_index INTEGER,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_journeys_category ON learning_journeys(category);
CREATE INDEX idx_learning_journeys_status ON learning_journeys(status);
CREATE INDEX idx_learning_journeys_order_index ON learning_journeys(order_index);

-- Journey Steps
CREATE TABLE journey_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES learning_journeys(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_optional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(journey_id, step_number)
);

CREATE INDEX idx_journey_steps_journey_id ON journey_steps(journey_id);
CREATE INDEX idx_journey_steps_resource_id ON journey_steps(resource_id);

-- User Journey Progress
CREATE TABLE user_journey_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES learning_journeys(id) ON DELETE CASCADE,
  current_step_id UUID REFERENCES journey_steps(id) ON DELETE SET NULL,
  completed_steps JSONB DEFAULT '[]'::jsonb,  -- Array of step IDs
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, journey_id)
);

CREATE INDEX idx_user_journey_progress_user_id ON user_journey_progress(user_id);
CREATE INDEX idx_user_journey_progress_journey_id ON user_journey_progress(journey_id);

CREATE TRIGGER learning_journeys_updated_at
  BEFORE UPDATE ON learning_journeys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

**Pass Criteria**:
- [ ] 3 learning tables created
- [ ] Cascade deletes configured
- [ ] Unique constraints working

---

### Task 1.4: Create AI Processing Tables (45 min)
**Validation Tier**: Schema

```sql
-- =====================================================
-- AI PROCESSING & ENRICHMENT TABLES
-- =====================================================

-- Enrichment Jobs
CREATE TABLE enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  filter TEXT DEFAULT 'all' CHECK (filter IN ('all', 'unenriched')),
  batch_size INTEGER DEFAULT 10,
  total_resources INTEGER DEFAULT 0,
  processed_resources INTEGER DEFAULT 0,
  successful_resources INTEGER DEFAULT 0,
  failed_resources INTEGER DEFAULT 0,
  skipped_resources INTEGER DEFAULT 0,
  processed_resource_ids JSONB DEFAULT '[]'::jsonb,
  failed_resource_ids JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrichment_jobs_status ON enrichment_jobs(status);
CREATE INDEX idx_enrichment_jobs_started_by ON enrichment_jobs(started_by);

-- Enrichment Queue (Individual Tasks)
CREATE TABLE enrichment_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  ai_metadata JSONB,  -- suggestedTitle, suggestedDescription, suggestedTags, confidence, keyTopics
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrichment_queue_job_id ON enrichment_queue(job_id);
CREATE INDEX idx_enrichment_queue_resource_id ON enrichment_queue(resource_id);
CREATE INDEX idx_enrichment_queue_status ON enrichment_queue(status);

-- Resource Edits (Suggested Edits from Users)
CREATE TABLE resource_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  original_resource_updated_at TIMESTAMPTZ NOT NULL,
  proposed_changes JSONB NOT NULL,  -- { field: { old: value, new: value } }
  proposed_data JSONB NOT NULL,  -- Partial<Resource>
  claude_metadata JSONB,  -- AI analysis results
  claude_analyzed_at TIMESTAMPTZ,
  handled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resource_edits_resource_id ON resource_edits(resource_id);
CREATE INDEX idx_resource_edits_status ON resource_edits(status);
CREATE INDEX idx_resource_edits_submitted_by ON resource_edits(submitted_by);

CREATE TRIGGER enrichment_jobs_updated_at
  BEFORE UPDATE ON enrichment_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER enrichment_queue_updated_at
  BEFORE UPDATE ON enrichment_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER resource_edits_updated_at
  BEFORE UPDATE ON resource_edits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

**Pass Criteria**:
- [ ] 3 AI processing tables created
- [ ] Status enums enforced
- [ ] Triggers working

---

### Task 1.5: Create GitHub Integration Tables (45 min)
**Validation Tier**: Schema

```sql
-- =====================================================
-- GITHUB INTEGRATION TABLES
-- =====================================================

-- GitHub Sync Queue
CREATE TABLE github_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_url TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  resource_ids JSONB DEFAULT '[]'::jsonb,
  action TEXT NOT NULL CHECK (action IN ('import', 'export')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_github_sync_queue_status ON github_sync_queue(status);
CREATE INDEX idx_github_sync_queue_repository_url ON github_sync_queue(repository_url);

-- GitHub Sync History
CREATE TABLE github_sync_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_url TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('export', 'import')),
  commit_sha TEXT,
  commit_message TEXT,
  commit_url TEXT,
  resources_added INTEGER DEFAULT 0,
  resources_updated INTEGER DEFAULT 0,
  resources_removed INTEGER DEFAULT 0,
  total_resources INTEGER DEFAULT 0,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  snapshot JSONB DEFAULT '{}'::jsonb,  -- Resource snapshot for diffing
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_github_sync_history_repository_url ON github_sync_history(repository_url);
CREATE INDEX idx_github_sync_history_direction ON github_sync_history(direction);
CREATE INDEX idx_github_sync_history_created_at ON github_sync_history(created_at);
```

**Pass Criteria**:
- [ ] 2 GitHub sync tables created
- [ ] Indexes optimized for queries
- [ ] No foreign key errors

---

### Task 1.6: Create Audit Log Table (30 min)
**Validation Tier**: Schema

```sql
-- =====================================================
-- AUDIT & LOGGING
-- =====================================================

-- Resource Audit Log
CREATE TABLE resource_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  action TEXT NOT NULL,  -- created, updated, approved, rejected, synced, edit_suggested, edit_approved, edit_rejected
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changes JSONB,  -- What changed
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resource_audit_log_resource_id ON resource_audit_log(resource_id);
CREATE INDEX idx_resource_audit_log_action ON resource_audit_log(action);
CREATE INDEX idx_resource_audit_log_performed_by ON resource_audit_log(performed_by);
CREATE INDEX idx_resource_audit_log_created_at ON resource_audit_log(created_at DESC);
```

**Pass Criteria**:
- [ ] Audit log table created
- [ ] Can log actions without errors
- [ ] Query performance acceptable

---

### Task 1.7: Implement Row-Level Security (RLS) Policies (90 min)
**Validation Tier**: Security

**Migration File**: `supabase/migrations/20251129000003_enable_rls.sql`

```sql
-- =====================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all user-facing tables
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journey_progress ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RESOURCES: Public Read, Admin Write
-- =====================================================

-- Public can view approved resources
CREATE POLICY "Anyone can view approved resources"
  ON resources FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Authenticated users can view their own pending submissions
CREATE POLICY "Users can view their own pending resources"
  ON resources FOR SELECT
  TO authenticated
  USING (
    (status = 'pending' AND submitted_by = auth.uid()) OR
    (status IN ('approved', 'rejected'))  -- Can see approved/rejected status
  );

-- Admins can view all resources
CREATE POLICY "Admins can view all resources"
  ON resources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Authenticated users can create pending resources
CREATE POLICY "Users can submit new resources"
  ON resources FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid() AND
    status = 'pending'
  );

-- Admins can update any resource
CREATE POLICY "Admins can update resources"
  ON resources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admins can delete resources
CREATE POLICY "Admins can delete resources"
  ON resources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- =====================================================
-- RESOURCE EDITS: Users Own, Admins Manage
-- =====================================================

-- Users can view their own edits
CREATE POLICY "Users can view their own edits"
  ON resource_edits FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

-- Admins can view all edits
CREATE POLICY "Admins can view all edits"
  ON resource_edits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can create edit suggestions
CREATE POLICY "Users can submit edit suggestions"
  ON resource_edits FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid() AND
    status = 'pending'
  );

-- Admins can update edit status
CREATE POLICY "Admins can update edits"
  ON resource_edits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- =====================================================
-- USER DATA: Strict User Ownership
-- =====================================================

-- Favorites: Users can only manage their own
CREATE POLICY "Users can manage their own favorites"
  ON user_favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Bookmarks: Users can only manage their own
CREATE POLICY "Users can manage their own bookmarks"
  ON user_bookmarks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Preferences: Users can only manage their own
CREATE POLICY "Users can manage their own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Interactions: Users can create their own, admins can view all
CREATE POLICY "Users can create their own interactions"
  ON user_interactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own interactions"
  ON user_interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all interactions"
  ON user_interactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Journey Progress: Users can only manage their own
CREATE POLICY "Users can manage their own journey progress"
  ON user_journey_progress FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- ADMIN-ONLY TABLES: No RLS (Service Role Access)
-- =====================================================

-- These tables are admin/system-only, accessed via service_role key
-- No RLS needed as they're never exposed to client

-- enrichment_jobs - Admin dashboard only
-- enrichment_queue - System processing only
-- github_sync_queue - Admin dashboard only
-- github_sync_history - Admin dashboard + system
-- resource_audit_log - Admin dashboard + system logging
```

**Validation via MCP**:
```bash
# Test RLS policies
# 1. Try SELECT as anon → should only see approved resources
# 2. Try INSERT as authenticated → should create pending resource
# 3. Try UPDATE as non-admin → should fail
# 4. Try UPDATE as admin → should succeed
```

**Pass Criteria**:
- [ ] RLS enabled on 7 tables
- [ ] Public can read approved resources
- [ ] Users can manage own data
- [ ] Admins can manage everything

---

### Task 1.8: Create Helper Functions & Views (45 min)
**Validation Tier**: Schema Enhancement

```sql
-- =====================================================
-- HELPER FUNCTIONS & VIEWS
-- =====================================================

-- Function: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(raw_user_meta_data->>'role', 'user')
  FROM auth.users
  WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- View: Resource counts by category
CREATE OR REPLACE VIEW resource_counts_by_category AS
SELECT
  category,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending
FROM resources
GROUP BY category
ORDER BY category;

-- View: Admin dashboard stats
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  (SELECT COUNT(*) FROM resources) AS total_resources,
  (SELECT COUNT(*) FROM resources WHERE status = 'pending') AS pending_resources,
  (SELECT COUNT(*) FROM categories) AS total_categories,
  (SELECT COUNT(*) FROM learning_journeys) AS total_journeys,
  (SELECT COUNT(*) FROM auth.users
   WHERE last_sign_in_at > NOW() - INTERVAL '30 days') AS active_users;

-- Grant access to views
GRANT SELECT ON resource_counts_by_category TO authenticated, anon;
GRANT SELECT ON admin_dashboard_stats TO authenticated;
```

**Pass Criteria**:
- [ ] Helper functions created
- [ ] Views accessible
- [ ] Performance acceptable

---

## Phase 2: Supabase Authentication Setup (4-6 hours)

**Purpose**: Configure Supabase Auth, enable providers, set up admin roles

### Task 2.1: Configure Auth Providers (60 min)
**Validation Tier**: Configuration

**Steps**:

**Via Supabase Dashboard**:
1. Navigate to: https://supabase.com/dashboard/project/[PROJECT_REF]/auth/providers
2. **Enable Email Provider**:
   - ✅ Enable Email provider
   - ✅ Confirm email: Required
   - ✅ Secure email change: Enabled
   - ✅ Magic Link: Enabled (passwordless option)
   - Save configuration

3. **Enable GitHub OAuth**:
   - Go to https://github.com/settings/developers
   - Create OAuth App:
     - Name: "Awesome Video Production"
     - Homepage: https://yourdomain.com
     - Callback URL: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
   - Copy Client ID and Secret
   - In Supabase dashboard:
     - ✅ Enable GitHub provider
     - Paste Client ID and Client Secret
     - Scopes: `user:email` (default)
     - Save

4. **Enable Google OAuth**:
   - Go to https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID:
     - Type: Web application
     - Authorized redirect URI: `https://[PROJECT_REF].supabase.co/auth/v1/callback`
   - Copy Client ID and Secret
   - In Supabase dashboard:
     - ✅ Enable Google provider
     - Paste Client ID and Client Secret
     - Scopes: `email,profile` (default)
     - Save

5. **Configure Site URL**:
   - Authentication → URL Configuration
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: Add `http://localhost:3000` for development
   - Save

**Validation Gate 2.1**:
```bash
# Test via Supabase Auth UI
# 1. Try email signup → should send confirmation email
# 2. Click confirmation link → should confirm account
# 3. Try login → should return access_token
# 4. Test GitHub OAuth flow
# 5. Test Google OAuth flow
```

**Pass Criteria**:
- [ ] Email auth configured
- [ ] GitHub OAuth working
- [ ] Google OAuth working
- [ ] Redirect URLs set correctly

---

### Task 2.2: Set Up Admin Role System (45 min)
**Validation Tier**: Configuration + Code

**Approach**: Use Supabase user metadata to store roles

**Steps**:

1. **Create first admin user manually**:
```sql
-- Via Supabase SQL Editor
-- 1. Create user via Supabase Auth UI (Dashboard → Authentication → Users → Add User)
-- 2. Set admin role via SQL:
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'your-admin-email@example.com';
```

2. **Create admin management function**:
```sql
-- Function to promote user to admin (admin-only)
CREATE OR REPLACE FUNCTION promote_to_admin(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  -- Update target user
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  )
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

3. **Create backend middleware** (`server/supabaseAuth.ts`):
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Service role for admin operations
);

export const supabaseAuth = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!  // Anon key for client-side operations
);

// Middleware: Extract user from Authorization header
export async function extractUser(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      req.user = null;
    } else {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'user',
        metadata: user.user_metadata
      };
    }
  } catch (error) {
    console.error('Auth error:', error);
    req.user = null;
  }

  next();
}

// Middleware: Require authentication
export function isAuthenticated(req: any, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// Middleware: Require admin role
export function isAdmin(req: any, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
}
```

**Validation Gate 2.2**:
```typescript
// Test admin role system
// 1. Create test user via Supabase dashboard
// 2. Promote to admin via SQL
// 3. Get JWT token for user
// 4. Test API endpoint with token
// 5. Verify admin endpoints accessible
```

**Pass Criteria**:
- [ ] First admin user created
- [ ] Admin promotion function working
- [ ] Middleware authenticates users
- [ ] Admin endpoints protected

---

## Phase 3: Backend API Migration (8-10 hours)

**Purpose**: Replace Replit Auth with Supabase Auth, update all endpoints

### Task 3.1: Replace Authentication Endpoints (120 min)
**Validation Tier**: Flow + Functional

**File**: `server/routes.ts`

**Changes**:

1. **Remove Replit Auth imports** (lines 4-5):
```typescript
// DELETE:
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupLocalAuth } from "./localAuth";

// ADD:
import { extractUser, isAuthenticated, isAdmin, supabaseAuth } from "./supabaseAuth";
```

2. **Replace auth setup** (lines 220-221):
```typescript
// DELETE:
await setupAuth(app);
setupLocalAuth();

// ADD:
app.use(extractUser);  // Extract user from JWT on every request
```

3. **Replace /api/auth/user endpoint** (lines 315-365):
```typescript
// NEW IMPLEMENTATION:
app.get('/api/auth/user', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.json({ user: null, isAuthenticated: false });
    }

    // Return user from JWT token (already extracted by middleware)
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.metadata?.full_name || req.user.email?.split('@')[0],
        avatar: req.user.metadata?.avatar_url,
        role: req.user.role,
      },
      isAuthenticated: true
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});
```

4. **Remove old auth endpoints** (lines 224-273, 368-377):
```typescript
// DELETE:
app.post("/api/auth/local/login", ...);  // Handled by Supabase now
app.post('/api/auth/logout', ...);  // Client-side via supabase.auth.signOut()

// Replit OAuth endpoints removed (setupAuth no longer called)
```

5. **Update all authenticated endpoints**:
```typescript
// BEFORE: req.user.claims.sub
const userId = req.user.claims.sub;

// AFTER: req.user.id
const userId = req.user.id;
```

**Affected Endpoints** (26 endpoints need update):
- All endpoints using `isAuthenticated` middleware
- See API Surface analysis - search codebase for `req.user.claims.sub`

**Validation Gate 3.1**:
```bash
# 1. Start server with new auth
npm run dev

# 2. Test unauthenticated GET /api/auth/user
curl http://localhost:3000/api/auth/user
# Expected: {"user":null,"isAuthenticated":false}

# 3. Test with valid Supabase JWT
curl -H "Authorization: Bearer ${SUPABASE_JWT}" http://localhost:3000/api/auth/user
# Expected: {"user":{...},"isAuthenticated":true}

# 4. Test admin endpoint
curl -H "Authorization: Bearer ${ADMIN_JWT}" http://localhost:3000/api/admin/stats
# Expected: {"users":1,"resources":0,...}
```

**Pass Criteria**:
- [ ] Auth extraction middleware working
- [ ] /api/auth/user returns correct format
- [ ] Admin middleware blocks non-admins
- [ ] All 26 endpoints updated (grep confirms no `claims.sub`)

---

### Task 3.2: Update Storage Layer for Supabase (90 min)
**Validation Tier**: Flow

**File**: `server/storage.ts`

**Changes**:

1. **Update imports**:
```typescript
// Change from node-postgres Pool to Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

2. **Keep Drizzle ORM** (already compatible):
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
```

**NOTE**: Drizzle ORM works seamlessly with Supabase PostgreSQL. No changes needed to query logic!

3. **Update user operations** (remove upsertUser for OAuth):
```typescript
// Supabase handles user creation via Auth
// storage.getUser() can now query auth.users directly or use cached JWT data
async getUser(id: string): Promise<User | undefined> {
  // Option A: Query via Drizzle (if using public.users mirror table)
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;

  // Option B: Use Supabase Admin API (if relying on auth.users only)
  const { data } = await supabase.auth.admin.getUserById(id);
  return data.user ? {
    id: data.user.id,
    email: data.user.email!,
    role: data.user.user_metadata?.role || 'user',
    // ... map other fields
  } : undefined;
}
```

**Validation Gate 3.2**:
```bash
# Test each storage method
# 1. getUser() with valid UUID
# 2. listResources() with status filter
# 3. createResource() with user ID
# 4. Check foreign keys resolve correctly
```

**Pass Criteria**:
- [ ] Storage layer connects to Supabase
- [ ] All CRUD operations work
- [ ] Foreign keys to auth.users valid
- [ ] No SQL errors

---

### Task 3.3: Remove Replit-Specific Code (60 min)
**Validation Tier**: Cleanup

**Files to Delete**:
```bash
rm server/replitAuth.ts
rm server/localAuth.ts
rm server/github/replitConnection.ts
```

**Files to Update**:

1. **server/github/syncService.ts** (line 188):
```typescript
// BEFORE:
import { getGitHubClient } from './replitConnection';
const octokit = await getGitHubClient();

// AFTER:
import { GitHubClient } from './client';
const githubClient = new GitHubClient(process.env.GITHUB_TOKEN);
const octokit = githubClient['octokit'];  // Access private member (or expose getter)
```

2. **vite.config.ts** (lines 4, 9-17):
```typescript
// DELETE:
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

plugins: [
  react(),
  runtimeErrorOverlay(),  // DELETE
  ...(process.env.NODE_ENV !== "production" &&
  process.env.REPL_ID !== undefined
    ? [await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer())]
    : [])  // DELETE this entire block
]

// AFTER:
plugins: [react()]
```

3. **package.json**:
```bash
npm uninstall openid-client memoizee connect-pg-simple express-session @types/express-session
npm uninstall @replit/vite-plugin-cartographer @replit/vite-plugin-runtime-error-modal
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

**Validation Gate 3.3**:
```bash
✓ Replit files deleted
✓ No imports referencing deleted files
✓ TypeScript compiles: npm run check
✓ Build succeeds: npm run build
✓ No REPL_* environment variables referenced
```

**Pass Criteria**:
- [ ] All Replit code removed
- [ ] Dependencies cleaned up
- [ ] Application builds successfully
- [ ] No broken imports

---

## Phase 4: Frontend Auth Migration (4-5 hours)

**Purpose**: Replace frontend auth hooks with Supabase client

### Task 4.1: Install Supabase Client Libraries (15 min)
**Validation Tier**: Dependencies

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-react
npm install --save-dev @supabase/auth-helpers-shared
```

**Pass Criteria**:
- [ ] Dependencies installed
- [ ] No version conflicts

---

### Task 4.2: Create Supabase Client Configuration (30 min)
**Validation Tier**: Configuration

**File**: `client/src/lib/supabase.ts` (NEW)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://[PROJECT_REF].supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbG...';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,  // Store JWT in localStorage
  }
});

// Types for TypeScript
export type Database = {
  public: {
    Tables: {
      resources: {
        Row: {
          id: string;
          title: string;
          url: string;
          description: string;
          category: string;
          // ... all resource fields
        };
        Insert: Omit<Database['public']['Tables']['resources']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['resources']['Insert']>;
      };
      // ... other tables
    };
  };
};
```

**Environment Variables** (add to `client/.env.local`):
```bash
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

**Pass Criteria**:
- [ ] Supabase client configured
- [ ] Environment variables set
- [ ] TypeScript types defined

---

### Task 4.3: Replace useAuth Hook (60 min)
**Validation Tier**: Flow

**File**: `client/src/hooks/useAuth.ts`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        isLoading: false,
        isAuthenticated: !!session
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        isLoading: false,
        isAuthenticated: !!session
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return {
    user: authState.user,
    session: authState.session,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    isAdmin: authState.user?.user_metadata?.role === 'admin',
    logout
  };
}
```

**Pass Criteria**:
- [ ] Hook returns Supabase session
- [ ] onAuthStateChange listener working
- [ ] Logout function works
- [ ] isAdmin computed correctly

---

### Task 4.4: Update Login Page (45 min)
**Validation Tier**: UI

**File**: `client/src/pages/Login.tsx`

```typescript
import { useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Github } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const { toast } = useToast();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (error) throw error;

        toast({
          title: "Check your email",
          description: "We sent you a confirmation link."
        });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        setLocation('/');
      }
    } catch (error: any) {
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      // Redirect happens automatically
    } catch (error: any) {
      toast({
        title: "OAuth failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email for magic link",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We sent you a magic link to sign in."
      });
    } catch (error: any) {
      toast({
        title: "Failed to send magic link",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</CardTitle>
          <CardDescription>
            {mode === 'signin'
              ? 'Sign in to access your bookmarks and learning paths'
              : 'Create an account to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OAuth Buttons */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthLogin('github')}
            >
              <Github className="mr-2 h-4 w-4" />
              Continue with GitHub
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthLogin('google')}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                {/* Google icon SVG */}
              </svg>
              Continue with Google
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Loading...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleMagicLink}
                disabled={loading || !email}
              >
                Magic Link
              </Button>
            </div>
          </form>

          <div className="text-center text-sm">
            {mode === 'signin' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="underline"
                >
                  Sign up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="underline"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Validation Gate 4.4**:
```bash
# Manual browser testing
open http://localhost:3000/login

Checklist:
✓ Email signup form displays
✓ Can switch to sign-in mode
✓ GitHub OAuth button redirects correctly
✓ Google OAuth button redirects correctly
✓ Magic link sends email
✓ Error messages display properly
✓ Loading states work
```

**Pass Criteria**:
- [ ] All 4 auth methods accessible
- [ ] OAuth redirects working
- [ ] Email/password signup functional
- [ ] Magic link sends successfully

---

### Task 4.5: Create OAuth Callback Handler (30 min)
**Validation Tier**: Flow

**File**: `client/src/pages/AuthCallback.tsx` (NEW)

```typescript
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Handle OAuth callback
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Successful authentication
        setLocation('/');
      } else {
        // No session, redirect to login
        setLocation('/login');
      }
    });
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Completing authentication...</p>
    </div>
  );
}
```

**Add route to App.tsx**:
```typescript
import AuthCallback from './pages/AuthCallback';

// In routes:
<Route path="/auth/callback" component={AuthCallback} />
```

**Pass Criteria**:
- [ ] OAuth callback processes correctly
- [ ] Redirects to home after auth
- [ ] Session persists in localStorage

---

### Task 4.6: Update API Request Headers (45 min)
**Validation Tier**: Integration

**File**: `client/src/lib/queryClient.ts`

```typescript
// UPDATE apiRequest function (lines 11-30)
export async function apiRequest(url: string, options: RequestInit = {}) {
  // Get Supabase session
  const { data: { session } } = await supabase.auth.getSession();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(session?.access_token && {
      'Authorization': `Bearer ${session.access_token}`
    }),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers,
    // Remove credentials: 'include' (JWT in header now)
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}
```

**Update all API calls**:
```typescript
// BEFORE:
fetch('/api/resources', { credentials: 'include' });

// AFTER:
apiRequest('/api/resources');  // Automatically adds JWT header
```

**Validation Gate 4.6**:
```bash
# Test all API call patterns
# 1. Public endpoints (no token needed)
# 2. Authenticated endpoints (token added)
# 3. Admin endpoints (admin token required)
# 4. Verify Authorization header present
```

**Pass Criteria**:
- [ ] JWT tokens sent automatically
- [ ] Authenticated endpoints working
- [ ] Admin endpoints accessible
- [ ] No 401 errors for valid users

---

## Phase 5: Docker Containerization (6-8 hours)

**Purpose**: Create production-ready Docker containers

### Task 5.1: Create Dockerfile for Web Service (90 min)
**Validation Tier**: Artifact

**File**: `Dockerfile`

```dockerfile
# Multi-stage build for Node.js application
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Build application
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --chown=nodejs:nodejs shared ./shared
COPY --chown=nodejs:nodejs server ./server

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
```

**Validation Gate 5.1**:
```bash
# Build Docker image
docker build -t awesome-list-web:latest .

# Verify image
docker images | grep awesome-list-web
docker inspect awesome-list-web:latest | jq '.[0].Config.ExposedPorts'

# Test image (without env vars first)
docker run --rm awesome-list-web:latest node --version
# Expected: v20.x.x
```

**Pass Criteria**:
- [ ] Image builds without errors
- [ ] Image size < 400MB (Alpine base)
- [ ] Non-root user configured
- [ ] Healthcheck defined

---

### Task 5.2: Create docker-compose.yml (90 min)
**Validation Tier**: Orchestration

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: awesome-list-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - app-network

  # Web Application
  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: awesome-list-web
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      # Supabase Configuration
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      DATABASE_URL: ${DATABASE_URL}
      # Redis
      REDIS_URL: redis://redis:6379
      # GitHub Integration
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      # AI Services
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      AI_INTEGRATIONS_ANTHROPIC_API_KEY: ${AI_INTEGRATIONS_ANTHROPIC_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      # Application
      WEBSITE_URL: ${WEBSITE_URL:-http://localhost}
    ports:
      - "3000:3000"
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - app-network
    volumes:
      - ./logs:/app/logs  # Optional: Mount logs directory

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: awesome-list-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro  # SSL certificates
    depends_on:
      - web
    networks:
      - app-network

volumes:
  redis_data:
    driver: local

networks:
  app-network:
    driver: bridge
```

**Validation Gate 5.2**:
```bash
# Validate compose file
docker-compose config

# Test without starting (dry run)
docker-compose up --no-start

# Start services
docker-compose up -d

# Check all services running
docker-compose ps
# Expected: redis (healthy), web (healthy), nginx (Up)

# View logs
docker-compose logs -f web
```

**Pass Criteria**:
- [ ] Compose file validates
- [ ] All 3 services start
- [ ] Healthchecks pass
- [ ] Network connectivity working

---

### Task 5.3: Create Nginx Configuration (60 min)
**Validation Tier**: Configuration

**File**: `docker/nginx/nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    upstream web {
        server web:3000;
    }

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    server {
        listen 80;
        server_name _;  # Replace with your domain

        # Redirect HTTP to HTTPS (production only)
        # return 301 https://$server_name$request_uri;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

        # Proxy to web service
        location / {
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $host;

            # WebSocket support (if needed for future real-time features)
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            limit_req_status 429;

            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Auth endpoints stricter rate limiting
        location ~ ^/api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            limit_req_status 429;

            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Health check (no rate limit)
        location = /api/health {
            proxy_pass http://web;
            access_log off;
        }
    }

    # HTTPS server (uncomment for production)
    # server {
    #     listen 443 ssl http2;
    #     server_name yourdomain.com;
    #
    #     ssl_certificate /etc/nginx/ssl/fullchain.pem;
    #     ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    #     ssl_protocols TLSv1.2 TLSv1.3;
    #     ssl_prefer_server_ciphers on;
    #     ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    #
    #     # ... same location blocks as HTTP server
    # }
}
```

**Validation Gate 5.3**:
```bash
# Test nginx config
docker run --rm -v $(pwd)/docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx nginx -t
# Expected: syntax is ok, test is successful

# Test rate limiting
for i in {1..70}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/resources
done
# Expected: First 60 return 200, rest return 429

# Test security headers
curl -I http://localhost | grep -i "x-frame-options"
# Expected: X-Frame-Options: SAMEORIGIN
```

**Pass Criteria**:
- [ ] Nginx config valid
- [ ] Rate limiting functional
- [ ] Security headers present
- [ ] Compression enabled

---

## Phase 6: Data Migration (3-4 hours)

**Purpose**: Import 2,647 resources from Replit to Supabase

### Task 6.1: Create Migration Script (90 min)
**Validation Tier**: Tooling

**File**: `scripts/migrate-to-supabase.ts` (NEW)

```typescript
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ResourceRow {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory: string | null;
  sub_subcategory: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

async function migrateResources() {
  console.log('Starting resource migration...');

  // 1. Read exported CSV
  const csvContent = fs.readFileSync('docs/migration/replit-resources-export.csv', 'utf-8');
  const records: ResourceRow[] = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Found ${records.length} resources to migrate`);

  // 2. Batch insert (500 at a time for Supabase limits)
  const batchSize = 500;
  let migrated = 0;
  let errors: string[] = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    // Transform to Supabase schema (UUID instead of integer)
    const supabaseRecords = batch.map(r => ({
      // Generate new UUIDs (don't preserve old integer IDs)
      title: r.title,
      url: r.url,
      description: r.description,
      category: r.category,
      subcategory: r.subcategory,
      sub_subcategory: r.sub_subcategory,
      status: 'approved',  // All migrated resources are approved
      github_synced: false,  // Reset sync status
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    const { data, error } = await supabase
      .from('resources')
      .insert(supabaseRecords);

    if (error) {
      console.error(`Batch ${i / batchSize + 1} failed:`, error);
      errors.push(`Batch ${i}: ${error.message}`);
    } else {
      migrated += batch.length;
      console.log(`Migrated ${migrated}/${records.length} resources`);
    }

    // Rate limit: 1 batch per second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Migration complete: ${migrated} resources migrated`);
  if (errors.length > 0) {
    console.error(`❌ ${errors.length} batches failed:`, errors);
  }

  return { migrated, errors };
}

async function migrateCategories() {
  console.log('Migrating category hierarchy...');

  // Read category CSVs
  const categoriesCsv = fs.readFileSync('docs/migration/categories.csv', 'utf-8');
  const subcategoriesCsv = fs.readFileSync('docs/migration/subcategories.csv', 'utf-8');
  const subSubcategoriesCsv = fs.readFileSync('docs/migration/sub_subcategories.csv', 'utf-8');

  // Parse
  const categories = csv.parse(categoriesCsv, { columns: true });
  const subcategories = csv.parse(subcategoriesCsv, { columns: true });
  const subSubcategories = csv.parse(subSubcategoriesCsv, { columns: true });

  // Insert categories (generate new UUIDs)
  const { data: catData, error: catError } = await supabase
    .from('categories')
    .insert(categories.map((c: any) => ({
      name: c.name,
      slug: c.slug,
      description: c.description || null
    })))
    .select();

  if (catError) {
    console.error('Category migration failed:', catError);
    return { error: catError };
  }

  console.log(`✅ Migrated ${categories.length} categories`);

  // Map old integer IDs to new UUIDs
  const categoryIdMap = new Map();
  categories.forEach((oldCat: any, index: number) => {
    categoryIdMap.set(oldCat.id, catData![index].id);
  });

  // Insert subcategories with new UUIDs
  const { data: subData, error: subError } = await supabase
    .from('subcategories')
    .insert(subcategories.map((s: any) => ({
      name: s.name,
      slug: s.slug,
      category_id: categoryIdMap.get(s.category_id),  // Map to new UUID
      description: s.description || null
    })))
    .select();

  if (subError) {
    console.error('Subcategory migration failed:', subError);
    return { error: subError };
  }

  console.log(`✅ Migrated ${subcategories.length} subcategories`);

  // Map subcategory IDs
  const subcategoryIdMap = new Map();
  subcategories.forEach((oldSub: any, index: number) => {
    subcategoryIdMap.set(oldSub.id, subData![index].id);
  });

  // Insert sub-subcategories
  const { error: subSubError } = await supabase
    .from('sub_subcategories')
    .insert(subSubcategories.map((s: any) => ({
      name: s.name,
      slug: s.slug,
      subcategory_id: subcategoryIdMap.get(s.subcategory_id),
      description: s.description || null
    })));

  if (subSubError) {
    console.error('Sub-subcategory migration failed:', subSubError);
    return { error: subSubError };
  }

  console.log(`✅ Migrated ${subSubcategories.length} sub-subcategories`);

  return { success: true };
}

async function main() {
  try {
    // Step 1: Migrate hierarchy
    await migrateCategories();

    // Step 2: Migrate resources
    await migrateResources();

    // Step 3: Verify counts
    const { count: resourceCount } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Final counts:`);
    console.log(`   Resources: ${resourceCount}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
```

**Run Migration**:
```bash
npm install csv-parse
tsx scripts/migrate-to-supabase.ts
```

**Validation Gate 6.1**:
```bash
# Verify migration via Supabase MCP
supabase db select "SELECT COUNT(*) FROM resources;"
# Expected: 2647

supabase db select "SELECT category, COUNT(*) FROM resources GROUP BY category ORDER BY category;"
# Expected: 9 categories with counts

# Verify foreign keys intact
supabase db select "
  SELECT c.name, COUNT(r.id)
  FROM categories c
  LEFT JOIN resources r ON r.category = c.name
  GROUP BY c.name;
"
```

**Pass Criteria**:
- [ ] 2,647 resources migrated
- [ ] Category hierarchy intact
- [ ] No data corruption
- [ ] Full-text search working

---

## Phase 7: AI Services Redis Integration (2-3 hours)

**Purpose**: Replace in-memory caches with Redis for distributed deployments

### Task 7.1: Install Redis Client (15 min)
```bash
npm install redis ioredis @types/ioredis
```

### Task 7.2: Update ClaudeService with Redis Cache (90 min)

**File**: `server/ai/claudeService.ts`

```typescript
import Redis from 'ioredis';

export class ClaudeService {
  // ... existing code ...
  private redis: Redis | null = null;

  private constructor() {
    // Initialize Redis if available
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
      this.redis.on('error', (err) => {
        console.error('Redis error:', err);
        this.redis = null;  // Fallback to in-memory
      });
      this.redis.on('connect', () => {
        console.log('Redis cache connected for ClaudeService');
      });
    }

    // Keep in-memory cache as fallback
    this.responseCache = new Map();
    this.analysisCache = new Map();
    this.initializeClient();
  }

  // Update getFromCache
  private async getFromCache(key: string): Promise<string | null> {
    // Try Redis first
    if (this.redis) {
      try {
        const cached = await this.redis.get(`claude:response:${key}`);
        if (cached) {
          console.log('Redis cache HIT');
          return cached;
        }
      } catch (error) {
        console.warn('Redis get failed, falling back to memory:', error);
      }
    }

    // Fallback to in-memory
    const entry = this.responseCache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.CACHE_TTL) {
      this.responseCache.delete(key);
      return null;
    }

    return entry.response;
  }

  // Update addToCache
  private async addToCache(key: string, response: string): Promise<void> {
    // Store in Redis with TTL
    if (this.redis) {
      try {
        await this.redis.setex(
          `claude:response:${key}`,
          Math.floor(this.CACHE_TTL / 1000),  // TTL in seconds
          response
        );
      } catch (error) {
        console.warn('Redis set failed:', error);
      }
    }

    // Also store in memory as fallback
    if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey) {
        this.responseCache.delete(oldestKey);
      }
    }

    this.responseCache.set(key, {
      response,
      timestamp: Date.now()
    });
  }

  // Similar updates for analysisCache methods...
}
```

**Pass Criteria**:
- [ ] Redis client configured
- [ ] Cache writes to Redis
- [ ] Fallback to memory works
- [ ] TTL expiration correct

---

## Phase 8: Testing & Validation (6-8 hours)

**Purpose**: Comprehensive E2E testing with MCP browser automation

### Task 8.1: Create E2E Test Suite (180 min)

**File**: `tests/e2e/complete-user-flows.spec.ts` (NEW)

```typescript
import { supabase } from '../../client/src/lib/supabase';

/**
 * Complete E2E test suite using MCP Playwright browser automation
 * Tests all user flows: anonymous, authenticated, admin
 */

describe('Complete User Flows - Awesome Video Site', () => {

  // ===== ANONYMOUS USER FLOW =====
  describe('Anonymous User Flow', () => {
    test('Homepage loads with resources', async () => {
      // MCP: Navigate to homepage
      // MCP: Take snapshot
      // Verify: 9 categories visible
      // Verify: Resource cards displayed
      // Verify: Search box present
    });

    test('Category navigation works', async () => {
      // MCP: Click "Encoding & Codecs" category
      // Verify: URL changes to /category/encoding-codecs
      // Verify: Resources filtered to category
      // Verify: Breadcrumb shows category
    });

    test('Search functionality works', async () => {
      // MCP: Type "ffmpeg" in search
      // MCP: Press Enter
      // Verify: Results contain "ffmpeg" in title/description
      // Verify: Result count displayed
    });

    test('Theme switcher works', async () => {
      // MCP: Click theme toggle
      // Verify: Dark mode applied (check class)
      // MCP: Refresh page
      // Verify: Theme persists
    });
  });

  // ===== AUTHENTICATED USER FLOW =====
  describe('Authenticated User Flow', () => {
    let userEmail: string;
    let userPassword: string;

    beforeAll(async () => {
      // Create test user via Supabase
      userEmail = `test-${Date.now()}@example.com`;
      userPassword = 'TestPassword123!';

      const { error } = await supabase.auth.signUp({
        email: userEmail,
        password: userPassword
      });

      if (error) throw error;
    });

    test('Email/password login works', async () => {
      // MCP: Navigate to /login
      // MCP: Fill email input
      // MCP: Fill password input
      // MCP: Click "Sign In" button
      // Verify: Redirected to /
      // Verify: User menu shows email
    });

    test('Can bookmark resources', async () => {
      // MCP: Navigate to category
      // MCP: Click bookmark icon on first resource
      // Verify: Bookmark icon changes state
      // MCP: Navigate to /bookmarks
      // Verify: Bookmarked resource appears
    });

    test('Can submit new resource', async () => {
      // MCP: Navigate to /submit-resource
      // MCP: Fill form (title, URL, description, category)
      // MCP: Click "Submit"
      // Verify: Success toast appears
      // Verify: Status shows "pending approval"
    });

    test('Can view profile and learning progress', async () => {
      // MCP: Navigate to /profile
      // Verify: Email displayed
      // Verify: Progress stats visible
      // Verify: Learning paths section present
    });
  });

  // ===== ADMIN USER FLOW =====
  describe('Admin User Flow', () => {
    let adminEmail: string;
    let adminPassword: string;

    beforeAll(async () => {
      // Create admin user
      adminEmail = `admin-${Date.now()}@example.com`;
      adminPassword = 'AdminPassword123!';

      const { data: { user }, error } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword
      });

      if (error || !user) throw error;

      // Promote to admin via SQL
      await supabase.rpc('promote_to_admin', { target_user_id: user.id });
    });

    test('Admin dashboard accessible', async () => {
      // MCP: Navigate to /login
      // MCP: Login as admin
      // MCP: Navigate to /admin
      // Verify: Dashboard loads (no 403)
      // Verify: Stats cards visible
      // Verify: All admin tabs present
    });

    test('Can approve pending resources', async () => {
      // MCP: Click "Pending Resources" tab
      // Verify: Pending resources list visible
      // MCP: Click "Approve" on first resource
      // Verify: Resource disappears from pending
      // Verify: Toast shows success
    });

    test('GitHub export works', async () => {
      // MCP: Click "GitHub" tab
      // MCP: Fill repository URL input
      // MCP: Click "Export to GitHub" (dry-run)
      // Verify: Preview shows markdown
      // Verify: Validation passes (awesome-lint)
    });

    test('Batch enrichment starts', async () => {
      // MCP: Click "AI Enrichment" tab
      // MCP: Select "Unenriched" filter
      // MCP: Set batch size to 5
      // MCP: Click "Start Enrichment"
      // Verify: Job created with ID
      // Verify: Progress bar visible
      // Wait: 30 seconds
      // Verify: Some resources enriched
    });
  });

  // ===== PERFORMANCE TESTS =====
  describe('Performance & Load', () => {
    test('Homepage loads < 2 seconds', async () => {
      const start = Date.now();
      // MCP: Navigate to homepage
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    test('API responds < 200ms', async () => {
      const start = Date.now();
      const response = await fetch('http://localhost:3000/api/resources');
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200);
      expect(response.ok).toBe(true);
    });

    test('Search results < 500ms', async () => {
      // MCP: Type "streaming" in search
      const start = Date.now();
      // MCP: Press Enter
      // Wait for results
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });
});
```

**Pass Criteria**:
- [ ] All anonymous flows pass
- [ ] All authenticated flows pass
- [ ] All admin flows pass
- [ ] Performance targets met

---

## Phase 9: Deployment & Production Hardening (4-5 hours)

### Task 9.1: Production Environment Setup (90 min)

**Create production .env**:
```bash
# Copy template
cp .env.example .env.production

# Fill in real values:
# 1. Supabase credentials from dashboard
# 2. GitHub token (create new PAT with repo scope)
# 3. Anthropic API key
# 4. Production domain URL
```

**Create deployment script**:
```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Deploying Awesome Video Site to Production"

# 1. Pull latest code
git pull origin main

# 2. Build fresh Docker images
docker-compose build --no-cache

# 3. Stop old containers
docker-compose down

# 4. Start new containers
docker-compose up -d

# 5. Wait for health checks
echo "⏳ Waiting for services to be healthy..."
sleep 10

# 6. Verify all services running
docker-compose ps

# 7. Run smoke tests
echo "🧪 Running smoke tests..."
curl -f http://localhost/api/health || exit 1
curl -f http://localhost | grep -q "Awesome" || exit 1

echo "✅ Deployment complete!"
echo "📊 View logs: docker-compose logs -f"
```

**Pass Criteria**:
- [ ] Production env configured
- [ ] Deployment script works
- [ ] Services start successfully
- [ ] Smoke tests pass

---

## Phase 10: Documentation & Handoff (3-4 hours)

### Task 10.1: Generate CLAUDE.md (See separate file)

### Task 10.2: Create Migration Runbook (60 min)

**File**: `docs/MIGRATION_RUNBOOK.md`

[Detailed checklist-based runbook for executing migration]

---

## Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Data loss during migration** | LOW | CRITICAL | Export full CSV backup, verify counts, test with sample first |
| **Auth breaks user access** | MEDIUM | HIGH | Phase rollout, keep Replit running in parallel during testing |
| **RLS blocks legitimate requests** | MEDIUM | MEDIUM | Comprehensive policy testing, admin bypass functions |
| **Redis cache issues** | LOW | LOW | In-memory fallback built-in, degraded performance only |
| **Docker networking problems** | LOW | MEDIUM | Use docker-compose, test locally before production |
| **Supabase rate limits exceeded** | LOW | MEDIUM | Monitor usage, upgrade tier if needed, implement client-side caching |
| **Environment variable misconfiguration** | MEDIUM | HIGH | .env.example template, validation on startup, fail-fast approach |

---

## Success Criteria

### Migration is successful when ALL of these are true:

**Functional Requirements**:
- [ ] All 2,647 resources migrated to Supabase
- [ ] Category hierarchy intact (9 categories, subcategories)
- [ ] User registration working (email, GitHub, Google, magic link)
- [ ] Admin panel accessible with role-based access
- [ ] GitHub import/export functional (no Replit connector)
- [ ] AI enrichment batches working (Claude API integrated)
- [ ] Search returns accurate results (full-text working)
- [ ] RLS policies protect user data correctly

**Performance Requirements**:
- [ ] Homepage loads < 2 seconds
- [ ] API average response < 200ms
- [ ] Search results < 500ms
- [ ] No memory leaks after 24hr run
- [ ] Redis cache hit rate > 70%

**Security Requirements**:
- [ ] RLS enabled on all user-facing tables
- [ ] Admin endpoints require admin role
- [ ] JWT tokens validated correctly
- [ ] HTTPS enforced in production
- [ ] Security headers present (X-Frame-Options, CSP)
- [ ] No exposed service role keys

**Technical Requirements**:
- [ ] Docker services healthy (web, redis, nginx)
- [ ] No Replit dependencies remain (grep confirms)
- [ ] All TypeScript compiles without errors
- [ ] E2E tests pass (100%)
- [ ] Logs aggregated and accessible

---

## Rollback Plan

### Quick Rollback (< 5 minutes)

If **critical issues** discovered post-migration:

```bash
# 1. Point DNS back to Replit deployment
# Update DNS A record → Replit IP

# 2. Stop Docker services
docker-compose down

# 3. Verify Replit app still running
# Open https://[replit-app].repl.co
# Test login, browse resources

# 4. Announce rollback to users (if public)
```

### Data Rollback

Resources safely stored in:
- Replit PostgreSQL (original, untouched)
- CSV export: `docs/migration/replit-resources-export.csv`
- Supabase project (can delete and recreate)

**No permanent data loss possible** - Replit database remains intact during entire migration.

---

## Timeline & Dependencies

| Phase | Duration | Blocking | Dependencies |
|-------|----------|---------|--------------|
| **Phase 0** | 3-4 hours | No | None (can start immediately) |
| **Phase 1** | 6-8 hours | **YES** | Phase 0 complete (Supabase project exists) |
| **Phase 2** | 4-6 hours | **YES** | Phase 1 complete (schema exists) |
| **Phase 3** | 8-10 hours | **YES** | Phase 2 complete (auth configured) |
| **Phase 4** | 4-5 hours | **YES** | Phase 3 complete (backend API ready) |
| **Phase 5** | 6-8 hours | No | Can parallelize with Phase 4 |
| **Phase 6** | 3-4 hours | **YES** | Phase 1 complete (schema exists) |
| **Phase 7** | 2-3 hours | No | Phase 5 complete (Redis container) |
| **Phase 8** | 6-8 hours | **YES** | All phases complete |
| **Phase 9** | 4-5 hours | **YES** | Phase 8 tests pass |
| **Phase 10** | 3-4 hours | No | Documentation parallel with other phases |
| **TOTAL** | **50-65 hours** | - | **Estimated 4-6 weeks with testing** |

**Recommended Schedule**:
- **Week 1**: Phases 0-1 (Infrastructure + Schema)
- **Week 2**: Phases 2-3 (Auth + Backend API)
- **Week 3**: Phases 4-6 (Frontend + Docker + Data)
- **Week 4**: Phases 7-8 (Redis + Testing)
- **Weeks 5-6**: Phase 9-10 (Deployment + Docs) + Buffer

---

## Environment Variables Reference

### Supabase (NEW)
```bash
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGci...  # Public key (safe for client)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # SECRET - admin operations only
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Application (UNCHANGED)
```bash
GITHUB_TOKEN=ghp_...  # Personal access token (replaces Replit connector)
ANTHROPIC_API_KEY=sk-ant-api03-...
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-api03-...  # Preferred
OPENAI_API_KEY=sk-...  # Optional
```

### Docker (NEW)
```bash
REDIS_URL=redis://redis:6379
NODE_ENV=production
PORT=3000
WEBSITE_URL=https://yourdomain.com
```

### Removed (Replit-specific)
```bash
REPL_ID=...  ❌
ISSUER_URL=...  ❌
REPL_IDENTITY=...  ❌
WEB_REPL_RENEWAL=...  ❌
REPLIT_CONNECTORS_HOSTNAME=...  ❌
SESSION_SECRET=...  ❌ (Supabase handles sessions)
```

---

## MCP Tools Used During Migration

This migration leverages the following MCP servers:

✅ **Supabase MCP** (`mcp.supabase.com/mcp`):
- `apply_migration` - Create database schema
- `execute_sql` - Run data migration scripts
- `list_tables` - Verify schema creation
- `generate_typescript_types` - Generate types for frontend
- `get_logs` - Debug issues during migration

✅ **Playwright MCP** (Browser automation):
- `browser_navigate` - Test page navigation
- `browser_snapshot` - Verify UI state
- `browser_click` - Simulate user interactions
- `browser_fill` - Test forms
- `browser_evaluate` - Check JavaScript state

✅ **Memory MCP** (Knowledge graph):
- Stores architectural decisions
- Tracks migration progress
- Documents gotchas and learnings

✅ **Context7 MCP** (Documentation):
- Supabase Auth patterns
- Drizzle ORM best practices
- RLS policy examples

---

## Contacts & Support

**Migration Lead**: [Your Name]
**Supabase Project**: https://supabase.com/dashboard/project/jeyldoypdkgsrfdhdcmm
**GitHub Repository**: [Your Repo]
**Documentation**: See `docs/` folder
**Issues**: Create GitHub issue or contact via email

---

**END OF MIGRATION PLAN**

**Status**: Ready for Execution
**Next Step**: Create CLAUDE.md documentation (see Task 10.1)
**Confidence**: HIGH (comprehensive planning, proven patterns)
**Risk**: MEDIUM (architectural changes, but well-tested approach)

Execute systematically. Test thoroughly at each phase. Do not skip validation gates. Good luck! 🚀
