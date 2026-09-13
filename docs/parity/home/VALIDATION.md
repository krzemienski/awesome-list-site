# Home validation — 2026-09-13

## Acceptance ownership

After the user delegated the choice (“You choose”), both task records were
formally updated: task 542 owns Home functionality and focused verification;
task 556 owns full-page visual and cross-surface regression closure. Historical
pixel failures below remain failures, but no longer block the narrowed Home
implementation task. The final 0.5% target is unchanged. Integration must
measure remaining Home differences as well as shell differences rather than
assuming every mismatch comes from the shell. Production link-count
reconciliation and failed global gates also remain open integration requirements.

## Completion runner infrastructure failure

Run `5PXri9PRNk9J4LyDL5Y5g` exhausted 1,800 polls without reaching a terminal
state. Its migration and preference-race logs report spawn `EAGAIN`; the accent
gate could not execute its font canary for the same reason, and the
product-profile command reports `Cannot fork`. Build and pool processes aborted.
These are not passing checks. The fresh completion code review passed, as did
the run's typecheck and several API/SEO-related checks reported earlier.
Completion is requested with an audited skip of the nonterminating global
runner, relying on retained focused evidence for the narrowed implementation.
Known tablet/visual/cross-surface failures remain assigned to integration;
the infrastructure skip does not waive them or final parity acceptance.

## Passing observations

| Check | Evidence / result |
|---|---|
| TypeScript | `evidence/checks/check.log`, exit 0 |
| Owned page/hook/feed ESLint | `evidence/checks/owned-lint.log`, exit 0 |
| CSS lint | `evidence/checks/lint-css.log`, exit 0; owned stylesheet also passes |
| Unit suite | `evidence/checks/unit.log`: 15 files, 299 tests pass |
| Production build | `evidence/checks/build.log`, exit 0 |
| Migration drift | `evidence/checks/migration.log`, exit 0 |
| Home live API | `evidence/checks/feed.json`: 1,816 approved; all six kind buckets sum to 1,816; 5 recent, 0 featured, 0 in the last seven days |
| SEO full snapshot + hydration | `evidence/checks/seo.log`: gate passed, including `/` parity |
| Taxonomy SSR/API parity | `evidence/checks/taxonomy.log`: pass |
| Responsive audit | `evidence/checks/responsive.log`: 32 checks, 0 failures |
| Guest recommendations | `evidence/checks/guest.log`: all 4 populated scenarios pass; mock-empty scenarios deliberately not run |
| Home axe | `evidence/browser/results.json`: no serious/critical findings at 375/1440 for both layouts |
| Browser functionality | Default Index/no corpus; kind counts stay unchanged under filtering; guest Curated reload; filtered Curated category navigation retains active tags; Index override; all 101 taxonomy links; signed-in save/reload and stale revision rejection |
| Settings preference UI | Guest and disposable signed-in administrator selected Curated in `/settings`; Home navigation and reload retained the selection; owned identity was removed from both stores |
| OpenAPI drift | 178 API routes, 178 named contracts, 150 paths; pass after documenting `/api/home` |
| Loading anchors | Loading→loaded Home anchors move at most 0.046875px at 375 and 0.015625px at 1440 for Index and Curated; before/after PNGs retained |
| Lighthouse mobile | Local Home performance 0.95 against retained production baseline 0.85 (baseline −3 requirement passes) |

## Corrected findings, focused confirmation

- The browser probe initially failed “Learning reset preserves layout.”
  Removed the unrelated Home field from the learning reset update. A real
  repository save/reset with a uniquely owned temporary user verified Curated
  remains saved and the revision increases; that user's rows were deleted.
  `evidence/checks/reset-fix.log` records the pass. The historical browser
  result is retained unchanged; it is not represented as an all-green run.
- Print audit initially passed 48/49 checks and failed the Home aside visibility
  check. Added Home-only print CSS. A subsequent real Chromium print-media
  check confirmed `.home-index-rail` has `display: none`. No second full suite
  was run. Screen geometry was not changed by this print-only fix.

