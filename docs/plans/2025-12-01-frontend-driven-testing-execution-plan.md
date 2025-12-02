# Frontend-Driven Parallel Testing - Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
>
> **CRITICAL:** READ THIS ENTIRE PLAN BEFORE STARTING, even though it's massive (400+ tasks). Read every single line. The preparation tasks load critical domain knowledge into Serena memories that agents will need. Skip reading = agents fail.

**Goal:** Complete 95% application verification (31/33 features) via 3 parallel autonomous agents with Docker isolation and frontend-driven testing

**Architecture:** Each agent builds isolated Docker container on unique port (3001-3003), tests via Chrome DevTools MCP, self-corrects bugs via systematic-debugging loops, verifies all 3 layers (API + Database + UI) at 3 responsive viewports

**Tech Stack:** Chrome DevTools MCP, Supabase MCP, Serena MCP, Docker, Playwright auth fixtures

**Project Skill:** `.claude/skills/frontend-driven-testing/SKILL.md` (project-local, git-tracked)

**Estimated Duration:** 10-14 hours (preparation 1-2h + parallel execution 8-12h)

---

## Phase 0: Preparation - Index Project Knowledge (Tasks 1-10, 1-2 hours)

### Task 1: Verify Serena Memories Exist

**Memory Files Created:**
- agent-1-admin-panel-components-complete
- agent-2-user-components-complete
- agent-3-backend-integrations-complete
- database-schema-complete-all-agents
- session-8-successful-testing-patterns

**Step 1: List memories**

```typescript
mcp__serena__list_memories()
```

**Expected Output:**
Should include all 5 memory files listed above in the result.

**Step 2: Verify each memory is readable**

```typescript
mcp__serena__read_memory({ memory_file_name: "agent-1-admin-panel-components-complete" })
// Should return comprehensive component analysis

mcp__serena__read_memory({ memory_file_name: "agent-2-user-components-complete" })
// Should return user component patterns

mcp__serena__read_memory({ memory_file_name: "agent-3-backend-integrations-complete" })
// Should return backend integration guide

mcp__serena__read_memory({ memory_file_name: "database-schema-complete-all-agents" })
// Should return complete schema reference

mcp__serena__read_memory({ memory_file_name: "session-8-successful-testing-patterns" })
// Should return what worked in Session 8
```

**If any memory missing:** Create it now before proceeding.

---

### Task 2: Verify Project Skill Exists

**File:** `.claude/skills/frontend-driven-testing/SKILL.md`

**Step 1: Check file exists**

```bash
ls -la .claude/skills/frontend-driven-testing/SKILL.md
```

**Expected:** File exists, ~51KB size

**Step 2: Verify skill is loadable**

```typescript
Skill({ skill: "frontend-driven-testing" })
```

**Expected:** Skill content expands into context (~1,100 lines)

**You should see:**
- Core Principle & Iron Law
- Domain Knowledge (awesome list, schema)
- Mandatory Initialization (Serena + Docker setup)
- Self-Correcting Loop
- Real Component Selectors
- Diagnostic Decision Tree
- Responsive Verification
- Supabase MCP Integration

**If skill doesn't load:** Check file path, verify .claude directory structure

---

### Task 3: Verify Docker Prerequisites

**Step 1: Check Docker running**

```bash
docker --version
docker ps
```

**Expected:** Docker version 20+, daemon running

**Step 2: Check port availability**

```bash
lsof -i :3001
lsof -i :3002
lsof -i :3003
```

**Expected:** All ports free (no output)

**If ports occupied:** Stop processes using those ports:
```bash
kill -9 $(lsof -t -i:3001)
```

**Step 3: Verify Dockerfile exists**

```bash
cat Dockerfile | grep "ARG PORT"
```

**Expected:** `ARG PORT=3000` exists

**If missing:** Add to Dockerfile after FROM statement:
```dockerfile
ARG PORT=3000
ENV PORT=$PORT
EXPOSE $PORT
```

---

### Task 4: Verify Database Accessible

**Step 1: Test Supabase MCP connection**

```typescript
mcp__supabase__execute_sql({ query: "SELECT 1 as test" })
```

**Expected:** Returns `{ rows: [{ test: 1 }] }`

**Step 2: Verify resource count**

```typescript
mcp__supabase__execute_sql({ query: "SELECT COUNT(*) as count FROM resources" })
```

**Expected:** count = 2647 (or similar)

**Step 3: Verify test users exist**

```typescript
mcp__supabase__execute_sql({
  query: "SELECT id, email, raw_user_meta_data->>'role' as role FROM auth.users WHERE email LIKE '%@test.com' ORDER BY email"
})
```

