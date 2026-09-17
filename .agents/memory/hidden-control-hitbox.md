---
name: Hover-revealed controls inside flex action groups
description: Why "opacity:0; position:absolute" reveal patterns make the wrong button fire, and the anchoring pattern that survives the pixel-parity harness.
---

Rule: a hover/focus-revealed control in a flex action group must (1) get
explicit offsets that place it where no visible sibling sits, (2) stay
`pointer-events: none` until revealed, and (3) stay out of flow when
revealed. Reveal on `tr:hover` (or the nearest row-level ancestor), not on the
group's own `:hover`.

**Why:** `opacity: 0; position: absolute` with no offsets leaves the box at its
static position — in a `justify-content: flex-end` group that is on top of the
last visible sibling — and it still receives clicks. Flipping it to `static`
on hover re-flows the group and slides the visible sibling under the pointer,
so a plain click on Edit opened the Delete dialog (admin Resources and
Categories tables, 2026-09). Revealing only on the group's own `:hover` also
means a pointer moved straight onto the hidden control never reveals it
(it is outside the group's box and inert), so Playwright "intercepts pointer
events" and users see nothing.

**How to apply:** the resting frame the pixel harness captures must not
change, so keep the change to hover/focus/tools-open states only; if the group
spans the whole cell, add `width: fit-content; margin-inline-start: auto` so
the control anchors beside the last button rather than at the far edge of the
cell. Verify with a pointer-only click on the visible neighbour AND a direct
pointer move onto the hidden control.
