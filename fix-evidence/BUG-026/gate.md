# VG-026 — BUG-026 (LOW) — ?view= stripped after being honored

**Verdict: PASS (15/15)** — July 20, 2026, live dev app (`http://localhost:5000`), Playwright Chromium @1280px.

## Fix
`?view=grid|list|compact` was never read on load, and the taxonomy pages' URL-sync effect rebuilt the query string from scratch, stripping any `?view=` on the first sync. Now:

- `client/src/components/ui/view-mode-toggle.tsx` — exported `isLayoutViewMode()` guard for validating the URL value.
- `client/src/pages/Category.tsx`, `Subcategory.tsx`, `SubSubcategory.tsx`:
  - `viewMode` initializes from a valid `?view=` first, falling back to the saved `awesome-list-view-mode` preference, then `grid`.
  - A `viewParamExplicitRef` tracks whether the view is URL-explicit (arrived via `?view=` or the user toggled). Only then does the URL-sync effect write `?view=` back — plain visits stay clean (no unsolicited param).
  - Toggling pushes a history entry (viewMode added to the push snapshot + effect deps), so Back/Forward step through view changes.
  - The popstate handlers restore the layout view carried by each history entry.
  - On Category, `?view=general` (the no-subcategory bucket flag) keeps precedence over layout modes, unchanged.

`tsc --noEmit` clean.

## Gate checks (all PASS)
| Check | Result |
|---|---|
| Category: each of `?view=grid/list/compact` honored on load AND retained in URL | active toggle + URL match for all 3 |
| Category: toggling writes `?view=list` then `?view=grid` | URL updates per click |
| Category: reload preserves `?view=grid` | URL + active toggle = grid |
| Category: Back restores `?view=list`; Forward restores `?view=grid` | both URL + active toggle |
| Category: `?view=general` still honored and retained | url=general |
| Subcategory (`encoding-transcoding-guides`): `?view=list` honored + retained; toggle writes `?view=compact`; reload preserves | all pass |
| Sub-subcategory (`hevc`): `?view=compact` honored + retained; toggle writes `?view=list` | both pass |
| No unsolicited `?view=` written on a plain visit | url param absent |

## Evidence
Screenshots: `bug026-category-toggled.png`, `bug026-subcategory.png`, `bug026-subsubcategory.png` (this directory).
