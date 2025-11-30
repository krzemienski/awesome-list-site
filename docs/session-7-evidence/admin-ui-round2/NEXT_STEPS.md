# Admin UI Round 2 - Next Steps

**Status**: ❌ BLOCKED by Bug #3 (Session Persistence)
**Date**: 2025-11-30

---

## Critical Bug to Fix

### 🔴 Bug #3: localStorage Session Cleared on Navigation

**Priority**: P0 (Blocks all admin functionality)
**Component**: Frontend routing / Session management
**File**: Likely `client/src/App.tsx` or `client/src/lib/supabase.ts`

#### Symptoms

1. Session injection works at homepage (`/`)
2. Session **cleared** when navigating to `/admin` routes
3. All admin pages return 404 (unauthenticated)
4. Playwright tests cannot proceed

#### Reproduction

```bash
# Diagnostic script already created
cd /Users/nick/.claude/skills/playwright-skill
node run.js /tmp/playwright-diagnose-session.js

# Observe:
# ✅ Session exists after injection at homepage
# ❌ Session gone after navigation to /admin
```

#### Evidence

- See `diagnostic-admin-page.png` - Shows 404 page
- See `diagnostic-resources-page.png` - Shows 404 page
- See `verification-results.json` - 6 failed tests, all due to 404

---

## Investigation Steps

### 1. Check React Router Configuration

**File**: `client/src/App.tsx`

Look for:
- Route guards that might clear state
- Layout components that reset localStorage
- HMR (Hot Module Replacement) clearing state

```typescript
// Check if routes have guards like this:
<Route path="/admin" element={
  <AdminGuard>  // ← Check this component
    <AdminDashboard />
  </AdminGuard>
} />
```

### 2. Check Supabase Client Initialization

**File**: `client/src/lib/supabase.ts`

Look for:
- Auto-logout on invalid session
- Session cleanup on initialization
- Token validation clearing localStorage

```typescript
// Check if this exists:
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // This might be clearing localStorage
    localStorage.clear(); // ← BAD if called unexpectedly
  }
});
```

### 3. Check Auth Guards

**Files**:
- `client/src/components/auth/AdminGuard.tsx`
- `client/src/components/auth/AuthGuard.tsx`

Look for:
- Guards calling `localStorage.clear()`
- Guards redirecting on invalid token
- Guards checking token expiry and clearing on expired

### 4. Check for Service Workers

```bash
# Check if service worker exists
ls client/public/sw.js
ls client/public/service-worker.js

# Service workers can intercept navigation and clear storage
```

### 5. Check Vite Build Configuration

**File**: `vite.config.ts`

Look for:
- Development vs production build differences
- HMR settings
- Build optimizations affecting localStorage

---

## Possible Root Causes

### Theory 1: Auth Guard Clears Session

```typescript
// AdminGuard.tsx (HYPOTHESIS)
export function AdminGuard({ children }) {
  const { user } = useAuth();

  if (!user || user.role !== 'admin') {
    localStorage.clear(); // ← BUG: Clears session on render
    return <Navigate to="/login" />;
  }

  return children;
}
```

**Fix**: Remove `localStorage.clear()`, just redirect.

### Theory 2: Supabase Client Rejects Expired Token

```typescript
// supabase.ts (HYPOTHESIS)
const { data: { session } } = await supabase.auth.getSession();

if (session && session.expires_at < Date.now()) {
  // ← BUG: Clears localStorage for expired token
  localStorage.clear();
  supabase.auth.signOut();
}
```

**Fix**: Don't clear all localStorage, only remove auth token.

### Theory 3: React Router Replaces Document

```typescript
// App.tsx (HYPOTHESIS)
<BrowserRouter>
  <Routes>
    <Route path="/admin" element={<AdminLayout />} />
  </Routes>
</BrowserRouter>

// AdminLayout might remount and trigger cleanup
function AdminLayout() {
  useEffect(() => {
    // Cleanup on mount? ← BUG
    return () => localStorage.clear();
  }, []);
}
```

**Fix**: Remove cleanup from useEffect.

### Theory 4: Vite HMR Clears State

```typescript
// vite.config.ts (HYPOTHESIS)
export default defineConfig({
  server: {
    hmr: {
      // Some HMR config clearing localStorage?
    }
  }
});
```

**Fix**: Disable HMR for localStorage or use sessionStorage.

---

## Quick Fixes to Try

### Fix #1: Disable Session Validation Temporarily

```typescript
// client/src/components/auth/AdminGuard.tsx

export function AdminGuard({ children }: { children: React.ReactNode }) {
  // TEMPORARY: Bypass auth check for testing
  return <>{children}</>;

  /* Original code:
  const { user } = useAuth();
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
  */
}
```

### Fix #2: Use Persistent Session Storage

