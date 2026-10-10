---
name: ESLint ratchet and Node-API count fidelity
description: How the lint gate is structured (correctness = 0 in app code, everything else ratcheted per file) and why the ESLint Node API needs single-run mode.
---

Lint is never globally green. Application correctness rules (hooks, floating/misused promises, core "problem" rules, unused directives) are held at 0. All other findings are frozen per file and per rule in a baseline that can only shrink.

**Why:** there are about 6.4k type-safety and style findings (no-unsafe-*, no-explicit-any, prefer-nullish-coalescing). Fixing them in bulk means rewriting code for style, which risks changing behaviour. Correctness rules hide real bugs: Express 4 hangs on a rejected async handler unless it is wrapped in asyncHandler.

**How to apply:**
- Run the lint-ratchet gate after any edit. If it reports a rise, fix the code rather than updating the baseline; update refuses rises anyway. After a cleanup, shrink the baseline in the same change.
- When the ESLint Node API is driven by typescript-eslint, set `TSESTREE_SINGLE_RUN=true` BEFORE importing eslint. Without it the parser uses a watch-mode Program that resolves some imports differently, and counts drift from the CLI (hundreds of phantom unsafe-* findings).
- A deliberate fire-and-forget promise in client handlers is `void`ed. A deliberately narrowed hook dependency list gets a per-line disable with a reason, because adding the dependency would re-fire on background refetch.
