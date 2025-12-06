# Deployment Playbook - v1.1.0 Import Feature

**Target Environment**: Production
**Version**: v1.1.0
**Release Date**: 2025-12-05
**Deployment Type**: Rolling update (zero-downtime possible)

---

## Pre-Deployment

### 1. Code Review Checklist

**Pull Request Review:**
- [ ] All 7 commits reviewed individually
- [ ] Commit messages descriptive and accurate
- [ ] No debugging code (console.log, debugger, etc.)
- [ ] No sensitive data (API keys, passwords, etc.)
- [ ] TypeScript compiles without errors
- [ ] Docker build succeeds
- [ ] No TODO/FIXME comments without tickets

**Code Quality:**
- [ ] Functions are focused and single-purpose
- [ ] Error handling present for all async operations
- [ ] Input validation on all API endpoints
- [ ] SQL injection prevention (using parameterized queries)
- [ ] XSS prevention (markdown sanitized on display)
- [ ] Rate limiting on public endpoints

**Testing:**
- [ ] Critical bug fixed and verified (sub-subcategory filtering)
- [ ] 30+ test cases executed, 100% pass rate
- [ ] 3-layer validation applied to all features
- [ ] Performance benchmarks within acceptable range

### 2. Staging Deployment

**Deploy to staging:**
```bash
# SSH to staging server:
ssh user@staging.awesome-list.com

# Navigate to project:
cd /var/www/awesome-list

# Pull latest code:
git fetch origin
git checkout feature/session-5-complete-verification
git pull origin feature/session-5-complete-verification

# Install dependencies:
npm install

# Build:
docker-compose -f docker-compose.staging.yml build --no-cache web

# Deploy:
docker-compose -f docker-compose.staging.yml down
docker-compose -f docker-compose.staging.yml up -d

# Wait for health:
sleep 20

# Verify:
curl https://staging.awesome-list.com/api/health
```

### 3. Staging Smoke Tests

**Critical Path Tests:**

```bash
# Test 1: Health check
curl https://staging.awesome-list.com/api/health | jq '.status'
# Expected: "ok"

# Test 2: Homepage loads
curl -I https://staging.awesome-list.com/
# Expected: 200 OK

# Test 3: Sub-subcategory filtering (bug fix validation)
curl "https://staging.awesome-list.com/api/resources?subSubcategory=iOS%2FtvOS&status=approved" \
  | jq '.resources | length'
# Expected: <100 (not 1000!)

# Test 4: Category filtering
curl "https://staging.awesome-list.com/api/resources?category=Applications&status=approved&limit=1" \
  | jq -r '.resources[0].category'
# Expected: "Applications"

# Test 5: Search
curl "https://staging.awesome-list.com/api/resources?search=player&status=approved" \
  | jq '.total'
# Expected: >0
```

**Manual Tests:**
- [ ] Navigate to /sub-subcategory/iostvos
- [ ] Verify: Shows ~30 resources (not 1000)
- [ ] Content: All iOS/tvOS players (not random Rust libs)
- [ ] Admin panel: /admin/github loads
- [ ] Import button: Visible and clickable

**If all pass:** ✅ Ready for production
**If any fail:** ❌ Investigate, fix, redeploy staging

### 4. Database Backup

**Before production deploy:**

```bash
# SSH to production database:
ssh user@db.awesome-list.com

# Or via Supabase dashboard:
# Project → Database → Backups → Create Backup

# Backup command (if direct access):
pg_dump -Fc $DATABASE_URL > ~/backups/awesome-list-$(date +%Y%m%d-%H%M%S).dump

# Verify backup:
pg_restore --list ~/backups/awesome-list-*.dump | head

# Store backup securely:
aws s3 cp ~/backups/awesome-list-*.dump s3://backups/awesome-list/
# Or: scp to secure location
```

**Backup checklist:**
- [ ] Backup completed successfully
- [ ] Backup file size reasonable (MB range)
- [ ] Backup stored in secure location
- [ ] Backup verified (can list contents)

---

## Production Deployment

### 1. Maintenance Mode (Optional)

**If zero-downtime not possible:**

```bash
# Show maintenance page:
docker-compose exec nginx sh -c "mv /etc/nginx/maintenance.html.disabled /etc/nginx/maintenance.html"
docker-compose exec nginx nginx -s reload

# Or: Update DNS to point to maintenance page
```

