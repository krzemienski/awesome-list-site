# Artifact showcase and anatomy — owned-component delivery

## Scope and status

The parallel contract supersedes whole-page closure for this leaf. Owned components
are implemented and checked; **canonical full-page pixel closure is NOT passing**.
Shared integration work remains assigned to the existing integration task, not a
new follow-up. No app, frozen source, App/router, global stylesheet, generator,
consumer entrypoint, documentation component, DESIGN.md, or aggregate inventory/report
was edited.

The initial description was stale: index.css already imports the app stylesheet,
showcase is already pixel-eligible in the family inventory, both hash routes exist,
and consumer.ts re-exports the app runtime (rather than being empty).

## Implemented

- `useShowcaseTheme.ts`: one validated atomic artifact preference under
  `awesome-video-design-system:theme`, shared by showcase and anatomy. Reads neither
  app theme key, invokes no app persisting applier, rejects corrupt/unknown stored
  values, retains the canonical natural-default-accent switching behavior.
- `ShowcasePrimitives.tsx`: typed Button, Chip, Card, Stat, Eyebrow, Kbd, Dot,
  TableShell and prop types. The showcase actually uses Button/Chip/Card/Eyebrow/Kbd/Dot.
  Stat/TableShell match the canonical shared admin primitives; the frozen showcase
  does not render those two components, so no invented showcase section was added.
- `ShowcaseParity.module.css`: selected system subtitle remains opaque for contrast.
  Brutalist accent-node sublabels inherit the node's dark ink instead of translucent
  ink. These fix the two real serious axe findings without changing geometry.

## Verification

Evidence directory: [artifact-showcase-550](../evidence/artifact-showcase-550/).
All browser captures were made against an unchanged checkout, with no database or
account usage, Chromium 1223, viewport height 900, widths 375/768/1024/1440.
Reference served directly from the unchanged frozen directory on port 5510;
artifact served by its managed workflow on 20928. No production comparison or publish.

| Check | Result / proof |
|---|---|
| All 50 system/accent combinations | PASS; `results.json` contains each observed root, saved theme, app-key sentinels, font and accent |
| App-key isolation | PASS; sentinels `terminal` / `matrix` unchanged through the 50 showcase selections |
| Reload persistence | PASS; Swiss/Rose retained (`results.json.reload`) |
| Keyboard | PASS; Enter on Editorial and Space on Crimson (`results.json.keyboard`) |
| Hash navigation/history | PASS; showcase → anatomy → Docs; Back → anatomy; Forward → Docs (`results.json.history`) |
| Five computed-style spot checks | PASS semantically; `capture-results.json.computed`: nine properties each, Editorial/Crimson, Terminal/Matrix, Geist/Cyan, Brutalist/Lime, Swiss/Violet |
| Axe, both views × 375/1440 | PASS, zero serious/critical, `capture-results.json.accessibility` |
| Browser runtime exceptions | None, `capture-results.json.errors`; Screenshot tool also showed only Vite/React informational logs |
| Pre-change local visual regression | PASS all 8 union-canvas comparisons at threshold 0.1, <=0.5%, `pixels.json` |
| Canonical showcase comparison | FAIL all 4, raw full union canvas, no mask/crop; metrics below |
| Canonical anatomy comparison | BLOCKED: reference has no anatomy-only navigation/state to activate; no fake reference produced |
| Artifact typecheck / build | PASS, final `pnpm --filter @workspace/awesome-video-design-system run typecheck` and `run build` |
| Token projection / standalone palette / app palette / theme registry gates | PASS, final `npm run validate:design-system-artifact`, `node scripts/validation/standalone-palette-drift.mjs`, `node scripts/validation/palette-drift.mjs`, `npm run validate:theme-registry-types` |
| Managed workflow restart | **HISTORICAL / UNVERIFIED:** notes reported PASS and Vite ready on 20928, but the expected artifact path `../evidence/artifact-showcase-550/workflow.log` is unavailable in this checkout; no replacement log is asserted. |

Editorial shadow strings differ only in whitespace after rgba commas; the raw
`equal:false` observation is retained alongside `semanticEqual:true` rather than
silently altering captured values. Other four spot checks are byte-equal too.
`results.json` records the initial axe failures; `capture-results.json` is the final
post-fix evidence. History checks do not assert docs theme isolation, which is a
separate shared integration handoff.

### Pixel results, not a canonical gate pass

| Width | Showcase vs pre-change | Anatomy vs pre-change | Showcase vs raw reference |
|---|---:|---:|---:|
| 375 | 0.001034% | 0.007595% | 25.853500% |
| 768 | 0.001826% | 0.006014% | 6.779964% |
| 1024 | 0.001487% | 0.004499% | 5.897696% |
| 1440 | 0.001117% | 0.003238% | 5.282654% |

