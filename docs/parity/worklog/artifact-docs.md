# Artifact documentation: component delivery and integration handoff

## Scope and status

Owned docs shell work is delivered; **whole-page pixel closure is not claimed**.
The canonical content was already present in `DocsContent.tsx`; it was reused,
including the existing accessible form labels and icon-button name.
No frozen-source, application, showcase, App router, shared generator, global
stylesheet, aggregate inventory, or aggregate audit-report edits were made.

`CanonicalDocs.tsx` now supports `#docs-<chapter>/<heading-slug>` deep links,
reload and browser history, stable duplicate-heading suffixes, unknown-chapter
fallback, and `aria-current="page"` on the selected chapter. The docs-owned
`ArtifactDocs.css` restores the canonical chapter-navigation sizing and the
missing 900px responsive layout.

## Reference discrepancies (do not silently change the target)

The frozen `awesome-list-site-ds/docs.html` / `docs.jsx` have:

- 21 chapter buttons, **no rendered right-hand TOC**, despite an unused `.docs-toc`
  CSS rule.
- No code-copy button.
- No inline system/accent switcher. Their own prose tells readers to switch in
  the showcase and return. The artifact's existing showcase switcher persists
  `ds-system` and `ds-accent`, and those choices survive a docs reload.
- One responsive breakpoint, **900px**, not 1024px/768px. The chapter list stacks
  above the content rather than becoming a collapsed disclosure.

These observed canonical behaviors take precedence for the pixel comparison.
Adding a TOC or inline switcher would require an explicitly revised reference;
neither was fabricated for this leaf delivery.

## Verification

- Artifact build and typecheck: exit 0.
- `npm run validate:design-system-artifact`: exit 0 (existing token gate).
- Separate generated-docs check and isolated body-mutation rejection: pass.
  The shared command does **not yet enforce docs drift**; see generator handoff.
- Artifact workflow restarted and served on port 20928 without startup errors.
- All 21 buttons were actually clicked and produced the matching route and active
  chapter: [functional.json](../evidence/artifact-docs/functional.json).
- `#docs-tokens/border` positioned the heading at 27.953125px, both immediately
  and after reload (28px scroll margin, subpixel layout). Back returned to that
  anchor; forward returned to overview. Unknown chapter normalized to overview.
- Showcase → Terminal → Cyan → Docs → reload retained both selections:
  [persistence.json](../evidence/artifact-docs/persistence.json).
- Eight axe scans (overview/forms/flows/checklist at 375 and 1440): **zero
  serious/critical findings**, no rule exclusions:
  [axe.json](../evidence/artifact-docs/axe.json).
- No browser `pageerror` events during the 84-cell and navigation run. Browser
  screenshot-tool logs also showed no console errors.
- Existing aggregate inventory still loads with 74 rows; the proposed fragment
  independently passes its schema with exactly 21 pixel rows.

## Pixel evidence and proposed DS-AUDIT docs section

Local artifact against the unedited local reference, Editorial × Crimson.
Widths/heights: 375×812, 768×1024, 1024×768, 1440×900. Chromium 1223 cache
executable; device scale 1. Both sides disable animation, transition, caret and
backdrop blur; wait for document fonts. Full screenshots are compared on the
union canvas, padded black, **without masking or cropping**, using pixelmatch
threshold **0.1** and maximum differing pixels **0.5%**.

These are component diagnostic captures, not final harness certification:
the run did not perform the harness's double-frame byte-stability and complete
font-face parity checks. **57/84 cells (67.9%) measure within threshold; 27 fail.**
No failing cell was reclassified as a pass. Integrator must run the canonical
harness once the proposed rows and shared surfaces are integrated.

Numbers below are differing-pixel percentages, not similarity scores.
The last column is the percentage of this chapter's four cells within 0.5%.
Every chapter/width has `-actual.png`, `-reference.png`, and `-diff.png` in the
[evidence directory](../evidence/artifact-docs/); the chapter link opens its
1440px diff. Machine-readable results: [pixels.json](../evidence/artifact-docs/pixels.json).

