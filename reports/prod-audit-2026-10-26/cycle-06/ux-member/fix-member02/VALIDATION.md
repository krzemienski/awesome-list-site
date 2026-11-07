# C6-MEMBER-02: shared resource-card target sizing

## Scope and result

The shared `ResourceCard` sizing defect is fixed locally. Every measured shared-card action is at least **44×44 CSS pixels** on Tag, Search and Taxonomy at 1440px desktop, 820px touch and 390px touch. No pair of sibling action rectangles overlaps, and document scroll width never exceeds client width in those nine populated captures.

This is **local, signed-out browser evidence**, not deployed-production or authenticated-member acceptance. No merge or deployment was performed. The separate Home card has independently confirmed small targets and is explicitly not fixed by this shared-card PR.

- Source base: current `origin/main` at clone time, `2c4a00eed2085561e9170b2575b92837e48ac5da`.
- Isolated clone: `/tmp/c6-member02-sol.2ofXGB`; branch `fix/c6-member02-card-targets`.
- Runtime: real Express/Vite app at `http://127.0.0.1:5122`, `NODE_ENV=development`, `DISABLE_BACKGROUND_JOBS=1`; development startup skips migrations.
- Database: isolated local `c6_member02_sol`, cloned from the existing production-like `awesome_fix_mb04` database, with 1,949 real catalog resources. No production database connection, migration, scheduler or paid AI action was used.
- Tools: Chrome DevTools MCP initially, then a dedicated named agent-browser Chromium session with the browser tool attached through its own CDP endpoint after the shared MCP connection repeatedly stalled. No test files, mocks, standalone browser scripts, validation harnesses, suites or gates were created or run.
- Read-only scout runtime metadata was verified as `omniroute/cx/gpt-6.1-sol`.

## Production changes

`client/src/styles/components/resource-card.css` promotes the existing mobile 44px floor to every width for title, details, tags and tag-expansion actions, and gives outbound links the same minimum width. Pill paint and existing focus rings stay on their original visual children.

`client/src/styles/pages/taxonomy.css` removes the desktop shrink-back overrides, keeps title hit boxes at 44px and uses the already-established 44px tray geometry at all widths. The reserved tray band, hover/focus reveal, ordering, labels and behavior are unchanged. No JSX or accessible-name changes were made.

`CHANGELOG.md` records this fix and the separate Home finding.

## Measured all-width results

Counts are derived from the committed geometry artifacts, summarized in [geometry-summary.json](geometry-summary.json). Each row measures **all rendered action rectangles in the first 24 real resource cards**, including below-fold actions; the expanded representative card adds its revealed tags. Below-fold geometry is not claimed as a pointer hit-test. On-screen hit-test records are included in the raw geometry, and actual pointer/touch/keyboard activation was driven separately.

| Surface | Width / input | Cards / action boxes | Minimum W×H | Below 44 | Overlap pairs | Scroll / client width | Geometry and reviewed screenshot |
|---|---|---:|---:|---:|---:|---:|---|
| `/tag/hls` | 1440 desktop | 24 / 245 | 44×44 | 0 | 0 | 1434 / 1434 | [geometry](39-tag-1440-final-expanded-geometry.json), [image](39-tag-1440-final-expanded.png) |
| `/tag/hls` | 820 touch | 24 / 245 | 44×44 | 0 | 0 | 814 / 814 | [geometry](40-tag-820-final-geometry.json), [image](40-tag-820-final.png) |
| `/tag/hls` | 390 touch | 24 / 245 | 44×44 | 0 | 0 | 390 / 390 | [geometry](41-tag-390-final-geometry.json), [image](41-tag-390-final.png) |
| `/search?q=hls` | 1440 desktop | 24 / 144 | 44×44 | 0 | 0 | 1434 / 1434 | [geometry](24-search-1440-direct-geometry.json), [image](24-search-1440-direct.png) |
| `/search?q=hls` | 820 touch | 24 / 144 | 44×44 | 0 | 0 | 814 / 814 | [geometry](35-search-820-final-geometry.json), [image](35-search-820-final.png) |
| `/search?q=hls` | 390 touch | 24 / 144 | 44×44 | 0 | 0 | 390 / 390 | [geometry](43-search-390-final-geometry.json), [image](43-search-390-final.png) |
| `/category/protocols-transport` | 1440 desktop | 24 / 241 | 44×44 | 0 | 0 | 1434 / 1434 | [geometry](27-taxonomy-1440-expanded-geometry.json), [image](27-taxonomy-1440-expanded.png) |
| `/category/protocols-transport` | 820 touch | 24 / 241 | 44×44 | 0 | 0 | 814 / 814 | [geometry](33-taxonomy-820-final-expanded-geometry.json), [image](33-taxonomy-820-final.png) |
| `/category/protocols-transport` | 390 touch | 24 / 241 | 44×44 | 0 | 0 | 390 / 390 | [geometry](34-taxonomy-390-expanded-geometry.json), [image](34-taxonomy-390-expanded.png) |

