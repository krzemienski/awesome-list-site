---
name: Parity harness and frozen-table lessons
description: Non-obvious rules learned matching the app against the frozen prototype (pixel harness, auto tables, gate element model, run dirs).
---

- **Forced stacking ≠ flex-wrap.** The frozen `TableShell`/panel heads only `flex-wrap`; a
  ≤48rem `width: 100%` on the actions row stacks at exactly 768 where the reference keeps one
  row. Several admin tabs failed 768 on that single rule while passing 375 (where the wrap
  happens naturally on both sides).
- **Pinned column shares are not the cause of auto-table drift when content differs.** Users
  tab: removing pins made 1024/1440 worse; the real delta was a PII toggle button + masked
  emails changing min/max-content per column. Diagnose the content first, then the CSS.
- **Diffscan alt colour**: use a magenta separator/scale in pair images so the diff hue never
  reads as accent ink.
- **canonical-token-parity drops type selectors** in its element model: `select:not(.select)`
  relaxes to `:not(.select)` and "matches" every canonical class → gate fails on canaries. Use
  a typed element rule + a class-level restore of the design literal instead of `:not()` guards.
- **Run reports flag `Inputs changed during run: YES — stale`** whenever live adapter data moves
  mid-capture; such runs locate defects but cannot be cited as exact-candidate proof.
- **/tmp is not durable across container recycles** — helper scripts and logs vanish.
- Reference-side residual: admin overview at 375 overflows to 400px (`minmax(360px,1fr)`).