**Message to users:**
```
🚧 Maintenance in Progress

We're deploying exciting new features!
- GitHub import capability
- Real-time progress tracking
- AI-assisted parsing

Estimated downtime: 5 minutes
Expected completion: [TIME]

Thank you for your patience!
```

### 2. Production Deploy

**Deploy steps:**

```bash
# SSH to production:
ssh user@prod.awesome-list.com

# Navigate to project:
cd /var/www/awesome-list

# Checkout release branch:
git fetch origin
git checkout main
git pull origin main

# Merge feature (or cherry-pick commits):
git merge feature/session-5-complete-verification

# Verify commits:
git log --oneline -7
# Should show all 7 commits

# Tag release:
git tag -a v1.1.0 -m "Import feature with AI parsing and deviation detection"
git push origin v1.1.0

# Install dependencies:
npm install --production

# Build:
docker-compose -f docker-compose.prod.yml build --no-cache web

# Rolling update (zero downtime):
# Option A: Blue-green deployment (if configured)
docker-compose -f docker-compose.prod.blue.yml up -d
# Test blue environment
# Switch load balancer to blue
# Take down green

# Option B: Standard restart (brief downtime)
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Wait for startup:
sleep 30

# Verify health:
curl https://awesome-list.com/api/health
```

### 3. Database Migrations

**Run migrations (if any):**

```bash
# Check current schema:
psql $DATABASE_URL -c "\d+ resources"

# Run drizzle-kit (if schema changes):
npx drizzle-kit push
# Note: v1.1.0 has no schema changes, only code changes

# Add index (critical for bug fix):
psql $DATABASE_URL << SQL
CREATE INDEX IF NOT EXISTS idx_resources_sub_subcategory 
ON resources(sub_subcategory);

-- Verify index:
SELECT indexname FROM pg_indexes 
WHERE tablename = 'resources' 
AND indexname LIKE '%sub_subcategory%';
SQL

# Should return: idx_resources_sub_subcategory
```

### 4. Cache Management

**Clear caches to ensure fresh data:**

```bash
# Clear Redis (force cache rebuild):
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL

# Or selective clearing:
docker-compose -f docker-compose.prod.yml exec redis redis-cli KEYS "resources:*" | xargs redis-cli DEL

# Restart Redis (safer, preserves other cache):
docker-compose -f docker-compose.prod.yml restart redis
```

**Reason:** Bug fix requires fresh cache (old cache has wrong sub-subcategory data)

### 5. Application Startup

**Monitor startup:**

```bash
# Follow logs:
docker-compose -f docker-compose.prod.yml logs -f web

# Look for:
# - "Server listening on port 3000" ✅
# - "Connected to database" ✅
# - "Redis cache connected" ✅
# - No errors ✅

# Check all containers:
docker-compose -f docker-compose.prod.yml ps

# Should show:
# - web: Up, healthy
# - redis: Up, healthy
# - nginx: Up, healthy
```

**If errors:**
- Check logs for specific error message
- Verify environment variables set
- Check database connectivity
- Verify Redis connectivity
- Rollback if critical (see Rollback Plan below)

---

## Post-Deployment Verification

### 1. Smoke Tests (Critical Path)

**Execute immediately after deploy:**

```bash
# Test 1: Health check
curl https://awesome-list.com/api/health | jq '.status'
# Expected: "ok"
# FAIL if: Error or no response

# Test 2: Homepage loads
curl -I https://awesome-list.com/
# Expected: HTTP/1.1 200 OK
# FAIL if: 500, 502, 503, 504

# Test 3: Sub-subcategory filtering (CRITICAL BUG FIX)
curl "https://awesome-list.com/api/resources?subSubcategory=iOS%2FtvOS&status=approved" \
  | jq '.resources | length'
# Expected: 30 (or thereabouts)
# FAIL if: 1000 (bug not fixed!)

# Test 4: Category filtering
curl "https://awesome-list.com/api/resources?category=Applications&status=approved&limit=1" \
  | jq -r '.resources[0].category'
# Expected: "Applications"
# FAIL if: Different category or null

# Test 5: Search
curl "https://awesome-list.com/api/resources?search=player&status=approved&limit=5" \
  | jq '.resources | length'
# Expected: 5 (or less if <5 total)
# FAIL if: 0 or error
```

