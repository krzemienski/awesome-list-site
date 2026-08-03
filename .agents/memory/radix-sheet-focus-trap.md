---
name: Radix sheet focus-trap breakers
description: Two silent ways a Radix Dialog/Sheet focus trap breaks — hidden first-focusable autofocus targets, and tooltip mount/unmount DOM churn that FocusScope's MutationObserver misreads.
---

# Radix sheet/dialog focus-trap breakers

**Rule 1 — autofocus target must be VISIBLE.** `onOpenAutoFocus` pointing at the
first `a[href]`/`button` can hit a zero-size or display:none element (e.g. a
desktop icon-mode duplicate rendered inside the mobile sheet). `.focus()` on it
fails *silently*, focus never enters the sheet, and the whole trap disengages —
Tab walks the background even though Radix set `aria-hidden` on it. Pick the
first candidate with `offsetWidth/offsetHeight > 0`.

**Rule 2 — no mount/unmount churn inside the dialog on focus/blur.** Radix
FocusScope runs a MutationObserver: if any node is removed while
`document.activeElement === body`, it yanks focus back to the dialog container.
A `SidebarMenuButton`-style Tooltip that mounts on focus and unmounts on blur
(even with `hidden` content) removes a DOM node exactly while Tab is mid-flight
→ focus delivery to the next control aborts → Tab ping-pongs between container
and first control, and the rest of the drawer is unreachable by keyboard. Fix:
don't render the Tooltip wrapper at all when `isMobile` (tooltips only matter
in collapsed icon mode anyway).

**How to debug:** patch `HTMLElement.prototype.focus` in-page to capture
`new Error().stack` — it names the caller (e.g. Radix `handleMutations`)
immediately, where focusin/focusout traces alone stay ambiguous.

**How to verify a trap:** walk ≥10 Tabs and assert BOTH zero escapes AND the
number of *unique* focus stops grows — "0 escapes" alone passes when focus is
stuck in a 2-element cycle.
