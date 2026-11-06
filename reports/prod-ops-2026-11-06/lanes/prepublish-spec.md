# Spec: pre-publish safety check (PLAN §6), design only

Layout is mine. Slots into `.claude/skills/replit-deploy/SKILL.md`. Nothing built or run against prod except GET probes noted. All checks are read-only except the backup (c). Any STOP means: do not call `publish_app`, report, ask.

## Where each check slots
| Check | Skill step | Why there | Reports as |
|---|---|---|---|
| (a) Schema diff | **Step 3** (the existing diff at `SKILL.md:89-98` already lists `shared/schema.ts migrations`) | Steps 1-3 happen before anything is synced, so the owner hears "UI publish needed" first | line in Step 8's `npm install / db:push` row, plus a "Publish route" line |
| (b) Running jobs | **Step 5.3**, just before `publish_app` (`SKILL.md:136`) and re-run after any 5.4 wait | A deploy restarts the instance and kills in-process scans (jobs 6, 7, 11 died "Interrupted by server restart") | new Step 8 line `Running jobs: none \| STOPPED: <job>` |
| (c) Fresh backup | **Step 5.3b**, after (b) passes and immediately before `publish_app` | Newest possible backup, and no point backing up if (a) or (b) already stopped the deploy | new Step 8 line `Backup: <id> <rows> <age>` |

## (a) Schema diff (#78)
```bash
LIVE=$(curl -s https://awesome.video/api/version | jq -r .revision)   # same as $BEFORE in step 1
git cat-file -e "$LIVE^{commit}" || git fetch origin "$LIVE"
git diff --name-status "$LIVE" "$TARGET" -- shared/schema.ts migrations
git diff "$LIVE" "$TARGET" -- shared/schema.ts | rg -n "^[+-].*(pgTable|text\(|integer\(|boolean\(|timestamp\(|index\(|unique|references|notNull)" | head -40
```
Tested read-only on 2026-11-06: live and `origin/main` are both `6cb1a93e`, so output is empty and exit 0.
- **Empty:** no schema change. The MCP publish is allowed.
- **Only `migrations/` listed** (no `shared/schema.ts`): not an owner-UI case per `SKILL.md:99`; the boot migrator applies it. Still record it, and treat a migration that `DROP`s or `ALTER ... TYPE`s as a STOP (check with `git diff "$LIVE" "$TARGET" -- migrations | rg -in "drop |alter column .* type|truncate|delete from"`).
- **`shared/schema.ts` listed (any status, A/M/D):** STOP "owner must publish from the Publishing pane". `publish_app` is refused for schema changes (`SKILL.md:98`, `:147`) and the DB conflict dialog cannot be answered over MCP. Report the diff lines so the owner can review the dialog. Backup (c) must still run first.
- If `$LIVE` cannot be fetched: treat as schema changed.

## (b) Running-jobs check
| Job | GET | Running when | File:line |
|---|---|---|---|
| Link scan | `/api/admin/link-health/status` | `jq -e '.job.status=="processing" or .job.status=="pending"'` | `export-link-health.ts:1172`; statuses `linkHealthService.ts:165` |
| Enrichment | `/api/enrichment/jobs?limit=5` | `jq -e '[.jobs[]\|select(.status=="pending" or .status=="processing")]\|length>0'` | `ai-jobs.ts:133`; active set `EnrichmentRepository.ts:118` |
| Researcher | `/api/researcher/jobs?limit=5` | same filter on `.jobs[]` | `ai-jobs.ts:551`; active set `researchService.ts:1108` |
| GitHub sync | `/api/github/sync-status?status=pending` and `?status=processing` | `.items\|length>0` (the route filters by `?status=`; confirm both values return what you expect on first use) | `export-link-health.ts:431-434` |
| Backup | `/api/admin/database-backups` | `.inFlight==true` | `export-link-health.ts:1032` |
Today (GET, 2026-11-06): link scan completed, newest enrichment jobs cancelled, researcher cancelled/budget_stopped/completed, GitHub all completed/failed, backup `inFlight:false`, so the check would pass.
**Rule:** any hit means STOP and ask the owner, with the job id and `createdAt`. Never cancel a job to proceed. Digest and contact purge are short and idempotent; no check needed. Run with the owner header file per LANE-RULES (never print it). A 401 on any probe is also a STOP (cannot prove idle).

