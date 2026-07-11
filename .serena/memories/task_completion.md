# Task completion gates
- Build real application successfully: `npm run build` exit 0.
- Static quality: `npm run lint`, `npm run type-check`, and `npm run format:check` exit 0.
- Launch Dockerized app with real PostgreSQL; health endpoint returns 200.
- Exercise each acceptance criterion through browser, curl, or actual admin UI; no direct function calls or test harnesses.
- Save fresh run-scoped evidence under `e2e-evidence/<run-id>/` and read each artifact before PASS.
- For production completion: deploy only after explicit approval, repeat browser/curl criteria against https://awesome.video/, and separately approve each production data mutation.
- Never claim fixed from source inspection alone. Never create mocks, stubs, test doubles, unit tests, or test files.