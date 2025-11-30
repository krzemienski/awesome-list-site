# Session 7: Complete Admin Experience Validation
**Shannon Execution Plan**

**Plan ID**: session-7-admin-features-validation
**Created**: 2025-11-30
**Complexity**: 0.78/1.0 (VERY COMPLEX)
**Duration**: 13 hours (10h testing + 3h bug fixing buffer)
**Tasks**: 195 granular tasks
**NO MOCKS**: ✅ Real browser + Real DB + Real integrations (GitHub, Claude AI)

---

## Shannon Complexity Analysis

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Technical Depth | 8/10 | Bulk operations, GitHub API, AI integration |
| Integration Complexity | 9/10 | Multiple external APIs, complex transactions |
| State Management | 7/10 | Admin state, job monitoring, real-time updates |
| Error Scenarios | 10/10 | Expect 10-15 bugs, complex failure modes |
| Performance | 5/10 | Batch processing considerations |
| Security | 8/10 | Admin permissions, RLS bypass testing |
| Documentation | 7/10 | Comprehensive evidence required |
| Testing Complexity | 10/10 | Most complex workflows in application |

**Overall**: 0.78/1.0 → **VERY COMPLEX** (highest complexity session)

---

## Objective

**Test EVERY admin feature** to verify complete admin experience works:

1. Resource Management (edit, delete)
2. Bulk Operations (approve, reject, archive, tag - THE RISKIEST)
3. User Management (roles, permissions)
4. GitHub Integration (export/import with real repository)
5. AI Enrichment (batch processing with real Claude API)

**Success = All admin features functional, bulk operations work, integrations verified**

**Project Impact**: 45% → 76% completion (adds 10 admin features)

---

## Prerequisites

- ✅ Session 6 complete (all user workflows working)
- ✅ Admin user working (admin@test.com)
- ✅ GitHub token configured (GITHUB_TOKEN in .env)
- ✅ Anthropic API key configured (for AI testing)
- ✅ Test repository accessible (or create test repo)

---

## Workflow 7: Resource Editing (Tasks 1-20, 1.5 hours)

### Task 1: Admin Login
**Duration**: 5 min
```
Navigate to /login
Type admin@test.com, Admin123!
Submit
Verify admin menu visible
```

### Task 2: Navigate to Admin Panel
**Duration**: 2 min
```
Click "Admin Dashboard" in menu
Verify /admin route loads
```

### Task 3: Navigate to Resource Browser
**Duration**: 2 min
```
Click "Resources" in admin sidebar
Verify table loads with resources
```

### Task 4: Find First Resource Row
**Duration**: 2 min
```
Check page.md for resource table structure
Identify first row selector
```

### Task 5: Open Resource Dropdown Menu
**Duration**: 2 min
```
Click: dropdown button (3 dots icon) on first resource
Verify menu opens with Edit, Delete options
```

### Task 6: Click Edit Option
**Duration**: 2 min
```
Click "Edit" in dropdown menu
Verify modal opens
```

### Task 7: Verify Edit Modal Pre-filled
**Duration**: 3 min
```
Check page.md for modal content
Verify: title, URL, description pre-filled with current values
Take screenshot of modal
```

### Task 8: Change Description Field
**Duration**: 3 min
```
Clear existing description
Type: "Updated during Session 7 functional testing - [timestamp]"
```

### Task 9: Click Save Button
**Duration**: 3 min
```
Click "Save" or "Update" button in modal
Wait for success toast
```

### Task 10: Verify Database Updated
**Duration**: 3 min | **Tool**: Supabase MCP
```sql
SELECT description, updated_at
FROM resources
WHERE id = '[resource_id_from_task_4]';
```

**Validation**: description contains "Updated during Session 7"

**If FAIL**: Modal submitted but DB not updated → STOP

---

### Task 11: Verify UI Updated in Table
**Duration**: 2 min
```
Check page.md for resource table
Verify description column shows updated text
```

### Task 12: Navigate to Public Category Page
**Duration**: 3 min
```
Navigate to category where resource appears
As incognito/new tab (public view)
```

