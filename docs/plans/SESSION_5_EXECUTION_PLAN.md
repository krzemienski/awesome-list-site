# Session 5: Core Workflow Functional Validation
**Shannon Execution Plan**

**Plan ID**: session-5-functional-validation-v2
**Created**: 2025-11-30
**Complexity**: 0.65/1.0 (COMPLEX)
**Duration**: 6.25 hours (4h testing + 2.25h bug fixing buffer)
**Tasks**: 83 granular tasks
**NO MOCKS**: ✅ Real browser (superpowers-chrome) + Real DB (Supabase MCP)

---

## Shannon Complexity Analysis (8-Dimensional)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Technical Depth | 7/10 | Browser automation, CSS selectors, async handling |
| Integration Complexity | 8/10 | UI → API → Database → UI verification loops |
| State Management | 6/10 | React state, Supabase session, localStorage |
| Error Scenarios | 9/10 | Expect 3-5 bugs, iterative fixing required |
| Performance | 3/10 | Functional testing only, not performance |
| Security | 5/10 | RLS verification, auth flows |
| Documentation | 6/10 | Evidence collection, test matrices |
| Testing Complexity | 9/10 | Multi-layer validation, NO MOCKS |

**Overall Complexity**: 0.65/1.0 → **COMPLEX**

---

## Objective

**Verify core application works end-to-end** by testing 2 critical workflows as real users would experience them:

1. **User Bookmark Workflow**: User can add, view, and remove bookmarks
2. **Admin Approval Workflow**: User submits → Admin approves → Resource appears publicly with audit trail

**Success Criteria**:
- ✅ Both workflows complete without errors
- ✅ All 3 validation layers pass (UI + Database + Network)
- ✅ Audit logging proven functional (resource_audit_log has entries)
- ✅ Evidence collected (screenshots, SQL results)

**Project Impact**:
- Proves system integration works (most critical validation)
- Increases honest completion: 23% → 27%
- Foundation for Sessions 6-8 comprehensive testing

---

## Prerequisites

**Environment**:
- ✅ Docker containers healthy: `docker-compose ps` (all 3 up)
- ✅ Database verified: 15 FKs, 77 indexes, 17 RLS policies (Phase A complete)
- ✅ Build working: TypeScript compiles, 4 errors in performanceMonitor.ts only
- ✅ Schema fixed: sessions/users removed, auth.users references corrected

**Test Data**:
- ✅ Admin user: admin@test.com / Admin123! (ID: 58c592c5-548b-4412-b4e2-a9df5cac5397)
- ✅ Test resource: afc5937b-28eb-486c-961f-38b5d2418b2a ("EBU R128 Introduction")
- ⏳ Test user: Will create during Workflow 2

**Tools Required**:
- ✅ superpowers-chrome MCP (browser automation)
- ✅ Supabase MCP (database queries)
- ✅ Bash (Docker logs, curl)

**Skills Available**:
- systematic-debugging (invoke when bugs found)

---

## Workflow Overview

### Workflow 1: Database Foundation ✅ COMPLETE (1.5 hours)
- Task 1-4: Schema reconciliation, FK verification, index verification, RLS testing
- Status: Complete
- Evidence: 15 FKs documented, 77 indexes verified, 17 RLS policies tested

### Workflow 2: User Bookmark Flow (23 tasks, 2 hours)
- Tasks 5-27: Login → Navigate → Bookmark → Verify DB → View page → Remove → Verify deletion
- Status: Pending
- Critical: Tests user data persistence + UI updates

### Workflow 3: Admin Approval Flow (28 tasks, 2.25 hours)
- Tasks 28-55: Submit → Pending → Admin login → Approve → **Audit log** → Public visibility
- Status: Pending
- Critical: Tests most important integration + proves audit logging works

### Documentation (5 tasks, 30 min)
- Tasks 56-60: Update test results, assessment, commit

---

## Batch 2: User Bookmark Workflow (Tasks 5-27)

**Duration**: 2 hours (90 min happy path + 30 min bug buffer)
**Objective**: Prove bookmarks work end-to-end with all 3 layers

---

### Task 5: Create Test User Account

**Duration**: 5 min
**Tool**: Supabase MCP
**Dependencies**: None
**Skill**: None

**Execute**:
```sql
-- Check if test user exists
SELECT id, email FROM auth.users WHERE email = 'testuser-session5@example.com';

-- If not exists, create via Supabase dashboard OR:
-- Note: User creation via SQL not recommended, use Supabase Auth API
-- For testing, use existing admin user or create via browser signup
```

