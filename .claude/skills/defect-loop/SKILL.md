---
name: defect-loop
description: Run an audit and fix cycle for awesome.video on request: audit the live site (the whole product or only the area named), triage failures by root cause, fix each cause in its own PR, ship each ready fix promptly through the release path, re-drive the affected cells, and optionally close with a full pass and a two-hour window. Use when asked to run the defect loop, to audit and fix until clean, or to resume a run from state.json. It is not part of releasing, and a release never waits for it.
---

# Defect loop (orchestrator)

The lead plans, integrates and verifies. Workers do the hands-on work. This audit run caps itself at 2 sonnet workers at a time, and fan-out runs 2 lanes at a time with `--model sonnet` (see `qa-lane`); the cap belongs to the audit, not to merging or releasing. Paths: `ROOT=.local/audit/<RUN_ID>`; lane results `ROOT/results/<lane>.json`; evidence `ROOT/evidence/<lane>/<row>/<width>-<sha>-a<N>.png`.

A fix does not wait for the rest of the audit. Each logical fix that is ready merges and releases on its own, promptly, through `RELEASE.md` (merge ready, sync, publish once, verify; the `replit-deploy` skill carries it out). The audit decides what to fix; it never decides when a release may happen, and a release never waits for a pass or a window.

## Stages

1. Audit: record `X0` = live `/api/version`, then drive with `qa-lane` the rows the request names: the whole inventory for a full audit, or only the affected area. A full baseline is not a prerequisite for fixing a known defect. Cells from a lane whose start and end SHA differ are void; re-run that lane.
2. Triage: group FAIL cells by root cause, not symptom. One defect class is one group (every overflow-wrap failure is one group). Record each group with its cells and a suspected file.
3. Fix: one fixer per group, each in its own worktree from fresh `origin/main` (`git fetch origin` first), own branch, own PR. If groups touch the same files, merge them into one group.
4. Check the build, touched-file lint delta and changed behavior. Address substantive findings. Independent review is optional; respect GitHub permissions and platform requirements.
5. Merge and release: merge the ready PR, then release it with `replit-deploy` (done when `/api/version` equals `origin/main`, `/api/health/ready` returns 200 and the changed behavior works). Do this for each ready fix as it lands; two fixes that are ready at the same moment may share one release, but never hold one back to batch. Call the live SHA `X`.
6. Re-drive: run only the affected cells on `X` with `qa-lane`. A cell still failing returns to stage 2.
7. Closure, only when the request asks for it: full audit on `X`, then a 2 h window. Done means one `X` with a clean full pass (no FAIL, no FLAKY) and, in the window, 0 error-level records (`GET /api/admin/logs?level=error`, read `.records`, page with `until=nextUntil`) and 0 app `5xx`. Any FAIL or FLAKY goes back to stage 2. A later release gives a new `X`, and the pass and the window restart on it; the release is never held back by the one in progress. Then run QA cleanup (below), which takes its own fresh backup.

## QA cleanup

`/api/admin/qa-rows` (`server/routes/domains/qa-cleanup.ts`) lists and deletes only rows of one run: the client sends `runId=<RUN_ID>` (shape `YYYYMMDDTHHMM[SS]Z`, for example `20261119T084150Z`), the server builds the exact `[QA-qa-audit-<RUN_ID>]` prefix itself, and a missing, malformed or extra parameter is a 400. Rows must also be owned by an account in `QA_CLEANUP_USER_IDS`. Conditions:

