# C7 AC01 (ux-admin-content, Overview) findings

Worker: sonnet ab27d5a87cf083f03. Revision 130e5829 at start (15:31Z) and end (15:40Z). Evidence: e2e-evidence/cycle-07/AC01/.

Verdict: ISSUES. 1 confirmed defect, 1 dismissed, 1 row BLOCKED (tool).

## Findings (lead triage)
- C7-AC01-02 CONFIRMED, LOW: Recent activity rows are unreadable at 1440. The target column ellipsizes to about 60px ("Remove…", "Edited st…", "Admin e…") and the actor collapses to "a•…". At 390 the target still clips ("Admin exported 401…"). The full value is only in a hover `title`, which touch users cannot reach. Lead viewed ov-1440.png and ov-feed-390.png. Source: origin/main client/src/styles/pages/admin-overview.css (.admin-canonical-activity-target nowrap/ellipsis; @container split only below 340px), client/src/components/admin/AdminOverview.tsx:428. Routed to FIX-C7-01.
- C7-AC01-01 DISMISSED: the 20px start / 60px end gutter at 390 is deliberate. layout.css:50 reserves the back-to-top lane so the fixed button never covers content (PR #73, #82; comment at layout.css:52-53). Not a defect.

## Rows
| Row | Verdict | Widths |
|---|---|---|
| OV-01..04 | PASS | 1440/820/390 (keyboard at 1440) |
| OV-05 | PASS | 1440 |
| OV-06 | PASS | 1440/820/390 |
| OV-07 | PASS | 1440/820/390 |
| OV-08 | BLOCKED (tool: route --body ignored; prod has audit rows) | none |
| OV-09 | FAIL (C7-AC01-02) | 1440/820/390 |
| OV-10 | PASS | 1440/820/390 |
| OV-11 | PASS | 1440 (Retry size at all widths) |
| OV-12 | PASS | 1440/820/390 |

Touch was not truly emulated (maxTouchPoints 0). QA rows: none. Settings: none. Session closed.
NOTE: the local checkout is stale (e12a4e67). Read source with `git show origin/main:<path>`.
