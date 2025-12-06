# Replit to Docker Migration Plan
## Shannon Implementation Plan v4

**Plan ID**: `replit-to-docker-2025-11-20`  
**Created**: 2025-11-20  
**Complexity Score**: 0.58/1.00 (MEDIUM)  
**Estimated Duration**: 15-20 hours (2-3 weeks)  
**Risk Level**: LOW-MEDIUM (good existing architecture)

---

## Executive Summary

This plan migrates the Awesome Video Resources application from Replit-hosted services to self-hosted Docker containers. The application is **already well-architected** for portability with:
- ✅ Local authentication fallback
- ✅ Generic GitHub client
- ✅ Standard PostgreSQL with Drizzle ORM
- ✅ Database-backed sessions
- ✅ Frontend with zero Replit dependencies

**Key Insight**: Only 3 hard dependencies on Replit, all with existing replacements or easy swaps.

---

## Shannon Complexity Analysis (8-Dimensional)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Structural | 6/10 | Multiple service replacements, but well-isolated |
| Temporal | 4/10 | Sequential migration possible, minimal timing issues |
| Cognitive | 7/10 | Requires understanding of auth flows, Docker, databases |
| Integration | 6/10 | 4 services to integrate (web, db, nginx, redis) |
| Data Flow | 7/10 | Database migration with zero downtime requirement |
| State Management | 5/10 | Session migration, user data preservation |
| Error Handling | 6/10 | Need comprehensive rollback procedures |
| Testing | 8/10 | **Critical**: Functional validation at every step |

**Average Complexity**: 6.125/10 (MEDIUM) → **Requires careful, systematic execution**

---

## Current Architecture (AS-IS)

```
┌─────────────────────────────────────────────────────────┐
│                    REPLIT PLATFORM                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Node.js Application (Port 5000)        │    │
│  │  ┌──────────────┐      ┌──────────────────┐   │    │
│  │  │   Frontend   │      │     Backend      │   │    │
│  │  │  React SPA   │◄────►│  Express API     │   │    │
│  │  │  (Vite)      │      │  (routes.ts)     │   │    │
│  │  └──────────────┘      └─────────┬────────┘   │    │
│  │                                  │             │    │
│  └──────────────────────────────────┼─────────────┘    │
│                                     │                   │
│  ┌──────────────────────────────────▼─────────────┐    │
│  │      Replit Auth (OIDC)                        │    │
│  │      https://replit.com/oidc                   │    │
│  │      • GitHub, Google, Apple, X, Email         │    │
│  │      • REPL_ID, ISSUER_URL                     │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │      Replit PostgreSQL (Neon-powered)          │    │
│  │      • DATABASE_URL                             │    │
│  │      • 22 tables (Drizzle ORM)                 │    │
│  │      • Sessions table (connect-pg-simple)      │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │      Replit GitHub Connector                   │    │
│  │      • REPL_IDENTITY, REPLIT_CONNECTORS_HOST   │    │
│  │      • OAuth token fetching at runtime         │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Target Architecture (TO-BE)

```
┌─────────────────────────────────────────────────────────┐
│                   DOCKER HOST                            │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Nginx Reverse Proxy (Port 80/443)             │    │
│  │  • SSL Termination                              │    │
│  │  • Rate Limiting                                │    │
│  │  • Security Headers                             │    │
│  └──────────────────┬─────────────────────────────┘    │
│                     │                                    │
│  ┌──────────────────▼─────────────────────────────┐    │
│  │  Web Service (Node.js - Port 5000)             │    │
│  │  ┌──────────────┐      ┌──────────────────┐   │    │
│  │  │   Frontend   │      │     Backend      │   │    │
│  │  │  React Build │◄────►│  Express API     │   │    │
│  │  │  (Static)    │      │                  │   │    │
│  │  └──────────────┘      └──┬───────────┬───┘   │    │
│  └────────────────────────────┼───────────┼───────┘    │
│                               │           │             │
│  ┌────────────────────────────▼───────┐   │             │
│  │  Multi-Provider OAuth             │   │             │
│  │  • GitHub OAuth (passport-github2) │   │             │
│  │  • Google OAuth (passport-google)  │   │             │
│  │  • Local Auth (passport-local)     │   │             │
│  │  • Direct integrations (no OIDC)   │   │             │
│  └────────────────────────────────────┘   │             │
│                                           │             │
│  ┌────────────────────────────────────────▼───────┐    │
│  │  PostgreSQL 16 (Port 5432)                     │    │
│  │  • Volume: /var/lib/postgresql/data            │    │
│  │  • Same 22-table schema                        │    │
│  │  • Drizzle migrations                          │    │
│  └────────────────────────────────────────────────┘    │
│                                           │             │
│  ┌────────────────────────────────────────▼───────┐    │
│  │  Redis 7 (Port 6379)                           │    │
│  │  • Session storage (connect-redis)             │    │
│  │  • API response caching                        │    │
│  │  • Volume: /data                               │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘

External Services (Unchanged):
├─ GitHub API (direct token: GITHUB_TOKEN)
├─ Anthropic Claude API (ANTHROPIC_API_KEY)
└─ OpenAI API (OPENAI_API_KEY)
```

---

## Replit Dependencies Analysis

### Hard Dependencies (Must Replace)

| Service | Current | Replacement | Complexity | Code Changes |
|---------|---------|-------------|------------|--------------|
| **Auth** | Replit OIDC | Multi-provider OAuth | MEDIUM | ~200 lines |
| **Database** | Replit PostgreSQL | Docker PostgreSQL | LOW | 0 lines (env only) |
| **GitHub** | Replit Connector | Direct token | LOW | 2 lines (import swap) |

### Soft Dependencies (Can Delete)

| Item | Location | Impact | Action |
|------|----------|--------|--------|
| Dev Banner | `client/index.html:23` | Cosmetic | Delete 1 line |
| Vite Plugin | `vite.config.ts:10-16` | Dev-only | Delete 7 lines |
| .replit Config | `.replit` | Deployment | Delete file |

---

## Migration Phases

### Phase 0: Pre-Migration Validation (CRITICAL)
### Phase 1: Docker Infrastructure Setup
### Phase 2: Database Migration & Validation
### Phase 3: Authentication Replacement
### Phase 4: GitHub Integration Update
### Phase 5: Production Deployment & Cutover

---

## PHASE 0: Pre-Migration Validation
**Duration**: 2 hours  
**Purpose**: Establish baseline, document current state, create rollback point

### Task 0.1: Document Current Environment
**Duration**: 30 min  
**Validation Tier**: Documentation

**Steps**:
```bash
# 1. Export all environment variables
cd /Users/nick/Desktop/awesome-list-site
printenv | grep -E "DATABASE|REPL|ISSUER|GITHUB|SESSION|ANTHROPIC|OPENAI" > docs/CURRENT_ENV.txt

# 2. Document current database schema
npm run db:push  # Ensure schema is current
psql $DATABASE_URL -c "\dt" > docs/CURRENT_SCHEMA.txt
psql $DATABASE_URL -c "\d+ sessions" >> docs/CURRENT_SCHEMA.txt

