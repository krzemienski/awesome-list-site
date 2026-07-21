---
name: Resource dedup cascade safety
description: What to audit before bulk hard-deleting duplicate resources so cascades don't silently destroy content/user data.
---

# Dedup / bulk hard-delete of resources — cascade safety

**Rule:** before bulk hard-deleting duplicate `resources` rows, audit the
`ON DELETE CASCADE` children and journal ROW CONTENTS (not just ids). Prefer
repointing children to the surviving twin over deleting when a duplicate has children.

**Why:** `resources` has multiple cascade children that vanish silently (no FK error,
no 500) when a resource is deleted: `journey_steps`, `resource_tags`, `user_bookmarks`,
`user_favorites`, `user_interactions`. A URL-dedup that deletes the "loser" of a pair
will destroy any journey step / bookmark that pointed at that specific id, even though
an identical survivor exists. (`resource_edits` = NO ACTION → the delete path must clean
it manually; `resource_audit_log` = SET NULL.) A journal of `{id: httpStatus}` does NOT
make the delete reversible — only row contents or a DB checkpoint do.

**How to apply:**
- List cascade children authoritatively: `SELECT conrelid::regclass, confdeltype FROM
  pg_constraint WHERE confrelid='resources'::regclass AND contype='f';` (`c`=cascade).
- For each id you're about to delete, check every cascade child; if referenced, repoint
  to the survivor (same normalized url) instead of deleting, or snapshot the child rows.
- Verify after: compare child-table counts against a pre-state, and confirm 0 orphaned
  children (`js.resource_id NOT IN resources`).

**Prod/dev divergence gotcha:** do NOT assume prod mirrors dev for *seeded* content.
When reasoning about cascade blast-radius, query the target DB directly; dev's content
is not a proxy for prod's. (Update July 2026: prod NOW HAS 89 journey steps — the old
"prod has 0 steps" state is gone; journey-step cascade risk applies to prod deletes too.)
