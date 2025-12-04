# Next Session: Comprehensive Platform Validation (2M Tokens, ~15 Hours)

> **For Next Claude Session:** MANDATORY FIRST STEP: `/prime-context` then execute this plan
>
> **CRITICAL:** Use session-context-priming skill, read THIS session's memories, understand current state before starting

**Goal:** Systematically validate platform features through frontend-driven testing, fixing bugs immediately via test-fix-retest loops, reaching comprehensive validation coverage

**Duration:** ~15 hours (2M tokens)
**Method:** Frontend-driven testing with Chrome DevTools MCP
**Standard:** Iron Law (All 3 layers + 3 viewports for every test)
**Expected Bugs:** 15-25 (based on historical 0.4 bugs per hour × 15 hours)

---

## Prerequisites: What Previous Session Accomplished

### Database & Import Layer (Session Dec 3-4, 670K tokens, 5 hours)

**Completed:**
- ✅ awesome-rust imported: 1,078 resources
- ✅ Database state: 4,111 resources, 26 categories
- ✅ Hierarchy: 192 subcategories, 94 sub-subcategories
- ✅ Schema migration applied: 6 columns added to resource_audit_log
- ✅ Cache fix: refetchOnMount added to App.tsx
- ✅ Bulk atomicity verified: Transactions work correctly
- ✅ Navigation validated: All 26 categories browsable
- ✅ Responsive tested: 12+ screenshots at 3 viewports
- ✅ Honest documentation: Gap analysis, validation reports