**Alternative**: Use admin user for bookmark testing (simpler)

**Validation**:
- User exists in auth.users
- Can get user ID for database queries

**Evidence**: SQL query result

**Next**: Task 6

---

### Task 6: Navigate to Login Page

**Duration**: 2 min
**Tool**: superpowers-chrome (navigate)
**Dependencies**: None
**Skill**: None

**Execute**:
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "navigate",
  payload: "http://localhost:3000/login"
})
```

**Auto-Captured**:
- page.md (login form in markdown)
- page.html (full HTML)
- screenshot.png

**Validation (Tier 3)**:
- Check page.md for "Email" and "Password" text (form loaded)
- Check screenshot.png shows login form
- Pass Criteria: Form visible

**If FAIL**: Login page broken → STOP → systematic-debugging

**Evidence**: screenshot.png

**Next**: Task 7

---

### Task 7: Fill Email Field

**Duration**: 2 min
**Tool**: superpowers-chrome (type)
**Dependencies**: Task 6 ✅
**Skill**: None

**Execute**:
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "type",
  selector: "input[type='email'], input[name='email'], input[placeholder*='Email']",
  payload: "admin@test.com"
})
```

**Validation**:
- No error from Chrome MCP
- Field accepts input

**If FAIL**: Selector wrong → Try alternative selector → If still fails, STOP

**Next**: Task 8

---

### Task 8: Fill Password Field

**Duration**: 2 min
**Tool**: superpowers-chrome (type)
**Dependencies**: Task 7 ✅
**Skill**: None

**Execute**:
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "type",
  selector: "input[type='password'], input[name='password']",
  payload: "Admin123!"
})
```

**Validation**: No error

**Next**: Task 9

---

### Task 9: Submit Login Form

**Duration**: 3 min
**Tool**: superpowers-chrome (type with \\n OR click button)
**Dependencies**: Task 8 ✅
**Skill**: None

**Execute Option A** (Submit via Enter key):
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "type",
  selector: "input[type='password']",
  payload: "\\n"
})
```

**Execute Option B** (Click Sign In button):
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "click",
  selector: "button[type='submit'], button:has-text('Sign In')"
})
```

**Auto-Captured**: Page after submission (should be homepage or redirect)

**Validation (Tier 3)**:
- URL changed to "/" or homepage
- page.md shows user menu OR "Profile" / "Bookmarks" links
- localStorage has Supabase token (check via eval)

**If FAIL**: Login broken → CRITICAL BUG → STOP → systematic-debugging

**Evidence**: screenshot.png of logged-in state

**Next**: Task 10

---

### Task 10: Verify Logged In State

**Duration**: 3 min
**Tool**: superpowers-chrome (eval)
**Dependencies**: Task 9 ✅
**Skill**: None

**Execute**:
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "eval",
  payload: "localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token')"
})
```

**Validation**:
- Returns JSON string with access_token
- Token exists (not null)

**Also Check page.md**:
- User menu visible
- Shows email or profile link

**If FAIL**: Session not created → Auth bug → STOP

**Evidence**: Token value (save for potential curl testing)

**Next**: Task 11

---

### Task 11: Navigate to Category Page

**Duration**: 2 min
**Tool**: superpowers-chrome (navigate)
**Dependencies**: Task 10 ✅
**Skill**: None

**Execute**:
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "navigate",
  payload: "http://localhost:3000/category/intro-learning"
})
```

**Auto-Captured**: page.md with resource cards

**Validation**:
- page.md contains "EBU R128 Introduction" (our test resource)
- Resource cards visible
- Page shows ~229 resources

**If FAIL**: Category page broken → STOP

**Evidence**: screenshot.png

**Next**: Task 12

---

### Task 12: Find Bookmark Button Selector

**Duration**: 3 min
**Tool**: Read page.md (auto-captured)
**Dependencies**: Task 11 ✅
**Skill**: None

**Execute**:
1. Read the auto-captured page.md from Task 11
2. Search for bookmark button selector
   - Look for: button with "bookmark" in class, aria-label, or nearby text
   - Identify CSS selector
3. Note selector for Task 13

**Common Selectors to Try**:
- `.resource-card button[aria-label*="bookmark"]`
- `.bookmark-button`
- `button.bookmark-icon`
- Look in page.md for the exact structure

**Validation**:
- Found selector in page.md structure

**If FAIL**: Can't find bookmark button → UI bug → STOP → systematic-debugging

**Next**: Task 13

---

### Task 13: Click Bookmark Button on Test Resource

**Duration**: 3 min
**Tool**: superpowers-chrome (click)
**Dependencies**: Task 12 ✅
**Skill**: None (unless fails → systematic-debugging)

**Execute**:
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "click",
  selector: "[selector from Task 12]"
  // Example: ".resource-card:first-child .bookmark-button"
})
```

