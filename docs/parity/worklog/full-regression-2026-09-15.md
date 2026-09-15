# Full regression handoff — run-2026-09-15

## Verdict and provenance

**BLOCKED; no completion or publishing claim.** All queued commands terminated.
Runtime checkout: `2b44a2bc08692059cc4ab63c526a5871451fbe1f`. Reused merged
foundations; no runtime fixes or rebuilds were attempted during this capture run.
Evidence was staged outside the repository until the final browser capture ended.

- [Commands, child exit codes, durations](../evidence/full-regression/run-2026-09-15/COMMANDS.md).
- [Raw command ledger](../evidence/full-regression/run-2026-09-15/commands.tsv).
- [Failure log tails](../evidence/full-regression/run-2026-09-15/failure-tails/).
- [First full inventory](../../../tests/parity/baseline/2026-09-15T17-47-51-897Z-9407/REPORT.md).
- [Second pixel pass](../../../tests/parity/baseline/2026-09-15T18-59-43-142Z-21936/REPORT.md).
- Each parity run retains its OUTPUT-MANIFEST.json, live inputs, diagnostics and
  actual/expected/diff images. Images were not duplicated into this run folder.

## Execution qualifications

DB-heavy commands were serialized with the shared gate lease. An initial print
wrapper mistakenly nested an internally held lease; it was stopped before browser
work and rerun with one owner. Its ledger's 20-second duration was an estimate,
not measured evidence. Auth-return failed with a socket hangup; one serial retry
passed 30/30. The two sidebar invocations both failed; the retained named log is
the final invocation, not a separate first-run log.

The theme/axe command has fixed peer-publication paths. It ran unchanged from an
isolated current-revision source snapshot using existing installed dependencies,
browser cache, and the same app on port 5000. This avoids replacing peer evidence;
it does not install or introduce a browser stack. Source provenance is retained.
Only theme and axe phases were selected: its generated worklog's unselected
smoke/runtime phases are not claims that those phases ran here.

`task302-typecheck` aliases `npm run check`; the successful check is reused.
Mobile performance is three development measurements, not a production budget
pass. The stale pre-build bundle reading is superseded by
`bundle-budget-current.log`. This task changed no caps or pixel thresholds.

