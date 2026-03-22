# Team Coordination Protocol — Shared Resource Management

## Resource Classification

### Exclusive Resources (Mutex Required)

| Resource | Constraint | How to Lock |
|----------|-----------|-------------|
| Simulator | ONE agent at a time | Task ownership — only task owner may interact |
| iOS codebase edits | Auto-build hook fires per edit | Task ownership — one editor at a time |
| Backend codebase edits | Separate build target | Task ownership — one editor at a time |
| Backend process | ONE instance on port | `lsof -i :PORT` check before starting |

### Parallel Resources (Unlimited)

| Resource | Safe Operations |
|----------|----------------|
| Code reading | Grep, Glob, Read on any file |
| Backend API calls | curl endpoints (read-only) |
| Evidence review | Read screenshot files |
| Inventory updates | Write to separate evidence files |

## Team Roles

### Lead (Orchestrator)
- Owns simulator mutex by default
- Creates and assigns tasks
- Applies code fixes (edits Swift/backend files)
- Reviews evidence before marking gates PASS
- Transfers simulator lock to validators via task assignment

### Explorer (Read-Only, Parallel)
- Runs Phase 1: codebase exploration
- Greps for views, interactions, endpoints
- Writes interaction inventory
- NEVER edits code, NEVER touches simulator
- Can run multiple explorers in parallel (different screen groups)

### Backend Validator (Parallel)
- Curls every registered backend endpoint
- Verifies response structure, status codes, data presence
- Cross-references with frontend API calls
- Flags mismatches (path, method, response shape)
- NEVER touches simulator, NEVER edits code

### Screen Validator (Sequential, Simulator-Locked)
- Receives simulator lock from lead via task assignment
- Navigates to assigned screen
- Exercises each interaction (tap, sheet, alert)
- Screenshots + READs every state
- Invokes `visual-inspection` skill per screenshot
- Returns simulator lock by completing task

## Communication Protocol

```
FINDING: When validator discovers a bug
  → Message lead with: screen, interaction, what failed, screenshot path
  → Lead diagnoses and fixes
  → Lead re-assigns screen validation task
  → Validator re-validates from scratch

BLOCKER: When validator cannot proceed
  → Message lead with: what's blocked, what was tried
  → Lead resolves (fix code, restart backend, reboot sim)
  → Lead re-assigns task

COMPLETION: When all tasks done
  → Lead reviews all evidence
  → Lead invokes gate-validation-discipline
  → Lead writes VERDICT.md
```

## Task Structure

One task per screen, structured as:

```
Subject: "Validate: [ScreenName]"
Description:
  Screen: [ScreenName]
  Navigation: [how to reach it — sidebar item, deep link, button]
  Interactions to exercise:
    1. [interaction] — expected result
    2. [interaction] — expected result
  Backend endpoints:
    - GET /api/v1/[path] — expected: [description]
  PASS criteria:
    - Screen renders with real data
    - Each interaction produces expected result
    - Backend returns valid responses
    - Visual inspection passes (no overflow, proper spacing, etc.)
```

## Remediation Loop

```
┌─── Validator finds FAIL ──────────────────────────────┐
│                                                        │
│  1. Validator documents: screenshot + description      │
│  2. Validator messages lead                            │
│  3. Lead diagnoses root cause                          │
│  4. Lead applies fix (code edit → auto-build)         │
│  5. Lead verifies build succeeds                       │
│  6. Lead re-assigns validation task                    │
│  7. Validator re-validates entire screen               │
│  8. If PASS → next screen. If FAIL → goto 1.         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Parallel Execution Windows

While simulator work is sequential, exploit parallel windows:

```
TIME  SIMULATOR (exclusive)    BACKEND VALIDATOR    EXPLORER
─────────────────────────────────────────────────────────────
T0    Screen 1 validation      curl /sessions       Read Views/Chat/
T1    Screen 1 screenshots     curl /projects       Read Views/Teams/
T2    Screen 2 navigation      curl /skills         Read Views/Settings/
T3    Screen 2 validation      curl /mcp            Write inventory
T4    Screen 2 screenshots     curl /plugins        (done)
T5    Lead: review evidence    curl /analytics
T6    Lead: fix Screen 1 bug  (done)
T7    Screen 1 re-validation
```

## Evidence Directory Convention

```
/tmp/{project}-audit-evidence/
├── inventory.md                    # Phase 1 output
├── backend-endpoints.md            # Backend validation results
├── screen-01-home.png              # Per-screen screenshots
├── screen-01-home-sheet.png        # Interaction screenshots
├── screen-02-chat.png
├── screen-02-chat-menu.png
├── screen-02-chat-fork-alert.png
├── ...
└── VERDICT.md                      # Phase 5 final report
```
