# R5-021 — researcher/start zod-strict input validation

**Claim: fixed (code).** (MEDIUM)

researcher/start rejects invalid/coerced input, visible-text validates the prompt, and
enforces the spec-mandated cost ceiling: maxBudgetUsd must be a number in [0.25, 100]
(server/routes.ts ~5590-5605); maxTurns an integer in [5,100]. Over-cap budgets return 400
instead of amplifying Claude cost.

Repro (fix-evidence-v3/_harness/http2c.out):
- researcher/start maxBudgetUsd=101 -> 400 "must be at most 100".
- researcher/start maxBudgetUsd=100 -> passes the budget check (no budget-400).
- researcher/start invalid body -> 400.
