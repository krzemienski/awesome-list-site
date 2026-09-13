# Sidebar component delivery and integration handoff

## Scope and status

Implemented only AppSidebar, the sidebar primitive, their scoped CSS, and the
requested sidebar audit expectations. No AppHeader, MainLayout, shared Sheet,
design-system.css, frozen reference, aggregate report, or inventory edits.
The artifact's `docs/` directory was empty in this checkout; governing source
was `awesome-list-site-ds/layout.jsx`, `styles.css`, and existing parity tokens.

**Functional component checks pass; full-page pixel parity does not pass.**
The existing downstream integration task owns final full-page closure. This
report is not permission to lower the 0.5% ceiling or mask/crop gate images.

## Evidence

| Check | Result |
| --- | --- |
| `sidebar-ux.spec.ts` | 8/8 at 375, 768, 1024, 1440; `sidebar539-ux-pass2.log` |
| `sidebar-ux-css.test.ts` | 8/8; isolated static config avoids unnecessary shared test-DB cleanup; `sidebar539-unit.log` |
| TypeScript / working-tree whitespace | `npx tsc --noEmit --pretty false` and working-tree `git diff --check` passed. This did not inspect committed generated reports: base-to-head includes Markdown hard-break/trailing whitespace in retained harness reports and production comparison; no clean base-to-head whitespace claim. |
| Responsive audit | 52/52, including authenticated drawer trap on `/`, `/submit`, `/journeys`, `/advanced`, `/settings/theme`, `/admin`; `sidebar539-responsive.log` |
| Sticky preview audit | 7/7; `sidebar539-sticky.log` |
| Geometry and drawer behavior | `sidebar539-browser-pass2.log`: 280 at 1440, 240 at 1024, absent at 768/375; drawer 340 at tablet and 322.5 at 375; trap, Escape/focus return, backdrop and route closure pass |
| Axe | zero serious/critical on desktop sidebar and open phone drawer; production comparison also reports zero on whole pages at 375/1440 |
| Final tablet defects | `sidebar539-final-probe.json`: active Official Specs visible at 900/1024; all 18 mounted accordion IDs unique, each drawer control resolves inside drawer |
| Drawer search | Enter with `ffmpeg` navigates to `/search?q=ffmpeg` and closes drawer; final probe |
| Tablet audit | 30/31 on second run; sole remaining result was 28px brand target. Final compensated-margin fix measures 44px without changing header visual geometry; final probe. Previous short-page consent overlaps were corrected and pass on second run. No third full audit claimed. |

The final review fixes change disclosure IDs, active-item scroll selection, and
the invisible extent of the brand hit target. They do not alter default
closed-tree visual geometry. Their focused live checks are retained separately
from the earlier screenshots.

Completion validation subsequently passed the registered responsive, tablet,
print, migration, tag-route, collections, auth-return, typecheck, build and boot
safety checks. It found palette annotations and exports left unused by the
drawer rewrite. Those are corrected without deleting public component exports
or editing shared Sheet: More navigation uses the existing menu primitives,
the drawer uses SidebarFooter and the existing semantic SheetDescription.
The canonical fixed compositing layers/radii carry reasoned DS-OK annotations;
the hairline consumes its token. Both palette-drift and dead-exports now pass
(`sidebar539-palette.log`, `sidebar539-exports.log`).

Final completion review identified a pre-existing nested fixed-height estimate
that clipped 44px leaf rows. Both accordion levels now measure their unclipped
content with ResizeObserver, including responsive wrapping and nested expansion;
all leaf targets stay at least 44px at tablet as well as phone. Nested toggles
have instance-unique `aria-controls`/body IDs. The added real-browser regression
opens Encoding & Codecs → Codecs at 375 and 1024, requires all three leaves, and
checks every leaf against actual clipping-ancestor bounds. Both scenarios pass
(`sidebar539-nested.log`); the updated eight static guards also pass
(`sidebar539-unit-final.log`). Closed-tree pixel evidence is unaffected.

## Pixel evidence — failed, not waived

Both runs use Editorial × Crimson, threshold 0.1, full union canvas, no cropping
or masking, unchanged checkout during each run, and font-face parity.
Visitor captures are evidence-only, **not an admin pixel gate**, regardless of
the command's zero exit code.

| Width/state | Pass 1 differing pixels | Pass 2 differing pixels |
| --- | ---: | ---: |
| Home / shell alias 375 | 54.8345% | 54.8345% |
| Home / shell alias 768 | 56.9854% | 56.9854% |
| Home / shell alias 1024 | 63.6202% | 63.6300% |
| Home / shell alias 1440 | 59.3919% | 59.3909% |
| Drawer 375 | 54.4862% | 54.4497% |

Run directories (each contains actual/expected/diff, results and hashes):

- `tests/parity/baseline/2026-09-13T00-21-01-043Z-890`
- `tests/parity/baseline/2026-09-13T00-31-12-882Z-5004`

The drawer's full-page canvas is 375×2683 actual versus 375×5453 reference:
the underlying home page contributes unmatched canvas even while the drawer
is open. These are **not sidebar-local percentages**. The second pass rebuilt
the owned desktop ordering and drawer content rather than repeatedly styling
the old shell. The two failed passes are retained for integration to resolve,
not converted into a passing rebuild exception.

## Integration actions

1. Reconcile canonical header height/branding, page bodies and footer before
   full-page remeasurement. The sidebar consumes `--header-height`; phone shell
   currently supplies 56px rather than canonical 60px. No shared-owner edits
   were made here.
2. Decide final placement of app-only Journeys, Advanced and Theme links.
   They remain accessible through **More navigation** after the tree/OPS;
   the canonical reference has no such section. Remove it only once the
   integrated header/palette offers equivalent discoverable navigation.
3. Preserve accessible wrapped labels, 44px targets and semantic label-link /
   sibling-disclosure controls while reconciling canonical ellipsis and row
   behavior. These are intentional functional differences, not pixel passes.
4. Re-run the admin eligible shell rows after integration; if the drawer still
   exceeds 0.5%, continue the canonical rebuild requirement. No gate threshold
   or classification changes are proposed by this leaf task.
5. `browse-categories.spec.ts` still expects the absent “Back to all categories”
   button. Its first failure is retained in `sidebar539-e2e.log`; that broader
   run was stopped rather than waiting through stale page assertions.
   The category-page owner must reconcile it; it is **not green**.
6. `audit:sidebar` reached all 141 target URLs, with 123/141 overall passing.
   The 18 failures are sub-subcategory destination H1 mismatches (`urlOk:true`,
   `click:true`), not failed sidebar navigation. Example: Storage Solutions
   navigates to `/sub-subcategory/storage-solutions`, but `h1Ok:false`.
   Destination rendering belongs to the category-page integration owner.
7. Production comparison is **not unchanged**: 14 tracked deltas include live
   versus dev data (3824 versus 1816 resources), schema/API foundation changes,
   the intentional absent 768 rail, and hidden desktop menu trigger.
   `production-comparison.md` and the three `production-strips/` images retain
   this evidence. Hidden legacy selectors are not counted as visible parity.

## Inventory fragment

- `app.shell.default`: existing alias of `app.home.index`; retain pixel eligibility.
- `app.shell.mobile-drawer`: existing 375 pixel row; retain eligibility and gate.
- Additional functional coverage: 900/1024 simultaneous static sidebar + drawer,
  unique disclosure IDs, active deep-link visibility.
- No aggregate inventory modifications or new follow-up task: integration is
  already planned.