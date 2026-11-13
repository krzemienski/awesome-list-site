# Merge gate design (#84): `scripts/merge-gate.sh <branch>`

> Layout is mine. Design only; the script is not written. Measurements were taken once, locally, in the prod-ops worktree (origin/main `6cb1a93e`); no production contact.

## Issue #84 (read via `gh issue view 84`)
A PR passed its own check, but the merge broke `tsc` on the combined tree. The check was `tsc | tail; echo $?`, so the pipe hid the exit code. `npm run build` is esbuild/vite and does not type-check. Ask: scratch worktree from origin/main, merge branch, symlink node_modules, run `tsc --noEmit -p .` and `npm run build` unpiped, exit with their status, remove worktree.

## Measured today (one run each)
| Step | Command | Wall time | Result |
|---|---|---|---|
| tsc | `npx tsc --noEmit -p . --incremental false` | **10.9 s** | exit 0, no errors |
| build | `npm run build` (vite client + vite SSR + esbuild server) | **5.8 s** | exit 0 (server bundle 1.6 MB warning only) |
| eslint | `npx eslint server/lib/logger.ts server/index.ts` | 3.6 s | **27 errors on those two untouched files** |
So origin/main is clean for tsc and build today; ESLint is not clean (the project CLAUDE.md already says whole-repo lint has about 4.4k pre-existing errors). Whole gate is roughly 20-25 s plus worktree setup. Cheap enough to run before every merge.

## Script outline
```
set -u -o pipefail            # no pipes on gate commands; no `| tail`
BR=$1
git fetch origin main "$BR"   # branch may be remote-only: use origin/$BR if no local ref
T=$(mktemp -d)/gate
cleanup(){ git worktree remove --force "$T" 2>/dev/null; git worktree prune; }
trap cleanup EXIT INT TERM
git worktree add --detach "$T" origin/main
cd "$T"
git merge --no-commit --no-ff "origin/$BR" || { echo "GATE FAIL: merge conflict"; exit 10; }
ln -s "$MAIN_CLONE/node_modules" node_modules
npx tsc --noEmit -p . --incremental false || { echo "GATE FAIL: tsc"; exit 11; }
npm run build                                || { echo "GATE FAIL: build"; exit 12; }
# eslint: changed files only, compared with baseline (see below)
echo "GATE PASS"; 
```
Exit codes differ per step so the caller knows which failed; the first failure stops the run (run all steps instead if a full report is preferred; each is under 15 s).

## Pitfalls found
1. **`.gitignore` has `node_modules/` (trailing slash), which does not match a symlink.** After linking, `git status` showed `?? node_modules`. Harmless for `merge --no-commit`, but a later `git add -A`/dirty check would pick it up. Create the link **after** the merge, or add `node_modules` (no slash) to `.git/info/exclude` in the scratch tree. `dist/` is ignored, fine.
2. **`tsBuildInfoFile` is `./node_modules/typescript/tsbuildinfo`** (`tsconfig.json`, `incremental: true`). Through the symlink it would write into the main clone's node_modules and reuse a cache from another tree, which can hide errors. Pass `--incremental false` (done above; time was still 10.9 s).
3. **Build needs `BUILD_REVISION` or `.git`** (`package.json` build script exits 1 otherwise). A worktree has a `.git` file so `git rev-parse HEAD` works and returns the detached origin/main SHA, not the merged tree; export `BUILD_REVISION=gate-$(git rev-parse --short HEAD)` explicitly.
4. **Vite/esbuild resolution** worked through the symlink (build passed). `vite.config.ts` uses `import.meta.dirname` paths (`dist/public`), which resolve to the scratch tree, so the main clone's dist is untouched. Pitfall: if the branch changes `package.json`/lockfile, the symlinked modules are stale and the gate can false-pass or false-fail. Compare `git diff --name-only origin/main...` for `package.json|package-lock.json` and abort with "dependencies changed: run npm ci in the scratch tree" (slower path).
5. The branch may carry its own `.gitignore`d outputs; irrelevant. Run from the scratch tree, never from the lead's dirty working tree (the prod-ops tree here has an untracked reports dir).
6. Fixed tmp paths collide when two gates run at once; `mktemp -d` avoids that.

## ESLint step
Whole-repo lint fails on pre-existing errors, and even two untouched files fail (27 errors), so "eslint changed files, fail on any error" would block everything. Use a regression check: for each file changed vs origin/main, count errors now and at `origin/main` (`git show origin/main:file | eslint --stdin --stdin-filename file`); fail only if the count rises for a file or a new file has any errors. Report-only until the baseline is reviewed. Cost: about 4 s for a handful of files.

## Where it plugs in
- **replit-deploy skill / merge flow:** run `scripts/merge-gate.sh <branch>` before `gh api …/merge` (the squash-merge call noted in project memory). Non-zero exit means no merge. After merge, deploy still verifies the live SHA via `/api/version` as it does today; the gate does not replace that. The gate checks the combined tree before the merge; a post-merge re-run against fresh origin/main (`merge-gate.sh` with no branch) can double as the pre-deploy check.
- **Self-healing loop (§7 step 3):** on exit 11/12 the loop gets the failing step name and the tail of that command's own output (the script prints it unpiped to a log file under `.claude/evidence/<session>/` and shows the last lines on failure). The fixer pushes to the PR branch, then the loop re-runs the gate; stop after two failed rounds per the usual fix-loop rule and report.
- The lead runs it, not the PR's author, so the author's claim stays a claim until verified.

## Not verified
- The script itself, the eslint-baseline comparison, and the lockfile-change path were not run.
- Timings are one run on a warm machine; a cold npm cache or first tsc without `--incremental false` can differ.
- Behaviour with a remote-only branch name containing slashes, and with merge conflicts, was reasoned, not exercised.
