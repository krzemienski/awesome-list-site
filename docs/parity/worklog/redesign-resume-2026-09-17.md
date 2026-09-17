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