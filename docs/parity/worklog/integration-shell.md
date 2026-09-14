# Shell integration — in progress

## Scope and checkout

Work is based on `c1a66aac81fb2983b8708d974faedf71616418ef` plus the retained
working-tree integration changes. No publication or production mutation was
performed. This is **not a completion report**.

## Integrated

- Canonical shell column/row composition, grain placement, main `min-width:0`,
  token-backed content/admin measures, persistent sidebar and route-dependent
  desktop visibility. Footer remains a separate shell row, hidden on admin.
- Frozen rendered comfortable density is 48px/40px even on mobile; its authored
  spacing guide's suggested 24px/14px mobile gutters are not in the rendered
  reference. The pixel target takes precedence.
- Ancestor horizontal overflow uses clip, not hidden. Shell minimum-height
  override has sufficient specificity to defeat the global `.page` rule.
- Account Settings already mounts the persisted Home layout preference.
  No duplicate preference implementation was added.
- Home-only visual fixes preserve real counts, links, and explicit empty states:
  curated card/chip selector collision, icon tiles, chip/button geometry, recent
  rows and mobile truncation.
- Artifact docs generation/checks and inventory handoff integrated: 84 unique
  screens in 11 fragments; no duplicate docs rows. Existing docs hash router
  remains authoritative.
- Browser-safe kind/facet primitives separated from validation schemas, edit
  form loaded only on demand, and Journey skeleton separated from unrelated
  skeleton implementations. Public exports remain compatible. Lazy terminal
  error pages retain the route recovery boundary.

## Page-root exceptions

The shell stylesheet removes redundant wide root measures and double padding
on journey/account containers without editing leaf page files. Narrow prose
and form measures (About/legal/Submit/system/journey detail), component-local
padding, and the admin panel's canonical 1280px inner measure are intentional
exceptions to the outer-wrapper rule. A repository-wide removal of all
`max-w-*`/`px-*` strings would remove valid inner layout and is not claimed.

## Verification

| Check | Result |
|---|---|
| TypeScript | PASS |
| Production build | PASS |
| Bundle budget | PASS — entry 622.6 KiB raw / 192.4 KiB gzip / 161.9 KiB Brotli; all measured routes pass |
| Fixed entry limits | Unchanged: 650000 / 200000 / 168000 bytes |
| Publish cleanup ordering | Unchanged; cleanup remains after successful gates |
| Sidebar unit assertions | PASS, 8/8 after authorized header/sidebar correction |
| Inventory/generator | PASS, 84 unique screens |
| responsive-audit | PASS, 58/58 |
| print-audit | PASS, 49/49 |
| url-params-audit | PASS, 35/35 |
| auth-return-audit | PASS, 30/30; disposable identities cleaned |
| tablet-audit | PASS, 31/31 after replacing retired expectations with canonical 9px metadata and reachable/footer-visible hit testing |
| sticky-preview-audit | PASS, 7/7; rejects hidden overflow ancestors without requiring main itself to create clipping |
| Product profile / palette / dead exports | PASS focused runs |
| Eight E2E specs | Full Chromium run: 125 passed, 14 failed, 1 not run under four-worker contention/stale assertions. Serial rerun: three admin failures pass; updated search spec passes 27/27 across its focused runs. Continue Learning remains blocked by its removed legacy `/api/auth/register` fixture (404), unrelated to shell behavior. |
| Production baseline/mobile performance | Still outstanding |
| Visitor three-row token captures | Still outstanding |

Logs are retained under [integration evidence](../evidence/integration-shell/).
The latest [app screenshot](../evidence/integration-shell/home-smoke.jpg) shows
a rendered live catalog, header/sidebar and consent controls, not pixel parity.

## Measured pixel evidence — FAIL, not final closure

The complete post-authorization Nick run used Editorial × Crimson, threshold
0.1, 0.5% maximum, full union canvas, no masks/crops.

| Row | 375 | 768 | 1024 | 1440 |
|---|---:|---:|---:|---:|
| Home Index / shell.default | 9.7682% | 9.7527% | 10.9899% | 10.3737% |
| Home Curated | 5.9430% | 5.1626% | 4.4480% | 4.7663% |
| shell.palette | 9.8087% | 9.5621% | 10.7987% | 10.0806% |
| shell.mobile-drawer | 9.6628% | 9.6586% | 10.7735% | 10.3737% |

