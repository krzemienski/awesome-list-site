---
name: awesome-ds-verify
description: Proves that design-system work in the awesome-list-site repo (awesome.video) is actually correct — runs every repo DS gate plus a live DOM probe through one command and returns a single evidence-backed verdict (PASS / FIX / FAIL / INCOMPLETE). Use whenever you touch or review anything visual in awesome-list-site — tokens, design-system.css, the five systems (editorial/terminal/geist/brutalist/swiss), accents, fonts, theme boot, shadcn/Tailwind bridge styling, client/src components or page CSS — and before saying DS work is "done", "fixed", "compliant" or "verified". Also use for "audit the site against the DS", "is this page using the design system correctly", "run the 11-stage audit", "verify-ds", "check parity with the design", or "did the re-skin break anything". Never claim DS compliance in this repo without running it.
---

# Awesome DS Verify

One command, one verdict, real evidence — for `krzemienski/awesome-list-site`.

The repo already owns ~15 design-system gates, but they are wired as separate
Replit workflows, so an agent in Claude Code or Codex has no single way to run
them and no rule for what "verified" means. This skill is that rule. It does
**not** re-implement the gates and it does **not** restate the audit contract:

| What | Where | Role |
|---|---|---|
| The 11-stage contract (rules, exemptions, triage ladders) | `<repo>/.agents/skills/verify-design-system/SKILL.md` | **Rulebook.** Read the stage you are triaging. |
| The gates | `<repo>/scripts/validation/*.mjs`, `tests/parity/` | **Enforcement.** |
| `scripts/verify-ds.mjs` (this skill) | next to this file | **Runner.** Executes gates, maps them to stages, stores evidence, prints the verdict. |
| `scripts/live-probe.mjs` (this skill) | next to this file | **Fills the gap** no gate covers: is *this route, as rendered,* wearing the DS? |

`<skill>` below means the directory this SKILL.md lives in.

## The rule

**A stage that did not execute is UNVERIFIED. UNVERIFIED is never PASS.**
Reading code and concluding "looks compliant" is not verification. Neither is
an offline run. If the app wasn't running, stages 2–4, 6–9 and 11 were not
verified, and the report says so in those words.

Verify the real system. If a gate can't run because the app, database, Clerk
keys or Chromium are missing, fix the environment or report UNVERIFIED — do not
mock the app, stub a route, serve a fixture, or weaken a gate to get green.

## Workflow

### 1 · Run it

From the repo root (or pass `--repo <path>`):

```bash
# Fast static contract — no server needed (~20s). Use while iterating.
node <skill>/scripts/verify-ds.mjs

# The real verification — app must be running (npm run dev → :5000).
node <skill>/scripts/verify-ds.mjs --mode full --routes /,/category/encoding-codecs,/settings/theme

# Release-grade: adds the 5×10 theme sweep + axe + pixel parity (slow).
node <skill>/scripts/verify-ds.mjs --mode full --deep
```

Pass `--routes` for the pages you actually changed — the live probe checks each
one. Signed-in/admin gates need `CLERK_SECRET_KEY`, `ADMIN_PASSWORD` (≥ 8
chars) and `DATABASE_URL` in the environment; without them those gates report
UNVERIFIED with the missing names. Other flags: `--list`, `--only id,id`
(scoped debugging run — can never produce PASS), `--base-url`, `--json`.

| Exit | Verdict | Meaning |
|---|---|---|
| 0 | **PASS** | Every gate ran and passed. Only reachable with `--mode full`. |
| 1 | **FAIL** | ≥ 1 🔴 BLOCK gate failed. Not DS-compliant. |
| 2 | **FIX** | No BLOCK, ≥ 1 🟡 FIX gate failed. Address before shipping. |
| 3 | **INCOMPLETE** | Nothing failed, but something didn't run. Not a pass. |

### 2 · Read the evidence — before you say anything

The runner prints the evidence directory
(`<repo>/.cache/verify-ds/<runId>/`, self-git-ignored). Open:

1. `VERDICT.md` — verdict, findings by severity, stage-coverage table.
2. The `.log` of **every** failed gate — the gates name file, line, system and
   token. Quote those, not your paraphrase.
3. For a full run, **look at** `live-probe/<route>-<system>.png` for at least
   Editorial and Brutalist. They must look deliberately different, not broken.
   The probe checks computed styles; your eyes catch a page that restyled
   into garbage.

### 3 · Triage each failure against the rulebook

Open the matching stage in the in-repo SKILL.md and walk its ladder before
calling anything a violation — the repo has deliberate exemptions
(`/* DS-OK: reason */` tags, known composite chrome, MR-DS-13 divergences,
`DOCUMENTED_DEVIATIONS` in token parity). Which gate maps to which stage, what
each proves, and how to read its failures: `references/gate-map.md`.

The rulebook has a few stale passages and two broken DevTools snippets; read
`references/rulebook-drift.md` before trusting stage 3, 7, 8 or 9 prose.

### 4 · Report

Emit the verdict block from the in-repo skill, filled from `results.json`, with
one addition — an **UNVERIFIED** section. Every finding cites its stage, the
gate, and `file:line` from the log. Include the run id and evidence path.

Don't auto-fix from this skill. Report, then fix on request (or under the task
that invoked you) — and **re-run after every fix**; a fix isn't done until the
same command shows it.

## Things that will bite you

- **Three gates parse the in-repo SKILL.md.** `palette-drift` diffs its stage-5
  `rg` command, `standalone-palette-drift` parses the scope comment,
  `ds-button-sweep` diffs the six stage-6 JS snippets literal-for-literal
  against `ds-button-filter.mjs`. Editing those blocks without the script (or
  vice-versa) fails the gate. Change both in one commit.
- **`awesome-list-site-ds/` is frozen.** It is the design authority, kept
  byte-identical to the upload. Never edit it to make a check pass — port the
  change into `client/` instead.
- **Baselines only shrink.** `palette-drift --update-baseline` refuses to write
  while any count is above baseline. If it asks you to update after a cleanup,
  commit the shrunken baseline with the cleanup. Never use it to absorb a new hit.
- **Token changes ripple.** Adding a system or accent means `design-system.css`,
  `design-system.ts` *and* regenerating the artifact
  (`npm run generate:design-system-artifact`) — `accent-drift` and `ds-artifact`
  will tell you which you missed.
- **The app switches systems with CSS only.** `:root[data-system]` blocks do
  the work; `applyDesignSystem()` just flips attributes. A missing
  `<script src="design-systems.js">` or raw `.btn` class is *correct* in
  `client/` (shadcn + Tailwind bridge + `data-ds` hooks) — those belong to
  standalone artifacts only.
- **A crashed gate is not a finding.** `ERR_MODULE_NOT_FOUND`, a missing
  Chromium, or an unreachable app shows up as UNVERIFIED with the fix
  (`npm ci`, `npm run test:e2e:browsers`, `npm run dev`). Fix the environment
  and re-run; don't report it as a DS failure and don't wave it through.

## When not to use

- Visual taste ("does this look good?") — this is structural. Use a visual
  review skill alongside it.
- Other repos. The runner refuses to start outside awesome-list-site.
- Content, SEO, links, auth — use the repo's `awesome-video-site-audit` skill.
