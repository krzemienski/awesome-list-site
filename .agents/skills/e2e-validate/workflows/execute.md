<objective>
Execute the validation plan step by step: start real systems, run real interactions, capture evidence, review every piece of evidence, and write PASS/FAIL verdicts per journey. This is where the Iron Rule is enforced — every validation uses real system execution.
</objective>

<required_reading>
- `e2e-evidence/validation-plan.md` (must exist)
- Platform-specific reference for execution patterns
</required_reading>

<process>
## Step 1: Initialize Evidence Directory

```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p e2e-evidence/{screenshots,responses,logs,output}
echo "Validation run: $TIMESTAMP" > e2e-evidence/run-metadata.txt
```

## Step 2: Prerequisites Check

Execute every prerequisite from the plan. ALL must pass before continuing:
- Tool availability (cargo, node, python, curl, jq, agent-browser, etc.)
- Database connectivity
- Environment variables
- Port availability (`lsof -i :$PORT`)

If ANY prerequisite fails, STOP and report what's missing. Do not proceed with partial setup.

## Step 3: Start Real Systems

Follow the dependency order: Database → Backend → Frontend

For each system:
1. Start the process (background if needed)
2. Capture the PID for cleanup
3. Poll health endpoint until ready (up to 60s)
4. Record health check evidence

```bash
# Track PIDs for cleanup
PIDS=()
trap 'for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null; done' EXIT
```

## Step 4: Execute Journeys

For each journey in the plan, in order:

### 4a. Announce
```
══════════════════════════════════════
  Journey [N]/[Total]: [Name]
══════════════════════════════════════
```

### 4b. Execute Steps
Follow the exact commands from the plan. For each step:
1. Run the command
2. Capture output to the specified evidence path
3. Check for errors immediately

### 4c. Capture Evidence
Every interaction produces evidence at the path specified in the plan:
- CLI: stdout/stderr to `.txt` files
- API: curl responses to `.json` files
- Web: screenshots to `.png` files
- iOS: screenshots + logs to evidence dir

### 4d. Review Evidence (THE CRITICAL STEP)
For EVERY piece of evidence captured:
1. **READ it** — use Read tool for screenshots, `cat` for text, `jq .` for JSON
2. **Compare to PASS criteria** — from the plan
3. **Note any discrepancy** — unexpected content, missing data, errors

### 4e. Write Verdict
```markdown
## Journey: [Name]
**Status:** PASS / FAIL
**Evidence:**
- [path]: [what it shows]
- [path]: [what it shows]
**PASS Criteria Met:**
- [x] [criterion] — verified in [evidence path]
- [ ] [criterion] — FAILED: [what was wrong]
**Notes:** [any observations]
```

Append verdict to `e2e-evidence/verdicts.md`.

## Step 5: Responsive Testing (Web/Fullstack only)

After all journeys, test key pages at mobile/tablet/desktop viewports:
```bash
for viewport in "375 812 mobile" "768 1024 tablet" "1440 900 desktop"; do
  W=$(echo $viewport | cut -d' ' -f1)
  H=$(echo $viewport | cut -d' ' -f2)
  NAME=$(echo $viewport | cut -d' ' -f3)
  agent-browser set viewport $W $H
  # Screenshot each key page at this viewport
done
```

## Step 6: Console/Error Check (Web only)

```bash
agent-browser console  # Check for JS errors
agent-browser errors   # Check for uncaught exceptions
```

Record all errors in `e2e-evidence/console-errors.txt`.

## Step 7: Cleanup

1. Stop all background processes (use PIDs from Step 3)
2. Close browser sessions
3. Stop iOS video recording (SIGINT, not kill -9)
4. Clear simulator status bar overrides

## Step 8: Summary

Generate summary in `e2e-evidence/summary.md`:
```markdown
# E2E Validation Summary
Run: [timestamp]
Platform: [type]

## Results
| Journey | Status | Evidence |
|---------|--------|----------|
| [name] | PASS/FAIL | [key evidence paths] |

## Totals
- Journeys tested: [N]
- PASS: [N]
- FAIL: [N]
- Evidence files: [N]
- Console errors: [N]

## Failed Journeys
[details for each failure]
```

If `--fix` flag is set and there are failures, proceed to fix-and-revalidate workflow.
If `--audit` flag is set, proceed to audit workflow.
</process>

<success_criteria>
- All prerequisites verified before execution
- All real systems started and healthy
- Every journey step executed with real system interaction
- Evidence captured for every step
- Every piece of evidence READ and reviewed (not just existence-checked)
- PASS/FAIL verdict written for every journey
- Summary generated with totals
- All processes cleaned up
- Zero mocks, zero stubs, zero test files
</success_criteria>
