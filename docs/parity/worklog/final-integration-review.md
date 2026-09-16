# Task 565 integration audit — source and retained evidence

**Audit status: source wiring reconciled; public comparison completed with
tracked dispositions; corrected real-Nick admin UI and normal-app auth
functional contracts pass. The separately injected-abort cold read-only
diagnostic remains FAIL, but is not a release gate or an application-auth
regression.**
This is a documentation/source review, not a browser run, production query,
production mutation, publish, or completion claim. The review deliberately does
not reclassify any historical capture as current proof after source changes.

## Resolved owned-source handoffs

The parent applied both required shared-source corrections; this audit verified
their source form and refreshed the inventory/SCREENS aggregation.

1. **Admin footer:** `MainLayout.tsx` now mounts `AppFooter` only when
   `!isAdmin && publicConfig?.site`. This preserves non-admin footer contracts
   while satisfying the source requirement for `/admin`.
2. **Canonical Research:** the `content-research` panel now mounts
   `<ResearcherTab initialTab="review" />`. `app.admin.research` is a real
   pixel-eligible inventory row at `/admin/research`; it is no longer falsely
   described as a missing counterpart.

The source corrections require executable candidate evidence. The public
comparison has since completed and is recorded below; it does not close the
admin contract or any tracked public delta.

## Static wiring review

| Requirement | Source result | Evidence/status |
|---|---|---|
| Shell row and geometry ownership | Present: header, `.app-shell-row`, persistent `AppSidebar`, `main#main.app-shell-main`, token-backed `.page-content-wrap`, grain and separate footer row are composed in `MainLayout`; `layout.css` supplies `min-width:0`, outer padding and `--content-max-admin`. | The footer is now explicitly excluded for admin. Route-dependent sidebar hiding is intentional and documented. |
| Sticky-safe horizontal clipping | Present: `MainLayout` documents and uses the shell main class; retained integration audit reports `clip`, not hidden. | Retained audit result is historical only until the frozen-source rerun. |
| `/admin` and `/admin/:section` | Present in `App.tsx`, both protected by `AdminGuard` and render the lazy dashboard. `AdminDashboard` normalizes section/hash/query aliases. | `/admin/research` and `/admin#research` now have an explicit review-panel executable contract. |
| `/settings` preference handoff | Present: `Settings.tsx` imports and mounts `HomeLayoutPreferenceControl`; Home’s handoff specifies visitor safe-storage and signed-in preference persistence. | No duplicate preference implementation or missing route wiring found. |
| `/settings/theme`, `/design-system`, legal routes | Present in `App.tsx`; all are inside `MainLayout`, so the shell requirement is met statically. | `/design-system` is the in-app `DesignSystemShowcase`, not the independently deployed artifact docs. This matches the current documented route contract. |
| Artifact docs router and generated docs | Present and separate: artifact `src/App.tsx` maps `#docs-*` to `CanonicalDocs`; it has 21 navigation IDs, matching the 21 `artifact.docs.*` aggregate entries. Generated Markdown contains 18 frozen chapters plus README; the live docs also expose the three authored pattern chapters. | Retained `functional.json` records every hash, anchor/reload and history check. No route-wiring source gap found. |
| Header “Docs ↗” destination | It still links to `/design-system` in a new tab. | This is a documented provisional decision in `shell-header.md`, not evidence that artifact documentation is missing. A product decision is required before redirecting it to a separately registered artifact URL. Do not silently change the destination. |

## Inventory and documentation reconciliation

The refreshed aggregate has **83 unique IDs** across ten families, including 21
`artifact.docs.*` IDs; the static duplicate-ID check found none. The legacy
blocked `app.design-system` duplicate route was removed in favor of the
retained `app.system.design-system` token-only row. This is not a final
acceptance report.

The following documentation/inventory issues require integrator disposition:

1. `SCREENS.md` now reports the 21 artifact-doc mappings and retained
   four-width captures. Its pixel disposition remains downstream artifact-docs
   work; retained 0.5%-ceiling results are not relabelled as passing.
2. `tests/parity/inventory/admin.json` now maps Research to
   `/admin/research`, `admin-tab:research`, and
   `[data-testid=content-research] [data-testid=research-review-panel]`.
   `SCREENS.md` records the same source wiring and pending real-data capture.
3. The static duplicate app design-system row was removed. `config.json` now
   aliases `screen.design-system` to the one retained token-only system row;
   artifact showcase/docs eligibility is unchanged.
4. `SCREENS.md` now describes the retained authorized `/admin` production
   capture accurately as route-level 375/1440 baseline evidence, not an
   all-tab comparison.

## Production comparison: retained facts and classification

