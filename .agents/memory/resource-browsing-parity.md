---
name: Resource browsing parity
description: Why Category / Subcategory / SubSubcategory pages must share ResourceCard, and that the static tree carries real DB ids.
---

# Resource browsing parity

All resource-listing pages (Category, Subcategory, SubSubcategory) must render
the shared `client/src/components/resource/ResourceCard.tsx`, not bespoke inline
cards.

**Why:** Subcategory/SubSubcategory historically diverged — they rendered their
own `<Card>` that only did `window.open(url)` + a toast, so users couldn't reach
the internal `/resource/:id` detail page, "Suggest Edit", etc. that the Category
page offered. This is an easy-to-reintroduce regression because each page builds
its own list.

**Key data fact:** the static awesome-list tree from `GET /api/awesome-list`
(consumed via `fetchStaticAwesomeList`) already carries the real **numeric DB
id** on each resource (e.g. 186389), even though the `Resource` TS type declares
`id` loosely. ResourceCard treats `parseInt(id) > 0` as DB-backed and routes to
`/resource/:id`; otherwise it falls back to `window.open`. So any listing page
can wire up detail navigation just by passing the resource's id through.

**How to apply:** when adding/editing a resource-listing page, map the tree
resource onto ResourceCard (`name` <- `title`, `id` <- `String(resource.id)`
with a missing-id guard) instead of hand-rolling a card.