# 3. Export user count and sample data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;" > docs/CURRENT_DATA_COUNTS.txt
psql $DATABASE_URL -c "SELECT COUNT(*) FROM resources;" >> docs/CURRENT_DATA_COUNTS.txt
psql $DATABASE_URL -c "SELECT * FROM users LIMIT 5;" > docs/SAMPLE_USERS.txt

# 4. Test current application
npm run dev  # In terminal 1
```

**Validation Gate 0.1**:
```bash
# Open browser: http://localhost:5000
# Checklist:
✓ Homepage loads
✓ Can navigate to category pages
✓ Search works
✓ Login page accessible
✓ API responds: curl http://localhost:5000/api/awesome-list

# Document working user credentials
echo "test-user@example.com:password123" > docs/TEST_USER_CREDENTIALS.txt
```

**Pass Criteria**:
- [ ] All environment variables documented
- [ ] Database schema exported
- [ ] User/resource counts recorded
- [ ] Application runs without errors
- [ ] At least 1 test user account verified

**Rollback**: N/A (documentation only)

---

### Task 0.2: Create Database Backup
**Duration**: 15 min  
**Validation Tier**: Artifact

**Steps**:
```bash
# 1. Export full database
mkdir -p backups
pg_dump $DATABASE_URL > backups/replit-db-$(date +%Y%m%d-%H%M%S).sql

# 2. Verify backup
ls -lh backups/
wc -l backups/replit-db-*.sql

# 3. Test restore (dry run to separate test DB if available)
# Skip if no test DB available
```

**Validation Gate 0.2**:
```bash
# Verify backup file
✓ Backup file exists
✓ Backup file size > 100KB
✓ Backup contains CREATE TABLE statements
grep "CREATE TABLE" backups/replit-db-*.sql | wc -l  # Should be 22
```

**Pass Criteria**:
- [ ] Backup file created successfully
- [ ] Backup contains all 22 tables
- [ ] Backup file is complete (no truncation)

**Rollback**: N/A (backup creation)

---

### Task 0.3: Functional Test Suite (Baseline)
**Duration**: 45 min  
**Validation Tier**: Functional (Tier 3)

**Steps**:
```bash
# 1. Start application
npm run dev  # Terminal 1

# 2. Run comprehensive tests
node scripts/comprehensive-functionality-test.mjs  # Terminal 2

# 3. Manual functional tests
```

**Manual Test Checklist** (Record results in `docs/BASELINE_TESTS.md`):

```markdown
## Authentication Tests
- [ ] Login with email/password works
- [ ] Logout works
- [ ] Session persists across page refresh
- [ ] Protected routes redirect to login

## Database Tests  
- [ ] Can view resources
- [ ] Can create new resource (admin)
- [ ] Can edit resource (admin)
- [ ] Can delete resource (admin)

## GitHub Integration Tests
- [ ] Can sync from GitHub (admin panel)
- [ ] Can export to GitHub (admin panel)

## Frontend Tests
- [ ] All 9 categories display
- [ ] Search returns results
- [ ] Pagination works
- [ ] Theme switching works
- [ ] Mobile responsive
```

**Validation Gate 0.3**:
```bash
# All tests must pass
✓ Automated test suite: 100% pass
✓ Manual authentication: All pass
✓ Manual database operations: All pass
✓ Manual GitHub operations: All pass
✓ Manual frontend: All pass
```

**Pass Criteria**:
- [ ] All automated tests pass
- [ ] All manual tests pass
- [ ] Results documented in BASELINE_TESTS.md

**Rollback**: N/A (testing only)

---

## PHASE 1: Docker Infrastructure Setup
**Duration**: 4 hours  
**Purpose**: Create Docker environment, test in parallel with Replit

### Task 1.1: Create Dockerfile
**Duration**: 30 min  
**Validation Tier**: Artifact

**Steps**:
```bash
# Create Dockerfile
cat > Dockerfile << 'EOF'
# Multi-stage build for Node.js application
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build application
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package.json ./
COPY --chown=nodejs:nodejs shared ./shared
COPY --chown=nodejs:nodejs server ./server

USER nodejs

EXPOSE 5000

CMD ["node", "dist/index.js"]
EOF
```

**Validation Gate 1.1**:
```bash
# Test Dockerfile builds
docker build -t awesome-list-web:test .

# Verify image
docker images | grep awesome-list-web
docker inspect awesome-list-web:test | jq '.[0].Config.ExposedPorts'
```

**Pass Criteria**:
- [ ] Docker image builds without errors
- [ ] Image size < 500MB
- [ ] Port 5000 exposed
- [ ] Non-root user configured

**Rollback**: Delete Dockerfile, no system changes

---

### Task 1.2: Create docker-compose.yml
**Duration**: 45 min  
**Validation Tier**: Artifact

**Steps**:
```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: awesome-list-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-awesome_list}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - awesome-list-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: awesome-list-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
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
      - awesome-list-network

  # Web Application
  web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: awesome-list-web
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-awesome_list}
      REDIS_URL: redis://redis:6379
      SESSION_SECRET: ${SESSION_SECRET}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      # OAuth credentials (Phase 3)
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      CALLBACK_URL: ${CALLBACK_URL:-http://localhost/auth/callback}
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:5000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - awesome-list-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: awesome-list-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
    networks:
      - awesome-list-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  awesome-list-network:
    driver: bridge
EOF
```

**Validation Gate 1.2**:
```bash
# Validate docker-compose syntax
docker-compose config

# Check for errors
docker-compose config 2>&1 | grep -i error
```

**Pass Criteria**:
- [ ] docker-compose.yml validates
- [ ] All 4 services defined
- [ ] Healthchecks configured
- [ ] Networks and volumes defined

**Rollback**: Delete docker-compose.yml

---

### Task 1.3: Create Environment Template
**Duration**: 15 min  
**Validation Tier**: Documentation

**Steps**:
```bash
# Create .env.example
cat > .env.example << 'EOF'
# Database Configuration
POSTGRES_DB=awesome_list
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Application Secrets
SESSION_SECRET=CHANGE_ME_RANDOM_64_CHAR_STRING
GITHUB_TOKEN=ghp_your_github_personal_access_token

# AI Services
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key
OPENAI_API_KEY=sk-your_openai_key

# OAuth Providers (Phase 3)
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_secret

# Application URL
CALLBACK_URL=http://localhost/auth/callback
WEBSITE_URL=http://localhost
EOF

# Create actual .env (DO NOT COMMIT)
cp .env.example .env
echo ".env" >> .gitignore
```

**Validation Gate 1.3**:
```bash
# Verify files created
✓ .env.example exists
✓ .env exists  
✓ .env is in .gitignore
```

**Pass Criteria**:
- [ ] .env.example created with all variables
- [ ] .env created (with placeholders)
- [ ] .env ignored by git

**Rollback**: Delete files

---

### Task 1.4: Start Docker Stack (Test)
**Duration**: 30 min  
**Validation Tier**: Functional (Tier 3)

**Steps**:
```bash
# 1. Generate secrets
SESSION_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -base64 24)

