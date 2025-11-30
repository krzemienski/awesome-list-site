# Parallel Verification Orchestration Plan

**Created**: 2025-11-30
**Status**: READY FOR EXECUTION
**Strategy**: 5 concurrent verification agents
**Estimated Time**: 5-6 hours (vs 18-23 sequential)
**Speedup**: 3-4x faster

---

## Executive Summary

After completing Phase 0 (SSR fix) and Task 1 (Modal verification), we have 279 remaining tasks from the original plan. Analysis shows 5 independent verification domains that can execute in parallel:

1. Admin UI Verification (29 tasks)
2. User Workflows Verification (80 tasks)
3. Security Audit (50 tasks)
4. Performance Benchmarking (30 tasks)
5. Integration Completion (30 tasks)

**Key Insight**: Most tasks are VERIFICATION (testing existing features), not IMPLEMENTATION. Agents report findings, bugs fixed centrally after aggregation.

---

## Agent 1: Admin UI Verification

**Subagent Type**: `playwright-expert`
**Duration**: 4-6 hours
**Scope**: Tasks 2-30 from original plan

### Objective
Verify all admin UI components work correctly after SSR fix:
- Filter dropdowns (Status, Category, combined)
- Column sorting (all 4 columns)
- Pagination (Next/Previous, disabled states)
- Bulk operations toolbar
- Admin panel navigation (10 routes)

### Test Methodology
1. Use Playwright MCP with localStorage session injection (admin@test.com)
2. Verify each UI interaction:
   - Click → Expected result
   - Visual verification via screenshots
   - Database verification via Supabase MCP
3. Report bugs, DO NOT fix code (verification only)

### Detailed Tasks

**Tasks 2-5: Filter Dropdowns (40 min each)**
- Task 2: Status filter → Select "Approved" → Verify table filtered → Count matches DB
- Task 3: Category filter → Select "Encoding & Codecs" → Verify filtered → Count correct
- Task 4: Combined filters → Status="Approved" AND Category="General Tools" → Both applied
- Task 5: Clear All Filters → Reset to default → Full table returns

**Tasks 6-10: Column Sorting (30 min total)**
- Click Title header → Verify sort indicator → Data sorted correctly → Reverse sort
- Repeat for Category, Status, Last Modified columns
- Screenshot evidence per column

**Tasks 11-15: Pagination (25 min)**
- Verify "Page 1 of 133" displays
- Click Next → Page 2 loads different resources → Previous enabled
- Click Previous → Back to page 1
- Test disabled states

**Tasks 16-25: Bulk Operations (90 min)**
- Select 3 resources → Bulk toolbar appears → "3 resources selected"
- Click Archive → Confirmation dialog → Confirm → Toast "Successfully archived"
- Verify DB: 3 resources status='archived'
- Verify audit log: 3 entries action='bulk_status_archived'
- Navigate to public → Archived resources NOT visible
- Filter by "Archived" → 3 resources visible with badge
- Test Clear Selection, Export CSV buttons

**Tasks 26-30: Admin Navigation (45 min)**
- Test all 10 admin sidebar routes
- Dashboard → verify stats
- Approvals → verify pending list
- Edits → verify edit suggestions
- Enrichment → verify job form
- GitHub Sync → verify repo config
- Export, Database, Validation, Users → document 404 if not built

### Output Format

**File**: `docs/session-7-evidence/admin-ui/verification-report.md`

```markdown
# Admin UI Verification Report

## Summary
- Total Tests: 29
- Passed: XX
- Failed: XX
- Not Implemented: XX

## Test Results

### Filters
- Status Filter: ✅ PASS | Screenshot: status-filter.png
- Category Filter: ✅ PASS | Screenshot: category-filter.png
- Combined Filters: ❌ FAIL | Bug: Filters don't combine correctly | Screenshot: combined-fail.png

### Sorting
- Title Sort: ✅ PASS
- Category Sort: ✅ PASS
...

## Bugs Found
1. **Severity: HIGH** - Combined filters bug
   - Component: ResourceFilters.tsx
   - Issue: Status AND Category filters don't combine
   - Expected: Intersection of both filters
   - Actual: Only last filter applied

## Database Queries
[SQL verification queries used]

## Screenshots
[List all evidence files]
```