[Full report and actual/expected/diff images](../../../tests/parity/baseline/2026-09-13T13-28-20-560Z-5224/REPORT.md).
These are whole-page results. No clean shell crop PASS is asserted, and residuals
are not attributed solely to Home.

After normalizing the reference's button-like row line boxes and footer gap,
a focused 1440 measurement improved Curated to 2.9994% and Index to 3.3921%.
[Focused report](../../../tests/parity/baseline/2026-09-13T13-56-07-439Z-18876/REPORT.md).

Two later reference-adapter attempts failed before pixel comparison: first a
serialized callback referenced a Node-only helper; second it attempted to load
the app's footer CSS cross-origin. These were harness failures, not pixel
measurements. The interrupted run's single owned account was removed explicitly
from both application and Clerk; no global identity sweep was used.

The repaired adapter now projects the official mark from source geometry once,
uses the same projection for determinism and normal captures, and applies only
approved 44px/mark presentation plus live data/link/copy substitutions. It no
longer reads the actual rendered mark or imports app footer CSS. Source
projection, syntax and live snapshot checks pass; fresh browser parity remains
unverified. Frozen design source and acceptance thresholds are unchanged.

## Contrast decision and current incomplete gates

The user authorized direct header/sidebar correction and then explicitly
approved expected-side Editorial muted-text reconciliation from 40% to 52%.
Both earlier permission blockers are resolved. The substitution is recorded
in the reference adapter and capture provenance; application contrast remains
unchanged.

The earlier claim that contrast dominated the residual was incorrect: the
approved substitution did not materially reduce measured differences. Remaining
differences include sidebar structure/spacing, palette suggestion content and
geometry, and Home vertical flow. They are implementation gaps, not an unresolved
permission conflict.

The latest complete Nick run remains **0/16 PASS**:

| Row | 375 | 768 | 1024 | 1440 |
|---|---:|---:|---:|---:|
| Index / default | 4.3657% | 4.5682% | 4.4986% | 3.3938% |
| Curated | 4.5404% | 3.0319% | 3.0704% | 3.0002% |
| Drawer | 4.2493% | 4.4565% | 4.2433% | 3.3938% |
| Palette | 4.3936% | 4.3631% | 4.2723% | 3.0813% |

[Nick report](../../../tests/parity/baseline/2026-09-13T14-08-58-481Z-22177/REPORT.md).
[Visitor evidence at all four widths](../../../tests/parity/baseline/2026-09-13T14-22-29-014Z-23908/REPORT.md)
is evidence-only, never a pixel PASS.

A later desktop sidebar experiment measured 2.9856% Curated, 3.3814% Index,
and 3.0717% palette at 1440. Its always-mounted Radix portal caused closed-drawer
scroll/pointer locks and was removed. After removal, responsive is **58/58**
and sticky is **7/7**. Do not restore an always-mounted modal merely to satisfy
the backdrop-filter-set diagnostic.

Safety review also rejected that experiment's desktop target shrinking and
label truncation: both were removed to preserve existing navigation contracts.
Consequently the complete 16-cell run, not the later desktop experiment, is the
current visual evidence. The mobile footer audit now scrolls to and hit-tests
every footer link; a single reachable link no longer suffices.

Current production build and bundle budgets pass: initial **623.7 KiB raw /
192.7 KiB gzip / 162.3 KiB Brotli**, with caps unchanged. Mobile performance
script completed three real runs, but this script reports timings, not a
Lighthouse score; the requested −3-point baseline comparison is still unproven.
Production baseline/status/testid comparison, the legacy-auth Continue Learning
E2E fixture repair, and complete pixel closure remain outstanding.

Build checkout: `c2b9494b9cd740b99aab4e4e83478649e1d01a6e` plus the recorded
working-tree changes. No publishing was performed.

No completion callback, publication, weakened pixel threshold, masking, or
passing claim has been made.

## Measured integration recovery — 2026-09-13 15:38 UTC

Still **OPEN**, not a completion claim. Current base HEAD:
`9de9f92dba8ad6082a56d31a96891d85ce29cfdb`, plus working-tree changes.

### Pixel evidence and subsequent changes

