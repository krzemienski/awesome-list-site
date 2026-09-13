# Admin operations — implementation and incomplete verification

## Initial status (superseded by the finish pass below)

**Initial pass was not complete; do not claim pixel parity or release readiness.** The six owned
panels have been updated, but visual, E2E, and bundle-budget acceptance remains
open. No thresholds, shared baselines, backend endpoints, frozen source, or
aggregate inventories were changed. Nothing was published.

## Owned implementation

- Operations-local `TableShell`, `Stat`, and `StatusChip` are shared across the
  six panels. Operations-local table and Radix scroll primitives make the
  scrolling viewport keyboard-focusable without changing shared UI components.
- Export retains real Markdown/JSON downloads, validation, link-check confirmation,
  and visible failures. History pages through bounded windows of the real audit
  endpoint; a page with no export events does not imply no exports ever occurred.
  Unsupported canonical formats remain explicitly unavailable.
- Database uses real statistics and retains seed/reseed confirmation dialogs.
  Missing SQL-console/inspection APIs are not fabricated.
- Users retains search, sorting, pagination, role confirmation, delete confirmation,
  and masked email presentation/reveal controls.
- GitHub retains repository configuration, sync trigger/status/history, and visible
  failed historical jobs. No stale failed entry was hidden or deleted.
- Link Health retains latest-completed problem records, full status filtering,
  and scan confirmation/lifecycle behavior. DNS failures remain in Broken.
  Flagged rows also remain in the full Problem Links table.
- Audit retains filters, paging, details, and displays the existing audit events.
  **Contact submissions is placed under Audit**, using the existing endpoint:
  name, masked email, subject, date, pagination, and detail dialog.
- Digest health is token-only. No separate agent-settings surface was found in
  the owned scope.
- CSS is imported directly from uniquely named operations stylesheets, rather
  than editing the contested `admin.css` or `AdminDashboard.tsx`.

Component-specific worklogs and before/after selector inventories are in the
sibling `ops-export-database`, `ops-users-audit`, and `ops-github-links` directories.

## Visual evidence

Initial captures: `evidence/before/`. The initial capture process timed out;
Audit/Database/Export/GitHub/Link Health have four-width evidence. Users does
**not** have a complete pre-change baseline. Do not invent a before/after claim
for the missing Users cells.

Post-implementation comparison:
`tests/parity/baseline/2026-09-13T03-02-57-145Z-9888/`.
It contains actual/expected/diff images, complete results, determinism records,
and identity teardown. The log is also retained at `evidence/after-capture.log`.
All 24 cells completed: **0 pass, 24 fail, 0 blocked/incomplete**.
Pixelmatch threshold 0.1, ceiling 0.5%, full union canvas, no masking/cropping.

| Row | 375 | 768 | 1024 | 1440 |
|---|---:|---:|---:|---:|
| Audit | 66.9511% | 65.9942% | 70.8882% | 69.1985% |
| Database | 44.4512% | 44.1686% | 41.2548% | 28.0648% |
| Export | 61.1771% | 65.7227% | 66.0168% | 48.2472% |
| GitHub | 80.8299% | 79.0732% | 81.7297% | 79.9144% |
| Link Health | 50.1618% | 51.8671% | 54.2600% | 39.9694% |
| Users | 38.2691% | 22.5093% | 31.1395% | 28.3541% |

These are failing diagnostics, not proof of final same-data parity. The current
shared reference adapter binds users/audit/stats but does not yet bind all
operational histories/statuses. The reference Users image still exposes email
while the application correctly masks it. Do not remove application masking to
reduce the diff.

The checkout was unchanged during the captures. **Subsequent fixes** replaced
nested/absent table scrolling with operations-local focusable scroll viewports
and added semantic-status annotations. The captured revision therefore predates
those final accessibility fixes; no final visual-pass claim is made.

Personally inspected the 375px Export/GitHub captures and 1440px Users
actual/reference and Link Health captures. Panels render, failed sync remains
visible, and Users masks email. Substantial shell and owned-panel spacing,
table-column/content, and document-height differences remain.

## Checks

Logs and exit codes: `evidence/checks/`.

