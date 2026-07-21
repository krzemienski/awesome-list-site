# E2E Validation Report

Run: [TIMESTAMP]
Platform: [PLATFORM_TYPE]
Mode: [full-run / audit / ci]
Duration: [total time]

---

## Results Summary

```
Journeys: [PASS_COUNT] PASS / [FAIL_COUNT] FAIL / [TOTAL] total
Evidence: [SCREENSHOT_COUNT] screenshots, [RESPONSE_COUNT] responses, [LOG_COUNT] logs
Fixes:    [FIX_COUNT] applied during run
```

| Journey | Status | Key Evidence |
|---------|--------|-------------|
| [name] | ✅ PASS | `[evidence path]` |
| [name] | ❌ FAIL | `[evidence path]` — [brief reason] |

---

## Per-Journey Breakdown

### Journey [N]: [Name] — [PASS/FAIL]

**PASS Criteria:**
- [✅/❌] [criterion]
- [✅/❌] [criterion]

**Steps:**
1. [Action] — [result]
   - Evidence: `[path]`
2. [Action] — [result]
   - Evidence: `[path]`

**Database Verification:**
- [query] → [result] — [PASS/FAIL]

**Notes:** [observations, timing, edge cases]

---

## Issues Found

### Fixed During Testing
| # | Description | File:Line | Fix Applied |
|---|------------|-----------|-------------|
| 1 | [description] | [file:line] | [what changed] |

### Remaining Issues
| # | Description | Severity | File:Line |
|---|------------|----------|-----------|
| 1 | [description] | [critical/high/medium/low] | [file:line] |

---

## Risk Assessment

[Observations from code analysis — potential bugs, security concerns, performance issues]

---

## Evidence Index

All evidence saved to: `e2e-evidence/`

```
e2e-evidence/
├── analysis.md
├── validation-plan.md
├── verdicts.md
├── summary.md
├── report.md
├── screenshots/
│   ├── [journey-name]/
│   │   ├── 01-[step].png
│   │   └── ...
├── responses/
│   ├── [endpoint].json
│   └── ...
├── logs/
│   ├── server.log
│   └── ...
└── output/
    ├── [command].txt
    └── ...
```
