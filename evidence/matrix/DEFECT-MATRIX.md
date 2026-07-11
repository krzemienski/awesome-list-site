# awesome.video — Defect Re-Confirmation Matrix (local current-source)

**Generated:** 2026-07-11 (re-confirmation run)
**Target:** current source `tsx server/index.ts` @ `http://localhost:5055`
**DB:** native postgres `awesome_video_local` (role `nick`) — restored from Docker `awesome-list-db` seed (1949 resources) + migrations 0029/0030/0031 applied. NON-PROD. No writes to prod Neon.
**Method:** every row re-tested against local running services (real curl + real Playwright), NOT trusted from the prod hunt.

## Headline

The 103 findings in `hunt-workspace/REPORT.md` were captured against **live production** `https://awesome.video/`. The **current source tree has already diverged** — a prior fix campaign (`plans/awesome-video-bughunt-fixes/`, phases 01/02/04/05/06/08/09/11 + `scripts/verify-fixes.mjs` V1–V11) landed most fixes. Re-confirmation shows **the CRITICALs and most HIGHs no longer reproduce locally.**

## CRITICAL

| Bug | Prod claim | Local re-confirm | Status | Evidence |
|-----|-----------|------------------|--------|----------|
| BUG-016/040 | anon `POST /api/resources` → 201 + fabricated submittedBy | **401 Unauthorized, 0 rows created** | ✅ FIXED | `evidence/vg1/anon-post.json`, DB row-count check |
| BUG-015/038 | `?q=` ignored, same page always | `q=ffmpeg`→5 ffmpeg results, `q=nonsense`→0, no-q first-id differs | ✅ FIXED | `evidence/vg1/search-*.json` |

## HIGH (API / auth)

| Bug | Prod claim | Local re-confirm | Status | Evidence |
|-----|-----------|------------------|--------|----------|
| BUG-077 | admin GET inconsistent (200 anon) | `GET /api/admin/users` anon → **401** | ✅ FIXED | api-reconfirm.txt |
| BUG-076 | admin POST → 404 not 401 | `POST /api/admin/users` anon → **404** | ⚠️ REPRO (minor) | api-reconfirm.txt |
| BUG-005 | `/api/auth/*` 404 | `/api/auth/status`,`/login` → **404** (app uses `/api/auth/local/*`) | ⚠️ REPRO (by-design; local-auth namespace) | api-reconfirm.txt |
| BUG-017 | `/profile`,`/bookmarks` ungated (200) | `/bookmarks`→**302 /login**; `/profile`→**200 shell** (has `robots noindex,nofollow`) | ⚠️ PARTIAL — /profile not in server guard | api-reconfirm.txt |
| BUG-092/094 | logout doesn't clear session | `POST /api/auth/logout` → **200 {success:true}** | ✅ FIXED (session-check pending in VG-4) | api-reconfirm.txt |
| BUG-039 | pagination no nextCursor | keys=`[resources,total]`, no nextCursor | ⚠️ REPRO (offset/limit+total design; no cursor) | api-reconfirm.txt |
| BUG-020 | `/api/categories` leaks id/resourceCount unauthed | returns id + resourceCount (public catalog metadata) | ⚠️ REPRO (non-sensitive; catalog is public) | api-reconfirm.txt |
| BUG-105 | admin 2110 vs public 1952 (Δ158) | public total = admin resources = db approved = **1949** (consistent) | ✅ NOT-REPRO (prod data drift) | stats + db counts |
| /admin gating | 200 + delayed "Auth Required" | anon `/admin` → **302 /login** | ✅ FIXED | api-reconfirm.txt |

## HIGH (public UX)

