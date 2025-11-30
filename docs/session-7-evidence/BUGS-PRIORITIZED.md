# Session 7: Prioritized Bug List

**Total Bugs**: 8
**Critical**: 3 (1 production, 2 performance)
**High**: 1 (security)
**Medium**: 2 (security)
**Low**: 1 (cosmetic)

---

## 🔴 P0: MUST FIX FOR PRODUCTION (3 bugs, 6-9 hours)

### Bug #5: Search Keyboard Shortcut Broken
**Severity**: CRITICAL - Functional
**Impact**: All users affected, core feature broken
**Found By**: Agent 2 (User Workflows)
**Evidence**: docs/session-7-evidence/user-workflows-round2/

**Symptoms**:
- Pressing "/" key does nothing
- Search dialog doesn't open
- Must click search button manually

**Root Cause Hypothesis**:
- Event listener not attached
- Event.preventDefault() blocking it
- Focus not on document when pressed

**Fix Location**:
- `client/src/App.tsx` (keyboard shortcuts, lines 97-125)
- OR `client/src/components/SearchDialog.tsx`

**Fix Steps**:
1. Find keyboard event listener code
2. Add console.log to verify listener attached
3. Test "/" key press in browser console
4. Add or fix event listener
5. Verify dialog opens

**Estimated Time**: 1-2 hours
**Acceptance Criteria**:
- "/" key opens search dialog
- Dialog displays search input
- Can type and see results

---

### Bug #8: Missing Rate Limiting
**Severity**: CRITICAL - Security
**Impact**: DoS/brute force attacks possible
**Found By**: Agent 3 (Security Audit)
**Evidence**: docs/session-7-evidence/security-round2/

**Current State**:
- NO rate limiting on any endpoint
- Tested: 100 requests succeeded (should block after 60)
- Attack vector: Open

**Fix Steps**:
```typescript
// 1. Install
npm install express-rate-limit

// 2. Add to server/index.ts
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests, please try again later'
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // Stricter for auth
  message: 'Too many login attempts'
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// 3. Rebuild Docker
docker-compose build web && docker-compose up -d

// 4. Test
for i in {1..100}; do curl http://localhost:3000/api/resources & done; wait
# Expect: ~40 429 responses after 60 requests

// 5. Verify headers
curl -v http://localhost:3000/api/resources | grep X-RateLimit
```

**Estimated Time**: 2-4 hours (including testing)
**Acceptance Criteria**:
- API: 60 requests/min limit
- Auth: 10 requests/min limit
- Returns 429 status after limit
- X-RateLimit headers present

---

### Bug #6: /api/categories Performance
**Severity**: CRITICAL - Performance
**Impact**: Every page load delayed by 572ms
**Found By**: Agent 4 (Performance)
**Evidence**: docs/session-7-evidence/performance-round2/

**Current Behavior**:
- Returns 3.1 MB payload (ALL 2,650 resources with full data)
- Categories endpoint called on EVERY navigation
- 572ms average latency (40x slower than target)

**Fix Location**: `server/storage.ts:591` - `getHierarchicalCategories()`

**Current Code** (simplified):
```typescript
async getHierarchicalCategories() {
  const categories = await db.select().from(categoriesTable);
  const resources = await db.select().from(resourcesTable);  // ❌ Loads ALL

  return categories.map(cat => ({
    ...cat,
    resources: resources.filter(r => r.category === cat.name)  // ❌ Full objects
  }));
}
```

**Fixed Code**:
```typescript
async getHierarchicalCategories() {
  const categories = await db.select().from(categoriesTable);

  // Get counts only, not full resources
  const counts = await db
    .select({
      category: resourcesTable.category,
      count: sql<number>`count(*)::int`
    })
    .from(resourcesTable)
    .where(eq(resourcesTable.status, 'approved'))
    .groupBy(resourcesTable.category);

  return categories.map(cat => ({
    ...cat,
    count: counts.find(c => c.category === cat.name)?.count || 0
    // Resources loaded separately when category clicked
  }));
}
```

**Estimated Time**: 2-3 hours
**Expected Improvement**: 572ms → 20ms (28x faster), 3.1MB → 5KB (620x smaller)

---

## 🟡 P1: HIGH PRIORITY (2 bugs, 4-6 hours)

### Bug #7: Massive Bundle Size
**Severity**: HIGH - Performance
**Impact**: 8.9s First Contentful Paint
**Found By**: Agent 4
**Evidence**: docs/session-7-evidence/performance-round2/

**Current**:
- Bundle: 1.9 MB
- Unused code: 949 KB (50%)
- Admin routes bundled with public pages

**Fix**: Implement code splitting

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', '@tanstack/react-query'],
          'admin': [
            './client/src/pages/AdminDashboard.tsx',
            './client/src/components/admin/ResourceBrowser.tsx',
            // ... all admin components
          ],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', ...]
        }
      }
    }
  }
});

// App.tsx - Already using React.lazy()! Just verify it works
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
```

**Estimated Time**: 3-4 hours
**Expected Improvement**: 1.9MB → 400KB, FCP 8.9s → 2.5s

---

### Bug #9: Missing Security Headers
**Severity**: HIGH - Security
**Impact**: Clickjacking, MIME sniffing, XSS risks
**Found By**: Agent 3

**Fix Steps**:
```typescript
// Install
npm install helmet

// server/index.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Vite needs inline
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://jeyldoypdkgsrfdhdcmm.supabase.co"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Estimated Time**: 1-2 hours

---

## 🟢 P2: MEDIUM PRIORITY (2 bugs, 1 hour)

### Bug #10: HTML Export XSS
**Severity**: MEDIUM - Security
**Component**: ResourceFilters.tsx export function
**Fix**: Add HTML entity encoding
**Time**: 30 minutes

### Bug #3: Playwright Session Persistence
**Severity**: MEDIUM - Testing
**Impact**: Blocks 87 automated tests
**Fix**: Configure Playwright baseURL + persistent context
**Time**: 2-3 hours

---

## 🔵 P3: LOW PRIORITY (1 bug, 10 minutes)

### Bug #11: Duplicate Email in User Menu
**Severity**: LOW - Cosmetic
**Impact**: Email shows twice
**Fix**: Remove duplicate render
**Time**: 5-10 minutes

---

## Fix Order Recommendation

**Session 8 (8-12 hours)**:
1. Search keyboard (1-2h) → Unblocks users
2. Rate limiting (2-4h) → Production blocker
3. /api/categories (2-3h) → Major perf win
4. Bundle splitting (3-4h) → User experience
5. Security headers (1-2h) → Security hardening

**Session 9 (2-4 hours)**:
1. HTML export XSS (30min)
2. Playwright session fix (2-3h)
3. Re-run automated tests (30min)
4. Final GitHub export cleanup (30min)

**Session 10 (3-4 hours)**:
1. Production deployment
2. SSL configuration
3. Monitoring setup
4. Final smoke test

---

**Total Remaining**: 13-20 hours to production-ready
**Current Completion**: 52% → Target: 95%
**Sessions Needed**: 2-3 more sessions
