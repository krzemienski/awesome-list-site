# Code Exploration Scratchpad: Phase P10 Admin shell + admin UI

Task: plans/awesome-video-bughunt-fixes/plan.md — Phase P10
Created: 2026-07-10

---

## Problem Definition

### Analysis Questions
- Primary: How should the existing React admin shell be changed to fix P10 UX/a11y regressions without disrupting sibling phases?
- Secondary: Which admin components already implement parts of the requested behavior (audit tab, diff view, skeletons) and only need integration fixes?

### Search Keywords
- Core domain terms: admin, audit, pending resources, pending edits, categories, stats, tabs, sidebar, auth user.
- Related feature names: AdminDashboard, PendingResources, PendingEdits, AuditTab, GenericCrudManager, useAdmin, AdminGuard.
- Likely file/folder patterns: client/src/pages/AdminDashboard.tsx, client/src/components/admin/*.tsx, client/src/hooks/useAdmin.ts, client/src/components/layout/new/*.tsx, server/routes.ts.

### Success Criteria
- [ ] Admin shell renders labeled skeleton/stat tiles instead of full-screen Loading.
- [ ] Public sidebar is hidden on admin routes.
- [ ] Admin tabs expose explicit tab/panel ids, selected/current state, and support deep links.
- [ ] Admin query failures render retry UI.
- [ ] Auth cookie loss is detected quickly through a real auth probe.
- [ ] Pending approvals table supports sortable Resource/Author/Date columns.
- [ ] Pending edits exposes an explicit field-level diff action.
- [ ] Audit tab uses /api/admin/audit and server alias returns audit records.
- [ ] /admin/categories deep link renders the category manager/skeleton quickly.

## Exploration Log

### Entry 1: Main admin route
THOUGHT: The admin shell currently sits inside MainLayout, so hiding the public sidebar likely requires route-aware layout changes.
ACTION: Read client/src/App.tsx and client/src/components/layout/new/MainLayout.tsx.
OBSERVATION: App.tsx wraps every route in MainLayout and only has exact /admin route. MainLayout always renders AppSidebar and AppHeader with SidebarTrigger.

### Entry 2: Admin dashboard loading gate
THOUGHT: BUG-066 and BUG-090 likely come from AdminDashboard blocking all content on stats loading.
ACTION: Read client/src/pages/AdminDashboard.tsx and AdminStats.tsx.
OBSERVATION: AdminDashboard returns a full-screen spinner when useAdmin().isLoading; AdminStats already supports labeled placeholder values, so removing the full-screen gate reveals named tiles immediately.

### Entry 3: Admin tabs
THOUGHT: Radix Tabs likely already provides roles, but the bug asks for explicit aria-selected/aria-controls and deep links.
ACTION: Read client/src/components/ui/tabs.tsx and AdminDashboard tab usage.
OBSERVATION: TabsTrigger and TabsContent wrap Radix primitives. AdminDashboard repeats tabs manually and uses hash-only state. Explicit ids/aria-current and /admin/:section support can be added in AdminDashboard/App routing.

### Entry 4: Pending resources sort
THOUGHT: BUG-086 is isolated to the Approvals table.
ACTION: Read PendingResources.tsx.
OBSERVATION: Table header is static; data has title, submittedByEmail/submittedBy, and createdAt fields suitable for Resource/Author/Date sort.

### Entry 5: Pending edits diff
THOUGHT: BUG-088 may already be partly implemented.
ACTION: Read PendingEdits.tsx.
OBSERVATION: Details dialog already renders red/green field diffs through renderDiff, but the table row only shows a field count and icon-only View action. Add an explicit "View diff" action and semantic diff markup.

### Entry 6: Audit endpoint/UI
THOUGHT: BUG-087 expects /api/admin/audit but code may already expose /api/admin/audit-logs.
ACTION: Grep server routes and read AuditTab.
OBSERVATION: AuditTab fetches /api/admin/audit-logs; server/routes.ts only defines /api/admin/audit-logs. Need alias /api/admin/audit and update client endpoint.

### Entry 7: Category loading
THOUGHT: /admin/categories may not route to admin at all.
ACTION: Read App.tsx and CategoryManager/GenericCrudManager.
OBSERVATION: App.tsx only routes /admin; GenericCrudManager already shows a named card + skeleton. Adding /admin/:section route plus removing AdminDashboard full-screen loading covers the UX.

## Reusable Code & Patterns

- AdminStats already renders the four requested labels with loading placeholders.
- Radix Tabs wrappers already provide keyboard navigation; add explicit id/current linkage rather than replacing the component.
- GenericCrudManager already implements named table skeletons for category management.
- AuditRepository.getResourceAuditLog already backs audit data; server needs an alias route, not a new storage layer.
- useAuth query cache is the single auth source of truth; admin cookie-loss probing should update that cache rather than duplicating auth state.

## Architecture Analysis

Layering is React route shell → AdminGuard auth gate → AdminDashboard tabs → admin feature components. Server audit data is Express route → AuditRepository → Drizzle table. P10 client changes should mostly stay in the admin shell/components; only BUG-087 requires a narrow server route alias.

## Implementation Details

- Avoid blocking dashboard render on stats query; child tab queries already show skeletons.
- Use an admin-only interval probe against /api/auth/user so HttpOnly connect.sid deletion is detectable without reading cookies.
- Subscribe to React Query cache for /api/admin* query errors and show retry UI with invalidate/refetch.
- Sort PendingResources in-memory because endpoint returns the whole pending queue.

## Self-Critique

Pending until implementation/verification complete.
