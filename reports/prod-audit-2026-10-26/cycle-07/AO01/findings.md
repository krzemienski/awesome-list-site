# C7 AO01 (ux-admin-ops) findings

Worker: sonnet a1ebaf9b1eeca93ba. Revision 130e5829 at start and end. Evidence: e2e-evidence/cycle-07/AO01/ (git-ignored).

Verdict: 0 findings. 8 rows PASS. 4 rows BLOCKED-BY-LEAD because they need a real job: EX-04 (validation run), EX-07 (link-check job), EX-08 (pending, processing, failed and cancelled states), EX-11 (cancel a live job).

| Row | Verdict | Widths | Evidence |
|---|---|---|---|
| EX-01 | PASS | 1440/820/390 | s1.txt, s3-1440-open.png |
| EX-02 | PASS | 1440/820/390 | s4-dialog.png, dlg-820.png, dlg-390.png |
| EX-03 | PASS | 1440/820/390 | s4.txt |
| EX-04 | BLOCKED-BY-LEAD | none | needs a validation run |
| EX-05 | PASS | 1440/820/390 | s4.txt |
| EX-06 | PASS | 1440/820/390 | s4.txt |
| EX-07 | BLOCKED-BY-LEAD | none | needs a link-check job |
| EX-08 | BLOCKED-BY-LEAD (only COMPLETED seen) | 1440 | s1-1440.png, s3-1440-open.png |
| EX-09 | PASS | 1440/820/390 | s5-fail.png, fail-820.png, fail-390.png |
| EX-10 | PASS | 1440/820/390 | ex10.png |
| EX-11 | BLOCKED-BY-LEAD | none | no live job to cancel |
| EX-12 | PASS (no browser-saved file inspected, no toast captured) | 1440/820/390 | ex12.png, export.json, hdr.txt |

The worker reported one tool artifact, not a product defect: `agent-browser open` on a URL that changes only the hash does not reload the page, so `<details>` kept its earlier state.

Lead spot-check (15:4xZ): I viewed fail-390.png and dlg-390.png. Both match the claims: failure copy plus a 44px Retry, and a dialog with 44px buttons. Caveats: s1-1440.png is 1280x577, not 1440 wide. For EX-03 and EX-06, "focus returns to trigger, no POST" is the worker's claim; s4.txt holds only the dialog snapshot. No cookie strings appear in any text evidence (grep count 0).
QA rows: none. Settings changed: none. Session c7-AO01 closed.
