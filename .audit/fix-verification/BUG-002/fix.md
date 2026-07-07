# BUG-002 — FIXED (code change)
**Severity:** High
**Fix:** Added `subSubcategory?: string` to `ListResourceOptions` in ResourceRepository.ts. Added `eq(resources.subSubcategory, subSubcategory)` filter. Updated routes.ts GET /api/resources to accept subSubcategory query param (display name) and thread through.
