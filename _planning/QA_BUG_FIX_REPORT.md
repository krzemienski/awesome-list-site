# awesome.video — Production QA Bug Report Resolution (BUG-001..025)

**Stack reality check:** the QA report was written against a Next.js-style app with
different route/schema assumptions. The real codebase is a **React + Vite + Express +
Drizzle + wouter SPA**. Several report numbers (counts, "truncation", schema shapes)
were **stale** and did not reproduce against the live DB. Each bug below was verified
against the running app and database before any change.

**Status legend:** ✅ Fixed · 🟰 Not reproduced (stale report, verified consistent) ·
⭐ Positive finding (working; preserved) · 🌐 Third-party limitation (no code fix).

---

## Consolidated BUG-ID → status table

| BUG | Sev | Area | Status | One-line resolution |
|-----|-----|------|--------|---------------------|
| 001 | High | Subcategory count vs displayed (cloud-based-encoding-solutions) | ✅ Fixed | Duplicate twins rejected via dedup; header now equals displayed |
| 002 | High | Streaming Servers duplicates | ✅ Fixed | Duplicate twins rejected via dedup |
| 003 | Med | Encoding & Codecs count mismatch (396 vs ~271) | 🟰 Not reproduced | Counts self-consistent; 333 == sum after 4 incidental dedups |
| 004 | Med | Adaptive Streaming count/truncation (37 vs 9, Puffer ×2) | 🟰 Not reproduced | 46 rows/45 titles, no truncation; report numbers stale |
| 005 | Med | Tag filter does not function (`?tag=`) | ✅ Fixed | Added `?tag=` alias for `?tags=`; filters apply on load |
| 006 | Low | Sort param ignored / no UI state (`?sort=`) | ✅ Fixed | `?sort=` alias + `normalizeSort`; select reflects active sort |
| 007 | Low | Page param ignored / no pagination UI (`?page=`) | ✅ Fixed | Client pagination (24/page) + Prev/Next honoring `?page=` |
| 008 | Cosmetic | Breadcrumb path for sub-subcategory FFmpeg | 🟰 Not reproduced | Breadcrumb built from live tree; renders correct ancestry |
| 009 | Low | Empty subcategories displayed | 🟰 Not reproduced | Lists built from live resources, so empties can't appear |
| 010 | Med | Resource detail missing metadata | 🟰 Not reproduced | Detail renders tags/related/status/OG conditionally |
| 011 | Med | Loading state never resolves (`/resource/186200`) | 🟰 Not reproduced | Resolves; graceful states already present |
| 012 | Low | Invalid resource ID → graceful 404 | ⭐ Positive | Preserved |
| 013 | Low | External links missing security attributes | 🟰 Not reproduced | Links already carry `rel="noopener noreferrer"` |
| 014 | Low | `GET /api/resource/{id}` 404 | ✅ Fixed | Singular alias mounted on shared handler |
| 015 | Med | `/favorites` 404 | ✅ Fixed | Client `<Redirect>` + server 301 → `/bookmarks` |
| 016 | Low | `/account` 404 | ✅ Fixed | Client `<Redirect>` + server 301 → `/profile` |
| 017 | Low | `/profile` & `/bookmarks` auth-gated | ⭐ Positive | Preserved |
| 018 | Med | Submit form not visible when logged out | ✅ Fixed | Fields shown but `<fieldset disabled>`; submit disabled |
| 019 | Low | `POST /api/submit` 404 | ✅ Fixed | Alias mounted on shared create handler behind auth |
| 020 | Med | Learning Journey detail empty (`/journey/6`) | 🟰 Not reproduced | 18 published steps; detail renders steps/progress |
| 021 | Low | Advanced page has no power-user tools | 🟰 Not reproduced | Explorer/metrics/export tabs already present |
| 022 | — | Category/subcategory API filter by slug fails | ✅ Fixed | `GET /api/resources` resolves slug→name (+ name fallback) |
| 023 | Low | `/admin` blocks unauthorized access | ⭐ Positive | Preserved |
| 024 | Cosmetic | Google Slides resource requires sign-in | 🌐 Third-party | No platform code fix |
| 025 | Cosmetic | Bitmovin resource blocked by Cloudflare | 🌐 Third-party | No platform code fix |

**Totals:** 11 ✅ Fixed · 9 🟰 Not reproduced · 3 ⭐ Positive (preserved) · 2 🌐 Third-party.

---

## Fixed bugs — Root cause / Approach / Fix / Verification

### BUG-022 — `GET /api/resources` category/subcategory filter fails on slugs
- **Root cause:** the endpoint filtered `category`/`subcategory` by **display name** only. Direct API calls (and any client passing a URL slug like `encoding-codecs`) returned `total: 0` because the slug never matched a name.
- **Approach:** accept either shape without breaking the existing name-based client. A value matching the slug shape `/^[a-z0-9-]+$/` is treated as a candidate slug; anything with spaces/`&`/caps is a name and passes through untouched. Subcategory is only slug-resolved after its category resolves.
- **Fix:** `server/routes.ts` `GET /api/resources` resolves slugs via `categoryRepo.getCategoryBySlug` and the new `CategoryRepository.getSubcategoryBySlug(slug, categoryId)`; unresolved slug-shaped values fall back to name matching.
- **Verification:** slug and name both return `total: 333` (category) and `103` (subcategory); a bogus slug returns HTTP 200 `total: 0` (not 500). DB check confirmed **zero** category/subcategory names match the slug regex and **zero** name==slug cross-collisions, so the heuristic has no false-positive path.

### BUG-014 — `GET /api/resource/{id}` (singular) returns 404
- **Root cause:** only the plural `/api/resources/:id` route existed.
- **Fix:** extracted `getResourceByIdHandler` and mounted it on both `/api/resources/:id(\d+)` and the new `/api/resource/:id(\d+)`.
- **Verification:** both return HTTP 200 for a valid id.

