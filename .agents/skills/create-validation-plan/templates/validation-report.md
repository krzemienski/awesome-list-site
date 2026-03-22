<template_instructions>
Copy and fill for `.planning/phases/XX-name/{phase}-{plan}-VALIDATION.md`. This report is the prerequisite for the NEXT phase's regression gate.
</template_instructions>

<template>
```markdown
# Phase {N}: {Name} Validation Report

Verdict: {PASS | FAIL}
Date: {timestamp}
Platform: {platform}

## Task Gates
| Gate | Verdict | Evidence | Finding |
|------|---------|----------|---------|
| VG-1 | {PASS/FAIL} | evidence/vg1-{desc}.{ext} | {one-line} |
| VG-2 | {PASS/FAIL} | evidence/vg2-{desc}.{ext} | {one-line} |

## Phase Gate
| Check | Verdict | Evidence |
|-------|---------|----------|
| Integration | {PASS/FAIL} | evidence/vg-phase-{desc}.{ext} |
| Regression | {PASS/FAIL/N/A} | evidence/vg-regress-{desc}.{ext} |

## Evidence Files
- evidence/vg1-{desc}.{ext}
- evidence/vg-phase-{desc}.{ext}
- evidence/gate-log.txt

## Failures
{If any: which gate, evidence showed what, expected vs actual}

## Mock Violations
{Should be empty. If not: what happened, how resolved}
```
</template>
