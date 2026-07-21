<objective>
Non-interactive validation mode for CI/CD pipelines. Runs the complete pipeline without approval gates, outputs structured results, and exits with appropriate exit code (0 for all PASS, 1 for any FAIL).
</objective>

<process>
## Pipeline (No Gates)

```
ANALYZE → PLAN → EXECUTE → REPORT → EXIT CODE
```

No approval prompts. No interactive questions. Fully automated.

## Step 1: Analyze
Execute [workflows/analyze.md](workflows/analyze.md) silently.

## Step 2: Plan
Execute [workflows/plan.md](workflows/plan.md) — skip approval gate.

## Step 3: Execute
Execute [workflows/execute.md](workflows/execute.md) — capture all evidence.

## Step 4: Report
Execute [workflows/report.md](workflows/report.md) — generate report file.

## Step 5: Structured Output

Output a machine-parseable summary:
```json
{
  "platform": "[type]",
  "timestamp": "[ISO8601]",
  "journeys_total": N,
  "journeys_pass": N,
  "journeys_fail": N,
  "evidence_dir": "e2e-evidence/",
  "report": "e2e-evidence/report.md",
  "failures": [
    {
      "journey": "[name]",
      "criteria": "[what failed]",
      "evidence": "[path]"
    }
  ]
}
```

Save to `e2e-evidence/ci-results.json`.

## Step 6: Exit Code

- All PASS → exit 0
- Any FAIL → exit 1

```bash
FAIL_COUNT=$(grep -c "FAIL" e2e-evidence/verdicts.md 2>/dev/null || echo "0")
[ "$FAIL_COUNT" -gt 0 ] && exit 1 || exit 0
```
</process>

<success_criteria>
- Zero interactive prompts
- Complete pipeline executed
- Structured JSON output generated
- Exit code reflects PASS/FAIL status
- All evidence preserved for debugging
</success_criteria>
