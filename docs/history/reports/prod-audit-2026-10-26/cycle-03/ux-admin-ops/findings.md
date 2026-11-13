# ux-admin-ops, cycle 03 (rev b89d3e4b): ISSUES, 3 LOW

Owner session (only the `av_admin_session` cookie was loaded). No sign-out and no login. Evidence is in this directory.

| id | sev | where | saw vs expected | source |
|---|---|---|---|---|
| AO-13 | LOW | /admin/link-health, trend chart tooltip | The tooltip shows raw floats, "Healthy : 99.63379544860057 \| Broken : 0.31388961548522104". Expected rounded percentages that match the 99.6% tile. | LinkHealthTrendChart.tsx `<Tooltip>` (~line 55, no formatter) |
| AO-14 | LOW | /admin/link-health, trend chart x-axis, 1440 | The chart has 6 points but only 5 x-axis labels. The Jul 21 03:47 AM point has no label, and the first label sits under the second point. Expected one label per point, or copy that says labels are thinned. | LinkHealthTrendChart.tsx XAxis (default tick interval) |
| AO-15 | LOW | all /admin/* tabs at 1440, 820 and 390 | The tab strip `div.tabs.admin-dashboard__tabs` (role=tablist, tabindex=0) scrolls horizontally (scrollWidth 1607 vs clientWidth 1280) and has no accessible name. | admin dashboard tablist wrapper |

## Re-checks

- **AO-09, AO-10 and AO-12:** fixed.
- **AO-11:** fixed for the audit dialog, which was seen live. The export validation lists were checked in code only.
- **AO-01 to AO-08:** the earlier results still hold. The AO-01 toast wording is UNVERIFIED.

## Side effects

The export downloads created audit-log entries, around ids 27436 to 27440. These cannot be deleted. The run created no other rows.

## UNVERIFIED

- **Live wording not seen:** the export 5xx toast, and the validation lists (no stored result on production).
- **Not tested:** backup tables (none exist), real touch input, and the fade at 390 (checked by eye only).
