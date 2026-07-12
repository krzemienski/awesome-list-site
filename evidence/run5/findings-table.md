# Master Fix Prompt Round 2 — Run5 Findings Table (July 12, 2026)

All 56 findings triaged against the live dev app + database (Iron Rule: real-system proof).
Verification: tsc clean · curl auth/negative tests on all new endpoints · Playwright dev sweep 17/17 PASS (`scripts/run5-verify-dev.mjs`, phases 1+2) · architect review PASS.

**Summary: 19 FIXED · 18 STALE · 8 INVALID · 2 BY-DESIGN · 2 PLATFORM · 3 NOT-A-DEFECT · 1 EXPLAINED · 2 DECLINED · 1 dup-counted (M07/M08 fold into H02/H01)**

| # | ID | Severity | Title | Verdict | Detail |
|---|----|----------|-------|---------|--------|
| 1 | R2-H01 | HIGH | /subcategory/* return 404 | INVALID | Auditor guessed slugs; real slugs return 200, soft-404 for bad slugs is correct behavior |
| 2 | R2-H02 | HIGH | /journey/1–5 return 404 | INVALID | Real journey ids are 6–10; all UI links work; ids 1–5 never existed |
| 3 | R2-H03 | HIGH | /register has no form | STALE | Form live since July 10 republish (Run4 predates audit crawl) |
| 4 | R2-H04 | HIGH | Clear & Re-seed no confirmation | **FIXED** | Typed-confirm AlertDialog (must type RESEED) in DatabaseTab |
| 5 | R2-H05 | HIGH | Admin exposes user emails | **FIXED** | Emails masked by default, per-row reveal toggle in UsersTab (display-level control) |
| 6 | R2-H06 | HIGH | "Edit in Admin" generic link | STALE | Deep-link `/admin/resources?resourceId=N` shipped in Run4 |
| 7 | R2-H07 | HIGH | Share button zero feedback | STALE | Toast + clipboard verified live post-Run4 |
| 8 | R2-M01 | MEDIUM | Empty tags array via API | INVALID | Tags live in `metadata.tags` (1,062 resources have them); top-level field was never the contract |
| 9 | R2-M02 | MEDIUM | /api/tags returns 404 | **FIXED** | New public GET /api/tags — aggregates metadata tags over approved resources (1,759 tags) |
| 10 | R2-M03 | MEDIUM | Search returns 20 for empty query | INVALID | Empty query = browse-all with honest total + pagination; acceptance criteria permit |
| 11 | R2-M04 | MEDIUM | Enrichment 49/32 processed | **FIXED** | Processed count clamped ≤ total in BatchEnrichmentPanel |
| 12 | R2-M05 | MEDIUM | Failed job shows 100% success | **FIXED** | Success rate shows N/A when processed=0 |
| 13 | R2-M06 | MEDIUM | 0% success marked completed | **FIXED** | Coherent "Completed (no successes)" badge |
| 14 | R2-M07 | MEDIUM | Journey 6-10 work, 1-5 don't | INVALID | Duplicate of H02 |
| 15 | R2-M08 | MEDIUM | Subcategory routes broken | INVALID | Duplicate of H01 |
| 16 | R2-M09 | MEDIUM | No subcategory in submit form | STALE | Subcategory select present and functional |
| 17 | R2-M10 | MEDIUM | Journey descriptions identical | STALE | 5 unique descriptions applied in Run4 (dev SQL + prod PUT) |
| 18 | R2-M11 | MEDIUM | Search lacks count/pagination | **FIXED** | Count line + 24/page client pagination + "showing first 1000" cap notice; fetch limit raised to 1000 |
| 19 | R2-M12 | MEDIUM | No Light/Dark toggle | BY-DESIGN | Site is dark-only per user decision (NEW-002, Run4) |
| 20 | R2-M13 | MEDIUM | CSP blocks inline styles | INVALID | style-src has 'unsafe-inline'; 0 violations on live |
| 21 | R2-M14 | MEDIUM | Approvals no Reject action | STALE | Reject button present since earlier run |
| 22 | R2-M15 | MEDIUM | Count volatile 1951→1928 | EXPLAINED | July dedup/empty-taxonomy cleanup; documented in CHANGELOG |
| 23 | R2-M16 | MEDIUM | Feedback widget on admin | PLATFORM | Replit dev-preview injection; zero app code |
| 24 | R2-M17 | MEDIUM | Users tab no search | **FIXED** | Server `?q=` filter (ilike on email/name) + wired search box |
| 25 | R2-M18 | MEDIUM | Resources no bulk actions | **FIXED** | Bulk select + bulk approve/reject + bulk delete with confirm dialog |
| 26 | R2-M19 | MEDIUM | Footer no navigation | **FIXED** | Footer nav (Home/Categories/Journeys/Submit/About) + copyright |
| 27 | R2-M20 | MEDIUM | /about minimal content | STALE | 744 words server-rendered |
| 28 | R2-M21 | MEDIUM | Filter tags not on resources | INVALID | Filter panel reads metadata tags — working as designed |
| 29 | R2-M22 | MEDIUM | "+0 pending" confusing copy | **FIXED** | Sublabel only renders non-zero parts ("+N pending · N rejected") |
| 30 | R2-M23 | MEDIUM | Descriptions truncated mid-word | **FIXED** | Word-boundary truncation at 90 chars with ellipsis |
| 31 | R2-M24 | MEDIUM | No breadcrumbs | STALE | Breadcrumbs live since earlier run |
| 32 | R2-M25 | MEDIUM | Sort doesn't persist refresh | **FIXED** | Sort syncs to `?sort=` URL param (whitelisted values), read on load |
| 33 | R2-M26 | MEDIUM | Link Health Audit unclear | NOT-A-DEFECT | Dashboard shows status/history/run controls |
| 34 | R2-M27 | MEDIUM | No password strength meter | **FIXED** | 4-segment strength meter (length + char-class scoring) on /register |
| 35 | R2-M28 | MEDIUM | Recommendations no loading state | STALE | Loading state present |
| 36 | R2-L01 | LOW | No back-to-top button | **FIXED** | Floating button appears after 600px scroll, smooth-scrolls to top |
| 37 | R2-L02 | LOW | No favicon | STALE | Favicon present |
| 38 | R2-L03 | LOW | Feedback widget attachments | PLATFORM | Same Replit-injected widget as M16 |
| 39 | R2-L04 | LOW | Only Replit SSO shown | BY-DESIGN | Replit SSO covers GitHub/Google/Apple/X; labeled in UI |
| 40 | R2-L05 | LOW | /reset-password untested | NOT-A-DEFECT | Route exists and functions |
| 41 | R2-L06 | LOW | No way to clear tags | STALE | Clear-tags control present |
| 42 | R2-L07 | LOW | No drag-and-drop reorder | DECLINED | Low value / high effort — reported to user |
| 43 | R2-L08 | LOW | No user list export | **FIXED** | GET /api/admin/users/export CSV (admin-only, formula-injection guarded, no password data) |
| 44 | R2-L09 | LOW | Bookmark button for anon users | **FIXED** | Favorite/bookmark buttons now visible to anon on cards + detail; click → "Sign in to…" toast |
| 45 | R2-L10 | LOW | No recent searches | **FIXED** | localStorage recent searches (max 5, dedupe) in ⌘K dialog with clear button |
| 46 | R2-L11 | LOW | Card click area limited | STALE | Whole card clickable |
| 47 | R2-L12 | LOW | Enrichment no pause/cancel | STALE | Cancel control present |
| 48 | R2-L13 | LOW | No admin error boundary | **FIXED** | ErrorBoundary component wraps all 15 admin tab panels (per-tab retry) |
| 49 | R2-L14 | LOW | Mobile sidebar not collapsible | STALE | Collapsible sidebar live |
| 50 | R2-L15 | LOW | Suggest Edit untested | NOT-A-DEFECT | Verified in prior runs |
| 51 | R2-L16 | LOW | No skip-link focus indicator | STALE | Fixed in earlier run |
| 52 | R2-L17 | LOW | Admin tabs no kbd shortcuts | DECLINED | Low value / high effort — reported to user |
| 53 | BUG-009 | HIGH | /explore returns 404 | STALE | 301 → /search live |
| 54 | BUG-021 | MEDIUM | Sitemap duplicates | STALE | 0 duplicates live |
| 55 | BUG-039 | MEDIUM | No nextCursor | STALE | `?cursor=` + `nextCursor` shipped in Run4 |
| 56 | BUG-100 | HIGH | Share button broken | STALE | Duplicate of H07; works live |

## Verification evidence
- **tsc**: clean (0 errors) after all changes.
- **curl** (dev): `/api/tags` 200 (1,759 tags with counts); `/api/admin/users` + `/export` 401 unauth / 200 authed; `?q=admin` filters correctly; CSV has no password column; `/api/resources?search=video&limit=1000` returns 1000/1125.
- **Playwright** (`scripts/run5-verify-dev.mjs`): phase 1 — 7/7 PASS (footer, copyright, truncation, sort URL param + refresh persistence, back-to-top appear + scroll). Phase 2 — 10/10 PASS (search count/pagination page 1→2, strength meter, recent searches save + clear, anon bookmark toast, admin login, M22 copy, error boundaries mount clean).
- **Architect review**: PASS — auth gating, SQLi (bound ilike params), CSV formula-injection ordering, and password-leak checks all confirmed clean. Its one actionable note (displayed total vs 1000-cap mismatch) fixed and re-verified live ("1125 results · showing first 1000 · page 1 of 42").
