---
name: Axe first-frame animation race
description: reduced-motion cuts CSS animations to 0.01ms, but a just-mounted animation still paints its first keyframe (opacity 0) for a frame or two; axe run then reports phantom low contrast.
---

Before an axe run (or any computed-colour check), wait two requestAnimationFrame ticks, then await
`.finished` on every finite running animation. Playwright `visible` ignores opacity, so "h1 visible"
is not a settle signal.

**Why:** the prod build (faster mount) failed parity-systems with 1.24:1 on the submit button while dev
passed — axe blended through `.submit-page` `fadeIn` at its 0-opacity first frame; a settled run was 0.

**How to apply:** a contrast failure with colours that look like the right pair heavily darkened, seen
on only one build or one run, is this race — probe ancestor opacity over time before touching tokens.
