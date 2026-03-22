<objective>
Generate a detailed validation plan from the analysis. Each journey gets explicit PASS criteria defined BEFORE any execution. The plan includes the exact commands, curl requests, or browser interactions needed, along with evidence file paths and verification checks.
</objective>

<required_reading>
- The analysis from `e2e-evidence/analysis.md` (must exist)
- The platform-specific reference file
- templates/validation-plan.md for output format
</required_reading>

<process>
## Step 1: Load Analysis

Read `e2e-evidence/analysis.md`. If it doesn't exist, run the analyze workflow first.

## Step 2: Define PASS Criteria Per Journey

For EVERY journey identified in the analysis, define specific, observable PASS criteria:

**BAD criteria** (vague, uncheckable):
- "App works"
- "Page loads"
- "API responds"

**GOOD criteria** (specific, evidence-backed):
- "Dashboard screenshot shows user count badge > 0"
- "curl GET /api/v1/users returns HTTP 200 with JSON array containing 'email' field"
- "CLI `myapp process input.json` exits 0 and stdout contains 'Processed 5 items'"

## Step 3: Generate Validation Plan

Create `e2e-evidence/validation-plan.md` using the template structure:

```markdown
# E2E Validation Plan
Generated: [timestamp]
Platform: [type]

## Prerequisites
- [ ] [Dependency] installed: `[check command]`
- [ ] [Service] running: `[health check]`
- [ ] Environment configured: `[env check]`

## Journey 1: [Name]
**PASS Criteria:**
- [ ] [Specific observable criterion]
- [ ] [Specific observable criterion]

**Steps:**
1. [Action]: `[exact command]`
   Evidence: `e2e-evidence/[platform]/[journey]/01-[desc].[ext]`
2. [Action]: `[exact command]`
   Evidence: `e2e-evidence/[platform]/[journey]/02-[desc].[ext]`

**Verification:**
- `[verification command]` → expected: [value]
- Read screenshot at `[path]` → verify: [what to look for]

---

## Journey 2: [Name]
...
```

## Step 4: Platform-Specific Plan Elements

**CLI plans include:**
- Build command with output capture
- Each subcommand/flag with real input
- Exit code verification per command
- stdout/stderr content checks

**API plans include:**
- Server startup with health polling
- curl for each endpoint (GET, POST, PUT, DELETE)
- Auth token acquisition steps
- Response body verification with jq
- Database verification after mutations

**Web plans include:**
- Dev server startup
- agent-browser or Playwright steps per page
- Form fill sequences with specific test data
- Screenshot at every state transition
- Responsive viewport list (375, 768, 1440)
- Console error check frequency

**iOS plans include:**
- Build scheme and destination
- Simulator UDID and boot sequence
- Video recording start/stop
- Log streaming with subsystem filter
- Screenshot per screen state
- Deep link URLs for navigation
- Backend health check (if applicable)

**Full-stack plans include:**
- Layer-by-layer startup order (DB → API → Frontend)
- API validation curl suite
- Frontend validation with browser
- Integration tests: create via UI → verify via API → verify in DB
- Cross-layer data consistency checks

## Step 5: Approval Gate

If NOT in `--ci` mode, present the plan to the user:

> "Validation plan generated with [N] journeys and [M] verification steps. Review the plan at `e2e-evidence/validation-plan.md`. Shall I proceed with execution?"

Wait for approval before proceeding to execute.

If in `--ci` mode, proceed directly.
</process>

<success_criteria>
- Every journey from analysis has a plan entry
- Every plan entry has specific PASS criteria (not vague)
- Every step has an exact command to run
- Every step has an evidence file path
- Every journey has verification commands
- Plan is saved to e2e-evidence/validation-plan.md
- User approved (unless --ci mode)
</success_criteria>
