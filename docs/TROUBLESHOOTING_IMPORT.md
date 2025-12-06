# Troubleshooting Guide - Import Feature

**Version**: v1.1.0
**Last Updated**: 2025-12-05

---

## Quick Diagnostic Steps

When import fails or behaves unexpectedly:

1. **Check Docker logs**: `docker-compose logs -f web | grep -i import`
2. **Verify health**: `curl http://localhost:3000/api/health`
3. **Test API directly**: `curl -X POST http://localhost:3000/api/github/import ...`
4. **Check database**: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM resources;"`
5. **Clear cache**: `docker-compose restart redis`

---

## Common Issues & Solutions

### Issue: "Unauthorized" Error on Import

**Symptoms:**
- Click "Import Resources" → Toast shows "Import Failed: Unauthorized"
- API returns 401
- Docker logs show: "POST /api/github/import 401"

**Causes:**
1. Not logged in
2. Logged in but not admin role
3. JWT token expired
4. Session lost (Docker restart)

**Solutions:**

**Check 1: Are you logged in?**
```
- Navigate to /login
- Look for "Login" button in header
- If visible: Not logged in → Login with admin credentials
```

**Check 2: Do you have admin role?**
```sql
-- Query database:
psql $DATABASE_URL << SQL
SELECT email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'YOUR_EMAIL';
SQL

-- Expected: role = 'admin'
-- If null or 'user': Contact superadmin to grant role
```

**Check 3: Is token expired?**
```javascript
// Browser console:
const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
const data = JSON.parse(token);
console.log('Expires:', new Date(data.expires_at * 1000));

// If expired: Re-login
```

**Check 4: Fresh login**
```
1. Logout (click user menu → Logout)
2. Clear localStorage: localStorage.clear()
3. Refresh browser
4. Login again
5. Retry import
```

---

### Issue: "Repository Not Found" or 404

**Symptoms:**
- Import fails with "File not found: README.md"
- Logs show: 404 from raw.githubusercontent.com

**Causes:**
1. Repository doesn't exist
2. Repository is private
3. README.md doesn't exist
4. README.md in subdirectory (not root)
5. Branch mismatch (neither 'main' nor 'master')

**Solutions:**

**Check 1: Does repo exist?**
```bash
# Visit in browser:
https://github.com/OWNER/REPO

# Expected: Repo page loads
# If 404: Repo doesn't exist or is private
```

**Check 2: Is README.md at root?**
```bash
# Try fetching directly:
curl https://raw.githubusercontent.com/OWNER/REPO/master/README.md

# Expected: Markdown content
# If 404: README not at root or branch wrong
```

**Check 3: Check branch name**
```
1. Visit repo on GitHub
2. Note default branch (shown in branch dropdown)
3. Common: 'main' (modern) or 'master' (older)
4. Rare: 'develop', 'trunk', custom

# System tries: main, then master
# Custom branch: Not supported in v1.1.0 (v1.2.0 will add)
```

**Check 4: Is repo public?**
```
# Private repos need authentication (not supported in v1.1.0)
# Check: Lock icon on GitHub repo page
# Solution: Make repo public or wait for v1.2.0 (private repo support)
```

---

### Issue: Import Shows "Too Many Deviations"

**Symptoms:**
- Import stops at analysis phase (40%)
- Yellow warning card shows 4+ deviations
- Message: "Manual review required"

**Causes:**
- Repository format differs significantly from awesome-list standard
- Multiple format issues combined (markers, descriptions, metadata, etc.)

**Solutions:**

**Check 1: Review deviation list**
```
# Deviations shown in UI, e.g.:
- Mixed list markers (820 asterisk vs 50 dash)
- Missing standard awesome badge
- Contains metadata sections as category headers
- 30% of resources lack descriptions

# Assess: Are these acceptable or real problems?
```

**Check 2: Acceptable deviations?**
```
Common deviations that are usually OK:
- Mixed markers (parser handles both)
- Missing badge (cosmetic)
- 2-level vs 3-level hierarchy (both supported)
- Some missing descriptions (parser uses empty string)

Real problems:
- >50% resources malformed (parsing will fail)
- Non-markdown content
- Completely wrong structure
```

**Solutions:**

