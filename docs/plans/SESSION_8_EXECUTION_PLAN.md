# Session 8: Production Readiness & Security Hardening
**Shannon Execution Plan**

**Plan ID**: session-8-production-ready
**Created**: 2025-11-30
**Complexity**: 0.68/1.0 (COMPLEX)
**Duration**: 9 hours (7h testing + 2h bug fixing)
**Tasks**: 115 granular tasks
**NO MOCKS**: ✅ Real security testing, real performance measurement, real deployment

---

## Shannon Complexity Analysis

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Technical Depth | 7/10 | Security testing, SSL configuration |
| Integration Complexity | 6/10 | Production deployment |
| State Management | 5/10 | Session security testing |
| Error Scenarios | 8/10 | Expect 6-10 bugs in security/deployment |
| Performance | 9/10 | PRIMARY FOCUS - benchmarking |
| Security | 10/10 | PRIMARY FOCUS - attack testing |
| Documentation | 8/10 | Production readiness documentation |
| Testing Complexity | 9/10 | Security + performance + deployment |

**Overall**: 0.68/1.0 → **COMPLEX**

---

## Objective

**Harden application for production deployment**:

1. Security Testing (XSS, SQL injection, CSRF, user isolation)
2. Performance Benchmarking (Lighthouse, load testing, query optimization)
3. Production Deployment (SSL, monitoring, staging → production)
4. Code Cleanup (console.logs, TypeScript any types, dead code)

**Success = Application is production-ready with security validated and performance measured**

**Project Impact**: 76% → 94% completion (ALL features verified + production deployed)

---

## Prerequisites

- ✅ Session 7 complete (all features working)
- ✅ All bugs fixed from previous sessions
- ✅ SSL certificates available OR can obtain via certbot
- ✅ Production environment variables configured

---

## Workflow 15: Security Testing (Tasks 1-55, 4 hours)

### Phase 1: User Isolation Testing (Tasks 1-20)

**Objective**: Verify RLS actually prevents cross-user data access

**Task 1**: Create User A via Supabase
```sql
-- Via Supabase dashboard or auth API
-- Email: usera-session8@example.com
```

**Task 2**: Create User B
```
-- Email: userb-session8@example.com
```

**Task 3**: User A Login via Chrome
```
Navigate /login
Login as User A
```

**Task 4**: User A Bookmarks Resource
```
Navigate to category
Click bookmark on resource X
Verify DB: user_bookmarks row with user_id = A
```

**Task 5**: Logout User A
```
Click logout
Verify session cleared
```

**Task 6**: User B Login
```
Login as User B
```

**Task 7**: Attempt to View User A's Bookmarks
```
Navigate to /bookmarks
Check page.md for User A's bookmarked resource
```

**Validation (CRITICAL)**:
- page.md should NOT show User A's bookmark
- User B should only see their own bookmarks (0 initially)

**If FAIL**: User B can see User A's data → **SECURITY BUG** → STOP

**Task 8**: Verify Database Isolation via SQL
```sql
-- Query as User B's ID in RLS context
SET request.jwt.claims TO '{"sub":"[userB_id]"}';
SELECT * FROM user_bookmarks;
-- Should return 0 rows (User B has no bookmarks)
```

**Validation**: RLS properly isolates users

**Tasks 9-20**: Test favorites isolation, preferences isolation, journey progress isolation

---

### Phase 2: XSS Testing (Tasks 21-35)

**Task 21**: Submit Resource with Script Tag
```
Navigate /submit as regular user
Fill title: "<script>alert('XSS')</script>"
Fill URL: "https://test.com/xss"
Fill description: "<img src=x onerror='alert(\"XSS\")'>"
Submit
```

**Task 22**: Verify Submission Accepted
```sql
SELECT title, description FROM resources
WHERE url = 'https://test.com/xss';
```

**Validation**: Row exists (submission not rejected)

**Task 23**: Admin Approves XSS Resource
```
Admin login
Approve the XSS test resource
```

**Task 24**: View on Public Page
```
Navigate to category page as public user
Find XSS test resource
```

**Task 25**: Verify Script NOT Executed
```
Check page.md - script tags should be escaped as text
Check screenshot - no alert popup
Check console - no XSS errors
```

**Validation (CRITICAL)**:
- Script tags rendered as text (escaped)
- No JavaScript execution
- React auto-escaping working

**If FAIL**: XSS vulnerability → **CRITICAL SECURITY BUG** → STOP

**Tasks 26-35**: Test XSS in search, descriptions, comments, various injection points

---

### Phase 3: SQL Injection Testing (Tasks 36-45)

