# Build wave 1: shared rules (lead-written; layout is mine)

The owner approved PLAN.md (all 23 defaults) on 2026-11-06 21:30Z. PLAN.md is on origin/main at
`reports/prod-ops-2026-11-06/PLAN.md`. Your unit's design file is in `reports/prod-ops-2026-11-06/lanes/`.

## Workspace
- Make your own worktree from fresh origin/main:
  `cd /Users/nick/Desktop/awesome-list-site && git fetch -q && git worktree add -b <branch> .claude/worktrees/<branch-tail> origin/main`
  Then `ln -s /Users/nick/Desktop/awesome-list-site/node_modules node_modules` inside it (the name is in .git/info/exclude).
- Touch ONLY the files your brief lists. If you need another file, message the lead first (another lane may own it).
- Never touch the main checkout's working tree, `docs/audit/*`, or any other worktree.

## Hard limits (unchanged by the approval)
- No `publish_app`, no `update_app_using_prompt`, no Replit Secrets or deployment changes, no account creation.
- No POST/PUT/PATCH/DELETE to https://awesome.video. Read-only GETs are fine where your brief says so.
- Never print secrets, cookies or `~/.cache/awesome-audit/*`. Never sign anyone out.
- Do not merge your PR. Open it; the lead runs the merge gate and merges.
- Owner rule: no test files, no test suites, no validation scripts other than the deliverable itself.

## Gates before you open the PR (run unpiped, report the exit codes)
1. `npx tsc --noEmit -p . --incremental false`, which must exit 0.
2. `BUILD_REVISION=$(git rev-parse HEAD) npm run build`, which must exit 0.
3. `npx eslint <each file you touched>`. Compare the error count per file with origin/main
   (`git show origin/main:<file> | npx eslint --stdin --stdin-filename <file>`). No file may get worse.
4. Files ≤ 500 lines (CLAUDE.md). Functions small, no speculative abstractions, match the surrounding style.
5. Exercise what you can without production writes: run the code path, curl a local server only if it needs no
   production DATABASE_URL (it does not exist locally), or read the code path end to end and say so. Runtime proof on
   production comes after the owner-approved publish. Say plainly what is UNVERIFIED.

## Commit and PR
- Conventional commit (`feat:`, `fix:` …), no Co-Authored-By trailer, stage specific files only.
- `git push -u origin <branch>`, then `gh pr create --base main` with a body containing:
  what changed (file:line), gate outputs (commands + exit codes), what was exercised, what stays UNVERIFIED until
  production, and `Refs #<issue>` (not "Closes": issues close after production verification).
- Then send the lead: PR URL, gate exit codes, UNVERIFIED list. Under 150 words.
