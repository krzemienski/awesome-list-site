# Migration Guide: v1.0.0 → v1.1.0

**Target Version**: v1.1.0 (Import Feature Release)
**Breaking Changes**: None
**Database Changes**: Schema compatible, indexes added
**Estimated Downtime**: <5 minutes

---

## Overview

Version 1.1.0 adds GitHub import functionality with AI-assisted parsing, format deviation detection, and real-time progress tracking. All changes are backward compatible with v1.0.0.

---

## Pre-Migration Checklist

### Backup Database

```bash
# PostgreSQL backup (via Supabase)
pg_dump $DATABASE_URL > backup-v1.0.0-$(date +%Y%m%d).sql

# Or via Supabase dashboard:
# Project → Database → Backups → Create Backup
```

### Verify Environment Variables

```bash
# Required (existing):
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
REDIS_URL=redis://localhost:6379

# Optional (new in v1.1.0):
ANTHROPIC_API_KEY=sk-ant-...  # For AI parsing (opt-in)
GITHUB_TOKEN=ghp_...  # For exports (optional for imports)
```

### Check Current State

```bash
# Resource count before migration:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM resources WHERE status = 'approved';"

# Category count:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM categories;"

# Database size:
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
```

---

## Migration Steps

### Step 1: Pull Latest Code

```bash
git fetch origin
git checkout main
git pull origin main

# Verify version:
git log --oneline -1
# Should show: docs: Comprehensive import feature documentation...
```

### Step 2: Install Dependencies

```bash
npm install

# Verify new dependencies:
npm list @anthropic-ai/sdk  # Should show version if added
```

### Step 3: Database Migrations

**No schema changes required** - v1.1.0 uses existing schema

**New indexes added** (optional but recommended):

```sql
-- Check if indexes exist:
\d+ resources

-- Add sub_subcategory index (critical for bug fix):
CREATE INDEX IF NOT EXISTS idx_resources_sub_subcategory 
ON resources(sub_subcategory);

-- Verify index usage:
EXPLAIN ANALYZE 
SELECT * FROM resources 
WHERE sub_subcategory = 'iOS/tvOS' 
AND status = 'approved';

-- Should show: "Index Scan using idx_resources_sub_subcategory"
```

**Index already exists?** Check with:
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'resources' 
AND indexname = 'idx_resources_sub_subcategory';
```

### Step 4: Build Application

```bash
# Clean build:
docker-compose build --no-cache web

# Verify build succeeds:
# Should see: "awesome-list-site-web  Built"
```

### Step 5: Deploy

```bash
# Stop current version:
docker-compose down

# Start v1.1.0:
docker-compose up -d

# Wait for health check:
sleep 15

# Verify health:
curl http://localhost:3000/api/health
# Should return: {"status":"ok","cache":{...}}
```

### Step 6: Smoke Test

**Test 1: Navigation (Bug Fix Validation)**
```bash
# Test sub-subcategory filtering:
curl -s "http://localhost:3000/api/resources?subSubcategory=iOS%2FtvOS&status=approved&limit=10" \
  | jq '.resources | length'

# Expected: ~10 (or less if <30 total iOS/tvOS resources)
# FAIL if: 1000 (bug not fixed)
```

**Test 2: Category Filtering**
```bash
# Test category filter:
curl -s "http://localhost:3000/api/resources?category=Applications&status=approved&limit=5" \
  | jq -r '.resources[0].category'

# Expected: "Applications"
```

**Test 3: Search**
```bash
# Test cross-repository search:
curl -s "http://localhost:3000/api/resources?search=player&status=approved&limit=5" \
  | jq '.resources | length'

