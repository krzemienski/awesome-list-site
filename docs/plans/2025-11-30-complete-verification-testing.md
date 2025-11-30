# Complete Application Verification & Testing Plan

> **For Claude:** REQUIRED SUB-SKILLS:
> - Use superpowers:root-cause-tracing when bugs found deep in call stack
> - Use superpowers:systematic-debugging for ALL bugs (mandatory 4-phase investigation)
> - Use superpowers:test-driven-development for new features
> - Use superpowers:executing-plans to implement this plan task-by-task

**Goal**: Complete verification of all 33 application features with systematic debugging for every bug found

**Architecture**: Database-first awesome list platform with hierarchical navigation, GitHub bidirectional sync, AI enrichment, and admin approval workflows

**Tech Stack**: React 18, TypeScript, Express, Drizzle ORM, Supabase, Docker, Redis, Claude AI

**Current Completion**: 33% (11/33 features verified)
**Target Completion**: 95% (31/33 features verified + production deployed)
**Estimated Duration**: 33 hours across 3 sessions

---

## Session 5 Completion Gaps (4.5 hours)

### Task 1: GitHub Import Testing (90 min)

**Goal**: Verify import creates hierarchy tables from any awesome list

**Files**:
- Test: server/github/syncService.ts:54-172
- Verify: Database categories/subcategories tables

**Pre-requisites**:
- Admin user: admin@test.com / Admin123!
- Get JWT token from localStorage after login

**Step 1: Get admin JWT token**

```bash
# Open http://localhost:3000/login in browser
# Login with admin@test.com / Admin123!
# Open DevTools → Application → Local Storage
# Copy value from key: sb-jeyldoypdkgsrfdhdcmm-auth-token
# Extract access_token field
export ADMIN_TOKEN="[paste_access_token_here]"
```

**Step 2: Test import dry-run**

```bash
curl -X POST 'http://localhost:3000/api/admin/import-github' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "repoUrl": "https://github.com/avelino/awesome-go",
    "dryRun": true
  }' | jq .
```

**Expected**: Returns preview with categories to be created, resource count

**IF FAILS**:
- **INVOKE**: superpowers:systematic-debugging
- Phase 1: Check error message, verify token valid, check server logs
- Phase 2: Find working import example, compare
- Phase 3: Test hypothesis (auth issue? parser issue? markdown format issue?)
- Phase 4: Fix root cause, commit, retry

**Step 3: Run actual import**

```bash
curl -X POST 'http://localhost:3000/api/admin/import-github' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "repoUrl": "https://github.com/avelino/awesome-go",
    "dryRun": false
  }' | jq .
```

**Expected**: `{imported: X, updated: Y, skipped: Z}`

**IF FAILS**:
- **INVOKE**: superpowers:systematic-debugging
- **INVOKE**: superpowers:root-cause-tracing if error deep in call stack
- Trace: Import endpoint → syncService → parser → extractHierarchy → find where breaks
- Fix at source, not symptom

**Step 4: Verify Go categories in database**

```sql
SELECT name, slug FROM categories
WHERE name LIKE '%Go%' OR name LIKE '%Golang%'
ORDER BY name;
```

**Expected**: At least 10 Go-related categories

**Step 5: Verify Go resources imported**

```sql
SELECT COUNT(*) FROM resources
WHERE metadata->>'sourceList' LIKE '%awesome-go%';
```

**Expected**: 500+ resources (awesome-go has many)

**Step 6: Test navigation to Go category**

Navigate browser to imported Go category, verify resources display

**Expected**: Category page loads with Go resources

**Step 7: Commit**

```bash
git add -A
git commit -m "test: Verify GitHub import creates hierarchy from awesome-go

- Imported from https://github.com/avelino/awesome-go
- Verified X Go categories created in database
- Verified Y Go resources imported
- Tested navigation to imported category works
- Import feature: VERIFIED WORKING"
```

---

### Task 2: Export + Awesome-Lint Validation (60 min)

**Goal**: Verify export generates spec-compliant awesome list markdown