- `tests/parity/baseline/2026-09-13T15-06-48-450Z-31101`: Nick, 375/1440,
  0/8 pass. Index 4.3053/3.6068%; Curated 4.4698/2.4491%;
  drawer 4.1831/3.6068%; palette 4.2964/3.3069%.
- `tests/parity/baseline/2026-09-13T15-27-45-304Z-41888`: Nick, 375/1440,
  0/4 pass. Index **2.7665/1.0569%**; Curated **4.6925/2.1560%**.
- Following that capture, corrected the measured 6px chip-count margin,
  recent-title wrapping, absent-tag presentation, and Curated category-card
  inline line-box excess. These changes are **not yet recaptured**.
- Restored idle palette Pages/history and the clear-history control, as well
  as its established search placeholder. Home controls retain their existing
  44px target contract; the frozen reference uses 36px for these controls.
  This is a real acceptance conflict, not permission to suppress other errors.

### Functional and source checks

- First serial suite: 108 passed, 6 failed, 1 interrupted, 25 not run.
  Stopped after repeated missing-placeholder failures rather than spending
  further time on the same known source regression.
- Focused search/sidebar/Continue Learning suite: **38 passed, 1 failed**.
  Search and sidebar pass. The remaining Continue Learning case used the new
  ordinary-user page before navigating, producing `Invalid URL`; it now
  navigates first. That final fixture-only fix awaits execution.
- Ordinary-user Clerk fixture uses the uniquely owned secondary account,
  already demoted to user. Anonymous privacy listener is on the anonymous
  page. Home account preview is checked at the explicit `?context=account`
  route, not silently removed from coverage.
- TypeScript, diff check, and palette drift pass.
- Latest production build budget: **622.9 KiB raw / 192.7 KiB gzip /
  162.1 KiB Brotli**, unchanged caps. Later Home CSS changes still need the
  final production build. Publish-only packaging was not executed.

### Backdrop readiness correction

The source retains a closed opacity-zero mobile overlay; Radix unmounts it.
Counting that hidden blur as a painted effect falsely failed closed rows.
After read-only review, the collector now retains every declaration and also
counts paint-eligible effects (positive rect, final computed visibility,
no display-none or opacity-zero ancestor). Visible overrides of an ancestor's
hidden visibility remain eligible. The compared set uses eligible effects;
declared metadata remains in the result. No pixel normalization, threshold,
mask, crop, or full-union calculation changed.

The real-browser DOM canary passed, including rejection of a one-side visible
`blur(99px)`. Open/closed application row verification remains outstanding.

### Production comparison and performance — still failing

Evidence: [measured-recovery](../evidence/integration-shell/measured-recovery/).
The comparison includes home/about 375/1440 visual strips and exact reports.
All four public routes returned 200 and had zero serious/critical axe findings
at 375/1440. There are **17 tracked deltas**, including visible testid removals.
Some follow the changed catalog (production 3824 versus development 1817);
others are shell visibility/navigation and Home presentation changes.
They have not been waived or declared clean. `/admin` is absent from the
retained baseline inventory, so its production comparison is still missing.

Intended visible differences include the full-width header, canonical shell
spacing, Index presentation, and new About layout. These intentions are not
a blanket approval of every reported removal.

Production-build mobile Lighthouse Home scored **65**, below the required
**82** against baseline 85. FCP 3163ms, LCP 3818ms, TBT 686ms, CLS 0.001386.
The read-only capture refused the development Clerk `dev_browser` POST,
which is retained in the evidence and may affect comparability; it does not
make the failing score a PASS.

Remaining: current all-width full pixel rows, Curated determinism, open/closed
backdrop checks, final Continue Learning scenario/full-suite accounting,
affected shell audits, admin production baseline, no-regression reconciliation,
Lighthouse recovery and final build. No publication or completion attempted.

### Approved Home control reconciliation

The user subsequently approved expected-only 44px minimum heights for Home's
Browse and Submit buttons. The adapter now substitutes only those exact two
source literals in memory, with per-substitution provenance. Frozen files,
other controls, and the 0.5% full-union threshold remain unchanged.

### Home closure and remaining overlay decisions

Latest inspected HEAD: `5421792f607ad2362271501dcf9275caa1f1222f`
(the evidence directories retain their own capture provenance).

