# Frontend-Driven Parallel Testing - Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
>
> **CRITICAL:** READ THIS ENTIRE PLAN FIRST, even though it's massive. Every line. The preparation phase loads domain knowledge into Serena memories that agents need.

**Goal:** Achieve 90-95% completion (28-31/33 features verified) via 3 parallel autonomous agents using frontend-driven development with Docker isolation

**Architecture:** Each agent builds isolated Docker container on unique port, tests via Chrome DevTools MCP, self-corrects bugs through systematic-debugging loops, validates all 3 layers (API+DB+UI) at 3 responsive viewports

**Tech Stack:** Chrome DevTools MCP, Supabase MCP, Serena MCP, Docker, TanStack Query, Drizzle ORM

---

## Phase 0: Environment Verification (Tasks 1-10, 30 minutes)

### Task 1: Verify Serena Project Activation

**Step 1: Activate project**

```typescript
mcp__serena__activate_project({ project: "awesome-list-site" })
```

Expected: `"Project activated, languages: typescript"`

**Step 2: Verify activation**

```typescript
mcp__serena__list_memories()
```

Expected: Returns list including agent-1, agent-2, agent-3, database-schema, session-8 memories

---

### Task 2: Load All Domain Knowledge Memories

**Step 1: Read Agent 1 memory**

```typescript
mcp__serena__read_memory({ memory_file_name: "agent-1-admin-panel-components-complete" })
```

Expected: Complete admin component reference with selectors

**Step 2: Read Agent 2 memory**

```typescript
mcp__serena__read_memory({ memory_file_name: "agent-2-user-components-complete" })
```

Expected: User component patterns including Login.tsx fallback selectors

**Step 3: Read Agent 3 memory**

```typescript
mcp__serena__read_memory({ memory_file_name: "agent-3-backend-integrations-complete" })
```

Expected: Backend integration guide (GitHub, AI enrichment)

**Step 4: Read database schema memory**

```typescript
mcp__serena__read_memory({ memory_file_name: "database-schema-complete-all-agents" })
```

Expected: All 16 tables with RLS policies

**Step 5: Read testing patterns memory**

```typescript
mcp__serena__read_memory({ memory_file_name: "session-8-successful-testing-patterns" })
```

Expected: What worked (MultiContext, 3-layer, auth fixtures)

---

### Task 3: Verify Project Skill

**Step 1: Check skill file exists**

```bash
ls -la .claude/skills/frontend-driven-testing/SKILL.md
```

Expected: File exists, ~51KB

**Step 2: Load skill**

```typescript
Skill({ skill: "frontend-driven-testing" })
```

Expected: Skill expands with Iron Law, Domain Knowledge, Self-Correcting Loop, Selectors, Diagnostic Tree

---

### Task 4: Verify Docker Prerequisites

**Step 1: Check Docker daemon**

```bash
docker ps
```

Expected: Docker running, may show existing containers

**Step 2: Check ports available**

```bash
lsof -i :3001 && echo "PORT 3001 OCCUPIED" || echo "PORT 3001 FREE"
lsof -i :3002 && echo "PORT 3002 OCCUPIED" || echo "PORT 3002 FREE"
lsof -i :3003 && echo "PORT 3003 OCCUPIED" || echo "PORT 3003 FREE"
```

Expected: All ports FREE

**Step 3: Verify Dockerfile**

```bash
grep "ARG PORT" Dockerfile
```

Expected: `ARG PORT=3000`

If missing, add after FROM:
```dockerfile
ARG PORT=3000
ENV PORT=$PORT
EXPOSE $PORT
```

---

### Task 5: Verify Database Connection

**Step 1: Test Supabase MCP**

```typescript
mcp__supabase__execute_sql({ query: "SELECT COUNT(*) as count FROM resources" })
```

Expected: count = 2647 (or similar)

**Step 2: Verify test users**

```typescript
mcp__supabase__execute_sql({
  query: "SELECT email, raw_user_meta_data->>'role' as role FROM auth.users WHERE email LIKE '%@test.com' ORDER BY email"
})
```

Expected: admin@test.com (role=admin), testuser-a@test.com (role=user or null), testuser-b@test.com

---

### Task 6: Verify Chrome DevTools MCP

**Step 1: Test connection**

```typescript
mcp__chrome-devtools__list_pages({})
```

Expected: Returns pages array (may be empty)

