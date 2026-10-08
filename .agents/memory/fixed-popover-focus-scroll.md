---
name: Fixed popover focus does not scroll
description: Why focusing a field inside an open Radix popover can leave it off-screen after layout shifts, and the fix.
---
Radix Popover content is position:fixed and follows its trigger. When content above the trigger grows (e.g. Home renders the full index after tags clear), focus() on a field inside the popover does NOT scroll the page — the field stays off-screen while focused.

**Why:** the browser's focus scroll-into-view has nothing to scroll for a fixed box; only scrolling the anchor moves it.

**How to apply:** in any focus handoff into an open popover after a layout change, scrollIntoView the TRIGGER first (block start + behavior "instant" — html has scroll-behavior smooth and scroll-padding-top 80px), only when it left the viewport, then focus the field. Verify with getBoundingClientRect of the focused element, not just activeElement.
