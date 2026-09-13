# Admin review queues — implementation and verification handoff

## Status

Implementation is present, but acceptance is **BLOCKED / UNVERIFIED**, not a
pixel-parity pass. No production changes or publication were made.

## Owned changes

- Approvals and edits reuse the current admin panel/table structure with separate
  `queues-review.css`. Loading, empty, failure and populated states retain their
  review actions. Existing test IDs are preserved.
- Approvals add explicit selection and confirmed bulk approval/rejection through
  the existing endpoints. Requested, succeeded and failed counts are surfaced.
  Only current pending selections are submitted; individual status endpoints are
  unchanged.
- Edits retain conflict warnings, invisible-character disclosure and full diff
  review. Dialog failures remain inline instead of triggering error toasts.
- Enrichment and research use `queues-agent.css` for table, status and secondary
  controls. Pending jobs continue polling, alongside processing jobs.
- Discovery review is a real-data table with the existing promotion/rejection
  mutations. `ResearcherTab` accepts `initialTab="review"` for the separate
  Research surface; no speculative wrapper export is retained.
- Agent event details expose expansion state; graph regions support keyboard
  scrolling. Existing event and graph selectors remain.
- Confirmation actions keep dialogs open while mutations run and on failure;
  successful mutations close them before notification.

No backend endpoint, shared admin stylesheet, AdminDashboard, aggregate parity
inventory or frozen reference changes are included.

## Verification

| Check | Result |
| --- | --- |
| TypeScript | Passed during implementation and dialog correction; final output retained with this handoff |
| CSS lint | Passed |
| Unit suite | 15 files / 299 tests passed |
| Dead components | Passed, 199 reachable files |
| Repository lint | Failed: 5,569 errors / 24 warnings; existing configuration and source issues prevent a green baseline |
| Production build and bundle budget | Fresh serialized production build passed; bundle budgets passed (initial gzip 187.5 KiB; admin incremental gzip 219.6 KiB) |
| Admin operations E2E | Blocked before authenticated admin access; not run as a guest substitute |
| Responsive audit / axe / real mutations | Blocked by authenticated browser access |
| Four-width pixel comparison | Unverified; no numerical pass claimed |
| Local pre-change screenshots | Missing; source selector inventories are not screenshot substitutes |

The real disposable Clerk identity attempt reached an HTTP 502 during sign-in.
Returning to `/admin` still redirected to `/sign-in?redirect_url=%2Fadmin`.
No queue UI was reached, so no fixtures were mutated. Cleanup found and deleted
exactly the one created Clerk identity, then verified zero remaining Clerk
identities and zero local rows for that exact identity. No global sweep occurred.
See the retained browser cleanup report and sign-in screenshot.

## Integration handoffs

1. Mount `<ResearcherTab initialTab="review" />` for the canonical Research surface in the shared
   shell. This worker deliberately does not edit AdminDashboard. The current
   review subtab and review-mode instance share behavior; the standalone route is
   not yet exercised.
2. Extend the real-data reference adapter and merge the proposed row fragment.
   Keep the full-union, unmasked threshold of 0.1 and maximum 0.5% difference at
   375/768/1024/1440, Editorial × Crimson. Measure secondary app controls in the
   residual pass. These numeric targets have **not** been met or relaxed here.
3. Run the owned mutation scenarios with uniquely scoped disposable fixtures after
   the sign-in handoff works: approve → public visibility, rejection, bulk response
   counts including failures, edits diff/approve/reject, discovery promotion and
   live job progress. Compare badge counts to the database.
4. Finish the authenticated admin-operations and responsive/axe checks and resolve full-page differences with
   the other parallel shell/panel owners.

These handoffs belong to the already planned integration/final-regression work;
no duplicate follow-up tasks were proposed. This task must not be reported as
fully verified until its outstanding owned verification is completed.

## Finalization

The leaf implementation is being delivered with explicit scope drift: final
authenticated functional/accessibility verification and numerical visual parity
remain open for integration/final regression. A fresh production build and bundle
budget check now pass; this does not substitute for those outstanding browser
checks. The source selector inventories and authentication cleanup evidence remain
available alongside this handoff. No shared shell wiring was added.

