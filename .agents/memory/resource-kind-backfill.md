---
name: Resource kind backfill semantics
description: Why refining the kind classifier does not change already-stored kinds, and how to re-apply it safely.
---

Kind is stored for every resource. The boot backfill fills `kind IS NULL` only, and there is no provenance column. "Automatic" in admin means the stored kind equals the classifier's current answer.

**Why:** an admin's override must never be overwritten, and with no provenance column the backfill cannot tell an automatic value from a manual one.

**How to apply:** classifier rule changes never reach already-stored kinds by themselves. Re-classifying existing rows (especially on prod) needs a provenance column or per-row admin "Automatic" — never a bulk reset that could erase admin overrides.
