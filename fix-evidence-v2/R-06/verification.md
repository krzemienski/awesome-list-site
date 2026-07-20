# R-06 — Home/Categories no longer download the 3.1MB corpus (MEDIUM, relates BUG-008)

**Date:** July 20, 2026 · **Status:** FIXED · **Verified live against dev (same code path as prod)**

## What changed

- `server/routes.ts` — the `/api/awesome-list/nav` builder now attaches a per-category
  `teaser: { title, description(≤200 chars) }` from the category's first direct resource,
  so the home grid can show its "Featured:" line without the corpus.
- `client/src/lib/static-data.ts` — `teaser` added to `AwesomeListNavNode`; `'/'` and
  `'/categories'` removed from `needsCorpusRoute`.
- `client/index.html` — early-fetch list mirrors the same route-list change (nav-only on `/`).
- `client/src/pages/Home.tsx` — renders the default grid from the nav tree; the corpus is a
  lazy `useQuery(["awesome-list-data"], { enabled: selectedTags.length > 0 })` used only for
  the tag-filter render path; tag list comes from `/api/tags`.
- `client/src/pages/Categories.tsx` — renders entirely from the nav tree (names/slugs/counts).
- `client/src/components/ui/ai-recommendations-panel.tsx` — `resources` prop optional;
  resource details fall back to the full `rec.resource` embedded in `/api/recommendations`
  responses (Home no longer passes the corpus to the panel).
- `client/src/App.tsx` — Home/Categories receive `nav`/`navLoading`; the app-level corpus
  query remains as warm-start for the listing routes that still need it.

## Acceptance evidence (probe.mjs / probe-tagfilter.mjs / probe-parity-authed.mjs / probe-authed-recs.mjs)

1. **Home cold-load, fresh context:** API requests = `/api/awesome-list/nav`, `/api/auth/user`,
   `/api/tags` — **no `/api/awesome-list` corpus fetch**; grid renders 9 categories with
   counts + "Featured:" teasers; 0 console errors. `r06-home-cold.png`
2. **/categories cold-load:** nav + auth only, no corpus; 9 category cards, per-card counts
   (80/334/128/192/188/267/239/212/173) match the nav payload exactly. `r06-categories.png`
3. **Tag filter path (`/?tags=open-source`):** corpus lazy-loads exactly then —
   `/api/awesome-list` appears in the log; "Showing 160 matching resources across 9
   categories"; category links carry `?tags=open-source`. `r06-home-tagfilter-url.png`
4. **Listing routes unchanged:** `/category/intro-learning` still fetches the corpus and
   renders 24 resource cards. `r06-category-page.png`
5. **Two-pass SEO parity:** served HTML (og-middleware) title
   `Awesome Video — 1813+ Curated Video & Streaming Resources` + description (1813/9);
   hydrated client title/description **byte-identical**, exactly 1 `<title>` + 1 description
   after hydration.
6. **Authed home recommendations without corpus:** logged in as admin, generated live recs
   (real `POST /api/recommendations` Claude call) — 10 recommendation cards rendered with
   real titles, **0 "External" badges**, all 10 feedback gates open (`resource?.id` resolved
   via the embedded `rec.resource` fallback), corpus still not fetched, 0 page errors.
   `r06-home-authed-recs.png`
7. `npx tsc --noEmit` clean.

## Payload effect

Nav payload is 14.8KB raw (with teasers) vs 3.1MB corpus — home cold-load no longer ships
the corpus at all (previously 294.1KB compressed on the wire per the audit).