Home evidence:
`tests/parity/baseline/2026-09-13T16-08-55-501Z-52036/`.
At 375/768/1024/1440, Index passes at **0.1606 / 0.1053 /
0.1613 / 0.1637%** and Curated passes at **0.1846 / 0.1977 /
0.2055 / 0.2077%**. All backdrop comparisons match.

The measured Home corrections included an explicit title flex child, native
button font-feature equivalence, live category count-to-words formatting,
the canonical muted taxonomy qualifier, and the contribution eyebrow's
8px margin. All app control targets remain 44px.

Latest overlay evidence:
`tests/parity/baseline/2026-09-13T16-28-39-836Z-60337/`.
Drawer: **0.5757 / 0.4241 / 0.3249 / 0.1637%**.
Palette: **0.6509 / 0.5568 / 0.5684 / 0.5133%**.
Five cells remain FAIL against the unchanged 0.5% threshold. Source-backed
font/cascade, taxonomy-marker and drawer-background corrections are applied.
Further small CSS guesses are stopped. The app's additional Pages/history,
focus treatment and compact More navigation remain functional; they have
not been deleted or silently added to the expected reference. No claim is
made that these explain every remaining differing pixel.

The complete serial E2E run passed **140/140** across all eight specs.
Responsive **58/58**, tablet **31/31**, sticky **7/7**, print **49/49**,
URL parameters **35/35**, auth-return **30/30**, and sidebar static guards
**8/8** passed. The final overlay-only font/color changes followed the E2E
run; they do not change its interaction paths. The source guard now stops
at the actual button boundary instead of a fragile 400-character budget,
while retaining every minimum hit-area assertion.

Current typecheck, production build, palette drift and bundle budgets pass:
**621.8 KiB raw / 192.6 KiB gzip / 162.1 KiB Brotli**, unchanged caps.
Logs are retained in
`docs/parity/evidence/integration-shell/closure-checks/`.

Curated reference determinism remains **unverified**: its latest invocation
failed the BASE_URL precondition before captures. This is a command error,
not a visual failure. The required `perf:mobile` script completed three real
development-server runs (median Home ready **9521ms**, category transition
**4356ms**). That script is not Lighthouse and supplies no Lighthouse score;
it does not satisfy the separate ≥82 Lighthouse requirement.

The older static-build Lighthouse score **65** remains below the required
**82**. Investigation confirmed that its static HTML server bypasses the
actual production document middleware and blocks Clerk's development-browser
POST; this is a comparability limitation, not a passing score or a reason
to weaken the gate. Production testid reconciliation and the absent admin
baseline remain open. No publishing or task-completion claim has occurred.

## Retained-controls integration — 2026-09-13

**Status: incomplete.** This section supersedes the preceding snapshot, without
waiving any acceptance requirement. No publishing occurred.

### Implemented and checked

- Preserved earlier approved reference reconciliation and added only approved
  Pages/history/focus and drawer More/44px projections. Source contracts fail
  closed; icons come from the same Lucide components. The palette projection
  is scoped to the frozen command-palette input/structure, not generic modals.
  Placeholder wording and selected-item state were not copied into the reference.
- Restored a reachable compact desktop rail with six actual 44×44 links and an
  Expand control. Removed hidden compatibility-only links. A real browser
  check preserved the expanded category through compact/expand and navigated
  through More → Home dashboard → the account-context recommendation controls.
- Made untouched initial palette selection follow the displayed first category
  after asynchronous loading, while preserving keyboard/pointer selection and
  recent-search shortcuts. Browser proof: Community & Events → ArrowDown →
  Encoding & Codecs stayed selected; the About page shortcut navigated correctly.
- Corrected the actual drawer's inherited desktop inner scrollport. The outer
  drawer now scrolls naturally and the footer follows the category tree.
  Measured actual/reference header divider y=64, search border 287×44 at
  x=18–304/y=79–122, and category dividers y=419/468/517/566/615/664/713/762/811
  match exactly. No borders or overlay pixels differ in this measured viewport.

### Pixel and determinism results

All results retain Editorial × Crimson, Nick, the frozen clock, threshold 0.1,
the full union canvas, no masking, and the 0.5% maximum.

