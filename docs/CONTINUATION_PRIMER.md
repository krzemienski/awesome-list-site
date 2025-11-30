# Continuation Primer: Replit → Supabase Migration
## Executive Briefing for Implementation Phase

**Project**: Awesome Video Resources Platform Migration
**Planning Complete**: 2025-11-29
**Ready for Execution**: YES
**Estimated Implementation**: 50-65 hours (4-6 weeks)

---

## 📋 Quick Status

### ✅ Completed (Planning Phase)
- [x] Complete codebase analysis (40,706 lines mapped)
- [x] Architecture designed (Docker + Supabase Cloud)
- [x] Database schema designed (16 tables with RLS)
- [x] Migration roadmap created (10 phases)
- [x] All dependencies documented
- [x] All Replit integrations identified
- [x] Supabase MCP authenticated
- [x] Context7 documentation pulled
- [x] Knowledge graph created (Memory MCP)
- [x] CLAUDE.md documentation written

### 🎯 Ready to Start
- [ ] **Phase 0**: Create new Supabase project (START HERE)
- [ ] Phase 1-9: Execute migration phases sequentially
- [ ] Phase 10: Documentation and handoff

---

## 🚀 How to Execute This Migration

### Step 1: Read the Master Plan

**File**: `docs/REPLIT_TO_SUPABASE_MIGRATION_PLAN.md`

This 800+ line document contains:
- Complete phase-by-phase instructions
- Validation gates at each step
- Rollback procedures
- Code snippets ready to copy
- SQL migrations ready to run

**Read it carefully before starting any work.**

### Step 2: Prepare Your Environment

**Required Accounts/Tools**:
```bash
✓ Supabase account (https://supabase.com)
✓ Docker Desktop installed
✓ GitHub personal access token (repo scope)
✓ Anthropic API key (for AI features)
✓ Node.js 20+ installed locally
```

**Checklist**:
- [ ] Supabase account created
- [ ] Docker Desktop running
- [ ] All API keys obtained
- [ ] Local development environment ready

### Step 3: Reset Existing Supabase Project

**This is your FIRST TASK** (Phase 0, Task 0.1):

**⚠️ WARNING**: This will **PERMANENTLY DELETE** all data in project `jeyldoypdkgsrfdhdcmm`!

**Existing Project Info**:
- Project Ref: `jeyldoypdkgsrfdhdcmm`
- Project URL: https://jeyldoypdkgsrfdhdcmm.supabase.co
- Current Status: 11 tables (users, projects, ideas, awesome_*) - **Will be destroyed**

**Steps**:
1. Confirm you want to destroy existing data (no backups needed per your request)
2. Execute SQL to drop all tables via Supabase MCP:
   ```sql
   -- See migration plan Phase 0, Task 0.1 for complete SQL
   DROP TABLE IF EXISTS awesome_project_tags CASCADE;
   DROP TABLE IF EXISTS awesome_project_categories CASCADE;
   -- ... (drop all 11 tables)
   ```
3. Verify public schema is empty: `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`
4. Save credentials to `docs/secrets/supabase-project-info.txt`

**Credentials to Save**:
```
Project Ref: jeyldoypdkgsrfdhdcmm (EXISTING - reusing)
Project URL: https://jeyldoypdkgsrfdhdcmm.supabase.co
Anon Key: (get from Supabase dashboard → Settings → API)
Service Role Key: (get from dashboard - KEEP SECRET!)
Database URL: (get from dashboard → Settings → Database → Connection String → URI)
```

### Step 4: Execute Phases Sequentially

**Follow this order** (some can be parallelized, see plan):

1. **Phase 0** (3-4 hours): Pre-migration setup
   - ✓ Destroy existing Supabase schema (Task 0.1)
   - Export Replit data to CSV (Task 0.2)
   - Set up local Docker (Task 0.3)
   - Enable Supabase extensions (Task 0.4)

2. **Phase 1** (6-8 hours): Database schema
   - Create 16 tables via SQL migrations
   - Implement Row-Level Security policies
   - Create helper functions and views

3. **Phase 2** (4-6 hours): Supabase Auth
   - Configure auth providers (email, GitHub, Google)
   - Set up admin role system
   - Test auth flows

4. **Phase 3** (8-10 hours): Backend API migration
   - Replace Replit Auth middleware
   - Update all 70 endpoints
   - Remove Replit-specific code

5. **Phase 4** (4-5 hours): Frontend auth migration
   - Install Supabase client libraries
   - Replace useAuth hook
   - Update Login page
   - Update API request headers

