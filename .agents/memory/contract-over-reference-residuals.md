---
name: Contract-over-reference pixel residuals
description: What to do when the execution contract requires behaviour the frozen design prototype does not paint.
---

Rule: when the contract forces behaviour the frozen prototype does not render
(tablet sidebar at exactly 768 while the reference hides it there; artifact
docs fitting a 375 viewport while the reference overflows; crawler-parity intro
copy where the reference binds a different field), keep the behaviour and
record the pixel rows it costs **in the same pass that makes the change**.
Never resolve it through thresholds, expected captures or the frozen source.

**Why:** a focused-proof pass shipped several such changes without listing the
rows; the next full pixel run regressed sharply and looked like a harness fault
until a diff against the previous full-run tree tied every new failure to one
of those decisions.

**How to apply:**
- Before a full parity run, diff against the last full-run tree for
  shell/sidebar/taxonomy/artifact CSS changes and expect those rows to fail.
- Text that must exist for crawlers but that the prototype does not paint at a
  level: render it `sr-only` there — the SEO parity gate compares section
  `textContent`, so DOM text parity survives.
- The reference adapter's single category `desc` feeds both the home cards and
  the category header; it cannot be re-bound per page.
- The prototype's white inactive "Home" box is a UA-default button (prototype
  defect); a readable link is a deliberate small residual, not something to
  emulate.
