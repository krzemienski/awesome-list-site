---
name: Token parity by effective cascade
description: What a static CSS token/utility parity gate must model (resolved cascade incl. ordered layers, every occurrence, every sheet, a selector engine, in-gate canaries) so a one-line CSS edit cannot slip past it
---

# Token parity by effective cascade

**Rule 1 — diff resolved values, never raw blocks.** Design side = the design
stylesheet's bare `:root` overlaid with the per-system JS `vars` and the accent
pair (what its apply function paints inline). Runtime side = every html-level
declaration cascaded for that system × accent. Report one-sided tokens
separately (runtime extras are fine, missing design tokens fail).

**Rule 2 — model the browser's cascade, or the gate is bypassable.** Feed
every html-level declaration from every sheet the document loads into ONE
resolver ranked importance → inline → cascade-layer ORDER → specificity →
document order → position. Layers are an ordered list, not a bit: named
layers rank by first appearance across the whole document (statement, `@import
… layer()`, or block — vendor sheets reached through bare imports included),
each anonymous `@layer {}` is its own layer, a sublayer precedes its parent's
direct styles, unlayered is last; later layer wins for normal declarations,
EARLIER layer wins under `!important`, and an unlayered `!important` loses to
any layered one. Also: tracked tokens may be declared only by the canonical
html-level forms in the one owning file (custom properties inherit — a
descendant re-declaration repaints its subtree while `<html>` still resolves
the canonical value); media-scoped overrides are compared against values parsed
from the design's own media rules; document order comes from the real import
graph (index.html `<style>`, then the entry with each imported sheet spliced
in AT its `@import`'s position — an importer's `@layer x;` written above its
imports ranks before them, never after; "imports before importer" as a whole
is a bypass). Build the layer order from every declaration across the graph
and treat one first declared only inside a conditional group as unordered
(Chromium does not register a layer while its enclosing `@media` is false).
Model the document the app's pipeline builds, not raw css-syntax: a Tailwind
root inlines every `@import` where it sits (misplaced, nested, doubled ones
included), so model those sheets as loaded there and fail the position
separately — raw browsers drop them, so the two pipelines disagree.

**Rule 2b — utility shadows need an element model + selector engine.**
Selector-text matching misses `[class~="chip"]`, `:is(.chip)`, `span.chip`,
`.chip:not(.x)`, `:where(.chip){…!important}`. Model the element ("unknown
type, exactly these classes, no other attribute, unknown position"), decide per
selector part whether it WIDENS (drop type, foreign ancestors, siblings), can
NEVER match (id, other attribute, pseudo-element, html/body subject) or becomes
a CONDITION (state pseudo-classes, `:has()`), let a DOM `Element.matches` on a
fixture under `<html data-system data-accent>` decide, and cascade the winners
with the same ranking. Universal-subject rules only matter when they can
outrank a class rule (`!important`, or an anchored ancestor like `.no-anim *`).
Exclude only print-ONLY media lists; flatten CSS Nesting and decode hex escapes
first, because the browser does.

**Rule 3 — canaries live inside the gate and run every time.** Mutate
in-memory copies of the LIVE inputs (one bypass per case, plus PASS controls
where the browser paints the canonical value anyway) and fail the gate if any
escapes. Prove each cascade expectation in a real browser once (same CSS
strings, `getComputedStyle`) and keep that evidence — the gate's own opinion of
the cascade is not proof. External `/tmp` probe scripts rot; nobody re-runs
them after a parser change. Canaries that must rewrite the entry sheet or add
sheets go through an in-memory overlay (virtual files, never the tree); prove
them in the browser by serving the overlay on a routed synthetic origin,
compiled by the SAME compiler the app uses (a raw-served pass only shows
where css-syntax and the compiler disagree).

**Why:** the two sides put the same token in different places, so raw diffs
report bogus mismatches, and every shortcut short of browser semantics has a
one-line bypass — appended blocks, an `!important` root beating a canonical
system block, an attribute-selector shadow, and an earlier layer's `:where()
!important` beating a later layer's specific restore each passed a version of
the gate that stopped short.

**How to apply:**
- Parse shell geometry and responsive values from the design's rules and
  inline JSX styles rather than typing copies, so the gate follows a design
  update.
- Static fixtures loading the canonical stylesheet must mirror the design's
  inline apply step on `<html>` and add the box-sizing/margin reset the app
  gets from its preflight, or geometry/colour diffs appear that no user sees.
- A value kept different on purpose (e.g. an a11y-motivated alpha) is a
  documented deviation with a `holds()` proof that recomputes the reason; the
  gate fails when the sides converge or the proof stops holding.
- Every other reader of the same stylesheet (artifact/token generators) needs
  the same depth-aware "merge every top-level occurrence" read, or it projects
  a different root than the gate compares (a first-`}` regex merges
  media-nested `:root` values into the root).
- Rendering identical fixture markup under both stylesheets and diffing
  `getComputedStyle` per element at three widths is the cheap proof that
  utility classes match; the remaining diffs must be exactly the deviations.
