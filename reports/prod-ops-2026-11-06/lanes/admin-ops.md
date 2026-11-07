# Lane: admin-ops (prod-ops 2026-11-06)

Read-only discovery of operational admin features on https://awesome.video. Layout is mine (LANE-RULES gives only the per-feature table). Evidence: `evidence/admin-ops/`. Session: cached owner session, `GET /api/admin/stats` = 200, `navigator.webdriver` = true. No POST/PUT/PATCH/DELETE sent.

## Per-feature record
| ID | Feature | Entry | What it does | Result | Console/network errors | Write paths deferred | Essential? |
|---|---|---|---|---|---|---|---|
| OPS-1 | Export tab | /admin?tab=export | JSON snapshot, CSV, README.md, OPML downloads; "Export link check" card; full DB backup table | works (`export-tab-1440.png`, `export-390.png`: no h-scroll). JSON snapshot is labelled "non-restorable". No export-use log found. | none seen | Download/Generate buttons (exports), "Create backup" (POST /api/admin/database-backups) | supporting |
| OPS-2 | Link Health | /admin?tab=linkhealth | Scan counts, auto-remediation plan, per-link "Link is fine" override | works (`linkhealth-1440.png`, `-390.png`). Scan #14: 4,100 checked, 4,057 healthy, 27 broken, 16 suspect. Panel says 1 of the 27 broken is still listed. | none | "Apply 29 changes", per-row "Link is fine", Run/Cancel scan | supporting |
| OPS-3 | Link reports (visitors) | GET /api/admin/link-reports | Visitor-submitted bad-link reports | works. open=0, resolved=0, dismissed=0 (`lreports.json`): no visitor has ever filed one. No real-visitor usage signal. | none | PATCH resolve/dismiss | incidental |
| OPS-4 | Remediation | Link Health panel; mode=apply, 24h | Auto archive/rewrite after each scan | works, with a blocked backlog (see below) | none | apply, ignore | supporting |
| OPS-5 | Validation (awesome-lint) | GET /api/admin/validation-status | Last lint result | works: valid=true, 0 errors, 13 warnings (all url-https), lastUpdated 2026-11-06T16:43Z; linkCheck=null | none | POST /api/admin/validate, check-links | incidental |
| OPS-6 | GitHub sync | /admin?tab=github | Sync jobs list, import/export | works. 49 jobs: export 5 ok/22 failed, import 6 ok/16 failed. Last job #49 export completed 2026-07-20; last failure #45 on 2026-07-17 ("timeout exceeded when trying to connect"). Nothing since July 20. | none | Preview import, Pull, Sync now | incidental |
| OPS-7 | Backups | Export tab + GET /api/admin/database-backups | Full DB dump to private storage | works but manual-only. See finding. | none | Create backup | core (only restore path) |
| OPS-8 | Operations health | GET /api/admin/operations/health | readiness, pool, publicCache, heavyWork, telemetry | works, 3 snapshots below | none | none | supporting |
| OPS-9 | Database tab | /admin?tab=database | Key table row counts | works (`database-1440.png`) | none | none | incidental |
| OPS-10 | Schedulers | server/jobs | linkHealth (10-min tick, 24h interval), digest (hourly), contact retention (hourly), orphan watchdog | only link health has visible history. Digest, retention and watchdog expose no status in the UI or API I could read: UNVERIFIED. | n/a | n/a | supporting |

## Link-scan jobs (`lh-history.json`)
| Job | Status | Started (UTC) | Duration | Links | Healthy | Broken | Suspect |
|---|---|---|---|---|---|---|---|
| 14 | completed | 11-06 10:54 | 72 min | 4100 | 4057 | 27 | 16 |
| 13 | completed | 11-05 10:50 | 72 min | 4100 | 4063 | 27 | 10 |
| 12 | completed | 11-03 12:04 | 35 min | 4102 | 4059 | 34 | 9 |
| 11 | failed (interrupted by restart) | 11-03 11:31 | 20 min | 4102 | - | - | - |
| 10 | cancelled by admin | 11-03 03:40 | 1 min | 3827 | - | - | - |
| 9 | completed | 10-28 02:01 | 21 min | 3826 | 3799 | 20 | 7 |
| 8 | completed | 08-04 23:01 | 77 min | 3823 | 3809 | 12 | 2 |
| 7, 6 | failed (interrupted by restart) | 08-04 22:28, 22:13 | 26, 2 min | 3823 | - | - | - |
| 5, 4, 3 | completed | 08-04 | 75-90 min | 3827 | 3757/3757/3749 | 39/40/51 | 31/30/27 |
| 2, 1 | completed | 07-21 | 48, 24 min | 2282 | 2249/2245 | 10/12 | 23/25 |

