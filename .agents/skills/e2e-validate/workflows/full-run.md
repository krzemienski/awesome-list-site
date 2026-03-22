<objective>
The default end-to-end validation pipeline: Analyze → Plan → Approve → Execute → Report.
This workflow orchestrates all other workflows in sequence with an approval gate between planning and execution.
</objective>

<process>
## Pipeline

```
ANALYZE → PLAN → [APPROVAL GATE] → EXECUTE → REPORT
                                         ↓ (if failures + --fix)
                                    FIX → RE-EXECUTE → REPORT
```

## Step 1: Analyze
Execute [workflows/analyze.md](workflows/analyze.md)
- Detect platform
- Map all journeys
- Identify risks

## Step 2: Plan
Execute [workflows/plan.md](workflows/plan.md)
- Generate validation plan with PASS criteria
- Define exact commands and evidence paths

## Step 3: Approval Gate
Present the plan to the user:

```
╔═══════════════════════════════════════════════════════╗
║  E2E Validation Plan Ready                            ║
╠═══════════════════════════════════════════════════════╣
║  Platform:    [detected type]                         ║
║  Journeys:    [count]                                 ║
║  Steps:       [count]                                 ║
║  Estimated:   [time estimate]                         ║
╠═══════════════════════════════════════════════════════╣
║  Plan saved to: e2e-evidence/validation-plan.md       ║
║                                                       ║
║  Proceed with execution? (yes/no)                     ║
╚═══════════════════════════════════════════════════════╝
```

Wait for user approval. If denied, stop here — the analysis and plan are still saved.

## Step 4: Execute
Execute [workflows/execute.md](workflows/execute.md)
- Start real systems
- Run all journeys
- Capture evidence
- Write verdicts

## Step 5: Handle Results

**If all PASS:**
- Generate report via [workflows/report.md](workflows/report.md)
- Present success summary

**If any FAIL and `--fix` is set:**
- Execute [workflows/fix-and-revalidate.md](workflows/fix-and-revalidate.md)
- After fixes, generate report

**If any FAIL and `--fix` is NOT set:**
- Generate report with failures documented
- Present failure summary with recommended fixes

## Step 6: Report
Execute [workflows/report.md](workflows/report.md)
- Consolidate all evidence
- Generate final report

## Step 7: Offer Export

Ask the user:
> "Would you like me to export the full testing report to `e2e-evidence/report.md`? It includes per-journey breakdowns, all evidence references, and detailed findings."
</process>

<success_criteria>
- Complete pipeline executed (analyze → plan → execute → report)
- User approved plan before execution
- All evidence captured and reviewed
- Report generated with accurate results
</success_criteria>
