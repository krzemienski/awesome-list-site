---
name: Verifying focus/hover/active CSS states
description: How to reliably confirm interactive states render, and why getComputedStyle after programmatic focus lies.
---

# Verifying focus/hover/active CSS states (this repo's Vite + Tailwind v4 setup)

**Rule:** Confirm focus/hover/active styling with a REAL interaction + screenshot
(agent-browser `find testid "..." click|hover` then `screenshot`), not with
`el.focus()` + `getComputedStyle`.

**Why:**
- Programmatic `el.focus()` can report `el.matches(':focus-visible') === true` while
  the focus-visible *styles* read stale via `getComputedStyle` — and any property on
  a `transition`/`transition-all` element (e.g. border-color over `--motion-fast`
  ~160ms) returns the mid-transition START value if read immediately after focus.
  This made a working accent focus border look like it stayed at `--border-strong`.
- CSSOM is unreliable for proving "Tailwind didn't compile X": Vite injects the big
  Tailwind output as an inline `<style>` whose `sheet.cssRules` throws SecurityError
  (counts as "unreadable"), and cross-origin `<link>` font sheets are opaque too. So
  enumerating `document.styleSheets[].cssRules` can show "rule absent" when it exists.

**How to apply:**
- To check whether a utility/variant actually compiled, read the inline
  `<style>` text directly: `[...document.querySelectorAll('style')].map(s=>s.textContent).join('')`
  and substring-search (e.g. count `focus-visible`, `hover:bg-primary`, `ring-2`,
  `active:scale`). textContent bypasses the CSSOM cross-origin block.
- The agent-browser daemon is shared; concurrent task-merge HMR reloads navigate it
  between calls. Do open + wait + interact + screenshot atomically in ONE bash call.
- Semantic `find label/placeholder` was flaky here; `find testid "..."` is reliable.
- `inert` subtrees: element.tabIndex stays >= 0 under inert, so counting tabIndex is a false
  FAIL. Verify with a REAL `link.focus()` and assert document.activeElement !== link.
- Fractional `border-width` (e.g. 1.5px): Chrome's `getComputedStyle` returns the
  device-pixel-FLOORED used value, so 1.5px reads as "1px" — even with Playwright
  `deviceScaleFactor: 2`, and even for an INLINE `style="border:1.5px solid"` probe.
  You cannot measure fractional border widths through computed style. Prove the rule
  applied via a sibling declaration from the SAME rule (border-color, text-transform)
  plus an inline-probe baseline showing the measurement channel itself floors.

## Geometry diagnosis before repeated pixel captures

**Rule:** After a failed geometry correction, compare settled rectangles and
computed styles for both the container and its children, not just declarations.

**Why:** Matching parent styles can conceal child margins, inline formatting
line boxes, and native-button defaults that differ from a reset React control.
Repeated screenshot-driven nudges left cumulative vertical offsets unresolved;
matched-element measurements isolated them directly.

**How to apply:** Measure both sides on an unchanged checkout, include child
margins/font/line-height and effective padding, then fix the winning cascade.
Use full union screenshots to verify the coherent change, not to guess each
individual spacing adjustment.

**Rule:** Matching font files, size and weight is not sufficient when replacing
native buttons with links or custom controls; compare effective font-feature
and variation settings as well.

**Why:** Chromium's native-button font shorthand reset OpenType features to
normal, while reset-styled links inherited alternate body features. This
changed glyph shapes and wrapping despite otherwise matching typography.

**How to apply:** Probe both element types before changing spacing. Reset only
the proven equivalents; native div-based rows and explicit mono children may
correctly retain inherited features.