## (c) Fresh backup and a one-time approval
`POST /api/admin/database-backups` is a write against prod, so it needs owner approval; until the cron endpoint exists, a deploy would need one every time.
Proposed standing approval (owner states once, recorded in `PROGRESS.md` and the project memory):
> "For every replit-deploy of awesome.video, you may call `POST /api/admin/database-backups` once, immediately before `publish_app`, only after the schema and running-jobs checks pass. It creates a backup and changes no site data. This approval covers that one call per deploy and nothing else (no restore, no deletion, no other POST). Revoke by saying so."
It is narrow on purpose: one endpoint, one call per deploy, tied to a stated position in the sequence. The call is idempotent in effect (a second call makes another file; it returns 409 if one is in flight, `databaseBackup.ts:392-393`).
**After the call, check** (all via `GET /api/admin/database-backups`, newest first):
1. Response was 201 (`export-link-health.ts:1073`) and its id is now the first list entry.
2. `createdAt` of the newest is under 10 minutes old.
3. `totalRows` within ±1% of the previous backup: `jq '.backups|sort_by(.createdAt)|reverse|[.[0].totalRows,.[1].totalRows]|(.[0]-.[1])/.[1]|fabs<0.01'`. The previous backup today is 100,592 rows, so the window is 99,586-101,598. Note: `agent_events` (49,577 rows) grows quickly, so a longer gap between backups can exceed 1% legitimately. If so, report the gap and the growth, do not auto-fail; STOP only on a drop in rows or a failed 201.
4. `bytes` is non-zero and `tableCount` is not lower than the previous (42 today).
Any failure: STOP, do not publish.

## Reporting
Add to Step 8: `Schema: <empty|migrations-only|schema.ts changed>`, `Running jobs: none`, `Backup: <id>, <rows>, <age> min, rows vs previous <+x.x%>`. UNVERIFIED if a probe could not run.

## Flag: SKILL.md rollback line
`SKILL.md:174` says production data is restored via "Database → point-in-time restore". I could not verify that this covers the production database (Follow-up 2: Replit's docs name only the development database). Until that is read in the Replit UI, the backup from (c) is the only restore path the project controls (`npm run db:backup -- restore`), so this check should not be skipped on "small" deploys.

## Open items
GitHub `?status=` values, and whether `sync-status` accepts them, were read in code only. The 10-minute freshness bound assumes the deploy calls (c) within the same minute as `publish_app`.

## Hardening 2026-11-06: live confirmation and the copy-paste block
**GitHub filter (closed):** `GET /api/github/sync-status` applies `?status=` server-side (`GithubSyncRepository.ts:54-56`). Live: no filter `{items[49], total:49}`; `?status=pending` and `?status=processing` both `{items:[], total:0}`; `?status=failed` `{items[38], total:38}` (22 failed exports + 16 failed imports, matching `gh-status.json`). Shape is always `{items, total}`, so `.items|length` is the right test.

**Block for step 5.3** (snippet for the skill, not a file). Every probe fails closed: HTTP error, non-JSON, a missing or null `status`, or an unexpected shape all print STOP, so a renamed field cannot pass as "idle". Exit 1 if anything is running or unreadable.
```bash
H="$HOME/.cache/awesome-audit/owner.hdr"; B=https://awesome.video; busy=0
probe(){ out=$(curl -sf -H @"$H" "$B$2" | jq -r "$3") || { echo "STOP: $1 probe failed (401/5xx/bad JSON)"; busy=1; return; }
  [ "$out" = "0" ] && echo "ok   $1" || { echo "STOP: $1 running or unreadable ($out)"; busy=1; }; }
LIST='if (.jobs|type)!="array" then "bad-shape" elif ([.jobs[]|select(.status==null)]|length)>0 then "null-status" else [.jobs[]|select(.status=="pending" or .status=="processing")]|length end'
probe link-scan  /api/admin/link-health/status '.job as $j | if $j==null then 0 elif ($j.status|type)!="string" then "null-status" elif ($j.status=="pending" or $j.status=="processing") then 1 else 0 end'
probe enrichment "/api/enrichment/jobs?limit=5" "$LIST"
probe researcher "/api/researcher/jobs?limit=5" "$LIST"
GH='if (.items|type)!="array" then "bad-shape" else (.items|length) end'
probe github-pending    "/api/github/sync-status?status=pending" "$GH"
probe github-processing "/api/github/sync-status?status=processing" "$GH"
probe backup /api/admin/database-backups 'if (.inFlight|type)!="boolean" then "bad-shape" elif .inFlight then 1 else 0 end'
[ "$busy" = 0 ] && echo "ALL CLEAR" || { echo "STOPPED: do not publish; ask the owner"; exit 1; }
```
Notes: use `exit 1` only when pasted as its own shell call (it ends that shell). `link-scan` treats `.job==null` (no scan ever) as idle. The header file is never printed.

**Runs (the block as pasted, owner header, GET only):**
- Pass 1, 2026-11-06T21:08Z: all six `ok`, `ALL CLEAR`, exit 0.
- Pass 2, 2026-11-06T21:12:50Z (run from the spec text itself; output in evidence/admin-ops/runcheck-pass2.txt): all six `ok`, `ALL CLEAR`, exit 0.
**Limits:** I cannot create a running job on prod, so the STOP branches were exercised only with synthetic JSON through the same jq filters (below), not against a live running job.
