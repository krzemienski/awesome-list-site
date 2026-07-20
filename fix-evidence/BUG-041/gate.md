# VG-041 — Edits tab lacks pending badge — PASS

## Fix
The admin Edits tab had no pending-count badge (Approvals already had one), so waiting suggested edits were invisible until an admin clicked into the tab.

- `server/repositories/AdminRepository.ts`: `getAdminStats()` now counts `resource_edits` rows with `status='pending'` and returns `pendingEdits` (added to the `AdminStats` interface).
- `server/routes.ts` (`GET /api/admin/stats`): payload now includes `pendingEdits`.
- `client/src/hooks/useAdmin.ts`: `AdminStats` interface gained `pendingEdits?`.
- `client/src/pages/AdminDashboard.tsx`: Edits `TabsTrigger` renders `<Badge variant="accent">` with the count when `pendingEdits > 0`, exactly mirroring the Approvals badge pattern; renders nothing at 0.
- Freshness: `useAdmin` already polls `/api/admin/stats` every 30s + refetches on focus (run19 BUG-047), and the PendingEdits approve/reject mutations already invalidate `['/api/admin/stats']` — so the badge updates instantly on admin action and tracks external submissions.

## Live evidence (real pending-edit data)
Dev DB held **4 real pending edits** (ids 4–7 — stale May 2026 external-audit probe rows with `[audit-*]` marker titles on resource 185090).

**Pending state** — API: `GET /api/admin/stats` → `"pendingEdits": 4`. UI (authed Chromium, 1440px, /admin):
```
Edits tab text: "Edits 4"
badge present: true | badge value: 4
```
Screenshot: `edits-badge-4-pending.png`. Badge count matches the API exactly.

**No-pending state** — the 4 stale audit-probe edits were rejected via the real admin API (`POST /api/admin/resource-edits/{4,5,6,7}/reject`, all 200, reason recorded: audit residue cleanup). API: `"pendingEdits": 0`. UI re-probe:
```
Edits tab text: "Edits"
badge present: false | badge value: null
```
Screenshot: `edits-badge-zero-hidden.png`.

## Verdict
**PASS** — pending state shows a visible, accurate badge; zero state hides it; badge matches real API data; freshness inherited from existing 30s stats polling + mutation invalidation.
