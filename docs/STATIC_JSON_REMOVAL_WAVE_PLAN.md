# Static JSON Removal - Complete Wave Execution Plan

**Created**: 2025-11-30
**Orchestrator**: Shannon Wave Framework
**Complexity**: 0.75/1.0 (VERY COMPLEX)
**Duration**: 7 hours (5.5h baseline + 1.5h bug fixing buffer)
**Waves**: 4 waves (3 sequential, 1 parallel)
**Agents**: 6 total (orchestrator + 5 parallel testing agents)

---

## Executive Summary

### Problem Statement

**Architectural Flaw**: Application has been merging TWO data sources:
1. **Static JSON**: ~2,011 resources from S3 (id format: "video-34")
2. **Database**: ~2,646 resources from Supabase (UUID format)

**Impact**:
- Bookmark/favorite features fail on static resources (UUID constraint violation)
- Duplicate data confusion (same resource from both sources)
- Migration incomplete (database should be SINGLE source of truth)

**Root Cause**: Commit aaa7504 removed frontend static JSON loading but backend still:
- Fetches S3 JSON on server startup (routes.ts:262-270)
- Stores in memory (storage.ts awesomeListData)
- Serves via /api/awesome-list endpoint
- Uses in SEO routes (sitemap, og-image)

### Solution Approach

**COMPLETE removal** of static JSON architecture:
1. Remove backend initialization and endpoints
2. Update SEO routes to query database
3. Optimize frontend to use database APIs
4. Delete parser files and build scripts
5. Remove JSON artifacts
6. Comprehensively test ALL features from frontend

### Wave Structure

**4 Waves** with integrated Docker rebuilds:

1. **Wave 1** (Orchestrator): Backend removal + rebuild + API verification
2. **Wave 2** (Orchestrator): Frontend optimization + rebuild + page verification
3. **Wave 3** (Orchestrator): File deletion + rebuild + build verification
4. **Wave 4** (5 Parallel Agents): Comprehensive testing with immediate bug fixing

**Key Principle**: Every code change includes Docker rebuild and verification BEFORE next wave

---

## Wave 1: Backend Static JSON Complete Removal

**Agent**: Orchestrator (me)
**Duration**: 90 minutes
**Complexity**: 0.7/1.0 (COMPLEX)

### Tasks (15 tasks)

#### Part A: Code Changes (45 minutes)

**Task 1.1**: Fix performanceMonitor.ts TypeScript errors (10 min)
- File: server/utils/performanceMonitor.ts
- Errors: Lines 104, 154, 157, 174 (downlevelIteration + argument count)
- Fix: Add spread operator for Set iteration, fix endTimer calls
- Verify: npm run check shows 0 backend errors

**Task 1.2**: Update /api/categories to include resource counts (15 min)
- File: server/routes.ts:543-546
- Current: Returns simple category array
- Change: Add SQL COUNT query per category
```typescript
const categoriesWithCounts = await Promise.all(
  categories.map(async (cat) => {
    const { total } = await storage.listResources({
      category: cat.name,
      status: 'approved',
      limit: 1
    });
    return { ...cat, resourceCount: total };
  })
);
```
- Verify: Response includes resourceCount field

**Task 1.3**: Update generateSitemap to query database (10 min)
- File: server/routes.ts:27-79
- Current: Line 29 calls `storage.getAwesomeListData()`
- Change: Call `storage.listCategories()` instead
- Remove dependency on in-memory data
- Verify: TypeScript compiles

**Task 1.4**: Update generateOpenGraphImage to query database (5 min)
- File: server/routes.ts:81-157
- Current: Line 84 calls `storage.getAwesomeListData()`
- Change: Query database for resource count
- Verify: TypeScript compiles

**Task 1.5**: Remove routes.ts initialization block (5 min)
- File: server/routes.ts:262-270
- Delete:
```typescript
try {
  console.log('Fetching awesome-video data from JSON source');
  const awesomeVideoData = await fetchAwesomeVideoData();
  storage.setAwesomeListData(awesomeVideoData);
  console.log(`Successfully fetched awesome-video with ${awesomeVideoData.resources.length} resources`);
} catch (error) {
  console.error(`Error fetching awesome-video data: ${error}`);
}
```
- Verify: No compilation errors

**Task 1.6**: Remove /api/awesome-list endpoint (5 min)
- File: server/routes.ts:1856-1908
- Delete entire endpoint function
- Remove imports: getCategoryTitleFromSlug, getSubcategoryTitleFromSlug, getSubSubcategoryTitleFromSlug helper functions if they exist
- Verify: TypeScript compiles

