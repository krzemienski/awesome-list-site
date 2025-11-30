# Session 4: Complete Validation & Production Readiness Plan

**Created**: 2025-11-29
**Estimated Duration**: 14-19 hours
**Complexity**: 0.69/1.00 (COMPLEX)
**Starting Point**: Session 3 at 75-80% (8 bugs fixed, core platform validated)
**Goal**: Reach 95%+ with full validation, production-ready codebase, comprehensive documentation

---

## Executive Summary

### Objectives

**Primary**:
1. ✅ Complete remaining 25% functional validation (iterative bug fixing)
2. ✅ Multi-role testing (anonymous, user, admin)
3. ✅ Admin feature validation (edit → database → frontend verification)
4. ✅ Comprehensive open-source README
5. ✅ Line-by-line code audit and dead code removal
6. ✅ Database schema documentation
7. ✅ Supabase integration guide
8. ✅ Architecture diagrams (Mermaid)

**Secondary**:
- Automated testing scripts
- Production deployment verification
- Performance benchmarking
- Security hardening validation

---

## Shannon Complexity Analysis (8-Dimensional)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Technical Depth** | 0.6 | Functional testing, code organization |
| **Integration Complexity** | 0.7 | Edit → DB → frontend loops, multi-role flows |
| **State Management** | 0.5 | Testing state persistence, session handling |
| **Error Scenarios** | 0.8 | Iterative bug fixing (unknown bug count) |
| **Performance Requirements** | 0.3 | Already optimized, just verify |
| **Security Concerns** | 0.6 | Role boundary testing, permission validation |
| **Documentation Needs** | 0.7 | Comprehensive README, diagrams, guides |
| **Testing Complexity** | 0.9 | Multi-role, iterative, Chrome DevTools MCP |

**Overall Complexity**: **0.69/1.00 → COMPLEX**

---

## Methodology

### Testing Approach: ITERATIVE BUG FIXING

**Critical**: When bug found, STOP all testing, fix immediately, rebuild, restart testing flow.

```
Test Feature A
  ↓
Bug Found?
  YES → [STOP] → Fix Bug → Rebuild → [RESTART from beginning]
  NO → Continue to Feature B
```

This is **TDD applied to functional testing**:
- **RED**: Test reveals bug
- **GREEN**: Fix makes test pass
- **REFACTOR**: Clean up
- **CONTINUE**: Next test

### Tools & Skills

**MCP Tools** (Explicit Callouts):
- 🔧 **Chrome DevTools MCP** - ALL functional testing
- 🗄️ **Supabase** - Database queries
- 🧠 **Sequential Thinking MCP** - Complex debugging
- 📚 **Context7** - Library documentation if needed

**Skills** (Explicit Invocations):
- 🔍 **systematic-debugging** - When bugs found
- 🧪 **test-driven-development** - For each feature test
- 🚀 **dispatching-parallel-agents** - Code audit (Phase 3)
- 📊 **executing-plans** - Batch execution framework
- 📝 **technical-writer** - README creation (Phase 4)
- 🎨 **mermaid-expert** - Architecture diagrams
- ♻️ **refactoring-expert** - Dead code removal

### SITREP Protocol

**Required**: Situation Report before/after EVERY task.

