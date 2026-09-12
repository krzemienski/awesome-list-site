---
name: dead-exports gate forbids speculative shared exports
description: Adding "will be needed later" exports to shared/ or client libs fails the dead-exports gate; add each export with its first importer.
---

**Rule:** do not land exports (label maps, zod enums, helper factories,
barrel `index.ts` files) ahead of a consumer. `dead-exports` fails on any
export with zero importers and the fix is *not* a pinned exception — keep the
value module-local and export it in the task that first imports it.

**Why:** when a feature is split across waves (schema now, API and UI later)
the earlier wave is tempted to pre-export everything the later one will need.
Pinning exceptions for those hides the real dead code the cleanup task is
contracted to remove, and un-exporting later is more churn than exporting on
first use.

**How to apply:** the earlier task keeps helpers unexported and records that
in its `docs/parity/assumptions/<task>.md` so the later task re-exports instead
of duplicating.