**Step 2: Test navigation**

```typescript
mcp__chrome-devtools__navigate_page({ type: 'url', url: 'http://google.com' })
```

Expected: Navigation successful

**Step 3: Test snapshot**

```typescript
mcp__chrome-devtools__take_snapshot({})
```

Expected: Returns accessibility tree

---

### Task 7: Create Evidence Structure

**Step 1: Create directories**

```bash
mkdir -p docs/evidence docs/bugs /tmp/agent-1-screenshots /tmp/agent-2-screenshots /tmp/agent-3-screenshots
```

**Step 2: Verify**

```bash
ls -ld docs/evidence docs/bugs /tmp/agent-*-screenshots
```

Expected: All directories exist

---

### Task 8: Commit Preparation

```bash
git add Dockerfile .claude/skills/frontend-driven-testing/ docs/evidence/ docs/bugs/

git commit -m "prep: Environment ready for parallel frontend-driven testing

- Serena memories: 5 domain knowledge files verified
- Project skill: .claude/skills/frontend-driven-testing/SKILL.md verified
- Docker: Ports 3001-3003 available, Dockerfile has PORT arg
- Database: Supabase MCP connected, 2647 resources, test users exist
- Chrome DevTools MCP: Connected and responsive
- Evidence directories: Created

Ready for 3-agent parallel dispatch."
```

---

## Phase 1: Dispatch Agent 1 - Admin Panel (Task 10, starts 3-4 hour autonomous run)

### Task 10: Dispatch Admin Panel Agent

**Create agent prompt file**

File: `/tmp/agent-1-prompt.md`

```bash
cat > /tmp/agent-1-prompt.md << 'EOF'
ROLE: Admin Panel Testing Specialist (Opus 4.5)

MANDATORY FIRST ACTIONS (Complete in order):

1. Activate Serena MCP:
   mcp__serena__activate_project({ project: "awesome-list-site" })

2. Load Domain Knowledge (READ ALL 5 MEMORIES):
   mcp__serena__read_memory({ memory_file_name: "agent-1-admin-panel-components-complete" })
   mcp__serena__read_memory({ memory_file_name: "database-schema-complete-all-agents" })
   mcp__serena__read_memory({ memory_file_name: "session-8-successful-testing-patterns" })
   mcp__serena__read_memory({ memory_file_name: "agent-2-user-components-complete" })
   mcp__serena__read_memory({ memory_file_name: "agent-3-backend-integrations-complete" })

3. Load Testing Skill:
   Skill({ skill: "frontend-driven-testing" })

4. Set PORT:
   export AGENT_PORT=3001

5. Build Docker:
   cd /Users/nick/Desktop/awesome-list-site
   docker build -t awesome-admin:latest --build-arg PORT=3001 --no-cache .

6. Run Container:
   docker run -d --name awesome-admin -p 3001:3001 -e PORT=3001 awesome-admin:latest
   sleep 30

7. Verify Health:
   curl http://localhost:3001/api/health
   Expected: {"status":"ok"}

YOUR DOMAIN: Admin panel UI components
Files: client/src/components/admin/*.tsx, client/src/pages/AdminDashboard.tsx

CRITICAL COMPONENTS:
- ResourceBrowser.tsx (NO data-testid - use table structure selectors from memory)
- BulkActionsToolbar.tsx (NO data-testid - use text-based selectors from memory)
- PendingResources.tsx (HAS data-testid - use these patterns)

FEATURES TO TEST:
1. Resource filtering (status, category filters)
2. Resource sorting (title, category, status, date columns)
3. Pagination (next, previous, disabled states)
4. Row selection (checkbox, select all)
5. Bulk approve (select multiple, approve, verify atomic)
6. Bulk reject (with confirmation dialog)
7. Bulk archive
8. Bulk tag assignment
9. Resource edit modal (open, edit, save, verify)
10. Admin navigation (dashboard tabs, routes)

SELF-CORRECTING LOOP (your core activity):
FOR EACH feature:
  Test via Chrome DevTools (http://localhost:3001)
  Layer 1: API call verification (list_network_requests)
  Layer 2: Database verification (Supabase MCP)
  Layer 3: UI verification at 3 viewports:
    - Desktop 1920×1080
    - Tablet 768×1024
    - Mobile 375×667
    Screenshot each, use Read tool to inspect visually

  IF any layer FAILS:
    Invoke: Skill({ skill: "systematic-debugging" })
    4-phase investigation
    Fix code via Serena MCP
    Rebuild: docker stop + build --no-cache + run
    RESTART test from beginning

  WHEN all 3 layers PASS:
    Document evidence
    Continue to next feature

IRON LAW: All 3 layers required - NO "API works good enough"

OUTPUT FILE: docs/evidence/admin-panel-results.md
FORMAT: [Feature name, status, 3-layer evidence, screenshots, SQL, bugs fixed]

EXPECTED: 40-50 features tested, 12-18 bugs found and fixed, 3-4 hours
EOF
```

