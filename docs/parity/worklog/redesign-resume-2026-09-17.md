# Parallel redesign follow-through — 2026-09-17

Base revision: `a09ad484`; evidence applies to the working-tree changes recorded
with this report, not to the already-published deployment.

**Status: confirmed defects repaired; exhaustive redesign certification remains
incomplete.** This report does not turn historical pixel failures, unexecuted
flows, or blocked validation workflows into passes.

## Implementation and evidence

Evidence root: [`../evidence/redesign-resume-2026-09-17/`](../evidence/redesign-resume-2026-09-17/).
Parallel owners covered public pages, authenticated admin, responsive shell and
design-system artifact, server rendering, and independent requirements review.
The lead reviewed the changes and the final screenshots.

| Requirement / defect | Owning implementation | Current proof | Status |
| --- | --- | --- | --- |
| Server rendering must not resolve Clerk against an empty browser hostname | `client/src/App.tsx` uses the configured publishable key on the server and hostname resolution in the browser | Disposable production-shaped-key renderer import plus real development-DB Home rendering; absent-key import fails explicitly. See `checks/ssr-verification.txt`. This is not a production sign-in test. | Verified locally |
| Persistent 240px tablet sidebar at exactly 768px | `ui/sidebar.tsx`, `styles/shell/sidebar.css` | Fresh 375/767/768/1024 browser captures; no static sidebar at 375/767, 240px at 768/1024 | Verified |
| Inactive Home navigation must remain readable on category pages | Removed the near-white background override from `styles/shell/sidebar.css`, restoring the canonical inherited sub-item treatment | Final Replit category preview; previously the link rendered as a blank white rectangle | Verified |
| Tablet drawer remains accessible alongside the static sidebar | Same sidebar owner | At 768: two visible navigation copies only while drawer open, no duplicate IDs, all 18 disclosure targets resolve; Escape returns focus to Toggle sidebar | Verified |
| Update obsolete tablet expectations without weakening them | `scripts/validation/tablet-audit.mjs`, `assumptions/shell-sidebar.md` | Added strict 767/768 assertions and drawer coexistence; syntax passes. The old 31-pass workflow predates these assertions and is NOT proof of the updated complete command. Live boundary checks pass. | Updated; complete command not rerun |
| Artifact showcase/docs fit narrow screens without hiding content globally | Artifact `index.css`, `CanonicalShowcase.tsx`, `ArtifactDocs.css` | 375/767/768/1024 viewport captures and repeated width measurements: document widths 365/757/758/1014 respectively, all within viewport | Verified |
| Fixed-coordinate diagrams remain keyboard accessible | Labelled, focusable local `.ds-flow-scroll` regions | Fresh ArrowRight changes scrollLeft 0→40, max 415, document width stays 365 at viewport 375; `design-system/fresh-flow-*` | Verified |
| All taxonomy levels show the real collection introduction | `client/src/pages/TaxonomyListing.tsx` renders shared `scopeIntro` | Exact crawler/client matches for `/category/community-events`, `/subcategory/community-groups`, `/sub-subcategory/online-forums` after the fix | Verified samples |
| Admin Settings menu is reachable, opaque, dismissible and keyboard operable | `AdminDashboard.tsx` uses the existing shared Radix dropdown; `admin-shell.css` owns scoped presentation | Real Clerk admin session at 375 and 1440: Theme settings/Journeys/Digests hit-testable; actual Learning Journeys and Digest delivery health panels reached; Escape returns focus to Settings | Verified |
| Long admin identity must not force the mobile masthead off screen | Scoped intro min-width/max-width and wrapping metadata | At 375, intro/paragraph end at x329; scrollWidth equals clientWidth, full contributor sentence wraps instead of clipping | Verified |

### Evidence corrections

- The initial exact-768 report is superseded by post-fix captures, not retained
  as an open defect.
