---
name: review-pr
description: Review an awesome-list-site pull request pinned to its head commit and post a SHA-bound verdict comment that the merge guard reads. Use when asked to review, approve or request changes on a PR, to re-review after new commits, or before any merge.
---

# Pinned PR review

Reviews are bound to one commit. A verdict that names a different SHA than the PR head does not count, and the merge guard blocks the merge.

## Steps

1. Record the head: `gh pr view <N> --json headRefOid,baseRefName,files` and write down `headRefOid` (call it `HEAD40`).
2. Worktree at that SHA, inside the checkout: `git fetch origin && git worktree add .claude/worktrees/review-<N> <HEAD40>`. Never call EnterWorktree: reviewers are in-process teammates, so it moves the whole session and refuses the lead's and every lane's next Bash call. Work only inside the worktree with `git -C .claude/worktrees/review-<N> …`, or `cd` inside one Bash call (the shell cwd does not carry into your next call anyway). The pin hook scans every worktree under `.claude/worktrees/`, so it fires from the main checkout.
3. Pin file, in the worktree's own git dir so it can never appear in `git status` or a commit: `bash -c 'cd .claude/worktrees/review-<N> && echo "pr=<N> sha=<HEAD40>" > "$(git rev-parse --absolute-git-dir)/review-pin"'`. Write and read it only through that `$(git rev-parse --absolute-git-dir)` form: the scout-block hook denies any Bash command that names a literal `.git` path, and you must not route around it. While the pin exists and PR <N> is open, the review-pin hook blocks every agent's `SendMessage` if the worktree `HEAD`, the pin and the live `headRefOid` disagree. The block message names the worktree; a stale pin is cleared with `git worktree remove --force <worktree>`, which removes the pin with it.
4. Build and lint: `npm ci` if needed (PRs here come from same-repo branches, so the install runs trusted code; do not run it on a fork's head), then `npm run build`. Run `npx eslint <touched files>` at the PR head and again in a second worktree at the base commit, and diff the two outputs. Only new errors count.
5. Read every changed file and its callers (Grep tool). Read the PR body and the claims it makes.
6. Prove each behavioural claim with a before/after probe run with `npx --yes vite-node@6.0.0` (not plain `tsx`; macOS `/tmp` is `/private/tmp`; it is not a project dependency, so never add it to `package.json`). When local `main` is behind, read base files with `git show origin/main:<path>`. Prove UI claims on the real system (agent-browser, curl), never with mocks.
7. Before the verdict re-fetch both the head and all review threads:

   ```bash
   gh pr view <N> --json headRefOid
   gh api graphql -F n=<N> -f query='query($n:Int!){repository(owner:"krzemienski",name:"awesome-list-site"){pullRequest(number:$n){headRefOid reviewThreads(first:100){pageInfo{hasNextPage} nodes{id isResolved comments(first:20){nodes{author{login} body path}}}}}}}'
   ```

   If `headRefOid` moved, update the worktree to the new head, re-pin, review the delta (`git diff <old>..<new>`) plus whatever it touches, and re-run step 4 (build and lint) at the new head before the verdict.
8. Address every unresolved thread: read it, fix or answer it, and only then resolve it: `gh api graphql -f id=<threadId> -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}'`.
9. Post the verdict as a PR comment, as the LAST action of the review: only after every probe and the step 7 re-fetch are done. Never post a provisional APPROVE and reverse it later; a merge can land in the gap (#453 merged 8 s before its reviewer reversed). If a late finding changes the verdict, post the corrected comment before anything else and tell the lead at once (GitHub refuses self-approval, so the merge guard reads this comment). The first line is exactly one of:

   ```
   VERDICT: APPROVE <full-40-char-sha>
   VERDICT: REQUEST_CHANGES <full-40-char-sha>
   ```

   Then list findings with `path:line` and the probes run with their output. Post with `gh pr comment <N> --body-file <file>`.
10. Clean up, last, after the verdict comment is posted and the report sent: `git worktree remove --force .claude/worktrees/review-<N>` (and the base-commit worktree from step 4). Run it from the main checkout; your session cwd was never inside the worktree, so nothing else needs leaving first. Do not call ExitWorktree.

## Rules

- The verdict SHA is the full 40-character `headRefOid` read in step 7.
- The verdict comment is the last action; the report to the lead follows it. The lead merges only after that report.
- A new push after an APPROVE invalidates it: review the delta and post a fresh verdict.
- Report to the lead in at most 5 lines: verdict, SHA, counts, comment URL.
- A hook block is a stop sign: report it, never route around it. A stale-pin block names the worktree to remove; if it is not your own review's worktree, report it to the lead instead of removing it.