Schedule: is it firing? Only partly. Jobs 13 and 14 are 24 h apart (Nov 5 10:50, Nov 6 10:54), and `nextDueAt` is 2026-11-07T10:54Z. But there was no scan between Oct 28 and Nov 3 (6 days), and none Nov 4. The 24 h schedule was likely enabled around Nov 3, and 3 of 14 jobs died to server restarts. Broken count trend: 51 (Aug) to 20 (Oct) to 34, 27, 27 (Nov). Dead links are being cleaned by remediation, so the trend is not growth.

## Remediation (apply mode)
Audit log (`/api/admin/audit-logs`, paged 4,500 rows back to 2026-08-03, filtered to notes containing "link-health"; `lh-audit.ndjson`): 114 entries, all system actor, all from job 14 on 2026-11-06 12:06-12:07Z: **26 archived, 88 rewrite-url**. Nothing earlier, so nothing in the prior 90 days. No restore actions. No errors visible via the API (server logs not read).

Spot-checks, read-only curl with redirects followed:
- 5 rewrites (every 18th): segmentor to vodnik, jMPEG, mobileplayer-ios, tv-subtitle-extraction, svc. Old URL redirects to the new URL and the new URL returns 200, so each is a same-project rename. No harm.
- 5 archives: developers.google.com/cast/.../debugging 404, unified-streaming.com/products/packager 404, github.com/ebu/ebu-tt-d 404, airensoft.gitbook.io/.../statistics 404 (the site moved to ovenmedia.com, so the page needs a new URL, not removal), dashif-documents.azurewebsites.net DNS/connect failure. All five were dead at probe time. Archiving is correct, with one caveat: the OvenMedia page has a live replacement that remediation could not find.
- Conclusion: no evidence of damage. Breaker limit is 2% of checked (82 links); 26 is under it.

Blocked backlog: the plan still shows 29 `rewrite-url` actions, 137 review and 6 watch. I checked all 29 targets against `/api/admin/resources`: **all 29 target URLs already exist as other resources** (27 approved, 2 rejected), so `applyOne` skips them with "already uses". The panel's "Apply 29 changes" button therefore cannot do anything, and the same 29 will reappear every scan. These are duplicate catalog entries. `rewrite-clash.tsv`, `rewrite-plan.tsv`.

## Backups (finding)
`GET /api/admin/database-backups`: storageConfigured=true, inFlight=false, **1 backup**: `20261106T020839Z-7b26b348`, created 2026-11-06 02:08Z, 9.8 s, 5,800,057 B, 100,592 rows, 42 tables, sha256 86bd6ff5.... Created by the admin user id. The only caller of `createDatabaseBackup` is the manual POST route (`export-link-health.ts:1055`); no scheduler or retention code exists. The route comment says autoscale only runs code while a request is open. A restorable backup exists and is under 24 h old, but only because someone took it by hand; nothing will take the next one. Restore itself not exercised (off-limits). Whether the stored dump is actually restorable is UNVERIFIED.

## Operations health (GET /api/admin/operations/health)
| Snap | Time (UTC) | Status | Probe | Pool (total/idle/active/waiting) | Cache entries | heavyWork active | 5xx groups | Pool errors | Slow selects |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 20:36:05 | ready | 161 ms | 8/8/0/0 | 512 (cap 512, 1,039 evictions) | 0 | none | 0 (peakActive 8, peakWaiting 3) | 51 |
| 2 | 20:46:42 | ready | 155 ms | 4/4/0/0 | 512 | 0 | none | 0 (peakActive 8, peakWaiting 5) | 63 |
| 3 | 20:56:42 | ready | 145 ms | 2/2/0/0 | 512 (1,296 evictions) | 0 | none | 0 (peakActive 8, peakWaiting 5) | 67 |

Notes: `databasePool.max` is hard-coded as 3 in the route while the real pool reaches 8 (lead confirmed). Public cache sits at its 512-entry cap with 1,039 evictions and generation 1. Snapshots may come from different instances (pool total 8 then 4). Select max latency 7,200 ms. Saved as `health-N.json`/`.ts`.

## Deferred write paths (not clicked)
Create backup; Apply N changes; "Link is fine"; Run/Cancel link check; Validate; Preview import; Pull; Sync now; export Download/Generate buttons; link-report resolve.

## HAR method table (`admin-ops-1.har`, 580 requests, 570 to awesome.video)
| Method | Count |
|---|---|
| GET | 570 |
| POST/PUT/PATCH/DELETE | 0 |

