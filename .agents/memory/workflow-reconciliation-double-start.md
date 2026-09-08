---
name: Workflow reconciliation double-start
description: How to diagnose artifact workflows falsely marked failed because reconciliation starts a second copy against their healthy listener.
---

A managed artifact workflow can be marked failed with “Port already in use” while its first Vite child is healthy and serving on the assigned port. This can happen when workflow reconciliation launches overlapping starts after a merge wave.

**Why:** Changing the artifact’s assigned port or its run command would treat the healthy listener as the defect and create configuration drift. The failure is in lifecycle reconciliation, not the app.

**How to apply:** Inspect the listener and process tree first. If the listener belongs to the configured workflow, restart that exact managed workflow once so Replit terminates the full process tree and starts one clean copy. Only debug the app or change configuration if the clean restart still fails.