### Session Injection Code (Reuse from Task 1)
```javascript
const SESSION_DATA = {
  'sb-jeyldoypdkgsrfdhdcmm-auth-token': JSON.stringify({
    access_token: "eyJhbGci...",  // From Chrome DevTools extraction
    user: { email: "admin@test.com", user_metadata: { role: "admin" }}
  })
};

await page.goto(TARGET_URL);
await page.evaluate((sessionData) => {
  Object.entries(sessionData).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}, SESSION_DATA);
```

---

## Agent 2: User Workflows Verification

**Subagent Type**: `playwright-expert`
**Duration**: 4-5 hours
**Scope**: Tasks 31-110

### Objective
Verify all user-facing workflows function correctly

### Test Areas

**Tasks 31-40: Search Dialog (60 min)**
- Press "/" key → Dialog opens
- Type "ffmpeg" → Wait 300ms (debounce) → 157 results display
- Click result → Navigate to resource
- Clear search → Results clear
- Category filter in search → Results filter correctly
- Empty results → "No results" message

**Tasks 41-50: Profile Page (60 min)**
- Navigate to /profile
- Verify user info, stats widgets
- Test tabs (Overview, Favorites, Bookmarks, Submissions)
- Verify stats match database
- Screenshot evidence

**Tasks 51-60: Bookmarks Page (60 min)**
- Add bookmark via API (to have test data)
- Navigate to /bookmarks
- Verify bookmark displays
- Add notes → "Session 7 test notes"
- Remove bookmark → Database deleted → Empty state

**Tasks 61-70: Learning Journeys (60 min)**
- Seed journey via SQL (INSERT INTO learning_journeys...)
- Navigate to /journeys
- Verify journey card displays
- Click journey → Detail page with steps
- Click "Start Journey" → Enrollment created
- Mark step complete → Database updated

**Tasks 71-110: User Preferences + Additional Workflows**
- Preferences form, recommendations, etc.

### Output Format
**File**: `docs/session-7-evidence/user-workflows/verification-report.md`

Similar structure to Agent 1 report.

### Database Operations
**CAN WRITE**: Create test bookmarks, preferences, journey progress
**Must use**: Encoding & Codecs resources (non-overlapping with Agent 1)
**Cleanup**: DELETE test data after verification

---

## Agent 3: Security Audit

**Subagent Type**: `security-auditor`
**Duration**: 5 hours
**Scope**: Tasks 131-180

### Objective
Verify application security against common vulnerabilities

### Test Areas

**Tasks 131-145: RLS User Isolation (90 min)**
```bash
# Create test users
curl POST /auth/v1/signup (User A: usera-sec@test.com)
curl POST /auth/v1/signup (User B: userb-sec@test.com)

# User A adds bookmark
curl -H "Authorization: Bearer {A_JWT}" POST /api/bookmarks/{resource_id}

# User B tries to access
curl -H "Authorization: Bearer {B_JWT}" GET /api/bookmarks
# Expected: Empty array (NOT User A's data)

# SQL verification
SET request.jwt.claims TO '{"sub":"{user_b_id}"}';
SELECT * FROM user_bookmarks;
-- Expected: 0 rows (RLS blocks)
```

Repeat for favorites, journey_progress, user_preferences

**IF RLS FAILS**: CRITICAL SECURITY BUG → Report immediately, stop testing

**Tasks 146-160: XSS Prevention (90 min)**
```bash
# Submit resource with script tag
curl POST /api/resources -d '{
  "title": "<script>alert('XSS')</script>",
  "description": "<img src=x onerror=\"alert('XSS')\">"
}'

# Navigate to public page via Playwright
# Verify: Script rendered as text (escaped)
# Verify: No alert popup
# Screenshot evidence
```

Test in: title, description, search, filters, comments

**Tasks 161-175: SQL Injection (90 min)**
```javascript
// Via Playwright
await page.fill('input[name="search"]', "'; DROP TABLE resources; --");
await page.click('button[type="submit"]');

// Verify database intact
SELECT COUNT(*) FROM resources;  // Should be 2650+
```

Test in: search, filters, title, description, URL fields

**Tasks 176-180: Rate Limiting (30 min)**
```bash
# Rapid fire 100 requests
for i in {1..100}; do curl http://localhost:3000/api/resources & done; wait

# Count 429 responses
# Verify rate limit headers
```

### Output Format
**File**: `docs/session-7-evidence/security/audit-report.md`

```markdown
# Security Audit Report

## Vulnerabilities Found
### CRITICAL
- [None found]

### HIGH
- [List]

### MEDIUM
- [List]

### LOW
- [List]

## Tests Passed
- ✅ RLS user isolation (all tables)
- ✅ XSS prevention (all inputs)
- ✅ SQL injection blocked (all queries)
- ✅ Rate limiting active

## Recommendations
[Security improvements for future]
```

