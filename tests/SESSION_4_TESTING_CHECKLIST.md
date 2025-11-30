# Session 4: Complete Functional Testing Checklist

**Created**: 2025-11-30
**Purpose**: Comprehensive validation of all admin and user features
**Methodology**: Chrome DevTools MCP + 3-layer verification (Network → Database → UI)
**Status**: Ready for execution

---

## 📋 Phase 1: Admin Feature Validation

### Section 1A: Bulk Operations (HIGH RISK)

- [ ] **1.1 Bulk Archive** (30 min)
  - Navigate to /admin/resources
  - Select 3 approved resources via checkboxes
  - Click "Archive" button
  - Confirm in dialog
  - **Verify Network**: POST /api/admin/resources/bulk → 200 OK
  - **Verify Database**: `SELECT status FROM resources WHERE id IN (...) → 'archived'`
  - **Verify UI**: Resources removed from table OR status badge shows "archived"
  - **Verify Audit**: `SELECT * FROM resource_audit_log WHERE action LIKE '%archive%'`
  - Evidence: Screenshot saved to /tmp/bulk-archive-success.png

- [ ] **1.2 Bulk Approve** (30 min)
  - **Setup**: Create 3 pending resources via SQL or API
  - Filter by status='pending'
  - Select the 3 test resources
  - Click "Approve" button
  - Confirm in dialog
  - **Verify Network**: POST /api/admin/resources/bulk with action='approve'
  - **Verify Database**: status='approved', approved_by set, approved_at populated
  - **Verify UI**: Resources show "approved" badge
  - **Verify Public**: Navigate to category page, confirm resources visible
  - Evidence: Screenshot + SQL query results

- [ ] **1.3 Bulk Reject** (30 min)
  - Create 3 pending resources
  - Select and reject
  - **Verify Network**: POST with action='reject'
  - **Verify Database**: status='rejected'
  - **Verify UI**: Resources show "rejected" badge or removed from pending list
  - **Verify Public**: Resources NOT visible on category pages
  - **Verify Audit**: Rejection logged with reason

- [ ] **1.4 Bulk Tag Assignment** (30 min)
  - Select 3 approved resources
  - Click "Add Tags" button
  - Enter: "test-tag-1, test-tag-2, session-4-validated"
  - Save
  - **Verify Network**: POST /api/admin/resources/bulk with action='tag'
  - **Verify Database Tags**: `SELECT * FROM tags WHERE name IN (...)`
  - **Verify Junctions**: `SELECT * FROM resource_tags WHERE resource_id IN (...)`
  - **Verify UI**: Tags appear on resource cards
  - Expected: 9 junction rows (3 resources × 3 tags)

---

### Section 1B: Resource Editing (HIGH RISK)

- [ ] **1.5 Resource Edit - Open Modal** (15 min)
  - Navigate to /admin/resources
  - Click dropdown menu (3-dot icon) on first resource
  - Click "Edit" menu item
  - **Verify**: Modal opens with title "Edit Resource"
  - **Verify**: Form pre-filled with current resource data
  - **Verify**: All fields editable (title, URL, description, category, tags)

- [ ] **1.6 Resource Edit - Save Changes** (30 min)
  - In edit modal, change description to: "Updated via Session 4 testing - [timestamp]"
  - Click "Save" button
  - **Verify Network**: PUT /api/admin/resources/:id → 200 OK
  - **Verify Database**: `SELECT description, updated_at FROM resources WHERE id=... → matches new value`
  - **Verify UI**: Modal closes, table refreshes, new description visible
  - **Verify Frontend**: Navigate to category page, resource card shows updated description
  - **Verify Toast**: "Resource updated successfully"

---

### Section 1C: Filtering (MEDIUM RISK)

- [ ] **1.7 Status Filter** (20 min)
  - Click Status dropdown
  - Select "Approved"
  - **Verify Network**: GET /api/admin/resources?status=approved
  - **Verify UI**: Only approved resources in table
  - Repeat for: Pending, Rejected, Archived, All Statuses

- [ ] **1.8 Category Filter** (20 min)
  - Click Category dropdown
  - Select "Encoding & Codecs"
  - **Verify Network**: GET /api/admin/resources?category=Encoding+%26+Codecs
  - **Verify UI**: Only resources from that category shown
  - Test multiple categories