Second segment `admin-ops-2.har`: 6 requests, 6 GET. Total 576 GET, 0 non-GET/HEAD/OPTIONS.

## Unverified
Server logs; digest, contact-retention and orphan-watchdog run status; export last-use; restorability of the backup; the 390 px check covered only Link Health and Export.

## Follow-up 2026-11-06
Same gate: GET only, owner session. Evidence: `evidence/admin-ops/digest-health.json`.

### 1. Digest queue health (INV-120)
Correction to my earlier note: a digest status endpoint exists. `GET /api/admin/digests/health` (`server/api/notifications.ts:198`, `getDigestQueueHealth` at `server/services/digestService.ts:1345`) returned 200:
`{"transport":{"available":true},"queue":{"email":{"sent":1},"in_app":{"sent":2}},"recentFailureCodes":[],"oldestQueuedAt":null}`
It reports only counts per channel and status, failures in the last 7 days, and the oldest queued job. It exposes no cycle times and no job dates. Prod has 3 digest jobs in total (1 email, 2 in-app), all sent; 0 queued, 0 failed. I found no digest entries in the first 500 audit-log rows and no other digest GET route, so last-cycle times and per-job dates are NOT obtainable read-only. The digest scheduler runs hourly (`digestScheduler.ts`) but leaves no history, because an empty cycle writes nothing.

### 2. Contact retention and orphan watchdog
None. Grep: `rg -n "app\.get\(.*(retention|watchdog|orphan)" -i server -g '*.ts'` returned nothing, and `rg -n "getOrphan|orphanWatchdog|contactRetention" server -g '*.ts'` outside `server/jobs/` matched only the import in `server/index.ts:11`. Both jobs log only.

### 3. Hypothesis B2 (in-process timers slip when Autoscale idles)
Link-scan lateness: the due time is the previous completed scan's createdAt plus 24 h (`startCheckIfDue`, `linkHealthService.ts:168-174`), checked by a 10-minute tick.
| Job | Due (prev completed + 24h) | Actual start | Late |
|---|---|---|---|
| 10 (cancelled by admin) | 10-29 02:01 | 11-03 03:40 | 121.7 h |
| 12 (11 was interrupted) | 10-29 02:01 | 11-03 12:04 | 130.1 h |
| 13 | 11-04 12:04 | 11-05 10:50 | 22.8 h |
| 14 | 11-06 10:50 | 11-06 10:54 | 0.07 h |
Job 10 may have been admin-triggered, so job 12's 130 h is the cleaner figure. Jobs 13 and 14 show the schedule can run on time, but job 13 was nearly a day late. Jobs 11 and 12 were a restart-interrupted scan and its retry, so restarts also cost time. The interval check reads the database, so the cadence recovers whenever an instance is awake.

Digest cadence: UNVERIFIED, since no history is exposed (see 1).

Replit docs (fetched 2026-11-06):
- Autoscale, https://docs.replit.com/cloud-services/deployments/autoscale-deployments: "scales to zero when idle"; "You pay while requests are being served." The page does not say whether timers or background work run with zero instances, and does not mention cold starts. Scale-to-zero implies in-process timers stop, but the page does not say so.
- Scheduled Deployments, https://docs.replit.com/cloud-services/deployments/scheduled-deployments: cron schedule with time zone, "a job timeout", billed "for the duration of each run" (figures are on a separate Publishing costs page I did not fetch). It states no minimum interval and no max run time. It does not say a run can call an HTTPS endpoint; it only says these deployments have no public URL. A scheduled job running `curl` against awesome.video is plausible but UNVERIFIED.

Verdict: **likely**. Scans do start late: 130 h on one gap and 23 h on another. The docs say Autoscale scales to zero when idle, and the scheduler is an in-process `setInterval`, which fits the gaps. Not confirmed, because I have no instance-uptime logs and the docs do not state that timers pause. The 3 interrupted or cancelled jobs show restarts also matter. Fix to test: a Scheduled Deployment that calls an admin-protected trigger, after checking its minimum interval and cost.

## Follow-up 2
Research plus read-only. Nothing was called or restored.