**Expected:** At least 3 users (admin@test.com, testuser-a@test.com, testuser-b@test.com)

**If missing:** Create via Supabase dashboard or SQL:
```sql
-- Cannot create users via SQL (Supabase managed)
-- Use dashboard: Auth → Users → Add User
```

---

### Task 5: Verify Chrome DevTools MCP Working

**Step 1: Test browser connection**

```typescript
mcp__chrome-devtools__list_pages({})
```

**Expected:** Returns list of pages (may be empty or have existing tabs)

**Step 2: Test navigation**

```typescript
mcp__chrome-devtools__navigate_page({ type: 'url', url: 'http://google.com' })
```

**Expected:** Navigation successful

**Step 3: Test snapshot**

```typescript
mcp__chrome-devtools__take_snapshot({})
```

**Expected:** Returns accessibility tree with elements and UIDs

**If fails:** Chrome DevTools MCP server may need restart

---

### Task 6: Create Evidence Directories

**Step 1: Create directory structure**

```bash
mkdir -p docs/evidence
mkdir -p docs/bugs
mkdir -p /tmp/screenshots-agent-1
mkdir -p /tmp/screenshots-agent-2
mkdir -p /tmp/screenshots-agent-3
```

**Step 2: Verify directories created**

```bash
ls -ld docs/evidence docs/bugs /tmp/screenshots-agent-*
```

**Expected:** All directories exist

---

### Task 7: Commit Preparation Complete

**Files to commit:**
- Any Dockerfile changes (if PORT arg added)
- Evidence directories (empty, just structure)

**Step 1: Stage files**

```bash
git add Dockerfile docs/evidence/ docs/bugs/
```

**Step 2: Commit**

```bash
git commit -m "prep: Set up environment for parallel frontend-driven testing

- Verified Serena memories exist (5 domain knowledge files)
- Verified project skill exists (.claude/skills/frontend-driven-testing/)
- Verified Docker prerequisites (ports 3001-3003 available)
- Verified database accessible (Supabase MCP working)
- Verified Chrome DevTools MCP working
- Created evidence directories

Ready for 3-agent parallel dispatch."
```

---

## Phase 1: Agent 1 - Admin Panel Testing (Tasks 10-60, 3-4 hours)

### Task 10: Dispatch Agent 1

**Agent Prompt:**
```
ROLE: Admin Panel Testing Specialist (Opus 4.5)

CRITICAL: READ THESE MEMORIES FIRST (before any testing):
1. mcp__serena__read_memory({ memory_file_name: "agent-1-admin-panel-components-complete" })
2. mcp__serena__read_memory({ memory_file_name: "database-schema-complete-all-agents" })
3. mcp__serena__read_memory({ memory_file_name: "session-8-successful-testing-patterns" })

MANDATORY INITIALIZATION:
1. mcp__serena__activate_project({ project: "awesome-list-site" })
2. Skill({ skill: "frontend-driven-testing" })
3. export AGENT_PORT=3001
4. docker build -t awesome-admin:latest --build-arg PORT=3001 --no-cache .
5. docker run -d --name awesome-admin -p 3001:3001 -e PORT=3001 awesome-admin:latest
6. sleep 30 && curl http://localhost:3001/api/health

YOUR DOMAIN: Admin panel UI
- ResourceBrowser (filtering, sorting, pagination, selection)
- BulkActionsToolbar (approve, reject, archive, tag operations)
- PendingResources (approval workflows)
- Resource EditModal
- Admin navigation

COMPONENTS WITHOUT data-testid:
- ResourceBrowser.tsx → table structure selectors (see memory for exact patterns)
- BulkActionsToolbar.tsx → text-based button selectors (see memory)

SELF-CORRECTING LOOP:
WHILE domain_not_complete:
  Test via Chrome DevTools (http://localhost:3001)
  3-layer validation (API + DB + UI) at 3 viewports (desktop/tablet/mobile)
  IF BUG: Skill({ skill: "systematic-debugging" }) → fix code → rebuild → retest
  Document in docs/evidence/admin-panel-results.md

EXPECTED: 40-50 tests, 12-18 bugs fixed, 3-4 hours
```

**Step 1: Dispatch agent**

```typescript
Task({
  subagent_type: 'general-purpose',
  model: 'opus',
  description: 'Admin Panel Testing',
  prompt: '[Paste prompt above]'
})
```

**Step 2: Monitor progress**

Agent will work autonomously for 3-4 hours. No action needed until completion.

**Step 3: When agent reports complete**

