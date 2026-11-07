# C7 AC02 (admin Overview tail + Approvals) findings
Worker: sonnet ae349c0579f1e85eb, resumed after the 15:48Z owner-session re-mint (earlier 401 evidence superseded). Revision 130e5829. Evidence: e2e-evidence/cycle-07/AC02/.
- C7-AC02-01 CONFIRMED, LOW: bulk-reject Cancel keeps the typed reason; Escape and X clear it. Reproduced at 1440 (twice) and 390. Source: PendingResources.tsx reset only in onOpenChange (~:1057-1062); Cancel calls setBulkRejectDialogOpen(false) (~:1095). FIX-C7-03 in progress.
PASS: OV-13, OV-15, AP-08 at all widths; AP-01, AP-06, AP-07 at 1440+390; AP-02, AP-03 at 1440. FAIL: AP-09 (C7-AC02-01).
BLOCKED (tool): OV-14, AP-04 (forced empty; prod has 16 real pending).
Gaps for the width follow-up: AP-02/AP-03 at 820 and 390; AP-01/AP-05 at 820; the AP-05 row-checkbox hit area (16px box, cycle-4 44px ::after) still unmeasured.