| Row | 375 | 768 | 1024 | 1440 |
| --- | ---: | ---: | ---: | ---: |
| Home Index / default shell | 0.1606 PASS | 0.1053 PASS | 0.1613 PASS | 0.1637 PASS |
| Home Curated | 0.1846 PASS | 0.1977 PASS | 0.2055 PASS | 0.2077 PASS |
| Drawer | **0.5184 FAIL** | 0.3641 PASS | 0.2769 PASS | 0.1637 PASS |
| Palette | **0.5706 FAIL** | 0.4529 PASS | 0.4703 PASS | 0.4092 PASS |

Evidence directories under `tests/parity/baseline/`:

- Home: `2026-09-13T16-57-47-880Z-67066`.
- Overlay matrix: `2026-09-13T17-44-02-504Z-74274`.
- Final drawer-only font probe: `2026-09-13T17-53-48-911Z-76488`.
  It still differs by **11,955 pixels / 0.5184%**. The explicit font-feature
  change did not improve the measurement; font declarations alone therefore
  do not establish the remaining cause. The other widths were not rerun for
  that final declaration-only probe.
- Signed-out overlay evidence: `2026-09-13T17-46-39-812Z-75248`, eight cells,
  intentionally evidence-only, not pixel PASS claims. A preceding visitor
  matrix was interrupted for the source correction; its logs are not accepted
  as a complete retained Home visitor matrix. Fresh full Home visitor evidence
  remains to be closed.

Curated reference determinism is now **4/4 byte-identical across two captures**.
Its independent retained copy is
[`retained-controls/curated-determinism/`](../evidence/integration-shell/retained-controls/curated-determinism/).
The harness had replaced its shared output directory; prior tracked screenshots
and the prior report were restored, rather than deleting other evidence.

### Production admin and verification

Read-only production `/admin` captures at 375/1440 are now retained in
[`retained-controls/production-admin/`](../evidence/integration-shell/retained-controls/production-admin/).
Authentication used the existing seeded admin through the audit-key mechanism,
**not a Clerk/Nick session**. Both routes and notifications GETs returned 200;
`admin-authorized` remained visible after API quiet. There were no mutations,
redirects, artificial protected-read aborts, or auth demotions. The earlier
capture that aborted notifications is excluded. Each capture records one minor
axe `aria-allowed-role` violation affecting three nodes. No credential, cookie,
or raw identity response was retained.

The current post-ancestor-disclosure production build/bundle check passes:
**623.3 KiB raw / 193.1 KiB gzip / 162.4 KiB Brotli**. Caps remain unchanged at
650000 / 200000 / 168000 bytes. Its exact build and budget logs are retained in
[`retained-controls/final-shell-build/`](../evidence/integration-shell/retained-controls/final-shell-build/).
The earlier **622.5 / 192.8 / 162.4 KiB** figure is a prior-checkout historical
record, not the current build size. Focused navigation proofs, screenshots, and
other source provenance remain under
[`retained-controls/`](../evidence/integration-shell/retained-controls/).
The earlier 140-test E2E and shell-audit results remain historical evidence;
the full suite was not rerun for these changes. The focused changed navigation
paths above were verified through the real app.

### Still open

- The two 375px pixel failures, remaining shell-crop/final acceptance checks,
  and complete current visitor/default-shell evidence.
- Full production selector/data comparison. The formerly absent admin capture
  is supplied, but does not by itself close the complete comparison.
- Lighthouse: **65**, below the required **82**. The actual production baseline
  is **85**, at `tests/parity/production-baseline/2026-09-12/lighthouse/scores.json`.
  The two local 65 reports are current-build runs, not alternative baselines.
  Production uses the same-origin Clerk proxy; the local static build uses the
  direct development Clerk origin and bypasses production document middleware.
  Current TBT is 716ms versus 130ms; the large unattributed main-thread cost is
  not explained by the available report. These limitations are not a PASS,
  a rebased threshold, or proof that all of the difference is environmental.

Task completion remains blocked; no complete-product or release-readiness claim
is made.

## Task 565 public comparison and candidate-launch correction — 2026-09-13

This entry records source/doc integration evidence only; it is not a completion
claim. The public candidate comparison completed with the retained
2026-09-12 production baseline. Its sanitized result and ephemeral evidence
links are in
[`task565-public-compare-2026-09-13.md`](../evidence/integration-shell/task565-public-compare-2026-09-13.md).

