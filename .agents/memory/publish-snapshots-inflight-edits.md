---
name: Publish snapshots in-flight worker edits
description: A publish while subagents are editing ships their partial, unverified changes to production.
---

The platform auto-commits agent and subagent edits, and Publish ships whatever is committed at that moment. On 2026-10-09 a publish at 13:29 UTC shipped ~85 files of half-finished audit-578 worker edits that had never been run.

**Why:** workers had no runtime verification yet, and nothing stopped the publish from capturing mid-edit state.

**How to apply:** before asking the owner to republish, confirm no workers or subagents are editing. After any unplanned publish, diff the published commit and smoke-test production before continuing.