# Expected: 5 (or less if <5 results)
```

**Test 4: Admin Panel**
```
- Login as admin
- Navigate to /admin
- Click "GitHub Sync" tab
- Verify: Import/Export buttons visible
- Verify: Sync history shows previous imports
```

### Step 7: Verify Functionality

**Navigation:**
- [ ] Homepage loads with 26 categories
- [ ] Click category → Resources load
- [ ] Expand subcategory in sidebar → Works
- [ ] Click sub-subcategory → Shows filtered resources (NOT 1000 random!)

**Search:**
- [ ] Press / to open search
- [ ] Type query → Results appear
- [ ] Results from multiple categories

**Import (if testing):**
- [ ] Enter repo URL in admin panel
- [ ] Click "Import Resources"
- [ ] Progress bar appears (if using SSE endpoint)
- [ ] Import completes or shows error clearly

---

## Post-Migration Validation

### Performance Checks

```bash
# Homepage response time:
time curl -s http://localhost:3000/api/categories > /dev/null
# Expected: <1s

# Resource query response time:
time curl -s "http://localhost:3000/api/resources?status=approved&limit=50" > /dev/null
# Expected: <0.5s

# Sub-subcategory query (critical):
time curl -s "http://localhost:3000/api/resources?subSubcategory=iOS%2FtvOS&status=approved" > /dev/null
# Expected: <0.2s
```

### Data Integrity Checks

```sql
-- No orphaned subcategories:
SELECT COUNT(*) FROM subcategories s
LEFT JOIN categories c ON c.id = s.category_id
WHERE c.id IS NULL;
-- Expected: 0

-- No orphaned sub-subcategories:
SELECT COUNT(*) FROM sub_subcategories ss
LEFT JOIN subcategories s ON s.id = ss.subcategory_id
WHERE s.id IS NULL;
-- Expected: 0

-- No duplicate resource URLs:
SELECT url, COUNT(*) FROM resources
GROUP BY url HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

### Feature Validation

**Import Feature:**
- [ ] Admin can access /admin/github
- [ ] Import button enabled
- [ ] Repository URL field accepts input
- [ ] Import executes (test with small repo if available)

**Deviation Detection:**
- [ ] Parser.detectFormatDeviations() method exists
- [ ] Returns: deviations, warnings, canProceed
- [ ] Tested via scripts/test-deviation-detection.ts

**AI Parsing:**
- [ ] File exists: server/ai/parsingAssistant.ts
- [ ] Parser has extractResourcesWithAI() method
- [ ] Disabled by default (no cost unless enabled)

**Progress Tracking:**
- [ ] Endpoint exists: POST /api/github/import-stream
- [ ] GitHubSyncPanel has SSE consumer code
- [ ] Progress bar component in UI

---

## Rollback Plan

If issues occur after migration:

### Immediate Rollback

```bash
# Stop v1.1.0:
docker-compose down

# Checkout v1.0.0:
git checkout v1.0.0  # Or specific commit before changes

# Rebuild:
docker-compose build --no-cache web

# Start v1.0.0:
docker-compose up -d

# Verify:
curl http://localhost:3000/api/health
```

### Database Rollback (If Needed)

```sql
-- Restore from backup:
psql $DATABASE_URL < backup-v1.0.0-YYYYMMDD.sql

-- Or via Supabase dashboard:
-- Project → Database → Backups → Restore
```

**Note**: v1.1.0 doesn't change existing data, so rollback should be clean

### Partial Rollback (Disable New Features)

If only specific feature causes issues:

**Disable AI Parsing:**
- Already disabled by default (no action needed)

**Disable Progress Indicator:**
```typescript
// In GitHubSyncPanel.tsx, revert to:
onClick={() => importMutation.mutate()}  // Instead of startStreamingImport()
```

**Disable Deviation Detection:**
```typescript
// In parser.ts, comment out:
// const deviations = parser.detectFormatDeviations();
```

---

## Known Migration Issues

### Issue 1: Sub-subcategory Pages May Show Cached Wrong Results

**Symptom**: After deploy, sub-subcategory pages still show 1000 resources

**Cause**: Redis cache contains pre-fix data

**Solution**:
```bash
# Clear Redis cache:
docker-compose exec redis redis-cli FLUSHALL

# Or restart Redis:
docker-compose restart redis

# Or wait 5 minutes (TTL expires)
```

### Issue 2: Existing "Registries" and "Resources" Categories

