<objective>
Execute a complete validation run in READ-ONLY mode: capture all evidence, write all verdicts, but do NOT modify any source code. Produce a comprehensive audit report with findings, severity ratings, and recommended fixes. Useful for code review or pre-deployment validation.
</objective>

<required_reading>
- Platform-specific reference
- templates/audit-report.md
</required_reading>

<process>
## Step 1: Run Analysis + Plan + Execute

Execute the full pipeline (analyze → plan → execute) but with NO code changes:
- When a failure is found, document it but do NOT fix it
- Capture evidence of the failure state
- Continue with remaining journeys

## Step 2: Classify Findings

For each FAIL, classify severity:

| Severity | Definition | Example |
|----------|-----------|---------|
| **Critical** | App crashes, data loss, security breach | 500 errors, SQL injection, unhandled exceptions |
| **High** | Feature broken for all users | Login fails, form doesn't submit, incorrect data |
| **Medium** | Feature partially broken or UX issue | Layout broken on mobile, missing error message |
| **Low** | Minor cosmetic or edge case | Misaligned text, slow response on large dataset |

## Step 3: Generate Audit Report

Create `e2e-evidence/audit-report.md` using template:

```markdown
# E2E Validation Audit Report
Date: [timestamp]
Platform: [type]
Auditor: Claude (automated)

## Executive Summary
- Journeys tested: [N]
- PASS: [N] ([percentage]%)
- FAIL: [N] ([percentage]%)
- Critical issues: [N]
- High issues: [N]
- Medium issues: [N]
- Low issues: [N]

## Findings

### Critical
1. **[Finding title]**
   - Journey: [name]
   - Evidence: [path]
   - Description: [what's wrong]
   - Impact: [who is affected and how]
   - Recommended fix: [specific code change]
   - File: [path:line]

### High
...

### Medium
...

### Low
...

## Journey Details
[Per-journey breakdown with evidence references]

## Recommendations
1. [Priority fix with rationale]
2. ...
```

## Step 4: Output

Present audit summary. The full report is at `e2e-evidence/audit-report.md`.
</process>

<success_criteria>
- Complete validation run executed
- No source code modified
- Every failure documented with severity
- Evidence captured for all findings
- Audit report generated with actionable recommendations
</success_criteria>
