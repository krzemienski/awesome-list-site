---
name: Validation workflow registration
description: How CI-style checks (openapi-drift etc.) are registered; workflow limit gotcha.
---
The project's drift/audit gates (openapi-drift, migration-drift, response-contract-drift, ...) are **validation workflows** created via `setValidationCommand`, not plain workflows.

**Why:** `configureWorkflow` fails once the 10-workflow limit is hit (this project sits above it), and an existing validation workflow "cannot be switched to a non-validation workflow" — so configureWorkflow on those names always errors.

**How to apply:** to add a sibling check, add an npm script, then `setValidationCommand({ name, command })` + `startValidationRun` — the workflow entry appears automatically. Harness detail: the response-contract gate boots the app in-process, and must call `installApiContractRegistration(app)` + register any probe route BEFORE `registerRoutes` (the /api 404 backstop shadows late routes); it self-verifies observer liveness with a deliberately mismatching 401 probe.