6. **Phase 5** (6-8 hours): Docker containerization
   - Create Dockerfile
   - Create docker-compose.yml
   - Configure Nginx
   - Test locally

7. **Phase 6** (3-4 hours): Data migration
   - Run migration script (resources only)
   - Verify all 2,647 resources transferred
   - Validate category hierarchy

8. **Phase 7** (2-3 hours): Redis integration
   - Add Redis client to AI services
   - Update cache logic
   - Test distributed caching

9. **Phase 8** (6-8 hours): Testing
   - Run E2E test suite
   - Verify all user flows
   - Performance testing
   - Security audit

10. **Phase 9** (4-5 hours): Production deployment
    - Configure production .env
    - Deploy to server/cloud
    - SSL setup
    - Monitoring

### Step 5: Validation at Each Phase

**CRITICAL**: Do not proceed to next phase until current phase passes ALL validation gates.

**Example Validation Gate** (Phase 1, Task 1.1):
```bash
✓ All 6 core tables created
✓ Indexes created successfully
✓ Triggers functional (test INSERT)
✓ Foreign keys enforced
```

If ANY check fails, debug before continuing.

---

## 🔑 Critical Decisions Made

### 1. Architecture: Docker + Supabase Cloud
**Rationale**: Best of both worlds
- Supabase Cloud: Managed PostgreSQL, automatic backups, auth built-in
- Docker: Self-hosted application, full control over API and AI services
- No Supabase self-hosted: Reduces operational complexity per user request

### 2. Data Migration: Resources Only, No Users
**Rationale**: Clean slate
- 2,647 resources migrated (core value)
- No user data = no auth migration complexity
- Admin accounts recreated manually
- Simplifies Replit→Supabase auth mapping

### 3. Session Management: Supabase JWT (Stateless)
**Rationale**: Scalability
- No PostgreSQL `sessions` table needed
- Horizontal scaling easier (stateless)
- Supabase handles token refresh automatically
- Optional: Add Redis for server-side session if needed later

### 4. ID Migration: Generate New UUIDs
**Rationale**: Type safety
- Replit used `SERIAL` (integer IDs)
- Supabase best practice: UUIDs
- Enables distributed ID generation
- Trade-off: Old URLs with `/resources/123` break (acceptable, site not public yet)

### 5. GitHub Integration: Direct Token (No Replit Connector)
**Rationale**: Simplicity
- GitHub Personal Access Token (PAT) = simple, reliable
- No OAuth flow complexity
- Admin-only feature (PAT stored server-side)
- Can add OAuth later if needed

### 6. AI Services: Keep In-Memory, Add Redis Layer
**Rationale**: Incremental improvement
- Singletons work fine for single-container deployment
- Redis adds distributed caching for horizontal scaling
- In-memory fallback prevents Redis outages from breaking app
- Can refactor to full stateless later

---

## 📊 What You're Migrating

### Database Content

**From Replit PostgreSQL**:
```
Resources: 2,647 approved (CSV export ready)
Categories: 9 top-level
Subcategories: 30-40 estimated
Sub-subcategories: 60-80 estimated
Tags: 100-200 estimated (inferred from resource metadata)
```

**TO Supabase PostgreSQL**:
```
All resources with:
✓ Titles, URLs, descriptions
✓ Category hierarchy (3 levels)
✓ Metadata (GitHub sync status, AI enrichment)
✓ Search vectors (auto-generated)
✗ User data (not migrated)
✗ Session history (not migrated)
```

### Application Features

**Migrating** (working after migration):
- ✅ Browse 2,647 resources
- ✅ Search with full-text (pg_trgm)
- ✅ Category navigation (3-level hierarchy)
- ✅ GitHub sync (import/export)
- ✅ AI enrichment (Claude Haiku 4.5)
- ✅ AI recommendations
- ✅ Learning paths
- ✅ Theme switching
- ✅ Mobile responsiveness

**New Features** (enabled by Supabase):
- 🆕 Magic link authentication (passwordless)
- 🆕 Social OAuth (GitHub, Google) via Supabase
- 🆕 Row-Level Security (user data protection)
- 🆕 Real-time subscriptions (future: live resource updates)
- 🆕 Supabase Storage integration (future: image uploads)

**Removed** (replaced by better alternatives):
- ❌ Replit OAuth (replaced by Supabase Auth)
- ❌ Replit GitHub Connector (replaced by direct token)
- ❌ Replit Vite plugins (dev-only, not needed)

---

