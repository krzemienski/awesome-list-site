---
name: ios-validation-gate
description: |
  Enforce three-facet validation (simulator + backend + analysis) before any iOS task completion.
  Use when: marking any iOS implementation task as complete, verifying iOS feature works end-to-end, validating after code changes
  Covers: simulator build/launch/screenshot, backend health/endpoint verification, log correlation analysis, evidence storage
  Keywords: ios-validation, simulator, xcodebuild, gate-protocol, evidence-based-completion
---

## APPLICABILITY GUARD

This skill is for **iOS project task completion validation** using three mandatory gates (Simulator + Backend + Analysis). Activates before marking any iOS implementation task done. Do not apply to web, Android, or non-iOS backend-only tasks.

# iOS Validation Gate

**This skill is a mandatory enforcement protocol.** It activates automatically whenever you are about to mark any iOS implementation task as complete, done, finished, or PASS. You CANNOT skip this. You CANNOT claim completion without passing all three gates.

## Project Configuration

Before using this skill, set these values from your project context. Do NOT use hardcoded defaults without verifying they match your project.

```bash
# REQUIRED — set per project (detect from .xcodeproj, Info.plist, or CLAUDE.md)
UDID="${IOS_SIMULATOR_UDID}"         # e.g., $UDID
BUNDLE_ID="${IOS_BUNDLE_ID}"         # e.g., $BUNDLE_ID
BACKEND_PORT="${IOS_BACKEND_PORT:-9090}"
WORKSPACE="${IOS_WORKSPACE}"         # e.g., MyApp.xcworkspace
SCHEME="${IOS_SCHEME}"               # e.g., ILSApp

# Auto-detect if not set
[ -z "$UDID" ] && UDID=$(xcrun simctl list devices booted -j | python3 -c "import sys,json; d=json.load(sys.stdin); print(next(u['udid'] for r in d['devices'].values() for u in r if u['state']=='Booted'))" 2>/dev/null)
[ -z "$WORKSPACE" ] && WORKSPACE=$(find . -maxdepth 2 -name "*.xcworkspace" | head -1)
[ -z "$BUNDLE_ID" ] && BUNDLE_ID=$(grep -r "PRODUCT_BUNDLE_IDENTIFIER" *.xcodeproj/project.pbxproj 2>/dev/null | head -1 | sed 's/.*= //' | tr -d '";')
```

## When This Skill Applies

This skill applies to ANY task that involves:
- Building or modifying iOS app code (SwiftUI views, view models, services)
- Adding or changing backend endpoints
- Implementing new features or fixing bugs
- Any spec task, phase checkpoint, or acceptance criteria verification

This skill does NOT apply to:
- Pure research/planning tasks
- Documentation-only changes
- Configuration file edits (CLAUDE.md, settings, etc.)
- Non-iOS projects (use `e2e-validate` or `functional-validation` instead)

## The Three Validation Gates

Every task completion requires ALL THREE gates to PASS. Failure of ANY gate means the task is NOT DONE.

```
┌─────────────────────────────────────────────────────────┐
│                 VALIDATION GATE PROTOCOL                │
│                                                         │
│  Gate 1: SIMULATOR ──► Screenshot + Read + Accessibility│
│  Gate 2: BACKEND   ──► Health + Endpoint Verification   │
│  Gate 3: ANALYSIS  ──► Logs + Screenshot + Behavior     │
│                                                         │
│  ALL THREE must PASS. No exceptions. No shortcuts.      │
└─────────────────────────────────────────────────────────┘
```

---

## Gate 1: Simulator Validation

**Purpose:** Prove the iOS app builds, runs, and displays the expected UI.

### Steps

1. **Build the app** (skip if no code changes since last build):
   ```bash
   xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" \
     -sdk iphonesimulator -configuration Debug \
     -destination "id=$UDID" -quiet build
   ```
   - Build MUST succeed with zero errors
   - Note any warnings (acceptable but document them)

2. **Install and launch** on the dedicated simulator:
   - Simulator UDID: `$UDID` (detect via Project Configuration above)
   - **NEVER use any other simulator** than the configured one
   - Bundle ID: `$BUNDLE_ID`

3. **Wait for UI to settle** (3 seconds minimum after launch/navigation)

4. **Take screenshot** using `simulator_screenshot`

5. **READ the screenshot** — you MUST visually inspect the PNG file using the Read tool. Taking a screenshot without reading it is a VIOLATION.

6. **Run accessibility tree** using `idb_describe` with `operation:all`
   - This provides exact element coordinates in 440x956 logical points
   - Use these coordinates for any navigation taps

7. **Navigate to the relevant screen** if the task involves a specific view:
   - Use `idb_tap` with coordinates from the accessibility tree
   - Wait 2 seconds after each navigation action
   - Take another screenshot and READ it

### Gate 1 PASS Criteria
- [ ] Build succeeded (zero errors)
- [ ] App launched on correct simulator
- [ ] Screenshot captured AND read (visually inspected)
- [ ] Expected screen/UI elements are visible
- [ ] No crash indicators, blank screens, or error states (unless testing error handling)