These are diagnostic comparisons, not substitutes for the final deterministic
parity harness (font-face/stamp/stability guarantees must still run there).
The small pre-change differences are the contrast corrections. Raw reference
captures intentionally do not apply unreviewed accessibility adapters.

Visual inspection: desktop showcase and anatomy render their expected hierarchy
and controls without runtime errors. Full mobile anatomy image reveals cramped
canonical two-column headings and internally clipped fixed-width flow diagrams.
Showcase's document extends to 720px at a 375px viewport (pre-change also 720;
reference 741). These are **not** claimed responsive or parity passes.

## Integrator handoff — do not weaken final acceptance

1. **Fonts / shared HTML owner:** artifact's index.html font request is still not
   byte-identical to design-system.html (both exact URLs retained in JSON).
   Coordinate with the already-proposed heading-font repair; do not duplicate it.
2. **Prepaint and docs theme owner:** index.html still reads `ds-system`/`ds-accent`
   before mount; CanonicalDocs still uses the app theme applier. Change both to the
   artifact key/validation policy. Until then an app preference can flash before
   showcase mount, and visiting docs may paint/write app keys. The owned showcase
   and anatomy hook is isolated, but whole-artifact isolation is not claimed.
3. **Generator/global CSS owner:** retain the existing direct import of the app token
   stylesheet (there is no longer a separate 149-line token copy). Extend the generator
   to own/check the projection import or generated token section without replacing
   docs chrome. `--check` currently checks tokens.json only; add an intentional
   generated-styles drift probe and preserve product-profile ownership.
4. **Consumer entrypoint owner:** preserve current runtime exports and add:

   ```ts
   export { default as tokens } from "../tokens.json";
   export {
     Button, Chip, Card, Stat, Eyebrow, Kbd, Dot, TableShell,
   } from "./canonical/ShowcasePrimitives";
   export type {
     ButtonProps, ButtonVariant, ChipProps, ChipVariant, CardProps, StatProps,
     EyebrowProps, KbdProps, DotProps, DotStatus, TableShellProps,
   } from "./canonical/ShowcasePrimitives";
   ```

   Do not export the entire showcase renderer: it retains prototype browser globals.
   Import primitives directly without mounting the showcase or writing preferences.
5. **DESIGN.md/docs owner:** document the consumer imports, required styles import,
   semantic variables, native event/ARIA props, and artifact-only preference key.
   The main app is deliberately **not migrated**: its existing components carry
   behavior, selectors, consent, and test IDs. Preserve this as an assumption.
6. **Reference adapter / final gate owner:** the frozen design has FlowDiagramsSection
   embedded in the full showcase, and no Anatomy button/link/route. See reference
   entries in `capture-results.json` and frozen App render. Determine and review the
   intended reference anatomy composition instead of masking away the other sections.
   The previous DESIGN.md describes SystemSwitcher + FlowDiagramsSection + Footer,
   but the task asks for a UI action that does not exist in the frozen page.
7. **Shared visual reconciliation:** review the existing 44px control-target adapter,
   the two contrast corrections above, font parity, token-display/footer counts
   (runtime projection includes extra foundation tokens), and mobile overflow.
   Never fix a pixel report by restoring failing contrast or cropping the union canvas.
8. **Inventory/report owner:** apply the proposed fragment only after wiring the
   reference state action and validating all eight cells. Keep artifact-docs separate.
   Add the artifact section to DS-AUDIT.md from this worklog, with these evidence links
   and the final merged results; do not present this leaf's diagnostics as final parity.

No follow-up tasks proposed: remaining work overlaps the already-queued integration
and existing font repair scopes. No new durable memory entry: observations above are
recoverable from current code/evidence, not cross-session lessons.

## Completion-suite environment / baseline blocker

The configured repository-wide completion suite was attempted. It did **not** pass.
Logs: `.local/state/workflow-logs/NOZ-AF2TIBDUerWMpqB6d/`.

- Main-app browser/API checks cannot reach port 5000 in this artifact-only workspace
  run. Representative `.1`: `FATAL: app not reachable at http://localhost:5000 after
  120s (fetch failed) — start the "Start application" workflow`. Artifact is independently
  healthy on 20928; these failures are not artifact assertions.
- `validation.shell.exec.33` is a substantive pre-existing failure outside this
  worker's ownership: canonical-token-parity's unmodified canary control fails on
  `client/src/styles/pages/resource.css .resource-detail .chip` shadow rules (including
  font-weight 400 vs the canonical per-system values). No artifact source is named.
  Do not report this gate green or modify the other worker's resource stylesheet.
- The suite's typecheck/build, registry, palette/standalone-palette, dead-component/
  export, accent, cache-header and catalog mapping checks pass.

The configured suite therefore cannot certify whole-app closure for this leaf.
Existing integration/final verification owns starting the combined application and
resolving the resource stylesheet baseline. The local artifact evidence above is
the delivered verification, not a waiver of final canonical pixel or app gates.