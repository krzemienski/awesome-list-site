# Discovery token-only handoff

## Scope and implementation

Eight discovery page modules now import their own discovery-scoped styles.
`discovery.css` covers category/search/tag/shared-collection chrome;
`discovery-journeys.css` covers the learning-path list/detail;
`discovery-tools.css` covers Advanced and Recommendations.
No shared ResourceCard, TaxonomyCard, shell, router, backend, or frozen
reference file was changed. Removed the difficulty helper only after its last
two journey consumers moved to token-backed difficulty classes.

Theme-sensitive colors, surfaces, borders, radii, fonts, display traits and
shadows consume the current canonical tokens. Prescribed composition geometry
remains local: docs/11-patterns specifies pixel dimensions and the canonical
contract does not define a spacing/type-size scale. No new shared tokens were
invented. The artifact docs directory was empty in this checkout, so the
frozen docs/04-tokens and docs/11-patterns plus the merged live token contract
were used.

Preserved query construction, URL state, analytics and consent, resource IDs,
category count source, tag normalization, collection share URLs, authenticated
recommendation branching, and grouped journey completion. Added retryable
journey/tag error presentation; missing journey HTTP 404 retains the original
not-found title/noindex/recovery branch. Loading resource grids now share
bounded 1/2/3-column geometry with populated grids. Advanced inactive tab panels
remain hidden and the page introduction does not masquerade as a printable
application header.

## Evidence and observed results

Evidence root: `docs/parity/evidence/discovery/`.

- `final-grids/`: authoritative Categories and Tag captures at 375/768/1024/1440.
  Root attributes explicitly read `editorial` / `crimson`; titles match the
  production baseline at each width. At 375 no baseline test IDs are missing;
  wider missing IDs are rail/sidebar/shell state differences, enumerated in
  `assertions.json`, not silently waived.
- `browser/`: guest Journey list/detail, Search, Advanced's four tabs and
  Recommendations four-width captures. The initial Search 375 image is rejected
  as loading-only; use `browser/followup/search-ffmpeg-375-populated.png`.
  Use `browser/followup/advanced-export-1440-populated.png` for the initially
  missing export capture. Initial Categories/Tag frames are superseded by
  `final-grids/`. Reports retain the original failures rather than rewriting
  them as passes.
- `browser/signed-in-followup/`: signed-in Journeys, Journey 7 and
  Recommendations, plus a real guest shared collection, all four widths.
  `journey-assertions.json` proves UI completion of six grouped steps persisted
  all 18 underlying row IDs and non-null completedAt. It also records an
  intermediate capture-selector timeout; later capture assertions supersede
  that capture failure, not the successful completion assertion.
- Guest collection screenshots use a disposable share which was deleted after
  capture. Auth is asserted through `/api/auth/user`. All unique QA identity
  runs report zero remaining local and Clerk accounts. The first token-link
  auth helper hit the artifact origin; the real email/password UI recipe
  subsequently worked. No production data was written.
- Categories show all 9 nonempty catalog groups with sidebar-matching totals.
  FFmpeg retained total 198 and identical first 20 API result IDs, with 24
  results on the UI page. Singular/plural open-source tag queries retain total
  158. Full API baseline equality against production was not asserted.
- Axe guest and signed-in captures report zero serious/critical except an
  initial Advanced Explorer 1440 contrast observation (five nodes). That
  summary did not retain selectors and two narrow reproductions returned
  zero; this is unresolved historical evidence, not a fabricated clean scan.
  Moderate nested-main/heading-order findings remain recorded.
- `testid-source-parity.json`: no existing testid expression removed from any
  owned page; only two retry selectors added. This complements, but is not a
  substitute for, the final production DOM inventory comparison.

## Gates executed

| Gate | Observed result |
| --- | --- |
| check | PASS |
| lint:css | PASS, including final discovery stylesheet adjustment |
| test:unit | PASS: 15 files / 300 tests |
| bundle:budget | PASS against available built dist; final production rebuild remains integration work |
| url-params-audit | PASS: 35 / 35 |
| tag-route-audit | PASS: 4 / 4 |
| collections-audit | PASS: 12 / 12, including real auth/share/revoke/cleanup |
| taxonomy-listing-parity | PASS |
| guest-recommendations | PASS: 6 / 6; pre-existing gate's empty cases use interception, populated cases use real API |
| search-typos | PASS: 30 / 30 top-five hits |
| responsive-audit | PASS: 52 / 52 |
| print-audit | PASS: 49 / 49 after fixing the new Advanced header classification |
| seo-snapshot --gate --parity | PASS: full 2,334 URL corpus, zero fetch/schema failures |
| lint | FAIL: 5,525 errors / 21 warnings repository-wide; review measured unchanged/improved owned-file counts versus HEAD |
| dead-components | FAIL: existing unreferenced shell AppFooter only; newly orphaned difficulty helper removed |
| test:e2e -- search --project=chromium --workers=2 | FAIL: 14 pass / 13 fail, concentrated in home/category/palette expectations outside owned pages |

Final check/CSS/dead-components/print/SEO/E2E logs and SEO metrics are in
`gates/`. Earlier ephemeral gate logs did not survive the helper workspace
refresh; their exact observed totals above are retained from tool output, not
claimed as complete raw log artifacts. No failed gate is described as green.
No additional browser-engine installation or broad shared-surface repair was
performed to turn legacy search-suite failures green.