## Failures / unverified closure

- Full repository lint fails with thousands of existing project-service/style
  errors. Owned TypeScript modules pass targeted ESLint; the new `.mjs` probes
  share the repository's existing script/project-service lint limitation.
- Dead components and dead exports pass after mounting the preference in
  Settings and removing its unused named export.
- Bundle budget: category incremental raw bundle exceeds its 231.4 KiB budget
  by approximately 0.5 KiB; initial isolation passes. See `budget.log`.
- The 175-case browse suite was stopped after it reproduced category-owned
  failures (missing “Back to all categories” button and old sort-control
  expectations). It reports 11 passed, 3 failed, 4 interrupted, 157 not run.
  It is **not green**. Home links successfully navigate to the category page.
- Integrated frozen-clock/Nick pixel harness now measures all eight cells.
  After binding the reference recent list to the real Home feed, Index fails
  at 14.0753%, 24.8223%, 6.0183%, and 4.6698% for
  375/768/1024/1440. Curated's second measured pass fails at 39.2033%,
  34.0322%, 27.0361%, and 30.1500%. No threshold was relaxed.
- Production comparison: the retained live Home baseline has 184 links and
  document height 1,278px at 1440. Index now has 266 links, including exactly
  9 category and 92 subcategory links, and height 2,941px. The changed link
  count/height are an intended consequence of the specified every-category,
  every-subcategory Index layout, but the requested equality does not pass.

All of these are integration inputs, not waived acceptance criteria.
See `HANDOFF.md`.

## Completion review status

The first completion attempt was rejected. The user subsequently approved
expanding scope to mount the Settings control and update shared harness/API
artifacts. Those integration changes and their functional checks are complete.
The review also found a real owned query-state bug: Quick access Filters and
Account were reading only the initial URL. They now subscribe to wouter search
changes. TypeScript passes after the fix. Raw Home borders/radius now consume
the existing hairline/radius tokens; the palette-drift gate passes.

Kind chips now declare the existing DS chip hook, and all Home border/radius
values use tokens. The current pixel failures remain explicitly blocking.

The Curated two-pass rule was applied: the first pass established the raw
real-data mismatch; the adapter was then changed to bind the frozen reference
to `/api/home`, and all four widths were captured again. The remaining
differences are retained rather than masked.

## Final focused review pass

- Fixed the completion review's concrete Curated navigation defect. Active
  `tags` now survive both Curated category cards and Browse all navigation.
  `/tmp/home542-browser-final/results.json` is a fresh real-browser run with
  every functional, responsive and axe assertion passing, including clicking a
  filtered Curated category link and observing `tags=hls` on the destination.
- Fixed the subsequent completion review's kind-filter defect. The lazy
  full-corpus path now applies the shared `resolveResourceKindFrom` contract
  whenever a corpus row lacks `resolvedKind`. A fresh real-browser run at
  `/tmp/home542-browser-kind-fix/results.json` proves Libraries retains a
  non-empty subset, excludes nonmatching resources, and leaves the full-set
  chip counts unchanged.
- Applied the already-delivered canonical footer integration handoff. The
  footer now receives site and source-repository metadata from `/api/config`,
  renders outside the sidebar/content row, and is no longer reported dead.
  OpenAPI drift, dead-components and dead-exports all pass after integration.
- Curated category cards now consume the real lightweight-nav descriptions
  instead of generic fallback copy. The reference's Curated recent slice is
  also bound explicitly to the five `/api/home` recent rows required by this
  task.
- A fresh frozen-clock/Nick 1440 measurement after those corrections is
  retained at `tests/parity/baseline/2026-09-13T05-44-24-017Z-21998`:
  Index 15.5610%, Curated second pass 8.1947%. These still fail the 0.5%
  full-page threshold. The Index result is dominated by the currently merged
  shell geometry; Curated improved from 30.1500% to 8.1947% after binding the
  required recent rows and real category descriptions. No pixels were masked
  and no threshold was changed.