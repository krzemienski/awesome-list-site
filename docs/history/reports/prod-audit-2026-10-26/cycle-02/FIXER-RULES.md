# Cycle-2 fixer rules (shared by every fixer brief)

1. Read /Users/nick/.claude/plugins/cache/pstack-claude/pstack/0.9.94/skills/poteto-mode/SKILL.md in full first.
2. Never run git checkout/switch/reset in /Users/nick/Desktop/awesome-list-site itself. Work only in the worktree path your brief names.
3. Before pushing: `git fetch origin && git merge --no-edit origin/main` and resolve.
4. Previous partial work (uncommitted diff in a resume worktree) is UNVERIFIED: review it against the finding, keep what is right, finish what is missing.
5. Verify as the end user locally: read memory /Users/nick/.claude/projects/-Users-nick-Desktop-awesome-list-site/memory/ (local-launch-env-traps.md, dev-server-no-watch.md, local-admin-verify-recipe.md). Run the app on a free port (not 5061, Chrome blocks it) against a throwaway local DB clone (`createdb -T awesome_waves <name>`; the template may lack migrations 0058/0059 — replay them on the clone). Never Neon/prod. Drop the clone and stop the server at the end. Drive with chrome-devtools MCP at 1440×900, 820×1180 touch and 390×844 touch unless the brief narrows it.
6. Owner rules (verbatim): "never write or execute scripts (Playwright/Node/shell harnesses). Drive the real app through the in-app browser / browser tools directly." No test files/scripts, no mocks/stubs/fake data. Never rename analytics events. Never touch production (https://awesome.video). Never print secrets.
7. `npx tsc --noEmit -p .` must exit 0 (check its own exit code, not a pipe's). `npm run build` must pass. ESLint on touched files no worse than main.
8. Conventional commits, one per finding group, no Co-Authored-By, stage specific files. New files under 500 lines.
9. Push `git push -u origin HEAD:<branch>`; `gh pr create --base main --head <branch>` with a body listing each finding, the root cause, the fix and evidence. Do not merge.
10. Final message: PR URL, per-finding PASS / UNVERIFIED with evidence. Return findings as text; do not write report files.
