---
name: review-pr
description: Review an awesome-list-site pull request pinned to its head commit and post a SHA-bound verdict comment that the merge guard reads. Use when asked to review, approve or request changes on a PR, to re-review after new commits, or before any merge.
---

# Pinned PR review

Reviews are bound to one commit. A verdict that names a different SHA than the PR head does not count, and the merge guard blocks the merge.

## Steps

1. Record the head: `gh pr view <N> --json headRefOid,baseRefName,files` and write down `headRefOid` (call it `HEAD40`).
2. Worktree at that SHA, inside the checkout, at a path unique to this invocation, `<WT>` = `.claude/worktrees/review-<N>-<first 8 of HEAD40>-<stamp>` with `<stamp>` from `date -u +%Y%m%dT%H%M%SZ`: `git fetch origin && git worktree add <WT> <HEAD40>`. Write `<WT>` down and spell the literal path out in every later command (the shell does not carry variables into your next call, and `$VAR` does not expand inside single quotes). A fixed `review-<N>` path collides with an interrupted review or a second reviewer of the same PR; the stamp avoids that. A leftover worktree from a dead review is recovered with `git worktree list` (find `review-<N>-*`) and, only if you own it or the lead says so, `git worktree remove --force <path>`. Never call EnterWorktree: reviewers are in-process teammates, so it moves the whole session and refuses the lead's and every lane's next Bash call. Run every command for this review with `git -C <WT> …` or `bash -c 'cd <WT> && …'` (the cwd does not carry into your next call anyway). The pin hook scans every worktree under `.claude/worktrees/` from any cwd, so it fires although you never enter one.
3. Pin file, in the worktree's own git dir so it can never appear in `git status` or a commit, naming you as the owner: `bash -c 'cd <WT> && echo "pr=<N> sha=<HEAD40> agent=<YOUR_AGENT_ID>" > "$(git rev-parse --absolute-git-dir)/review-pin"'`. `<YOUR_AGENT_ID>` is the `ID:` your SubagentStart context shows (the hook reads the same value as `agent_id`). Write and read the pin only through the `$(git rev-parse --absolute-git-dir)` form: the scout-block hook denies any Bash command that names a literal `.git` path, and you must not route around it. What the guard does: while PR <N> is open and the worktree `HEAD`, the pin and the live `headRefOid` disagree, it blocks `SendMessage` for the pin's owner (`agent_id` equal to `agent=`) and for any subagent whose cwd is inside that worktree. It never blocks the lead (hook input without `agent_id`), a headless run, or any other agent, so a stale pin cannot stop anyone else from reporting. A pin without `agent=` blocks nobody except a subagent inside its worktree. When you are blocked, repair the pin (check out the new head in `<WT>`, write the pin again with the new SHA, review the delta) or clear it with `git worktree remove --force <WT>`; only the owner does either.
4. Build and lint, always inside the PR worktree and a base worktree, never in the main checkout (a bare `npm run build` in your session cwd checks the main checkout, not the PR). Install and build the PR tree: `bash -c 'cd <WT> && npm ci && npm run build'` (PRs here come from same-repo branches, so the install runs trusted code; do not run it on a fork's head). Lint the touched files at the PR head: `bash -c 'cd <WT> && npx eslint <touched files>' > <pr-eslint-file>`. Then make a second worktree at the base commit, with its own unique path `<BASE>` = `.claude/worktrees/base-<N>-<first 8 of base SHA>-<stamp>`: `git worktree add <BASE> <baseRefOid>` (`gh pr view <N> --json baseRefOid`), `bash -c 'cd <BASE> && npm ci && npx eslint <same files>' > <base-eslint-file>`, and diff the two outputs. Only new errors count.
5. Read every changed file and its callers (Grep tool). Read the PR body and the claims it makes.
6. Prove each behavioural claim with a before/after probe run with `npx --yes vite-node@6.0.0` (not plain `tsx`; macOS `/tmp` is `/private/tmp`; it is not a project dependency, so never add it to `package.json`). When local `main` is behind, read base files with `git show origin/main:<path>`. Prove UI claims on the real system (agent-browser, curl), never with mocks.
7. Before the verdict re-fetch both the head and all review threads:

   ```bash
   gh pr view <N> --json headRefOid
   gh api graphql -F n=<N> -f query='query($n:Int!){repository(owner:"krzemienski",name:"awesome-list-site"){pullRequest(number:$n){headRefOid reviewThreads(first:100){pageInfo{hasNextPage} nodes{id isResolved comments(first:20){nodes{author{login} body path}}}}}}}'
   ```

   If `headRefOid` moved, update `<WT>` to the new head (`git -C <WT> checkout --detach <new head>`), re-pin with the same `agent=`, review the delta (`git diff <old>..<new>`) plus whatever it touches, and re-run step 4 (build and lint, inside `<WT>`) at the new head before the verdict.
8. Address every unresolved thread: read it, fix or answer it, and only then resolve it: `gh api graphql -f id=<threadId> -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}'`.
9. Post the verdict as a PR comment, as the LAST action of the review: only after every probe and the step 7 re-fetch are done. Never post a provisional APPROVE and reverse it later; a merge can land in the gap (#453 merged 8 s before its reviewer reversed). If a late finding changes the verdict, post the corrected comment before anything else and tell the lead at once (GitHub refuses self-approval, so the merge guard reads this comment). The first line is exactly one of:

   ```
   VERDICT: APPROVE <full-40-char-sha>
   VERDICT: REQUEST_CHANGES <full-40-char-sha>
   ```

   Then list findings with `path:line` and the probes run with their output. Post with `gh pr comment <N> --body-file <file>`.
10. Clean up, last, after the verdict comment is posted and the report sent: `git worktree remove --force <WT>` and `git worktree remove --force <BASE>`, run from the main checkout (your session cwd was never inside either). Removing `<WT>` removes the pin with it, which releases the guard. Do not call ExitWorktree.

## Rules

- The verdict SHA is the full 40-character `headRefOid` read in step 7.
- The verdict comment is the last action; the report to the lead follows it. The lead merges only after that report.
- A new push after an APPROVE invalidates it: review the delta and post a fresh verdict.
- Report to the lead in at most 5 lines: verdict, SHA, counts, comment URL.
- A hook block is a stop sign: report it, never route around it. If the pin guard names your worktree, repair or clear your own pin (step 3). If it names someone else's worktree, report it to the lead instead of touching it: by design it only ever blocks the pin's owner or an agent inside that worktree.