### Task 13: Verify Public Page Shows Update
**Duration**: 3 min
```
Search page.md for resource title
Verify description matches updated value
Screenshot evidence
```

**Validation (3-Layer Complete)**:
- UI (admin): Modal saved ✅
- Database: Row updated ✅
- UI (public): Public page shows change ✅

### Tasks 14-20: Test resource deletion, verify cascade

---

## Workflow 8: Bulk Approve (Tasks 21-45, 2 hours)

**THE MOST CRITICAL ADMIN TEST** - Never fully tested before

### Task 21: Create 5 Pending Resources
**Duration**: 10 min | **Tool**: Bash + curl OR Supabase MCP
```bash
# Create via API (faster than UI)
for i in 1 2 3 4 5; do
  curl -X POST http://localhost:3000/api/resources \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"Bulk Approve Test $i\",
      \"url\": \"https://test.com/bulk$i\",
      \"description\": \"Bulk operation test resource $i\",
      \"category\": \"General Tools\"
    }"
done
```

**Validation**: 5 resources created with status='pending'

---

### Task 22: Get Resource IDs from Database
**Duration**: 3 min | **Tool**: Supabase MCP
```sql
SELECT id, title FROM resources
WHERE title LIKE 'Bulk Approve Test%'
ORDER BY title;
```

**Save IDs**: [id1, id2, id3, id4, id5] for later tasks

---

### Task 23: Navigate to Admin Resources
**Duration**: 2 min
```
Navigate to /admin/resources
Filter by status='pending'
```

**Validation**: 5 test resources visible

---

### Task 24: Select First Resource Checkbox
**Duration**: 3 min
```
Find checkbox selector in first row
Click checkbox
Verify checked state
```

---

### Task 25-28: Select Resources 2-5 (4 tasks × 3 min = 12 min)

**Each task**: Click checkbox, verify checked

---

### Task 29: Verify Selection Count Display
**Duration**: 2 min
```
Check page.md for "5 resources selected" text
Verify bulk toolbar visible
```

**If FAIL**: Selection state bug (like Session 4 found) → STOP

---

### Task 30: Find Bulk Approve Button
**Duration**: 2 min
```
Check page.md for bulk action toolbar
Find "Approve" button selector
```

---

### Task 31: Click Bulk Approve Button
**Duration**: 3 min
```
Click bulk approve button
Wait for confirmation modal OR immediate action
```

**Validation**: Modal appears OR toast notification

---

### Task 32: Confirm Bulk Approve (if modal)
**Duration**: 2 min
```
If modal: Click "Confirm" or "Approve All"
Wait for completion (may take 2-5 seconds for 5 resources)
```

---

### Task 33: Wait for Success Notification
**Duration**: 3 min
```
Wait for toast: "Successfully approved 5 resources" or similar
Screenshot
```

**If FAIL**: Timeout or error toast → Bulk operation bug → STOP

---

### Task 34: Verify All 5 in Database
**Duration**: 3 min | **Tool**: Supabase MCP
```sql
SELECT id, title, status, approved_by, approved_at
FROM resources
WHERE id IN ('[id1]', '[id2]', '[id3]', '[id4]', '[id5]')
ORDER BY title;
```

**Validation (CRITICAL)**:
- All 5 have status='approved'
- All 5 have approved_by = admin ID
- All 5 have approved_at within last minute

**If FAIL**: Some approved, some not → Transaction bug → STOP

---

### Task 35: Verify Audit Log Entries (CRITICAL)
**Duration**: 5 min | **Tool**: Supabase MCP
```sql
SELECT resource_id, action, performed_by, created_at
FROM resource_audit_log
WHERE resource_id IN ('[id1]', '[id2]', '[id3]', '[id4]', '[id5]')
ORDER BY created_at DESC;
```

**Validation (MOST IMPORTANT)**:
- 5 entries in audit log (one per resource)
- action = 'approved' or 'bulk_approved'
- performed_by = admin ID

**If FAIL**:
- Bulk approve worked but audit not created
- **CRITICAL BUG**: Audit logging not implemented in bulk endpoint
- STOP → systematic-debugging → Fix audit logging

**This test validates Session 2's suspicious claim**

---

