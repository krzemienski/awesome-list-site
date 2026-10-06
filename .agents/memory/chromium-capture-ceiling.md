---
name: Chromium full-page capture ceiling
description: Full-page screenshots of documents taller than 16384px silently degrade on BOTH sides of a pixel comparison; tile and stitch instead.
---
Chromium's single-surface full-page capture tops out around 16384px. Above that
the raster is silently scaled/clipped, so a very long page (the showcase at
375px is ~19000px) produced ~15–20% "differences" that were capture artifacts,
identical on the actual AND expected side — no CSS change could fix them.

**Why:** the harness measured 20.7% on showcase-375 for days while every
shorter width passed at <0.5%; the diff image showed vertical smearing, not
layout drift.

**How to apply:** above the ceiling, capture document-coordinate tiles and
stitch them losslessly on BOTH sides, size the canvas to the full scroll
extent (not just clientWidth, or the stitched frame is narrower than a plain
full-page capture), and disclose the method per row and in the capture
contract text. Never crop or resize to dodge the limit.