---

## Agent 4: Performance Benchmarking

**Subagent Type**: `performance-engineer`
**Duration**: 3-4 hours
**Scope**: Tasks 181-210

### Objective
Measure application performance and identify bottlenecks

### Test Areas

**Tasks 181-190: Lighthouse Audits (60 min)**
```bash
npx lighthouse http://localhost:3000 --output=html --output-path=/tmp/lighthouse-homepage.html
# Repeat for:
# - /category/encoding-codecs
# - /admin (with session)
# - /profile
# - /bookmarks
```

Capture: Performance score, FCP, LCP, TTI, CLS

**Tasks 191-205: Load Testing (90 min)**
```bash
# Install autocannon
npm install -g autocannon

# Benchmark /api/resources
autocannon -c 10 -d 30 http://localhost:3000/api/resources
# Capture: req/sec, p50/p95/p99 latency, error rate

# Concurrent users
autocannon -c 100 -d 60 http://localhost:3000
# Monitor: docker stats awesome-list-web
```

**Tasks 206-210: Query Optimization (30 min)**
```sql
EXPLAIN ANALYZE
SELECT * FROM resources
WHERE category = 'Encoding & Codecs' AND status = 'approved'
ORDER BY created_at DESC
LIMIT 20;

-- Verify: Uses idx_resources_status_category
-- Check: Execution time < 50ms
```

### Output Format
**File**: `docs/session-7-evidence/performance/benchmark-report.md`

```markdown
# Performance Benchmark Report

## Lighthouse Scores
| Page | Performance | FCP | LCP | TTI | CLS |
|------|-------------|-----|-----|-----|-----|
| Homepage | 85 | 1.2s | 2.1s | 2.8s | 0.05 |
| Category | 82 | 1.4s | 2.3s | 3.1s | 0.08 |

## Load Testing Results
| Endpoint | Req/Sec | p50 | p95 | p99 | Errors |
|----------|---------|-----|-----|-----|--------|
| /api/resources | 450 | 18ms | 45ms | 120ms | 0% |

## Query Performance
[EXPLAIN ANALYZE results]

## Bottlenecks Identified
[List slow queries, large bundles, etc.]
```

---

## Agent 5: Integration Completion

**Subagent Type**: `general-purpose`
**Duration**: 2-3 hours
**Scope**: Tasks 61-90

### Objective
Complete integration tasks (GitHub export, AI enrichment)

### Tasks

**Tasks 61-75: Fix GitHub Export (120 min)**
Current state: Export generates markdown with 40+ awesome-lint errors

Iterative fixing:
```bash
# 1. Review current errors
npx awesome-lint /tmp/awesome-video-export.md 2>&1 | head -100

# 2. Identify error types (from Session 6):
# - Double links (deduplication needed)
# - ToC anchor mismatches
# - License section format
# - Contributing reference

# 3. Fix in server/github/formatter.ts:
# - Add Set for URL deduplication
# - Fix ToC generation logic
# - Add proper license section
# - Include/remove contributing reference

# 4. Rebuild Docker
docker-compose build web && docker-compose up -d

# 5. Re-export
curl POST /api/admin/export > /tmp/awesome-video-export-v2.md

# 6. Re-lint
npx awesome-lint /tmp/awesome-video-export-v2.md
# Expect: Fewer errors

# 7. Iterate until 0 errors
```

**Tasks 76-90: Monitor AI Enrichment (90 min)**
```bash
# Current job: 68717a57-49df-49a3-b9ac-dc01dc6b5ff4 (18 resources processed)

# Poll until completion
while true; do
  STATUS=$(curl -H "Authorization: Bearer {JWT}" \
    http://localhost:3000/api/enrichment/jobs/68717a57... | jq -r '.job.status')

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi

  echo "Status: $STATUS, waiting..."
  sleep 10
done

# Verify final state
SELECT status, successful_resources, failed_resources
FROM enrichment_jobs
WHERE id = '68717a57...';

# Check enriched resources
SELECT r.id, r.metadata, array_agg(t.name) as tags
FROM resources r
LEFT JOIN resource_tags rt ON r.id = rt.resource_id
LEFT JOIN tags t ON rt.tag_id = t.id
WHERE r.id IN (SELECT resource_id FROM enrichment_queue WHERE job_id = '68717a57...')
LIMIT 10;

# Verify tags display on UI
```

