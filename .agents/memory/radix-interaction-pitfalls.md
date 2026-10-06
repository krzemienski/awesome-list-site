---
name: Radix interaction pitfalls
description: Dialog, sheet, and tab behaviours that make harness races look like app bugs.
---

- Close animation pointer lock: [radix-dialog-close-lock.md](radix-dialog-close-lock.md).
- Focus-trap breakers in sheets: [radix-sheet-focus-trap.md](radix-sheet-focus-trap.md).
- Folded same-value tabs suppress onValueChange: [radix-folded-tab-activation.md](radix-folded-tab-activation.md).
- A closing sheet still matches role=dialog: [dialog-open-locator-race.md](dialog-open-locator-race.md).
- Toast remounts wipe typed dialog input: [dialog-toast-remount.md](dialog-toast-remount.md).

**Why:** these produced retracted bug reports more than once.
**How to apply:** wait for the open state of the specific target, never a bare role match.