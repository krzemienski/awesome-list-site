---
name: Tags source of truth is metadata.tags
description: The tags DB table is empty; real tag data lives in resources.metadata.tags JSON.
---
The `tags` table is EMPTY and has never been populated. The real tag data for every surface (tag landing pages, facets, exports) lives in `resources.metadata.tags` (jsonb string array, ~1,673 distinct tags across ~1,148 tagged resources).

**Why:** The JSON backup export silently produced an empty tags section for months because it read the tags table; nothing errored.

**How to apply:** Any feature that needs tags (export, counts, new endpoints) must derive from `resources[].metadata.tags` — a query against the tags table returning 0 rows is the tell, not proof there are no tags.