**Task 1.7**: Remove /api/switch-list endpoint (5 min)
- File: server/routes.ts:1911-1929
- Delete entire endpoint function
- Remove import: fetchAwesomeList
- Verify: TypeScript compiles

**Task 1.8**: Remove storage.ts in-memory methods (10 min)
- File: server/storage.ts
- Remove from IStorage interface (lines 188-191):
  - setAwesomeListData()
  - getAwesomeListData()
  - getCategories()
  - getResources()
- Remove from DatabaseStorage class (lines 244, 1278-1325)
- Remove from MemStorage class (lines 1419, 1667-1714)
- Verify: TypeScript compiles, no errors about missing methods

#### Part B: Docker Rebuild (5 minutes)

**Task 1.9**: Stop containers
```bash
docker-compose down
```

**Task 1.10**: Rebuild web image
```bash
docker-compose build web
```
- Expected: 60-90 seconds
- Verify: Build succeeds, no errors

**Task 1.11**: Start containers
```bash
docker-compose up -d
```

**Task 1.12**: Wait for startup + check logs
```bash
sleep 30
docker-compose logs web | tail -50
```
- Verify: "serving on port 3000" message
- Verify: NO errors about "getAwesomeListData is not a function"
- Verify: Auto-seed message shows database check

#### Part C: Backend Verification (40 minutes)

**Task 1.13**: Verify health endpoint
```bash
curl http://localhost:3000/api/health
```
- Expected: {"status":"ok"}
- Result: ✅ / ❌

**Task 1.14**: Verify categories endpoint with counts
```bash
curl http://localhost:3000/api/categories | jq '.[0]'
```
- Expected: Object with `name`, `slug`, `resourceCount` fields
- Verify: resourceCount is number > 0
- Result: ✅ / ❌

**Task 1.15**: Verify resources endpoint
```bash
curl 'http://localhost:3000/api/resources?status=approved&limit=10' | jq '.total'
```
- Expected: 2644 (or current count)
- Result: ✅ / ❌

**Task 1.16**: Verify sitemap generates from database
```bash
curl http://localhost:3000/sitemap.xml | head -30
```
- Expected: XML with URLs
- Verify: No errors about missing data
- Result: ✅ / ❌

**Task 1.17**: Verify no static JSON errors in logs
```bash
docker-compose logs web | grep -i "awesome.*json\|getAwesomeListData"
```
- Expected: No results OR only seed.ts references (legitimate)
- Result: ✅ / ❌

### Wave 1 Exit Criteria

- ✅ All code changes applied
- ✅ Docker rebuilt and running
- ✅ All API endpoints respond correctly
- ✅ No references to in-memory static JSON remain
- ✅ Sitemap/OG-image generate from database
- ✅ No errors in Docker logs

**If ANY verification fails**: STOP, use systematic-debugging, fix issue, rebuild, re-verify

---

## Wave 2: Frontend Optimization

**Agent**: Orchestrator (me)
**Duration**: 50 minutes
**Complexity**: 0.5/1.0 (MODERATE)

### Tasks (11 tasks)

#### Part A: Code Changes (20 minutes)

**Task 2.1**: Update Home.tsx to use /api/categories with counts (15 min)
- File: client/src/pages/Home.tsx
- Current: Fetches all resources, builds category map client-side (lines 35-89)
- Change:
```typescript
// Fetch categories with counts from Wave 1 enhanced endpoint
const { data: categories, isLoading, error } = useQuery<Array<{
  name: string;
  slug: string;
  description: string;
  resourceCount: number;
}>>({
  queryKey: ['/api/categories'],
  queryFn: async () => {
    const response = await fetch('/api/categories');
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },
});

// No need to fetch all resources, no client-side counting
```
- Remove: useMemo building categoryMap (lines 57-89)
- Simplify: Direct use of categories array
- Verify: TypeScript compiles

**Task 2.2**: Verify no imports of static-data.ts (5 min)
```bash
grep -r "static-data" client/src/ --exclude-dir=node_modules
```
- Expected: No results (file already deleted in commit aaa7504)
- If found: Remove import, update code
- Verify: No references remain

**Task 2.3**: Verify Category.tsx uses database only (already done in aaa7504)
- Read: client/src/pages/Category.tsx:45
- Verify: Only dbResources used, no static JSON merging
- Status: Should already be correct from commit aaa7504

