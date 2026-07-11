# BUG-033 — /advanced placeholder "Search categories and resources..." is the only input and never updates results

**Severity:** MEDIUM (broken search affordance)
**Affected page:** https://awesome.video/advanced

## Reproduction
1. Open https://awesome.video/advanced in a fresh chromium at 1440×900.
2. The page has a single text input with placeholder "Search categories and resources...".
3. Submit the form (e.g., type "ffmpeg", press Enter).
4. The page does NOT re-render with filtered results. The URL stays at /advanced; the body still shows the same sidebar.
5. Page has zero `a[href^="/resource/"]` cards as a result — i.e., the input doesn't filter anything visible.

## Expected
Typing in /advanced's input and submitting should narrow the list to
matching resources/categories.

## Actual
The input exists but does not gate the visible body. The placeholder
promises something the page doesn't deliver.

## Evidence
- `quickprobe.json`, `advancedMeta.inputCount: 1`, `inputs[0].placeholder: 'Search categories and resources...'`, `resourceCards: 0`
- `screenshots/advanced_deep.png`

## Fix prompt

```
Task: https://awesome.video/advanced shows a search input with
placeholder "Search categories and resources…" but the page does not
update on submit (no resource/category cards filtered).

Reproduction: load /advanced, type "ffmpeg", press Enter. URL stays
/advanced. document.querySelectorAll('a[href^="/resource/"]').length
= 0 throughout.

Acceptance:
1. Typing in the input live-filters the visible category or resource
   cards (e.g., shows categories matching "ffmpeg").
2. Pressing Enter either submits to /advanced?q=… (server-side filter)
   or live-filters via JS.
3. Resulting list contains ≥1 matching item when the query is real.
4. Verifiable via Playwright with the same query.
```
