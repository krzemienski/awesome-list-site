---
name: transform-validation-prompt
description: |
  Transform prompts to embed functional validation gates with evidence-based PASS/FAIL criteria.
  Use when: creating/refining prompts that must produce verifiably working outputs, adding gates to prompts, making prompts testable.
  Covers: validation gate injection, mock detection preamble, PASS criteria design, evidence capture, gate manifests.
  Keywords: validation, gate, prompt, transform, evidence, pass, fail, mock detection, blocking gate
---

## When NOT to Use

- Prompts for creative writing, brainstorming, or ideation (validation gates add unnecessary friction to generative tasks)
- One-off questions or conversational prompts (gates are for multi-step execution, not Q&A)
- Prompts that already have comprehensive validation built in (avoid double-gating)
- Tasks where the output is inherently subjective (design review, tone evaluation)

## Anti-Patterns

| NEVER | WHY | Fix |
|-------|-----|-----|
| Use vague PASS criteria like "it works" or "no errors" | Absence of errors is not evidence of correctness; "works" is untestable | Define specific, observable criteria: "curl returns JSON with `id` field and HTTP 201" |
| Skip the mock detection preamble | Without it, executors default to creating test files and mocks instead of fixing the real system | Always inject `<mock_detection_protocol>` block at the top of every transformed prompt |
| Make gates non-blocking (advisory only) | Advisory gates get skipped under time pressure; broken steps propagate to downstream tasks | All gates must be BLOCKING: no advancement on FAIL |
| Omit evidence file capture (`tee` to files) | Ephemeral terminal output can't be reviewed after the fact; claims become unverifiable | Always `tee` output to `evidence/vg{N}-{desc}.{ext}` files |

## Conflicts

- **`create-validation-plan`**: Creates structured validation plans. This skill transforms existing prompts to embed gates. Complementary: plan first, then transform.
- **`functional-validation`**: The runtime protocol that executes what this skill creates. This skill writes the gates; `functional-validation` runs them.
- **`gate-validation-discipline`**: Evidence review discipline. This skill creates the gate structure; `gate-validation-discipline` enforces the review rigor.

<objective>
Take any prompt — raw text, existing instruction set, task description, or file path — and transform it so every discrete task has a blocking validation gate. Each gate captures real-system evidence, reviews it against pre-defined PASS criteria, and prevents advancement on FAIL.

The transformed prompt enforces the Iron Rule: if the real system doesn't work, fix the real system. Never create mocks, stubs, test doubles, or test files.
</objective>

<quick_start>
**Before (ungated):**
```
Create a REST API endpoint for user registration. Verify it works.
```

**After (gated):**
```
<mock_detection_protocol>
Creating .test.*, mock libraries, in-memory DBs, TEST_MODE flags → STOP. Fix the REAL system.
</mock_detection_protocol>

<task id="1">
Create POST /api/users/register accepting {email, password}. Hash with bcrypt, insert into users table, return user object without password field.
Files: src/routes/register.ts
</task>

<validation_gate id="VG-1" blocking="true">
Prerequisites: pg_isready returns 0 | npm start & | poll curl -sf localhost:3000/health until 200
Execute: curl -s -X POST localhost:3000/api/users/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"Secure123!"}' | tee evidence/vg1-response.json | jq .
Pass criteria: HTTP 201 | non-empty "id" | matching "email" | NO "password" field | duplicate → 409
Review: cat evidence/vg1-response.json | jq -e '.id and .email'
Verdict: PASS → proceed | FAIL → fix endpoint → re-run
Mock guard: IF tempted to mock → STOP → fix real system
</validation_gate>

<gate_manifest>
Total gates: 1 | All BLOCKING | Evidence: evidence/
</gate_manifest>
```

The gate is BLOCKING. Nothing after VG-1 executes until evidence proves PASS.
</quick_start>

<essential_principles>
**Iron Rule:** If the real system doesn't work, fix the real system. No mocks, stubs, test doubles, or test files. No exceptions.

**Evidence over assertion:** "It works" is NOT evidence. Evidence is a screenshot showing specific UI state, a curl response with specific JSON fields, or CLI output with specific strings.

**PASS criteria first:** Define criteria BEFORE writing gates. Good criteria are specific, observable, measurable. Bad criteria: "it works", "no errors", "looks good."

**No advancement on FAIL:** Gates are BLOCKING. Task → Execute → Capture Evidence → Review → PASS → Next Task. On FAIL, fix real system and re-run.

**Mock detection embedded:** Every transformed prompt starts with mock detection preamble that halts execution if mock patterns are detected.
</essential_principles>

