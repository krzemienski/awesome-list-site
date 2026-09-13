# About and Submit — owned-page handoff

Date: 2026-09-13. This is an **implementation/integration handoff, not a
whole-page pixel closure claim**. The parallel execution contract assigns
shared-shell and final whole-page closure to the downstream integration task.
No aggregate inventory, frozen design, shell, authentication, or backend file
was edited.

## Delivered

- Page-imported `about.css` and `submit.css`, with 760px/720px maximum columns.
- Canonical eyebrow, mixed body/display heading, card, field and action
  composition. A second About correction removed noncanonical all-serif
  heading, centering, card shadow, callout minimum height and mobile lead
  padding overrides. Shell gutters remain the shell owner's responsibility.
- Shared maintainer bio and FAQ data remain authoritative. FAQ now opens and
  closes by keyboard. Existing page testids and legal/deletion destinations
  remain; ten FAQ button testids are additive.
- RHF schema, render-time `isDirty` subscription, draft protection, real
  taxonomy queries, submission payload, success state and consent handling
  remain intact.
- Fixed a verified duplicate-warning contract bug: the public endpoint returns
  `{exists}`, not resource details. The warning now consumes that boolean.
  Cancelled requests cannot overwrite a newer effect's result.
- Category/subcategory/sub-subcategory and tags remain real fields. There is
  no existing notes field in the schema or payload; no misleading unsaved
  notes control was invented. See `submit-handoff.md`.

## Real-system verification

| Check | Result and proof |
|---|---|
| `npm run check` | PASS, `evidence/check.log` |
| `npm run lint:css` | PASS; final owned CSS rechecked after the last style correction, `evidence/final-css.log` |
| `npm run test:unit` | PASS, 15 files / 299 tests, `evidence/unit.log` |
| `dead-components` | PASS, 199 reachable files, `evidence/dead.log` |
| `responsive-audit` | PASS, 32 checks, `evidence/responsive.log` |
| `print-audit` | PASS, 49 checks, `evidence/print.log` |
| `seo-snapshot --gate --parity` | PASS, 2,334 URLs, no failures; `evidence/report.md`, `evidence/metrics.json` |
| Repository lint | FAIL, 5,565 errors / 23 warnings. Owned About: zero. Submit: 9 errors, down from 15 in HEAD; remaining draft-parser/nullish findings predate this work. Exact messages in `evidence/lint-comparison.json`; no claim that repository lint is green. |
| Auth return | PASS in completion validation, 30/30 including recovery and zero audit users left; `evidence/auth-return-final.log`. The earlier run passed all deep returns but timed out waiting for Clerk's “forgot password” control; its original `evidence/auth-return.log` is retained. No auth implementation change was needed. |
| Empty form / taxonomy / dirty cancel | Real browser exercised required title, URL and description messages, category options, dependent subcategory, and discard confirmation. |
| Submission | Real uniquely titled `__qa_test_545_…` resource created; independently confirmed **pending** through admin API. |
| Cleanup | Initial tester incorrectly treated Playwright's `response.ok` method as a boolean and its deletion did not succeed. Parent corrected the cleanup using the admin API with Origin, verified DELETE 200 and absence of exact owned resource 188309. `evidence/resource-cleanup.log` is authoritative. |
| Duplicate URL | Focused real typing check passed after the fix; clearing the URL removed the warning. `evidence/focused.log`. |
| FAQ | Enter opens and closes the actual FAQ trigger at 375 and 1440; same focused log. |
| axe | Settled About and authenticated Submit: zero serious/critical violations at 375/1440, `evidence/settled-axe-*.json`. Initial tester captured route skeletons, so those first captures are **not accepted page evidence**. Final About CSS changes only typography/spacing, not ARIA structure or colors. |
| Consent at 375 | Banner explicitly reopened, primary CTA scrolled into view; bounding boxes do not intersect. `evidence/focused.log`. |

The focused run has one historical FAIL (“prior disposable resource removed”);
the subsequent exact-ID admin cleanup above resolves it. Do not reinterpret
that log as an entirely green initial run.

