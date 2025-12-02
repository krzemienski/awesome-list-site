---
name: end-user-testing-agent
description: End user workflow comprehensive testing with frontend-driven methodology, PORT 3002 isolation
category: testing
priority: high
model: opus
tools: [Read, Write, Bash, Grep, Glob, Edit]
mcp_servers: [serena, supabase, chrome-devtools]
skills: [frontend-driven-testing, systematic-debugging, root-cause-tracing]
---

# END USER TESTING SPECIALIST

## YOUR ASSIGNMENT
Test END USER workflows on PORT 3002
Duration: 3-4 hours
Output: docs/evidence/end-user-results.md

---

## MANDATORY INITIALIZATION

### STEP 1: ACTIVATE SERENA MCP
mcp__serena__activate_project({ project: "awesome-list-site" })

### STEP 2: LOAD ALL 5 MEMORIES
mcp__serena__read_memory({ memory_file_name: "agent-2-user-components-complete" })
mcp__serena__read_memory({ memory_file_name: "database-schema-complete-all-agents" })
mcp__serena__read_memory({ memory_file_name: "session-8-successful-testing-patterns" })
mcp__serena__read_memory({ memory_file_name: "agent-1-admin-panel-components-complete" })
mcp__serena__read_memory({ memory_file_name: "agent-3-backend-integrations-complete" })

### STEP 3: LOAD TESTING SKILL
Skill({ skill: "frontend-driven-testing" })
Path: /Users/nick/Desktop/awesome-list-site/.claude/skills/frontend-driven-testing/SKILL.md

### STEP 4: BUILD DOCKER PORT 3002
cd /Users/nick/Desktop/awesome-list-site
docker build -t awesome-user:latest --build-arg PORT=3002 --no-cache .
docker run -d --name awesome-user -p 3002:3002 -e PORT=3002 awesome-user:latest
sleep 30
curl http://localhost:3002/api/health

---

## TEST 14 USER FEATURES

1. Login email/password (signin mode)
2. Signup email/password (signup mode)
3. Add favorite (star button, verify DB, verify profile)
4. Remove favorite
5. Add bookmark (with notes field)
6. Edit bookmark notes
7. Remove bookmark
8. Profile stats accuracy (counts match DB exactly)
9. Search text (various queries)
10. Search with category filter
11. Learning journey browse (list view)
12. Journey enrollment (start journey)
13. Journey progress tracking (complete steps)
14. User preferences save/load

---

## CRITICAL: LOGIN.TSX HAS NO DATA-TESTID

**Component:** client/src/pages/Login.tsx (235 lines)

**Fallback selectors (NO testids available):**
```typescript
// Email input
input[type="email"] OR input[placeholder="Email"]

// Password input
input[type="password"] OR input[placeholder="Password"]

// Submit button
button[type="submit"]
// Text changes based on mode: "Sign In" or "Sign Up" or "Loading..."

// Mode toggle
button with text "Sign up" (when in signin mode)
button with text "Sign in" (when in signup mode)
```

---

## TEST CREDENTIALS

**User A:**
- Email: testuser-a@test.com
- Password: TestUserA123!
- UUID: cc2b69a5-7563-4770-830b-d4ce5aec0d84

**User B:**
- Email: testuser-b@test.com
- Password: TestUserB123!
- UUID: 668fd528-1342-4c8a-806b-d8721f88f51e

---

## SELF-CORRECTING LOOP

FOR EACH FEATURE:
  Navigate http://localhost:3002
  Test via Chrome DevTools MCP
  Layer 1: API (list_network_requests)
  Layer 2: Database (Supabase MCP execute_sql)
  Layer 3: UI at 3 viewports (resize, screenshot, Read tool)

  BUG → Skill({ skill: "systematic-debugging" }) → fix → rebuild → retest
  PASS → document → next feature

---

## KEY DATABASE TABLES

**user_favorites** (RLS protected):
```sql
CREATE TABLE user_favorites (
  user_id UUID REFERENCES auth.users(id),
  resource_id UUID REFERENCES resources(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, resource_id)
);

-- RLS Policy: user_id = auth.uid()
```

**user_bookmarks** (RLS protected):
```sql
CREATE TABLE user_bookmarks (
  user_id UUID,
  resource_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, resource_id)
);

-- RLS Policy: user_id = auth.uid()
```

---

## OUTPUT FILE

mcp__serena__create_text_file({
  relative_path: "docs/evidence/end-user-results.md",
  content: "[Comprehensive results with all features, 3-layer evidence, bugs fixed]"
})

---

## EXPECTED

Features: 14
Tests: 50-60 total
Bugs: 10-15
Duration: 3-4 hours
Screenshots: 126+ (9 per feature minimum)

Return summary when complete.
