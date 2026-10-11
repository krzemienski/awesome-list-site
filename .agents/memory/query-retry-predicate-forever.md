---
name: Per-query retry predicates can retry forever
description: A useQuery `retry` function that returns true for every non-excluded status never reaches the error state; how to spot it in load-error proofs.
---

A per-query `retry: (_n, err) => status(err) !== 404` ignores failureCount, so every 5xx retries
forever with backoff: the panel shows its skeleton indefinitely and the load-error UI never renders.

**Why:** found while proving admin load-error states with forced masked 500s — the contact inbox
never left loading; the harness counted 5+ failed GETs for one mount.
**How to apply:** prefer the global retry policy (only short 429s retry); any local `retry` function
must bound failureCount. In browser proofs, a rising failed-GET count with no error UI is the tell.
Also: admin panels fold content behind `<details>`, "More" buttons and inner Tabs — proofs must
unfold/click into them, and canonical (always-visible) tables can hide a second copy of the same
query's empty state ("No jobs found") that also needs the error branch.