#### Part B: Docker Rebuild (5 minutes)

**Task 2.4**: Rebuild
```bash
docker-compose down
docker-compose build web
docker-compose up -d
sleep 30
```

#### Part C: Frontend Verification (25 minutes)

**Task 2.5**: Verify homepage loads (superpowers-chrome)
```javascript
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "navigate",
  payload: "http://localhost:3000"
})
```
- Check: page.md auto-captured
- Verify: Contains category cards
- Result: ✅ / ❌

**Task 2.6**: Verify 9 categories visible
- Read: page.md from Task 2.5
- Search for: Category names (Encoding & Codecs, Players & Clients, etc.)
- Count: Should find 9 unique categories
- Result: ✅ / ❌

**Task 2.7**: Verify resource counts displayed
- Check: page.md for Badge components with numbers
- Verify: Counts > 0 (e.g., "392", "425", "252")
- Result: ✅ / ❌

**Task 2.8**: Screenshot homepage
```javascript
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "screenshot",
  payload: "wave2-homepage-database-only"
})
```
- Save: Evidence of working homepage

**Task 2.9**: Test category navigation
```javascript
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "click",
  selector: "a[href*='/category/encoding']"
})
```
- Verify: Category page loads
- Check: page.md shows resources
- Result: ✅ / ❌

**Task 2.10**: Verify no React errors
```javascript
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "eval",
  payload: "console.error.toString()"
})
```
- Check: No hydration errors, no undefined errors
- Result: ✅ / ❌

**Task 2.11**: Database query verification
```sql
-- Via Supabase MCP
SELECT category, COUNT(*) as count
FROM resources
WHERE status = 'approved'
GROUP BY category
ORDER BY count DESC;
```
- Verify: 9 categories with counts matching UI
- Result: ✅ / ❌

### Wave 2 Exit Criteria

- ✅ Home.tsx updated to use enhanced /api/categories
- ✅ Docker rebuilt and running
- ✅ Homepage loads with 9 categories
- ✅ Category counts accurate
- ✅ Navigation works
- ✅ No React errors

---

## Wave 3: File Deletion + Build Verification

**Agent**: Orchestrator (me)
**Duration**: 30 minutes
**Complexity**: 0.3/1.0 (SIMPLE)

### Tasks (10 tasks)

#### Part A: File Deletion (10 minutes)

**Task 3.1**: Delete awesome-video-parser files
```bash
rm server/awesome-video-parser.ts
rm server/awesome-video-parser-clean.ts
# Keep server/seed.ts - it legitimately uses S3 for initial seeding
```

**Task 3.2**: Delete build-static script
```bash
rm scripts/build-static.ts
```

**Task 3.3**: Verify static-data.ts already deleted
```bash
ls client/src/lib/static-data.ts 2>&1
```
- Expected: "No such file" (deleted in commit aaa7504)

**Task 3.4**: Delete JSON artifacts
```bash
rm -f client/public/data/awesome-list.json
rm -f client/public/data/sitemap.json
rm -f dist/public/data/awesome-list.json
rm -f dist/public/data/sitemap.json
rmdir client/public/data 2>/dev/null || true
rmdir dist/public/data 2>/dev/null || true
```

**Task 3.5**: Verify no imports of deleted files
```bash
grep -r "awesome-video-parser" server/ client/ scripts/ --exclude-dir=node_modules
grep -r "build-static" server/ client/ scripts/ --exclude-dir=node_modules
```
- Expected: Only server/seed.ts references (uses different parser, OK)
- If found elsewhere: Update imports

#### Part B: Docker Rebuild (5 minutes)

**Task 3.6**: Rebuild
```bash
docker-compose down
docker-compose build
docker-compose up -d
sleep 30
```

#### Part C: Build Verification (15 minutes)

**Task 3.7**: Verify TypeScript compiles
```bash
npm run check
```
- Expected: 0 errors (except performanceMonitor.ts if not fixed in Wave 1)
- Result: ✅ / ❌

**Task 3.8**: Verify build succeeds
```bash
npm run build
```
- Expected: Successful build, bundle created
- Result: ✅ / ❌

**Task 3.9**: Verify Docker containers healthy
```bash
docker-compose ps
```
- Expected: All 3 containers "Up" or "Up (healthy)"
- Result: ✅ / ❌

**Task 3.10**: Verify deleted files don't break imports
```bash
docker-compose logs web | grep -i "cannot find module\|error"
```
- Expected: No import errors
- Result: ✅ / ❌

