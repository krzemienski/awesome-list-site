---
name: dead-exports gate forbids speculative shared exports
description: Adding "will be needed later" exports to shared/ or client libs fails the dead-exports gate; add each export with its first importer.
---

**Rule:** do not land exports (label maps, zod enums, helper factories,
barrel `index.ts` files) ahead of a consumer. `dead-exports` fails on any
export with zero importers and the fix is *not* a pinned exception — keep the
value module-local and export it in the task that first imports it.

**Why:** the foundation restore for the parity work had to un-export half of
`shared/resourceKinds.ts` / `shared/contact.ts` and delete a contact barrel
that a wave task had prepared "for later"; pinning exceptions would have hidden
real dead code the cleanup task is contracted to remove.

**How to apply:** when a task splits a feature across waves (schema now, API
later), the earlier task keeps helpers unexported and says so in
`docs/parity/assumptions/<task>.md` so the later task knows to re-export rather
than duplicate.