**Files**:
- API: server/routes.ts (export endpoint)
- Formatter: server/github/formatter.ts
- Validator: server/validation/awesomeLint.ts

**Step 1: Export to markdown**

```bash
curl -X POST 'http://localhost:3000/api/admin/export' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Awesome Video Test Export",
    "description": "Testing export functionality",
    "includeContributing": true,
    "includeLicense": true
  }' > /tmp/awesome-video-export.md

# Check file size
ls -lh /tmp/awesome-video-export.md
```

**Expected**: File > 200KB (2,646 resources)

**IF FAILS** (401 Unauthorized):
- Check: Token still valid (may have expired)
- Get fresh token from browser localStorage
- Retry

**IF FAILS** (500 Server Error):
- **INVOKE**: superpowers:systematic-debugging
- Check: docker-compose logs web | tail -100
- Identify: Which line in formatter.ts throws error
- **INVOKE**: superpowers:root-cause-tracing
- Trace: Export endpoint → formatter → groupResourcesByCategory → find break
- Fix, rebuild Docker, retry

**Step 2: Verify markdown structure**

```bash
# Check starts with # Awesome
head -5 /tmp/awesome-video-export.md

# Count resources
grep -c "^- \[" /tmp/awesome-video-export.md

# Count categories
grep -c "^## " /tmp/awesome-video-export.md
```

**Expected**:
- Starts with "# Awesome Video Test Export"
- 2,646 resource lines
- 21 category headers

**Step 3: Run awesome-lint**

```bash
npx awesome-lint /tmp/awesome-video-export.md
```

**Expected**: Validation passes OR specific errors listed

**IF ERRORS FOUND**:
- **DO NOT** manually edit markdown
- **FIX** in server/github/formatter.ts
- Common issues:
  - Missing final newline → Add in formatter.ts:72
  - Description doesn't end with period → Fix in formatResource()
  - Trailing slashes on URLs → Fix URL cleaning logic
- Rebuild Docker, re-export, re-lint until passes

**Step 4: Commit**

```bash
git add server/github/formatter.ts  # if fixed
git commit -m "test: Verify export generates awesome-lint compliant markdown

- Exported 2,646 resources to markdown
- awesome-lint validation: PASSED (or: fixed X errors)
- Verified structure: 21 categories, proper format
- Export feature: VERIFIED WORKING"
```

---

### Task 3: Bookmark Workflow Testing (60 min)

**Goal**: Verify complete bookmark add/view/remove workflow

**Files**:
- Component: client/src/components/resource/BookmarkButton.tsx
- API: server/routes.ts:588-665
- Database: user_bookmarks table

**Step 1: Navigate to category page**

```
Open browser: http://localhost:3000/category/encoding-codecs
Login if needed: admin@test.com / Admin123!
```

**Step 2: Click bookmark button on first resource**

Click bookmark button (star or bookmark icon)

**Expected**: Success toast OR button state changes

**IF FAILS** (button click does nothing):
- **INVOKE**: superpowers:systematic-debugging
- Phase 1: Check console errors, network tab for API call
- Phase 2: Compare BookmarkButton.tsx with working component
- Phase 3: Test hypothesis (UUID validation? API error? State issue?)
- Phase 4: Fix, rebuild Docker, retry

**Step 3: Verify database row created**

```sql
SELECT user_id, resource_id, notes, created_at
FROM user_bookmarks
WHERE user_id = '58c592c5-548b-4412-b4e2-a9df5cac5397'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: 1 row with recent timestamp

**IF NO ROW**:
- **INVOKE**: superpowers:root-cause-tracing
- Trace: Button click → API call → bookmark endpoint → storage.addBookmark → database
- Check network: Was POST /api/bookmarks/:id called?
- Check response: 200 OK or error?
- Check server logs: Any errors?
- Find exact break point, fix at source

**Step 4: Navigate to bookmarks page**

```
Navigate: http://localhost:3000/bookmarks
```

**Expected**: Bookmarked resource appears in list

**Step 5: Click remove bookmark**

Click remove/delete button

**Expected**: Resource disappears OR confirmation modal

**Step 6: Verify database deletion**

```sql
SELECT COUNT(*) FROM user_bookmarks
WHERE user_id = '58c592c5-548b-4412-b4e2-a9df5cac5397';
```

**Expected**: 0

**Step 7: Commit**

```bash
git commit -m "test: Verify bookmark workflow end-to-end

