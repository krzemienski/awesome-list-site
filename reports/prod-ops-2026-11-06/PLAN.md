# awesome.video — what it really does, what is broken, and how to keep it working

Run: 2026-11-06, read-only discovery on production `6cb1a93e` (= origin/main). Lane reports (`lanes/`) and the lead's own evidence (`evidence/lead/`) are committed with this plan. The raw
lane evidence under `evidence/<lane>/` (92 MB of HARs, screenshots and scrubbed JSON; cookie and auth values
redacted) stays in the local worktree and is not committed. Status: **awaiting owner approval**.

## Summary

**What the site does.** Visitors browse nine categories, search, open one of 4,074 resource pages and click
through. The owner grows the catalog through approvals, editing, the AI Researcher and a daily dead-link scan.
All of this works on production today. The 613-row C22 matrix has **no visitor rows**, and 259 of its rows are not
worth routine runs (§1, §8).

**What could hurt most.**
1. Backups are manual: one exists, never test-restored (B1).
2. Daily jobs likely run only while the site has traffic; the link scan once skipped six days (B2).
3. Nobody can search production logs; an agent sees about two hours (B3).

**Proposal.** A read-only checker after every publish and every six hours, scheduled backups with a restore drill,
Axiom logs, an outside timer that wakes the jobs, and a repair loop that files issues and fix PRs. Nothing merges
or deploys without the owner (§5-7).

**Key decisions** (21 in §10): 1 allow the checker; 2 daily backups; 3 Axiom; 11 cron-job.org timer; 15 clear the
23 waiting submissions and 27 duplicate pairs (`lanes/owner-queues.md`).

**Production writes during discovery.** The browser lanes' HARs show 12,917 GETs and 7 non-GET requests to
awesome.video. Nobody clicked a save, submit, approve or delete control.
- **6 × `POST /api/telemetry/dead-link` (204).** The client's 404 monitor sends one when a page for a non-existent URL
  loads. It writes one log line and no DB row (`catalog-contributions.ts:607`). One of the six came from a malformed
  URL (a zsh word-splitting slip, 21:06:24Z).
- **1 × `POST /api/interactions` (201) at 21:15:46Z, which wrote one DB row.** A Playwright selector matched the wrong
  "Next" link and opened resource 190875 on the owner session. The resource page records a `view` interaction for
  any signed-in user (`client/src/pages/ResourceDetail.tsx` → `trackUserInteraction`,
  `journeys-recommendations.ts:955-992`). The row sits on the owner account and changes nothing public. It was left
  in place, because deleting it would be a second write. It is listed for the owner (decision 22).
- The curl-only lanes sent GETs only. `/api/version` reads `6cb1a93e` at both the start and the end.
- Tally: `evidence/lead/write-proof.md`. The lesson is in §5: the runner never opens resource pages on a signed-in
  session.

## 1. Primary-function map

Usage sources: **DB** = first-party production data via admin GETs (`lanes/analytics.md`, `lanes/admin-content.md`).
**Walk** = this run's walkthroughs (`lanes/visitor.md`, `member.md`, `admin-*.md`). Page-view analytics are
blocked (§3), so visitor volume is inferred from the catalog size, the sitemap and server telemetry, and the
tiers below are for the owner to confirm (decision D8).

### Primary: deploy-blocking checks protect these
| # | Function | INV | Usage / owner-intent evidence | Walk result (2026-11-06) |
|---|---|---|---|---|
| P1 | Browse taxonomy (home, 9 categories, 99 subcategories, sub-subcategories, pagination, kind filter) | 001-005 | README "Resource Discovery … 3-Level Navigation"; sitemap 174 cat + 178 sub + 46 sub-sub URLs | works 1440+390, home TTFB 0.16-0.22 s (`evidence/visitor/perf.txt`) |
| P2 | Resource page + outbound link | 008 | 4,074 approved resources = 4,074 sitemap `/resource` URLs; crawlers keep requesting deleted `/resource/<id>` URLs (≥ 15 404s in 20 min, logs §3) | works; href real, `target=_blank`, `rel=noopener noreferrer` |
| P3 | Search (`/search`, header box, ⌘K palette) | 009-010 | README "Advanced Search … (⌘K)" | works; ffmpeg 451 / hls 407 / webrtc 131 hits, empty state OK |
| P4 | SSR + SEO surface (meta, OG image, JSON-LD, sitemap, robots) | 030-034 | the site is a search-engine destination: 4,766 sitemap URLs; replit.md SEO pipeline entries | works; Googlebot/Twitterbot get full head + JSON-LD on 4 page types |
| P5 | Deploy invariants (`/api/version`, `/api/health/ready`) | 038 | replit-deploy "done" definition | 200; live = origin/main |
| P6 | Sign-in / sign-up (Clerk) | 050 | 38 real sign-ups / 90 d, 23 / 28 d (DB `users.createdAt`, QA-filtered) | widget renders 1440+390; member routes redirect to `/sign-in` |
| P7 | Owner admin session + approvals queue + resource edit | 052, 101, 103 | 23 real submissions waiting (oldest 2026-08-26, 72 days); owner bulk work 1,739 audit rows / 7 d | all tabs load, 0 writes |
| P8 | AI Researcher (catalog growth) | 113-114 | 109 jobs, ≥ $592 lifetime, 46 runs / $100 in 90 d, 2,307 auto-approved discoveries (57 % of catalog) | loads; recent runs yield 0-2; last 50 jobs: 5 failed (3 upstream/config, 1 QA fixture, 1 orphaned by restart), 11 budget-stopped |
| P9 | Link health scan + auto-remediation | 121, 123, 131-132 | runs daily on prod with `LINK_HEALTH_REMEDIATION=apply`; job 14 archived 26 + rewrote 88 live rows | works; sampled 10 changes, none harmful (one archived resource has a live replacement on ovenmedia.com that remediation did not find); **schedule misses days (B2)** |
| P10 | Database backups | 119 | protects all data | **manual-only, 1 backup (B1)** |

