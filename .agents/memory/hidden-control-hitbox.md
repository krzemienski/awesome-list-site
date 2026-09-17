---
name: Reliable table action hitboxes
description: Why hidden table actions can pass screenshots and keyboard checks while failing real pointer clicks.
---

Rule: prefer permanently visible, normal-flow controls for consequential
table actions. Do not preserve hover-only prototype paint at the expense of
reliable pointer interaction.

**Why:** invisible absolute controls can cover their neighbours; revealing
them in flow can move a different action under the pointer. Even explicit
offsets, row-hover reveal and stacking fixes remained unreliable after a
dialog's Cancel restored focus. Keyboard activation and a resting screenshot
both concealed the failure. Normal-flow actions resolved the repeated
pointer-only failure without changing the underlying operation.

**How to apply:** reserve enough cell width for every action and use stable
touch targets. Verify normal pointer open → Cancel → move away → reopen,
not just one click or keyboard Enter. Keep the resulting reference difference
honest rather than concealing the usable control again.
