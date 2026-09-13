# Header worklog

## Owned delivery

Changed only AppHeader and `client/src/styles/shell/header.css` for runtime
implementation. Existing public props, palette opener, sidebar toggle,
Clerk-backed user, logout callback/error banner, and account destinations remain.
The stylesheet is imported by the component. No design-system.css, MainLayout,
sidebar, palette, frozen reference, aggregate inventory or aggregate report edits.

See [mapping and handoffs](../assumptions/shell-header.md).

## Header-region diagnostics

Threshold: pixelmatch **0.1**; budget: **0.5%** of header area.
The reference images come from real canonical harness captures with live catalog
bindings. The app uses real disposable Clerk admins named Nick. All final app
strip captures produced two consecutive byte-identical PNGs.

| Width | Header height | Different pixels | Header area difference |
| --- | --- | --- | --- |
| 375 | 56 | 39 | 0.185714% |
| 768 | 56 | 39 | 0.090681% |
| 1024 | 60 | 69 | 0.112305% |
| 1440 | 60 | 181 | 0.209491% |

Evidence: `../evidence/shell-header/expected-<width>-strip.png`,
`verified-admin-<width>-strip.png`, `verified-diff-<width>.png`, and
`verified-results.json`. All four are below the diagnostic budget.
Reviewed all four strip pairs and the focus screenshots: no overflow, clipped
controls, or overlap. Geometry has 14px effective gap, 14px blur, 36px mobile
search, 180px tablet search, expected nav/wordmark visibility.

These crops are **diagnosis only**, not a full-page gate pass.

## Full-canvas row status

The `app.shell.default` row aliases `app.home.index`. It stayed full-canvas with
the original pixelmatch threshold and budget.

- Initial four-width run hit the shell tool's five-minute timeout after capturing
  375, 768 and 1024. Its completed 375/768 rows were **FAIL 40.5764% / 29.0737%**.
  Retained app full canvases and log are in the owned evidence directory.
- A selected 1440 run completed: **FAIL 29.6588%**, 1 row failed, no incomplete
  rows. Its immutable complete report and image pairs are at
  `tests/parity/baseline/2026-09-13T00-20-46-242Z-2965/`.
- That desktop full-canvas run preceded the final native-button-default and
  live-dot layout fixes. Its header was 1.998843%; final header-only diagnosis
  is 0.209491%. It is retained as before-fix evidence, not re-labelled green.
- One ad-hoc full-page capture produced black header crops despite a mounted,
  interactive header. Those measurements in `final-results.json` are
  **INVALID capture artifacts**, not pixel findings. The real sign-out and menu
  measurements in that file are valid. Viewport priming plus element capture
  produced the visibly inspected, repeat-identical `verified-*` evidence.

Full-page closure stays with the planned shell integration task.

## Functional / static evidence

- `npm run check`: PASS after the final code edits.
- `git diff --check`: PASS.
- Running workflow restarted once for the implementation; startup clean.
- Search click using the existing e2e selector and Control+K opened the real
  palette at all four widths; Escape closed it.
- Visitors have no Admin nav link. A real admin rendered the link/account name;
  selecting Sign out returned to `Account · Visitor` and removed Admin.
- Account-menu minimum item height measured **44px**.
- Header-only axe: **0 serious / critical** at 375 and 1440 (`results.json`).
- Real hover and keyboard Tab/Shift+Tab focus PNGs retained at all widths.
- The real mobile drawer opened at 375. Tablet rail-vs-drawer behavior is a
  documented handoff, not a pass.
- All successful disposable runs deleted their own local and Clerk users.
  The interrupted run's single known identity was separately verified and
  deleted; no broad sweep or other worker's identity cleanup was performed.

## Completion-gate follow-up

The first configured completion run timed out after 639 seconds; its code-review
step timed out at 600 seconds. It did **not** mark the task complete.
Header-owned findings were addressed:

- Canonical fixed-radius exceptions are explicitly explained for the palette gate.
- Logo requests the actually loaded 700 face, matching the reference's nearest
  available face for its requested 800. The mobile logo/menu pixels stayed
  identical (0 changed at pixelmatch 0.1 against the retained diagnostic).
