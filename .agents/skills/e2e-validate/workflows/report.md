<objective>
Generate or regenerate a detailed markdown report from the latest validation run. Consolidates verdicts, evidence references, and statistics into a single exportable document.
</objective>

<required_reading>
- templates/e2e-report.md
</required_reading>

<process>
## Step 1: Locate Evidence

Check for existing validation data:
```bash
ls -la e2e-evidence/ 2>/dev/null
[ -f e2e-evidence/verdicts.md ] && echo "Verdicts: found"
[ -f e2e-evidence/summary.md ] && echo "Summary: found"
[ -f e2e-evidence/analysis.md ] && echo "Analysis: found"
[ -f e2e-evidence/validation-plan.md ] && echo "Plan: found"
```

If no evidence exists, inform the user they need to run `--execute` first.

## Step 2: Aggregate Data

Collect from all evidence files:
- Platform type and run timestamp
- Journey count, PASS count, FAIL count
- Per-journey verdicts with evidence paths
- Screenshot inventory
- Console error count
- Fix history (if --fix was run)

## Step 3: Generate Report

Write to `e2e-evidence/report.md` using the e2e-report template.

Count evidence files:
```bash
SCREENSHOTS=$(find e2e-evidence -name '*.png' | wc -l)
RESPONSES=$(find e2e-evidence -name '*.json' | wc -l)
LOGS=$(find e2e-evidence -name '*.txt' -o -name '*.log' | wc -l)
echo "Screenshots: $SCREENSHOTS, Responses: $RESPONSES, Logs: $LOGS"
```

## Step 4: Present

Display the report summary and inform the user the full report is at `e2e-evidence/report.md`.
</process>

<success_criteria>
- Report generated from real evidence (not fabricated)
- All journeys included with verdicts
- Evidence paths are valid references
- Statistics are accurate
- Report saved to e2e-evidence/report.md
</success_criteria>