Check for output file:
```bash
cat docs/evidence/admin-panel-results.md
```

**Expected:** Comprehensive results with screenshots, SQL queries, bug reports

---

### Task 11: Dispatch Agent 2

**Agent Prompt:**
```
ROLE: End User Testing Specialist (Opus 4.5)

CRITICAL: READ THESE MEMORIES FIRST:
1. mcp__serena__read_memory({ memory_file_name: "agent-2-user-components-complete" })
2. mcp__serena__read_memory({ memory_file_name: "database-schema-complete-all-agents" })
3. mcp__serena__read_memory({ memory_file_name: "session-8-successful-testing-patterns" })

MANDATORY INITIALIZATION:
1. mcp__serena__activate_project({ project: "awesome-list-site" })
2. Skill({ skill: "frontend-driven-testing" })
3. export AGENT_PORT=3002
4. docker build -t awesome-user:latest --build-arg PORT=3002 --no-cache .
5. docker run -d --name awesome-user -p 3002:3002 -e PORT=3002 awesome-user:latest
6. sleep 30 && curl http://localhost:3002/api/health

YOUR DOMAIN: User-facing features
- Login/Signup (email/password - Login.tsx has NO data-testid!)
- Favorites (add, remove, view)
- Bookmarks (add with notes, remove)
- Profile (stats, tabs)
- Search & filters
- Learning journeys (enroll, progress)

CRITICAL: Login.tsx has NO data-testid - use input[type="email"], input[type="password"] (see memory)

SELF-CORRECTING LOOP:
WHILE domain_not_complete:
  Test via Chrome DevTools (http://localhost:3002)
  3-layer validation at 3 viewports
  IF BUG: Skill({ skill: "systematic-debugging" }) → fix → rebuild → retest
  Document in docs/evidence/end-user-results.md

TEST USERS: testuser-a@test.com / TestUserA123!, testuser-b@test.com / TestUserB123!

EXPECTED: 50-60 tests, 10-15 bugs fixed, 3-4 hours
```

**Step 1: Dispatch agent**

```typescript
Task({
  subagent_type: 'general-purpose',
  model: 'opus',
  description: 'End User Testing',
  prompt: '[Paste prompt above]'
})
```

**Step 2: Monitor** - Agent works autonomously

**Step 3: When complete, check:** `docs/evidence/end-user-results.md`

---

### Task 12: Dispatch Agent 3

**Agent Prompt:**
```
ROLE: Admin Integration Testing Specialist (Opus 4.5)

CRITICAL: READ THESE MEMORIES FIRST:
1. mcp__serena__read_memory({ memory_file_name: "agent-3-backend-integrations-complete" })
2. mcp__serena__read_memory({ memory_file_name: "database-schema-complete-all-agents" })
3. mcp__serena__read_memory({ memory_file_name: "session-8-successful-testing-patterns" })

MANDATORY INITIALIZATION:
1. mcp__serena__activate_project({ project: "awesome-list-site" })
2. Skill({ skill: "frontend-driven-testing" })
3. export AGENT_PORT=3003
4. docker build -t awesome-integration:latest --build-arg PORT=3003 --no-cache .
5. docker run -d --name awesome-integration -p 3003:3003 -e PORT=3003 awesome-integration:latest
6. sleep 30 && curl http://localhost:3003/api/health

YOUR DOMAIN: External integrations
- GitHub sync (import/export with awesome-lint validation)
- AI enrichment (Claude Haiku 4.5 - NEVER TESTED, 30s per resource!)
- Bulk operations backend (atomic transactions)
- User management

HIGHEST RISK: AI enrichment takes ~30 seconds per resource, can timeout/rate limit

SELF-CORRECTING LOOP:
WHILE domain_not_complete:
  Test via Chrome DevTools (http://localhost:3003)
  3-layer validation at 3 viewports
  IF BUG: Skill({ skill: "systematic-debugging" }) → fix → rebuild → retest
  Document in docs/evidence/admin-integration-results.md

VERIFY: ANTHROPIC_API_KEY and GITHUB_TOKEN configured in environment

EXPECTED: 30-40 tests, 15-20 bugs fixed, 4-5 hours
```

**Step 1: Dispatch agent**

```typescript
Task({
  subagent_type: 'general-purpose',
  model: 'opus',
  description: 'Admin Integration Testing',
  prompt: '[Paste prompt above]'
})
```

**Step 2: Monitor** - Agent works autonomously

**Step 3: When complete, check:** `docs/evidence/admin-integration-results.md`

---

## Phase 2: Parallel Execution (Tasks 10-12 happen simultaneously, 8-12 hours)