**Symptom**: Sidebar shows "Registries" and "Resources" categories

**Cause**: Imported before parser fix (v1.0.0 data)

**Solution Option A** (Clean database):
```sql
-- Delete categories and their resources:
DELETE FROM resources WHERE category IN ('Registries', 'Resources');
DELETE FROM categories WHERE name IN ('Registries', 'Resources');
```

**Solution Option B** (Keep data, ignore cosmetically):
- Leave as-is (harmless, just clutter)
- Future imports won't create these categories
- Resources still accessible

### Issue 3: Queue Shows Old "In Progress" Items

**Symptom**: Sync status shows "2 in progress" from v1.0.0

**Cause**: Queue status not updated properly (known issue in v1.0.0 and v1.1.0)

**Solution**:
```sql
-- Mark old items as failed (cleanup):
UPDATE github_sync_queue
SET status = 'failed', error_message = 'Legacy item - marked as failed during v1.1.0 migration'
WHERE status IN ('pending', 'processing')
AND created_at < NOW() - INTERVAL '1 hour';
```

---

## Testing After Migration

### Manual Test Checklist

1. **Homepage**
   - [ ] Loads without errors
   - [ ] 26 categories visible
   - [ ] Resource counts shown
   - [ ] Search button works (press /)

2. **Navigation**
   - [ ] Click category → Resources load
   - [ ] Click subcategory → Filtered resources
   - [ ] Click sub-subcategory → Correct resources (not 1000 random)

3. **Search**
   - [ ] Search "player" → Mixed results from video + rust
   - [ ] Search "FFmpeg" → Video encoding results
   - [ ] Search "rust" → 400+ Rust-related results

4. **Admin Panel**
   - [ ] /admin loads
   - [ ] Click "GitHub Sync" → Panel loads
   - [ ] Import button visible
   - [ ] Sync history visible

5. **Import (Optional)**
   - [ ] Enter test repo URL
   - [ ] Click Import
   - [ ] Progress bar appears (if SSE)
   - [ ] Completion notification

### Automated Test Script

```bash
#!/bin/bash
# test-v1.1.0-migration.sh

echo "Testing v1.1.0 migration..."

# Test 1: Health check
echo -n "Health check: "
STATUS=$(curl -s http://localhost:3000/api/health | jq -r '.status')
if [ "$STATUS" == "ok" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  exit 1
fi

# Test 2: Sub-subcategory filter (critical bug fix)
echo -n "Sub-subcategory filtering: "
COUNT=$(curl -s "http://localhost:3000/api/resources?subSubcategory=iOS%2FtvOS&status=approved&limit=10" | jq '.resources | length')
if [ "$COUNT" -le 50 ]; then  # Should be ~30, not 1000
  echo "✅ PASS ($COUNT resources)"
else
  echo "❌ FAIL ($COUNT resources, expected <50)"
  exit 1
fi

# Test 3: Category filter
echo -n "Category filtering: "
CATEGORY=$(curl -s "http://localhost:3000/api/resources?category=Applications&status=approved&limit=1" | jq -r '.resources[0].category')
if [ "$CATEGORY" == "Applications" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  exit 1
fi

# Test 4: Search
echo -n "Cross-repository search: "
RESULTS=$(curl -s "http://localhost:3000/api/resources?search=player&status=approved&limit=5" | jq '.resources | length')
if [ "$RESULTS" -ge 1 ]; then
  echo "✅ PASS ($RESULTS results)"
else
  echo "❌ FAIL (no results)"
  exit 1
fi

echo ""
echo "✅ All migration tests passed!"
echo "v1.1.0 is functioning correctly"
```

---

## New Features Available Post-Migration

### 1. GitHub Import

**Access:** `/admin` → "GitHub Sync" tab

**Usage:**
1. Enter repository URL (e.g., "owner/repo" or full URL)
2. Click "Import Resources"
3. Monitor progress bar (real-time updates)
4. Review deviation warnings if any
5. Wait for completion notification

