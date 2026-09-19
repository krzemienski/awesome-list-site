---
name: Verbatim DS skill Stage 6 vs shadcn hook architecture
description: The frozen 11-stage skill's Stage 6 class-name predicate can never pass on this app; what to do instead of re-platforming controls.
---

**Rule:** The frozen `SKILL-verify-design-system.md` Stage 6 counts every `<button>` lacking a `btn*`/`tab*`/`icon-btn*` class (and every input lacking `.input`) as a 🟡 FIX. This app deliberately bridges shadcn/Radix/Clerk controls through `data-ds-variant`/`data-ds` hooks (replit.md divergence #4, enforced by the ds-button-sweep gate), so a verbatim-skill panel is always unanimous FAIL on Stage 6 (≈18–113 strays per screen) no matter how clean the rest is. Do not add marker classes to satisfy the predicate (gaming; unlayered `.btn` would also override Tailwind v4 geometry and break the gated 44px floor) and do not re-platform controls.

**Why:** three consecutive production panels reached PASS on Stages 1–5 and 7–11 with only Stage 6 outstanding; the residual is architectural, not a defect.

**How to apply:** when a mandate says "skill verbatim, unmodified", expect a FIX verdict, state the Stage 6 reasoning up front in the final report, and spend remediation on the other stages (Stage 3 literal inline `applyDesignSystem(...)` call in the head, Stage 5 tokens, Stage 9 font warm-up). The repo's own skill (`.agents/skills/verify-design-system`) recognises the hook contract.