### Task 36: Verify Public Visibility
**Duration**: 5 min
```
Open incognito or new tab
Navigate to /category/general-tools
Check page.md for all 5 test resources
```

**Validation**: All 5 visible on public page

---

### Tasks 37-45: Clean up, document results, screenshot evidence

---

## Workflow 9: Bulk Reject (Tasks 46-65, 1.5 hours)

**Similar pattern to bulk approve**:
- Create 3 pending resources
- Select all 3
- Click Bulk Reject
- Confirm
- Verify database: status='rejected'
- Verify audit log: 3 entries
- Verify NOT on public page

---

## Workflow 10: Bulk Archive (Tasks 66-85, 1.5 hours)

- Create 5 approved resources
- Select 5
- Click Bulk Archive
- Confirm
- Verify database: status='archived'
- Verify removed from public
- Verify still in admin panel with "archived" badge
- Verify audit log: 5 entries

---

## Workflow 11: Bulk Tag Assignment (Tasks 86-110, 2 hours)

**Most complex bulk operation**:
- Select 3 approved resources
- Click "Add Tags" button
- Enter tags: "session-7-test, validated, bulk-tagged"
- Save
- Verify tags table: 3 new tags created
- Verify resource_tags: 9 junctions (3 resources × 3 tags)
- Verify UI: Tags appear on resource cards
- Screenshot evidence

---

## Workflow 12: User Management (Tasks 111-125, 1 hour)

- Navigate to /admin/users
- List users (verify pagination)
- Find test user from Session 6
- Change role to "moderator"
- Verify auth.users.raw_user_meta_data->>'role' updated
- Test access (can moderator access some admin features?)
- Suspend user
- Verify blocked from login

---

## Workflow 13: GitHub Export (Tasks 126-155, 2.5 hours)

**Test with REAL GitHub repository**:

### Phase 1: Export to Markdown
- Navigate to /admin/github
- Enter repository URL
- Configure export options
- Click "Export to GitHub" (dry-run first)
- Verify markdown generated
- Check file structure (headings, lists, categories)

### Phase 2: awesome-lint Validation
```bash
# Via Bash or admin panel
npx awesome-lint [exported-file.md]
```

- Verify validation passes
- If errors: Fix format, re-export
- Iterate until lint passes

### Phase 3: Actual Export (if configured)
- Export without dry-run
- Verify GitHub commit created
- Verify github_sync_history row created
- Check sync history in admin panel

---

## Workflow 14: AI Enrichment (Tasks 156-195, 3 hours)

**Test batch AI processing with REAL Claude API**:

### Phase 1: Start Job
- Navigate to /admin/enrichment
- Select filter: "all" or "unenriched"
- Batch size: 5 (small for testing)
- Click "Start Enrichment"
- Verify enrichment_jobs row created

### Phase 2: Monitor Progress
- Poll job status every 5 seconds
- Verify enrichment_queue rows created
- Watch status updates (pending → processing → completed)
- Verify processed_resources count increases

### Phase 3: Verify Results
- Check resources.metadata updated
- Verify tags created (tags table)
- Verify resource_tags junctions created
- Count: 5 resources × ~3 tags = ~15 junctions

### Phase 4: Verify UI
- Navigate to enriched resources
- Verify tags display on cards
- Verify metadata visible

**If FAIL**: Job stalls, API errors, tags not created → STOP

---

## Documentation & Commit (Tasks 196-200, 30 min)

- Update all test matrices
- Update completion: 45% → 76%
- Create SESSION_7_COMPLETE.md
- Commit with detailed message
- Serena memory: Save session learnings

---

## Success Criteria

- ✅ Resource editing works (admin + public pages update)
- ✅ Bulk approve works (5 resources, audit log, public)
- ✅ Bulk reject works
- ✅ Bulk archive works (removed from public)
- ✅ Bulk tag works (tags + junctions verified)
- ✅ User management works
- ✅ GitHub export generates valid markdown
- ✅ AI enrichment completes successfully

---

**Plan Status**: Ready after Session 6
**Risk Level**: VERY HIGH (bulk operations + integrations complex)
**Expected Bugs**: 10-15 bugs
