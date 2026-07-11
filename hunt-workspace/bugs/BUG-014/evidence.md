# BUG-014 — Top-bar on landing lists resource count as a button (clicking it does nothing useful)

**Severity:** LOW
**Affected page:** https://awesome.video/
**Affected viewport:** 1440, 768, 375

## Reproduction
1. Open https://awesome.video/ in a fresh chromium at 1440×900.
2. The top bar shows a button with text "Awesome Video 1,946 resources".
3. Click the button. Nothing visible happens — no route change, no modal,
no dropdown. The button is decorative / not actionable.

```js
const btn = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(b => /1,946 resources|1,946+ resources/.test(b.textContent || ''));
  return b ? { text: b.textContent.trim().slice(0, 80), type: b.type, role: b.getAttribute('role'), aria: b.getAttribute('aria-label') } : null;
});
```

## Expected
Either the button does something (e.g., opens a search input, navigates
to /categories), or it isn't a button at all — just a styled heading.
A button with no behavior is a clickable affordance that lies about
its capability and confuses screen-reader users.

## Actual
A button-shaped element in the top bar reads "Awesome Video 1,946
resources" and clicking it has no observable effect — the URL and the
DOM state are unchanged.

## Evidence
- `screenshots/topbar_button_inspect.png`
- `landing-1440-initial.png`
- textContent captured from `landing_search_check.png` rendering the
button at the top of the page
- heuristic inspect: topbar button doesn't change URL on click

## Fix prompt

```
Task: The top-bar on https://awesome.video/ shows a button-like element
with text "Awesome Video 1,946 resources" that does nothing on click.
EITHER:
  (a) Replace the <button> with a heading styled to look like a button
      (no clickability), OR
  (b) Wire the click to open a search input (preferred — also fixes BUG-004), OR
  (c) Route the click to /categories.

Reproduction: page.click on the button with text "Awesome Video 1,946
resources". URL stays https://awesome.video/, no DOM diff.

Acceptance: after fix, either the element is no longer a button, or
clicking it transitions the page (URL change or visible DOM diff).
```
