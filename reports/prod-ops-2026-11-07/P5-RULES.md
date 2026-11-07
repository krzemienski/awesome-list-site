# Phase 5 build rules (orchestrator-written, binding for every Phase 5 lane)

Owner approval, 2026-11-07, verbatim: "approve all defaults, go … always --auto". This approves APPROVAL.md §9 decisions 1-12 at their recommended defaults. Read `/Users/nick/Desktop/awesome-list-site/.claude/worktrees/prod-ops-1107/reports/prod-ops-2026-11-07/APPROVAL.md` §3.1, §4, §5.2 and §6 for the item you own.

## Your worktree
- Work only in the worktree path your brief names. It is on its own branch from origin/main 1cd25ab0.
- `node_modules` is a symlink to a shared install. Never `git add` it; stage specific files only.
- Touch only the files your brief lists. If you need another file, say so in your final message and do not edit it.

## Gates (all must pass before you commit)
- `npx tsc --noEmit`
- `npm run build`. The build also runs typecheck and lint:guards. If it fails only because of a sandboxed network fetch, show the exact error.
- `npx eslint <every file you touched>`
- Read the diff top to bottom (`git diff origin/main`): no debug code, no unrelated edits, no comment that narrates the obvious.

## Commit and PR
- Conventional commit (`fix:`, `feat:`, `chore:`, `docs:`), no Co-Authored-By trailer, no `--no-verify`.
- `git push -u origin <branch>` (HTTPS remote), then `gh pr create --base main` (ready, not draft). Never merge. The lead merges after an independent review.
- The PR body has: what changed and why (cite the APPROVAL D-, C- or W- id), the gate output (exit codes plus the last lines), and a **production verification recipe** (exact curl commands or browser steps plus the expected result). The lead runs it on awesome.video after deploy.

## Verification
- Owner rule (2026-10-28): fixes are proven only on awesome.video after deploy, never on a local or dev server. Local runs are allowed only as a smoke check and do not count as evidence.
- Production reads are allowed. Production writes only on QA rows (`qa-audit-20261107p5-<lane>-<n>`, URL `https://awesome.video/qa-audit-20261107p5/<lane>-<n>`), undone and read back. No paid calls (`POST /api/recommendations`, researcher, enrichment, AI analyse); route-abort them in any signed-in browser.
- Sessions, read-only: `~/.cache/awesome-audit/pp7b-audit-admin.state.json`, `~/.cache/awesome-audit/pp7b-member.state.json`. Never print anything from `~/.cache/awesome-audit/`, `.env`, cookies or tokens. Never sign out.

## Code
- Match the existing patterns of the file you edit. YAGNI: no speculative options or flags beyond the brief.
- Keep files under 500 lines. A file already over that must not grow by more than your change needs.
- The shell is zsh: quote expansions, and never use `path`, `status` or `prompt` as variable names.
- No helper script files in /tmp.

## Final message (to the lead, under 300 words)
Give the PR URL, the files changed, the gate results, the production verification recipe, and anything you could not do, with the exact reason.