- Add bookmark: button click → DB row created
- View bookmarks: page shows bookmarked resource
- Remove bookmark: button click → DB row deleted
- Bookmark feature: VERIFIED WORKING"
```

---

### Task 4: Admin Dashboard Testing (60 min)

**Goal**: Verify admin panel statistics and resource browser

**Files**:
- Dashboard: client/src/pages/AdminDashboard.tsx
- Stats API: server/routes.ts:1121-1129
- Browser: client/src/components/admin/ResourceBrowser.tsx

**Step 1: Login as admin**

Navigate: http://localhost:3000/login
Login: admin@test.com / Admin123!

**Step 2: Navigate to admin dashboard**

Navigate: http://localhost:3000/admin

**Expected**: Dashboard loads (no 403 Forbidden)

**IF FAILS** (403):
- Check: user.user_metadata.role === 'admin' in JWT
- **INVOKE**: superpowers:systematic-debugging
- Verify: isAdmin middleware logic
- Check: AdminGuard component
- Fix if broken

**Step 3: Verify statistics**

Dashboard should show:
- Resources: 2,646
- Categories: 21
- Pending Approvals: 0 (or current count)

**Verify via API**:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/admin/stats | jq .
```

**Expected**: `{users: X, resources: 2646, journeys: Y, pendingApprovals: Z}`

**IF WRONG COUNTS**:
- **INVOKE**: superpowers:root-cause-tracing
- Trace: Dashboard component → useQuery → API → storage.getAdminStats → SQL
- Find where count diverges from reality
- Fix query, rebuild, verify

**Step 4: Navigate to resource browser**

Click "Resources" in admin sidebar

**Expected**: Table with resources, pagination, filters

**Step 5: Test filtering**

Select filter: Status = "approved"

**Expected**: Table shows only approved resources

**Step 6: Test sorting**

Click column header (e.g., "Title")

**Expected**: Table re-sorts, indicator shows sort direction

**Step 7: Commit**

```bash
git commit -m "test: Verify admin dashboard and resource browser

- Dashboard stats accurate: 2,646 resources, 21 categories
- Resource browser table loads
- Filtering by status works
- Sorting by column works
- Admin panel: VERIFIED WORKING (basic features)"
```

---

## Session 6: Complete User Feature Testing (11 hours)

### Task 5-10: User Workflows (6 hours)

**Each follows same pattern with systematic-debugging**:

1. Navigate to feature
2. Perform action
3. Verify database change
4. Verify UI update
5. **IF FAILS**: systematic-debugging → root-cause-tracing if needed → fix → rebuild → retry
6. Commit when working

**Workflows**:
- Account creation (if signup implemented)
- Favorites (similar to bookmarks)
- Submit resource
- Profile page with stats
- Learning journeys (if seeded)
- Preferences and recommendations

**Systematic-Debugging Template for ALL bugs**:

```
BUG FOUND: [Description]

PHASE 1: Root Cause Investigation
- Error message: [Exact text]
- Reproduced: [Steps]
- Recent changes: [Git log]
- Evidence gathered: [Logs, SQL, network]

PHASE 2: Pattern Analysis
- Working example: [Similar feature that works]
- Differences: [What's different]
- Dependencies: [What this needs]

PHASE 3: Hypothesis
- Theory: [What I think is wrong]
- Test: [Minimal change to test]
- Result: [Pass/fail]

PHASE 4: Fix
- Root cause: [Confirmed issue]
- Fix: [Code change]
- Verification: [How to verify]
- Commit: [After verified working]
```

---

## Session 7: Admin Features + GitHub Integration (13 hours)

### Task 11-18: Admin Workflows (8 hours)

**Each with mandatory bug protocols**:

