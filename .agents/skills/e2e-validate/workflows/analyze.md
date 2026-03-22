<objective>
Scan the codebase to detect platform type, identify all user journeys, map endpoints and routes, discover database schema, and catalog potential validation targets. This is the intelligence-gathering phase — no execution happens here.
</objective>

<required_reading>
Read the platform-specific reference file identified during detection. Do NOT load all references.
</required_reading>

<process>
## Step 1: Platform Detection

Run the detection script from SKILL.md or manually check:
```bash
# Check for platform indicators
ls *.xcodeproj *.xcworkspace Package.swift 2>/dev/null  # iOS
ls Cargo.toml go.mod pyproject.toml 2>/dev/null          # CLI
find . -maxdepth 3 -name 'routes*' -o -name 'controllers*' -o -name 'swagger*' 2>/dev/null  # API
find . -maxdepth 3 -name '*.jsx' -o -name '*.tsx' -o -name '*.vue' -o -name '*.svelte' 2>/dev/null  # Web
```

Record detected platform. If `--platform` flag was provided, use override.

## Step 2: Project Structure Analysis

If `--parallel` flag is set, launch sub-agents for Steps 2a-2d simultaneously.
Otherwise, execute sequentially.

### 2a: Application Architecture
Identify:
- Entry points (main files, index files, App files)
- Startup commands (from package.json scripts, Makefile, Cargo.toml, etc.)
- Port/URL the application serves on
- Environment variables needed (from .env.example, NOT .env)
- Dependencies and their versions

### 2b: User Journey Mapping
For each platform type:

**CLI**: Map every subcommand, flag combination, and input/output pair
**API**: Map every route (method + path + expected request/response)
**Web**: Map every page/route, interactive element, form, navigation flow
**iOS**: Map every screen, navigation path, deep link, gesture
**Full-stack**: Map both frontend journeys AND backend endpoints, noting which frontend actions hit which endpoints

### 2c: Database/Data Layer
- Database type and connection configuration
- Full schema (tables, columns, types, relationships)
- Data flows per user action (what records change)
- Seed data or migration status

### 2d: Risk Assessment
Scan for potential issues:
- Missing error handling
- Unvalidated inputs
- Missing auth checks
- Race conditions
- Broken responsive layouts (web)
- Missing null checks
- Security concerns

## Step 3: Generate Analysis Report

Create `e2e-evidence/analysis.md` containing:
```markdown
# E2E Validation Analysis

## Platform: [detected type]
## Startup: [commands to start the application]
## URL/Port: [where to access it]

## User Journeys Identified
1. [Journey name] — [steps] — [expected outcome]
2. ...

## Endpoints/Routes (API/Fullstack)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/users | List all users |
| ...

## Database Schema
[schema summary]

## Risk Areas
- [risk description] — [file:line] — [severity]

## Recommended Validation Order
1. [First thing to validate]
2. ...
```

## Step 4: Output

Display the analysis summary. If `--plan` flag is also set, proceed directly to the plan workflow.
</process>

<success_criteria>
- Platform correctly detected (or overridden)
- Every user-facing journey identified
- Every endpoint/route cataloged (API/Fullstack)
- Database schema documented (if applicable)
- Startup instructions verified
- Risk areas identified with file references
- Analysis saved to e2e-evidence/analysis.md
</success_criteria>