**Option A: Fix source repository**
```
1. Fork repository
2. Fix markdown (add descriptions, consistent markers, etc.)
3. Import from your fork
4. Or: Submit PR to original repo with fixes
```

**Option B: Enable AI parsing (handles more edge cases)**
```typescript
// In syncService.ts (code change):
const parsedList = await parser.extractResourcesWithAI(true);

// Rebuild and retry import
// Cost: ~$0.0004 per ambiguous resource
```

**Option C: Import anyway (if deviations seem OK)**
```typescript
// Lower threshold temporarily (code change):
const canProceed = deviations.length <= 5;  // Instead of 3

// Use with caution (may result in bad imports)
```

---

### Issue: Import Completes But No Resources Show

**Symptoms:**
- Import says "Complete! Imported: 0, Skipped: 751"
- Resources not visible in UI
- Database count unchanged

**Causes:**
1. All resources already existed (re-import)
2. Resources in different category than expected
3. Resources created with wrong status (not 'approved')
4. Cache not refreshed

**Solutions:**

**Check 1: Were resources already imported?**
```bash
# Check logs:
docker-compose logs web | grep -i "import completed"

# If shows: "imported: 0, skipped: 751"
# Reason: All resources existed already (URLs matched)
# Solution: This is normal for re-imports with no changes
```

**Check 2: Check database directly**
```sql
-- Count resources from this repo:
SELECT COUNT(*) FROM resources
WHERE metadata->>'sourceList' LIKE '%awesome-video%';

-- Expected: 751 (if already imported)
-- If 0: Resources not imported (check errors)
```

**Check 3: Check resource status**
```sql
-- Are they approved?
SELECT status, COUNT(*) FROM resources
GROUP BY status;

-- Expected: Most are 'approved'
-- If 'pending': Change import to create as approved:
-- (Already does this, check code)
```

**Check 4: Clear cache and refresh**
```bash
docker-compose restart redis
# Wait 30s
# Refresh browser (Ctrl+R)
# Navigate to homepage
# Categories should show resource counts
```

---

### Issue: Progress Bar Stuck at X%

**Symptoms:**
- SSE import starts
- Progress bar reaches X% (e.g., 50%)
- Stops updating for >2 minutes
- No completion or error message

**Causes:**
1. Large import phase (hierarchy creation can take time)
2. Database operation slow (thousands of resources)
3. Network disconnected (SSE stream broken)
4. Actual hang/crash (rare)

**Solutions:**

**Check 1: Monitor Docker logs**
```bash
docker-compose logs -f web | grep -i import

# Look for:
# - "Creating category: X" (still working)
# - "Imported: X" (making progress)
# - Error messages (indicates failure)
# - No output (indicates hang)
```

**Check 2: Database activity**
```sql
-- Check active queries:
SELECT pid, state, query, now() - query_start as duration
FROM pg_stat_activity
WHERE state = 'active'
AND query LIKE '%INSERT INTO resources%';

-- If queries running: Import is working (be patient)
-- If no queries: Import may have hung
```

**Check 3: Timeout and retry**
```
# If stuck >5 minutes:
# 1. Close browser tab (stops SSE connection)
# 2. Wait 1 minute
# 3. Check database for partial import:
SELECT COUNT(*) FROM resources WHERE created_at > NOW() - INTERVAL '10 minutes';

# 4. If resources created: Import partially succeeded
# 5. Re-import to complete (will skip existing, create missing)
```

**Check 4: Use standard import instead**
```
# If SSE keeps failing:
# 1. Use POST /api/github/import (non-streaming)
# 2. No progress bar, but more reliable
# 3. Check status via: GET /api/github/sync-status
```

---

### Issue: Sub-subcategory Pages Show 1000 Resources

**Symptoms:**
- Navigate to /sub-subcategory/iostvos
- Shows 1000 resources
- Resources are random (not iOS/tvOS specific)

**Cause:**
- Bug #001 (should be fixed in v1.1.0)
- OR: Cache has pre-fix data

**Solutions:**

**Check 1: Verify version**
```bash
git log --oneline -1

# Expected: Shows commit after 23bdbab (bug fix commit)
# If before 23bdbab: Upgrade to v1.1.0
```