1. Resource editing modal
2. Bulk approve (select 3, approve, verify DB + audit log)
3. Bulk reject
4. Bulk archive
5. Bulk tag assignment
6. User management (role changes)
7. Filtering combinations
8. Pagination

**Bug Protocol**:
- STOP immediately when bug found
- INVOKE systematic-debugging (no quick fixes!)
- INVOKE root-cause-tracing if needed
- Fix at source
- Rebuild Docker
- Verify fix works
- THEN continue to next task

### Task 19-23: GitHub Integration Testing (5 hours)

1. **Import from awesome-python** (1.5h)
   - Test with different markdown structure
   - Verify hierarchy extraction works
   - IF FAILS: systematic-debugging of parser logic

2. **Export + Awesome-Lint Loop** (2h)
   - Export current database
   - Run awesome-lint
   - **FOR EACH ERROR**: Fix in formatter.ts, re-export, re-lint
   - Iterate until validation passes
   - **NO manual markdown editing** - all fixes in code

3. **Link Checker** (1h)
   - Run on 100 sample resources
   - Document broken links
   - Decide: fix or remove

4. **AI Enrichment Job** (30min)
   - Start small batch (5 resources)
   - Monitor job progress
   - Verify tags created

---

## Session 8: Production Readiness (9 hours)

### Task 24-30: Security & Performance (6 hours)

1. **RLS Testing** (1h):
   - Create test user
   - Verify user can't see other user's bookmarks
   - Verify user can't access pending resources
   - IF BREACH: systematic-debugging of RLS policies

2. **Rate Limiting** (30min):
   - Test 100 requests/minute
   - Verify 429 after limit

3. **Performance Benchmarking** (2h):
   - Lighthouse audits (5 pages)
   - Load testing with autocannon
   - Database query optimization

4. **Code Cleanup** (2h):
   - Remove debug console.logs (still present)
   - Fix remaining `any` types
   - Delete any remaining unused files

### Task 31-35: Production Deployment (3 hours)

1. SSL configuration
2. Environment variables
3. Staging deployment
4. Production deployment
5. Monitoring setup

---

## Critical Bug Handling Protocol

**MANDATORY FOR ALL BUGS** (No Exceptions):

### When Bug Found

```
IMMEDIATE ACTIONS:
1. STOP current task
2. Mark task status: BLOCKED by bug
3. Create bug document: docs/bugs/BUG_[DATE]_[DESCRIPTION].md
4. INVOKE systematic-debugging skill
```

### Bug Document Template

```markdown
# Bug: [Title]

**Found**: [Date/Time]
**Task**: [Which task was executing]
**Severity**: HIGH / MEDIUM / LOW

## Symptom
[What user sees / what error shows]

## Systematic Debugging

### Phase 1: Root Cause Investigation
- Error message: [Exact text]
- Stack trace: [If available]
- Reproduced: YES/NO
- Steps: [1, 2, 3...]

### Phase 2: Pattern Analysis
- Working example: [Similar working code]
- Differences: [List all differences]

### Phase 3: Hypothesis Testing
- Hypothesis: [What I think causes this]
- Test: [Minimal change]
- Result: CONFIRMED / REJECTED

### Phase 4: Fix Implementation
- Root cause: [Confirmed issue]
- Fix location: [File:line]
- Code change: [Actual fix]
- Verification: [Test that proves fix]

## Resolution
- Status: FIXED / WORKAROUND / DEFERRED
- Commit: [SHA]
```

### After Bug Fixed

```
RESUME ACTIONS:
1. Mark bug: RESOLVED in bug document
2. Link commit SHA to bug document
3. Update task status: UNBLOCKED
4. Restart task from beginning (don't continue mid-task)
5. Verify task completes successfully
6. THEN move to next task
```

### If 3+ Bugs in Same Area

```
ESCALATION:
1. STOP task execution
2. Question: Is this architectural problem?
3. Review: Should we refactor vs continue fixing?
4. Discuss with user before continuing
```

---

## Task Completion Criteria

