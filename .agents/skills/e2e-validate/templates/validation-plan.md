# E2E Validation Plan

Generated: [TIMESTAMP]
Platform: [PLATFORM_TYPE]
Scope: [SCOPE or "Full application"]

## Prerequisites

| Prerequisite | Check Command | Status |
|-------------|--------------|--------|
| [Tool/Service] | `[check command]` | [ ] |
| [Database] | `[health check]` | [ ] |
| [Environment] | `[env check]` | [ ] |

## Startup Sequence

```bash
# 1. [First dependency]
[startup command]

# 2. [Second dependency]
[startup command]

# 3. [Application]
[startup command]
```

---

## Journey [N]: [Journey Name]

**PASS Criteria:**
- [ ] [Specific, observable, measurable criterion]
- [ ] [Specific, observable, measurable criterion]

**Steps:**

| Step | Action | Command | Evidence Path |
|------|--------|---------|--------------|
| 1 | [Description] | `[exact command]` | `e2e-evidence/[path]` |
| 2 | [Description] | `[exact command]` | `e2e-evidence/[path]` |

**Verification:**
```bash
# Verify criterion 1
[verification command]
# Expected: [expected output/behavior]

# Verify criterion 2
[verification command]
# Expected: [expected output/behavior]
```

**Database Check (if applicable):**
```bash
[database query to verify records]
```

---

## Responsive Testing (Web/Fullstack only)

| Viewport | Size | Pages to Test |
|----------|------|--------------|
| Mobile | 375×812 | [list] |
| Tablet | 768×1024 | [list] |
| Desktop | 1440×900 | [list] |

## Cleanup

```bash
[cleanup commands — kill processes, close sessions, clear overrides]
```