**Check 2: Clear Redis cache**
```bash
docker-compose restart redis

# Wait 30s

# Test API directly:
curl "http://localhost:3000/api/resources?subSubcategory=iOS%2FtvOS&status=approved" \
  | jq '.resources | length'

# Expected: ~30
# If 1000: Bug not fixed, escalate
```

**Check 3: Hard refresh browser**
```
1. Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. This clears browser cache
3. Fetches fresh data
4. Re-test navigation
```

**If still broken after all checks:**
- Report as regression
- Attach: URL, screenshot, API response, database query result
- Rollback to v1.0.0 if critical

---

### Issue: Import Very Slow (>5 min)

**Symptoms:**
- Import takes >5 minutes for <1000 resources
- Progress bar moves very slowly
- No errors, just slow

**Causes:**
1. Network latency to GitHub (slow download)
2. Database not indexed (slow queries)
3. Large database (conflict resolution slow)
4. Individual INSERTs (not batched - known issue)

**Solutions:**

**Check 1: Network speed to GitHub**
```bash
# Test download speed:
time curl -o /dev/null https://raw.githubusercontent.com/owner/repo/master/README.md

# Expected: <3s
# If >10s: Network issue
# Solution: Check internet, try different network, or wait
```

**Check 2: Database indexes**
```sql
-- Verify indexes exist:
\d+ resources

-- Should see:
-- idx_resources_category
-- idx_resources_subcategory
-- idx_resources_sub_subcategory
-- idx_resources_url

-- If missing, create:
CREATE INDEX idx_resources_url ON resources(url);
CREATE INDEX idx_resources_sub_subcategory ON resources(sub_subcategory);
```

**Check 3: Database size**
```sql
SELECT COUNT(*) FROM resources;

-- If >50,000: Conflict resolution becomes slow
-- Solution: Optimize conflict resolution (see OPTIMIZATION_GUIDE)
```

**Check 4: Check if INSERTs are batched**
```
# v1.1.0: Individual INSERTs (slow for fresh imports)
# v1.2.0: Will add batch INSERT (40x faster)

# For now: Accept slower fresh imports
# Or: Implement batch INSERT (see OPTIMIZATION_GUIDE)
```

---

### Issue: "Parse Error" - Resources Not Extracted

**Symptoms:**
- Import completes
- Logs show: "Found 0 resources in the awesome list"
- No resources imported

**Causes:**
1. Markdown format doesn't match expected patterns
2. Resources in wrong format (not `* [Title](URL)`)
3. Table of contents mistaken for resources
4. Encoding issues (non-UTF-8)

**Solutions:**

**Check 1: Inspect README format**
```bash
# Download README:
curl https://raw.githubusercontent.com/owner/repo/master/README.md > test.md

# Check first 100 lines:
head -100 test.md

# Look for resources:
grep "^\* \[" test.md | head -5
grep "^- \[" test.md | head -5

# Expected: Should find some resources
# If none: Format is wrong
```

**Check 2: Test parsing locally**
```bash
# Use test script:
npx tsx scripts/test-deviation-detection.ts

# Or create custom test:
cat > test-parse.ts << 'SCRIPT'
import { AwesomeListParser } from './server/github/parser';
import fs from 'fs';

const markdown = fs.readFileSync('test.md', 'utf-8');
const parser = new AwesomeListParser(markdown);
const parsed = parser.parse();

console.log('Resources found:', parsed.resources.length);
console.log('Sample:', parsed.resources.slice(0, 5));
SCRIPT

npx tsx test-parse.ts
```

**Check 3: Enable AI parsing**
```
# If standard parsing fails but resources exist:
# Enable AI parsing (handles more formats)
# See: docs/AI_PARSING_INTEGRATION.md
```

**Check 4: Contact support**
```
# If format seems correct but parser fails:
# This is a parser bug
# Report with:
# - Repository URL
# - Sample markdown snippet (failing part)
# - Expected: Should extract resources
# - Actual: Extracted 0 resources
```

---

### Issue: Hierarchy Not Created Correctly

**Symptoms:**
- Import completes
- Resources imported
- But: Subcategories missing in sidebar
- Or: Wrong parent-child relationships