### Output Format
**File**: `docs/session-7-evidence/integration/status-report.md`

```markdown
# Integration Status Report

## GitHub Export
- awesome-lint errors: 0 ✅
- Formatter fixes applied: [list]
- Final markdown: 3,390 lines, fully compliant

## AI Enrichment
- Job status: completed
- Resources processed: XXX
- Success rate: XX%
- Tags created: XX new tags
- Evidence: Screenshots of enriched resources with tags
```

---

## Dispatch Instructions

### Pre-Dispatch Checklist
- [x] Evidence directories created
- [x] Coordination memory written
- [x] Docker containers running (port 3000)
- [x] Admin session available (can extract localStorage)
- [ ] All 5 agents dispatched in SINGLE message

### Agent Prompts

**Agent 1 Prompt**:
```
You are Agent 1: Admin UI Verification

Read the coordination plan:
- Serena memory: session-7-parallel-coordination.md
- Your scope: Admin UI components (Tasks 2-30)

Use Playwright MCP to verify:
1. Filter dropdowns (Status, Category, combined, clear)
2. Column sorting (4 columns, both directions)
3. Pagination (Next/Previous, disabled states)
4. Bulk operations (select, toolbar, archive, verify)
5. Admin navigation (10 routes)

Session injection required:
- Extract localStorage from Chrome DevTools MCP (if available)
- OR use: admin@test.com session from coordination memory
- Inject via page.evaluate() before admin routes

For EACH test:
- Screenshot before action
- Perform action
- Screenshot after action
- Verify database if applicable
- Document result

Output: docs/session-7-evidence/admin-ui/verification-report.md

Report bugs, DO NOT fix code. Focus on comprehensive verification.
```

**Agent 2 Prompt**:
```
You are Agent 2: User Workflows Verification

Read: Serena memory session-7-parallel-coordination.md
Scope: User UI workflows (Tasks 31-110)

Verify:
1. Search dialog (/, typing, debounce, filters, results)
2. Profile page (stats, tabs, data matches DB)
3. Bookmarks (add, notes, remove, verify DB)
4. Learning journeys (seed, display, enroll, progress)
5. User preferences (save, verify recommendations change)

You CAN write to database:
- Create test bookmarks (use Encoding & Codecs resources)
- Create journey progress
- MUST cleanup after verification

Use Playwright + Supabase MCP.

Output: docs/session-7-evidence/user-workflows/verification-report.md

Report bugs, focus on end-to-end user experience testing.
```

**Agent 3 Prompt**:
```
You are Agent 3: Security Audit

Read: Serena memory session-7-parallel-coordination.md
Scope: Security testing (Tasks 131-180)

Test:
1. RLS User Isolation
   - Create userA@test.com, userB@test.com via Supabase
   - User A adds bookmark
   - User B tries to access → MUST BE BLOCKED
   - Test all user tables (favorites, preferences, journey_progress)
   - IF RLS FAILS: CRITICAL BUG, report immediately

2. XSS Prevention
   - Inject: <script>alert('XSS')</script>
   - Verify: Rendered as text (escaped)
   - Test: title, description, search inputs
   - IF XSS EXECUTES: CRITICAL VULN, report immediately

3. SQL Injection
   - Input: '; DROP TABLE resources; --
   - Verify: Database unchanged, query parameterized
   - Test: search, filters, all inputs

4. Rate Limiting
   - 100 rapid requests
   - Verify: 429 responses after limit
   - Check: rate limit headers

Use: Bash (curl), Playwright MCP, Supabase MCP

Output: docs/session-7-evidence/security/audit-report.md

CRITICAL: If CRITICAL vulnerability found, report immediately in summary.
```

**Agent 4 Prompt**:
```
You are Agent 4: Performance Benchmarking

Read: Serena memory session-7-parallel-coordination.md
Scope: Performance testing (Tasks 181-210)

Run:
1. Lighthouse audits (5 pages)
   - Homepage, category, admin, profile, bookmarks
   - Capture: Performance score, FCP, LCP, TTI, CLS
   - Target: Performance > 80, FCP < 2s, LCP < 2.5s

2. Load testing with autocannon
   - /api/resources: -c 10 -d 30
   - /api/categories: -c 10 -d 30
   - Concurrent users: -c 100 -d 60
   - Capture: req/sec, latencies (p50/p95/p99), errors
   - Target: p95 < 200ms, 0% errors

3. Query optimization
   - EXPLAIN ANALYZE on common queries
   - Verify index usage
   - Check execution times < 50ms

Use: Bash (lighthouse, autocannon), Supabase MCP

Output: docs/session-7-evidence/performance/benchmark-report.md

Read-only testing, no database writes.
```

