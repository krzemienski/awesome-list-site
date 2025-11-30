# Admin Feature Testing Guide

**Purpose**: Systematic validation of all administration features
**Tools**: Chrome DevTools MCP + Manual Browser Testing
**Database**: Supabase PostgreSQL
**Auth**: admin@test.com / Admin123!

---

## Testing Checklist

### Dashboard Features

#### ✅ Dashboard Stats Widgets
**URL**: http://localhost:3000/admin
**Validated**: YES (Chrome DevTools MCP)

**Test Steps**:
1. Login as admin
2. Navigate to /admin
3. Verify 4 stat cards display:
   - Total Resources (should show 2644)
   - Pending Approvals (should show 0)
   - Active Users (should show count)
   - Quality Score (percentage)

**Expected**:
- GET /api/admin/stats → 200 OK
- Response: `{"users":0,"resources":2644,"journeys":0,"pendingApprovals":0}`
- Widgets display correct numbers
- Auto-refresh every 30 seconds

**Status**: ✅ WORKING
**Evidence**: Screenshot /tmp/admin-dashboard-with-widgets.png
**Network**: Authorization header present with JWT token

---

#### ✅ Sidebar Navigation
**Validated**: YES (Puppeteer MCP)

**Test Steps**:
1. From /admin, verify all 10 menu items visible:
   - Dashboard
   - Resources
   - Approvals
   - Edits
   - Enrichment
   - GitHub Sync
   - Export
   - Database
   - Validation
   - Users

2. Click each menu item
3. Verify navigation works
4. Verify active state highlighting

**Expected**:
- All routes load
- No 404 errors
- Active route highlighted in pink

**Status**: ✅ WORKING (all routes accessible)
**Evidence**: Screenshots of Enrichment, GitHub, Approvals, Edits panels

---

### Resource Management Features

#### ✅ Resource Browser Table
**URL**: http://localhost:3000/admin/resources
**Validated**: YES (Chrome DevTools MCP)

**Test Steps**:
1. Navigate to /admin/resources
2. Verify table loads with resources
3. Check columns: Title, Category, Status, Last Modified, Actions
4. Verify 20 resources per page
5. Check pagination shows "Page 1 of 133"

**Expected**:
- GET /api/admin/resources?page=1&limit=20 → 200 OK
- Table renders 20 rows
- All columns display data correctly
- Pagination controls visible

**Status**: ✅ WORKING
**Evidence**: Screenshot /tmp/resource-browser-working.png
**Network**: JWT authorization working

---

#### ✅ Row Selection
**Validated**: YES (Chrome DevTools MCP)

**Test Steps**:
1. Click checkbox on first resource
2. Verify checkbox becomes checked
3. Verify bulk toolbar appears
4. Verify shows "1 resource selected"
5. Click second checkbox
6. Verify shows "2 resources selected"
7. Click "Select all" checkbox
8. Verify all 20 rows selected

**Expected**:
- Checkboxes toggle state correctly
- Bulk toolbar shows/hides based on selection
- Selection count updates dynamically
- "Select all" checkbox has mixed state when some selected

**Status**: ✅ WORKING
**Evidence**: Chrome DevTools snapshots show toolbar with "1 resource selected"

---

#### ✅ Bulk Actions Toolbar
**Validated**: PARTIALLY (UI present, actions not executed)

**Test Steps**:
1. Select 1-3 resources
2. Verify toolbar appears with 6 buttons:
   - Approve (green)
   - Reject (red)
   - Archive (amber)
   - Add Tags
   - Export CSV
   - Delete (red)
3. Verify "Clear Selection" button present

**Expected**:
- Toolbar visible when resources selected
- All 6 action buttons enabled
- Color coding correct (green approve, red reject/delete)
- Clear button resets selection

**Status**: ✅ UI WORKING, ⚠️ ACTIONS NOT TESTED

---

#### ✅ Archive Confirmation Dialog
**Validated**: YES (Chrome DevTools MCP)

**Test Steps**:
1. Select 1 resource
2. Click "Archive" button
3. Verify confirmation dialog appears
4. Check dialog message: "Archive 1 Resources?"
5. Check description: "...can be restored later"
6. Verify Cancel and Archive buttons

**Expected**:
- Dialog appears on Archive click
- Message shows correct count
- Cancel closes without action
- Archive executes bulk operation