## Full-page pixel results — still FAIL

Threshold remains pixelmatch **0.1**, ceiling **0.5%**, complete union canvas.
No masking, cropping, frozen-source edits or eligibility downgrades.

First owned-page run:
`tests/parity/baseline/2026-09-13T00-18-20-664Z-2728/`.
Final About refinement:
`tests/parity/baseline/2026-09-13T00-25-55-020Z-5707/`.
Both have full actual/expected/diff, capture hashes, two consecutive stable
raw frames per side, font checks and unchanged-input provenance. They are
selected-row diagnostics, not replacements for the aggregate report.

| Page | 375 | 768 | 1024 | 1440 |
|---|---:|---:|---:|---:|
| About, first pass | 67.5144% | 66.2688% | 72.6241% | 71.1416% |
| About, final correction | 67.7007% | 66.3032% | 72.6082% | 71.2409% |
| Submit, authenticated empty | 38.6861% | 29.5693% | 11.0056% | 18.4333% |

Every cell is measured, none is blocked or incomplete. Submit was already
classified as an admin-session pixel row in the merged inventory at task
start; no duplicate promotion or aggregate edit was necessary.

### Integration residuals

1. The current app shows a desktop sidebar on these routes; the reference
   does not. Shared header, footer, gutters and backdrop-filter set also
   differ. These are not page-owned CSS changes.
2. About must retain shared maintainer/legal/FAQ content, unlike the reference's
   short opening-only page. This produces a much taller full union canvas.
   Source/platform/features/credits content was retained rather than silently
   deleted. Truthful callouts replace unestablished claims about quarterly
   snapshots and every entry being tested. These differences are explicit,
   not grounds to report pixel PASS.
3. Submit retains help/error messaging, conditional taxonomy depth, signed-out
   guidance and success UI absent from the static reference. Empty-form help
   text increases height. Integrator must retain functionality while resolving
   the original pixel target or explicitly obtaining a product decision.
4. Repository lint remains non-green. Final regression must resolve or
   explicitly disposition it; this leaf does not relax gates. The later
   completion run passed the full Clerk recovery gate.

## Production baseline comparison

Read-only comparison used the committed production capture from 2026-09-12;
no publishing or production mutation occurred.
`evidence/production-compare/` retains the report and union comparison strips,
including About 375/1440. Strips are visual evidence, **not** a pixel gate.

- `/about`: 200, same redirect chain and title; requested new h1 and added FAQ
  controls are expected differences. No old page-owned testid removed.
- `/submit`: **200 with no redirects**, matching production. The task's
  description of a visitor HTTP redirect was stale: the real page presents
  an in-place sign-in requirement and disabled fields. Sign-in link remains
  `/sign-in?redirect_url=%2Fsubmit`; noindex remains intact.
- Desktop removed testids in the compare are taxonomy/sidebar entries from
  differing data, not deleted form/About selectors.
- The comparison exited 1 for deliberate heading/control and independent API
  data differences. It is not a regression-free or pixel-equal claim.
- Baseline strips precede the final About typography-only refinement;
  the final canonical harness folder above is the current About visual proof.

## Handoff

Both pages import their scoped CSS directly; no shared import wiring needed.
Apply `inventory-proposal.json` as notes to existing rows, not new rows.
Do not merge these diagnostics over aggregate reports. The existing downstream
integration/final-regression tasks own full-page closure; no duplicate
follow-up task was proposed.

## Completion validation corrections

The completion suite found a raw 1px border and a page selector targeting the
shared `.serif-italic` class. These are now a `--border-w` token reference and
a dedicated `.submit-title-accent` class, respectively. The Editorial painted
values are unchanged. Both `palette-drift` and `canonical-token-parity` now
pass (`evidence/palette-final.log`, `evidence/tokens-final.log`). No exception
or weakened gate was added. CSS lint also passes.

The first completion attempt's managed code review timed out after 600 seconds.
The reported managed-review log file was not present in the workflow-log
directory; no review result or approval is inferred from that infrastructure
timeout. Completion is being retried with a fresh review.