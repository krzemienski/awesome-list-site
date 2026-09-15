# Parity before/after (selected rows)

Before: `tests/parity/baseline/2026-09-14T16-23-53-893Z-1807` (last stored run of these rows, captured on the pre-cleanup tree).
After: `tests/parity/baseline/2026-09-15T05-06-59-334Z-8206` (same selection, captured after the sandbox retirement).
Command: `npm run test:parity -- --only app.home.index,app.home.curated,app.shell.mobile-drawer,app.shell.palette --width 375,768,1024,1440` with the disposable Clerk admin identity (teardown: local + Clerk deleted, 0 `__qa_test_parity_` rows remaining).

| Cell | Before status | After status | Before diff % | After diff % | Delta (pt) |
|---|---|---|---:|---:|---:|
| app.home.curated@375 | PASS | PASS | 0.1846 | 0.1664 | -0.0182 |
| app.home.curated@768 | PASS | PASS | 0.1977 | 0.1339 | -0.0638 |
| app.home.curated@1024 | PASS | PASS | 0.2197 | 0.2147 | -0.0050 |
| app.home.curated@1440 | PASS | PASS | 0.2037 | 0.2146 | +0.0109 |
| app.home.index@375 | PASS | PASS | 0.1606 | 0.1520 | -0.0086 |
| app.home.index@768 | PASS | PASS | 0.1053 | 0.1053 | +0.0000 |
| app.home.index@1024 | PASS | PASS | 0.1738 | 0.1743 | +0.0004 |
| app.home.index@1440 | PASS | PASS | 0.1603 | 0.1607 | +0.0004 |
| app.shell.mobile-drawer@375 | PASS | PASS | 0.4176 | 0.4093 | -0.0083 |
| app.shell.mobile-drawer@768 | PASS | PASS | 0.3091 | 0.3094 | +0.0003 |
| app.shell.mobile-drawer@1024 | PASS | PASS | 0.2364 | 0.2363 | -0.0001 |
| app.shell.mobile-drawer@1440 | PASS | PASS | 0.1603 | 0.2193 | +0.0590 |
| app.shell.palette@375 | PASS | PASS | 0.4140 | 0.4194 | +0.0054 |
| app.shell.palette@768 | PASS | PASS | 0.3748 | 0.3330 | -0.0419 |
| app.shell.palette@1024 | PASS | PASS | 0.3185 | 0.3326 | +0.0141 |
| app.shell.palette@1440 | PASS | PASS | 0.3755 | 0.3865 | +0.0110 |

Summary: 16/16 PASS before and after; every cell stays under the 0.5 % ceiling; 1 cell byte-identical, largest absolute delta 0.0638 percentage points.

Reading: the two runs are NOT a same-tree pair. Between them other page tasks merged and the dev catalog changed, and no pre-cleanup run exists on this exact checkout. The cleanup itself changed no served file (`git status -- client server shared` is empty; the dev server process was not restarted between the sandbox removal and this run), so any percentage movement is capture variance plus intervening merges, never the cleanup. A byte-identical `results.json` percentage comparison is therefore not obtainable here and is not claimed; the full-inventory before/after belongs to the coordinated regression task.