### Wave 3 Exit Criteria

- ✅ All static JSON files deleted
- ✅ All parser files deleted (except seed.ts)
- ✅ Docker builds successfully
- ✅ No import errors
- ✅ Application starts without errors

---

## Wave 4: Comprehensive Frontend Testing (PARALLEL)

**Orchestrator Action**: Dispatch 5 parallel component-owner agents
**Duration**: 120 minutes (wall time) + 40 min synthesis
**Complexity**: 0.85/1.0 (VERY COMPLEX)

### Agent Coordination Protocol

**Dispatch Method**: Use "dispatching-parallel-agents" skill OR Task tool with 5 parallel invocations

**Agent Self-Validation Loop**:
```
FOR each test IN agent_tests:
  1. Run test (navigate, click, verify)
  2. IF test PASSES:
     - Collect evidence (screenshot, SQL)
     - Move to next test
  3. IF test FAILS (bug found):
     - STOP testing
     - Invoke systematic-debugging skill
     - Identify root cause
     - Edit relevant file (component you own)
     - docker-compose down && build && up -d
     - Wait 30 seconds
     - Rerun failed test
     - IF now passes: Continue with next test
     - IF still fails: Document blocker, report to orchestrator
  4. REPEAT until all tests pass
END FOR

REPORT: {
  testsAssigned: N,
  testsPassed: N,
  bugsFound: X,
  bugsFixed: X,
  blockers: [],
  evidence: [screenshots, SQL results]
}
```

---

### Agent A: Home Component Testing

**Component Ownership**: client/src/pages/Home.tsx
**Mission**: Test homepage completely, fix any bugs, verify working
**Duration**: 25 min (20 min testing + 5 min avg bug fixing)

**Tests** (10 tests):

1. **Homepage Loads**
   - Navigate: http://localhost:3000
   - Verify: page.md contains "Awesome Video Resources" heading
   - Verify: screenshot shows page (not blank)
   - Evidence: screenshot.png

2. **9 Categories Visible**
   - Check: page.md for all category names
   - Expected: "Encoding & Codecs", "Players & Clients", "Protocols & Transport", "Infrastructure & Delivery", "Standards & Industry", "Media Tools", "Intro & Learning", "General Tools", "Community & Events"
   - Count: Exactly 9 cards
   - Evidence: page.md content

3. **Resource Counts Accurate**
   - Check: page.md for Badge numbers
   - Database verify:
```sql
SELECT category, COUNT(*) FROM resources WHERE status='approved' GROUP BY category;
```
   - Match: UI counts ≈ DB counts (±5 acceptable if pagination)
   - Evidence: SQL results + screenshot

4. **Category Links Clickable**
   - Click: First category link
   - Verify: URL changes to /category/[slug]
   - Verify: Category page loads
   - Evidence: screenshot of category page

5. **Category Icons Display**
   - Check: screenshot for icons visible (not missing/broken)
   - Verify: Icons from lucide-react render
   - Evidence: Visual verification

6. **Theme Toggle Works**
   - Find: Theme toggle button
   - Click: Toggle
   - Verify: Page appearance changes (dark ↔ light)
   - Evidence: 2 screenshots (light + dark)

7. **Mobile Responsive**
   - Resize: Browser to 375×667 (mobile)
   - Verify: Layout adapts, categories stack vertically
   - Evidence: Mobile screenshot

8. **Performance < 2s Load**
   - Measure: Time from navigate to page.md captured
   - Target: < 2000ms
   - Evidence: Timing logs

9. **No Console Errors**
```javascript
// Eval in browser
console.error.callCount || 0
```
   - Expected: 0 critical errors (hydration warnings OK)
   - Evidence: Console log

10. **Total Resource Count Correct**
    - Check: page.md for "Explore X categories with Y resources"
    - Database verify:
```sql
SELECT COUNT(*) FROM resources WHERE status='approved';
```
    - Match: UI total = DB count (2644)
    - Evidence: SQL result

**Bug Fixing Protocol**:
- If Test 2 fails (categories missing) → Check Home.tsx query → Fix → Rebuild
- If Test 3 fails (counts wrong) → Check /api/categories response → Fix backend → Rebuild
- If Test 6 fails (theme) → Check theme provider → Fix → Rebuild

**Deliverable**: "Home component: ALL 10 TESTS PASSED ✅" + evidence

---

### Agent B: Category Navigation Testing

