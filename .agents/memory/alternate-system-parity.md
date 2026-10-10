---
name: Alternate-system pixel parity
description: Durable cascade and harness lessons for per-system (terminal/geist/brutalist/swiss) parity against the frozen reference.
---
- Passing in Editorial does not mean the other systems pass. When app CSS restates an Editorial value (chip face, card border, card fill, button size) at specificity equal to or higher than the frozen skin, it silently beats the per-system `[data-system=X] .chip/.card/.btn` skins. Leave the property to the frozen cascade, or restate it inside `:where()` at base specificity.
- A 1px offset that accumulates per row in an alternate system is usually a hard-coded leading (`1.6`) where the reference inherits `--body-leading`, not sub-pixel rounding. Grep for literal line-heights first.
- Frozen literals stay literal across systems; don't map them to per-system tokens.
- Reference-side harness traps (each produced a convincing but false residual):
  - Projecting app rules as inline styles beats frozen per-system skins. Project them as a stylesheet, or defer to a more specific skin rule.
  - A projected token the reference never defines makes the declaration inherit.
  - Apply the target system before any tab click whose scroll depends on font widths.
  - Resize observers run during fullPage capture with a 0-width scroller.
- Header-band differences (44px floor box, tablet hamburger, Search label) dominate short pages at 375–1024. A reviewer will not accept them as "documented deviations" without explicit user sign-off.

**Why:** separating real skin defects from harness artefacts took many capture cycles.
**How to apply:** any parity work on a non-Editorial system, or edits to the reference projection adapters.
