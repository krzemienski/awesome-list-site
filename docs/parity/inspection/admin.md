# Admin phase-0 inspection (read-only)

## Scope and evidence
All `client/src` files were consumed end-to-end for SHA256/byte/line accounting in `admin-read.json`; admin-owned source files are listed there with `complete_read:true`. Admin route/auth source: `client/src/App.tsx:712-727`, `client/src/components/auth/AdminGuard.tsx`, `client/src/pages/AdminDashboard.tsx`, `client/src/hooks/useAdmin.ts`. No env, secret, credential, test, browser, server, or workspace file was accessed/changed. Source inspection does not prove runtime functionality.

## Current production admin surface
`AdminDashboard.tsx` defines 16 valid tabs: approvals, edits, enrichment, researcher, export, database, resources, categories, subcategories, subsubcategories, journeys, users, github, linkhealth, digests, audit. It supports `/admin`, `/admin/:section`, `?tab=`, hash deep links, aliases (`link-health`, `sub-subcategories`, `sub-subcats`, `github-sync`), browser history, unknown-section 404, loading, generic error, 401/session-expired, signed-out and signed-in-non-admin states. Admin role is checked from authenticated user role and route is wrapped by AdminGuard.

Each tab body is isolated by ErrorBoundary. Existing tab components: PendingResources, PendingEdits, BatchEnrichmentPanel, ResearcherTab, ExportTab, DatabaseTab, ResourceManager, CategoryManager, SubcategoryManager, SubSubcategoryManager, JourneyStepsManager, UsersTab, GitHubSyncPanel, LinkHealthDashboard, DigestQueueHealth, AuditTab. `AdminStats` is a clickable stat strip. Existing admin components also include AgentEventLog and AgentCommsGraph (delegated/embedded dependencies, not dashboard tabs).

## CRUD / forms / dialogs / capabilities
- Approvals: pending-resource list; per-resource approve/reject confirmation dialogs; bulk approve/reject controls; review/details and refresh; real pending queue operations.
- Edits: pending edit queue; inspect/review, approve/reject, diff/details dialogs and resource-edit operations.
- Enrichment: filter, batch-size validation, advanced model/base URL/token fields, start/cancel job dialogs, progress, job detail/logs.
- Researcher: brief/prompt generation, research start configuration, run/job details, discoveries, verification badges, approve/reject/delete/stop flows and auth/secret handling; all behavior requires runtime proof.
- Export: export controls for available catalog formats, preview/download/generate actions.
- Database: database stats/table inspection and SQL/query form with confirmation/error handling.
- Resources: searchable paginated resource CRUD; create/edit forms preserve URL/title/description/category hierarchy/tags/featured/status/kind-related fields where present; approve/reject/delete dialogs and dedup/error states.
- Categories, Subcategories, Sub-Subcategories: `GenericCrudManager` provides list, create/edit/delete dialogs, required name/slug and cascading parent selects, auto-slug, validation, delete protection by resource count, query invalidation and generated test IDs. Config endpoints are documented in each config and source.
- Journeys: journey-step create/edit/delete/reorder and parent journey selection forms.
- Users: user list, role/status/admin actions and dialogs/forms as implemented.
- GitHub: sync/pull/push/export configuration and job/log/error surfaces.
- Link health: scan configuration/start/cancel/recheck, status filters, trend chart and confirmation dialogs.
- Digests: digest queue health/status and operational controls.
- Audit: append-only audit list/filter/detail surfaces; AgentEventLog/AgentCommsGraph support agent activity visualization.

## Design counterpart comparison
`/tmp/design-parity-bundle-7zbnza_9/admin.jsx` is fully read. Counterpart has 15 static tabs plus `overview` and `research`; static demo-only Overview stats/activity/health/top-categories, Approvals, Edits, Enrichment, Researcher, Export, Database/SQL console, Resources (search/add/view/edit/featured), Categories, Subcategories, Users/invite, GitHub sync jobs, Link Health chart/failures, Audit, and Research notes. Its buttons/data are illustrative and lack production API/auth/test IDs. Production must preserve real APIs/auth/analytics/ARIA/test IDs rather than copying inert behavior.

## Gaps for later implementation (not executed)
- Counterpart overview/stat strip, posts/research notes, activity table, health chips and charts do not map 1:1 to a single production tab; map to real `useAdmin`/admin endpoints or document backend blockers, never fabricate metrics.
- Counterpart includes `overview`, `research`, and a visible New entry/Settings header; production instead has operational tabs and no equivalent overview/research tab in dashboard registration (Researcher exists). Decide mapping before edits.
- `kind` is not visibly represented in the dashboard tab declarations; verify actual ResourceManager/schema/API before adding any UI, including nullable six-value semantics.
- `featured` counterpart shows a star/read state; verify existing ResourceManager mutation and curated/index consumers before visual work.
- Counterpart chart colors use ink ramp + accent; production LinkHealthDashboard/AgentCommsGraph already contain chart implementations but runtime parity is unverified.
- Counterpart has no authored-post/CMS backend; “posts” must remain a documented gap unless real data source exists.

## Phase-0 gate
Baseline is inspection-only and unverified: no product edits, no tests/browser/server changes, no functionality claim. Full ledger: `/tmp/parity-inspection/admin-read.json`; screen/capability inventory: `/tmp/parity-inspection/admin-screens.json`.