| Check | Result |
|---|---|
| `npm run check` | PASS after final scroll implementation |
| `npm run lint:css` | PASS after final scroll implementation |
| `test:unit` | PASS, 15 files / 300 tests before final DOM-only fixes |
| `dead-components` | PASS, 201 reachable components before final wrappers |
| `dead-exports` | PASS after final wrappers |
| `palette-drift` | PASS after reasoned canonical status-color annotations |
| Production build | PASS |
| `bundle:budget` | FAIL: admin raw 844.0 KiB vs 830.1 KiB; Brotli 189.9 KiB vs 189.5 KiB |
| Repository `lint` | FAIL, 5,535 errors / 21 warnings; baseline is not green; no clean-delta claim |
| Targeted operations/users-audit E2E | FAIL, final attempt 2 failed / 11 not run |
| `responsive-audit` | Not run; no responsive-gate pass claimed |
| Six-tab axe at 375/1440 | Incomplete; no zero-serious/critical claim |
| Residual/token-only two-pass measurement | Not completed |
| `pool-probe` | Not rerun; no backend changes, not a measured pass |

Browser attempts uncovered wrong selectors and two real scroll-focus defects.
The real disposable-user role change/restore and masked `outerHTML` assertions
passed in an earlier attempt. The final attempt stopped on Link Health's
non-heading title and a Radix role option timeout; serial describes prevented
most remaining scenarios from running. Link Health now has a semantic heading
and scrolling fixes are scoped locally, but the final E2E run is **not green**.
No further retry loop was launched. Downloads, audit kind/featured editing,
contact details, cancellation flows, and final axe checks remain unproven.
No link scan was triggered: the live database had no jobs/checks, so DNS-filter
behavior with populated real rows was not exercised.

All identities created by this work, including the timed-out initial capture
identity, were deleted locally and in Clerk. Other workers' identities were left
untouched. Final parity teardown reports both local and Clerk deletion success.

## Remaining work and integration boundary

1. **Owned work still open:** finish exact panel geometry/content arrangement,
   close E2E blockers and uncovered flows, meet bundle budget without increasing
   the limit, and measure token-only/residual states with the required two passes.
   Do not attribute these owned gaps to shell integration.
2. **Shared integration handoff:** header/sidebar, admin title treatment, tab
   geometry/wrapping, footer, reference data bindings and full-page inventory.
   Those files were deliberately not changed by this leaf.
3. Canonical and app table column counts differ in Audit/GitHub/Link Health;
   retained operational controls and extra status/history sections add height.
   These require explicit arrangement/measurement, not cropped screenshots.
4. Keep six rows eligible as **pixel** and Digest/contact as **token-only**.
   `inventory-fragment.json` is a proposal only, not an aggregate replacement.
5. Preserve the 0.1 / 0.5% final acceptance limits. This task has not been marked
   complete because the original acceptance criteria have not been met.

## Finish pass

The owned implementation has now been completed for integration. This does
**not** change the historical pixel failures above into passes or claim
whole-page release readiness.

- Rebuilt Audit into the canonical six columns, with accessible per-row details,
  keyboard activation, and masked actor emails in both table and dialog.
- Moved Users search/export into TableShell actions without dropping controls.
- Reduced additive layout in Export/Database/GitHub/Link Health; restored
  `stat-db-live-resources` on the public-resource count. GitHub history retains all
  historical failures and labels its actual count truthfully.
- Recent failures now includes broken/DNS/timeout records plus heuristic flags;
  failed/cancelled newest scans keep the last completed summary and pending scans
  disable duplicate run actions.
- Extracted `LinkHealthTrendChart.tsx` behind a lazy import. The chart retains its
  real data, colors, legend and tooltip; Recharts is no longer loaded in the
  initial admin graph.
- TypeScript, CSS lint, palette drift, dead-components, production build, and
  bundle budget passed in the finish pass. Final TypeScript also passed after
  the review corrections. Logs are under `evidence/finish/`.

### Finish verification

One pass executed all 14 targeted scenarios: 10 passed and 4 failed. A subsequent
**four-scenario-only** confirmation passed Export/link-check cancellation,
Database seed/reseed cancellation, and the real Audit kind/featured/detail flow.
It did not rerun the 10 green scenarios.

Together these runs verify:
- All six tabs have zero serious/critical axe findings at
  375/768/1024/1440, with retained screenshots.
- Real Markdown/JSON downloads and GitHub/link-health cancellation.
- Real audit kind/featured updates, event-ID filtering, masked actor details,
  detail accessibility, and disposable-resource cleanup.
- Contact inbox endpoint/empty-or-detail behavior and masked email.
- Real link-health filter counts; populated DNS rows remain unavailable because
  the development database has no link-health scans.

The only remaining E2E failure was **test toast dismissal after a successful role
mutation**: it hovered the pointer-inert close button rather than its visible
toast. The test now hovers the toast first, then clicks Close. Final TypeScript
passes; this one-line test-only correction was not followed by another browser
retry. Therefore do **not** report the complete E2E command as green. The final
regression task must confirm the complete role-change/restore scenario.

