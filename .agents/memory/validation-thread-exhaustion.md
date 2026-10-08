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
**Parallel browser auditors:** the container cgroup caps pids at ~1152 and the
idle workspace already uses several hundred, so ~7 concurrent Playwright
Chromiums leave no headroom (`pthread_create EAGAIN` / "Target crashed").
Check `/sys/fs/cgroup/pids.current` vs `pids.max`; run ≤6 browser agents at once,
or have late agents use one browser at a time with `--renderer-process-limit=2`.
