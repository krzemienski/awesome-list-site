---
name: wouter useLocation() has no query string
description: wouter's useLocation() returns path only (no ?query) — URL-sync guards must compare against window.location.search.
---

# wouter `useLocation()` returns path only — query string is invisible to it

`useLocation()` from wouter yields just the pathname, never the `?query=...`
part. Code that diffs "current location" against a freshly-built path to decide
whether to call `history.replaceState`/`pushState` will be wrong whenever only
the query string changes.

**Why:** A search box wrote `?search=...` to the URL but could never *clear* it.
The URL-sync effect compared the new path (with no query, because it was being
cleared) to `useLocation()` (also no query) — they matched, so the guard skipped
the `replaceState` and the stale `?search=` lingered in the address bar.

**How to apply:** When a filter/search effect needs to detect query-string
changes, compare against `` `${window.location.pathname}${window.location.search}` ``,
not the wouter location value. This pattern recurs across all
filterable list pages (Category / Subcategory / SubSubcategory), so fix them in
lockstep.
