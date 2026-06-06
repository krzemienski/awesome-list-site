# Admin Panel — Full Functionality Inventory (deep run)

Route `/admin` (AdminGuard). 15 tabs + AdminStats header. Auth admin@example.com.
DB baselines: resources=1949, categories=9, subcategories=19, sub_subcategories=32,
users=1, journeys=0, pending=0, edits=0.

Every actionable element mapped to endpoint + DB effect + how exercised.

## AdminStats (header, always visible)
- GET /api/admin/stats → Users/Resources/Journeys/Pending cards. READ.

## Tab 1 — Approvals (PendingResources)
- GET /api/admin/pending-resources (list)
- View Details (modal) — READ
- Approve → POST /api/admin/resources/:id/approve → status pending→approved + audit
- Reject → POST /api/admin/resources/:id/reject (reason ≥10 chars) → pending→rejected + audit
- Exercise: needs a seeded pending resource (baseline 0).

## Tab 2 — Edits (PendingEdits)
- GET /api/admin/resource-edits (list)
- Approve edit → POST /api/admin/resource-edits/:id/approve → applies edit to resource
- Reject edit → POST /api/admin/resource-edits/:id/reject
- Exercise: needs a seeded resource_edits row (baseline 0).

## Tab 3 — Enrichment (BatchEnrichmentPanel)
- POST /api/enrichment/start {filter,batchSize} → background job (claude-haiku, now degraded-aware)
- DELETE /api/enrichment/jobs/:id (cancel)
- GET /api/enrichment/jobs (history) + live progress poll
- Exercise: run small batch; verify success OR degraded (AI 401 → rule-based fallback).

## Tab 4 — Researcher (ResearcherTab) [3 sub-tabs: Launch / Review Discoveries / Job History]
- POST /api/researcher/start {prompt,categoryFocus,maxBudgetUsd,maxTurns} → background AI job
- GET /api/researcher/jobs, /jobs/:id, /discoveries
- Approve discovery → POST /api/researcher/discoveries/:id/approve (NEW — not in prior audit)
- Reject discovery → POST /api/researcher/discoveries/:id/reject
- DELETE /api/researcher/jobs/:id (cancel)
- Exercise: launch (fails honestly on 401 → status=failed, $0).

## Tab 5 — Export (ExportTab)
- Export Markdown → POST /api/admin/export → text/markdown attachment
- Run Validation → POST /api/admin/validate → awesome-lint result (FIXED this session)
- Check All Links → POST /api/admin/check-links → external link report
- Exercise: all three (validate + check-links were DEFECT-A, now 200).

## Tab 6 — Database (DatabaseTab)
- Seed Database → POST /api/admin/seed-database (additive)
- Clear & Re-seed → POST /api/admin/seed-database (destructive variant)
- Stats display — READ
- Exercise: render + stats only; NOT clicking destructive seed (protects 1949 baseline).

## Tab 7 — Resources (ResourceManager)
- GET /api/admin/resources?page&limit (paged table, search, filters)
- Add Resource → POST /api/admin/resources
- Edit → PUT /api/admin/resources/:id
- Delete → DELETE /api/admin/resources/:id
- Bulk: POST /api/admin/resources/bulk/approve | /reject | /delete
- Exercise: create→edit→delete one resource; verify DB; clean up.

## Tab 8 — Categories (GenericCrudManager + category-config)
- GET/POST /api/admin/categories; PATCH/DELETE :id
- Create + Edit + Delete (delete guarded when resources>0)
- Exercise: create→edit→delete empty test category; verify DB 9→…→9.

## Tab 9 — Subcategories (GenericCrudManager + subcategory-config)
- GET/POST /api/admin/subcategories; PATCH/DELETE :id (parent category select)
- Exercise: create→delete test subcat under a category; verify 19→…→19.

## Tab 10 — Sub-Subcats (GenericCrudManager + subsubcategory-config)
- GET/POST /api/admin/sub-subcategories; PATCH/DELETE :id (parent cat+subcat selects)
- Exercise: create→delete test sub-subcat; verify 32→…→32.

## Tab 11 — Journeys (JourneyStepsManager)
- GET /api/admin/journeys, /journeys/:id/steps
- Add step → POST /api/admin/journeys/:id/steps
- Edit/Delete step → (PUT/DELETE)/api/admin/journeys/:id/steps/:id
- Reorder → POST /api/admin/journeys/:id/steps/reorder (NEW)
- Exercise: 0 journeys seeded → empty state. Seeding a journey requires a journey-create
  path (none in admin UI — journeys table only). Document as seed-gap; exercise empty state.

## Tab 12 — Users (UsersTab)
- GET /api/admin/users
- Change role → PUT /api/admin/users/:id/role
- Exercise: only 1 admin user; changing own role to 'user' would lock out admin → test
  carefully (change + revert) or document risk. Will verify the dropdown + endpoint safely.

## Tab 13 — GitHub (GitHubSyncPanel)
- POST /api/github/import (pull from repo → DB)
- POST /api/github/export (push to repo README)
- GET /api/github/sync-status, /sync-history
- Exercise: render + status READ only; NOT triggering import (mutates DB from external) or
  export (writes external repo, needs token). Document why.

## Tab 14 — Link Health (LinkHealthDashboard)
- POST /api/admin/link-health/run → background job over all resource URLs
- GET /api/admin/link-health/status, /history, /broken-links
- Exercise: run check; verify job completes + broken-link results.

## Tab 15 — Audit (AuditTab)
- GET /api/admin/audit-logs (filterable, row-count selector)
- Exercise: render + verify it grows as I perform writes this run.

## Exercise strategy
- Seed minimal test data (1 pending resource, 1 edit) to unlock Approvals + Edits, then clean up.
- Every write verified in DB. All baselines restored at end.
- Destructive/external (Clear&Re-seed, GitHub import/export) verified present but not fired.