## ⚠️ Critical Gotchas & Pitfalls

### 1. Don't Skip RLS Policies
**Problem**: Without RLS, users can access all data via Supabase client
**Solution**: Enable RLS on EVERY table (Phase 1, Task 1.7)
**Test**: Try accessing another user's bookmarks → should fail

### 2. Service Role Key = Root Access
**Problem**: Service role key bypasses RLS (full admin)
**Solution**: ONLY use in backend, NEVER expose to frontend
**Verify**: `client/` folder has ZERO references to SERVICE_ROLE_KEY

### 3. UUID vs Integer IDs
**Problem**: Old integer IDs don't map to new UUIDs
**Solution**: Generate new UUIDs, accept old URLs will 404
**Trade-off**: Acceptable since site not publicly launched yet

### 4. Auth Middleware Must Extract User on Every Request
**Problem**: Forgetting `app.use(extractUser)` = all requests unauthenticated
**Solution**: Add middleware BEFORE route definitions (line ~220 in routes.ts)
**Test**: `req.user` should be populated for valid JWT

### 5. Environment Variable Naming Inconsistency
**Problem**: `tagging.ts` uses `ANTHROPIC_API_KEY`, others use `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
**Solution**: Set BOTH in .env (service tries preferred first, falls back)
**Fix Later**: Standardize to AI_INTEGRATIONS_* prefix

### 6. Frontend Must Send Authorization Header
**Problem**: Supabase Auth uses JWT tokens, not cookies
**Solution**: Update `apiRequest()` to include `Authorization: Bearer {token}`
**Test**: Verify header present in browser DevTools → Network tab

### 7. Redis Cache Keys Must Be Unique Across Services
**Problem**: Collision if multiple services use same key
**Solution**: Prefix all keys (`claude:response:`, `enrichment:`, `rec:`)
**Verify**: `redis-cli KEYS *` shows organized namespaces

### 8. Docker Build Context Size
**Problem**: Including `node_modules`, `.git`, `docs/` in Docker build = slow
**Solution**: Create `.dockerignore`:
```
node_modules
.git
docs
test-screenshots
scripts/test-results
*.log
.env*
dist
```

### 9. Supabase Connection Pooler vs Direct Connection
**Problem**: Using direct connection (port 5432) can exhaust connections
**Solution**: Use connection pooler (port 6543) in DATABASE_URL
**Format**: `postgresql://postgres.[ref]:[pass]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

### 10. Long-Running Enrichment Jobs Need Graceful Shutdown
**Problem**: Killing container mid-enrichment = partial state
**Solution**: Implement graceful shutdown in server/index.ts:
```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, finishing current operations...');
  // Wait for enrichment batches to complete
  // Close database connections
  // Then exit
});
```

---

## 🗺️ Navigation Map

**Where is everything?**

