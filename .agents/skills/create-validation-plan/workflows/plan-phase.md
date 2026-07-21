<overview>
Create a gated phase plan. Read [references/gate-integration.md](../references/gate-integration.md), [references/gate-patterns.md](../references/gate-patterns.md), and [templates/gated-plan.md](../templates/gated-plan.md) before proceeding.
</overview>

<steps>
**Step 1: Load context.**
```bash
cat .planning/BRIEF.md
cat .planning/ROADMAP.md
```
Identify which phase, its gate criteria from roadmap, platform from brief. If not Phase 1, verify previous VALIDATION.md shows PASS.

**Step 2: Break into tasks.** 2-3 tasks max. For each task define: what to build (specific files), action (implementation), and PASS criteria for the task gate. Define criteria NOW, not during execution.

**Step 3: Define task gates.** For each task, create a validation gate using platform patterns from [references/gate-patterns.md](../references/gate-patterns.md):
```
<validation_gate id="VG-{N}" blocking="true">
Prerequisites: [dependencies running + healthy]
Execute: [real system interaction]
Capture: [save to evidence/vg{N}-{desc}.{ext}]
Pass criteria: [specific, measurable — from Step 2]
Review: [READ evidence, compare against criteria]
Verdict: PASS → next task | FAIL → fix → re-run
Mock guard: IF tempted to mock → STOP → fix real system
</validation_gate>
```

**Step 4: Define phase gate.** After all tasks, create the Phase Validation Gate validating the INTEGRATED result. Pass criteria copied exactly from ROADMAP.md. Include regression check for Phase 2+.

**Step 5: Assemble plan.** Use [templates/gated-plan.md](../templates/gated-plan.md): mock detection → tasks with gates → phase gate → gate manifest. Create evidence directory: `mkdir -p .planning/phases/{phase}/evidence`

**Step 6: Present plan.** Show to user with gate summary: count, evidence methods, "No task advances without proof."
</steps>

<done_when>
- Previous phase validated (if not Phase 1)
- 2-3 tasks with actions and file paths
- Every task has a gate with PASS criteria
- Phase gate with integrated criteria from roadmap
- Regression check included (if Phase 2+)
- Mock detection preamble embedded
- Evidence directory created
- Plan saved to `.planning/phases/{phase}/{plan}-PLAN.md`
</done_when>
