# ux-admin-ops — cycle 02 (rev c25cd76f, 16:56:49Z–17:16:31Z) — ISSUES 4 Low
(saved by lead from the auditor's final message; the auditor's Write was refused by the harness)

| id | sev | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| AO-09 | Low | /admin/link-health (More) | all | Trend chart labels each check by start time ("Aug 4, 2026, 07:01 PM") while summary says "Last check: Aug 4, 2026, 08:18 PM". Expected finish time in chart too. | linkhealth-1440-more-open.png, linkhealth-summary-text.txt | LinkHealthDashboard.tsx:321-323 |
| AO-10 | Low | /admin/link-health (More) | all | Summary "covered 3,822 approved resource URLs"/"Total 3822" but scan #8 checked 3,823 (status API; Export card "of 3,823"); 3,822 = healthy + listed problems. Same line lacks thousands separators ("Healthy 3809") vs tiles "3,809". | linkhealth-summary-text.txt | LinkHealthDashboard.tsx:250, :494, :501-519 |
| AO-11 | Low | /admin/audit row detail dialog | all | Focus lands on the "Changes" JSON scroller (tabindex=0, no role/aria-label) — only unnamed focus stop on ops tabs. Same gap in Export validation lists (code only). | a11y-audit-detail-dialog.txt, audit-detail-dialog-1440.png | AuditTab.tsx:522; ExportTab.tsx:770,806 |
| AO-12 | Low | /admin/users, /admin/audit (+Contact), /admin/link-health | 820 | Swipe hint + right fade hidden ≥640px, but tables still overflow at 820 with no cue (Users Edit cut, Audit Status/When off-screen, Link Health "Last checked" cut); only a 6px scrollbar. Expected cue whenever the table overflows. | users-820.png, audit-820.png, linkhealth-820.png | UsersTab.tsx:278-284, AuditTab.tsx:352-354, LinkHealthDashboard.tsx:650 |

## Cycle-1 re-checks
AO-01 not reproduced (failure toast wording UNVERIFIED: no live 5xx); AO-02 FIXED; AO-03 FIXED (44×44 at 820/390); AO-04 FIXED in summary (chart → AO-09); AO-05 FIXED; AO-06 FIXED; AO-07 FIXED; AO-08 FIXED at 390 (820 → AO-12).

## Passed
Users (count 133, sort, search 37 "gmail", paging 7 pages, row actions, reveal/mask, role dialog no write); Audit (filters, invalid id error, 15 rows for real id, paging, dialog); Contact (1 row, dialog); Export (4 downloads 200, CSV 4018 rows clean, OPML parses, history 137, confirms cancelled); Database (tiles match API, seed confirms cancelled); Link Health (counters match API, filters, More/Less, confirms cancelled); all rendered ops tables named scroll regions; no console errors, no overflow, no undersized targets at 820/390.

## UNVERIFIED
AO-01 toast wording; backup tables (no backups on prod); Export validation lists (running validation writes); real touch input (agent-browser no touch emulation; layout/target-size only).

## Side effects
8 export audit-log entries (ids 27413–27420), not deletable. Downloads removed from /tmp.
