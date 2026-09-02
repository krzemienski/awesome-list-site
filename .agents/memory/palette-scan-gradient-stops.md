---
name: Palette scans miss gradient stops
description: The stage-5 palette-class regex only covers bg/text/border/ring/fill/stroke — gradient and other color-bearing utilities slip through.
---

The documented stage-5 palette scan (`(bg|text|border|ring|fill|stroke)-<hue>-<shade>`) does NOT match Tailwind's other color-bearing utilities: `from-*`, `via-*`, `to-*` (gradient stops), plus `divide-*`, `outline-*`, `decoration-*`, `shadow-*`, `accent-*`, `caret-*`, `placeholder-*`, `ring-offset-*`.

**Why:** A full palette migration verified "clean" by the documented regex was rejected in completion review because tier-badge gradients (`from-yellow-400 to-yellow-600`, …) survived untouched.

**How to apply:** Any raw-palette sweep or regression gate must extend the prefix alternation to at least `from|via|to|divide|outline|decoration|shadow|accent|caret|placeholder|ring-offset`. Also remember comments count: a code comment naming a palette class (e.g. "the old bg-blue-500 override") matches line-based scans — reword it.

## DS-OK tagging quirks (same gate)

The escape-hatch tag is a plain substring search with a fixed 5-line **lookback**, so a tag exempts only itself and the next 5 lines.

- Put the tag on the **LAST** line of a justification block comment. A tag opening a 4-line block silently leaves anything past the 5th line below it exposed — a 10-entry constant table needs a second tag mid-array (one every 5 entries).
- The prose of the justification is itself scanned. Naming the literals you are excusing ("mirrors #34d08c ok / #5eddf2 info") only stays clean while the tag is above them; move the tag down and the comment becomes the violation. Safest: describe the values by name, not by literal.
- All four VALUE detectors honor the tag: hex, rgb/rgba, raw radii/borders, and font-family. Raw palette classes are the only detector with no escape hatch (nothing to justify — a bridge utility always exists).
- Prefer converting a radius before tagging it: `var(--radius-pill)` on an element whose height equals twice the old raw radius is a pixel-identical swap, and `var(--border-w)` covers `border: 1px`. Tag only when converting would visibly change the result.
## Runtime-composed colors trip the rgb detector

Code that BUILDS a color string at runtime is scanned as source text, so a template literal of the form `rgb(` + interpolations + `)` matches the rgb detector and counts as a hardcoded literal — the `var(--…)` whitelist only spares matches whose body literally contains a custom-property ref, which an interpolated one does not.

**Why:** Resolving design tokens in JS (for a third-party widget that cannot read `var(--…)`) is the on-system fix, yet emitting the result in functional notation makes the gate call it drift.

**How to apply:** Have runtime color builders emit **hex** (`"#" + channel pairs`) instead of functional notation — `#${…}` matches no detector, so no DS-OK tag is needed. Regex literals that PARSE such notation are safe as written with an escaped paren (`rgba?\(`), because the detector needs an unescaped `(` right after the name.
