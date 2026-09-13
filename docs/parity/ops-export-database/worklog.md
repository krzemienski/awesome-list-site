# Operations export/database parity worklog

## Scope

- Reworked `ExportTab.tsx` and `DatabaseTab.tsx` against the canonical
  `awesome-list-site-ds/admin.jsx` AdminExport/AdminDatabase cards, stats,
  table shell, and status-chip language.
- Added the operations-owned primitives in
  `client/src/components/admin/AdminOpsPrimitives.tsx` and
  `admin-ops-primitives.css`.
- Added the tab-scoped styles in
  `client/src/components/admin/admin-ops-export-database.css`.

## Behavior/API notes

- Existing export, validation, link-check, seed, typed RESEED confirmation,
  and all pre-existing testids remain intact.
- Markdown export uses `POST /api/admin/export`; JSON snapshot uses the
  existing `GET /api/admin/export-json`.
- Export history reads real records from
  `GET /api/admin/audit-logs` in bounded 50-entry windows with offset
  pagination and never fabricates rows. The table labels its current audit
  range and says when no exports exist on that page; it never claims the
  entire audit history is empty from one page.
- CSV, OPML, SQL, and API-token cards are explicitly unavailable because no
  supported admin endpoints exist. The SQL notice does not accept or execute
  queries.
- Database table size, write timestamps, schema count, disk, and migration
  values remain `—` when the existing admin stats API does not expose them.
- Operations primitives export only names actually imported by operations
  surfaces: concise `TableShell`, `StatusChip`, and `Stat`, plus the
  operations-local `AdminOpsTable` and `AdminOpsScrollArea` wrappers.

## Verification

- Targeted ESLint and TypeScript checks run after implementation.
- No browser, workflow, or database mutation was run by this worker.