Completion-review corrections: enrichment start now closes exclusively on
success; initial approvals/edits query errors render retryable error panels
instead of empty queues; queue chips consume the Badge primitive; the unused
Research wrapper export was removed in favor of the existing initialTab prop.

## Authenticated follow-up and final limitations

The established reusable QA admin sign-in subsequently worked. Real UI approval
and rejection succeeded; approval was confirmed in the database and public
resource endpoint. Discovery promotion succeeded and was confirmed in the
database. Canceling enrichment confirmation created no paid job. Exact owned
fixtures were cleaned up; the reusable harness identity was retained.

Researcher job-history captures exist at 375/768/1024/1440. Axe returned zero
serious/critical findings at 375 and 1440 on the measured researcher surface,
not all five tabs. These screenshots are not numerical reference comparisons.

The tester's apparent empty edit diff was a malformed fixture: it seeded
`from`/`to` instead of schema-required `old`/`new`. Its stale base timestamp
correctly caused supersession. This is not evidence of an application diff bug
or of successful edit approval. The brief badge/empty discrepancy occurred
after external DB seeding without waiting the polling interval; persistence
beyond ten seconds was not established.

Further review corrections add explicit retryable enrichment/research job-list
and discovery-list errors. Paid launch controls and handlers now fail closed
while active-job state is loading, refetching or failed. TypeScript passes.

Completion gates now pass the DS button sweep, palette drift, dead exports,
responsive audit and production build. Remaining cross-owner failures include
product-profile cross-tab timeout and canonical-token shadow rules on resource
detail. Full queue parity, all-tab axe, bulk outcome cases and clean edit approval
remain unverified. Task completion is not a statement that these checks passed.

## Continuation: scoped harness preconditions

The merged shell now includes `content-research`, but it mounts the default
Researcher instance rather than `initialTab="review"`. The aggregate parity
inventory still marks `app.admin.research` blocked. Shared shell/aggregate edits
remain with the integration owner.

Read-only harness inspection confirmed that its reference adapter does not
replace the canonical queue/job demo rows with the application's rows. It only
adapts user/activity records and aggregate counts. Thus measurements against
unadapted queue rows cannot establish the required real-data parity.

A selected five-row/four-width harness run was attempted with BASE_URL explicitly
set to port 5000. It waited for the `db-heavy` lease held by a live
`ds-button-sweep` process and never reached capture or identity creation. Only
this waiting attempt was stopped; no other validation process or lease was
removed. No additional pixel measurements or fixture mutations resulted.

The targeted tester follow-up also did not restore the real admin session:
the proxied development host served the design-system artifact, while loopback
correctly served the application sign-in route. Existing successful authenticated
evidence above remains valid; this continuation adds no new mutation proof.

## Latest continuation: concrete comparison and corrected mutation proof

The shared lease became available and direct local Clerk authentication worked.
The scoped harness completed all 16 measurable queue captures at the requested
four widths; all failed the numerical target, and four Research captures remain
inventory-blocked. See `evidence/measured-parity.md` for exact percentages,
inspection notes and actionable shared-shell/reference-adapter handoffs. This
supersedes the previous no-capture infrastructure blocker, not the FAIL verdict.

Correctly shaped, current-timestamp edit fixtures now prove successful real UI
approval (resource title changed) and rejection (reason and handled timestamp
persisted). Authenticated browser requests prove bulk approve returned 2 succeeded /
1 failed and bulk reject returned 1 succeeded / 1 failed, with nonpending resources
unchanged. These bulk checks prove endpoint outcomes, not button-click coverage.
See `evidence/corrected-edit-bulk-proof.md` and its two JSON files.

Exact owned fixtures and local/Clerk identities were cleaned up. No paid jobs
ran. Job-query failure injection and complete all-tab axe remain unexecuted;
existing researcher axe evidence is unchanged. The outstanding visual acceptance
is now measured FAIL rather than merely unverified.