### Secondary: periodic checks, not deploy-blocking
| Function | INV | Evidence | Note |
|---|---|---|---|
| Learning journeys (list, detail, enrol/progress) | 013, 075, 108 | 5 published, owner edited today; enrolment counts not exposed (B9) | walk OK |
| Tag pages | 006 | 280 tag URLs in sitemap, 1,630 tags | walk OK |
| Submit a resource / my contributions | 082, 084 | feeds the 23-item approvals queue; 14 real withdrawals in Nov | walk OK (signed-out form) |
| Bookmarks, favorites, collections, guest bookmarks | 019, 071-074 | **unmeasured**: no aggregate endpoint (B9) | C22 member re-drive PASS |
| Recommendations + feedback | 014, 076-077 | real feedback only since Nov (~21 rows); 92 % of 90 d rows are QA | rule-based, no AI call (lead-checked `server/recommendation-engine.ts`) |
| Profile, settings, onboarding, notifications, digest email | 056-060, 079-081, 133 | digest queue lifetime: 1 email + 2 in-app sent, 0 failed (`evidence/admin-ops/digest-health.json`), so the email digest is barely used | C22 member PASS; MB-057 digest unverified |
| Public API + API keys | 058, 070 | `/api/public/*` 200; key usage unmeasured | walk OK |
| Taxonomy CRUD, journeys admin, users, audit log, export, operations panel | 104-109, 118, 126 | owner tools; low frequency | walk OK; ops panel misreports pool size (B4) |
| AI enrichment | 110-112 | 238 enriched / 3,009 not; last 5 jobs cancelled | walk OK |
| GitHub sync (export to awesome-video) | 117 | last job 2026-07-20 (109 d); 49 jobs (lead recount of `evidence/admin-ops/gh-status.json`): export 5 completed / 22 failed (16 errors, 6 orphaned by restart), import 6 completed / 16 failed (6 errors, 10 orphaned by restart); 11 completed vs 38 failed across both directions | walk OK; stale (B7) |

### Incidental: stop validating; candidates to retire (owner chooses, D9)

The owner-facing list of what to stop testing and why: `lanes/stop-validating.md`. It puts all 259 retired C22 rows into 10 groups, each with its usage evidence and the code change that would make it worth testing again, plus a 7-row retirement-candidates table with code size and removal risk. It recommends deleting nothing.

| Function | INV | Evidence |
|---|---|---|
| Edit-suggestion queue | 083, 102 | 117 suggestions in 90 d, 116 from test accounts |
| Link reports from visitors | 085, 107 | 0 reports ever (0 open, 0 resolved, 0 dismissed) |
| Contact form (variant b) + inbox | 091, 109 | only QA messages found |
| `/advanced` explorer, `/design-system` | 012, 017 | no nav entry (inventory orphans). Keep `/design-system`: the user-level `awesome-ds-verify` skill drives it (`ds-showcase` gate, `~/.claude/skills/awesome-ds-verify/scripts/verify-ds.mjs:128`) |
| Orphan endpoints (~15, e.g. `/api/link-health/summary`, `/api/recommendations/init`, `/api/resource/:id`) | see `lanes/inventory.md` "Orphan candidates" | no client caller |
| 4 consent-gated vendor SDKs (GA4, Mixpanel, PostHog, Amplitude) | 093 | < 2 % of visitors produce events; no read access exists for any (§3) |

## 2. What is broken (ranked)

