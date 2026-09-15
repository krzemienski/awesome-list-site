---
name: Browser lease cleanup ownership
description: Safe cleanup when a timed-out browser audit shares Chromium leases with other workers.
---

A lease slot is not process ownership. After an audit times out, another worker may acquire the same slot; never terminate the slot's current Chromium process based on the previous run's ownership.

**Why:** Cleanup after a timed-out audit killed a concurrent performance capture's browser, invalidating otherwise independent evidence.

**How to apply:** Track the exact process tree created by each run. Confirm that tree still belongs to the same run before cleanup. Use background execution for long captures and persist each completed cell rather than waiting until the full matrix finishes.