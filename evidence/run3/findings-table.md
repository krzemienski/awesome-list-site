# Run3 Audit Remediation — Per-Finding Evidence Table (Task #135)

Date: 2026-07-12. Spec: `attached_assets/Pasted--remediation-mission-You-are-working-in-the-codebase-th_1783873764173.txt` (30 finding IDs: R3-01..R3-31, no R3-20 in spec).
All proof is real-system (Iron Rule): live prod admin API + read-only prod SQL, dev curl, Playwright real-browser sweeps (`scripts/run3-verify-dev.mjs`, `scripts/run3-verify-csp.mjs`), local production build for CSP.

**Prod data state after cleanup (independent read-only SQL, 2026-07-12):** approved=1931; slug-titles=0, fragment-#-URLs=0, QA artifacts=0, desc<20=0, HTML-entities=0, emails-in-desc=0, dup-URL clusters=0. `/api/categories` sum = 1931 = approved total (PARITY). Journal: `evidence/run3/prod-cleanup-journal.json` (2 deletes, 19 dup-loser rejects, 1 journey-step repoint, ~264 title/desc updates; resumable state in `prod-cleanup-state.json`).

**Dev browser sweep:** 8/8 PASS (`run3-verify-dev.mjs`). **CSP local prod build:** 6/6 routes PASS, 0 violations (`run3-verify-csp.mjs`).

| ID | Sev | Finding | Resolution | Evidence |
|----|-----|---------|------------|----------|
| R3-01 | HIGH | Admin TOTAL RESOURCES counts rejected+pending | Admin stats card bound to public/approved count; splits labeled | Dev parity: public total 1823 == categories sum 1823 (9 cats); prod: approved 1931 == categories sum 1931 (SQL + API) |
| R3-02 | HIGH | /admin/users,/resources,/categories deep-links 404 | Client `/admin/:section` routes + server known-route set | Browser PASS: `/admin/resources` lands on Resources tab (activeTab="Resources"); unauth server 302→/login |
| R3-07 | HIGH | Placeholder "Introduction" descriptions | Import gate rejects heading-only/byline/short descriptions (`server/github/importHygiene.ts`); prod rows updated | Prod SQL: desc<20 = 0; journal updates in `prod-cleanup-journal.json` |
| R3-12 | HIGH | Admin "Resources" tab ejects to public home | Tab rewired to in-admin resource manager | Browser PASS: all 15 admin tabs clicked, 15/15 stayed on /admin |
| R3-13 | HIGH | "back to top" anchor live as approved resource | Import rejects fragment-only URLs/nav anchors; junk row 186689 deleted from prod | Prod SQL: fragment-#-URLs = 0; delete journaled |
| R3-14 | HIGH | Recommendations page empty though API returns items | Response-shape handling fixed | Browser PASS: /recommendations renders resource links; `/api/recommendations` returns real resource objects (curl) |
| R3-24 | HIGH | ~17 duplicate clusters re-imported by sync | Import de-dupes by normalized URL+title (incl. link.medium.com resolution); 19 dup losers rejected in prod | Prod SQL: dup-URL clusters = 0; journal rejects; step 168 repointed to keeper 186145 |
| R3-03 | MED | QA/audit artifacts in production | QA rows purged via admin API (188026 deleted etc.) | Prod SQL: QA artifacts = 0; journal |
| R3-04 | MED | /submit method=get + unnamed category select | Form POST semantics; visible Select trigger labeled via FormLabel/FormControl (hidden Radix native select is aria-hidden, N/A to AT) | Browser PASS: 1/1 visible combobox accessibly named |
| R3-05 | MED | sitemap.xml duplicate entries (18) | Sitemap generation de-duplicated | Dev: 2029 `<loc>` entries, 0 duplicates |
| R3-06 | MED | /api/resources caps at 200, no cursor | Documented offset paging + `nextOffset` | Dev: `?limit=200` → items 200, total 1823, nextOffset 200; full-catalog reachability proven in T008 |
| R3-15 | MED | Duplicate resource twice in search/metrics | Resolved by R3-24 dedup | Prod SQL: dup clusters = 0 |
| R3-16 | MED | Admin per-category counts inflated | Bound to public `/api/categories` resourceCount | Same parity evidence as R3-01 |
| R3-17 | MED | Conflicting totals 1951/2109/2052, 9 vs 10 cats | Export/validation reads the same public source | Dev: validate 1823/9 == public 1823/9; prod 1931/9 everywhere |
| R3-18 | MED | CSP blocks inline styles site-wide | style-src adjusted deliberately for the nonce CSP | Local prod build (NODE_ENV=production dist/index.js): 6 routes, 0 CSP violations, all render |
| R3-25 | MED | 441 raw owner/repo slug titles | Import humanizes titles; prod rows backfilled | Prod SQL: slug-titles = 0; ~264 journaled updates |
| R3-26 | MED | HTML entities render literally | Import decodes entities; prod rows fixed | Prod SQL: entity-in-desc = 0 |
| R3-27 | MED | Personal email exposed in descriptions | Scrubbed; import gate | Prod SQL: emails-in-desc = 0 |
| R3-28 | MED | 27 too-short/empty descriptions | Approval gate + backfill | Prod SQL: desc<20 = 0 |
| R3-08 | LOW | /signup 404 | Server 301 → /register | curl: `/signup` → 301 `/register` |
| R3-09 | LOW | /explore + /resource?q= 404 | 301 → /search (query preserved) | curl: `/explore` → 301 `/search`; `/resource?q=test` → 301 `/search?q=test` |
| R3-10 | LOW | /logout 404 | /logout clears session, 302 → / | curl: `/logout` → 302 `/` |
| R3-11 | LOW | GCP infra headers leak | Platform-controlled (documented, not app-fixable) | Out of app scope per task plan |
| R3-19 | LOW | Replit feedback widget unstyled under CSP | Widget is platform-injected; app CSP verified clean; widget limitation documented | CSP proof 0 violations from app code; widget documented not-fixable |
| R3-21 | LOW | "Claude AI" recs uniform hardcoded 75% | Labels made truthful (no AI over-claim on rule-based recs) | Browser PASS: no "Powered by Claude" claim text on /recommendations |
| R3-22 | LOW | Database panel hardcoded "2,011" | Stale copy replaced with live count | Same parity family as R3-01 (T002) |
| R3-23 | LOW | 992 HTTP-not-HTTPS lint warnings | http→https upgraded where host serves HTTPS during cleanup | Journaled URL updates in `prod-cleanup-journal.json` |
| R3-29 | LOW | 404 page renders full 219-link sidebar | Lean NotFound layout | Browser PASS: h1 "Page Not Found", 0 sidebars, home link present; server returns real 404 status |
| R3-30 | LOW | Journey steps not actionable / no linked resources | Steps grouped by stepNumber link resources (`/resource/:id` + external) | Browser PASS: /journey/7 shows 18 resource links; prod step 168 repointed (prod HAS 89 steps) |
| R3-31 | LOW | Category cards onclick, not anchors | Real stretched-link anchors in ResourceCard AND Category.tsx inline cards (all 3 view modes) | Browser PASS: 24 `/resource/` anchors on /category/encoding-codecs |

