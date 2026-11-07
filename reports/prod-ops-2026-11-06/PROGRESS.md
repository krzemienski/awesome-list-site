# prod-ops 2026-11-06 — PROGRESS (resume from here)

Layout is the lead's own (no skill template). Branch `ops/prod-ground-truth-2026-11-06`, worktree
`/Users/nick/Desktop/awesome-list-site/.claude/worktrees/prod-ops` (off origin/main `6cb1a93e`).
The main checkout has someone else's uncommitted `docs/audit/*` edits; never touch them.

## Gate
**AT THE GATE (2026-11-06 21:23Z): PLAN.md complete, PR open, awaiting owner approval. Execute nothing until the owner approves specific §10 decisions.**
PRE-APPROVAL. Read-only on production. No publish, no POST/PUT/PATCH/DELETE to awesome.video. The member lane
does NOT sign in (Clerk sign-in = POSTs, and lane m6 of another session is live on the member account), so member
coverage = code + signed-out walk + C22 member re-drive evidence. Stop after PLAN.md is presented.

## Anchors (run start)
| What | Value | When |
|---|---|---|
| origin/main | 6cb1a93e9992ac03fcd02ae54cc4e4d2a9286d0f | 2026-11-06T20:27Z |
| live /api/version | 6cb1a93e9992ac03fcd02ae54cc4e4d2a9286d0f | 20:27:18Z |
| /api/health/ready | 200 in 0.37 s | 20:27:18Z |
| SSH awesome-replit | exit 0 | 20:28Z |
| owner session (~/.cache/awesome-audit/owner.hdr, minted 08:46 local) | /api/admin/stats 200, /api/admin/operations/health 200 | 20:31Z |

## Concurrent owner on prod (do not disturb)
C22 lane `m6` (another session, agent-browser session `m6`) is live on the test MEMBER account: bookmarked 190924,
turned Email digest ON (weekly) at 20:16Z and polls mail.tm for the digest until ~21:46Z, then unsubscribes and
cleans up. Our member lane is read-only and must not touch notification settings, bookmarks or sign the member out.