# 2. Update .env with real values
sed -i '' "s/CHANGE_ME_RANDOM_64_CHAR_STRING/$SESSION_SECRET/" .env
sed -i '' "s/CHANGE_ME_STRONG_PASSWORD/$POSTGRES_PASSWORD/" .env

# 3. Start services
docker-compose up -d

# 4. Watch logs
docker-compose logs -f
```

**Validation Gate 1.4**:
```bash
# Check all services running
docker-compose ps

# Expected output:
# NAME                    STATUS         PORTS
# awesome-list-postgres   Up (healthy)   5432/tcp
# awesome-list-redis      Up (healthy)   6379/tcp
# awesome-list-web        Up (healthy)   5000/tcp
# awesome-list-nginx      Up             80/tcp, 443/tcp

# Test database connection
docker exec awesome-list-postgres psql -U postgres -d awesome_list -c "SELECT version();"

# Test Redis
docker exec awesome-list-redis redis-cli ping
# Expected: PONG

# Test web service (will fail until DB migration - EXPECTED)
curl http://localhost:5000/api/health
# Expected: Error (no tables yet)
```

**Pass Criteria**:
- [ ] All 4 services start
- [ ] All healthchecks pass (except web)
- [ ] PostgreSQL accepts connections
- [ ] Redis responds to ping
- [ ] Nginx proxies requests

**Rollback**:
```bash
docker-compose down -v  # Remove containers and volumes
```

---

## PHASE 2: Database Migration & Validation
**Duration**: 3 hours  
**Purpose**: Migrate data from Replit PostgreSQL to Docker PostgreSQL with zero data loss

### Task 2.1: Export Replit Database
**Duration**: 30 min  
**Validation Tier**: Artifact

**Steps**:
```bash
# 1. Create migration directory
mkdir -p migrations

# 2. Export from Replit PostgreSQL
pg_dump $DATABASE_URL \
  --clean \
  --if-exists \
  --verbose \
  --file=migrations/001_replit_export.sql

# 3. Verify export
ls -lh migrations/001_replit_export.sql
wc -l migrations/001_replit_export.sql

# 4. Check table count
grep "CREATE TABLE" migrations/001_replit_export.sql | wc -l
# Expected: 22 tables
```

**Validation Gate 2.1**:
```bash
# Verify export completeness
✓ File size > 100KB
✓ Contains 22 CREATE TABLE statements
✓ Contains INSERT statements for users table
✓ No ERROR lines in file

# Check critical tables
grep -c "CREATE TABLE.*users" migrations/001_replit_export.sql
grep -c "CREATE TABLE.*resources" migrations/001_replit_export.sql
grep -c "CREATE TABLE.*sessions" migrations/001_replit_export.sql
```

**Pass Criteria**:
- [ ] Export file created
- [ ] All 22 tables exported
- [ ] Data rows present (INSERT statements)
- [ ] No errors in export

**Rollback**: N/A (export only)

---

### Task 2.2: Import to Docker PostgreSQL
**Duration**: 30 min  
**Validation Tier**: Functional (Tier 3)

**Steps**:
```bash
# 1. Copy SQL to container
docker cp migrations/001_replit_export.sql awesome-list-postgres:/tmp/

# 2. Import data
docker exec -i awesome-list-postgres psql -U postgres -d awesome_list < migrations/001_replit_export.sql

# 3. Verify import
docker exec awesome-list-postgres psql -U postgres -d awesome_list -c "\dt"
```

**Validation Gate 2.2**:
```bash
# Test 1: Table count
docker exec awesome-list-postgres psql -U postgres -d awesome_list -c "\dt" | wc -l
# Expected: 22 tables + headers

# Test 2: User count matches
docker exec awesome-list-postgres psql -U postgres -d awesome_list -c "SELECT COUNT(*) FROM users;"
# Compare with docs/CURRENT_DATA_COUNTS.txt

# Test 3: Resource count matches  
docker exec awesome-list-postgres psql -U postgres -d awesome_list -c "SELECT COUNT(*) FROM resources;"
# Compare with docs/CURRENT_DATA_COUNTS.txt

# Test 4: Sample user exists
docker exec awesome-list-postgres psql -U postgres -d awesome_list -c "SELECT email FROM users LIMIT 5;"
# Compare with docs/SAMPLE_USERS.txt
```

**Pass Criteria**:
- [ ] All 22 tables created
- [ ] User count matches baseline
- [ ] Resource count matches baseline
- [ ] Sample users exist
- [ ] No import errors

**Rollback**:
```bash
docker exec awesome-list-postgres psql -U postgres -d awesome_list -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

---

### Task 2.3: Update Web Service Database Connection
**Duration**: 15 min  
**Validation Tier**: Flow (Tier 1)

**Steps**:
```bash
# 1. Restart web service with new DATABASE_URL
docker-compose restart web

# 2. Check logs
docker-compose logs web | tail -50

# 3. Verify connection
docker-compose logs web | grep -i "database\|connect"
```

**Validation Gate 2.3**:
```bash
# Test web service can connect to database
docker exec awesome-list-web node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : res.rows[0]);
  pool.end();
});
"
# Expected: Current timestamp
```

**Pass Criteria**:
- [ ] Web service starts without database errors
- [ ] Connection test successful
- [ ] Logs show successful database connection

**Rollback**:
```bash
# Revert DATABASE_URL to Replit
docker-compose down web
```

---

### Task 2.4: Functional Database Test
**Duration**: 45 min  
**Validation Tier**: Functional (Tier 3)

**Steps**:
```bash
# 1. Create test script
cat > test-docker-db.sh << 'EOF'
#!/bin/bash
set -e

echo "=== Testing Docker Database Connection ==="

# Test 1: API Health Check
echo "Test 1: API Health Check"
curl -f http://localhost:5000/api/health || echo "FAIL"

# Test 2: Fetch Resources
echo "Test 2: Fetch Resources"
curl -f http://localhost:5000/api/resources | jq '.total' || echo "FAIL"

# Test 3: Fetch Categories  
echo "Test 3: Fetch Categories"
curl -f http://localhost:5000/api/categories | jq 'length' || echo "FAIL"

# Test 4: Database Query via API
echo "Test 4: User Count"
curl -f http://localhost:5000/api/admin/users | jq '.total' || echo "FAIL"

echo "=== All Database Tests Complete ==="
EOF

chmod +x test-docker-db.sh

# 2. Run tests
./test-docker-db.sh
```

**Validation Gate 2.4** (CRITICAL):
```bash
# All API endpoints must return data from Docker PostgreSQL

✓ /api/health returns 200
✓ /api/resources returns resources (count matches baseline)
✓ /api/categories returns 9 categories
✓ /api/admin/users returns users (count matches baseline)

# Manual browser test
open http://localhost

Checklist:
✓ Homepage displays all 9 categories
✓ Click category → resources load
✓ Search works
✓ Resource counts match Replit version
```

**Pass Criteria**:
- [ ] All API tests pass
- [ ] Homepage loads with correct data
- [ ] Category navigation works
- [ ] Search returns results
- [ ] Resource counts match baseline

**Rollback**:
```bash
# Switch back to Replit database
# Update .env DATABASE_URL back to Replit
docker-compose restart web
```