**Format**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITREP: Task X.Y - [Task Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEFORE:
- Current State: [description]
- Test Target: [what testing]
- Expected: [what should happen]

EXECUTION:
- Actions: [what was done]
- Observed: [what happened]

VERIFICATION:
- Chrome DevTools: [network/console check]
- Database: [query results]
- Frontend: [UI state]

STATUS: ✅ PASS / ❌ FAIL / ⚠️ ISSUE

[IF FAIL]
- Bug: [description]
- Root Cause: [analysis using systematic-debugging skill]
- Fix: [code changes]
- Rebuild: ✅ Required
- Retest Plan: Restart from Task X.1

AFTER:
- New State: [description]
- Evidence: [screenshot, log]
- Next: [Task X.Y+1 or restart point]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phase 0: Preparation & Validation

**Type**: Infrastructure
**Duration**: 30-45 minutes
**Complexity**: 0.3/1.0 (SIMPLE)

---

### Task 0.1: Clean Rebuild (15 min)

**🗺️ PROJECT PLANNING**:
- Duration: 15 minutes
- Dependencies: None
- Risk: LOW
- Parallel: No

**Steps**:
```bash
# 1. Stop containers
docker-compose down

# 2. Remove cached images
docker-compose build --no-cache web

# 3. Start fresh
docker-compose up -d

# 4. Wait for health
sleep 10
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}
```

**🤖 TASK AUTOMATION**:
Create script: `scripts/clean-rebuild.sh`

**VERIFICATION**:
- Docker: 3 containers healthy
- API: Health endpoint returns ok
- TypeScript: 0 errors (4 acceptable in performanceMonitor.ts)
- Server logs: No errors on startup

**SITREP**: Report container status, API health, any startup errors

---

### Task 0.2: Validate Session 3 Fixes (15 min)

**🧪 TEST-DRIVEN DEVELOPMENT**:
- Test: Submit resource form loads
- Test: Bookmark buttons visible
- Test: Pending edits shows empty state
- Test: Admin sidebar has 6 items (not 10)

**Chrome DevTools MCP Testing**:
```typescript
// 1. Submit Resource
await mcp__chrome-devtools__navigate_page({ type: 'url', url: 'http://localhost:3000/submit' });
const snapshot = await mcp__chrome-devtools__take_snapshot();
// Verify: Form fields present (not "Loading...")
// Look for: textbox "Title", textbox "URL", combobox "Category"

// 2. Bookmark Buttons
await mcp__chrome-devtools__navigate_page({ type: 'url', url: 'http://localhost:3000/category/intro-learning' });
const snapshot = await mcp__chrome-devtools__take_snapshot();
// Verify: ResourceCard components (not inline Card)
// Look for: Bookmark icons, Favorite icons on cards

// 3. Pending Edits
await mcp__chrome-devtools__navigate_page({ type: 'url', url: 'http://localhost:3000/admin/edits' });
const snapshot = await mcp__chrome-devtools__take_snapshot();
// Verify: Empty state "All Caught Up!" (not loading skeletons)

// 4. Admin Sidebar
await mcp__chrome-devtools__navigate_page({ type: 'url', url: 'http://localhost:3000/admin' });
const snapshot = await mcp__chrome-devtools__take_snapshot();
// Count navigation items (should be 6)
```

**Expected Outcomes**:
- ✅ Submit form loads with category dropdown
- ✅ Bookmark/favorite buttons visible on resource cards
- ✅ Pending edits shows empty state
- ✅ Sidebar has 6 navigation items

**IF ANY FAIL**:
1. Use **systematic-debugging skill**
2. Identify root cause
3. Fix immediately
4. Rebuild
5. Restart Task 0.2

**SITREP**: Report which fixes validated, any issues found

---

### Task 0.3: Create Testing Checklist (10 min)

**🗺️ PROJECT PLANNING**:
Create comprehensive checklist for Phase 1-2 testing

**Checklist Structure**:
```markdown
# Session 4 Testing Checklist

## Admin Feature Tests (Chrome DevTools MCP)
- [ ] 1.1 Bulk Archive (3 resources)
- [ ] 1.2 Bulk Approve (3 pending resources)
- [ ] 1.3 Bulk Reject (3 pending resources)
- [ ] 1.4 Bulk Tag Assignment
- [ ] 1.5 Resource Editing (open modal, edit, save, verify)
- [ ] 1.6 Status Filter (pending, approved, rejected)
- [ ] 1.7 Category Filter (Encoding & Codecs)
- [ ] 1.8 Search Filter (text: "ffmpeg")
- [ ] 1.9 Combined Filters
- [ ] 1.10 Sort by Title (A-Z, Z-A)
- [ ] 1.11 Sort by Category
- [ ] 1.12 Sort by Status
- [ ] 1.13 Sort by Last Modified
- [ ] 1.14 Pagination Next
- [ ] 1.15 Pagination Previous
- [ ] 1.16 Direct Page Navigation

## User Feature Tests (Chrome DevTools MCP)
- [ ] 2.1 Add Bookmark
- [ ] 2.2 Remove Bookmark
- [ ] 2.3 Add Bookmark Notes
- [ ] 2.4 View Bookmarks Page
- [ ] 2.5 Add Favorite
- [ ] 2.6 Remove Favorite
- [ ] 2.7 View Profile (favorites shown)
- [ ] 2.8 Submit Resource
- [ ] 2.9 View Submission Status
- [ ] 2.10 Enroll in Journey (if seeded)

## Multi-Role Workflows
- [ ] 3.1 Anonymous: Browse → View → Redirect to login on protected
- [ ] 3.2 User: Login → Bookmark → Submit → View Profile
- [ ] 3.3 Admin: Login → Approve → Edit → Verify Public
- [ ] 3.4 Permission Test: User attempts /admin (blocked)

## Integration Flows
- [ ] 4.1 Admin edits resource → Verify on category page
- [ ] 4.2 Admin archives → Verify removed from public
- [ ] 4.3 User submits → Admin approves → Verify public
- [ ] 4.4 User bookmarks → Verify persists after logout/login
```

**File**: `tests/SESSION_4_TESTING_CHECKLIST.md`

**SITREP**: Checklist created with X items

---

## Phase 1: Complete Functional Validation

**Type**: Testing (Iterative with Immediate Fixes)
**Duration**: 5-7 hours
**Complexity**: 0.8/1.0 (COMPLEX)
**MCP**: Chrome DevTools (primary), Supabase (verification)
**Skills**: systematic-debugging, test-driven-development

---

### Section 1A: Admin Bulk Operations (2-3 hours)

**🔧 MCP**: Chrome DevTools MCP for all tests
**🧪 TDD**: Each test is a specification of expected behavior

---

#### Task 1.1: Test Bulk Archive (30 min)

**🗺️ PROJECT PLANNING**:
- Duration: 30 minutes
- Dependencies: Task 0.2 (fixes validated)
- Skills: systematic-debugging (if bugs found)
- Parallel: No (sequential testing)
- Risk: HIGH (complex transactional logic)
- Automation: Create reusable test script

**SITREP BEFORE**:
- Current State: Admin logged in, on /admin/resources
- Test Target: Bulk archive 3 resources
- Expected: Resources status → 'archived', audit logs created

**Test Steps (Chrome DevTools MCP)**:
```typescript
// 1. Navigate to resource browser
await mcp__chrome-devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:3000/admin/resources'
});

// 2. Get snapshot to find element UIDs
const snapshot1 = await mcp__chrome-devtools__take_snapshot();
// Note UIDs of first 3 checkboxes (e.g., uid=X_80, X_87, X_94)
// Note resource IDs from snapshot (e.g., "E2E Test FFmpeg", "Eyevinn Streaming")

// 3. Select 3 resources
await mcp__chrome-devtools__click({ uid: 'X_80' }); // Resource 1
await mcp__chrome-devtools__click({ uid: 'X_87' }); // Resource 2
await mcp__chrome-devtools__click({ uid: 'X_94' }); // Resource 3

// 4. Get snapshot to verify selection and find Archive button
const snapshot2 = await mcp__chrome-devtools__take_snapshot();
// Verify: "3 resources selected" text
// Find Archive button UID (e.g., uid=X_79)

// 5. Click Archive button
await mcp__chrome-devtools__click({ uid: 'X_79' });

// 6. Get snapshot of confirmation dialog
const snapshot3 = await mcp__chrome-devtools__take_snapshot();
// Verify: Dialog with "Archive 3 Resources?"
// Find confirm button (e.g., uid=dialog_confirm)

// 7. Confirm archive
await mcp__chrome-devtools__click({ uid: 'dialog_confirm' });

// 8. Wait for network request
const requests = await mcp__chrome-devtools__list_network_requests({ resourceTypes: ['xhr', 'fetch'] });
// Find: POST /api/admin/resources/bulk
// Verify: Status 200 OK
// Check request body: {"action":"archive","resourceIds":[...]}

// 9. Check console for errors
const messages = await mcp__chrome-devtools__list_console_messages({ types: ['error'] });
// Verify: No errors

// 10. Take screenshot
await mcp__chrome-devtools__take_screenshot({ filePath: '/tmp/bulk-archive-success.png' });

// 11. Verify table refreshed
const snapshot4 = await mcp__chrome-devtools__take_snapshot();
// Verify: Selection cleared, resources no longer in list OR status shows 'archived'
```

**Database Verification** (PostgreSQL):
```sql
-- Get the 3 resource IDs from snapshot
-- Then verify status changed

SELECT id, title, status, updated_at
FROM resources
WHERE id IN (
  'resource-uuid-1',
  'resource-uuid-2',
  'resource-uuid-3'
)
ORDER BY title;

-- Expected: All 3 have status = 'archived'

-- Verify audit logs created
SELECT resource_id, action, performed_by, created_at
FROM resource_audit_log
WHERE resource_id IN (...)
ORDER BY created_at DESC;

-- Expected: 3 entries with action containing 'archive'
```

**Expected Outcomes**:
- ✅ Bulk toolbar appears on selection
- ✅ Archive button triggers confirmation dialog
- ✅ POST /api/admin/resources/bulk → 200 OK
- ✅ Database: 3 resources status='archived'
- ✅ Audit log: 3 entries created
- ✅ UI: Table refreshes, selection cleared
- ✅ Toast: "Bulk action completed successfully"

**IF BUG FOUND**:
1. **🔍 INVOKE**: systematic-debugging skill
2. Document bug with screenshot
3. Identify root cause
4. Apply fix
5. Rebuild: `docker-compose restart web`
6. **🔄 RESTART**: Go back to Task 1.1 (retest bulk archive)
7. Continue only when Task 1.1 passes

**SITREP AFTER**:
- Status: ✅ PASS / ❌ FAIL
- Bulk Archive: [Working/Fixed/Issue]
- Evidence: /tmp/bulk-archive-success.png
- Database: [Query results]
- Next: Task 1.2 or restart

**🤖 AUTOMATION**:
Save test as: `tests/automated/bulk-archive.mcp.js`

---

#### Task 1.2: Test Bulk Approve (30 min)

**Prerequisites**: Need pending resources to approve

**🗺️ PROJECT PLANNING**:
- Duration: 30 minutes (includes creating test data)
- Dependencies: Task 1.1 PASS
- Skills: systematic-debugging
- Parallel: No
- Risk: HIGH

**Setup**: Create 3 pending resources first

**Test Steps**:
```sql
-- Create test resources via SQL
INSERT INTO resources (title, url, description, category, status, submitted_by)
VALUES
  ('Test Resource for Bulk Approve 1', 'https://example.com/test1', 'Test description 1', 'General Tools', 'pending', (SELECT id FROM auth.users WHERE email='testuser@example.com')),
  ('Test Resource for Bulk Approve 2', 'https://example.com/test2', 'Test description 2', 'General Tools', 'pending', (SELECT id FROM auth.users WHERE email='testuser@example.com')),
  ('Test Resource for Bulk Approve 3', 'https://example.com/test3', 'Test description 3', 'General Tools', 'pending', (SELECT id FROM auth.users WHERE email='testuser@example.com'))
RETURNING id, title;
-- Note the returned IDs
```

**Chrome DevTools MCP**:
```typescript
// Similar pattern to Task 1.1 but:
// 1. Filter by status='pending' first to find test resources
// 2. Select the 3 test resources
// 3. Click Approve button
// 4. Verify POST /api/admin/resources/bulk with action='approve'
// 5. Verify database: status='approved', approved_by set, approved_at set
```

**Verification SQL**:
```sql
SELECT id, title, status, approved_by, approved_at
FROM resources
WHERE id IN (...);

-- Expected:
-- status = 'approved'
-- approved_by = admin user UUID
-- approved_at = recent timestamp
```

**IF BUG**: Use systematic-debugging, fix, rebuild, restart from Task 1.1

**SITREP**: Results, evidence, next step

---

#### Task 1.3: Test Bulk Reject (30 min)

**🗺️ PROJECT PLANNING**:
- Duration: 30 minutes
- Dependencies: Tasks 1.1-1.2 PASS
- Skills: systematic-debugging
- Parallel: No
- Risk: HIGH

**Similar to 1.2** but:
- Action: 'reject'
- Expected: status='rejected'

**Additional Verification**:
- Audit log includes rejection reason
- Resources not visible in public category pages

**IF BUG**: Fix immediately, restart from Task 1.1

---

#### Task 1.4: Test Bulk Tag Assignment (30 min)

**Test**:
- Select 3 approved resources
- Click "Add Tags" button
- Enter tags: "test-tag-1, test-tag-2, validated"
- Save
- Verify tags created in tags table
- Verify resource_tags junction entries

**Database Verification**:
```sql
-- Verify tags created
SELECT id, name, slug FROM tags
WHERE name IN ('test-tag-1', 'test-tag-2', 'validated');

-- Verify junctions
SELECT rt.resource_id, t.name
FROM resource_tags rt
JOIN tags t ON rt.tag_id = t.id
WHERE rt.resource_id IN (...);

-- Expected: 9 rows (3 resources × 3 tags)
```

**IF BUG**: Fix, rebuild, restart Phase 1

**SITREP**: Tag creation results

---

#### Task 1.5: Test Resource Editing (45 min)

**🗺️ PROJECT PLANNING**:
- Duration: 45 minutes
- Dependencies: Previous tasks PASS
- Skills: systematic-debugging
- Risk: HIGH (modal interactions complex)

**🧪 TDD Specification**:
- GIVEN: A resource exists in database
- WHEN: Admin opens edit modal, changes description, saves
- THEN: Database updates, frontend shows new description

**Chrome DevTools MCP**:
```typescript
// 1. Navigate to resources
await mcp__chrome-devtools__navigate_page({ type: 'url', url: 'http://localhost:3000/admin/resources' });

// 2. Get snapshot
const snapshot = await mcp__chrome-devtools__take_snapshot();
// Find "Open menu" button for first resource (e.g., uid=X_86)
// Note resource ID and current description

// 3. Open dropdown menu
await mcp__chrome-devtools__click({ uid: 'X_86' });

// 4. Get snapshot of menu
const menuSnapshot = await mcp__chrome-devtools__take_snapshot();
// Find "Edit" menu item (e.g., uid=menu_edit)

// 5. Click Edit
await mcp__chrome-devtools__click({ uid: 'menu_edit' });

// 6. Wait for modal
await mcp__chrome-devtools__wait_for({ text: 'Edit Resource', timeout: 3000 });

// 7. Get modal snapshot
const modalSnapshot = await mcp__chrome-devtools__take_snapshot();
// Verify: textbox with current description
// Find description field UID

// 8. Change description
await mcp__chrome-devtools__fill({
  uid: 'description_field_uid',
  value: 'Updated via Chrome DevTools MCP testing - Session 4'
});

// 9. Click Save
await mcp__chrome-devtools__click({ uid: 'save_button_uid' });

// 10. Wait for success
await mcp__chrome-devtools__wait_for({ text: 'Success', timeout: 3000 });

// 11. Verify network request
const requests = await mcp__chrome-devtools__list_network_requests({ resourceTypes: ['xhr', 'fetch'] });
// Find: PUT /api/admin/resources/:id
// Verify: 200 OK
// Check body: {"description":"Updated via..."}

// 12. Screenshot
await mcp__chrome-devtools__take_screenshot({ filePath: '/tmp/resource-edit-success.png' });
```

**Database Verification**:
```sql
SELECT id, description, updated_at
FROM resources
WHERE id = 'resource-uuid';

-- Expected: description = 'Updated via Chrome DevTools MCP testing - Session 4'
-- Expected: updated_at = recent timestamp (within last minute)
```

**Frontend Verification**:
```typescript
// Navigate to category page where resource appears
await mcp__chrome-devtools__navigate_page({ type: 'url', url: 'http://localhost:3000/category/[category-slug]' });

// Find resource card
const categorySnapshot = await mcp__chrome-devtools__take_snapshot();
// Verify: Card shows updated description
```

**Expected Outcomes**:
- ✅ Menu opens on click
- ✅ Edit option present
- ✅ Modal opens with pre-filled data
- ✅ Save triggers PUT request
- ✅ Database updates
- ✅ Frontend shows new description

**IF BUG**: Fix immediately, rebuild, restart from Task 1.1

**SITREP**: Editing workflow status, evidence

---

### Section 1B: Filtering & Search (1.5 hours)

#### Task 1.6: Test Status Filter (20 min)

**Chrome DevTools MCP**:
```typescript
// 1. On /admin/resources
const snapshot = await mcp__chrome-devtools__take_snapshot();
// Find Status combobox UID

// 2. Click dropdown
await mcp__chrome-devtools__click({ uid: 'status_dropdown_uid' });

// 3. Get dropdown options
const dropdownSnapshot = await mcp__chrome-devtools__take_snapshot();
// Verify options: All Statuses, Pending, Approved, Rejected, Archived

// 4. Select "Approved"
await mcp__chrome-devtools__click({ uid: 'approved_option_uid' });

// 5. Wait for table refresh
await mcp__chrome-devtools__wait_for({ text: 'approved', timeout: 3000 });

// 6. Verify network request
const requests = await mcp__chrome-devtools__list_network_requests();
// Find: GET /api/admin/resources?status=approved&page=1&limit=20
// Verify: 200 OK

// 7. Verify results
const resultsSnapshot = await mcp__chrome-devtools__take_snapshot();
// Check: All visible resources have status badge "approved"
// Count resources (should be 20 or fewer)

// 8. Screenshot
await mcp__chrome-devtools__take_screenshot({ filePath: '/tmp/filter-status-approved.png' });
```

**Expected**:
- Dropdown opens
- Selecting "Approved" filters table
- API called with ?status=approved
- Only approved resources shown

**IF BUG**: Fix, rebuild, restart Phase 1

**SITREP**: Filter functionality status

---

#### Task 1.7: Test Category Filter (20 min)

**Similar pattern** but test category dropdown.

**Expected**:
- GET /api/admin/resources?category=Encoding+%26+Codecs
- Only resources from that category shown

---

#### Task 1.8: Test Search Filter (25 min)

**Test debouncing**: Type "ffmpeg", wait 300ms, verify API call

**Chrome DevTools MCP**:
```typescript
// 1. Get search input UID
const snapshot = await mcp__chrome-devtools__take_snapshot();

// 2. Click search input
await mcp__chrome-devtools__click({ uid: 'search_input_uid' });

// 3. Type search query
await mcp__chrome-devtools__fill({ uid: 'search_input_uid', value: 'ffmpeg' });

// 4. Wait 500ms (debounce + network)
await new Promise(resolve => setTimeout(resolve, 500));

// 5. Verify network request
const requests = await mcp__chrome-devtools__list_network_requests();
// Find: GET /api/admin/resources?search=ffmpeg
// Verify: Only 1 request (debounce worked)

// 6. Verify results
const resultsSnapshot = await mcp__chrome-devtools__take_snapshot();
// Check: Resources with "ffmpeg" in title or description
```

**Expected**:
- 300ms debounce working
- Full-text search across title, description, URL
- Results filtered correctly

**IF BUG**: Fix debounce, rebuild, restart

---

#### Task 1.9: Test Combined Filters (15 min)

**Test**: Status=approved AND Category=Encoding AND Search=ffmpeg

**Expected**: All 3 filters applied simultaneously

---

### Section 1C: Sorting & Pagination (1 hour)

#### Task 1.10: Test Sort by Title (15 min)

**Chrome DevTools MCP**:
```typescript
// Click "Title" column header
await mcp__chrome-devtools__click({ uid: 'title_header_uid' });

// Verify sort indicator (up/down arrow)
const snapshot = await mcp__chrome-devtools__take_snapshot();

// Verify alphabetical order
// First resource title should be alphabetically first
```

**Expected**:
- Column header clickable
- Sort indicator appears
- Resources sorted A-Z
- Click again → Z-A

**IF BUG**: Fix, rebuild, restart

---

#### Task 1.11-1.13: Test Other Column Sorts (30 min)

Test Category, Status, Last Modified columns.

---

#### Task 1.14: Test Pagination Next (20 min)

**Chrome DevTools MCP**:
```typescript
// 1. Note resources on page 1
const page1Resources = [...]; // from snapshot

// 2. Click Next
await mcp__chrome-devtools__click({ uid: 'next_button_uid' });

// 3. Wait for page change
await mcp__chrome-devtools__wait_for({ text: 'Page 2', timeout: 3000 });

// 4. Get snapshot
const page2Snapshot = await mcp__chrome-devtools__take_snapshot();

// 5. Verify different resources
// Resources on page 2 should NOT match page 1

// 6. Verify network request
const requests = await mcp__chrome-devtools__list_network_requests();
// Find: GET /api/admin/resources?page=2&limit=20
```

**Expected**:
- Next button works
- Page 2 loads different resources
- API fetches correct page
- Previous button becomes enabled

**IF BUG**: Fix, rebuild, restart

---

### Section 1D: User Features (2 hours)

**🔧 MCP**: Chrome DevTools MCP
**Role**: Regular user (not admin)

---

#### Task 1.15: Test Bookmark Add/Remove (30 min)

**🗺️ PROJECT PLANNING**:
- Duration: 30 minutes
- Role: Regular user
- Dependencies: ResourceCard fix validated
- Skills: systematic-debugging

**Chrome DevTools MCP**:
```typescript
// 1. Login as regular user
await mcp__chrome-devtools__navigate_page({ type: 'url', url: 'http://localhost:3000/login' });
// Fill email/password, submit
// Verify redirect to homepage

// 2. Navigate to category
await mcp__chrome-devtools__navigate_page({ type: 'url', url: 'http://localhost:3000/category/intro-learning' });

// 3. Get snapshot
const snapshot = await mcp__chrome-devtools__take_snapshot();
// Find bookmark button on first resource card
// Look for: button with Bookmark icon or aria-label containing "ookmark"

// 4. Click bookmark button
await mcp__chrome-devtools__click({ uid: 'bookmark_button_uid' });

// 5. Wait for toast
await mcp__chrome-devtools__wait_for({ text: 'Added to bookmarks', timeout: 2000 });

// 6. Verify network
const requests = await mcp__chrome-devtools__list_network_requests();
// Find: POST /api/bookmarks/:resourceId
// Verify: 200 OK or 201 Created

// 7. Navigate to bookmarks page
await mcp__chrome-devtools__navigate_page({ type: 'url', url: 'http://localhost:3000/bookmarks' });

// 8. Verify bookmark appears
const bookmarksSnapshot = await mcp__chrome-devtools__take_snapshot();
// Find bookmarked resource in list

// 9. Screenshot
await mcp__chrome-devtools__take_screenshot({ filePath: '/tmp/bookmark-added.png' });
```

**Database Verification**:
```sql
SELECT user_id, resource_id, notes, created_at
FROM user_bookmarks
WHERE user_id = (SELECT id FROM auth.users WHERE email='testuser@example.com')
  AND resource_id = 'resource-uuid';

-- Expected: 1 row
```

**Expected**:
- Button visible and clickable
- Toast confirmation
- API call succeeds
- Database row created
- Bookmark appears on /bookmarks page

**IF BUG**: Fix immediately, rebuild, restart from Task 1.1

**SITREP**: Bookmark functionality status

---

#### Task 1.16: Test Favorite Add/Remove (20 min)

**Similar to bookmarks** but simpler (no notes field).

**Verify**:
- Star icon visible
- Click → filled star
- POST /api/favorites/:resourceId
- Database: user_favorites row created
- Profile page shows favorite

---

#### Task 1.17: Test Resource Submission Flow (40 min)

**Complete E2E Test**:
1. Navigate to /submit
2. Verify form loads (categories populated)
3. Fill all fields
4. Submit
5. Verify pending resource created
6. Login as admin
7. Navigate to /admin/approvals
8. Approve the resource
9. Verify appears on public category page

**This tests the full submission → approval → publication workflow.**

**IF ANY STEP FAILS**: Fix, rebuild, restart entire Task 1.17

---

## Phase 2: Multi-Role Testing

**Type**: Permission & Workflow Validation
**Duration**: 2-3 hours
**Complexity**: 0.7/1.0 (COMPLEX)

---

### Task 2.1: Anonymous User Complete Workflow (30 min)

**🔧 MCP**: Chrome DevTools MCP
**Role**: Not logged in

**Workflow**:
```
1. Browse homepage
   - Verify: 9 categories visible
   - Verify: Can click and view resources

2. Navigate to category
   - Verify: Resources visible
   - Verify: Can view resource details

3. Attempt protected action
   - Try to navigate to /submit
   - Expected: Redirect to /login OR auth required message

4. Try to access admin
   - Navigate to /admin
   - Expected: Redirect to /login OR 403

5. Try to bookmark (if button visible)
   - Click bookmark
   - Expected: Prompt to login OR no-op
```

**Verification**:
- Anonymous CAN browse public content
- Anonymous CANNOT submit resources
- Anonymous CANNOT access admin
- Anonymous CANNOT bookmark/favorite

**SITREP**: Anonymous user permissions validated

---

### Task 2.2: Regular User Complete Workflow (45 min)

**Role**: testuser@example.com (NOT admin)

**Workflow**:
```
1. Login
2. Browse and bookmark resource
3. Add favorite
4. Submit new resource
5. View profile (shows favorites)
6. View bookmarks page (shows bookmarked items)
7. Try to access /admin
   - Expected: 403 Forbidden OR redirect
8. Try to access /admin/resources
   - Expected: Blocked
```

**Verification**:
- User CAN bookmark/favorite
- User CAN submit resources
- User CANNOT access admin routes

**IF PERMISSION BUG**: Fix AuthGuard/AdminGuard, rebuild, retest

---

### Task 2.3: Admin User Complete Workflow (60 min)

**Role**: admin@test.com

**Complete Admin Workflow**:
```
1. Login as admin
2. View dashboard (stats)
3. Navigate to resource browser
4. Edit a resource
5. Approve pending resource
6. Use bulk operations
7. Start AI enrichment job
8. View GitHub sync panel
9. Verify all actions work
10. Logout
```

**This is comprehensive admin smoke test.**

**SITREP**: Admin workflow complete validation

---

### Task 2.4: Permission Boundary Testing (30 min)

**Explicit Permission Tests**:
```sql
-- Verify RLS policies

-- Test 1: User cannot see other users' bookmarks
-- Login as user1, bookmark resource
-- Login as user2, query:
SELECT * FROM user_bookmarks WHERE resource_id = 'bookmark-resource-id';
-- Expected: user2 sees NO results (RLS blocks)

-- Test 2: Non-admin cannot call admin endpoints
-- Get user JWT token
-- curl with user token:
curl -H "Authorization: Bearer $USER_TOKEN" http://localhost:3000/api/admin/stats
-- Expected: 403 Forbidden

-- Test 3: Admin can see all data
-- Verify admin can query any user's data via admin endpoints
```

**Validation**:
- RLS enforced on user tables
- Admin endpoints require admin role
- Users isolated from each other's data

**IF SECURITY BUG**: CRITICAL - Fix immediately, full security retest

---

## Phase 3: Code Audit & Dead Code Removal

**Type**: Code Quality & Cleanup
**Duration**: 2-3 hours
**Complexity**: 0.5/1.0 (MODERATE)
**Approach**: Parallel Agents

---

### Task 3.1: Dispatch Code Audit Agents (10 min)

**🚀 PARALLEL AGENTS**: Dispatch 4 concurrent agents

**Agent 1**: Backend Audit
```
Prompt: Audit server/ directory for dead code.

Task:
1. Read all files in server/ completely
2. Find unused functions, imports, routes
3. Find duplicate code
4. Find commented code blocks
5. Find console.log that should be removed
6. Create list of dead code to remove

Return: Markdown report with file:line references
```

**Agent 2**: Component Audit
```
Prompt: Audit client/src/components/ for dead code.

Task:
1. Read all component files
2. Find unused components
3. Find unused imports
4. Find duplicate utility functions
5. Find commented JSX
6. Create removal list

Return: Markdown report
```

**Agent 3**: Pages Audit
```
Prompt: Audit client/src/pages/ for dead code.

Similar to Agent 2 but for page components.
```

**Agent 4**: Types & Interfaces Audit
```
Prompt: Audit shared/schema.ts and types for unused.

Task:
1. Find unused type definitions
2. Find duplicate interfaces
3. Verify all schema tables are used
4. Create cleanup list
```

**Dispatch Command**:
```
Use dispatching-parallel-agents skill with 4 agents
Wait for all 4 to complete
Consolidate findings
```

**SITREP**: 4 agents dispatched, awaiting results

---

### Task 3.2: Review & Consolidate Findings (20 min)

**Merge agent reports**:
- Dead code count by agent
- Duplicate code instances
- Unused imports total
- Commented code blocks

**Create master cleanup list**

---

### Task 3.3: Remove Dead Code (60 min)

**Systematic Removal**:
```
For each dead code item:
1. Verify truly unused (grep for references)
2. Remove code
3. Run TypeScript check
4. If errors: Revert, mark as "actually used"
5. Continue to next item

After all removals:
- Run full TypeScript check
- Run build
- Verify application still works
```

**🤖 AUTOMATION**:
Create script to remove unused imports automatically.

**Expected Cleanup**:
- 50-100 unused imports removed
- 10-20 unused functions removed
- Commented code blocks removed
- Duplicate code consolidated

**SITREP**: Lines removed, errors encountered, final status

---

### Task 3.4: Organize Imports (30 min)

**Pattern**:
```typescript
// 1. External packages
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal (@/ imports)
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// 3. Relative imports
import { localHelper } from './utils';

// 4. Types
import type { Resource } from '@shared/schema';
```

**Apply to all files** using refactoring-expert agent.

---

## Phase 4: Comprehensive Documentation

**Type**: Documentation
**Duration**: 3-4 hours
**Complexity**: 0.6/1.0 (MODERATE-COMPLEX)
**Approach**: Parallel Agents + Manual Review

---

### Task 4.1: Create Architecture Diagrams (60 min)

**🚀 PARALLEL**: Dispatch 2 agents

**Agent 1**: System Architecture Diagram
```
Create Mermaid diagram showing:
- Client (React + Vite)
- Server (Express + Node.js)
- Database (Supabase PostgreSQL)
- External services (Anthropic Claude API)
- Data flow arrows
- Authentication flow
```

**Agent 2**: Component Hierarchy Diagram
```
Create Mermaid diagram showing:
- App.tsx (root)
- MainLayout
- Routes (public vs protected vs admin)
- Major components
- Shared components (shadcn/ui)
```

**Diagrams to Create**:
1. System architecture (infrastructure)
2. Component hierarchy (frontend)
3. Data flow (user action → API → DB → UI)
4. Authentication flow (login → JWT → requests)
5. Database schema (ERD with relationships)

**🤖 AUTOMATION**: Use mermaid-expert agent or technical-writer

**Output**: Save diagrams in `docs/diagrams/` directory

---

### Task 4.2: Database Schema Documentation (60 min)

**🚀 PARALLEL**: Use technical-writer agent

**Create**: `docs/DATABASE_SCHEMA.md`

**Content**:
```markdown
# Database Schema Documentation

## Overview
- PostgreSQL 15.0
- Hosted: Supabase Cloud
- Project: jeyldoypdkgsrfdhdcmm
- Tables: 16
- Resources: 2,644

## Table Relationships (ERD)

[Mermaid ERD diagram]

## Core Tables

### resources
**Purpose**: Main resource catalog

**Schema**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default uuid_generate_v4() | Unique identifier |
| title | text | NOT NULL | Resource name |
| url | text | NOT NULL | HTTPS URL |
| description | text | NOT NULL, default '' | Full description |
| category | text | NOT NULL | Category name |
| subcategory | text | NULL | Optional subcategory |
| sub_subcategory | text | NULL | Optional sub-subcategory |
| status | text | CHECK, default 'approved' | pending/approved/rejected/archived |
| submitted_by | uuid | FK → auth.users, ON DELETE SET NULL | Submitter |
| approved_by | uuid | FK → auth.users | Approver |
| approved_at | timestamptz | NULL | Approval timestamp |
| github_synced | boolean | default false | Sync status |
| metadata | jsonb | default '{}' | Additional data |
| search_vector | tsvector | auto-generated | Full-text search |
| created_at | timestamptz | default now() | Creation time |
| updated_at | timestamptz | default now() | Last update |

**Indexes**:
- resources_pkey (id)
- idx_resources_status (status)
- idx_resources_category (category)
- idx_resources_status_category (status, category)
- idx_resources_search GIN (search_vector)
- idx_resources_submitted_by (submitted_by)

**Relationships**:
- submitted_by → auth.users(id)
- approved_by → auth.users(id)
- ← user_favorites(resource_id)
- ← user_bookmarks(resource_id)
- ← resource_tags(resource_id)
- ← journey_steps(resource_id)

**Sample Queries**:
```sql
-- Get all approved resources in a category
SELECT id, title, description, url
FROM resources
WHERE status = 'approved'
  AND category = 'Encoding & Codecs'
ORDER BY created_at DESC
LIMIT 20;

-- Full-text search
SELECT id, title, ts_rank(search_vector, query) as rank
FROM resources, plainto_tsquery('english', 'ffmpeg') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;

-- Get resource with all relationships
SELECT
  r.*,
  u_submitted.email as submitted_by_email,
  u_approved.email as approved_by_email,
  array_agg(DISTINCT t.name) as tags
FROM resources r
LEFT JOIN auth.users u_submitted ON r.submitted_by = u_submitted.id
LEFT JOIN auth.users u_approved ON r.approved_by = u_approved.id
LEFT JOIN resource_tags rt ON r.id = rt.resource_id
LEFT JOIN tags t ON rt.tag_id = t.id
WHERE r.id = 'resource-uuid'
GROUP BY r.id, u_submitted.email, u_approved.email;
```
```

**Repeat for all 16 tables** with similar detail.

**SITREP**: Database documentation complete

---

### Task 4.3: Create Comprehensive README (90 min)

**🚀 PARALLEL**: Use technical-writer agent

**Structure**:
```markdown
# Awesome Video Resources

[Badges: License, TypeScript, React, Supabase, Docker, Build Status]

## Overview

**What**: Curated platform for discovering 2,600+ video development resources
**Why**: Centralized catalog with AI-powered recommendations and learning paths
**Who**: Developers working with video streaming, encoding, players, infrastructure

## Features

### For Users
- 📚 Browse 2,644 curated resources across 9 categories
- 🔖 Bookmark favorite resources with notes
- ⭐ Mark favorites for quick access
- 🎓 Follow AI-generated learning journeys
- 🔍 Full-text search across all resources
- 🎯 Personalized recommendations

### For Admins
- 📊 Dashboard with real-time statistics
- 🗂️ Resource management (CRUD + bulk operations)
- ✅ Approval workflows for user submissions
- 🤖 AI-powered batch enrichment (metadata, tags)
- 🔄 Bidirectional GitHub sync (import/export)
- 📝 Edit suggestion review

### For Developers
- 🐳 Docker deployment ready
- 🧪 68 E2E tests included
- 📖 Comprehensive documentation (18k+ lines)
- 🔐 Security hardened (B+ rating)
- ⚡ Performance optimized (1.36ms queries)
- 🏗️ Modern tech stack (React 18, Supabase, TypeScript)

## Screenshots

[Screenshots of: Homepage, Category page, Admin dashboard, Resource browser]

## Architecture

### System Architecture

[Mermaid diagram from Task 4.1]

### Technology Stack

**Frontend**:
- React 18.3 with TypeScript
- Vite 5.4 (build tool)
- TanStack Query v5 (data fetching)
- Wouter (routing)
- shadcn/ui + Radix UI (components)
- Tailwind CSS v4 (styling)

**Backend**:
- Node.js 20
- Express.js
- Drizzle ORM
- Anthropic Claude API (AI features)

**Database**:
- PostgreSQL 15 (Supabase)
- 16 tables
- 40+ indexes
- Row-Level Security enabled

**Infrastructure**:
- Docker + Docker Compose
- Nginx (reverse proxy, rate limiting)
- Redis 7 (caching)

### Data Flow

[Mermaid diagram showing: User action → API → Database → UI update]

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop
- Supabase account
- Anthropic API key (optional, for AI features)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd awesome-list-site

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Configuration

#### Supabase Setup

1. Create Supabase project at https://supabase.com
2. Get credentials from Settings → API:
   - Project URL
   - Anon key
   - Service role key

3. Add to `.env`:
```env
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@...
```

4. Run migrations:
```bash
# Via Supabase CLI
supabase db push

# OR apply SQL files manually via Supabase dashboard
# Files in: supabase/migrations/
```

5. Create admin user (see: docs/CREATE_ADMIN_USER.md)

#### GitHub Token (for sync features)
```env
GITHUB_TOKEN=ghp_...
```

#### Anthropic API (for AI features)
```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Running Locally

**Development**:
```bash
# Terminal 1: Start Docker services
docker-compose up

# Terminal 2: Development mode (if not using Docker)
npm run dev

# Open http://localhost:3000
```

**Production**:
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f web

# Health check
curl http://localhost:3000/api/health
```

## Database Schema

[Link to DATABASE_SCHEMA.md]

**Quick Reference**:
- **16 tables**: resources, categories, users, bookmarks, etc.
- **Primary Keys**: UUID (uuid_generate_v4())
- **Search**: Full-text via pg_trgm + tsvector
- **Audit**: resource_audit_log tracks all changes

### Key Tables

**resources**: 2,644 video development resources
**categories**: 9 top-level categories
**user_bookmarks**: User saved resources with notes
**user_favorites**: User starred resources
**learning_journeys**: Structured learning paths
**enrichment_jobs**: AI batch processing jobs

[See DATABASE_SCHEMA.md for complete schema with relationships]

## Development

### Project Structure

```
awesome-list-site/
├── client/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/  # UI components
│   │   │   ├── admin/   # Admin-specific (13 components)
│   │   │   ├── resource/# Resource cards, bookmark/favorite buttons
│   │   │   └── ui/      # shadcn/ui components (50+)
│   │   ├── pages/       # Route pages (15 pages)
│   │   ├── hooks/       # React hooks (useAuth, etc.)
│   │   ├── lib/         # Utilities, API client
│   │   └── types/       # TypeScript definitions
│   └── index.html       # Entry point
├── server/              # Backend (Express)
│   ├── routes.ts        # 70+ API endpoints
│   ├── storage.ts       # Database layer (Drizzle ORM)
│   ├── ai/              # Claude AI integration (7 files)
│   ├── github/          # GitHub sync (4 files)
│   └── supabaseAuth.ts  # Authentication middleware
├── shared/
│   └── schema.ts        # Drizzle schema (16 tables)
├── tests/
│   ├── e2e/             # 68 Playwright tests
│   └── helpers/         # Test utilities
├── docs/                # Documentation (25 files, 18k+ lines)
├── docker-compose.yml   # Docker orchestration
└── Dockerfile          # Web service container
```

### Adding Features

[Guide for adding new features with examples]

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e:ui

# Specific test file
npx playwright test tests/e2e/01-anonymous-user.spec.ts
```

## API Documentation

### Authentication

**POST /api/auth/login** (legacy, use Supabase client)
**GET /api/auth/user** - Get current user session

### Resources

**GET /api/resources** - List approved resources (public)
- Query params: page, limit, category, search
- Response: `{resources: Resource[], total: number}`

**POST /api/resources** - Submit new resource (authenticated)
- Body: `{title, url, description, category, metadata}`
- Creates with status='pending'

**GET /api/resources/:id** - Get single resource (public)

### Admin

**GET /api/admin/stats** - Dashboard statistics (admin only)
- Response: `{users, resources, journeys, pendingApprovals}`

**GET /api/admin/resources** - List all resources with filtering (admin only)
- Query: page, limit, status, category, search, dateFrom, dateTo
- Response: `{resources, total, page, totalPages}`

**PUT /api/admin/resources/:id** - Update resource (admin only)
- Body: Partial<Resource> (allowed fields only)

**POST /api/admin/resources/bulk** - Bulk operations (admin only)
- Body: `{action: 'approve'|'reject'|'archive'|'tag', resourceIds: string[], data?: any}`
- Actions: approve, reject, archive, delete, tag

### Bookmarks & Favorites

**POST /api/bookmarks/:resourceId** - Add bookmark (authenticated)
**DELETE /api/bookmarks/:resourceId** - Remove bookmark
**GET /api/bookmarks** - List user's bookmarks

**POST /api/favorites/:resourceId** - Add favorite
**DELETE /api/favorites/:resourceId** - Remove favorite
**GET /api/favorites** - List user's favorites

[See CLAUDE.md for complete API documentation]

## Deployment

### Docker Deployment

```bash
# Production build
docker-compose -f docker-compose.yml up -d --build

# With environment file
docker-compose --env-file .env.production up -d

# Verify
curl https://yourdomain.com/api/health
```

### Environment Variables

**Required**:
```env
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
DATABASE_URL=postgresql://...
```

**Optional**:
```env
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
REDIS_URL=redis://localhost:6379
NODE_ENV=production
```

[See docs/DEPLOYMENT_CHECKLIST.md for complete deployment guide]

## Supabase Integration

### Setup

1. **Create Supabase Project**
2. **Apply Migrations**: Run all SQL files in `supabase/migrations/`
3. **Create Admin User**: Follow `docs/CREATE_ADMIN_USER.md`
4. **Configure Auth Providers**: GitHub, Google (optional)
5. **Enable RLS**: Row-Level Security policies applied

### Authentication Flow

```
User → Supabase Auth → JWT Token → Client localStorage → API Requests (Bearer token)
```

### Database Connection

**Connection Pooler** (recommended):
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Direct Connection** (for migrations):
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

### Row-Level Security

**Enabled on**:
- user_bookmarks, user_favorites, user_preferences
- user_journey_progress, resource_edits
- resources (public can read approved only)

**Policies**:
```sql
-- Users own their bookmarks
CREATE POLICY "Users manage own bookmarks"
ON user_bookmarks FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Public can read approved resources
CREATE POLICY "Public read approved"
ON resources FOR SELECT
TO anon, authenticated
USING (status = 'approved');
```

[See Supabase dashboard for complete policy list]

## Troubleshooting

### Common Issues

**Issue**: Submit resource shows "Loading..."
- Cause: Category query not loading
- Fix: Check Supabase connection, verify /api/categories endpoint
- Solution: See FIXES_APPLIED_PENDING_REBUILD.md

**Issue**: Admin dashboard shows 401 errors
- Cause: Missing JWT in requests
- Fix: Check useAuth hook, verify Supabase session
- Solution: Clear localStorage, re-login

**Issue**: Bookmarks not appearing
- Cause: RLS blocking access OR API not returning isFavorited prop
- Fix: Verify RLS policies, check API response structure
- Solution: See docs/troubleshooting/bookmarks.md

[See docs/TROUBLESHOOTING.md for complete guide]

## Contributing

[Guidelines for open-source contributions]

## License

MIT License - see LICENSE file

## Acknowledgments

- [krzemienski/awesome-video](https://github.com/krzemienski/awesome-video) - Original awesome list
- Supabase - Database and authentication
- Anthropic Claude - AI features
- shadcn/ui - Component library

---

*README.md - Comprehensive guide for developers, users, and admins*
```

**Agent will create this complete README.**

**SITREP**: README creation progress

---

### Task 4.4: Create Supabase Integration Guide (45 min)

**Agent**: technical-writer

**File**: `docs/SUPABASE_INTEGRATION_GUIDE.md`

**Content**:
- Complete setup walkthrough
- Screenshot of each Supabase dashboard step
- SQL migration execution
- RLS policy explanation
- Auth provider configuration
- Connection string formats
- Troubleshooting Supabase-specific issues

---

### Task 4.5: Create API Documentation (45 min)

**File**: `docs/API_DOCUMENTATION.md`

**Format**: OpenAPI-style with examples

**For each endpoint**:
```markdown
### POST /api/admin/resources/bulk

**Description**: Perform bulk operations on multiple resources

**Authentication**: Required (Admin role)

**Request**:
```http
POST /api/admin/resources/bulk HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "action": "approve",
  "resourceIds": ["uuid-1", "uuid-2", "uuid-3"],
  "data": {}
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "count": 3
}
```

**Errors**:
- 401: Unauthorized (not logged in)
- 403: Forbidden (not admin)
- 400: Invalid action or resourceIds
- 500: Server error

**Example** (curl):
```bash
curl -X POST http://localhost:3000/api/admin/resources/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"approve","resourceIds":["uuid-1","uuid-2"]}'
```
```

**Complete for all 70+ endpoints.**

---

## Phase 5: Production Readiness Verification

**Type**: Final Validation
**Duration**: 2 hours
**Complexity**: 0.5/1.0 (MODERATE)

---

### Task 5.1: Production Checklist Execution (60 min)

**Execute all 103 tasks** from `docs/DEPLOYMENT_CHECKLIST.md`:
- Environment variables set
- Database migrated
- Indexes applied
- Admin user created
- OAuth configured (or documented as optional)
- Docker build successful
- Health checks passing
- Security headers configured
- Rate limiting enabled
- Error monitoring ready

**SITREP**: X/103 tasks complete

---

### Task 5.2: Performance Benchmarking (30 min)

**Measure**:
- Homepage load time
- Category page load time
- Admin dashboard load time
- Resource browser load time
- API response times (p50, p95, p99)
- Database query times

**Tools**: Chrome DevTools Performance tab, Lighthouse

**Document results** in performance report.

---

### Task 5.3: Security Final Validation (30 min)

**Test**:
- Non-admin cannot access admin routes (403)
- User cannot see other users' bookmarks (RLS)
- JWT tokens expire correctly
- Rate limiting blocks excessive requests
- XSS attempts blocked (try script tags)
- SQL injection blocked (try malicious input)

**SITREP**: Security status, any vulnerabilities

---

## Task Automation Scripts

### Automated Test Runner

**File**: `tests/automated/admin-tests.js`

```javascript
const tests = require('./test-definitions');
const { ChromeDevToolsMCP } = require('./mcp-wrapper');
const { dbVerify } = require('./db-helpers');

async function runAllTests() {
  const devtools = new ChromeDevToolsMCP();
  const results = [];

  for (const test of tests.adminFeatures) {
    console.log(`\n🧪 Running: ${test.name}`);

    try {
      // Execute test
      await test.steps(devtools);

      // Verify
      const verified = await test.verify(devtools, dbVerify);

      if (verified.pass) {
        console.log(`✅ PASS: ${test.name}`);
        results.push({ test: test.name, status: 'PASS' });
      } else {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Reason: ${verified.reason}`);
        results.push({ test: test.name, status: 'FAIL', reason: verified.reason });

        // STOP on first failure (iterative bug fixing)
        break;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${test.name}`);
      console.log(`   ${error.message}`);
      results.push({ test: test.name, status: 'ERROR', error: error.message });
      break;
    }
  }

  // Report
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.test}: ${r.status}`);
    if (r.reason) console.log(`   ${r.reason}`);
  });

  return results;
}

module.exports = { runAllTests };
```

**Usage**:
```bash
node tests/automated/admin-tests.js
```

This provides repeatable testing for iterative bug fixing.

---

## Validation Gates

**Tier 1: Flow Validation** (Every task):
- TypeScript compilation: 0 errors
- Linting: No critical issues
- Build: Succeeds

**Tier 2: Artifact Validation** (Every feature):
- Tests created for feature
- Documentation updated
- Components render without errors

**Tier 3: Functional Validation** (NO MOCKS - Every task):
- Chrome DevTools MCP testing
- Real database verification
- Real user interactions
- Screenshot evidence

**All 3 tiers required before moving to next task.**

---

## Expected Outcomes

### By End of Session 4:

**Completion**: 95%+ (all features validated)

**Deliverables**:
- ✅ All admin features functionally tested
- ✅ Multi-role workflows validated
- ✅ Dead code removed
- ✅ Comprehensive README
- ✅ Database documentation
- ✅ Architecture diagrams
- ✅ Supabase guide
- ✅ API documentation
- ✅ Production deployment ready

**Testing**:
- ✅ 100% of admin features validated
- ✅ All user workflows tested
- ✅ Permission boundaries verified
- ✅ E2E test suite ready to run

**Code Quality**:
- ✅ No dead code
- ✅ Organized imports
- ✅ Clean, open-source ready
- ✅ Fully documented

---

## Execution Strategy

### Batch 1: Phase 0 (preparation)
- Rebuild and validate fixes
- Create checklist
- **Checkpoint**: All Session 3 fixes working

### Batch 2: Phase 1A (admin bulk operations)
- Test all bulk operations iteratively
- Fix any bugs immediately
- **Checkpoint**: Bulk operations fully functional

### Batch 3: Phase 1B-1C (features + integration)
- Test editing, filtering, sorting
- Test user features
- Test integration flows
- **Checkpoint**: All features validated

### Batch 4: Phase 2 (multi-role)
- Test each user role
- Verify permissions
- **Checkpoint**: Role boundaries confirmed

### Batch 5: Phase 3 (code audit - PARALLEL)
- Dispatch 4 agents
- Remove dead code
- **Checkpoint**: Clean codebase

### Batch 6: Phase 4 (documentation - PARALLEL)
- Create README, diagrams, guides
- **Checkpoint**: Documentation complete

### Batch 7: Phase 5 (production readiness)
- Final validation
- Deployment verification
- **Checkpoint**: Ready for production

---

## Risk Assessment

**HIGH RISK TASKS** (likely to find bugs):
- Bulk operations (complex transactions)
- Resource editing (modal interactions)
- Filtering (query building)
- Permission boundaries (security critical)

**MEDIUM RISK**:
- Sorting (TanStack Table configuration)
- Pagination (state management)
- User features (API integration)

**LOW RISK**:
- Documentation (mostly writing)
- Code audit (systematic process)
- Architecture diagrams (visual)

**Mitigation**: Iterative bug fixing, immediate fixes, comprehensive testing

---

## Success Criteria

**Session 4 succeeds when**:
- ✅ 100% of admin features functionally validated
- ✅ All user workflows tested end-to-end
- ✅ Multi-role testing complete
- ✅ Zero bugs remaining in core features
- ✅ Comprehensive README created
- ✅ Dead code removed
- ✅ Production deployment checklist verified
- ✅ Honest completion ≥95%

---

## Methodology Highlights

**CRITICAL PRACTICES**:

**1. Iterative Bug Fixing**:
```
Test → Bug Found → STOP → Fix → Rebuild → RESTART
```

**2. SITREP Protocol**:
- Before/after every task
- Evidence-based reporting
- Clear pass/fail status

**3. Chrome DevTools MCP**:
- ALL functional testing
- Network inspection
- Console monitoring
- Interactive debugging

**4. Parallel Agents**:
- Code audit (4 agents)
- Documentation (3 agents)
- Efficient use of parallelism

**5. Test-Driven Development**:
- Specify expected behavior
- Test against specification
- Fix until test passes

**6. Task Automation**:
- Reusable test scripts
- Database verification scripts
- Automated screenshot capture

**7. Shannon Framework**:
- Complexity analysis (0.69/1.00)
- Validation gates (3 tiers)
- Honest reflection
- Systematic execution

---

## Files to Create

**Testing**:
- tests/SESSION_4_TESTING_CHECKLIST.md
- tests/automated/admin-tests.js
- tests/automated/user-tests.js
- tests/automated/test-definitions.js

**Documentation**:
- README.md (comprehensive, open-source quality)
- docs/DATABASE_SCHEMA.md (all 16 tables documented)
- docs/SUPABASE_INTEGRATION_GUIDE.md (complete setup)
- docs/API_DOCUMENTATION.md (all 70+ endpoints)
- docs/ARCHITECTURE.md (diagrams + explanations)
- docs/diagrams/*.mmd (Mermaid source files)

**Scripts**:
- scripts/clean-rebuild.sh (automation)
- scripts/verify-deployment.sh (production validation)

---

## Estimated Timeline

| Phase | Duration | Parallelizable |
|-------|----------|----------------|
| Phase 0: Prep | 45 min | No |
| Phase 1: Functional Validation | 5-7 hours | No (sequential testing) |
| Phase 2: Multi-Role | 2-3 hours | No |
| Phase 3: Code Audit | 2-3 hours | ✅ YES (4 agents) |
| Phase 4: Documentation | 3-4 hours | ✅ YES (3 agents) |
| Phase 5: Production | 2 hours | No |

**Total**: 14-19 hours

**With Parallelization**: 12-16 hours

---

## Session 4 Completion Criteria

**Minimum** (85% → 95%):
- All Phase 1-2 tasks complete
- README created
- Dead code removed

**Target** (95%+):
- All phases complete
- Production deployment verified
- Comprehensive documentation

**Stretch** (100%):
- OAuth providers configured
- E2E suite executed
- Load testing complete

---

**Plan Created**: 2025-11-29
**Ready for Execution**: Yes
**Methodology**: Shannon + TDD + SITREP + Parallel Agents
**Estimated Completion**: 95%+

🚀 **Session 4: Complete Validation & Production Readiness**
