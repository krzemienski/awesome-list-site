# `test:e2e` after the click-through (2026-09-15)

The task's no-regression guarantee is "`test:e2e` still green afterwards".
Before this task the suite could not run at all outside Chromium (Firefox and
WebKit were never installed; the earlier ICU record is in
`../browser-prerequisites/` and `../test-e2e-output.txt`). This directory is
the record of making the full suite runnable on this host and of the run that
followed the click-through and its teardown.

## Final run (green)

`npm run test:e2e -- --workers=3 --reporter=list,json`, all five projects,
started 2026-09-15T15:41:57Z, 25.7 min, exit 0.

| Project | Passed | Failed | Flaky | Skipped |
|---|---|---|---|---|
| chromium | 143 | 0 | 0 | 0 |
| firefox | 142 | 0 | 1 | 0 |
| webkit | 124 | 0 | 0 | 19 |
| Mobile Chrome | 143 | 0 | 0 | 0 |
| Mobile Safari | 124 | 0 | 0 | 19 |
| **Total** | **676** | **0** | **1** | **38** |

Files: `final-run-2026-09-15-summary.json` (per-project counts, the flaky
test and its first-attempt error), `final-run-2026-09-15-tail.log` (list
reporter without passing lines).

The flaky case: firefox `admin-users-audit.spec.ts:505` "Users and Audit
retain serious/critical accessibility at 1440px" — first attempt hit the
60 s test timeout inside `AxeBuilder.analyze()`, whose `context.newPage()`
for axe's helper page never returned (`browserContext.newPage: Target page,
context or browser has been closed` is the teardown message); passed on the
retry in 17.6 s. This is the fourth run in a row in which exactly one
Firefox Task549 axe cell did this (three times as an outright failure, once
as this hang); it never reproduces solo. The specs cannot work around a
`newPage` that hangs, so `playwright.config.ts` now sets `retries: 1`
locally (CI already used 2); a retried pass is reported as flaky.

Case-count changes since the runs below: the `admin-operations.spec.ts`
20-cell sweep is now one test per width (5 tabs × 1 width each, 4 tests), so
totals rose from 700 to 715 and the WebKit/Mobile Safari skip count from 16 to
19 per project. There are no serial-group follow-on skips.

### Stabilisation between the runs (test-only)

| Symptom (run, project) | Fix |
|---|---|
| `search.spec.ts` "close dialog with Escape" — dialog still open (run 3, chromium) | both Escape tests now wait for the dialog and the focused combobox before pressing (same as the keyboard-navigation test) |
| `browse-categories.spec.ts` "category page on mobile viewport" — still on `/` after the card click (runs 1 and 3, webkit) | `openFirstCategory()` clicks until the URL is `/category/…` (a click during the home grid's data re-render hits a detached node) |
| `continue-learning.spec.ts` — `NS_BINDING_ABORTED` on `/profile`, preview not visible in 5 s (run 2, firefox / Mobile Chrome) | `waitForLoadState('load')` before the `/profile` goto; 15 s preview timeouts |
| `admin-operations.spec.ts` 20-cell sweep — 180 s / 60 s timeouts (runs 1–2, firefox and mobile) | split per width, `testInfo.slow()` |
| Firefox axe `newPage` (every run) | `expectSeriousA11y` retries axe once when the page is still open; the hang variant needs the Playwright retry above |

### Reproducible browser install

`npm run test:e2e:browsers` (`PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright
playwright install chromium firefox webkit`) installs the revisions pinned by
`@playwright/test`. Proven from an empty cache directory on this host: 55 s,
chromium 148.0.7778.96 / firefox 150.0.2 / webkit 26.4 all launched and
loaded the app title; documented in `tests/README.md`.

## Earlier full runs

Run 2: `npm run test:e2e -- --workers=3 --reporter=list,json` on an unchanged local
checkout against `http://localhost:5000`, all five configured projects
(chromium, firefox, webkit, Mobile Chrome, Mobile Safari). Started
2026-09-15T14:18:08Z, 23.3 min.

| Project | Passed | Failed | Skipped |
|---|---|---|---|
| chromium | 140 | 0 | 0 |
| firefox | 137 | 2 | 1 |
| webkit | 124 | 0 | 16 |
| Mobile Chrome | 138 | 1 | 1 |
| Mobile Safari | 124 | 0 | 16 |
| **Total** | **663** | **3** | **34** |

Files: `full-run-2026-09-15-summary.json` (per-project counts and every
non-passing test with its first error line), `full-run-2026-09-15-failures-and-summary.log`
(the list-reporter output with passing lines removed), `solo-reruns-2026-09-15.log`.

### The 3 failures — all pass solo, all load flakes at 3 workers

