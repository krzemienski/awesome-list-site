---
name: Resource kind backfill semantics
description: Why refining the kind classifier does not change already-stored kinds, and how to re-apply it safely.
---

Kind is stored for every resource. The boot backfill fills `kind IS NULL` only, and there is no provenance column. "Automatic" in admin means the stored kind equals the classifier's current answer.

**Why:** an admin's override must never be overwritten, and with no provenance column the backfill cannot tell an automatic value from a manual one.

**How to apply:** after changing classifier rules, rows that are already stored keep their old kind. On dev, first check resource_audit_log for live "Resource kind set by admin" rows, then reset to NULL and restart so the boot backfill re-runs. On prod, never bulk-reset. Re-classifying there needs a provenance column or per-row admin "Automatic". Articles and tutorials are "other" by design; no learning kind exists.
