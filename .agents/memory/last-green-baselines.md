---
name: Measure gate baselines from the last green tree
description: How to judge "regression vs pre-existing" when a task's required-green list includes suites that were never green (lint, legacy integration tests, stale e2e specs).
---

**Rule:** before calling a gate failure a regression, extract the last green
commit into `/tmp/<sha>` (`git archive <sha> | tar -x -C /tmp/<sha>`, then
symlink `node_modules`) and run the same gate there. Compare per file / per
test name, not exit codes, and record the measured baseline in the task's
worklog.

**Why:** several gates this repo lists as "must be green" have a large,
long-standing red baseline: `npm run lint` (thousands of strict type-aware
errors), `npm run test:integration` (mock-era API tests written before the
Clerk migration and the real database), and parts of `npm run test:e2e`
(specs that still expect removed UI, unauthenticated admin visits, or a
pre-Clerk local login/register endpoint). Without a measured baseline you
either "fix" unrelated debt or claim green falsely; with one, "no new
failures in the files I own, identical suite totals" is a defensible,
checkable statement.

**How to apply:**
- Lint: `eslint --format json` in both trees, diff per file over `git ls-files`.
- Integration: compare per test name with `--reporter=json --outputFile=`
  in both trees. The old "failing set drifts by a few names between identical
  runs" was cross-file interference on the shared test DB, not data
  nondeterminism — run both trees with `--no-file-parallelism` (see
  vitest-shared-db-file-parallelism.md) and the set is byte-stable.
- e2e: check `git log` of a failing spec — if its last change predates the last
  green commit and the selector it wants exists in neither tree, it is stale,
  not broken by you. All five projects run here since 2026-09-15 (Firefox and
  WebKit installed in the workspace cache; WebKit runtime notes in
  playwright-browser-version-pin.md). A full run is ~40 min at 3 workers —
  background it. Spec copy drifts silently behind shared-component re-skins
  (search placeholder, bookmarks empty-state copy): check `git log` of the
  component before calling the spec stale.
- Browser gates that all fail with "not reachable" at once: confirm the dev
  server is actually serving first (a stale unresolved import takes Vite down
  mid-run), then rerun. Cold-boot flakes that pass on one rerun include the
  url-params scrub banner and Clerk's hosted recovery step, alongside the
  responsive/print audits.
- CSS-only or single-file changes: measure the e2e baseline without extracting
  a tree — write `git show HEAD:<file>` over the working copy (Vite HMR picks it
  up), rerun the failing spec, restore from a `/tmp` copy and re-check the
  SHA-256. An identical failing set with the old file is the proof; keep a copy
  of your version first, the swap is the only moment the tree isn't yours.
