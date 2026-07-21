# E2E Validation Audit Report

Date: [TIMESTAMP]
Platform: [PLATFORM_TYPE]
Auditor: Claude (automated e2e-validate)
Mode: Read-only audit (no code modifications)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Journeys tested | [N] |
| PASS | [N] ([%]%) |
| FAIL | [N] ([%]%) |
| Critical issues | [N] |
| High issues | [N] |
| Medium issues | [N] |
| Low issues | [N] |
| Evidence files | [N] |

---

## Findings by Severity

### 🔴 Critical

**[FINDING_ID]. [Title]**
- **Journey:** [journey name]
- **Evidence:** `[evidence path]`
- **Description:** [what is wrong]
- **Impact:** [who is affected, how severely]
- **Root Cause:** [diagnosed cause]
- **Recommended Fix:** [specific code change at file:line]

---

### 🟠 High

[Same format as Critical]

---

### 🟡 Medium

[Same format as Critical]

---

### 🟢 Low

[Same format as Critical]

---

## Journey Details

### Journey [N]: [Name] — [PASS/FAIL]

**Steps Executed:**
1. [Step] — [result] — Evidence: `[path]`
2. [Step] — [result] — Evidence: `[path]`

**PASS Criteria:**
- [x/☐] [criterion] — [evidence reference]

---

## Recommendations (Priority Order)

1. **[Fix title]** — Severity: [level] — Effort: [low/medium/high]
   [Description of what to do and why]

2. ...

---

## Evidence Inventory

| Type | Count | Location |
|------|-------|----------|
| Screenshots | [N] | `e2e-evidence/screenshots/` |
| API Responses | [N] | `e2e-evidence/responses/` |
| Logs | [N] | `e2e-evidence/logs/` |
| CLI Output | [N] | `e2e-evidence/output/` |
