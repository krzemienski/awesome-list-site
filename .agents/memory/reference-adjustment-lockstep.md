---
name: Comparison-reference adjustments must be ported to the app
description: Why pixel-parity rows fail wholesale after an approved reference adjustment, and how to attribute residuals before touching CSS.
---

**Rule:** an approved comparison-reference adjustment file (44px control floor, 767/768
breakpoint split, natural-wrap rules, accent chips the frozen JSX marks as `chip accent`)
changes the EXPECTED side of every parity row. Nothing ports it to the app automatically;
port each rule to the app CSS in the same pass, or ~half the ledger fails at 1–10% with
no design regression.

**Why:** a whole run went red (85 pass / 97 fail) with prod==dev percentages; the app CSS
had never received the adjustments. Reverting a worker's accent re-tint on the count chip
as "Stage 7 accent discipline" was wrong — the frozen page JSX uses `chip accent`, and
category/subcategory at 1440 only passed once the class was restored.

**How to apply:**
- Read the adjustment JSON first; grep the frozen JSX for the element's classes before
  calling any accent/neutral difference a discipline violation.
- Any vertical offset fails every band below it (a 44px control on its own row = 6%).
  Move contract-required controls into an existing 44px row (back-button row) instead of
  adding a row; only zero offset passes the 0.5% ceiling.
- Demand crop-level attribution from workers ("other/content" labels were repeatedly
  wrong); use a sharp band histogram of the diff PNG to find the first divergent row.
- Token-parity compares against the FROZEN sheet, not the adjusted reference: never
  re-declare a verbatim utility (`.hide-mobile`) under a different media condition —
  design-system.css's own rule already covers ≤767; delete the shadow instead.
- Capture-only hacks like `@media (min-width:768px) and (max-width:768px)` are
  app-derived layout values and trip token-parity canaries; the general breakpoint fix
  in the shell sheet covers admin too.
- Harness residuals that cannot be fixed app-side: the About FAQ projection only parses
  double-quoted `question:` strings (template-literal questions vanish); the
  mobile-drawer 768/1024 row clicks a trigger the adjusted reference hides.
