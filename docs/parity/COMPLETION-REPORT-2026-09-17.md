# Completion report — 2026-09-17 verification pass

Working tree: HEAD `6462b2bd` plus the uncommitted changes listed under
[Changes made](#changes-made). No publish, production configuration change,
paid job, auth bypass, frozen-source write, expected-image write, threshold,
mask, crop, or inventory change occurred in this pass. Historical reports
([REPORT.md](REPORT.md), [STATUS.md](STATUS.md), [COMPLETION-REVIEW.md](COMPLETION-REVIEW.md),
[REFERENCE-ADJUSTMENTS.md](REFERENCE-ADJUSTMENTS.md)) are preserved; this file
supersedes nothing and adds the measurements below.

## Terminal state: BLOCKED (partial acceptance)

Everything the contract permits to be verified locally was executed and is
listed with literal output. The category pixel comparison still fails and
cannot be brought under the 0.5% ceiling without changes the contract
forbids (see [Remaining failures and blockers](#remaining-failures-and-blockers)).
Full lint, four unit tests and one integration test were already failing on the
base commit and are outside this pass's scope (project task 533 tracks the
suites). Post-publish verification is impossible because publishing is
prohibited.

## Acceptance table

Legend — **Source review**: a reviewer read the change and judged it against
the contract; **Runtime acceptance**: the required command ran against the
real app/artifact/DB and its verdict counts; **Diagnostic evidence**: a real run
whose result informs the picture but is not, by contract, an acceptance
denominator (visitor identity, `--only` scopes, out-of-scope suites).

| # | Requirement | Kind | Verdict | Command / evidence | Exit |
|---|---|---|---|---|---:|
| 1 | Forms artifact pixel parity at 375/768 | Diagnostic evidence (selected-rows run; the harness classifies every `--only` run as `selected-rows-diagnostic`, `Gate: NOT PASSED`) | **PASS rows** 0.0610% / 0.0332% | `BASE_URL=http://127.0.0.1:5000 ARTIFACT_BASE_URL=http://127.0.0.1:20928 node tests/parity/runner.mjs --only artifact.showcase,artifact.docs.forms,app.category --width 375,768` → [run 41477](../../tests/parity/baseline/2026-09-18T00-45-21-423Z-41477/REPORT.md) | 1 (category rows) |
| 2 | Showcase artifact pixel parity at 375/768 | Diagnostic evidence (selected-rows run) | **PASS rows** 0.0119% / 0.0019% (375×19349 tiled capture) | same run; re-confirmed after harness review fixes in [run 46597](../../tests/parity/baseline/2026-09-18T01-26-48-109Z-46597/REPORT.md) | 1 (category rows) |
| 3 | Category pixel parity at 375/768 (admin identity) | Diagnostic evidence (selected-rows run) | **FAIL rows** 5.9677% / 6.9788% (identical in runs 41477 and 46597) | same runs | 1 |
| 4 | Standalone determinism (3 captures byte-identical) | Runtime acceptance | **PASS** 3/3 cells identical (`artifact.docs.forms@375` 2609f95290cb ×3, `artifact.showcase@375` d8391555b155 ×3) | `/tmp/parity-run-10.log`; evidence `docs/parity/evidence/harness/determinism` | 0 |
| 5 | Authenticated run with disposable admin, net-zero teardown | Runtime acceptance (identity/teardown mechanics only) | **PASS** — run 46597: "disposable Clerk admin `2087056981` … torn down: local row deleted, Clerk user deleted, 0 `__qa_test_parity_` rows remaining"; "Inputs changed during run: no" | run 46597 REPORT.md lines 6 and 135 | 1 (pixel rows) |
| 6 | 50 system×accent theme matrix, persistence | Runtime acceptance | **PASS** 50/50 | `AUDIT_567_OUT=.cache/audit-567-run-2026-09-17 node scripts/audit-567-browser.mjs --phase all` (earlier), phases all `COMPLETE`; published `docs/parity/evidence/multi-system/audit-567-summary.json` | 0 |
| 7 | Route smoke across systems | Runtime acceptance | **PASS** 80/80 | same audit summary | 0 |
| 8 | Severe accessibility (axe serious/critical = 0) at 375/1440, public + admin | Runtime acceptance | **PASS** 108/108 executed rows, 0 serious/critical, 0 incomplete (12 state-only rows skipped by design). Admin approvals/edits/enrichment rows re-executed 2026-09-18 after the `<th>` fix: 0 violations. | `AUDIT_567_OUT=.cache/audit-567-run-2026-09-17 node scripts/audit-567-browser.mjs --phase axe --resume` → `/tmp/audit-567-axe-resume.log`: `axe rows 108, serious/critical 0, incomplete 0` | 0 |
| 9 | Design-system button/input/chip/card/h1/eyebrow sweep (public, admin tabs, overlays, canaries) with every fold revealed | Runtime acceptance | **PASS** `ALL 284 CHECKS PASSED` (category route now sweeps 72 buttons vs 48 before the fold reveal; every fold converged) | `node scripts/validation/ds-button-sweep.mjs` → `/tmp/gate-ds-button-sweep-6.log` (run 4, before the review-round widening: `ALL 284 CHECKS PASSED`, exit 0) | 0 |
| 10 | Type check | Runtime acceptance | **PASS** | `npx tsc --noEmit -p tsconfig.json` → `/tmp/tsc4.log` (`EXIT=0`, no diagnostics) | 0 |
| 11 | Production build | Runtime acceptance | **PASS** `✓ built in 24.06s` / `✓ built in 3.16s` | `npm run build` → `/tmp/build.log` | 0 |
| 12 | Local production-mode boot with development data | Runtime acceptance | **PASS** `[express] serving on port 5055 (production mode)`; health 200; **0** occurrences of `Host must not be empty` | `/tmp/prod-local.log` | 0 |
| 13 | Existing drift gates: palette-drift, accent-drift, dead-components, dead-exports, root-script-drift, standalone-palette-drift, admin-catalog-kind-mappings | Runtime acceptance | **PASS** each (`PASS palette-drift :: no off-system color/radius/font drift beyond the pinned baseline`; `PASS dead-components :: 218 … 218 reachable`; `PASS dead-exports :: 852 export(s) … 807 imported elsewhere, 45 pinned`; `PASS root-script-drift :: 28 … 0 stray`; `PASS standalone-palette-drift :: 1 root(s), 13 source file(s)`; `PASS frozen-reference :: awesome-list-site-ds byte-identical to attached_assets/awesome_list_site_2_1789019068732.zip`; `PASS accent-drift`; `PASS admin-catalog-kind-mappings`) | `/tmp/gate-<name>.log` | 0 |
| 14 | Full lint | Diagnostic evidence | **FAIL** `✖ 5310 problems (5287 errors, 23 warnings)` — pre-existing on HEAD (never green; see memory "last-green baselines") | `npm run lint` → `/tmp/lint.log` | 1 |
| 15 | Unit suite on an isolated DB | Diagnostic evidence | **FAIL** `Tests 4 failed \| 311 passed (315)`; failing: `login-form-defaults` (legacy login URL invariant) and 3 `sidebar-ux-css` static guards — all pre-existing static-source assertions unrelated to this pass | provisioned `heliumdb_test_parity_20260918T000947` (created, schema applied, dropped) → `/tmp/vitest-unit.log` | 1 |
| 16 | Integration suite on an isolated DB | Diagnostic evidence | **FAIL** `Tests 1 failed \| 225 passed (226)`; failing: `GET /api/admin/stats … for admin user` — pre-existing (task 533) | same dedicated DB → `/tmp/vitest-int.log` | 1 |
| 17 | Published SSR `Host must not be empty` — local investigation only | Diagnostic evidence | **DIAGNOSED, not re-verified in production** — see [SSR diagnosis](#ssr-diagnosis) | commit `83022704` check record; `/tmp/prod-local.log` = 0 occurrences | — |
| 18 | Independent code review of this pass's changes | Source review | Two rounds, both **FAIL** on first read; 8 findings: 7 fixed, 1 rejected with citation (below) | code-review subagent, git diff + relevant files | — |
| 19 | Publish / post-publish checks | — | **NOT RUN** (prohibited) | — | — |

**No full-inventory parity run was executed in this pass**, so no
whole-inventory pixel acceptance is claimed. Rows 1–3 are selected-row
diagnostics: they show that the Forms/Showcase artifact rows and the harness
repairs behave as intended at 375/768, and that the Category rows still fail;
they do not certify the other pixel rows, widths 1024/1440, or the gate. The
last retained full-inventory run
([2026-09-17T11-42-39-272Z-11572](../../tests/parity/baseline/2026-09-17T11-42-39-272Z-11572/REPORT.md),
133 pass / 51 fail of 184) predates every repair in this pass and remains the
historical whole-inventory record. Of the checks that did run, the only
failures introduced or left by this pass are the Category rows; lint and the
five test failures pre-date it.

## Changes made

Harness-correctness fixes (disclosed; none alters thresholds, masks, crops,
expected pixels, or inventory):

- `tests/parity/readiness.mjs` — full-page capture above Chromium's ~16384px
  ceiling is tiled and stitched; canvas width = max(clientWidth,
  documentElement.scrollWidth, body.scrollWidth) to match Playwright's
  `fullPage` extent (reviewer finding 1).
- `tests/parity/reference-adapter.mjs` — the run-input fingerprint keeps the
  semantic operations-health fields the reference paints (`ok`, `status`,
  `lastProbe.ready/reason/errorClass`) and drops only per-request telemetry
  (reviewer finding 2). Runtime-confirmed: run 46597 reports
  "Inputs changed during run: no" under admin identity.
- `scripts/validation/ds-button-sweep.mjs` — every swept surface (each public
  route's `main`, each active admin panel) is revealed before its sweep: all
  collapsed `:is(button,summary)[aria-expanded="false"]` disclosures
  (excluding popup, combobox and tab triggers) are opened, all visible ones per
  round, looping because one reveal can expose another, with a keyboard
  fallback for keyboard-first toggles (the users panel's
  opacity-0-until-focus "More"). The reveal must converge: a toggle that does
  not flip, or collapsed controls still visible after the bound, FAIL the gate
  rather than sweeping a partial surface. Expected elements that live inside a
  fold are waited for by reveal-check-repeat. This only **adds** elements to
  the swept surface; the pass rule (0 stray, non-vacuous, canaries) is
  unchanged. Retargeted the export tab expectation from copy
  (`button:has-text("Export Markdown")`) to `[data-testid="button-export-markdown"]`.
- `scripts/validation/ds-button-filter.mjs` + `.agents/skills/verify-design-system/SKILL.md`
  — h1 exclusion for the frozen taxonomy title, resolving the documented
  source/gate conflict (COMPLETION-REVIEW item 4: the frozen `pages.jsx`
  renders that h1 in body face). After review the exclusion is narrow
  (`main .taxonomy-page > .taxonomy-header > h1.taxonomy-title` only) and
  positive (the computed face must equal the `--font-body` family), so no
  other h1 can opt out by borrowing the class. Literal-token parity between
  the two files holds.
- `tests/parity/report.mjs` — the capture-contract sentence now discloses the
  lossless tile-and-stitch path instead of saying "no post-processing".

App fixes surfaced by the widened sweep (design-system hooks, not pixel
tuning):

- `GitHubSyncPanel.tsx`, `BatchEnrichmentPanel.tsx`, `ResearcherTab.tsx` —
  three hand-rolled `<span class="chip …">` status badges replaced by the
  shared `StatusChip` primitive.
- `BatchEnrichmentPanel.tsx` + `queues-agent.css` — three hand-rolled
  `.mono` stat cards replaced by the shared admin `Stat` primitive (its
  `.eyebrow` label); the duplicate child typography rules were removed so the
  primitive is the single owner.
- `TaxonomyListing.tsx` + `taxonomy.css` — the "View" row label is the plain
  DS `.eyebrow` helper; hand-pinned mono/uppercase/tracking removed. A first
  attempt to mute its ink to `--text-3` did not apply (the per-system
  `[data-system] .eyebrow` rule wins) and was removed rather than escalated —
  accent eyebrow ink is the system's contract. The label sits inside the
  folded "Filters & view" tools, so category pixel numbers are unchanged
  (identical in runs 41477 and 46597).
- `PendingResources.tsx`, `PendingEdits.tsx`, `ResearcherTab.tsx`,
  `BatchEnrichmentPanel.tsx` — action columns gained sr-only `<th>` text
  (axe `empty-table-header`, moderate). Evidence re-executed (row 8).

Artifact: `artifacts/awesome-video-design-system/src/canonical/*` and
`index.css` — showcase/docs parity corrections from the earlier part of this
pass (reviewed; see REFERENCE-ADJUSTMENTS). The artifact's
`@import "../../../client/src/styles/design-system.css"` is pre-existing since
the artifact was created (2026-09-05) and is the documented architecture:
`replit.md` ("Design-System scope") states that the living artifact imports
`client/src/styles/design-system.css` and `design-system.ts` directly and that
runtime sources, artifact and template are one release — never a parallel
token implementation. The reviewer asked for the artifact to stop consuming
app CSS; that would create exactly the parallel implementation `replit.md`
forbids and is outside this pass's authority, so it was **not** done. The
import does not touch the expected renderer (the frozen reference is served
from `awesome-list-site-ds/` with in-memory adjustments only), so the
"no app CSS into the expected renderer" rule is intact.

## Independent review

Round 1 (FAIL, 3 findings): (1) tiled-capture canvas width narrower than
Playwright's fullPage extent — fixed; (2) fingerprint exclusion of the whole
operations endpoint too broad — narrowed to telemetry leaves only, runtime
confirmed in run 46597; (3) artifact CSS import — see round 2. It also flagged
stale axe evidence for approvals/edits/enrichment, which was re-executed (row 8).

Round 2 (FAIL, 5 findings) on the sweep generalisation and primitive swaps:

1. **HIGH — fold reveal only ran for routes declaring `revealTools`, opened
   one toggle per round, and returned silently at the bound.** Fixed: every
   swept surface is revealed, all visible toggles per round, and
   non-convergence or a non-flipping toggle fails the gate (see Changes made).
   Rerun: `ALL 284 CHECKS PASSED`, exit 0 (`/tmp/gate-ds-button-sweep-6.log`);
   the plain category route now sweeps 72 buttons instead of 48.
2. **HIGH — the artifact's `index.css` imports `client/src/styles/design-system.css`
   ("app CSS into the reference").** Rejected. The import is pre-existing and
   is the documented architecture (`replit.md`, "Design-System scope": the
   living artifact imports that file directly; never create a parallel token
   implementation). The expected renderer is the frozen `awesome-list-site-ds/`
   source, which the artifact does not feed; removing the import would breach
   `replit.md` and is outside this pass's authority.
3. **MEDIUM — selected-row runs presented as runtime acceptance and a
   "no post-processing" claim that the tiled path contradicts.** Fixed: rows
   1–3 reclassified as diagnostic evidence, the whole-inventory statement
   added above, and the report's capture-contract sentence now discloses the
   tile-and-stitch path.
4. **MEDIUM — `.taxonomy-view-toggle-label { color: var(--text-3) }` is
   overridden by `[data-system] .eyebrow`, so the documented muting never
   applied.** Fixed by removing the dead override and the class; the DS accent
   eyebrow ink stands (the system's contract), report wording corrected.
5. **MEDIUM — the h1 exclusion keyed on the bare `.taxonomy-title` class,
   which any h1 could borrow.** Fixed: the exclusion matches only
   `main .taxonomy-page > .taxonomy-header > h1.taxonomy-title` and asserts the
   computed face equals `--font-body`; SKILL.md updated in lockstep
   (`filter-parity-h1s: 9 filter literals identical`).

No third round was run: the fixes are mechanical follow-through on the
reviewer's own recommendations, not new design.

## SSR diagnosis

`Host must not be empty` is Clerk's `publishableKeyFromHost` running at module
evaluation inside the SSR renderer bundle, where there is no browser host. The
renderer import rejects, `server/ssr.ts` logs it and the middleware serves the
SPA shell. Commit `83022704` (2026-09-17) changed `client/src/App.tsx` to
resolve the explicit `VITE_CLERK_PUBLISHABLE_KEY` at module evaluation and to
throw a clear "Missing VITE_CLERK_PUBLISHABLE_KEY" configuration error when it
is absent (no fake fallback). Its recorded check built the renderer with
`vite build --ssr` to a /tmp outDir, imported it (`renderer import ok
renderHome export present`) and rendered the real anonymous Home payload
(73096 bytes HTML, 3 dehydrated queries). The current local production-mode
boot (row 12) logs zero occurrences. The published deployment's logs predate
that commit; confirming the fix in production requires a republish, which this
pass may not perform.

## Remaining failures and blockers

1. **Category pixel rows (375: 5.9677%, 768: 6.9788%)** — the remaining
   difference is composed of behaviour the contract or approved references
   require but the frozen design lacks or contradicts: the resource **kind
   badge** (explicitly retained; hiding it was rejected), the production
   "Filters & view" controls, the tablet hamburger, the frozen sidebar Home
   button's UA face, and the header at exactly 768. Each candidate fix was
   evaluated and rejected as either a forbidden expected-side edit, a hidden
   feature, or an app regression. No further contract-compatible change is
   known that would bring these rows under 0.5%.
2. **Lint / 4 unit / 1 integration** — pre-existing failures on the base commit
   (task 533 covers the suites). Not repaired here to keep the pass scoped.
3. **Publish and post-publish verification** — prohibited; the SSR fix is
   therefore verified locally only.

## Out-of-scope follow-ups

- Re-execute the axe phase after any further admin table change (`--resume`
  reuses PASS rows; delete the affected rows first).
- `heading-order` (moderate) on researcher/export/digests and the shared
  landmark findings on search/loading/empty-search states remain
  non-blocking moderate items.
- Nine admin tables (categories, database, github, linkhealth, resources,
  subcategories, users, …) still carry the moderate `empty-table-header`
  finding; same sr-only `<th>` treatment applies.
- Task 533 (test-suite trust) and the lint baseline.
