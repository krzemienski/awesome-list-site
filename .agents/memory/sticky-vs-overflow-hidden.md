---
name: position:sticky killed by an overflow-x:hidden ancestor
description: why sticky silently does nothing, and the one-word fix
---

`position: sticky` sticks relative to its **nearest scrolling ancestor**. An ancestor carrying
`overflow-x: hidden` becomes that ancestor: per spec, when one axis is `hidden` the other computes
from `visible` to `auto`, so the element is a scroll container. If that container grows with its
content and never scrolls internally (the document scrolls instead), every sticky descendant is
pinned to a box that never moves — it renders, it just never sticks. No warning, no console
message, and a static screenshot looks correct.

**Fix:** `overflow-x: clip`. `clip` is excluded from the compute-to-`auto` rule, so the other axis
stays `visible` and no scroll container is created, while content is clipped exactly as `hidden`
clipped it.

**Why:** when the offending ancestor is a shared layout wrapper, sticky is dead application-wide,
not just on the page being worked on — so the symptom looks like a broken component and the cause
is nowhere near it.

**How to apply:** before debugging a sticky element, walk its ancestors for any computed `overflow`
other than `visible`/`clip`. Verify a fix by scrolling and re-reading the element's
`getBoundingClientRect().top`: working sticky reports its offset (~0), not a negative number.