- [ ] **1.9 Search Filter** (25 min)
  - Type "ffmpeg" in search input
  - Wait 500ms (debounce)
  - **Verify Network**: Only 1 request (debounce worked)
  - **Verify Network**: GET /api/admin/resources?search=ffmpeg
  - **Verify UI**: Results contain "ffmpeg" in title or description
  - Test: Clear search → full list returns

- [ ] **1.10 Combined Filters** (15 min)
  - Set Status=approved AND Category=Media Tools AND Search=ffmpeg
  - **Verify Network**: All 3 params in URL
  - **Verify UI**: Results match ALL 3 criteria
  - Click "Reset Filters" button
  - **Verify**: All filters cleared, full list returns

---

### Section 1D: Sorting (MEDIUM RISK)

- [ ] **1.11 Sort by Title** (15 min)
  - Click "Title" column header
  - **Verify UI**: Sort indicator (up arrow) appears
  - **Verify UI**: Resources sorted A-Z alphabetically
  - Click again
  - **Verify UI**: Sort indicator (down arrow), sorted Z-A
  - **Verify Network**: No new API call (client-side sorting)

- [ ] **1.12 Sort by Category** (10 min)
  - Click "Category" header
  - Verify alphabetical sort by category name

- [ ] **1.13 Sort by Status** (10 min)
  - Click "Status" header
  - Verify logical sort (approved, pending, rejected, archived)

- [ ] **1.14 Sort by Last Modified** (10 min)
  - Click "Last Modified" header
  - Verify chronological sort (newest first)

---

### Section 1E: Pagination (MEDIUM RISK)

- [ ] **1.15 Pagination Next** (20 min)
  - Note resources on page 1 (first 3 titles)
  - Click "Next" button
  - **Verify UI**: "Page 2 of X" displayed
  - **Verify Network**: GET /api/admin/resources?page=2&limit=20
  - **Verify UI**: Different resources shown (not from page 1)
  - **Verify**: Previous button now enabled

- [ ] **1.16 Pagination Previous** (10 min)
  - From page 2, click "Previous"
  - **Verify**: Returns to page 1
  - **Verify**: Same resources as initial page 1
  - **Verify**: Previous button disabled

- [ ] **1.17 Direct Page Navigation** (10 min, if implemented)
  - Enter page number manually or click page number
  - Verify jumps to correct page

---

### Section 1F: User Features (MEDIUM RISK)

- [ ] **1.18 Bookmark Add** (20 min)
  - Login as regular user (NOT admin)
  - Navigate to /category/intro-learning
  - Find bookmark button on first resource card
  - Click bookmark button
  - **Verify Network**: POST /api/bookmarks/:resourceId → 200/201
  - **Verify Database**: `SELECT * FROM user_bookmarks WHERE user_id=... AND resource_id=...`
  - **Verify UI**: Button changes to "bookmarked" state (filled icon or different color)
  - **Verify Toast**: "Added to bookmarks"

- [ ] **1.19 Bookmark View** (10 min)
  - Navigate to /bookmarks
  - **Verify Network**: GET /api/bookmarks
  - **Verify UI**: Bookmarked resource appears in list
  - **Verify**: Notes field editable

- [ ] **1.20 Bookmark Remove** (10 min)
  - Click remove/unbookmark button
  - **Verify Network**: DELETE /api/bookmarks/:resourceId
  - **Verify Database**: Row deleted from user_bookmarks
  - **Verify UI**: Resource removed from bookmarks page

- [ ] **1.21 Favorite Add/Remove** (15 min)
  - Similar to bookmarks but simpler (no notes)
  - Click star icon on resource card
  - **Verify**: POST /api/favorites/:resourceId
  - **Verify Database**: user_favorites row created
  - Click again to remove
  - **Verify**: DELETE request, row deleted

- [ ] **1.22 Submit Resource Flow** (40 min)
  - Navigate to /submit
  - Fill form:
    - Title: "Session 4 Test Resource"
    - URL: https://github.com/test/session4
    - Description: "Test resource submitted during Session 4 validation"
    - Category: General Tools
    - Tags: "test, session-4, validation"
  - Click "Submit Resource"
  - **Verify Network**: POST /api/resources → 201 Created
  - **Verify Database**: Resource created with status='pending'
  - **Verify UI**: Success message, redirect to homepage or submissions page

