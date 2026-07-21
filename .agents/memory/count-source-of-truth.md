---
name: Resource count source-of-truth
description: Why sidebar/category counts must derive from a single complete hierarchy, and how orphan resources are handled.
---

# Resource counts must have a single source of truth

The app previously showed counts from TWO independent validators and they could disagree:
- Top-level category badge: authoritative DB count `COUNT(*) WHERE category = X AND status='approved'` (counts EVERY resource in the category).
- Subcategory / sub-subcategory badges: a recursive in-memory tree-sum over the `/api/awesome-list` hierarchy, which only counted resources whose `subcategory` / `sub_subcategory` strings mapped to a real node.

**Failure mode:** any resource with a valid `category` but an unmapped `subcategory`/`sub_subcategory` (an "orphan") was counted at the top but silently dropped from every sub-level badge and page. The parent then showed e.g. 183 while its visible children summed to 44.

**Rule:** counts must come from ONE complete hierarchy.

**Why:** orphans are created naturally by GitHub import / Claude enrichment / manual edits that set a subcategory string before the node exists. Two validators guarantee eventual divergence.

**How to apply:**
- The hierarchy builder (`getAwesomeListFromDatabase`) folds every approved resource into exactly one node of its category subtree. If `sub_subcategory` is unmapped it folds into the nearest valid subcategory; if `subcategory` is unmapped it folds into the category's direct `resources`. This guarantees `tree-sum(category) == COUNT(*) WHERE category = X` and that no resource is unreachable.
- The sidebar derives ALL badge counts (category, sub, sub-sub) from that one tree via the recursive `getTotalResourceCount`. Do NOT reintroduce a separate `/api/categories` count for the top-level badge.
- To verify: for every category `treeSum == childrenSum (direct + Σ child tree-sums)` and grand tree total == approved-resource count. Inject a probe resource with a nonexistent subcategory and confirm it folds in (count goes up, resource stays reachable) rather than being dropped.

## Page-level views must mirror the same recursive tree (not just direct rows)

The sidebar badge is recursive, but the subcategory/sub-subcategory PAGES (`client/src/pages/Subcategory.tsx`, `SubSubcategory.tsx`) independently build the list they render. Two recurring traps make a page disagree with its own sidebar badge:

1. **Direct-only lists.** A subcategory page must render `[...subcategory.resources, ...subSubcategories.flatMap(ss => ss.resources)]`, NOT just `subcategory.resources`. Using direct rows only drops every resource that lives under a sub-subcategory (e.g. Codecs page showed 9 while sidebar showed the true 15).
2. **Merging the paginated `/api/resources` endpoint into a tree-derived list.** `/api/resources` is paginated (page size 20) and the default React-Query fetcher ignores object queryKey args like `{status:'approved'}`, so such a merge silently injects a near-arbitrary first-20-rows slice → duplicate cards for whichever subcategories happen to appear there. Page lists should come ONLY from the `/api/awesome-list` tree (`processAwesomeListData`), never a second endpoint.

**Why:** the tree from `/api/awesome-list` already carries full resource shape (incl. `metadata.tags` and nested `subSubcategories`); a second source guarantees divergence and dupes.

**How to apply:** after flattening parent+child, de-dupe with a composite identity key `` `${id}|${url}` `` (collapses the legitimate parent/child overlap of the same resource without merging two genuinely distinct records that share only a URL). Tree resources have no top-level `tags`, so normalize tags from `metadata.tags` when the top-level array is empty.

## EVERY count/list display surface must use the tree — not `/api/categories`, not raw `/api/resources`

The trap is not limited to the sidebar and the sub/sub-sub pages. The landing page (`Home.tsx`), the `/categories` hub (`Categories.tsx`), and the `/category/:slug` page (`Category.tsx`) each independently fetched a raw DB source and desynced from the tree:
- `Home.tsx` / `Categories.tsx` pulled per-category counts from `GET /api/categories` (raw text-column `COUNT`) and the headline total from `/api/resources` — showing the pre-dedup numbers.
- `Category.tsx` built its rendered resource LIST from `GET /api/resources?category=…&limit=2000` (endpoint applies NO dedup), so both its count AND its cards included near-duplicate URL rows.

**Symptom:** the DB has near-duplicate URLs (differ only by trailing slash / case). Raw `COUNT` = 1944 total (e.g. Introduction & Learning = 210); the deduped tree = 1931 (208). Any surface on the raw source reads high and, for lists, renders duplicate cards; SSR (og-middleware, tree-based) then disagrees with the hydrated client.

**Rule:** ALL user-facing count + list surfaces derive from the single `/api/awesome-list` tree via `getTotalResourceCount` (counts) / flatten-the-subtree (lists). Never reintroduce `/api/categories` counts or raw `/api/resources` for DISPLAY. Admin views and `/search` intentionally stay on the raw table (raw is correct there).

**Why:** the app dedups by normalized URL at tree-build time (`getAwesomeListFromDatabase`); the raw table still carries the dupes. Two sources = guaranteed divergence + a client/SSR hydration mismatch.

**How to apply:** to verify end-to-end, one category (e.g. `intro-learning`) must read the SAME number on the sidebar, the home card, the `/categories` card, the `/category/:slug` header/badge/"Showing X of Y", and the Googlebot SSR title+description. The durable source-level fix is to merge/reject the near-duplicate DB rows so raw == tree everywhere (publishing does not reseed prod, so that reconciliation is a separate prod-data step).
