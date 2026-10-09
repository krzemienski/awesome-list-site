---
name: Parity residual diagnosis
description: How to close the last sub-1% parity residuals (column offsets, tab scroll) without guessing
---
Small residual parity fails that come from horizontal column offsets cannot be closed by reading source. Dump computed DOM from BOTH sides at the exact capture point, then diff.

**Why:** two rounds of source-only patches missed the real cause on the 0929 users table. The comparison-only adjustment `.btn.icon{min-width:44px}` (two-class specificity) beat the projected source `min-w-[32px]` utility, which made hidden icon buttons 44px wide on the expected side and 36px on the actual side. The diff shows up as column-width redistribution, not as a button difference. Separately, frozen Radix tabs selected on click instead of on mousedown, which changed the tab-strip scroll phase.

**How to apply:** add an env-gated `page.evaluate(probe)` right before `stableFullPageCapture` in the runner's `captureSide` (after reconciliation), run one `--only <id> --width <w>`, write the JSON to /tmp, then `git checkout` the runner. Diff the two dumps recursively. Look for blanket rules in `comparison-reference-adjustments-20260929.json` that override source utilities.
