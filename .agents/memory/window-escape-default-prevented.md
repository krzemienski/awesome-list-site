---
name: Window Escape listeners vs overlays
description: Radix dialogs, sheets and the search palette preventDefault the Escape they consume; window-level Escape handlers must skip defaultPrevented events.
---
The consent banner's window keydown listener dismissed itself on every Escape, so closing the search palette with Escape also hid the banner for the session without saving a choice (audit 2026-10-25, fixed in G1).

**Why:** Radix layers call `preventDefault` on the Escape that closes them; a window listener still receives it.

**How to apply:** any window or document Escape handler checks `event.defaultPrevented` first. Verify by opening an overlay over the component and pressing Escape once: only the overlay closes.
