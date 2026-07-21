---
name: gate-validation-discipline
description: >
  Use when marking any gate, task, checkpoint, or milestone as complete.
  Enforces strict evidence-based validation — personally examine every artifact,
  cite specific proof, match evidence to criteria before claiming done.
  Covers: verification loop, evidence standards, failure recovery, premature
  completion prevention, sub-agent evidence review.
  Keywords: gate, checkpoint, completion, evidence, validation, PASS/FAIL,
  verification, premature claim, citation, proof.
---

# Gate Validation Discipline

## The Verification Loop

When a sub-agent or worker completes work:

```
1. Sub-agent completes work
2. Sub-agent provides evidence LOCATION
3. YOU personally examine evidence CONTENT
4. YOU match evidence to validation criteria
5. YOU cite specific proof (file paths, line numbers, exact output)
6. ONLY THEN mark complete
```

Even when spawning parallel workers — workers provide evidence LOCATIONS, YOU verify evidence CONTENT. Never trust "X passed" without examining X.

## Anti-Patterns

| Bad Pattern | Correct Approach |
|-------------|------------------|
| "Agent reported 10/10 pass" | Read the actual test outputs |
| "Screenshot was captured" | View screenshot, describe what you SEE |
| "Build succeeded" | Quote the actual success output line |
| "All tasks complete" | Verify each criterion has evidence |
| "Gate 3 PASS" (no citations) | Cite: "Screenshot X shows Y at line Z" |

## Failure Recovery

If you realize you marked something complete prematurely:
1. Immediately acknowledge the error
2. Re-open the task/gate
3. Perform proper verification
4. Document what evidence was actually missing

## When In Doubt

Ask: "If someone challenged this completion claim, what specific evidence would I show them?"

If you can't answer with specific citations, **the task is NOT complete**.

## When NOT to Use

- Purely exploratory research or codebase scouting (no completion claim being made)
- Planning phases where no deliverable is being marked complete
- Code reading or analysis without a validation gate
- When the task explicitly says "draft" or "work in progress" (no completion claim)

## Conflicts

- `verification-before-completion` — Overlapping completion discipline. Use gate-validation-discipline for evidence-based multi-gate protocols with citation requirements. Use verification-before-completion for lightweight single-gate behavioral checks before claiming "done".
- `functional-validation` — Complementary: functional-validation defines WHAT to validate and HOW. Gate-validation-discipline defines WHEN (at every gate) and the evidence-citation standard. Use both together.

## Related Skills

- `functional-validation` — The Iron Rule and platform-specific validation protocols
- `verification-before-completion` — Behavioral pre-completion checks (complementary framing)
- `e2e-validate` — Execution engine that produces the evidence this skill verifies
- `no-mocking-validation-gates` — Prevents circumventing gates with mocks
- `full-functional-audit` — Systematic audit that uses this discipline at every gate
- `create-validation-plan` — Plans with embedded gates that require this discipline