**CRITICAL CHECKPOINT**: Do not proceed to Phase 3 until ALL Phase 2 tests pass!

---

## PHASE 3: Authentication Replacement  
**Duration**: 6 hours  
**Purpose**: Replace Replit Auth with multi-provider OAuth + local auth

### Task 3.1: Install OAuth Dependencies
**Duration**: 10 min  
**Validation Tier**: Flow (Tier 1)

**Steps**:
```bash
# Install passport strategies
npm install passport-github2 passport-google-oauth20 connect-redis

# Update package.json
npm run check  # TypeScript compilation test
```

**Validation Gate 3.1**:
```bash
✓ npm install succeeds
✓ No dependency conflicts
✓ TypeScript compiles
```

**Pass Criteria**:
- [ ] Dependencies installed
- [ ] No npm errors
- [ ] TypeScript compiles

**Rollback**:
```bash
git restore package*.json node_modules/
npm install
```

---

### Task 3.2: Create Multi-Provider Auth Module
**Duration**: 90 min  
**Validation Tier**: Flow + Functional

**Steps**:
```bash
# Create new auth module
cat > server/multiAuth.ts << 'EOF'
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import RedisStore from "connect-redis";
import { createClient } from "redis";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { comparePassword, validateEmail, validatePassword } from "./passwordUtils";

// Redis client for sessions
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

export async function setupMultiAuth(app: Express) {
  // Connect to Redis
  await redisClient.connect();

  // Session configuration with Redis
  const sessionConfig = {
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialization
  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  // Local Strategy (email/password)
  passport.use('local', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        if (!validateEmail(email)) {
          return done(null, false, { message: 'Invalid email format' });
        }

        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        if (!user.password) {
          return done(null, false, { message: 'Please use OAuth to login' });
        }

        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        // Create session format matching Replit auth
        const userSession = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
          },
          expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
        };

        return done(null, userSession);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: `${process.env.CALLBACK_URL}/github`,
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const user = await storage.upsertUser({
            id: `github_${profile.id}`,
            email: profile.emails?.[0]?.value,
            firstName: profile.displayName?.split(' ')[0],
            lastName: profile.displayName?.split(' ').slice(1).join(' '),
            profileImageUrl: profile.photos?.[0]?.value,
          });

          const userSession = {
            claims: {
              sub: user.id,
              email: user.email,
              first_name: user.firstName,
              last_name: user.lastName,
              profile_image_url: user.profileImageUrl,
            },
            expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
          };

          done(null, userSession);
        } catch (error) {
          done(error);
        }
      }
    ));
  }

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: `${process.env.CALLBACK_URL}/google`,
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const user = await storage.upsertUser({
            id: `google_${profile.id}`,
            email: profile.emails?.[0]?.value,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            profileImageUrl: profile.photos?.[0]?.value,
          });

          const userSession = {
            claims: {
              sub: user.id,
              email: user.email,
              first_name: user.firstName,
              last_name: user.lastName,
              profile_image_url: user.profileImageUrl,
            },
            expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
          };

          done(null, userSession);
        } catch (error) {
          done(error);
        }
      }
    ));
  }

  // Auth routes
  setupAuthRoutes(app);
}

function setupAuthRoutes(app: Express) {
  // Local login
  app.post("/api/auth/local/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) return res.status(500).json({ message: "Server error" });
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      
      req.logIn(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        return res.json({ user: { id: user.claims.sub, email: user.claims.email } });
      });
    })(req, res, next);
  });

  // GitHub OAuth
  app.get("/api/auth/github", passport.authenticate('github', { scope: ['user:email'] }));
  app.get("/api/auth/github/callback",
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => res.redirect('/')
  );

  // Google OAuth
  app.get("/api/auth/google", passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get("/api/auth/google/callback",
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => res.redirect('/')
  );

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => res.json({ success: true }));
  });

  // Current user
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ user: null, isAuthenticated: false });
    }
    const user = req.user as any;
    res.json({
      user: {
        id: user.claims.sub,
        email: user.claims.email,
        name: `${user.claims.first_name || ''} ${user.claims.last_name || ''}`.trim(),
      },
      isAuthenticated: true,
    });
  });
}

// Auth middleware
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
EOF

chmod +x server/multiAuth.ts
```

**Validation Gate 3.2**:
```bash
# TypeScript compilation
npm run check
# Expected: No errors

# Syntax validation
node -c server/multiAuth.ts
```

**Pass Criteria**:
- [ ] File created
- [ ] TypeScript compiles
- [ ] No syntax errors

**Rollback**:
```bash
rm server/multiAuth.ts
```

---

### Task 3.3: Update routes.ts to Use Multi-Auth
**Duration**: 30 min  
**Validation Tier**: Flow

**Steps**:
```bash
# Backup current routes
cp server/routes.ts server/routes.ts.backup

# Update import statement
sed -i '' 's/import { setupAuth, isAuthenticated } from ".\/replitAuth"/import { setupMultiAuth as setupAuth, isAuthenticated } from ".\/multiAuth"/' server/routes.ts

# Comment out local auth setup (now in multiAuth)
sed -i '' 's/setupLocalAuth()/\/\/ setupLocalAuth() - now in multiAuth/' server/routes.ts
```

**Validation Gate 3.3**:
```bash
# Verify changes
diff server/routes.ts.backup server/routes.ts

# Test compilation
npm run check
```

**Pass Criteria**:
- [ ] Import updated
- [ ] TypeScript compiles
- [ ] No runtime errors

**Rollback**:
```bash
mv server/routes.ts.backup server/routes.ts
```

---

### Task 3.4: Test Local Authentication (Docker)
**Duration**: 45 min  
**Validation Tier**: Functional (Tier 3) **CRITICAL**

**Steps**:
```bash
# 1. Rebuild and restart web service
docker-compose build web
docker-compose up -d web

# 2. Wait for service to be healthy
docker-compose ps web
# Wait until STATUS shows "healthy"

# 3. Create test user (if doesn't exist)
docker exec awesome-list-postgres psql -U postgres -d awesome_list -c "
INSERT INTO users (id, email, password, first_name, last_name)
VALUES (
  'test-local-user',
  'test@example.com',
  '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- password: password123
  'Test',
  'User'
) ON CONFLICT (email) DO NOTHING;
"

# 4. Test login via API
curl -X POST http://localhost:5000/api/auth/local/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt \
  -v

# Expected: 200 OK with user object

# 5. Test authenticated endpoint
curl http://localhost:5000/api/auth/user \
  -b cookies.txt

# Expected: User data returned
```

**Validation Gate 3.4** (**CRITICAL - DO NOT PROCEED IF FAILS**):
```bash
# Frontend login test (MOST IMPORTANT)
open http://localhost

# Manual test checklist:
✓ Navigate to login page
✓ Enter email: test@example.com
✓ Enter password: password123
✓ Click "Login" button
✓ Redirected to homepage
✓ User menu shows email
✓ Can access protected routes
✓ Logout works
✓ Session persists after page refresh

# API test
curl -X POST http://localhost:5000/api/auth/local/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq '.user.email'
# Expected: "test@example.com"
```

