# AI08-3 — cycle 7 (live 762a6c0d)

Verdict: PASS, 0 findings. The GH-09 confirm step is BLOCKED-BY-POLICY.

| Row | Verdict | Widths | Evidence |
|---|---|---|---|
| GH-09 Start Export dialog | PASS for opening and cancelling. Confirm BLOCKED-BY-POLICY. | 1440/820/390 | gh-*-dialog.png |
| GH-10 More/Less | PASS | 1440/820/390 | gh-*-more.png |
| GH-11 valid owner/repo + URL | PASS (the URL normalises to foo/bar in the dialog) | 1440/820/390 | gh-*-state.png |
| GH-12 invalid repo | PASS (role=alert, aria-invalid, actions disabled) | 1440/820/390 | gh-*-invalid.png |

- The Target Repository field is local client state with no Save control, so the saved target never changed: krzemienski/awesome-video before and after.
- No POST was sent to /api/github/import or /api/github/export. The sync job count stayed at 49.
- Touch: agent-browser emulated the viewport only. Revision: 762a6c0d.
- Lead spot-check: gh-390-invalid.png and gh-1440-dialog.png both match the report.
