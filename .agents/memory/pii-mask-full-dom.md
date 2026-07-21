---
name: PII masking must cover every DOM path
description: Masked-field regressions hide in fallback columns and attribute values; text-content leak checks are blind to attributes.
---

**Rule:** When a surface masks PII (e.g. emails in an admin table), the mask must be applied on
*every* render path that can carry the value — not just the primary column. The two paths that
leaked here months after the mask shipped:
1. A *fallback* in another column (display-name column fell back to the raw email when the user
   had no name — most real users had no name, so the "masked" table showed raw emails anyway).
2. *Attribute values* (`aria-label="Delete user <raw email>"`) — invisible on screen but in the
   DOM and announced by screen readers.

**Why:** The masked column looks correct in every screenshot, so visual QA and text-based checks
pass while the value leaks one cell over or one attribute deep. External audits catch it later as
a HIGH.

**How to apply:**
- When adding/masking a sensitive field, grep the component for every other use of that field
  (fallbacks, labels, tooltips, aria-*, title, exports) and route them all through the same
  mask + reveal state.
- Leak-check harnesses must scan `outerHTML` (text + attributes), not `textContent`/
  `allTextContents()` — the latter is structurally blind to attribute leaks.
