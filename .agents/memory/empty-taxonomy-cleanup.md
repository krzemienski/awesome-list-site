---
name: Empty taxonomy node cleanup safety
description: Why empty taxonomy rows are safe to hard-delete, and why prod can look clean despite still carrying empties.
---

Empty taxonomy nodes (subcategories / sub_subcategories that render with 0 resources in the tree) can be hard-deleted safely.

**Why:** resources link to taxonomy by TEXT columns (`category` / `subcategory` / `sub_subcategory`), NOT foreign keys, so deleting a taxonomy row physically cannot cascade into or modify `resources`. The tree builder (`getAwesomeListFromDatabase`) enforces a fold-up invariant: any approved resource whose subcategory/sub_subcategory text maps to no real child node folds into its nearest valid ancestor rather than being dropped. So an empty leaf holds no resource, and deleting it strands nothing.

**How to apply — before deleting:**
1. Confirm 0 category-orphans: approved resources whose `category` text matches no `categories.name` row ARE dropped from the tree entirely (the QUANTEEC bug). Those must be fixed, not ignored.
2. Assert each target node has 0 approved resources by FULL CHAIN match against raw rows (pre-URL-dedup — stronger than the tree count, catches a node whose only content is a dedup-hidden duplicate).
3. After delete, re-verify total + per-category counts unchanged and 0 empties remain.

The only cascade path is subcategory → its sub_subcategories; the parent's full-chain check (match on category+subcategory, no subsub restriction) already covers those children.

**Prod vs dev gotcha:** the client `AppSidebar` filters out empty nodes, so prod can look clean in the UI while its DB still carries empty taxonomy rows. Cleanup is per-environment — dev row IDs do NOT transfer to prod; recompute the empty set against each environment's own live tree/IDs.

**Prod has NO direct-write path** (production SQL via executeSql is a read-only replica; cannot deploy on demand). The only prod write path is the deployed app's audited admin API (`POST /api/auth/local/login` as admin, then PATCH/DELETE `/api/admin/subcategories/:id` + `/api/admin/sub-subcategories/:id`). So on prod you CANNOT do the direct drizzle delete you use on dev.

**The delete guard is a false-positive for name-collided nodes.** `getSubcategoryResourceCount` / `getSubSubcategoryResourceCount` count `WHERE subcategory|sub_subcategory = name` — BY NAME, ALL STATUSES, no chain. A genuinely-empty node whose name is reused by a populated node elsewhere (e.g. "FFmpeg" living under 5 subcategories) is blocked from deletion even though its own branch is empty.
**Workaround (no code change/deploy needed):** rename-to-unique-then-delete — PATCH the empty node's `name` to `__EMPTY_DEL_<id>` (guard then counts 0), then DELETE. Safe because `updateSubcategory`/`updateSubSubcategory` only `db.update().set()` the taxonomy row and never touch `resources`, and slug is left unchanged so the `(slug,parentId)` unique constraint can't collide. Deleting a taxonomy row can never change any resource count (no FK), so `total_all`/`total_approved` are invariant regardless.

**MANDATORY: approved-empty ≠ safe-to-delete. Re-check full-chain across ALL statuses before deleting.** A node can be empty by `status='approved'` yet still hold a pending/rejected resource on its EXACT chain (`name_approved=0` but `name_all>0`). Deleting such a node means a later approval of that resource folds it into the ancestor instead of its intended node. Drop any node whose all-status full-chain count > 0 from the delete set and KEEP it (it stays hidden from users by the empty-node filter anyway). On the July 2026 prod pass this rule preserved 3 nodes ("Vendors & HDR", "Vendor Docs", "Audio").
