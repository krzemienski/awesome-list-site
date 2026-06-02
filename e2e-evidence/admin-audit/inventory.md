# Admin Panel — Interaction Inventory

Route: `/admin` (wrapped in `AdminGuard`). Single page, 15 tabs (shadcn Tabs, hash-synced).
Auth: admin@example.com / admin123 (role=admin in db awesome_list).
App: docker compose on :5001, health ok.

## Tabs (15) → components → backend deps

| # | Tab (hash) | Component | Key interactions | Backend endpoints |
|---|-----------|-----------|------------------|-------------------|
| 1 | approvals | PendingResources | approve, reject, bulk approve/reject/delete, view | GET /api/admin/pending-resources; POST resources/:id/approve, /reject, bulk/* |
| 2 | edits | PendingEdits | approve edit, reject edit | GET /api/admin/resource-edits; POST resource-edits/:id/approve, /reject |
| 3 | enrichment | BatchEnrichmentPanel | start backfill, view jobs | POST /api/admin/enrichment/backfill-suggestions; /api/enrichment/jobs |
| 4 | researcher | ResearcherTab | start research, view discoveries/jobs | POST /api/researcher/start; GET discoveries, jobs |
| 5 | export | ExportTab | export JSON, export markdown, copy, download | GET /api/admin/export-json; POST /api/admin/export |
| 6 | database | DatabaseTab | seed database, view stats | POST /api/admin/seed-database; GET /api/admin/stats |
| 7 | resources | ResourceManager | create, edit, delete, search, paginate | GET/POST/PUT/DELETE /api/admin/resources |
| 8 | categories | CategoryManager (GenericCrud) | create, edit, delete | GET/POST /api/admin/categories; PATCH/DELETE :id |
| 9 | subcategories | SubcategoryManager (GenericCrud) | create, edit, delete | GET/POST /api/admin/subcategories; PATCH/DELETE :id |
| 10 | subsubcategories | SubSubcategoryManager (GenericCrud) | create, edit, delete | GET/POST /api/admin/sub-subcategories; PATCH/DELETE :id |
| 11 | journeys | JourneyStepsManager | select journey, add/edit/delete step | GET /api/admin/journeys, :id/steps; POST :id/steps |
| 12 | users | UsersTab | change role | GET /api/admin/users; PUT users/:id/role |
| 13 | github | GitHubSyncPanel | import, export, sync status/history | POST /api/admin/import-github; /api/github/* |
| 14 | linkhealth | LinkHealthDashboard | run check, view broken/history/status | POST /api/admin/link-health/run, check-links; GET broken-links, history, status |
| 15 | audit | AuditTab | view audit logs | GET /api/admin/audit-logs |

Plus: AdminStats header (GET /api/admin/stats) always visible.

## Notes
- `/api/admin/platforms` appears ONLY in GenericCrudManager JSDoc examples — not a live call. No mismatch.
- 44 admin endpoints registered in server/routes.ts.
- GenericCrudManager backs categories/subcategories/subsubcategories (shared CRUD).

## Priority
- P0 (core write/read): approvals, edits, resources, categories, subcategories, subsubcategories, users, database(stats), export, audit
- P1 (secondary): journeys, linkhealth, github
- P2 (long-running/external): enrichment, researcher (may depend on external APIs/keys)
