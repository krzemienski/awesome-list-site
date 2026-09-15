# Task 566 — gate and evidence summary

Initial gates: 2026-09-14 UTC. Import-integration continuation: 2026-09-15 UTC
(2026-09-14 America/New_York). No full integration or full browser e2e suite
was rerun in this continuation.

## Approved completion boundary

The user approved **“Yes—use the archive’s contact-prototype scope”** after
inspection established that the archive requests new contact prototypes rather
than supplying contact reference screens. Task #566 covers contact behaviour,
accessibility, tokens, screenshots, and bundle checks. The results below satisfy
that approved scope. Repository-wide green gates and existing-page four-width
pixel parity remain required in task #570; they are not claimed as passed here.
See `REFERENCE-ARCHIVE.md` for the source and explicit approval.

## Completion-run limitation after scope approval

The configured project-wide completion run still executes checks outside the
approved contact boundary. Its concurrent run failed to start Node processes/
threads for boot safety, preferences races, and product-profile verification
(`EAGAIN` / `uv_thread_create`); response-contracts exited 134.

Sequential recovery passed boot safety, preferences races, and all 19 response
contract checks. Product-profile verification started successfully but then
timed out in `inspectCrossTabThemeSync`, waiting for Editorial/Crimson after
cross-tab storage clearing (`product-profile-drift.mjs:568`). That is a separately
observed unresolved check, not labelled an infrastructure-only failure or a pass.
The contact changes do not modify theme persistence.

`completion-recovery/results.txt`, `product-profile.log`, and the concurrent
startup-error logs retain the exact distinction. Task #570's repository-wide
green-gate work must resolve the cross-tab check. No validation command or
threshold was disabled to force task completion.

The subsequent automatic completion run passed the four previously affected
checks, including product-profile synchronization, but failed one of 284
design-system sweep assertions:
`route-authed-home-h1s` at `/?context=account` reported
`vacuous render (total=0, dsVariant=undefined)`.
Thus task completion is still blocked by the configured project-wide sweep,
despite the approved contact-specific scope. This result supersedes cross-tab
sync as the current completion blocker; no heading or theme code was changed.

## Gate exits

### Latest continuation — 2026-09-15 UTC

The workspace's already queued design-system sweep completed with 85/87
checks passing. It did not reach the authenticated Home assertion: the
disposable-user scenario timed out clicking during sign-in, and the admin
scenario reported that Clerk UI sign-in did not produce an authenticated
session. Both teardown checks passed. The separately queued product-profile
check passed all 18 route scenarios and cross-tab theme/font synchronization.

The duplicate focused Home check was stopped while still waiting for the shared
gate lease, before it acquired a browser or seeded fixtures. No application,
authentication, or audit source was changed. These results do not prove a Home
defect or a green authenticated sweep. Full regression/sign-in gate recovery
remains in the approved downstream scope; the contact evidence is unchanged.
See `completion-recovery/latest-ds-sweep.log` for the actual protected-flow
failures rather than interpreting them as passing or infrastructure-only.

| Gate | Exit | Result |
| --- | ---: | --- |
| `npm run check` | 0 | PASS; TypeScript emitted no errors. |
| `npm run lint` | 1 | Historical full run: 5,423 problems (5,400 errors, 23 warnings), including one introduced harness registration error now repaired. Full lint remains red; this total is not a post-repair rerun. |
| `npm run lint:css` | 0 | PASS. |
| targeted ESLint on the four contact TSX files | 0 | PASS; no owned app-path findings. |
| targeted Stylelint on `client/src/styles/pages/contact.css` | 0 | PASS. |
| `npm run test:unit` | 0 | PASS; 15 files and 300 tests passed. The dedicated test database was provisioned/applied by the command. |
| response-contract drift | 0 | PASS; 19 endpoint checks, 0 real mismatches, observer liveness verified. The expected unauthenticated probe mismatch was observed and classified by the gate. |
| OpenAPI drift | 0 | PASS; 178 API routes, 178 named contracts, 150 paths. |
| isolated `bundle:budget --check` | 0 | Continuation PASS; initial 627.2 KiB raw, 194.4 KiB gzip, 163.5 KiB Brotli; 266 initial modules and all route/async budgets passed. |
| eight isolated Vite builds | 0 | PASS; unset, empty, z, a, b, c, d, e. Exact optional module expectations and lazy graph assertions pass. |
| standalone contact harness ESLint | 0 | PASS after exact-file ESM registration and fail-explicit readiness repair. |
| focused shared-file ESLint baseline comparison | mixed | MainLayout/AppFooter 0 findings; search-dialog 4 errors; ResourceDetail 29 errors/2 warnings. Identical HEAD/working per-rule counts; no introduced findings. |

The contact components and stylesheet remain unchanged. The continuation integrates
the four shared import boundaries and repairs the harness configuration/readiness.
TypeScript passed after the source integration. Eight fresh builds replace the
earlier failing bundle evidence; `continuation/build-matrix.json` retains their
manifest hashes and exact optional-module results.

## Lint distinction

The introduced standalone-harness project-service parsing error is repaired,
not relabelled as baseline debt. Its exact-file override retains JavaScript
checks. Focused lint on the four shared integration files has identical totals
and per-rule counts to HEAD, checked through stdin without swapping checkout
files. The prior targeted contact-component and stylesheet passes remain valid.
Raw focused proof is retained under `continuation/`.

## Bundle criterion

The default/off bundle criterion is now SATISFIED. Unset, empty, and `z` emit
zero optional contact component modules and no contact stylesheet. Enabled
builds emit exactly their expected components, all outside the initial static
closure. The default bundle budget passes after this integration. See
`INTEGRATION-HANDOFF.md` and `continuation/build-matrix.json`.

## Browser evidence eligibility

The worker's narrow browser evidence covers configured a/b/c/d/e behavior, targeted admin checks/cleanup, and unset/empty/invalid off-state checks; it is eligible as scoped Task 566 browser evidence and screenshot evidence, not as a claim that the full `npm run test:e2e` suite is green. Variant d's final targeted admin flow and cleanup were completed by the browser worker; no additional captures are claimed by this gate worker.

The continuation's `continuation/lazy-smoke-result.json` and five screenshots
add targeted proof for the changed lazy edges: default footer/palette have no
contact surfaces, the core edit action remains, E opens the dialog by keyboard,
and D opens the existing signed-out edit gate. No persistence campaign was
repeated and no database/Clerk writes occurred. The managed default app restarted
cleanly; its preview rendered normally without browser errors.

Retained integration artifacts are historical evidence only: the contact API baseline comparison records 207 total tests (44 passed, 162 failed, 1 skipped) versus 223 total tests (60 passed, 162 failed, 1 skipped), with the same 162 failures and 16 added passing contact tests. The retention summary records 83 passed / 162 failed / 1 skipped. Neither establishes a green current full integration suite; the full integration command was not run here.

No current full `npm run test:e2e` claim is retained. Task 554's route captures and print/showcase checks, and Task 565's narrow evidence, remain scoped evidence; their worklogs explicitly do not claim a fresh full e2e suite. Therefore `test:e2e` is not a passed gate in this report.
