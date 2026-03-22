---
name: create-validation-plan
description: Creates multi-phase project plans with functional validation gates that enforce real-system proof at every phase boundary. Use when asked to "plan a project", "create a phased plan", "plan with validation", or when planning anything that will be built and must actually work. Combines hierarchical planning (brief, roadmap, phase plans) with the Iron Rule — no mocks, no stubs, no test files.
---

<objective>
Create multi-phase project plans where every phase has blocking validation gates. Plans follow a hierarchy: BRIEF -> ROADMAP -> PLAN -> SUMMARY + VALIDATION. Each PLAN.md is the execution prompt containing tasks interleaved with gates. Between every phase there is a Phase Validation Gate — no phase transition occurs without evidence-based PASS.

Evidence compounds: Phase 2 prerequisites include proof that Phase 1 still passes. This catches regressions.
</objective>

<quick_start>
1. Create plan directory (use project convention: `plans/` if it exists, otherwise `.planning/`)
2. Write a BRIEF — vision + platform + validation strategy
3. Write a ROADMAP — phases with phase gate criteria
4. Generate PLAN.md for each phase — tasks + blocking gates
5. Execute plans, enforce gates, produce VALIDATION.md per phase

```
plans/{slug}/
├── BRIEF.md
├── ROADMAP.md
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   ├── 01-01-SUMMARY.md
    │   ├── 01-01-VALIDATION.md
    │   └── evidence/
    └── 02-auth/
        ├── 02-01-PLAN.md
        └── evidence/
```

Start by scanning current state:
```bash
PLAN_DIR="plans"
[ ! -d "$PLAN_DIR" ] && PLAN_DIR=".planning"
ls -la "$PLAN_DIR/" 2>/dev/null
find "$PLAN_DIR" -name "BRIEF.md" -o -name "ROADMAP.md" 2>/dev/null
find "$PLAN_DIR" -name "*-VALIDATION.md" 2>/dev/null
```
</quick_start>

<essential_principles>
**Plans are gated prompts.** PLAN.md IS the execution prompt. A plan without gates advances on hope; a gated plan advances on proof.

**Phase gates are blocking.** Between every phase is a gate validating the CUMULATIVE state — not just the last task, but everything the phase delivers.

**Evidence compounds.** Phase 2 prerequisites include proof Phase 1 passed. Phase 3 prerequisites include Phase 2 AND Phase 1. This catches regressions.

**Scope with gates.** Gates roughly DOUBLE plan size. Plan 2-3 tasks per plan (not 5-7). Better to have 12 small validated plans than 4 large unvalidated ones.

**Mock detection everywhere.** Every PLAN.md starts with the mock detection preamble.

**PASS criteria pre-defined.** Define criteria during PLANNING, never during execution.
</essential_principles>

<workflow_index>
| What you want | Workflow |
|---------------|----------|
| Start new project | [workflows/create-brief.md](workflows/create-brief.md) |
| Define phases with gate criteria | [workflows/create-roadmap.md](workflows/create-roadmap.md) |
| Create gated phase plan | [workflows/plan-phase.md](workflows/plan-phase.md) |
| Execute plan with gate enforcement | [workflows/execute-with-gates.md](workflows/execute-with-gates.md) |
| View validation status | [workflows/validation-report.md](workflows/validation-report.md) |
</workflow_index>

<reference_index>
All in `references/`:
- **gate-integration.md** — How gates embed in plans (task gates, phase gates, regression gates)
- **gate-patterns.md** — Platform-specific gate templates (iOS, CLI, API, Web, Full-Stack, Generic)
- **scope-with-gates.md** — Sizing plans that include gate overhead
</reference_index>

<template_index>
All in `templates/`:
- **gated-plan.md** — Phase plan with embedded validation gates
- **gated-roadmap.md** — Roadmap with phase gate criteria
- **validation-report.md** — Evidence report for phase completion
</template_index>

<script_index>
All in `scripts/`:
- **collect-evidence.sh** — Initialize evidence directory and gate log
- **validate-gate.sh** — Check gate evidence files exist and are non-empty
</script_index>

<success_criteria>
A well-executed validation plan:
- Every phase has specific, testable gate criteria defined in ROADMAP
- Every plan has 2-3 tasks with blocking validation gates
- Every gate has PASS criteria that are specific, observable, measurable
- Phase gates validate integrated result, not just individual tasks
- Regression gates verify previous phases still work (Phase 2+)
- Mock detection preamble in every PLAN.md
- Evidence saved to disk (not ephemeral) and reviewed (not just existence-checked)
- VALIDATION.md produced for each phase with gate verdicts

## Difference from `create-plans`
`create-plans` provides hierarchical planning (brief -> roadmap -> phase) without validation gates. This skill adds the gate layer: every phase boundary has blocking evidence requirements, regression checks, and mock detection. Use `create-plans` for lightweight planning; use this skill when the deliverable must provably work.

## Anti-Patterns

| Pattern | Why It's Wrong | Do This Instead |
|---------|---------------|-----------------|
| Defining gate criteria during execution | Confirmation bias — you'll define criteria that match what you already built | Define all PASS criteria during PLANNING phase |
| 5-7 tasks per plan with gates | Gates double plan size; agent runs out of context | 2-3 tasks per plan, more plans |
| Skipping regression gates in Phase 2+ | Phase 1 may silently break when Phase 2 changes things | Every phase re-validates all previous phases |
| Existence-checking evidence files | "File exists" proves nothing about content | READ and INSPECT evidence, cite specific proof |
| Plans without mock detection preamble | Agent may introduce mocks/stubs without realizing | Every PLAN.md starts with mock detection block |

## When NOT to Use

- Lightweight planning without validation requirements — use `create-plans` instead
- Single-phase tasks that don't need gated transitions
- Pure research or documentation tasks with no build artifact

## Conflicts

- `create-plans`: That skill provides ungated hierarchical planning; this skill adds the gate layer on top

## Related Skills
- `create-plans` — hierarchical planning without validation gates
- `gate-validation-discipline` — evidence-based completion verification at each gate
- `planning-with-files` — file-based working memory during plan execution
- `create-meta-prompts` — generate structured prompts for each plan phase
- `plans-kanban` — visualize validated phase progress in a dashboard
</success_criteria>
