---
name: Palette scans miss gradient stops
description: The stage-5 palette-class regex only covers bg/text/border/ring/fill/stroke — gradient and other color-bearing utilities slip through.
---

The documented stage-5 palette scan (`(bg|text|border|ring|fill|stroke)-<hue>-<shade>`) does NOT match Tailwind's other color-bearing utilities: `from-*`, `via-*`, `to-*` (gradient stops), plus `divide-*`, `outline-*`, `decoration-*`, `shadow-*`, `accent-*`, `caret-*`, `placeholder-*`, `ring-offset-*`.

**Why:** A full palette migration verified "clean" by the documented regex was rejected in completion review because tier-badge gradients (`from-yellow-400 to-yellow-600`, …) survived untouched.

**How to apply:** Any raw-palette sweep or regression gate must extend the prefix alternation to at least `from|via|to|divide|outline|decoration|shadow|accent|caret|placeholder|ring-offset`. Also remember comments count: a code comment naming a palette class (e.g. "the old bg-blue-500 override") matches line-based scans — reword it.