### Gate 1 FAIL Conditions
- Build errors → FIX THE CODE, do not mark done
- App crashes on launch → CHECK crash logs, fix, rebuild
- Screenshot shows wrong screen → NAVIGATE correctly and re-verify
- Screenshot not read → YOU MUST READ IT, no exceptions

---

## Gate 2: Backend Validation

**Purpose:** Prove the backend is running and serving correct data.

### Steps

1. **Check backend health**:
   ```bash
   curl -sf http://localhost:$BACKEND_PORT/health
   ```
   - If not running, start the backend using your project's start command
   - Poll until healthy (max 30 seconds)

2. **Verify relevant endpoints** based on what the task touches:
   ```bash
   # Example: verify key endpoints return valid data
   curl -s http://localhost:$BACKEND_PORT/api/v1/<resource> | jq length
   ```
   - Replace `<resource>` with the endpoints your task modifies
   - Verify response structure matches expected DTOs

3. **For tasks that add/modify endpoints**, verify the specific endpoint:
   - Make a real HTTP request
   - Confirm response structure matches expected DTOs
   - Confirm status codes are correct

### Gate 2 PASS Criteria
- [ ] Backend health endpoint returns 200
- [ ] Relevant endpoints return valid data (not empty errors)
- [ ] If task added/modified an endpoint, that specific endpoint works
- [ ] Port 9090 confirmed (NOT 8080)

### Gate 2 FAIL Conditions
- Backend won't start → CHECK build errors, fix backend code
- Endpoint returns error → FIX the endpoint, do not mark done
- Wrong port → USE 9090, never 8080

---

## Gate 3: Analysis Validation

**Purpose:** Correlate frontend behavior, backend behavior, and logs to prove the feature works end-to-end.

### Steps

1. **Collect frontend logs** (choose best method for the situation):

   **Method A — App log file (simplest, always works):**
   ```bash
   APP_CONTAINER=$(xcrun simctl get_app_container \
     $UDID $BUNDLE_ID data)
   tail -30 "$APP_CONTAINER/Documents/ils-app.log"
   ```

   **Method B — Unified log with subsystem filter (more detailed):**
   ```bash
   xcrun simctl spawn $UDID log show \
     --predicate 'subsystem == "$BUNDLE_ID"' \
     --last 60s --info --debug --style compact 2>/dev/null
   ```

   **Method C — Structured JSON output (for programmatic parsing):**
   ```bash
   xcrun simctl spawn $UDID log show \
     --predicate 'subsystem == "$BUNDLE_ID"' \
     --last 60s --info --debug --style ndjson 2>/dev/null
   ```

   **Method D — Real-time streaming (for timing-sensitive features):**
   ```bash
   xcrun simctl spawn $UDID log stream \
     --predicate 'subsystem == "$BUNDLE_ID"' \
     --info --debug --style compact > /tmp/ils-stream.log 2>&1 &
   STREAM_PID=$!
   # ... perform the action ...
   sleep 5
   kill $STREAM_PID 2>/dev/null
   cat /tmp/ils-stream.log
   ```

2. **Collect backend logs** (check terminal output from `swift run ILSBackend`)

3. **Check for crash reports** (if app crashed or behaved unexpectedly):
   ```bash
   ls -t ~/Library/Logs/DiagnosticReports/ILSApp-*.ips 2>/dev/null | head -3
   ```

4. **Correlate and analyze** all three data sources:
   - Screenshot shows expected UI state
   - Frontend logs show expected API calls and state transitions
   - Backend logs show expected request handling
   - No error-level log entries (unless testing error paths)
   - No crash reports newer than the test start time

5. **Document the analysis** — write a brief summary:
   ```
   GATE 3 ANALYSIS:
   - Screenshot: [what it shows]
   - Frontend logs: [key log entries, any errors]
   - Backend logs: [request handling, any errors]
   - Crash reports: [none / details]
   - Correlation: [do all three sources agree on expected behavior?]
   - Verdict: PASS / FAIL [reason]
   ```

### Gate 3 PASS Criteria
- [ ] Frontend logs collected and reviewed (no unexpected errors)
- [ ] Backend response verified for the feature being tested
- [ ] Screenshot, frontend logs, and backend all tell consistent story
- [ ] No crash reports from the test period
- [ ] Analysis summary documented

### Gate 3 FAIL Conditions
- Frontend logs show errors → INVESTIGATE and fix
- Backend returns errors for the tested feature → FIX backend
- Screenshot contradicts log state → INVESTIGATE discrepancy
- Crash report found → ANALYZE crash, fix root cause
- Logs not collected → YOU MUST COLLECT THEM

---

## Evidence Storage

All validation evidence MUST be saved to the spec evidence directory:

```
specs/<current-spec>/evidence/
```

**Naming convention:**
- Screenshots: `<task-id>-<description>.png` (e.g., `cs1-chat-response.png`)
- Log captures: `<task-id>-<description>-logs.txt` (e.g., `cs1-frontend-logs.txt`)
- Curl output: `<task-id>-<description>-curl.txt` (e.g., `cs1-backend-curl.txt`)

