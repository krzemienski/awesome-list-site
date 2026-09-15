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

For newly approved fixtures, absence from the first page is not evidence of
absence from a category.

**Why:** A click-through audit mistook first-page default ordering for the
entire listing and proposed a stale-projection fix without checking pagination.

**How to apply:** Verify the fixture's category, ordering, pagination and endpoint
freshness before filing an omission defect. Keep an insufficient first-page
probe marked incomplete, even when home and search already show the fixture.

Treat an anchor's click contract separately from its fallback href.

**Why:** Listing tag pills can intentionally apply same-page filters, while SPA
sidebar handlers can intercept modified clicks. A generic popup/exact-href
audit then reports working controls as broken and contaminates later checks
when it fails to restore the original page and disclosure state.

**How to apply:** Derive expected navigation versus filtering from the owning
component. Restore required disclosure state before locating each target,
fail explicitly on missing requested targets, and keep machine-readable
outcomes separate from human-readable provenance prefixes in chained audits.
