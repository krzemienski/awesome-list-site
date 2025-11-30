# User Workflows - Bug Report

**Session**: 7 (Parallel Testing)
**Agent**: Agent 2
**Date**: 2025-11-30

---

## 🔴 BUG #2: Profile Page Complete Rendering Failure

**Severity**: CRITICAL
**Priority**: P0
**Status**: OPEN
**Assignee**: TBD

### Description
Profile page fails to render entirely, showing only a black screen with console error.

### Impact
- Users cannot view their profile
- Stats (favorites, bookmarks, submissions) inaccessible
- User engagement metrics invisible
- All profile-related features blocked

### Console Error
```
RangeError: Invalid time value
    at F2e (http://localhost:3000/assets/index-BA3Xv6ZQ.js:818:37716)
```

### Reproduction Steps
1. Login as admin@test.com (or any user)
2. Click user menu (top-right "U" button)
3. Click "Profile" menu item
4. Observe black screen with no content

### Expected Behavior
Profile page should display:
- User avatar/initials
- Email address
- Stats widgets (favorites count, bookmarks count, submissions count, streak days)
- Tab navigation (Overview, Favorites, Bookmarks, Submissions)
- User activity timeline

### Actual Behavior
- Black screen
- No UI elements visible
- Console error thrown immediately
- Page title changes to "Awesome Video Resources..."
- URL changes to /profile

### Root Cause Analysis
The `RangeError: Invalid time value` indicates attempting to create a Date object from NULL or undefined.

**Likely culprit**:
```typescript
// In Profile component (client/src/pages/Profile.tsx)
const user = await getUser(); // Returns user with NULL created_at
const joinedDate = new Date(user.created_at); // Throws error
const formatted = joinedDate.toLocaleDateString(); // Never reached
```

### Recommended Fix
```typescript
// BEFORE (likely current code):
const joinedDate = new Date(user.created_at);
const lastActive = new Date(user.last_sign_in_at);
const streakStart = new Date(user.streak_started_at);

// AFTER (with null checks):
const joinedDate = user.created_at ? new Date(user.created_at) : null;
const lastActive = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
const streakStart = user.streak_started_at ? new Date(user.streak_started_at) : null;

// Rendering:
{joinedDate ? joinedDate.toLocaleDateString() : 'N/A'}
{lastActive ? formatDistanceToNow(lastActive) : 'Never'}
```

### Files to Check
- `client/src/pages/Profile.tsx`
- `client/src/components/ProfileStats.tsx` (if exists)
- `client/src/hooks/useProfile.ts` (if exists)
- Any component rendering user timestamps

### Test Plan (After Fix)
1. Navigate to /profile
2. Verify page renders without errors
3. Verify all stats widgets display
4. Verify tabs (Overview, Favorites, Bookmarks, Submissions) work
5. Verify date fields show "N/A" or default value for missing data
6. Test with user who has NULL timestamps
7. Test with user who has valid timestamps

### Evidence
- Screenshot: `docs/session-7-evidence/user-workflows/profile-page-error.png`
- Console log: Error captured in Playwright output

---

## 🟡 BUG #1: Search Redirects to Login Instead of Showing Results

**Severity**: MEDIUM
**Priority**: P1
**Status**: OPEN
**Assignee**: TBD

### Description
When a logged-in user types in the search dialog, the page redirects to the login modal instead of displaying search results.

### Impact
- Search feature completely unusable for authenticated users
- ~157 ffmpeg-related resources cannot be discovered
- Users must manually browse categories to find resources

### Reproduction Steps
1. Login as admin@test.com (or any user)
2. Press "/" key to open search dialog
3. Type "ffmpeg" in search input
4. Wait for debounce (300ms)
5. Observe redirect to login modal

### Expected Behavior
- Search dialog remains open
- After 300ms debounce, display ~157 matching resources
- Results show title, description, category
- Clicking result navigates to resource or category

### Actual Behavior
- After typing, page immediately redirects
- Sign-in modal appears
- Search dialog closes
- No search results displayed

### Console Errors
None visible (error is likely in authentication logic)

### Root Cause Analysis
Likely causes:
1. Search component incorrectly checking authentication
2. Search API endpoint requiring auth when it shouldn't
3. Route guard triggering on search query submission

**Suspect code locations**:
```typescript
// client/src/components/SearchDialog.tsx
const handleSearch = async (query: string) => {
  const { user } = useAuth();
  if (!user) {
    navigate('/login'); // WRONG: Search should work for all users
    return;
  }
  // ... search logic
};
```