| What You Need | File Location |
|---------------|---------------|
| **Migration Instructions** | `docs/REPLIT_TO_SUPABASE_MIGRATION_PLAN.md` |
| **Architecture Overview** | `CLAUDE.md` (this file's parent) |
| **Database Schema** | `shared/schema.ts` (current), `supabase/migrations/` (target) |
| **API Endpoints** | `server/routes.ts` |
| **Auth Implementation** | `server/supabaseAuth.ts` (NEW, create in Phase 3) |
| **AI Services** | `server/ai/*.ts` (7 files) |
| **Frontend Auth** | `client/src/hooks/useAuth.ts` (update in Phase 4) |
| **Docker Config** | `Dockerfile`, `docker-compose.yml` (create in Phase 5) |
| **Migration Script** | `scripts/migrate-to-supabase.ts` (create in Phase 6) |
| **E2E Tests** | `tests/e2e/*.spec.ts` (create in Phase 8) |
| **Exported Data** | `docs/migration/*.csv` (create in Phase 0) |
| **Secrets** | `docs/secrets/` (NOT in git!) |

---

## 🎯 Your Next Action

### Immediate Next Steps (Today)

**1. Destroy Existing Supabase Schema** (30 min):
   ```bash
   # ⚠️ WARNING: This permanently deletes all data in jeyldoypdkgsrfdhdcmm

   # Execute via Supabase MCP or SQL Editor:
   # Copy SQL from: docs/REPLIT_TO_SUPABASE_MIGRATION_PLAN.md Phase 0, Task 0.1

   # Quick command:
   # DROP TABLE IF EXISTS awesome_project_tags, awesome_project_categories,
   # awesome_tags, awesome_projects, awesome_categories, awesome_lists,
   # shared_templates, prompt_templates, template_categories,
   # researcher_projects, project_categories, categories, researchers,
   # prompts, code_generations, ideas, activity_logs, user_projects,
   # projects, users CASCADE;
   ```

**2. Document Project Credentials** (10 min):
   ```bash
   mkdir -p docs/secrets
   # Get anon key and service role from:
   # https://supabase.com/dashboard/project/jeyldoypdkgsrfdhdcmm/settings/api

   # Save to docs/secrets/supabase-project-info.txt:
   # Project Ref: jeyldoypdkgsrfdhdcmm
   # Project URL: https://jeyldoypdkgsrfdhdcmm.supabase.co
   # Anon Key: eyJhbGci...
   # Service Role Key: eyJhbGci...
   ```

**3. Verify Schema is Clean** (5 min):
   ```bash
   # Via Supabase MCP:
   mcp__supabase__list_tables({ schemas: ["public"] })
   # Expected: Empty array (no tables)
   ```

**4. Export Replit Data** (45 min):
   ```bash
   # Run Phase 0, Task 0.2 commands
   # Export resources, categories, subcategories to CSV
   # Backup to docs/migration/
   ```

**5. Start Phase 1** (6-8 hours - can do over 2 days):
   ```bash
   # Apply database migrations via Supabase SQL Editor
   # Copy SQL from migration plan Phase 1
   # Verify via Supabase MCP: mcp__supabase__list_tables
   ```

---

## 💡 Architectural Insights

### Why This Architecture Works

**Supabase Cloud Benefits**:
- Automatic backups (no manual pg_dump needed)
- Built-in connection pooler (handles 1000s of connections)
- Auth providers configured via UI (no OAuth app complexity)
- RLS enforcement at database level (impossible to bypass)
- PostgREST auto-generated API (not used, but available)
- Real-time subscriptions (for future features)

**Docker Benefits**:
- Application logic fully under your control
- Can swap Supabase for another PostgreSQL later (just change DATABASE_URL)
- Easy local development (docker-compose up)
- CI/CD friendly (build once, deploy anywhere)

**Separation of Concerns**:
```
Supabase = Data plane (PostgreSQL + Auth + Storage)
Docker = Control plane (Business logic + AI services + GitHub integration)
```

This is the **recommended pattern** for Supabase usage at scale.

---

## 📦 What's in Each Phase (Quick Reference)

| Phase | Deliverable | Key Artifacts |
|-------|------------|---------------|
| **0** | Supabase project + exported data | CSV files, .env template |
| **1** | Database schema with RLS | 16 tables, 50+ policies, indexes |
| **2** | Auth system configured | Email, GitHub, Google OAuth enabled |
| **3** | Backend API migrated | routes.ts updated, Replit code removed |
| **4** | Frontend auth migrated | useAuth updated, Login.tsx rewritten |
| **5** | Docker environment | Dockerfile, docker-compose.yml, nginx.conf |
| **6** | Resources migrated | 2,647 resources in Supabase |
| **7** | Redis caching | AI services use distributed cache |
| **8** | Tests passing | E2E suite, performance benchmarks |
| **9** | Production deployed | Live on your domain |
| **10** | Documentation | This file + CLAUDE.md + runbooks |

---

## 🧠 Knowledge Already Captured

### Memory MCP (Knowledge Graph)

The following entities are saved in Memory MCP:

1. **Awesome List Site Migration Project**
   - Observations: Current stack, migration target, codebase metrics

2. **Replit Dependencies**
   - Observations: Exact files and lines to change

3. **Database Schema**
   - Observations: 18 tables, relationships, RLS needs

4. **API Surface**
   - Observations: 70 endpoints, auth requirements

5. **AI Services Architecture**
   - Observations: 7 modules, caching, Claude Haiku 4.5

6. **Frontend Architecture**
   - Observations: React 18, TanStack Query, auth patterns

**Relations**:
```
Project → contains → Replit Dependencies
Project → uses → Database Schema
Project → exposes → API Surface
Project → implements → AI Services
API Surface → depends on → Replit Dependencies
Frontend → requires → Replit Dependencies
```

**To access later**:
```typescript
// Query knowledge graph
mcp__memory__search_nodes({ query: "Replit dependencies" })
mcp__memory__open_nodes({ names: ["Database Schema"] })
```

### Context7 Documentation Pulled

**Supabase Auth** (`/supabase/auth`):
- JWT token patterns
- Admin user management endpoints
- OAuth callback handling
- RLS policy examples with auth.uid()

**Supabase Platform** (`/websites/supabase`):
- Row-Level Security examples
- Policies for SELECT, INSERT, UPDATE, DELETE
- User ownership patterns
- Admin bypass policies

**Drizzle ORM** (`/drizzle-team/drizzle-orm`):
- Supabase integration patterns
- Migration configuration
- PostgreSQL schema definitions
- node-postgres connection setup

---

## 🧪 Testing Checklist

### Before Claiming "Phase Complete"

Each phase has validation gates. Here's the master checklist:

**Phase 1 (Database)**:
- [ ] All tables created in Supabase
- [ ] Can query via Supabase MCP: `execute_sql("SELECT * FROM resources LIMIT 1")`
- [ ] RLS enabled: Anonymous SELECT returns only approved resources
- [ ] Full-text search works: `SELECT * FROM resources WHERE search_vector @@ to_tsquery('ffmpeg')`

**Phase 2 (Auth)**:
- [ ] Email signup sends confirmation email
- [ ] GitHub OAuth redirects correctly
- [ ] Google OAuth redirects correctly
- [ ] Magic link sends email
- [ ] Admin user has role='admin' in metadata
- [ ] Non-admin cannot access admin endpoints

**Phase 3 (Backend API)**:
- [ ] GET /api/auth/user returns user from JWT
- [ ] All 26 authenticated endpoints work with Bearer token
- [ ] All 21 admin endpoints blocked for non-admins
- [ ] No `req.user.claims.sub` references remain (grep confirms)
- [ ] No Replit imports (grep confirms)

**Phase 4 (Frontend)**:
- [ ] Login page shows all 4 auth methods
- [ ] Email login works end-to-end
- [ ] OAuth redirects work
- [ ] Protected routes redirect to /login if not authenticated
- [ ] Admin dashboard loads for admin users
- [ ] JWT token sent in Authorization header (verify in DevTools)

**Phase 5 (Docker)**:
- [ ] docker-compose up succeeds
- [ ] All services healthy (redis, web, nginx)
- [ ] Can access http://localhost (via Nginx)
- [ ] Healthchecks pass
- [ ] Logs show no errors

**Phase 6 (Data Migration)**:
- [ ] 2,647 resources in Supabase (verify count)
- [ ] Category hierarchy intact
- [ ] Sample resources have correct data
- [ ] No duplicate resources (URL uniqueness)

**Phase 7 (Redis)**:
- [ ] ClaudeService connects to Redis
- [ ] Cache writes succeed (check Redis: `KEYS claude:*`)
- [ ] Cache reads succeed (verify "Redis cache HIT" in logs)
- [ ] Fallback to in-memory works (stop Redis, app still functions)

**Phase 8 (Testing)**:
- [ ] All E2E tests pass (Playwright report: 100%)
- [ ] No console errors in browser
- [ ] No 500 errors in API logs
- [ ] Performance targets met (homepage<2s, API<200ms)

**Phase 9 (Production)**:
- [ ] Deployed to production server
- [ ] HTTPS working (SSL certificate valid)
- [ ] Domain points to server
- [ ] Health check: curl https://yourdomain.com/api/health
- [ ] Can login via production URL
- [ ] Admin panel accessible

---

## 🚨 When to Stop and Reassess

**STOP immediately if**:

1. **Data Loss Detected**:
   - Resource count doesn't match (should be 2,647)
   - Categories missing or corrupted
   - Foreign key violations during migration

2. **Auth Completely Broken**:
   - Cannot create any user account
   - Admin role doesn't work
   - JWT tokens invalid

3. **Major Architecture Flaw Discovered**:
   - Supabase free tier insufficient (unlikely, 500MB limit >> 50MB current)
   - RLS policies conflict (causing 403 on legitimate requests)
   - Performance degraded by >10x (network latency to Supabase)

**When stopped**:
1. Document issue in `docs/migration/BLOCKER.md`
2. Check Memory MCP for similar issues
3. Consult migration plan's "Rollback" section
4. If needed, rollback to Replit (site still running there)

---

## 📚 Documentation Generated

### Files Created During Planning

1. **CLAUDE.md** (400+ lines)
   - Complete architectural reference
   - Database schema with examples
   - API endpoint catalog
   - AI services documentation
   - Development workflow
   - Security guidelines

2. **docs/REPLIT_TO_SUPABASE_MIGRATION_PLAN.md** (800+ lines)
   - 10-phase migration roadmap
   - Task-by-task instructions
   - Validation gates for each task
   - SQL migrations ready to copy
   - Code snippets ready to use
   - Rollback procedures

3. **docs/CONTINUATION_PRIMER.md** (this file)
   - Executive summary
   - Next action plan
   - Critical decisions documented
   - Gotchas and pitfalls
   - Knowledge graph reference

### Files to Create During Execution

**Phase 0**:
- `docs/secrets/supabase-project-info.txt` (existing project credentials)
- `docs/migration/replit-resources-export.csv` (resource data)
- `docs/migration/categories.csv`, `subcategories.csv`, `sub_subcategories.csv`
- `.env` (local environment variables)

**Note**: No new Supabase project creation needed - reusing jeyldoypdkgsrfdhdcmm

**Phase 1**:
- `supabase/migrations/20251129000001_create_core_tables.sql`
- `supabase/migrations/20251129000002_user_interactions.sql`
- `supabase/migrations/20251129000003_enable_rls.sql`

**Phase 3**:
- `server/supabaseAuth.ts` (NEW middleware)

**Phase 4**:
- `client/src/lib/supabase.ts` (NEW client config)
- `client/src/pages/AuthCallback.tsx` (NEW OAuth callback handler)

**Phase 5**:
- `Dockerfile`
- `docker-compose.yml`
- `docker/nginx/nginx.conf`
- `.dockerignore`

**Phase 6**:
- `scripts/migrate-to-supabase.ts` (data migration script)

**Phase 8**:
- `tests/e2e/complete-user-flows.spec.ts`
- `tests/e2e/admin-flows.spec.ts`
- `tests/e2e/performance.spec.ts`

---

## 🔧 Tools & Commands

### Supabase MCP Commands (Available Now)

```bash
# List tables in new project
mcp__supabase__list_tables({ schemas: ["public"] })

# Apply migration
mcp__supabase__apply_migration({
  name: "create_core_tables",
  query: "CREATE TABLE resources (...)"
})

# Execute SQL query
mcp__supabase__execute_sql({
  query: "SELECT COUNT(*) FROM resources;"
})

# Generate TypeScript types
mcp__supabase__generate_typescript_types()
# Copy output to client/src/types/database.ts

# Get project URL
mcp__supabase__get_project_url()

# Get API keys
mcp__supabase__get_anon_key()

# View logs (debugging)
mcp__supabase__get_logs({ service: "api" })
mcp__supabase__get_logs({ service: "postgres" })
```

### Git Workflow During Migration

```bash
# Create migration branch
git checkout -b feature/supabase-migration

# Commit after each phase
git add .
git commit -m "feat(phase-1): implement database schema with RLS

- Created 16 tables in Supabase
- Implemented Row-Level Security policies
- Added full-text search indexes
- Verified foreign key constraints

Phase 1 validation gates: ✅ ALL PASSED"

# Push frequently
git push origin feature/supabase-migration

# Create PR when migration complete
# gh pr create --title "Migration: Replit → Supabase + Docker" --body "..."
```

### Useful One-Liners

```bash
# Count resources in Supabase
echo "SELECT COUNT(*) FROM resources;" | supabase db execute

# Find Replit references (should be 0 after Phase 3)
grep -r "REPL_" server/ client/ --exclude-dir=node_modules

# Verify all req.user.claims.sub replaced
grep -r "claims\.sub" server/ --exclude-dir=node_modules
# Expected: 0 results after Phase 3

# Test endpoint auth
curl -H "Authorization: Bearer ${JWT_TOKEN}" http://localhost:3000/api/auth/user | jq

# Monitor Redis cache
watch -n 1 'docker exec awesome-list-redis redis-cli INFO stats | grep keyspace'

# Check Docker resource usage
docker stats --no-stream

# Tail all Docker logs
docker-compose logs -f --tail=50
```

---

## ⏱️ Time Estimates by Skill Level

| Phase | Junior Dev | Mid-Level Dev | Senior Dev |
|-------|-----------|--------------|-----------|
| Phase 0 | 6 hours | 4 hours | 3 hours |
| Phase 1 | 10 hours | 8 hours | 6 hours |
| Phase 2 | 8 hours | 6 hours | 4 hours |
| Phase 3 | 14 hours | 10 hours | 8 hours |
| Phase 4 | 7 hours | 5 hours | 4 hours |
| Phase 5 | 10 hours | 8 hours | 6 hours |
| Phase 6 | 5 hours | 4 hours | 3 hours |
| Phase 7 | 4 hours | 3 hours | 2 hours |
| Phase 8 | 10 hours | 8 hours | 6 hours |
| Phase 9 | 7 hours | 5 hours | 4 hours |
| **TOTAL** | **81 hours** | **61 hours** | **46 hours** |

**With AI Assistance** (Claude Code):
- Junior: 60 hours (25% faster)
- Mid: 45 hours (25% faster)
- Senior: 35 hours (25% faster)

**Your Estimate**: 50-65 hours (reasonable for mid-level with AI assistance)

---

## 🎓 Learning Opportunities

This migration is a **masterclass** in:

1. **OAuth vs JWT Authentication**
   - Replit OAuth (stateful, session-based)
   - Supabase Auth (stateless, JWT-based)
   - Trade-offs and use cases

2. **Row-Level Security (RLS)**
   - Policy-based access control
   - User ownership patterns
   - Admin bypass mechanisms

3. **Docker Best Practices**
   - Multi-stage builds (reduce image size)
   - Healthchecks (orchestration reliability)
   - Non-root users (security)
   - Graceful shutdown (data integrity)

4. **Database Migration Strategies**
   - Schema transformation (integer → UUID)
   - Data sanitization (removing PII)
   - Foreign key remapping
   - Batch processing for large datasets

5. **Distributed Systems**
   - Stateless architecture (horizontal scaling)
   - Shared cache (Redis)
   - Service decomposition

6. **AI Service Integration**
   - Rate limiting and caching
   - Graceful degradation
   - SSRF protection
   - Cost optimization (model selection)

---

## 🤝 Collaboration Tips

### If Working with a Team

**Assign phases to team members**:
- **Backend Dev**: Phases 1, 3, 7 (database + API + Redis)
- **Frontend Dev**: Phases 2, 4 (auth config + UI migration)
- **DevOps**: Phases 5, 9 (Docker + deployment)
- **QA**: Phases 6, 8 (data migration + testing)

**Communication**:
- Daily standup: "I completed Phase X, starting Phase Y"
- Blockers: Document in `docs/migration/BLOCKERS.md`
- Wins: Celebrate validation gates passed! 🎉

### If Working Solo

**Recommended Schedule**:
- **Week 1**: Phases 0-1 (setup + database)
  - Mon-Tue: Phase 0
  - Wed-Fri: Phase 1
- **Week 2**: Phases 2-3 (auth + backend)
  - Mon-Tue: Phase 2
  - Wed-Fri: Phase 3
- **Week 3**: Phases 4-6 (frontend + data)
  - Mon-Tue: Phase 4
  - Wed: Phase 5 (Docker setup)
  - Thu-Fri: Phase 6 (data migration)
- **Week 4**: Phases 7-9 (finish + deploy)
  - Mon: Phase 7 (Redis)
  - Tue-Wed: Phase 8 (testing)
  - Thu-Fri: Phase 9 (deploy)
- **Week 5-6**: Buffer + Phase 10 (docs)

**Take breaks**: This is intensive work. 2-3 hours of focused migration work = productive day.

---

## 🔮 Future Enhancements (Post-Migration)

After migration complete, consider:

1. **Supabase Realtime** (1-2 hours):
   - Live resource updates (no refresh needed)
   - Real-time enrichment progress
   - Collaborative admin panel (multiple admins see same state)

2. **Supabase Storage** (2-3 hours):
   - Upload resource thumbnails
   - User avatar uploads
   - Video preview clips (for video resources)

3. **Supabase Edge Functions** (3-4 hours):
   - Offload AI enrichment to Edge Functions
   - Scheduled GitHub sync (via cron)
   - Webhook handlers for external integrations

4. **Advanced RLS** (2-3 hours):
   - Resource ownership (users can edit their own submissions)
   - Moderator role (between user and admin)
   - Time-based access (embargo content until date)

5. **Analytics Dashboard** (4-6 hours):
   - Supabase Analytics integration
   - Real-time user activity
   - Resource popularity tracking
   - AI service usage metrics

6. **Search Improvements** (3-4 hours):
   - Faceted search (filter by multiple categories)
   - Search suggestions (typeahead)
   - Search history (per user)
   - Fuzzy matching with pg_trgm similarity

---

## ✅ Acceptance Criteria (Migration Complete When...)

**Infrastructure**:
- [ ] Supabase project provisioned and configured
- [ ] Docker containers running (web, redis, nginx)
- [ ] HTTPS configured with valid SSL certificate
- [ ] Domain pointing to production server

**Database**:
- [ ] All 16 tables created in Supabase
- [ ] 2,647 resources migrated (count matches)
- [ ] RLS policies enabled and tested
- [ ] Full-text search functional

**Authentication**:
- [ ] Email/password signup + login works
- [ ] GitHub OAuth works
- [ ] Google OAuth works
- [ ] Magic link works
- [ ] Admin role system functional
- [ ] JWT tokens validated on backend

**Application Features**:
- [ ] Homepage loads with all resources
- [ ] Category navigation works (3 levels)
- [ ] Search returns accurate results
- [ ] User can bookmark resources
- [ ] Admin can approve pending resources
- [ ] GitHub import works (test with awesome-go)
- [ ] GitHub export generates valid markdown
- [ ] AI enrichment processes resources
- [ ] Recommendations personalized to user

**Performance**:
- [ ] Homepage loads < 2 seconds
- [ ] API response < 200ms average
- [ ] Search < 500ms
- [ ] No memory leaks (24hr test)
- [ ] Redis cache hit rate > 70%

**Security**:
- [ ] RLS prevents unauthorized access
- [ ] Admin endpoints require admin role
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] No exposed secrets in logs
- [ ] Service role key not in frontend code

