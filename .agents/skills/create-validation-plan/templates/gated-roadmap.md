<template_instructions>
Copy and fill for `.planning/ROADMAP.md`
</template_instructions>

<template>
```markdown
# {Project Name} Roadmap

Platform: {platform} | Validation: evidence-based PASS at every phase | Mock policy: zero tolerance

## Phase 1: {Name}
Objective: {specific, testable}
Plans: ~{N} plans of 2-3 tasks

Phase Gate Criteria:
- {Specific evidence check — e.g., "curl POST /api/health returns 200 with db:connected"}
- {Integration check — e.g., "register → login → access protected route succeeds"}

Regression: N/A (first phase)

## Phase 2: {Name}
Objective: {specific, testable}
Plans: ~{N} plans of 2-3 tasks

Phase Gate Criteria:
- {criteria}

Regression: Phase 1 gate criteria still passing

## Status
| Phase | Status | Gate | Evidence |
|-------|--------|------|----------|
| 01 | ○ Not started | — | — |
| 02 | ○ Not started | — | — |

Legend: ○ Not started | ◐ In progress | ✓ Validated | ✗ Failed
```
</template>

<criteria_guidance>
Gate criteria must be specific, observable, measurable, and pre-defined. Never vague ("it works") or dependent on mocks ("tests pass").
</criteria_guidance>
