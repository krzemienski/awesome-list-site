---
name: Browser response state assertions
description: How shared browser validation helpers should support intentionally opposite API payload states.
---

Keep response-wait helpers responsible for transport and response-shape checks,
then assert populated versus empty payload requirements inside each scenario.

**Why:** A helper that silently equates a successful response with non-empty
data makes deterministic empty-state checks fail before the UI can be observed.
The resulting failure looks like a product regression even though the helper
rejected the exact fixture the scenario requested.

**How to apply:** When one browser audit exercises loading, populated, empty, or
error states for the same endpoint, share only navigation, response matching,
status, and schema validation. Keep state-specific cardinality and UI assertions
next to the scenario that owns them.
