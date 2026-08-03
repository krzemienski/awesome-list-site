---
name: jsonb round-trips break JSON.stringify equality
description: Comparing request JSON against Postgres jsonb columns needs recursive key-sorted comparison
---

**Rule:** Never compare an application-built object against a jsonb column value with plain `JSON.stringify` equality. Postgres jsonb reorders object keys (length-then-bytewise), so `{old, new}` comes back as `{new, old}` and the strings never match — the comparison silently always fails (e.g. a duplicate-detection guard that never fires). Compare with a recursively key-sorted serialization (or a deep-equality check) on both sides.

**Why:** A pending-edit dedupe guard looked correct in review but accepted identical resubmissions; the stored jsonb had reordered keys, so fingerprints never matched. Only a live duplicate request exposed it.

**How to apply:** Any dedupe/idempotency/diff logic that fingerprints a jsonb column. Verify such guards against the running system with a real duplicate request, not by reading the code.
