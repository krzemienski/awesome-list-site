# R5-021 — researcher/start zod-strict input validation

**Claim: fixed (code).** (MEDIUM)

researcher/start body is zod `.strict()` (no string coercion), maxBudgetUsd ≤100, prompt ≤4000
+ visible-text validated (routes.ts ~1221).
Repro (http1.out): researcher/start invalid -> 400; valid job still starts.