| Test | Full-run error | Solo rerun (`--workers=1`) |
|---|---|---|
| firefox `admin-operations.spec.ts:56` (5 tabs × 4 widths + axe) | 180 s timeout; Firefox closed the browser mid-axe (`browserContext.newPage: Target page … has been closed`) | ✓ 25.7 s |
| firefox `continue-learning.spec.ts:119` | `page.goto('/profile')` → `NS_BINDING_ABORTED` (navigation raced the SPA's own redirect) | ✓ 13.7 s |
| Mobile Chrome `continue-learning.spec.ts:119` | `continue-learning-preview` not visible within 5 s on `/?context=account` | ✓ 10.6 s |

The 1 firefox / 1 Mobile Chrome skip is the second test of the
`continue-learning` serial group, which Playwright skips after the first
fails; the whole file was then rerun solo on both projects — 4/4 passed
(appended to `solo-reruns-2026-09-15.log`).

### The 32 declared skips (webkit + Mobile Safari, 16 each)

`admin-operations`, `admin-users-audit` and `continue-learning` depend on a
server-visible Clerk session. WebKit rejects `SameSite=None` cookies that lack
`Secure`, and Clerk development instances write `__session` / `__client_uat`
exactly that way over plain http (measured with a `document.cookie` setter
hook: clerk-js issues the writes; the jar keeps only `clerk_active_context`;
`window.Clerk.user` is set while `/api/auth/user` stays anonymous). The
browser-side sign-in completes but the app server never receives a session, so
every server-authenticated fixture times out. This is not app code (production
is https and unaffected), so those specs call
`skipWebKitOnPlainHttp()` (exported from `tests/e2e/task549-admin-fixtures.ts`)
which skips them only when `browserName === "webkit"` and the base URL is not
https, with the reason in the report.

## What had to change to make the suite runnable (test/config only)

Runtime (`playwright.config.ts`, `.replit`):
- Firefox 1522 and WebKit 2287 installed into the workspace cache
  (`.cache/ms-playwright`, survives restarts); the config defaults
  `PLAYWRIGHT_BROWSERS_PATH` to it.
- `webkit` is imported from `@playwright/test` (the root `playwright`
  dependency floats to a revision that was never downloaded).
- WebKitGTK on this NixOS host: `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS`
  set on the worker process, `REPLIT_LD_LIBRARY_PATH` handed to the browser as
  `LD_LIBRARY_PATH`, `headless:false` (the headless build aborts), video off
  (≈1 in 4 `newPage` calls hung with recording on), and — new this task — the
  system package `glib-networking` plus `GIO_EXTRA_MODULES`, without which
  every https request failed with "TLS support is not available" and Clerk's
  sign-in form never rendered.

Specs (stale copy or brittle timing; no component was changed):
- `search.spec.ts`: the search input is addressed by its accessible name
  (`combobox` "Search resources, categories, and pages"); the previous
  placeholder text was replaced by the shell re-skin on 2026-09-14
  (`b190c8fe`). The "results or no-results" check polls up to 15 s instead of
  sleeping 500 ms (WebKit under load exceeded it), and looks for the real
  "No results for" copy. The keyboard-navigation test waits for the palette to
  be open and focused before pressing Tab/Escape (an Escape delivered before
  the dismiss listener mounts is lost — it had failed on Chromium once too).
- `favorites.spec.ts`: guest-bookmarks expectations updated to the shipped
  copy ("Nothing saved on this device" / "Saved, for now." / "Explore
  resources").
- `admin-operations.spec.ts:56`: `testInfo.slow()` — the 20-cell sweep with a
  full-page screenshot and axe scan per cell measured 40 s on Chromium and 58 s
  on Firefox under a full parallel run, and over 60 s on the emulated mobile
  projects.
- `admin-users-audit.spec.ts` `dismissToast`: the toast close button is
  enabled by `group-hover`, which Tailwind gates on `@media (hover: hover)`;
  on the touch projects it never becomes clickable. The helper now focuses the
  button and presses Enter (its documented focus path) on every project.
  **Handoff (shared component, not edited here):** on touch devices the toast
  has no reachable dismiss control other than swipe/auto-dismiss.
- WebKit-over-http skip described above.

Run 3 (after the per-width split and the continue-learning fixes; before
the search/browse fixes): 2026-09-15T15:11:31Z, 26.2 min — 674 passed / 3 failed
/ 38 skipped; failures chromium `search.spec.ts` Escape, firefox
`admin-users-audit.spec.ts:505` @1024 (axe `newPage` closed at 18 s), webkit
`browse-categories.spec.ts` mobile category (card click did not navigate).
All three are in the stabilisation table above.

## First full run (before the spec fixes landed)

Also 2026-09-15, `--workers=3`: 618 passed, 80 failed, 2 did not run. The 80
were: every `search.spec.ts` case on every project (placeholder selector),
firefox `favorites.spec.ts` (copy), all WebKit/Mobile Safari admin fixtures
(then TLS, now the declared skip), the two Mobile Chrome timeouts fixed above,
and two single-occurrence infra flakes (firefox "browser has been closed",
webkit 5 s `toBeVisible` on `browse-categories`) that passed on rerun. Not
retained as files; superseded by the run above.

## Residue

Fixture setups that timed out on WebKit before the skip existed leaked their
Clerk users (the identity was never returned to the fixture, so its teardown
never ran; no local row was ever provisioned because the server never saw a
session). All 20 created during this task's runs (created ≥ 2026-09-15T12:59Z)
were deleted through the Clerk API; the three older `__qa_test_parity_*`
identities belonging to a concurrent worker were left in place. After the
final run: 0 local `__qa_test` users, 0 `__qa_test` resources,
`approved = 1816` (unchanged baseline).