## Final gate (dev + prod SQL)
- 0 slug-titles, 0 #-URLs, 0 dup clusters, 0 desc<20, 0 '@'/entities — prod SQL verified ✔
- Sitemap unique locs ✔ (0 dups / 2029)
- admin == public PARITY ✔ (dev 1823, prod 1931)
- 15 admin tabs stay on /admin ✔
- tsc clean ✔; `npm run build` OK ✔; local prod build CSP 0 violations ✔

## Republish required
Code fixes (routing, admin tabs, recommendations, cards-as-anchors, CSP, import hygiene, paging, sitemap) reach production only after republish. Prod DATA cleanup is already live (applied via admin API). Final live-prod re-proof after republish.

## Live-prod re-proof after republish (Task #136, 2026-07-12)

App republished; every check re-run directly against https://awesome.video.

**Scripted sweeps — all PASS:**
- `run3-verify-csp.mjs` vs prod: 6/6 routes, 0 CSP violations (R3-18/19).
- Anonymous browser sweep (`run3-verify-prod-anon.mjs`): 8/8 PASS — lean 404 w/ real 404 status (R3-29), recommendations render + truthful labels (R3-14/21), journey resource links (R3-30), card anchors (R3-31), search face, search→detail→visit href, no mobile overflow @390px.
- Admin-authed sweep (`run3-verify-dev.mjs` @ prod, real admin login): 8/8 PASS — `/admin/resources` deep-link lands on Resources tab (R3-02), all 15 admin tabs stay on /admin (R3-12), submit select accessibly named (R3-04).
- Redirects (curl): `/signup`→301 `/register` (R3-08), `/explore`→301 `/search` + `/resource?q=hls`→301 `/search?q=hls` (R3-09), `/logout`→302 `/` (R3-10), `/zzz`→404 status; unauth `/admin/*`→302 `/login`.
- Paging (R3-06): `nextOffset` paged the full catalog — unique ids == `total` == `/api/categories` sum.

**Residuals found live and fixed via admin API (journal: `.local/prod-cleanup/task136-residual-fixes.json`):**
- R3-03: pending QA artifact 187918 (`__qa_test_…_DO_NOT_DELETE`) had survived (cleanup's pattern missed it) — DELETED; pending queue now 0.
- R3-24/15: 3 true cross-domain dup copies had survived the title+domain gate — REJECTED (kept canonical): 188028 link.medium.com short-URL copy of 186425 (netflixtechblog); 186146/186147 medium.com mirrors of blog.twitch.tv originals 185759/185760. Searches now return exactly one card per article; shortener URLs now 0.

**Final prod gates (canonical `importHygiene` functions over all approved rows — `run3-prod-gates.ts`):**
approved=1928; junk=0, slug-titles=0, entities=0, emails=0, desc<20=0, dup-URL clusters=0, dup title+domain clusters=0, shorteners=0. Parity: `/api/resources` total == `/api/categories` sum == 1928. Sitemap: 2080 locs, 0 dups. Admin stats: totalPublic 1928, pendingApprovals 0.

**Known residual (not fixable from here):** 2 QA users (`__qa_test_*@example.invalid`) remain in the prod Users list — there is no admin user-delete endpoint and the prod DB is read-only from the workspace; needs a small code change (DELETE `/api/admin/users/:id`) + republish, then purge (R3-03 users criterion).
