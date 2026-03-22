<overview>
How functional validation gates embed into the planning hierarchy. Three gate types serve different purposes at different levels.
</overview>

<gate_types>
<task_gate>
Validates a single task's deliverable. Placed AFTER each task, BEFORE the next.

```
<task id="1">Create POST /api/users/register...</task>

<validation_gate id="VG-1" blocking="true">
Prerequisites: pg_isready | npm start & | poll health
Execute: curl -s -X POST .../register -d '{...}' | tee evidence/vg1-register.json | jq .
Pass criteria: HTTP 201 | has "id" | has "email" | NO "password" | duplicate → 409
Review: cat evidence/vg1-register.json | jq -e '.id and .email'
Verdict: PASS → Task 2 | FAIL → fix → re-run
Mock guard: IF tempted to use supertest or mock DB → STOP
</validation_gate>
```
</task_gate>

<phase_gate>
Validates the integrated result of an entire phase. Placed AFTER all task gates. Tests the WHOLE, not individual parts.

```
<phase_gate id="VG-PHASE-01" blocking="true">
Description: "Working API with registration, login, and protected routes"
Prerequisites: All task gates PASS | dependencies running
Integration evidence:
  1. Register: curl POST .../register → tee evidence/vg-phase-register.json
  2. Login: curl POST .../auth/login → tee evidence/vg-phase-login.json
  3. Protected: curl -H "Bearer $TOKEN" .../users/me → tee evidence/vg-phase-protected.json
  4. Unauth: curl .../users/me without token → tee evidence/vg-phase-unauth.txt
Pass criteria: Register 201 | Login 200 + token | Protected 200 + user data | Unauth 401
Verdict: PASS → SUMMARY + VALIDATION | FAIL → fix integration → re-validate
</phase_gate>
```
</phase_gate>

<regression_gate>
Verifies previous phases still work. Included as FIRST gate in Phase 2+ plans.

```
<regression_gate id="VG-REGRESS-01" blocking="true">
Description: Verify Phase 1 still works before starting Phase 2
Checks: Re-run Phase 1 key evidence captures (health, login, protected)
Pass criteria: All Phase 1 criteria still passing
Verdict: PASS → proceed with Phase 2 | FAIL → fix regression first
</regression_gate>
```
</regression_gate>
</gate_types>

<gate_flow>
```
Phase 1:
  Task 1 → VG-1 → Task 2 → VG-2 → VG-PHASE-01 → SUMMARY + VALIDATION

Phase 2:
  VG-REGRESS-01 → Task 3 → VG-3 → Task 4 → VG-4 → VG-PHASE-02 → SUMMARY + VALIDATION
```
Every arrow is gated. Every transition requires proof.
</gate_flow>

<rules>
1. Task gates go AFTER the task, BEFORE the next task
2. Phase gates go AFTER all task gates
3. Regression gates go FIRST in Phase 2+
4. Mock guards in EVERY gate
5. Evidence paths: `evidence/vg{N}-{description}.{ext}`
6. All gates: BLOCKING — no advancement on FAIL
7. PASS criteria defined during PLANNING, never during execution
</rules>

<anti_patterns>
- Gate without evidence capture (ephemeral output = no proof)
- Gate with vague criteria ("it works", "looks good")
- Gate that doesn't review evidence (file exists ≠ content is correct)
- Gate validating a mock instead of the real system
</anti_patterns>