The fresh Task 565 public comparison is summarized in
[`task565-public-compare-2026-09-13.md`](../evidence/integration-shell/task565-public-compare-2026-09-13.md);
the detailed generated output remains in
`/tmp/validation/task565-public-compare/`. It reused the 2026-09-12 retained
baseline from `https://awesome.video`, compared `/`, `/about`,
`/category/encoding-codecs`, and `/resource/185020` at the existing
four-width/full-page scope, and completed without missing units, throttling, or
capture failures. All four routes returned 200 with the same redirect chains
and zero serious/critical axe findings at 375/1440. It still reports 17
tracked deltas, so it is not a no-regression pass.

Classify the retained differences precisely:

| Class | Retained examples | Disposition |
|---|---|---|
| Real environment/data divergence, not a missing selector | Production has 3,824 catalog resources versus local 1,817; listing total is 579 versus 333; local rows and related-resource IDs differ. Production/local taxonomy cardinalities differ (subcategories 99/92, L3 32/27, tags 1,541/1,535). | Do not seed, delete, or mutate production/local data to force equality. Preserve as data-qualified deltas and compare contracts/order where the same data is available. |
| Intentional presentation/route changes, still tracked | New Home metrics/kind selectors, About’s changed heading and FAQ controls, shell breadcrumb/footer additions, and the canonical desktop-hidden drawer trigger. `mobile-drawer-trigger` remains in `AppHeader.tsx`; it is a visibility delta at 1440, not a removed source selector. | Keep them tracked until accepted against the no-removal policy; intention alone is not a PASS. |
| Stateful functional controls with differing defaults | The common-state proof verifies the real account-context recommendation links, 1024 drawer More/taxonomy disclosures, and 1025 keyboard-selected compact rail with genuine route targets. It also records the canonical 768 default drawer/rail difference. | This is **no stateful functional removal** proof, not an identical-default-DOM claim. Keep any retained default-visibility comparison distinct from functional reachability. |

The retained admin production sample is intentionally separate from the public
baseline. It exists at
`retained-controls/production-admin/summary.json` for route-level `/admin`
375/1440 comparison only. The first candidate invocation failed before any
navigation because its default Playwright Chromium 1228 headless shell was not
installed. The script now honors
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; a fresh read-only candidate comparison
is still required using the installed Chromium 1223 executable. It must not
run mutations, exports, role changes, or fixture cleanup.

## Leaf handoff ledger (non-overlay/performance)

| Leaf / record | Integration-relevant remaining item |
|---|---|
| Admin shell/overview | Footer source correction is present; preserve 1400 outer/1280 inner measures and run the prepared post-fix candidate capture. |
| Admin catalog | Reconcile expected pagination/data rather than unpaginate app; reverify taxonomy invalidation, detail/Home/Audit/rollback obligations. |
| Admin queues | Research review source wiring is present; use a real-data adapter. Outstanding all-tab axe, job-query failure and visual rows remain open. |
| Operations | Pixel rows and token-only digest/contact surfaces remain open; no separate agent-settings panel was identified. |
| Home | Settings preference is wired; real-feed/count distinctions are documented. This audit does not reopen Home visual ownership. |
| Taxonomy/resource/about/submit | Their retained functional evidence does not close full-page data-adapter/pixel work; preserve their explicit live-data and truthful-content residuals. |
| Palette/footer/header/sidebar | Imports are self-contained according to their handoffs. Do not add duplicate shared imports. Their overlay/performance closure is outside this audit. |
| Artifact docs | Router/inventory mapping exists; retained four-width results include failures and need current frozen-source disposition before any final closure. |

## Exact executable checks (run only after parent freezes source)

These are commands/checks to schedule, not commands executed by this audit.

1. **Static preflight after the two source fixes**
   ```sh
   git diff --check
   npm run check
   npm run generate:design-system-artifact -- --check
   node tests/parity/inventory.mjs --check
   ```
2. **Targeted admin candidate contract and retained-baseline comparison**
   ```sh
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$PWD/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome" \
    node --import dotenv/config docs/parity/evidence/integration-shell/capture-admin-candidate.mjs \
     --base http://127.0.0.1:5000 \
     --out /tmp/validation/task565-admin-candidate
   ```
   The executable performs only safe GET navigation, uses the existing
   audit-key admin, and writes a redacted `summary.json`. At 375 and 1440 it
    checks only `/admin`, `/admin/research`, and `/admin#research` at 375 and
    1440: status/final path, authorization after API quiet,
   selected visible tab/active panel, no visible `.site-footer` or `footer-*`,
   Research review panel, zero serious/critical axe, zero non-safe
   requests/read aborts, Settings navigation, and New-entry dialog opening.
    It reuses—not recaptures—the retained production `/admin` baseline and
    reports concrete visible-test-id set differences without misclassifying
    data-derived IDs.
