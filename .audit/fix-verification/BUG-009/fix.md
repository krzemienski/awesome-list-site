# BUG-009 — FIXED (code change)
**Severity:** Medium
**Fix:** client/src/components/layout/new/AppHeader.tsx — added a visible Sign out button to the authenticated user menu. Click handler calls POST /api/auth/logout then redirects to /.