## Integration contract / remaining full-page closure

This is a **token-only leaf implementation**, not a full-page pixel approval.
The proposed fragment is
`tests/parity/inventory/proposed/token-only-discovery.json`. It is deliberately
outside the loader's top-level glob: existing family rows already own several
of these IDs. The integrator must merge/replace those rows and regenerate the
aggregate inventory, rather than introducing duplicate IDs.

Current public paths are `/journey/:id` and `/collection/:shareId`, singular,
not the plural detail paths used in the task prose. Existing route wiring and
share URLs were preserved.

Remaining integration/final-regression obligations:

1. Merge the proposed rows without editing the frozen reference. Local CSS
   imports already work; do not import them again globally.
2. Close full-page shared shell/card differences and legacy search-suite
   failures. Fix/remove the unreachable shell AppFooter in its owning task.
3. Complete production DOM/testid comparison for all discovery routes and
   production result-id/count comparisons, plus full-page visual comparison
   at 375/1440. This leaf only compares final category/tag title/testid evidence
   and supplies all requested visual states; it does not claim a measured
   production pixel diff for every route.
4. Resolve/re-record Advanced's unrepeatable initial contrast observation and
   remaining moderate accessibility findings in the merged final pass.
5. Rebuild production assets and re-run bundle budget on that build.

Intended visual differences from production: canonical display typography,
token-backed page rules and state cards, responsive bounded listing grids,
journey cards/step treatments, and Advanced tabs/stat panels. No intended
result/count/URL/SEO changes. Token-only eligibility remains token-only; where
final pixel gates apply elsewhere, threshold 0.1, maximum 0.5% differing
pixels and full union canvas without masks/crops remain unchanged.

No follow-up task was proposed: the already queued integration and final
verification tasks own these handoffs. No publish was performed.

## Completion-gate blockers

The configured completion suite additionally reports `dead-exports` on the
same unrelated AppFooter and `canonical-token-parity` on existing
`client/src/styles/pages/resource.css .resource-detail .chip` overrides.
Its 63 failures include canaries preempted by those resource rules.
The discovery styles are not named in those failures. Full outputs are retained
in `gates/completion-dead-exports.log` and
`gates/completion-canonical-token-parity.log`. These owned-by-other-surface
failures block automatic completion; they were not bypassed or edited here.

The full suite finished FAILED (task not marked complete). Tag-route and
product-profile-browser additionally timed out waiting ten minutes for the
shared Playwright lease; the earlier isolated tag-route audit passed.
The broad button sweep found three owned missing semantic-hook groups
(Journeys eyebrow, Advanced h1/stat labels). These were fixed using the
canonical `eyebrow`/`display-h` classes, including the corresponding empty/error
headings. A narrow real-browser recheck of Journeys, Advanced and Recommendations
now reports zero stray h1s/eyebrows (`gates/final-discovery-ds-hooks.json`).
The remaining broad-sweep failures concern admin headings/tab/auth states.
Final typecheck passes. Screenshots precede this semantic-hook-only follow-up;
integration should refresh final captures rather than claim byte-identical
evidence. The full suite was not rerun while unrelated blockers remain.

## Resumed verification after shared merges

- The discovery changes and evidence are retained. The shared AppFooter
  reachability failure and 63 resource-chip token failures still reproduce.
- Fresh production build: PASS. Budgeting that actual build: FAIL for
  `route:category`, gzip 79.8 KiB against 79.6 KiB. Search, journeys and
  recommendations budgets pass. This supersedes the earlier stale-build
  budget pass; thresholds were not changed.
- Production-baseline API comparison: journey IDs `[7,9,10,8,6]` and all 18
  Journey 7 step IDs match. General catalog IDs/totals differ: saved production
  3,824 versus development 1,816. Equal production result counts cannot be
  asserted on these different datasets. Full comparison:
  `gates/production-api-comparison.json`. No database was changed.
- Refreshed captures waited behind other audits' shared browser lease and
  were cancelled before launch rather than bypassing it. Existing evidence
  and the final-capture integration handoff remain; no new axe pass is claimed.
- Fresh build, budget and token logs are in `gates/resume-*`. Shared
  shell/resource/category repairs remain with their owners. No unrelated
  source files or thresholds were edited.

## Latest blocker triage

The shared merges now make both dead-components and dead-exports PASS.
Canonical-token-parity still reports 63 failures on the resource page, not
discovery styles. The app readiness endpoint returns HTTP 200.

Inspection of the latest completion-run logs distinguishes infrastructure
failures from UI defects: migration and guest-recommendation commands failed
with `Cannot fork`; build and boot-safety processes aborted; the recommendation
contract request returned 500 because `home_layout` is absent from the database.
The tag audit encountered an empty home-page SPA shell. No discovery source
change is supported by those failures.

One bounded Advanced capture/axe attempt could not acquire the shared browser
lease before the 90-second shell limit; the lease was held by ds-button-sweep.
It produced no screenshots or axe findings and did not bypass the lease or
touch another audit's process. The historical Advanced contrast observation
therefore remains an explicit final-integration obligation.

Requesting completion of the leaf implementation with the configured broad
validation deferred for these observed execution/environment blockers.
This is not an all-gates-pass or full-page-parity assertion. Existing captured
functional evidence, source checks, and recorded failing gates remain intact.
The downstream integration/final-verification tasks must resolve database
alignment, resource styling, category budget and final capture obligations.