**Causes:**
1. Markdown headers malformed
2. extractHierarchy() logic issue
3. Database FK constraint errors
4. Partial import (hierarchy created, but some failed)

**Solutions:**

**Check 1: Verify hierarchy was extracted**
```typescript
// Test extraction:
import { AwesomeListParser } from './server/github/parser';

const parser = new AwesomeListParser(markdown);
const hierarchy = parser.extractHierarchy();

console.log('Categories:', Array.from(hierarchy.categories));
console.log('Subcategories:', hierarchy.subcategories.size);
console.log('Sub-subcategories:', hierarchy.subSubcategories.size);

// Expected: Numbers match GitHub structure
```

**Check 2: Database FK integrity**
```sql
-- Check for orphaned subcategories:
SELECT s.name
FROM subcategories s
LEFT JOIN categories c ON c.id = s.category_id
WHERE c.id IS NULL;

-- Expected: 0 rows (no orphans)
-- If rows returned: Delete orphans:
DELETE FROM subcategories WHERE category_id IS NULL;
```

**Check 3: Check logs for FK errors**
```bash
docker-compose logs web | grep -i "foreign key\|constraint"

# If FK errors: Hierarchy creation failed mid-way
# Solution: Clear partial hierarchy, re-import
```

**Check 4: Re-import to complete**
```
# Import same repo again
# Will create missing hierarchy (skips existing)
# Should complete successfully
```

---

### Issue: Duplicate Resources Created

**Symptoms:**
- Import creates duplicates of existing resources
- Same URL appears multiple times in database
- Resource count grows unexpectedly

**Causes:**
1. UNIQUE constraint on resources.url missing or disabled
2. Conflict resolution not working
3. URL variations (HTTP vs HTTPS, trailing slash, etc.)

**Solutions:**

**Check 1: Verify UNIQUE constraint**
```sql
-- Check constraint:
\d+ resources

-- Should see:
-- "resources_url_key" UNIQUE (url)

-- If missing, add:
ALTER TABLE resources ADD CONSTRAINT resources_url_unique UNIQUE (url);
```

**Check 2: Find duplicates**
```sql
SELECT url, COUNT(*) as count
FROM resources
GROUP BY url
HAVING COUNT(*) > 1;

-- Shows: URLs with duplicates
```

**Check 3: Clean up duplicates**
```sql
-- Keep oldest, delete newer:
DELETE FROM resources
WHERE id NOT IN (
  SELECT MIN(id) FROM resources GROUP BY url
);

-- Verify: No more duplicates
SELECT url, COUNT(*) FROM resources GROUP BY url HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

**Check 4: Prevent future duplicates**
```
# Ensure conflict resolution is enabled:
# In syncService.ts importFromGitHub():
# Should call: checkConflict(resource) before creating
```

---

### Issue: Categories Show Wrong Resource Counts

**Symptoms:**
- Sidebar shows "Applications 1318"
- Navigate to Applications → Only 794 resources displayed

**Causes:**
1. Count includes nested subcategories
2. Count includes all statuses (not just approved)
3. Cache mismatch
4. Frontend counting logic different from API

**Explanation:**

**This is normal behavior:**
- Sidebar count: Total including nested (aggregated)
- Page count: Direct resources in category only
- Example:
  - Category "Applications": 794 direct
  - Subcategory "Games": 49
  - Subcategory "Web": 25
  - ... more subcategories
  - Total: 1318 (794 + 524 nested)

**Verify:**
```sql
-- Count direct resources:
SELECT COUNT(*) FROM resources
WHERE category = 'Applications' AND status = 'approved';

-- Count including nested (approximation):
SELECT COUNT(*) FROM resources r
WHERE r.category = 'Applications'
   OR r.subcategory IN (
      SELECT s.name FROM subcategories s
      JOIN categories c ON c.id = s.category_id
      WHERE c.name = 'Applications'
   );
```

**Not a bug:** Sidebar shows total, page shows direct

---

### Issue: Search Returns No Results

**Symptoms:**
- Search for "player" → 0 results
- But: Resources with "player" exist in database

**Causes:**
1. Search query too specific (no matches)
2. Search only in title (not description)
3. Case sensitivity issue
4. Cache returns stale empty result

**Solutions:**

**Check 1: Test API directly**
```bash
curl "http://localhost:3000/api/resources?search=player&status=approved" \
  | jq '.total'

