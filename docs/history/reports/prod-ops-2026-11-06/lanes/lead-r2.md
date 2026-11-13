# Lead — R2 self-healing loop patterns (2026-11-06)

## Facts gathered
- Replit deployment logs: "Replit retains deployment logs for 30 days." Filters: errors only, search, date range.
  No export, no API, no programmatic access documented. Metrics: uptime, requests, HTTP statuses, durations, CPU/mem.
  Source: https://docs.replit.com/cloud-services/deployments/monitoring-a-deployment (fetched 2026-11-06).
- Replit Monitoring Agent (launched 2026-10-22): alerts from "application error logs, HTTP errors, and request
  latency"; Auto-fix investigates + validates a fix; Auto-republish (experimental) publishes it; "Auto-fix alone
  doesn't authorize publishing changes to your live app"; "Monitoring Agent runs may incur Agent usage charges";
  alerts in the Monitoring tab + email; no webhook, no API, no mention of GitHub.
  Source: https://docs.replit.com/features/publishing/monitoring-agent.
- Repo fact (`.claude/skills/replit-deploy/SKILL.md` "How the pieces fit"): "Agent checkpoints, Monitoring Auto-fix
  and Agent task merges commit inside the workspace. Those commits are not on GitHub, which is the usual cause of
  divergence." The publish guard (`scripts/publish-build.sh`) refuses to build when HEAD's tree != origin/main.

## Options considered
| # | Design | Detect | Fix | Ship | Verdict |
|---|---|---|---|---|---|
| A | Replit Monitoring Agent, Auto-fix + Auto-republish | Replit alerts (errors, HTTP, latency) | Replit Agent in workspace | Auto-republish | **Rejected.** Fixes commit in the workspace, not GitHub → workspace diverges from main, next replit-deploy stops at "workspace-only commits"; if Auto-republish ran before that, prod serves code not on GitHub and `/api/version` (stamped from origin/main) would lie. Paid per run, no API/webhook to integrate, no owner review gate on GitHub. |
| A' | Replit Monitoring **alerts only** (Auto-fix OFF) | same, emailed to owner | — | — | **Keep as a trigger source** (free signal, owner setting). Cannot be read by an agent (email/UI only) → owner forwards or it is a human trigger. |
| B | GitHub Actions cron prober + issue | scheduled runner in CI | agent PR | replit-deploy | **Rejected for now**: owner removed all CI/validation workflows (replit.md "Verification policy", 2026-10-11) and `.github/workflows/` no longer exists; re-adding one is an owner decision. Kept as alternative in PLAN §10. |
| C | External uptime monitor (Better Stack Uptime / UptimeRobot free) | HTTP checks on `/api/health/ready` + home | — | — | Cheap Tier-0 complement; adds a vendor. Optional. |
| **D (chosen)** | Claude Code scheduled agent on the owner's machine (cron/`/loop` or a Claude Code scheduled routine) | Tier 0+1 runner against prod every N h; log-sink query for new error fingerprints; daily first-party usage anomaly check | Agent opens/updates one GitHub issue per fingerprint (label `prod-signal`), then a fix PR from a worktree | merge gate (#84) → owner approves → replit-deploy skill → Tier 0+1 | **Chosen.** GitHub stays the single source of truth; reuses the existing deploy skill and its stop conditions; nothing auto-merges or auto-deploys by default. Precondition: an agent-queryable log sink (logs lane) — without it, detection is limited to the runner's own probes. |

## Loop invariants (D)
1. Dedupe key = fingerprint (check id or normalised error message + endpoint group); one open issue per key; repeated
   hits append evidence, never new issues.
2. An issue carries: first/last seen, count, revision (`/api/version`), evidence links, tier of the affected function.
3. A fix PR must link its issue, pass the merge gate, and name the Tier-1 check that proves it.
4. Owner approval is required for merge and for publish unless the owner whitelists a class (e.g. copy-only, or
   "revert to previous build" = Publishing → History, a human action today).
5. After deploy: Tier 0+1 must pass and the triggering fingerprint must be absent for 24 h before the issue closes;
   otherwise reopen and escalate to the owner.
6. Budget guard: at most N fix attempts per fingerprint per day (2), then escalate (matches CLAUDE.md "after two failed
   attempts, stop").