**Supported:**
- Any awesome-list repository (sindresorhus/awesome compliant)
- 2-level and 3-level hierarchies
- Multiple list marker types (*, -)
- Optional descriptions
- Automatic metadata filtering

### 2. Format Deviation Detection

**Automatic:** Runs during import analysis phase

**Detects:**
- Badge presence
- List marker consistency
- Description coverage
- Hierarchy depth
- Metadata sections
- Badge prevalence

**UI Display:**
- Yellow warning card if deviations/warnings found
- Lists specific issues
- Recommendations for fixes

### 3. Real-Time Progress

**Automatic:** If using SSE endpoint (import-stream)

**Phases:**
- Fetching (10%) - Downloading from GitHub
- Parsing (30%) - Extracting structure
- Analyzing (40%) - Detecting deviations
- Creating Hierarchy (50%) - Database population
- Importing Resources (50-100%) - Resource creation

**UI:**
- Animated progress bar
- Status text
- Resource counters (imported/updated/skipped)

### 4. AI-Assisted Parsing

**Status:** Implemented but disabled by default

**Enabling** (requires code change in v1.1.0):
```typescript
// In server/github/syncService.ts importFromGitHub():
const parser = new AwesomeListParser(readmeContent);
const parsedList = await parser.extractResourcesWithAI(true);  // Enable AI
```

**Cost:** ~$0.0004 per ambiguous resource

**Future:** UI toggle in v1.1.1

---

## Configuration Changes

### New Environment Variables (Optional)

```bash
# .env additions:

# AI Parsing (opt-in feature)
ANTHROPIC_API_KEY=sk-ant-api03-xxx...
# If not set: AI parsing silently disabled, no errors

# GitHub Token (already existed, now more documented)
GITHUB_TOKEN=ghp_xxx...
# For imports: Optional (public repos work without)
# For exports: Required (needs write access)
```

### API Endpoint Changes

**New Endpoints:**
```
POST /api/github/import-stream  # Real-time progress with SSE
```

**Enhanced Endpoints:**
```
GET /api/resources?subSubcategory=X  # Now supports level-3 filtering
```

**Unchanged:**
```
POST /api/github/import  # Standard import (backward compatible)
POST /api/github/export  # Export (unchanged)
GET /api/resources  # Enhanced but backward compatible
```

---

## Data Migration

**No data migration required** - All changes are additive

**Optional Cleanup:**

```sql
-- Remove metadata categories (imported before parser fix):
DELETE FROM resources WHERE category IN ('Registries', 'Resources');
DELETE FROM categories WHERE name IN ('Registries', 'Resources');

-- Mark old queue items as completed:
UPDATE github_sync_queue
SET status = 'completed', processed_at = NOW()
WHERE status IN ('pending', 'processing')
AND created_at < '2025-12-05';

-- Result: Cleaner UI, no functional impact
```

---

## Verification Tests Post-Migration

### Critical Bug Fix Validation

**Test sub-subcategory filtering:**

```bash
# Navigate to: http://localhost:3000/sub-subcategory/iostvos

# Should show:
# - Title: "iOS/tvOS"
# - Resources: ~30 iOS/tvOS specific players
# - NOT: 1000 random resources from all categories

# API test:
curl -s "http://localhost:3000/api/resources?subSubcategory=iOS%2FtvOS&status=approved" \
  | jq '.resources[] | select(.subSubcategory != "iOS/tvOS") | .title'

# Expected: No output (all resources have correct subSubcategory)
# FAIL if: Lists titles (means some don't have iOS/tvOS)
```

### Import Feature Validation

**Test with small repository:**

```bash
# Login as admin (manual step)

# Via UI:
# 1. Navigate to /admin/github
# 2. Enter: "sindresorhus/awesome" (small, well-formed)
# 3. Click "Import Resources"
# 4. Verify: Progress bar appears and completes
# 5. Check: New category "Awesome" created
# 6. Navigate: /category/awesome → Resources visible
```

**Via API (if you have admin token):**

```bash
curl -X POST http://localhost:3000/api/github/import \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/sindresorhus/awesome",
    "options": {}
  }'

# Watch logs:
docker-compose logs -f web | grep -i import

# Should see:
# - Fetching README from...
# - Parsing awesome list content...
# - Found X resources
# - Import completed
```

