# E2E and lint results after the sandbox retirement

Raw logs for the runs below were written to `/tmp/task569/` and were lost when
the workspace restarted during a later Firefox-only rerun (2026-09-15, ~05:45
UTC). The numbers recorded here were read from those logs before the restart;
they are transcribed, not re-derived. Anything that could be re-derived from
files that survive in the repository is marked as such.

## `npm run test:e2e` (Playwright, 5 projects, 700 tests, 4 workers, 24.7 min)

Command: `npx playwright test --reporter=list,json` with `BASE_URL=http://127.0.0.1:5000`
and the `.env` Clerk/admin keys, against the running dev server.

Result: **488 passed, 207 failed, 5 did not run** (exit 1).

Failure classification (from the JSON reporter, grouped by project × spec × first error line):

| Family | Count | First error line | Cause | Cleanup-related? |
| --- | ---: | --- | --- | --- |
| `firefox` project, every spec | 139 | `browserType.launch: Executable doesn't exist at .cache/ms-playwright/firefox-1522/firefox/firefox` | `@playwright/test` 1.60.0 pins Firefox r1522; only r1532 (for `playwright` 1.61.1) had been installed. | No. Environment. Repaired afterwards by `node node_modules/@playwright/test/cli.js install firefox` (r1522 now present next to r1532; no version pins changed). |
| `search.spec.ts` "Search Dialog" tests, all 4 remaining projects | 33 | `Test timeout of 60000ms exceeded` / `expect(locator).toBeVisible() failed` | Spec expects placeholder `/Search resources/i`; the canonical command palette (merged before this task, commit `46dad2d3`) renders `Find resources, categories, or pages…`. Stale selector. | No. Spec unchanged since before the starting commit; UI unchanged by this task. |
| `admin-operations.spec.ts` + `admin-users-audit.spec.ts` on `webkit`, `Mobile Safari` (and `firefox` in the rerun) | 30 | `locator.waitFor: Timeout 30000ms exceeded` (28) / `Test timeout of 60000ms exceeded` on Mobile Chrome (2) | Clerk sign-in flow does not complete in the WebKit/Gecko projects; Chromium passes the same specs and Mobile Chrome passes all but one per spec. | No. Auth code untouched. |
| `continue-learning.spec.ts:117`, Chromium/Mobile Chrome/WebKit/Mobile Safari | 4 | `POST /api/journeys/7/start failed: 401` (Chromium) / `locator.waitFor` timeout (WebKit) | Journey fixture posts without the session cookie. | No. |
| `browse-categories.spec.ts` on `webkit` | 1 | `expect(locator).toBeVisible() failed` | Single WebKit-only visibility failure. | No. |

The five "did not run" entries are the second `continue-learning` test in each project, skipped by `test.describe.serial` after the first one failed. 139 + 33 + 30 + 4 + 1 = 207.

Every failing spec is unchanged between the starting commit `b190c8fe` and
HEAD (`git diff --stat b190c8fe..HEAD -- tests/e2e` is empty), and the only
runtime change in that range is the four-line admin user-ID contract fix in
`server/contracts/inference.ts`, whose route is not exercised by the failing
tests (the admin specs that touch it pass on Chromium). The retirement itself
touched no file under `client/`, `server/` or `shared/`.

### Firefox-only rerun after the browser repair

`npx playwright test --project=firefox` was started to prove the launch error
was gone. Before the workspace restarted and killed it, the list reporter had
recorded 25 passed and 19 failed; every failure was in the admin, continue-
learning and browse-categories families above, and none was a launch error.
The rerun was not completed; Firefox is now launchable but is not claimed green.

### Full rerun on HEAD after the Firefox repair (authoritative)

`npx playwright test --reporter=list,json`, all 5 projects, 700 tests, 4
workers, 31.2 min, started 2026-09-15 06:15:45 UTC. Raw logs were copied into
the repository checkout (`.cache/task569/e2e-full.{json,log}`, gitignored) as
soon as the run ended; the grouped classification is committed as
`e2e-rerun-2026-09-15.txt`.

Result: **598 passed, 97 failed, 5 did not run, 0 flaky** (exit 1). The 139
Firefox launch failures are gone; the residual 97 are:

| Family | Count | Cause | Cleanup-related? |
| --- | ---: | --- | --- |
| `search.spec.ts` "Search Dialog", all 5 projects | 41 | Stale selectors: spec expects placeholder `/Search resources/i`; the canonical command palette renders `Find resources, categories, or pages…` (merged before this task). | No. |
| `admin-operations.spec.ts` + `admin-users-audit.spec.ts` on `webkit`, `Mobile Safari` (28), `firefox` (7), `Mobile Chrome` (2) | 37 | Clerk sign-in fixture (`task549Admin`) does not complete on WebKit/Gecko (`locator.waitFor` / fixture / storage-state timeouts); Chromium passes both specs. | No. Auth code untouched. |
| `browse-categories.spec.ts` on `firefox` (8), `Mobile Safari` (2), `webkit` (1) | 11 | Firefox: `browserContext.newPage: Target page, context or browser has been closed` cascade after a 60 s `beforeEach` timeout (browser crash/timeout, not an assertion); WebKit: single visibility / attribute assertions. | No. |
| `continue-learning.spec.ts:117`, all 5 projects | 5 | Journey fixture posts `/api/journeys/7/start` without the session cookie (401 on Chromium; fixture timeouts elsewhere). | No. |
| `favorites.spec.ts` on `firefox` | 3 | `beforeEach` timeout and two follow-on assertions in the same Gecko run. | No. |

41 + 37 + 11 + 5 + 3 = 97. The five "did not run" entries remain the serial
`continue-learning` follow-ups. Every failing spec is still unchanged since
the starting commit, and no `client/`, `server/` or `shared/` file was changed
by the retirement.

## `npm run lint` — no-regression measurement

Method (per `.agents/memory/last-green-baselines.md`): `eslint client server
shared scripts tests -f json` on the current tree and on `git archive
b190c8fe` extracted to `/tmp/task569/base` with `node_modules` symlinked, then
diffed per file and per rule over paths under `client/ server/ shared/ scripts/
tests/`.

Result: **4,893 findings in both trees; 0 files with new findings; 0 per-file
rule-count increases; 0 files improved.** The repository-wide `npm run lint`
total (5,347 errors / 23 warnings / 273 parsing errors on the current tree) is
larger because ESLint also walks `.local/`, `artifacts/`, `docs/` and other
non-project directories; those findings are outside the diffed scope and
pre-date this task as well. No rule was disabled, no ignore added, no baseline
reset.

The JSON outputs (`lint.json`, `lint-base.json`, `lint-diff.txt`) were in
`/tmp/task569/` and did not survive the workspace restart.
