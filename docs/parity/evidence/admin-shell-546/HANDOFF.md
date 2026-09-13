# Admin shell and Overview integration handoff

## Delivery boundary

Owned implementation: `AdminDashboard.tsx`, `AdminStats.tsx`, `AdminOverview.tsx`,
`components/admin/canonical/{Stat,StatusChip,TableShell}.tsx`, and the unique
`styles/pages/admin-shell.css` / `admin-overview.css` imports. The old stylesheet
is retained because sibling panels may still consume its hooks. No server route,
authentication, frozen reference, shared layout, or sibling panel was changed.

The artifact's `docs/` directory is empty. The frozen reference's admin source
and patterns documentation supplied the layout specifications.

## Wiring decision

The strip contains the canonical fifteen tabs in canonical order, with Radix
selection and arrow navigation. It scrolls horizontally, matching the frozen
`.tabs` reference; it does not wrap. Extra tools are subsections:

- Sub-Subcats → Subcategories
- Digests → GitHub
- Journeys → Research

Existing extra-tool URLs still work; their canonical parent remains selected.
Research currently hosts the existing Researcher component. The operations
panel owner/integrator must wire its separately owned Research implementation
here without removing Researcher or Journeys. Contact/agent tools are likewise
owned by sibling panels, not implemented by this change.

## Data definitions

- Resources: approved total (`totalPublic`).
- Subcategories: `/api/subcategories` array length.
- Active users: users whose `updatedAt` is within 30 days, matching the existing
  `AdminRepository` definition (not a claim of last sign-in). Read every users
  page sequentially, 100 per request; active admin/non-admin role subcounts.
- Pending: pending endpoint total and minimum valid `createdAt` age.
- Activity: six latest audit records, relative times, actual actor/target IDs.
- Database: real operations readiness; failed request or degraded = bad.
- GitHub: latest queue/history record status and age; failed = bad,
  pending/processing = warn, no history = unknown.
- Link checker: current job failure/running state and latest completed history;
  completed job with broken links = warn, failed = bad, no completion = unknown.
- Enrichment: pending/processing = warn, failed jobs = bad.
- AI: existing readiness endpoint (no paid deep probe); healthy = ok,
  unavailable/request failure = bad.
- Categories: approved resource counts from `/api/categories`, descending five.

## Evidence and limits — not a pixel pass

See `worklog.md`, `results.json`, `actual/`, `expected/`, `diff/`, and
`functional/`. The complete stable selected-row comparison failed:

| width | differing pixels (%) |
| --- | ---: |
| 375 | 18.3484 |
| 768 | 12.2766 |
| 1024 | 40.5715 |
| 1440 | 30.7639 |

The integration task must remove the admin sidebar/footer, set the outer admin
wrapper to 1400px with canonical gutters (inner content 1280px), and merge the
canonical header. Current MainLayout supplies a sidebar, generic max measure,
generic gutters and footer; these explain major full-union-canvas differences
but **are not an excuse to mark the rows passing**.

Residual content differs honestly: Nick vs frozen full name; active users vs
all users in the current adapter; actual age/role counts, real failed GitHub/
enrichment, no link-history completion, readiness latency, audit actor/targets,
and workflow links retained for existing selectors. Canonical category glyphs
are now supplied by this panel (the retained captures predate that correction). Residual text-only pixel shares have **not**
been isolated; no masking/cropping or relaxed thresholds were used. Adapter and
full-page closure remain unverified. A local *pre-change* authenticated
screenshot set was not captured; initial captures already include these changes.
Do not label them “before” evidence.

Browser verification passed all tab clicks/selection, ArrowRight, users and
subsection deep links, Settings and New entry (no save), and zero serious/
critical scoped axe findings at 375/1440. The minor invalid article/button role
was subsequently fixed by using a div for the interactive Stat container.
The follow-up change was type/lint/build checked, not re-captured.

Tester used `page.request` for direct admin probes and received 401; this does
not establish an endpoint outage (the signed-in UI's credentialed fetches
returned 200 in workflow logs). The continuation's real audit-key API checks
confirmed pending endpoint total = exact database pending count = 0, and latest
GitHub history = failed; see `checks/api-final.json`. The isolated rendered
failed-job dot assertion remains unverified. Use page-context fetch with a fresh
Clerk token for final verification, not APIRequestContext.

## Checks

- Final `npm run check`: PASS.
- Final scoped ESLint on all owned TSX: PASS.
- `npm run lint:css`: PASS.
- `npm run test:unit`: 15 files / 299 tests PASS.
- `dead-components`: 202 reachable, zero exceptions, PASS.
- Fresh `build-dist.mjs`, then `npm run bundle:budget`: PASS.
- Full lint: FAIL (5563 errors / 23 warnings at initial run); owned errors
  corrected afterward. No claim that the entire repository lint is green.
- Chromium legacy admin operations/users-audit specs: attempted 50 tests;
  partial passes and timeouts, no completed green result. See retained log.
- Broad responsive/tablet/print audits are deferred to the existing integration
  and final regression tasks, not claimed passing.
- Anonymous `/admin` screenshot confirms sign-in redirect still renders.

No duplicate follow-up task was proposed: the already scheduled integration
task owns these explicit outstanding checks and shared-surface changes.

## Continuation: owned implementation closure

Restored stat-title selectors, added keyboard focus styling to interactive
stats, and supplied canonical category glyphs. Active-user values always use
the real paginated users response, avoiding a different source for the roles.
Settings/New entry now reuse the canonical ghost/primary button classes;
metric label spacing and panel heading weight match the reference.
The final canonical-token gate exposed two owned utility overrides: removed
the unnecessary status-dot flex override and moved eyebrow spacing to a
layout wrapper, leaving the shared utility untouched. The gate and all its
canaries now pass (`checks/token-parity.log`); final CSS lint also passes.

Read-only development proof confirmed every Overview endpoint returned 200.
Database readiness and AI were healthy; GitHub latest history was failed
(31 failed / 7 completed jobs), enrichment contained 5 failed jobs, and link
history was empty. These are actual operational states, not synthetic healthy
fallbacks. No production data or shared identities were changed.

This leaf task supplies its implemented components and the evidence above to
the already scheduled integration task. It does **not** certify final full-page
parity, text-only residual shares, or the legacy e2e suite. Those remain explicit
integration/final-regression closure requirements under the parallel contract.

Completion review identified a same-value Radix selection issue when returning
from folded subsections. Explicit parent activation now resets the underlying
section on click, Enter, or Space. The targeted follow-up browser check passed
all nine transitions (Journeys → Research, Sub-Subcats → Subcategories, and
Digests → GitHub), including selected state, parent content and normalized hash.
See `checks/folded-parent.json`. Typecheck and owned lint passed afterward.

The automated completion batch also hit exit-134 process aborts in boot-safety,
font-prepaint and theme-registry checks. Its token gate identified only
out-of-scope resource.css overrides after integration changed the checkout;
the owned admin token overrides had already been removed and verified passing.
No unrelated resource styles or validation thresholds were changed.