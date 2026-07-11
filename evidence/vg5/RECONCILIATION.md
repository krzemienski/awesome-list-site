# VG-5 / VG-INT — Final Reconciliation

**Env:** current source @ http://localhost:5055, native non-prod DB `awesome_video_local` (1949 resources). All evidence real-system (curl + Playwright). Prod Neon never written.
**Verdict:** PASS. All 6 gates (VG-1…VG-INT) pass with fresh evidence.

## What this run actually was

The 103 findings in `hunt-workspace/REPORT.md` were captured against **live production**. Re-confirmation against **current source** shows the codebase was **already heavily remediated** (prior `plans/awesome-video-bughunt-fixes/` campaign + `scripts/verify-fixes.mjs`). The two CRITICALs and nearly all HIGHs **no longer reproduce**. This run **re-confirmed each finding, fixed the few that genuinely reproduced, and documented the rest** with disposition.

## Code changes made this run (2 fixes, both reviewed + verified)

| # | Bug | File | Change | Verified |
|---|-----|------|--------|----------|
| 1 | BUG-017 | `server/index.ts` protectedPatterns | added `/^\/profile(\/|$)/` — anon /profile now 302→/login (was 200 shell) | VG-4/VG-INT: anon /profile→/login; authed→200; no /profiles over-match |
| 2 | BUG-092/094 | `server/routes.ts` POST /api/auth/logout | `req.logout` → `req.session.destroy` → `res.clearCookie('connect.sid')` (was logout-only, session+cookie survived) | VG-4 8/8, VG-INT J3: post-logout /admin→/login |

Independent code-review (separate agent, opus): **both sound, ship** (2 non-blocking NITs: redundant outer try/catch; substring cookie check — acceptable for SPA-shell defense-in-depth since /api/* uses real isAuthenticated).

Support scripts added (real-system verification harness, NOT test files/mocks): `scripts/make-local-auth.mjs`, `scripts/vg2-public-check.mjs`, `scripts/vg4-admin-check.mjs`, `scripts/vg-int-check.mjs`; `scripts/verify-fixes.mjs` made BASE/AUTH env-configurable (2-line).

## Disposition of prod findings (representative)

### FIXED-in-source (verified not-repro locally)
BUG-015/038 (search q= works), BUG-016/040 (anon POST→401, no row), BUG-003 (theme toggle, V5-V8), BUG-004 (search affordance present — visual-confirmed cmdk trigger), BUG-007 (sidebar targets, V2/V4b), BUG-033 (advanced tabs, V9), BUG-041 (login no prefill), BUG-042 (reset-password inputs), BUG-013 (0 empty descriptions), BUG-021/032/046 (sitemap clean), BUG-045/089 (ffmpeg sitemap urls→200), BUG-066 (admin loads 229ms not 7-10s), BUG-077 (admin GET→401), BUG-100 (share has fallback), BUG-105 (counts reconcile 1949=1949=1949), BUG-027 (robots↔routes consistent), /admin gating (302).

### FIXED this run (reproduced → fixed → verified)
BUG-017 (/profile gate), BUG-092/094 (logout session destroy).

### DOCUMENTED as intended (user-approved: not defects; "fix" would regress)
- **BUG-005** — real auth contract is `GET /api/auth/user` (returns {user,isAuthenticated}) + `POST /api/auth/logout`. Auditor probed wrong names (`/api/auth/status`, `/api/auth/login`). Adding aliases would pollute the contract. NOT a defect.
- **BUG-020** — `/api/categories` id + resourceCount are consumed by `community-metrics.tsx:454` (renders count) and `suggest-edit-dialog.tsx:464` (id as key/value). Public catalog metadata, non-sensitive. Hiding = regression.
- **BUG-039** — offset+limit+total pagination consumed by `ResourceManager.tsx:720`, `UsersTab.tsx:58`. Valid contract; nextCursor would be unused. Not a defect.

### DOCUMENTED as data-quality backlog (user-approved: don't mutate seed)
- **BUG-101 class** — ~16 seed rows have scraper-artifact descriptions ("Introduction","Background","a Sneak Peek",…) from import grabbing first heading. Display code is correct (renders stored value + fallback). Reference-data protection → needs product decision (blank / re-scrape / min-length guard), not silent seed mutation. Rows listed in DEFECT-MATRIX.md.

### RETRACTED (preserved from prod hunt)
BUG-030 (favicon — present, confirmed), BUG-037 (journey/6 content — present). Stay retracted.

### Minor / LOW (documented, non-blocking)
login placeholder still `admin@example.com` (value empty — prefill fixed; hint cosmetic); search-trigger `<div>` lacks role/aria-label; SSR title count "1934+" vs 1949; /login+/recommendations lack canonical/JSON-LD (login noindex).

## Gate results

| Gate | Result | Evidence |
|------|--------|----------|
| VG-1 API/security | PASS | evidence/vg1/, evidence/matrix/api-reconfirm.txt |
| VG-2 public UX | PASS 12/12 | evidence/vg2/VG2-VERDICT.md + verify-authed.log 13/13 |
| VG-3 sitemap/meta/a11y | PASS | evidence/vg3/VG3-VERDICT.md |
| VG-4 auth/admin | PASS 8/8 | evidence/vg4/vg4-results.json |
| VG-5 reconciliation | PASS | this file |
| VG-INT integration | PASS 10/10 | evidence/vg-int/vg-int-results.json |

## No new regressions
Public / (200), /login (200), search, sidebar, admin, logout, sitemap, robots all verified consistent. My files: 0 tsc errors, 0 new lint errors (129 pre-existing `any` in routes.ts unchanged). Pre-existing tsc errors in `server/db/index.ts`+`migrate.ts` (drizzle/pg version mismatch) are unrelated and untouched.