**If any fail:** ROLLBACK IMMEDIATELY (see Rollback Plan)

### 2. Manual UI Tests

**Login and verify:**

```
Admin user:
1. Navigate to https://awesome-list.com/login
2. Login with admin credentials
3. Navigate to /admin/github
4. Verify: Import/Export buttons visible
5. Verify: Sync history shows previous imports

Public user:
1. Navigate to https://awesome-list.com
2. Click category: "Video Players & Playback Libraries"
3. Expand subcategory: "Mobile Players"
4. Click sub-subcategory: "iOS/tvOS"
5. VERIFY: Shows ~30 iOS/tvOS players (NOT 1000 random resources!)

If sub-subcategory test fails: ROLLBACK (critical bug not fixed)
```

### 3. Performance Validation

**Response time checks:**

```bash
# Homepage:
time curl -s https://awesome-list.com/ > /dev/null
# Expected: <3s

# API category filter:
time curl -s "https://awesome-list.com/api/resources?category=Applications&limit=50" > /dev/null
# Expected: <1s

# API sub-subcategory filter:
time curl -s "https://awesome-list.com/api/resources?subSubcategory=iOS%2FtvOS" > /dev/null
# Expected: <0.5s

# API search:
time curl -s "https://awesome-list.com/api/resources?search=player" > /dev/null
# Expected: <1s
```

**If performance degraded:** Investigate, consider rollback if >2x slower

### 4. Error Log Check

**Monitor for errors in first 30 minutes:**

```bash
# Watch logs:
docker-compose -f docker-compose.prod.yml logs -f --tail=100 web

# Look for:
# - 500 errors ❌
# - Uncaught exceptions ❌
# - Database errors ❌
# - Parse errors ⚠️ (acceptable if rare)
# - TypeError/ReferenceError ❌

# Count errors:
docker-compose -f docker-compose.prod.yml logs web | grep -i "error" | wc -l
# Expected: <10 in first hour
# FAIL if: >50
```

---

## Monitoring Setup

### 1. Application Metrics

**Set up dashboards for:**

```javascript
// Response time monitoring:
const metrics = {
  endpoint: '/api/resources',
  method: 'GET',
  responseTime: 245,  // ms
  statusCode: 200,
  cacheHit: true
};

// Track:
- P50 response time (should be <500ms)
- P95 response time (should be <2s)
- P99 response time (should be <5s)
- Error rate (should be <1%)
```

**Alerting thresholds:**
- Response time P95 >3s: Warning
- Response time P95 >5s: Critical
- Error rate >5%: Warning
- Error rate >10%: Critical

### 2. Import Feature Metrics

**Track in application:**

```javascript
// Import metrics:
{
  repoUrl: 'https://github.com/...',
  duration: 25000,  // ms
  resourcesImported: 42,
  resourcesUpdated: 15,
  resourcesSkipped: 694,
  parseErrors: 0,
  deviations: 2,
  warnings: 4,
  success: true
}

// Log to metrics system (Datadog, CloudWatch, etc.)
```

**Dashboard:**
- Import success rate (should be >90%)
- Average import duration
- Parse error rate (should be <5%)
- Deviation frequency (track for trends)
- Most imported repositories

### 3. Infrastructure Metrics

**Monitor:**

```bash
# Docker container health:
docker-compose -f docker-compose.prod.yml ps
# All should show: Up (healthy)

# Memory usage:
docker stats --no-stream

# Disk usage:
df -h

# Database connections:
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
# Should be <20 typically

# Redis memory:
docker-compose exec redis redis-cli INFO | grep used_memory_human
# Should be <100MB typically
```

**Alerts:**
- Memory >80%: Warning
- Disk >80%: Warning
- Database connections >50: Warning
- Redis memory >500MB: Warning

---

## Rollback Plan

### Immediate Rollback (If Critical Issue)

**Trigger conditions:**
- Sub-subcategory pages show 1000 wrong resources (bug fix failed)
- Import completely broken (all imports fail)
- Database corruption detected
- Site down (5xx errors persist >5 minutes)

**Rollback steps:**