- Old artifact `End`-key evidence reporting scrollLeft 0 is not ArrowRight
  proof. The retained fresh ArrowRight evidence measures settled native scroll;
  no custom keyboard handler was necessary.
- Bounding rectangles alone incorrectly suggested that the first custom admin
  popover fix passed. The lead's image review found transparency and header
  occlusion. After two unsuccessful custom-disclosure corrections, the final
  implementation reuses the shared collision-aware dropdown. Only
  `admin/dropdown-final-*` captures prove the final menu.
- Historical header pixel percentages were not promoted to a fresh defect
  without a valid current expected/actual comparison.

## Public and admin coverage

Public real-browser checks exercised home filters, Index/Curated layouts,
category/resource/journey browsing, guest bookmark/profile gates, 404, real
search/no-results/clear, command palette keyboard selection and focus return,
and search Back/Forward. Additional route coverage is recorded in
`public/coverage-matrix.txt`: About FAQ, Terms, Privacy, Code of Conduct,
Advanced query-empty/reset, populated Recommendations, Continue Learning guest
state, Contributions and Notifications sign-in redirects.

Authenticated admin navigation reached Overview, Approvals, Edits, Enrichment,
Researcher, Export, Database, Resources, Categories, Subcategories, Users,
GitHub, Link Health, Audit, Research and the nested taxonomy/Journeys/Digests
destinations. Category Create opened and cancelled. Empty Approvals accurately
reported no pending records. No paid research/enrichment, external export,
database console, GitHub sync or link-health jobs were started.

Admin authentication used legitimate disposable development Clerk identities,
real sessions, and only those identities' local role changes. Final cleanup
deleted Clerk first, the corresponding local row second. The retained
`admin/dropdown-final-teardown.json` reports zero run-owned QA users and
preservation of the existing test account. No production records were changed.

## Build checks

- `npm run check`: PASS after the final TypeScript changes.
- `npm run build`: PASS after the final application code/CSS changes.
- Artifact build: PASS.
- `npm run validate:canonical-token-parity`: PASS with the existing documented
  deviations, unchanged acceptance rules.
- Artifact docs/token generator consistency: PASS.
- `node --check scripts/validation/tablet-audit.mjs`: PASS.
- `git diff --check`: PASS.

The main application and design-system workflows were restarted successfully.
The main preview was personally inspected with Replit Screenshot.

## Not certified by this pass

1. The original uploaded remediation prompt/archive named in the execution
   contract are absent from this workspace. Requirements were recovered from
   retained documentation and the frozen design source; a fresh reading of
   every original attachment cannot be claimed.
2. Full final-candidate pixel parity, every route's axe/keyboard/responsive
   states, all 50 theme combinations, contact variants a–e, forced
   loading/backend-error states, and three-route Lighthouse were not rerun.
3. Full submission→approval persistence, kind/featured edit/clear/reload,
   collection/bookmark/note CRUD, profile/onboarding, and every admin
   create/edit/delete/confirm/cancel state remain unverified by this pass.
   Navigation and safe dialog checks are not substitutes for that coverage.
4. Several automatically running validation workflows timed out waiting for
   the shared DB-heavy lease. Other earlier checks saw startup connection
   failures. They are not passing results and were not hidden by mass reruns.
   The SEO crawl's taxonomy-intro failure was repaired and checked on three
   real levels, but the full 2,334-URL crawl was not repeated.
5. Production delivery and production-specific verification remain separate.
   No publish action was taken; the SSR fix has not been verified on a new
   published deployment.

No original fixture, frozen expected design, accessibility floor, database
schema, bundle budget, or acceptance threshold was changed to manufacture a
pass.

## Second pass, later on 2026-09-17

Same base revision (`a09ad484` + this working tree). The re-supplied original
archive was reconciled first ([DESIGN-SYNC.md](../DESIGN-SYNC.md): identical
to the frozen reference, 0 differing entries), which retires item 1 below.

