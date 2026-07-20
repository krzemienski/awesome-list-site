# NB-012 — admin users CSV export shipped masked emails

**Fix**: `server/routes.ts` users-export handler — removed the Run15 BUG-042
`maskEmail` masking. The export is admin-only and the admin UI already has a
reveal toggle showing real addresses, so the masked CSV was strictly less useful
than the screen it mirrors while gating nothing. CSV now contains real emails
(CSV-injection guard `csvCell` retained).

**Live verification (dev, July 20, 2026, post-restart, admin session):**
```
GET /api/admin/users/export -> 200
header: id,email,firstName,lastName,role,authProvider,createdAt
grep -c '•••' users.csv          -> 0   (no masked emails)
grep -c 'admin@example.com'      -> 1   (real address present)
```
