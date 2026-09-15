---
name: Census state replay
description: Why historical control ordinals cannot establish current per-control coverage
---

Do not replay historical control censuses by global visible-element ordinal.
Use a stable control identity and, for repeated card controls, its resource owner.
Preserve layout query parameters and disclosure state; recapture when identity
cannot be established.

**Why:** Historical captures and a fresh navigation can contain different
visible controls even on the same route. Restoring the URL and disclosure alone
did not recover desktop ordinals. A repeated button can even pass tag/test-ID
checks while belonging to the wrong card, falsely inflating coverage.

**How to apply:** Verify each control's owner before activation. Invalidate
results from a mismatched source state rather than treating them as successes
or product defects. Native targeted evidence can distinguish an actual dead
control from a replay failure.