**Testing**:
- [ ] E2E test suite passes (100%)
- [ ] Manual testing complete (all user flows)
- [ ] Performance benchmarks met
- [ ] Security audit passed

**Documentation**:
- [ ] CLAUDE.md complete
- [ ] Migration plan documented
- [ ] Runbooks created
- [ ] Environment variables documented
- [ ] Troubleshooting guide written

---

## 🎉 Success Metrics

**After migration, you should see**:

```bash
# Docker status
$ docker-compose ps
NAME                  STATUS         PORTS
awesome-list-web      Up (healthy)   3000/tcp
awesome-list-redis    Up (healthy)   6379/tcp
awesome-list-nginx    Up             80/tcp, 443/tcp

# Database
$ supabase db execute "SELECT COUNT(*) FROM resources;"
  count
  -------
   2647

# Health check
$ curl https://yourdomain.com/api/health
{"status":"ok"}

# Redis cache
$ docker exec awesome-list-redis redis-cli INFO stats | grep keyspace
keyspace_hits:1234
keyspace_misses:456
# Hit rate = 1234/(1234+456) = 73% ✅

# No Replit references
$ grep -r "REPL_" . --exclude-dir=node_modules
# (no results)
```

---

## 📞 Getting Help

**If stuck on a phase**:

1. **Check the migration plan**: `docs/REPLIT_TO_SUPABASE_MIGRATION_PLAN.md`
   - Each task has detailed instructions
   - Validation gates show what to check
   - Rollback procedures documented

