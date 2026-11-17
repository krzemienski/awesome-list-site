---
name: review-pr
description: Review an awesome-list-site pull request pinned to its head commit and post a SHA-bound verdict comment that the merge guard reads. Use when asked to review, approve or request changes on a PR, to re-review after new commits, or before any merge.
---

# Pinned PR review

Reviews are bound to one commit. A verdict that names a different SHA than the PR head does not count, and the merge guard blocks the merge.

## Steps

1. Record the head: `gh pr view <N> --json headRefOid,baseRefName,files` and write down `headRefOid` (call it `HEAD40`).
2. Worktree at that SHA, inside the checkout: `git fetch origin && git worktree add .claude/worktrees/review-<N> <HEAD40>`. Work only there.
3. Pin file: in that worktree create `.review-pin` containing `pr=<N> sha=<HEAD40>`. Create it only inside ignored `.claude/worktrees/*` review worktrees, never in a tracked tree, never committed. While it exists, the review-pin hook blocks any `SendMessage` if the worktree `HEAD`, the pin and the live `headRefOid` disagree.
4. Build and lint: `npm ci` if needed, then `npm run build`. Run `npx eslint <touched files>` at the PR head and again in a second worktree at the base commit, and diff the two outputs. Only new errors count.
5. Read every changed file and its callers (Grep tool). Read the PR body and the claims it makes.
6. Prove each behavioural claim with a before/after probe run with `vite-node` (not plain `tsx`; macOS `/tmp` is `/private/tmp`). When local `main` is behind, read base files with `git show origin/main:<path>`. Prove UI claims on the real system (agent-browser, curl), never with mocks.
7. Before the verdict re-fetch both the head and all review threads:

   ```bash
   gh pr view <N> --json headRefOid
   gh api graphql -F n=<N> -f query='query($n:Int!){repository(owner:"krzemienski",name:"awesome-list-site"){pullRequest(number:$n){headRefOid reviewThreads(first:100){pageInfo{hasNextPage} nodes{id isResolved comments(first:20){nodes{author{login} body path}}}}}}}'
   ```

   If `headRefOid` moved, update the worktree to the new head, re-pin, and review only the delta (`git diff <old>..<new>`) plus whatever it touches.
8. Address every unresolved thread: read it, fix or answer it, and only then resolve it: `gh api graphql -f id=<threadId> -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}'`.
9. Post the verdict as a PR comment (GitHub refuses self-approval, so the merge guard reads this comment). The first line is exactly one of:

   ```
   VERDICT: APPROVE <full-40-char-sha>
   VERDICT: REQUEST_CHANGES <full-40-char-sha>
   ```

   Then list findings with `path:line` and the probes run with their output. Post with `gh pr comment <N> --body-file <file>`.
10. Clean up: `git worktree remove --force .claude/worktrees/review-<N>`.

## Rules

- The verdict SHA is the full 40-character `headRefOid` read in step 7.
- A new push after an APPROVE invalidates it: review the delta and post a fresh verdict.
- Report to the lead in at most 5 lines: verdict, SHA, counts, comment URL.
- A hook block is a stop sign: report it, never route around it.