**Dispatch agent**

```typescript
Task({
  subagent_type: 'general-purpose',
  model: 'opus',
  description: 'Admin Panel Testing Specialist',
  prompt: `$(cat /tmp/agent-1-prompt.md)`
})
```

Agent runs autonomously for 3-4 hours.

---

## Phase 2: Dispatch Agent 2 - End User (Task 11, starts 3-4 hour autonomous run)

### Task 11: Dispatch End User Agent

**Create prompt**

File: `/tmp/agent-2-prompt.md`

```bash
cat > /tmp/agent-2-prompt.md << 'EOF'
ROLE: End User Testing Specialist (Opus 4.5)

MANDATORY FIRST ACTIONS:
1. mcp__serena__activate_project({ project: "awesome-list-site" })

2. Load ALL 5 memories:
   mcp__serena__read_memory({ memory_file_name: "agent-2-user-components-complete" })
   mcp__serena__read_memory({ memory_file_name: "database-schema-complete-all-agents" })
   mcp__serena__read_memory({ memory_file_name: "session-8-successful-testing-patterns" })
   mcp__serena__read_memory({ memory_file_name: "agent-1-admin-panel-components-complete" })
   mcp__serena__read_memory({ memory_file_name: "agent-3-backend-integrations-complete" })

3. Skill({ skill: "frontend-driven-testing" })

4. export AGENT_PORT=3002

5. Build:
   docker build -t awesome-user:latest --build-arg PORT=3002 --no-cache .

6. Run:
   docker run -d --name awesome-user -p 3002:3002 -e PORT=3002 awesome-user:latest
   sleep 30

7. Verify:
   curl http://localhost:3002/api/health → {"status":"ok"}

YOUR DOMAIN: User-facing workflows
Files: client/src/pages/Login.tsx, Profile.tsx, Bookmarks.tsx, Journeys.tsx, client/src/components/resource/*.tsx

CRITICAL: Login.tsx has NO data-testid
Selectors from memory:
- Email: input[type="email"] OR input[placeholder="Email"]
- Password: input[type="password"]
- Submit: button[type="submit"]

FEATURES TO TEST:
1. Login email/password (signin mode)
2. Signup email/password (signup mode)
3. Add favorite (click star, verify DB row, verify profile display)
4. Remove favorite
5. Add bookmark (with notes)
6. Edit bookmark notes
7. Remove bookmark
8. Profile stats accuracy (count matches DB)
9. Search text (various queries)
10. Search with category filter
11. Learning journey browse
12. Journey enrollment
13. Journey progress tracking
14. User preferences save/load

SELF-CORRECTING LOOP:
FOR EACH feature:
  Test via http://localhost:3002
  3-layer validation at 3 viewports
  IF BUG: Skill({ skill: "systematic-debugging" }) → fix → rebuild → retest
  Document evidence

TEST CREDENTIALS:
- testuser-a@test.com / TestUserA123!
- testuser-b@test.com / TestUserB123!

OUTPUT: docs/evidence/end-user-results.md
EXPECTED: 50-60 tests, 10-15 bugs, 3-4 hours
EOF
```

**Dispatch**

```typescript
Task({
  subagent_type: 'general-purpose',
  model: 'opus',
  description: 'End User Testing Specialist',
  prompt: `$(cat /tmp/agent-2-prompt.md)`
})
```

---

## Phase 3: Dispatch Agent 3 - Admin Integration (Task 12, starts 4-5 hour autonomous run)

### Task 12: Dispatch Admin Integration Agent

**Create prompt**

File: `/tmp/agent-3-prompt.md`

