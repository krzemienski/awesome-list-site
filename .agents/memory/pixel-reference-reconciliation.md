---
name: Pixel reference reconciliation
description: How required live content is handled when a frozen visual prototype lacks it
---

When required live links, accessibility presentation, or the official brand
mark differ from a frozen visual prototype, preserve them and reconcile only
those differences in the in-memory expected-capture adapter. Never remove
required product content or relax the pixel threshold to obtain a pass.

**Why:** The user explicitly chose reference reconciliation over matching the
prototype by deleting or relocating required footer content.

**How to apply:** Keep canonical structure and geometry authoritative; record
each adapter mutation, compare the full union canvas without masking/cropping,
and retain expected, actual, diff, and measured percentage evidence.

Keep the expected renderer independent of current application presentation:
never import the actual component stylesheet to make its reference pass. An
approved official mark can be projected from source-owned geometry, but bind
that projection once and apply the identical transformation to normal and
determinism captures.

**Why:** Copying runtime CSS into the oracle conceals the very regressions the
comparison should detect; cross-origin stylesheet injection also fails in
isolated reference documents. Skipping the transformation in determinism
measures a different expected page.

Editorial muted text may be reconciled from 40% to 52% opacity on the expected
side, while retaining the application's AA contrast.

**Why:** The user explicitly approved this narrow token reconciliation rather
than regressing readable metadata to match the frozen prototype.

**How to apply:** Declare the exact expected-side substitution and its
provenance; do not extend this permission to other presentation differences.
Measure its effect rather than assuming it explains remaining pixel failures.

Home's Browse and Submit controls may also have their expected-only minimum
height reconciled to 44px.

**Why:** The user explicitly approved preserving the application's existing
44px control contract rather than shrinking those controls to the prototype.

**How to apply:** Limit this permission to those two Home buttons, using
in-memory source substitutions shared by normal and determinism captures.
Do not modify frozen files or extend approval to other controls or geometry.

The user also explicitly approved expected-only reconciliation of retained
palette Pages/history and focus treatment, plus drawer More navigation and
44px targets.

**Why:** These are required application capabilities or accessibility treatment
absent from the prototype; removing them to lower a pixel difference would
regress the product.

**How to apply:** Limit projections to those controls, retain genuine empty
history, and record provenance. Apply the same scoped changes in normal and
determinism captures. This does not approve other geometry changes, copying
entire application panels, masking, relaxed thresholds, or waiving remaining
performance and production-comparison requirements.

**Rule:** A narrowly scoped new approval is additive; preserve all earlier
approved reconciliations and their provenance unless the user explicitly
revokes them.

**Why:** Interpreting “only these controls” as a replacement for the entire
approval history can silently remove independently approved brand, content,
footer and accessibility requirements.