```typescript
// Instead of localStorage (which might be cleared)
// Use sessionStorage (persists across navigations in same tab)

sessionStorage.setItem('sb-jeyldoypdkgsrfdhdcmm-auth-token', token);
```

### Fix #3: Inject Session on Every Page Load

```typescript
// Add to App.tsx or root component
useEffect(() => {
  // Check if session exists, if not, inject from test data
  const hasSession = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
  if (!hasSession && process.env.NODE_ENV === 'development') {
    localStorage.setItem('sb-jeyldoypdkgsrfdhdcmm-auth-token', TEST_SESSION);
  }
}, []);
```

---

## Debugging Commands

### Check localStorage in Browser Console

```javascript
// Open http://localhost:3000 in browser
// Open DevTools Console

// Check if session exists
localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');

// Navigate to /admin
window.location.href = '/admin';

// Check again
localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
// If null, session was cleared during navigation
```

### Add Debug Logging

```typescript
// Add to useAuth.ts
export function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    console.log('[useAuth] Checking session...');
    const sessionStr = localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
    console.log('[useAuth] Session exists:', !!sessionStr);

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[useAuth] Supabase session:', session);
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useAuth] Auth state changed:', event, session);
      if (event === 'SIGNED_OUT') {
        console.log('[useAuth] ❌ USER SIGNED OUT - localStorage might be cleared here!');
      }
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, isAuthenticated: !!user };
}
```

---

## Alternative Testing Approach (If Fix Takes Too Long)

### Option 1: Real Supabase Login

Instead of injecting session, use actual Supabase login:

```typescript
// playwright-test-with-real-login.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to login page
  await page.goto('http://localhost:3000/login');

  // Fill login form
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/admin', { timeout: 10000 });

  // Now session should persist!
  await page.goto('http://localhost:3000/admin/resources');
  // Test admin features here...

  await browser.close();
})();
```

### Option 2: API-Level Auth

Use cookies/headers instead of localStorage:

```typescript
// Set cookie instead of localStorage
await page.context().addCookies([{
  name: 'supabase-auth-token',
  value: JWT_TOKEN,
  domain: 'localhost',
  path: '/',
  httpOnly: true,
  secure: false
}]);
```

### Option 3: Disable Auth Guards (Dev Only)

```typescript
// .env.local
VITE_DISABLE_AUTH_GUARDS=true

// AdminGuard.tsx
export function AdminGuard({ children }) {
  if (import.meta.env.VITE_DISABLE_AUTH_GUARDS === 'true') {
    return <>{children}</>;
  }

  // Normal auth check...
}
```

---

## Files to Review

**Priority Order**:

1. ✅ `client/src/lib/supabase.ts` - Supabase client & auth state management
2. ✅ `client/src/hooks/useAuth.ts` - Auth hook (session checks)
3. ✅ `client/src/components/auth/AdminGuard.tsx` - Admin route guard
4. ✅ `client/src/components/auth/AuthGuard.tsx` - User route guard
5. ✅ `client/src/App.tsx` - Router configuration
6. ✅ `client/src/pages/AdminDashboard.tsx` - Admin page component
7. ✅ `vite.config.ts` - Build configuration
8. ⚠️ `client/public/sw.js` - Service worker (if exists)

---

## Expected Behavior After Fix

1. ✅ Session injected at homepage persists
2. ✅ Navigation to `/admin` does NOT clear session
3. ✅ Admin dashboard renders (not 404)
4. ✅ Admin navigation works
5. ✅ All admin features accessible
6. ✅ Playwright tests can proceed

---

## Success Criteria

Run diagnostic script again after fix:

```bash
cd /Users/nick/.claude/skills/playwright-skill
node run.js /tmp/playwright-diagnose-session.js

# Expected output:
# ✅ Session exists after injection: true
# ✅ Session exists after navigation: true  ← FIXED
# ✅ Page has admin content (not 404)
```

Then re-run full Round 2 verification:

```bash
cd /Users/nick/.claude/skills/playwright-skill
node run.js /tmp/playwright-test-admin-ui-round2.js

# Expected:
# ✅ Passed: 25+ tasks (most should pass)
# ❌ Failed: <5 tasks (real bugs only)
# ⚠️ Not Implemented: <5 tasks (features not built)
```

---

## Contact for Questions

- **Bug Report**: `docs/session-7-evidence/admin-ui-round2/VERIFICATION_REPORT.md`
- **Evidence**: `docs/session-7-evidence/admin-ui-round2/*.png`
- **Raw Results**: `docs/session-7-evidence/admin-ui-round2/verification-results.json`
- **Execution Log**: `docs/session-7-evidence/admin-ui-round2/execution-log.txt`

---

**Created**: 2025-11-30
**Status**: Awaiting Bug Fix
**Next Agent**: Should focus on fixing Bug #3, then re-run verification
