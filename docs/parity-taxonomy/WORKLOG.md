# Taxonomy presentation handoff

## Delivered scope

The category, subcategory and sub-subcategory wrappers continue to use one
`TaxonomyListing`. Its scoped stylesheet is
`client/src/styles/pages/taxonomy.css`, imported by the page rather than a
contested global entry point. Shared ResourceCard composition is styled by
`client/src/styles/components/resource-card.css`, imported by the card.

- Category: ghost Browse link to `/`, category mark/eyebrow, responsive
  36–56px heading, 700px description, counted summary and child links.
- Subcategory and L3: navigable breadcrumbs, 32–52px heading with first-word
  accent, live scope description/count, and counted group links when present.
  L3 displays its own name and resources, not the parent's prototype fallback.
- Responsive auto-fill grids, loading grids and token-based empty state.
- Shared cards: canonical mark, title/copy rhythm, chip metadata, hover glow,
  title clamp on its direct clipping element, and retained guest/personal,
  visit, tag, preview and bookmark-note controls.
- Resource actions and breadcrumb anchors preserve 44px minimum targets.
- Unknown slugs retain NotFound; genuine request errors use the existing
  app-level ErrorPage rather than an isolated text-only error.

No backend, SEO templates, JSON-LD, canonical/robots inputs, page-size logic,
filter/URL state logic, paginator, analytics or public card props were changed.
Existing testid literals were retained. New child navigation has real hrefs.
The frozen reference and aggregate inventory/reports were not edited.

## Evidence and results

Evidence lives in `evidence/`. The twelve full-page PNGs cover all three
levels at 375/768/1024/1440. They are **observational captures, not pixel
passes**, and precede the final touch-target CSS correction. That correction
was source-reviewed and stylelint-checked; prior screenshots are not
represented as final-layout captures.

`browser-results.json` explicitly identifies tester-reported observations
(not raw axe output). The browser continuation covered only the unfinished
checks after an evidence-write interruption, not a repeated full pass.

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| CSS lint | PASS; also rechecked both changed sheets after touch fix |
| Unit tests | PASS: 15 files, 300 tests |
| Dead components | PASS |
| SSR/API listing parity | PASS: ordered 24-item pages 1 and 2 for three categories and nested filter |
| URL parameter audit | PASS: retained 35-check report |
| Taxonomy no-corpus fetch | PASS reported by reviewer; console output only, no raw artifact retained |
| Axe, three levels at 375/1440 | PASS: zero serious/critical, tester-observed |
| Scope/search/tag/view URL behavior | PASS |
| Empty search / clear and broaden controls | PASS |
| Community Events page 2 vs development listing API | PASS: all 24 rendered titles in API order |
| Browse destination | PASS: `/` |
| Repository lint | FAIL: 5,366 errors / 21 warnings; changed-file rule-count baseline identical |
| Pixel harness | BLOCKED before capture: generated aggregate inventory is stale |

Lint baseline/current JSON outputs are retained for both changed TSX files.
There is no claim that full lint is green. The prior workflow logs containing
ECONNREFUSED for SEO and taxonomy checks are not successful evidence.

## Integration handoff — final acceptance remains open

The downstream integration and final-regression tasks own whole-page closure.
This leaf does **not** claim the original ≤0.5% full-union pixel threshold,
production comparison, or every required gate is green.

1. Regenerate the shared aggregate inventory from its family sources, under
   integrator ownership. The isolated command stopped with:
   `generated inventory files are stale: tests/parity/inventory.json`.
   Preserve category/subcategory/L3 pixel eligibility; do not downgrade L3.
2. Reconcile required live content in the **in-memory expected adapter**, never
   by editing frozen design bytes or deleting production functionality:
   scope descriptions, filters, view controls, 24/page pagination, card
   actions/metadata, real child groups, and L3's own name and resource slice.
   The reference currently filters a corpus while the app uses paged listing
   order; both sides must compare the same live page.
3. Account for the shell's existing breadcrumb row as well as the page-owned
   canonical breadcrumb. Shell layout and duplicate breadcrumb presentation
   were deliberately not changed here.
4. Capture final actual/expected/diff at 375/768/1024/1440, Editorial × Crimson,
   threshold 0.1, ≤0.5%, full union canvas without masking or cropping.
   Current observational captures must not be substituted for these results.
5. Complete production baseline comparisons at 375/1440 for all levels,
   including production testid inventory and Community Events page-2 order.
   This task compared page 2 to the development API, not production.
6. Complete shared-card consumer token evidence on search/tag/bookmarks and
   Home/discovery/detail after integration. Guest action labels were checked
   on taxonomy cards; that is not a substitute for consumer-route captures.
7. Close final browse-categories, responsive, tablet, print, tag-route,
   collections and SEO parity gates. They are not asserted green here.
   The browse spec still expects a `Back to all categories` button where the
   required canonical control is now a Browse link; reconcile its selectors
   to the approved real navigation instead of mislabeling the UI.

