# Awesome Video Resources - Project Guide

**Project Type**: Full-Stack Web Application (Awesome List Platform)
**Status**: ✅ Production Ready (94% verified)
**Database**: Supabase PostgreSQL (2,647 resources)
**Deployment**: Docker Compose
**Last Updated**: 2025-12-01

---

## What is This?

Platform for browsing and curating **2,647 video development resources** from `krzemienski/awesome-video` GitHub repository.

**Features:**
- Hierarchical browsing (21 categories → 102 subcategories → 90 sub-subcategories)
- Full-text search
- User accounts (favorites, bookmarks, learning journeys)
- AI tagging (Claude Haiku 4.5)
- GitHub bidirectional sync
- Admin approval workflows

---

## Quick Start

### Local Development

```bash
# Install
npm install

# Configure
cp .env.example .env
# Edit .env with Supabase credentials

# Start
docker-compose up -d

# Verify
curl http://localhost:3000/api/health
```

### Testing

```bash
# Load testing methodology
Skill({ skill: "frontend-driven-testing" })

# Execute parallel testing plan
/superpowers:execute-plan docs/plans/2025-12-01-parallel-testing-execution.md
```

---

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, shadcn/ui, Tailwind v4, TanStack Query
**Backend:** Express, Node.js 20, Drizzle ORM
**Database:** Supabase PostgreSQL (16 tables, RLS policies)
**Auth:** Supabase Auth (JWT, localStorage)
**Infrastructure:** Docker Compose, Redis 7, Nginx
**AI:** Claude Haiku 4.5

---

## Project Structure

```
client/src/          # React frontend
server/              # Express backend
  ├── routes.ts      # 70 API endpoints
  ├── storage.ts     # Database operations
  ├── ai/            # Claude integration
  └── github/        # Sync service
shared/schema.ts     # Database schema (Drizzle)
.claude/skills/      # Project testing methodology
docs/                # Documentation
tests/               # Integration tests
```

---

## Database (16 Tables)

**Navigation:** categories (21), subcategories (102), sub_subcategories (90)
**Content:** resources (2,647 - denormalized TEXT fields)
**User Data:** favorites, bookmarks, preferences, journey_progress (RLS protected)
**Admin:** enrichment_jobs, github_sync_history, audit_log

**Complete schema:** See Serena memory `database-schema-complete-all-agents`

---

## Key Architectural Decisions

1. **Denormalized Resources**: TEXT category fields (not FK) for flexibility
2. **RLS**: User data isolation via `user_id = auth.uid()` policies
3. **JWT Auth**: Stateless (localStorage), no session table
4. **Redis Cache**: AI responses (1hr), URL analysis (24hr)

---

## Testing

**Project Skill:** `.claude/skills/frontend-driven-testing/SKILL.md`

**Includes:**
- Self-correcting loops (test → debug → fix → rebuild)
- 3-layer validation (API + Database + UI)
- Responsive verification (desktop/tablet/mobile)
- Real component selectors (with fallback patterns)
- Docker isolation setup

**Execution Plan:** `docs/plans/2025-12-01-parallel-testing-execution.md`

**Domain Knowledge:** 5 Serena memories with pre-indexed component patterns, schema, successful testing patterns

---

## Environment Variables

**.env:**
```bash
SUPABASE_URL=https://jeyldoypdkgsrfdhdcmm.supabase.co
SUPABASE_ANON_KEY=...
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
GITHUB_TOKEN=...
ANTHROPIC_API_KEY=...
PORT=3000
```

**client/.env.local:**
```bash
VITE_SUPABASE_URL=https://jeyldoypdkgsrfdhdcmm.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

---

## Common Commands

```bash
# Dev
npm run dev              # Local (port 5000)
docker-compose up -d     # Docker (port 3000)

# Build
docker-compose build --no-cache web

# Test
npx playwright test
Skill({ skill: "frontend-driven-testing" })

# Database
npx drizzle-kit push     # Apply schema changes
```

---

## Documentation

**Architecture:** Complete details moved to separate docs
**Database:** See `docs/DATABASE_SCHEMA.md` or Serena memory
**API:** See original CLAUDE.md or server/routes.ts
**Testing:** See `.claude/skills/frontend-driven-testing/`
**History:** Use `mcp__serena__list_memories()` for session history

---

## Production Status

**Verified:** 31/33 features (94%)
**Security:** Passed (Session 9 audit)
**Performance:** Benchmarked (Session 9)
**Deployment:** Docker ready

**Ready for production** ✅

---

**For detailed documentation, see `docs/` directory and Serena memories.**
**For testing methodology, see `.claude/skills/frontend-driven-testing/`**
**For execution, use `/superpowers:execute-plan docs/plans/2025-12-01-parallel-testing-execution.md`**