If no spec is active, use: `specs/validation-evidence/`

---

## Enforcement Rules

### ABSOLUTE RULES (Cannot be overridden)

1. **No task is DONE without all three gates passing.** Period.
2. **Screenshots MUST be READ.** Taking a screenshot without viewing it is a violation.
3. **Logs MUST be COLLECTED.** Claiming "the app works" without log evidence is a violation.
4. **Backend MUST be VERIFIED.** Assuming the backend is running without checking is a violation.
5. **Analysis MUST correlate all three sources.** Checking them independently without correlation is insufficient.

### WHEN TO RE-RUN VALIDATION

- After ANY code change that could affect the feature
- After fixing a Gate failure
- If more than 10 minutes have passed since last validation (state may have changed)

### SHORTCUT FOR MINOR CHANGES

For trivial changes (typo fix, comment update, non-functional change):
- Gate 1: Build must succeed (screenshot optional if UI unchanged)
- Gate 2: Health check only (endpoint verification optional if backend unchanged)
- Gate 3: Log check for errors only (full analysis optional)

Even for shortcuts, you MUST explicitly state: "Applying minor-change shortcut: [reason]"

### FAILURE PROTOCOL

When any gate fails:
1. **STOP** — Do not mark the task as done
2. **DIAGNOSE** — Use the collected evidence to identify the root cause
3. **FIX** — Make the necessary code changes
4. **RE-VALIDATE** — Run ALL three gates again from the beginning
5. **Only then** mark the task as complete

---

## Quick Reference

### Simulator Details
| Property | Value |
|----------|-------|
| UDID | `$UDID` (auto-detect or set per project) |
| Device | Detected from booted simulator |
| Bundle ID | `$BUNDLE_ID` (from .xcodeproj or Info.plist) |

### Backend Details
| Property | Value |
|----------|-------|
| Port | `$BACKEND_PORT` (default: 9090) |
| Health | `http://localhost:$BACKEND_PORT/health` |
| Start command | Project-specific (set in Project Configuration) |

### Log Collection Commands
| Method | Command |
|--------|---------|
| App log file | `tail -30 "$(xcrun simctl get_app_container $UDID $BUNDLE_ID data)/Documents/app.log"` |
| Unified log (last 60s) | `xcrun simctl spawn $UDID log show --predicate 'subsystem == "$BUNDLE_ID"' --last 60s --info --debug --style compact 2>/dev/null` |
| JSON log output | `xcrun simctl spawn $UDID log show --predicate 'subsystem == "$BUNDLE_ID"' --last 60s --info --debug --style ndjson 2>/dev/null` |
| Crash reports | `ls -t ~/Library/Logs/DiagnosticReports/*.ips 2>/dev/null \| head -3` |

### Key Lessons
- `--info --debug` flags are MANDATORY on log commands or Info-level messages are hidden
- The `getpwuid_r` warning on log commands is harmless -- ignore it
- Swift `print()` is NOT captured by unified logging -- use subsystem filter
- App container UUID changes on reinstall -- always use `xcrun simctl get_app_container`
- `idb_describe` provides reliable coordinates; pixel-guessing from screenshots does not

## Anti-Patterns

| Pattern | Why It's Wrong | Do This Instead |
|---------|---------------|-----------------|
| Taking screenshot without reading it | Evidence exists but was never inspected; bugs slip through unchecked | Always READ the screenshot with the Read tool and describe what you see |
| Claiming "app works" without collecting logs | No evidence trail; intermittent errors and warnings go undetected | Collect frontend logs, backend logs, and crash reports every time |
| Checking gates independently without correlation | Each gate passes alone but they tell contradictory stories (e.g., UI shows success, logs show error) | Gate 3 explicitly correlates all three sources before issuing PASS |
| Using wrong simulator UDID or port | Validates against wrong environment; real app may be broken | Always auto-detect or verify UDID/port from project configuration |
| Skipping re-validation after fixing a gate failure | The fix itself may have introduced new issues in other gates | Re-run ALL THREE gates from scratch after any code change |

## When NOT to Use

- Pure research/planning tasks with no code changes
- Documentation-only changes — no build or runtime behavior to validate
- Non-iOS projects — use `e2e-validate` or `functional-validation` instead

## Conflicts

- `gate-validation-discipline`: That skill provides general evidence-based completion enforcement; this skill specializes it for iOS with simulator/backend/log-specific gates
- `functional-validation`: That skill covers cross-platform UI validation; this skill adds iOS-specific gates (Xcode build, simctl, unified logging)
- `ios-validation-runner`: That skill implements the detailed evidence collection protocol; this skill defines the gate criteria that protocol must satisfy

## Related Skills

- `ios-validation-runner` — implements the detailed five-phase evidence collection protocol that satisfies this gate
- `ios-simulator-control` — provides simulator automation commands for Gate 1 (Simulator)
- `ios-ui-automation` — provides UI interaction automation for navigating to tested screens
- `ios-swift-expert` — native iOS development expertise for fixing failures found by the gate
- `gate-validation-discipline` — general evidence-based completion enforcement that this iOS gate specializes