```bash
cat > /tmp/agent-3-prompt.md << 'EOF'
ROLE: Admin Integration Testing Specialist (Opus 4.5)

MANDATORY FIRST ACTIONS:
1. mcp__serena__activate_project({ project: "awesome-list-site" })

2. Load ALL 5 memories:
   mcp__serena__read_memory({ memory_file_name: "agent-3-backend-integrations-complete" })
   mcp__serena__read_memory({ memory_file_name: "database-schema-complete-all-agents" })
   mcp__serena__read_memory({ memory_file_name: "session-8-successful-testing-patterns" })
   mcp__serena__read_memory({ memory_file_name: "agent-1-admin-panel-components-complete" })
   mcp__serena__read_memory({ memory_file_name: "agent-2-user-components-complete" })

3. Skill({ skill: "frontend-driven-testing" })

4. export AGENT_PORT=3003

5. Build:
   docker build -t awesome-integration:latest --build-arg PORT=3003 --no-cache .

6. Run:
   docker run -d --name awesome-integration -p 3003:3003 -e PORT=3003 awesome-integration:latest
   sleep 30

7. Verify:
   curl http://localhost:3003/api/health → {"status":"ok"}

YOUR DOMAIN: Backend integrations and complex workflows
Files: server/github/*.ts, server/ai/*.ts, server/routes.ts (bulk endpoints)

HIGHEST RISK FEATURES:
- AI enrichment (NEVER TESTED, 30s per resource, Claude API timeouts possible)
- GitHub export (awesome-lint validation - had 40+ errors in Session 6)
- Bulk operations backend (transaction atomicity uncertain)

FEATURES TO TEST:
1. GitHub import (dry-run, verify preview)
2. GitHub export (generate markdown, run awesome-lint, iterate until 0 errors)
3. AI enrichment job (batch=5, monitor progress, verify tags created)
4. Bulk approve backend (verify atomic transaction, audit logging)
5. Bulk tag backend (verify tags table + resource_tags junctions)
6. User role management

SELF-CORRECTING LOOP:
FOR EACH feature:
  Test via http://localhost:3003
  3-layer validation at 3 viewports
  IF BUG: Skill({ skill: "systematic-debugging" }) → fix → rebuild → retest

SPECIAL NOTE: AI enrichment takes ~30s per resource (5 resources = 2.5 min)
Use diagnostic tree if waiting - check enrichment_queue table for status updates

OUTPUT: docs/evidence/admin-integration-results.md
EXPECTED: 30-40 tests, 15-20 bugs, 4-5 hours
EOF
```

**Dispatch**

```typescript
Task({
  subagent_type: 'general-purpose',
  model: 'opus',
  description: 'Admin Integration Testing Specialist',
  prompt: `$(cat /tmp/agent-3-prompt.md)`
})
```

---

## Phase 4: Monitor Parallel Execution (Tasks 20-22, monitor during 8-12 hours)

### Task 20: Monitor Container Health

**While agents are running, periodically check:**

```bash
docker ps | grep awesome-
```

Expected: 3 containers running (awesome-admin, awesome-user, awesome-integration)

**If any container stopped:**

```bash
docker logs awesome-[name] | tail -50
```

Check for crash errors. Agent should restart container if needed.

---

### Task 21: Check Evidence Files Appearing

**Periodically check:**

```bash
ls -lh docs/evidence/
```

Expected: Files appearing as agents work:
- admin-panel-results.md (grows over time)
- end-user-results.md
- admin-integration-results.md

---

### Task 22: Wait for All Agents Complete

**Agents will report when done**

Expected messages:
- "Agent 1 complete: docs/evidence/admin-panel-results.md created"
- "Agent 2 complete: docs/evidence/end-user-results.md created"
- "Agent 3 complete: docs/evidence/admin-integration-results.md created"

**Proceed to Phase 5 when all 3 agents report complete**

---

## Phase 5: Consolidation (Tasks 30-35, 1 hour)

### Task 30: Read All Evidence Files

**Step 1: Read Agent 1 results**

```bash
cat docs/evidence/admin-panel-results.md
```

**Step 2: Extract statistics**

Note from file:
- Total tests: ?
- Tests passed: ?
- Bugs fixed: ?
- Duration: ? hours

**Step 3: Read Agent 2 results**

```bash
cat docs/evidence/end-user-results.md
```

Extract same statistics.

**Step 4: Read Agent 3 results**

```bash
cat docs/evidence/admin-integration-results.md
```

Extract same statistics.