**Agent 5 Prompt**:
```
You are Agent 5: Integration Completion

Read: Serena memory session-7-parallel-coordination.md
Scope: Integration tasks (Tasks 61-90)

Tasks:
1. Fix GitHub Export (Tasks 61-75)
   - Run: npx awesome-lint /tmp/awesome-video-export.md
   - Identify: Error types (double links, ToC, license)
   - Fix: server/github/formatter.ts iteratively
   - Rebuild: Docker after each fix
   - Re-export: curl POST /api/admin/export
   - Re-lint: Until 0 errors
   - Document: All fixes applied

2. Monitor AI Enrichment (Tasks 76-90)
   - Job ID: 68717a57-49df-49a3-b9ac-dc01dc6b5ff4
   - Poll: Every 10s until status = 'completed'
   - Verify: enrichment_queue (ai_metadata populated)
   - Verify: Tags created in resources table
   - Verify: Tags display on UI (Playwright screenshot)

Use: Bash, Supabase MCP, Playwright MCP

Output: docs/session-7-evidence/integration/status-report.md

You CAN modify: server/github/formatter.ts (export fixes)
```

### Dispatch Command (Single Message)

```typescript
// CRITICAL: All 5 agents in ONE message for parallel execution
Task(subagent_type='playwright-expert', description='Admin UI Verification', prompt='[Agent 1 Prompt]')
Task(subagent_type='playwright-expert', description='User Workflows Verification', prompt='[Agent 2 Prompt]')
Task(subagent_type='security-auditor', description='Security Audit', prompt='[Agent 3 Prompt]')
Task(subagent_type='performance-engineer', description='Performance Benchmarking', prompt='[Agent 4 Prompt]')
Task(subagent_type='general-purpose', description='Integration Completion', prompt='[Agent 5 Prompt]')
```

---

## Post-Dispatch Workflow

### When All Agents Return (5-6 hours)

**Step 1: Read All Reports**
```bash
cat docs/session-7-evidence/*/verification-report.md
cat docs/session-7-evidence/*/audit-report.md
```

**Step 2: Aggregate Findings**
Create master report:
- Total tests: 219
- Passed: XXX
- Failed: XXX
- Bugs found: XXX (by severity)
- Security issues: XXX
- Performance issues: XXX

**Step 3: Prioritize Bugs**
```
CRITICAL: Security vulnerabilities (fix immediately)
HIGH: Feature-breaking bugs
MEDIUM: UI/UX issues
LOW: Polish items
```

**Step 4: Fix Bugs Centrally**
- Fix one at a time
- Verify fix works
- Re-run affected tests
- Commit incrementally

**Step 5: Final Smoke Test**
- Homepage loads
- Can browse categories
- Can search
- Admin can login and approve
- All verified features work

---

## Remaining Sequential Work

**After Parallel Phase Complete:**

**Domain 2: Production Deployment** (Tasks 211-240, 3-4 hours)
- MUST BE SEQUENTIAL (SSL → staging → production → monitoring)
- Cannot parallelize deployment steps

**Domain 3: Code Cleanup** (Tasks 241-280, 2 hours)
- Remove console.log (can parallelize by file type)
- Fix TypeScript any (can parallelize by domain)
- Update docs (sequential)

---

## Success Criteria

**Parallel Phase Success:**
- ✅ All 5 agents complete without failures
- ✅ All 5 reports generated with evidence
- ✅ No database corruption
- ✅ No code conflicts
- ✅ Bugs documented and prioritized

**Overall Plan Success:**
- ✅ 95% completion (31/33 features verified)
- ✅ Production deployed
- ✅ All evidence documented
- ✅ Security hardened
- ✅ Performance measured

---

## Risk Assessment

**LOW RISK:**
- Agents have separate scopes
- Mostly verification (no code changes)
- Evidence directories prevent file conflicts
- Database writes are non-overlapping

**MEDIUM RISK:**
- Agent 3 (Security) might find CRITICAL vulnerabilities
- Mitigation: Report immediately, pause other agents if needed

**HIGH RISK:**
- None identified

---

**Plan Status**: READY TO EXECUTE
**Next Action**: Dispatch 5 agents in single message
**Estimated Completion**: 12-16 hours total (vs 25-31 sequential)
**Speedup**: ~2x with parallel orchestration