Touch captures explicitly record `navigator.maxTouchPoints: 1`, coarse pointer true and hover false, with device pixel ratio 1. These are genuine Chromium touch-emulation interactions, not a physical-device claim. Desktop is 1440×900; tablet is 820×1180; phone is 390×844. The six-pixel desktop/tablet difference between viewport and client width is the scrollbar, not overflow.

## Driven interactions and reviewed evidence

- **Keyboard ordering/focus:** [39-tag-1440-full-tab-order.json](39-tag-1440-full-tab-order.json) records details → Show more → Open Link → Suggest edit → Favorite → Bookmark → title → tag links. Keyboard-reached actions retain `:focus-visible`; the first explicitly focused seed is not itself presented as a Tab-reached focus claim. Details-chip focus is painted on its inner badge as before. [25-search-1440-keyboard-focus.json](25-search-1440-keyboard-focus.json), [33-taxonomy-820-final-keyboard-focus.json](33-taxonomy-820-final-keyboard-focus.json), [34-taxonomy-390-keyboard-focus.json](34-taxonomy-390-keyboard-focus.json), and the final geometry identify tablet/phone focus states.
- **Expansion/collapse:** real pointer, touchscreen tap and Space changed Show more ↔ Show fewer and revealed/collapsed actual tags. Expanded Tag and Taxonomy geometry/screenshots above remain ≥44px with no sibling overlap or horizontal overflow. At rest the desktop tray is intentionally transparent; keyboard focus or hover reveals it. Touch trays remain visible.
- **Link activation through the UI:** [46-desktop-loaded-link-destinations.json](46-desktop-loaded-link-destinations.json), [47-tablet-loaded-link-destinations.json](47-tablet-loaded-link-destinations.json), and [48-phone-loaded-link-destinations.json](48-phone-loaded-link-destinations.json) wait for both the real route and matching loaded H1 after title/details activation. They prove Tag → `/resource/1923` (Nimble Streamer), Search → `/resource/777` (hlsjs-p2p-engine), and Taxonomy → `/resource/812` (Ad Creative Signaling in DASH and HLS) at all three widths. Earlier `activation.json` files captured the immediate URL before the asynchronous H1 update; they do not supersede these loaded destination captures.
- **External link:** phone keyboard Enter on Open Link opened the genuine external destination, which redirected to `https://softvelum.com/nimble/`; [15-tag-390-outbound-destination.txt](15-tag-390-outbound-destination.txt) records its URL, title and H1. The unrelated shared-browser page inventory was excluded from publishable evidence.
- Desktop pointer and tablet touchscreen activation of the same Open Link also reached the loaded Softvelum page: [49-desktop-open-link-destination.json](49-desktop-open-link-destination.json) and [50-tablet-open-link-destination.json](50-tablet-open-link-destination.json).
- **Tag navigation:** [39-tag-1440-tag-activation.json](39-tag-1440-tag-activation.json) records real tag-pill activation reaching `/tag/server`.
- [51-desktop-tag-loaded-destination.json](51-desktop-tag-loaded-destination.json) confirms the loaded H1 is `Server`.
- **Guest Bookmark:** real keyboard add/remove persisted resource 1923 to device storage and restored it to empty: [42-tag-390-bookmark-toast-geometry.json](42-tag-390-bookmark-toast-geometry.json), [42-tag-390-bookmark-restored.json](42-tag-390-bookmark-restored.json), [toast image](42-tag-390-bookmark-toast.png). No member database mutation was substituted.
- **Floating controls:** the simultaneous deep-scroll phone capture shows the toast ends at y=784 and Back to top begins at y=788: a four-pixel gap, not a collision. See [45-tag-390-simultaneous-toast-backtop.json](45-tag-390-simultaneous-toast-backtop.json) and [reviewed image](45-tag-390-simultaneous-toast-backtop.png). The temporary second guest bookmark was removed; [45-tag-390-clean-local-bookmarks.json](45-tag-390-clean-local-bookmarks.json) is empty.
- **Visual inspection:** every retained PNG was opened and reviewed. Final shared-card captures show readable titles/copy, separate tag pills, visible tray/focus controls and no in-scope clipping or overlap. This is a target-sizing/layout verdict, not an all-app contrast or theme audit.

