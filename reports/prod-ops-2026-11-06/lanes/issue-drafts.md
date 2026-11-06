# Issue drafts (nothing posted; posting needs the owner's OK)

> Layout is mine. Sources: `gh issue view 76/77/78/84` (all OPEN), PLAN.md §2, §5, §9, and the design files named below. Repo labels today: bug, documentation, duplicate, enhancement, good first issue, help wanted, invalid, question, wontfix, codex. Labels marked (new) do not exist and creating them is a GitHub write. Paths are relative to `reports/prod-ops-2026-11-06/`. Commit the lane files before posting, or the links are dead. Replace `<branch>` with the branch/PR that holds them.

## A. Comments on existing issues

### #76 Audit runs need a dedicated admin account
> Design: `lanes/tier2-spec.md` (actors M = audit member, A = audit admin, both signing in through the normal flow). Plan: PLAN §5 Tier 2 and §9 phase 2 (decision 5: create a dedicated audit admin and keep the C22 test member).
> **Finish line (PLAN §9 phase 2):** the audit admin and the audit member both sign in; the `[QA-` cleanup endpoint (#77) backs up and deletes rows with a read-back 404. Until then audit lanes still share the owner session and the "never sign out" rule stays in force.
> Not started. Creating the admin account is a production write and needs the owner's OK.

### #77 QA rows cleaned up by a server-enforced prefix
> Design: `lanes/tier2-spec.md` (Tier 2 writes only `[QA-<run>]` rows; step list includes the read-back and undo for each). Plan: PLAN §5 Tier 2, §9 phase 2.
> **Finish line (PLAN §9 phase 2):** the cleanup endpoint lists rows whose title matches the reserved prefix, writes a JSON backup, deletes by id, and a re-read of each id returns 404; zero `[QA-` rows remain after a Tier 2 run (also the phase 5 finish line).
> Note from the spec: production refuses example.com submissions, so QA rows use `https://awesome.video/qa-probe/<run>-N`.

### #78 Detect a pending production schema change before publish_app
> Design: `lanes/prepublish-spec.md`, check (a) in replit-deploy Step 3, using the existing diff `git diff --name-status $LIVE $TARGET -- shared/schema.ts migrations` (PLAN §6). The same spec adds (b) running-jobs check and (c) fresh-backup step before `publish_app`.
> **Finish line (PLAN §9 phase 3):** the check flags a seeded schema change and passes on main, with both outputs shown. When it flags, the owner is told before any sync that the Publishing-pane review is needed.

### #84 Merge-gate script
> Design: `lanes/merge-gate-design.md`. Plan: PLAN §6 (merge gate in the PR flow), §9 phase 1. Measured locally on main: tsc ≈ 10.9 s, `npm run build` ≈ 5.8 s, so the gate is cheap.
> **Finish line (PLAN §9 phase 1):** `scripts/merge-gate.sh <branch>` exits non-zero on a seeded type error and 0 on main, exit codes shown unpiped.

## B. New issues

### B1 — Scheduled database backups + restore drill
- **Title:** Scheduled daily backups with retention, plus a restore drill on a production backup
- **Labels:** enhancement, reliability (new)
- **Body:** Only one backup exists (2026-11-06 02:08Z) and `createDatabaseBackup` has one caller, the admin POST (`server/routes/domains/export-link-health.ts:1058`). No scheduler, no retention code. Restore exists only as `npm run db:backup -- restore <id>` and has never been run on a production backup. Proposal: daily scheduled backup (driven by the B2 endpoint), retention policy, and a backup before every publish (prepublish-spec check c). Restore drill: restore `20261106T020839Z-7b26b348` into a new empty scratch Postgres. Plan: PLAN §2 B1, §9 phases 0 and 0b. Design: `lanes/prepublish-spec.md` (c). **Done when:** `/api/admin/database-backups` shows a scheduled backup under 26 h old two days running, and the drill prints "RESTORE VERIFIED" with 42 tables and 100,592 rows with prod untouched. Note: writing a scratch DB and the first scheduled backup need the owner's OK.

### B2 — run-due-jobs endpoint
- **Title:** Token-guarded `POST /api/ops/run-due-jobs` so scheduled jobs run when no instance is up
- **Labels:** enhancement, reliability (new)
- **Body:** Link scan due Nov 4 12:04Z started Nov 5 10:50Z; job 12 started 130 h late. Timers live in the Autoscale instance and the cause is likely (not confirmed) scale-to-zero. Add the endpoint, a new Replit Secret `OPS_CRON_TOKEN` (constant-time compare, 503 if unset, rate limited, one log line per job), called every 15 min by cron-job.org (PLAN decision 11). Plan: PLAN §2 B2, §9 phase 6. Design: `lanes/run-due-jobs-design.md`. **Done when:** link scan, digest and backup start on time two days running with idle traffic (job timestamps). Adding the secret and the external cron are owner-approved changes.

### B3 — Logger + Axiom
- **Title:** Agent-queryable production logs: ISO time, instance id, crash hooks, Axiom sink
- **Labels:** enhancement, observability (new)
- **Body:** Logs are UI-only with 30-day retention; lines carry no date (`HH:MM:SS`) or instance id and there is no `uncaughtException`/`SIGTERM` handler. Implement the logger changes and an ingest sink using plain `fetch` with a bounded buffer (no SDK), separate ingest-only and query-only tokens, flat bounded fields (Personal plan rejects new fields past 256). Plan: PLAN §2 B3, §4, §9 phase 4. Design: `lanes/logger-design.md`, `lanes/axiom-research.md`, `lanes/logs.md`. **Done when:** an unattended APL query returns production lines from the last hour from at least two instances. The owner creates the Axiom account and two tokens.

### B4 / B12 / B14 — pool, refetch, cache (one issue, three tasks)
- **Title:** Reduce DB pool pressure: fix pool panel, stop redundant anonymous fetches, fix public cache sizing
- **Labels:** bug, performance (new)
- **Body:** (B4) The operations panel prints hard-coded `max: 3`; the real pool max is 8 (`server/db/index.ts:35`). Read `pool.options.max` (`operations.ts:96`). Pool saturated at 8 active / 5 waiting during heavy traffic. (B12) Every anonymous page view re-requests `/api/config`, `/api/auth/user` (72 each in 72 views) and `/api/awesome-list/nav` (65): skip auth when `hasClerkSessionHint()` is false, `staleTime: Infinity` for config, stale-while-revalidate for config and nav. (B14) Public cache cap is 512 entries (`publicCache.ts:53`) against an estimated 2,400-2,700 keys (unverified estimate); expired entries are never swept. Sweep expired first, split live/expired counters, raise cap to 4,096, stop caching unresolved routes. Do B14 and B12 before judging whether the pool needs more. Plan: PLAN §2 B4/B12/B14, §9 phase 0 (panel). Designs: `lanes/code-deepdive.md`, `lanes/visitor.md`, `lanes/logs.md` §3/§6. **Done when:** panel shows max 8; a repeat of the visitor HAR shows `/api/config` and `/api/auth/user` once per session; cache counters show live vs expired.

### B5 — Duplicate-clash remediation
- **Title:** 29 link rewrites can never apply: merge duplicate listings and mark clashes as duplicate
- **Labels:** bug, data (new)
- **Body:** Each of 29 proposed new URLs already belongs to another resource (27 approved, 2 rejected), so "Apply 29 changes" cannot succeed and the rows return every scan. Owner-reviewed merge: archive the old-URL row, keep the row with the live target; 5 pairs need tags copied first, 12 have differing categories. Then change remediation to mark a clash as "duplicate" instead of re-queuing. Plan: PLAN §2 B5, §9 phase 9. Data: `lanes/owner-queues.md`, `evidence/admin-ops/rewrite-clash.tsv`. **Done when:** the remediation queue shows 0 clashes after the next scan. Archiving rows is a production write needing the owner's approval per pair list.

### B9 — Usage aggregate endpoint
- **Title:** Admin aggregate endpoint for member-feature usage
- **Labels:** enhancement, analytics (new)
- **Body:** Bookmarks, collections, enrolments, API-key use and digest subscribers cannot be counted; `auth.login`/`auth.register` audit rows stopped after the August Clerk move. Add one read-only admin endpoint returning counts (no per-user data). Plan: PLAN §2 B9, §9 phase 9. Evidence: `lanes/analytics.md` (c), `lanes/member.md` §4 (no anonymous counts exist). **Done when:** the endpoint returns the counts and Tier 3 can record them weekly.

### B10 — 410 for archived ids
- **Title:** Return 410 (or redirect) for archived/deleted `/resource/<id>`
- **Labels:** enhancement, seo (new)
- **Body:** Crawlers repeatedly request deleted resource URLs (at least 15 404s in 20 min; an agent claim, not yet confirmed from raw logs). Return 410, or a redirect where a live replacement exists. Plan: PLAN §2 B10, §9 phases 8-9 (the first real self-healing finding). Evidence: `lanes/logs.md` §3. **Done when:** a request for an archived id returns 410, Tier 1 P4 still passes, and the fix has gone through issue → PR → merge gate → owner approval → deploy.

### Prod-check runner (Tier 0-3)
- **Title:** `scripts/prod-check`: read-only production checks, Tiers 0-3
- **Labels:** enhancement, ops (new)
- **Body:** One command, `npx tsx scripts/prod-check/index.ts --tier 0,1[,2] [--base https://awesome.video]`. Playwright (existing devDependency) for pages, `fetch` for HTTP, writes `reports/prod-check/<UTC>/result.json` and `summary.md`, non-zero exit on failure, files ≤ 500 lines, not part of the build or publish path. Tier 0 deploy invariants (3 checks, ≈ 2 s), Tier 1 Primary read-only (19 checks, deploy-blocking), Tier 2 write paths with the audit accounts (depends on #76/#77), Tier 3 secondary weekly. All 22 Tier 0/1 checks passed twice by hand on 2026-11-06. This is a deliberate exception to the 2026-10-11 "no validation scripts" rule and needs the owner's yes (decision D1). Plan: PLAN §5, §9 phases 5 and 7. Design: `lanes/tier1-checks.md`, `lanes/tier2-spec.md`, `lanes/tier01-dryrun.md`, `lanes/tier3-dryrun.md`. **Done when:** `prod-check --tier 0,1,2` exits 0 against production, evidence committed under `reports/`, zero `[QA-` rows left; replit-deploy step 7 runs it.

## C. Notes for the owner
- B6, B7, B8, B11 have no draft: B6 to B8 are owner decisions in the plan, and B11 was not in the rows I was given.
- Posting also means creating labels (reliability, observability, performance, data, analytics, seo, ops) or dropping them in favour of the existing `enhancement`/`bug`.
- Phase 8 (self-healing) will want its own issue once the trigger design in `lanes/selfheal-research.md` is approved.

## D. Added on request (drafts, nothing posted)

### B11 — Doc drift in replit.md and docs/ANALYTICS.md
- **Title:** Fix stale claims in `replit.md` and `docs/ANALYTICS.md`
- **Labels:** documentation
- **Body:** Each claim below was checked against the `prod-ops` worktree or this run's lane files (paths relative to `reports/prod-ops-2026-11-06/`).

| # | Claim | Where | Reality | Evidence |
|---|---|---|---|---|
| 1 | Validation harness `scripts/vg2-ga4-validate.mjs` drives Chromium against real GA4 | `docs/ANALYTICS.md:614`, run instructions `:653` | Script does not exist; removed in `b4040bfe` ("Remove all validation scripts…"). `ls scripts/vg2*` finds nothing | git log of that path |
| 2 | Teardown `scripts/vg2-teardown.ts` purges QA rows | `docs/ANALYTICS.md:648`, `:654` | Also gone (same `ls`) | same |
| 3 | "Post-publish smoke check": run `node scripts/vg2-ga4-validate.mjs --smoke --base-url …` after every publish | `docs/ANALYTICS.md:~660-663` | Instructs running a deleted script; the deploy skill does not call it (no `vg2` hit in replit-deploy SKILL.md, CLAUDE.md, package.json). If a post-publish analytics check is still wanted, it belongs in the new prod-check runner | grep across those files |
| 4 | "over 2,600 curated video development resources" | `replit.md:5` | 4,074 approved/live (stats, sitemap, `/api/categories` sum agree) | `lanes/tier01-dryrun.md`, `lanes/admin-content.md` AC-01 |
| 5 | "there are no validation scripts … none may be added again" | `replit.md:164` | Not stale today, but it conflicts with PLAN §5 (the prod-check runner) and must be reworded if the owner approves D1 | PLAN §5, §10 D1 |
| 6 | Enrichment "about $21 for 3,012" unenriched resources | `replit.md:65` | Current untagged count is 2,983 of 4,074 (coverage 26.8 %). "Tagged" and "unenriched" may not be the same measure, so treat the 3,012 as stale-or-unverified and re-derive the cost | `lanes/tier3-dryrun.md` T3-en, `lanes/analytics.md:42` |

Not found stale: `replit.md:25` (531 admin + 82 member rows is a scoped historical statement); the HTTP-cache section and the Clerk digest note (`:41`) match `lanes/member.md`. I did not audit the other ~250 lines of `replit.md` or the rest of the 680-line analytics doc claim by claim: only lines I could check against this run's evidence are listed. **Done when:** items 1-4 corrected or removed, 5 reworded when D1 is decided, 6 re-derived or dropped. Plan: PLAN §9 phase 7 (docs update) and B11.

### Phase 8 — Self-healing loop (draft; **blocked on owner decision 6/11**)
- **Title:** Self-healing loop: scheduled agent files deduped issues and opens fix PRs (owner approves)
- **Labels:** enhancement, ops (new)
- **Body:** **Blocked** on owner decisions 6 (what, if anything, may auto-merge or auto-deploy; default none) and 11 (external trigger for scheduled jobs). Do not start before they are answered, and not before phases 1 (merge gate #84), 4 (Axiom) and 5 (runner) are done.
  Design (PLAN §7, design D): Tier 0 every 30 min and Tier 1 every 6 h from the owner's Mac; Axiom query every 30 min for new ERROR fingerprints or 5xx above threshold; daily usage-anomaly check. Loop: fingerprint → one deduped GitHub issue (`prod-signal`; the research suggests `[sh:<10hex>]` in the title and `gh issue list --state all --search "sh:<fp> in:title"` plus a jq confirm; comment on an open match; reopen if closed within 7 days; cap new issues per run) → fix PR from a worktree → merge gate → **owner approves merge and publish** → replit-deploy → Tier 0+1 → close after 24 h with no recurrence; at most 2 fix attempts per fingerprint per day.
  Mechanism (`lanes/selfheal-research.md`): Tier 0 = launchd bash+curl, GET only, no LLM. Tier 1 = launchd every 6 h running `claude -p` with `CLAUDE_CODE_OAUTH_TOKEN`, `env -u ANTHROPIC_*`, `--permission-mode dontAsk`, a dedicated `--settings` file, `--strict-mcp-config` with empty MCP config (so `publish_app`/`update_app_using_prompt` do not exist for it), and a PreToolUse hook blocking non-GET to awesome.video, pushes to main, force-push, `gh pr merge`, `gh api` writes and ssh to Replit. Not recommended: cloud routines (1 h minimum, no local files), desktop tasks (need app open and Mac awake), `/loop` (dies with session).
  **Open items to test in a scratch repo first:** OAuth token under launchd; `--settings` allow rules in `-p`; hooks under `-p` with `dontAsk`; subscription limits at this cadence; Axiom query token (`lanes/axiom-research.md`).
  **Done when (PLAN §9 phase 8):** one real finding (for example B10) goes issue → PR → merge gate → owner approval → deploy → Tier 0+1 PASS, all linked. Needs a `prod-signal` label (new). Spend: Claude Code usage.

### Owner actions checklist (B6, B7, B8)
- **Title:** Owner actions: Researcher settings (B6), GitHub export (B7), approvals queue (B8)
- **Labels:** question
- **Body:** Three things only the owner can decide or do. None needs code.
  - [ ] **B6 Researcher model and budget.** Of the last 50 jobs (2026-07-30 to 2026-11-06): 21 completed, 13 cancelled, 11 `budget_stopped`, 5 failed. The failures are config and quota: **400 model `gpt-6.1-sol` not in the catalog**, **429 codex quota**, **402 glm credits exhausted**, and a test job with model `__qa_test_unknown_model__` (`lanes/logs.md:47`). Spend: about $592 over the 100 listed runs, $487 of it in July (50 runs); runs since late October are cheaper but the last three produced 0-2 discoveries (`lanes/admin-content.md` §Researcher, `evidence/admin-content/researcher-jobs.json`). Decide: replace or remove the `gpt-6.1-sol` model setting, pick provider/quota, and set a monthly budget or pause the feature.
  - [ ] **B7 GitHub export.** Last successful sync **2026-07-20 18:42Z**, 109 days ago; the published GitHub list is missing roughly 1,000+ changes. History in `evidence/admin-ops/gh-history.json` has 49 rows: 11 completed, 38 failed. The failures are 21 × "Sync failed" (no detail; `errorMessages` is empty), 16 × "Orphaned by server restart" (all at 2026-07-17 05:41:37Z) and 1 × "Export failed: timeout exceeded when trying to connect" (2026-07-17 12:32Z). *Number check: the brief said "22 of 27 failed"; the file shows 22 genuine failures (21 + 1 timeout) against 11 completed, plus the 16 orphaned rows. I could not reproduce 27.* Decide whether to resume sync (a GitHub write to the list repo; workspace may be ahead of GitHub, see `replit.md:53`) and whether to repair the unexplained "Sync failed" first.
  - [ ] **B8 Approvals backlog.** 23 real pending submissions, oldest 73 days. Suggested actions are in `lanes/owner-queues.md` (17 approve, 2 reject as same-site duplicates, 4 need a look, 0 dead); approving or rejecting is the owner's call. The same file also holds the B5 duplicate-pair list (27 + 2).


## Lead note (2026-11-06)
GitHub sync figures reconciled from `evidence/admin-ops/gh-status.json` (49 rows): export 5 completed / 22 failed (16 errors incl. 1 timeout, 6 orphaned by restart); import 6 completed / 16 failed (6 errors, 10 orphaned). "22 of 27" = exports only; "11 vs 38" = both directions. Use the per-direction split in the B7 checklist.
