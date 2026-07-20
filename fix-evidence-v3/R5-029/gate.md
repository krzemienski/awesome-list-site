# R5-029 — PII exports are audit-logged

**Claim: fixed (code).** (MEDIUM)

`createAuditLog('users.exported', ...)` records performedBy + row count + timestamp on
/api/admin/users/export (routes.ts ~3187); the admin export + github export send sites route
through the same shared serializer. Verified by code-read.