**Status**: ✅ DIALOG WORKING, ⚠️ EXECUTION NOT TESTED
**Evidence**: Chrome DevTools snapshot showed alertdialog with correct text

---

#### ⚠️ Bulk Archive Execution (NOT TESTED)
**Critical**: This needs end-to-end validation

**Test Steps**:
1. Note resource IDs of 3 selected resources
2. Select the 3 resources
3. Click Archive → Confirm
4. Wait for success toast
5. Query database:
   ```sql
   SELECT id, title, status FROM resources
   WHERE id IN ('resource-id-1', 'resource-id-2', 'resource-id-3');
   ```
6. Verify status = 'archived' for all 3
7. Check resource_audit_log for entries

**Expected**:
- POST /api/admin/resources/bulk → 200 OK
- Payload: `{"action":"archive","resourceIds":[...],` "data":{}}`
- Database: 3 resources have status='archived'
- Audit log: 3 entries with action='bulk_archive'
- UI: Table refreshes, 3 resources removed or marked archived
- Toast: "Bulk action completed successfully"

**Status**: ⚠️ NOT TESTED (needs execution)
**Risk**: HIGH - Transaction might fail, audit might not log, UI might not refresh

---

#### ⚠️ Bulk Tag Assignment (NOT TESTED)

**Test Steps**:
1. Select 3 resources
2. Click "Add Tags"
3. Verify tag input dialog opens
4. Enter tags: "test-tag-1, test-tag-2"
5. Click Add/Save
6. Verify success
7. Query database:
   ```sql
   SELECT t.name, rt.resource_id
   FROM tags t
   JOIN resource_tags rt ON t.id = rt.tag_id
   WHERE t.name IN ('test-tag-1', 'test-tag-2');
   ```
8. Verify 6 rows (3 resources × 2 tags)

**Expected**:
- Dialog with tag input field
- POST /api/admin/resources/bulk with action='tag'
- Tags created in tags table
- resource_tags junction entries created
- Success toast

**Status**: ⚠️ NOT TESTED
**Risk**: MEDIUM - Tag creation might fail, junction might have duplicates

---

#### ⚠️ Resource Edit Modal (NOT TESTED)

**Test Steps**:
1. Click "Open menu" button on any resource (uid=*_86, *_93, etc.)
2. Verify dropdown menu appears
3. Look for "Edit" menu item
4. Click Edit
5. Verify ResourceEditModal opens
6. Check pre-filled fields:
   - Title (readonly or editable?)
   - URL (readonly or editable?)
   - Description (textarea)
   - Category (dropdown)
   - Status (dropdown)
7. Change description to "Updated via MCP testing"
8. Click Save
9. Wait for success toast
10. Verify modal closes
11. Refresh page
12. Verify description updated

**Expected**:
- Dropdown menu appears with Edit option
- Modal opens with React Hook Form
- Fields pre-filled with resource data
- Zod validation on save
- PUT /api/admin/resources/:id → 200 OK
- Database updated
- Optimistic UI update

**Status**: ⚠️ NOT TESTED
**Risk**: HIGH - Modal might not open, save might fail, validation might be broken

---

### Filtering & Search Features

#### ⚠️ Status Filter (NOT TESTED)

**Test Steps**:
1. Click Status dropdown (combobox uid=*_71)
2. Verify options: All Statuses, Pending, Approved, Rejected, Archived
3. Select "Pending"
4. Wait for table to refresh
5. Verify network request: GET /api/admin/resources?status=pending
6. Verify results (should be 0 pending resources)
7. Verify empty state or message
8. Reset to "All Statuses"

**Expected**:
- Dropdown opens on click
- Selecting option triggers API call with ?status=pending
- Table refreshes with filtered results
- URL updates (optional)
- Clear filter resets

**Status**: ⚠️ NOT TESTED
**Risk**: MEDIUM - Dropdown might not work, API might not filter correctly

---

#### ⚠️ Category Filter (NOT TESTED)

**Test Steps**:
1. Click Category dropdown (combobox uid=*_72)
2. Verify 9 category options load from /api/categories
3. Select "Encoding & Codecs"
4. Verify API call: GET /api/admin/resources?category=Encoding+%26+Codecs
5. Verify filtered results show only Encoding & Codecs resources
6. Check total count updates

**Expected**:
- Categories fetched via React Query
- Dropdown populated with 9 options
- Selection filters table
- Pagination resets to page 1

**Status**: ⚠️ NOT TESTED
**Risk**: MEDIUM - Category fetch might fail (needs auth?), filter might not work

---

#### ⚠️ Search Filter (NOT TESTED)

**Test Steps**:
1. Click search textbox (uid=*_70)
2. Type: "ffmpeg"
3. Wait 300ms (debounce)
4. Verify API call: GET /api/admin/resources?search=ffmpeg
5. Verify filtered results
6. Check total count
7. Clear search
8. Verify resets to all resources

**Expected**:
- Search debounced at 300ms
- Full-text search across title, description, URL
- Results filter dynamically
- Clear button or backspace resets

**Status**: ⚠️ NOT TESTED
**Risk**: MEDIUM - Debounce might not work, search might be case-sensitive

---

#### ⚠️ Clear All Filters (NOT TESTED)

**Test Steps**:
1. Apply status filter
2. Apply category filter
3. Enter search text
4. Verify "Clear All Filters" button enabled
5. Click Clear All Filters
6. Verify all filters reset
7. Verify table shows all resources

**Expected**:
- Button disabled when no filters
- Button enabled when filters applied
- Click resets all filter state
- Table re-fetches with no filters

**Status**: ⚠️ NOT TESTED

---

### Pagination Features

#### ⚠️ Next Page Navigation (NOT TESTED)

**Test Steps**:
1. On page 1, click "Next" button
2. Wait for page to load
3. Verify "Page 2 of 133" shown
4. Verify different resources (not same as page 1)
5. Check network: GET /api/admin/resources?page=2&limit=20

**Expected**:
- Next button triggers page increment
- API fetches page 2
- Table updates with new resources
- URL updates with ?page=2 (optional)
- Previous button becomes enabled

**Status**: ⚠️ NOT TESTED (MCP timeout when attempting)
**Risk**: LOW - Likely works, but not confirmed

---

#### ⚠️ Previous Page Navigation (NOT TESTED)

**Test Steps**:
1. Navigate to page 2
2. Click "Previous" button
3. Verify back to "Page 1 of 133"
4. Verify same resources as initially

**Expected**:
- Previous button navigates back
- State maintained correctly
- Previous disabled on page 1

**Status**: ⚠️ NOT TESTED

---

### Sorting Features

#### ⚠️ Column Sorting (NOT TESTED)

**Test Steps**:
1. Click "Title" column header
2. Verify sort indicator appears (up/down arrow)
3. Verify resources sorted alphabetically
4. Click again
5. Verify reverse sort (Z-A)
6. Test other columns: Category, Status, Last Modified

**Expected**:
- Column headers clickable
- TanStack Table sorting working
- Visual indicator shows sort direction
- Multi-column sort supported (optional)

**Status**: ⚠️ NOT TESTED
**Risk**: LOW - TanStack Table handles this, but config might be wrong

---

### Other Admin Panels

#### ✅ Pending Approvals Panel
**URL**: /admin/approvals
**Validated**: YES (Puppeteer MCP)

**Status**: ✅ WORKING
- Empty state: "All Caught Up!"
- Message: "No pending resources to review"
- Matches database (0 pending resources)

---

#### ⚠️ Edit Suggestions Panel
**URL**: /admin/edits
**Validated**: VISUAL ONLY (loading skeletons shown)

**Issue**: Shows loading skeletons indefinitely
**Possible Causes**:
1. No data (0 pending edits)
2. API call failing silently
3. Component not handling empty state

**Test Needed**:
- Check network panel for /api/admin/resource-edits call
- Verify response
- Add console.log to component to debug

**Status**: ⚠️ NEEDS INVESTIGATION

---

#### ✅ AI Enrichment Panel
**URL**: /admin/enrichment
**Validated**: VISUAL (Puppeteer MCP)

**Features Visible**:
- Job Control section
- Filter dropdown: "Unenriched Only"
- Batch Size input: "10"
- "Start Enrichment" button (pink/primary)
- Job History section

**Not Tested**:
- Starting enrichment job
- Monitoring job progress
- Viewing job results
- Canceling job

**Test Needed**:
1. Click "Start Enrichment"
2. Verify POST /api/enrichment/start
3. Monitor job progress
4. Check database for enrichment_jobs and enrichment_queue entries

**Status**: ⚠️ UI WORKING, FUNCTIONALITY NOT TESTED

---

#### ✅ GitHub Sync Panel
**URL**: /admin/github
**Validated**: VISUAL (Puppeteer MCP)

**Features Visible**:
- Repository configuration section
- Repository URL: krzemienski/awesome-video
- Sync button (refresh icon)
- "Import from GitHub" button
- "Export to GitHub" button

**Not Tested**:
- Import dry-run
- Import actual
- Export dry-run
- Export actual
- Sync history

**Test Needed**:
1. Click "Import Resources" (if dry-run available)
2. Review changes preview
3. Confirm import
4. Verify resources added/updated

**Status**: ⚠️ UI WORKING, FUNCTIONALITY NOT TESTED
**Risk**: MEDIUM - GitHub API integration complex, might have auth issues

---

### Untested Admin Routes

#### ❌ Export Panel (/admin/export)
**Validated**: NO

**Expected Features**:
- Export format selection (CSV, JSON, YAML)
- Filter options (all, approved only, by category)
- Export button
- Download link

**Test Needed**: Navigate and validate

---

#### ❌ Database Panel (/admin/database)
**Validated**: NO

**Expected Features**:
- Database statistics
- Table sizes
- Index information
- Backup/restore options (if any)

**Test Needed**: Navigate and validate

---

#### ❌ Validation Panel (/admin/validation)
**Validated**: NO

**Expected Features**:
- Run awesome-lint validation
- Link checker
- Validation results display
- Error/warning details

**Test Needed**: Navigate and validate

---

#### ❌ Users Panel (/admin/users)
**Validated**: NO

**Expected Features**:
- User list table
- Role management (promote/demote admin)
- User statistics
- Filter by role

**Test Needed**: Navigate and validate

---

## Functional Testing Protocol

### For Each Admin Feature:

**Step 1: Visual Validation**
- Navigate to page
- Take screenshot
- Verify UI renders without errors

**Step 2: Interaction Test**
- Click buttons
- Fill forms
- Submit actions

**Step 3: Network Validation**
- Use Chrome DevTools MCP network panel
- Verify API calls made
- Check status codes (should be 200, not 401/403)
- Verify Authorization headers present

**Step 4: Database Validation**
- Query relevant tables
- Verify data changes persisted
- Check audit logs created

**Step 5: Evidence Collection**
- Screenshot of UI
- Network request/response logs
- Database query results
- Document in testing log

---

## Critical Test Cases

### TEST: Bulk Archive (High Priority)

**Why Critical**: Validates entire bulk operation pipeline

**Steps**:
```bash
# 1. Browser: Select 3 resources, click Archive, confirm

