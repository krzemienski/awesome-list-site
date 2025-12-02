# Parallel Chrome DevTools MCP Completion Plan

> **For Claude:** REQUIRED SUB-SKILLS:
> - Use @multi-context-integration-testing (Chrome DevTools MCP operations manual)
> - Use @dispatching-parallel-agents (for parallel coordination)
> - Use @systematic-debugging (when bugs found)
> - Use @executing-plans (to execute this plan)

**Goal:** Complete systematic verification of all 33 application features using 4 parallel specialist agents with Chrome DevTools MCP for browser automation
**Architecture:** Multi-agent parallel execution with continuous test-debug-fix cycles per domain
**Tech Stack:** Chrome DevTools MCP + Supabase MCP + Serena MCP (code changes)

---

## Part 1: Executive Summary

### Current Status

**Test Infrastructure:**
- 298 existing tests across 33 Playwright spec files
- Test helpers: MultiContextTestHelper, database.ts (50+ functions), assertions.ts
- Unknown pass/fail baseline (tests not recently run)
- Chrome DevTools MCP available as alternative to Playwright test runner

**Verified Features (from previous sessions):**
- 13 features verified via Session 8 integration testing framework
- 40% overall completion (13/33 features)

### Why Chrome DevTools MCP Instead of Playwright Test Runner

| Aspect | Playwright npx test | Chrome DevTools MCP |
|--------|---------------------|---------------------|
| **Agent Control** | Runs in subprocess, limited visibility | Real-time agent control, can debug interactively |
| **Debugging** | Requires replay, trace files | Live inspection, immediate response |
| **Database Sync** | Separate process for verification | Same agent can query Supabase MCP instantly |
| **Bug Fixing** | Stop, fix, rebuild, restart suite | Fix mid-session, verify immediately |
| **Evidence** | Screenshots saved to files | Inline screenshots for documentation |

**Conclusion:** Chrome DevTools MCP enables the continuous test-debug-fix loop required for efficient verification.

### Parallel Execution Strategy

**Sequential Approach (Baseline):**
```
Domain 1 (3h) -> Domain 2 (4h) -> Domain 3 (5h) -> Domain 4 (3h) = 15 hours
+ Bug fixing overhead (60%): 9 hours
Total: 24 hours
```

**Parallel Approach (This Plan):**
```
All 4 domains simultaneously: MAX(3h, 4h, 5h, 3h) = 5 hours
+ Bug coordination & fixes: 2-3 hours
+ Integration validation: 1 hour
+ Final consolidation: 30 min
Total: 8-9 hours
```

**Speedup:** 2.7x faster through parallelization

### Expected Completion Timeline

| Phase | Duration | Agents | Output |
|-------|----------|--------|--------|
| **Phase 0: Baseline** | 1 hour | Coordinator | Test pass/fail matrix |
| **Phase 1: Parallel Testing** | 5-6 hours | 4 specialists | Domain evidence, bug reports |
| **Phase 2: Bug Fixing** | 2-3 hours | 4 specialists (coordinated) | Fixed code, re-verified tests |
| **Phase 3: Integration** | 1 hour | Coordinator | Cross-domain validation |
| **Phase 4: Consolidation** | 30 min | Coordinator | Final evidence summary |
| **Total** | **8-10 hours** | | **95% verified** |

---

## Part 2: Consolidated Status - Tested vs Untested

### Existing Test Files Inventory

**33 Test Files Across 6 Categories:**

```
tests/
├── e2e/                           # 9 files
│   ├── 01-anonymous-user.spec.ts  # 23 tests (public features)
│   ├── 02-authentication.spec.ts  # 15 tests (auth flows)
│   ├── 03-user-features.spec.ts   # 14 tests (bookmarks, favorites)
│   ├── 04-admin-features.spec.ts  # 16 tests (admin panel)
│   ├── admin-ui-verification.spec.ts
│   ├── admin-ui-round2-verification.spec.ts
│   ├── user-workflows-round2.spec.ts
│   ├── debug-auth.spec.ts
│   └── inspect-admin.spec.ts
│
├── api/                           # 3 files
│   ├── bookmarks-favorites.spec.ts
│   ├── bookmarks-favorites-crud.spec.ts
│   └── resource-crud.spec.ts
│
├── user-workflows/                # 6 files
│   ├── account.spec.ts
│   ├── favorites.spec.ts
│   ├── bookmarks.spec.ts
│   ├── profile.spec.ts
│   ├── search-filters.spec.ts
│   └── journeys.spec.ts
│
├── admin-workflows/               # 5 files
│   ├── resource-editing.spec.ts
│   ├── bulk-tagging.spec.ts
│   ├── user-management.spec.ts
│   ├── github-export.spec.ts
│   └── ai-enrichment.spec.ts
│
├── integration/                   # 7 files
│   ├── admin-to-public.spec.ts    # 3-layer validation pattern
│   ├── simple-admin-to-public.spec.ts
│   ├── resource-lifecycle.spec.ts
│   ├── search-and-filters.spec.ts
│   ├── user-isolation.spec.ts
│   ├── security.spec.ts
│   └── data-persistence.spec.ts
│
└── security/                      # 3 files
    ├── xss.spec.ts
    ├── sql-injection.spec.ts
    └── rls-comprehensive.spec.ts
```

**Approximate Test Count:** 298 tests (68 in e2e + 230 in other directories)

### Verification Status by Domain

| Domain | Test Files | Est. Tests | Verified | Status |
|--------|-----------|------------|----------|--------|
| **API Layer** | 3 | 45 | 15 | 33% |
| **User Workflows** | 6 | 60 | 6 | 10% |
| **Admin Operations** | 5 | 55 | 12 | 22% |
| **Security** | 3 | 40 | 30 | 75% |
| **Integration** | 7 | 50 | 13 | 26% |
| **E2E General** | 9 | 68 | 20 | 29% |
| **Total** | **33** | **~298** | **~96** | **32%** |

### Phase 0 Task: Establish Baseline

**Before dispatching agents, run:**

```bash
# In project root
npx playwright test --reporter=list 2>&1 | tee test-baseline-$(date +%Y%m%d).log

# Generate summary
grep -E "(passed|failed|skipped)" test-baseline-*.log
```

**Expected output categories:**
- Passing tests (can skip in Chrome DevTools verification)
- Failing tests (priority for bug fixing)
- Skipped tests (need evaluation)

---

## Part 3: Independent Domain Definition (4 Domains)

### Domain Independence Matrix

| Domain | Can Start Immediately | Dependencies | Serena Write Access |
|--------|----------------------|--------------|---------------------|
| **1: API Layer** | YES | None | tests/api/ |
| **2: User Journeys** | YES | None | tests/user-workflows/ |
| **3: Admin Operations** | YES | None | tests/admin-workflows/, server/ (coordinated) |
| **4: Security & Foundation** | YES | None | tests/security/, tests/e2e/01-* |

