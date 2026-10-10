---
name: Alternate-system pixel parity
description: Durable cascade lesson for per-system (terminal/geist/brutalist/swiss) parity against the frozen reference.
---
- Editorial passing does not imply the other systems pass. App page CSS that restates the Editorial chip/eyebrow at higher specificity silently beats the frozen per-system `.chip`/`.eyebrow` skins. Check CDP matched rules in the alternate system before diffing pixels.
- Frozen literals stay literal across systems (e.g. the ResCard tile radius); don't map them to per-system tokens.
- A uniform 1px shift below some y in a diff is sub-pixel rounding accumulation, not a skin defect; crop before "fixing".

**Why:** separating real skin defects from rounding residue took several capture cycles.
**How to apply:** any parity work on a non-Editorial system.
