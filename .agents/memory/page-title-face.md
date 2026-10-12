---
name: Page title face
description: Which font family page-level h1s use, and why the DS docs' "≥28px = display" rule does not apply to them.
---
Page h1s use the body face at 700 via `.page-title`; the display face is only for the wordmark, numerals, state-panel/404 titles and serif-italic accent words inside a title.

**Why:** the frozen 09-29 reference sets every page h1 (category, subcategory, resource, submit, about, admin, home hero) in the body face. The app used `display-h`, which in Brutalist renders thin Instrument Serif and looked off-brand. Aligned 2026-10-12 (ledger TYPE-1), following owner precedent of aligning to the reference.
**How to apply:** new pages use `className="page-title"` on the h1, never `display-h`; do not "fix" it back from docs/06's generic 28px rule (the doc now records the exception).