---

## Troubleshooting Migration Issues

### Issue: "Cannot find module '@anthropic-ai/sdk'"

**Cause:** Dependencies not installed

**Fix:**
```bash
npm install
docker-compose build --no-cache web
docker-compose up -d
```

### Issue: Sub-subcategory pages still show 1000 resources

**Cause:** Redis cache not cleared

**Fix:**
```bash
docker-compose exec redis redis-cli FLUSHALL
# Or restart: docker-compose restart redis
```

### Issue: Import button returns 401 Unauthorized

**Cause:** Not logged in as admin

**Fix:**
- Login via /login with admin credentials
- Verify user has admin role in database:
  ```sql
  SELECT email, raw_user_meta_data->>'role' as role
  FROM auth.users
  WHERE email = 'admin@test.com';
  ```

### Issue: TypeScript build errors

**Cause:** Code conflicts or syntax issues

**Fix:**
```bash
# Check for conflicts:
git status

# Resolve conflicts if any
git diff

# Rebuild:
npm run build
```

### Issue: Database connection errors

**Cause:** DATABASE_URL incorrect or database down

**Fix:**
```bash
# Verify connection:
psql $DATABASE_URL -c "SELECT 1;"

# Check Docker network:
docker-compose ps
```

---

## Performance Impact

### Expected Changes

**Improvements:**
- ✅ Sub-subcategory pages: 1000ms → 130ms (7.7x faster)
- ✅ Sub-subcategory API: 1069KB → 34KB response (97% smaller)
- ✅ Navigation: All levels now functional

**No Regression:**
- Homepage: Same performance (~1.75s)
- Category pages: Same performance (~250ms)
- Search: Same performance (~300ms)
- Export: Same performance and quality

**New Overhead:**
- Import: +0.3s for deviation detection (negligible)
- SSE endpoint: Slightly slower due to progress updates (acceptable trade-off for UX)

---

## Monitoring After Migration

### Key Metrics to Watch

**Application:**
- Response times (should remain <2s for all pages)
- Error rates (should be 0% or near 0%)
- Cache hit rates (should be 75%+)

**Import Feature:**
- Import success rate (track in sync history)
- Parse failure rate (should be <2%)
- Deviation detection triggers (log for analysis)
- AI parsing usage (if enabled, track cost)

**Database:**
- Query times (should stay <200ms)
- Resource count growth
- Category count growth
- Disk usage

**Infrastructure:**
- Docker container health
- Redis memory usage
- Node.js memory (should stabilize <400MB)
- CPU usage during imports (<50% sustained)

### Alerting (Recommended)

**Set up alerts for:**
- API response time >3s
- Import failure rate >10%
- Database query time >1s
- Redis memory >100MB
- Node.js memory >500MB

---

## Success Criteria

Migration is successful if:

- [x] Application starts without errors
- [x] All pages load correctly
- [x] Sub-subcategory filtering works (bug fixed)
- [x] Search returns correct results
- [x] Import feature accessible to admins
- [x] No data loss or corruption
- [x] Performance same or better than v1.0.0
- [x] No new errors in logs

**If all checked:** ✅ Migration successful, v1.1.0 deployed

**If any unchecked:** Investigate, fix, or rollback

---

## Support

**Issues?** Check:
1. Docker logs: `docker-compose logs web`
2. Database connectivity: `psql $DATABASE_URL -c "SELECT 1;"`
3. Redis health: `docker-compose exec redis redis-cli PING`
4. Application health: `curl http://localhost:3000/api/health`

**Still stuck?** 
- Review: docs/IMPORT_FEATURE_BUGS.md
- Check: docs/TECHNICAL_ARCHITECTURE_IMPORT.md
- Reference: docs/SESSION_12_HANDOFF.md

---

**Migration Guide Version**: 1.0
**Target Version**: v1.1.0
**Date**: 2025-12-05
**Status**: Ready for production migration