All domains can work in parallel because:
1. Each operates on different test directories
2. Each verifies different features
3. Database has sufficient test data for concurrent reads
4. Bug fixes are domain-isolated (coordinated when shared)

### Domain 1: API Layer Verification

**Agent:** API Verification Specialist (Claude Code agent with playwright-expert traits)
**Model:** Opus 4.5

**Scope:**
- All 50+ API endpoints with 3-layer validation
- Focus: Request/Response correctness, database persistence, auth boundaries

**Test Coverage:**
```
tests/api/
├── bookmarks-favorites.spec.ts      # POST/DELETE/GET for both
├── bookmarks-favorites-crud.spec.ts # CRUD completeness
└── resource-crud.spec.ts            # Resource submission, approval, editing
```

**Endpoints to Verify (grouped by priority):**

**High Priority (20 endpoints):**
- POST/DELETE/GET /api/bookmarks/:id
- POST/DELETE/GET /api/favorites/:id
- POST /api/resources (submit)
- PUT /api/resources/:id/approve
- PUT /api/resources/:id/reject
- PUT /api/admin/resources/:id (edit)
- POST /api/admin/resources/bulk
- GET /api/user/progress
- GET /api/user/preferences
- PUT /api/user/preferences

**Medium Priority (15 endpoints):**
- Journey endpoints (5)
- GitHub sync endpoints (4)
- Enrichment endpoints (4)
- Admin stats (2)

**Low Priority (15 endpoints):**
- Utility endpoints
- Category/subcategory queries
- Health checks

**Chrome DevTools MCP Workflow Pattern:**

