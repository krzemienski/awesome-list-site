# Admin Audit — Defects

## DEFECT-A — /api/admin/validate + /api/admin/check-links 500 (FIXED)

**Severity:** HIGH (two admin actions completely broken)
**Found:** Export tab → "Run Validation" button → POST /api/admin/validate → 500
**Evidence (before):** reqid=63 POST /api/admin/validate → 500 `{"message":"Failed to validate awesome list"}`
**Server log:** `TypeError: legacyRepo.storeValidationResult is not a function at dist/index.js:8132`

**Root cause:**
- `storeValidationResult` + `getLatestValidationResults` were declared on `IStorage`/`DatabaseStorage`
  (server/storage.ts:772-778) delegating to `this.adminRepo.*`, but `AdminRepository`
  (server/repositories/AdminRepository.ts) only implemented `getAdminStats` — the two
  validation methods were never ported during the storage→repository refactor.
- routes.ts:2937 + :2986 called `legacyRepo.storeValidationResult(...)`. `LegacyRepository`
  has no such method → runtime TypeError → 500. Both /validate and /check-links share this
  call, so both endpoints were dead.
- The read side (validation-status, routes.ts:3012) was defensively guarded
  (`typeof fn === 'function'`), so it silently returned nulls instead of erroring —
  masking the missing implementation.

**Fix:**
1. AdminRepository.ts: implemented `storeValidationResult` + `getLatestValidationResults`
   backed by a module-level in-process cache (validation output is transient diagnostic
   data, no schema table; re-derivable on demand).
2. routes.ts: changed both call-sites from `legacyRepo.storeValidationResult` →
   `adminRepo.storeValidationResult` (matches storage.ts delegation + the validation-status
   read which already uses `adminRepo`).

**Evidence (after):**
- reqid=77 POST /api/admin/validate → 200, body `{"valid":true,"errors":[],"warnings":[...915...]}`
- reqid=78 GET /api/admin/validation-status → 200 (persisted result retrievable)
- UI render: green "Passed" badge, "1954 resources, 10 categories", "Last validated: 6/1/2026, 8:45:10 PM"
- Screenshot: 06-validate-FIXED.png
- check-links: see below

**check-links (shared store path) — after fix:**
- reqid=79 POST /api/admin/check-links → 200, content-length 80,429
- Real result: totalLinks 1949, validLinks 1667 (85.5%), brokenLinks 221, errors 61,
  status dist {2xx:1667, 4xx:218, 5xx:3, error:61}, avg 736ms; full markdown report with
  actual broken URLs (418/404/403/429/520). UI toast "Link Check Complete — All resource links have been checked."
- This is the SAME `adminRepo.storeValidationResult` call that 500'd pre-fix → both endpoints green.

**Files changed:** server/repositories/AdminRepository.ts, server/routes.ts
**Build:** BUILD_EXIT=0; Docker app rebuilt + healthy.

---

## Summary
- 1 defect found (DEFECT-A, HIGH), 1 FIXED, **0 OPEN**.
- Defect was a real production bug: two admin actions (Run Validation, Check All Links)
  returned HTTP 500 due to missing repository methods after a storage→repository refactor.
- Fix is root-cause (implemented the missing methods + corrected call-site receiver),
  not a band-aid. Verified by live 200 responses with real payloads + UI render.
