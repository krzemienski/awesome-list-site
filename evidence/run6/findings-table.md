# Master Fix Prompt Round 3 — Run6 Findings Table (July 15, 2026)

All 55 findings triaged against the live prod site + dev app + code (Iron Rule: real-system proof).
Context: the Round 3 audit crawled **prod on July 12, before the Run5 republish**, so all 18 Run5 dev fixes
re-appear here as "unfixed". Those are marked PENDING-REPUBLISH (already fixed in dev, verified in Run5,
waiting on the next publish). Round 2 verdict lineage: `evidence/run5/findings-table.md`.

**Summary: 3 FIXED (this run) · 18 PENDING-REPUBLISH · 14 STALE · 7 INVALID · 5 BY-DESIGN · 3 PLATFORM · 2 NOT-A-DEFECT · 1 EXPLAINED · 2 DECLINED**

| # | ID | Severity | Title | Verdict | Detail |
|---|----|----------|-------|---------|--------|
| 1 | R3-C01 | CRITICAL | GAESA cookie no security flags | PLATFORM | GAESA is a **Google App Engine session-affinity cookie** injected by Replit's hosting infra, not app code (zero hits in repo). Our session cookie `connect.sid` (server/replitAuth.ts) has httpOnly ✓, secure-in-prod ✓, sameSite=lax ✓. GAESA carries no auth state. |
| 2 | R3-H01 | HIGH | /subcategory/* return 404 | INVALID | = R2-H01. Auditor guessed slugs (`ffmpeg`, `hls`, `dash`); real slugs return 200, bad slugs soft-404 correctly. |
| 3 | R3-H02 | HIGH | Journey ids 1-5 fail, 6-10 work | INVALID | = R2-H02. Real journey ids are 6–10; ids 1–5 never existed; every UI link resolves. |
| 4 | R3-H03 | HIGH | /register has no form fields | STALE | Re-proven live July 15 (`scripts/run6-prod-register-check.mjs`): prod /register renders email input=1, password input=1, submit=1, heading "Create an Awesome Video account". Audit's curl saw the SPA shell. |
| 5 | R3-H04 | HIGH | Re-seed no confirmation | PENDING-REPUBLISH | Fixed Run5 (typed-RESEED AlertDialog); live in dev. |
| 6 | R3-H05 | HIGH | Admin exposes user emails | PENDING-REPUBLISH | Fixed Run5 (masked emails + per-row reveal); live in dev. |
| 7 | R3-H06 | HIGH | Edit in Admin generic link | STALE | Run4 deep-link `/admin/resources?resourceId=N` republished July 12; live on prod. |
| 8 | R3-H07 | HIGH | Share button zero feedback | STALE | Run4 toast + clipboard; verified on prod post-republish (Run4/Run5 evidence). |
| 9 | R3-H08 | HIGH | Sort API identical results | **FIXED** | Real defect (confirmed prod+dev: `sort` was never read). Added whitelisted sort to `ResourceRepository.listResources` (name-asc/name-desc case-insensitive on title, newest/oldest on createdAt, id tiebreaker) + route allow-list with 400 `invalid_sort`. Dev curl proof: 4 sorts return distinct correct orders; `?sort=bogus` → 400. |
| 10 | R3-M01 | MEDIUM | Empty tags array in API | INVALID | = R2-M01. Tags live in `metadata.tags` (the contract); 1,062 resources carry them. |
| 11 | R3-M02 | MEDIUM | /api/tags returns 404 | PENDING-REPUBLISH | Added in Run5; dev `GET /api/tags` → 200 re-verified July 15. |
| 12 | R3-M03 | MEDIUM | Search returns 20 for empty query | INVALID | = R2-M03. Empty query = paginated browse-all with honest total (acceptance criteria allow "meaningful default"). |
| 13 | R3-M04 | MEDIUM | No rate limiting on API | BY-DESIGN | Rate limiting exists on the programmatic surface: `/api/public/*` is limited (free tier 60/hr, 429 + Retry-After, `server/middleware/rateLimit.ts`). The SPA's own internal endpoints are deliberately exempt — one page load fires many requests; hourly limits there would 429 real visitors. Auditor's 10-request probe couldn't trip a 60/hr window anyway. |
| 14 | R3-M05 | MEDIUM | No user profile endpoint | INVALID | Auditor guessed 5 paths; the real one is `GET /api/auth/user` — prod proof July 15: 200 `{"user":null,"isAuthenticated":false}`. |
| 15 | R3-M06 | MEDIUM | Enrichment 49/32 processed | PENDING-REPUBLISH | Fixed Run5 (count clamp). |
| 16 | R3-M07 | MEDIUM | Failed job shows 100% success | PENDING-REPUBLISH | Fixed Run5 (N/A when processed=0). |
| 17 | R3-M08 | MEDIUM | 0% success marked completed | PENDING-REPUBLISH | Fixed Run5 ("Completed (no successes)" badge). |
| 18 | R3-M09 | MEDIUM | Journey ids inverted | INVALID | Duplicate of R3-H02. |
| 19 | R3-M10 | MEDIUM | Subcategory broken, sub-sub works | INVALID | Duplicate of R3-H01 (guessed slugs). |
| 20 | R3-M11 | MEDIUM | No subcategory in submit form | STALE | = R2-M09; subcategory select present and functional. |
| 21 | R3-M12 | MEDIUM | Journey descriptions identical | STALE | Run4 applied 5 unique descriptions to prod via PUT (journals in `.local/prod-cleanup/`). |
| 22 | R3-M13 | MEDIUM | Search lacks count/pagination | PENDING-REPUBLISH | Fixed Run5 (count line, 24/page, "showing first 1000" cap notice). |
| 23 | R3-M14 | MEDIUM | No Light/Dark toggle | BY-DESIGN | Dark-only per user decision (Run4 NEW-002). |
| 24 | R3-M15 | MEDIUM | CSP style-src unsafe-inline | BY-DESIGN | Accepted tradeoff (Tailwind/shadcn inline styles; script-src stays nonce-based). Note: Round 2's M13 complained the *opposite* (CSP blocking inline styles). |
| 25 | R3-M16 | MEDIUM | Approvals no Reject action | STALE | = R2-M14; Reject button live. |
| 26 | R3-M17 | MEDIUM | Feedback widget attachment copy | PLATFORM | Replit dev-preview injected widget; zero app code. |
| 27 | R3-M18 | MEDIUM | Feedback widget screenshots copy | PLATFORM | Same injected widget. |
| 28 | R3-M19 | MEDIUM | Footer no navigation | PENDING-REPUBLISH | Fixed Run5 (footer nav + copyright). |
| 29 | R3-M20 | MEDIUM | Descriptions truncated mid-word | PENDING-REPUBLISH | Fixed Run5 (word-boundary truncation). |
| 30 | R3-M21 | MEDIUM | No breadcrumbs | STALE | = R2-M24; breadcrumbs live. |
| 31 | R3-M22 | MEDIUM | Sort doesn't persist refresh | PENDING-REPUBLISH | Fixed Run5 (`?sort=` URL param sync). |
| 32 | R3-M23 | MEDIUM | Link Health Audit unclear | NOT-A-DEFECT | = R2-M26; dashboard shows status/history/run controls. |
| 33 | R3-M24 | MEDIUM | No password strength meter | PENDING-REPUBLISH | Fixed Run5 (4-segment meter on /register). |
| 34 | R3-M25 | MEDIUM | Login error leaks user existence | **FIXED** | Real defect (confirmed prod+dev: short password → "Password must be at least 8 characters long"). All localAuth failure paths (bad email format, short password, unknown user, OAuth-only account, wrong password) now return the same generic "Invalid email or password". Client doesn't pattern-match the old messages (only `?error=oauth` param). Dev curl proof: 3 distinct failure shapes → identical message; valid login still 200. |
| 35 | R3-M26 | MEDIUM | /api/auth/login hint leaks structure | BY-DESIGN | The hint names only `/api/auth/local/login` and `/api/login` — both shipped in the public client bundle, so nothing secret is revealed; the 405-style hint is deliberate DX. |
| 36 | R3-M27 | MEDIUM | Recommendations no loading state | STALE | = R2-M28; loading state present. |
| 37 | R3-M28 | MEDIUM | Admin Users no search | PENDING-REPUBLISH | Fixed Run5 (server `?q=` + search box). |
| 38 | R3-M29 | MEDIUM | Admin Resources no bulk actions | PENDING-REPUBLISH | Fixed Run5 (bulk select/approve/reject/delete). |
| 39 | R3-M30 | MEDIUM | Count volatile 1951→1928 | EXPLAINED | July dedup + empty-taxonomy cleanup; documented in CHANGELOG. |
| 40 | R3-L01 | LOW | No back-to-top | PENDING-REPUBLISH | Fixed Run5. |
| 41 | R3-L02 | LOW | No favicon | STALE | Favicon present on prod. |
| 42 | R3-L03 | LOW | Only Replit SSO on login | BY-DESIGN | Replit SSO fronts GitHub/Google/Apple/X; labeled in UI. |
| 43 | R3-L04 | LOW | No per-tag clear in filter | STALE | = R2-L06; per-tag toggle + clear control present. |
| 44 | R3-L05 | LOW | No drag-and-drop reorder | DECLINED | User decision (Round 2): low value / high effort. |
| 45 | R3-L06 | LOW | No user list export | PENDING-REPUBLISH | Fixed Run5 (admin CSV export). |
| 46 | R3-L07 | LOW | Bookmark button anonymous | PENDING-REPUBLISH | Fixed Run5 (anon sees buttons, click → sign-in toast). |
| 47 | R3-L08 | LOW | No recent searches | PENDING-REPUBLISH | Fixed Run5 (⌘K recent searches). |
| 48 | R3-L09 | LOW | Category card click area | STALE | = R2-L11; whole card clickable. |
| 49 | R3-L10 | LOW | Enrichment no pause/cancel | STALE | = R2-L12; cancel control present. |
| 50 | R3-L11 | LOW | No admin error boundary | PENDING-REPUBLISH | Fixed Run5 (per-tab ErrorBoundary). |
| 51 | R3-L12 | LOW | Mobile sidebar not collapsible | STALE | = R2-L14; collapsible sidebar live. |
| 52 | R3-L13 | LOW | Suggest Edit untested | NOT-A-DEFECT | = R2-L15; verified in prior runs. |
| 53 | R3-L14 | LOW | No skip-link focus indicator | STALE | = R2-L16; fixed in earlier run. |
| 54 | R3-L15 | LOW | Admin tabs no kbd shortcuts | DECLINED | User decision (Round 2): low value / high effort. |
| 55 | R3-L16 | LOW | Filter by Tag badge lacks context | **FIXED** | Count badge on the "Filter by Tag" button now carries `title` + `aria-label` "N tag(s) selected" (advanced-filter.tsx — the component used on Home/Category/Subcategory/SubSubcategory). |

## Verification evidence (this run)
- **tsc**: clean (0 errors) after all changes.
- **R3-H08 curl (dev)**: `name-asc` starts "100ms:…" A→Z; `name-desc` starts "µPlayer…" Z→A; `newest`/`oldest` differ and match createdAt; `?sort=bogus` → 400 `{"error":"invalid_sort","allowed":[...]}`; default list unchanged (total 1823).
- **R3-M25 curl (dev)**: nonexistent+short-pw, nonexistent+long-pw, malformed-email all → `{"message":"Invalid email or password"}`; valid admin login still 200 with user payload.
- **R3-H03 Playwright (prod)**: `scripts/run6-prod-register-check.mjs` → email/password/submit all present.
- **R3-M05 curl (prod)**: `/api/auth/user` → 200.
- **Regression (dev)**: `/api/tags` 200; default `/api/resources` list OK.

**Republish required** for the 3 Run6 fixes + 18 Run5 fixes to reach https://awesome.video.
