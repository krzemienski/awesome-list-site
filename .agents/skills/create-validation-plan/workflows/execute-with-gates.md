<overview>
Execute a gated plan with full validation gate enforcement. Read [references/gate-integration.md](../references/gate-integration.md) and [references/gate-patterns.md](../references/gate-patterns.md) before proceeding.
</overview>

<steps>
**Step 1: Load plan.** Read the PLAN.md file. Identify all tasks, gates, evidence directory, prerequisites.

**Step 2: Verify prerequisites.** Start all dependencies. Health-check each (poll, don't guess). Create evidence directory. If Phase 2+, verify previous VALIDATION.md shows PASS.

**Step 3: Execute task then gate.** For each task in order:

- **3a.** Execute the task — follow instructions, create/modify files. If tempted to mock → STOP.
- **3b.** Run the validation gate: execute prerequisites → capture evidence → save to files → READ the evidence → compare against each PASS criterion → render verdict.
- **3c.** On PASS: Log `VG-{N}: PASS` to gate-log.txt → proceed to next task.
- **3d.** On FAIL: Log `VG-{N}: FAIL - {reason}` → DO NOT proceed → diagnose → fix real system → re-run gate. Max 3 retries per gate.

**Step 4: Run phase gate.** After ALL task gates PASS: run regression check (if Phase 2+), run integration evidence testing the WHOLE phase, review and render final verdict.

**Step 5: Produce outputs.** On Phase Gate PASS: create SUMMARY.md (accomplishments, files, decisions), create VALIDATION.md using [templates/validation-report.md](../templates/validation-report.md).

**Step 6: Report.** Present validation report with gate verdicts and evidence file references.
</steps>

<deviation_rules>
- Auto-fix bugs, security gaps, blockers — document in SUMMARY
- Ask user about architectural changes
- Log enhancements to ISSUES.md
- NEVER deviate from the Iron Rule
</deviation_rules>

<done_when>
- All task gates PASS with evidence
- Phase gate PASS with integrated evidence
- Regression PASS (if Phase 2+)
- SUMMARY.md and VALIDATION.md created
- Evidence directory populated
- No mocks, stubs, or test files created
</done_when>
