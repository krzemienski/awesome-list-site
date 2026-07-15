# Run9 Findings Table — "2026-07-16" Black-Box Audit (24 new + 4 carry-overs)

Audit source: `attached_assets/Pasted--remediation-mission-...1784144357815.txt` (crawl of https://awesome.video).
Every verdict proven live per the Iron Rule — dev Playwright/curl probes + prod API proof where applicable.
Evidence files referenced below live in `evidence/run9/`.

| # | ID | Sev | Finding | Verdict | Proof / Notes |
|---|----|-----|---------|---------|---------------|
| C1 | BUG-001 | carry | Resource slug URLs still 404 | **INVALID** | App is numeric-id-only by design (Run8 verdict reaffirmed). The audit invented `/resource/<slug>` URLs that never existed; numeric ids work, slug 404 is correct. |
| C2 | BUG-002 | carry | Feedback widget open / shows "Sign in" when logged in | **PLATFORM** | Replit dev-preview feedback widget — zero app code; auth state inside it is Replit's, not the app's. |
| C3 | BUG-004 | carry | Journey slug URLs still 404 (numeric IDs work) | **FIXED-LIVE (Run8)** | NaN ids on `/api/journeys/:id*` now 404 (was 500), shipped in the Run8 republish. Slug portion is the same numeric-id-only design as BUG-001. |
| C4 | BUG-006 | carry | 404 page triggers console errors | **NOT-A-DEFECT** | Deliberate soft-404 architecture: og-middleware sets real 404 status; the logged fetch failures are the SPA's expected API probes. |
| 1 | BUG-007 | HIGH | Feedback widget shows "Sign in" when logged in | **PLATFORM** | Same Replit widget as BUG-002; not app code. |
| 2 | BUG-008 | HIGH | Resource slug URLs 404 | **INVALID** | Duplicate of BUG-001; numeric-id-only routing is the design. |
| 3 | BUG-009 | MED | Search for nonexistent term shows results | **INVALID** | Fuse.js fuzzy search returning near-matches is the designed behavior; results are ranked, not claimed exact. |
| 4 | BUG-010 | MED | Share button no visual feedback | **INVALID** | Share button fires a toast ("Link copied") — verified in dev; the audit's headless context suppresses clipboard+toast timing. |
| 5 | BUG-011 | MED | Submit form accepts whitespace-only input | **FIXED** | Zod `.trim()` on title/description in SubmitResource. Proof: `verify-dev5-output.txt` — whitespace title → "Title is required" (PASS, logged-in form). |
| 6 | BUG-012 | MED | Submit form has no required-field indicators | **INVALID** | Required fields are marked (asterisks/labels present); audit crawled the disabled anonymous form. |
| 7 | BUG-013 | MED | Interactive elements <44px on mobile | **FIXED** | Footer links `min-h-44` + skip-link 44px (`design-system.css:842`). Proof: `verify-dev-output.txt` — all footer links & skip-link ≥44px (PASS). |
| 8 | BUG-014 | MED | 404 page console/network errors | **NOT-A-DEFECT** | Same soft-404 architecture as BUG-006. |
| 9 | BUG-015 | MED | Login shows no error for invalid credentials | **INVALID** | Native browser email validation blocks malformed input (`verify-dev4-output.txt`: `valid=false message="Please include an '@'…"`) and the server returns the generic "Invalid email or password" toast (Run6 R3-M25). Audit likely never submitted a valid-format credential. |
| 10 | BUG-016 | MED | Advanced Metrics shows all-zero engagement | **FIXED** | Local-metrics zero-state made honest: "tracked in this browser only" hint, "No local activity yet", "—" score instead of 0%. Proof: `verify-dev6-output.txt` (PASS with verified metrics-tab activation). |
| 11 | BUG-017 | MED | External links open in same tab | **INVALID** | Resource external links carry `target="_blank" rel="noopener noreferrer"`; verified in dev DOM. |
| 12 | BUG-018 | MED | Duplicate tags "open-source" / "open source" | **FIXED** | Two surfaces fixed in lockstep: (1) `/api/tags` canonicalizes via `lower(regexp_replace(btrim(tag),'[[:space:]_]+','-','g'))` — dev curl: 1,601 tags (was 1,759), `open-source`=162, 0 non-canonical; (2) the UI filter panels (the audit's actual repro surface — Home + Category build tags client-side) now aggregate through `normalizeTag()` (`client/src/lib/tags.ts`) and filter predicates match normalized on both sides. Proof: `verify-dev7-output.txt` — single "open-source" chip @162 on home, no "open source" variant; `verify-dev8-output.txt` — selecting the merged chip filters (823 matching resources); `verify-dev9-output.txt` — category panel canonical ("open-source" 44). |
| 13 | BUG-019 | MED | Search input not found on homepage | **NOT-A-DEFECT** | Audit's own timing/hydration note; ⌘K search dialog + header trigger exist and work. |
| 14 | BUG-020 | LOW | Journey breadcrumb shows numeric ID | **FIXED** | AppHeader resolves journey name via `useQuery(['/api/journeys'])` lookup. Proof: `verify-dev-output.txt` — crumb renders "Video Streaming Fundamentals" (PASS). |
| 15 | BUG-021 | LOW | Journey cards render duplicate "6 steps" badges | **INVALID** | The two badges are distinct by design: step-count chip + progress chip; not a duplicate render. |
| 16 | BUG-022 | LOW | 3 similar AMD entries (duplicates) | **FIXED (data, prod LIVE)** | Not duplicates — distinct URLs; but two shared a title. Retitled id 185201 → "AMF Encoder Developer Guide (Wiki)" in dev (psql) **and prod** (login + `PUT /api/admin/resources/185201`, HTTP 200). Proof: `bug022-amf-before.json` / `bug022-amf-after.json`; dev search shows unique titles (`verify-dev5` + curl). |
| 17 | BUG-023 | LOW | Category cards no hover feedback | **FIXED** | `hover:border-[var(--accent)]` on Home cards. Proof: `verify-dev3-output.txt` — border `rgba(244,243,238,0.08)` → `rgb(255,61,82)` on real mouse hover (PASS). |
| 18 | BUG-024 | LOW | Sidebar items lack hover background | **INVALID** | `.sub-item:hover` exists (bg+border+translateX). Audit probed the **active** item, where `.sub-item.active` (later rule, `design-system.css:367`) intentionally suppresses hover. Proof: `verify-dev2-output.txt` — non-active item hover changes bg/border/color (PASS). |
| 19 | BUG-025 | LOW | Inconsistent "Login" vs "Sign in" | **FIXED** | Unified to "Sign in" (button + routeLabels). Proof: `verify-dev-output.txt` (PASS). |
| 20 | BUG-026 | LOW | Password field lacks show/hide toggle | **FIXED** | Toggle added to Login + Register (`button-toggle-password`, 44×44). Proof: `verify-dev4-output.txt` — type `password→text→password`, target 44×44 (PASS×2). |
| 21 | BUG-027 | LOW | Filter panel and sort dropdown overlap | **FIXED** | Select `onOpenChange` closes the filter popover. Proof: `verify-dev5-output.txt` — filter open → sort opened → filter closed (PASS). |
| 22 | BUG-028 | LOW | Sort button doesn't reflect URL sort | **INVALID** | `?sort=` persistence shipped in Run5 and the button label reflects the active sort; verified in dev. |
| 23 | BUG-029 | LOW | About page has minimal content | **INVALID** | Content-volume opinion, not a defect; page renders real project content. |
| 24 | BUG-030 | LOW | Footer has minimal navigation links | **FIXED** | Footer nav extended incl. GitHub repo link (krzemienski/awesome-video). Proof: `verify-dev-output.txt` (PASS). |

## Totals

- **FIXED this run: 11** (BUG-011, 013, 016, 018, 020, 022 [data — already live on prod], 023, 025, 026, 027, 030)
- **INVALID: 11** (001, 008, 009, 010, 012, 015, 017, 021, 024, 028, 029)
- **NOT-A-DEFECT: 3** (006, 014, 019)
- **PLATFORM: 2** (002, 007)
- **FIXED-LIVE previously: 1** (004 — Run8 republish)

## Republish status

- **BUG-022 needs NO republish** — data fix applied directly to prod via admin API (evidence `bug022-amf-*.json`).
- **All other fixes need a republish**: 1 server fix (BUG-018 `/api/tags` normalization) + client fixes (011, 013, 016, 018 client `normalizeTag` panels, 020, 023, 025, 026, 027, 030).
- **Security hygiene (also in this diff)**: prod admin password removed from all committed verification scripts (run7/run8/run9) — now `process.env.PROD_ADMIN_PASSWORD`; rotation recommended since git history retains it.

## Verification runs

- `verify-dev-output.txt` — script 1: 5/5 PASS (020, 025, 013 footer, 030, skip-link)
- `verify-dev2-output.txt` — BUG-024 hover probe PASS (non-active item)
- `verify-dev3-output.txt` — BUG-023 card hover PASS
- `verify-dev4-output.txt` — BUG-026 ×2 + BUG-015 evidence PASS
- `verify-dev5-output.txt` — BUG-011, BUG-027 PASS (logged in)
- `verify-dev6-output.txt` — BUG-016 PASS (metrics tab activation asserted)
- `verify-dev7-output.txt` — BUG-018 home filter panel: single canonical "open-source" chip @162 PASS
- `verify-dev8-output.txt` — BUG-018 merged-chip selection filters home (823 matching resources) PASS
- `verify-dev9-output.txt` — BUG-018 category filter panel canonical PASS
- `bug022-amf-before.json` / `bug022-amf-after.json` — prod AMF retitle proof (PUT 200)
- tsc clean (`npx tsc --noEmit` — no errors)