**Task 36**: Search with SQL Injection Attempt
```
Navigate to homepage
Enter search: "'; DROP TABLE resources; --"
Submit search
```

**Task 37**: Verify No SQL Execution
```sql
-- Verify resources table still exists
SELECT COUNT(*) FROM resources;
```

**Validation**:
- Table exists
- Count = 2644 (unchanged)
- Drizzle ORM parameterization working

**Task 38-45**: Test injection in various inputs (category filter, title field, URL field, etc.)

---

### Phase 4: Rate Limiting Testing (Tasks 46-55)

**Task 46**: Rapid API Requests (100 in 1 minute)
```bash
for i in {1..100}; do
  curl http://localhost:3000/api/resources &
done
wait
```

**Task 47**: Check for 429 Responses
```
Count 429 Too Many Requests responses
```

**Validation**: Rate limiting active (should get 429 after 60 requests per nginx.conf)

**Tasks 48-55**: Test auth endpoint rate limits, verify different IPs treated separately

---

## Workflow 16: Performance Benchmarking (Tasks 56-80, 2.5 hours)

### Phase 1: Lighthouse Audit (Tasks 56-65)

**Task 56**: Run Lighthouse on Homepage
```
Via superpowers-chrome or lighthouse CLI
Test: http://localhost:3000
```

**Metrics to Capture**:
- Performance score
- First Contentful Paint
- Largest Contentful Paint
- Time to Interactive
- Cumulative Layout Shift

**Target**: Performance score > 80

**Task 57-65**: Lighthouse on category page, admin dashboard, profile page, etc.

---

### Phase 2: Load Testing (Tasks 66-75)

**Task 66**: Install autocannon
```bash
npm install -g autocannon
```

**Task 67**: Benchmark /api/resources
```bash
autocannon -c 10 -d 30 http://localhost:3000/api/resources
```

**Metrics**:
- Requests/second
- p50, p95, p99 latency
- Error rate

**Target**: p95 < 200ms

**Task 68-75**: Benchmark other endpoints, concurrent users test (100 users)

---

### Phase 3: Database Query Analysis (Tasks 76-80)

**Task 76**: Enable slow query log (if possible)
**Task 77**: Run common queries with EXPLAIN ANALYZE
**Task 78**: Identify missing indexes
**Task 79**: Add missing indexes if found
**Task 80**: Re-run benchmarks

---

## Workflow 17: Production Deployment (Tasks 81-110, 2.5 hours)

### Phase 1: SSL Configuration (Tasks 81-90)

**Task 81**: Obtain SSL Certificate
```bash
# Via certbot or manual
sudo certbot certonly --standalone -d yourdomain.com
```

**Task 82**: Copy Certificates
```bash
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/
```

**Task 83-90**: Update nginx.conf for SSL, test HTTPS, verify redirect HTTP→HTTPS

---

### Phase 2: Staging Deployment (Tasks 91-100)

**Task 91**: Create staging environment
**Task 92**: Deploy to staging
**Task 93**: Run all workflows on staging
**Task 94**: Verify SSL working
**Task 95-100**: Smoke test all features

---

### Phase 3: Production Deployment (Tasks 101-110)

**Task 101**: Backup current production (if exists)
**Task 102**: Deploy to production
**Task 103**: Verify health checks
**Task 104**: Test critical workflows on production
**Task 105**: Set up monitoring
**Task 106**: Configure alerts
**Task 107-110**: Final verification

---

## Code Cleanup (Tasks 111-115, 30 min)

**Task 111**: Remove console.log statements (269 total from audit)
**Task 112**: Fix remaining any types (48 from audit)
**Task 113**: Delete unused components (28 identified in Session 4)
**Task 114**: Run final build
**Task 115**: Commit cleanup

---

## Success Criteria

- ✅ User isolation verified (RLS working)
- ✅ XSS prevented (no script execution)
- ✅ SQL injection prevented (parameterized queries working)
- ✅ Rate limiting active
- ✅ Performance targets met (p95 < 200ms, Lighthouse > 80)
- ✅ Deployed to production with SSL
- ✅ Monitoring active
- ✅ Clean codebase (no debug logs, no unused code)

**Honest Completion**: 94% (31/33 features verified + production deployed)

---

## Expected Bugs

- SSL certificate issues
- Rate limiting too strict/loose
- Performance bottlenecks
- Security vulnerabilities
- Deployment configuration errors
- Production environment differences

**Buffer**: 2 hours for 6-10 bugs

---

**Plan Status**: Ready after Session 7
**Final Session**: Marks project as production-ready
