# Search

A visitor finds resources from anywhere: the header search pill, ⌘K/Ctrl+K, or the `/` key opens the command palette with live results and category rows; "View all" goes to the `/search` page with sort, facets and pagination.

## Sub-features

- SR-PALETTE: palette opens from the header pill, ⌘K/Ctrl+K and `/` (when focus is not in a field).
- SR-RESULTS: typing shows `search-result-<n>`, `search-result-count`; Enter opens the highlighted row.
- SR-EMPTY: zero results show "No results" plus category rows (`search-no-results`).
- SR-PAGE: `/search?q=` with `input-search-page`, `select-search-sort`, `search-results-grid`, `text-result-count`.
- SR-OFFLINE: offline shows an offline card with Try again (`search-offline`), never "no results".

## How to get to it (user POV)

- Header pill (button "Search resources"; icon-only below 520px).
- Keyboard ⌘K / Ctrl+K, or `/`.
- Home search field `input-home-search`.
- Direct URL `/search?q=ffmpeg`.

## Driving it with chrome-devtools MCP

Preconditions: guest context, consent decided. Local data has 155 resources tagged `ffmpeg`.

- **Open.** At each width click the header search control → the palette input (aria "Search resources, categories, and pages") is focused. Close with Escape; `press_key "Meta+K"` reopens it; Escape; focus the page body and `press_key "/"` opens it.
- **Results.** Type `ffmpeg` with `type_text` → `search-result-0` appears and `search-result-count` > 0; ArrowDown, Enter → `/resource/<id>`.
- **View all.** Reopen, type `ffmpeg`, click `search-view-all` → `/search?q=ffmpeg`, `text-result-count` > 0; change `select-search-sort` → URL gains the sort and order changes.
- **Empty.** Type `zzqxv` → `search-no-results` with category rows; Enter on a category row opens `/category/<slug>`.
- **Fast typing.** On `/search`, type `hls player` quickly → the input keeps all characters and focus.
- **Offline.** `emulate {networkConditions:"Offline"}` on `/search`, type a new term → offline card; clear the emulation → results resume.

## Gotchas

- ArrowDown pressed before debounced results land resets the highlight; wait about 1.5 s after typing.
- Only one row may look highlighted with the mouse resting over another row (fixed bug N-08).
- `?q=` containing markup is scrubbed before boot and a notice explains it; that is not a silent fallback.
- After piece A merges, add the resource-page and listing search entries and their `open_method` values here.
