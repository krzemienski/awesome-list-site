<template_instructions>
Copy and fill for `.planning/phases/XX-name/{phase}-{plan}-PLAN.md`
</template_instructions>

<template>
```markdown
# Phase {N} Plan {M}: {Title}

Platform: {ios|cli|api|web|full-stack|generic}

<mock_detection_protocol>
Before executing any task: creating .test.*, mock libraries, in-memory DBs, TEST_MODE → STOP. Fix the REAL system.
</mock_detection_protocol>

<plan_objective>
{What this plan accomplishes — from roadmap phase goal}
</plan_objective>

<plan_context>
- .planning/BRIEF.md
- .planning/ROADMAP.md
- {Previous VALIDATION.md if Phase 2+}
- {Relevant source files}
</plan_context>

{If Phase 2+:}
<regression_gate id="VG-REGRESS" blocking="true">
Re-run previous phase gate criteria. PASS → proceed | FAIL → fix regression first.
</regression_gate>

<task id="1">
Name: {name}
Files: {paths}
Action: {specific implementation}
Done: {acceptance criteria}
</task>

<validation_gate id="VG-1" blocking="true">
Prerequisites: {dependencies + health checks}
Execute: {real system interaction}
Capture: {evidence/vg1-{desc}.{ext}}
Pass criteria: {specific, measurable}
Review: {READ evidence against criteria}
Verdict: PASS → next | FAIL → fix → re-run
Mock guard: No mocks. Fix real system.
</validation_gate>

<task id="2">
{...}
</task>

<validation_gate id="VG-2" blocking="true">
{...}
</validation_gate>

{If LAST plan in phase:}
<phase_gate id="VG-PHASE-{N}" blocking="true">
Description: Phase {N} delivers: "{objective from roadmap}"
Prerequisites: All task gates PASS
Integration evidence: {end-to-end validation}
Pass criteria: {from ROADMAP.md — copied exactly}
Verdict: PASS → SUMMARY + VALIDATION | FAIL → fix → re-validate
</phase_gate>

<gate_manifest>
Total gates: {N} | Sequence: VG-1 → VG-2 → VG-PHASE | All BLOCKING | Evidence: evidence/
</gate_manifest>
```
</template>

<checklist>
- Mock detection preamble at top
- 2-3 tasks with specific file paths and actions
- One gate per task (minimum)
- Phase gate if last plan in phase
- All PASS criteria specific, observable, measurable
- Gate manifest at bottom
</checklist>