| Item | Change | Proof | Status |
| --- | --- | --- | --- |
| Header strip 2.3–5.4% | `styles/shell/header.css`: 44px hit targets as transparent pseudo-elements around the frozen 36px paint; comparison redone state-matched (signed-in admin, like the expected strips) | [`shell-header/repair-2026-09-17/`](../evidence/shell-header/repair-2026-09-17/) 375 0.70%, 768 0.36%, 1024 0.55%, 1440 0.52% (768 within the 0.5% ceiling; the other three remain 0.02–0.20pt over — raster rounding per [header-repair-2026-09-17.md](header-repair-2026-09-17.md), not waived) | Repaired, three widths still over ceiling |
| Admin Resources: click on Edit opened Delete Resource | `admin-catalog-resources.css`, `admin-catalog-taxonomy.css`: hover-revealed delete control anchored out of flow beside View/Edit, inert until row hover/focus, no re-flow on reveal; rules apply only under hover/focus/tools-open so resting pixels are unchanged by construction (no-hover harness not rerun) | Built-in tester, pointer-only, both tables; details in [CLICKTHROUGH.md](../CLICKTHROUGH.md) defect 2 | Fixed |
| Member/admin persistence flows (item 3 below) | none needed | Built-in tester: collections/bookmarks/notes CRUD, submit → approve → public → kind/featured set/clear/reload → delete, category create/rename/delete, Journeys/Digests/Users panels; every `__qa_test_*` catalog record removed through the UI; the disposable member (Clerk first, then local row) and older `__qa_test_` Clerk residue removed in the final teardown, 0 remaining, `approved = 1816` | Verified |
| System states | none | 1280 captures of not-found, empty search, populated search, privacy, terms in [`evidence/redesign-resume-2026-09-17/system-states/`](../evidence/redesign-resume-2026-09-17/system-states/) | Rendered-state proof only |
| Three-route Lighthouse | `scripts/validation/normal-lighthouse.mjs` gained `--path` (same registered command, one route per invocation; rejects `//`, backslashes, query/fragment and any off-origin resolution) | [PUBLISH.md](../PUBLISH.md) Lighthouse rows; evidence under `evidence/lighthouse/three-routes-2026-09-17/` | Measured (see PUBLISH for the verdict) |
| Category Lighthouse below 0.82 (0.78) | `client/index.html` pre-boot script builds the `#ssr-seo-hold` overlay before first paint and leaves it semantic/interactive; `client/src/main.tsx` adopts it (`data-preboot`, `data-pathname`), applies `aria-hidden`/`inert` + h1 demotion right before React mounts, and keeps the removal logic; `TaxonomyListing.tsx` fetches the faceted `/api/resources` only once the filter panel opens or a filter is active. Root cause from a PerformanceObserver probe: re-inserting the prerender after the bundle ran re-registered the lead paragraph as a larger (web-font) LCP candidate, dating LCP to the bundle | Rebuilt `dist/`, loopback prod-mode server: category 0.79 / 0.89 / 0.84 median **0.84**, resource 0.86 / 0.85 / 0.77 median **0.85**, home 0.88 / 0.83 / 0.83 median **0.83** — [PUBLISH.md](../PUBLISH.md) Lighthouse rows; [`evidence/lighthouse/three-routes-2026-09-17/after-preboot-hold/`](../evidence/lighthouse/three-routes-2026-09-17/after-preboot-hold/). Overlay lifecycle re-checked in a headless browser on category, subcategory, resource and admin routes (semantic before adoption, adopted, then removed once data settles; no duplicate h1 while held) and with the entry chunk blocked (page stays usable). Code-review round: high (inert fallback when the bundle never runs) and medium (cached facets error surviving Back) findings fixed | Fixed, all three routes meet 0.82 locally |
| Contact variants a–e rerun | harness only: `contact-variants-566.mjs` follows the redesigned Index home (`link-home-recent-*`) and opens the resource page's More disclosure before asserting Suggest Edit | a, b, c, d, e (form + fallback), unset PASS on isolated dev servers; QA rows and the contact limiter hit deleted afterwards — [contact-variants-566.md § 2026-09-17](contact-variants-566.md), [`evidence/contact-variants/rerun-2026-09-17/`](../evidence/contact-variants/rerun-2026-09-17/) | Verified |
| `palette-drift` regression after the header edit | the avatar's fixed `#0a0a0a` ink fell out of the 5-line `DS-OK` window; tagged with its own reason | `palette-drift` PASS | Fixed |

