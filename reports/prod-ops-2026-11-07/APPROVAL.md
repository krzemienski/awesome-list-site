# awesome.video: what matters, and the flow to keep it working (approval package)

Prepared 2026-11-07, about 22:00Z, by the lead (session dc34fc30), on production revision **1cd25ab0** (`/api/version` == origin/main; published 18:52:55Z; booted 18:52:43Z).
Nothing in this package has been built, deployed or written to PostHog. The only production writes were QA rows, each undone and read back (see lane write logs).

**How to approve:** answer the numbered decisions in §9 with one word each (`yes`, `no`, or an edit). You can also strike or edit any line. Phase 5 runs only the items you approve, in the order in §6.

## 0. The answer in five lines
1. **Real use is concentrated in public browsing, sign-up, submission, and the owner's curation work.** Members barely use member features: in 90 days there were 0 real bookmarks, favorites, collections, API keys or digest opt-ins. Bots read more pages than people; AI crawlers are the largest group.
2. **Nothing Primary is broken on 1cd25ab0.** Revision 1cd25ab0 shows 0 errors and 0 5xx across 1,530 log records. Every visitor, member and admin function loads at 390, 768 and 1280.
3. **The defects that matter:**
   - Signed-in pages auto-fire a paid Claude call (D1).
   - The scheduled DB backup fails without a cause in the log (D2).
   - The external job safety net is not armed (D3).
   - Two layout shifts exceed the 0.1 budget (D4).
   - The sign-in card is clipped on phones (D5).
4. **The contract shrinks the per-deploy surface from "everything" to 104 inventory rows and 57 contracts.** Another 355 rows run weekly, 300 run only when their files change, and 1 row plus 23 dead routes retire.
5. **We cannot yet see 28 or 90 days of anonymous traffic.** Every vendor source is blocked on owner access. The cheapest fix is to persist the first-party document counters that already run (W1).

## 1. Evidence base
| lane | file | what it is |
|---|---|---|
| visitor | `lanes/visitor.md` | 13 routes, palette, consent (incl. a real non-webdriver Chrome), outbound links, SEO/SSR (34 samples), loading/error/offline, keyboard; 3 widths |
| member | `lanes/member.md` | 12 member routes, 3 widths; writes on QA rows / the audit member, all undone; 0 escaped paid calls |
| admin | `lanes/admin.md` | 18 tabs populated; guest-denied; exports; QA approve/reject windows |
| analytics | `lanes/analytics.md` | source status, instrumentation facts with file:line, 28/90-day usage with test accounts separated |
| logs | `lanes/logs.md` | 20,494 records pulled unattended; top errors → code; 3 health snapshots; signal inventory |
| function-map | `lanes/function-map.md` | 105 functions, nav reachability, 760/760 rows and 210/210 contracts assigned, dependency versions |
| prior passes | 07b lanes (`.claude/worktrees/prod-primary/reports/prod-primary-2026-11-07b/lanes/`), `reports/prod-ops-2026-11-06/` | re-checked rather than redone; 07b ran on 60e07dcf, whose only diff to 1cd25ab0 is a dev-only CSP line |

**Blocked sources (owner access):**
- PostHog: OAuth at `/mcp` → `plugin:posthog:posthog`.
- Replit MCP: OAuth at `/mcp` → `replit`.
- GA4 and Search Console: `owner-analytics-steps.md` §2-3.
- Replit Analytics (Umami) screenshots: §1.
- Mixpanel and Amplitude: credentials.

Every tier below that rests on usage says which source it used. "No usage data" means none of the reachable sources covers that function.

**Lead corrections to lane claims:**
- Visitor S-1 ("robots.txt has no Sitemap line") is **withdrawn**. A live `curl` shows `Sitemap: https://awesome.video/sitemap.xml` at line 24; the lane's saved copy was incomplete.
- Visitor S-3 ("/submit has 2 meta descriptions") is **withdrawn**. There is one `name="description"`, plus og: and twitter: variants.
- The 07b claim that the anonymous `GET /api/recommendations` calls Claude is **not supported** by code. The anonymous profile has empty history (`journeys-recommendations.ts:690-704`), so it takes the cold-start path (`server/ai/recommendationEngine.ts:376-379`). This was not driven.

## 2. Feature classification (105 functions)
Tier rules:
- **Primary:** real visitors or members depend on it, or SEO depends on it.
- **Owner-critical:** the owner needs it to run the site.
- **Secondary:** low use, keep it working.
- **Vestigial:** no real use in any reachable source over 90 days.

Usage sources:
- "DOC" = first-party page-document counters since boot (18:52-20:30Z). They separate bots by class, but our audit lanes count as humans, so human figures are upper bounds.
- "real" = `/api/admin/usage` and the audit log, with the test-account heuristic.

"Rows T1/T2/T3" shows where the function's inventory rows land under §3.