Final captures include matching `*-snapshot.json` (full AX tree) or `*-snapshot.txt`, `*-console.json` and `*-network.json` files. For example, [40-tag-820-final-snapshot.json](40-tag-820-final-snapshot.json), [40-tag-820-final-console.json](40-tag-820-final-console.json), and [40-tag-820-final-network.json](40-tag-820-final-network.json). Source/fetch/document requests succeeded or returned 304. The signed-out guest-bookmark path additionally made a real **GET `/api/bookmarks` → 401**, preserved in [41-tag-390-final-network.json](41-tag-390-final-network.json) and its console companion; this is explicitly not reported as a console-clean run. All captured browser network methods are GET; no authenticated/production write was performed.

## Separate Home finding: not fixed here

Home does not consume the shared `components/resource/ResourceCard.tsx`. Its private card is in `client/src/components/home/HomePresentation.tsx` with `home-resource-*` classes. It was inspected separately, and the owner/orchestrator explicitly instructed that this PR remain scoped to shared-card sizing.

The local snapshot initially had no featured resources, so no Home resource cards could render. Existing real resources 1923, 812 and 777 were temporarily marked featured **only in the isolated local database**. They were not fabricated, and no production data was touched. Those three flags were subsequently removed and the local featured count returned to zero.

| Home width | Actions measured | Below 44 | Finding | Evidence |
|---|---:|---:|---|---|
| 1440 | 12 | 12 | Titles 20px high; tag pills 26.796875px high | [geometry](36-home-1440-geometry.json), [reviewed image](36-home-1440.png) |
| 820 touch | 12 | 3 | Title links 20px high; tag links reach 44px | [geometry](37-home-820-geometry.json), [reviewed image](37-home-820.png) |
| 390 touch | 12 | 3 | Title links 20px or 40.796875px high; tag links reach 44px | [geometry](38-home-390-geometry.json), [reviewed image](38-home-390.png) |

Home has no measured sibling overlaps or horizontal overflow at these widths. Title activation, tag touch activation and keyboard focus were driven; `36/37/38-home-*-activation.json` and `*-focus.json` record their outcomes. **The all-actions-44px criterion is FAIL for this distinct Home implementation**, not an implicit PASS or a reason to broaden this shared-card change.

## Compiler/build and runtime safety

- **PASS:** `npx tsc --noEmit`, unpiped, exit 0, no output: [checks-typecheck.txt](checks-typecheck.txt).
- **PASS:** `npm run build`, unpiped, exit 0: [checks-build.txt](checks-build.txt). Client, SSR and server bundles completed. The capture retains Rollup dependency annotation/chunk-size warnings and the existing Home mixed static/dynamic import warning; no warning was suppressed or claimed absent.
- [runtime-server-log.txt](runtime-server-log.txt) records actual development startup, background jobs disabled, and real catalog/detail requests. Its 401 bookmark reads are also retained.
- No test suite, formatter, lint command, reviewer panel or CI gate was run.
- Only the local app configuration's required Clerk keys were allowlisted into an ignored local `.env`; no owner password, audit bypass or AI credential was forwarded from the project file. Browser auth state and secrets are excluded from Git and evidence.

## Remaining UNVERIFIED items

- Deployed/production behavior: this branch is not deployed, and no production PASS is claimed.
- Signed-in member/owner-specific actions, Favorite mutation, authenticated Suggest Edit submission and bookmarked-note extra controls: no approved local member identity was used; no auth bypass was introduced. Shared controls' signed-out geometry and keyboard reachability are measured, not authenticated behavior.
- Physical touch hardware, alternate design-system/font/theme matrices, other taxonomy routes, other search queries, pagination beyond the first 24 resources and all-app accessibility/performance are outside the exercised local matrix.
- The separate Home target defect remains **confirmed and open**, not UNVERIFIED.
- Earlier diagnostic captures with no mounted cards, incorrect helper touch settings, stale route H1 or stalled shared MCP calls are not used for PASS. They were retained outside the repository at `/tmp/c6-member02-sol-diagnostics-20261027`; final committed captures above supersede them.

## Acceptance disposition

The requested scoped production fix, compiler/build checks and local shared-card all-width geometry/interaction proof are complete. Home coverage is complete as a separate finding, not as a fixed surface. The branch must remain unmerged and undeployed for owner review.
