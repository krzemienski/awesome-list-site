---
name: Dialog-open locator race in interaction sweeps
description: Why a "command palette fails to open at 375" gate finding was a harness race, and the locator that fixes it.
---

A theme-sweep gate reported Ctrl+K "not opening" only at 375 after the sidebar
sheet was closed. A direct probe opened the palette 9/9. The gate sampled the
first `[role="dialog"]` — the closing sidebar sheet (still `role=dialog`,
`data-state="closed"` during its exit animation) — instead of the lazily
mounted palette.

**Why:** Radix keeps the dialog in the DOM through its close animation, and a
lazy chunk mounts the real target a beat later.

**How to apply:** before calling a dialog interaction broken, reproduce with a
standalone probe; make sweep locators wait for
`[role="dialog"][data-state="open"]` scoped to the target (stricter, never
weaker). Tightening a harness locator is acceptable under "never weaken gates".