### Recommended Fix
```typescript
// Search should NOT require authentication
// Remove auth check or make it conditional:
const handleSearch = async (query: string) => {
  const results = await searchResources(query);
  setResults(results);
  // No authentication required for public resource search
};
```

### Files to Check
- `client/src/components/SearchDialog.tsx`
- `client/src/hooks/useSearch.ts`
- `client/src/lib/search.ts`
- Search-related API routes (if backend search used)

### Test Plan (After Fix)
1. Logout completely
2. Press "/" → type "ffmpeg"
3. Verify search works without login (public resources)
4. Login as admin@test.com
5. Press "/" → type "ffmpeg"
6. Verify search returns ~157 results
7. Click first result → verify navigation works
8. Test category filter in search
9. Test empty search ("xyznonexistent") → verify "No results" message

### Evidence
- Screenshot: `docs/session-7-evidence/user-workflows/search-ffmpeg-results.png`
- Shows login modal instead of search results

---

## 🟢 BUG #3: Duplicate Email in User Menu

**Severity**: LOW (cosmetic)
**Priority**: P3
**Status**: OPEN
**Assignee**: TBD

### Description
User menu dropdown displays the email address twice on consecutive lines.

### Impact
- Minor UI inconsistency
- Confusing/unprofessional appearance
- No functional impact

### Reproduction Steps
1. Login as admin@test.com
2. Click user menu button (top-right "U" button)
3. Observe dropdown menu
4. Notice email appears twice

### Expected Behavior
Email should appear once:
```
admin@test.com
─────────────
Profile
My Bookmarks
Admin Dashboard
─────────────
Sign Out
```

### Actual Behavior
Email appears twice:
```
admin@test.com
admin@test.com
─────────────
Profile
My Bookmarks
Admin Dashboard
─────────────
Sign Out
```

### Root Cause
Likely duplicate `<p>` tags or duplicate render in user menu component:
```typescript
// BEFORE (likely):
<DropdownMenu>
  <p>{user.email}</p>
  <p>{user.email}</p> {/* Duplicate */}
  <Separator />
  {/* menu items */}
</DropdownMenu>

// AFTER:
<DropdownMenu>
  <p>{user.email}</p>
  <Separator />
  {/* menu items */}
</DropdownMenu>
```

### Files to Check
- `client/src/components/layout/TopBar.tsx`
- `client/src/components/UserMenu.tsx` (if exists)
- Any component rendering user dropdown

### Test Plan (After Fix)
1. Login as admin@test.com
2. Click user menu
3. Verify email appears once
4. Verify all menu items present
5. Test on mobile viewport
6. Test with different email lengths

### Evidence
- Screenshot: `docs/session-7-evidence/user-workflows/admin-logged-in-menu.png`

---

## Bug Summary Table

| ID | Severity | Priority | Feature | Status | Fix Time |
|----|----------|----------|---------|--------|----------|
| #2 | CRITICAL | P0 | Profile Page | OPEN | 30-60 min |
| #1 | MEDIUM | P1 | Search | OPEN | 15-30 min |
| #3 | LOW | P3 | User Menu | OPEN | 5-10 min |

**Total Fix Time**: ~60-100 minutes

---

## Fix Order Recommendation

1. **Bug #2** (Profile) - CRITICAL, blocks all user data access
2. **Bug #1** (Search) - MEDIUM, core feature broken
3. **Bug #3** (Menu) - LOW, cosmetic only

---

## Testing After Fixes

### Profile Page
- [ ] Navigate to /profile without errors
- [ ] All stats widgets render
- [ ] All tabs work (Overview, Favorites, Bookmarks, Submissions)
- [ ] Date fields handle NULL gracefully
- [ ] No console errors

### Search
- [ ] Press "/" opens dialog
- [ ] Type "ffmpeg" returns ~157 results
- [ ] Debounce (300ms) works correctly
- [ ] Click result navigates properly
- [ ] Category filter functional
- [ ] Empty search shows "No results"
- [ ] Works for both authenticated and anonymous users

### User Menu
- [ ] Email appears once
- [ ] All menu items present
- [ ] Separator lines correct
- [ ] Sign Out works

---

**Report Generated**: 2025-11-30
**Reported By**: Agent 2 (User Workflows Verification)
**Total Bugs**: 3 (1 critical, 1 medium, 1 low)
