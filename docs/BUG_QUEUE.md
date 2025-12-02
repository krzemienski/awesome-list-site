# Bug Queue - Parallel Execution

**Last Updated**: 2025-12-01 05:16
**Status**: Active (Session 10 - Systematic verification)

---

## Active Bugs

| ID | Severity | Description | Found By | Domain | Assigned To | Status |
|----|----------|-------------|----------|--------|-------------|--------|
| 1 | HIGH | User auth fixture tokens expired - blocks all user API tests | API Agent | Test Infra | API Agent | FIXED |
| 2 | HIGH | Bulk Tag Action - tagInput not passed to backend | Admin Agent | Admin UI | Coordinator | CLOSED (INVALID) |
| 3 | MEDIUM | UI Submissions tab not displaying user submissions | Coordinator | Frontend | - | OPEN |

---

## Bug Status Definitions

**OPEN**: Bug found, documented, not yet assigned
**ASSIGNED**: Bug assigned to agent, fix in progress
**FIXING**: Agent actively working on fix
**FIXED**: Fix implemented, needs verification
**VERIFIED**: Fix confirmed working, bug closed
**DEFERRED**: LOW priority, batched for later

---

## Priority Definitions

**HIGH**: Blocks testing, security vulnerability, data corruption, cascading failures
**MEDIUM**: Feature broken but doesn't block other testing
**LOW**: Polish, minor issues, can defer to future

---

## Instructions for Agents

**When you find a bug**:
1. Create bug report: docs/bugs/BUG_[DATE]_[AGENT]_[DESC].md
2. Add row to this table
3. If HIGH severity: Notify Coordinator immediately
4. Continue with next task (unless blocked)

**When assigned a bug**:
1. Read bug report
2. Implement fix
3. Request Docker rebuild from Coordinator
4. Re-test
5. Update status to FIXED
6. Commit fix

---

*This file is shared across all parallel agents for coordination*
