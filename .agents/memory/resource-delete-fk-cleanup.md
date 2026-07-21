---
name: Resource delete FK cleanup
description: Deleting a resource requires manual cleanup of child FKs that lack ON DELETE actions, plus audit-log ordering — or the delete throws a false 500.
---

# Resource deletion: manual FK cleanup + audit ordering

`ResourceRepository.deleteResource(id)` must do three things in order or it fails with a false 500 despite the delete logically being possible:

1. **Write the `resource_audit_log` 'deleted' entry BEFORE deleting the resource.** That audit row's `resource_id` FK references `resources(id)`, so it must be inserted while the row still exists. Callers must NOT also log the deletion afterward — a post-delete insert violates the FK.
2. **Manually remove/null every child FK to `resources(id)` that has no ON DELETE action.** Most child tables (resourceTags, journeySteps, favorites, bookmarks, userInteractions, enrichmentQueue) use `onDelete: cascade`; `resourceAuditLog` uses set null. But two do NOT and must be handled in code:
   - `resource_edits.resource_id` → hard-delete the edit rows first.
   - `research_discoveries.created_resource_id` (nullable) → null it out (the discovery record is history worth keeping).
3. Then delete the resource row.

**Why:** the schema is inconsistent about ON DELETE behavior across the many children of `resources`. Any child FK without a cascade/set-null action turns a normal admin delete into a foreign-key violation surfaced to the user as a 500.

**How to apply:** if you ever add a NEW table with an FK to `resources.id`, either give it an explicit `onDelete` action in `shared/schema.ts`, or add an explicit cleanup step inside `deleteResource`. When debugging a "can't delete resource / 500" report, grep `shared/schema.ts` for `references(() => resources.id)` and check each one has an onDelete action or matching cleanup.
