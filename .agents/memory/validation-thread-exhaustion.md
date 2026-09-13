---
name: Validation thread exhaustion
description: Distinguish full-suite process exhaustion from application regressions.
---

When concurrent validation reports `ERR_WORKER_INIT_FAILED` / `EAGAIN`,
abnormal process exits, and many connection-refused errors, inspect process
startup failures before treating each HTTP failure as a separate app defect.

**Why:** The concurrent completion runner has exhausted Node worker capacity
while the app listener became unavailable, producing unrelated route failures
even when a focused real-browser flow passed.

**How to apply:** Preserve the first infrastructure error and individual
functional evidence. Restore the managed app workflow once and confirm startup.
Do not hide separately reproducible source-level failures behind the outage.