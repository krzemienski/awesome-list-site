# E2E Validation Report

Run: 2026-07-10
Platform: fullstack (React + Vite SPA · Express API · PostgreSQL/Drizzle)
Mode: full-run (analyze → plan → approve → execute → report)
Iron Rule: respected — no mocks, no stubs, no test files; every check ran against the live dev system with real browser sessions (Playwright), real HTTP (curl), and real SQL (psql).

---

## Results Summary

```
Journeys: 8 PASS / 0 FAIL / 8 total
Evidence: 22 screenshots, 30 API responses/JSON probes, 11 DB/text captures (63 files)
Fixes:    1 applied during run (API limit clamp)
```

| Journey | Status | Key Evidence |
|---------|--------|-------------|
| J1 Database integrity | ✅ PASS | `fullstack/j1/02-invariants.txt`, `03-orphans.txt` |
| J2 API contract | ✅ PASS (after fix) | `fullstack/j2/05–08`, clamp re-verification |
| J3 Authentication | ✅ PASS | `fullstack/j3/01–07`, `10-login-page.png`, `11-oauth-toast.png` |
| J4 Browse & discover | ✅ PASS | `fullstack/j4/02-category-p1.png`, `02b-titles-p1-p2.json`, `05-search-ffmpeg.png` |
| J5 CRUD integration | ✅ PASS | `fullstack/j5/02-bookmarked-favorited.png`, `05-db-rows.txt`, `09-db-rows-after.txt` |
| J6 Learning journeys | ✅ PASS | `fullstack/j6/02b-journey7-steps.png` (6 unique steps, 0 dups) |
| J7 Responsive | ✅ PASS | `fullstack/j7/*.png` (7 viewport×page combos, 0 overflow) |
| J8 Error propagation | ✅ PASS | `fullstack/j8/01-resource-404.png`, `03-api-404.json` |

Full per-journey criteria tables: [`verdicts.md`](./verdicts.md).

---

## Per-Journey Breakdown

### Journey 1: Database Integrity — PASS
- 27 tables present; total=1994, approved=1838, 9 categories, 5 published journeys.
- 0 category-orphans; 0 orphaned child rows; per-category counts match the canonical baseline (Community 81 · Encoding 325 · General 151 · Infra 199 · Intro 194 · Media 255 · Players 234 · Protocols 200 · Standards 199).

### Journey 2: API Contract — PASS (after fix)
- All public endpoints 200 with correct shapes (health, health/ai, awesome-list, categories, resources, search, sitemap, resource detail).
- **Bug found:** `GET /api/resources?limit=-5` returned all 1838 rows (no clamp). **Fixed** (`server/routes.ts` ~759): limit clamped to [1,200], page≥1. Re-verified: -5→1, 99999→200, abc→default 20, normal 24/page unchanged.
- Caller audit: Search.tsx max limit 200, admin JourneyStepsManager limit 10 — no legitimate client affected.
- `/api/search?q=ffmpeg` → honest total=200, top-20 all relevant; 1-char query → empty, no 500.

### Journey 3: Authentication — PASS
- Local: register 201 → login 200 → `/api/auth/user` (no password/hash fields, grep=0) → wrong-pass 401 → logout kills session.
- OIDC entry: `/api/login` 302 → replit.com/oidc with PKCE params.
- UI: "Continue with Replit" button visible on /login; `/login?error=oauth` shows destructive toast and strips the param (URL ends at `/login`).
- Teardown: QA user + all FK references removed in one transaction; net-zero verified (users=6, qa_residue=0).

### Journey 4: Browse & Discover — PASS
- Home: sidebar renders all 9 categories with correct counts; 213 category links; header "1,838 resources".
- Category (Encoding & Codecs): badge 325, "Showing 325 of 325 resources", "Page 1 of 14" → Next → "Page 2 of 14"; 24 distinct card titles per page, 0 overlap.
- Resource detail: real h1 (StreamPack) + working external GitHub link.
- Search UI: "200 results for “ffmpeg”" — matches API total.
- 0 console errors for the whole session (`console-errors.txt`).