Provenance qualification added after the run: the task branch was rebased onto
upstream main commit `677f2ea9` ("Unblock publish: re-baseline the journeys
route bundle budget"), which raised the Journeys route caps from
37000/14000/12500 to 40000/15500/13800 in `scripts/validation/bundle-budgets.json`.
That commit is not this task's edit and was not reverted here (it is another
owner's publish unblock on main); `npm run bundle:budget` rerun on HEAD
`9878061a` with the same build passes (`bundle-budget-head-9878061a.log`). The
route-cap raise is escalated in the handoff table for an explicit decision.

Platform completion validation (`kxj8bfXSZKpXrDY1xSqHb`) ran every workflow
concurrently and failed nine gates with `pthread_create: Resource temporarily
unavailable`, `Cannot fork`, `uv_thread_create` aborts and esbuild "service was
stopped". Those are thread-exhaustion symptoms of the concurrent runner, not
source defects; the same gates passed serially under the lease on identical
source (see COMMANDS.md).

## Owner handoffs and exact repro

| Owner boundary | Finding | Repro / retained proof | Disposition |
|---|---|---|---|
| Public/admin visual owners and parity integrator | 172/188 pixel cells fail | `npm run test:parity`; both linked run reports enumerate widths, percentages and images | Requires owned visual reconciliation. Two captures are not two rebuild attempts; no rebuild exhaustion claimed |
| Parity capture owner | 17 cells exceed 0.01-point repeat tolerance | `determinism.json` lists both values; maximum admin categories@1024 = 0.0528262467 | UNVERIFIED determinism; do not rerun unchanged captures to hide variance |
| Artifact heading-font owner (existing proposed font-preview work) | 57 first-pass failures are font-gap-only | Full-run font-gaps.md / diagnostics | Remains separate scope; no silent font-preview implementation |
| Journeys component owner + publish/bundle-budget owner | Route bundle exceeded the 37000/14000/12500 caps at `2b44a2bc`; upstream `677f2ea9` raised the caps instead of reducing the route | `npm run bundle:budget`, `bundle-budget-current.log` (old caps, FAIL: 38.7/14.8/13.1 KiB, excess 2.6/1.1/0.9 KiB); `bundle-budget-head-9878061a.log` (HEAD caps, PASS) | DECISION NEEDED: either ratify the upstream re-baseline (Radix Select chunk moved out of the lazy-Home initial bundle; initial caps unchanged) or revert it and shrink the route. Not changed by this task |
| Lint debt owners | 5,218 errors / 23 warnings | `npm run lint`; `lint-baseline/` per-file/rule deltas against measured baseline 5,303/23 | Pre-existing debt; net reduction is not a green gate |
| Browser infrastructure owner | 390 Firefox/WebKit launch failures | `npm run test:e2e -- --workers=3 --reporter=list,json`; missing firefox-1522 and webkit-2287 executables, `e2e-summary.json` | UNVERIFIED across those engines; no prohibited installs or unchanged reruns |
| Admin interaction owners | Three retry-passing E2E cases | `e2e-summary.json`: LinkHealth filter, Users role selector, Audit detail | Flaky, not permanent assertion failures; original failures retained |
| Built-in testing / target-host owner | Supported Clerk handshake reaches artifact; rewritten handshake 404s | `native-testing/result.json`, screenshots dfnkw6 / tt0lip / 6wpjrr | UNABLE. New Collection, notes dialog, profile NOT RUN |
| DS button sweep identity owner | Bookmark seed 401 before required overlays | `node scripts/validation/ds-button-sweep.mjs`, log tail | UNVERIFIED dialogs; do not change dialog code based on setup failure |
| Sidebar/census owner | Four H1 expectations plus account-dashboard distinct-body assertion fail | `npm run audit:sidebar`, `sidebar-results.json` | URLs and content pass for these five; adjudicate expected copy/alias before calling defects |
| Taxonomy route owner | RIST, MPEG & Forums, Official Specs show “Something went wrong” in sidebar traversal | Same JSON; routes `/sub-subcategory/rist`, `/sub-subcategory/mpeg-forums`, `/sub-subcategory/official-specs` | UNVERIFIED root cause; gate captured no browser errors; distinguish burst/API failure from rendering bug |
| Axe/admin route owner | Research@1440 missing `[data-testid="tab-research"]` | `npm run audit:parity-systems -- --phase axe --resume`, `theme-axe/axe/audit-567-app-admin-research.json` | One incomplete row, not a contrast defect; 107 completed rows have no serious/critical violations |
| Inventory/state owners | 40 blocked and 96 token-only unverified parity cells; 12 state-only axe cells skipped | Full inventory report and theme-axe summary | Global token success cannot replace per-state proof |
| Baseline/inventory integrator | Production comparison has missing routes and unresolved differences | `npm run baseline:compare` exact arguments in ledger; `BASELINE-DELTAS.md`, `baseline-summary.json` | 26 routes / 1 unchanged / 0 approved intentional / 25 unresolved; not full inventory acceptance |

## Production differences

43 tracked deltas affect 25 of 26 routes and 8 of 12 endpoints. Headings and
selector inventories changed; sitemap content/counts and development API data
also differ. No canonical, robots or JSON-LD change notes were reported.
None of these entire route differences is newly approved as intentional.
See DESIGN-SYNC.md; development data must not be “fixed” to copy production.

## Identity and evidence safety

Parity and theme/axe report teardown completed with zero local QA users remaining.
Native tester cleanup happened afterward using only its exact disposable identity:
`native-testing/cleanup.json` records one Clerk deletion and zero local deletions.
Do not interpret the tester's earlier “cleanup incomplete” text as the final state.
No destructive sweep against peer identities or paid AI job was run.

The native tester returned screenshot IDs, not downloadable filesystem paths;
those IDs/descriptions and its UNABLE verdict are preserved verbatim. Local
`native-testing/platform-home.jpg` is the platform static capture, not a
replacement for either missing authenticated dialog screenshot. Native screenshot
file export remains unavailable and is not claimed complete.

E2E JSON and its attachment manifest preserve original evidence paths. Browser
trace archives can contain session material and were not copied into this report
folder. The successful checks remain valid on the recorded source revision;
rerun only affected gates after an owner changes an input.