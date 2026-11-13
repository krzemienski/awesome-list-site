# PLAN.md fact-check (2026-11-06 ~21:30Z)

Layout is mine. Read-only; PLAN.md not edited. Method: opened each cited evidence file or code line, or re-pulled the live GET (owner header). Priority sections: Summary, §1, §2, §10, then §3, §8, §9. PLAN lines in §4, §6 (partly), §7 and the Tier 1 text of §5 were skimmed, not line-checked (UNCHECKED, see end). "Line" = PLAN section/row, since line numbers shift when you edit.

## WRONG (fix these)
| PLAN place | Claim | Source | Correct value |
|---|---|---|---|
| Summary ¶2 | "172 of its rows are error, empty-state, focus or copy variants" | `evidence/lead/c22-retier-rows.tsv`: retire = 259 (§8 says 259) | 259 retire rows (the 172 was the old area-level estimate) |
| §1 P8 | "5 config failures" | `lanes/logs.md:47`: last 50 jobs have 5 `failed`: 402 credits, 429 quota, 400 model not in catalog, 400 `__qa_test_unknown_model__`, 1 orphaned by restart | 5 failed jobs, of which 3 are config/upstream, 1 is a QA fixture, 1 an orphaned restart |
| §2 B8 | "oldest 73 days" | `evidence/admin-content/pending-resources.json`: oldest createdAt 2026-08-26T05:49Z; to 2026-11-06 = 72 days | 72 days |
| §2 B2 | "gaps Aug 5 → Oct 28" | `evidence/admin-ops/lh-history.json`: job 8 started 2026-08-04T23:01Z, job 9 2026-10-28T02:01Z | Aug 4 (23:01Z) → Oct 28 |
| §3 table row Replit | "screenshot Publishing → Analytics" | same section's bullets and `lanes/owner-analytics-steps.md`: Tools → Replit Cloud → Growth | make the table say Growth pane (Publishing → Analytics unconfirmed) |

