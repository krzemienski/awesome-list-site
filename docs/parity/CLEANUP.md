# Repository cleanup evidence

Historical cleanup record; see [current regression](REPORT.md),
[independent verification](VERIFICATION.md), [design-system audit](DS-AUDIT.md),
and [click-through](CLICKTHROUGH.md). Later browser-engine failures and fresh
verification cleanup qualifications are recorded separately, not retroactively
attributed to this cleanup run.

## Status

**Complete.** The Mockup Sandbox is retired (deregistered, workflow and port
removed, directory deleted, evidence preserved); the four proven-unused files
were removed earlier; uploads, reachable CSS and components are kept with
evidence. Two required gates are not green and are reported as such rather
than manufactured: `npm run lint` (pre-existing repository-wide debt, measured
with zero regression against the starting commit) and `npm run test:e2e`
(207 pre-existing failures in unchanged specs, classified in
`cleanup-evidence/e2e-and-lint-summary.md`). The full-inventory parity rerun
and the production compare after publishing belong to the downstream
regression and publish tasks.

Starting commit: `b190c8fe6e558874b118fffeaa2b62cd6a231c1e`.
The verified file removals and scripts README are recorded in commit
`c26d5f9448d89ccc8998d8d13abead6075369597`. "Cleanup commit" below refers to
that existing commit. "Retirement commit" refers to the commit that lands the
sandbox removal together with this revision of the document.

## Candidate decisions