**Component Ownership**: client/src/pages/Category.tsx, Subcategory.tsx, SubSubcategory.tsx
**Mission**: Test ALL 9 categories + subcategories, fix bugs, verify working
**Duration**: 45 min (30 min testing + 15 min avg bug fixing)

**Tests** (18 tests):

1. **Category: Encoding & Codecs**
   - Navigate: /category/encoding-codecs
   - Verify: page.md shows resources
   - Count: ~392 resources (from Session 5 data)
   - Evidence: screenshot

2. **Category: Players & Clients**
   - Navigate: /category/players-clients
   - Count: ~425 resources
   - Evidence: screenshot

3. **Category: Protocols & Transport**
   - Navigate: /category/protocols-transport
   - Count: ~252 resources
   - Evidence: screenshot

4. **Category: Infrastructure & Delivery**
   - Navigate: /category/infrastructure-delivery
   - Count: ~134 resources
   - Evidence: screenshot

5. **Category: Standards & Industry**
   - Navigate: /category/standards-industry
   - Count: ~174 resources
   - Evidence: screenshot

6. **Category: Media Tools**
   - Navigate: /category/media-tools
   - Count: ~317 resources
   - Evidence: screenshot

7. **Category: Intro & Learning**
   - Navigate: /category/intro-learning
   - Count: ~229 resources
   - Evidence: screenshot

8. **Category: General Tools**
   - Navigate: /category/general-tools
   - Count: ~97 resources
   - Evidence: screenshot

9. **Category: Community & Events**
   - Navigate: /category/community-events
   - Count: ~91 resources
   - Evidence: screenshot

10. **Subcategory Filtering Works**
    - On category page, find subcategory dropdown
    - Select: First subcategory
    - Verify: Resources filtered
    - Evidence: screenshot

11. **Subcategory Page Navigation**
    - Click: Subcategory breadcrumb link
    - Verify: /subcategory/[slug] loads
    - Evidence: screenshot

12. **Sub-subcategory Navigation**
    - Find: Sub-subcategory in list
    - Click: Link
    - Verify: /sub-subcategory/[slug] loads
    - Verify: Resources display
    - Evidence: screenshot

13. **Resource Cards Render**
    - Verify: Each category page shows ResourceCard components
    - Check: Title, description, external link visible
    - Evidence: screenshot with visible cards

14. **Pagination Works**
    - Navigate: Category with >20 resources
    - Check: Pagination controls visible
    - Click: Next page
    - Verify: Different resources load
    - Evidence: screenshot of page 2

15. **Back Navigation Works**
    - Click: Browser back OR breadcrumb
    - Verify: Returns to previous page
    - Evidence: URL verification

16. **404 Handling**
    - Navigate: /category/nonexistent-category
    - Verify: 404 page OR error message
    - Evidence: screenshot

17. **Database Verification for Category**
```sql
SELECT COUNT(*) FROM resources WHERE category='Encoding & Codecs' AND status='approved';
```
    - Match: UI count ≈ DB count
    - Evidence: SQL result

18. **Subcategory Database Verification**
```sql
SELECT subcategory, COUNT(*) FROM resources
WHERE category='Players & Clients' AND status='approved'
GROUP BY subcategory;
```
    - Verify: Subcategories match UI dropdown
    - Evidence: SQL result

**Bug Fixing Protocol**:
- If category shows 0 resources → Check Category.tsx query parameters → Fix
- If subcategory filter breaks → Check filtering logic → Fix
- If 404 instead of category page → Check routing, slug generation → Fix

**Deliverable**: "Navigation: ALL 18 TESTS PASSED ✅" + evidence

---

### Agent C: Search + Filters + Sidebar Testing

**Component Ownership**: Search components, sidebar, filters
**Mission**: Test search functionality completely
**Duration**: 35 min (25 min testing + 10 min bug fixing)

**Tests** (12 tests):

1. **Search Dialog Opens**
   - Press: / key
   - Verify: Search modal appears
   - Evidence: screenshot

2. **Search Returns Results**
   - Type: "ffmpeg"
   - Verify: Results appear (should be ~158 from Session 5)
   - Database verify:
```sql
SELECT COUNT(*) FROM resources WHERE status='approved' AND (title ILIKE '%ffmpeg%' OR description ILIKE '%ffmpeg%');
```
   - Match: UI results ≈ DB count
   - Evidence: screenshot + SQL