## OK / UNSOURCED, priority rows
| PLAN place | Claim | Source | Verdict |
|---|---|---|---|
| Summary | "10,129 GETs and 6 POSTs … all dead-link 204" | `evidence/lead/write-proof.md` | OK |
| Summary | dead-link route writes a log line, `catalog-contributions.ts:607` | file line 607 is `app.post('/api/telemetry/dead-link'` | OK |
| Summary | `/api/version` 6cb1a93e at start and end | `write-proof.md`; live `6cb1a93e9992…` | OK |
| Summary / B1 | one backup, 2026-11-06 02:08Z | `evidence/admin-ops/backups.json`; live list has 1 | OK |
| Summary / B2 | "6-day gap" | jobs 9 (Oct 28 02:01Z) → 10 (Nov 3 03:40Z) | OK |
| §1 P1 | 9 categories, 99 subcategories | live `/api/categories` 9, `/api/subcategories` 99 | OK |
| §1 P1 | sitemap 174 cat + 178 sub + 46 sub-sub | `analytics.md` sitemap pull | OK |
| §1 P1 | TTFB 0.16-0.22 s | `evidence/visitor/perf.txt` (0.160-0.221) | OK |
| §1 P2 | 4,074 resources = 4,074 sitemap URLs | stats totalPublic 4074; sitemap count 4074 | OK |
| §1 P2 | "crawlers request /resource/<id> continuously (logs §3)" | `lanes/logs.md:38` shows 404s on deleted ids only | PARTLY: evidence is crawler 404s, not successful requests; reword |
| §1 P3 | ffmpeg 451 / hls 407 / webrtc 131 | live `/api/search` returns 451 / 407 / 131 | OK |
| §1 P4 | 4,766 sitemap URLs | `analytics.md` | OK |
| §1 P6 | 38 sign-ups/90 d, 23/28 d | `analytics.md` (b) | OK |
| §1 P7 | 23 pending, oldest 2026-08-26 | `pending-resources.json` | OK |
| §1 P7 | 1,739 audit rows / 7 d | `lanes/admin-content.md:56` ("1,739 of 1,900 … owner account"). Note: my own count of the last 7 d is 1,934 total, 1,739 flagged by the email pattern; same figure, different basis | OK (basis: owner account) |
| §1 P8 | 109 jobs, ≥ $592, 46 runs / $100 in 90 d, 2,307 approved | `researcher-jobs.json`: total 109; sum of `estimatedCostUsd` 592.20; since 2026-08-08: 46 jobs, $100.40; approvedDiscoveries sum 2,307 | OK |
| §1 P8 | "57 % of catalog" | 2,307 / 4,074 = 56.6 % | OK |
| §1 P9 | job 14 archived 26 + rewrote 88 | `lanes/admin-ops.md:36` | OK |
| §1 P9 | "runs daily with LINK_HEALTH_REMEDIATION=apply" | `lh-remediation.json`: mode apply, intervalHours 24 | OK |
| §1 P10 | manual-only, 1 backup | B1 | OK |
| §1 Secondary | 280 tag URLs, 1,630 tags | sitemap; `tier3-dryrun.md` T3-p2 | OK |
| §1 Secondary | 14 real withdrawals in Nov | my audit-log pull (non-test `withdrawn` Nov = 14) | OK |
| §1 Secondary | ~21 rows real feedback, 92 % QA | 8+5+6+2 = 21; 523/564 = 92.7 % | OK |
| §1 Secondary | digest: 1 email + 2 in-app, 0 failed | `digest-health.json` | OK |
| §1 Secondary | 238 enriched / 3,009 not; last 5 jobs cancelled | `lanes/admin-content.md:50`; jobs 33-37 cancelled | OK |
| §1 Secondary | GitHub: 49 jobs; export 5/22 (16 errors, 6 orphaned); import 6/16 (6 errors, 10 orphaned); 11 vs 38; last 2026-07-20, 109 d | `gh-history.json` counts; 21 "Sync failed"+1 timeout = 22 errors; 16 orphaned | OK |
| §1 Incidental | 117 suggestions, 116 test; 0 link reports | `analytics.md` | OK |
| §1 Incidental | `verify-ds.mjs:128` ds-showcase gate | file line 128 says `/design-system: every system pill …` | OK |
| §2 B1 | one caller `export-link-health.ts:1058`; `databaseBackup.ts:35-38` restore rules | line 1058 is the `createDatabaseBackup(` call; lines 35-38 describe restore refusing non-empty/own DB, SHA-256 | OK |
| §2 B1 | no retention code | `rg` in `server/backup` finds none | OK |
| §2 B1 | `environment: production` on the backup | `backups.json` | OK |
| §2 B2 | lateness 130 h / 22.8 h / 4 min | recomputed from `lh-history.json` (due = prior start + 24 h from job 9/12/13): 130 h, 22.8 h, 4 min | OK |
| §2 B2 | `linkHealthScheduler.ts` 10 min tick; `linkHealthService.ts:158-178`, `:185` lock; `index.ts:753-755` | line 158 `startCheckIfDue`; 185 `pg_advisory_xact_lock(5116, 7)`; 753-755 three initialize* calls | OK (10-min tick not re-read) |
| §2 B4 | real max 8 `db/index.ts:35`; panel `max: 3` `operations.ts:96` | both lines confirmed | OK |
| §2 B4 | panel shows total 8 beside max 3 at 20:36Z | `health-1.json` | OK |
| §2 B4 | peaks active 8 / waiting 5 | `health-2/3.json` (health-1 waiting 3) | OK |
| §2 B4 | `pgRateLimitStore.ts:49`, scan-finalize `linkHealthService.ts:342-390` | file exists under `server/middleware/`; line 342 `db.transaction`, 390 `catch` | OK |
| §2 B5 | 29 clashes: 27 approved, 2 rejected | `rewrite-clash.tsv` | OK |
| §2 B5 | 27 pairs listed; 5 "copy tags first", 12 "categories differ" | not re-counted | UNSOURCED here (check `owner-queues.md`) |
| §2 B6 | 11 `budget_stopped`; last 3 runs 0-2 finds; `gpt-6.1-sol` error | `researcher-jobs.json` (11 in the 100 jobs it holds; ids 109/108/107 = 0/0/2); `logs.md:47` | OK |
| §2 B7 | 109 days stale | 2026-07-20 → 11-06 | OK |
| §2 B8 | 17 approve / 2 reject / 4 needs look | `owner-queues.md` counts 17 / 2 / 4 | OK |
| §2 B9 | 85 of 143 test; 3 of 4 admins flagged; auth.login stopped after Aug | `usage-aggregate-design.md:94-99`; `analytics.md` | OK |
| §2 B9 | "lead grep: no server code writes `auth.login`" | not rechecked | UNSOURCED |
| §2 B10 | ≥ 15 404s / 20 min | `logs.md:38` (Agent claim) | OK |
| §2 B12 | 72/72/65 | `visitor.md:64` | OK |
| §2 B14 | cap 512 `publicCache.ts:53`; evictions 1,039 → 1,296 | line 53 `MAX_ENTRIES = 512`; health-1 1039, health-2 1249, health-3 1296 | OK (132-140 expiry behaviour not read) |
| §2 B15 | `index.ts:529`, `:541` | 529 `if (path.startsWith("/api"))`, 541 the failed-document branch | OK |
| §2 B11 | ANALYTICS.md refs removed `vg2-ga4-validate.mjs` | docs/ANALYTICS.md:614,653,663 | OK |
| §2 B11 | replit.md "over 2,600" | replit.md:5 | OK (the line is in the header paragraph) |
| §2 B11 | script "removed in b4040bfe" | commit touches vg2 files | OK |
| §3 | audit log 19,155 rows | `/api/admin/stats` table row and my paging | OK |
| §3 | 85 of 143 accounts | `analytics.md` | OK |
| §3 | analytics-mcp 1.1.0, `@google-analytics/data` 7.3.0 | `analytics.md` (d), npm | OK |
| §8 | 613 / 20 / 24 / 310 / 259 | `c22-retier-rows.tsv` recount | OK |
| §9 Phase 0b | backup `20261106T020839Z-7b26b348`, 42 tables, 100,592 rows | `backups.json` (tableCount 42, totalRows 100592) | OK |
| §10 D15 | 27 duplicate pairs, 23 backlog | as above | OK |
| §10 D20 | "7 new issues in `lanes/issue-drafts.md`" | file exists; count not checked | UNSOURCED |