- SidebarTrigger remains the functional trigger; its canonical SVG is an
  accessible decorative overlay, not a replacement toggle implementation.
- The expandable location section reuses the breadcrumb primitives. Theme
  Settings exposes the current theme in its title. No unused primitives/hooks
  or stale dead-export allowlist changes are needed.

After these changes: **typecheck, palette-drift, dead-components, dead-exports
all PASS**. A real mobile click still opens the drawer. Post-gate screenshot:
`../evidence/shell-header/post-gate-375.png`.

Remaining configured-gate findings require integration:

- Responsive: only three old closed-header breadcrumb expectations failed;
  29 other checks passed, including drawer focus trap and focus restoration.
- Collections: shared-collection breadcrumb expected in the closed header, plus
  a separate bookmark-label timeout in the page flow.
- Sticky preview: TSX-only source assertion cannot see the imported header
  stylesheet's height token (not a failing runtime geometry measurement).
- The earlier font-showcase failure requested weight 800 from mono loaders;
  the header's 800 request is now removed. That full browser gate has not been
  re-run separately; do not claim an observed pass.

The second configured completion run failed on responsive, collections, and
sticky-preview gates. Review rejected deferring breadcrumb semantics. The user
authorized a coordinated page-owned replacement and matching gate updates.
`PageBreadcrumb` now renders immediately inside `main`, outside the header pixel
area, and preserves prior breadcrumb testids/labels without extra API fetches.
The exact-768 shell offset and sticky source check now follow the canonical
56px breakpoint. The added lint debt was fixed with existing nav/auth types.

## Prescribed e2e status

The two named specs were updated to exercise the merged canonical interfaces,
not deleted or weakened:

- `search.spec.ts`: **27 passed**. It targets current Home taxonomy links/counts,
  the accessible `Open search` control, “Find resources”, Escape dismissal,
  Command options, and the canonical Back to Home link.
- `sidebar-ux.spec.ts`: **10 passed** after rebasing the merged sidebar coverage,
  across 1440/1024/768/375 plus nested-leaf clipping checks. Widths through
  768 explicitly open the canonical drawer before measuring taxonomy targets.

Both use real browser interaction against the running app. Earlier failing logs
remain as historical evidence of why selector reconciliation was needed.

Completion review then found that the first page-owned resolver covered only a
subset of valid App routes. The resolver now has an explicit full route-label
contract, including legal/discovery/account/system routes, appearance settings,
legacy auth aliases, valid admin deep links and their aliases, dynamic resource,
journey, tag, collection and taxonomy routes. Only unknown paths receive “Page
Not Found.” Responsive audit now covers representative static, dynamic, nested
admin and unknown paths; all six route-label checks pass.

## Production baseline

Executed:

```sh
npm run baseline:compare -- \
  --baseline tests/parity/production-baseline/2026-09-12 \
  --against http://127.0.0.1:5000 --routes / \
  --out /tmp/header-538/production-compare
```

The report records **13 tracked deltas**, not a regression pass. Most are
different production/dev data (3,824 vs 1,816 resources and taxonomy changes).
The header-owned visible-testid delta is the now-hidden desktop drawer trigger;
its DOM selector remains. Full-page axe had 0 serious/critical on both widths.
The report was copied into this task's evidence; its `/tmp` image links are
historical, so use the retained owned PNGs instead.

`production-before-after-375.png` and `production-before-after-1440.png` show
the baseline on the left and candidate on the right. Intended differences:
canonical av tile/wordmark, no inline breadcrumbs/utility cluster, compact
count-bearing search with ⌘K, primary nav, signed-out account pill, and desktop
menu button hidden. Baseline comparison predates the final button-default
adjustment; final design comparison is in `verified-*`.

## Follow-up routing

No new tasks proposed: the already-planned parallel-component integration and
final click-through/regression tasks cover the shared-shell and selector
handoffs. Token-only and artifact-docs eligibility are unchanged.