### 1. B1 safety net: Replit point-in-time restore
UNVERIFIED for the production DB. I could not find a docs page that states it.
- `https://docs.replit.com/cloud-services/storage-and-databases/postgresql-on-replit` says only: "Time travel: Restore your development database to an Agent checkpoint within the available history. See Data recovery." No length, no plan requirement, no trigger steps, no in-place vs new-DB statement. It names the **development** database, not production.
- The "Data recovery" page it points to is not in `https://docs.replit.com/llms.txt` (no page there mentions data recovery, restore or point-in-time), and my guessed URLs (`.../neon-database`, `.../data-recovery`) returned 404.
- So retention window, plan requirements, UI-only vs API, and in-place vs new DB are all unanswered. Do not rely on Replit restore for prod until someone reads that page in the Replit UI. `docs/DATABASE-BACKUP.md` itself calls it "a separate, complementary safety net".

App-level restore (`server/backup/databaseBackup.ts`): a restore path exists, but only as an operator CLI, `npm run db:backup -- restore <id>` (`package.json:13`, `restoreDatabaseBackup` at line 523). There is **no HTTP restore route**: the only backup routes are GET/POST `/api/admin/database-backups`, and `export-link-health.ts:984` states restore is CLI-only. Guards: it refuses the app's own `DATABASE_URL` (422), refuses a non-empty target (409), verifies SHA-256, runs `pg_restore --single-transaction`, then compares the table set, row counts and sequence values with the manifest. `docs/DATABASE-BACKUP.md` records a passing drill on 2026-10-10, but that was a **development** backup (41 tables, 11,021 rows), not production.

Safe restore drill for the prod backup (never touches prod data):
1. Needs: a scratch empty Postgres 16 (a local Docker `postgres:16` is simplest), `pg_restore` 16 on the machine, and read access to the production bucket's `db-backups/production/` objects. The bucket read is the open question: the CLI downloads via private storage, which is configured in the Replit workspace, so the drill most likely runs in the workspace shell over SSH (`awesome-replit`) with `--environment production` and `TARGET_DATABASE_URL` pointing at a **new empty database**, never `DATABASE_URL`. The CLI cannot drop or overwrite the app DB because of the two refusals above.
2. `npm run db:backup -- list --environment production`, then `show <id>` (read-only).
3. Create the empty scratch DB, set `TARGET_DATABASE_URL`, run `restore <id> --environment production`.
4. Pass condition: `RESTORE VERIFIED` with all checks passing (expect 42 tables, 100,592 rows for `20261106T020839Z-7b26b348`).
5. Drop the scratch DB. The dump holds personal data, so restore only to an owner-controlled DB and delete it afterwards.
Run steps 2-5 only after owner approval: step 3 writes to a database, though not to prod.

### 2. Publishing costs (`https://docs.replit.com/billing/deployment-pricing.md`)
Scheduled Deployment lines: compute units at $0.60 per million; 1 CPU-second = 18 CU; 1 GB-second = 2 CU; base fee $2.00 per month; scheduler $0.00. Minimum billed duration: not stated. Included credits: no Scheduled-specific figure ("Credits apply automatically to all publishing costs"). Outbound networking/egress for Scheduled Deployments: **not stated** (data transfer is listed only for Static Deployments), so outbound HTTPS is unconfirmed.
Per-run cost, assuming a 0.5 vCPU / 1 GB machine (my assumption; the page does not fix a size): 11 CU/s x 60 s = 660 CU = about $0.0004 per 1-minute run.
- Hourly (720 runs/month): about $0.29 + $2.00 base = **about $2.29/month**.
- Daily (30 runs/month): about $0.01 + $2.00 = **about $2.01/month**.
The $2 base fee dominates. Recompute if the machine size differs.

### 3. Triggers for B2
| | (a) Replit Scheduled Deployment calls admin endpoint | (b) Owner-Mac launchd (PLAN §7) | (c) cron-job.org to token-guarded endpoint |
|---|---|---|---|
| Cost | about $2.0-2.3/month | $0 | $0 |
| Reliability | Runs independent of traffic; outbound HTTPS unconfirmed in docs; no stated minimum interval | Only while the Mac is awake and online; misses sleeps and travel | Hosted service, runs without the Mac; third-party dependency |
| Hits prod directly? | Yes (HTTPS) | Yes (HTTPS) | Yes (HTTPS) |
| Change size | New endpoint + a second deployment to configure | New endpoint + a launchd plist; owner credentials sit on the Mac | New endpoint + new secret token in Replit Secrets (an approval-gated change) + a cron-job.org account |
Common to all three: the server needs a new "run due jobs" endpoint, which calls `startCheckIfDue` and the digest cycle. That endpoint is a write path and needs an approved change. The endpoint also wakes an idle Autoscale instance, which is what makes (b) and (c) work.
Lean: (c) for zero cost and independence from the Mac, with (a) as the in-platform alternative once its HTTPS egress and minimum interval are confirmed. This is a recommendation to weigh, not a verified result.
