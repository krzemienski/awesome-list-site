---
name: Browser capture protocol
description: Determinism, size ceilings, pre-paint evidence, and read-only enforcement for headless captures.
---

Consolidated index for capturing trustworthy browser evidence.

- Determinism: [headless-capture-determinism.md](headless-capture-determinism.md).
- Size ceiling: [chromium-capture-ceiling.md](chromium-capture-ceiling.md) — captures past 16384px silently degrade on both sides; tile and stitch.
- Pre-paint evidence: [filmstrip-prepaint-check.md](filmstrip-prepaint-check.md) — frames before responseStart are the prior page, so white is not a flash.
- Read-only enforcement: [read-only-browser-capture.md](read-only-browser-capture.md) — three layers, and page-scoped hooks miss anchor popups.

**Why:** non-deterministic or oversized captures produce confident, wrong verdicts.
**How to apply:** wait for the settled condition, then snapshot; never sleep-then-shoot.