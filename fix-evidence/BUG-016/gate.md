# VG-016 — BUG-016 (LOW): Filter/tab/sort changes use replaceState, Back skips them

## Root cause
Every in-page URL sync for filter, tab, and sort state wrote `history.replaceState`, so no in-page change ever created a history entry — pressing Back immediately exited the page. None of these surfaces listened to `popstate` either, so even a manually crafted history walk would not have updated the UI. (The 3 taxonomy pages — Category/Subcategory/SubSubcategory — already had a correct push+popstate implementation from an earlier run; they were not the offenders.)

## Fix
New shared helper `client/src/lib/url-filter-state.ts`:
- `writeFilterParams(updates, mode)` — merges params, **pushState** by default (replace available for continuous input), with a no-op guard so identical URLs never stack duplicate entries.
- `usePopstateParams(handler)` — Back/Forward subscription that re-reads the query into React state (handler only sets state, never writes history — no loop).

Wired on all six offending surfaces:
| Surface | State | Mode |
|---|---|---|
| Home `/` | `?tags=`, `?sort=` | push + popstate |
| Advanced `/advanced` | `?tab=` | push + popstate |
| Advanced explorer | `?sort=` push; `?q=` **replace** (keystrokes must not flood history) | push/replace + popstate |
| Categories `/categories` | `?sort=` | push + popstate |
| Journeys `/journeys` | `?category=` | push + popstate |
| Bookmarks `/bookmarks` | `?sort=` | push + popstate |

Intentionally unchanged (documented replaceState): Search `?page=` (loop-guarded pagination write, not filter/tab/sort), Login `?error=` strip, Home `?welcome=1` strip, taxonomy-page canonical normalization.

## Live evidence (dev, real browser — 13/13 PASS)
- **Tabs** (/advanced): Explorer→Metrics→Export clicks push `?tab=`; Back #1 → Metrics tab visibly active; Back #2 → Explorer, still on page; Forward → Metrics restored.
- **Sort** (/categories): name-desc→count-desc pushes; Back #1 → `?sort=name-desc`, trigger reads "Name (Z–A)", first card actually changes (standards-industry); Back #2 → default order (community-events first), still on page; Forward → name-desc order restored.
- **Filter** (/journeys): Encoding & Codecs→General Tools pushes; Back #1 → first filter visible in trigger + URL; Back #2 → All Categories, still on page; Forward → filter restored.
- **Exit behavior**: from / → /advanced → tab change: Back unwinds the tab first (`/advanced`), only the next Back exits to `/`.

Screenshots: `bug016-a-back-metrics.png`, `bug016-b-back-namedesc.png`, `bug016-c-back-filter.png`.

## Checks
- tsc --noEmit: clean.
- Note: first gate run had 2 FAILs that were assertion-encoding bugs in the test itself (`encodeURIComponent` spaces `%20` vs URLSearchParams `+`); fixed the assertion to use the app's encoder and re-ran — behavior was correct throughout.

**Verdict: PASS**