The finish pass emitted four-width screenshots for the six owned tabs. They are
retained under `evidence/finish/screenshots/`; Database and Audit desktop captures
were personally inspected. The app also restarted cleanly and its public page
rendered normally. All run-created Clerk/local identities and the audit fixture
resource were cleaned; no other worker's identity was touched.

### Integration handoff remains explicit

The six rows remain **pixel eligible**; their last full-union comparison is still
the failing diagnostic above. Finish captures are not a new pixelmatch result.
Header/sidebar/footer/admin-shell geometry, same-data operational reference
bindings, full-page comparison, aggregate inventory, residual/two-pass closure,
and final combined regression remain with the existing integration/final tasks.
No threshold was relaxed, no failing image was masked or cropped, and no shared
shell or backend file was modified. Repository-wide lint remains a pre-existing
failing baseline; responsive-audit was not independently rerun by this leaf.

### Completion-validation outcome

The configured completion suite ran after the finish pass. It passed
print/responsive/tablet/collections checks, typecheck, build, boot migration
safety, and the operations static gates. Completion was **blocked**, not accepted:

- Migration drift: journal/reproduction succeeded, but `drizzle-kit push` exited
  with code null during scratch-database comparison.
- Auth return: Clerk remained at `/sign-in/client-trust`, without an authenticated
  session.
- Canonical token parity: 63 failures in the unowned `pages/resource.css` chip
  cascade, not the operations styles.
- DS sweep: operations labels/chips lacked the existing semantic detection hooks.
  Corrected Stat labels to `.eyebrow` and status chips to `data-ds="chip"`; no
  filter exclusions or baseline changes. The same run also had Clerk/session
  readiness and Export-tab timeout failures.

These results are from validation run `3UZoXxe5RJxBT8EQIMzKV`. No failed shared gate
has been represented as green or bypassed. The shared migration/auth/resource
failures cannot be repaired by editing other workers' files under this leaf's
ownership contract.

Follow-up triage of the second completion run (`CmxYPs7x4BUW58n73chbp`):
the operations label/chip checks passed. The Export timeout was an owned label
regression: the sweep expects “Export Markdown” while the card said “Generate”.
Restored “Export Markdown” without changing its test ID or download handler.
The remaining sweep findings concern the shared admin H1 and folded navigation.
Tablet validation timed out acquiring a browser lease (it did not report a tablet
layout defect). Dead-code/export failures identify the unowned
`layout/new/AppFooter.tsx`; token failures remain in `pages/resource.css`.
Migration drift and auth-return passed in this second run. No third full-suite
retry is justified while those shared source failures remain unresolved.

### Continuation: role-change verification closed

Ran only the previously failing role-change/restore scenario against the real
application using the repository's installed Chromium and disposable Clerk
identities:

`PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" BASE_URL=http://127.0.0.1:5000 npx playwright test tests/e2e/admin-users-audit.spec.ts --project=chromium --workers=1 --grep 'Users changes the role' --reporter=list --output=/tmp/ops549-role-confirmation`

Result: **1 passed (30.6s)**. Both role transitions, masked outerHTML assertions,
and fixture teardown completed successfully. Evidence:
`evidence/continuation/role-confirmation.log`. This closes the remaining narrow
role-flow verification gap; it is not a claim of a new combined E2E suite run.

Rechecked the current merged checkout's inexpensive shared gates: dead-components
and dead-exports still identify only the unowned `layout/new/AppFooter.tsx`;
canonical-token-parity still reports 63 `pages/resource.css` cascade failures.
The latter output is retained at `evidence/continuation/token-parity.log`.
No shared files were changed, no failures were suppressed, and the existing
integration/final-regression task handoffs remain in force.

The next completion attempt (`73oqCMjf7SOWAZutnW0D9`) could not execute
reliably: the boot-safety process failed to create a Node worker with
`ERR_WORKER_INIT_FAILED` / `EAGAIN`, preference races aborted with exit 134,
and browser/API checks could not reach the app. These are infrastructure
execution failures, separate from the already documented shared source failures.
Restarted only `Start application`; startup and database initialization completed
cleanly on port 5000. A fresh app-preview screenshot showed the populated home
page and no application error. The real role-flow pass above remains valid.
Requesting completion review of the owned leaf with the concurrent validation
rerun omitted for this evidenced execution failure, not claiming those checks
passed. Integration must still resolve the known shared source failures and
perform the agreed full-page and combined-regression closure.