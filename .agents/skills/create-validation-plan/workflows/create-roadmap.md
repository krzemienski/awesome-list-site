<overview>
Define project phases with testable phase gate criteria. Read [references/scope-with-gates.md](../references/scope-with-gates.md) and [templates/gated-roadmap.md](../templates/gated-roadmap.md) before proceeding.
</overview>

<steps>
**Step 1: Read brief.** Load `.planning/BRIEF.md` for scope, platform, and validation strategy.

**Step 2: Define phases.** Break project into phases. Each phase must have a clear, testable objective and defined phase gate criteria — specific evidence proving the phase works.

Phase gate criteria examples:

| Phase | Bad | Good |
|-------|-----|------|
| Foundation | "Database works" | "curl POST /api/health returns 200 with `{\"db\":\"connected\"}`, users table queryable via psql" |
| Auth | "Login works" | "curl POST /api/auth/login returns 200 + JWT; GET /api/protected without token returns 401; with token returns 200 + user data" |
| UI | "Pages render" | "Screenshot of /dashboard shows sidebar, header with username, 3 widget cards with data" |

**Step 3: Define regression gates.** For each phase after Phase 1: re-run previous phase gate criteria to confirm they still pass.

**Step 4: Write ROADMAP.md.** Create `.planning/ROADMAP.md` using [templates/gated-roadmap.md](../templates/gated-roadmap.md). Each phase entry includes: name, objective, phase gate criteria, regression requirements, estimated plans.

**Step 5: Confirm with user.** Show roadmap with gate criteria. "Each phase must PROVE it works before the next starts."
</steps>

<done_when>
- All phases have specific, testable phase gate criteria
- Regression requirements defined for Phase 2+
- Phase sizing accounts for gate overhead (2-3 tasks per plan)
- `.planning/ROADMAP.md` saved
- User confirmed
</done_when>
