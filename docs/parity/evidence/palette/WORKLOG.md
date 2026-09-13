# Canonical command palette — component delivery

## Scope and status

Implemented only the search dialog, its scoped stylesheet, the optional input
trailing slot in `command.tsx`, and the contact palette item. No header, backend,
frozen reference, aggregate inventory, or shared report was edited.

**Component implementation is ready for integration. Final pixel and regression
acceptance is NOT closed.** The results below must not be represented as a green
whole-page gate.

## Decisions / assumptions

- Keep Radix modality and cmdk listbox/keyboard behavior, rather than copying the
  reference's manually managed modal. The palette owns its overlay and styling.
- Use the assigned copy `Search resources, categories, pages…`, Pages /
  Categories / Resources groups, and `No results for “…”`. On 2026-09-13 the
  product owner explicitly approved this as the final content target and an
  intentional design deviation. The frozen
  `layout.jsx` instead says `Find resources, categories, or tags…`, displays
  `JUMP TO`, and has five categories plus four featured resources for empty
  input. Do not change the frozen source. Pixel review should classify those
  content pixels as an approved deviation; geometry, tokens, interaction and
  accessibility remain parity requirements.
- Empty app state displays live categories and pages, plus persisted recent
  searches when present. Query resources remain server-ranked, with the same
  normalized query, first-page cache key, limit 24, and top 15 display cap.
- Resources precede View all so plain Enter opens a resource, as requested.
  Existing production pinned View all first; this is an intended change.
- Contact variant **b** (and existing **e**, for compatibility) supplies
  **Get in touch** at the end of Pages. Unconfigured/disabled contact renders
  nothing. Form/destination handoff is unchanged. Enabled contact was reviewed
  in source, not exercised with a changed environment configuration.
- Input retains the application's global visible keyboard-focus outline.
  Geometry is canonical (640px max, 12vh top, 76vh height ceiling, 20px gutters).
  Escape is an accessible close button in the input row, not an overlapping
  absolute element. Meta/Ctrl-K closes from inside the palette without changing
  the shell's opening shortcut.
- The count's live region lives in the footer, outside cmdk's listbox:
  putting it inside the listbox triggers axe `aria-required-children`.

## Functional evidence

`functional-results.json` records real app checks at 375/768/1024/1440:

- `ffmpeg` returned live API rows; Enter opened `/resource/185214`.
- Encoding & Codecs selection opened `/category/encoding-codecs`.
- Gibberish displayed the explicit no-results state.
- Escape closes; two Control-K open/close cycles per width left no body
  pointer-events lock. Body scroll lock was present while open.
- Palette width was 335px at 375 and 640px at the other widths, with no
  horizontal overflow.

`focus.json` records return to the actual header trigger, arrow-key selection,
and Meta-K toggling. These behavior checks precede the final count/close-slot
presentation changes; final captures and axe were refreshed after those edits.

`final-axe.json`: **zero serious/critical findings** with populated `ffmpeg`
palette at 375 and 1440. Initial empty-state axe also returned zero at those
widths. Final screenshots for both query states at all four widths are under
`captures/final-*`. They are component/visual evidence, not passing pixel gates.

`palette-typecheck-final.log`: `npm run check` passed. `git diff --check` passed.

## Pixel comparison / integration handoff

First full selected-row run:
`tests/parity/baseline/2026-09-13T00-21-03-288Z-1418/`.

| Width | Differing pixels | Verdict |
| --- | ---: | --- |
| 375 | 39.7466% | FAIL |
| 768 | 28.3313% | FAIL |
| 1024 | 24.4410% | FAIL |
| 1440 | 29.2269% | FAIL |

The runner used Editorial × Crimson, pixelmatch threshold 0.1, full union
canvas, no masks/crops, and the unchanged 0.5% ceiling. Inputs stayed unchanged
during the run. All font-face sets matched. Whole-page heights differed and
reference/app backdrop-filter sets differed outside the palette as well.
Both palette overlays correctly supplied blur(4px).

This run predates the final input trailing-slot / mono-meta / count placement
adjustments. A second final-code run measured 375 at **39.7345% FAIL** then
waited 540 seconds for the recommendations limiter before 768. It was stopped
rather than treating an infrastructure wait as success. See
`palette-parity-final.log`. Only that run's disposable account was removed,
with exact local and Clerk absence verified in `cancelled-run-cleanup.json`.
Other workers' accounts were not swept.

Thus two passes were attempted and retained, but **no two-pass exception is
claimed** and the second full-width run is incomplete. Integration owns
background-shell/page-height closure, reconciliation of the explicit content
conflict above, and a fresh final full-union pixel run. `ffmpeg` remains
token-only evidence, never a pixel row.

## Other requested gates

Post-rebase completion validation update: the registered `search-typos` gate
**passed**, with 30/30 top-five hits and stable p75 81ms. This supersedes the
earlier local readiness failures below; those logs are retained as history.
Completion review rejected overall acceptance because the unresolved
component/reference conflict and pixel gate are still open. Collections and
cross-tab product-profile checks also timed out outside the palette surface.
Three palette literal warnings were resolved with reasoned DS-OK annotations
for the frozen scrim, row radius and keycap radius; no visual value changed.

- `test:e2e -- tests/e2e/search.spec.ts --project=chromium --workers=1
  --max-failures=2 --reporter=line`: **FAIL**, stopped at the first two
  home-discovery tests because `[data-testid^="card-category-"]` does not exist
  in this checkout. 25 tests did not run. The old palette assertions also name
  Cancel, placeholder-only initial content and link-wrapped results, none of
  which describes the current production component. The suite was not weakened
  or rewritten to manufacture a pass. See `palette-e2e.log`.
- `validate:search-typos`: **infrastructure blocked twice**, including a
  standalone retry after the first parity run finished. Server could not
  provide five <=100ms readiness responses within 90 seconds. No recall or
  latency PASS is claimed; backend/ranking code was untouched.
- Production `/search?q=ffmpeg` baseline comparison: 200, same redirects,
  title and h1; zero serious/critical axe at 375/1440. Tracked differences are
  data-dependent resource/testid/count changes and existing response-shape
  differences (production baseline 3,824 resources versus local 1,816).
  See `search-production-comparison.json`. No search-page code was changed.

## Production palette / compatibility

Live public production URL was obtained from deployment information:
`https://awesome.video`. Read-only empty and `ffmpeg` captures at 375/1440 are
under `captures/production-*`; no publishing or production writes occurred.
Intended changes: compact canonical modal instead of title/description chrome,
grouped discovery instead of placeholder-only state, mono metadata, resource
first selection, and footer count/hints.

Production and app retain:
`search-loading`, `search-result-count`, `search-view-all`,
`search-result-0` through `search-result-14`,
`button-clear-recent-searches`, `recent-search-0` through `recent-search-4`,
and conditional `contact-palette-item`.
Added `search-error` and `search-no-results`; no existing testid removed.

Analytics diff: same `trackSearch(trimmed, total, "search_palette")` effect and
same `trackResourceClick(title, url, category || "")` call. Only the query
result variable was renamed; no events, consent behavior or backend changed.

## Integration instructions

The palette imports `client/src/styles/shell/palette.css` itself; no shared CSS
import wiring is necessary. Preserve the optional `trailing` CommandInput prop
when merging. Do not overwrite another worker's shell stylesheet.

Use `inventory-fragment.json` as proposed state metadata only; do not overwrite
aggregate inventories. Existing downstream integration/final regression tasks
cover the handoffs, so no duplicate follow-up task is proposed.