## Notes
- `/api/admin/stats` reports 41 tables / 107,924 rows while the backup lists 42 tables / 100,592 rows (backup includes the `drizzle` schema table and counts at 02:08Z). PLAN uses the backup figures only for Phase 0b; no conflict, but do not quote the two together.
- "Resource edit dialog" rows and the per-deploy list are mapped in `c22-retier-rows-v2.tsv`; not re-verified here.
- Not line-checked: §4 (logs, Axiom limits), §5 Tier 1 body text, §6 stop conditions, §7 self-healing doc citations, §9 effort/spend column, §10 recommendations other than D15/D20.

## Lead resolution (2026-11-06 21:1xZ)
- WRONG rows: Summary ¶2 "172" was already gone (new summary says 259). P8 failures, B8 72 days, B2 Aug 4, §3 Growth pane: all applied to PLAN.md.
- UNSOURCED B5: verified. owner-queues.md B5 table has 27 pair rows; 5 flagged "richer metadata … copy tags", 12 "categories differ", 0 both.
- UNSOURCED B9: verified. `grep -rnE "auth\.(login|register)" server shared` → exit 1 (no match).
- UNSOURCED D20: issue-drafts.md has 4 existing-issue comments (#76/#77/#78/#84) + 8 new drafts in §B (B1, B2, B3, B4/12/14, B5, B9, B10, runner) + 3 in §D (B11, phase 8, owner checklist). PLAN D20 corrected to "8 new issues + 3 later drafts".

# Pass 2: PLAN §4-§9 (2026-11-06 ~22:00Z)
Same method. PLAN.md not edited. WRONG first.

## WRONG
| PLAN place | Claim | Source | Correct value |
|---|---|---|---|
| §5 Runner design, Read-only guard | "all of this run's HARs show 572 Clerk requests, all GET" | summed Clerk-URL entries in every `evidence/*/*.har`: 909 (admin-content 220, admin-ops-1 50, member 254, visitor 10+38, visitor4 250, visitor5 57, playwright-next 30); no subset sums to 572 | "all GET" holds (0 non-GET); the count is 909 across all HARs, or drop the number |
| §5 Check ids para | "`visitor4.har`/`visitor5.har` 2,689 GET, 0 other" | awesome.video entries: visitor4 2,562 GET + visitor5 183 GET | 2,745 GET, 0 other |
| §9 Phase 5 | "evidence committed under `reports/`" | §5 Output: deploy runs write to `e2e-evidence/prod-check/<UTC>/`, scheduled to `~/.cache/…`; "`reports/prod-check/` path is dropped" | `e2e-evidence/prod-check/<UTC>/` |
| §6 Rollback | "`replit-deploy` SKILL.md:174 … names [point-in-time restore] for production data" | `.claude/skills/replit-deploy/SKILL.md:177` ("Production data is restored separately via Database → point-in-time restore") | line 177 (174 is a different step) |
| §7 Loop step 1 | GitHub issue label `prod-signal` | §7 "How it runs": label `selfheal`, fingerprint `[sh:<10hex>]`, `lanes/selfheal-research.md:35-36` | pick one label (selfheal per the design file) |
| §7 Triggers | "Tier 0 every 30 min … from a Claude Code scheduled agent" | §7 How it runs: Tier 0 is a plain launchd bash+curl job, no LLM; only Tier 1/triage runs `claude -p` | Tier 0 = launchd bash job; only Tier 1 and triage use Claude Code |

## OK / UNSOURCED
| PLAN place | Claim | Source | Verdict |
|---|---|---|---|
| §4 | Axiom free: 500 GB/mo ingest, 25 GB storage, 10 GB-h query, 30 d, 10,000 events/batch, 256 fields, ingest URL us-east-1 | `lanes/axiom-research.md:17-21,48` | OK |
| §4 | 30-min poll ≈ 0.4 GB-h (~4 %); ~14 k lines/day ≈ 85 MB/mo | not in axiom-research lines read | UNSOURCED here |
| §4 | `write()` at `logger.ts:239` | `server/lib/logger.ts:239` `const write =` | OK |
| §4 | ~250 added lines; buffer 2,000 / flush 200 or 2 s; INSTANCE_ID→HOSTNAME→uuid; processHandlers.ts | `logger-design.md:16,22,36,57` | OK |
| §4 | "consistency-review.md (30 items)" | 60 table rows match `^| N |` | UNSOURCED/likely WRONG: count rows by hand (my grep says 60, may include another table) |
| §4 | Grafana 14 d, Better Stack 3 d / 3 GB, Sentry 5 k | not re-read | UNSOURCED here |
| §5 | Playwright `^1.60.0` devDependency | `package.json:134` | OK |
| §5 | 11 modules ≤350 lines, ~1,650 total | `runner-design.md:24` (total); per-file max not checked | OK (total) |
| §5 | `catalog-contributions.ts:819` isReservedTestHost | line 819 | OK |
| §5 | `queryClient.ts:183-184` `__session` ~1 min | lines 183-184 | OK |
| §5 | `admin-content.ts:649` → `ResourceRepository.updateResource:1107` | both lines match | OK |
| §5 | tsconfig includes only client/shared/server | `tsconfig.json:2` | OK |
| §5 | Tier 1 / Tier 0 table text | matches `tier1-checks.md` and dry-run values | OK |
| §6 Merge gate | tsc 10.9 s, build 5.8 s, exits 10/11/12, 27 ESLint errors on logger.ts + index.ts, `--incremental false` | `merge-gate-design.md:11-13,26-29,37` | OK |
| §6 | "only the 5 newest builds are kept" | `replit-deploy SKILL.md:177` | OK |
| §7 | launchd, `claude -p`, `CLAUDE_CODE_OAUTH_TOKEN`, 1 h routine minimum, fingerprint `[sh:<10hex>]` | `selfheal-research.md:8,13,21,35` | OK |
| §7 | "five items must be proven in a scratch repo", `--strict-mcp-config`, `dontAsk` | not re-read | UNSOURCED here |
| §8 | 613 / 20 / 24 / 310 / 259; RS rows decision 16 | TSV recount (pass 1) | OK |
| §9 | Phase 0b backup id, 42 tables, 100,592 rows | `backups.json` | OK |
| §9 | Phase 0 "panel shows max 8" | B4 fix; code line `operations.ts:96` is `max: 3` today | OK |
| §9 | phases 1-4, 6-9 effort/spend | judgement, no source | UNSOURCED (estimates) |

## Lead resolution of Pass 2 (2026-11-06 21:2xZ)
- Applied: Clerk 909 (all GET); SKILL.md:177; `selfheal` label; Phase 5 evidence path; Triggers = launchd/no LLM for Tier 0; Tier 2 gate = in-run credentials; backup rows ≥ 99 %; separate uptime monitor (decision 23).
- REJECTED #2: visitor4/5 = 2,512 + 177 = **2,689** GET to awesome.video (lead recount). 2,745 counted other hosts' GETs too (all-host: 2,612 + 204 = 2,816), so neither all-host nor 2,745 is the awesome.video figure.
- REJECTED "likely wrong" §4: consistency-review §A+§B have 30 numbered rows (lead recount); 60 counted the PLAN re-check table too.