**Bugs Fixed (2/3):**
1. ✅ Schema migration (endpoint column missing)
2. ✅ Cache staleness (React Query not refreshing)
3. ⚠️ Admin auth (login doesn't work - BLOCKER)

**Tests Executed:** 10 with 3-layer validation
**Commits:** 9
**Import Feature:** 83% validated (database + API + public UI)

### Critical Blocker for This Session

**Admin Authentication Not Working:**
- Login form submits but doesn't redirect
- /admin routes return 404 (likely AdminGuard blocking)
- Cannot test any admin UI features
- **MUST FIX FIRST** before admin testing

---

## Phase 0: Context Priming & Handoff (1.5 hours, 150K tokens)

### Task 0.1: Mandatory Context Loading

**Step 1: Run context priming**
```
/prime-context
```

This will:
- Activate Serena MCP
- Read last 10 memories (including THIS session's work)
- Pull Context7 docs for libraries
- Read plan files
- Read critical codebase files
- Deep thinking about project state

**Step 2: Read THIS session's memories**
```typescript
mcp__serena__read_memory({ memory_file_name: "session-import-testing-2025-12-04" })
```

Expected: Understanding of what was done, bugs fixed, current state

**Step 3: Verify database state inherited correctly**
```bash
curl -s http://localhost:3000/api/categories | jq 'length'
# Expected: 26 categories (21 video + 5 rust)

curl -s 'http://localhost:3000/api/resources?status=approved' | jq '.total'
# Expected: ~4,100 resources
```

**Step 4: Load required skills**
```typescript
Skill({ skill: "frontend-driven-testing" })
Skill({ skill: "systematic-debugging" })
```

### Task 0.2: Understand Admin Auth Blocker

**Step 1: Read previous session's admin auth investigation**
From honest gap analysis doc:

"BUG #3: Admin Authentication Not Working
- Login form doesn't redirect
- Admin routes return 404
- AdminGuard likely blocking"

**Step 2: Review AdminGuard implementation**
```typescript
mcp__serena__read_file({
  relative_path: "client/src/components/auth/AdminGuard.tsx",
  max_answer_chars: 50000
})
```

**Step 3: Review useAuth hook**
```typescript
mcp__serena__read_file({
  relative_path: "client/src/hooks/useAuth.ts",
  max_answer_chars: 50000
})
```

**Step 4: Identify root cause hypothesis**
Likely causes:
1. Admin user doesn't exist in Supabase
2. Admin user exists but role not set
3. Login form broken
4. useAuth not detecting admin role correctly
5. AdminGuard redirect logic broken

---

## Phase 1: Fix Admin Authentication (CRITICAL - 2 hours, 200K tokens)

### Task 1.1: Investigate Admin User in Database (30 min)

**Step 1: Check if admin user exists**
```sql
SELECT id, email, raw_user_meta_data, created_at
FROM auth.users
WHERE email = 'admin@test.com';
```

**If NO ROWS:**
- Admin user doesn't exist
- Need to create via Supabase dashboard
- Go to Auth → Users → Add User
- Email: admin@test.com
- Password: TestAdmin123!
- User metadata: `{"role": "admin"}`

**If ROW EXISTS, check role:**
```sql
SELECT
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'admin@test.com';
```

**If role is NULL or not 'admin':**
```sql
UPDATE auth.users
SET raw_user_meta_data = '{"role": "admin"}'::jsonb
WHERE email = 'admin@test.com';
```

### Task 1.2: Test Login Via Chrome DevTools MCP (30 min)

**Step 1: Navigate to login**
```typescript
mcp__chrome-devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:3000/login'
})
```

**Step 2: Take fresh snapshot**
```typescript
mcp__chrome-devtools__take_snapshot({})
```

**Step 3: Fill email (use current UID from snapshot)**
```typescript
mcp__chrome-devtools__fill({
  uid: '[EMAIL_INPUT_UID from snapshot]',
  value: 'admin@test.com'
})
```

**Step 4: Fill password**
```typescript
mcp__chrome-devtools__fill({
  uid: '[PASSWORD_INPUT_UID from snapshot]',
  value: 'TestAdmin123!'
})
```

**Step 5: Submit**
```typescript
mcp__chrome-devtools__click({
  uid: '[SUBMIT_BUTTON_UID from snapshot]'
})
```

**Step 6: Wait and check redirect**
```bash
sleep 5
```

```typescript
mcp__chrome-devtools__take_snapshot({})
```

**Expected:** URL should be 'http://localhost:3000/' and user menu should show admin email

**If NO REDIRECT:**
- Check console errors
- Check network tab for auth request
- Invoke systematic-debugging

### Task 1.3: Fix Auth Bug via Systematic Debugging (1 hour)

**IF login still doesn't work, follow 4-phase protocol:**

**Phase 1: Root Cause Investigation**
- Check console errors in Chrome DevTools
- Check network tab (was POST to /auth/v1/token made?)
- Check response (200? 401? error message?)
- Check localStorage (is token being saved?)

**Phase 2: Pattern Analysis**
- Compare to working auth in previous sessions (Session 8 had working login)
- What changed since then?
- Check git history for auth-related changes

**Phase 3: Hypothesis Testing**
- Hypothesis 1: Supabase client not configured correctly
- Hypothesis 2: Auth callback not handling response
- Hypothesis 3: useAuth hook not updating state
- Test each with minimal changes

**Phase 4: Fix Implementation**
- Edit relevant file (Login.tsx, useAuth.ts, or supabase client config)
- Rebuild Docker
- Retest login flow
- Verify redirect works
- Verify admin routes accessible

**Success Criteria:**
- Login redirects to homepage ✅
- User menu shows email ✅
- Can navigate to /admin without 404 ✅
- AdminGuard allows access ✅

---

## Phase 2: Admin UI Comprehensive Testing (6 hours, 600K tokens)

**Prerequisites:**
- ✅ Admin auth working (from Phase 1)
- ✅ Can log in as admin@test.com
- ✅ Can access /admin routes

### Task 2.1: Admin Dashboard Validation (30 min)

**Step 1: Navigate to /admin**
```typescript
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3000/admin'
})
```

**Step 2: Take snapshot + screenshots at 3 viewports**
```typescript
// Desktop
mcp__chrome-devtools__resize_page({ width: 1920, height: 1080 })
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/admin-dashboard-desktop.png',
  fullPage: true
})

// Tablet
mcp__chrome-devtools__resize_page({ width: 768, height: 1024 })
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/admin-dashboard-tablet.png'
})

// Mobile
mcp__chrome-devtools__resize_page({ width: 375, height: 667 })
mcp__chrome-devtools__take_screenshot({
  filePath: '/tmp/admin-dashboard-mobile.png'
})
```

**Step 3: Visual inspection via Read tool**
```typescript
Read({ file_path: '/tmp/admin-dashboard-desktop.png' })
Read({ file_path: '/tmp/admin-dashboard-tablet.png' })
Read({ file_path: '/tmp/admin-dashboard-mobile.png' })
```

Verify:
- Stats widgets visible (total resources, pending, categories)
- Layout not broken at any viewport
- Navigation tabs accessible

**Step 4: Verify stats accuracy (Layer 2)**
```sql
SELECT
  (SELECT COUNT(*) FROM resources) as total_resources,
  (SELECT COUNT(*) FROM resources WHERE status = 'pending') as pending,
  (SELECT COUNT(*) FROM categories) as total_categories;
```

Expected: Numbers match UI widgets

**If stats don't match OR layout broken:**
- Invoke systematic-debugging
- Fix AdminDashboard.tsx or stats API
- Rebuild, retest

### Task 2.2: Resource Browser Table Testing (1 hour)

**Step 1: Navigate to resource browser**
```typescript
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3001/admin/resources'
})
```

**Step 2: Verify table loads with Rust resources**
```typescript
mcp__chrome-devtools__take_snapshot({})
```

Look for:
- Table with resource rows
- Rust resources visible (Applications, Libraries categories)
- Pagination controls
- Filter dropdowns

**Step 3: Test filtering by Rust category**
```typescript
// Find category filter dropdown
mcp__chrome-devtools__click({ uid: '[CATEGORY_FILTER_UID]' })

// Select "Applications"
mcp__chrome-devtools__click({ uid: '[APPLICATIONS_OPTION_UID]' })
```

**Step 4: Verify filtered results (3 layers)**
- Layer 1: Check network for GET /api/admin/resources?category=Applications
- Layer 2: SQL query confirms 1,310 Applications resources
- Layer 3: Screenshot shows only Applications in table

**Step 5: Test sorting**
Click column headers (Title, Category, Status, Created)
Verify table re-sorts each time

**Step 6: Test pagination**
Click "Next page" button
Verify different resources load

**Each test: 3 viewports, visual inspection, bug fix if fails**

### Task 2.3: Bulk Operations via UI (2 hours)

**CRITICAL: This is the core admin functionality that's been untested**

**Step 1: Filter to Rust test resources**
Navigate to pending resources, filter for titles containing "Test Rust"

**Step 2: Select 10 checkboxes**
```typescript
// From snapshot, find checkbox UIDs for all 10 test resources
mcp__chrome-devtools__click({ uid: '[CHECKBOX_1_UID]' })
// Repeat for all 10
```

**Step 3: Verify bulk toolbar appears**
```typescript
mcp__chrome-devtools__take_snapshot({})
```

Expected: "10 resources selected" text, bulk action buttons visible

**Step 4: Click Bulk Approve**
```typescript
mcp__chrome-devtools__click({ uid: '[BULK_APPROVE_BUTTON_UID]' })
```

**Step 5: Confirm dialog**
```typescript
mcp__chrome-devtools__take_snapshot({}) // Check for confirmation modal
mcp__chrome-devtools__click({ uid: '[CONFIRM_BUTTON_UID]' })
```

**Step 6: CRITICAL - Verify atomicity (Layer 2)**
```sql
SELECT id, title, status, approved_by
FROM resources
WHERE title LIKE 'Test Rust%'
ORDER BY title;
```

**ATOMIC CHECK:**
- ALL 10 must have status='approved'
- ALL 10 must have approved_by set
- If only 7/10 or 9/10: CRITICAL BUG, transaction not atomic

**Step 7: Verify audit log (Layer 2b)**
```sql
SELECT resource_id, action, performed_by
FROM resource_audit_log
WHERE resource_id IN ('[10 test resource IDs]')
AND action LIKE '%approve%';
```

Expected: 10 audit entries

**Step 8: Verify UI refreshed (Layer 3)**
Table should update, checkboxes deselected, toast notification

**Step 9: Repeat for Bulk Reject, Bulk Archive, Bulk Tag**
- Each operation: Same rigorous 3-layer validation
- Each operation: 3 viewport screenshots
- Each operation: Atomic check
- Each operation: Audit verification

**If ANY test fails:** Systematic-debugging, fix, rebuild, retest

### Task 2.4: Resource Edit Modal (45 min)

**Step 1: Open modal for a Rust resource**
```typescript
// Find dropdown button for a resource
mcp__chrome-devtools__click({ uid: '[RESOURCE_DROPDOWN_UID]' })
mcp__chrome-devtools__click({ uid: '[EDIT_MENU_ITEM_UID]' })
```

**Step 2: Verify modal loads with resource data**
```typescript
mcp__chrome-devtools__take_snapshot({})
```

Expected: Modal with pre-filled title, URL, description

**Step 3: Edit description**
```typescript
mcp__chrome-devtools__fill({
  uid: '[DESCRIPTION_TEXTAREA_UID]',
  value: 'Updated description for testing.'
})

mcp__chrome-devtools__click({ uid: '[SAVE_BUTTON_UID]' })
```

**Step 4: Verify update (3 layers)**
- Layer 1: PUT /api/admin/resources/:id → 200
- Layer 2: Database shows new description
- Layer 3: Public category page shows updated description

**Step 5: Screenshot evidence at 3 viewports**

### Task 2.5: Admin Navigation & Routes (30 min)

**Test all admin routes:**
1. /admin (dashboard)
2. /admin/resources (resource browser)
3. /admin/approvals (pending resources)
4. /admin/edits (pending edits)
5. /admin/enrichment (AI enrichment panel)
6. /admin/github (GitHub sync - if route exists)

**For each route:**
- Navigate via Chrome DevTools
- Verify page loads (not 404)
- Screenshot at desktop viewport
- Visual inspection for layout

**If any 404:** Add route to App.tsx, rebuild, retest

---

## Phase 3: Multi-User RLS Testing (3 hours, 300K tokens)

**Goal:** Verify User A cannot access User B's data (RLS isolation)

### Task 3.1: Create Test Users (30 min)

**Step 1: Create User A via Supabase Dashboard**
- Email: test-user-a-session-next@test.com
- Password: TestUserA123!
- Metadata: `{"role": "user"}`

**Step 2: Create User B**
- Email: test-user-b-session-next@test.com
- Password: TestUserB123!
- Metadata: `{"role": "user"}`

**Step 3: Verify in database**
```sql
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email LIKE 'test-user-%session-next%';
```

Expected: 2 users with role='user'

### Task 3.2: User A Creates Data (45 min)

**Step 1: Login as User A via Chrome DevTools**
```typescript
// Navigate to /login
// Fill email: test-user-a-session-next@test.com
// Fill password: TestUserA123!
// Submit
// Verify redirect
```

**Step 2: Navigate to Rust category**
```typescript
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3000/category/applications'
})
```

**Step 3: Favorite a Rust resource**
```typescript
// Find favorite button on first resource
mcp__chrome-devtools__click({ uid: '[FAVORITE_BUTTON_UID]' })
```

**Step 4: Verify favorite created (Layer 2)**
```sql
SELECT user_id, resource_id, created_at
FROM user_favorites
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test-user-a-session-next@test.com');
```

Expected: 1 row (User A's favorite)

**Step 5: Bookmark a resource with notes**
```typescript
// Click bookmark button
// Add notes if modal appears
```

**Step 6: Verify bookmark (Layer 2)**
```sql
SELECT user_id, resource_id, notes
FROM user_bookmarks
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test-user-a-session-next@test.com');
```

Expected: 1 row with notes

**Step 7: Logout User A**
```typescript
// Click user menu
// Click logout
// Verify localStorage cleared
```

### Task 3.3: User B Tries to Access User A's Data (45 min)

**Step 1: Login as User B**
```typescript
// Navigate to /login
// Fill email: test-user-b-session-next@test.com
// Fill password: TestUserB123!
// Submit
// Verify redirect
```

**Step 2: Navigate to favorites page**
```typescript
mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:3000/profile'
})

// Click Favorites tab
mcp__chrome-devtools__click({ uid: '[FAVORITES_TAB_UID]' })
```

**Step 3: Verify User B sees EMPTY favorites (Layer 3 - CRITICAL)**
```typescript
mcp__chrome-devtools__take_snapshot({})
```

Expected: "No favorites yet" or empty list
**MUST NOT** see User A's favorited resource

**If User B sees User A's data:**
- **CRITICAL SECURITY BUG:** RLS not working
- STOP all testing
- Invoke systematic-debugging immediately
- Check RLS policies on user_favorites table
- Fix and retest before continuing

**Step 4: Navigate to bookmarks**
Same test - User B should NOT see User A's bookmarks

**Step 5: Try to access User A's data via API**
```typescript
// Execute JavaScript to get User B's token
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const token = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
    return JSON.parse(token);
  }`
})

// Use token to call favorites API
// Should return empty for User B
```

### Task 3.4: Cross-User RLS Verification (1 hour)

**Test Matrix:**
1. User A favorites → User B cannot see ✅
2. User A bookmarks → User B cannot see ✅
3. User A preferences → User B cannot see ✅
4. Admin sees all (service role) → Verify via SQL ✅
5. Anonymous sees none (public endpoints only) ✅

**Each test:**
- Create data as User A
- Verify exists via Supabase MCP (service role sees it)
- Login as User B
- Verify User B cannot see via UI
- Verify User B cannot see via API
- Screenshot evidence

**If ANY RLS leak found:**
- CRITICAL SECURITY BUG
- Fix immediately before any deployment
- Document in security audit

---

## Phase 4: Comprehensive API Endpoint Validation (4 hours, 400K tokens)

**Goal:** Test 30-40 critical endpoints with 3-layer validation

### Task 4.1: Bookmark Endpoints (30 min)

**Test POST /api/bookmarks/:id**
```bash
# Get auth token via Chrome DevTools localStorage
export USER_TOKEN="[extracted from localStorage]"

# Call endpoint
curl -X POST http://localhost:3000/api/bookmarks/[rust_resource_id] \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json"
```

**Verify (3 layers):**
- Layer 1: 200 OK response
- Layer 2: Row in user_bookmarks table
- Layer 3: Resource appears in /bookmarks page

**Test DELETE /api/bookmarks/:id**
Same pattern

**Test GET /api/bookmarks**
Verify returns user's bookmarks only (RLS check)

### Task 4.2: Favorite Endpoints (30 min)

Same pattern as bookmarks:
- POST /api/favorites/:id
- DELETE /api/favorites/:id
- GET /api/favorites

### Task 4.3: Resource CRUD Endpoints (1 hour)

Test:
- POST /api/resources (submit as user)
- GET /api/resources/:id
- PUT /api/resources/:id (admin edit)
- DELETE /api/resources/:id (admin delete)
- PUT /api/resources/:id/approve (admin)
- PUT /api/resources/:id/reject (admin)

Each with 3-layer validation

### Task 4.4: Bulk Operation Endpoints (1 hour)

Test via API (complementing UI tests from Phase 2):
- POST /api/admin/resources/bulk with action='approve'
- POST /api/admin/resources/bulk with action='reject'
- POST /api/admin/resources/bulk with action='archive'
- POST /api/admin/resources/bulk with action='tag'

Verify atomicity for each

### Task 4.5: GitHub Sync Endpoints (45 min)

Test:
- POST /api/github/import (dry-run with awesome-go)
- POST /api/github/export
- GET /api/github/sync-history

### Task 4.6: Enrichment Endpoints (45 min)

**CRITICAL: AI enrichment never tested**

Test:
- POST /api/enrichment/start (batch=3 for testing)
- GET /api/enrichment/jobs
- Monitor job progress
- Verify tags created

**Note:** This will take ~90 seconds (3 resources × 30s each)

### Task 4.7: Journey Endpoints (30 min)

Test:
- GET /api/journeys
- POST /api/journeys/:id/start
- PUT /api/journeys/:id/progress

### Task 4.8: Document Results (30 min)

Create `docs/API_ENDPOINT_VALIDATION.md` with:
- All endpoints tested
- Pass/fail status
- Evidence references
- Bugs found and fixed

---

## Phase 5: E2E User Workflows (3 hours, 300K tokens)

### Workflow 1: Complete Favorites Flow (45 min)

**Step 1: Login as test user**
**Step 2: Navigate to category**
**Step 3: Click favorite button**
**Step 4: Verify DB row created**
**Step 5: Navigate to profile**
**Step 6: Verify favorite shown in list**
**Step 7: Click remove**
**Step 8: Verify DB row deleted**
**Step 9: Verify removed from profile**

**All steps:** 3-layer validation, screenshots, visual inspection

### Workflow 2: Complete Bookmarks Flow (45 min)

Same comprehensive testing as favorites, plus:
- Add notes feature
- Edit notes feature
- Notes persist across sessions

### Workflow 3: Learning Journey Enrollment (1 hour)

**Prerequisites:** Need published journey in database (may need to create)

Test:
- Browse journeys
- Click journey card
- Enroll
- Verify enrollment in database
- Complete steps
- Verify progress updates
- Screenshot evidence

### Workflow 4: Profile & Stats (30 min)

Test:
- Navigate to profile
- Verify stats accuracy (favorites count, bookmarks count, etc.)
- Check all tabs load
- Verify data in each tab

---

## Phase 6: Performance & Scale Testing (2 hours, 200K tokens)

### Task 6.1: Frontend Performance with 4K Resources (30 min)

**Test:**
- Homepage load time (with 26 categories)
- Category page with 1,926 resources (Libraries)
- Search with large result set
- Measure via Chrome DevTools Performance tab

**Targets:**
- Page load: <3 seconds
- Time to Interactive: <5 seconds
- No UI freezing

### Task 6.2: API Load Testing (30 min)

**Use autocannon or ab:**
```bash
npm install -g autocannon

# Test /api/resources endpoint
autocannon -c 10 -d 30 http://localhost:3000/api/resources?status=approved&limit=100

# Test /api/categories
autocannon -c 10 -d 30 http://localhost:3000/api/categories
```

**Targets:**
- p95 latency: <200ms
- No errors
- Throughput: >100 req/sec

### Task 6.3: Database Query Performance (30 min)

**Test slow queries with EXPLAIN ANALYZE:**
```sql
EXPLAIN ANALYZE
SELECT * FROM resources
WHERE status = 'approved' AND category = 'Libraries'
LIMIT 100;
```

Expected: <50ms execution time

**If slow:** Check indexes, optimize queries

### Task 6.4: Concurrent Operations (30 min)

Test:
- 2 users favoriting same resource simultaneously
- Bulk operations while users browsing
- Import while users searching

Verify: No deadlocks, no data corruption

---

## Phase 7: Security Validation (2 hours, 200K tokens)

### Task 7.1: XSS Testing (30 min)

**Submit resource with script tag:**
```typescript
// As regular user, submit resource
// Title: <script>alert('XSS')</script>
// URL: https://test.com/xss
// Description: <img src=x onerror="alert('XSS')">
```

**Admin approves**

**View on public page:**
Verify: Script tags rendered as text (escaped), no JavaScript execution

**If XSS executes:** CRITICAL SECURITY BUG, fix immediately

### Task 7.2: SQL Injection Testing (30 min)

**Test in search:**
```
Search query: '; DROP TABLE resources; --
```

**Verify:**
- No SQL execution
- Resources table still exists
- Drizzle ORM parameterization working

### Task 7.3: Rate Limiting (30 min)

**Send 100 requests rapidly:**
```bash
for i in {1..100}; do
  curl http://localhost:3000/api/resources &
done
```

**Verify:** 429 Too Many Requests after configured limit

### Task 7.4: RLS Comprehensive Audit (30 min)

Review all RLS policies:
- user_favorites: user_id = auth.uid()
- user_bookmarks: user_id = auth.uid()
- user_preferences: user_id = auth.uid()
- user_journey_progress: user_id = auth.uid()

Test each with User A vs User B

---

## Phase 8: Documentation & Completion (1 hour, 100K tokens)

### Task 8.1: Consolidate Evidence

**Create:** `docs/SESSION_NEXT_COMPREHENSIVE_VALIDATION_COMPLETE.md`

Include:
- All tests executed (count)
- All bugs found and fixed
- All 3-layer validations
- All screenshot evidence
- Performance metrics
- Security audit results

### Task 8.2: Update Platform Completion Assessment

**Calculate honest percentage:**
- Features with 3-layer validation: [count]/33
- Based on actual evidence, not assumptions

### Task 8.3: Production Readiness Decision

**Certify for production ONLY if:**
- ✅ Admin auth working
- ✅ All admin UI features tested
- ✅ RLS verified (no data leaks)
- ✅ Bulk operations working in UI
- ✅ No critical security bugs
- ✅ Performance acceptable
- ✅ 25/33+ features validated (75%+)

**If criteria not met:** Document what's needed before deployment

---

## Self-Correcting Loop (Continuous Throughout)

**For EVERY test that fails:**

```
1. STOP testing immediately
2. Take screenshot of failure state
3. Check console errors (Chrome DevTools)
4. Check network tab (API call status)
5. Check database (SQL query)
6. Invoke: Skill({ skill: "systematic-debugging" })
7. Follow 4-phase protocol:
   - Root cause investigation
   - Pattern analysis
   - Hypothesis testing
   - Fix implementation
8. Edit code via Serena MCP
9. Rebuild Docker: docker-compose down && build --no-cache && up -d
10. Wait 30 seconds
11. RESTART failed test from beginning
12. Verify all 3 layers now pass
13. Document fix in evidence file
14. Commit fix
15. Continue to next test
```

**NO deferring bugs**
**NO "good enough" rationalizations**
**NO skipping retests after fixes**

---

## Success Criteria

**Phase 0 Complete When:**
- ✅ Context fully loaded (memories, plans, code)
- ✅ Admin auth blocker understood
- ✅ Skills loaded

**Phase 1 Complete When:**
- ✅ Admin login works (redirect successful)
- ✅ Admin routes accessible (no 404)
- ✅ Can navigate admin panel

**Phase 2 Complete When:**
- ✅ All admin UI features tested via Chrome DevTools
- ✅ Bulk operations working in UI
- ✅ Resource editing working
- ✅ Admin navigation complete
- ✅ All bugs found and fixed

**Phase 3 Complete When:**
- ✅ User A and User B created
- ✅ Data isolation verified (RLS working)
- ✅ No cross-user data leakage
- ✅ All privacy features tested

**Phase 4 Complete When:**
- ✅ 30-40 API endpoints tested
- ✅ All with 3-layer validation
- ✅ API_ENDPOINT_VALIDATION.md created

**Phase 5 Complete When:**
- ✅ 3-4 complete workflows tested end-to-end
- ✅ All steps have 3-layer validation
- ✅ Workflow evidence documents created

**Phase 6 Complete When:**
- ✅ Performance benchmarked
- ✅ Load testing completed
- ✅ Metrics documented

**Phase 7 Complete When:**
- ✅ Security tested (XSS, SQLi, RLS, rate limiting)
- ✅ No critical vulnerabilities
- ✅ Security audit report created

**Phase 8 Complete When:**
- ✅ All evidence consolidated
- ✅ Completion percentage calculated honestly
- ✅ Production readiness decision made

---

## Token Budget Allocation

**Total Available:** 2M tokens over ~15 hours

**Phase 0: Context Priming** - 150K tokens, 1.5 hours
**Phase 1: Admin Auth Fix** - 200K tokens, 2 hours (includes debugging time)
**Phase 2: Admin UI Testing** - 600K tokens, 6 hours (comprehensive, many features)
**Phase 3: Multi-User RLS** - 300K tokens, 3 hours (thorough isolation testing)
**Phase 4: API Endpoints** - 400K tokens, 4 hours (30-40 endpoints)
**Phase 5: User Workflows** - 300K tokens, 3 hours (3-4 workflows)
**Phase 6: Performance** - 200K tokens, 2 hours
**Phase 7: Security** - 200K tokens, 2 hours
**Phase 8: Documentation** - 100K tokens, 1 hour

**Subtotal:** 2.45M tokens budgeted (allows some buffer)

**Bug Fixing Buffer:** Built into each phase (expect 15-25 bugs × 50min avg)

---

## Expected Bugs & Fixes

**Phase 1:** 1-2 bugs (admin auth fix may reveal related issues)
**Phase 2:** 5-8 bugs (admin UI complex, many interactions)
**Phase 3:** 2-3 bugs (RLS policy gaps, permission issues)
**Phase 4:** 4-6 bugs (endpoint auth, validation, response format)
**Phase 5:** 3-5 bugs (workflow state management, form validation)
**Phase 6:** 1-2 bugs (performance bottlenecks)
**Phase 7:** 1-2 bugs (security issues hopefully minor)

**Total Expected:** 17-28 bugs

**All bugs:** Fix immediately using systematic-debugging, no deferral

---

## Skills to Invoke

**At Session Start:**
1. `Skill({ skill: "session-context-priming" })` - MANDATORY FIRST
2. `Skill({ skill: "frontend-driven-testing" })` - Load before any testing
3. `Skill({ skill: "systematic-debugging" })` - Have ready for bugs

**During Execution:**
- systematic-debugging: 17-28 times (once per bug)
- root-cause-tracing: 3-5 times (for complex bugs)

**At Session End:**
- finishing-a-development-branch: Create PR or deployment plan

---

## Commit Strategy

**Commit after:**
- Admin auth fix (Phase 1)
- Every 3-5 admin features tested (Phase 2)
- RLS validation complete (Phase 3)
- Every 10 endpoints tested (Phase 4)
- Each workflow complete (Phase 5)
- Performance results (Phase 6)
- Security audit (Phase 7)
- Final documentation (Phase 8)

**Expected Commits:** 15-20 total

---

## Handoff from Previous Session

**Files Created:**
- docs/HONEST_GAP_ANALYSIS_2025-12-03.md
- docs/TEST_EVIDENCE_RUST_IMPORT.md
- docs/IMPORT_FEATURE_VALIDATION_COMPLETE.md
- docs/SESSION_IMPORT_TESTING_COMPLETE_2025-12-04.md
- docs/plans/2025-12-04-remaining-work-honest-assessment.md
- scripts/test-bulk-atomicity.ts
- scripts/create-test-rust-resources.ts
- Many more test scripts

**Memories to Read:**
- session-production-push-complete
- session-9-security-performance-audit
- session-8-successful-testing-patterns
- database-schema-complete-all-agents
- complete-system-architecture-understanding

**Git State:**
- Branch: feature/session-5-complete-verification
- Ahead of origin: 35+ commits
- Clean working tree
- awesome-rust data in database

---

## Success Metrics

**Minimum Success (Conservative):**
- Admin auth fixed
- 10+ admin UI features tested
- RLS verified with 2 users
- 20+ API endpoints validated
- 2+ workflows complete
- **Result:** ~55-65% platform validation

**Target Success (Realistic):**
- Admin auth fixed
- All admin UI features tested
- Complete RLS audit
- 30-40 API endpoints
- 3-4 workflows
- Performance + security validated
- **Result:** ~70-80% platform validation

**Stretch Success (If no major blockers):**
- Everything above +
- All remaining user features
- Production deployment preparation
- **Result:** ~85-90% platform validation

---

## Risk Mitigation

**Highest Risk:** Admin auth bug takes >2 hours to fix
- Mitigation: Timebox to 2 hours, document if can't fix, proceed with public testing

**High Risk:** RLS policies have gaps (data leakage)
- Mitigation: STOP deployment if found, fix immediately

**Medium Risk:** Many bugs in admin UI (8+ hours debugging)
- Mitigation: Fix systematically, document known issues if time runs out

**Low Risk:** Performance issues found
- Mitigation: Document, create optimization tickets for future

---

## Plan Status

**Scope:** Realistic for 2M tokens (~15 hours)
**Priorities:** Correct (admin auth → admin UI → RLS → APIs → workflows)
**Methodology:** Frontend-driven testing with systematic debugging
**Evidence:** Comprehensive (screenshots, SQL, network logs)
**Honesty:** Built-in (no completion claims without evidence)

**Ready for Execution:** ✅ YES

**Next Session Start Command:**
```
/prime-context
Then: /superpowers:execute-plan docs/plans/2025-12-04-session-next-comprehensive-validation.md
```

**Expected Outcome:** 55-80% platform validation with honest evidence-based reporting