```bash
# SSH to production:
ssh user@prod.awesome-list.com
cd /var/www/awesome-list

# Stop v1.1.0:
docker-compose -f docker-compose.prod.yml down

# Checkout v1.0.0:
git checkout v1.0.0
# Or specific commit: git checkout 5e63a5d (last commit before this feature)

# Rebuild:
docker-compose -f docker-compose.prod.yml build --no-cache web

# Start v1.0.0:
docker-compose -f docker-compose.prod.yml up -d

# Wait:
sleep 20

# Verify:
curl https://awesome-list.com/api/health
curl https://awesome-list.com/
```

**Database rollback (if needed):**

```bash
# Restore from backup:
pg_restore -d $DATABASE_URL -c ~/backups/awesome-list-20251205.dump

# Or via Supabase:
# Dashboard → Database → Backups → Restore to [timestamp before deploy]
```

**Estimated rollback time:** 5-10 minutes

**Communication:**
- Notify users via Twitter/email: "Rolled back to v1.0.0 due to [issue]. Investigating."
- Create incident report
- Schedule post-mortem

### Partial Rollback (If Specific Feature Issue)

**If only import feature is broken:**

```bash
# Don't rollback entire app, just disable import feature:

# Option A: Hide import UI:
# Edit GitHubSyncPanel.tsx (hot-fix):
const IMPORT_ENABLED = false;  // Feature flag

if (!IMPORT_ENABLED) {
  return <div>Import feature temporarily disabled. Check back soon!</div>;
}

# Rebuild and deploy:
docker-compose -f docker-compose.prod.yml build web
docker-compose -f docker-compose.prod.yml up -d
```

**If only SSE progress is broken:**

```typescript
// Revert to standard import endpoint:
// In GitHubSyncPanel.tsx:
onClick={() => importMutation.mutate()}  // Instead of startStreamingImport()
```

**No database rollback needed** if only UI/API issue

---

## Post-Deployment Monitoring

### First Hour

**Watch closely for:**

```bash
# Error rate:
docker-compose logs web | grep -c "error"
# Expected: <20 in first hour

# Sub-subcategory page loads:
# Have users test: /sub-subcategory/iostvos
# Expected feedback: "Working correctly, shows iOS players"
# FAIL feedback: "Shows 1000 random resources" → ROLLBACK

# Import feature usage:
# If admin tests import:
# Watch logs: docker-compose logs -f web | grep import
# Expected: Successful completion
# FAIL: Parse errors, database errors
```

**Metrics to track:**
- Response times (should match pre-deploy)
- Error rates (should be <1%)
- Memory usage (should stabilize <400MB)
- Database query times (should be <200ms)

### First Day

**Gather data on:**
- Import feature usage (how many admins tried it?)
- Import success rate (should be >90%)
- User reports of issues (sub-subcategory pages)
- Performance (any degradation?)
- Database size growth (if imports happened)

**Review:**
- Error logs (summarize and categorize)
- User feedback (collect from support channels)
- Performance metrics (compare to baseline)

**Action items:**
- Fix any bugs discovered
- Optimize any bottlenecks found
- Plan v1.1.1 improvements based on feedback

### First Week

**Monitor trends:**
- Import volume (how many imports per day?)
- Popular repositories (which repos are imported?)
- Deviation types (what format issues are common?)
- AI parsing usage (if enabled by any admin)
- Performance stability (any memory leaks?)

**Plan for v1.1.1:**
- Fix queue status display issue
- Add UI toggle for AI parsing
- Fix export marker type (if users complain)
- Other improvements based on feedback

---

## Incident Response

### Severity Levels

**P0 (Critical - Immediate Response):**
- Site completely down (5xx errors on all pages)
- Data corruption (resources disappearing)
- Security breach (unauthorized access)
- **Response time:** <15 minutes
- **Action:** Rollback immediately, investigate offline

**P1 (High - Urgent Response):**
- Import feature completely broken (all imports fail)
- Sub-subcategory pages show wrong resources (bug fix failed)
- Database performance degraded (queries >5s)
- **Response time:** <1 hour
- **Action:** Disable feature or rollback, fix quickly

**P2 (Medium - Scheduled Response):**
- Import fails for specific repository (parse error)
- Progress indicator not updating (cosmetic)
- Minor performance degradation (<2x slower)
- **Response time:** <4 hours
- **Action:** Investigate, fix in next deploy

