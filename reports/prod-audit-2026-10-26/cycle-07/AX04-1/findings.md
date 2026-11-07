# AX04-1 — cycle 7 (live 762a6c0d)

Verdict: PASS, 0 findings.

| Row | Verdict | Widths | Evidence |
|---|---|---|---|
| SH-18 Scroll tabs left | PASS | 1440/820/390 | s1440-after-right.png, s820-after-right.png, s390-scrolled-end.png |
| SH-19 Scroll tabs right | PASS | 1440/820/390 | same files |
| SH-20 arrows/Home/End/Enter/Space | PASS | 1440/820/390 | kb-*-keys.txt |
| SH-21 Overview | PASS | 1440/820/390 | s*-overview.png |

- The scroll buttons are 48x44. Arrow keys move focus and selection together and wrap. Home and End work. Enter and Space are no-ops.
- Observation, in triage: at 390 the 48px "Scroll tabs right" overlay covers the Edits tab (x 242-322 vs 276-324), so a tap at the tab's centre hits the scroll button. The worker did not log it as a finding.
- Touch: agent-browser emulated the viewport only (maxTouchPoints=0). QA rows: none. Settings: none changed. Revision: 762a6c0d.
- Lead spot-check: s390-overview.png shows the Overview tab selected, with the Edits label cut off under the scroll chevron.