---

### Task 31: Aggregate Statistics

**Step 1: Calculate totals**

```
Total tests = Agent1 + Agent2 + Agent3
Total passed = Agent1.passed + Agent2.passed + Agent3.passed
Total bugs = Agent1.bugs + Agent2.bugs + Agent3.bugs
Duration = MAX(Agent1.duration, Agent2.duration, Agent3.duration)
```

**Step 2: Calculate completion**

```
Features from Agent 1 evidence file: count
Features from Agent 2 evidence file: count
Features from Agent 3 evidence file: count

Total verified = sum
Percentage = (verified / 33) × 100
```

---

### Task 32: Create Evidence Summary

**File:** Create `docs/TESTING_EVIDENCE_SUMMARY.md`

```bash
cat > docs/TESTING_EVIDENCE_SUMMARY.md << 'EOF'
# Testing Evidence Summary

**Date:** 2025-12-01
**Model:** 3 parallel autonomous agents with Docker isolation
**Duration:** [MAX duration] hours (parallel)

## Overall Results
- Total Tests: [sum]
- Tests Passed: [sum]
- Bugs Found and Fixed: [sum]
- Features Verified: [count]/33 = [percent]%

## Agent 1: Admin Panel (PORT 3001)
- Container: awesome-admin:latest
- Tests: [from results]
- Passed: [from results]
- Bugs Fixed: [count]
- Duration: [hours]
- Evidence: docs/evidence/admin-panel-results.md

## Agent 2: End User (PORT 3002)
- Container: awesome-user:latest
- Tests: [from results]
- Passed: [from results]
- Bugs Fixed: [count]
- Duration: [hours]
- Evidence: docs/evidence/end-user-results.md

## Agent 3: Admin Integration (PORT 3003)
- Container: awesome-integration:latest
- Tests: [from results]
- Passed: [from results]
- Bugs Fixed: [count]
- Duration: [hours]
- Evidence: docs/evidence/admin-integration-results.md

## All 3 Layers Verified
- API: ✅ All tests verified network requests
- Database: ✅ All tests verified persistence via Supabase MCP
- UI: ✅ All tests verified at 3 viewports (desktop/tablet/mobile)

## Responsive Verification
- Screenshots: [count] total (minimum 9 per test)
- Viewports tested: Desktop 1920×1080, Tablet 768×1024, Mobile 375×667
- Visual inspection: Claude Read tool used for all screenshots

## Self-Correcting Evidence
- Bugs found: [total]
- Bugs fixed: [total] (agents used systematic-debugging skill)
- Average fix time: [estimate based on duration/bugs]
- Container rebuilds: [estimate ~2 per agent per bug]

## Iron Law Compliance
- Tests with all 3 layers: [total]
- Tests with <3 layers: 0 (none - Iron Law enforced)
- "Good enough" rationalizations: 0 (prevented by skill)

## Production Readiness
- Completion: [percent]%
- Target: 90-95%
- Status: [Met/Not Met]
- Ready for deployment: [YES/NO]

## Known Limitations
[List any features that couldn't be verified after 3 attempts]
[Document why and future resolution strategy]
EOF
```

Fill in values from aggregated statistics.

---

### Task 33: Create Completion Metrics

**File:** Create `docs/COMPLETION_METRICS.md`

```bash
cat > docs/COMPLETION_METRICS.md << 'EOF'
# Completion Progression

## Session Timeline
- Sessions 1-2: Migration (6 features verified = 18%)
- Sessions 3-4: Admin panel build + bugs (11 features = 33%)
- Session 5: Data model fix (13 features = 40%)
- Sessions 6-9: Integration testing framework (13 features = 40%)
- **This Session: Parallel frontend-driven testing**

## Before This Session
- Features Verified: 13/33 = 40%
- Tests: 13 integration tests passing
- Evidence: Limited (Session 8 only)

## After This Session
- Features Verified: [count]/33 = [percent]%
- Tests: [total] tests passed
- Evidence: Comprehensive (3 agent reports, [count] screenshots)

## Progression
- Improvement: +[delta] percentage points
- New features verified: [count]
- Total bugs fixed (all sessions): 22 + [this session bugs] = [total]

## Target Achievement
- Target: 90-95% (28-31 features)
- Actual: [percent]%
- Status: ✅ Met / ⚠️ Close ([features] short) / ❌ Not met

## Remaining Work
[If <90%: List what's not verified and why]
[If >=90%: Production deployment next]
EOF
```

