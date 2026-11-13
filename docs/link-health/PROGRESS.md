# Link health remediation: progress

Branch `feat/link-health-remediation` (from main 32acd9ee).

## Decisions
- Engine: the existing in-app checker (`server/validation/linkChecker.ts`), not awesome_bot. awesome_bot is a Ruby gem with no browser-User-Agent re-check, so from a datacenter IP it flags bot-blocked sites as dead. The app's two-pass check already applies the strict dead-link policy. There is no CI job; the awesome_bot second-vantage workflow was removed in #335.
- No schema change. Cross-scan state comes from the last 3 scans' `link_health_checks` rows (kept instead of pruned). Hiding uses the existing `archived` status, and history uses `resource_audit_log` through the normal publication transition. Remediation bookkeeping lives in `resources.metadata.linkHealth`.
- Schedule: an in-process tick every 10 min starts a scan when the newest is older than `LINK_HEALTH_INTERVAL_HOURS`. The default is 24 h, not hourly: 4,100 links × 2 passes every hour from one Replit IP invites the Akamai/archive.org blocks seen on 2026-11-05.
- Thresholds: hide after 2 consecutive confirmed-dead scans; rewrite after 2 identical same-site redirects. Timeouts and bot blocks never act.
- Mode: scans only plan. Changes apply only from the admin panel's Apply control (the `LINK_HEALTH_REMEDIATION` switch was removed on 2026-11-13).
- Tests: none added. Owner rule: no test suites or scripts. Verification is on production after deploy.

## Open issues (2026-11-05)
#76, #77, #78, #84 and #85 are process and tooling enhancements, not site bugs or URL reports. None is changed by this branch.

## Status
- [x] Planner, apply and ignore (`server/services/linkRemediation.ts`)
- [x] Scan keeps 3 scans and covers link-health-archived resources
- [x] Scheduler (`server/jobs/linkHealthScheduler.ts`)
- [x] Routes (`server/routes/domains/link-remediation.ts`) and admin panel (`LinkRemediationPanel.tsx`)
- [x] Enrichment stores `metadata.linkCheck`
- [x] tsc 0, build 0, no new eslint errors (the CI workflow was later removed in #335)
- [x] PR CI run 1: catalog awesome_bot over 150 URLs ran (2 flagged: AMD timeout, IEEE 202; neither dead by policy). Docs job failed on pre-existing README links -> now checks only added links.
- [x] Independent review (bug-hunter, sonnet): 2 HIGH, 7 MEDIUM, 4 LOW, verdict MERGE-WITH-FIXES. Fixed: mass-failure breaker (2%) + 20 h dead span; rewrite only path-preserving redirects (error/consent paths -> review); old URL in audit notes; expected-URL guard inside the apply transaction; restore needs 2 confirmed-alive scans and an untouched status; linkHealth merged, never replaced (including whole-metadata writers); stale-only job recovery (90 min) on every tick; schedule from last completed scan + 1 h retry; broken list shows live links only; public summary trimmed; enrichment checks run in parallel; approvedBy restored; CI summary reads the real result shape and fails if awesome_bot wrote nothing.
- [x] PR CI run 2 on e44f40db: catalog pass (150 URLs), docs pass (0 added links).
- [x] Re-review (fresh bug-hunter, sonnet) of e44f40db: 1-6 and 9-12 confirmed fixed, 13 fixed; new N1 (query change counted as moved), N2 (shared-suffix hosts like *.github.io treated as same site), N3 (whole-metadata writers carrying a stale linkHealth key overwrote it), plus LOW #7/N4-N8. Fixed: rewrite needs same host (www aside), same query, same normalized path; whole-metadata writes always keep the stored linkHealth; apply re-checks ignored/archive stamp; login bounce is not proof of life; approvedBy restored exactly; un-ignore allowed on any status; CI trims trailing punctuation. Open LOW: breaker shown only in the Apply toast and server log.
- [x] 2026-11-13: automatic apply removed (`LINK_HEALTH_REMEDIATION` and `remediationMode()` deleted); scans only plan, and changes apply only from the admin panel's Apply control.
- [ ] Delta review, merge, deploy, production verification
- [x] 2026-11-13: the 2026-11-05 plan to switch `LINK_HEALTH_REMEDIATION` to `apply` is dropped; there is no automatic apply.
