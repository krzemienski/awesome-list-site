# Resource page

A visitor, often landing from a search engine, reads one resource, opens its link (the primary action), and finds obvious next steps: related resources, the rest of the category, and its tags. Members can bookmark, favorite, suggest an edit or report a broken link.

## Sub-features

- RP-VIEW: title, category/subcategory chips, description, primary "Open on <host>" link (`button-visit`).
- RP-RELATED: related resources (`related-resource-<id>`) open `/resource/<id>`.
- RP-ONWARD: the rest of the category and tag links (`tag-link-<n>`) to `/tag/<slug>`.
- RP-ACTIONS: favorite, bookmark, share, suggest edit, report broken link.
- RP-LOAD: first load is stable (CLS ≤ 0.1, LCP ≤ 2.5 s) and the title names the page while loading.
- RP-404: `/resource/0`, `/resource/abc`, `/resource/999999999` render the shared not-found page.

## How to get to it (user POV)

- Direct landing (search traffic): `/resource/1` (hard load, fresh context).
- Clicking a card title on any listing, a palette result or a related item.
- The admin "Edit" button (`button-edit-admin`) appears only for admins.

## Driving it with chrome-devtools MCP

Preconditions: guest context; `/resource/1` exists ("MPEG Standards Documentation", tags in metadata); for member actions, a signed-in context on a throwaway clone.

- **Land cold.** `new_page` on `/resource/1` → `text-resource-title` reads the title; `button-visit` is the most prominent action; above the fold at each width you can see the onward links (related, category, tags) or a clear entry to them.
- **Related.** Click the first `related-resource-<id>` → URL `/resource/<id>`, new title; Back returns.
- **Category and tags.** Click the category chip or "rest of category" link → `/category/<slug>`; click a `tag-link-<n>` → `/tag/<slug>` with a heading and a count.
- **Report link.** Click `button-report-link` → `dialog-report-link`; guests get a sign-in path; members type a note in `input-report-link-note`, submit `button-submit-report-link` → `POST /api/resources/1/link-report` 2xx, toast `li[data-state]`.
- **Suggest edit right after a hard load (member).** Reload and click `button-suggest-edit` within 1 s → a "Checking your sign-in…" state, then the form; never the guest sign-in toast.
- **Speed.** `performance_start_trace {reload:true, autoStop:true}` at each width; read CLS and LCP from the insight output.
- **404s.** Open each RP-404 URL → the designed not-found page, no console errors.

## Gotchas

- Share in mobile emulation hands off to Web Share; no toast is expected.
- Related titles wrap to two lines at 390 by design (visitor change #4).
- A new layout must reserve space for late data or CLS regresses (`hidden-fallback-cls` history, `references/regression-watchlist.md` §1c).
- After piece A merges, update this file with the new onward-link and search-entry handles.