- Lanes create QA rows only as the audit admin or audit member. Both accounts did the qa-rows cleanup in run 20261115T2340Z, so they are inferred to be on the allowlist; the allowlist itself is a Replit secret and cannot be read.
- Lanes never create sign-ups (except a throwaway `@example.com` address stopped at the code screen) or edits on resources that lack the prefix: those cannot be listed or deleted (edits are listed through their parent resource's title). Audit-log rows and signed-in view interactions from allowed QA writes are expected and go in the run report.
- Each DELETE is `DELETE /api/admin/qa-rows/<table>/<id>` (`resources`, `resource_edits` or `bookmark_collections`) with `-H 'Origin: https://awesome.video'` and the body exactly `{"runId": "<RUN_ID>", "expectedTitle": "<stored title>", "backupSha256": "<sha256>"}`; any other key is a 400, and so is an `expectedTitle` that does not start with this run's prefix (`deleteBodySchema` in `qa-cleanup.ts`). The stored title must also start with that prefix and equal `expectedTitle`, or the route answers 409. `backupSha256` is `.backups[0].sha256` from `GET /api/admin/database-backups`, and that backup's `completedAt` must be under 10 minutes old, or the route answers 409 (`checkBackup`). 503 = backup storage not configured; 403 "Not an authorised QA cleanup account" = caller not on the allowlist.
- Each cleanup batch takes one backup first: one `POST /api/admin/database-backups` (owner header, `Origin` header, body `{}`), then wait until `GET` shows it newest with `inFlight` false, and run every DELETE within 10 minutes of its `completedAt` (owner, 2026-11-16, delegating this call: "you decide"). One backup per batch, never per row. If the POST fails, the rows stay in the ledger for the next cleanup batch. A release takes no backup of its own.
- Run cleanup as the audit admin, never the owner account.
- Procedure: `GET '/api/admin/qa-rows?runId=<RUN_ID>'` (quote the URL; rows under `.rows.<table>`, each with `deletable`; audit-log and bookmark rows never are). The database is already narrowed to this run before the 500-row limit, so a count of 500 means "capped", not "total". Save each row as JSON under `ROOT/cleanup/` before its DELETE, then GET again and check that the counts dropped by exactly the deleted ids. Record `<table> <id> <title> <status>` per row in `ROOT/cleanup/ledger.md`.
- A 403 "Row does not belong to a QA cleanup account" means the creating account is not on the allowlist; a 409 listing per-table counts means other users' data depends on the row. Record the id and the answer, leave the row, and never clear other users' rows.

## state.json (`ROOT/state.json`, rewrite after every stage)

```json
{
  "runId": "", "stage": "audit|triage|fix|check|release|redrive|closure|done",
  "liveSha": "", "baselineSha": "",
  "lanes": {"L1": {"status": "pending|running|done", "shaStart": "", "shaEnd": "", "result": "results/L1.json"}},
  "cells": {"L1-03@390": {"grade": "PASS|FAIL|FLAKY|NEEDS_YOU|UNVERIFIED", "sha": "", "evidence": ""}},
  "defects": {"D1": {"group": "", "cells": [], "rootCause": "", "status": "open|fixing|fixed|verified"}},
  "branches": {"D1": "fix/d1-slug"},
  "prs": {"D1": {"number": 0, "headRefOid": ""}},
  "releases": [{"sha": "", "at": "", "ready": true}],
  "windows": {"start": "", "end": "", "errors5xx": 0}
}
```

## Resume

Read `state.json` and `PROGRESS.md`, then `curl -s 'https://awesome.video/api/version'` and `git fetch origin`. The same anchors open every check-in: `git rev-parse origin/main` against the live revision (full SHAs), `/api/health/ready` (200) and `gh pr list --state open --json number,headRefOid`. If `liveSha` moved, cells graded on the old SHA are stale: re-run them. Continue at `stage`; never repeat a finished stage. A lane left `running` has no trusted result: re-run it. After a 429 or other API failure, write state first, stop, and relaunch only the failed workers once, at lower parallelism.

## Rules

- Workers report to the lead in at most 5 lines (verdict, SHA, counts, evidence path); detail lives in the result JSON.
- After each worker returns, run `git status` in its worktree and spot-check one evidence file yourself, by its absolute path in the checkout the worker used.
- Nothing is parked as a known limitation unless the owner said so; a blocked cell lists what was tried.
- A hook block, a declined permission prompt or a sandbox refusal, and 429s, are reported, never routed around.