3. **Existing public comparison command** (separate from the authorized admin
   candidate check):
   ```sh
   npm run baseline:compare -- \
     --baseline tests/parity/production-baseline/2026-09-12 \
     --against http://127.0.0.1:5000 \
     --routes /,/about,/category/encoding-codecs,/resource/185020 \
     --out /tmp/validation/task565-public-compare
   ```
    Completed 2026-09-13T21:45:07.861Z with 17 tracked deltas and no capture
    failures. Preserve its data-qualified deltas rather than treating them as
    selector removals.

## Historical acceptance checklist remaining from this audit

- [x] Admin footer source correction.
- [x] Admin Research `initialTab="review"` source correction.
- [x] Aggregate inventory/`SCREENS.md` reconciliation for Research, app
  design-system coverage, artifact-docs capture scope, and admin evidence scope.
- [ ] Frozen-source read-only candidate run of
  `capture-admin-candidate.mjs`, using the installed Chromium executable and
  retained production `/admin` baseline.
- [ ] Public status/test-id comparison dispositioned by data vs selector/state.
  The fresh run completed, but its 17 tracked deltas have no unsupported “no
  removals” PASS.
- [ ] Fresh, frozen-source evidence for the above before relying on historical
  E2E/audit/build results.

Overlay pixel closure and Lighthouse/performance recovery were intentionally
not owned or evaluated by this historical review. At that point, the separately
authorized performance result was 54 with zero blocked requests, below the
required 82, and was FAIL; the current strict-remeasurement status is
authoritative below.

## Frozen-run result addendum — superseded by current retained controls

The complete sanitized record is
[`task565-final-evidence-2026-09-13.md`](../evidence/integration-shell/task565-final-evidence-2026-09-13.md).
The selected palette diagnostic now passes all four widths
(0.4140/0.3748/0.3185/0.3755%), and typecheck/build/bundle budget completed;
the build has retained CSS warnings. Public comparison completed without
transport or serious/critical axe failures but retains 17 deltas.

The historical candidate diagnosis is superseded by the retained corrected
real-Nick records in
[`task565-final-evidence-2026-09-13.md`](../evidence/integration-shell/task565-final-evidence-2026-09-13.md).
All six `/admin`, `/admin#research`, and `/admin/research` captures at 375 and
1440 pass UI/status/settled-axe/action assertions with real authenticated
storage state. The strict guard still injects refusals for Clerk's exact
development `/v1/environment` initialization POST and two Clerk
token-polling/load Blob Worker attempts per relevant document. This separately
retained diagnostic FAIL is not a release gate and not a UI, authorization,
deep-link, Settings, New-entry, axe, or normal-app authentication failure; no
exception or guard waiver has been made.

## Current integration aggregation — evidence separation

