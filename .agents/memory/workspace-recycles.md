---
name: Workspace recycles
description: The container restarts roughly hourly; what that breaks and how to survive it.
---

- Long runs: [workspace-recycle-long-runs.md](workspace-recycle-long-runs.md) — restarts are not OOM. Keep logs under .cache/runlogs, sleep in short slices with an uptime check, and treat a cut panel as VOID (rerun under a new name).
- Git damage: [git-stale-locks-after-recycle.md](git-stale-locks-after-recycle.md) — recycles leave 0-byte lock files across .git and half-done checkouts with truncated branch names. Clear them only when no git process is running.
- Background shells: [bash-long-jobs.md](bash-long-jobs.md).

**Why:** an hour-long unattended run will be interrupted; design for resumption, not for luck.