# Expected: >0
# If 0: No resources match
# If >0: Frontend issue
```

**Check 2: Verify database has matches**
```sql
SELECT COUNT(*) FROM resources
WHERE (title ILIKE '%player%' OR description ILIKE '%player%')
AND status = 'approved';

-- Expected: >0
-- If 0: No resources actually match query
```

**Check 3: Try broader search**
```
# Instead of: "video player"
# Try: "player"

# Instead of: "FFmpeg"
# Try: "ffmpeg" (lowercase)

# Search is case-insensitive, but exact phrase matching
```

**Check 4: Clear cache**
```bash
docker-compose restart redis
# Retry search after cache clear
```

---

### Issue: Export Fails with "Unauthorized"

**Symptoms:**
- Click "Export to GitHub" → 401 Unauthorized
- Or: "Failed to export awesome list"

**Causes:**
1. Not logged in as admin (same as import)
2. GITHUB_TOKEN not set (required for exports)
3. Token doesn't have write permission
4. Repository doesn't exist or no access

**Solutions:**

**Check 1: Admin login** (same as import troubleshooting)

**Check 2: GITHUB_TOKEN set?**
```bash
docker-compose exec web printenv | grep GITHUB_TOKEN

# Expected: ghp_xxxxx... (token value)
# If not shown: Token not set

# Add to .env:
GITHUB_TOKEN=ghp_your_token_here

# Restart:
docker-compose restart web
```

**Check 3: Token has write permission?**
```
# Generate token on GitHub:
# Settings → Developer settings → Personal access tokens
# Scopes needed:
# - repo (full control of private repositories)
# Or:
# - public_repo (access to public repositories)

# Test token:
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO

# Expected: 200 OK with repo info
# If 404: No access to repo
# If 401: Token invalid
```

---

### Issue: Docker Build Fails

**Symptoms:**
- `docker-compose build` fails
- TypeScript compilation errors
- esbuild errors

**Causes:**
1. Syntax errors in code
2. Missing dependencies
3. Type errors
4. Build tool issues

**Solutions:**

**Check 1: Read error message**
```
# Build output shows exact error:
# - File path
# - Line number
# - Error description

# Example:
# ERROR: Unexpected ":" at line 159
# File: /app/client/src/components/admin/GitHubSyncPanel.tsx:159
```

**Check 2: Fix locally first**
```bash
# Test build locally (faster iteration):
npm run build

# Expected: No errors
# If errors: Fix them
# Then: docker-compose build
```

**Check 3: Clean and rebuild**
```bash
# Clear Docker cache:
docker-compose build --no-cache web

# Clear node_modules:
rm -rf node_modules
npm install
docker-compose build --no-cache web
```

**Check 4: Check git status**
```bash
git status

# Unexpected changes?
git diff

# Conflicts?
git diff --check
```

---

### Issue: "Cannot Find Module" Errors

**Symptoms:**
- Runtime error: "Cannot find module '@anthropic-ai/sdk'"
- Import fails with module not found

**Causes:**
1. Dependencies not installed
2. Docker build didn't include new dependencies
3. node_modules out of sync

**Solutions:**

**Check 1: Install dependencies**
```bash
npm install

# Verify package installed:
npm list @anthropic-ai/sdk

# Expected: Shows version
# If "-- empty": Not installed, run npm install again
```

**Check 2: Rebuild Docker**
```bash
# Build includes npm install step:
docker-compose build --no-cache web

# Verify build succeeds without errors
```

**Check 3: Check package.json**
```json
// Ensure dependency listed:
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.x.x",
    ...
  }
}

// If missing: Add and reinstall
```

---

## Database Issues

### Issue: "Too Many Connections" Error

**Symptoms:**
- Import fails with "connection pool exhausted"
- API returns 500
- Logs show: "sorry, too many clients already"

**Causes:**
1. Connection leak (connections not released)
2. Too many concurrent operations
3. Database pool too small

**Solutions:**

**Check 1: Current connections**
```sql
SELECT count(*) FROM pg_stat_activity;

