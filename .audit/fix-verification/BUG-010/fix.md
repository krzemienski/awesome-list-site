# BUG-010 — FIXED (code change)
**Severity:** Medium
**Fix:** routes.ts admin approve/reject handlers — added Zod body validation, NaN guard for resourceId (→400 not 500), resource-not-found → 404. Added POST /api/admin/resources/:id(\\d+)/unapprove handler for safe reversal of approvals. Protected artifact 187918 left pending and untouched.