**Pass Criteria** (ALL MUST PASS):
- [ ] API login returns 200 OK
- [ ] Session cookie set
- [ ] /api/auth/user returns user data
- [ ] Frontend login form works
- [ ] User can access protected routes
- [ ] Logout works
- [ ] Session persists across refresh

**Rollback**:
```bash
docker-compose down web
git restore server/routes.ts server/multiAuth.ts
docker-compose build web
docker-compose up -d web
```

**STOP**: If this test fails, DO NOT proceed. Debug authentication before continuing.

---

### Task 3.5: Configure OAuth Providers (Optional)
**Duration**: 60 min  
**Validation Tier**: Functional

**Steps**:
```bash
# 1. Create GitHub OAuth App
# Go to: https://github.com/settings/developers
# Create new OAuth App:
#   - Application name: Awesome Video Resources
#   - Homepage URL: http://localhost
#   - Authorization callback URL: http://localhost/api/auth/github/callback
# Copy Client ID and Client Secret

# 2. Create Google OAuth App  
# Go to: https://console.cloud.google.com/apis/credentials
# Create OAuth 2.0 Client ID:
#   - Application type: Web application
#   - Authorized redirect URIs: http://localhost/api/auth/google/callback
# Copy Client ID and Client Secret

# 3. Update .env
echo "GITHUB_CLIENT_ID=your_github_client_id" >> .env
echo "GITHUB_CLIENT_SECRET=your_github_secret" >> .env
echo "GOOGLE_CLIENT_ID=your_google_client_id" >> .env
echo "GOOGLE_CLIENT_SECRET=your_google_secret" >> .env

# 4. Restart web service
docker-compose restart web
```

**Validation Gate 3.5**:
```bash
# Test GitHub OAuth (manual)
open http://localhost/api/auth/github
# Should redirect to GitHub authorization page
# After authorization, should redirect back and create session

# Test Google OAuth (manual)
open http://localhost/api/auth/google
# Should redirect to Google authorization page  
# After authorization, should redirect back and create session

# Verify OAuth users in database
docker exec awesome-list-postgres psql -U postgres -d awesome_list -c "
SELECT id, email, first_name FROM users WHERE id LIKE 'github_%' OR id LIKE 'google_%';
"
```

**Pass Criteria**:
- [ ] GitHub OAuth flow completes
- [ ] Google OAuth flow completes
- [ ] OAuth users created in database
- [ ] Can login with OAuth providers

**Rollback**: Remove OAuth credentials from .env

---

### Task 3.6: Update Frontend Login UI
**Duration**: 30 min  
**Validation Tier**: Functional

**Steps**:
```bash
# Update login page to show OAuth buttons
cat > client/src/pages/Login.tsx << 'EOF'
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Github } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/local/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Login failed");
        return;
      }

      setLocation("/");
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Choose your login method</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OAuth Buttons */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = "/api/auth/github"}
            >
              <Github className="mr-2 h-4 w-4" />
              Continue with GitHub
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = "/api/auth/google"}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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
          <form onSubmit={handleLocalLogin} className="space-y-4">
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
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
EOF
```

**Validation Gate 3.6**:
```bash
# Rebuild frontend
docker-compose build web
docker-compose restart web

# Test UI
open http://localhost/login

# Manual checklist:
✓ Page loads without errors
✓ Shows 3 login options (GitHub, Google, Email)
✓ Email login form works
✓ OAuth buttons redirect correctly
✓ Error messages display properly
```

**Pass Criteria**:
- [ ] Login page displays all options
- [ ] Email login works
- [ ] OAuth buttons present
- [ ] UI is responsive

**Rollback**:
```bash
git restore client/src/pages/Login.tsx
docker-compose build web
```

---

### Task 3.7: Remove Replit Auth Code
**Duration**: 20 min  
**Validation Tier**: Flow

**Steps**:
```bash
# 1. Delete Replit auth files
rm server/replitAuth.ts
rm server/localAuth.ts  # Merged into multiAuth

# 2. Remove Replit auth dependencies
npm uninstall openid-client openid-client/passport memoizee

# 3. Update imports in any remaining files
grep -r "replitAuth" server/ client/
# Should return no results

# 4. Rebuild
npm run build
```

**Validation Gate 3.7**:
```bash
✓ replitAuth.ts deleted
✓ localAuth.ts deleted
✓ No references to replitAuth in code
✓ Build succeeds
✓ Application still runs
```

**Pass Criteria**:
- [ ] Old auth files deleted
- [ ] No broken imports
- [ ] Application builds
- [ ] Login still works

**Rollback**:
```bash
git restore server/replitAuth.ts server/localAuth.ts package*.json
```

---

## PHASE 4: GitHub Integration Update
**Duration**: 2 hours  
**Purpose**: Replace Replit GitHub Connector with direct token authentication

### Task 4.1: Update syncService.ts Import
**Duration**: 10 min  
**Validation Tier**: Flow

**Steps**:
```bash
# Backup file
cp server/github/syncService.ts server/github/syncService.ts.backup

# Change import
sed -i '' 's/import { getGitHubClient } from ".\/replitConnection"/\/\/ Replit connector replaced with direct token\nimport { GitHubClient } from ".\/client"/' server/github/syncService.ts

# Update GitHubClient instantiation (if needed)
# The constructor already accepts process.env.GITHUB_TOKEN as fallback
```

**Validation Gate 4.1**:
```bash
# Test compilation
npm run check

# Verify change
grep -n "GitHubClient" server/github/syncService.ts
```

**Pass Criteria**:
- [ ] Import updated
- [ ] TypeScript compiles
- [ ] No errors

**Rollback**:
```bash
mv server/github/syncService.ts.backup server/github/syncService.ts
```

---

### Task 4.2: Test GitHub Sync with Direct Token
**Duration**: 30 min  
**Validation Tier**: Functional (Tier 3)

**Steps**:
```bash
# 1. Create GitHub Personal Access Token
# Go to: https://github.com/settings/tokens
# Create new token with scopes: repo, read:user
# Copy token

# 2. Add to .env
echo "GITHUB_TOKEN=ghp_your_token_here" >> .env

# 3. Restart web service
docker-compose restart web

# 4. Test GitHub API access
curl -H "Authorization: Bearer ghp_your_token" https://api.github.com/user
# Should return your GitHub user info

# 5. Test sync via API (admin route)
curl -X POST http://localhost:5000/api/admin/github/sync \
  -H "Content-Type: application/json" \
  -b cookies.txt \  # Admin session cookie
  -d '{"repoUrl":"https://github.com/krzemienski/awesome-video","action":"import"}'
```

**Validation Gate 4.2** (CRITICAL):
```bash
# Frontend test
open http://localhost/admin

# Manual checklist:
✓ Login as admin user
✓ Navigate to GitHub Sync panel
✓ Enter repo URL: https://github.com/krzemienski/awesome-video
✓ Click "Import from GitHub"
✓ Sync completes without errors
✓ Resources imported to database
✓ Can view imported resources

# API test
docker-compose logs web | grep -i "github\|sync"
# Should show successful GitHub API calls
```

**Pass Criteria**:
- [ ] GitHub token works
- [ ] Sync initiates successfully
- [ ] Resources import from GitHub
- [ ] No authentication errors
- [ ] Admin UI shows sync status

