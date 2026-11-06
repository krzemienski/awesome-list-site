# Doc drift audit: replit.md and docs/ANALYTICS.md

> Layout is mine. Read-only audit in the `prod-ops` worktree (origin/main `6cb1a93e`), 2026-11-06. I read both files in full (replit.md 259 lines, ANALYTICS.md 680 lines) and checked each claim about the **current system** that code or this run's lane files can answer. Skipped, as asked: "Recent Changes" entries that only narrate past events (replit.md:24-160 apart from the standing rules they contain).
> Status: **stale** = contradicted by code/evidence; **current** = confirmed; **unverifiable** = I could not check it from code or lane evidence. `rg`-style greps were run in the worktree; paths are relative to it. Lane files are under `reports/prod-ops-2026-11-06/lanes/`.
> Limits: I spot-checked the 90-row event catalog (ANALYTICS.md:347-449) by helper and event-name presence, not by parameter. I did not run the app, so behaviour claims (consent, Umami, GA4 settings) are checked against code only.

## 1. Stale (fix these)

| file:line | Claim | Status | Evidence | Suggested text |
|---|---|---|---|---|
| ANALYTICS.md:614, 616-617 | "The harness `scripts/vg2-ga4-validate.mjs` drives a pinned Chromium… asserts on event names" | stale | `ls scripts/vg2*` finds nothing; removed in `b4040bfe` (git log of the path). Also gone: `tests/`, `scripts/validation/` | Delete the "Validation" section, or replace with: "Tracking is verified by hand in a consented real browser (see Adding an event, step 4). There is no validation script." |
| ANALYTICS.md:589-590 | "This is enforced by test: the validation harness scans every raw `/g/collect` request body… and fails" | stale | same; no test script (`package.json` has no `test`), no `tests/` dir | "Enforced in code by `sanitizeEventProps()`; checked by hand in a consented browser." |
| ANALYTICS.md:624-642 | "Gotchas the harness handles" (visibility toggle, throwaway `__qa_test_*+clerk_test@example.com`, Clerk Testing Token, `CLERK_SECRET_KEY`/`pk_test_`) | stale | harness removed. Prod rejects `+clerk_test` addresses and the `424242` code and the workspace `CLERK_SECRET_KEY` is the dev instance (replit.md:43) | Delete, or keep only the GA4 batching note (gtag flushes on `visibilitychange`) as a manual-check tip |
| ANALYTICS.md:644-648, 653-654 | Net-zero teardown via `scripts/vg2-teardown.ts` | stale | file does not exist | Delete section; point to PLAN §5/§10 (QA cleanup, #77) if the prod-check runner is approved |
| ANALYTICS.md:650-655 | "Running it": `node scripts/vg2-ga4-validate.mjs`, `npx tsx scripts/vg2-teardown.ts` | stale | files do not exist; commands fail | Delete |
| ANALYTICS.md:657-677 | "Post-publish smoke check… Run… immediately after every publish… `--smoke --base-url`" | stale | script removed; the deploy skill never calls it (no `vg2` hit in `.claude/skills/replit-deploy/SKILL.md`, `CLAUDE.md`, `package.json`). Instruction cannot be followed | Delete, or re-home the consent-gate and INP checks as optional prod-check steps if the owner approves D1 |
| ANALYTICS.md:679-680 | "The validator prints event counts, per-assertion results…" | stale | no validator | Delete with the section |
| ANALYTICS.md:10-11 | GA4 section "…and how tracking is validated end-to-end against the real GA4 network endpoint" | stale | follows from the rows above | "…and how to check tracking by hand." |
| ANALYTICS.md:39-41 | Enhanced-measurement double page_view "was observed live during validation on the configured property" | stale (evidence gone) | the harness that observed it is gone; claim stays plausible but is now unsourced | "Observed once during an earlier validation run (harness since removed); re-check in the GA4 UI." |
| replit.md:5 | "over 2,600 curated video development resources" | stale | 4,074 approved/live: `/api/resources?limit=1` total 4074, `lanes/tier01-dryrun.md`, `lanes/admin-content.md` AC-01 | "over 4,000 curated video development resources" (or drop the number) |
| replit.md:217-220 | UI: "Pure black cyberpunk theme: Dark mode only… pink primary, cyan accent… No shadows, no rounded corners… JetBrains Mono used throughout… `--radius: 0rem`" | stale | the shipped identity is Editorial + Crimson (replit.md:168, 184); `client/public/ds/design-system.css:31` `--radius: 12px`; only two systems exist (`data-system="editorial"`, `"geist"`); body font is `--font-body`, JetBrains Mono only appears in the `index.html` font request. No `--radius: 0rem` in `client/src/index.css` | Replace the section with: "Editorial + Crimson default; Geist selectable; 10 accents; fonts from the DS tokens; 12px radius scale" and point to the Design-System scope section |
| replit.md:230 | "Advanced fuzzy search… powered by Fuse.js" | stale | `fuse.js` is not in `package.json` and no `fuse` import in `client/` or `server/`; the palette uses `cmdk` (`search-dialog.tsx:4`, `package.json` `cmdk ^1.1.1`) with server search `/api/search` | "Search: ⌘K palette (cmdk) over `/api/search`" |
| replit.md:231 | AI Recommendations "(planned)" | stale | live: `GET/POST /api/recommendations`, feedback routes (`journeys-recommendations.ts:644-955`); C22 member PASS (`lanes/member.md` M10) | remove "(planned)" |
| replit.md:232 | Clerk proxy is `server/middlewares/clerkProxyMiddleware.ts` | stale (path) | real path `server/middleware/clerkProxyMiddleware.ts` (no "s") | fix path |
| replit.md:232 | "`syncAdminPasswordFromEnv` is vestigial" | stale | no occurrence in `server/` or `scripts/` (grep) | delete the clause |
| replit.md:232 | "`requireAuth`" gates protected endpoints; "legacy /login… 301-redirect" | current for the first half; **partly stale** for the second | server `og-middleware.ts:2431` maps `/login`→`/sign-in` etc.; client `App.tsx:870-876` also redirects. Not wrong, but `/signup` and `/auth/*` exist too | optional: list `/signup`, `/auth/login`, `/auth/register` |
| replit.md:164 | "there are no validation scripts… none may be added again" | stale-in-waiting | still true today (no `tests/`, no `scripts/validation`), but conflicts with PLAN §5 prod-check runner (D1). `playwright ^1.60.0` is still a devDependency | reword after the owner decides D1: "…except the read-only `scripts/prod-check` runner" |
| replit.md:65 | Enrichment "about $21 for 3,012" unenriched | stale-or-unverifiable | current untagged count is 2,983 of 4,074 (coverage 26.8 %, `lanes/tier3-dryrun.md` T3-en, `lanes/analytics.md:42`). "Tagged" and "enriched" may differ | "…about $21 for ~3,000 (2,983 untagged on 2026-11-06)" or drop the dollar figure |
| replit.md:129 | "WS4 SDK 0.3.220… app is zod v4 now (`^4.4.3`)" | zod current; SDK **stale** | `package.json`: `@anthropic-ai/claude-agent-sdk ^0.3.310`, zod `^4.4.3` | "SDK 0.3.310+" (this is in a dated entry; low priority) |
| replit.md:159 | "deploy is single-instance… no shared store added by design" (R4-031 rate limiter) | stale | `server/middleware/pgRateLimitStore.ts:9-18`: Postgres-backed store because "production Autoscale runs several instances" (Task #279); `rate_limit_hits` migration 0039 | "Rate limits use a shared Postgres store (`pgRateLimitStore.ts`)" |
| replit.md:227 | "Database must be seeded for production (`/api/admin/seed-database`)" | stale/misleading | production already holds 4,074 live rows; seeding is a destructive owner action (PLAN: Seed and Clear & Re-seed are write paths, `lanes/admin-ops.md`) | "Production is already seeded. Never run Seed or Clear & Re-seed without the owner's explicit approval." |
| replit.md:14, 20 | "Production Status: Production-ready as of December 4, 2025" (appears twice) | stale + duplicate | duplicate block at lines 14 and 20; date is 11 months old and says nothing about B1-B14 (`PLAN.md` §2) | delete one; replace with a pointer to the latest audit/PLAN |

## 2. Unverifiable from this run (kept honest)

| file:line | Claim | Why unverifiable |
|---|---|---|
| ANALYTICS.md:17-41 | GA4 Enhanced Measurement "Page changes based on browser history events" must be OFF | a GA4 property setting; the analytics lane had no GA4 access (`lanes/analytics.md`) |
| ANALYTICS.md:204-208 | Replit injects `i.replit.com/script.js` after analytics is enabled in Publishing settings | server CSP allows it (`server/index.ts:87`), but whether the setting is on is a Replit-side fact |
| ANALYTICS.md:233-244 | "under 2% of visitors produced any custom event" | historical measurement, no source in this run |
| replit.md:10 | edge `private` header = GFE/GAESA rewrite, "not origin policy" | the code comment exists (`server/index.ts:639-647`) but the edge behaviour is not testable from here |
| replit.md:54 | Replit sets values that win over `.env`; `.env.local` retired | needs the workspace; not checked |
| replit.md:106-110 | Task #263 shipped COOP/CORP/security.txt/www redirect "needs republish" | code present (`index.ts:240-241`, `:274`, `non-api.ts`), but deployed status is not in a lane; also `evidence/run25/PLATFORM-ACTIONS.md` is missing (see §3) |
| replit.md:232 | "14 users migrated with emails/passwords preserved" | historical migration fact; admin stats now show 26 active users (`lanes/admin-content.md` AC-01) so it is not a current count |
| replit.md:43, 44 | test-member method; "all member sessions were revoked" | procedure notes; matches `reports/prod-audit-2026-10-29/cycle-22/` ledger but not re-run |

## 3. Dangling references (files named in the docs that do not exist)

| file:line | Reference | Status |
|---|---|---|
| ANALYTICS.md:614, 648, 653-654, 663 | `scripts/vg2-ga4-validate.mjs`, `scripts/vg2-teardown.ts` | missing (also mentioned in `docs/parity/evidence/verification-571/RAW-GATE-LOGS.md` and `docs/performance/task326-measurements.json`; same fix, lower priority) |
| replit.md:100 | `tests/unit/page-param.test.ts` ("Locked by…") | missing; `tests/` removed 2026-10-11 (replit.md:164). Drop "Locked by…" |
| replit.md:108, 110 | `evidence/run25/PLATFORM-ACTIONS.md`, `evidence/run25/findings-table.md` | `evidence/run25` not in the repo; if the owner runbook matters, recover it from history or move its content here |
| replit.md:137 | `audit-evidence/VERDICT.md`, `cycle-02/`, `cycle-03/` ("local, gitignored") | not in the worktree (as stated: gitignored) |
| replit.md:140, 152, 160 | `scripts/task242-content-fixes-prod.ts`, `scripts/run24-data-fixes-prod.ts`, `scripts/r6-data-fixes.ts` | missing from `scripts/`; the "Needs republish… run `npx tsx scripts/run24-data-fixes-prod.ts`" instructions (lines 152, 160) cannot be followed |
| replit.md:131, 134, 142, 147, 156 | "Gates green: tsc, migration-drift, print-audit 49/49, responsive-audit 28/28" and `scripts/validation/responsive-audit.mjs` | gates removed 2026-10-11; these are dated history, but a reader may think the gates still run. Add one line: "These gates were removed; see Verification policy." |
| replit.md:155 | `fix-evidence-v3/completion-table.md` | the entry itself says it was removed |

## 4. Current (confirmed)

| file:line | Claim | Evidence |
|---|---|---|
| replit.md:9-12 | HTML `no-store`; hashed assets immutable; catalog reads `public, max-age=60, must-revalidate`; public API `public, max-age=60` | `og-middleware.ts:2714,2729,2741`; `server/http-cache-policy.ts:10-13,40`; `server/index.ts:639-647` |
| replit.md:18 | `GET /api/awesome-list/listing?level=…&slug=…&page=…` | `server/contracts/endpointSchemas.ts:681-686` |
| replit.md:41 | digest refused for unverified Clerk email; job skips unverified recipients | `server/api/notifications.ts:31`, `services/digestService.ts:44,181`; matches `lanes/member.md` M20 |
| replit.md:47 | awesome-lint result persisted in App Storage | `awesome-lint`/lint-result code in `storage.ts`, `ResourceRepository.ts`, `AdminRepository.ts` (not traced further) |
| replit.md:52-53, 62-63 | empty publish commits; `/api/version` equals `origin/main`; publish kills running jobs | `server/version-route.ts:6,41-52`; `lanes/admin-ops.md` follow-up on interrupted jobs |
| replit.md:54 | `.env` loaded by dotenv in `server/index.ts:1` and `vite.config.ts:2`; public config in `.replit [userenv.*]` | `server/index.ts:1` `import 'dotenv/config'`; `vite.config.ts:2`; `.replit:91-96` |
| replit.md:55 | analytics off when `navigator.webdriver` is true, `client/src/lib/analytics-suppression.ts` | file exists, `isAutomatedBrowser()` at `:51`; `lanes/member.md` records `navigator.webdriver` true |
| replit.md:86-87 | `anthropicConfig.ts` single source; `ANTHROPIC_DEFAULT_{HAIKU,SONNET,OPUS,FABLE}_MODEL`; `FLOW_TIERS`; `buildAgentEnv` | `server/ai/anthropicConfig.ts:39-42`; `agentRuntime.ts`, `researchRunConfig.ts:3,133` |
| replit.md:88 | `GET /api/health/ai` | `endpointSchemas.ts:818`, `operations.ts:11` |
| replit.md:99-103 | `shared/page-param.ts`, `client/src/lib/page-param.ts`, `paginator.tsx` | all exist |
| replit.md:106 | COOP `same-origin-allow-popups`, CORP `same-origin`, www→apex 301 | `server/index.ts:240-241,274-276` |
| replit.md:126-128 | `/api/researcher/brief` & `/start`; migration 0038 `research_discoveries.verification` | `ai-jobs.ts:340`, `researchService.ts:1005`, `migrations/0038_research_discovery_verification.sql` |
| replit.md:164 | publish build is `bash scripts/publish-build.sh` | file exists, refuses a workspace that is not `origin/main` |
| replit.md:168 | `brand/`, `scripts/brand/build-brand-assets.mjs`, `buildOgSvg` | files exist; `non-api.ts:397` |
| replit.md:173-175 | design-system artifact, `tokens.json`, `npm run generate:design-system-artifact` | `package.json` script; artifact files exist |
| replit.md:184 | 2 systems (Editorial, Geist), keys `ds-system`/`ds-accent`, defaults editorial→crimson, geist→cyan, 10 accents | `design-system.ts:71-72,75,92`; `design-system.js` lists amber, crimson, cyan, emerald, lime, magenta, matrix, orange, rose, violet (10) |
| replit.md:185, 226 | 280px sidebar, 56px rail, 60px header | `sidebar.tsx:27,30`; `app-bridge.css:43`; `client/src/components/layout/new/MainLayout.tsx` |
| replit.md:223-225 | React + Vite + Tailwind 4 + Wouter + React Query v5; Express + Drizzle; remark, cheerio, node-fetch | `package.json`: react ^18.3.1, wouter ^3.3.5, @tanstack/react-query ^5.60.5, tailwindcss ^4, express ^4.21.2, drizzle-orm ^0.45.4, remark ^15, cheerio ^1.1.2, node-fetch ^3.3.2, vite ^7.3.7 |
| replit.md:232 | Clerk; `/api/__clerk` same-origin proxy; `sessions` table remains | `server/clerkAuth.ts`, `server/index.ts`, `shared/schema.ts:51,64`; `lanes/member.md` (proxy fetches in HAR) |
| replit.md:235 | guest bookmarks: `guestBookmarks.ts`, key `guest-bookmarks-v1`, cap 50, `BookmarksGate`, `GuestBookmarkMerge` | `lib/guestBookmarks.ts`, `pages/BookmarksGate.tsx`, `components/auth/GuestBookmarkMerge.tsx`; live: `lanes/member.md` M03 (guest empty state, button text) and C22 m0 (cap-50 merge) |
| replit.md:114-123 | Amplitude/PostHog/Mixpanel consent-gated, keys via `VITE_*`, set in `.replit` | `lib/amplitude.ts`, `posthog.ts`, `.replit:107-110`; `docs/MIXPANEL.md` exists |
| replit.md:259 | shared `track()` → dispatch → hygiene → GA4/MP/PH/AMP | `analytics.ts`, `analytics-dispatch.ts`, `analytics-hygiene.ts` |
| ANALYTICS.md:14 | `VITE_GA_MEASUREMENT_ID` | `.replit` carries no GA ID (it is a Secret per replit.md:54); name consistent |
| ANALYTICS.md:56-66 | dispatcher flow: sanitize → replitTrack/GA/mp/ph/amp | `analytics-dispatch.ts`, `replit-analytics.ts` |
| ANALYTICS.md:133-143 | sanitizer caps: strings 200, scan 2,000, arrays 50 | `analytics-hygiene.ts:23,24,26` |
| ANALYTICS.md:233-243 | Replit queue max 50, event name ≤ 50 chars | `replit-analytics.ts:33,35` |
| ANALYTICS.md:255-259, 279 | suppression rules: `/qa-*`, `^/resource/9{8,}$`, `/sign-in?admin`, marker key `analytics-admin-session`, Umami keys | `analytics-suppression.ts:21-25,47` |
| ANALYTICS.md:261-273 | `navigator.webdriver` suppresses all vendors; `isAnalyticsSuppressed`, `vendorSdksAllowed` | `analytics-suppression.ts:51-57`; `lanes/member.md` (webdriver true) |
| ANALYTICS.md:282 | `clearSignedInClientState()` runs on every sign-out | `hooks/useAuth.ts:22,193` (call-site coverage not enumerated) |
| ANALYTICS.md:349-449 | catalog helpers (`trackPageView` … `trackContinueLearningCtaClicked`) | spot-checked ~60 helpers: all defined in `lib/analytics*.ts` (`trackAccountDeletion*` are three named helpers, fine). Event names such as `submit_form_started`, `sidebar_toggled`, `library_explore_clicked`, `tool_tab_opened`, `journey_resumed`, `digest_preview_item_opened` present. `resource_submit_started` has 0 hits, matching "superseded" (line 172) |
| ANALYTICS.md:398, 541 etc. | caller file names in "Helper / source" column | **partly stale**: several named paths are wrong, e.g. `use-home-layout` is `components/home/use-home-layout.ts`; `ApiKeysCard` is `components/profile/`; `NotificationPreferencesCard` `components/notifications/`; `ErrorPage` `pages/ErrorPage.tsx`; `GuestBookmarkMerge` `components/auth/`. The doc uses bare component names, so this is only a precision gap, not a contradiction |
| ANALYTICS.md:557-561 | `fid` removed, INP/FCP/TTFB from `web-vitals` | `package.json` `web-vitals ^6.2.1`; `use-analytics.tsx:3,100-101`; no `first-input`/`fid` in `client/src` |
| ANALYTICS.md:565-572, 587 | `av_acquisition`, UTM values capped at 100 | `lib/acquisition.ts:10,58` |
| ANALYTICS.md:598-608 | deleted helpers (`trackListSwitch`, `trackLayoutChange`, `trackScrollDepth`, `trackKeyboardShortcut`, `trackCopyAction`, …) are gone; `trackPerformance` kept | no definitions for any of the listed names; `trackPerformance` defined and called in `use-analytics.tsx` |
| ANALYTICS.md:500-509 | `initGA()` in `main.tsx` inside `afterFirstPaint()`; `send_page_view:false` | `main.tsx:15,66-67`; `lib/analytics.ts:4,139` |

## 5. What I did not check
- Parameters of each catalog row (only helper and event-name presence).
- replit.md:24-60 prose about C22/C20-21 lane behaviour (agent-browser traps, SendMessage notes): process guidance, not system claims.
- The AI-router claims at replit.md:86 beyond the symbols named (precedence order not traced).
- replit.md:94-97 JSON-LD claims ("Client pages still emit no JSON-LD"): `ItemList` found in `og-middleware.ts`, and no `application/ld+json` in `client/src`, which is consistent, but the Course/entity detail was not read.

## 6. Suggested order of work
1. ANALYTICS.md: delete lines 589-590 and 610-680 (Validation through end), fix lines 10-11 and 39-41. One edit removes 9 of the stale rows.
2. replit.md: lines 5, 14/20 dedupe, 217-220, 230-232, 159, 227, 164 (after D1).
3. Add one line under replit.md's removed-gates history: "The scripts and gates named in dated entries were removed on 2026-10-11."
4. Dangling data-fix scripts (replit.md:152,160) and `evidence/run25` references: delete the instructions or recover the files from history.