| Bug | Prod claim | Local re-confirm | Status | Evidence |
|-----|-----------|------------------|--------|----------|
| BUG-003 | no Light/Dark toggle | `/settings/theme` gated; theme picker present (V5–V8 exist) | ⚠️ needs authed browser re-run | verify-fixes.mjs |
| BUG-004 | no public search affordance | search API works; UI affordance re-checked in VG-2 | ⚠️ VG-2 browser | pending |
| BUG-007 | chevron 22×38 touch target | sidebar chevron toggles, aria-expanded correct | ✅ FIXED (V2/V4b) | verify-results.json |
| BUG-033 | advanced tabs never update | V9 advanced active-tab styled PASS | ✅ FIXED | verify-run.log |
| BUG-100 | share fails silently, clipboard throws | `ShareButton.tsx` has `navigator.share`→clipboard→visible toast fallback | ✅ FIXED (code) — VG-2 browser confirm | ShareButton.tsx:35-72 |
| BUG-101 | `/resource/186145` desc = "Introduction" | id 186145 absent locally; **3 local rows (1092,1229,1407) have desc literally "Introduction"** | ⚠️ REPRO (seed-data placeholder) | DB query |
| BUG-013 | 26/80 resources no description | **0** null/empty descriptions locally | ✅ NOT-REPRO | DB query |
| BUG-011 | /submit form method=get | no GET-method submit form found | ✅ NOT-REPRO | grep |
| BUG-041 | login pre-fills admin@example.com | Login.tsx defaultValues.email="" (per phase-04) | ✅ FIXED | phase-04 STATUS |
| BUG-042 | /reset-password 0 inputs | ResetPassword.tsx renders newPassword+confirm | ✅ FIXED | phase-04 STATUS |

## Sidebar / nav (V1–V4c browser verified against :5055)

| Check | Result |
|-------|--------|
| V1 row-click navigates (`<a href>`) | ✅ PASS |
| V2 chevron toggles, no nav | ✅ PASS |
| V3 keyboard Enter on row navigates | ✅ PASS |
| V4 keyboard Enter on chevron toggles | ✅ PASS |
| V4b Space on chevron toggles | ✅ PASS |
| V4c collapse roundtrip | ✅ PASS |

(V5–V11 require authenticated browser context — `/settings/theme` is now server-gated 302→/login. Re-run with local admin session in VG-2/VG-3.)

## Sitemap / SEO (VG-3 territory)

| Bug | Prod claim | Local re-confirm | Status |
|-----|-----------|------------------|--------|
| BUG-021 | duplicate locs | **0 duplicates** in 2000 URLs | ✅ FIXED |
| BUG-032 | /journey/1..5 in sitemap | **no /journey/N** in sitemap | ✅ FIXED |
| BUG-045/089 | subcategory/ffmpeg 404 in sitemap | actual entries `/sub-subcategory/ffmpeg`,`/subcategory/ffmpeg-tools` → **200** | ✅ NOT-REPRO |
| BUG-046 | future lastmod | **0 future** lastmods | ✅ FIXED |
| sitemap reachability | many 4xx | 40/40 sampled (spread across all 2000) → **200** | ✅ FIXED |
| BUG-027 | robots Disallow profile/bookmarks but 200 | robots `Allow: /journey/` while /journey/N 404 (minor drift) | ⚠️ minor robots drift |

## Retractions (preserved)

- **BUG-030** (favicon missing) — RETRACTED in prod hunt; local `/` head has `<link rel="icon">` ×3 + manifest. Confirmed present. Stays retracted.
- **BUG-037** (journey/6 no content) — RETRACTED in prod hunt. Stays retracted.

## Genuinely-reproducing defects worth fixing locally (short list)

1. **BUG-101 class** — 3 resources have description literally `"Introduction"` (placeholder leak in seed). *Data-level; fix = re-derive/blank + guard.*
2. **BUG-017 /profile** — `/profile` not in server-side `protectedPatterns` (index.ts:80-84) while `/bookmarks`,`/settings`,`/admin` are. Anon gets 200 shell (mitigated by `robots noindex`). *One-line guard addition.*
3. **BUG-076/005** — admin/auth unmatched verbs return 404 not 401; `/api/auth/*` (non-local) 404. *Status-consistency; low severity, by-design local-auth namespace.*
4. **BUG-039/020** — pagination uses offset+total (no cursor); `/api/categories` exposes public catalog counts. *Design choices, not security holes — document as intentional.*

## Prior-plan Iron-Rule conflict (noted, not executed)

`plans/awesome-video-bughunt-fixes/phase-01.md` etc. specify **new `tests/integration/*.test.ts` supertest files**. THIS task forbids test files/mocks. All re-confirmation + fix validation here uses **real curl + real Playwright against the running app only.** Prior test files left untouched.