- `/`, `/about`, `/category/encoding-codecs`, and `/resource/185020` completed
  at the comparator's native four widths with all four routes HTTP 200, same
  redirects, no missing units/capture failures, and zero serious/critical axe
  findings at 375/1440.
- The run reports **17 tracked deltas** across four routes and eight APIs. Its
  real visible-test-id set differences include the absent Home
  `button-browse-recommendations` / `link-recommendations-heading`, rail and
  desktop navigation visibility deltas, and data-specific resource/related
  IDs. Those are recorded distinctly; data-derived IDs are not blanket
  excluded, and an absent visible ID is not automatically a deleted selector.
- The targeted admin candidate script initially failed before navigation
  because Playwright's default Chromium 1228 headless shell is not installed.
  It now accepts an explicit
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for the installed Chromium 1223 binary.
  The required loopback-only rerun remains limited to `/admin`,
  `/admin/research`, and `/admin#research` at 375/1440 and reuses, rather than
  recaptures, the retained authorized production `/admin` baseline.
- The palette close invocation failed before a pixel capture during disposable
  admin setup: `/sign-in` did not reach `domcontentloaded` within 60 seconds.
  This is an infrastructure timeout, not a new palette pixel result.
- The currently authorized performance result is **54** with **0 blocked
  requests**, below the required **82**. It remains FAIL; neither the public
  comparison nor the launch correction waives it.

### Final Task 565 evidence update

The detailed sanitized result is
[`task565-final-evidence-2026-09-13.md`](../evidence/integration-shell/task565-final-evidence-2026-09-13.md).
The final selected palette run passes 375/768/1024/1440 at
**0.4140/0.3748/0.3185/0.3755%**. The targeted admin capture remains failed:
the hash Research route is HTTP 200 with selected review panel and no visible
admin footer, while the direct `/admin/research` document is HTTP 404 and the
read-only guard blocks browser-initialization operations. This does not prove a
backend admin-role failure—the server audit authorization remained true—but it
also does not clear tab, Settings, axe, or guard assertions. Typecheck, build,
and bundle budget pass; build CSS warnings and performance 54/82 remain open.

## Retained current overlay evidence — 2026-09-13 20:39–20:44 UTC

The complete admin matrix at
[`2026-09-13T20-39-52-532Z-13171`](../../../tests/parity/baseline/2026-09-13T20-39-52-532Z-13171/REPORT.md)
retains Editorial × Crimson, the frozen clock, threshold 0.1, full union
canvas, and the 0.5% ceiling. Curated and Drawer pass at every selected width;
Palette passes at 768/1024/1440 and is the only failure at 375
(12,910 pixels, 0.5598%). The independently retained visitor evidence-only
matrix is
[`2026-09-13T20-44-14-556Z-14446`](../../../tests/parity/baseline/2026-09-13T20-44-14-556Z-14446/REPORT.md);
it records the same palette shape at 375 (12,916 pixels, 0.5600%) and makes no
pixel-PASS claim.

Read-only regional counts from the visitor PNGs, using the harness
pixelmatch settings, are retained as diagnostics rather than crop gates:

| Surface / width | Full diff | Header band | Overlay region | Final 160px footer band |
| --- | ---: | ---: | ---: | ---: |
| Palette 375 | 12,916 | 20 | 9,581 (y=80–760) | 752 |
| Palette 768 | 13,620 | 20 | 8,508 (y=80–760) | 641 |
| Palette 1024 | 17,797 | 213 | 14,019 (y=80–760) | 145 |
| Palette 1440 | 18,328 | 1,016 | 13,420 (y=80–760) | 153 |
| Drawer 375 | 12,718 | 872 | 8,531 (x=0–323, y=60–850) | 752 |
| Drawer 768 | 11,904 | 766 | 7,049 (x=0–323, y=60–850) | 641 |
| Drawer 1024 | 11,040 | 997 | 6,478 (x=0–323, y=60–850) | 145 |
| Drawer 1440 | 9,190 | 1,889 | 6,564 (x=0–323, y=60–850) | 3 |