**Rollback**:
```bash
git restore server/github/syncService.ts
docker-compose restart web
```

---

### Task 4.3: Remove Replit Connector Code
**Duration**: 15 min  
**Validation Tier**: Flow

**Steps**:
```bash
# Delete Replit connector file
rm server/github/replitConnection.ts

# Verify no remaining references
grep -r "replitConnection" server/
# Should return no results (except backup files)

# Remove environment variables from .env.example
sed -i '' '/REPL_IDENTITY/d' .env.example
sed -i '' '/REPLIT_CONNECTORS/d' .env.example

# Test build
npm run build
```

**Validation Gate 4.3**:
```bash
✓ replitConnection.ts deleted
✓ No code references to replitConnection
✓ Application builds
✓ GitHub sync still works
```

**Pass Criteria**:
- [ ] Connector file deleted
- [ ] No broken imports
- [ ] Build succeeds
- [ ] GitHub features work

**Rollback**:
```bash
git restore server/github/replitConnection.ts
```

---

## PHASE 5: Production Deployment & Final Validation
**Duration**: 3 hours  
**Purpose**: Deploy to production, comprehensive testing, cleanup

### Task 5.1: Remove Replit Frontend Dependencies
**Duration**: 20 min  
**Validation Tier**: Flow

**Steps**:
```bash
# 1. Remove dev banner from HTML
sed -i '' '/<script.*replit-dev-banner/d' client/index.html

# 2. Remove Replit Vite plugin
cat > vite.config.ts << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
EOF

# 3. Delete .replit file
rm .replit

# 4. Test build
npm run build
```

**Validation Gate 5.1**:
```bash
✓ Build completes without errors
✓ dist/public/ contains built files
✓ No Replit references in code
✓ Frontend runs in browser
```

**Pass Criteria**:
- [ ] Replit banner removed
- [ ] Vite plugin removed
- [ ] .replit deleted
- [ ] Build succeeds
- [ ] Frontend works

**Rollback**:
```bash
git restore client/index.html vite.config.ts .replit
```

---

### Task 5.2: Create Nginx Configuration
**Duration**: 30 min  
**Validation Tier**: Artifact + Functional

**Steps**:
```bash
# Create nginx.conf
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream web {
        server web:5000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    server {
        listen 80;
        server_name localhost;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

        # Proxy to web service
        location / {
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Login rate limiting
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
EOF

# Test nginx config
docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro nginx nginx -t
```

**Validation Gate 5.2**:
```bash
# Start nginx
docker-compose up -d nginx

# Test proxying
curl -I http://localhost
# Should return 200

# Test rate limiting (send 15 requests)
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/resources
done
# First 10 should be 200, rest should be 429 (rate limited)

# Test security headers
curl -I http://localhost | grep -i "x-frame-options"
# Should show: X-Frame-Options: SAMEORIGIN
```

**Pass Criteria**:
- [ ] Nginx starts successfully
- [ ] Proxies requests to web service
- [ ] Rate limiting works
- [ ] Security headers present
- [ ] Gzip compression enabled

**Rollback**:
```bash
docker-compose stop nginx
rm nginx.conf
```

---

### Task 5.3: Comprehensive Integration Test
**Duration**: 60 min  
**Validation Tier**: Functional (Tier 3) **CRITICAL**

**Steps**:
```bash
# Create comprehensive test script
cat > test-production.sh << 'EOF'
#!/bin/bash
set -e

echo "=== COMPREHENSIVE PRODUCTION TEST ==="
echo ""

# Test 1: All services running
echo "Test 1: Service Health"
docker-compose ps | grep "Up (healthy)" | wc -l
# Expected: 3 (postgres, redis, web)

# Test 2: Database connectivity
echo "Test 2: Database"
docker exec awesome-list-postgres psql -U postgres -d awesome_list -c "SELECT COUNT(*) FROM users;"

# Test 3: Redis connectivity
echo "Test 3: Redis"
docker exec awesome-list-redis redis-cli ping

# Test 4: Web service health
echo "Test 4: Web Service"
curl -f http://localhost/api/health

# Test 5: Homepage
echo "Test 5: Homepage"
curl -f http://localhost | grep -q "Awesome"

# Test 6: API endpoints
echo "Test 6: API Endpoints"
curl -f http://localhost/api/categories | jq 'length'
curl -f http://localhost/api/resources | jq '.total'

# Test 7: Authentication
echo "Test 7: Authentication"
curl -X POST http://localhost/api/auth/local/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c test-cookies.txt \
  -s | jq '.user.email'

# Test 8: Protected route
echo "Test 8: Protected Route"
curl -f http://localhost/api/auth/user -b test-cookies.txt | jq '.isAuthenticated'

# Test 9: Rate limiting
echo "Test 9: Rate Limiting"
for i in {1..12}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/resources)
  if [ "$status" == "429" ]; then
    echo "Rate limit working: Got 429 on request $i"
    break
  fi
done

# Test 10: Security headers
echo "Test 10: Security Headers"
curl -I http://localhost | grep -i "x-frame-options"

echo ""
echo "=== ALL TESTS PASSED ==="
EOF

chmod +x test-production.sh

# Run tests
./test-production.sh
```

**Validation Gate 5.3** (**CRITICAL - MUST PASS ALL**):

**Automated Tests**:
```bash
✓ All 4 Docker services healthy
✓ PostgreSQL accepting connections
✓ Redis responding
✓ Web service returning 200
✓ Homepage loads
✓ All 9 categories returned
✓ Resources API returns data
✓ Login succeeds
✓ Protected routes work with session
✓ Rate limiting active
✓ Security headers present
```

**Manual Browser Tests**:
```bash
open http://localhost

Checklist (MUST ALL PASS):
✓ Homepage loads (all 9 categories)
✓ Click category → resources display
✓ Search "ffmpeg" → results appear
✓ Pagination works
✓ Theme switcher works
✓ Login page accessible
✓ Can login with test@example.com:password123
✓ User menu shows email after login
✓ Can access admin panel (if admin)
✓ GitHub sync works (admin)
✓ Logout works
✓ Session persists across page refresh
✓ Mobile view works (resize browser)
```

**Performance Tests**:
```bash
# Load time
curl -w "@-" -o /dev/null -s http://localhost <<'EOT'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOT
# time_total should be < 1 second

# Concurrent requests
ab -n 100 -c 10 http://localhost/api/resources
# All requests should succeed
```

**Pass Criteria** (ALL MUST PASS):
- [ ] All automated tests pass (100%)
- [ ] All manual browser tests pass (100%)
- [ ] Homepage loads < 1 second
- [ ] No errors in docker logs
- [ ] No 500 errors
- [ ] Authentication works end-to-end
- [ ] Database operations work
- [ ] GitHub integration works

**Rollback**:
```bash
# If any test fails, rollback entire phase
docker-compose down -v
# Restore from backup
# Re-import Replit database
```

**STOP**: If ANY test in 5.3 fails, DO NOT proceed. Debug until all pass.

---

### Task 5.4: Performance Optimization
**Duration**: 30 min  
**Validation Tier**: Artifact + Performance