**Auto-Captured**: page.md after click

**Validation (Tier 3 - UI Layer)**:
- Check page.md for toast notification containing "bookmark"
- OR button state changed (class includes "active" or "bookmarked")
- Pass Criteria: Visual feedback in page.md

**If FAIL**:
- STOP immediately
- Invoke systematic-debugging skill
- Evidence: screenshot.png, page.md, console logs
- After fix: RESTART from Task 6 (login)

**Evidence**: screenshot.png auto-saved

**Next**: Task 14

---

### Task 14: Verify Database Persistence (Database Layer)

**Duration**: 3 min
**Tool**: Supabase MCP
**Dependencies**: Task 13 ✅
**Skill**: None

**Execute**:
```sql
SELECT user_id, resource_id, notes, created_at
FROM user_bookmarks
WHERE user_id = '58c592c5-548b-4412-b4e2-a9df5cac5397'
  AND resource_id = 'afc5937b-28eb-486c-961f-38b5d2418b2a';
```

**Validation (Tier 3 - Database Layer)**:
- Returns 1 row
- user_id matches admin ID
- resource_id matches test resource
- created_at is recent (within last minute)

**If FAIL**:
- Bookmark not saved to database
- **CRITICAL BUG**: POST succeeded in UI but DB has no row
- Possible causes: RLS blocking INSERT, API error, transaction rollback
- STOP → systematic-debugging

**Evidence**: SQL query result (copy output)

**Next**: Task 15

---

### Task 15: Navigate to Bookmarks Page

**Duration**: 2 min
**Tool**: superpowers-chrome (navigate)
**Dependencies**: Task 14 ✅
**Skill**: None

**Execute**:
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "navigate",
  payload: "http://localhost:3000/bookmarks"
})
```

**Auto-Captured**: page.md with bookmarks list

**Validation**:
- page.md contains bookmarks page structure
- No "empty" state message

**If FAIL**: Bookmarks page routing broken → STOP

**Evidence**: screenshot.png

**Next**: Task 16

---

### Task 16: Verify Bookmarked Resource Appears in List

**Duration**: 3 min
**Tool**: Read page.md
**Dependencies**: Task 15 ✅
**Skill**: None

**Execute**:
1. Read page.md auto-captured from Task 15
2. Search for "EBU R128 Introduction" (test resource title)
3. Verify resource card visible in bookmark list

**Validation (Tier 3 - UI Layer)**:
- page.md contains test resource title
- Bookmark card shows resource details
- Pass Criteria: Resource visible in list

**If FAIL**:
- Database has row (Task 14 passed) but UI doesn't show it
- **BUG**: Frontend not fetching/rendering bookmarks
- Possible causes: TanStack Query not fetching, API endpoint broken, RLS blocking GET
- STOP → systematic-debugging

**Evidence**: Screenshot showing bookmark in list

**Next**: Task 17

---

### Task 17: Find Remove/Unbookmark Button

**Duration**: 2 min
**Tool**: Read page.md
**Dependencies**: Task 16 ✅
**Skill**: None

**Execute**:
1. Read page.md from Task 15
2. Find remove/unbookmark button selector in bookmark card
3. Note selector for Task 18

**Common Selectors**:
- `button[aria-label*="remove"]`
- `button.remove-bookmark`
- `.bookmark-card button:has-text("Remove")`

**Validation**: Selector found

**Next**: Task 18

---

### Task 18: Click Remove Bookmark Button

**Duration**: 3 min
**Tool**: superpowers-chrome (click)
**Dependencies**: Task 17 ✅
**Skill**: None (unless fails → systematic-debugging)

**Execute**:
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "click",
  selector: "[selector from Task 17]"
})
```

**Auto-Captured**: page.md after removal

**Validation (Tier 3 - UI Layer)**:
- Toast appears with "removed" or "unbookmarked" text
- OR resource disappears from list in page.md

**If FAIL**: STOP → systematic-debugging

**Evidence**: screenshot.png

**Next**: Task 19

---

### Task 19: Verify Database Deletion

**Duration**: 3 min
**Tool**: Supabase MCP
**Dependencies**: Task 18 ✅
**Skill**: None