```typescript
// For each endpoint:

// Step 1: Navigate to get auth token
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/login" });
// Login and extract token from localStorage

// Step 2: Make API call via evaluate
await mcp__chrome-devtools__evaluate_script({
  function: `async () => {
    const token = JSON.parse(localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token')).access_token;
    const response = await fetch('/api/bookmarks/RESOURCE_ID', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    return { status: response.status, body: await response.json() };
  }`
});

// Step 3: Verify database via Supabase MCP
await mcp__supabase__execute_sql({
  query: "SELECT * FROM user_bookmarks WHERE resource_id = 'RESOURCE_ID'"
});

// Step 4: Verify UI reflection
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/bookmarks" });
await mcp__chrome-devtools__take_snapshot({});
// Check for resource in snapshot
```

**Expected Bugs:** 8-12 (auth header issues, RLS blocking, validation errors)

**Deliverables:**
- tests/api/*.spec.ts verified and passing
- docs/evidence/API_VERIFICATION_RESULTS.md
- Bug reports for any failures

**Estimated Duration:** 3-4 hours

**Can work independently:** YES

---

### Domain 2: User Journey Flows

**Agent:** User Journey Specialist (Claude Code agent with playwright-expert traits)
**Model:** Opus 4.5

**Scope:**
- Complete user workflows from login to task completion
- Focus: State persistence, UI feedback, cross-page consistency

**Test Coverage:**
```
tests/user-workflows/
├── account.spec.ts      # Signup, login, session management
├── favorites.spec.ts    # Add, view, remove favorites
├── bookmarks.spec.ts    # Add with notes, view, remove
├── profile.spec.ts      # Stats accuracy, tabs navigation
├── search-filters.spec.ts  # Text + filter combinations
└── journeys.spec.ts     # Enroll, progress, complete
```

**Workflows to Verify (6 total):**

**Workflow 1: Account Lifecycle** (30 min)
- Sign up with email/password
- Verify email confirmation
- Login
- Verify session persists across page refresh
- Logout
- Verify session cleared

**Workflow 2: Favorites Complete Flow** (45 min)
- Login as test user
- Navigate to category page
- Add favorite via star button
- Verify: API call (Network), DB row (Supabase MCP), Profile display (UI)
- Remove favorite
- Verify removal at all 3 layers

**Workflow 3: Bookmarks with Notes** (45 min)
- Add bookmark with notes
- Verify notes persist
- Edit notes
- Verify edit persists
- Remove bookmark
- Verify removal

**Workflow 4: Profile & Stats Accuracy** (30 min)
- Add 3 favorites, 2 bookmarks
- Navigate to profile
- Verify counts match database exactly
- Test each tab loads correctly

**Workflow 5: Search & Filter Combinations** (1 hour)
- Text search: "ffmpeg" -> verify count
- Category filter: "Encoding & Codecs" -> verify results
- Combined: text + category
- Clear filters -> verify reset
- Test edge cases: special characters, empty results

**Workflow 6: Learning Journey Progression** (1 hour)
- Prerequisite: Seed test journey via Supabase MCP
- Browse /journeys
- Start journey (POST /api/journeys/:id/start)
- Mark step complete (PUT /api/journeys/:id/progress)
- Verify progress in database
- Complete all steps
- Verify completed_at timestamp

**Chrome DevTools MCP Workflow Pattern:**

```typescript
// Workflow 2 example: Favorites

// Step 1: Login
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/login" });
await mcp__chrome-devtools__fill({ uid: "email-input", value: "testuser@test.com" });
await mcp__chrome-devtools__fill({ uid: "password-input", value: "TestUser123!" });
await mcp__chrome-devtools__click({ uid: "login-button" });
await mcp__chrome-devtools__wait_for({ text: "Dashboard" });

// Step 2: Navigate to category
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/category/encoding-codecs" });
await mcp__chrome-devtools__take_snapshot({});

// Step 3: Find and click favorite button (from snapshot)
// Look for star icon or "favorite" button in snapshot
await mcp__chrome-devtools__click({ uid: "favorite-button-uuid" });

// Step 4: Wait for API response
await mcp__chrome-devtools__wait_for({ time: 2 });

// Step 5: Verify database (Layer 2)
const dbResult = await mcp__supabase__execute_sql({
  query: "SELECT * FROM user_favorites WHERE user_id = 'USER_ID'"
});

// Step 6: Navigate to profile and verify (Layer 3)
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/profile" });
await mcp__chrome-devtools__take_snapshot({});
// Check for resource in favorites tab
```

**Expected Bugs:** 10-15 (form validation, state sync, React Query cache issues)

**Deliverables:**
- tests/user-workflows/*.spec.ts verified
- docs/evidence/USER_WORKFLOW_RESULTS.md
- 50+ screenshots of workflow steps

**Estimated Duration:** 4-5 hours

**Can work independently:** YES

---

### Domain 3: Admin Operations & Integration

**Agent:** Admin Operations Specialist (Claude Code agent with playwright-expert traits)
**Model:** Opus 4.5

**Scope:**
- Complex admin workflows including bulk operations
- External API integrations (GitHub, AI enrichment)
- Highest bug risk domain

**Test Coverage:**
```
tests/admin-workflows/
├── resource-editing.spec.ts   # Modal, save, verify public
├── bulk-tagging.spec.ts       # CRITICAL: Never fully tested
├── user-management.spec.ts    # Role changes, permissions
├── github-export.spec.ts      # Export, awesome-lint validation
└── ai-enrichment.spec.ts      # Claude API, tag creation
```

**Workflows to Verify (5 total):**

**Workflow 1: Resource Editing Flow** (45 min)
- Navigate /admin/resources
- Search for test resource
- Click Edit in dropdown menu
- Change description in modal
- Save
- Verify: Database updated, Public page shows change

**Workflow 2: Bulk Tag Assignment** (1.5 hours) **CRITICAL - NEVER FULLY TESTED**
- Select 3 resources via checkboxes
- Click "Add Tags" action
- Enter tags: "test-tag-1, test-tag-2, test-tag-3"
- Submit
- **Layer 2 CRITICAL:** Verify in database:
  - 3 rows in `tags` table (new tags created)
  - 9 rows in `resource_tags` junction (3 resources x 3 tags)
- Verify tags display on resource cards

**Known Issue:** Bug #2 in BUG_QUEUE.md - tagInput not passed to backend

**Workflow 3: Bulk Approve/Reject/Archive** (1 hour)
- Create 5 pending resources via API
- Select all 5
- Bulk approve
- Verify: All 5 status='approved', approved_by set, audit log entries
- Repeat for reject and archive

**Workflow 4: GitHub Export** (1.5 hours)
- Configure repository in /admin/github
- Export (dry-run)
- Verify markdown structure
- Run awesome-lint validation:
  ```bash
  npx awesome-lint [file.md]
  ```
- If errors: Fix formatter.ts, re-export, re-lint
- Verify github_sync_history row

**Workflow 5: AI Enrichment** (2 hours) **HIGH RISK - EXTERNAL API**
- Verify ANTHROPIC_API_KEY configured
- Navigate /admin/enrichment
- Start job: filter="unenriched", batch=5
- Monitor progress (status updates every 5 sec)
- Wait for completion (~2.5 min for 5 resources)
- **Verify Database:**
  - enrichment_jobs status='completed'
  - resources.metadata updated with Claude analysis
  - tags table has new AI-generated tags
  - resource_tags junctions created

**Chrome DevTools MCP Workflow Pattern:**

```typescript
// Workflow 2: Bulk Tag Assignment

// Step 1: Admin login
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/login" });
// Admin login flow...

// Step 2: Navigate to admin resources
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/admin/resources" });
await mcp__chrome-devtools__take_snapshot({});

// Step 3: Select resources (find checkboxes in snapshot)
await mcp__chrome-devtools__click({ uid: "checkbox-resource-1" });
await mcp__chrome-devtools__click({ uid: "checkbox-resource-2" });
await mcp__chrome-devtools__click({ uid: "checkbox-resource-3" });

// Step 4: Click bulk actions menu
await mcp__chrome-devtools__click({ uid: "bulk-actions-button" });
await mcp__chrome-devtools__click({ uid: "add-tags-menuitem" });

// Step 5: Enter tags in modal
await mcp__chrome-devtools__fill({ uid: "tag-input", value: "test-tag-1, test-tag-2, test-tag-3" });
await mcp__chrome-devtools__click({ uid: "save-tags-button" });

// Step 6: Verify database (Layer 2 CRITICAL)
const tags = await mcp__supabase__execute_sql({
  query: "SELECT * FROM tags WHERE name IN ('test-tag-1', 'test-tag-2', 'test-tag-3')"
});
// Expect 3 rows

const junctions = await mcp__supabase__execute_sql({
  query: "SELECT * FROM resource_tags WHERE resource_id IN (ID1, ID2, ID3)"
});
// Expect 9 rows (3 resources x 3 tags)
```

**Expected Bugs:** 15-20 (transactions, external APIs, async processing)

**Deliverables:**
- tests/admin-workflows/*.spec.ts verified
- docs/evidence/ADMIN_WORKFLOW_RESULTS.md
- docs/evidence/GITHUB_EXPORT_VALIDATION.md
- docs/evidence/AI_ENRICHMENT_RESULTS.md

**Estimated Duration:** 5-6 hours

**Can work independently:** MOSTLY (needs Serena coordination for code fixes)

---

### Domain 4: Security & Foundation

**Agent:** Security Specialist (Claude Code agent with security-auditor traits)
**Model:** Opus 4.5

**Scope:**
- Security boundary verification
- Anonymous user flows
- Performance validation

**Test Coverage:**
```
tests/security/
├── xss.spec.ts                # Script injection prevention
├── sql-injection.spec.ts      # Parameterized query validation
└── rls-comprehensive.spec.ts  # User isolation at DB level

tests/e2e/
└── 01-anonymous-user.spec.ts  # 23 public feature tests
```

**Security Tests to Verify (4 categories):**

**Category 1: XSS Prevention** (30 min)
- Submit resource with title: `<script>alert('XSS')</script>`
- Admin approve resource
- Navigate to public page
- **VERIFY:** Script rendered as escaped text, NO alert popup
- **IF FAILS:** CRITICAL SECURITY BUG - Stop all agents

**Category 2: SQL Injection Prevention** (30 min)
- Search with: `'; DROP TABLE resources; --`
- Test in: title, description, search bar, all filter inputs
- **VERIFY:** Resources table exists, count unchanged
- **IF FAILS:** CRITICAL - Parameterized queries broken

**Category 3: RLS User Isolation** (1 hour)
- Create User A bookmark/favorite
- Switch to User B context
- **VERIFY API:** GET /api/bookmarks returns ONLY User B's data
- **VERIFY Database:** SET ROLE to User B, query returns 0 of User A's rows
- Test ALL user data tables:
  - user_favorites
  - user_bookmarks
  - user_preferences
  - user_journey_progress

**Category 4: Anonymous User Flows** (1.5 hours)
- 23 tests from 01-anonymous-user.spec.ts:
  - Homepage loads with resources
  - Category navigation works
  - Search functionality
  - Theme switching
  - Pagination
  - Mobile responsive
  - Error handling (404 pages)
  - Can NOT access protected routes (redirect to login)

**Chrome DevTools MCP Workflow Pattern:**

```typescript
// XSS Prevention Test

// Step 1: Submit malicious resource (as admin)
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/submit" });
// Login as admin...
await mcp__chrome-devtools__fill({ uid: "title-input", value: "<script>alert('XSS')</script>" });
await mcp__chrome-devtools__fill({ uid: "url-input", value: "https://test-xss.example.com" });
await mcp__chrome-devtools__click({ uid: "submit-button" });

// Step 2: Approve resource
// Navigate to admin, approve...

// Step 3: Check public page
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/category/test" });

// Step 4: Take screenshot and snapshot
await mcp__chrome-devtools__take_screenshot({ fullPage: true });
const snapshot = await mcp__chrome-devtools__take_snapshot({});

// Step 5: Check for alert (via console messages)
const consoleMessages = await mcp__chrome-devtools__list_console_messages({});
// VERIFY: No script execution errors, no alert triggered

// Step 6: Verify text is escaped (visible in snapshot as text, not executed)
// Look for literal "<script>" in snapshot text
```

**Expected Bugs:** 5-8 (security gaps, missing validations)

**Deliverables:**
- tests/security/*.spec.ts verified
- docs/evidence/SECURITY_AUDIT_RESULTS.md
- docs/evidence/RLS_ISOLATION_VERIFICATION.md
- docs/evidence/ANONYMOUS_USER_FLOWS.md

**Estimated Duration:** 3-4 hours

**Can work independently:** YES

---

## Part 4: Agent Work Model (Continuous Improvement)

### The Test-Debug-Fix Loop

Each agent follows this continuous cycle:

```
FOR EACH feature in assigned domain:
  attempts = 0
  WHILE (feature not verified AND attempts < 3):
    attempts++

    // STEP 1: Test with Chrome DevTools MCP
    Invoke multi-context-integration-testing skill
    Execute 3-layer validation:
      - Layer 1: API/Network (via evaluate_script or network_requests)
      - Layer 2: Database (via Supabase MCP)
      - Layer 3: UI (via take_snapshot, take_screenshot)

    // STEP 2: Evaluate Result
    IF all 3 layers PASS:
      Document evidence in domain results file
      CONTINUE to next feature

    ELSE (FAILURE):
      // STEP 3: Debug
      Invoke systematic-debugging skill
      Follow 4-phase protocol:
        Phase 1: Root cause investigation (exact error, steps to reproduce)
        Phase 2: Pattern analysis (what similar feature works?)
        Phase 3: Hypothesis (form and test theory)
        Phase 4: Identify fix

      // STEP 4: Fix Decision
      IF fix is in agent's domain (tests/, docs/):
        Implement fix directly via Serena MCP
      ELSE IF fix requires shared code (server/, client/):
        Create bug report: docs/bugs/BUG_YYYYMMDD_AGENT_DESC.md
        Add to BUG_QUEUE.md
        IF HIGH severity AND blocks multiple tests:
          NOTIFY Coordinator
          PAUSE and work on non-blocked features
        ELSE:
          Coordinator will assign fix window

      // STEP 5: After Fix
      IF Docker rebuild needed:
        Request rebuild from Coordinator
        Wait for confirmation
      Retest from beginning of feature (not mid-test)

  IF attempts >= 3 AND still failing:
    Document as KNOWN_LIMITATION
    Add to docs/KNOWN_LIMITATIONS.md
    CONTINUE to next feature

WHEN domain complete:
  Generate domain summary report
  Report completion to Coordinator
```

### Mandatory Skill Invocations

**Every agent MUST invoke these skills:**

**At Session Start:**
```
I am invoking the multi-context-integration-testing skill to load the Chrome DevTools
MCP operations manual and 3-layer validation patterns.
```

**When Bug Found:**
```
I am invoking the systematic-debugging skill to perform 4-phase investigation:
- Phase 1: Root cause investigation
- Phase 2: Pattern analysis
- Phase 3: Hypothesis testing
- Phase 4: Fix implementation
```

**For Complex Bugs:**
```
I am invoking the root-cause-tracing skill to trace this bug backwards
through the call stack from error to original trigger.
```

---

## Part 5: Detailed Agent Assignments

### Agent 1: API Verification Specialist

**Agent Name:** API Verification Specialist
**Model:** Opus 4.5
**Specialty:** API endpoint testing with 3-layer validation

**Test Domains (file paths):**
- `/Users/nick/Desktop/awesome-list-site/tests/api/bookmarks-favorites.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/api/bookmarks-favorites-crud.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/api/resource-crud.spec.ts`

**Mandatory Skill Invocations:**
1. `multi-context-integration-testing` at start
2. `systematic-debugging` for each failure
3. `root-cause-tracing` if API returns unexpected status but code looks correct

**Chrome DevTools MCP Workflow:**

```typescript
// Pattern for each endpoint test:

// 1. Navigate and authenticate
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/login" });
await mcp__chrome-devtools__fill({ uid: "[email-input-uid]", value: "admin@test.com" });
await mcp__chrome-devtools__fill({ uid: "[password-input-uid]", value: "Admin123!" });
await mcp__chrome-devtools__click({ uid: "[login-button-uid]" });
await mcp__chrome-devtools__wait_for({ text: "Dashboard" });

// 2. Extract auth token via evaluate
const tokenResult = await mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const auth = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
    return auth ? JSON.parse(auth).access_token : null;
  }`
});

// 3. Make API call and capture response
const apiResult = await mcp__chrome-devtools__evaluate_script({
  function: `async () => {
    const token = JSON.parse(localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token')).access_token;
    try {
      const response = await fetch('/api/bookmarks/[RESOURCE_ID]', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      });
      return {
        status: response.status,
        ok: response.ok,
        body: await response.json().catch(() => null)
      };
    } catch (e) {
      return { error: e.message };
    }
  }`
});

// 4. Verify database (Layer 2)
const dbVerification = await mcp__supabase__execute_sql({
  query: `SELECT * FROM user_bookmarks WHERE resource_id = '[RESOURCE_ID]'`
});

// 5. Check network log for request details
const networkRequests = await mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["fetch"]
});

// 6. Document result
```

**Expected Bugs and Fixes:**

| Bug Type | Likelihood | How to Fix |
|----------|------------|------------|
| 401 Unauthorized | HIGH | Check token extraction, ensure Bearer prefix |
| 403 Forbidden | MEDIUM | Check RLS policies, verify user role |
| 500 Internal Error | MEDIUM | Check server logs via Docker, trace to storage method |
| Empty response body | LOW | Check JSON parsing in endpoint |

**Success Criteria:**
- All 50 endpoints return expected status codes
- Database state matches API responses
- No auth leakage (user A can't access user B's data)
- All results documented with evidence

**Estimated Duration:** 3-4 hours

**Deliverables:**
1. `docs/evidence/API_VERIFICATION_RESULTS.md` - 50 endpoint test results
2. `docs/bugs/BUG_*_API_*.md` - Bug reports for failures
3. Screenshots of network requests for complex endpoints

---

### Agent 2: User Journey Specialist

**Agent Name:** User Journey Specialist
**Model:** Opus 4.5
**Specialty:** End-to-end user workflows

**Test Domains (file paths):**
- `/Users/nick/Desktop/awesome-list-site/tests/user-workflows/account.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/user-workflows/favorites.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/user-workflows/bookmarks.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/user-workflows/profile.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/user-workflows/search-filters.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/user-workflows/journeys.spec.ts`

**Mandatory Skill Invocations:**
1. `multi-context-integration-testing` at start
2. `systematic-debugging` for each failure
3. Use MultiContextTestHelper pattern for user isolation tests

**Chrome DevTools MCP Workflow:**

```typescript
// Favorites workflow example:

// 1. Login as test user
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/login" });
const loginSnapshot = await mcp__chrome-devtools__take_snapshot({});
// Find input UIDs from snapshot
await mcp__chrome-devtools__fill({ uid: "[email-uid]", value: "testuser@test.com" });
await mcp__chrome-devtools__fill({ uid: "[password-uid]", value: "TestUser123!" });
await mcp__chrome-devtools__click({ uid: "[login-button-uid]" });

// 2. Navigate to category with resources
await mcp__chrome-devtools__navigate_page({
  url: "http://localhost:3000/category/encoding-codecs"
});
const categorySnapshot = await mcp__chrome-devtools__take_snapshot({});

// 3. Find and click favorite button (star icon)
// Search snapshot for favorite button UID
await mcp__chrome-devtools__click({ uid: "[favorite-button-uid]" });

// 4. Wait and verify API call
await mcp__chrome-devtools__wait_for({ time: 2 });
const networkLogs = await mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["fetch"]
});
// Verify POST /api/favorites/:id in logs

// 5. Verify database (Layer 2)
const favoriteCheck = await mcp__supabase__execute_sql({
  query: `SELECT * FROM user_favorites WHERE user_id = '[USER_ID]' ORDER BY created_at DESC LIMIT 1`
});

// 6. Navigate to profile and verify favorite appears (Layer 3)
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/profile" });
await mcp__chrome-devtools__take_screenshot({ filename: "profile-with-favorite.png" });
const profileSnapshot = await mcp__chrome-devtools__take_snapshot({});
// Verify resource title appears in favorites section
```

**Expected Bugs and Fixes:**

| Bug Type | Likelihood | How to Fix |
|----------|------------|------------|
| Form validation not triggering | HIGH | Check React Hook Form setup |
| State not updating after action | MEDIUM | Check React Query invalidation |
| Navigation not working | MEDIUM | Check Wouter routing config |
| Profile stats incorrect | MEDIUM | Check count queries in backend |

**Success Criteria:**
- All 6 workflows complete end-to-end
- State persists across page refreshes
- All 3 layers verified at each step
- Smooth UX (no confusing errors)

**Estimated Duration:** 4-5 hours

**Deliverables:**
1. `docs/evidence/USER_WORKFLOW_RESULTS.md` - 6 workflow test results
2. `docs/bugs/BUG_*_USER_*.md` - Bug reports
3. 50+ screenshots of workflow steps

---

### Agent 3: Admin Operations Specialist

**Agent Name:** Admin Operations Specialist
**Model:** Opus 4.5
**Specialty:** Complex admin features, external integrations

**Test Domains (file paths):**
- `/Users/nick/Desktop/awesome-list-site/tests/admin-workflows/resource-editing.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/admin-workflows/bulk-tagging.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/admin-workflows/user-management.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/admin-workflows/github-export.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/admin-workflows/ai-enrichment.spec.ts`

**Mandatory Skill Invocations:**
1. `multi-context-integration-testing` at start
2. `systematic-debugging` for each failure
3. `root-cause-tracing` for transaction failures

**Chrome DevTools MCP Workflow:**

```typescript
// Bulk Tag Assignment (CRITICAL workflow):

// 1. Admin login
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/login" });
// Login as admin...

// 2. Navigate to admin resources
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/admin/resources" });
await mcp__chrome-devtools__wait_for({ time: 2 }); // Wait for table to load
const tableSnapshot = await mcp__chrome-devtools__take_snapshot({});

// 3. Select 3 resources (find checkbox UIDs from snapshot)
await mcp__chrome-devtools__click({ uid: "[checkbox-1-uid]" });
await mcp__chrome-devtools__click({ uid: "[checkbox-2-uid]" });
await mcp__chrome-devtools__click({ uid: "[checkbox-3-uid]" });

// 4. Open bulk actions and select "Add Tags"
await mcp__chrome-devtools__take_snapshot({}); // Get updated UI with selection count
await mcp__chrome-devtools__click({ uid: "[bulk-actions-uid]" });
await mcp__chrome-devtools__wait_for({ time: 0.5 });
await mcp__chrome-devtools__click({ uid: "[add-tags-menuitem-uid]" });

// 5. Enter tags in modal
await mcp__chrome-devtools__wait_for({ time: 0.5 }); // Wait for modal
const modalSnapshot = await mcp__chrome-devtools__take_snapshot({});
await mcp__chrome-devtools__fill({
  uid: "[tag-input-uid]",
  value: "bulk-test-tag-1, bulk-test-tag-2, bulk-test-tag-3"
});
await mcp__chrome-devtools__click({ uid: "[save-tags-btn-uid]" });

// 6. Wait for operation and toast
await mcp__chrome-devtools__wait_for({ text: "Tags added" });

// 7. CRITICAL DATABASE VERIFICATION (Layer 2)
// Check tags were created
const tagsResult = await mcp__supabase__execute_sql({
  query: `SELECT * FROM tags WHERE name IN ('bulk-test-tag-1', 'bulk-test-tag-2', 'bulk-test-tag-3')`
});
// EXPECT: 3 rows

// Check junctions were created
const junctionsResult = await mcp__supabase__execute_sql({
  query: `SELECT * FROM resource_tags WHERE resource_id IN ('[ID1]', '[ID2]', '[ID3]')`
});
// EXPECT: 9 rows (3 resources x 3 tags)

// 8. Verify UI shows tags on resources
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/resources/[ID1]" });
await mcp__chrome-devtools__take_screenshot({ filename: "resource-with-tags.png" });
```

**Expected Bugs and Fixes:**

| Bug Type | Likelihood | How to Fix |
|----------|------------|------------|
| Bulk tag input not passed to backend | CONFIRMED | Fix BUG_QUEUE.md #2 |
| Transaction partial failure | HIGH | Add transaction wrapper |
| Audit log missing for bulk ops | MEDIUM | Add audit log call |
| GitHub export lint errors | MEDIUM | Fix formatter.ts structure |
| AI enrichment timeout | LOW | Increase timeout, add retry |

**Success Criteria:**
- Bulk operations complete atomically (all or nothing)
- Audit log created for every admin action
- GitHub export passes awesome-lint
- AI enrichment creates valid tags

**Estimated Duration:** 5-6 hours

**Deliverables:**
1. `docs/evidence/ADMIN_WORKFLOW_RESULTS.md` - 5 workflow test results
2. `docs/evidence/BULK_OPERATIONS_VERIFICATION.md` - Transaction integrity proof
3. `docs/evidence/GITHUB_EXPORT_VALIDATION.md` - awesome-lint output
4. `docs/evidence/AI_ENRICHMENT_RESULTS.md` - Enrichment job logs

---

### Agent 4: Security Specialist

**Agent Name:** Security Specialist
**Model:** Opus 4.5
**Specialty:** Security boundaries, penetration testing

**Test Domains (file paths):**
- `/Users/nick/Desktop/awesome-list-site/tests/security/xss.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/security/sql-injection.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/security/rls-comprehensive.spec.ts`
- `/Users/nick/Desktop/awesome-list-site/tests/e2e/01-anonymous-user.spec.ts`

**Mandatory Skill Invocations:**
1. `multi-context-integration-testing` at start
2. `systematic-debugging` for security failures
3. STOP ALL AGENTS if critical vulnerability found

**Chrome DevTools MCP Workflow:**

```typescript
// XSS Prevention Test:

// 1. Submit resource with malicious title
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/submit" });
// Login as admin, then:
await mcp__chrome-devtools__fill({
  uid: "[title-uid]",
  value: "<script>alert('XSS')</script>"
});
await mcp__chrome-devtools__fill({
  uid: "[url-uid]",
  value: "https://test-xss-" + Date.now() + ".example.com"
});
await mcp__chrome-devtools__fill({
  uid: "[description-uid]",
  value: "<img src=x onerror=alert('XSS')>"
});
await mcp__chrome-devtools__fill({
  uid: "[category-uid]",
  value: "Test"
});
await mcp__chrome-devtools__click({ uid: "[submit-btn-uid]" });

// 2. Approve resource as admin
// Navigate to admin, approve...

// 3. Check public page rendering
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/category/test" });

// 4. Check console for script execution
const consoleMessages = await mcp__chrome-devtools__list_console_messages({});
// VERIFY: No script-related errors or alerts

// 5. Take screenshot showing escaped text
await mcp__chrome-devtools__take_screenshot({
  filename: "xss-prevention-verification.png",
  fullPage: true
});

// 6. Get page snapshot to verify literal < and > characters
const snapshot = await mcp__chrome-devtools__take_snapshot({});
// Search for literal "&lt;script&gt;" or "<script>" as text (not executed)

// SQL Injection Test:

// 1. Search with injection payload
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000" });
await mcp__chrome-devtools__fill({
  uid: "[search-uid]",
  value: "'; DROP TABLE resources; --"
});
await mcp__chrome-devtools__press_key({ key: "Enter" });

// 2. Verify database intact
const resourceCount = await mcp__supabase__execute_sql({
  query: "SELECT COUNT(*) FROM resources"
});
// VERIFY: Count > 0 (table exists and has data)

// RLS Isolation Test:

// 1. User A creates bookmark
// Login as User A, add bookmark...

// 2. User B attempts to access
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/login" });
// Login as User B...

// 3. Verify User B cannot see User A's bookmark
await mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/bookmarks" });
const bookmarksSnapshot = await mcp__chrome-devtools__take_snapshot({});
// VERIFY: User A's bookmark NOT in list

// 4. Direct database verification (RLS in action)
const directQuery = await mcp__supabase__execute_sql({
  query: `SELECT * FROM user_bookmarks WHERE user_id = '[USER_A_ID]'`
});
// When run as service_role: Returns User A's data
// When run with RLS: Would return only authenticated user's data
```

**Expected Bugs and Fixes:**

| Bug Type | Likelihood | How to Fix |
|----------|------------|------------|
| XSS in specific field | LOW | Add DOMPurify or escape function |
| SQL injection vector | VERY LOW | Drizzle uses parameterized queries |
| RLS policy gap | MEDIUM | Add missing policy for table |
| Rate limiting bypass | LOW | Check nginx config |

**Success Criteria:**
- ZERO XSS vulnerabilities
- ZERO SQL injection vulnerabilities
- Complete user data isolation
- All anonymous flows work correctly

**Estimated Duration:** 3-4 hours

**Deliverables:**
1. `docs/evidence/SECURITY_AUDIT_RESULTS.md` - Full security assessment
2. `docs/evidence/XSS_PREVENTION_PROOF.md` - XSS test evidence
3. `docs/evidence/RLS_ISOLATION_VERIFICATION.md` - User isolation proof
4. Screenshots of all security tests

---

## Part 6: Serena MCP Coordination Protocol

### Read Operations (Safe for All Agents)

All agents can simultaneously:
- Read any file via `mcp__serena__read_file`
- Search codebase via `mcp__serena__search_for_pattern`
- Find symbols via `mcp__serena__find_symbol`
- Read memories via `mcp__serena__read_memory`

### Write Access (Domain Ownership Model)

| Agent | Exclusive Write Access | Shared Write (Coordinated) |
|-------|----------------------|---------------------------|
| **API Agent** | tests/api/*.spec.ts, docs/evidence/API_*.md | - |
| **User Agent** | tests/user-workflows/*.spec.ts, docs/evidence/USER_*.md | - |
| **Admin Agent** | tests/admin-workflows/*.spec.ts, docs/evidence/ADMIN_*.md | server/routes.ts, server/storage.ts |
| **Security Agent** | tests/security/*.spec.ts, docs/evidence/SECURITY_*.md | - |
| **All Agents** | docs/bugs/BUG_*.md (unique filenames) | - |
| **Coordinator** | docs/BUG_QUEUE.md, docs/TESTING_EVIDENCE_SUMMARY.md | - |

### Code Fix Protocol

When agent identifies code fix needed in shared files:

```
1. Agent creates bug report:
   docs/bugs/BUG_YYYYMMDD_[AGENT]_[DESCRIPTION].md

2. Agent adds to BUG_QUEUE.md (atomic append operation)

3. IF HIGH severity:
   - Agent pauses related tests
   - Notifies Coordinator
   - Works on non-blocked features

4. Coordinator assigns fix:
   - Determines which agent should fix
   - Schedules fix window (prevents conflicts)
   - Example: "Agent 3 has server/routes.ts lock 10:00-10:30"

5. Fixing agent:
   - Uses mcp__serena__replace_content for targeted fixes
   - Commits fix: git add && git commit -m "fix: [description]"

6. Docker rebuild (Coordinator manages):
   - Only ONE rebuild at a time
   - Coordinator runs: docker-compose down && docker-compose build web && docker-compose up -d
   - All agents wait for rebuild confirmation

7. Agent re-tests from feature beginning
```

### Conflict Resolution

**If two agents need to edit same file:**
1. Coordinator reviews both bug reports
2. Determines if fixes are compatible
3. Option A: Sequential fixes (Agent X at T1, Agent Y at T2)
4. Option B: Combined fix (one agent implements both)
5. Option C: Create separate branch for complex conflicts

---

## Part 7: Execution Timeline

### Phase 0: Baseline Establishment (1 hour)

```
T+0:00  Coordinator runs: npx playwright test --reporter=list
T+0:10  Collect pass/fail results
T+0:20  Categorize by domain
T+0:30  Update BUG_QUEUE.md with known failing tests
T+0:45  Prepare agent prompts
T+1:00  Baseline complete, ready for dispatch
```

### Phase 1: Parallel Testing & Fixing (5-6 hours)

```
T+1:00  Coordinator dispatches all 4 agents simultaneously
        All agents invoke multi-context-integration-testing skill

T+1:15  All agents begin testing their domains
        Bug reports start appearing in docs/bugs/

T+2:00  ~25% of tests complete
        Coordinator reviews bug queue
        Prioritizes HIGH severity issues

T+3:00  ~50% of tests complete
        First round of code fixes needed
        Coordinator coordinates server/ file edits

T+4:00  ~75% of tests complete
        Most domain-specific bugs fixed
        Integration issues emerging

T+5:00  Security Agent completes (shortest domain)
        Begins assisting other domains

T+6:00  All agents report domain testing complete
        Bug queue populated, most bugs addressed
        Some complex bugs remain
```

### Phase 2: Bug Resolution Sprint (2-3 hours)

```
T+6:00  Coordinator reviews remaining bugs
        Assigns complex bugs to appropriate agents

T+6:30  Agents work on assigned cross-domain bugs
        Sequential server/ file edits

T+7:30  Docker rebuilds for final fixes

T+8:00  All HIGH/MEDIUM bugs resolved
        LOW bugs documented as known limitations
```

### Phase 3: Integration Validation (1 hour)

```
T+8:00  Coordinator runs cross-domain tests:
        - Admin edit -> Public visibility
        - User isolation across all data types
        - Full workflow: Submit -> Approve -> Display

T+8:30  Agents verify no regressions in their domains

T+9:00  All integration tests passing
        No regressions from bug fixes
```

### Phase 4: Final Consolidation (30 minutes)

```
T+9:00  All agents generate domain summaries

T+9:15  Coordinator consolidates:
        - docs/TESTING_EVIDENCE_SUMMARY.md
        - docs/COMPLETION_METRICS.md
        - docs/KNOWN_LIMITATIONS.md

T+9:30  Final commit: "test: Complete verification to 95%"

COMPLETE: 95% verified, production ready
```

---

## Part 8: Success Criteria

### Per-Domain Success Criteria

**Domain 1 (API Layer):**
- [ ] All 50 endpoints tested with 3-layer validation
- [ ] All endpoints return correct status codes
- [ ] All database mutations verified
- [ ] No auth leakage between users
- [ ] Documentation complete

**Domain 2 (User Journeys):**
- [ ] All 6 workflows complete end-to-end
- [ ] State persists across sessions
- [ ] No broken navigation
- [ ] Profile stats accurate
- [ ] Search returns correct results

**Domain 3 (Admin Operations):**
- [ ] Resource editing works
- [ ] Bulk operations complete atomically
- [ ] Audit log entries for all actions
- [ ] GitHub export passes awesome-lint
- [ ] AI enrichment creates valid tags

**Domain 4 (Security):**
- [ ] Zero XSS vulnerabilities
- [ ] Zero SQL injection vulnerabilities
- [ ] Complete RLS user isolation
- [ ] All anonymous flows work
- [ ] Rate limiting active

### Overall Plan Success Criteria

- [ ] 31/33 features verified working (94%+)
- [ ] All HIGH severity bugs fixed
- [ ] All MEDIUM bugs fixed or documented
- [ ] Evidence collected for every feature
- [ ] All test files green or documented
- [ ] Production deployment ready

### Evidence Requirements

Each domain must produce:
1. **Results document** in docs/evidence/ with:
   - Test execution logs
   - 3-layer verification results
   - Screenshots for UI verification
   - SQL query results for DB verification

2. **Bug reports** in docs/bugs/ for any failures

3. **Summary statistics:**
   - Tests passed / total
   - Features verified / total
   - Bugs found / fixed / deferred

---

## Appendix A: Agent Dispatch Prompts

### Dispatch Prompt for Agent 1 (API Verification)

```
ROLE: API Verification Specialist (Opus 4.5)

CRITICAL FIRST STEPS:
1. Invoke skill: multi-context-integration-testing
   - Read the complete Chrome DevTools MCP operations manual
   - Understand 3-layer validation: API + Database + UI
   - Note: MUST navigate before extracting localStorage tokens

2. Review your domain:
   - tests/api/bookmarks-favorites.spec.ts
   - tests/api/bookmarks-favorites-crud.spec.ts
   - tests/api/resource-crud.spec.ts

YOUR SCOPE: Verify 50+ API endpoints

TOOLS AVAILABLE:
- mcp__chrome-devtools__* (browser automation)
- mcp__supabase__* (database verification)
- mcp__serena__* (code reading, test file editing)

WORKFLOW FOR EACH ENDPOINT:
1. Navigate to login, authenticate
2. Extract JWT from localStorage
3. Call endpoint via evaluate_script
4. Verify database state via Supabase MCP
5. Verify UI reflection if applicable
6. Document result

WHEN BUG FOUND:
1. Invoke systematic-debugging skill
2. Create: docs/bugs/BUG_[DATE]_API_[DESC].md
3. Add to: docs/BUG_QUEUE.md
4. Continue if LOW/MEDIUM, pause if HIGH blocks other tests

OUTPUT:
- docs/evidence/API_VERIFICATION_RESULTS.md
- Bug reports for failures
- Screenshots of complex verifications

ESTIMATED DURATION: 3-4 hours

Report completion to Coordinator when all endpoints tested.
```

### Dispatch Prompt for Agent 2 (User Journey)

```
ROLE: User Journey Specialist (Opus 4.5)

CRITICAL FIRST STEPS:
1. Invoke skill: multi-context-integration-testing
2. Review domain: tests/user-workflows/*.spec.ts

YOUR SCOPE: Verify 6 complete user workflows

WORKFLOWS:
1. Account lifecycle (signup -> login -> logout)
2. Favorites flow (add -> view -> remove)
3. Bookmarks with notes (add -> edit -> remove)
4. Profile stats accuracy
5. Search & filter combinations
6. Learning journey progression

TOOLS: Chrome DevTools MCP + Supabase MCP + Serena MCP

FOR EACH WORKFLOW:
1. Execute complete flow via browser automation
2. Verify API calls in network logs
3. Verify database state after each action
4. Verify UI reflects changes
5. Document with screenshots

WHEN BUG FOUND:
- Invoke systematic-debugging skill
- Document and report
- Fix if in your domain, report if shared code

OUTPUT:
- docs/evidence/USER_WORKFLOW_RESULTS.md
- 50+ workflow screenshots
- Bug reports

ESTIMATED DURATION: 4-5 hours
```

### Dispatch Prompt for Agent 3 (Admin Operations)

```
ROLE: Admin Operations Specialist (Opus 4.5)

CRITICAL FIRST STEPS:
1. Invoke skill: multi-context-integration-testing
2. Review domain: tests/admin-workflows/*.spec.ts

YOUR SCOPE: Verify 5 complex admin workflows

CRITICAL WORKFLOWS:
1. Resource editing (modal flow)
2. Bulk tag assignment (KNOWN BUG: tagInput not passed)
3. Bulk approve/reject/archive
4. GitHub export (must pass awesome-lint)
5. AI enrichment (external API)

PRIORITY: Fix BUG_QUEUE.md #2 (bulk tag input) first

TOOLS: Chrome DevTools MCP + Supabase MCP + Serena MCP

CRITICAL VERIFICATIONS:
- Bulk operations: Check ALL rows updated atomically
- Audit log: Verify entry for EVERY admin action
- GitHub: Run npx awesome-lint on export
- Enrichment: Verify tags created in database

WHEN BUG FOUND:
- Invoke systematic-debugging skill
- For server/ fixes: Coordinate with Coordinator for lock
- Request Docker rebuild after fix

OUTPUT:
- docs/evidence/ADMIN_WORKFLOW_RESULTS.md
- docs/evidence/BULK_OPERATIONS_VERIFICATION.md
- docs/evidence/GITHUB_EXPORT_VALIDATION.md
- docs/evidence/AI_ENRICHMENT_RESULTS.md

ESTIMATED DURATION: 5-6 hours
```

### Dispatch Prompt for Agent 4 (Security)

```
ROLE: Security Specialist (Opus 4.5)

CRITICAL FIRST STEPS:
1. Invoke skill: multi-context-integration-testing
2. Review domain: tests/security/*.spec.ts + tests/e2e/01-anonymous-user.spec.ts

YOUR SCOPE: Verify security boundaries + anonymous flows

SECURITY TESTS:
1. XSS prevention (script injection)
2. SQL injection prevention
3. RLS user isolation (all user data tables)
4. Rate limiting verification
5. Anonymous user flows (23 tests)

CRITICAL: If you find a security vulnerability, IMMEDIATELY:
1. Document severity
2. If CRITICAL (data exposure, code execution): NOTIFY COORDINATOR
3. Coordinator may pause all agents for emergency fix

TOOLS: Chrome DevTools MCP + Supabase MCP + Serena MCP

XSS TEST PATTERN:
1. Submit resource with: <script>alert('XSS')</script>
2. Approve resource
3. Navigate to public page
4. Verify: Script NOT executed, rendered as text

SQL INJECTION TEST:
1. Search with: '; DROP TABLE resources; --
2. Verify: Table exists, count unchanged

RLS TEST:
1. User A creates data
2. Switch to User B context
3. Verify: User B CANNOT see User A's data

OUTPUT:
- docs/evidence/SECURITY_AUDIT_RESULTS.md
- docs/evidence/XSS_PREVENTION_PROOF.md
- docs/evidence/RLS_ISOLATION_VERIFICATION.md
- Screenshots of all security tests

ESTIMATED DURATION: 3-4 hours
```

---

## Appendix B: Bug Report Template

```markdown
# Bug: [Brief Description]

**Found By:** Agent [1-4] - [Domain Name]
**Date:** YYYY-MM-DD HH:MM
**Severity:** HIGH / MEDIUM / LOW
**Domain:** API / User Workflow / Admin / Security
**Blocks:** [What tests are blocked until fixed]

## Phase 1: Root Cause Investigation

**Error:**
```
[Exact error message or unexpected behavior]
```

**Reproduction Steps:**
1. Navigate to...
2. Click...
3. Expected: ...
4. Actual: ...

**Evidence:**
- Screenshot: [filename]
- Network log: [request/response]
- Database query: [SQL and result]

## Phase 2: Pattern Analysis

**Working example:** [Similar feature that works correctly]
**Difference:** [What's different between working and broken]
**Dependencies:** [What this feature depends on]

## Phase 3: Hypothesis

**Theory:** [What I think is wrong]
**Test:** [How to verify the theory]
**Result:** CONFIRMED / REJECTED

## Phase 4: Fix

**Root cause:** [Actual issue after investigation]
**Files changed:**
- [file1.ts]: [what changed]
- [file2.ts]: [what changed]

**Verification:**
- [Test that now passes]
- [3-layer validation result]

**Status:** OPEN / FIXING / FIXED / VERIFIED
**Assigned To:** [Agent name]
**Fixed In Commit:** [commit hash]
```

---

## Appendix C: Evidence Document Template

```markdown
# [Domain] Verification Results

**Date:** YYYY-MM-DD
**Agent:** [Agent Name]
**Duration:** X hours
**Tests Executed:** X
**Tests Passed:** X
**Tests Failed:** X
**Bugs Found:** X
**Bugs Fixed:** X

---

## Summary

[Brief overview of testing completed]

---

## Test Results

### [Feature/Workflow Name]

**Status:** PASS / FAIL / PARTIAL

**Layer 1 (API/Network):**
- Endpoint: [URL]
- Method: [HTTP method]
- Status: [response code]
- Response: [key fields]

**Layer 2 (Database):**
```sql
[Query executed]
```
Result: [row count, key values]

**Layer 3 (UI):**
- Screenshot: [filename]
- Verification: [what was checked]

**Evidence:**
- Screenshot: ![](./screenshots/[filename])
- Network log: [summary]

---

## Bugs Found

| ID | Description | Severity | Status | Fix |
|----|-------------|----------|--------|-----|
| 1 | ... | HIGH | FIXED | commit abc |
| 2 | ... | MEDIUM | OPEN | - |

---

## Known Limitations

- [Feature X not tested because Y]
- [Edge case Z deferred to future]

---

## Recommendations

- [Suggested improvements]
- [Technical debt to address]
```

---

**Plan Created:** 2025-12-01
**Execution Model:** 4 Parallel Agents + Coordinator
**Target Completion:** 95% (31/33 features verified)
**Estimated Duration:** 8-10 hours
**Primary Tools:** Chrome DevTools MCP, Supabase MCP, Serena MCP

This plan enables systematic verification with continuous debugging, achieving production readiness through parallel specialist agents.