---

### Task 34: Commit Final Results

**Step 1: Add all evidence**

```bash
git add docs/evidence/ docs/bugs/ docs/TESTING_EVIDENCE_SUMMARY.md docs/COMPLETION_METRICS.md
```

**Step 2: Commit with comprehensive message**

```bash
git commit -m "$(cat <<'EOF'
test: Complete parallel frontend-driven testing - [X]% verified

EXECUTION:
- 3 autonomous agents (Docker isolation, ports 3001-3003)
- Self-correcting loops (test → debug → fix → rebuild → retest)
- All 3 layers validated (API + Database + UI)
- Responsive verification (3 viewports per test)

STATISTICS:
- Total tests: [sum]
- Tests passed: [sum]
- Bugs found and fixed: [sum]
- Features verified: [count]/33 ([percent]%)
- Duration: [MAX] hours (parallel execution)

AGENTS:
- Agent 1 (Admin Panel): [tests] tests, [bugs] bugs, port 3001
- Agent 2 (End User): [tests] tests, [bugs] bugs, port 3002
- Agent 3 (Admin Integration): [tests] tests, [bugs] bugs, port 3003

EVIDENCE:
- 3 comprehensive evidence documents
- [count] screenshots (9 per test minimum)
- [count] SQL verification queries
- All bugs documented with 4-phase systematic-debugging analysis

IRON LAW ENFORCEMENT:
- All tests verified all 3 layers (no shortcuts)
- Responsive tested (desktop/tablet/mobile)
- Visual inspection via Read tool (Claude examined screenshots)

SKILL + MEMORIES:
- .claude/skills/frontend-driven-testing/SKILL.md used
- 5 Serena memories pre-loaded domain knowledge
- Agents self-oriented with schema, architecture, component patterns

PRODUCTION READINESS: [YES/NO]
[Based on completion percentage]
EOF
)"
```

---

### Task 35: Stop All Containers

**Step 1: Stop and remove containers**

```bash
docker stop awesome-admin awesome-user awesome-integration
docker rm awesome-admin awesome-user awesome-integration
```

**Step 2: Verify cleanup**

```bash
docker ps -a | grep awesome-
```

Expected: No awesome-* containers

**Optional: Remove images if done**

```bash
docker rmi awesome-admin:latest awesome-user:latest awesome-integration:latest
```

---

## Success Criteria

**Phase 0 (Preparation) COMPLETE when:**
- ✅ All 5 Serena memories exist and readable
- ✅ Project skill loads successfully
- ✅ Docker, database, Chrome DevTools all verified working
- ✅ Evidence directories created
- ✅ Preparation committed

**Phase 1-3 (Agent Dispatch) COMPLETE when:**
- ✅ All 3 agents dispatched in Tasks 10-12
- ✅ All 3 agents initialized (containers running, health checks pass)
- ✅ All 3 agents complete testing (report back with evidence files)

**Phase 4 (Monitoring) COMPLETE when:**
- ✅ All 3 containers stayed healthy during execution
- ✅ All 3 evidence files exist and comprehensive

**Phase 5 (Consolidation) COMPLETE when:**
- ✅ Evidence aggregated into summary
- ✅ Completion metrics calculated
- ✅ Final commit created

**Overall SUCCESS when:**
- ✅ 28+ features verified (90%+)
- ✅ All 3 layers validated for each test
- ✅ All 3 viewports verified for UI layer
- ✅ Evidence comprehensive and documented

---

## Execution Notes

**For executing-plans skill:**
- Review checkpoints after each phase
- Phase 0: Review after Task 8 (preparation complete)
- Phase 1-3: Dispatch all 3 agents together (Tasks 10-12 in one batch)
- Phase 4: Passive monitoring (no review needed during autonomous execution)
- Phase 5: Review after Task 34 (consolidation complete)

**For parallel dispatch:**
Tasks 10, 11, 12 should be executed in SINGLE message for true parallelism.

---

**Plan Status:** ✅ READY FOR EXECUTION
**Format:** writing-plans compliant (bite-sized tasks, exact commands)
**Skill:** frontend-driven-testing (project-local, self-orienting)
**Next Action:** `/superpowers:execute-plan docs/plans/2025-12-01-parallel-testing-execution.md`
