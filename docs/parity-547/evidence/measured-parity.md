# Scoped admin queue comparison

Run: `tests/parity/baseline/2026-09-13T07-52-43-489Z-7695`.
Command: `BASE_URL=http://127.0.0.1:5000 npm run test:parity -- --only app.admin.approvals,app.admin.edits,app.admin.enrichment,app.admin.researcher,app.admin.research --width 375,768,1024,1440`.

The real disposable Clerk admin authenticated successfully. Teardown deleted
both local and Clerk identities, reported no errors, and verified no remaining
local parity users. All 16 measurable cells completed; none were infrastructure
failures. Four Research cells remain blocked by the aggregate inventory.

Differing pixels as percent of full union canvas (target at most 0.5%):

| Row | 375 | 768 | 1024 | 1440 |
| --- | ---: | ---: | ---: | ---: |
| Approvals | 20.9855 | 5.0411 | 20.8609 | 4.0116 |
| Edits | 19.7497 | 3.1961 | 16.8571 | 2.9084 |
| Enrichment | 22.6294 | 40.9282 | 44.1557 | 38.9262 |
| Researcher | 43.4256 | 40.9472 | 44.3671 | 30.9426 |
| Research | BLOCKED | BLOCKED | BLOCKED | BLOCKED |

**Result: FAIL, 0/16 passing; no thresholds were relaxed.**

## Capture inspection and attribution

The 1440 actual/expected Approvals and Enrichment images were inspected directly.
Actual Approvals correctly shows an empty live queue; expected Approvals contains
five hard-coded demo submissions. These are different data states, not evidence
that live resources disappeared.

The expected Enrichment view contains canonical summary cards and a six-row demo
table. Actual Enrichment retains real job controls and a larger real job history.
The controls, coverage information and processed/success columns are functional
app-only content. Their placement and residual treatment still require the
planned two-pass integration comparison; they are not hidden or masked here.

The whole canvas also differs in shared navigation: actual has the application
sidebar and breadcrumb/search header; reference has a horizontal website header.
These shared-shell differences are outside this worker's ownership.

## Integration requirements

- Adapt reference queue/job rows from the same live API snapshots; preserve frozen
  reference files and transform only the in-memory expected capture.
- Reconcile canonical core table geometry with required secondary controls in the
  residual pass. Do not remove working controls or claim their area is excluded.
- Wire the Research shell instance with `initialTab="review"` and update the
  aggregate inventory only after the real-data adapter supports its discoveries.
- Rerun unchanged full-union comparisons after shared-shell integration. These
  numbers are diagnostic failures, not final acceptance.