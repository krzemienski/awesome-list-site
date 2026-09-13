# task546 admin shell + Overview verification

Date: 2026-09-13 UTC
Target: `http://127.0.0.1:5000` only
Identity: disposable Clerk admin via `tests/parity/identity.mjs`, display name Nick. Credentials were not recorded.

## Evidence
- `results.json`, `REPORT.md`, `actual/`, `expected/`, `diff/`: selected parity run `app.admin.overview` at 375/768/1024/1440.
- `functional/remaining.json`: real-browser functional checks and health responses.
- `functional/overview-*.png`: local admin Overview captures at all four requested widths.

## Findings
- 15 canonical tabs rendered with `aria-selected`; clicking each selected the requested tab.
- ArrowRight from focused Overview moved focus and selection to Approvals.
- Users query/hash and extras deep links selected the expected parent and rendered existing content:
  `/admin/users?q=Nick`, `/admin?tab=users#users`, `/admin/subsubcategories`, `/admin/digests`, `/admin/journeys`.
- Settings opened `/settings/theme`. New entry opened the resource-create dialog without saving data; observed URL was `/admin#resources`.
- Public health probes returned 200: `/api/health`, `/api/health/live`, `/api/health/ready`, `/api/health/ai`. Authenticated admin operations health request unexpectedly returned 401 in the direct `page.request` probe and needs follow-up if this endpoint is in scope.
- GitHub panel content was present and the captured text contained failure/error wording; exact job-dot locator was not isolated before the non-mutating capture.
- Scoped axe at 375 and 1440 had zero serious/critical violations. Minor `aria-allowed-role` remained (4 nodes at each width).

## Parity result
The selected admin Overview parity run completed as a real Chromium admin capture at all four widths, but all four visual rows failed against the canonical reference: 375 18.3484%, 768 12.2766%, 1024 40.5715%, 1440 30.7639%.

## Scope / cleanup
- No application source files were changed.
- Evidence was copied only after browser runs closed; no aggregate parity reports were edited.
- The helper teardown removed the disposable identity used by this run. An older pre-existing QA identity was observed by helper verification and was intentionally not deleted, per instruction to clean only the current user.
- MainLayout sidebar/footer were not treated as task546 scope; integration handoff is required.
- Existing admin e2e command was attempted with Chromium. It started 50 tests; several access/navigation/tab/mobile/a11y tests passed, while export/database/validation/button checks timed out around 1 minute. The command exceeded the execution timeout before a final summary was emitted; see `/tmp/task546-e2e.log` for the observed output.