**What Happens:**
- All 3 agents dispatched in SINGLE message (Tasks 10-12 together)
- Each builds own Docker container (ports 3001-3003)
- Each tests via Chrome DevTools pointing to own port
- Each finds bugs, invokes systematic-debugging, fixes, rebuilds, retests
- Each documents evidence independently

**No coordination needed:** Agents work completely independently

**Monitor via:**
```bash
# Check all containers running
docker ps | grep awesome-

# Check logs if needed
docker logs awesome-admin | tail -50
docker logs awesome-user | tail -50
docker logs awesome-integration | tail -50
```

---

## Phase 3: Coordinator Consolidation (Tasks 20-30, 1-2 hours)

### Task 20: Read All Agent Evidence

**Files:**
- docs/evidence/admin-panel-results.md
- docs/evidence/end-user-results.md
- docs/evidence/admin-integration-results.md

**Step 1: Read Agent 1 results**

```bash
cat docs/evidence/admin-panel-results.md
```

**Step 2: Read Agent 2 results**

```bash
cat docs/evidence/end-user-results.md
```

**Step 3: Read Agent 3 results**

```bash
cat docs/evidence/admin-integration-results.md
```

**Step 4: Extract statistics**

From each file, note:
- Total tests executed
- Tests passed
- Bugs found
- Bugs fixed
- Duration
- Known limitations (if any)

---

### Task 21: Aggregate Results

**File:** Create `docs/TESTING_EVIDENCE_SUMMARY.md`

**Step 1: Calculate totals**

```
Total Tests = Agent1.tests + Agent2.tests + Agent3.tests
Total Passed = Agent1.passed + Agent2.passed + Agent3.passed
Total Bugs Fixed = Agent1.bugs + Agent2.bugs + Agent3.bugs
Total Duration = MAX(Agent1.duration, Agent2.duration, Agent3.duration)  # Parallel
```

**Step 2: Write summary document**

```bash
cat > docs/TESTING_EVIDENCE_SUMMARY.md << 'EOF'
# Testing Evidence Summary

**Date:** 2025-12-01
**Execution Model:** 3 parallel autonomous agents
**Duration:** [MAX duration] hours (parallel wall-clock time)

## Overall Results
- Total Tests: [sum]
- Tests Passed: [sum]
- Bugs Found: [sum]
- Bugs Fixed: [sum]
- Known Limitations: [count]

## Agent 1: Admin Panel (PORT 3001)
- Tests: [from results file]
- Passed: [from results file]
- Bugs Fixed: [count]
- Duration: [hours]
- Evidence: docs/evidence/admin-panel-results.md

## Agent 2: End User (PORT 3002)
- Tests: [from results file]
- Passed: [from results file]
- Bugs Fixed: [count]
- Duration: [hours]
- Evidence: docs/evidence/end-user-results.md

## Agent 3: Admin Integration (PORT 3003)
- Tests: [from results file]
- Passed: [from results file]
- Bugs Fixed: [count]
- Duration: [hours]
- Evidence: docs/evidence/admin-integration-results.md

## Features Verified
[List all features that passed 3-layer validation]

## Known Limitations
[List any features that couldn't be verified after 3 attempts]

## Completion Status
- Features Verified: [count]/33
- Percentage: [calculation]%
- Production Ready: [YES/NO]
EOF
```

---

### Task 22: Calculate Completion Percentage

**File:** Create `docs/COMPLETION_METRICS.md`

**Step 1: Count verified features**

From evidence files, count features where all 3 layers passed.

**Step 2: Write metrics document**

```bash
cat > docs/COMPLETION_METRICS.md << 'EOF'
# Completion Progression

## Before This Session
- Features Verified: 13/33 = 40%
- Based on: Session 8 integration tests

## After Parallel Testing
- Features Verified: [count]/33 = [percent]%
- Tests Passed: [total]
- Bugs Fixed: [total]

## Progression
- Starting: 40% (13 features)
- Ending: [percent]% ([count] features)
- Improvement: +[delta] percentage points

## Target Achievement
- Target: 95% (31/33 features)
- Actual: [percent]%
- Status: [Met/Not Met/Close]

## Remaining Gaps
[List 2 features not verified, if any]

- Advanced analytics (ML-powered) - Future
- Email notifications - Future
EOF
```

---

### Task 23: Final Commit

**Step 1: Add all evidence**

```bash
git add docs/evidence/
git add docs/bugs/ # If any bug reports created
git add docs/TESTING_EVIDENCE_SUMMARY.md
git add docs/COMPLETION_METRICS.md
```

**Step 2: Commit with comprehensive message**