No follow-up tasks were proposed: the already-planned integration and
regression tasks cover these handoffs. Nothing was published.

## Completion review status

**Not complete.** The completion review rejected the outstanding pixel,
production and regression requirements; no completion override was used.

After that review:

- Updated `ResourceCardSkeleton` in the shared skeleton module to reuse the
  new mark/title/description/metadata/action geometry. Other skeletons were
  left unchanged.
- Completed the unfinished search/tag/bookmarks consumer checks. Evidence
  under `evidence/consumers/` includes six populated screenshots and raw
  computed-style measurements for search and tag cards. Personal controls
  measured 44×44. A real guest bookmark was added and then removed, leaving
  zero saved cards. The initial `browser-results.json` NOT_RUN entry predates
  this continuation and is superseded for these consumer checks.
- Marked canonical taxonomy count chips with their `data-ds="chip"` identity
  so the design-system sweep does not misclassify them as eyebrows.
- Completion gates subsequently passed print, tag-route, collections, SEO
  parity, taxonomy no-corpus and SSR/API parity, plus build/typecheck and
  other shared guards. The run logs are retained in the evidence directory.
- Remaining failed gates: migration drift hit an esbuild spawn EAGAIN;
  responsive audit timed out on `/profile`; tablet audit failed Home
  microtext and consent/footer hit testing; the design-system sweep included
  unrelated admin-export and overlay/Home failures as well as the now-fixed
  taxonomy chip classification.

Pixel/production comparisons and the browse spec remain outstanding.
Those blockers are not waived by the implementation or successful local
checks. Do not treat this worklog as approval to merge or publish.

## Focused pixel evidence — final four-width union capture

The stale-aggregate blocker was bypassed only in a disposable mirror after the
captures were held back from the repository. The mirror was
`/tmp/parity-taxonomy-harness`; its inventory was regenerated there from the
ten existing harness fragments (84 generated screens, hash
`3a7ba1eb54f8c2693adfc221f331d5d98b91ad269fe73aa2246bc95ad40f88d0`).
The canonical `tests/parity/inventory.json`,
`tests/parity/inventory.schema.json`, and `awesome-list-site-ds/` were not
written. The canonical aggregate hash at capture start remained
`61edadfdc379542890bbe936650a95535ae3e717c8c68a2883943acb9a4ef862`.

Twelve selected cells were captured against the current local app and an
in-memory snapshot of the frozen reference, Editorial × Crimson, Chromium
148.0.7778.96, DPR 1, with the harness's fixed viewport heights. Each is a
full-page union-canvas comparison at pixelmatch threshold `0.1`, no crop,
resize, mask, or threshold relaxation; the ceiling remains `0.5%`.
The selected invocations used `--as visitor`, so the harness status is
`EVIDENCE` rather than a counted admin gate row. This does not turn a measured
visual failure into a pass. All twelve captures stabilized on attempts
`[1,2]`, had zero app/reference API failures, complete font parity, and
`identity.ok: true`.

| Level | Width | Actual px | Expected px | Union canvas | Differing / canvas px | Diff | Overlap diff | Unmatched dimension px |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Category | 375 | 375×13650 | 375×31029 | 375×31029 | 6848730 / 11635875 | 58.858745% | 331605 | 6517125 |
| Category | 768 | 768×7135 | 768×16245 | 768×16245 | 7316359 / 12476160 | 58.642715% | 319879 | 6996480 |
| Category | 1024 | 1024×10934 | 1024×15668 | 1024×15668 | 5323500 / 16044032 | 33.180562% | 475884 | 4847616 |
| Category | 1440 | 1440×6453 | 1440×11076 | 1440×11076 | 7087374 / 15949440 | 44.436507% | 430254 | 6657120 |
| Subcategory | 375 | 375×13490 | 375×15735 | 375×15735 | 1176430 / 5900625 | 19.937380% | 334555 | 841875 |
| Subcategory | 768 | 768×7069 | 768×8296 | 768×8296 | 1274539 / 6371328 | 20.004291% | 332203 | 942336 |
| Subcategory | 1024 | 1024×10868 | 1024×7869 | 1024×10868 | 3423181 / 11128832 | 30.759571% | 352205 | 3070976 |
| Subcategory | 1440 | 1440×6409 | 1440×5767 | 1440×6409 | 1313508 / 9228960 | 14.232460% | 389028 | 924480 |
| L3 | 375 | 375×2622 | 375×15735 | 375×15735 | 4975797 / 5900625 | 84.326609% | 58422 | 4917375 |
| L3 | 768 | 768×2129 | 768×8296 | 768×8296 | 4811426 / 6371328 | 75.516847% | 75170 | 4736256 |
| L3 | 1024 | 1024×1544 | 1024×7869 | 1024×7869 | 6560136 / 8057856 | 81.412922% | 83336 | 6476800 |
| L3 | 1440 | 1440×1545 | 1440×5767 | 1440×5767 | 6184384 / 8304480 | 74.470455% | 104704 | 6079680 |

