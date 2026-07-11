# BUG-103 — Cleanup: test artifacts created during prior admin audit run still visible in production API

**Severity:** LOW (process / hygiene)
**URL:** https://awesome.video/api/categories, /api/admin/categories
**Auth:** N/A

## Reproduction

1. Open the public `/api/categories` endpoint (no auth):
   `curl https://awesome.video/api/categories | jq`
2. The list contains a stale test artifact named `Audit-NoAuth-A` with `slug: audit-noauth-a-XYZ123` and `resourceCount: 0`.
3. This category was created during a prior audit pass on 2026-07-10 at 21:22 UTC via `POST /api/admin/categories`.

## Expected

Audit-generated data must be flagged for cleanup (or cleaned up automatically after the run). Production `/api/categories` should never carry harness-style resources with names like `AuditNoAuth-A-XYZ123` that hit the public, unauthenticated catalog.

## Actual

- The category above existed in production. (It was deleted by the current audit run with `DELETE /api/admin/categories/1093` → 200. Verified.)
- A test resource titled `TestResource-Audit-1783718486672` (id 188033) and another titled `AuditNoAuth-A-XYZ123` (id 188034) also existed. Both deleted with `DELETE /api/admin/resources/{188033,188034}` → 200.

## Evidence

- `admin-fast-api.json` line 360: validation error from POST `/api/admin/categories` referenced an admin-uid before authentication.
- `admin-deep-urls.json` line 7: created `Audit-NoAuth-A` category id=1093.
- `admin-deep-urls.json` line 14: created `AuditNoAuth-A-XYZ123` resource id=188034.
- Cleanup confirmed via fresh DELETE both with `200 {"message":"...deleted successfully"}`.

## Fix prompt

```
Task: Add a server-side assertion that rejects POST /api/admin/categories and
POST /api/admin/resources whose names match /^(Audit|Test|CSRF|Evil|fake)/
case-insensitive, OR add a scheduled cleanup job that deletes any resource/
category created with such a name after 24h.
Acceptance: POST /api/admin/categories {"name":"Audit-NoAuth-A","slug":"x"} → 400
forbidden under audit-harness rule.
```