### BUG-019 — `POST /api/submit` returns 404
- **Root cause:** resource creation was only wired to `POST /api/resources`.
- **Fix:** extracted `createResourceHandler` and mounted it on `POST /api/resources` and the new `POST /api/submit`, both behind `isAuthenticated` with the identical Zod validation chain.
- **Verification:** both return HTTP 401 when unauthenticated (auth backstop intact).

### BUG-015 / BUG-016 — `/favorites` and `/account` 404
- **Root cause:** no route/redirect for these legacy paths.
- **Approach:** match the repo's established redirect pattern (client `<Redirect>` **paired with** og-middleware server-side 301s) so direct URL hits redirect before JS boots.
- **Fix:** `client/src/App.tsx` `<Redirect>` `/favorites`→`/bookmarks`, `/account`→`/profile`; matching 301s in `server/og-middleware.ts`.
- **Verification:** curl confirms 301 on both server-side.

### BUG-018 — Submit page: form not visible when logged out
- **Root cause:** the form was hidden for anonymous users despite copy saying it could be previewed.
- **Fix:** `client/src/pages/SubmitResource.tsx` renders all fields wrapped in `<fieldset disabled={!isAuthenticated}>`; the submit button (outside the fieldset) also adds `!isAuthenticated`; the login-required alert stays visible.
- **Verification:** Playwright confirms the title input and submit button are `disabled` for anonymous users; server 401 is the backstop.

### BUG-005 / BUG-006 / BUG-007 — Tag filter, sort param, pagination (Category page)
- **Root cause:** `Category.tsx` read only canonical params and had no pagination; deep links using `?tag=`, `?sort=`, or `?page=` were ignored.
- **Fix (`client/src/pages/Category.tsx`):**
  - `?tag=` accepted as an alias for `?tags=`.
  - `?sort=` alias + module-level `normalizeSort()` mapping bare `name`/`asc`/`desc` onto name ordering while passing the canonical AdvancedFilter values (`default`, `name-asc/desc`, `count-asc/desc`) through unchanged so reload/back restores the select.
  - Client-side pagination `PAGE_SIZE = 24`: `page` state seeded from `?page=`, render-time `currentPage` clamp, a load-guarded clamp-down effect (gated on `!isLoading && !dbLoading && length>0`), `setPage(1)` on every filter/search/sort/subcategory/clear change, `page` folded into the URL-sync + popstate handlers, and Prev/Next controls.
- **Verification:** Playwright — 24 cards/page, "Page 1 of 14" (prev disabled) → "Page 2 of 14" with `?page=2` after Next; `?tag=ffmpeg&sort=name` normalizes to `?tags=ffmpeg&sortBy=name-asc`.

### BUG-001 / BUG-002 — Duplicate resources / subcategory count vs displayed
- **Root cause:** a handful of true duplicate resources (same resource, trivially different URL — trailing slash, `/en/` vs `/`, tracking params) inflated subcategory counts and appeared twice in listings (Streaming Servers, Cloud-Based Encoding Solutions).
- **Approach:** reject (not delete — reversible) the duplicate twins, keeping the canonical row; repoint any dependent `journey_steps` to the survivor first to avoid orphaning.
- **Fix:** `scripts/dedup-reject.ts` set `status='rejected'` on 7 duplicate rows and repointed 1 journey step `186146 → 185759`.
- **Verification:** all 7 rows `status='rejected'`; `0` journey steps reference `186146`, `2` reference `185759`; Encoding & Codecs total `337 → 333` and now equals the subcategory sum. Fully reversible from the admin panel.

---

## Not-reproduced bugs (🟰 — verified against live DB/code)

- **BUG-003 / BUG-004:** count/truncation numbers in the report are stale. Encoding & Codecs is self-consistent (333 == sum); Adaptive Streaming has 46 rows / 45 titles with no truncation. Counts derive from one complete server-side tree.
- **BUG-008:** breadcrumb is built from the live category tree and renders the correct ancestry for sub-subcategories.
- **BUG-009:** subcategory/tag lists are built from live resources, so empty nodes cannot render.
- **BUG-010 / BUG-011:** resource detail renders tags/related/status/OG conditionally and resolves loading with graceful empty/error states.
- **BUG-013:** external links already carry `rel="noopener noreferrer"`.
- **BUG-020:** Journey 6 has 18 published steps; JourneyDetail renders steps and progress.
- **BUG-021:** the Advanced page already exposes category explorer, metrics, and export tabs.

## Positive findings preserved (⭐)

- **BUG-012:** invalid resource ID → graceful 404.
- **BUG-017:** `/profile` and `/bookmarks` correctly gate on auth.
- **BUG-023:** `/admin` gracefully blocks unauthorized access.

## Third-party limitations (🌐 — no code fix)

- **BUG-024:** Google Slides resource gated behind Google sign-in.
- **BUG-025:** Bitmovin resource blocked by Cloudflare CDN protection.

---

## Global verification summary

- `npx tsc --noEmit` → exit 0 (clean).
- curl smoke matrix: category slug==name==333, subcat slug==name==103, bogus slug → 200 `total:0`, `/api/resource/:id` + plural → 200, `/favorites`→`/bookmarks` 301, `/account`→`/profile` 301, `POST /api/submit` & `/api/resources` unauth → 401, dedup row 186330 `status=rejected`.
- Playwright: pagination Next (`?page=2`, "Page 2 of 14", 24 cards), alias normalization (`?tag=`/`?sort=` → canonical), Submit fields+button disabled for anon.
- Architect (`evaluate_task`, with git diff): **PASS** — no functional regressions; slug heuristic confirmed false-positive-safe against live data.