### Journey 5: CRUD Integration — PASS
- Logged in via the real UI form as the QA user; clicked Bookmark + Favorite on /resource/187906.
- UI state flipped (Favorited/Bookmarked active + "Added to favorites" toast — screenshot verified).
- API: GET /api/bookmarks & /api/favorites both contained 187906. DB: user_bookmarks=1, user_favorites=1.
- Toggled off via UI → API empty, DB bm=0/fav=0. Full round-trip both directions.

### Journey 6: Learning Journeys — PASS
- /journeys renders 5 published journey cards; View navigates to /journey/7.
- Step cards: `card-step-1`…`card-step-6`, 6 unique / 0 duplicates — the 3-rows-per-stepNumber storage shape is correctly grouped in the UI.

### Journey 7: Responsive — PASS
- 375px (home/category/resource), 768px (home/category), 1440px (home/category): `document.documentElement.scrollWidth` equals viewport width in every combo — zero horizontal overflow. Mobile home screenshot visually clean.

### Journey 8: Error Propagation — PASS
- /resource/9999999: explicit "Resource Not Found" page with Back to Home (screenshot verified; no blank page/crash).
- API: `GET /api/resources/9999999` → 404 `{"message":"Resource not found"}`.
- Bad UI login: visible error message, 0 page errors.
- `limit=abc` on search → 200 with sane default; `/api/learning-paths/suggested?limit=999` → clamped to 3.

---

## Issues Found

### Fixed During Testing
| # | Description | File:Line | Fix Applied |
|---|------------|-----------|-------------|
| 1 | `GET /api/resources` limit unclamped — `limit=-5` returned all 1838 rows (bandwidth/abuse vector; every other list endpoint already clamps) | `server/routes.ts` ~759 | Clamp limit to [1,200], page ≥ 1; workflow restarted; re-verified all edge values + normal pagination |

### Remaining Issues
| # | Description | Severity | Notes |
|---|------------|----------|-------|
| 1 | **Republish required**: the limit clamp (this run) and the July 10 social-login UI restore exist only in the workspace — production still has the unclamped `/api/resources` and already has the social-login server flow but needs the UI. | medium | Resolved by the next publish; no code work needed |
| 2 | Search page renders at most 200 cards while showing the true total (e.g. "200 results") — queries with >200 matches silently truncate the rendered list. Pre-existing behavior, not a regression from the clamp. | low | Cosmetic/UX; consider pagination on /search later |

(Two earlier "0 results" probes — sidebar links and journey step labels — were selector bugs in the test script, not app bugs; both re-verified PASS with corrected selectors.)

---

## Risk Assessment

- Public read surface is well-clamped after the J2 fix; abuse-hardening from the July 9 audit (suggested-paths param whitelisting) held up under probing.
- Auth surface is clean: no credential leakage in any payload, generic 401 messages, session lifecycle correct.
- Known deferred edge case (unchanged, documented): Replit OIDC sign-in with an email already owned by a local account fails gracefully to /login rather than looping — account-linking still deferred.
- Prod parity note: this run validated the dev workspace. The clamp fix ships with the next publish; prod currently has the unclamped `/api/resources` behavior.

---

## Evidence Index

All evidence under `e2e-evidence/`:

```
e2e-evidence/
├── analysis.md            # platform detection + surface inventory
├── validation-plan.md     # approved 8-journey plan
├── verdicts.md            # per-journey criteria tables (this run)
├── summary.md             # one-page result
├── report.md              # this file
├── console-errors.txt     # 0 errors across browse session
└── fullstack/
    ├── j1/  00-db-ready … 04-per-category        (5 files)
    ├── j2/  01-health … 10-resource-detail       (12 files)
    ├── j3/  01-register … 21-net-zero + 2 png    (17 files)
    ├── j4/  01-home … 05-search-ffmpeg + probes  (8 files)
    ├── j5/  01-logged-in … 09-db-rows-after      (9 files)
    ├── j6/  01-journeys-list … 02b-journey7-steps (3 png)
    ├── j7/  mobile/tablet/desktop screenshots     (7 png)
    └── j8/  01-resource-404 … 05-suggested-clamp (5 files)
```
