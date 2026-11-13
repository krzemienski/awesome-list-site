# MB04-2 — cycle 7 (live 762a6c0d)

Verdict: 0 product defects, but partial. 820 and 390 coverage is incomplete. The undriven parts are re-queued as MB04-2b.

| Row | Verdict | Widths | Evidence |
|---|---|---|---|
| C6-MB-041 search/filter/sort | PASS at 1440. Search also at 390. | 1440, 390 | api1.json, s-390-nomatch.png |
| C6-MB-042 cards | PASS at 1440. The superseded state is UNVERIFIED (no such row). | 1440 | cards.txt |
| C6-MB-043 withdraw (cancel / confirm / 409) | PASS at 1440 | 1440 | s-1440-withdraw-dialog.png, s-1440-409.png |
| C6-MB-044 pagination/states | Partial. Error state PASS (820). No-match PASS (1440/390). Offline and the loading skeleton are UNVERIFIED. Empty account is not drivable. | 1440, 820, 390 | s-820-error3.png |

QA rows: 190381 and 190382, "[QA-audit-c7] MB04-2 withdraw probe" and "… probe 409". Both are withdrawn, and /api/resources/<id> returns 404 for each. They still exist as withdrawn rows, so the lead purges them at cycle-end QA cleanup.
- Lead spot-check: s-1440-409.png shows the "already changed" toast and both QA rows withdrawn. s-820-error3.png shows the error state with Retry. Both match the report.
- Revision: 762a6c0d. Settings: none changed.
