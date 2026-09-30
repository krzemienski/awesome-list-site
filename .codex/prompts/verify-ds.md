---
description: Run the awesome-list-site design-system verification and report an evidence-backed verdict
argument-hint: [offline|full|deep] [routes]
---

Verify design-system work in awesome-list-site using the `awesome-ds-verify` skill.

Arguments: `$ARGUMENTS` — first word is the mode (`offline` default, `full`, or `deep`), the optional second is a comma-separated route list for the live probe.

1. Read `~/.agents/skills/awesome-ds-verify/SKILL.md` and follow it.
2. Map the mode to the runner and execute it from the repo root:
   - `offline` → `node ~/.agents/skills/awesome-ds-verify/scripts/verify-ds.mjs`
   - `full` → add `--mode full` (and `--routes <list>` if given). If the app is not reachable on :5000, start it (`npm run dev`, in the background, wait until it answers) — never substitute a mock or fixture.
   - `deep` → add `--mode full --deep`.
3. Open the printed evidence directory. Read `VERDICT.md` and the `.log` of every failed gate. On a full run, view the Editorial and Brutalist screenshots under `live-probe/`.
4. Triage each failure against the matching stage of `.agents/skills/verify-design-system/SKILL.md` (check `references/rulebook-drift.md` in the skill first for stages 3, 7, 8, 9).
5. Report the verdict block with BLOCK / FIX / UNVERIFIED sections, each finding citing stage, gate and `file:line` from the log, plus the run id and evidence path.

Rules: UNVERIFIED is never PASS. An offline run cannot justify "done". Do not edit `awesome-list-site-ds/`, do not grow a baseline, do not fix anything unless the user asked — report first.
