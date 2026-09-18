---
name: Independent consensus audit panels
description: How to run N blind auditor subagents against a skill + URL and what breaks them.
---

Pattern: give each auditor ONLY the skill path, the URL and a private `.cache/<name>/`
output dir via one shared task template; run panels in parallel with
`config:{$kind:'general', relevantSkills:[skill]}`; `waitForJob` max is 600 s per call,
so poll in a loop. Dev panel first (iterate), then a fresh panel against
`npm run build && PORT=<n> npm run start` — start that server with run_in_background
(a `( … & )` subshell dies with the shell call).

**Why:** the skill must be executable without app-source knowledge; auditors that
share context or read the app converge on the author's blind spots. Six blind auditors
(3 dev + 3 prod) each rebuilt the 80-capture matrix and agreed only once the skill's
Stage 3/9 proofs were rewritten to what is actually true in-page.

**How to apply:** keep repo writes out of the window while dev-panel auditors browse
(Vite reloads every open page); save each verdict verbatim to
`.cache/<name>/VERDICT.md` right away — `waitForJob` output is truncated in the log.
Pixel-parity rows can be red on main for reasons unrelated to the branch: diff the
current tree against the last full-run baseline before attributing them.