-- Expected: <20
-- If >50: Connection leak likely
```

**Check 2: Restart application**
```bash
docker-compose restart web

# This closes all connections
# Fresh start with clean pool
```

**Check 3: Increase pool size**
```typescript
// In database connection config:
pool: {
  min: 2,
  max: 20  // Increase from 10 to 20
}
```

**Check 4: Fix connection leaks**
```
# Review code for:
# - Unclosed database connections
# - Missing .finally() for cleanup
# - Long-running transactions not committed

# In import feature: All connections properly managed ✅
```

---

### Issue: Database Disk Full

**Symptoms:**
- Import fails with disk space error
- Database write operations fail
- Logs show: "No space left on device"

**Causes:**
1. Too many resources (database too large)
2. No cleanup of old data
3. Logs consuming disk space

**Solutions:**

**Check 1: Disk usage**
```sql
-- Database size:
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Table sizes:
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

**Check 2: Clean up old data**
```sql
-- Delete rejected resources:
DELETE FROM resources WHERE status = 'rejected' AND updated_at < NOW() - INTERVAL '30 days';

-- Delete old audit logs:
DELETE FROM resource_audit_log WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum to reclaim space:
VACUUM FULL;
```

**Check 3: Expand disk**
```
# If using cloud database (Supabase):
# Dashboard → Database → Settings → Increase storage

# If self-hosted:
# Expand volume or migrate to larger disk
```

---

## Performance Issues

### Issue: Homepage Loads Slowly (>5s)

**Causes:**
1. Fetching 10,000 resources (840KB)
2. Large JavaScript bundle (982KB)
3. No code splitting
4. Rendering thousands of DOM nodes

**Solutions:**

**Immediate Fix:**
```
# In useResources hook:
const DEFAULT_LIMIT = 50;  // Instead of 10000

# Reduces: 840KB → 15KB
# Impact: 11x faster initial load
```

**Long-term:**
- Code splitting (v1.2.0)
- Virtual scrolling (v1.3.0)
- CDN for static assets

---

## Debugging Tools

### Log Analysis

```bash
# Find errors:
docker-compose logs web | grep -i error

# Find warnings:
docker-compose logs web | grep -i warn

# Follow import progress:
docker-compose logs -f web | grep -i "import\|parse"

# Filter by time:
docker-compose logs web --since="10m" | grep import
```

### Database Debugging

```sql
-- Check table sizes:
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries:
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check active imports:
SELECT pid, query, state, now() - query_start as duration
FROM pg_stat_activity
WHERE query LIKE '%INSERT INTO resources%'
   OR query LIKE '%INSERT INTO categories%';
```

### API Debugging

```bash
# Test endpoints:
curl -v http://localhost:3000/api/health
curl -v http://localhost:3000/api/categories
curl -v http://localhost:3000/api/resources?limit=1

# Test import (with admin token):
curl -v -X POST http://localhost:3000/api/github/import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repositoryUrl":"https://github.com/sindresorhus/awesome"}'

# Check response headers (caching, rate limiting):
curl -I http://localhost:3000/api/resources
```

---

## Getting Help

**Self-Service:**
1. Check: docs/FAQ_IMPORT_FEATURE.md
2. Review: docs/GITHUB_IMPORT_GUIDE.md
3. Search: docs/IMPORT_FEATURE_BUGS.md

**Community:**
1. GitHub Issues: Report bugs, ask questions
2. Discussions: General help, feature ideas

**Enterprise:**
1. Email: support@ (if configured)
2. Slack: #awesome-list-support (if configured)

**Debugging Checklist Before Asking:**
- [ ] Checked Docker logs
- [ ] Verified API with curl
- [ ] Queried database directly
- [ ] Cleared cache and retried
- [ ] Tested with different repository
- [ ] Reviewed relevant documentation

**When Reporting Issue:**
- Include: Version (v1.1.0)
- Include: Repository URL attempted
- Include: Error message (full text)
- Include: Logs (relevant portion)
- Include: Steps to reproduce
- Include: Expected vs actual behavior

---

**Guide Version**: 1.0
**Last Updated**: 2025-12-05
**Covers**: v1.1.0 import feature
**Status**: Complete
