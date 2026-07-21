---
name: awesome-video-site-audit
description: >
  The authoritative playbook for auditing OR fixing awesome.video (this repo's app).
  Use whenever asked to audit the site, verify audit findings, run a bug hunt, fix
  findings from a MASTER-FIX-PROMPT / audit report, re-verify fixes on prod, sweep
  content quality, check links, validate SEO/sitemap/metadata, or review design-system
  and UI/UX compliance. Covers: the full site surface map, per-domain audit checklists
  (content, links, metadata/SEO, sitemap, exports, auth, a11y, DS, admin), known
  gotchas and false-positive traps that have burned prior runs, and the exact
  verification harness (Playwright commands, admin login, evidence conventions).
  Both the auditor (finding bugs) and the fixer (remediating them) start here.
---

# awesome.video — Site Audit & Fix Playbook

One skill, two consumers:

- **Auditor** — hunting for defects on the live site or dev build.
- **Fixer** — working a findings report (`MASTER-FIX-PROMPT*.md`, `REPORT_*.md`, BUG-NNN / NB-NNN lists) and proving each fix live.

Both follow the **Iron Rule** from `functional-validation`: no mocks, no test files, no stubs — every verdict comes from driving the real running system and reading real evidence. Load `.local/custom_skills/functional-validation/SKILL.md` before validating anything.

## Companion skills (load on demand)

| Skill | When to load |
|---|---|
| `functional-validation` (`.local/custom_skills/functional-validation/SKILL.md`) | ALWAYS before validating — Iron Rule, evidence quality standards, PASS-criteria-first discipline |
| `playwright-skill` (`.local/custom_skills/playwright-skill/SKILL.md`) | Any browser automation. But use the project-specific harness in `references/harness.md` — it has the working executablePath, cookie auth, and batching limits this environment needs |
| `ui-experience-audit` (`.local/custom_skills/ui-experience-audit/SKILL.md`) | Deep per-screen audits — 5-phase protocol (triage → visual → interactive inventory → content quality → Nielsen heuristics → severity report). Run in drive-interaction mode; this environment has Playwright |
| `visual-inspection` (`.local/custom_skills/visual-inspection/SKILL.md`) | Before marking ANY screenshot PASS — universal + WCAG 2.2 web checklist, severity classification |

## Reference files (read the one you need)

| File | Contents |
|---|---|
| `references/site-map.md` | Full surface inventory: routes, the 7 core user journeys, 15 admin tabs, API surface, auth model, architecture facts |
| `references/audit-checklists.md` | Per-domain checklists: content quality, link health, metadata/SEO/sitemap, exports, auth/session, accessibility, design system, admin surfaces, data-quality sweeps |
| `references/gotchas.md` | **Read before filing or fixing anything.** Known false-positive traps, by-design decisions, platform limitations, and architecture quirks that have burned five prior audit runs |
| `references/harness.md` | Exact working commands: Playwright executor + executablePath, prod/dev admin login, cookie handling, batching limits, QA-account teardown, evidence conventions |

## Core workflow — Auditor

1. **Scope first.** Pick the journeys/surfaces to cover from `references/site-map.md` (J1–J7). A full sweep covers all seven at desktop 1440×900 AND mobile 375×667 minimum.
2. **Define PASS criteria before looking** (per `functional-validation` and `ui-experience-audit` discipline). Write down what "good" looks like for each surface before capturing evidence.
3. **Walk the domain checklists** in `references/audit-checklists.md` for each surface. For per-screen depth, run the `ui-experience-audit` 5-phase protocol; screenshot verdicts go through `visual-inspection`.
4. **Check `references/gotchas.md` before filing each finding.** Roughly a third of externally-reported findings historically did not reproduce, were by-design, or were platform artifacts. Reproduce every candidate finding against the live system before it becomes a finding.
5. **File findings** with: ID, severity (CRITICAL/HIGH/MEDIUM/LOW), exact repro steps, viewport, auth state, evidence path, and a one-line acceptance criterion for the fixer.
6. **Tear down** any QA accounts/resources you created — see the net-zero teardown procedure in `references/harness.md`.

## Core workflow — Fixer

1. **Triage the report first.** For each finding decide: fix (code) / fix (data) / fixed-prior / by-design / invalid / platform. Record the rationale — a triage table is a deliverable (`evidence/runNN/findings-table.md` is the established pattern).
2. **Reproduce before fixing.** Confirm the finding against the live system exactly as reported. If it doesn't reproduce, check `references/gotchas.md` — it may be a known trap — then check whether prod is simply behind dev (compare against localhost:5000).
3. **Fix the class, not the instance.** Data-quality findings (bad titles, placeholder descriptions, dup taxonomy) share one remediation: an idempotent sweep script that goes through the **live admin API** (prod DB is not agent-writable — see gotchas). Layout findings: fix the root cause (e.g., a body-height rule), not per-breakpoint patches.
4. **Verify at the audited surface.** An endpoint fix can verify green while the UI never reads that endpoint. Re-run the auditor's exact repro (same viewport, same auth state) and capture evidence.
5. **Know the dev→prod boundary.** Code fixes are dev-only until republish. Journal prod follow-ups (data scripts to run, exports to re-run) in `replit.md` under the run entry. After a republish, re-verify the shipped fixes live on prod.
6. **After every server edit: restart the workflow.** The dev server runs tsx without --watch; server changes do NOT hot-reload.
7. **Gate before done:** `npx tsc --noEmit` clean, migration-drift workflow clean, P0 smoke pass (desktop + mobile), QA teardown net-zero, evidence filed under `evidence/runNN/`.

## Severity ladder (shared by both roles)

| Severity | Meaning here |
|---|---|
| CRITICAL | Data loss, auth bypass, broken core journey (J1–J4 dead end), crash/blank page, unreadable content |
| HIGH | Broken layout, false affordance, export corruption, wrong data shown, a11y blocker, SEO regression (soft-404, sitemap drift) |
| MEDIUM | Inconsistent spacing/labels, weak signifier, suspect contrast, minor heuristic drift, stale copy |
| LOW | Cosmetic polish, edge-case rendering |

## Evidence discipline

- Every verdict (PASS or FAIL) needs a reviewable artifact: JSON probe output, screenshot, or curl body — filed under `evidence/runNN/`. Screenshots must be READ and walked through `visual-inspection` before a PASS.
- "200 OK" proves an endpoint exists, not that it's correct. Assert on payload content.
- A 0-finding audit is suspicious; real screens have ≥3 LOW-or-above findings.