3. **Search with Category Filter**
   - Search: "ffmpeg"
   - Select category filter: "Encoding & Codecs"
   - Verify: Results filtered (smaller subset)
   - Evidence: screenshot

4. **Search with Tag Filter** (if tags exist)
   - Apply tag filter
   - Verify: Results update
   - Evidence: screenshot

5. **Clear Filters Works**
   - Click: Clear or Reset button
   - Verify: All filters removed, full results return
   - Evidence: screenshot

6. **Debouncing Works**
   - Type: "test"
   - Wait: < 300ms
   - Verify: No search request yet
   - Wait: > 300ms
   - Verify: Search executes
   - Evidence: Network timing

7. **Empty Results Handled**
   - Search: "xyznonexistent12345"
   - Verify: "No results" message
   - Evidence: screenshot

8. **Special Characters Handled**
   - Search: "c++ & h.264"
   - Verify: No errors, results or empty
   - Evidence: screenshot

9. **Sidebar Shows 60 Items**
   - Check: page.md for sidebar navigation
   - Count: Hierarchical items (9 categories + subcategories)
   - Verify: ≈60 total navigation items
   - Evidence: page.md content

10. **Sidebar Navigation Works**
    - Click: Subcategory in sidebar
    - Verify: Page navigates
    - Verify: Correct resources display
    - Evidence: screenshot

11. **Sidebar Filtering**
    - Click: Category in sidebar
    - Verify: Main content filters to that category
    - Evidence: screenshot

12. **Mobile Sidebar**
    - Resize: 375px width
    - Verify: Sidebar collapses to hamburger menu
    - Click: Menu icon
    - Verify: Sidebar slides out
    - Evidence: Mobile screenshot

**Bug Fixing Protocol**:
- If search returns 0 results → Check API query → Fix search endpoint
- If sidebar missing items → Check sidebar data source → Fix
- If filters don't work → Check filter state management → Fix

**Deliverable**: "Search & Filters: ALL 12 TESTS PASSED ✅" + evidence

---

### Agent D: Bookmarks + Favorites Testing

**Component Ownership**: BookmarkButton.tsx, FavoriteButton.tsx, Bookmarks page
**Mission**: Test user data persistence completely
**Duration**: 40 min (30 min testing + 10 min bug fixing)

**Prerequisites**:
- Admin user logged in (admin@test.com)
- Test resource ID: afc5937b-28eb-486c-961f-38b5d2418b2a

**Tests** (14 tests):

1. **Bookmark Button Visible on DB Resources**
   - Navigate: Category page
   - Check: page.md for bookmark button on resources
   - Verify: Button exists (not hidden)
   - Evidence: screenshot

2. **Bookmark Button Hidden on Static Resources** (should not exist anymore)
   - Verify: ALL resources now have UUIDs (no "video-34" IDs)
   - Database check:
```sql
SELECT COUNT(*) FROM resources WHERE id::text ~ '^video-';
```
   - Expected: 0 (all migrated to database)
   - Evidence: SQL result

3. **Click Bookmark Button**
   - Click: Bookmark button on test resource
   - Verify: Success toast appears OR button state changes
   - Evidence: screenshot

4. **Verify Database Row Created**
```sql
SELECT * FROM user_bookmarks WHERE user_id='58c592c5-548b-4412-b4e2-a9df5cac5397' AND resource_id='afc5937b-28eb-486c-961f-38b5d2418b2a';
```
   - Expected: 1 row
   - Evidence: SQL result

5. **Navigate to Bookmarks Page**
   - Navigate: /bookmarks
   - Verify: Page loads
   - Evidence: screenshot

6. **Bookmarked Resource Visible**
   - Check: page.md for test resource title
   - Verify: Resource appears in list
   - Evidence: screenshot

7. **Add Notes to Bookmark**
   - Find: Notes field or edit button
   - Type: "Session 5 test notes"
   - Save
   - Database verify:
```sql
SELECT notes FROM user_bookmarks WHERE resource_id='afc5937b-28eb-486c-961f-38b5d2418b2a';
```
   - Expected: notes = "Session 5 test notes"
   - Evidence: SQL result

8. **Remove Bookmark**
   - Click: Remove/delete button
   - Verify: Confirmation OR immediate removal
   - Evidence: screenshot

9. **Verify Database Deletion**
```sql
SELECT COUNT(*) FROM user_bookmarks WHERE resource_id='afc5937b-28eb-486c-961f-38b5d2418b2a';
```
   - Expected: 0
   - Evidence: SQL result

