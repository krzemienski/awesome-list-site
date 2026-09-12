---
name: Filmstrip prepaint proof
description: How to prove "no theme flash on first paint" with a CDP screencast without misreading the previous page's frames as a flash
---

# Filmstrip prepaint proof

**Rule:** In a CDP `Page.startScreencast` filmstrip of a cold navigation, only
frames whose `metadata.timestamp` is at or after the navigation's
`responseStart` (epoch) belong to the document under test. Earlier frames are
the previous page — usually `about:blank`, which is *white*. On a dark-only app
a white first frame is therefore the tell of a foreign frame, not evidence of a
flash of unthemed content.

**Why:** a "white flash" once reported by a filmstrip was the blank page
captured before the response arrived; the first frame our document painted
already had the final colours.

**How to apply:**
- Record `performance.timing`/navigation entries alongside the frames and bucket
  each frame as `pre-response` / `document` by epoch time; report the first
  *document* frame's colour fractions (black/white/accent pixel ratios).
- Pair the frames with an attribute timeline: attach a `MutationObserver` on
  `<html>` from an init script and log `data-system`/`data-accent` (and the
  computed `--bg`/`--accent`) at observer attach, first `requestAnimationFrame`,
  and on every change. "No flash" = the attributes already hold their final
  values at attach time and never take another value afterwards.
- Screencast frames arrive on a separate CDP session; `Page.screencastFrameAck`
  every frame or the stream stalls after the first few.
