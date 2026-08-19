---
name: Amplitude consent teardown
description: Privacy-safe revoke and regrant behavior across Amplitude core, Session Replay, Experiment, and Engagement SDKs.
---

Amplitude core `setOptOut(true)` is not a cancellation boundary for Session Replay or Engagement setup already in flight. Treat each sub-SDK as an independent transport lifecycle: abort its transport, stop its runtime, await plugin removal, and invalidate any setup generation that crossed a revoke before allowing regrant to resume.

**Why:** Delaying plugin imports exposed successful replay/config work after the parent client was opted out. Fire-and-forget plugin removal also raced regrant and could leave the retained core disabled. Separately, browser audits that matched the word `amplitude` in URLs misclassified local Vite module fetches as vendor traffic.

**How to apply:** On future Amplitude upgrades or consent changes, verify grant → revoke → regrant with real network responses. Require zero completed external Amplitude transport after revoke; exclude same-origin source/chunk requests, and distinguish an aborted request start from a completed response.