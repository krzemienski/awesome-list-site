<overview>
Gates add overhead. This reference helps size plans correctly.
</overview>

<context_budget>
Gates roughly DOUBLE plan size. A task is ~10-15 lines; its gate adds ~15-25 lines. Phase gate adds ~25-35 lines. Mock preamble adds ~12 lines. Manifest adds ~15 lines.

| Tasks | Gates | Phase Gate | Est. Lines | Context % |
|-------|-------|------------|------------|-----------|
| 2 | 2 VGs | 1 PG | ~120-150 | ~25-30% |
| 3 | 3 VGs | 1 PG | ~170-210 | ~35-40% |
| 4+ | 4+ VGs | 1 PG | ~280+ | ~55%+ ⚠️ |

**Sweet spot: 2-3 tasks per plan.** Leaves ~50-60% context for execution.
</context_budget>

<splitting_strategy>
Phase has >3 tasks → split into multiple 2-3 task plans.

Naming: `{phase}-{plan}-PLAN.md` (e.g. `01-01-PLAN.md`, `01-02-PLAN.md`)

Phase gate goes in the LAST plan of the phase only. Previous plans have task gates only.
</splitting_strategy>

<evidence_overhead>
Evidence files live on disk, not in context. Only gate instructions consume tokens. Keep evidence naming consistent: `evidence/vg{N}-{desc}.{ext}`
</evidence_overhead>