## Tool and credential inventory
- Replit MCP (deferred tools): ask_question, get_publish_status, list_app_files, read_app_file, search_apps,
  resolve_app_by_name, list_apps, publish_app (FORBIDDEN pre-approval), update_app_using_prompt (FORBIDDEN),
  create_app_from_prompt. **No tool returns deployment logs directly**; ask_question is the only route (Agent's claim).
- Browsers: agent-browser (HAR via `har start|stop`, owner cookie import via `cookies set --curl`), chrome-devtools MCP.
- Shell: gh, jq, npx. gcloud NOT installed; ~/.config/gcloud has no application_default_credentials.json.
- Credentials present: owner session header (cached), member.env (MEMBER_EMAIL/MEMBER_PASSWORD/MAILTM_PASSWORD),
  .env names: CLERK_*, OWNER_PASSWORD. **Absent**: any GA4 / Search Console / Mixpanel / PostHog / Amplitude
  read credential (only public client keys in `.replit` userenv.shared).
- Playwright: devDependency `^1.60.0`; npm latest 1.65.0.

## Codebase analysis (lead)
- Owner intent: README "Resource Discovery … 2,200+ curated video development resources", search ⌘K, 3-level
  navigation, journeys, bookmarks; admin curation, edit-suggestion queue, GitHub sync, AI enrichment, validation.
  replit.md: "leading platform for video development education and resource discovery"; PostgreSQL single source
  of truth. awesome-list.config.yaml is a stale template (github-pages deploy, multi-list switcher, GA id) — not
  owner intent for the live site.
- Verification policy (replit.md, 2026-10-11): no validation scripts/test suites/gates may be added; verify in a
  real browser and real API. **Tension with the requested "validation runner"** → PLAN decision item.
- Logging: `server/lib/logger.ts` writes one scrubbed line per event via console.log/warn/error
  (`HH:MM:SS LEVEL [area] msg k=v rid=… req="…"`), request id from `server/ops/requestContext.ts`. stdout only.
- `server/routes/domains/operations.ts`: public `/api/health`, `/api/health/live`, `/api/health/ready`
  ({status} only); admin GET `/api/admin/operations/health` → readiness snapshot, DB pool (max 3), publicCache,
  heavyWork, operational telemetry (in-memory, per instance). `/api/health/ai` public = availability only.
- Jobs: link health every `LINK_HEALTH_INTERVAL_HOURS` (prod 24) with `LINK_HEALTH_REMEDIATION=apply` in prod
  (auto-applies fixes daily); digest hourly; contact retention purge hourly; orphan-job watchdog.
- `.github/workflows/` does not exist (removed). `scripts/vg2-ga4-validate.mjs` removed in b4040bfe (also not in
  scripts/archive); docs/ANALYTICS.md still mentions it.
- C22 matrix: 613 rows in main checkout `reports/prod-audit-2026-10-29/cycle-22/rows-{admin-content,admin-ops,member}.md`
  (+ c22-admin-shell.md), final tally docs/audit/VERDICT.md:131.

## Lanes
| Lane | Status | Output |
|---|---|---|
| inventory | DONE 15:4xZ local — 100 INV rows, ~220 routes, 18 admin tabs, orphans, env flags. Lead spot-check: claim "POST /api/recommendations = paid AI for members" is WRONG — server/recommendation-engine.ts imports no AI client (rule-based; only rate-limited by aiLimiter). | lanes/inventory.md |
| visitor | DONE ~20:55Z — no Primary visitor function down; browse/search/resource/outbound/SSR/OG/sitemap/public API all work at 1440+390; home TTFB 0.16-0.22 s; 0 console errors. Catalog 4,074 resources. HAR 4,324 GET + 4 POST (dead-link telemetry). | lanes/visitor.md |
| member | DONE 20:41Z — signed-out only. Gates OK (redirects to /sign-in, 15 member GETs 401, Clerk widget renders 1440/390, no overflow, no console errors). No anonymous usage aggregates exist. Signed-in features UNVERIFIED live (rest on C22 re-drive). Lead corrections appended: MB-003 is fixed (#278); HAR = 1,590 GET + 1 POST. | lanes/member.md |
| admin-content | DONE 20:5xZ — all tabs load; HAR 2,153 GET / 0 non-GET (lead re-counted). Approvals queue 23 real submissions, oldest 2026-08-26 (lead re-read live: 23). Researcher = heaviest admin feature (109 jobs, ≥$592; $100 in 90d; last runs 0-2 finds). Enrichment barely used (238 enriched, 3,009 not; last 5 jobs cancelled). Edit suggestions ~all audit noise. GitHub sync last done 109d ago; 27 broken links (admin-ops). | lanes/admin-content.md |
| admin-ops | DONE ~21:00Z. HAR lead-recount 566 GET / 0 non-GET (2 segments). Snapshots 20:36/20:46/20:56Z ready, pool total 8/4/2 vs displayed max 3, cache evictions 1,039→1,296 (PLAN B14). GitHub sync 49 jobs, export 5 ok/22 failed. 29 pending rewrites all clash with existing resources → never applicable, re-queued every scan (PLAN B5). Earlier: **URGENT-ish: app backups are manual-only.** Lead verified: createDatabaseBackup's only caller is the admin POST route (export-link-health.ts:1058); no scheduler; live list = 1 backup (20261106T020839Z). (Replit/Neon point-in-time restore is the platform's separate safety net — retention unverified.) Link scan schedule gaps (no Nov 4 run). Auto-remediation ran once (job 14, Nov 6 12:06Z: 26 archived, 88 rewrites; 10 sampled, none harmful); 29 rewrites blocked as duplicates. | lanes/admin-ops.md |
| analytics | DONE 20:5xZ — first-party DB via admin GETs: 143 accounts (85 QA-flagged; non-test sign-ups 38/90d, 23/28d), audit log 19,155 rows, rec feedback ~92% test, 0 link reports, 5 journeys, sitemap 4,766 URLs (4,074 /resource = approved count; lead re-counted live). All vendor sources BLOCKED (creds listed). Broken signal: auth.login/register audit rows end 2026-08 — lead confirmed no server code writes them any more (Clerk migration dropped the hook). No admin aggregate for bookmarks/collections/enrolments/API-key use/digest subs. ask_question returned "agent busy" (Replit Agent run active in workspace?) — note for logs lane + any future publish. | lanes/analytics.md |
| logs | DONE 21:14Z — 4 captures 20:36-21:13Z all 200, same rev + migration time (one process), 0 DB errors, 0 5xx, slow selects 52→75 (max 7.2 s). Lead correction appended re pool max (8, not 3). Earlier: — access level UI-only. ask_question can read only the live build's runtime logs (~2h, since boot 18:36:11Z); lines carry no instance id. "Agent busy" = transient (parallel ask_question calls collide), not proof of an Agent run writing the workspace → rule: never send ask_question in parallel. Captures 2-4 running ~11 min apart. | lanes/logs.md |

## Write-proof ledger (non-GET requests to awesome.video)
| Time (Z) | Lane | Request | Status | Cause | Effect |
|---|---|---|---|---|---|
| 20:40:36, 20:40:40, 20:40:44, 20:43:40 | visitor | 4× POST /api/telemetry/dead-link | 204 | automatic 404 monitor on /nonexistent-route ×2, /resource/99999999, /collection/zzzz | log lines only |
| 21:15:46 | visitor (Playwright) | POST /api/interactions | 201 | wrong-selector click opened resource 190875 on the owner session | **one DB row** (owner `view` interaction); left in place, PLAN D22 |
| ~20:35 | member | POST /api/telemetry/dead-link | 204 | automatic client 404 monitor on visiting /collection/doesnotexist (no click) | one server warn log line; no DB row (catalog-contributions.ts:607) |

## Next
- 20:50Z PLAN.md DRAFT written (248 lines, all 10 sections; cited evidence paths verified to exist). R2 done (lanes/lead-r2.md).
  C22 re-tier done (evidence/lead/c22-retier.txt: 27 per-deploy / 177 periodic-primary / 237 periodic-secondary / 172 retire).
  Lead finding B2: link scan (and every setInterval job) runs only while an Autoscale instance is up — due Nov 4 12:04Z, started Nov 5 10:50Z.
- Waiting: admin-ops final (lane file not written yet), logs captures 2-4 (~21:15Z).
- Then: fold their final numbers into PLAN.md §2/§4, final write-proof (all HAR tables + /api/version unchanged),
  commit lanes+evidence+PLAN on ops/prod-ground-truth-2026-11-06, push, open PR (plan docs only), delete cron d354da11,
  present ≤300 words and STOP at the gate.

## Check-ins
- 20:44Z origin/main 6cb1a93e = live 6cb1a93e, ready 200; open PRs: #27 (cf, unrelated). Done: inventory, analytics, member, admin-content. Running: visitor (88 evidence files, no lane file yet → nudged), admin-ops (health snapshots 2-3), logs (captures 2-4, ~30 min).
- 20:5xZ lead finding: DB pool real max = 8 (server/db/index.ts:35, connectionTimeoutMillis 3000); /api/admin/operations/health hard-codes `max: 3` (operations.ts databasePool) → panel misreports. Telemetry peakActive 8 / peakWaiting 5 = saturated pool; consistent with watchdog "Connection terminated due to connection timeout" ERRORs at 19:50 and 20:12Z (logs lane, Agent claim) and slow selects up to 7.2 s. Logs lane draft: access UI-only (~2 h window, current build only); sink rec = Axiom.
- 20:54Z origin/main 6cb1a93e = live 6cb1a93e, ready 200; open PR #27 only. Done: inventory, analytics, member, admin-content, visitor. Running: admin-ops (snapshot 2 taken 15:46 local, no lane file → nudged), logs (ops-health-2 taken, captures 3-4 pending).
- 21:0xZ OWNER: "keep idle agents busy, keep going". Wave 2 (read-only, same gate) assigned:
  visitor → lanes/tier01-dryrun.md (dry-run every PLAN §5 Tier 0/1 check); admin-ops → digest/retention/watchdog status + B2 proof (append to admin-ops.md);
  inventory → lanes/code-deepdive.md (B4 pool, B14 cache keys, B12 refetch, B2 trigger, backup internals);
  analytics → evidence/lead/c22-retier-rows.tsv + lanes/c22-retier.md (per-row §8); member → lanes/selfheal-research.md (scheduler for loop D);
  admin-content → lanes/owner-queues.md (23 approvals + 29 duplicate pairs, decision tables). logs still on captures 3-4.
  Gate unchanged: no publish, no prod writes until owner approves specific PLAN §10 items.
- 21:04Z origin/main 6cb1a93e = live 6cb1a93e, ready 200; open PR #27 only; no /tmp wrapper scripts. Wave 2 done: admin-ops (Follow-up 1-2), admin-content (owner-queues.md). In flight: visitor (tier01-dryrun), inventory (code-deepdive), analytics (c22-retier-rows), member (selfheal-research), admin-ops (run-due-jobs design), admin-content (tier2-spec), logs (captures 3-4).
- 21:16Z origin/main 6cb1a93e = live 6cb1a93e, ready 200; open PR #27 only; worktree clean outside reports/; no stray /tmp scripts. All 7 discovery lanes DONE; wave-3 tasks in flight: visitor (Playwright Next click), admin-ops (running-jobs snippet), member (doc-drift.md written), analytics (plan-factcheck.md written), inventory (PLAN re-check), logs (watchdog root cause). PLAN summary replaced (178 words).
- 21:2xZ Consistency gaps closed: 11 PLAN edits applied from consistency-review "Proposed PLAN text" (2b, 5, 11b, 13, 16, 21, 22, 23, 24, 26, 30); 4 kept design-only (12, 18, 19, 20). runner-design.md amended (in-run credentials, --schedule). Lead verified backups carry `completedAt`. PLAN has 23 decisions. Waiting only on admin-ops (running-jobs snippet). Then: commit + push branch, open PR, delete cron d354da11, present, STOP.

- 21:23Z ALL LANES DONE (7 discovery lanes + waves 2-3). PLAN.md final: 10 sections + 178-word summary, 23 decisions, 16 broken items (B1-B16).
  Final anchors: origin/main = live = 6cb1a93e, ready 200 (unchanged all run). Write proof: evidence/lead/write-proof.md (12,917 GET; 6 telemetry POSTs; 1 owner view-interaction row).
  Cron d354da11 deleted. Committed: PLAN.md, PROGRESS.md, LANE-RULES.md, lanes/, evidence/lead/. NOT committed: evidence/<lane>/ (92 MB raw, cookies redacted).
  RESUME: read PLAN §10 owner answers → execute only approved items in §9 phase order, each through merge gate + replit-deploy; every publish_app and prod write re-confirmed with the owner at the moment.

## APPROVED — 2026-11-06 21:30Z
Owner said "go" after the plan presentation → all 23 recommended defaults in PLAN §10 accepted. PR #280 merged (origin/main 1b5baba9).
Standing rules still in force: every publish_app and every production data write is re-confirmed with the owner at that moment
(brief: "Irreversible steps that need explicit owner confirmation, even after plan approval"). Owner-side actions (Axiom account,
GA4 SA, uptime monitor, cron-job.org, Replit Secrets OPS_CRON_TOKEN/AXIOM_*, Data recovery page read, audit accounts) are listed
for the owner; agents do not create accounts or change Secrets.

## Build wave 1 (code PRs, no prod writes; parallel, each in its own worktree off origin/main)
| Unit | Owner lane | Branch | PLAN refs | Done when (local) |
|---|---|---|---|---|
| merge-gate script | inventory | build/merge-gate | #84, §6 | script exits 0 on main, 11 on a seeded type error (shown) |
| backups scheduled + retention + panel max | admin-ops | build/backups | B1, B4 panel, D2 | tsc+build clean; code path reviewed; prod proof after publish |
| run-due-jobs endpoint | admin-content | build/run-due | B2, D11 | tsc+build clean; local call with bad/good token → 401/200 |
| logger + Axiom sink (null sink when unset) | logs | build/logger | B3, D3, D18 | tsc+build clean; local run prints ISO+instance; fake token redacted |
| pool/cache/refetch + watchdog retry | member | build/perf | B4, B12, B14, B16 | tsc+build clean; local page view shows no config/auth refetch |
| 410 archived + page-view counting | analytics | build/visitor-signals | B10, B15, D21 | tsc+build clean; local curl archived id → 410 |
| prod-check runner Tier 0/1 | visitor | build/prod-check | §5, D1 | runner exits 0 against https://awesome.video (read-only), evidence in e2e-evidence/ |
Wave 2 after wave 1 merges: #76 audit accounts + #77 QA cleanup + Tier 2, #78 pre-publish check into SKILL.md, docs (B11), self-heal loop, B9 usage endpoint.
Then ONE batched publish (owner yes) → Tier 0+1 on prod.
- 21:3xZ Owner "go". PR #280 merged (1b5baba9). Issues opened #281-#288 (existing labels only); comments posted on #76/#77/#78/#84.
  Wave 1 spawned (fresh sonnet agents; old lanes had shut down): b-merge-gate, b-jobs, b-logging, b-load, b-signals, b-runner, b-qa.
  Rules: BUILD-RULES.md (to be committed with the next docs commit). Check-in cron recreated (10 min).
- 21:36Z b-docs spawned (build/docs-deploy, Refs #288 #78: doc drift, replit-deploy SKILL steps 3/5.3/5.3b/7/rollback, CLAUDE.md pointer). 8 build agents running; no PRs yet; no /tmp scripts.
- 21:4xZ PRs: #289 load (changes requested: revert nav SWR), #290 qa-cleanup (review), #291 410+page counts MERGED 15466a49 (review APPROVE + lead gate tsc 0/build 0 on merged tree), #292 jobs/backups (review), #293 logging (review), #294 usage (review), #295 merge gate (review), #296 docs+deploy skill (review). b-runner still building.
- 21:4xZ #289 MERGED (nav revert verified, lead gate tsc 0/build 0 on merged tree). #292 approved: 3 medium fixes requested. #293 changes needed: watchdog .cause chain (HIGH) + 3 low.
- 21:44Z check-in: main edb8f077, live 6cb1a93e (unpublished, expected), ready 200. Merged: #289, #291. Open: #290 #294 (review r-290-294), #292 (fixes in flight), #293 (fixes in flight), #295 #296 (review r-295-296). b-runner building (scripts/prod-check/ + tsconfig, no PR yet). /tmp: merge-gate.sh + mg-debug.sh are lane/reviewer copies of the gate script (not wrappers); oldBackup.ts predates this session (11:30), left.
- 21:4xZ #293 MERGED: lead gate on merged tree tsc 0/build 0; eslint per file no worse (watchdog 2→1); lead tsx proof isConnectionTimeout true/true/false.
- 21:4xZ #292 MERGED (fixes verified in code: isFinite filter, allSettled + prune skip; lead gate merge 0/tsc 0/build 0). #294 MERGED (review APPROVE; lead gate 0/0/0). #290 sent back: cascade guard (MEDIUM) + 2 low, rebase on main. main 5dc6a420.
- 21:5xZ #290 MERGED after rebase onto 5dc6a420 (guard verified by lead against schema; both route registrations present; gate merge 0/tsc 0/build 0). Remaining: #295 #296 (review r-295-296), b-runner (no PR yet).
- 21:54Z check-in: main 9b5bb0d7, live 6cb1a93e (unpublished), ready 200. Open: #295 #296 (review r-295-296), #297 runner (review r-297; lead ran tier1 exit 0 / 0 non-GET; tier0 T0-01 fails correctly pre-publish). 6 of 9 wave-1 PRs merged.
- 21:5xZ /tmp: removed b-runner probe scripts pc-probe*.mjs (GET-only shape dumps, printed cookie NAMES only) and mg-debug.sh; kept /tmp/merge-gate.sh (reviewer r-295-296 may be using it).
- 21:5xZ #296 MERGED (4 review fixes verified; gate 0/0/0). Remaining: #295 (fixes in flight), #297 (review r-297).
- 21:5xZ #295 MERGED (fixes verified: trap exit 130, fetch refusal; lead ran the gate itself: build/merge-gate exit 0, build/prod-check exit 0, no leftover gate worktrees). Remaining: #297 (review r-297).
- 21:5xZ DEPLOY PRE-CHECK (read-only, replit-deploy steps 1-3 + 5.3a): TARGET c116e9b5, BEFORE (live) 6cb1a93e.
  schema.ts / migrations / package.json / lockfile: NO change → no npm install, no db:push, publish_app expected to work.
  Running-jobs check (skill's own block from main): ALL CLEAR, exit 0.
  Workspace: main @ f0adce375 = empty "Published your App" (tree == 6cb1a93e's tree d752cb3a; kept on replit-agent + gitsafe-backup) → sync = `git reset --keep origin/main` (skill's allowed exception). Clean tree.
  9 commits go live (#280 docs, #289 #290 #291 #292 #293 #294 #295 #296). Waiting: #297 review; then OWNER YES before workspace sync + 5.3b backup POST + publish_app.
- 22:04Z check-in: main c116e9b5, live 6cb1a93e (unpublished), ready 200. 8/9 merged; #297 changes requested (expired-session exit code HIGH, NEW-4 blocking), b-runner fixing. Deploy pre-check done (no schema/dep change, jobs clear, workspace on empty publish commit). Awaiting owner "publish".
- 22:08Z #297 MERGED: lead re-ran bogus-session repro (exit 5, "owner session expired") and real tier 1 (exit 0, 0 non-GET, NEW-4 blocking pass); scripts/merge-gate.sh from main → exit 0. ALL 9 wave-1 PRs merged; main baa3ec4a. Schema/deps still unchanged vs live. Next: owner "publish".
- 22:14Z PUBLISH STARTED (owner said "publish"). Evidence e2e-evidence/replit-deploy/20261106T221116Z/. Steps: 1 pin TARGET baa3ec4a BEFORE 6cb1a93e (no schema/deps diff); 2 ws `git reset --keep origin/main` past empty publish commit f0adce375 → baa3ec4a, clean; 3 skipped (no install/db:push needed); 4 publish-build exit 0, stamps BUILD_REVISION=baa3ec4a; 5.3a jobs ALL CLEAR; ws tree == target tree; .env present = public VITE_* mirror only (#273), mtime 21:44Z not ours — noted, not secret-bearing; 5.3b backup POST 201 → 20261106T221323Z-5ac18ce5, completedAt 22:13:33Z, 42 tables, 107,968 rows (prev 100,592); publish_app → pending. Polling /api/version.
- 22:20Z LIVE baa3ec4a (368 s), ready 200, home 200 0.20 s. prod-check: tier 0,1 PASS exit 0 (22 pass, 1 info, 3 non-blocking fails NEW-1..3), tier 3 PASS exit 0, 0 non-GET. REGRESSION from #289: /admin shows "must be signed in" for a valid owner cookie without the localStorage marker (evidence 09-admin-signed-out-regression.png). Admin API checks pass. Hotfix agent b-authfix spawned (fix/owner-session-hint). Second publish needs owner yes.
- 22:30Z #298 MERGED (hotfix: av_admin_hint cookie + /admin never skips auth fetch). Review APPROVE (2 low: tampered cookie hint survives; client-nav from / to /admin with pre-hint cookie may show cached signed-out until reload). Gate exit 0. main 882a4316. Second publish awaits owner yes.
- 01:08Z PUBLISH 2 STARTED (owner "publish"): TARGET 882a4316 BEFORE baa3ec4a, no schema/deps; ws reset past empty publish commit e04aadc83 → 882a4316 clean; build exit 0 stamps 882a4316; tree match; jobs ALL CLEAR; backup 20261107T010741Z-34d030b3 (42 tables, 108,038 rows ≥ prev 107,968); publish_app pending. Evidence .claude/worktrees/prod-ops/e2e-evidence/replit-deploy/20261107T010621Z.
- 01:1xZ (Nov 7) LIVE 882a4316 (399 s), ready 200, home 200 0.24 s. prod-check tier 0,1 PASS exit 0 (25 pass, 0 fail, NEW-1..3 now pass), tier 3 PASS exit 0, 0 non-GET. Live spot-checks: 410/404/200 on archived/rejected/approved; pool max 8; 29 DOC: counters; cache live/expired evictions; POST /api/ops/run-due-jobs → 503 (token unset; no work run; the only non-GET outside the publish steps); /api/admin/usage 200; /api/admin/qa-rows 403 (allowlist unset, deny-by-default).
  Issues closed with evidence: #285 #286 #287 #288 #84 #78. Commented (awaiting owner setup): #284 #283 #282 #281 #77. Open: #76 (audit account), #85.
## STATE: WAVE 1 SHIPPED. Owner-side steps remaining (see final report). Wave 2 (audit account #76 → Tier 2; restore drill; self-heal loop) waits on them.

## VERIFIED: 2026-11-07 03:05Z (owner: "publish + promote", keep admin)
- Live 9d580ddb = origin/main (3 publishes: a691ef35, 3c1663e6, 9d580ddb; each after the 5.3a jobs probe and a fresh 5.3b backup, latest 20261107T025603Z-0d5543a6, 42 tables, 107,965 rows).
- Tier 0+1: 25/25 PASS, exit 0 (`evidence/verified-20261107/tier01-*`).
- Tier 2: 9/9 PASS, exit 0; zero `[QA-20261107T030323Z]` rows left, re-read 404 (`evidence/verified-20261107/tier2-*`).
- Logs: unattended GET /api/admin/logs returns 761 lines from the last hour from 2 instances of the new build (#311 boot-suffixed instance tag) (`evidence/verified-20261107/logs-query.json`).
- Audit admin user_3Ll7BiTtwPUMFSN96bgs6ClDXYI promoted to admin (PUT role 200, read-back admin); kept by owner decision.
- B5 code fix #310, B11 docs #309, log instance #311 merged and live. Self-heal loop dropped by owner (PR #307 closed).
- Open: B2/B1 "two days running" finish lines (time-based; check the backup list on 2026-11-09); B5 data half (archive 27 duplicate rows) needs owner per-pair OK.