| Chapter | 375 | 768 | 1024 | 1440 | Within limit |
|---|---:|---:|---:|---:|---:|
| [overview](../evidence/artifact-docs/overview-1440-diff.png) | 0.464 | 0.295 | 0.729 | 0.662 | 50% |
| [principles](../evidence/artifact-docs/principles-1440-diff.png) | 2.858 | 0.469 | 0.721 | 0.575 | 25% |
| [getting-started](../evidence/artifact-docs/getting-started-1440-diff.png) | 0.766 | 0.459 | 0.732 | 0.591 | 25% |
| [tokens](../evidence/artifact-docs/tokens-1440-diff.png) | 0.217 | 0.155 | 0.187 | 0.176 | 100% |
| [theming](../evidence/artifact-docs/theming-1440-diff.png) | 0.581 | 0.454 | 0.800 | 0.662 | 25% |
| [typography](../evidence/artifact-docs/typography-1440-diff.png) | 0.671 | 0.442 | 0.599 | 0.463 | 50% |
| [color](../evidence/artifact-docs/color-1440-diff.png) | 0.475 | 0.311 | 0.409 | 0.382 | 100% |
| [spacing](../evidence/artifact-docs/spacing-1440-diff.png) | 0.381 | 0.229 | 0.442 | 0.432 | 100% |
| [motion](../evidence/artifact-docs/motion-1440-diff.png) | 0.321 | 0.202 | 0.259 | 0.241 | 100% |
| [buttons](../evidence/artifact-docs/buttons-1440-diff.png) | 2.523 | 1.647 | 1.893 | 1.380 | 0% |
| [cards](../evidence/artifact-docs/cards-1440-diff.png) | 0.183 | 0.118 | 0.186 | 0.181 | 100% |
| [forms](../evidence/artifact-docs/forms-1440-diff.png) | 1.703 | 1.030 | 1.269 | 0.946 | 0% |
| [navigation](../evidence/artifact-docs/navigation-1440-diff.png) | 0.341 | 0.218 | 0.374 | 0.306 | 100% |
| [lists](../evidence/artifact-docs/lists-1440-diff.png) | 0.314 | 0.245 | 0.449 | 0.368 | 100% |
| [flows](../evidence/artifact-docs/flows-1440-diff.png) | 0.357 | 0.248 | 0.421 | 0.387 | 100% |
| [pages](../evidence/artifact-docs/pages-1440-diff.png) | 0.735 | 0.418 | 0.716 | 0.561 | 50% |
| [data-density](../evidence/artifact-docs/data-density-1440-diff.png) | 0.266 | 0.155 | 0.387 | 0.307 | 100% |
| [integration](../evidence/artifact-docs/integration-1440-diff.png) | 0.201 | 0.201 | 0.438 | 0.415 | 100% |
| [theming-app](../evidence/artifact-docs/theming-app-1440-diff.png) | 0.571 | 0.301 | 0.607 | 0.536 | 50% |
| [a11y](../evidence/artifact-docs/a11y-1440-diff.png) | 0.250 | 0.151 | 0.287 | 0.225 | 100% |
| [checklist](../evidence/artifact-docs/checklist-1440-diff.png) | 0.215 | 0.117 | 0.244 | 0.255 | 100% |

Visual inspection of desktop overview and its diff confirms heading-outline
differences while the content cards, callout and footer align. Mobile overview
shows all chapter navigation above the content, matching the frozen layout.
Some reference pages overflow horizontally (e.g. integration's long code).
That overflow was captured, not cropped away or mislabeled an infrastructure
failure. Pre-edit local screenshot:
[before-overview.jpg](../evidence/artifact-docs/before-overview.jpg).

## Integrator actions

1. Apply [generator handoff](artifact-docs-generation.md). Wire the docs helper
   into `generate-design-system-artifact.mjs --docs` and the ordinary `--check`
   path **before** its token-current early exit. No generator edit was authorized
   in this leaf task.
2. Move `tests/parity/inventory/proposed/artifact-docs.json` to
   `tests/parity/inventory/artifact-docs.json`, remove the 21 duplicate diagnostic
   entries from `artifact.json`, then regenerate the aggregate. It is deliberately
   staged in `proposed/` because the loader automatically reads every root JSON;
   placing duplicate IDs there now would break all existing parity runs.
3. Incorporate the table above into aggregate `docs/parity/DS-AUDIT.md`. No leaf
   edits were made to aggregate reports.
4. Resolve the shared artifact font request through the already-planned font
   preview work. `index.html` requests different Fraunces axes/weights than frozen
   `docs.html`; the 1440 overview diff visibly concentrates on display glyphs.
   The docs worker did not change shared font files or duplicate that task.
5. Reconcile global artifact minimum control sizes with reference component
   sizes: `index.css` imposes a 44px minimum and 44px icon width, while the frozen
   button is 36px. Button and form screenshots show the resulting layout offsets.
   Keep the desired accessibility contract explicit rather than silently
   weakening the shared control floor.
6. Decide destination wiring for canonical nav chips (`showcase`, `app`, `.md`).
   Existing artifact navigation intentionally links `showcase`, `anatomy`,
   `integration`; those working destinations were preserved, not renamed to
   misleading labels. Generator output is portable source documentation, not yet
   published static Markdown; integrate a real `.md` download before exposing it.
7. Run final full-page pixel gates at the original limits. The 27 failures above
   remain open integration work, not waived acceptance criteria.

No production changes or database operations were performed. No follow-up tasks
were proposed: the queued parallel-parity integration task already owns these
handoffs.

## Project-wide completion validation

The completion service launched the configured project-wide checks after the
targeted docs verification. That run is **not green**:

- Node startup aborted with `uv_thread_create` / `pthread_create: Resource
  temporarily unavailable`; esbuild spawning also failed with `EAGAIN`.
  These occurred in the app build, preferences races, response contracts,
  search-typo and theme-registry checks, not in docs component execution.
- The app showcase check timed out on `[data-testid="text-ds-title"]`.
- The product-profile check reported stale artifact tokens, although the targeted
  generator check above passed before the completion fan-out.
- Canonical-token-parity reported 63 shadow-rule failures in the untouched
  `client/src/styles/pages/resource.css` (also present in the earlier workflow
  logs before docs verification).

No check was disabled or loosened, and no unrelated worker-owned file was edited
to make this run appear green. The successful docs-specific checks do not imply
that the project-wide completion gate passed.