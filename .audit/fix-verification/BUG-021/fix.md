# BUG-021 — FIXED (code change)
**Severity:** Medium
**Fix:** AdminRepository.ts AdminStats interface and getAdminStats method — added `totalPublic` (approved count), `totalPending` (pending count, separate from pendingResources for clarity), `totalDeleted` (rejected count). routes.ts GET /api/admin/stats response includes the new fields alongside existing users/resources/journeys/pendingApprovals.
