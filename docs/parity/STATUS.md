# Parity status

Regression execution finished: `run-2026-09-15` — acceptance **BLOCKED**, not regression complete.

Latest full inventory run: `2026-09-15T17-47-51-897Z-9407`; second pixel pass:
`2026-09-15T18-59-43-142Z-21936`. Both gates **NOT PASSED**.

Pixel cells: **16 pass, 172 fail, 188 measured**. Four alias cells are excluded,
not counted as measured pixels. Outside that denominator: **40 blocked,
96 unverified token-only, 4 evidence-only, 4 aliases**; zero incomplete captures.
Eligibility: {"pixel":48,"token-only":24,"artifact-docs":1,"blocked":10}.
Determinism fails: 17/188 measured cells differ by more than 0.01 percentage points.

Other blockers: Journeys bundle budget (failed the caps in force at `2b44a2bc`;
passes only under the upstream `677f2ea9` cap re-baseline, which needs an owner
decision), legacy lint, sidebar audit, DS button
authentication setup, incomplete axe research@1440, missing Firefox/WebKit
executables, built-in Clerk target-host mismatch, and production baseline coverage
and adjudication. Theme combinations passed 50/50. See the consolidated
[report](REPORT.md) and [handoffs](worklog/full-regression-2026-09-15.md).

## Largest measured gaps

| Screen | Width | Diff % | Reason |
|---|---:|---:|---|
| app.admin.resources | 1024 | 98.9401% | 98.940% differing pixels exceeds the 0.5% ceiling |
| app.admin.resources | 768 | 98.9128% | 98.913% differing pixels exceeds the 0.5% ceiling |
| app.admin.resources | 1440 | 98.8651% | 98.865% differing pixels exceeds the 0.5% ceiling |
| app.admin.resources | 375 | 98.6448% | 98.645% differing pixels exceeds the 0.5% ceiling |
| app.subsubcategory | 375 | 83.4344% | 83.434% differing pixels exceeds the 0.5% ceiling |
| app.subsubcategory | 1024 | 80.7927% | 80.793% differing pixels exceeds the 0.5% ceiling |
| app.subsubcategory | 768 | 75.2795% | 75.279% differing pixels exceeds the 0.5% ceiling |
| app.subsubcategory | 1440 | 73.8924% | 73.892% differing pixels exceeds the 0.5% ceiling |
| app.resource.detail | 1024 | 67.6337% | 67.634% differing pixels exceeds the 0.5% ceiling |
| app.resource.detail | 1440 | 65.6150% | 65.615% differing pixels exceeds the 0.5% ceiling |

## Blocked rows

- 40 cells across the ten blocked inventory screens. Exact reasons remain in
  the runner-generated row table in REPORT.md. Token-only cells remain unverified;
  successful global token gates do not prove every state.

## Incomplete rows

- none

See [REPORT.md](REPORT.md) for every row and the evidence links.