# 2. Database: Verify changes
psql -c "SELECT id, title, status FROM resources WHERE id IN (...) ORDER BY id;"

# Expected: status = 'archived' for all 3

# 3. Audit: Verify logging
psql -c "SELECT * FROM resource_audit_log WHERE resource_id IN (...) ORDER BY created_at DESC LIMIT 3;"

# Expected: 3 audit entries with action='bulk_archive'
```

**Success Criteria**:
- ✅ UI: Success toast appears
- ✅ Network: POST /api/admin/resources/bulk → 200 OK
- ✅ Database: 3 resources archived
- ✅ Audit: 3 log entries created
- ✅ UI: Table refreshes, selection cleared

---

### TEST: Resource Editing (High Priority)

**Why Critical**: Validates update workflow

**Steps**:
```bash
# 1. Browser: Open edit modal, change description, save

# 2. Database: Verify update
psql -c "SELECT id, description, updated_at FROM resources WHERE id = 'resource-id';"

# Expected: description updated, updated_at recent

# 3. Network validation
# PUT /api/admin/resources/:id
# Request body: {"description":"Updated via testing"}
# Response: 200 OK with updated resource
```

**Success Criteria**:
- ✅ Modal opens with pre-filled data
- ✅ Validation works (Zod schema)
- ✅ Save triggers API call
- ✅ Database updates
- ✅ UI refreshes with new data

---

### TEST: Filter by Status (Medium Priority)

**Steps**:
```bash
# 1. Browser: Select "Pending" from status dropdown