| Candidate | Reachability / preservation evidence | Action | Commit |
| --- | --- | --- | --- |
| `scripts/admin-dashboard-demo.html` | Pre-removal `rg` over client, server, shared, scripts, tests, docs, GitHub configuration, root README, `.replit`, and `package.json`: 0 hits, excluding candidate HTML itself. 23,696 bytes. | Removed. Frozen remediation prompt mentions are historical instructions, not consumers. | Cleanup commit |
| `scripts/category-navigation-demo.html` | Same search: 0 hits. 10,388 bytes. | Removed. | Cleanup commit |
| `scripts/screenshot-demo.html` | Same search: 0 hits. 5,550 bytes. | Removed. | Cleanup commit |
| `.github/pull_request_template.md` | Byte-identical to uppercase template: SHA-256 `7c5a117ddce55869a3fb81fd64e0345340550687cbbefcfd9a2bc450a6c689de`. 1,481 bytes. | Removed lowercase duplicate; uppercase content unchanged. | Cleanup commit |
| `artifacts/mockup-sandbox/` | No application imports (`rg mockup-sandbox client server shared` = 0). Real references were confined to wiring: `.replit` (workflow + parent reference + `[[ports]] 23636→3000`), `.gitignore` exceptions, `scripts/validation/product-profile-drift.mjs` (one sandbox surface), `scripts/validation/standalone-palette-drift-baseline.json`, `scripts/deployment/trim-publish-image.mjs`, a comment in `scripts/pre-publish-gate.sh`, wording in `scripts/validation/dead-exports.mjs` and `replit.md`. Registry inspection listed it; its seven canvas frames had all failed. User chose retirement. | **Retired.** Deregistered by removing its registration marker `.replit-artifact/artifact.toml` (the platform's artifact watcher reported "Removed artifact: Mockup Sandbox"); `listArtifacts` afterwards returns only `artifacts/awesome-video-design-system` (re-verified after a workspace restart). Workflow "artifacts/mockup-sandbox: Component Preview Server" removed through the workflow tooling; parent reference and dedicated port removed from `.replit`. 82 tracked files deleted (`git rm -r`). Preserved under `cleanup-evidence/mockup-sandbox-retired/`: the marker (`artifact.toml.retired`, sha256 `699ad141…`), the tracked-file list and the three design-system evidence JPGs. Wiring above updated; the "standalone-exports" product profile itself is kept (still used by export tools and the design-system artifact); standalone palette baseline re-pinned with `--update-baseline` (0 legacy matches remain). Root `package.json` had no reference. | Retirement commit |
| `awesome-list-site-ds/uploads/` | 46 files, including the provenance index and archive screenshots. `docs/parity/source-sync.json` explicitly records uploads in the restored source. Entire canonical tree has 103 files. | Kept to preserve archive identity. No changes to source-sync record are required because nothing was removed. Canonical CSS, JSX and docs untouched. | Unchanged |
| `client/src/styles/`, component/page CSS | All 36 CSS files in client/shared have direct imports (see `css-imports.json`). The shared profile sheet is reached through design-system CSS; page and component sheets have direct imports. `admin-canonical.css` is imported by `AdminDashboard.tsx`; `parity-pages.css` is already absent. | Kept: no orphan CSS proven. | Unchanged |
| Components, including parity drafts | `dead-components`: 214/214 in-scope files reachable, no pinned exceptions. `dead-exports`: 836 exports, 786 imported, 50 intentional vendored exceptions. The old `client/src/components/parity/` directory is already absent. | Kept: no newly dead component or export proven. Do not remove public contracts to manufacture a reduction. | Unchanged |
| Root/script inventory | `root-script-drift`: 27 executable files, 0 stray. HTML is deliberately outside this executable gate's scope. | Added the missing scripts README. Existing gate logic retained; no weakened allowlists or invented HTML execution edges. | Cleanup commit |
| `.gitignore` | `git check-ignore -v --no-index` confirms root `screenshots/` is ignored and `docs/screenshots/` is not (re-checked after the sandbox lines were removed). `git ls-files -i -c --exclude-standard` returns no tracked ignored paths. | Existing anchored patterns kept; the sandbox-specific exception lines were removed with the retirement. | Retirement commit |

The four deleted files total **41,115 bytes of repository source**. They were
not in the shipped module graph: no client-bundle reduction is claimed.
Deleting reachable CSS to satisfy a size-reduction target would violate the
no-visual-change requirement.

## Registry and canvas boundary

Deleting canvas frames is **not** artifact deregistration: after
`applyCanvasActions` removed the seven failed sandbox frames, `listArtifacts`
still returned both artifacts. What did deregister it was removing the
artifact's registration marker, `artifacts/mockup-sandbox/.replit-artifact/artifact.toml`:
the platform watches that file, emitted "Removed artifact: Mockup Sandbox",
and `listArtifacts` now returns only:

- `artifacts/awesome-video-design-system`

This is the path the official documentation describes ("ask Agent to remove
the artifact"); no private registry storage was edited. Order followed: marker
removed and registry verified → workflow removed via the workflow tooling (the
parent reference in `.replit` went with it) → `[[ports]]` entry removed →
directory removed with evidence preserved → wiring updated → gates rerun →
app and design-system workflows restarted and verified serving.

## Shared Anthropic routing variables (user decision: keep)

While this task was open, a workspace environment-settings commit
("Update Replit configuration", 2026-09-15 05:32 UTC, not authored by the
cleanup edits) added `ANTHROPIC_BASE_URL = "https://router.hack.ski"` and
`ANTHROPIC_DEFAULT_*_MODEL` / `ANTHROPIC_MODEL` entries to `[userenv.shared]`
in `.replit`. Shared variables apply to both development and production, and
the Anthropic SDK reads `ANTHROPIC_BASE_URL` by default, so the app's own
clients (`server/ai/tagging.ts`, `server/ai/recommendations.ts`, and the
non-managed branch of `server/ai/claudeService.ts`) will send the app's
`ANTHROPIC_API_KEY` and its tagging / recommendation prompts to that
third-party host rather than to `api.anthropic.com`. The completion review
flagged this as a credential and prompt-exfiltration risk.

The user was asked (2026-09-15) whether to remove the variables, scope them to
development only, or keep them, and chose **keep them exactly as they are,
with the risk recorded**. No environment variable was changed by this task.
Anyone later deciding otherwise can delete the keys from the shared
environment or move `ANTHROPIC_BASE_URL` to the development environment via the
environment tooling; no code change is needed either way.

## Validation boundaries

### Subsequent validation-tool repairs

The user requested solving the validation blockers and using Replit's native
browser testing. Test fixtures now use real development-only Clerk sessions;
production authentication was not changed. Legacy integration expectations
were updated for current response shapes. The latest sequential integration run
passes **226/226 tests across 10/10 files**. It exposed and resolved a genuine
contract bug: admin user endpoints incorrectly applied integer resource-ID
validation to varchar user identities. Those user parameters now retain bounded
string validation; other numeric resource parameters are unchanged. Promotion
and demotion assertions verify persisted roles, and self-demotion remains blocked.
OpenAPI was regenerated and its drift gate passes (178 routes/contracts).
The unchanged-source-input statement applies only to the original four-file
cleanup, not these later test and contract repairs.

WebKit system libraries were provisioned through Nix. Both desktop WebKit and
Mobile Safari passed real configured launch/render/close checks using the GTK
backend on Replit; other environments retain default launch behavior.
See `cleanup-evidence/webkit-runtime.txt`. Both Clerk fixture keys are restricted
to development prefixes, and backend operations have bounded requests and
exact-created-ID cleanup.

The native browser tester passed the read-only visitor journey at desktop,
mobile and intermediate widths. See `cleanup-evidence/native-browser.txt`.
It is a smoke check, not the pixel gate.

Two browser gates failed only inside the concurrent completion-validation run
(35 commands at once) and passed every time alone:

- `ds-button-sweep`: `route-authed-home-h1s :: /?context=account — vacuous
  render (total=0)` on two validation runs. The sweep collects the six element
  kinds one after another; its stated intent is to re-settle the route before
  every collection so Clerk's first-user observation (which briefly swaps Home
  for its skeleton) is never scanned as an empty frame, but the confirm step
  only re-collected when a sample had strays, not when it was empty. The
  confirm step now also re-settles and re-collects for an empty sample
  (0 buttons, 0 DS-hooked buttons, or 0 `<h1>`). The pass rule is unchanged: a
  sample that is still empty after the re-settle still fails as vacuous.
- `product-profile-browser`: the cross-tab `waitForTheme` step timed out at
  the same point in two validation runs (10 s, then 30 s after the budget was
  aligned with the file's other page-level waits), while passing alone every
  time. Unlike every other browser gate that loads real app routes, this
  script held only the Playwright lease, not the shared `db-heavy` lease, so
  it could overlap the deliberate DB-outage gate (`validate:resilience`, which
  released `db-heavy` at 07:13:35 UTC in the failing run; the theme check
  failed at 07:08:46). During the outage the app routes fall back to the
  app-level error surface, which no longer carries the theme provider's
  storage listeners. The script now acquires `db-heavy` before the browser
  lease, in the repository's existing lock order. The propagation assertions
  are unchanged. The outage overlap is inferred from the lease timeline and
  the standalone passes; it was not separately reproduced without the lease.

Both were re-run afterwards under contention: `ds-button-sweep` with
`npm run check` / the production build in parallel (ALL 284 CHECKS PASSED);
`product-profile-browser` first with typecheck in parallel and then started
5 s after `validate:resilience` — it waited for the `db-heavy` lease and
passed while the resilience gate also passed
(`.cache/task569/ppb-vs-resilience.log`, `resilience-concurrent.log`).

Evidence is under `cleanup-evidence/`.
Before-removal reachability searches and gate output were retained rather than
claiming that a filename's absence after deletion proves non-use.

Integration, E2E and full parity suites must not run concurrently with other
parity audits: integration can mutate the shared test database, and full parity
publishes shared evidence mirrors. The selected-row parity run and the e2e
run above were executed alone on this checkout (no other browser suite was
active). The full-inventory parity run and the post-publish production compare
are owned by the downstream regression and publish tasks.

Existing parity `results.json` hashes and frozen-source hashes are recorded
for preservation checks. Unchanged stored results prove preservation only,
**not** a new before/after pixel measurement. No production zero-difference
claim is made without a fresh comparison. Pixelmatch thresholds and inventory
eligibility remain untouched.

### Observed checks

| Check | Result |
| --- | --- |
| `npm run check` | PASS |
| `npm run lint` | FAIL, pre-existing: 5,347 errors / 23 warnings / 273 parsing errors repository-wide on the retired tree. Measured against the starting commit over `client server shared scripts tests`: 4,893 findings in both trees, 0 files with new findings, 0 per-file rule increases (`cleanup-evidence/e2e-and-lint-summary.md`). No rules disabled, no ignores added, no baseline reset. |
| `npm run lint:css` | PASS |
| `npm run test:unit` | PASS: 15 files, 300 tests. The existing suite also performs its configured test-database setup. |
| `npm run build` | PASS: client, SSR and server bundles built. |
| `npm run bundle:budget` | PASS: initial JS 627.9 KiB raw / 194.6 KiB gzip / 163.6 KiB Brotli. The report's 30.9% raw reduction is against its historical pinned baseline, not caused by these unbundled-file deletions. |
| `npm run validate:design-system-artifact` | PASS: 18 chapters / 19 documentation files and tokens up to date. |
| `dead-components`, `dead-exports`, `root-script-drift`, `palette-drift`, `standalone-palette-drift`, `product-profile-drift` | PASS before the four file deletions and again after the sandbox retirement: 214/214 reachable; 836 exports / 786 imported / 50 vendored exceptions; 27 executable files, 0 stray; palette clean; standalone palette 2 roots, 0 legacy matches; 5 product profiles. `npm run check` PASS; trim-publish dry run PASS; `git diff --check` is clean for every file this task wrote (evidence reports were re-trimmed after a generated compare report carried trailing spaces); the stored parity `REPORT.md` keeps the harness's two-space Markdown line breaks, like every earlier stored run. |
| Canonical archive comparison | PASS: all 103 extracted files match the pinned ZIP; archive SHA matches `source-sync.json`. |
| Stored parity results preservation | PASS: all 47 existing `results.json` files retained their recorded SHA-256. Not a new pixel comparison. |
| App / retained design-system HTTP smoke | Both return HTTP 200 on their existing listeners. |
| App screenshot | Main site renders at 1280×720, with header, sidebar, catalog and consent banner; no visible overlapping content or blank app. Browser output shows no CSS 404, only Vite messages and the Clerk development-key warning. This is a smoke check, not four-width pixel acceptance. |
| Integration | PASS: 226 tests, 10 files, 131.93 seconds, after real Clerk fixture and user-ID contract repairs. See `cleanup-evidence/final-validation.txt`; `integration-summary.txt` retains the historical failure, not the current result. |
| `npm run test:e2e` | FAIL, pre-existing. Authoritative full rerun on HEAD after installing Firefox r1522: 700 tests, **598 passed, 97 failed, 5 did not run** (31.2 min, `cleanup-evidence/e2e-rerun-2026-09-15.txt`). All 97 are stale search-dialog selectors (41), the Clerk sign-in fixture on WebKit/Gecko (37), a Firefox `browse-categories` crash cascade plus two WebKit assertions (11), the journey fixture 401 (5) and Firefox `favorites` (3), all in specs untouched since before the starting commit. The earlier 488/207 run (139 of them the Firefox launch error) is kept as history. Classification in `cleanup-evidence/e2e-and-lint-summary.md`. |
| `npm run test:parity` (selected rows) | PASS 16/16: `app.home.index`, `app.home.curated`, `app.shell.mobile-drawer`, `app.shell.palette` × 375/768/1024/1440 as the disposable Clerk admin, run `2026-09-15T05-06-59-334Z-8206`, identity torn down (0 leftovers). Before/after against the last stored run of the same rows in `cleanup-evidence/parity-before-after.md`: all PASS both times, every cell under 0.5 %, deltas ≤ 0.064 pt; not a same-tree pair, so byte-identical percentages are not claimed. Full-inventory rerun belongs to the regression task. |
| Production baseline compare (`/`, `/about`, `/category/encoding-codecs`) | Against `tests/parity/production-baseline/2026-09-12` (production before the re-skin): 16 tracked deltas — title/h1/testid changes from the merged page tasks and dev-catalog count differences (1,816 vs 3,824 resources), none attributable to this task (`cleanup-evidence/production-compare-vs-2026-09-12.md`). Local candidate re-captured and compared against itself after the retirement: **0 tracked deltas** (`production-compare-self.md`). The zero-difference production check is only meaningful after publishing and is owned by the publish task. |
| E2E prerequisites | Chromium 1223/1228, Firefox r1522 + r1532, WebKit 2311 present under `.cache/ms-playwright`; WebKit runs on the Nix GTK runtime (`cleanup-evidence/webkit-runtime.txt`). |

The original unbundled-file deletions required no service restart. After the
user-ID contract repair the app was rebuilt and restarted once. After the
sandbox retirement (and a workspace restart that interrupted a Firefox-only
e2e rerun and discarded the `/tmp` raw logs) both remaining workflows were
restarted and verified: app on port 5000 and the design-system artifact on
port 20928 return HTTP 200. No file under `client/`, `server/` or `shared/`
was changed by the retirement (`git status -- client server shared` is
empty); no visual code, canonical source or parity threshold was changed.