**P3 (Low - Backlog):**
- Queue status shows "in progress" cosmetically
- Export uses dash instead of asterisk markers
- UI polish issues
- **Response time:** Next sprint
- **Action:** Add to v1.1.1 backlog

### Incident Communication Template

```
Subject: [P{0-3}] {Brief description}

Incident: {What went wrong}
Impact: {Who is affected, what functionality broken}
Status: Investigating | Fix in progress | Resolved
ETA: {Expected resolution time}

Timeline:
- {Time}: Issue detected
- {Time}: Team notified
- {Time}: Root cause identified
- {Time}: Fix deployed
- {Time}: Verified resolved

Root Cause: {Technical explanation}
Permanent Fix: {Long-term solution}
Prevention: {How to prevent in future}
```

---

## Feature Flags (Future)

**For safer deployments in v1.2.0:**

```typescript
// config/features.ts
export const features = {
  IMPORT_ENABLED: process.env.FEATURE_IMPORT === 'true',
  AI_PARSING_ENABLED: process.env.FEATURE_AI_PARSING === 'true',
  PROGRESS_TRACKING_ENABLED: process.env.FEATURE_PROGRESS === 'true',
  DEVIATION_DETECTION_ENABLED: process.env.FEATURE_DEVIATIONS === 'true',
};

// In code:
if (features.IMPORT_ENABLED) {
  // Show import UI
} else {
  // Hide import UI
}
```

**Benefits:**
- Enable features gradually (canary deployment)
- Disable quickly without code changes
- A/B testing possible
- Rollback individual features without full rollback

---

## Success Criteria

**Deployment is successful if:**

**Critical (Must Pass):**
- [x] Site is up (200 OK on /)
- [x] Health endpoint responds (200 OK on /api/health)
- [x] Sub-subcategory pages show correct resources (bug fix works!)
- [x] No 500 errors in logs
- [x] Database connections stable
- [x] Redis cache working

**Important (Should Pass):**
- [x] Homepage loads in <3s
- [x] Search works
- [x] Category filtering works
- [x] Import feature accessible to admins
- [x] No user-reported critical issues

**Nice to Have:**
- [ ] Import feature tested by admin
- [ ] Progress indicator works
- [ ] Deviation detection displays correctly
- [ ] No performance degradation

**If all critical + important pass:** ✅ Deployment successful

**If any critical fail:** ❌ Rollback and investigate

---

## Post-Deployment Tasks

### Immediate (Within 1 Hour)

- [ ] Announce deployment (Twitter, email, etc.)
- [ ] Monitor error logs
- [ ] Test sub-subcategory pages manually
- [ ] Verify import feature works (test with small repo)
- [ ] Check performance metrics

### Day 1

- [ ] Review all error logs
- [ ] Collect user feedback
- [ ] Verify bug fix working in production
- [ ] Test import feature if not done yet
- [ ] Plan hotfix if any critical issues found

### Week 1

- [ ] Analyze import usage patterns
- [ ] Review deviation types encountered
- [ ] Check database growth rate
- [ ] Performance trend analysis
- [ ] Plan v1.1.1 improvements

---

## Documentation Update

**Post-deploy:**

- [x] Tag release: v1.1.0
- [x] Update CHANGELOG.md with release notes
- [x] Update README.md with new features
- [x] Publish documentation to docs site (if applicable)
- [ ] Announce in community channels
- [ ] Update Supabase project description

---

## Checklist Summary

### Pre-Deployment
- [ ] Code reviewed
- [ ] Staging deployed and tested
- [ ] Database backed up
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

### Deployment
- [ ] Maintenance mode enabled (if needed)
- [ ] Code pulled and merged
- [ ] Docker built
- [ ] Application deployed
- [ ] Database migrations run (if any)
- [ ] Cache cleared
- [ ] Application started successfully

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Manual UI tests passed
- [ ] Logs reviewed (no critical errors)
- [ ] Performance validated
- [ ] Team notified of successful deployment
- [ ] Monitoring dashboards updated

### If Issues
- [ ] Rollback executed (if critical)
- [ ] Incident report created
- [ ] Root cause investigation started
- [ ] Fix planned for next deployment

---

**Playbook Version**: 1.0
**Last Updated**: 2025-12-05
**Status**: Ready for v1.1.0 deployment
**Estimated Deployment Time**: 15-30 minutes
**Risk Level**: Low (backward compatible, well-tested)