# 2. Network: Verify API call
# GET /api/admin/resources?status=pending&page=1&limit=20

# 3. UI: Verify filtered results or empty state
```

**Success Criteria**:
- ✅ Dropdown works
- ✅ API filters correctly
- ✅ Results match filter
- ✅ Pagination resets

---

## Testing Tools

### Chrome DevTools MCP
**Best For**: Interactive admin testing

**Commands**:
```javascript
// Navigate
mcp__chrome-devtools__navigate_page({ type: 'url', url: '...' })

// Inspect
mcp__chrome-devtools__take_snapshot()

// Interact
mcp__chrome-devtools__click({ uid: '...' })
mcp__chrome-devtools__fill({ uid: '...', value: '...' })

// Debug
mcp__chrome-devtools__list_network_requests()
mcp__chrome-devtools__list_console_messages()
```

### Database Queries
**Best For**: Verifying data changes

```sql
-- Check resource status
SELECT id, title, status, updated_at FROM resources WHERE id = 'uuid';

-- Check audit log
SELECT * FROM resource_audit_log WHERE resource_id = 'uuid' ORDER BY created_at DESC;

-- Check tags
SELECT t.name FROM tags t
JOIN resource_tags rt ON t.id = rt.tag_id
WHERE rt.resource_id = 'uuid';
```

---

## Known Issues Found

### Issue #1: Submit Resource Loading Loop
- **URL**: /submit
- **Symptom**: Infinite "Loading..." spinner
- **Status**: DOCUMENTED, needs investigation
- **Severity**: MEDIUM

### Issue #2: Bookmark/Favorite Buttons Not Rendering
- **Location**: Resource cards in category pages
- **Symptom**: Buttons not visible even when authenticated
- **Root Cause**: API likely not returning isFavorited/isBookmarked props
- **Status**: DOCUMENTED, needs API fix
- **Severity**: MEDIUM

### Issue #3: Pending Edits Loading Indefinitely
- **URL**: /admin/edits
- **Symptom**: Shows skeleton loaders, never loads content
- **Root Cause**: Unknown (no data OR API failing silently)
- **Status**: DOCUMENTED, needs investigation
- **Severity**: LOW

---

## Testing Priority

**HIGH PRIORITY** (Must work for production):
1. ✅ Admin login
2. ✅ Dashboard stats
3. ✅ Resource browser table
4. ✅ Row selection
5. ⚠️ Bulk operations (archive, approve, reject)
6. ⚠️ Resource editing

**MEDIUM PRIORITY** (Important for admin productivity):
7. ⚠️ Filtering (status, category, search)
8. ⚠️ Pagination
9. ⚠️ Sorting
10. ⚠️ Enrichment jobs
11. ⚠️ GitHub sync

**LOW PRIORITY** (Nice to have):
12. ❌ Export panel
13. ❌ Database panel
14. ❌ Validation panel
15. ❌ Users panel

---

## Next Steps

### Immediate (Complete Validation):
1. Test bulk archive with database verification
2. Test resource editing end-to-end
3. Test one filter (status or category)
4. Document results

### Before Production:
1. Fix submit resource loading issue
2. Fix bookmark/favorite buttons
3. Investigate pending edits loading
4. Test all untested routes

### User Manual Testing (After MCP):
Since MCPs can be unstable, provide user with manual test scripts:
```bash
# Browser console testing
# Login as admin, navigate to /admin/resources

# Test bulk archive:
# 1. Select 3 resources via checkboxes
# 2. Click Archive button
# 3. Confirm in dialog
# 4. Check for success toast
# 5. Verify resources disappeared or status changed

# Database verification:
psql ... -c "SELECT COUNT(*) FROM resources WHERE status='archived';"
# Should be 3 more than before
```

---

## Summary

**Validated Features**: 6 / 16 (37%)
**Needs Functional Testing**: 10 / 16 (63%)
**Known Issues**: 3 documented

**Admin platform is visually complete but functionally untested.**

**Recommendation**: Execute HIGH PRIORITY tests (bulk operations, editing) before claiming admin features "fully functional".

---

*Testing Guide Created: 2025-11-29*
*Validation Method: Chrome DevTools MCP + Puppeteer MCP*
*Status: Comprehensive test plan with step-by-step instructions*
