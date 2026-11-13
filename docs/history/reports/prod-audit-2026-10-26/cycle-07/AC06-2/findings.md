# AC06-2 — cycle 7 (live 762a6c0d)

Verdict: ISSUES (1 candidate, in triage). RM-04 is BLOCKED.

| Row | Verdict | Widths | Evidence |
|---|---|---|---|
| RM-03 offline paging (Stay / Retry) | PASS | 1440/820/390 | rm03-*-pending.png, s3*.txt |
| RM-04 empty catalog | BLOCKED | none | The zero-total branch (ResourceManager.tsx `!hasActiveFilters`) needs an empty catalog or a faked response. Neither is allowed on prod. |
| RM-05 filtered-empty, Clear filters | PASS | 1440/820/390 | rm05-*.png |
| RM-06 populated table | PASS (plus the candidate below) | 1440/820/390 | rm06-*.png, m820.txt, m390.txt |

Candidate C7-AC06-2-01 (LOW, IN TRIAGE): the admin Resources "Select all" and per-row Select checkboxes measure 32x32 by getBoundingClientRect at 820 and 390, with no real touch emulation. The known-non-defect list says the checkbox primitive has a 44px hit area below lg, so a sonnet investigator is checking whether this table's checkbox gets that hit area.

- Touch: agent-browser sets the viewport only (maxTouchPoints=0, pointer fine).
- QA rows: none. Settings: none changed. Revision: 762a6c0d at start and at end.
- Lead spot-check: rm06-390.png and rm03-390-pending.png both match the report.