| id | function | tier | evidence: usage 28 d / 90 d · nav clicks · audience | state on 1cd25ab0 | recommendation | rows T1/T2/T3 · contracts |
|---|---|---|---|---|---|---|
| F-DISC-01 | Home dashboard (SSR for anonymous, SPA otherwise) | Primary | DOC home 42 human / 68 bot · 0 · visitor, member | works; CLS 0.107 at 1280 (D4) | Tier 1 per-deploy | 9/0/0 · 1 |
| F-DISC-02 | Categories index | Primary | no usage data · 1 · visitor | works (lane files) | Tier 1 per-deploy | 2/0/0 · 0 |
| F-DISC-03 | Category page and shared taxonomy listing template (filters, | Primary | DOC category 15 h / 11 bot · 1 · visitor | works; CLS 0.222 at 768 on /subcategory/codecs (D4) | Tier 1 per-deploy | 9/0/0 · 0 |
| F-DISC-04 | Subcategory page | Primary | DOC subcategory 10 h / 25 bot · 1 or 2 · visitor | works; CLS-1 (D4) | Tier 1 per-deploy | 0/0/0 · 0 |
| F-DISC-05 | Sub-subcategory page | Primary | DOC sub-sub 7 h / 7 bot · 3 · visitor | works (lane files) | Tier 1 per-deploy | 0/0/0 · 0 |
| F-DISC-06 | Tag landing page | Primary | DOC tag 29 h / 22 bot · 2; also sitemap and README anchors · visitor | works (lane files) | Tier 1 per-deploy | 4/1/0 · 0 |
| F-DISC-07 | Resource detail page, outward link, related resources | Primary | DOC resource 106 h / 286 bot (AI 168); 10/10 outbound hosts 200 · 1 · visitor, member | works (lane files) | Tier 1 per-deploy | 7/0/0 · 2 |
| F-DISC-08 | About page | Secondary | no usage data · 1 · visitor | works (lane files) | Tier 2 weekly | 0/3/0 · 0 |
| F-DISC-09 | Terms, Privacy, Code of conduct | Primary | no usage data · 1 · visitor | works (lane files) | Tier 1 per-deploy | 1/0/0 · 0 |
| F-DISC-10 | Sidebar (desktop, rail, mobile drawer) | Primary | no usage data · 0 desktop; 1 on mobile · visitor, member, admin | works (lane files) | Tier 1 per-deploy | 8/0/0 · 0 |
| F-DISC-11 | Legacy and bare-prefix redirects (client and server mirror) | Primary | no usage data · no nav entry · visitor | works (lane files) | Tier 1 per-deploy | 1/0/0 · 0 |
| F-DISC-12 | SSR, meta, canonical, JSON-LD, sitemap, robots, OG image, se | Primary | 4,759 sitemap URLs; bots 62% of documents; search-engine bots only 16 · 1; crawlers direct · visitor, crawler | works (lane files) | Tier 1 per-deploy | 2/0/0 · 5 |
| F-DISC-13 | App shell: header, footer, breadcrumb, skip link, back-to-to | Primary | no usage data · 0 · visitor, member, admin | works (lane files) | Tier 1 per-deploy | 10/1/0 · 0 |
| F-DISC-14 | Catalog read APIs (system function behind every listing) | Primary | no usage data · n/a · system | works (lane files) | Tier 1 per-deploy | 0/0/0 · 9 |
| F-SRCH-01 | Command palette (button, Cmd/Ctrl+K, "/") | Primary | no usage data · 1 or 0 · visitor | works (lane files) | Tier 1 per-deploy | 6/0/0 · 0 |
| F-SRCH-02 | Search page (query, results grid, empty and error states) | Primary | DOC search 6 h · 1 or 2 · visitor | works (lane files) | Tier 1 per-deploy | 5/0/0 · 0 |
| F-SRCH-03 | Search filters and facets | Secondary | no usage data · 2 · visitor | works (lane files) | Tier 2 weekly | 0/3/0 · 0 |
| F-SRCH-04 | Search sort, pagination, URL sync | Secondary | no usage data · 2 · visitor | works (lane files) | Tier 2 weekly | 0/2/0 · 0 |
| F-SRCH-05 | Search typo suggestion (fuzzy) | Secondary | no usage data · 2 · visitor | works (lane files) | Tier 2 weekly | 0/1/0 · 0 |
| F-SRCH-06 | Home search field | Primary | no usage data · 0 · visitor | works (lane files) | Tier 1 per-deploy | 1/0/0 · 0 |
| F-SRCH-07 | Search backend and hostile-input handling (markup scrub, ove | Primary | no usage data · n/a · visitor, system | works (lane files) | Tier 1 per-deploy | 0/0/0 · 1 |
| F-RESIL-01 | 404 page, route suggestions, dead-link beacon | Primary | no usage data · no nav entry · visitor | 404/410 OK; 1 dead-link POST per visit | Tier 1 per-deploy | 1/0/0 · 1 |
| F-RESIL-02 | Offline state | Secondary | no usage data · n/a · visitor | works (lane files) | Tier 2 weekly | 0/0/0 · 0 |
| F-RESIL-03 | Lazy-route and chunk-load recovery | Secondary | no usage data · n/a · visitor | works (lane files) | Tier 2 weekly | 0/1/0 · 0 |
| F-RESIL-04 | Error cards and Retry (StatePanel, ErrorPage, ErrorBoundary) | Secondary | no usage data · n/a · visitor | works (lane files) | Tier 2 weekly | 0/0/0 · 0 |
| F-RESIL-05 | Slow-network fallback (skeletons, RouteFallback, SSR hold) | Secondary | no usage data · n/a · visitor | works (lane files) | Tier 2 weekly | 0/0/0 · 0 |
| F-RESIL-06 | Health, version, OpenAPI, docs | Primary | no usage data · no nav entry · system, developer | works (lane files) | Tier 1 per-deploy | 2/0/0 · 7 |
| F-RESIL-07 | API fallbacks: 405 stubs, unknown /api 404, backstop limiter | Secondary | no usage data · no nav entry · visitor, system | works (lane files) | Tier 2 weekly | 0/0/0 · 1 |
| F-TEL-01 | Consent banner and footer "Cookie settings" | Primary | decline: 0 vendor requests (390/1280); accept: all 4 SDKs + Umami fire · 0; 1 · visitor | works (lane files) | Tier 1 per-deploy | 1/0/0 · 0 |
| F-TEL-02 | Vendor events after consent (GA4, Mixpanel, PostHog, Amplitu | Secondary | consent-gated; no read access to any vendor · 0 · visitor, member | fires after accept (real Chrome) | Tier 2 weekly | 0/0/0 · 0 |
| F-TEL-03 | Replit/Umami cookieless page views | Secondary | no usage data · 0 · visitor | works (lane files) | Tier 2 weekly | 0/0/0 · 0 |
| F-TEL-04 | Admin and QA suppression of analytics | Secondary | no usage data · 0 · admin | works (lane files) | Tier 2 weekly | 0/0/0 · 0 |
| F-TEL-05 | Web vitals, api_performance and error events (client) | Secondary | no usage data · 0 · visitor | works (lane files) | Tier 2 weekly | 0/0/0 · 0 |
| F-TEL-06 | Server-recorded interactions (view rows that feed recommenda | Secondary | interactions 4 / 10 real users (183 test 28 d) · 1 · member | works (lane files) | Tier 2 weekly | 0/0/0 · 1 |
| F-OBS-01 | First-party operational telemetry, request logging, log sink | Owner-critical | health 200; 3 snapshots, 0 query errors · 0; shown in Overview System health · system, admin | works; retention ~18 h, 2000/h cap (D13) | Tier 1 per-deploy (admin session) | 0/0/0 · 0 |
| F-AUTH-01 | Sign-up (Clerk) | Primary | 21 / 39 real sign-ups · 3 · visitor | works; Clerk card clipped at 390 (D5) | Tier 1 per-deploy | 1/0/0 · 0 |
| F-AUTH-02 | Sign-in (Clerk) | Primary | sign-ups imply sign-in; login count: no source (auth.* rows dead since 2026-08-10) · 2 · visitor | works; card clipped at 390 (D5) | Tier 1 per-deploy | 2/0/0 · 0 |
| F-AUTH-03 | Owner/admin password sign-in and admin sign-out | Owner-critical | no usage data · no nav entry from Home · admin | works (lane files) | Tier 1 per-deploy (admin session) | 3/0/2 · 2 |
| F-AUTH-04 | Sign-out and sign out all devices | Secondary | no usage data · 2 · member, admin | works (lane files) | Tier 2 weekly | 0/1/2 · 1 |
| F-AUTH-05 | Session persistence, current user, stale-session gate | Primary | no usage data · 0 · member, admin | works (lane files) | Tier 1 per-deploy | 1/0/0 · 1 |
| F-AUTH-06 | Protected-route guards (client AuthGuard/AdminGuard, server  | Primary | no usage data · no nav entry · visitor, member, admin | works; AdminGuard says "expired" on fetch fail (D6) | Tier 1 per-deploy | 2/2/1 · 0 |
| F-AUTH-07 | Legacy auth redirects keeping validated ?next= | Secondary | no usage data · no nav entry · visitor | works (lane files) | Tier 2 weekly | 0/0/0 · 0 |
| F-AUTH-08 | Password reset (Clerk flow from sign-in) | Secondary | no usage data · 3 · visitor | works (lane files) | Tier 2 weekly | 0/0/0 · 0 |
| F-AUTH-09 | API authorization contract (401 anon, 403 non-admin on every | Primary | no usage data · n/a · system | works (lane files) | Tier 1 per-deploy | 0/0/0 · 0 |
| F-AUTH-10 | Clerk frontend-API proxy | Primary | no usage data · 0 · system | works (lane files) | Tier 1 per-deploy | 0/0/0 · 0 |
| F-MCON-01 | Submit a resource (form, URL pre-check, draft) | Primary | 13 / 24 real submitters (16 / 28 rows) · 1 · member | works (lane files) | Tier 1 per-deploy | 1/1/3 · 2 |
| F-MCON-02 | Suggest an edit dialog | Vestigial | 0 / 0 real (1 ever; 116 of 117 test in 11-06) · 2 · member | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk medium (only visitor fix path) | 0/0/1 · 1 |
| F-MCON-03 | My contributions (list, filter, withdraw) | Secondary | 21 real withdrawals 28 d · 3; also after submit · member | works (lane files) | Tier 2 weekly | 0/3/2 · 2 |
| F-MCON-04 | Bookmarks library (add/remove, notes, state, bulk, list) | Vestigial | 0 / 0 real (0 ever) · 2 · member | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk medium (core member promise) | 0/0/11 · 5 |
| F-MCON-05 | Favorites (button, profile tab) | Vestigial | 0 / 0 real (0 ever) · 1 ; 3 · member | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk low | 0/0/2 · 3 |
| F-MCON-06 | Guest bookmarks (localStorage, cap 50) | Secondary | no usage data · 2 · visitor | works (lane files) | Tier 2 weekly | 0/1/0 · 0 |
| F-MCON-07 | Guest-bookmark merge on sign-in | Vestigial | 0 real bookmarks to merge · 0 · member | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk low | 0/0/2 · 0 |
| F-MCON-08 | Collections (create, rename, reorder, items, publish) | Vestigial | 0 / 0 real (0 ever) · 3 · member | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk low | 0/0/7 · 9 |
| F-MCON-09 | Public shared collection | Vestigial | 0 collections exist · no nav entry · visitor | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk low (share links break) | 0/0/1 · 1 |
| F-MCON-10 | Report a broken link | Vestigial | 0 reports ever · 2 · member | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk low | 0/0/1 · 2 |
| F-MACC-01 | Profile (tabs, name edit, progress) | Secondary | no usage data · 2 · member | works (lane files) | Tier 2 weekly | 0/2/1 · 2 |
| F-MACC-02 | Account deletion request and withdraw | Secondary | no usage data · 3 · member | works (lane files) | Tier 2 weekly | 0/3/0 · 2 |
| F-MACC-03 | Personal API keys | Vestigial | 0 / 0 real keys (38 test 28 d) · 3 · member | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk medium (pairs with F-MACC-14) | 0/0/2 · 3 |
| F-MACC-04 | Settings hub, home layout, learning preferences | Secondary | no usage data · 2 · member (guest sees sign-in) | works (lane files) | Tier 2 weekly | 0/5/2 · 3 |
| F-MACC-05 | Notifications inbox, notification preferences, digest previe | Vestigial | 0 / 0 real digest opt-ins; 0 notifications read · 2 · member | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk medium (digest email) | 0/0/7 · 7 |
| F-MACC-06 | Digest unsubscribe page (email link, token) | Secondary | no usage data · no nav entry · visitor (token) | works (lane files) | Tier 2 weekly | 0/0/1 · 2 |
| F-MACC-07 | Onboarding (5 steps) | Secondary | no usage data · 1; else direct URL · member | works; stale local draft reopens step 2 (D9) | Tier 2 weekly | 0/4/4 · 0 |
| F-MACC-08 | Journeys list | Secondary | DOC journeys 3 h; enrolments 0/0 real (3 ever) · 1 · visitor, member | works (lane files) | Tier 2 weekly | 0/3/0 · 1 |
| F-MACC-09 | Journey detail, enrol, step progress | Secondary | DOC journey 4 h; enrolment 0/0 real · 2 · visitor read, member write | works (lane files) | Tier 2 weekly | 0/7/0 · 4 |
| F-MACC-10 | Continue learning (page and Home preview) | Secondary | no usage data · 1 · member | works (lane files) | Tier 2 weekly | 0/6/0 · 2 |
| F-MACC-11 | Recommendations page, panel, feedback | Secondary | feedback events 31 non-test 28 d; PAID on signed-in load (D1) · 1 · visitor (popular), member (personalised) | works with POST aborted; auto paid call (D1) | Tier 2 weekly | 0/8/2 · 4 |
| F-MACC-12 | Advanced tools (explorer, metrics, export, recommendations t | Secondary | no usage data · 1 · visitor | works (lane files) | Tier 2 weekly | 0/12/0 · 0 |
| F-MACC-13 | Theme settings and design-system showcase | Secondary | no usage data · 1 ; 2 for /design-system · visitor, member | works (lane files) | Tier 2 weekly | 0/3/1 · 0 |
| F-MACC-14 | Public read API with API key | Vestigial | 0 real keys; public-api telemetry group empty · no nav entry · developer | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk medium (external API users) | 0/0/2 · 5 |
| F-MACC-15 | Contact dialog (variant b) and public config | Vestigial | only QA messages (2) · 1 · visitor | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk medium (privacy policy names it) | 0/0/1 · 2 |
| F-ACUR-01 | Admin shell and tab routing | Owner-critical | no usage data · 1 · admin | works (lane files) | Tier 1 per-deploy (admin session) | 1/8/10 · 1 |
| F-ACUR-02 | Overview tab and operations health panel | Owner-critical | loads populated 3 widths · 1 · admin | works (lane files) | Tier 1 per-deploy (admin session) | 2/2/12 · 1 |
| F-ACUR-03 | Approvals queue (approve, reject, bulk) | Owner-critical | 11 approved / 11 rejected 28 d; 0 pending now · 2 · admin | works (lane files) | Tier 1 per-deploy (admin session) | 7/12/7 · 5 |
| F-ACUR-04 | Edit-suggestion queue | Vestigial | 0 pending; 0 real edits 90 d · 2 · admin | degraded: break-all wrap (code) | Tier 3 on-change; removal candidate (Decision 9); removal risk medium (pairs with F-MCON-02) | 0/0/23 · 4 |
| F-ACUR-05 | Resources manager (CRUD, filter, kind, featured, bulk delete | Owner-critical | 4,320 rows; 76 created / 101 updated 28 d · 2 · admin | works (lane files) | Tier 1 per-deploy (admin session) | 14/46/16 · 7 |
| F-ACUR-06 | Categories manager | Secondary | no usage data · 2 · admin | works (lane files) | Tier 2 weekly | 0/16/8 · 4 |
| F-ACUR-07 | Subcategories manager | Secondary | no usage data · 2 · admin | works (lane files) | Tier 2 weekly | 0/17/9 · 4 |
| F-ACUR-08 | Sub-subcategories manager | Secondary | no usage data · 3 · admin | works (lane files) | Tier 2 weekly | 0/17/9 · 4 |
| F-ACUR-09 | AI URL analyser (admin only) | Secondary | no usage data · 3 · admin | admin-only; paid, not run | Tier 2 weekly | 0/0/0 · 1 |
| F-AOPS-01 | Users tab (list, export, rename, role, delete) | Owner-critical | no usage data · 2 · admin | works (lane files) | Tier 1 per-deploy (admin session) | 0/17/9 · 5 |
| F-AOPS-02 | Audit log tab | Secondary | no usage data · 2 · admin | degraded: constant "filter applied" (D11) | Tier 2 weekly | 0/12/6 · 1 |
| F-AOPS-13 | Contact submissions inbox | Vestigial | 2 submissions, both QA · 3 · admin | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk medium | 0/0/10 · 1 |
| F-AOPS-03 | Export tab (JSON, CSV, OPML, markdown) | Secondary | no usage data · 2 · admin | degraded: card pops in (D11) | Tier 2 weekly | 0/8/2 · 4 |
| F-AOPS-04 | Database backups panel (list, create) | Owner-critical | 12 backups, newest 13:47Z; 2 failed runs 11:05Z, 12:35Z · 2 · admin | works; scheduled job failing (D2) | Tier 1 per-deploy (admin session) | 1/1/1 · 2 |
| F-AOPS-05 | Database tab (stats, seed, clear and re-seed) | Secondary | no usage data · 2 · admin | loads; seed forbidden on prod | Tier 2 weekly | 0/5/10 · 1 |
| F-AOPS-06 | Link health dashboard, scan runs, legacy validate/check-link | Secondary | no usage data · 2 · admin | works (lane files) | Tier 2 weekly | 0/22/17 · 8 |
| F-AOPS-07 | Link remediation plan/apply/ignore and reader link reports | Secondary | no usage data · 2 · admin | works (lane files) | Tier 2 weekly | 0/0/9 · 5 |
| F-AOPS-08 | Admin logs and usage APIs (no UI) | Owner-critical | agent read 20,494 records unattended · no nav entry · admin (agent/API) | works (lane files) | Tier 1 per-deploy (admin session) | 0/0/0 · 2 |
| F-AOPS-09 | Digests tab (queue health) | Vestigial | 0 real opt-ins · 3 · admin | works (lane files) | Tier 3 on-change; removal candidate (Decision 9); removal risk low | 0/0/7 · 1 |
| F-AOPS-10 | GitHub sync tab (import, export, status, history, dry-run pr | Vestigial | idle since 2025-11-18 · 2 · admin | loads; not run (group 4) | Tier 3 on-change; removal candidate (Decision 9); removal risk low-medium (sync back to GitHub list) | 0/0/24 · 5 |
| F-AOPS-11 | QA row cleanup (agent tool, no UI) | Owner-critical | no usage data · no nav entry · admin (agent) | works (lane files) | Tier 1 per-deploy (admin session) | 0/0/0 · 2 |
| F-ARES-01 | Researcher tab: brief, config, launch | Secondary | 109 jobs; 20 test research_started 28 d · 2 · admin | loads; launch paid, not run | Tier 2 weekly | 0/22/3 · 3 |
| F-ARES-02 | Research runs: list, view, events, cancel | Secondary | no usage data · 3 · admin | works (lane files) | Tier 2 weekly | 0/9/10 · 4 |
| F-ARES-03 | Research discoveries review (approve, reject, approve all) | Secondary | no usage data · 3 · admin | works (lane files) | Tier 2 weekly | 0/7/3 · 4 |
| F-ARES-04 | Research workspace tab | Secondary | no usage data · 2 · admin | works (lane files) | Tier 2 weekly | 0/4/6 · 0 |
| F-ARES-05 | Batch enrichment tab (start, jobs, events, cancel, coverage) | Secondary | 36 jobs, last 2026-11-06; ai_enriched 42 28 d · 2 · admin | loads; run paid, not run | Tier 2 weekly | 0/18/14 · 6 |
| F-ARES-06 | Admin journeys and steps manager | Secondary | no usage data · 3 · admin | works (lane files) | Tier 2 weekly | 0/16/13 · 7 |
| F-JOB-01 | Link health scheduler and auto-remediation after scan | Owner-critical | daily scan completed (T1-18) · n/a · system | works (lane files) | Tier 1 per-deploy (admin session) | 0/0/0 · 0 |
| F-JOB-02 | Digest scheduler and email send | Secondary | no usage data · n/a · system | hourly cycle logs finished | Tier 2 weekly | 0/0/0 · 0 |
| F-JOB-03 | Contact retention purge | Secondary | no usage data · n/a · system | works (lane files) | Tier 2 weekly | 0/0/0 · 0 |
| F-JOB-04 | Scheduled DB backup with advisory lock and pruning | Owner-critical | 2 failures today, cause not logged · n/a · system | 2 failures today (D2) | Tier 1 per-deploy (admin session) | 0/0/0 · 0 |
| F-JOB-05 | External cron endpoint run-due-jobs | Owner-critical | 503 at 09:51Z: OPS_CRON_TOKEN unset · n/a · system | 503 (D3) | Tier 1 per-deploy (admin session) | 0/0/0 · 1 |
| F-JOB-06 | Orphan job watchdog (enrichment, research, GitHub sync) | Secondary | no usage data · n/a · system | works (lane files) | Tier 2 weekly | 0/0/0 · 0 |
| F-JOB-07 | Boot sequence: migrations, auto-seed, kind backfill, SSR pre | Owner-critical | no usage data · n/a · system | works (lane files) | Tier 1 per-deploy (admin session) | 0/0/0 · 0 |
| F-XCUT-01 | Cross-cutting UX/a11y sweeps (keyboard, reduced motion, targ | Secondary | no usage data · n/a · all | works (lane files) | Tier 2 weekly | 0/23/4 · 0 |

Totals: 27 Primary, 14 Owner-critical, 49 Secondary, 15 Vestigial.

Why Primary looks the way it does:
- 62% of 685 page documents were bots, and AI crawlers fetched 168 resource pages in 98 minutes. The catalog pages, SSR, meta and sitemap (F-DISC-*, F-DISC-12) are how the site gets found and cited, so they are Primary even where the human count is small.
- Sign-up (21 real in 28 d) and submission (13 real submitters in 28 d) are the only member actions with real volume.

## 3. The contract: what has to work
Before: every sweep validated all 760 inventory rows and the "196 HTTP contracts". That count is not reproducible; the registry has 210 today (200 at audit SHA 130e5829).

| | Tier 1 per-deploy | Tier 2 weekly | Tier 3 on-change | Retired | Total |
|---|---|---|---|---|---|
| inventory rows | **104** | 355 | 300 | 1 (C6-MB-081, no live function) | 760 |
| HTTP contracts | **57** | 81 | 49 | 23 (no live caller, `function-map.md` §2.2) | 210 |

Mapping rule, applied by script (`tiers.tsv` + `tier-rows.tsv`):
- A Vestigial function's rows go to Tier 3.
- A row the 11-06 retier marked `retire` goes to Tier 3.
- A Primary or Owner-critical row goes to Tier 1 only if 11-06 marked it `per-deploy` or gave it a Tier 1 check; otherwise it goes to Tier 2.
- Rows outside the 11-06 retier follow their function's tier.
- Contracts follow their function.

### 3.1 Tier 1, per deploy (blocking; runs on the new revision before it counts as shipped)
Existing checks in `scripts/prod-check` (26; all passed on 60e07dcf at 16:1xZ in 07b `coverage.md`, except NEW-4, which hit a DNS blip):

| check | function | expected |
|---|---|---|
| T0-01..03 | F-RESIL-06, F-DISC-01 | `/api/version` == origin/main; `/api/health/ready` 200; `/` 200 in < 5 s |
| T1-01, T1-12, T1-13 | F-DISC-01..05 | home, 9 categories, one sub and one sub-sub each show ≥ 1 `/resource/` link; no horizontal overflow at 390; 0 console errors |
| T1-02, T1-03, T1-07, T1-08 | F-DISC-12 | sitemap resource count == categories sum == `totalPublic`; ≥ 4,000 URLs; title, description, canonical and og:image on 4 page types; robots 200 with Sitemap |
| T1-04 | F-DISC-07 | 3 random sitemap resources (Googlebot UA): 200, one `<h1>`, an outbound noopener link |
| T1-05, T1-06 | F-SRCH-01, F-SRCH-07 | `/api/search?q=ffmpeg` total > 0; ⌘K palette shows ≥ 1 option |
| T1-09 | F-RESIL-01 | unknown route returns 404 |
| T1-10, T1-11, NEW-4 | F-AUTH-02, F-AUTH-06 | Clerk identifier input renders; `/profile` and `/admin` signed out redirect to sign-in with no admin data |
| T1-14..16, T1-18, T1-19 | F-ACUR-02, F-ACUR-03, F-OBS-01, F-JOB-01, F-ARES-02 | admin stats 200; approvals readable; ops health `ready`; newest link scan completed < 26 h; newest researcher job not errored |
| NEW-1..3 | F-ACUR-01, F-ACUR-05 | 6 admin tabs render and match their GETs; Resources totals, filters and pager; Review and Edit dialogs open and cancel |

New checks, proposed, built in Phase 5 if approved (Decision 4):

| id | function | check (command or browser step → expected) |
|---|---|---|
| C-01 | F-SRCH-02 | browser `/search?q=hls` at 1280 → ≥ 1 result card, 0 console errors |
| C-02 | F-DISC-06, F-MACC-09 | browser one sitemap `/tag/*` and one `/journey/*` → 200 and ≥ 1 resource link |
| C-03 | F-DISC-01, F-DISC-04 | buffered `PerformanceObserver('layout-shift')` sum over 5 s, 3 repeat loads of `/` at 1280 and `/subcategory/codecs` at 768 → each < 0.1 (blocking once D4 ships) |
| C-04 | F-TEL-01 | fresh context: consent banner visible; Decline → 0 requests to google-analytics, mixpanel, posthog or amplitude hosts over 10 s |
| C-05 | F-AUTH-01, F-AUTH-02 | `/sign-in` and `/sign-up` at 390 → Clerk card `getBoundingClientRect()` left ≥ 0 and right ≤ 390 (blocking once D5 ships) |
| C-06 | F-MCON-01 | audit member submits `qa-audit-<run>` with an awesome.video QA URL → 201 pending; withdraw → 200; public GET 404, search 0, sitemap 0 (Tier 2 write, opt-in flag) |
| C-07 | F-MACC-11 | audit member loads Home and `/profile` with the network watched → **0** `POST /api/recommendations` (blocking once D1 ships) |
| C-08 | F-OBS-01 | `/api/admin/logs` since the deploy's boot → 0 `level=error` (409s excluded until D7 ships) and 0 `status:5xx` |
| C-09 | F-JOB-04 | newest backup < 26 h: turn the existing info-only T1-17 into a blocking check once D2 ships |

### 3.2 Tier 2, weekly (non-blocking report; failures become issues)
Covers 355 rows and 81 contracts: Secondary functions and the state variants (loading, error, empty, keyboard) of Primary and Owner-critical screens.

Method:
- **Browser cells:** one populated pass per Secondary screen at 1280, plus the 390 overflow check.
- **Writes:** the existing prod-check tier 2 (`--allow-writes`, QA rows only), plus the 07b safety rulings.
- **Paid functions** (F-ACUR-09, F-ARES-01, F-ARES-05, F-MACC-11 personalised): drive to the confirm, then cancel, unless Decision 7 gives a budget.

### 3.3 Tier 3, on change (runs only when a guarded path changes in a PR)
Covers 300 rows and 49 contracts. Triggers are the `guard paths` column of `function-map.md` §1. For example, `PendingEdits.tsx` or `/api/admin/resource-edits*` triggers F-ACUR-04, and `link-reports.ts` or `LinkReportsPanel.tsx` triggers F-MCON-10. A PR that touches a guard path runs that function's rows before merge.

## 4. Open defects (ranked: tier, then affected users)
| # | tier | defect | affected | evidence | proposed fix | finish line |
|---|---|---|---|---|---|---|
| D1 | Primary (cost) | Signed-in Home and `/profile` auto-POST `/api/recommendations` | every signed-in member with any history; real cost per load (5-min in-memory cache) | 07b BUG-t-member-account-1; `Home.tsx:399-403`, `Profile.tsx:664`, `recommendationEngine.ts:376-394,553`; this run aborted every one | Load the panel from the rule-based/popular path. Call Claude only on an explicit "Refresh with AI" click | C-07 passes: 0 POSTs on load; the panel shows results |
| D2 | Owner-critical | Scheduled DB backup failed 11:05Z and 12:35Z with no cause in the log | owner (restore safety) | `logs.md` F-LOGS-1; `server/backup/scheduledBackup.ts:133` | Log the scrubbed `error.message`. Then fix the cause the log reveals | the next scheduled run logs success; C-09 green for 2 days |
| D3 | Owner-critical | `OPS_CRON_TOKEN` unset, so `/api/ops/run-due-jobs` returns 503 and the zero-instance safety net is off | jobs when Autoscale has 0 instances | F-LOGS-2 (09:51:11Z) | Set the secret in Replit deployment secrets and point one external cron at it (Decision 5) | one cron call returns 200 and a `due jobs` line is logged |
| D4 | Primary (SEO/CWV) | CLS 0.222 at 768 on `/subcategory/codecs` (repeat visits); 0.107 at 1280 on home | every repeat visitor at those widths | `visitor.md` CLS-1/2; `AppSidebar.tsx:98-132,361,491,847` restore open state from localStorage after hydration | Resolve the open state before first paint (SSR-known route, sync read). No animation on restore | C-03 < 0.1 on 3 loads at both widths |
| D5 | Primary | Clerk card clipped at 390 (x = -28, w 400) on `/sign-in`, `/sign-up` and every guest redirect | phone sign-ups (21 real / 28 d, device split unknown) | `member.md`, `admin.md` r2; `AuthPages.tsx:62,71,100`; `clerk-appearance.ts:290` | Constrain the wrapper to the column width | C-05 passes |
| D6 | Owner-critical | AdminGuard says "your session has expired" when `/api/auth/user` merely failed | owner | `AdminGuard.tsx:12,54-58`; `member.md` re-check | Show a retryable "couldn't verify access" state | abort `/api/auth/user` → a retry state, no "expired" |
| D7 | Owner-critical (signal) | Expected 409 conflicts logged as ERROR with stack | error-rate alerting | `admin-content.ts:640` | Log at WARN | C-08 counts 0 errors on a 409 |
| D8 | Owner (metric) | `auth.login`/`auth.register` audit rows dead since 2026-08-10 | login metric | `analytics.md` §4.1 | W5 (§5) | a sign-in by the audit member writes one `auth.login` row |
| D9 | Secondary | Onboarding reopens at step 2 from a stale local draft after the server prefs reset | members resetting prefs | `member.md` re-checks | Clear the draft when server prefs are null | reset, then `/onboarding` opens step 1 |
| D10 | Secondary | Audit tab error banner always says "Your filter is still applied"; Export link-check card shifts the grid ~240 px | owner, cosmetic | `AuditTab.tsx:364`; `admin.md` bug-ops2 shots | Show the note only when a filter is set; reserve the card's height | screenshots show neither |
| D11 | Secondary | 170 px blank band while a category loads; "More like this" eyebrow over empty space | visitors on slow links, cosmetic | `visitor.md` L-1/L-2 | Render skeletons in those slots | 5 s delay screenshots show skeletons |
| D12 | Owner (observability) | Log retention is about 18 h, not 7 d; hourly reads cap at 2000 records; no SIGTERM line on 6 retirements | post-incident reading | `logs.md` §1, F-LOGS-5; `server/lib/logSinkStorage.ts:8` | W3 (§5) | a log line older than 48 h is retrievable |
| D13 | Vestigial | Pending-edit diff uses `break-all` (mid-word wrap) | none (0 real edits) | `PendingEdits.tsx:61` | Tier 3 only | n/a |

Info, not defects:
- Peak pool waiting reached 8 of 8 during our parallel lanes, with 0 failures (cause unconfirmed).
- CSV and OPML exports each write a `resources.exported` audit row.
- A bot-other burst of +143 documents in 32 min, with `resource` 4xx at 63, looks like probes.
- About 10 server modules have no importer (`function-map.md` §2.3).
- The audit-log heuristic counts the owner's own admin work as "test" (`analytics.md` §4.4).
- QA rows 190989, 190992 and 190993 remain as `withdrawn` (404 publicly). The QA cleanup endpoint matches only `[QA-` titles, so it does not find them (Decision 11).

## 5. Analytics and logs wiring proposal
### 5.1 Options compared (R1)
| option | read-only for agents | maintained | cost | retention | consent | verdict |
|---|---|---|---|---|---|---|
| App Storage log sink + `/api/admin/logs` (today) | yes, with an admin session | ours | none | ~18 h observed (7 d intended) | none (no PII found in 20,494 records) | keep; fix retention (W3) |
| Replit deployment logs (Publishing pane / Replit MCP) | yes, once OAuth is done | Replit | included | not documented | none | add as the crash/OOM source; it is the only one that sees pre-logger deaths |
| PostHog Logs (OTLP) + log alerts | yes via MCP | PostHog, active | usage-priced (confirm on the billing page; the pricing page wasn't machine-readable) | per plan | server-side, no consent if attributes are scrubbed | candidate for alerts (W4) |
| PostHog `$http_log` server-side events | yes via MCP | PostHog, active | each event is billed volume (~6k bot docs/day from DOC ratios, about 180k/month) | per plan | humans: needs consent analysis; bots only: no personal data | bots only, if wanted (W2) |
| First-party DOC counters (live since this deploy) | yes (health endpoint) | ours | none | in-memory, resets per deploy | none (counts only, `operationalTelemetry.ts:228`) | persist hourly (W1) |
| External drain (Axiom, designed 11-06) | yes | Axiom | free tier | 30 d | none | dormant (`AXIOM_TOKEN` unset); keep as the alternative to W4 |

Docs read 2026-11-07:
- PostHog MCP is hosted at `https://mcp.posthog.com/mcp`, US/EU, read and write ([posthog.com/docs/model-context-protocol](https://posthog.com/docs/model-context-protocol)). The plugin is posthog@posthog **1.1.91**.
- `$http_log` needs `$raw_user_agent` and `$current_url`. Recommended: a hashed `http_log_` distinct_id and `$process_person_profile:false` ([sending-http-logs](https://posthog.com/docs/web-analytics/sending-http-logs)).
- PostHog Logs is OTLP-native, with alerts in the app and through MCP ([posthog.com/docs/logs](https://posthog.com/docs/logs)).
- Replit offers one-click deployment rollback ([blog](https://blog.replit.com/introducing-deployment-rollbacks)). A forum thread says the button moved, so confirm it in the Publishing pane. Before redeploying an older build, check it is compatible with the current schema ([troubleshooting](https://docs.replit.com/help/troubleshooting/deployments)).

### 5.2 Proposed work items
| id | item | size | privacy impact | recommend |
|---|---|---|---|---|
| W1 | Persist DOC counters: an hourly delta line in the log sink plus a small `traffic_hourly` table (template × class × status). Add an `X-Audit-Run`/UA marker so our own lanes count as class `qa`, not human | ~60 lines, 3 files | none (counts only) | **yes**: gives the missing 28/90-day anonymous series in 28 days |
| W2 | `$http_log` for **bot-class requests only** (AI, search, other); no `$ip`, hashed id, no person profiles | ~40 lines + a PostHog project key | none for humans; privacy policy gains one line | optional: W1 already splits bots by class; W2 adds per-bot names in PostHog |
| W3 | Log retention fix: confirm what prunes at ~18 h vs the 7 days in code; make the 7 d real; log SIGTERM before flush | small, needs a cause first | none | yes |
| W4 | Alerts: error-level count > 0 within 30 min of a deploy, any 5xx burst ≥ 3 in 10 min, ready probe failing twice, no backup success in 26 h. Delivered via PostHog Logs alerts (needs OTLP export, W4a) or an agent poll of `/api/admin/logs` (W4b, no new vendor) | W4a ~50 lines + PostHog setup; W4b: no code, uses the check-in loop | none | **W4b first** (no new data flow); W4a if you want push alerts |
| W5 | Restore login metrics: Clerk webhook `session.created` and `user.created` → audit rows (`auth.login`, `auth.register`), verified with `verifyWebhook` | ~60 lines + a webhook secret | none new (the user id is already stored) | yes |
| W6 | Admin aggregates still missing from `/api/admin/usage`: login counts (from W5), API-key request counter, digest sends/opens, per-week series | ~80 lines | none | yes, after W5 |
| W7 | Four consent-gated SDKs. All four fire on accept (verified in a real Chrome) and nobody can read any of them today. Keep **PostHog only**: it brings error tracking, replay and agent access via MCP. Remove GA4, Mixpanel and Amplitude (`mixpanel.ts` 264 + `amplitude.ts` 225 lines, the GA parts of `analytics.ts`, and `mixpanelServer.ts` 172) and update the privacy policy | medium | reduces vendors; the policy text changes | your call (Decision 8): removal is irreversible for their history |

## 6. Redeploy and orchestration flow
```
 fix lane (own worktree, files disjoint)          ── lanes may run in parallel (≤4)
      │  gates: npx tsc --noEmit · npm run build · npx eslint <touched>
      ▼
 PR ──► independent review (/code-review, a different agent) ──► owner-approved scope only
      ▼
 squash-merge to main                              ── one at a time, in approved order
      ▼
 replit-deploy skill: SSH sync → npm install / db:push only if the diff needs it → publish_app (MCP)
      ▼
 /api/version == origin/main  AND  /api/health/ready 200   (poll 30 s, give up at 20 min)
      ▼
 Tier 1 sweep on the new revision (prod-check --tier 0,1 + C-01..09 once built)
      ▼
 watch 30 min: ready probe every 60 s, /api/admin/logs errors and 5xx, ops health counters
      ├── all thresholds clear ──► PROMOTE: record revision + sweep + delta in PROGRESS.md
      └── any trigger ──► ROLLBACK (Replit Publishing ▸ previous deployment; else git revert PR → redeploy)
                          → re-run Tier 0/1 on the restored revision → open an issue with the evidence
```

**Rollback triggers** (any one):
- `/api/health/ready` non-200 on 2 consecutive probes.
- `/api/version` is not the target after cutover.
- A blocking Tier 1 check fails, and fails again on a re-run.
- 1 or more new `level=error` signatures not in the pre-deploy baseline (409s excluded until D7).
- 5xx: 3 or more in any 10 min, or more than 0.5% of API requests.
- DB pool `waiting` greater than 0 for 5 minutes.

**Order and parallelism:**
- Fix lanes, reviews and Tier 2 browser lanes may run in parallel.
- Merge, deploy, sweep and watch run strictly in sequence.
- Never two deploys at once.
- A PR with a schema change deploys alone.

**Session bounds for Phase 5** (assumed from the prior contract): 40 turns, 10 cycles, $30 spend, at most 4 agents per wave, on sonnet.

## 7. Self-healing loop design
**Conflict first.** You dropped the self-healing loop on 2026-11-07 at 02:34Z: PR #307 was closed, and five review rounds kept finding guard bypasses in the headless `claude -p` runner. This brief asks for the design again, so it is here. Nothing gets built without Decision 1. My recommendation is the **supervised** variant below, not the autonomous one #307 tried.

| stage | supervised loop (recommended) | autonomous loop (#307 style, not recommended) |
|---|---|---|
| detect | Tier 0 every 15 min; the W4b log poll hourly; Tier 1 daily at 07:13 local; the post-deploy watch | same |
| classify | `transient` (one failed probe that clears on re-probe → nothing). `content` (link-health broken count, catalog count drift → the existing link-health job and the owner queue). `regression` (a new error signature or a Tier 1 fail within 24 h of a deploy → rollback proposal). `defect` (reproducible, has code location) | same |
| act | Open or update one GitHub issue per signature, with evidence. A `defect` in an allow-listed low-risk area (logging, copy, cosmetic CSS, non-auth client code) gets an agent-authored PR. Merge and deploy wait for your one-word yes | the agent merges and deploys itself |
| never automatic | auth, sessions, Clerk, DB schema or migrations, deletes, privacy/consent text, paid AI calls, secrets, GitHub sync, seed | needs a guard that has not held |
| re-verify | after deploy: the Tier 1 sweep plus the original signal's own check, on the new revision | same |
| rollback | §6 triggers; supervised = an agent proposes and you confirm | automatic |
| cadence | as in "detect"; the owner digest of open issues runs daily | same |

The Phase 5 "one real end-to-end cycle" runs in the supervised loop. The candidate defect is D7 (409 logged as ERROR): one line, low risk, and the signal (C-08) is objective.

## 8. Privacy duties (R4)
- [ ] The privacy policy (`shared/legal-policy-content.tsx:91-97`) names GA4, Mixpanel, PostHog, Amplitude, Replit Analytics and Clerk. Any change from W2 or W7 updates it in the same PR.
- [ ] The consent banner gates only client SDKs (`posthog.ts:3-5,72`; `analytics.ts:70-71`). W1 and bot-only W2 add no personal data from humans, so they need no consent change. Human `$http_log` (rejected here) would.
- [ ] No IP or user agent is stored by W1. W2 sends a UA for bot classification only, with no `$ip`. The contact form already stores an HMAC IP hash with a 180-day purge (F-JOB-03).
- [x] No personal data in the repo: lanes stored aggregates only; HARs and temp Chrome profiles are gitignored (profiles moved to Trash); the log scan found 0 emails, IPs or tokens.
- [ ] Mixpanel `sign_up_completed` is sent server-side only with the consent header (`mixpanelServer.ts:16,48`). Keep it that way, or drop it under W7.

## 9. Owner decisions (one word each; recommended default first)
| # | decision | recommended | cost / risk |
|---|---|---|---|
| 1 | Self-healing: build the **supervised** loop (§7), the autonomous one, or none | **supervised** | ~1 day of agent time; risk low (no autonomous merges). "none" keeps today's manual flow |
| 2 | Adopt the tiering in §2 and the contract in §3 (104 rows / 57 contracts per deploy) | **yes** | a Vestigial function can break unnoticed between changes; Tier 3 triggers cover code changes only |
| 3 | Fix D1-D7 in Phase 5, in that order, through §6 | **yes** | 7 small PRs, 1-3 deploys; D2 may need a second PR once the cause shows |
| 4 | Build Tier 1 checks C-01..C-09 into `scripts/prod-check` | **yes** | ~300 lines; the checks touch production read-only, except C-06 (opt-in QA write) |
| 5 | Set `OPS_CRON_TOKEN` and one external cron hitting run-due-jobs every 15 min | **yes** | you add the secret in Replit; the cron host is your choice (GitHub Actions schedule is free) |
| 6 | Analytics: W1 + W3 + W4b + W5 + W6 now; W2 and W4a later | **yes** | no new vendor or consent change; W5 needs a Clerk webhook secret |
| 7 | Paid budget for testing (recommendations, researcher, enrichment, AI analyse) | **none** (they stay drive-to-confirm) | otherwise name a cap, e.g. $5 |
| 8 | SDKs: keep PostHog, remove GA4, Mixpanel and Amplitude (W7) | **defer** until PostHog OAuth works and you have looked at the data | removal is irreversible for vendor history |
| 9 | Vestigial features (15): retire from testing only, or also remove code | **retire from testing only** | removal risks in §2; `/design-system` is not removable (the awesome-ds-verify skill drives it) |
| 10 | Grant access for the blocked sources: PostHog OAuth, Replit OAuth, Replit Analytics screenshots, GA4/Search Console | **yes, PostHog + Replit OAuth now** | 2 browser clicks; turns 2 blocked sources into pulls |
| 11 | Delete the 3 withdrawn QA rows (190989, 190992, 190993) via admin DELETE | **yes** | 3 DELETEs on QA rows, read back 404 |
| 12 | Allow a throwaway Clerk account for empty-state checks, and one permanent journey enrolment on the audit member | **no** (empty states stay Tier 2 code-read) | a real Clerk user to delete afterwards |

## 10. Phase 5 finish lines (after approval)
1. Every approved D-item meets its finish line in §4, on **one unchanged deployed revision**.
2. On that revision every Tier 1 check passes, with 0 console errors on the swept pages and 0 5xx in the watch window.
3. Each approved alert or signal (W4b, C-08) fires once on a controlled QA-only trigger, and is shown firing.
4. If Decision 1 is `supervised`: one real cycle on D7, detect (C-08 sees the 409 as ERROR) → issue → PR → your yes → deploy → C-08 green on the new revision.
5. `DECISIONS.md`, `docs/ANALYTICS.md` and the deploy runbook are updated to match what shipped.