10. **UI Updates After Removal**
    - Check: page.md no longer shows test resource
    - Verify: Empty state OR resource gone from list
    - Evidence: screenshot

**Tests 11-14**: Repeat for Favorites (same pattern, user_favorites table)

**Bug Fixing Protocol**:
- If bookmark button missing → Check BookmarkButton.tsx rendering logic → Fix
- If DB row not created → Check POST /api/bookmarks endpoint → Fix
- If UI doesn't update → Check TanStack Query invalidation → Fix

**Deliverable**: "Bookmarks & Favorites: ALL 14 TESTS PASSED ✅" + evidence

---

### Agent E: Admin Panel Testing

**Component Ownership**: Admin components (dashboard, pending resources, browser)
**Mission**: Test admin features completely
**Duration**: 35 min (25 min testing + 10 min bug fixing)

**Prerequisites**:
- Admin logged in
- Test resource created (pending status)

**Tests** (12 tests):

1. **Admin Login Works**
   - Navigate: /login
   - Login: admin@test.com / Admin123!
   - Verify: Redirects to homepage with admin menu
   - Evidence: screenshot

2. **Admin Dashboard Accessible**
   - Navigate: /admin
   - Verify: Dashboard loads (no 403)
   - Evidence: screenshot

3. **Dashboard Stats Accurate**
   - Check: Stats widgets
   - Database verify:
```sql
SELECT
  (SELECT COUNT(*) FROM resources) as total_resources,
  (SELECT COUNT(*) FROM resources WHERE status='pending') as pending;
```
   - Match: UI stats = DB stats
   - Evidence: screenshot + SQL

4. **Navigate to Pending Resources**
   - Click: Pending queue link
   - Verify: /admin/approvals or similar loads
   - Evidence: screenshot

5. **Pending Resource Visible**
   - Check: page.md for test pending resource
   - Verify: Resource appears in list
   - Evidence: screenshot

6. **Approve Resource**
   - Click: Approve button
   - Verify: Success message OR status update
   - Evidence: screenshot

7. **Database Updated**
```sql
SELECT status, approved_by, approved_at FROM resources WHERE title='[test resource]';
```
   - Expected: status='approved', approved_by set, approved_at set
   - Evidence: SQL result

8. **Audit Log Created**
```sql
SELECT * FROM resource_audit_log WHERE resource_id='[test resource id]' ORDER BY created_at DESC;
```
   - Expected: >= 1 row with action containing 'approve'
   - Evidence: SQL result

9. **Resource Browser Table Loads**
   - Navigate: /admin/resources
   - Verify: Table with resources
   - Evidence: screenshot

10. **Filtering Works**
    - Select: Status filter = "approved"
    - Verify: Only approved resources shown
    - Evidence: screenshot

11. **Sorting Works**
    - Click: Column header (e.g., Title)
    - Verify: Table re-sorts
    - Evidence: screenshot with sort indicator

12. **Pagination Works**
    - Verify: Page controls visible
    - Click: Next page
    - Verify: Different resources load
    - Evidence: screenshot of page 2

**Bug Fixing Protocol**:
- If dashboard inaccessible → Check AdminGuard → Fix
- If stats wrong → Check /api/admin/stats → Fix
- If approve fails → Check approve endpoint → Fix

**Deliverable**: "Admin Panel: ALL 12 TESTS PASSED ✅" + evidence

---

## Synthesis Phase (Orchestrator Validation)

**Duration**: 40 minutes
**Role**: Orchestrator (me) validates all wave results

### Integration Tests (Cross-Component)

**Test 1: Homepage → Category → Bookmark Flow**
- Start: http://localhost:3000
- Click: Category
- Click: Bookmark on resource
- Navigate: /bookmarks
- Verify: Resource appears
- **Validates**: Home (Agent A) + Category (Agent B) + Bookmarks (Agent D) integration
- Evidence: Full workflow screenshot

**Test 2: Submit → Admin Approve → Public Visibility**
- Submit: New resource via /submit form
- Admin: Navigate to pending queue
- Admin: Approve resource
- Verify: Appears on public category page
- **Validates**: Submit + Admin (Agent E) + Category (Agent B) integration
- Evidence: Full workflow screenshots

**Test 3: Search → Filter → Category → Resource**
- Search: "hls"
- Filter: Category = "Protocols & Transport"
- Click: Result
- Verify: Navigates to resource detail or category
- **Validates**: Search (Agent C) + Category (Agent B) integration
- Evidence: Screenshot