**Steps**:
```bash
# 1. Add compression to Express
npm install compression

# 2. Update server/index.ts
cat >> server/index.ts << 'EOF'
import compression from 'compression';
app.use(compression());
EOF

# 3. Configure Redis caching
# Already configured in multiAuth.ts

# 4. Add database connection pooling (already in place via node-postgres)

# 5. Rebuild and test
docker-compose build web
docker-compose restart web
```

**Validation Gate 5.4**:
```bash
# Test compression
curl -H "Accept-Encoding: gzip" -I http://localhost/api/resources | grep -i "content-encoding"
# Should show: content-encoding: gzip

# Test response times (should improve)
ab -n 100 -c 10 http://localhost/api/resources
# Average time per request should be < 100ms
```

**Pass Criteria**:
- [ ] Compression enabled
- [ ] Response times improved
- [ ] No functionality broken

---

### Task 5.5: Documentation Update
**Duration**: 30 min  
**Validation Tier**: Documentation

**Steps**:
```bash
# Update README.md
cat > README.md << 'EOF'
# Awesome Video Resources

A modern web application for browsing 2,000+ curated video development resources.

## Features

- 🎥 2,000+ curated resources across 9 categories
- 🔐 Multi-provider authentication (GitHub, Google, Email)
- 🔍 Advanced search and filtering
- 📱 Mobile-optimized responsive design
- 🌙 Dark/light theme support
- 🤖 AI-powered recommendations
- 📊 Analytics dashboard
- 🔄 GitHub sync for awesome-lists

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, Drizzle ORM
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Deployment**: Docker Compose
- **Auth**: Passport.js (GitHub, Google, Local)

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for development)

### Installation

1. **Clone repository**:
   ```bash
   git clone <repo-url>
   cd awesome-list-site
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your values:
   # - Generate SESSION_SECRET: openssl rand -hex 32
   # - Add GITHUB_TOKEN (for GitHub sync)
   # - Add ANTHROPIC_API_KEY (for AI features)
   # - Add OAuth credentials (optional)
   ```

3. **Start services**:
   ```bash
   docker-compose up -d
   ```

4. **Access application**:
   - Frontend: http://localhost
   - API: http://localhost/api

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# TypeScript check
npm run check

# Database migrations
npm run db:push
```

## Authentication

The application supports three authentication methods:

1. **Email/Password** (Local Auth)
2. **GitHub OAuth**
3. **Google OAuth**

### Setup OAuth (Optional)

**GitHub**:
1. Go to https://github.com/settings/developers
2. Create new OAuth App
3. Set callback URL: `http://your-domain/api/auth/github/callback`
4. Add credentials to `.env`

**Google**:
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Set redirect URI: `http://your-domain/api/auth/google/callback`
4. Add credentials to `.env`

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| nginx | 80, 443 | Reverse proxy |
| web | 5000 | Node.js application |
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Redis cache |

## Environment Variables

See `.env.example` for all available variables.

Required:
- `POSTGRES_PASSWORD`
- `SESSION_SECRET`

Optional:
- `GITHUB_TOKEN` (for GitHub sync)
- `ANTHROPIC_API_KEY` (for AI features)
- `GITHUB_CLIENT_ID/SECRET` (for GitHub OAuth)
- `GOOGLE_CLIENT_ID/SECRET` (for Google OAuth)

## Database

PostgreSQL with 22 tables:
- Users, Resources, Categories
- Learning Journeys
- GitHub Sync Queue
- Enrichment Jobs
- And more...

Managed via Drizzle ORM.

## License

MIT
EOF

# Create Docker deployment guide
cat > docs/DOCKER_DEPLOYMENT.md << 'EOF'
# Docker Deployment Guide

## Architecture

The application runs as 4 Docker containers:
1. **nginx**: Reverse proxy (port 80/443)
2. **web**: Node.js application (port 5000)
3. **postgres**: PostgreSQL database (port 5432)
4. **redis**: Redis cache (port 6379)

## Deployment Steps

### 1. Server Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Application Deployment

```bash
# Clone repository
git clone <repo-url>
cd awesome-list-site

# Configure environment
cp .env.example .env
nano .env  # Edit with production values

# Generate secrets
openssl rand -hex 32  # SESSION_SECRET
openssl rand -base64 24  # POSTGRES_PASSWORD

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### 3. Database Migration

```bash
# Import existing data (if migrating)
docker cp backup.sql awesome-list-postgres:/tmp/
docker exec -i awesome-list-postgres psql -U postgres -d awesome_list < /tmp/backup.sql

# Or run fresh migrations
docker exec awesome-list-web npm run db:push
```

### 4. SSL Setup (Production)

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/

# Update nginx.conf to use SSL
# Restart nginx
docker-compose restart nginx
```

## Monitoring

```bash
# View logs
docker-compose logs -f web
docker-compose logs -f postgres

# Check resource usage
docker stats

# Database backup
docker exec awesome-list-postgres pg_dump -U postgres awesome_list > backup-$(date +%Y%m%d).sql
```

## Troubleshooting

### Service won't start
```bash
docker-compose logs <service-name>
docker inspect <container-name>
```

### Database connection issues
```bash
docker exec awesome-list-postgres psql -U postgres -c "SELECT version();"
docker-compose restart web
```

### Clear all data and restart
```bash
docker-compose down -v
docker-compose up -d
```
EOF
```

**Validation Gate 5.5**:
```bash
✓ README.md updated with Docker instructions
✓ DOCKER_DEPLOYMENT.md created
✓ All commands tested and working
✓ Documentation accurate
```

**Pass Criteria**:
- [ ] README updated
- [ ] Deployment guide created
- [ ] All documented commands work

---

### Task 5.6: Final Cleanup
**Duration**: 20 min  
**Validation Tier**: Artifact

**Steps**:
```bash
# 1. Remove backup files
find . -name "*.backup" -delete

# 2. Remove test files
rm -f test-cookies.txt cookies.txt test-*.sh

# 3. Clean Docker
docker system prune -f

# 4. Commit changes
git status
git add .
git commit -m "feat: migrate from Replit to Docker

- Replace Replit Auth with multi-provider OAuth (GitHub, Google, Local)
- Replace Replit PostgreSQL with Docker PostgreSQL
- Replace Replit GitHub Connector with direct token auth
- Add Nginx reverse proxy with rate limiting
- Add Redis for session storage
- Remove all Replit dependencies
- Add comprehensive Docker deployment
- Update documentation"

