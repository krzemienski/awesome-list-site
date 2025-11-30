# Next Session Execution Plan
**Priority**: URGENT - Fix frontend blocking issue
**Approach**: Systematic debugging → Functional testing → Validation

---

## 🎯 SESSION START CHECKLIST (5 min)

```bash
# 1. Verify Docker containers running
docker-compose ps

# 2. If not running:
docker-compose up -d

# 3. Wait for services
sleep 15

# 4. Test API
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}

# 5. Test Supabase connection
# Via Supabase MCP:
mcp__supabase__execute_sql({ query: "SELECT COUNT(*) FROM resources;" })
# Expected: 2646
```

---

## 🔧 BATCH 1: Fix Frontend Blocking Issue (30 min)

### Use Chrome DevTools MCP to Diagnose

```typescript
// Already done - errors found:
// 1. React #418: Hydration mismatch
// 2. React #423: Hydration error
// 3. AuthCallback is not defined

// Fix AuthCallback import:
```

**Steps**:
1. Read client/src/App.tsx lines 1-20 (check imports)
2. Verify AuthCallback is imported correctly
3. Check if export exists in AuthCallback.tsx
4. Fix import if broken
5. Rebuild: `docker-compose down && docker-compose build web && docker-compose up -d`
6. Wait 30 seconds
7. Use Chrome DevTools: navigate_page, take_snapshot, list_console_messages
8. Verify errors cleared

**Validation**:
- Chrome console has 0 React errors
- Page snapshot shows elements (not just RootWebArea)
- Homepage visible in screenshot

---

## 🧪 BATCH 2: Functional Testing with Chrome MCP (60 min)

### Agent 1: Test Anonymous User Flow
**Using**: Chrome DevTools MCP

```typescript
// Test 1: Homepage loads
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000", type: "url" })
mcp__chrome-devtools__take_snapshot() // Should show categories, resources
mcp__chrome-devtools__take_screenshot({ name: "homepage-loaded" })

// Test 2: Category navigation  
mcp__chrome-devtools__click({ uid: "[first-category-link-uid]" })
mcp__chrome-devtools__take_snapshot() // Should show filtered resources

// Test 3: Search
// Find search input
// Type "ffmpeg"
// Verify results
```

### Agent 2: Test Authentication Flow
**Using**: Supabase MCP + Chrome MCP

```typescript
// Create admin user first:
mcp__supabase__execute_sql({
  query: `
    -- Insert directly into auth.users requires admin
    -- Use Supabase dashboard instead: Auth → Users → Add User
    -- Then promote:
    UPDATE auth.users
    SET raw_user_meta_data = '{"role": "admin"}'::jsonb  
    WHERE email = 'admin@test.com';
  `
})

// Test login via Chrome:
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000/login" })
mcp__chrome-devtools__take_snapshot() // Verify login form visible
mcp__chrome-devtools__fill({ uid: "[email-input-uid]", value: "admin@test.com" })
mcp__chrome-devtools__fill({ uid: "[password-input-uid]", value: "Admin123!" })
mcp__chrome-devtools__click({ uid: "[submit-button-uid]" })
// Wait for redirect
// Verify logged in
```

### Agent 3: Test API Integration
**Using**: Bash + curl

```bash
# Test all public endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/categories
curl http://localhost:3000/api/resources
curl http://localhost:3000/api/auth/user  # Should return null

# Test with JWT token (after getting token from Supabase)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/auth/user
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/api/admin/stats
```

---

## 📋 BATCH 3: Admin Feature Testing (45 min)

### Prerequisites
- Admin user created
- Admin can login
- Admin panel accessible at /admin

### Tests
1. **Resource Approval**:
   - Create pending resource via API
   - View in admin panel
   - Approve via admin panel
   - Verify status changed

2. **GitHub Sync** (if time):
   - Test import from small repo
   - Verify resources created
   - Check sync history

3. **AI Enrichment** (if time):
   - Start small batch (5 resources)
   - Monitor job progress
   - Verify metadata updated

---

## 🎯 VALIDATION GATES

### Gate 1: Frontend Works
- [ ] Homepage loads with visible resources
- [ ] Categories clickable and filter works
- [ ] Search returns results
- [ ] No console errors

### Gate 2: Auth Works  
- [ ] Can signup with email
- [ ] Can login with email/password
- [ ] JWT token sent in requests
- [ ] Protected routes accessible when logged in

### Gate 3: Admin Works
- [ ] Admin can access /admin
- [ ] Stats display correctly
- [ ] Can approve pending resources
- [ ] Audit log records actions

---

## 🛠️ TOOLS TO USE

### For Debugging
- **Chrome DevTools MCP**: Console errors, network, elements
- **Serena MCP**: Code navigation, pattern search
- **Bash**: Direct API testing, Docker logs

### For Testing
- **Chrome DevTools MCP**: User interaction simulation
- **Supabase MCP**: Database queries, user management
- **Docker**: Container logs, service status

### For Documentation
- **Serena MCP**: write_memory() to save findings
- **Bash**: git status, file creation

---

## 📝 NEXT SESSION PROMPT

```
I'm continuing the Replit → Supabase migration.

Last session: Database fully migrated (2,646 resources), backend API updated, Docker containers built. Frontend has React hydration errors blocking it.

Read memories:
- migration-session-1-state
- next-session-execution-plan

Current Docker status: [run docker-compose ps]
Current issue: Frontend black screen, React errors #418, #423, "AuthCallback is not defined"

Let's diagnose and fix the frontend, then test all user flows systematically using Chrome DevTools MCP.
```

---

## ⚠️ KNOWN ISSUES TO WATCH

1. **TypeScript Errors**: 8 pre-existing errors (not blockers but should fix)
2. **Redis Connection**: Shows errors when Redis not running (expected, fallback works)
3. **PORT Configuration**: Must use PORT=3000 in Docker, 5000 for local dev
4. **SSR Path**: Fixed to use dist/public/ in production
5. **Database URL**: Must use pooler (port 6543) not direct (5432)

---

**Session 1 END**: Code migrated, Docker running, frontend blocked
**Session 2 START**: Fix frontend, test all flows, validate migration