2. **Query Memory MCP**:
   ```typescript
   mcp__memory__search_nodes({ query: "your issue here" })
   // May find related architectural decisions
   ```

3. **Pull fresh Context7 docs**:
   ```typescript
   mcp__Context7__get-library-docs({
     context7CompatibleLibraryID: "/websites/supabase",
     topic: "your specific question"
   })
   ```

4. **Check Supabase MCP tools**:
   ```typescript
   mcp__supabase__get_logs({ service: "postgres" })
   // View database errors
   ```

5. **Search codebase for examples**:
   ```bash
   # Find similar patterns
   grep -r "pattern you need" server/ client/
   ```

---

## 🚀 Execute The Plan

**You have everything you need**:
- ✅ Complete migration roadmap (10 phases, task-by-task)
- ✅ All architectural decisions documented
- ✅ All dependencies identified and analyzed
- ✅ Supabase MCP connected and authenticated
- ✅ Knowledge graph populated with project context
- ✅ Context7 documentation for Supabase + Drizzle patterns
- ✅ Code examples from analysis agents
- ✅ Validation criteria for every phase
- ✅ Rollback procedures defined

**Your next command**:

```bash
# Start Phase 0, Task 0.1: Destroy existing schema
# Use Supabase MCP to execute DROP TABLE commands
# Or go to: https://supabase.com/dashboard/project/jeyldoypdkgsrfdhdcmm/editor
# And run SQL from migration plan
```

Then come back and say:
> "I destroyed the existing schema. Public schema is empty. Let's start Phase 0, Task 0.2: Export Replit data."

And we'll execute the migration together, phase by phase, with validation at every step.

---

**Good luck! You've got this.** 💪

This migration is **well-planned**, **well-documented**, and **well-supported by tooling**. Follow the phases, validate thoroughly, and you'll have a production-ready Supabase + Docker deployment in 4-6 weeks.

🎯 **START NOW**: Create that Supabase project!