The complete accepted actual/expected/diff PNGs and the raw per-cell result
records are retained under `evidence/pixel-final/`, with the machine-readable
summary at `evidence/pixel-final/comparisons.json`.

### Attribution for integration

- **Outside this leaf's owned presentation:** the unmatched-dimension pixels
  are explicit union-canvas evidence, not masked pixels. They reflect the
  expected reference's full-corpus rendering versus the app's live
  paged listing (`PAGE_SIZE = 24`), especially Category's 4,847,616–6,996,480
  unmatched pixels and L3's 4,736,256–6,476,800. L3 also compares the
  app's own `Online Forums` resource slice with the reference's current
  parent/fixture-sized listing; the identity guard passes because the leaf is
  named in the main content/breadcrumb, but the data slice is not yet
  reconciled. These are expected-adapter/live-page integration blockers, not
  reasons to weaken the pixel gate.
- **Existing shell/global outside scope:** every cell records the pre-
  normalisation set mismatch `app ["blur(14px)"]` versus
  `reference ["blur(14px)","blur(2px)"]`. The existing shell breadcrumb row,
  header/sidebar/footer, and their layout contribution remain in the union;
  this leaf deliberately did not change shell composition or duplicate
  breadcrumb behavior. Because these are visitor captures, the reference's
  fixed demonstrator account chip and the app's signed-out header are also
  shell identity differences; this is another reason the cells are evidence
  rather than an admin-gate claim, not a reason to hide the header.
- **Owned presentation differences visible in the overlap:** the taxonomy
  content still differs in the heading/breadcrumb/control rhythm, results
  grid density and card geometry. At 1440 the app subcategory capture is a
  two-column card grid while the reference is three columns; search/filter
  and paginator controls also occupy app-owned content space. These are
  recommendations for the page/integration owner, not post-hoc exclusions:
  the retained diff includes them in full.

No further harness retries were made after the twelve cells completed. The
proposed three-row integration fragment remains in
`docs/parity-taxonomy/inventory-fragment.json`; this evidence does not edit
the aggregate inventory or claim the original pixel threshold passed.

## Final leaf submission

- Updated the existing browse-category spec to assert the canonical Browse
  anchor, real taxonomy child links, and parent breadcrumbs rather than
  obsolete buttons. The actual named Chromium suite passed **35/35**;
  retained output: `evidence/browse-final/chromium.log`.
- Production comparison is now captured at both required widths for all
  three levels in `evidence/production-final/`. Exact selector differences
  remain in those JSON files. Production catalog totals are 579/58/8 versus
  development's 333/40/1 for the three representative routes. Production
  Community Events page 2 has 24 cards in exactly its API order, but
  cross-environment ordering/count equality is not established because
  the datasets differ. No database was changed to make a check pass.
- Shared card consumer checks, production capture, named browse execution,
  and all twelve pixel measurements are no longer NOT_RUN. Earlier status
  entries describe earlier attempts; the final evidence above supersedes
  those entries.
- The observed two-versus-three-column difference does **not** justify
  changing this leaf's grid minimum: the canonical and actual taxonomy
  styles both specify 320px auto-fill columns and a 16px gap. Available
  width is determined by the shell. Integration must reconcile that width,
  not introduce an arbitrary leaf breakpoint to conceal the difference.

This is a submission of the owned implementation and measured integration
handoff under the parallel execution contract, **not** a statement that
full-page parity passed. All twelve measured differences remain above
0.5%; neither the threshold nor the capture canvas was relaxed. Integration
must reconcile the expected live-data slices, required production controls
and shell before whole-page closure. No new follow-up task is needed:
the existing integration and final-regression tasks already own that work.

### Accepted review and completion-run limitation

The fresh completion review approved this leaf with comments under the
parallel contract. It specifically noted that the pixel harness category
row measured **Community & Events**, not the proposed Encoding & Codecs
representative. Integration must capture Encoding & Codecs; the existing
category measurements must not be relabeled as that route. It also noted
that read-only public collection cards need a matching personal-action-free
skeleton mode during shared-consumer integration.

The completion runner subsequently exhausted its 1,800-poll budget while
the theme-registry type check remained nonterminal. Tablet and font-prepaint
browser launches failed with `pthread_create: Resource temporarily unavailable`
(and a GLib thread-creation failure). Migration, responsive, print, build,
typecheck, taxonomy parity, SEO and the other completed successful gates
retain their results. The design-system sweep's remaining failures were
tag-popover and authenticated Home timeouts plus admin-export eyebrow
classification, not taxonomy chip failures.

An audited validation skip is requested solely because this automated run
cannot reach completion under those resource failures. This is not a claim
that the failed gates or final full-page parity passed. The existing
integration/regression tasks retain those requirements.