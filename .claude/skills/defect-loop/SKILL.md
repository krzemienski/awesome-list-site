---
name: defect-loop
description: Orchestrate a full production audit and fix cycle for awesome.video: baseline audit, triage by root cause, one fixer per group, pinned reviews, batch merge, one deploy, re-drive, final pass. Use when asked to run the defect loop, to audit and fix until clean, or to resume a run from state.json.
---

# Defect loop (orchestrator)

The lead plans, integrates and verifies. Workers do the hands-on work. Concurrency cap: 2 sonnet workers plus 1 reviewer at a time; fan-out runs 2 lanes at a time with `--model sonnet` (see `qa-lane`). Every deploy goes through the `replit-deploy` skill. Paths: `ROOT=.local/audit/<RUN_ID>`; lane results `ROOT/results/<lane>.json`; evidence `ROOT/evidence/<lane>/<row>/<width>-<sha>-a<N>.png`.

## Stages

1. Baseline: pin `X0` = live `/api/version`. Run the full audit with `qa-lane` on `X0`. Cells from a lane whose start and end SHA differ are void; re-run that lane.
2. Triage: group FAIL cells by root cause, not symptom. One defect class is one group (every overflow-wrap failure is one group). Record each group with its cells and a suspected file.
3. Fix: one fixer per group, each in its own worktree from fresh `origin/main` (`git fetch origin` first), own branch, own PR. If groups touch the same files, merge them into one group.
4. Review: each PR gets a `review-pr` pinned review by a reviewer that did not write it. REQUEST_CHANGES goes back to the fixer; any new push needs a fresh verdict.
5. Merge guard: a PR merges only when every thread is resolved and the latest `VERDICT: APPROVE <sha>` names `headRefOid`. The hook enforces this. Never merge around it.
6. Batch merge: the lead merges a PR only after the reviewer's final report has arrived and its last `VERDICT` comment names `headRefOid` (an APPROVE comment alone is not enough: the reviewer may still be reversing it). The merge guard also refuses a verdict younger than 60 s. Merge the approved PRs together, then check `origin/main`.
7. Deploy: one `replit-deploy` run for the batch. Done when `/api/version` equals `origin/main` and `/api/health/ready` returns 200. Call that SHA `X`.
8. Re-drive: run only the affected cells on `X` with `qa-lane`. A cell still failing returns to stage 2.
9. Final pass: full audit on `X`, then a 2 h window. Done means one `X` with a clean full pass (no FAIL, no FLAKY) and, in the window, 0 error-level records (`GET /api/admin/logs?level=error`, read `.records`, page with `until=nextUntil`) and 0 app `5xx`. Any FAIL or FLAKY in the final pass goes back to stage 2 (triage), and the next deploy gives a new `X` that is pinned again; the pass and the window then restart on it. Then run QA cleanup (below).

## QA cleanup

`/api/admin/qa-rows` (`server/routes/domains/qa-cleanup.ts`) deletes only rows that carry the `[QA-qa-audit-<RUN_ID>]` prefix and whose owner is in `QA_CLEANUP_USER_IDS`. Conditions:

- Lanes create QA rows only as the audit admin or audit member. Both accounts did the qa-rows cleanup in run 20261115T2340Z, so they are inferred to be on the allowlist; the allowlist itself is a Replit secret and cannot be read.
- Lanes never create sign-ups (except a throwaway `@example.com` address stopped at the code screen) or edits on resources that lack the prefix: those cannot be listed or deleted (edits are listed through their parent resource's title). Audit-log rows and signed-in view interactions from allowed QA writes are expected and go in the run report.
- Each DELETE sends `{"expectedTitle": "<exact title>", "backupSha256": "<newest backup dump sha256>"}`, and the newest backup must be under 10 minutes old. Run cleanup right after a `replit-deploy` step 5.3b backup, or ask the owner for one extra backup first (the standing approval covers one backup per deploy only).
- Run cleanup as the audit admin, never the owner account.

## state.json (`ROOT/state.json`, rewrite after every stage)

```json
{
  "runId": "", "stage": "baseline|triage|fix|review|merge|deploy|redrive|final|done",
  "liveSha": "", "baselineSha": "",
  "lanes": {"L1": {"status": "pending|running|done", "shaStart": "", "shaEnd": "", "result": "results/L1.json"}},
  "cells": {"L1-03@390": {"grade": "PASS|FAIL|FLAKY|NEEDS_YOU|UNVERIFIED", "sha": "", "evidence": ""}},
  "defects": {"D1": {"group": "", "cells": [], "rootCause": "", "status": "open|fixing|fixed|verified"}},
  "branches": {"D1": "fix/d1-slug"},
  "prs": {"D1": {"number": 0, "headRefOid": ""}},
  "approvedShas": {"D1": ""},
  "deploys": [{"sha": "", "at": "", "ready": true}],
  "windows": {"start": "", "end": "", "errors5xx": 0}
}
```

## Resume

Read `state.json` and `PROGRESS.md`, then `curl -s 'https://awesome.video/api/version'` and `git fetch origin`. If `liveSha` moved, cells graded on the old SHA are stale: re-run them. Continue at `stage`; never repeat a finished stage. A lane left `running` has no trusted result: re-run it. After a 429 or other API failure, write state first, stop, and relaunch only the failed workers once, at lower parallelism.

## Rules

- Workers report to the lead in at most 5 lines (verdict, SHA, counts, evidence path); detail lives in the result JSON.
- After each worker returns, run `git status` in its worktree and spot-check one evidence file yourself.
- Nothing is parked as a known limitation unless the owner said so; a blocked cell lists what was tried.
- Hook blocks and 429s are reported, never routed around.