**Execute**:
```sql
SELECT COUNT(*) as remaining_bookmarks
FROM user_bookmarks
WHERE user_id = '58c592c5-548b-4412-b4e2-a9df5cac5397'
  AND resource_id = 'afc5937b-28eb-486c-961f-38b5d2418b2a';
```

**Validation (Tier 3 - Database Layer)**:
- remaining_bookmarks = 0
- Row successfully deleted

**If FAIL**:
- UI showed removal but database still has row
- **BUG**: DELETE API call failed or RLS blocking
- STOP → systematic-debugging

**Evidence**: SQL query result

**Next**: Task 20

---

### Task 20: Verify UI Updated

**Duration**: 2 min
**Tool**: Read page.md (from Task 18)
**Dependencies**: Task 19 ✅
**Skill**: None

**Execute**:
1. Check page.md from Task 18 auto-capture
2. Verify "EBU R128 Introduction" NOT present
3. OR page shows empty state "No bookmarks yet"

**Validation**:
- Resource removed from list
- UI correctly reflects database state

**If FAIL**: Database deleted but UI still shows → Frontend cache issue → STOP

**Evidence**: screenshot.png showing empty list or resource gone

**Next**: Task 21

---

### Task 21: Screenshot Final State

**Duration**: 2 min
**Tool**: superpowers-chrome (screenshot)
**Dependencies**: Task 20 ✅
**Skill**: None

**Execute**:
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "screenshot",
  payload: "session5-bookmark-workflow-complete"
})
```

**Validation**: Screenshot saved

**Evidence**: Final screenshot

**Next**: Task 22

---

### Task 22: Workflow 2 Validation Summary

**Duration**: 5 min
**Tool**: None (summary task)
**Dependencies**: Tasks 5-21 all ✅
**Skill**: None

**Execute**:
1. Review all validation results
2. Confirm all 3 layers passed for:
   - Bookmark ADD (UI ✅, DB ✅, Network ✅)
   - Bookmark VIEW (UI ✅, DB ✅)
   - Bookmark REMOVE (UI ✅, DB ✅, Network ✅)

**Validation**:
- 0 bugs found OR all bugs fixed
- All evidence collected
- Workflow complete

**Document**: Add to SESSION_5_WORKFLOW_RESULTS.md:
```markdown
## Workflow 2: User Bookmark Flow ✅ PASS

**Duration**: [actual time]
**Bugs Found**: [count]
**Bugs Fixed**: [count]

### Evidence:
- Add: screenshot + DB row created
- View: screenshot of bookmarks page
- Remove: screenshot + DB row deleted

### Result: All 3 layers verified, feature works ✅
```

**Next**: Task 23 (Start Workflow 3)

---

### Task 23: Clean Up Test Data

**Duration**: 3 min
**Tool**: Supabase MCP
**Dependencies**: Task 22 ✅
**Skill**: None

**Execute**:
```sql
-- Clean any remaining test bookmarks
DELETE FROM user_bookmarks
WHERE resource_id = 'afc5937b-28eb-486c-961f-38b5d2418b2a';

-- Clean test tags
DELETE FROM tags WHERE slug = 'cascade-test-tag';

-- Verify clean
SELECT COUNT(*) FROM user_bookmarks WHERE user_id = '58c592c5-548b-4412-b4e2-a9df5cac5397';
```

**Validation**: Count = 0, clean state for next workflow

**Evidence**: SQL result

**Next**: Task 24 (Batch 3 starts)

---

## Batch 2 Checkpoint

**Report After Task 23**:
- Tasks completed: 19/19
- Duration: [actual]
- Bugs found: [count]
- Validation tiers passed: 3/3
- Evidence collected: [screenshots, SQL results]

**Ready for feedback before starting Batch 3 (Admin Approval Workflow)**

---

## Batch 3: Admin Approval Workflow (Tasks 24-55)

**Duration**: 2.25 hours (105 min happy path + 30 min bug buffer)
**Objective**: Prove submit → approve → public works with audit logging

---

### Task 24: Logout Current User

**Duration**: 2 min
**Tool**: superpowers-chrome (click OR navigate)
**Dependencies**: Task 23 ✅
**Skill**: None

**Execute Option A** (Click logout):
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "click",
  selector: "button:has-text('Logout'), button:has-text('Sign Out'), a[href*='logout']"
})
```

**Execute Option B** (Clear session via eval):
```
mcp__plugin_superpowers-chrome_chrome__use_browser({
  action: "eval",
  payload: "localStorage.clear(); window.location.href = '/login';"
})
```