<workflow>
Follow these steps to transform any input.

**Step 1: Analyze the input.** Parse to extract: objective, platform (see detection table), discrete tasks, ungated assumptions (where "it works" is assumed without proof), and dependencies (databases, servers, services). Load matching platform patterns from [references/gate-patterns.md](references/gate-patterns.md).

| Signal | Platform | Evidence Tool |
|--------|----------|---------------|
| `.xcodeproj`, SwiftUI, UIKit | iOS/macOS | `xcrun simctl io booted screenshot` |
| `Cargo.toml`, `go.mod`, binary | CLI | `./binary 2>&1 \| tee output.txt` |
| REST routes, API, curl, HTTP | API | `curl -s \| tee response.json \| jq .` |
| React, Vue, Svelte, Playwright | Web | `page.screenshot()` |
| Frontend + backend together | Full-Stack | Bottom-up: DB → API → Frontend |
| None detected | Generic | Command output + file checks |

**Step 2: Inject mock detection preamble** at TOP of transformed prompt:
```
<mock_detection_protocol>
Before executing any task, check intent:
- Creating .test.*, _test.*, *Tests.*, test_* files → STOP
- Importing mock libraries (nock, sinon, jest.mock, unittest.mock) → STOP
- Creating in-memory databases (SQLite :memory:, H2) → STOP
- Adding TEST_MODE or NODE_ENV=test flags → STOP
- Rendering components in isolation (Testing Library, Storybook) → STOP
Fix the REAL system instead. No exceptions.
</mock_detection_protocol>
```

**Step 3: Define PASS criteria per task** — BEFORE writing gates.

Good criteria (specific, observable, measurable):
- "curl returns JSON with `total` > 0 and `items` array non-empty"
- "Screenshot shows dashboard with 3 widget cards containing data"
- "CLI exits 0 and stdout contains `Processed 150 files in`"

Bad criteria — REJECT and rewrite:
- "It works" → What specifically? What do you SEE?
- "No errors" → Absence of errors ≠ correctness
- "Tests pass" → Which tests? Mocked?

**Step 4: Inject validation gates** after each task:
```
<validation_gate id="VG-{N}" blocking="true">
Prerequisites: [Start dependencies + health check — poll, don't guess timing]
Execute: [Real system interaction — save output to evidence/ files]
Capture: [Commands with tee to evidence/vg{N}-{desc}.{ext}]
Pass criteria: [From Step 3 — specific, measurable, pre-defined]
Review: [READ evidence: Read tool for images, cat for text, jq for JSON]
Verdict: PASS → next task | FAIL → fix real system → re-run from prerequisites
Mock guard: IF tempted to mock → STOP → fix real system → re-run
</validation_gate>
```

**Step 5: Append gate manifest** at END:
```
<gate_manifest>
Total gates: {N}
Sequence: VG-1 → VG-2 → ... → VG-N
All gates: BLOCKING (no advancement on FAIL)
Evidence: evidence/
If ANY gate FAILS: Fix real system → re-run from FAILED gate → do NOT skip
</gate_manifest>
```

**Step 6: Present** the transformed prompt with summary: tasks identified, gates injected, platform detected, mock detection embedded, manifest appended.
</workflow>

<reference_index>
All in `references/`:

- **gate-patterns.md** — Platform-specific validation gate templates for iOS, CLI, API, Web, Full-Stack, and Generic platforms

## Related Skills

- `functional-validation` — real-system validation protocol that the transformed prompts enforce
- `gate-validation-discipline` — evidence-based completion verification embedded in every gate
- `no-mocking-validation-gates` — Iron Rule against mocks injected as mock_detection_protocol
- `e2e-validate` — end-to-end validation skill that executes the gates this skill creates
- `create-validation-plan` — structured validation planning that precedes gate injection
- `verification-before-completion` — verification mandate that validation gates operationalize
- `preflight` — pre-execution checklist to confirm prerequisites before gates run
</reference_index>

<success_criteria>
Transformed prompt is complete when:
- Mock detection preamble at the top
- Every task has at least one validation gate
- Every gate has prerequisites (dependencies started + healthy)
- Every gate has PASS criteria (specific, observable, measurable — defined before execution)
- Every gate captures evidence to files (not ephemeral)
- Every gate reviews evidence (READ it, not just check file exists)
- Every gate has mock_guard
- Gate manifest at the bottom
- No vague criteria ("it works", "looks good", "no errors")
- Platform-appropriate evidence methods used
</success_criteria>