- [ ] **1.23 View Submission Status** (10 min)
  - Navigate to /profile (or /submissions if exists)
  - **Verify**: Pending resource appears in "My Submissions"
  - **Verify**: Status shows "Pending Review"

---

## 📋 Phase 2: Multi-Role Workflow Validation

### Anonymous User Workflow

- [ ] **2.1 Browse Public Content** (15 min)
  - Open browser in incognito mode OR clear localStorage
  - Navigate to http://localhost:3000
  - **Verify**: Homepage loads with 9 categories
  - **Verify**: Can click category and view resources
  - **Verify**: Resource cards visible
  - **Verify**: NO bookmark/favorite buttons (or disabled/login required)

- [ ] **2.2 Attempt Protected Actions** (15 min)
  - Try to navigate to /submit
  - **Expected**: Redirect to /login OR "Login required" message
  - Try to navigate to /profile
  - **Expected**: Redirect to /login
  - Try to navigate to /admin
  - **Expected**: Redirect to /login OR 403 Forbidden

---

### Regular User Workflow

- [ ] **2.3 Complete User Journey** (45 min)
  - **Step 1**: Login as testuser@example.com (create user first if needed)
  - **Verify**: User menu shows profile, bookmarks (NO admin option)
  - **Step 2**: Browse and bookmark a resource
  - **Verify**: Bookmark saved, appears in /bookmarks
  - **Step 3**: Add a favorite
  - **Verify**: Star filled, appears in /profile
  - **Step 4**: Submit new resource
  - **Verify**: Resource created with status='pending'
  - **Step 5**: Try to access /admin
  - **Expected**: 403 Forbidden OR "Access Denied" message
  - **Step 6**: Try direct API call to admin endpoint
    ```bash
    curl -H "Authorization: Bearer $USER_TOKEN" http://localhost:3000/api/admin/stats
    ```
  - **Expected**: 403 Forbidden (NOT 200)

---

### Admin User Workflow

- [ ] **2.4 Complete Admin Smoke Test** (60 min)
  - **Step 1**: Login as admin@test.com
  - **Verify**: Admin Dashboard menu item visible
  - **Step 2**: Navigate to /admin
  - **Verify**: Dashboard loads with stats: 2,644 resources
  - **Step 3**: Navigate to resource browser
  - **Verify**: Can view all resources (all statuses)
  - **Step 4**: Edit a resource (change description)
  - **Verify**: Database updates, UI shows change
  - **Step 5**: Approve a pending resource (from Step 2.3)
  - **Verify**: Status changes, resource now public
  - **Step 6**: Use bulk operation (archive 2 resources)
  - **Verify**: Both archived correctly
  - **Step 7**: View GitHub Sync panel
  - **Verify**: Panel loads (even if not configured)
  - **Step 8**: View Enrichment panel
  - **Verify**: Can see job list (even if empty)
  - **Step 9**: Logout
  - **Verify**: Redirect to homepage, no longer authenticated

---

### Permission Boundary Testing

- [ ] **2.5 RLS Policy Validation** (30 min)
  - **Test 1**: User cannot see other users' bookmarks
    - Login as user1, bookmark resource A
    - Get user1 JWT token
    - Try to query as user2:
      ```sql
      -- This should return 0 rows (RLS blocks)
      SELECT * FROM user_bookmarks WHERE resource_id = 'resource-A-id';
      ```
  - **Test 2**: Non-admin gets 403 on admin endpoints
    ```bash
    curl -H "Authorization: Bearer $REGULAR_USER_TOKEN" http://localhost:3000/api/admin/stats
    # Expected: 403 Forbidden
    ```
  - **Test 3**: Admin can query across users
    ```bash
    curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/api/admin/users
    # Expected: 200 OK with all users
    ```

---

## 📋 Integration Flows (Cross-Feature Testing)

- [ ] **3.1 Edit → Public Visibility** (15 min)
  - Admin edits approved resource (change title)
  - Navigate to category page as anonymous user
  - **Verify**: Updated title visible on public page
  - **Verify**: Change propagated through cache

