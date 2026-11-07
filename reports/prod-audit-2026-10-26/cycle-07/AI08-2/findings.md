# AI08-2 — cycle 7 (live 762a6c0d)

Verdict: PASS for GH-05, GH-07 (open half) and GH-08. GH-06 and the GH-07 confirm half are BLOCKED-BY-POLICY: they would start a GitHub import or export to the real repo. 0 findings.

| Row | Verdict | Widths | Evidence |
|---|---|---|---|
| GH-05 Pull confirmation Cancel | PASS | 1440/820/390 | gh05-1440.png, m390-Pull.png |
| GH-06 Confirm Start Import | BLOCKED-BY-POLICY | none | driven up to the final button only |
| GH-07 Sync now (valid target) | PASS for the open half; confirm half BLOCKED-BY-POLICY | 1440/820/390 | gh07-1440.png, m390-Sync now.png |
| GH-08 Sync confirmation Cancel | PASS | 1440/820/390 | t820-Sync now.png |

- Initial focus is on Cancel. Tab stays inside the dialog. Esc and Cancel both return focus to the trigger.
- Buttons are 44px tall at every width. At 390 the dialog is 358px wide and the buttons stack at 308x44.
- No /api/github/import or /api/github/export requests were sent. The console showed 0 errors.
- Touch: agent-browser emulates the viewport only (maxTouchPoints=0). Sizes were measured at 820 and 390, but no touch events were sent. Signed-in rows cannot use chrome-devtools touch emulation, because the owner cookie must not enter MCP arguments.
- QA rows: none created. Settings: none changed. Revision: 762a6c0d at start and at end.
- Lead spot-check: m390-Pull.png and gh07-1440.png both match the report.
