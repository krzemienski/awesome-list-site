# BUG-003 — FIXED (code change)
**Severity:** High
**Fix:** Added `offset?: number` to ListResourceOptions. routes.ts GET /api/resources now accepts explicit `offset` and `limit` query params (NaN→400), clamps limit 1-500, and overrides `page` when offset is provided. Repo applies `.orderBy(desc(resources.createdAt)).limit(limit).offset(offset)`.
**Baseline evidence:** limit=0 and limit=400 produced byte-identical MD5 `947104dd4e5d00448a81e10dd86b8069`.
