# ux-admin-ops, cycle 04 (rev 582bdf67): ISSUES, 2 LOW

| id | sev | URL | width | saw vs expected | evidence | source |
|---|---|---|---|---|---|---|
| AO-16 | LOW | /admin/link-health trend chart | 1440, 820, 390 | The rotated x-axis labels (from the AO-14 fix) overprint the legend ("Redirects", "Timeouts"). At 390 they overlap each other and "Healthy"/"Broken". The first label is clipped on the left ("…J26, 03:47 AM"; its box starts at x=-7 at 390). Expected: rotated labels have enough bottom and left margin and clear the legend. | linkhealth-{1440,820,390}-chart.png | LinkHealthTrendChart.tsx: XAxis height/angle, chart margin, Legend |
| AO-17 | LOW | /admin/audit | 1440 | Completed export downloads log different statuses: CSV (27454, 27436) and OPML (27438) say RECORDED, JSON (27439, 27440) and Markdown (27437) say COMPLETED. Expected one status for equivalent events. | snap-audit-820.txt | server export audit-log writers |

## Re-checks

- AO-01: success toast seen live. The 5xx toast is UNVERIFIED.
- AO-02 to AO-15: fixed, including the AO-13 tooltip, checked by real hover ("Healthy : 98.0%"), and the AO-15 "Admin sections" label.
- #81: "Checked" plus the reconcile note are live. No static role=alert was seen.

## Side effect

Audit-log row 27454, from the CSV download. It cannot be deleted.

## UNVERIFIED (sent to a gap auditor)

- Contact submissions.
- Users search, paging and sort.
- Markdown, OPML and JSON downloads (this cycle).
- Audit filters, paging and invalid ids.
- Contrast.
- An assertive alert after a failed action.
