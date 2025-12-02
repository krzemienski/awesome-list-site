# BUG: Sign Out Does Not Clear localStorage Token

**Date**: 2025-12-01
**Severity**: Medium
**Status**: Open
**Found By**: User Journey Verification (Chrome DevTools MCP)

## Summary

When a user clicks "Sign Out" from the user menu dropdown, the UI appears to log out (shows "Login" button in header), but the Supabase authentication token remains in localStorage. This could lead to security issues if the session is not properly invalidated.

## Steps to Reproduce

1. Log in with valid credentials (e.g., testuser-a@test.com / TestUser123!)
2. Verify token exists in localStorage: `localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token')`
3. Click user avatar dropdown in header
4. Click "Sign Out" menu item
5. Check localStorage again - token still present

## Expected Behavior

- localStorage token should be cleared on sign out
- `supabase.auth.signOut()` should be called which clears the session

## Actual Behavior

- Token remains in localStorage after clicking "Sign Out"
- Token contains user email, ID, and access credentials
- Refreshing the page may restore the session

## Technical Details

**Token Key**: `sb-jeyldoypdkgsrfdhdcmm-auth-token`

**Token Contents (after logout)**:
```json
{
  "hasToken": true,
  "email": "admin@test.com",
  "userId": "58c592c5-548b-4412-b4e2-a9df5cac5397"
}
```

## Impact

- **Security**: Stale tokens could be reused
- **User Experience**: Confusing behavior if page refresh restores session
- **Privacy**: User credentials remain in browser storage

## Suggested Fix

Ensure the logout handler in the frontend calls:
```typescript
await supabase.auth.signOut();
localStorage.removeItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
```

## Related Files

- `client/src/hooks/useAuth.ts` - Authentication hook
- `client/src/components/layout/TopBar.tsx` - User menu with Sign Out

## Workaround

Manually clear localStorage:
```javascript
localStorage.removeItem('sb-jeyldoypdkgsrfdhdcmm-auth-token');
```