```bash
git commit -m "$(cat <<'EOF'
test: Complete frontend-driven parallel testing - [X]% verified

EXECUTION MODEL:
- 3 autonomous agents (ports 3001-3003)
- Self-correcting loops (test → debug → fix → rebuild → retest)
- Docker isolation (each agent own container)
- Frontend-driven (UI → API → DB → UI validation)

STATISTICS:
- Total tests: [sum]
- Tests passed: [sum]
- Bugs found and fixed: [sum]
- Duration: [MAX] hours (parallel execution)
- Features verified: [count]/33 ([percent]%)

AGENTS:
- Agent 1 (Admin Panel): [tests] tests, [bugs] bugs, port 3001
- Agent 2 (End User): [tests] tests, [bugs] bugs, port 3002
- Agent 3 (Admin Integration): [tests] tests, [bugs] bugs, port 3003

EVIDENCE:
- 3 comprehensive evidence documents
- [count] screenshots (9 per test: 3 viewports × 3 states)
- [count] SQL verification queries
- [count] network log captures
- All bugs documented with systematic-debugging 4-phase analysis

SKILL USED:
- .claude/skills/frontend-driven-testing/SKILL.md
- Project-local, self-orienting with domain knowledge
- Enforces Iron Law (all 3 layers mandatory)
- Includes diagnostic decision tree
- Real selectors from actual components

PRE-INDEXED KNOWLEDGE:
- 5 Serena memories loaded by agents
- Domain-specific component patterns
- Database schema and RLS policies
- Successful patterns from Session 8

IRON LAW ENFORCEMENT:
- All tests verified all 3 layers (API + Database + UI)
- Responsive verification (desktop 1920×1080, tablet 768×1024, mobile 375×667)
- Visual inspection via Read tool (Claude examined screenshots)
- No "API works good enough" shortcuts allowed

PRODUCTION READINESS: [YES/NO based on completion]

[If <95%: List remaining work]
[If >=95%: Ready for deployment]
EOF
)"
```

**Step 3: Verify commit**

```bash
git log -1 --stat
```

**Expected:** Shows commit with all evidence files

---

## Success Criteria

**Phase 0 (Preparation) COMPLETE when:**
- ✅ All 5 Serena memories verified
- ✅ Project skill loaded successfully
- ✅ Docker prerequisites met
- ✅ Database and Chrome DevTools MCP working
- ✅ Evidence directories created

**Phase 1 (Agent Execution) COMPLETE when:**
- ✅ All 3 agents dispatched
- ✅ All 3 agents initialized (containers running)
- ✅ All 3 agents complete testing (report back)
- ✅ All 3 evidence files exist

**Phase 2 (Consolidation) COMPLETE when:**
- ✅ Evidence aggregated into summary
- ✅ Completion metrics calculated
- ✅ Known limitations documented (if any)
- ✅ Final commit created

**Overall Plan SUCCESS when:**
- ✅ 90%+ features verified (28+ out of 33)
- ✅ All 3 layers validated for each feature
- ✅ Responsive verification at all 3 viewports
- ✅ All evidence properly documented
- ✅ Production ready or clear next steps documented

---

## Execution Instructions

**To execute this plan in NEXT SESSION:**

```
/superpowers:execute-plan docs/plans/2025-12-01-frontend-driven-testing-execution-plan.md
```

**The executing-plans skill will:**
1. Load this entire plan (read every line)
2. Execute Task 1 (verify memories)
3. Report results
4. Wait for approval
5. Execute Task 2 (verify skill)
6. Continue task-by-task with review checkpoints
7. When ready, dispatch all 3 agents (Tasks 10-12 together)
8. Monitor until complete
9. Execute consolidation (Tasks 20-23)

**Estimated Total:** 10-14 hours (preparation 1-2h + parallel execution 8-12h)

---

## Plan Metadata

**Format:** writing-plans compliant (bite-sized tasks with exact commands)
**Skill Reference:** .claude/skills/frontend-driven-testing/SKILL.md (project-local)
**Memory Dependencies:** 5 Serena memories (pre-indexed domain knowledge)
**Agent Count:** 3 autonomous specialists
**Docker Ports:** 3001 (Admin), 3002 (User), 3003 (Integration)
**Execution Mode:** Parallel with self-correcting loops
**Target:** 90-95% completion (28-31 features verified)

**Created:** 2025-12-01
**Consolidates:** 13 failed plans with corrected paradigm
**Ready for:** Immediate execution via /superpowers:execute-plan

---

**🚀 This plan is ready for executing-plans skill to process task-by-task with proper review checkpoints**
