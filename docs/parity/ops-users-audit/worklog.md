# Task 549 — users / audit operations surface

## Scope

- Refreshed `UsersTab.tsx` and `AuditTab.tsx` to use the frozen AdminUsers/AdminAudit
  TableShell geometry while retaining their existing API, sort, pagination,
  masking, and role-change confirmation behavior.
- Added `ContactSubmissions.tsx` below Audit. It reads the existing admin
  contact-inbox endpoint, paginates, masks reply-to addresses (including
  accessible labels and titles), opens a detail dialog, and distinguishes
  loading, general error, and 404/unavailable states.
- Added and directly imported the scoped
  `admin-ops-users-audit.css`; Users no longer imports
  `admin-catalog-taxonomy.css`.

## Checks

- `npx tsc --noEmit --pretty false` — passed.
- `npx stylelint client/src/styles/pages/admin-ops-users-audit.css` — passed.
- `npx eslint client/src/components/admin/ContactSubmissions.tsx` — passed.
- No browser session or database mutation was used.