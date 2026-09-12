---
name: Measure gate baselines from the last green tree
description: How to judge "regression vs pre-existing" for lint, integration tests and e2e when the required-green list includes suites that were never green.
---

**Rule:** before calling a gate failure a regression, extract the last green
commit into `/tmp/<sha>` (`git archive <sha> | tar -x -C /tmp/<sha>`, then
`ln -s $PWD/node_modules /tmp/<sha>/node_modules`) and run the same gate there.
Compare per file / per test name, not exit codes.

**Why:** in this repo several gates listed as "must be green" have never been
green, and the only honest deliverable is "no new failures in files I own":
- `npm run lint` carries ~5.2k pre-existing errors from strict type-aware
  rules; a single new file can add hundreds. Compare `eslint --format json`
  per file over `git ls-files`.
- `npm run test:integration` (`tests/integration/api/*`) is mock-era: 171
  failed / 35 passed at the last green commit, and the *set* of failing names
  drifts by ±5 data-dependent cases between identical runs.
- `npm run test:e2e` has stale specs: `admin-operations` visits `/admin`
  unauthenticated (Clerk sign-in renders, everything times out),
  `admin-users-audit` logs in without an `Origin` header (403 same-origin),
  `browse-categories` still expects a "Back to all categories" button and a
  `select-sort` on category pages that were removed before the last green
  commit. Only Chromium is installed under `.cache/ms-playwright`
  (`--project=chromium --project="Mobile Chrome"`), so firefox/webkit/Mobile
  Safari projects cannot run here at all.

**How to apply:** when a task's contract says "gates X, Y, Z green", record the
measured baseline in the worklog, prove file-level parity for your files, and
say so explicitly instead of either "fixing" 5k lint errors or claiming green.
Also: a stale unresolved import (e.g. a deleted stylesheet) takes the Vite dev
server down mid gate-run, so a burst of "server not reachable" failures across
browser gates means *check the app is serving first*, then rerun. Cold-boot
flakes right after a restart: `url-params-audit` (`scrub-encoded:double-encoded`
banner not yet visible) joins `responsive`/`print` on the rerun-once list.