| # | Finding | Tier | Visitor impact | Evidence | Fix size |
|---|---|---|---|---|---|
| B1 | **App backups are manual-only.** `createDatabaseBackup` has one caller, the admin POST (`server/routes/domains/export-link-health.ts:1058`); no scheduler; live list has 1 backup (2026-11-06 02:08Z). | P10 | none until data loss | lead re-read `/api/admin/database-backups`; `evidence/admin-ops/backups.json` | S: daily scheduled backup + retention by age (keep 14 days, never fewer than the newest 3), plus a backup before every publish. The scheduled backup goes through `runHeavyWork`, writes its audit row, and holds a cross-instance advisory lock: the existing in-flight flag is per process, so another instance may already be dumping. Restore exists only as a CLI (`npm run db:backup -- restore <id>`; it refuses the app's own DB and any non-empty target, verifies SHA-256, compares per-table counts, `server/backup/databaseBackup.ts:35-38`). It has never been drilled on a production backup. `pg_dump` is present in the production image: the 02:08Z backup was made there (`environment: production`, `evidence/admin-ops/backups.json`). There is no retention code at all. Replit's own restore is documented for the **development** DB only ("Time travel … Agent checkpoint"), so a production safety net beyond app backups is UNVERIFIED |
| B2 | **Scheduled jobs only run while an Autoscale instance is up.** Link scan due Nov 4 12:04Z started Nov 5 10:50Z; gaps Aug 4 → Oct 28 and Oct 28 → Nov 3. A live instance ticks every 10 min (`server/jobs/linkHealthScheduler.ts`), so the gaps mean no instance. The same timers drive the hourly digest and contact purge. Lateness vs due time: job 12 started 130 h late, job 13 22.8 h, job 14 4 min. Verdict **likely, not confirmed**: Replit docs say Autoscale "scales to zero when idle" but do not say whether timers pause, and no instance-uptime logs exist (`lanes/admin-ops.md` Follow-up). | P9 | stale link fixes; digests may be late or skipped | `evidence/admin-ops/lh-history.json`, `server/services/linkHealthService.ts:158-178` | M (~80 lines, no schema change): token-guarded `POST /api/ops/run-due-jobs` (header `Authorization: Bearer <OPS_CRON_TOKEN>`) called every 15 min by an external cron. It registers before `registerOperationsRoutes`, which installs the API 404 fallbacks. Before coding, send one bogus `Authorization: Bearer` to the route locally and confirm Clerk's middleware and `optionalApiKey` neither reject nor rewrite it; if they do, use a custom `X-Ops-Token` header. Design: `lanes/run-due-jobs-design.md`. It reuses the existing idempotent entry points (link scan advisory lock `linkHealthService.ts:185`, `runDigestCycle`, contact purge), adds a cross-instance lock around backup, and keeps the in-process timers (`server/index.ts:753-755`) as a fallback. Risk: Autoscale may still stop a 20-90 min scan mid-run; interrupted scans already retry |
| B3 | **No agent-queryable production logs.** UI-only with 30-day retention (Replit docs); the agent reaches ~2 h of the current build through `ask_question` (an LLM's claim). Lines have no date (`logger.ts` HH:MM:SS) and no instance id; there is no `uncaughtException`/`SIGTERM` handler. | ops | slows every incident | `lanes/logs.md` §1-2, §5 | M: logger ISO time + instance id + crash/flush hooks + sink (§4) |
| B4 | **DB pool saturates under load; the panel misreports it.** The real max is 8 (`server/db/index.ts:35`, 3 s connect timeout); the panel prints a hard-coded `max: 3`. The panel's own snapshot at 20:36Z shows `total: 8` beside `max: 3` (`evidence/admin-ops/health-1.json`). Peaks active 8 / waiting 5; the watchdog logged "Connection terminated due to connection timeout" at 19:50Z and 20:12Z (Agent claim) during heavy audit traffic; slow selects up to 7.2 s. | P5 | possible slow or failed requests at peaks | `evidence/logs/ops-health-*.json`, `lanes/logs.md` §3, §6 | S: the panel should read `pool.options.max` (`operations.ts:96`). Each instance has 3 pools: app 8, rate-limit store 2 (`pgRateLimitStore.ts:49`), migrations 1 at boot. No code path holds a connection for minutes; the longest holds are the scan-finalize transaction (`linkHealthService.ts:342-390`) and seed. Fix B14 and B12 first (avoidable load); raise to 10-12 only if `waiting` stays above 0 (`lanes/code-deepdive.md` B4) |
| B5 | **29 link rewrites can never apply and come back every scan.** Each new URL already belongs to another resource (27 approved, 2 rejected), so the remediation panel's "Apply 29 changes" cannot succeed. The 27 approved pairs are duplicate listings. | P2, P9 | duplicate listings; remediation queue never clears | `evidence/admin-ops/rewrite-clash.tsv`, `lanes/admin-ops.md` §Remediation | S: owner-reviewed merge. `lanes/owner-queues.md` lists the 27 pairs as "archive the old-URL row, keep the row holding the live target", with 5 flagged "copy tags first" and 12 "categories differ"; then have remediation mark a clash as "duplicate" instead of re-queuing it |
| B6 | **Researcher spend with falling yield and config failures** (model id `gpt-6.1-sol` not in catalog, quota and credit errors, 11 `budget_stopped`, last 3 runs 0-2 finds). | P8 | none | `evidence/admin-content/researcher-jobs.json`, `lanes/logs.md` §3 | owner settings |
| B7 | **GitHub export stale for 109 days.** The published awesome-video list no longer reflects ~1,000+ changes. | Secondary | list readers on GitHub | `evidence/admin-ops/gh-history.json` | owner decision (D10) |
| B8 | **Approvals backlog**: 23 real submissions, oldest 72 days. | P7 | submitters wait | `evidence/admin-content/pending-resources.json`, decision table `lanes/owner-queues.md` | owner process: the table suggests 17 approve, 2 reject as same-site duplicates, 4 needs a look (0 dead) |
| B9 | **Usage of member features is unmeasurable**: no aggregate for bookmarks, collections, enrolments, API-key use or digest subscribers; `auth.login`/`auth.register` audit rows stopped after the Aug 2026 Clerk move. | tiering | none | `lanes/analytics.md` (c); lead grep: no server code writes `auth.login` | S (~130-160 lines, `lanes/usage-aggregate-design.md`): `GET /api/admin/usage` (isAuthenticated + isAdmin) returns 14 metrics × 28 d/90 d/all-time, each split into real vs test, plus sign-ups by month from `users.createdAt`. There is no server-side test flag today. Ship a heuristic first: one SQL predicate on `[AUDIT`/`[QA-` names, a test-email-domain list and `audit`/`qa` email tokens. Checked against all 143 users, it flags exactly the analytics lane's 85 (0 differences). It also flags 3 of the 4 admin accounts (all but the owner), so it must never gate admin rights or deletion; #77 keeps its explicit allowlist. The predicate also treats the ids in `QA_CLEANUP_USER_IDS` as test accounts, and the runner confirms the signed-in audit users match those ids (`PROD_CHECK_AUDIT_*_ID`) before any Tier 2 write. An `is_test` column on `users` is better but needs `db:push`, so it waits for decision 19. All-time counts are a floor, because deleting an account cascades away its history |
| B10 | **Crawlers cannot tell a removed resource from one that never existed.** Archived (e.g. 190709), rejected (190945) and never-existing (99999999) ids all answer the same 404 on `/resource/:id` and `/api/resources/:id` (lead curl). The logs show crawlers retrying deleted ids (≥ 15 404s in 20 min, Agent claim). The sitemap already excludes them: its 4,074 `/resource` URLs equal the approved count. | P4 | crawl budget spent on dead ids | `lanes/b10-gone-design.md`, `lanes/logs.md` §3 | S (~14 lines, `server/og-middleware.ts` only, no schema change): 410 Gone for archived ids, including the 26 archived on Nov 6 and the 27 B5 archives. Rejected ids keep 404, since they were never public. No 301 until remediation records a `replacedBy` |
| B14 | **Public catalog cache is far smaller than its key space.** The cap is 512 entries (`publicCache.ts:53`) against an estimated 2,400-2,700 legitimate keys, mostly one route-meta key per URL (unverified estimate). Expired entries are never swept; they are only dropped when their own key is read again (`publicCache.ts:132-140`). So the eviction climb 1,039 → 1,296 (snapshots 20:36/20:46/20:56Z) includes dead entries and does **not** by itself prove live data is lost. | P1-P3 | extra DB reads under crawl load | `evidence/admin-ops/health-{1,2,3}.json`, `lanes/code-deepdive.md` B14 | S: sweep expired entries first, split the counter into live vs expired, raise the cap to 4,096 (the 48 MB byte cap still bounds memory), stop caching unresolved routes |
| B15 | **The server does not count page views at all.** Telemetry records only `/api` requests (`server/index.ts:529`); visitor page documents (home, category, resource, search, journey, tag) are never counted and are logged only when they fail (`index.ts:541`). With every vendor tool blocked or consent-gated, there is no first-party page-view number to rank features by. | tiering | none | `lanes/first-party-traffic.md`, lead re-read `index.ts:525-545` | S (~45 lines, 2 files): a template classifier + a user-agent class (human, search bot, AI bot, other bot) recorded as `DOC:<template>:<class>:<status>` counts in the existing telemetry map, with no IP or UA string stored. ~30 more lines for a persisted hourly delta so restarts keep history |
| B12 | Every anonymous page view re-requests `/api/config` and `/api/auth/user` (72 each in 72 views) and `/api/awesome-list/nav` (65). That is extra load on the saturating pool (B4). | P1 | none visible | `lanes/visitor.md` Findings 4, `evidence/visitor/visitor.har` | S: there is no query persistence, so every full page load refetches. Skip `/api/auth/user` when `hasClerkSessionHint()` is false (`clerk-bridge.tsx:136`; owner-password cookie path to check), give `/api/config` staleTime Infinity, and add stale-while-revalidate to `/api/config` and `/api/awesome-list/nav` (`lanes/code-deepdive.md` B12) |
| B13 | `/tag` without a slug renders "All Categories"; resources with `tags: null` (e.g. 190924) show an empty Related section. | Secondary | minor | `lanes/visitor.md` Findings 5-6 | S |
| B16 | **The orphan-job watchdog fails a sweep about 1.6 % of the time** ("Connection terminated due to connection timeout" at 19:50 and 20:12Z, before any audit lane started at 20:35Z). The 60 s sweep (`orphanJobWatchdog.ts:186`) has no retry. Idle clients drop after 30 s, so each sweep reconnects under a 3 s connect timeout while the DB is intermittently slow; when it fails, the research and GitHub sweeps are skipped for that minute. The cause is circumstantial: there are no connect timings. | P9 | none visible | `lanes/watchdog-timeout.md`, `lanes/logs.md` §3 | S: retry once on a connect timeout, WARN until 3 consecutive failures, keep one client warm (`min: 1`), log pool state on failure |
| B11 | **Doc drift: 22 stale claims and 7 dangling references** (`lanes/doc-drift.md`). `docs/ANALYTICS.md:589-590, 610-680` tell readers to run the removed `vg2-*` scripts, including as a post-publish step. In `replit.md`: "2,600" resources (4,074 live, line 5); the old black/cyberpunk UI (217-220); Fuse.js (230, not a dependency); recommendations "planned" (231, they are live); "single-instance, no shared rate-limit store" (159; `pgRateLimitStore` exists); "production must be seeded" (227, unsafe advice for an owner-only destructive action). Its "run after republish" steps (152, 160) point at scripts that no longer exist. | — | misleads every future agent | `lanes/doc-drift.md` | S: one docs PR |

Nothing found is down for real visitors today, so no hotfix is urgent beyond B1.

## 3. Analytics

| Source | Status | What unblocks it (owner) |
|---|---|---|
| First-party DB (admin GETs) | **pulled** (sign-ups, audit log 19,155 rows, queues, jobs) | — |
| Replit Analytics (Umami, cookieless, most representative) | **blocked**: no API | screenshot the Growth pane (Tools → Replit Cloud → Growth), 28 d and 90 d: views, visitors, top pages, events |
| GA4 | blocked | property id + Viewer service account (Admin → Property access management) |
| Search Console | blocked | service account as a restricted user (Settings → Users and permissions), `webmasters.readonly` |
| Mixpanel / PostHog / Amplitude | blocked | service account / personal key `query:read` / OAuth or API key+secret |

Owner steps for decision 4, click by click: `lanes/owner-analytics-steps.md`.
- **Replit:** Tools → Replit Cloud → Growth; 28 d and 90 d screenshots dropped into `evidence/analytics/owner/`.
- **GA4:** steps A-H covering the property id, Cloud project, Data API, service account, a key stored outside the
  repo, and Viewer access. Enhanced measurement is checked view-only.
- **Search Console:** a Restricted user. Google does not confirm a service account works there, so the fallback is
  your own account or a CSV export.
- **First reports:** pages, templates, events, daily.
- Steps marked "check on screen" come from memory, not from a fetched doc.

Caveats: the vendor tools are consent-gated and see < 2 % of visitors, so weight Replit Analytics for volume.
Admin sessions, `/qa-*` paths and `navigator.webdriver` send nothing, so this run's lanes did not pollute any source
(`webdriver=true` recorded in every browser lane). Test accounts dominate every DB metric (85 of 143 accounts).
GA4 Enhanced-Measurement history page views (SPA double counting) cannot be checked without GA access.
Connector choice (R1): Google's official `analytics-mcp` 1.1.0 (read-only by default) or `@google-analytics/data`
7.3.0 `runReport`; details and pins in `lanes/analytics.md` (d).

## 4. Production logs

**Access level: UI-only.** Replit keeps 30 days in the Publishing → Logs viewer with no export or API. The agent's
only route is `ask_question`, which returns the Replit Agent's quote of the current build's logs (≈ 2 h today).
An unattended agent cannot query logs, which is the precondition for self-healing.

| Option | Cost at ~14 k lines/day (~85 MB/mo) | Agent query API | Retention | Change size |
|---|---|---|---|---|
| **Axiom (recommended)** | free Personal: 500 GB/mo ingest, 25 GB storage, 10 GB-h/mo query; a 30-min poll ≈ 0.4 GB-h/mo (~4 %) | `POST /v1/query/_apl?format=tabular` with an Advanced token scoped to query one dataset; ingest uses a separate Basic (ingest-only) token at `POST https://us-east-1.aws.edge.axiom.co/v1/ingest/<dataset>`, NDJSON, ≤ 10,000 events per batch | 30 d | plain `fetch` (no dependency; `@axiomhq/js` 2.0.0 not needed); ≤ 256 fields per dataset on the free plan |
| Grafana Cloud Loki | free (50 GB/mo) | `GET /loki/api/v1/query_range`, basic auth | 14 d | same |
| JSONL in the private App Storage bucket | no vendor | none: list + download objects, no append, per-instance files | as kept | batching + flush + a reader |
| Better Stack | free 3 GB | ClickHouse HTTP, basic auth (v1 query API deprecated) | 3 d | same |
| Sentry (errors only) | free 5 k errors | REST, free-tier API access unconfirmed | 30 d | init + capture hook |

Whatever the sink, the logger change is the same: an ISO timestamp with the date, an instance id, the request id
on every line, and `uncaughtException`/`unhandledRejection`/`SIGTERM` handlers that log and flush. The stdout output
stays, so the Replit viewer keeps working. Details: `lanes/logs.md` §7 and `lanes/axiom-research.md`. Cross-file contradictions between the design files are resolved in `lanes/consistency-review.md` (30 items; this plan follows its single answers). Not documented: ingest rate limits, the body-size cap and free-plan behaviour at the query limit. The exact permission labels for a query-only token are read in the Axiom UI at creation. The poller's query token lives only as `AXIOM_QUERY_TOKEN` in the Mac's launchd environment, never in Replit Secrets; the app holds only the ingest token (`AXIOM_TOKEN`) and `AXIOM_DATASET`. The change design is in `lanes/logger-design.md` (~250 added lines):
- `emit()` builds one scrubbed record. `write()` (`logger.ts:239`) keeps the console line and pushes to a sink with a synchronous append that never awaits, so a request never waits on Axiom.
- The buffer holds 2,000 records and flushes at 200 records or 2 s. When full it drops the oldest INFO first and counts the drops.
- Background jobs, including each job run from the cron endpoint, get `job=`/`jobId=` through a `runWithJobContext` wrapper, so a 60-min scan's lines never carry the cron request's `rid`.
- `processHandlers.ts` handles three cases. `uncaughtException` logs, flushes (≤ 3 s) and exits 1, because Node's state is undefined afterwards. `unhandledRejection` logs and keeps serving (decision 18). SIGTERM flushes.
- The instance id is `INSTANCE_ID`, then `HOSTNAME`, then a boot uuid. Replit documents no per-instance variable.
- Open: the Autoscale SIGTERM grace time.

## 5. Validation flow

One command: `npx tsx scripts/prod-check/index.ts --tier 0,1 [--tier 2] [--base https://awesome.video]`.
- **Runtime:** Playwright `^1.60.0` (already a devDependency) for pages; `fetch` for HTTP. It sets
  `navigator.webdriver`, so analytics stay clean.
- **Output:** writes `result.json` and `summary.md` (screenshots on failure) and exits non-zero on any failure.
  Deploy-time runs write to `e2e-evidence/prod-check/<UTC>/` and copy the summary into the deploy report;
  scheduled runs write to `~/.cache/awesome-prod-check/<UTC>/` and keep 30 days. That follows the owner rule
  that evidence lives only under `.claude/evidence/` or `e2e-evidence/`; the old `reports/prod-check/` path is dropped.
- **Files:** 11 modules of ≤ 350 lines each, ~1,650 lines in total (`lanes/runner-design.md`). A check registry holds
  `{id, tier, kind, blocking, needs, run(ctx)}`, each returning pass/fail/skip/info. CLI flags are
  `--tier --base --only --json --allow-writes --schedule`, with exit codes 0-5.
- **Read-only guard:** a Playwright route interceptor aborts any non-GET to awesome.video in Tiers 0/1/3 and fails
  the run (exit 2). Every URL is curl-checked for 200 before the browser opens it. Clerk sends only GETs on page
  load: all of this run's HARs show 909 Clerk requests, all GET. The run asserts `navigator.webdriver` is true.
  Sessions are never loaded as static cookies. Clerk's `__session` lives about a minute (`client/src/lib/queryClient.ts:183-184`), so the audit admin and the audit member sign in with their credentials inside each run, from env. Values are never printed.
- **Tier 2 gate:** it needs `--tier 2 --allow-writes` and the audit admin and audit member credentials in env (it signs both in during the run), or it exits 3 before any
  request. It runs the QA cleanup in `finally` and never approves. Until #77 exists it stops after T2-05. That still leaves the two `[QA-` submissions from T2-01 and T2-04 (one rejected, one withdrawn), so Tier 2 does not run on a schedule until #77 ships.
- **Type-checking:** `tsconfig.json` includes only `client/`, `shared/` and `server/`. The runner PR adds
  `scripts/prod-check/**` there, so the merge gate type-checks it.
- **Scope:** it reads only production, and it is not part of the build or publish path.
- **Owner rule:** this is a deliberate exception to the 2026-10-11 "no validation scripts" rule, so it needs the
  owner's yes (D1).

Check ids (T0-01..03, T1-01..19, T2-00..14, NEW-1..11; Tier 3 checks keep their dry-run ids in `lanes/tier3-dryrun.md`), each with its assertion and dry-run command: `lanes/tier1-checks.md`. Tier 1 today proves the admin GETs answer, not that the admin UI renders. Four read-only browser checks close that gap (dry-run in `lanes/tier1-checks.md`: NEW-3 and NEW-4 pass; NEW-1 and NEW-2 pass with their assertions corrected; HARs `visitor4.har`/`visitor5.har` 2,689 GET, 0 other). NEW-1, six admin tabs render with data matching their GETs. Link Health's Broken card counts problem links on still-approved resources (1 today), not the job's saved total (27), because remediation archived 26; NEW-2, Resources search/filter/paginator/deep links, checked by reloading a deep link instead of Back/Forward; NEW-3, Review and Edit dialogs open and cancel; NEW-4, the signed-out `/admin` gate (it redirects to `/sign-in?redirect_url=…` and sends no `/api/admin` request). Tier 2 stays reject-only: approving a QA row would make it public and move the counts Tier 1 asserts. The runner asserts curl 200 before opening any sitemap-derived URL in the browser, so a bad URL never fires a telemetry POST. It also never opens a resource page on a signed-in session, because ResourceDetail records a `view` interaction (a DB write) for any signed-in user. Visitor checks run signed out. Selectors are scoped: `getByRole('link',{name:'Next'})` matches two links on `/admin#resources`, so the pager uses `a[href*="page="]`. A real Playwright click on Next moves to `?page=2`, so the earlier agent-browser miss was a tool quirk.

Dry run 2026-11-06 21:0xZ: every Tier 0/1 check below passed twice by hand against production, none flaky (`lanes/tier01-dryrun.md`, HAR `evidence/visitor/visitor2.har`: 1,119 GET, 0 other). Measured: Tier 0 ≈ 2 s; Tier 1 ≈ 10 s curl + ≈ 70 s browser by hand (≈ 30-40 s with Playwright waits). The 6-hourly run can run the curl half alone.

| Tier | When | Checks (each maps to a Primary function) |
|---|---|---|
| 0 Deploy invariants | after every publish; every 30 min from the scheduler | `/api/version` = `git ls-remote origin refs/heads/main` (only **after a publish**; on the 30-min schedule, report "main ahead of prod by N commits" as info, not a failure, because prod lags main between merge and publish); `/api/health/ready` 200; home HTML 200 in < 5 s |
| 1 Primary, read-only, **deploy-blocking** | after every publish; every 6 h | P1 home + all 9 categories + 1 sub + 1 sub-sub render ≥ 1 resource; sitemap `/resource` count = `/api/admin/stats.totalPublic` = `/api/categories` resourceCount sum (all 4,074 today), sitemap total URLs ≥ 4,000; P2 3 random sitemap resources: 200, h1, outbound `href` http(s) + `rel=noopener`; P3 `/api/search?q=ffmpeg` > 0 and ⌘K returns rows; P4 Googlebot fetch of 4 page types (ids picked from the sitemap at run time, never hard-coded) has title (`<title data-react-helmet>`, so match `<title[^>]*>`), description, canonical, og:image (200), JSON-LD that parses; robots 200; bad route → HTTP 404 (by curl, so no telemetry POST); P6 `/sign-in` renders the Clerk widget, `/profile` redirects; 390 px: no horizontal overflow on home/category/resource; 0 console errors; admin GETs with the audit session (P7-P10): `/api/admin/stats` 200, approvals readable, ops health `ready`, newest backup < 26 h (only after decision 2 ships; until then report its age as info), newest link scan `completed` and < 30 h old (warn at 26 h: a scan is due at 24 h, the cron ticks every 15 min and a scan takes up to 90 min), newest Researcher job status ∈ {completed, cancelled, budget_stopped} with `error` empty (warn if none in 14 d). A 401 on any admin GET reports "audit session expired", never the check's own failure |
| 2 Primary write paths | after a publish that touches them; weekly | Step spec in `lanes/tier2-spec.md` (actor, endpoint file:line, body, expected response, read-back, undo). Needs the dedicated audit account (#76) and server-enforced `[QA-` cleanup (#77). (1) audit member submits a `[QA-<run>]` resource. Production refuses example.com (`isReservedTestHost`, `catalog-contributions.ts:819`), so the URL is `https://awesome.video/qa-probe/<run>-N`. (2) it appears in approvals; (3) audit admin rejects it; (4) member withdraws a second `[QA-` submission; (5) bookmark add/remove on one fixed approved resource; (6) admin edits the **rejected** `[QA-` row and reverts it, so the public count Tier 1 asserts never moves. Cleanup: list `[QA-` rows, back them up as JSON, delete one id per call, re-read 404. Server-side guards: a fixed prefix constant re-checked under `FOR UPDATE`, exact title match, audit-admin allowlist, audit-submitted rows only, a fresh-backup hash required. Audit-log rows are append-only (~10 per run). Verified 2026-11-06: an admin PUT on a rejected row does one UPDATE, one audit row and a cache flush. It queues no GitHub sync, email or analytics (`admin-content.ts:649` → `ResourceRepository.updateResource:1107`). A rejected id answers 404 on both `/api/resources/:id` and `/resource/:id` (lead curl, id 190945). Never send `x-analytics-consent: granted`; no step sends email |
| 3 Secondary | weekly, not blocking | Read-only parts dry-run passed (`lanes/tier3-dryrun.md`, ≈ 30 s): 2 journeys from the sitemap (steps render, first outbound 200); 3 tag pages; `/api/public/*` totals = admin `totalPublic` = sitemap (4,074); `/advanced` Explorer 9 / 4,074 / 1,630 / 99 = `/api/categories`; digest health (transport available, 0 failures). Info only: GitHub export age (`/api/github/sync-history`, `max_by(.createdAt)`; 109 d today), enrichment coverage (26.8 %; FAIL on a drop > 2 points vs the last run). Tier 3 is read-only. The audit member's journey enrol/unenrol, collections and digest-preference round-trips become Tier 2 extension steps once #77 ships |

## 6. Redeploy flow

PR → **merge gate** (#84: `scripts/merge-gate.sh <branch>`; design in `lanes/merge-gate-design.md`) → owner merges →
**pre-publish checks** (exact commands in `lanes/prepublish-spec.md`):
- **Schema** (#78, replit-deploy step 3): `git diff --name-status $LIVE $TARGET -- shared/schema.ts migrations`.
  A `shared/schema.ts` change means the owner publishes from the Replit UI. A destructive migration (drop, truncate,
  type change) is a stop.
- **Running jobs** (step 5.3, before `publish_app`): no `pending`/`processing` job on the link-health, enrichment,
  researcher, GitHub sync or backup GETs, because a publish kills them (replit.md C17). Ask the owner; never cancel
  a job to proceed. The backup probe sees only the serving instance's in-flight flag; the scheduled backup's
  cross-instance advisory lock is what prevents two dumps, so a `locked` answer from the run-due endpoint counts as
  running. A cron tick can still start a scan or backup seconds after this check passes. That window is minutes;
  accept it and record any job a publish kills (an interrupted link scan already retries after restart).
  The check is one copy-paste block of six GET probes that fails closed on a null status, an unexpected shape or
  an HTTP error (`lanes/prepublish-spec.md` "Hardening"). It passed at 21:08Z and 21:12Z (admin-ops) and at 21:22Z
  (lead): all six ok, exit 0. Its stop branches were exercised only with synthetic JSON.
- **Fresh backup** (new step 5.3b, B1): one `POST /api/admin/database-backups` per deploy under a one-time owner
  approval (decision 17). Then check 201, newest `completedAt` (not `createdAt`, the dump's start) < 10 min, tables ≥ 42, total rows ≥ 99 % of the previous backup's.

→ `replit-deploy` skill (unchanged steps 1-6) → **step 7 = `prod-check --tier 0,1`** → Tier 2 if the diff touches a
write path → report.

Stop conditions:
- any skill stop condition;
- the merge gate fails;
- the schema differs (hand off to the owner);
- a job is running (wait or ask the owner);
- the backup failed;
- Tier 0/1 fails after the publish.

Merge gate in detail:
- It builds a scratch worktree from fresh origin/main, merges the branch, symlinks node_modules after the merge and
  runs `tsc --noEmit -p . --incremental false` and `npm run build` (with an explicit `BUILD_REVISION`) unpiped.
- It exits with distinct codes: 10 merge conflict, 11 tsc, 12 build. A trap removes the worktree.
- Measured at `6cb1a93e`: tsc 10.9 s, build 5.8 s, both exit 0, so the whole gate takes ~20-25 s.
- Three pitfalls handled. `.gitignore`'s `node_modules/` does not match a symlink, so the link name goes into
  `.git/info/exclude`. `tsBuildInfoFile` lives inside node_modules and would write through the symlink, so
  `--incremental false`. A branch that changes package.json or the lockfile aborts, because the linked modules
  would be stale.
- ESLint is not clean on main: 27 errors in untouched `server/lib/logger.ts` and `server/index.ts`. The gate
  therefore fails only when a changed file has more errors than it has on origin/main.

Rollback is human: Replit Publishing → History → redeploy the previous build (only the 5 newest builds are
kept). Data rollback uses the app backup through the CLI restore into an empty database. Replit's point-in-time
restore is documented for the development database only, so `replit-deploy` SKILL.md:177, which names it for
production data, gets corrected (decision 14 answers it). Each deploy report states which build to roll back to.

## 7. Self-healing loop

Design D, chosen; alternatives in `lanes/lead-r2.md`.

**Triggers** (launchd on the owner's Mac; see "How it runs" below):
- Tier 0 every 30 min as `npx tsx scripts/prod-check/index.ts --tier 0 --schedule`: GET checks only, no browser, no LLM, with T0-01 reported as info ("main ahead of prod by N commits"), so one implementation serves both the schedule and the post-publish run; and Tier 1 every 6 h through `claude -p` (sooner when Tier 0 fails);
- Axiom query every 30 min for new ERROR fingerprints or 5xx above a threshold;
- a daily usage-anomaly check on first-party counts (sign-ups, submissions, scan and backup age) and, once
  connected, GA4/Replit page views by template.

**Loop:**
1. Fingerprint the failure and dedupe it into one GitHub issue (label `selfheal`, fingerprint `[sh:<10hex>]` in the title, evidence attached).
2. The agent opens a fix PR from a worktree.
3. The merge gate runs.
4. **The owner approves the merge and the publish.**
5. The replit-deploy skill ships it.
6. Tier 0+1 runs.
7. The issue closes after 24 h with no recurrence. Otherwise it reopens and escalates. There are at most 2 fix
   attempts per fingerprint per day.

**Default: nothing auto-merges or auto-deploys.** The owner may whitelist classes later (D6).

**How it runs** (`lanes/selfheal-research.md`; docs cited there):
- Tier 0 is a launchd job on the owner's Mac every 30 min running the same runner with `--tier 0 --schedule`: GET checks only, no browser, no LLM.
- Tier 1 and triage are a launchd job every 6 h that runs `claude -p`. It also runs early when Tier 0 sets a failure flag.
- It runs headless with `--permission-mode dontAsk`, a dedicated `--settings` file and `--strict-mcp-config` with an empty MCP config, so the Replit `publish_app`/`update_app_using_prompt` tools do not exist for it.
- A PreToolUse hook is the hard guard (deny rules miss full-path and `sh -c` calls). It blocks any non-GET to awesome.video, pushes to main, force-push, `gh pr merge`, `gh api` writes and ssh to Replit.
- Auth uses `CLAUDE_CODE_OAUTH_TOKEN` (subscription). The wrapper must `env -u` the shell's `ANTHROPIC_*` harness-proxy variables, or the run bills the API instead.
- Dedupe: label `selfheal` plus a fingerprint `[sh:<10hex>]` in the issue title, found with `gh issue list --label selfheal --state all --search "sh:<fp> in:title"`. A match closed less than 7 days ago is reopened, not refiled.
- Rejected: Claude Code cloud routines (1 h minimum, no local worktrees), Desktop scheduled tasks (app open and Mac awake only, missed runs skipped), `/loop` and session cron (die with the session).
- Five items must be proven in a scratch repo before adoption: the OAuth token under launchd/Keychain, `--settings` allow rules under `-p`, hooks under `-p` + `dontAsk`, subscription limits at this cadence, and Axiom query access.
- Limitation: the Mac must be awake. While it sleeps, a separate free external uptime monitor pings `/api/health/ready` and the home page every 5 min and emails the owner on failure. This is not the decision-11 run-due cron, which only wakes jobs (decision 23).

**Rejected: Replit Monitoring Auto-fix / Auto-republish.**
- It commits inside the Replit workspace, not GitHub, so the next replit-deploy stops on "workspace-only
  commits" (replit-deploy SKILL.md).
- If it republishes first, production runs code that is not on main.
- Each run costs Agent credits, and it has no API or webhook.

Replit monitoring **alerts** (Auto-fix off) are still worth enabling as a human-facing trigger.

## 8. C22 re-tiering (613 rows)

Every row is mapped individually: `evidence/lead/c22-retier-rows.tsv` (613 unique ids, with function, bucket and a
≤ 12-word reason each). Method and per-area totals are in `lanes/c22-retier.md`. Lead re-counted the buckets.

| Bucket | Rows | What happens |
|---|---|---|
| Per deploy | 20 | Primary reads: admin tab renders (SH, RS, LH) and the approvals/resources tables. They collapse into the Tier 1 admin GETs |
| Tier 2, weekly | 24 | rows that actually submit on a Primary function (Confirm, Save, Create, Run, Backup); run only with the audit account (#76) and QA cleanup (#77) |
| Periodic, monthly | 310 | sampled one pass per tab, not row by row |
| Retire from routine runs | 259 | loading/retry/offline/empty/validation/focus/copy variants; the edit-suggestion area (Incidental); sign-out (SH-04); rate-limit spam (SH-07); seed and re-seed (DB-05/09). They stay as regression notes when the code they cover changes |

The matrix has **0 visitor rows**; Tier 1 adds the visitor checks that P1-P4 need. An earlier area-level estimate
(27 / 177 / 237 / 172) is superseded: only 24 rows actually write. The 5 Researcher write rows (RS-22/31/39/41/50:
launch, cancel, approve or reject a discovery, Approve All) spend money or change the catalog, so they stay out of
the weekly Tier 2 run (decision 16).

## 9. Execution phases after approval

| Phase | Finish line (evidence) | Effort | Spend |
|---|---|---|---|
| 0 Backups (B1) + pool panel fix (B4) | `/api/admin/database-backups` shows a scheduled backup with `completedAt` < 26 h old two days running; panel shows max 8 | medium | $0 |
| 1 Merge gate #84 | `scripts/merge-gate.sh` fails on a seeded type error and passes on main (exit codes shown) | low | $0 |
| 2 Audit account #76 + QA-prefix cleanup #77 | audit admin and audit member sign in; the cleanup endpoint backs up and deletes `[QA-` rows, re-read 404 | high | $0 |
| 3 Pre-publish schema diff #78 | the check flags a seeded schema change and passes on main | low | $0 |
| 4 Logger upgrade + Axiom | an unattended APL query returns production lines from the last hour from ≥ 2 instances | medium | $0 (free tier); **owner creates the account + 2 tokens** |
| 5 Runner Tiers 0-2 | `prod-check --tier 0,1,2` exits 0 against https://awesome.video; summary committed with the deploy report, raw evidence in `e2e-evidence/prod-check/<UTC>/`; zero `[QA-` rows left | high | $0 |
| 0b Restore drill (B1) | backup `20261106T020839Z-7b26b348` restored into a new empty scratch Postgres prints "RESTORE VERIFIED" with 42 tables and 100,592 rows; prod is never touched | medium | $0 (writes only a scratch DB, which needs owner OK) |
| 6 Jobs off the instance clock (B2) | link scan, digest and backup start on time 2 days running with traffic idle (job timestamps) | medium | Replit Scheduled Deployment cost if chosen, else $0 |
| 7 Deploy skill step 7 + docs | replit-deploy runs the runner; CLAUDE.md, SKILL.md and replit.md updated | low | $0 |
| 8 Self-healing loop | one real finding (e.g. B10) goes issue → PR → merge gate → owner approval → deploy → Tier 0+1 PASS, all linked | high | Claude Code usage |
| 9 Approved fixes (B5, B9, B10, B11) | each shipped through the flow with its Tier check | medium | $0 |

Every `publish_app`, production data write, paid vendor, Secrets or deployment-setting change and GA4 setting
change is confirmed by the owner again at the moment it happens.

## 10. Decisions needed (recommended default in bold)

1. Allow one read-only production check runner as an exception to the no-validation-scripts rule (§5)? **Yes**
2. Scheduled daily app backups kept 14 days (never fewer than the newest 3), plus one before every publish? **Yes**
3. Log sink: Axiom free tier (you create the account and an ingest token + a query-only token)? **Axiom**
4. Analytics: send Replit Analytics screenshots now, and create a GA4 Viewer service account? **Yes**; vendors later
5. Create a dedicated audit admin account and keep the C22 test member for Tier 2 (#76)? **Yes**
6. Classes allowed to auto-merge or auto-deploy in the self-healing loop? **None**
7. Keep `LINK_HEALTH_REMEDIATION=apply`, with a daily remediation summary in the Tier 1 report? **Keep**
8. Accept the Primary / Secondary / Incidental tiers in §1? **Yes**
9. Stop validating the Incidental features (code stays; retiring them is a later, separate decision)? **Yes**
10. GitHub export to awesome-video: resume regularly, or retire the feature? **Resume** (it is named in the README)
11. Move scheduled jobs onto an external trigger (B2), via a new token-guarded "run due jobs" endpoint? **Yes, with cron-job.org** ($0, independent of the Mac). Alternatives: a Replit Scheduled Deployment (~$2/mo; outbound HTTPS unconfirmed) or launchd on the Mac (runs only while it is awake)
12. Researcher: fix the model and budget settings before the next run (B6)? **Yes** (owner settings)
13. Run the restore drill into a scratch database (phase 0b)? **Yes**
14. Read Replit's Data recovery page in the UI and say whether point-in-time restore covers the **production** DB, and for how long? **Yes** (owner, 2 min)
15. Clear the approvals backlog and the 27 duplicate pairs from the decision tables in `lanes/owner-queues.md` (you click, or approve the agent applying exactly those rows)? **You click**; the agent re-reads afterwards
16. Researcher write rows (RS-22/31/39/41/50: launch, cancel, approve or reject a discovery): keep them out of weekly Tier 2, since each run costs money and changes the catalog, and check them only on a deploy that touches the Researcher? **Yes**
17. Pre-approve one backup `POST` per deploy (no restore, no delete) until the scheduled backup ships? **Yes**
18. On an unhandled promise rejection, log it and keep serving, instead of Node's default exit? **Keep serving**, and alert through the sink
19. Add an `is_test` flag on `users` (schema change; db:push; you publish from the Replit UI) so every usage count separates audit accounts exactly? **Later**; ship the heuristic first
20. Post the prepared GitHub comments on #76/#77/#78/#84 and open the 8 new issues in `lanes/issue-drafts.md` §B (creates the new labels; the B11 doc-drift, phase-8 and owner-checklist drafts in §D wait for their decisions)? **Yes**, after this plan merges
21. Add first-party page-view counting by template and bot/human class (B15, counts only), so tiering stops depending on vendor tools you can't read? **Yes**
22. The one accidental `view` interaction (owner account, resource 190875, 21:15:46Z): leave it, or delete it through an owner-approved write? **Leave it**; it is private and harmless
23. Add a free external uptime monitor (e.g. UptimeRobot or Better Stack Uptime) on `/api/health/ready` and the home page every 5 min, emailing you, to cover the hours your Mac sleeps? **Yes**