- [ ] **3.2 Archive → Public Removal** (15 min)
  - Admin archives approved resource
  - Navigate to category page
  - **Verify**: Resource no longer appears in public list
  - **Verify**: Still visible in admin panel with "archived" status

- [ ] **3.3 Submit → Approve → Public** (20 min)
  - Regular user submits resource
  - Admin approves resource
  - **Verify**: Resource appears on public category page
  - **Verify**: Submitter can see it in their submissions with "Approved" status

- [ ] **3.4 Bookmark Persistence** (15 min)
  - User bookmarks resource
  - Logout
  - Login again
  - Navigate to /bookmarks
  - **Verify**: Bookmark still present (persisted in database)

---

## 🎯 Validation Criteria

### For Each Test:

**BEFORE**: Document current state (DB query, UI screenshot)
**ACTION**: Perform test action via Chrome DevTools MCP
**VERIFY 3 LAYERS**:
1. **Network**: API response status + body
2. **Database**: SQL query confirms data change
3. **UI**: Chrome snapshot shows correct display

**IF BUG FOUND**:
1. **STOP** all testing immediately
2. Invoke `systematic-debugging` skill
3. Document bug with evidence
4. Apply fix
5. Rebuild: `docker-compose down && docker-compose build web && docker-compose up -d`
6. **RESTART** from beginning of current section

---

## 📊 Progress Tracking

**Total Tests**: 27
**Sections**:
- 1A: Bulk Operations (4 tests) - HIGH RISK
- 1B: Resource Editing (2 tests) - HIGH RISK
- 1C: Filtering (4 tests) - MEDIUM RISK
- 1D: Sorting (4 tests) - MEDIUM RISK
- 1E: Pagination (3 tests) - MEDIUM RISK
- 1F: User Features (5 tests) - MEDIUM RISK
- Phase 2: Multi-Role (5 tests) - HIGH RISK
- Integration: (4 tests) - MEDIUM RISK

**Estimated Duration**: 8-11 hours total
**Batch Strategy**: Execute in batches of 2-3 tests, report after each batch

---

## 🔧 Test Environment

**Required**:
- Docker containers running (web, redis, nginx)
- Admin user: admin@test.com / Admin123!
- Regular user: testuser@example.com (create if needed)
- Database: 2,644 resources in approved status
- Clean state: No pending resources, no bookmarks, no test data

**Setup Commands**:
```bash
# Verify environment
docker-compose ps  # All healthy
curl http://localhost:3000/api/health  # {"status":"ok"}
curl 'http://localhost:3000/api/resources?limit=1' | jq .total  # 2644

# Clean test data
# Via Supabase or SQL:
DELETE FROM user_bookmarks WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%test%');
DELETE FROM user_favorites WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%test%');
DELETE FROM resources WHERE title LIKE '%Session 4 Test%' OR title LIKE '%Test Resource%';
```

---

## 📸 Evidence Collection

**For Each Test**:
- Screenshot: /tmp/[feature]-[action]-[status].png
- Network log: Save request/response details
- Database query: Save SQL + results
- Console log: Check for errors

**Example**:
```
Evidence for Test 1.1 (Bulk Archive):
- Screenshot: /tmp/bulk-archive-success.png
- Network: POST /api/admin/resources/bulk → 200 OK, body: {"success":true,"count":3}
- Database: SELECT status FROM resources WHERE id IN (...) → 3 rows, all 'archived'
- Console: 0 errors
- Audit: 3 entries in resource_audit_log with action 'archived'
```

---

## ✅ Completion Criteria

**Phase 1 Complete When**:
- All 23 admin/user tests passing
- Zero bugs in core features
- All evidence collected and saved

**Phase 2 Complete When**:
- All 3 user role workflows validated
- Permission boundaries verified (RLS + middleware)
- Integration flows working

**Session 4 Ready for Phase 3 When**:
- All functional testing complete
- No blocking bugs remaining
- Ready for code cleanup and documentation

---

**Checklist created**: 2025-11-30
**Total items**: 27 functional tests + 4 integration flows = 31 validation points
**Methodology**: Iterative bug fixing with immediate fixes and restarts
**Tools**: Chrome DevTools MCP (primary), Supabase MCP (database), Bash (API testing)
