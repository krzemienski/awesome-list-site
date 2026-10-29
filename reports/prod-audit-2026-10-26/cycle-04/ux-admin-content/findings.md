# ux-admin-content, cycle 04 (rev 582bdf67): ISSUES, 4 LOW to fix (AC-14, AC-16, AC-17, AC-18); AC-15 judged not a defect; coverage partial

| id | sev | URL | width | saw vs expected | source |
|---|---|---|---|---|---|
| AC-14 | LOW | /admin#approvals | 390, 820 touch | The select-all checkbox hit area is 44×42. The admin-panel heading above the th clips the top of its 44px ::after. Row checkboxes are 44×44. | queues-review.css (select cell / heading spacing) |
| AC-16 | LOW | /admin#edits "Recently resolved" | 820 touch | The 10 resource-title links are 172×41.6, with display:block, 13px text and no min-height. | RecentResourceEdits.tsx |
| AC-17 | LOW | /admin#journeys, Steps dialog | 820 touch | The "Open <resource>" links in the step pills are 32px tall. | JourneyStepsManager.tsx |
| AC-18 | LOW | /admin#resources edit dialog | 1440 | After the server rejects a duplicate URL, a role=alert banner appears. Focus goes to the dialog container, not the URL field, and the URL input has no aria-invalid or aria-describedby. | ResourceManager.tsx edit dialog |

**AC-15 judged not a defect (lead).** The Resources header checkbox hit area is 44×44, sits 1px off centre, and steals no taps from neighbours. That meets the target-size rule, and the offset is within measurement noise.

**Re-checks:**
- Fixed: AC-13 (194px at 320), AC-08, AC-09, AC-12 and AC-06 (search persists across reload).
- AC-11: the original long-scroll case was not reproduced, so this is a gap.
- Not re-driven: AC-07, AC-10, AC-01 to AC-05 and HDR-01. They go to the cycle-5 brief.

**Passed:**
- #80 hit areas: Resources and Approvals rows are 44×44 and centred.
- Overview counts match /api/admin/stats and /api/categories. Active users were recomputed and match.
- Create/edit field errors, the Featured toggle and bulk approve/delete all work. Both bulk actions use an alertdialog with Cancel focused.
- Taxonomy create/delete works, and the delete button is locked while rows are assigned.

**Rows:** 190355, category 1197, subcategory 2336 and sub-subcategory 3775 were created and deleted. Lead re-read at 02:2xZ: 190355 returns 404 to anonymous requests, no QA names remain in the categories or sub-subcategories APIs, and stats are back to 4017 / 3825 public / 16 pending. Side effect: 190355 was briefly approved, so the public count read 3,826 for a while.

**INCIDENT:** third cookie exposure. Before the rule arrived, the auditor ran cat on the header file and pasted it into extraHttpHeaders and evaluate_script.
