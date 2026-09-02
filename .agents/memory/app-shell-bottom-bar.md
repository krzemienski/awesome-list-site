---
name: App-shell bottom bar
description: How an app-level bottom bar reserves space in the shell column, and the two rules that keep it from covering the footer.
---

An app-level bottom bar (cookie/consent bar, install prompt, playback bar) reserves its
space **declaratively**: the app root is a flex column and the bar is a row of it —
in flow at the top on narrow viewports, `position: sticky; bottom: 0` above the
breakpoint. Never pad or restyle an element the bar does not own to make room for it.

**Why:** imperative reservation (inline `padding-bottom` on `body` / the footer's
container, inline `display` on the root) is invisible from the padded element's side, so
any later feature touching the same property silently fights it — and it measures the
bar before the framework commits a size change.

**How to apply:**
- Every other row of the shell column must FILL what the column leaves, never claim a
  viewport height of its own (`min-h-svh`, `h-[calc(100svh-...)]`, `100vh` page
  min-heights). A row claiming the whole viewport pushes the bar's row past the fold and
  the sticky bar is then pulled back over the end of that row — visible only at first
  paint, before any scrolling, so a check that scrolls to the document bottom first will
  pass while the bug is on screen. In-flow spacers for viewport-fixed UI must subtract
  the bar inset too.
- Only viewport-**fixed** UI and the global `scroll-margin-bottom` rule need the measured
  height. Publish it as ONE generic shell variable from the bar's own `ResizeObserver`
  (a `resize` listener alone measures before the re-render commits), so no consumer
  learns which bar is showing.
- Sticky survives `overflow-x: clip` on the html/body/root chain but NOT
  `hidden`/`auto`: those make the element a scrollport and silently break the bar's
  positioning, with no error anywhere.
- Print CSS must neutralise the column (`display: block`), or paged media inherits a
  viewport-height column.