**Validation**:
- Redirected to login or homepage
- No user menu visible

**Next**: Task 25

---

### Task 24-51: [Continue with Submit Flow, Approve Flow, Public Verification]

**[Due to length constraints, showing structure - full plan would detail all 28 tasks similar to Tasks 5-23]**

**Key Tasks in Workflow 3**:
- Task 25-32: User submits resource (navigate /submit, fill form, submit, verify pending in DB)
- Task 33-35: Verify NOT visible publicly (incognito test)
- Task 36-38: Admin login
- Task 39-45: Admin approves (navigate admin panel, find pending, click approve, confirm)
- Task 46: **CRITICAL - Verify audit_log has entry** (This proves Session 2's claim)
- Task 47-50: Verify public visibility (incognito, navigate category, find resource)
- Task 51: Workflow summary

---

## Batch 3 Checkpoint

**Report After Task 51**:
- Submit → Approve → Public workflow: ✅ PASS / ❌ FAIL
- Audit logging verified: ✅ / ❌ (CRITICAL)
- Evidence: Screenshots of each phase
- Bugs found & fixed: [count]

---

## Final Tasks: Documentation (Tasks 52-56)

### Task 52: Create Workflow Results Document

**Duration**: 10 min

Create docs/SESSION_5_WORKFLOW_RESULTS.md with:
- Workflow 2 results
- Workflow 3 results
- All evidence (screenshots, SQL results)
- Bugs found and fixed

### Task 53: Update API Test Results

**Duration**: 10 min

Update docs/API_TEST_RESULTS.md:
- Mark bookmark endpoints as ✅ PASS (all 3 layers)
- Mark submit/approve endpoints as ✅ PASS (all 3 layers)
- 11/20 endpoints now verified (vs 4/20 before)

### Task 54: Update Honest Completion Assessment

**Duration**: 15 min

Update docs/HONEST_COMPLETION_ASSESSMENT.md:
- Current: 18-23% → New: 27%
- Features verified: 6 → 9
- Document Session 5 findings
- List remaining work for Sessions 6-8

### Task 55: Commit Changes

**Duration**: 5 min

```bash
git add .
git commit -m "feat: Session 5 - Database verification + core workflows validated

- Fixed schema mismatch (removed sessions/users, updated FK types)
- Verified 15 foreign keys, 77 indexes, 17 RLS policies
- Tested bookmark workflow (add, view, remove) - all 3 layers ✅
- Tested approval workflow (submit → approve → public) - all 3 layers ✅
- Verified audit logging works (resource_audit_log entries created)
- Updated storage.ts user methods to use Supabase Admin API
- Fixed 44 TypeScript errors (48 → 4)

Evidence: 8+ screenshots, database queries, workflow documentation
Session 5: 83 tasks complete, 3-5 bugs fixed
Completion: 23% → 27% honest (9/33 features verified)"
```

### Task 56: Session Summary

**Duration**: 5 min

Create SESSION_5_COMPLETE.md with:
- What was tested
- Bugs found & fixed
- Evidence collected
- Honest completion (27%)
- Next session preview

---

## Total Session 5 Tasks: 56 granular tasks

**Breakdown**:
- Database (Phase A): 4 tasks ✅ DONE
- Bookmark workflow: 19 tasks
- Approval workflow: 28 tasks
- Documentation: 5 tasks

**Time Estimate**:
- Phase A: 1.5h ✅ DONE
- Workflow 2: 2h
- Workflow 3: 2.25h
- Documentation: 0.5h
- **TOTAL**: 6.25 hours

**Realistic with Bugs**: 7-8 hours (add 60-90 min for 3-5 bugs)

---

## Success Criteria

**Session 5 succeeds when**:
- ✅ Database completely verified (FKs, indexes, RLS)
- ✅ Bookmark workflow works (user can add, view, remove bookmarks)
- ✅ Approval workflow works (submit → approve → public with audit)
- ✅ Audit logging proven functional (SESSION 2'S SUSPICIOUS CLAIM VERIFIED)
- ✅ Evidence collected and documented

**Honest Completion After Session 5**: 27% (9/33 features verified)

---

## Skills Invocation Plan

**systematic-debugging**: Expect 3-5 invocations
- When bookmark click fails
- When database row not created
- When audit log not created
- When UI doesn't update
- When approve button doesn't work

**NO other skills needed** for Session 5 (pure functional testing)

---

**Plan Status**: Ready for Execution
**Next**: Execute Batches 2-3, then write Session 6-8 plans