Gates after these changes: `npm run check`, `canonical-token-parity`,
`palette-drift`, `accent-drift`, `seo-snapshot` PASS. Nothing in the frozen reference, the
44px floor, thresholds or expected captures was changed.

Still not certified by this pass: full pixel parity of the final candidate,
all 50 theme combinations, forced loading/error
states, the full SEO crawl, and anything production-specific. No publish
action was taken.

## Third pass, later on 2026-09-17: full pixel run and the 50 combinations

Full-inventory admin run `tests/parity/baseline/2026-09-17T11-42-39-272Z-11572`
(all four widths; the runner regenerated [REPORT.md](../REPORT.md) and
[STATUS.md](../STATUS.md)): **133 pass / 51 fail** of 184 executed pixel
rows, 0 incomplete, 40 blocked, clean identity teardown. The previous full
run was 159/25. The 26 cells that were passing then and fail now (six 768
shell/taxonomy cells, `app.category` ×3, `app.subcategory` ×3, ten artifact
docs chapters at 375, `artifact.docs.integration` 768/1024, two admin
live-data cells) plus three already-failing artifact cells that worsened were
traced with `git diff a09ad484..HEAD` to the first pass's contract-directed
changes; none is a capture defect, and every one is listed below with what was
decided. Thresholds, expected captures and the frozen reference are unchanged.

| Rows | Measured | Cause | Decision |
| --- | --- | --- | --- |
| `app.home.index`, `app.home.curated`, `app.shell.mobile-drawer`, `app.shell.palette`, `app.category`, `app.subcategory` at **768** | 25.2–32.7%, app taller (240px sidebar present) | Contract line 199–200 requires the tablet sidebar at exactly 768; the frozen `@media (max-width:768px){.sidebar{display:none}}` hides it there. The first pass moved the cutoff to `<768` ([ui/sidebar.tsx](../../../client/src/components/ui/sidebar.tsx), [sidebar.css](../../../client/src/styles/shell/sidebar.css)) | Kept. Contract-over-reference residual: these six 768 cells cannot pass while the reference hides the sidebar at that width; recorded, not waived |
| `app.subcategory` 375/1024/1440 | 5.6–6.8% | First pass rendered the shared `scopeIntro` at every level for crawler parity; the frozen `SubcategoryPage` has no introduction paragraph | **Fixed**: below category level the paragraph is `sr-only` (same DOM text as the crawler markup; `seo-snapshot --gate --parity` PASS). Rerun `2026-09-17T12-50-11-108Z-25251`: 375 0.12%, 1024 0.24%, 1440 0.28% PASS |
| `app.category` 375/1024/1440 | 4.9–6.0%, one text line taller | The reference's `CategoryPage` prints `cat.desc`, which the adapter binds to the nav teaser (the first direct resource's description, one line shorter); the app prints the crawler-parity `scopeIntro` sentence. Re-binding `desc` to `scopeIntro` was tried and reverted: the same field feeds the home category cards, where the app shows the teaser | Kept as a residual. The diff is the extra intro line shifting everything below it plus the readable inactive Home link (next row); the paragraph and the cards themselves match |
| Inactive Home link on category pages (part of the rows above) | ≈0.1% | The reference's white box is a `<button class="sub-item">` with the UA default `buttonface` background and unreadable text (prototype defect); the first pass removed the emulation | Kept readable |
| New: `artifact.docs.cards`, `color`, `flows`, `getting-started`, `integration`, `lists`, `motion`, `navigation`, `theming`, `tokens` at **375** (10 cells) and `artifact.docs.integration` 768/1024. Worsened, already failing on the 44px floor: `artifact.docs.buttons` 375 (2.9→14.1%), `artifact.docs.forms` 375 (1.8→13.2%), `artifact.showcase` 375 (23.7→62.6%) | 11.7–66.5%, expected width 389–920px at a 375 viewport | The frozen docs/showcase pages overflow sideways on narrow screens; the first pass made the artifact fit the viewport (contract line 211, "no sideways overflow"), so its documents are now narrower than the reference captures | Kept. Contract-over-reference residual, same class as the 768 sidebar. `artifact.docs.color` (405px) and `artifact.docs.lists` (495px) still overflowed at 375 after that pass; **fixed** below in the fourth pass |
| `app.admin.database` 375, `app.admin.researcher` 1440 | 0.506%, 0.511% (0.49% in the previous run) | Live job/health data on both sides; already the recorded cause for the neighbouring researcher rows | Same residual class, now over the ceiling by 0.01pt |