This section is the current state and supersedes stale pending-admin,
historical-404, historical-admin-axe, and performance wording above. The
authoritative current report is
[`task565-final-evidence-2026-09-13.md`](../evidence/integration-shell/task565-final-evidence-2026-09-13.md#authoritative-current-status).
It is not a final completion, publication, or broad pixel/resource acceptance
claim.

| Area | Current retained fact | Status |
|---|---|---|
| Approved Home SSR scope | Exact-tree SSR is implemented for anonymous public Home only: public data bootstrap, no dehydrated auth, fresh post-hydration auth fetch, legacy Curated/consent reconciliation and reopen, four-second fallback clearance, theme hydration, and exact configured Clerk CSP. | [`hydration-summary.json`](../evidence/integration-shell/retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/hydration-summary.json) and [`review69-runtime-summary.json`](../evidence/integration-shell/retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/review69-runtime-summary.json) pass. Signed-in and request-query paths retain the SPA path; no auth bypass. |
| Deployment-equivalent performance gate (Task 572) | **OPEN in Task 572 — 82 remains required, no waiver.** Latest real production-build 5105 normal/unintercepted Lighthouse: **71**, **60**, **68**, median **68 FAIL**. It predates final auth, CSP, and recovery fixes, so it is historical, not a fresh final-gate measurement. | [`normal-lighthouse/fixed-3cold/scores.json`](../evidence/integration-shell/retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/scores.json). Task 572 owns deployment-equivalent resolution. Local development Clerk differs from the published live-key baseline; required environment/permission neither waives 82 nor authorizes publication. |
| Targeted real-Nick admin | All six targeted UI/status/settled-axe/action contracts pass at 375/1440. The declined-consent and partial initiator runs identify the separately injected-abort POSTs as Clerk `/v1/environment`; Blob Worker initiators are Clerk v6 `clerk.browser.js` token-polling/load paths, not Amplitude. | Functional admin PASS. The cold read-only FAIL is a non-gating historical diagnostic without an admin exception or allowance; it is not a release gate. |
| Normal-app authentication | Real disposable Nick sign-in, admin `/api/auth/me` 200, reload retention, public Clerk readiness plus real cache-bypass token refresh/API 200, UI sign-out/API 401, local protected-route sign-in return, and teardown all pass in the normal 5000 app lane. | Functional auth PASS; no authentication change is made or proposed, and this is not a pixel or read-only-matrix result. |
| Common-state functional controls | The focused real-guest proof verifies reviewed recommendation, drawer/More/taxonomy, and compact-rail controls through their actual state transitions and route targets; it retains the canonical 768 default difference. | No stateful functional removal proven; not an identical-default-DOM or blanket visual-parity claim. |
| Current normal-auth admin shell | The real-Nick [`current-admin-shell/summary.json`](../evidence/integration-shell/retained-controls/current-admin-shell/summary.json) passes all six checks at 375/768/1024/1440: capture count, authorization marker, absent footer, no horizontal overflow, `1400px` admin measure token, and teardown. | Token-only shell geometry/screenshot PASS; explicitly not an admin-body pixel pass. |
| Home visual evidence | Current selected Nick matrix: all 16 Home Index, Home Curated, Drawer, and Palette rows at 375/768/1024/1440 pass the 0.5% ceiling; each actual and expected capture has equal attempt-1/2 hashes, with no app/reference API failures. Source is clean commit `a4a7586776406e1dd27936a8a2af6f9dac911035` and the frozen 9-category/1,817-resource snapshot against the in-memory reference snapshot. | [Run `2026-09-14T16-23-53-893Z-1807`](../../../tests/parity/baseline/2026-09-14T16-23-53-893Z-1807/results.json) records 16 PASS, 0 fail/incomplete. The run-owned admin Nick identity was deleted locally and in Clerk without errors; existing identities remained. This is explicitly `full: false` selected-row evidence (`gatePassed: false` at aggregate scope), not a full-suite, all-screen, or all-resource claim. Retained visitor token-only evidence is not a new pixel result. |
| Current build/budget | Current typecheck, production build, and bundle budget pass; initial gzip is **194.5 KiB** with unchanged caps. | Runtime review records validation PASS. Earlier scoped-CSS `/tmp` logs remain unavailable and are not presented as retained artifacts. |
| Completion-validation and audit recheck | **HISTORICAL / UNVERIFIED.** Earlier notes reported final responsive **58/0** and Design System **284/0** checks passing. The five initial source-gate failures were reported corrected: unused `use-theme`, Drawer Escape's actual-opener restoration, forced-colors cookie-button border, non-vacuous settled DS account Home `h1`, and Tailwind `source(...)` parsing. Type, parser, and full canonical cheap checks were reported passing. | **UNVERIFIED — missing retained artifact:** the original path `../evidence/integration-shell/retained-controls/completion-responsive-design-system-2026-09-14.log` is unavailable in this checkout; no replacement log is asserted. The historical note reports last platform-run commands other than external `code_review` passing; `code_review` timed out twice at 600 seconds and is **not PASS**. Independent architect review 94 reported no final critical SSR issue. The parent was to submit an audited infrastructure timeout exception, not a hidden validation waiver or performance claim. The audit-only optional route settle and observed 687 ms actual focus return replaced a 400 ms sleep without changing normal pixel geometry; no 16-row rerun was claimed or required. |
| Resource breadcrumb disclosure | The legacy ellipsis test ID was restored as a real ancestor-link disclosure where applicable. The focused guest check in [`task565-breadcrumb-disclosure-2026-09-13/REPORT.md`](../evidence/integration-shell/task565-breadcrumb-disclosure-2026-09-13/REPORT.md) passes at 768/1024 with real ancestor link, Escape focus return, stable geometry, and no horizontal overflow; it is absent by design at 375/1440. | Functional focused PASS; not a four-width full pixel-resource PASS. |
| Public/API functional dispositions | The retained comparator's **17** functional dimensions are closed with current per-delta dispositions and canonical reachable-state proof. | Not an identical-default-DOM, data-snapshot, or blanket pixel-parity claim. |

The functional and admin-shell evidence gaps named by this integration
aggregation are closed, and the current selected 16-row Nick visual matrix
passes. Task 565 is ready for parent completion review. The mandatory
deployment-equivalent normal, unintercepted Lighthouse measurement at **82** is
now owned by Task 572; the retained 5105 median-68 is historical FAIL because
it predates final auth, CSP, and recovery fixes. The injected-abort diagnostic
remains separately recorded as a non-gating historical FAIL, while normal app
auth is closed PASS with no auth changes. Task 572's
environment/permission decision does not authorize publication, a gate waiver,
or any full-suite/all-screen/all-resource pixel claim. The completion source
recheck does not claim every platform gate is green: external `code_review`
timed out twice at 600 seconds and is **not PASS**. The parent will submit the
audited infrastructure timeout exception, which does not waive hidden
validation or performance requirements.