**Test 4: Sidebar → Subcategory → Resource Display**
- Click: Sidebar subcategory link
- Verify: Page loads with filtered resources
- **Validates**: Sidebar (Agent C) + Subcategory (Agent B) integration
- Evidence: Screenshot

### Final Verification Checklist

- [ ] Review all 5 agent reports
- [ ] Verify all agents report "ALL TESTS PASSED"
- [ ] Run 4 integration tests above
- [ ] All integration tests pass
- [ ] Database state clean (no test data pollution)
- [ ] Docker logs clean (no errors)
- [ ] Final smoke test: curl major endpoints
- [ ] Final screenshot collection
- [ ] Ready for commit

### If Synthesis Finds Issues

**Scenario**: Agent A reports success but integration test fails
- **Action**: Invoke systematic-debugging on integration failure
- **Fix**: Edit relevant component
- **Rebuild**: Docker
- **Retest**: Integration test
- **Repeat**: Until passes

**Scenario**: Multiple agents report same bug
- **Action**: Review to ensure no duplicate fixes
- **Verify**: Latest code has fix from first agent
- **Continue**: No action needed (agents got fix via rebuild)

---

## Expected Bugs Per Wave

**Wave 1**: 1-2 bugs
- SEO route query errors
- TypeScript compilation errors
- Missing method errors

**Wave 2**: 0-1 bugs
- Home.tsx query issues
- Category count inaccuracy

**Wave 3**: 0 bugs (deletion unlikely to break)

**Wave 4**:
- Agent A: 0-1 bugs (homepage usually stable)
- Agent B: 2-3 bugs (navigation has complexity)
- Agent C: 1-2 bugs (search has edge cases)
- Agent D: 1-2 bugs (user data RLS issues)
- Agent E: 1-2 bugs (admin permissions)

**Total Expected**: 7-13 bugs across all waves

---

## Rollback Plan

**If Critical Failure Occurs**:

**Option 1: Restore from Checkpoint**
```bash
# Use Serena memory
/shannon:restore session-5-pre-static-json-removal-checkpoint
```
- Restores: All code to pre-Wave 1 state
- Restore files from checkpoint
- Rebuild Docker
- Investigate issue before re-attempting

**Option 2: Git Revert**
```bash
git diff HEAD > /tmp/wave-changes.patch
git reset --hard aaa7504  # Last known good commit
docker-compose down && build && up -d
# Review what broke in patch file
```

**Option 3: Fix Forward**
- Use systematic-debugging
- Identify root cause
- Apply targeted fix
- Continue execution

**Trigger Rollback If**:
- Application won't start after rebuild (critical)
- Database corruption detected
- >5 agent blockers reported
- Time exceeds 10 hours without progress

---

## Success Criteria

**Complete Success When**:
- ✅ All backend static JSON references removed
- ✅ All frontend uses database APIs exclusively
- ✅ All parser files deleted
- ✅ All 5 testing agents report "ALL TESTS PASSED"
- ✅ All 4 integration tests pass
- ✅ No TypeScript errors
- ✅ Docker builds and runs successfully
- ✅ Evidence collected (40+ screenshots, SQL results)

**Deliverable**: Single source of truth (database), all features tested and working

---

## Time Breakdown

| Activity | Duration | Cumulative |
|----------|----------|------------|
| Context Priming (complete) | 60 min | 60 min |
| Wave 1 (Backend) | 90 min | 150 min |
| Wave 2 (Frontend) | 50 min | 200 min |
| Wave 3 (Deletion) | 30 min | 230 min |
| Wave 4 (Testing - parallel) | 120 min | 350 min |
| Synthesis (Integration) | 40 min | 390 min |
| **TOTAL** | **390 min** | **6.5 hours** |

**With Bug Overhead**: 7-8 hours realistic

---

## Orchestration Tools

**Skills I'll Invoke**:
- ✅ session-context-priming (DONE)
- ⏳ dispatching-parallel-agents (Wave 4)
- ⏳ systematic-debugging (as needed per bug)
- ⏳ finishing-a-development-branch (final commit)

**MCPs I'll Use**:
- superpowers-chrome (browser testing)
- Supabase MCP (database verification)
- Serena MCP (checkpoint management)
- Context7 (library docs - already pulled)

---

**PLAN STATUS**: ✅ READY FOR EXECUTION
**NEXT**: Begin Wave 1 - Backend Static JSON Removal
