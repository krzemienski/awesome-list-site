# C7 AO06 (Users delete/paging/swipe + Link Health)
Worker: sonnet a59577b10f78ef087. Revision 31d0acce. Evidence: e2e-evidence/cycle-07/AO06/.
- C7-AO06-01 = DUPLICATE of C7-AO05-01 (Role-sort paging repeats/skips users, independently reproduced: 129 unique asc). Fix #140 merged at 8fdbe460, ships in deploy 2; re-check on prod after deploy.
- C7-AO06-02 not a defect: the signed-in admin's own row has no Delete (US-20 by design).
PASS: US-20 (1440), US-21/22 (1440, 390), US-25 (820/390; real swipe untested), LH-01, LH-02 (390), LH-04, LH-05, LH-06 at all widths. FAIL: US-24 (C7-AO05-01). BLOCKED-BY-POLICY: US-23. BLOCKED: LH-03 (no pre-first-scan state on prod).
