# BUG: Logout Does Not Fully Clear Session

**Date**: 2025-12-01
**Workflow**: Account Lifecycle
**Severity**: Medium
**Status**: Open

## Summary
After user clicks logout (via user menu), the session is cleared from localStorage but gets restored when navigating to a different page.

## Steps to Reproduce
1. Login as any user (e.g., testuser-a@test.com)
2. Click user avatar menu (U button in header)
3. Logout is triggered
4. Verify localStorage is cleared (it is)
5. Navigate to any page (e.g., homepage)
6. Check localStorage again - session is restored

## Expected Behavior
- After logout, user should remain logged out
- Session should not restore on navigation
- Login link should appear in header instead of user avatar

## Actual Behavior
- localStorage clears initially
- On navigation, session is restored (possibly from Supabase refresh token or cookies)
- User remains logged in after "logout"

## Evidence
- Screenshot: workflow1_08_user_menu_open.png
- Screenshot: workflow1_09_logged_out.png (shows Sign In form but U button still visible)
- localStorage check returned `hasAuthToken: false` immediately after logout
- localStorage check returned `isLoggedIn: true` after navigation

## Technical Analysis
Supabase Auth may store refresh tokens in:
1. localStorage (sb-*-auth-token)
2. Cookies (httpOnly)
3. IndexedDB

The logout may only be clearing the localStorage token but not:
- Server-side session invalidation
- Refresh token revocation
- Cookie clearing

## Recommended Fix
1. Use `supabase.auth.signOut({ scope: 'global' })` to sign out everywhere
2. Ensure all storage mechanisms are cleared
3. Redirect to homepage after logout
4. Add explicit cookie clearing if needed

## Files to Investigate
- client/src/lib/supabase.ts (Supabase client config)
- client/src/hooks/useAuth.ts (Auth hook with logout)
- server/supabaseAuth.ts (Server-side auth)