For the failing 375px palette, the input-focus band y=108–138 contains 1,760
overlap mismatches: the actual keyboard-focused input has the approved Crimson
outline while the reference’s programmatic `input.focus()` did not match
`:focus-visible`. The expected projection now targets that already-focused
input with `:focus`, while retaining `:focus-visible` for projected buttons.
This preserves the approved focus indicator rather than suppressing it.
The initial Jump To caption ink and selected row were both measured 2px lower
on the actual side, so its explicit cmdk group wrapper now uses a 2px top
inset only for that initial group. Placeholder wording and selected-state
reconciliation were not changed. These source corrections have not yet been
captured.

## Current Task 565 aggregation — separated current evidence

This section supersedes earlier pending-admin and lower historical-Lighthouse
snapshots in this worklog. The authoritative current report is
[`task565-final-evidence-2026-09-13.md`](../evidence/integration-shell/task565-final-evidence-2026-09-13.md#authoritative-current-status);
the material above remains historical provenance. No browser was launched for
this documentation aggregation; no publishing occurred.

- **Approved Home SSR scope:** exact-tree SSR is now implemented for anonymous
  public Home only. Focused runtime evidence verifies public-only bootstrap,
  no dehydrated auth, a fresh auth fetch after hydration, legacy
  Curated/consent reconciliation and reopen, four-second fallback clearance,
  theme hydration, and exact configured Clerk CSP. Signed-in and request-query
  paths retain the SPA path; there is no auth bypass:
  [`hydration-summary.json`](../evidence/integration-shell/retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/hydration-summary.json)
  and
  [`review69-runtime-summary.json`](../evidence/integration-shell/retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/review69-runtime-summary.json).
- **Deployment-equivalent performance gate (Task 572):** **OPEN in Task 572 —
  82 remains required, with no waiver.** The latest real production-build 5105 normal,
  unintercepted Lighthouse values are **71**, **60**, and **68** (median
  **68 FAIL**) in
  [`normal-lighthouse/fixed-3cold/`](../evidence/integration-shell/retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/).
  They predate the final auth, CSP, and recovery fixes, so are historical—not a
  fresh final-gate measurement. The local development Clerk configuration is
  not the published live-key baseline. Deployment-equivalent
  environment/permission is required, does not waive 82, and does not authorize
  publication. Earlier normal
  65/66/72 (median 66), 72/73/66 (median 72), tags/sidebar 62/70/77 (median
  70), and all strict captures remain historical evidence.
- **Admin:** the real disposable Nick six-capture corrected/declined evidence
  passes every targeted UI, HTTP-status, settled serious/critical axe, Settings,
  and New-entry assertion at 375/1440. The partial initiator diagnostic proves
  the separately injected-abort POSTs are Clerk development `/v1/environment` and both
  Blob Worker initiators are Clerk v6 `clerk.browser.js`
  token-polling/load paths. The former Amplitude theory was only count
  correlation and is withdrawn. Browser/context/window guards refused every
  operation; none was allowed. This is a non-gating historical diagnostic FAIL
  without an admin exception or allowance, not a release gate or an
  application-auth failure.
- **Normal app auth:** the real disposable-Nick normal `127.0.0.1:5000` lane
  passes sign-in/admin API 200, reload identity retention, bounded public Clerk
  readiness followed by real cache-bypass `getToken` and API 200, UI sign-out
  then API 401, protected-route local sign-in return, and created-identity-only
  teardown. No authentication change is made or proposed; it is functional auth
  proof, not a static read-only or pixel pass.
- **Common functional state:** the focused real-guest evidence at
  [`task565-common-state-proof-2026-09-13/`](../evidence/integration-shell/task565-common-state-proof-2026-09-13/)
  proves the reviewed recommendation, drawer/More/taxonomy, and compact-rail
  controls are real in their reachable states. It proves no **stateful
  functional removal**, not an identical default DOM: the retained production
  default differs from the canonical account-context/responsive defaults.
- **Current admin shell:** the normal-auth real-Nick
  [`current-admin-shell/summary.json`](../evidence/integration-shell/retained-controls/current-admin-shell/summary.json)
  passes all six 375/768/1024/1440 checks: four-width capture, authorization,
  absent footer, no horizontal overflow, `1400px` admin measure token, and
  created-identity teardown. Its screenshots are token-only shell geometry
  evidence, **not an admin-body pixel pass**.
- **Home visual evidence:** the current selected Nick matrix
  [`2026-09-14T16-23-53-893Z-1807`](../../../tests/parity/baseline/2026-09-14T16-23-53-893Z-1807/results.json)
  passes all 16 Home Index, Home Curated, Drawer, and Palette rows at
  375/768/1024/1440 under the 0.5% ceiling. The exact per-width percentages
  are Home Index **0.1606/0.1053/0.1738/0.1603%**, Curated
  **0.1846/0.1977/0.2197/0.2037%**, Drawer
  **0.4176/0.3091/0.2364/0.1603%**, and Palette
  **0.4140/0.3748/0.3185/0.3755%**. It records the frozen 9-category,
  clean source commit `a4a7586776406e1dd27936a8a2af6f9dac911035`, the frozen
  9-category/1,817-resource source snapshot, no app/reference API failures, and
  equal-hash attempt 1/2 stability for actual and expected captures in every
  row. The run-owned admin Nick identity was deleted locally and in Clerk with
  no errors; other existing identities were retained. This is a `full: false`
  selected-row diagnostic (`gatePassed: false` at aggregate scope), not a full
  suite, all-screen, or all-resource pixel claim. Retained visitor token-only
  evidence remains valid but is not a new pixel claim.
- **Scoped CSS/build:** Tailwind now uses `source(none)` with client
  HTML/source roots instead of workspace-default scanning of cache, retained
  logs, and skills. Current typecheck, production build, and bundle budget
  pass; initial gzip is **194.5 KiB** with unchanged caps.
- **Completion-validation and audit recheck:** final responsive **58/0** and
  Design System **284/0** checks pass in the
  [retained log](../evidence/integration-shell/retained-controls/completion-responsive-design-system-2026-09-14.log).
  The initial five source-gate failures are corrected: unused `use-theme`,
  Drawer Escape focus restoration to the actual opener, forced-colors
  cookie-button border, non-vacuous settled DS account Home `h1`, and Tailwind
  `source(...)` parser support. Type, parser, and full canonical cheap checks
  pass. The audit-only optional route settle and observed 687 ms actual focus
  return replace the former 400 ms sleep without changing normal pixel
  geometry; the current 16-row evidence remains valid without a rerun.
- **Breadcrumb disclosure:** the real ancestor-link legacy ellipsis restoration
  and focused guest menu behavior pass in
  [`task565-breadcrumb-disclosure-2026-09-13/REPORT.md`](../evidence/integration-shell/task565-breadcrumb-disclosure-2026-09-13/REPORT.md):
  768/1024 have the real ancestor link, Escape focus return, stable geometry,
  and no overflow; the trigger is absent by intended range at 375/1440. This
  focused functional PASS is not a fresh full pixel-resource matrix PASS.
- **Public/API:** all 17 retained functional/public comparator dimensions are
  closed with per-delta dispositions and canonical reachable-state proof in
  [`task565-public-compare-2026-09-13.md`](../evidence/integration-shell/task565-public-compare-2026-09-13.md)
  and
  [`task565-common-state-proof-2026-09-13/`](../evidence/integration-shell/task565-common-state-proof-2026-09-13/).
  This is not an identical-default-DOM, data-snapshot, or blanket pixel claim.

There is no pending Clerk permission or exception decision. The injected-abort
cold read-only diagnostic is retained as a non-gating historical FAIL with its
restrictions unchanged; it is separate from the closed normal-auth functional
PASS and is not a release gate. Functional and admin-shell evidence gaps are
closed, and Task 565's current selected 16-row visual evidence passes. Task
565 is ready for parent completion review. The mandatory deployment-equivalent
normal, unintercepted Lighthouse measurement at **82** has moved to Task 572;
the retained 5105 median-68 result remains historical FAIL. Task 572's
environment/permission decision does not authorize publication, any waiver, a
full-suite/all-screen/all-resource claim, or automatic publishing.
The completion-validation recheck does not claim every platform gate is green:
the last platform run’s other commands pass, but external `code_review` timed
out twice at 600 seconds and is **not PASS**. Independent architect review 94
reports no final critical SSR issue. The parent will submit the audited
infrastructure timeout exception; it is not a hidden validation waiver or
performance claim.
