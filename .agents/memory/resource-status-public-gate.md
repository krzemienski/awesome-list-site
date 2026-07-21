---
name: Public/indexable resource & journey status gate
description: Which status value makes a resource/journey public — and why counting by the wrong one returns 0.
---

Public, indexable **resources** have status `"approved"` (NOT `"published"`).
Public, indexable **learning journeys** have status `"published"`.

**Why:** A taxonomy/OG/JSON-LD count that calls
`listResources({ status: "published" })` returns 0 because no public resource is
ever "published" — they are "approved". This silently shipped category counts of
0 in server-rendered metadata until fixed. Journeys, by contrast, genuinely use
"published".

**How to apply:** Any surface that gates resource visibility (sitemap, OG meta,
JSON-LD, public listings) must filter resources on `"approved"` and journeys on
`"published"`. For accurate taxonomy counts prefer summing the hierarchical tree
(`getAwesomeListFromDatabase()`) recursively rather than a status-filtered
`listResources` query — the tree already contains exactly the public set, one
resource per node.
