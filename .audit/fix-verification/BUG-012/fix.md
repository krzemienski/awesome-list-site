# BUG-012 — FIXED (code change)
**Severity:** High
**Fix:** routes.ts createResourceHandler — added pre-check `resourceRepo.getResourceByUrl(url)` before createResource. If exists, return 409 { error:'duplicate_url', existingId, message }. Wrapped createResource in try/catch that catches Postgres unique-constraint violation (code 23505) as a safety net and also returns 409.
