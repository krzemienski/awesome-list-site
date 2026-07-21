---
name: Prod resource status-change API paths
description: Which admin endpoints can change an approved resource's status, and their traps
---

**Rule:** `POST /api/admin/resources/bulk/reject` only works on `pending` resources (`rejectResource` throws "not pending" for anything else, surfacing as `succeeded:0` with HTTP 200). To reject/re-approve an *approved* resource use `PUT /api/resources/:id/reject` / `PUT /api/resources/:id/approve` (status-only, no side effects) or `PUT /api/admin/resources/:id` with `{status}`.

**Why:** a prod dead-link remediation silently no-op'd on all bulk rejects before switching paths.

**How to apply:**
- Prefer the status-only endpoints for pure status flips: `PUT /api/admin/resources/:id` also runs `ensureSubSubcategoryExists`, which historically 500'd on name/slug collisions (fixed by slug-based re-check, but the status-only path is still the safer flip).
- Prod DB is read-only from the workspace; all writes go through the live admin API with a session cookie from `POST /api/auth/local/login`.
- Bulk endpoints report per-item failures only as counts — check `succeeded`/`failed`, not HTTP status.
