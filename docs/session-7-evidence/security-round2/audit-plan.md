# Security Audit Round 2 - Test Plan

**Auditor**: Agent 3 (Security Specialist)
**Target**: http://localhost:3000
**Date**: 2025-11-30
**Context**: Round 1 found NO critical vulnerabilities (Grade B+). This round focuses on deeper edge case testing.

---

## Test Categories

### 1. RLS User Isolation (Tasks 131-140)
**Objective**: Verify that users cannot access other users' private data

**Test Users**:
- sectest-a@example.com (User A)
- sectest-b@example.com (User B)
- admin@test.com (Admin bypass test)

**Test Sequence**:
1. Create both test users via Supabase Auth
2. User A: Add favorite, bookmark, preference, start journey
3. User B: Attempt to access User A's data via:
   - GET /api/favorites (should only see User B's)
   - GET /api/bookmarks (should only see User B's)
   - GET /api/user/progress (should only see User B's)
   - GET /api/user/journeys (should only see User B's)
4. User B: Attempt to UPDATE User A's data:
   - PUT request to modify User A's bookmark
   - PUT request to modify User A's preference
5. User B: Attempt to DELETE User A's data:
   - DELETE /api/favorites/:resourceId (User A's favorite)
   - DELETE /api/bookmarks/:resourceId (User A's bookmark)
6. Direct database queries with SET request.jwt.claims
7. Admin user: Verify can see all users' data
8. Cleanup: Delete test users and data

**Expected Results**:
- All User B attempts to access/modify User A's data: FAIL (401/403)
- Direct database queries with wrong user ID: Return 0 rows
- Admin queries: Return all data

---

### 2. XSS Prevention (Tasks 141-155)
**Objective**: Verify that XSS vectors are properly sanitized

**Test Vectors**:
```javascript
// Script injection
<script>alert('XSS')</script>

// Image onerror
<img src=x onerror="alert('XSS')">

// JavaScript protocol
javascript:alert('XSS')

// Iframe injection
<iframe src="javascript:alert('XSS')"></iframe>

// Event handlers
<div onload="alert('XSS')">

// Data URIs
data:text/html,<script>alert('XSS')</script>

// SVG injection
<svg onload="alert('XSS')">

// HTML entities
&lt;script&gt;alert('XSS')&lt;/script&gt;
```

**Test Points**:
1. Resource submission form (title, description, URL)
2. Search query input
3. Filter dropdowns (if they accept custom input)
4. Bookmark notes field
5. User profile fields (if editable)
6. HTML export feature (ResourceFilters.tsx)
7. Admin panel inputs

**Verification**:
- Use Playwright to inspect rendered DOM
- Check if scripts execute (alert listeners)
- Verify HTML encoding applied
- Check Content-Security-Policy headers

---

### 3. SQL Injection (Tasks 156-165)
**Objective**: Verify that SQL injection is prevented by Drizzle ORM

**Test Payloads**:
```sql
-- Classic injection
'; DROP TABLE resources; --

-- Always true condition
' OR '1'='1

-- Update injection
'; UPDATE resources SET status='archived'; --

-- Union attack
' UNION SELECT password FROM users--

-- Stacked queries
'; DELETE FROM user_favorites WHERE 1=1; --

-- Blind injection
' AND (SELECT COUNT(*) FROM resources) > 0 --

-- Time-based blind
' AND (SELECT pg_sleep(5)) --

-- Error-based
' AND 1=CAST((SELECT version()) AS int) --
```

**Test Points**:
1. Search functionality (/api/resources?search=...)
2. Category filters (/api/resources?category=...)
3. Tag filters (/api/resources?tags=...)
4. Resource ID lookups (/api/resources/:id)
5. All form submissions

**Verification**:
- Database state unchanged after tests
- No error messages revealing DB structure
- Drizzle query logs show parameterized queries
- Response times consistent (no time-based attacks)

---

### 4. Rate Limiting (Tasks 166-170)
**Objective**: Verify nginx rate limiting is effective

**Tests**:
1. **API Endpoints (60 req/min)**:
   - Send 100 requests to /api/resources
   - Expect ~40 with 429 status
   - Verify X-RateLimit headers

2. **Auth Endpoints (10 req/min)**:
   - Send 20 login requests to /api/auth/login
   - Expect ~10 with 429 status
   - Stricter than API endpoints

3. **Burst Allowance**:
   - Test burst tolerance
   - Verify recovery after cooldown

**Tools**: curl in loop, Apache Bench (ab)

---

### 5. Additional Security (Tasks 171-180)
**Objective**: Verify comprehensive security controls

**Tests**:
1. **CORS Headers**:
   - Cross-origin request from evil.com
   - Verify Access-Control-Allow-Origin
   - Ensure credentials not allowed for *

2. **Security Headers**:
   - X-Frame-Options: SAMEORIGIN
   - X-Content-Type-Options: nosniff
   - X-XSS-Protection: 1; mode=block
   - Referrer-Policy: strict-origin-when-cross-origin
   - Content-Security-Policy (if present)
   - Permissions-Policy

3. **HTTPS Redirect**:
   - If SSL configured, verify HTTP→HTTPS
   - HSTS header

4. **Session Hijacking**:
   - JWT token replay protection
   - Token expiration enforcement
   - Refresh token rotation

5. **SSRF Protection**:
   - Test URL analysis with internal IPs
   - Verify domain allowlist enforcement
   - Test with localhost, 127.0.0.1, 169.254.169.254

---

## Scoring Rubric

**Severity Levels**:
- **CRITICAL**: Immediate data breach risk (SQL injection, auth bypass)
- **HIGH**: Significant security impact (XSS, broken RLS)
- **MEDIUM**: Moderate risk (weak rate limits, missing headers)
- **LOW**: Minor issues (verbose errors, version disclosure)
- **INFO**: Best practice recommendations

**Final Grade**:
- A+: 0 critical, 0 high, 0-1 medium
- A: 0 critical, 0 high, 2-3 medium
- B+: 0 critical, 1 high, <5 medium
- B: 0 critical, 2 high, or 1 critical + mitigations
- C: Multiple criticals or highs
- F: Unmitigated critical vulnerabilities

---

## Evidence Collection

All findings will be documented in:
- `/docs/session-7-evidence/security-round2/findings/`
  - `rls-isolation.md`
  - `xss-prevention.md`
  - `sql-injection.md`
  - `rate-limiting.md`
  - `security-headers.md`

Each finding includes:
- Description
- Reproduction steps
- Evidence (curl output, screenshots)
- Impact assessment
- Remediation recommendation
