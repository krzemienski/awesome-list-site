# Link health remediation: progress

Branch `feat/link-health-remediation` (from main 32acd9ee).

## Decisions
- Engine: the existing in-app checker (`server/validation/linkChecker.ts`), not awesome_bot. awesome_bot is a Ruby gem with no browser-User-Agent re-check, so from a datacenter IP it flags bot-blocked sites as dead. The app's two-pass check already applies the strict dead-link policy (`.agents/memory/link-scan-false-positives.md`). awesome_bot 1.20.0 (latest, 2021-03) runs in CI as a second vantage.
- No schema change. Cross-scan state comes from the last 3 scans' `link_health_checks` rows (kept instead of pruned). Hiding uses the existing `archived` status, and history uses `resource_audit_log` through the normal publication transition. Remediation bookkeeping lives in `resources.metadata.linkHealth`.
- Schedule: an in-process tick every 10 min starts a scan when the newest is older than `LINK_HEALTH_INTERVAL_HOURS`. The default is 24 h, not hourly: 4,100 links × 2 passes every hour from one Replit IP invites the Akamai/archive.org blocks seen on 2026-11-05.
- Thresholds: hide after 2 consecutive confirmed-dead scans; rewrite after 2 identical same-site redirects. Timeouts and bot blocks never act.
- Mode: `LINK_HEALTH_REMEDIATION=plan` in `.replit` until the owner reviews the first production plan, then `apply`.
- Tests: none added. Owner rule: no test suites or scripts. Verification is on production after deploy.

## Open issues (2026-11-05)
#76, #77, #78, #84 and #85 are process and tooling enhancements, not site bugs or URL reports. None is changed by this branch.

## Status
- [x] Planner, apply and ignore (`server/services/linkRemediation.ts`)
- [x] Scan keeps 3 scans and covers link-health-archived resources; auto-apply in `apply` mode
- [x] Scheduler (`server/jobs/linkHealthScheduler.ts`)
- [x] Routes (`server/routes/domains/link-remediation.ts`) and admin panel (`LinkRemediationPanel.tsx`)
- [x] Enrichment stores `metadata.linkCheck`
- [x] CI workflow; tsc 0, build 0, no new eslint errors
- [x] PR CI run 1: catalog awesome_bot over 150 URLs ran (2 flagged: AMD timeout, IEEE 202; neither dead by policy). Docs job failed on pre-existing README links -> now checks only added links.
- [x] Independent review (bug-hunter, sonnet): 2 HIGH, 7 MEDIUM, 4 LOW, verdict MERGE-WITH-FIXES. Fixed: mass-failure breaker (2%) + 20 h dead span; rewrite only path-preserving redirects (error/consent paths -> review); old URL in audit notes; expected-URL guard inside the apply transaction; restore needs 2 confirmed-alive scans and an untouched status; linkHealth merged, never replaced (including whole-metadata writers); stale-only job recovery (90 min) on every tick; schedule from last completed scan + 1 h retry; broken list shows live links only; public summary trimmed; enrichment checks run in parallel; approvedBy restored; CI summary reads the real result shape and fails if awesome_bot wrote nothing.
- [ ] PR CI run 2, merge, deploy, production verification
- [ ] Owner reviews the first production plan; switch to `apply`