**A task is ONLY complete when**:
- ✅ Code implemented
- ✅ Docker rebuilt (if code changed)
- ✅ Tests passing (if tests exist)
- ✅ Manual verification done (browser or curl)
- ✅ Database verified (if DB change)
- ✅ No bugs remaining
- ✅ Committed to git

**A task is NOT complete if**:
- ❌ "Mostly working" (it must fully work)
- ❌ "Will test later" (test now)
- ❌ "Known issue, documented" (fix it, don't defer)
- ❌ "Works on my machine" (works in Docker)

---

## Execution Guidelines

### For Each Task

1. **Read task completely** (don't skim)
2. **Execute steps in order** (don't skip)
3. **Verify at each step** (don't assume)
4. **Stop if bug found** (invoke debugging skills)
5. **Fix before continuing** (no deferral)
6. **Commit when complete** (atomic commits)

### Git Commit Discipline

**Commit after EVERY completed task**:
- Keeps work atomic
- Easy rollback if needed
- Clear history
- Forces verification before moving on

**Commit message format**:
```
type: description

- Detail 1
- Detail 2
- Verification: [How verified]
```

Types: feat, fix, test, docs, refactor

### Docker Rebuild Discipline

**Rebuild after EVERY code change**:
- Frontend changes: Rebuild web container
- Backend changes: Rebuild web container
- Config changes: Rebuild all
- **Always verify startup**: Check logs for errors

**Command sequence**:
```bash
docker-compose down
docker-compose build web  # or: build --no-cache web (if caching issues)
docker-compose up -d
sleep 30  # Wait for startup
docker-compose logs web | tail -50  # Check for errors
docker-compose ps  # Verify healthy
```

---

## Success Criteria

**Session 5 Gaps Complete When**:
- ✅ GitHub import tested with awesome-go (hierarchy created, resources imported)
- ✅ Export generates markdown passing awesome-lint
- ✅ Bookmark workflow verified end-to-end
- ✅ Admin dashboard statistics accurate

**Session 6 Complete When**:
- ✅ All 10 user features verified
- ✅ Search functionality working
- ✅ Bookmarks, favorites, profile tested
- ✅ Learning journeys functional

**Session 7 Complete When**:
- ✅ All 12 admin features verified
- ✅ Bulk operations tested (approve, reject, archive, tag)
- ✅ GitHub import/export tested with external repos
- ✅ AI enrichment batch job verified

**Session 8 Complete When**:
- ✅ Security tested (RLS, XSS, rate limiting)
- ✅ Performance benchmarked (Lighthouse, load test)
- ✅ Deployed to production with SSL
- ✅ Monitoring active

**Project Complete When**:
- ✅ 31/33 features verified working
- ✅ Production deployed and stable
- ✅ All documentation complete
- ✅ Honest completion: 95%+

---

## Estimated Timeline

| Session | Tasks | Duration | Bugs Expected | Completion After |
|---------|-------|----------|---------------|------------------|
| 5 Gaps | 4 | 4.5h | 2-3 | 35% |
| 6 | 50+ | 11h | 8-12 | 50% |
| 7 | 80+ | 13h | 10-15 | 75% |
| 8 | 60+ | 9h | 5-8 | 95% |

**Total**: 37.5 hours remaining (from current 33%)

**With Systematic Debugging**: Each bug adds 30-60 min (investigate + fix + verify)

---

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct Pattern |
|----------------|-------------------|
| "Quick fix, investigate later" | Systematic-debugging FIRST, then fix |
| "Skip this test, seems minor" | Test everything in plan |
| "Commit with known bugs" | Fix bugs before committing |
| "Document bug, fix later" | Fix now, document fix |
| "Try multiple changes at once" | One change, verify, repeat |
| "Assume Docker rebuilt" | Always rebuild after code change |
| "Browser cache cleared" | Use --no-cache for Docker builds |

---

**PLAN STATUS**: Ready for execution
**METHODOLOGY**: Systematic debugging + root-cause tracing mandatory
**COMPLETION**: Tasks complete only when fully verified
**QUALITY**: Production-ready or not done

**Next**: Execute tasks 1-4 to complete Session 5 gaps, then continue Sessions 6-8
