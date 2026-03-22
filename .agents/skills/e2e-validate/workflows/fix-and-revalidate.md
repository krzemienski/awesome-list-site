<objective>
When validation fails, diagnose the root cause, fix the REAL code (never add test workarounds), and re-run the FULL validation to confirm the fix works and didn't break anything else.
</objective>

<required_reading>
- `e2e-evidence/verdicts.md` (must have FAIL entries)
- Platform-specific reference for debugging patterns
</required_reading>

<process>
## Step 1: Catalog Failures

Read `e2e-evidence/verdicts.md` and list all FAIL entries:
```
FAILURES:
1. Journey: [name] — [what failed] — [evidence path]
2. ...
```

## Step 2: Diagnose Root Cause (Per Failure)

For each failure, follow the bottom-up diagnosis:

| Layer | Check | Tool |
|-------|-------|------|
| Database | Records exist? Schema correct? | `psql`, `sqlite3`, `mongosh` |
| Backend | API returns correct data? Logs show errors? | `curl`, server logs |
| Frontend | Console errors? Wrong selector? | `agent-browser console`, screenshots |
| iOS | Crash reports? Log errors? | `.ips` files, `log show` |
| CLI | Exit code? stderr content? | Captured output files |

**Do NOT guess.** Read the evidence, check the logs, trace the error to a specific file and line.

## Step 3: Fix the Code

Make the correction in the REAL source code. Common fix patterns:

| Failure Type | Typical Fix |
|-------------|-------------|
| API returns wrong data | Fix query, serializer, or controller logic |
| UI shows wrong content | Fix component rendering, data binding, or state management |
| CLI outputs incorrectly | Fix processing logic or output formatting |
| Database record missing | Fix insert logic, check constraints, verify migrations |
| iOS screen blank | Fix SwiftUI view, data loading, or navigation |
| Auth failure | Fix token generation, validation, or middleware |

**NEVER:**
- Add a mock or stub to work around the failure
- Add a test mode or feature flag
- Create a test file to verify the fix
- Modify only the validation to match wrong behavior

## Step 4: Re-validate (FULL, not partial)

After fixing, re-run the ENTIRE validation — not just the failed journey.
Fixing one thing can break another. The ONLY way to know is full re-validation.

```
Re-run: workflows/execute.md with the same plan
```

This creates a new evidence set. Compare with the previous run.

## Step 5: Verify Fix

Check that:
1. Previously failing journey now PASSES
2. All previously passing journeys still PASS
3. No new failures introduced

If new failures appear, repeat from Step 2.

## Step 6: Document Fix

Append to `e2e-evidence/fixes.md`:
```markdown
## Fix: [Journey Name]
**Failure:** [what was wrong]
**Root Cause:** [diagnosis]
**Fix:** [file:line — what changed]
**Re-validation:** PASS — [evidence path]
```
</process>

<success_criteria>
- Every failure diagnosed with specific root cause
- Fixes applied to real code (not workarounds)
- Full re-validation passed
- No regressions introduced
- Fixes documented with evidence references
</success_criteria>
