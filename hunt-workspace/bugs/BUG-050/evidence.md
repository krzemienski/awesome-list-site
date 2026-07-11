# BUG-050 — /journey/6/7/8/9/10 detail pages render only the sidebar — the journey narrative is empty

**Severity:** HIGH (visible-but-empty pages)
**Affected page:** https://awesome.video/journey/6, /7, /8, /9, /10

## Reproduction
The /journey/* detail pages each have a H2 list under "Learning Path"
but `mainResourceCount: 0` and `stepButtons: 0` — the journey body is a
list of section headings with no anchored resource cards or step
controls behind them.

```js
const main = document.querySelector('main');
main.querySelectorAll('a[href^="/resource/"]').length  // 0 on /journey/6..10
```

## Expected
Each journey section should contain 1+ /resource/* anchor pointing
to a curated resource. Step buttons (Next/Prev) should exist.

## Actual
The body is a table of contents with no links.

## Evidence
- `wider-bugs.json`, `journey6_deep = { mainAnchorCount: 18, mainResourceCount: 0, h2Count: 7, stepButtons: 0 }`
- `extra-probes.json` (same shape across 6/7/8/9/10)

## Fix prompt

```
Task: /journey/6..10 have section headings under "Learning Path" but
the sections contain no resource cards. The journey structure exists
but the content is missing.

Reproduction: load /journey/6, evaluate
  document.querySelector('main').querySelectorAll('a[href^="/resource/"]').length
Today = 0.

Acceptance:
1. Each journey section (under each H2) renders ≥1 /resource/* card.
2. Next/Prev step controls appear between sections.
3. Verifiable with the same locator.
```