# 5. Tag release
git tag -a v2.0.0-docker -m "Docker migration complete"
```

**Validation Gate 5.6**:
```bash
✓ No backup files remain
✓ No test files remain
✓ Git history clean
✓ Changes committed
✓ Release tagged
```

**Pass Criteria**:
- [ ] Cleanup complete
- [ ] Changes committed
- [ ] Release tagged

---

## PHASE 6: Post-Migration Validation
**Duration**: 1 hour  
**Purpose**: Final comprehensive validation, create rollback plan

### Task 6.1: Full System Test
**Duration**: 45 min  
**Validation Tier**: Functional (Tier 3) **FINAL GATE**

**Test all user flows**:

1. **Anonymous User Flow**:
   ```
   ✓ Visit homepage
   ✓ Browse categories
   ✓ Search resources
   ✓ View resource details
   ✓ Theme switching
   ✓ Mobile responsive
   ```

2. **Authenticated User Flow**:
   ```
   ✓ Register new account (email)
   ✓ Login with email/password
   ✓ Login with GitHub OAuth
   ✓ Login with Google OAuth
   ✓ View profile
   ✓ Bookmark resources
   ✓ Save preferences
   ✓ Logout
   ```

3. **Admin User Flow**:
   ```
   ✓ Login as admin
   ✓ Access admin panel
   ✓ View all users
   ✓ Manage resources
   ✓ GitHub sync (import)
   ✓ GitHub sync (export)
   ✓ AI enrichment
   ✓ View analytics
   ```

4. **Performance Tests**:
   ```
   ✓ Homepage load < 1s
   ✓ API response < 100ms
   ✓ Search < 200ms
   ✓ Database query < 50ms
   ✓ No memory leaks (run for 1 hour)
   ```

**Pass Criteria** (ALL MUST PASS):
- [ ] All anonymous flows work
- [ ] All authenticated flows work
- [ ] All admin flows work
- [ ] All performance targets met
- [ ] No errors in logs
- [ ] No memory leaks

---

### Task 6.2: Create Rollback Plan
**Duration**: 15 min  
**Validation Tier**: Documentation

**Steps**:
```bash
cat > docs/ROLLBACK_PLAN.md << 'EOF'
# Rollback Plan - Docker Migration

## If migration fails, follow these steps to restore Replit services:

### Quick Rollback

```bash
# 1. Stop Docker services
docker-compose down -v

# 2. Restore original code
git reset --hard <pre-migration-commit>

# 3. Restore environment variables
cp docs/CURRENT_ENV.txt .env.replit
source .env.replit

# 4. Restore database
psql $DATABASE_URL < backups/replit-db-<timestamp>.sql

# 5. Start original application
npm run dev
```

### Verify Rollback

```bash
# Test all functionality
npm run dev
open http://localhost:5000

✓ Application runs
✓ Database connected
✓ Authentication works
✓ GitHub sync works
✓ All features functional
```

### Partial Rollback (By Phase)

**Phase 3 Rollback (Auth)**:
```bash
git restore server/multiAuth.ts server/routes.ts
docker-compose restart web
```

**Phase 4 Rollback (GitHub)**:
```bash
git restore server/github/
docker-compose restart web
```

## Support

If rollback fails, contact: [your-email]
EOF
```

---

## Success Criteria

### Migration is successful when ALL of the following are true:

#### Functional Requirements
- [ ] All 9 categories display correctly
- [ ] Search returns accurate results
- [ ] Authentication works (all 3 methods)
- [ ] Admin panel accessible
- [ ] GitHub sync functional
- [ ] Database operations work
- [ ] Sessions persist correctly
- [ ] No data loss

#### Performance Requirements
- [ ] Homepage loads < 1 second
- [ ] API responses < 100ms average
- [ ] No memory leaks after 1 hour
- [ ] Handles 100 concurrent users

#### Technical Requirements
- [ ] All Docker services healthy
- [ ] No Replit dependencies remain
- [ ] All tests pass (100%)
- [ ] Documentation complete
- [ ] Rollback plan documented

#### User Experience
- [ ] No broken links
- [ ] No UI glitches
- [ ] Mobile responsive works
- [ ] Theme switching works
- [ ] Error messages clear

---

## Rollback Triggers

Immediately rollback if ANY of these occur:

1. **Data Loss**: Any users or resources missing
2. **Authentication Failure**: Cannot login with any method
3. **Database Corruption**: Tables missing or damaged
4. **Service Failure**: Any Docker service crashes repeatedly
5. **Performance Degradation**: Response times > 5 seconds
6. **Security Issue**: Any vulnerability detected

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | CRITICAL | Full backup before start, verify counts |
| Authentication breaks | Medium | HIGH | Test thoroughly, keep Replit as fallback |
| Docker networking issues | Low | MEDIUM | Use docker-compose, test locally first |
| Database migration fails | Low | HIGH | Test import/export multiple times |
| Performance degradation | Low | MEDIUM | Benchmark before/after, optimize as needed |

---

## Timeline

| Phase | Duration | Blocker | Can Start After |
|-------|----------|---------|------------------|
| Phase 0 | 2 hours | No | Immediately |
| Phase 1 | 4 hours | No | Phase 0 complete |
| Phase 2 | 3 hours | **Yes** | Phase 1 complete |
| Phase 3 | 6 hours | **Yes** | Phase 2 validated |
| Phase 4 | 2 hours | No | Phase 3 complete |
| Phase 5 | 3 hours | **Yes** | Phase 4 complete |
| Phase 6 | 1 hour | No | Phase 5 complete |
| **Total** | **20-24 hours** | - | - |

**Recommended Schedule**: 2-3 weeks with 1 phase per day, thorough testing between phases

---

## MCP Requirements

This plan uses the following MCPs:

- ✅ **Sequential Thinking**: For complex decision-making (already used in planning)
- ✅ **Puppeteer**: For browser-based E2E testing
- ⚠️  **GitHub**: Optional, for automated deployments
- ❌ **Context7**: Not needed (Replit docs already reviewed)

---

## Contacts & Support

**Migration Lead**: [Your Name]  
**Emergency Rollback**: [Phone Number]  
**Documentation**: See `docs/` folder  
**Issues**: Create GitHub issue

---

## Appendix A: Environment Variable Mapping

| Replit Variable | Docker Variable | Notes |
|----------------|-----------------|-------|
| `DATABASE_URL` | `DATABASE_URL` | Changed to Docker PostgreSQL |
| `ISSUER_URL` | ❌ Removed | Replaced with OAuth |
| `REPL_ID` | ❌ Removed | No longer needed |
| `SESSION_SECRET` | `SESSION_SECRET` | Same, regenerate |
| `REPL_IDENTITY` | ❌ Removed | Replaced with GITHUB_TOKEN |
| `REPLIT_CONNECTORS_HOSTNAME` | ❌ Removed | Direct OAuth now |
| - | `GITHUB_CLIENT_ID` | New for OAuth |
| - | `GITHUB_CLIENT_SECRET` | New for OAuth |
| - | `GOOGLE_CLIENT_ID` | New for OAuth |
| - | `GOOGLE_CLIENT_SECRET` | New for OAuth |
| - | `REDIS_URL` | New for sessions |

---

## Appendix B: Test Credentials

**Test User (Local Auth)**:
- Email: `test@example.com`
- Password: `password123`

**Test Admin (Create manually)**:
```sql
INSERT INTO users (id, email, password, first_name, last_name, role)
VALUES (
  'admin-user',
  'admin@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'Admin',
  'User',
  'admin'
);
```

---

**END OF MIGRATION PLAN**

**Status**: Ready for Execution  
**Confidence**: HIGH (due to good existing architecture)  
**Risk**: LOW-MEDIUM (comprehensive testing at each step)

Execute systematically. Do not skip validation gates. Good luck! 🚀








