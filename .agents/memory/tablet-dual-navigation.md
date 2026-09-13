---
name: Tablet dual navigation
description: Drawer availability is not the same as sidebar invisibility at tablet widths.
---

When desktop navigation and a modal drawer can coexist, allocate disclosure
IDs per mounted instance and scope active-item scrolling to the foreground
surface. Do not skip desktop scrolling merely because a drawer is available.

**Why:** Canonical tablet layout intentionally keeps the sidebar visible while
also offering the menu button. Reusing phone-only logic duplicated disclosure
IDs and left deep-linked active leaves below the visible tablet scrollport.

**How to apply:** Exercise both the closed-tablet deep-link case and the
open-tablet drawer case. Phone-only keyboard checks miss both regressions.