Not rerun after the subcategory fix: the full inventory. The category and
subcategory 768 cells stay failed by the sidebar decision regardless.

**Theme persistence, all 50 combinations** (Playwright against the loopback
dev server, real `/settings/theme` controls, `system-option-*` and
`accent-option-*` test ids): every combination applies `data-system` /
`data-accent`, stores `ds-system`/`ds-accent`, survives a reload, and holds on
`/category/encoding-codecs`, where the probe asserts per row that the
resource-count chip colour equals the selected `--accent` token and the body
font equals the selected system's `--font-body` (10 distinct accent tokens, 5
distinct body families). 50/50 PASS — [`evidence/tokens/50-combo-2026-09-17/`](../evidence/tokens/50-combo-2026-09-17/)
(`results.json`, the `probe.mjs` that produced it — run from the repo root
against a loopback `BASE_URL` — and the crimson long-page captures at 375/1440
per system). Signed-out guest persistence only; it is not a pixel comparison.

Gates after this pass: `npm run check`, `seo-snapshot --gate --parity`,
`dead-exports`, `palette-drift` PASS. No publish action was taken.

## Fourth pass, later on 2026-09-17: the two remaining artifact overflows

`artifact.docs.color` (405px) and `artifact.docs.lists` (495px) were the last
docs chapters wider than a 375 viewport. Both came from inline fixed grid
columns in `DocsContent.tsx` (`160px 100px 1fr` ink ramp, `60px 1fr 140px 100px`
anatomy row). Fix in the same shape as the showcase's existing narrow-screen
rules: the anatomy row now carries the showcase's `.ds-list-row` class and the
ink ramp a new `.ds-ink-row`, both reflowing under 480px in the artifact's
`index.css` (`!important` only where the inline `grid-template-columns` has to
be overridden). A loopback Playwright sweep of all thirteen docs chapters
reports `scrollWidth` equal to the viewport at 375, 768, 1024 and 1440.
Gates: artifact `tsc`, `product-profile-browser`, `standalone-palette-drift`,
`palette-drift` PASS.

Selected pixel rerun `tests/parity/baseline/2026-09-17T14-25-54-964Z-6689`
(five artifact rows at 375, diagnostic only, whole-inventory report untouched):
all five still FAIL, as the contract-over-reference decision predicts — the
actual captures are now exactly 375 wide (color 375×3500 vs expected 458×3331,
lists 375×2862 vs 542×2664, buttons 375 vs 409, forms 375 vs 406, showcase 375
vs 741) and the percentages rose accordingly (color 19.3→25.6%, lists
18.5→37.1%; buttons, forms, showcase unchanged). No threshold, expected capture
or frozen source was touched. The open defect is closed; the rows stay in the
residual list.
