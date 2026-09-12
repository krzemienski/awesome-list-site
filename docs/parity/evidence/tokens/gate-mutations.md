# canonical-token-parity — mutation probes (review rounds 2–5 + self-review)

The probes now live INSIDE the gate (`CANARIES` in
`scripts/validation/canonical-token-parity.mjs`) and run on every invocation:
each case mutates an in-memory copy of the LIVE inputs (runtime CSS + registry
+ sibling stylesheets, canonical styles.css + design-systems.jsx + app.jsx +
layout.jsx), re-runs the comparison and asserts that the gate fails on the
expected rule (regex on the failure text). The control case must pass. Any
canary that escapes fails the whole gate with `FAIL canaries`, so a parser
regression can never pass silently again. The working tree is never touched;
`node scripts/validation/canonical-token-parity.mjs --canaries-only` runs
just this table.

Result: **92/92 cases behaved as expected** (the control and the PASS controls pass, every other mutation fails on the expected rule; a `reject` pattern additionally asserts that a rule which must NOT fire stays silent).

| case | mutation | expected | got | matching failure line |
|---|---|---|---|---|
| `control` | unmodified inputs | PASS | PASS | `` |
| `later-root-override` | a second :root at the end of the file re-declares --bg | FAIL | FAIL | `editorial: --bg differs — design #000000 vs runtime #123456` |
| `later-root-important` | a later :root sets --radius !important | FAIL | FAIL | `editorial: --radius differs — design 12px vs runtime 10px !important` |
| `earlier-important-wins` | an earlier !important --radius survives a later plain override (browser semantics) | FAIL | FAIL | `editorial: --radius differs — design 12px vs runtime 9px !important` |
| `later-system-block` | a second :root[data-system="geist"] block overrides --surface | FAIL | FAIL | `geist: --surface differs — design rgba(255,255,255,0.04) vs runtime rgba(255,255,255,0.05)` |
| `important-root-vs-system` | a :root !important --surface outranks a later, canonical-valued editorial system block (importance beats specificity) | FAIL | FAIL | `editorial: --surface differs — design rgba(244,243,238,0.025) vs runtime #010203 !important` |
| `important-accent-combo` | a system block sets --accent !important, outranking every accent block | FAIL | FAIL | `accent combo geist/cyan: --accent resolves to #ff0000 !important in the runtime but the design paints #5eddf2` |
| `late-system-accent` | a system block after the accent blocks sets --accent (same specificity, later wins) | FAIL | FAIL | `accent combo geist/cyan: --accent resolves to #ff0000 in the runtime but the design paints #5eddf2` |
| `system-geometry-drift` | a system block re-declares --content-max (geometry is system-independent in the design) | FAIL | FAIL | `geometry: --content-max differs in geist — design 1240px vs runtime 1000px` |
| `later-utility-override` | a repeated .chip rule changes font-size | FAIL | FAIL | `utility .chip: font-size differs — design 10.5px vs runtime 12px` |
| `later-utility-under-media` | .chip re-declared under a media query | FAIL | FAIL | `shadow rule: @media (max-width: 600px)\|\|.chip re-declares font-size for .chip under @media (max-width:600px) — runtime resolves 12px, design resolves 10.5px` |
| `descendant-override` | .page .chip re-declares font-size | FAIL | FAIL | `shadow rule: .page .chip re-declares font-size for .chip — runtime resolves 12px, design resolves 10.5px` |
| `state-override` | .chip:hover re-declares background | FAIL | FAIL | `shadow rule: .chip:hover re-declares background for .chip when :hover — runtime resolves red, design resolves var(--surface)` |
| `escaped-class-shadow` | .\63 hip is .chip spelled with a hex escape — the engine must decode it, not split on the terminator space | FAIL | FAIL | `shadow rule: .\63 hip re-declares font-size for .chip — runtime resolves 99px, design resolves 10.5px` |
| `attribute-class-shadow` | [class~="chip"] re-declares font-size (same element, same specificity, later wins) | FAIL | FAIL | `shadow rule: [class~="chip"] re-declares font-size for .chip — runtime resolves 99px, design resolves 10.5px` |
| `is-shadow` | :is(.chip) re-declares font-size | FAIL | FAIL | `shadow rule: :is(.chip) re-declares font-size for .chip — runtime resolves 99px, design resolves 10.5px` |
| `not-shadow` | .chip:not(.accent) re-declares font-size (higher specificity) | FAIL | FAIL | `shadow rule: .chip:not(.accent) re-declares font-size for .chip — runtime resolves 99px, design resolves 10.5px` |
| `tag-qualified-shadow` | span.chip re-declares font-size (type selector adds specificity) | FAIL | FAIL | `shadow rule: span.chip re-declares font-size for .chip — runtime resolves 99px, design resolves 10.5px` |
| `where-no-op` | :where(.chip) re-declares font-size at zero specificity — the canonical rule still wins | PASS | PASS | `` |
| `where-important-shadow` | :where(.chip) !important outranks the canonical rule despite zero specificity | FAIL | FAIL | `shadow rule: :where(.chip) re-declares font-size for .chip — runtime resolves 99px !important, design resolves 10.5px` |
| `system-scoped-shadow` | :root[data-system="geist"] .chip re-declares font-size for one system only | FAIL | FAIL | `shadow rule: :root[data-system="geist"] .chip re-declares font-size for .chip — runtime resolves 99px, design resolves 10.5px [geist]` |
| `sibling-shadow` | another client stylesheet (position unknown → ranked last) re-declares .chip font-size | FAIL | FAIL | `shadow rule: client/src/styles/canary.css .chip re-declares font-size for .chip — runtime resolves 99px, design resolves 10.5px` |
| `admin-descendant-shadow` | the admin sheet scopes a .chip override under .admin-dashboard | FAIL | FAIL | `shadow rule: client/src/components/admin/admin-canonical.css .admin-dashboard .chip re-declares font-size for .chip — runtime resolves 99px, design resolves 10.5px` |
| `layered-shadow-no-op` | a sibling re-declares .chip inside @layer — unlayered canonical rules outrank it | PASS | PASS | `` |
| `two-layer-important-earlier-wins` | reviewer bypass: earlier layer :where() !important beats a later layer's higher-specificity !important restore and the unlayered canonical rule | FAIL | FAIL | `shadow rule: client/src/styles/canary.css @media (max-width: 1024px) @layer early\|\|:where(.hide-tablet) re-declares display for .hide-tablet under @media (max-width:102` |
| `two-layer-important-canonical-earlier` | two layers, canonical restore in the earlier layer — the browser paints the design value | PASS | PASS | `` |
| `layer-statement-sets-order-pass` | '@layer late, early;' declares late first, so its restore outranks the early-block bypass | PASS | PASS | `` |
| `layer-statement-sets-order-fail` | '@layer early, late;' makes the later-written early block the winner | FAIL | FAIL | `shadow rule: client/src/styles/canary.css @media (max-width: 1024px) @layer early\|\|:where(.hide-tablet) re-declares display for .hide-tablet under @media (max-width:102` |
| `anonymous-layers-first-wins` | two anonymous @layer {} blocks are two layers; the first wins under !important | FAIL | FAIL | `shadow rule: client/src/styles/canary.css @media (max-width: 1024px) @layer\|\|:where(.hide-tablet) re-declares display for .hide-tablet under @media (max-width:1024px) —` |
| `nested-sublayer-precedes-parent` | a sublayer precedes its parent's direct styles even when written after them | FAIL | FAIL | `shadow rule: client/src/styles/canary.css @media (max-width: 1024px) @layer outer @layer inner\|\|:where(.hide-tablet) re-declares display for .hide-tablet under @media (` |
| `nested-sublayer-canonical` | dotted '@layer outer.inner' holds the canonical restore and outranks outer's bypass | PASS | PASS | `` |
| `layered-important-beats-unlayered-important` | an !important inside any layer beats the unlayered canonical !important | FAIL | FAIL | `shadow rule: client/src/styles/canary.css @media (max-width: 1024px) @layer x\|\|:where(.hide-tablet) re-declares display for .hide-tablet under @media (max-width:1024px)` |
| `two-layer-normal-later-wins` | normal declarations: the later layer wins over an earlier layer's higher specificity | FAIL | FAIL | `shadow rule: client/src/styles/canary.css @layer b\|\|:where(.chip) re-declares outline-offset for .chip — runtime resolves 2px, design resolves nothing` |
| `vendor-statement-orders-named-layers` | Tailwind's '@layer theme, base, components, utilities;' statement orders layers this sheet only uses — components (restore) beats utilities (bypass) | PASS | PASS | `` |
| `import-layer-statement-above-imports` | reviewer bypass: '@layer early;' above index.css's imports registers before the layer(late) import — early < late, the early bypass wins | FAIL | FAIL | `shadow rule: client/canary/bypass.css @media (max-width: 1024px) @layer early\|\|:where(.hide-tablet) re-declares display for .hide-tablet under @media (max-width:1024px)` |
| `import-layer-statement-control` | '@layer late, early;' above the same imports puts late first — the restore wins | PASS | PASS | `` |
| `import-layers-without-statement` | no statement: the layer(late) import declares late ahead of the bypass sheet's early | PASS | PASS | `` |
| `misplaced-import-after-rule` | an @import after index.css's rules is inlined there by the Tailwind compiler (the shadow is modelled) and reported as misplaced | FAIL | FAIL | `misplaced @import: "../canary/bypass.css" in client/src/index.css it follows another rule — the Tailwind compiler inlines it where it sits (so it IS modelled there), but ` |
| `misplaced-import-nested-in-media` | an @import nested in @media is inlined inside it — modelled under the enclosing condition and reported as misplaced | FAIL | FAIL | `misplaced @import: "../canary/bypass.css" in client/src/index.css it is nested inside @media (max-width: 1024px) — the Tailwind compiler inlines it where it sits (so it I` |
| `duplicate-import` | a sheet imported twice is inlined twice — reported, first copy modelled | FAIL | FAIL | `duplicate @import: client/canary/bypass.css is imported again by client/src/index.css ("../canary/bypass.css") after client/src/index.css already loaded it — the Tailwind` |
| `conditional-import-media-matches` | an @import with a media list is a media-scoped sheet — modelled under that condition | FAIL | FAIL | `shadow rule: client/canary/bypass.css @media (min-width: 800px) @media (max-width: 1024px) @layer early\|\|:where(.hide-tablet) re-declares display for .hide-tablet under` |
| `conditional-import-print-only` | an @import … print is print-only and not a screen parity surface | PASS | PASS | `` |
| `main-sheet-import-after-rule` | the main sheet's import moved below index.css's first rule still loads (inlined) but is misplaced — rule 13 | FAIL | FAIL | `misplaced @import: "./styles/design-system.css" in client/src/index.css it follows another rule — the Tailwind compiler inlines it where it sits (so it IS modelled there)` |
| `main-sheet-import-removed` | without its import the main sheet never loads — rule 12 | FAIL | FAIL | `document: client/src/styles/design-system.css is never loaded — no @import chain from client/src/index.css (or client/index.html) reaches it — the runtime paints no desig` |
| `main-sheet-import-conditional` | the main sheet imported under a media list applies only while it matches | FAIL | FAIL | `document: client/src/styles/design-system.css is imported under "@media (min-width: 1200px)" (client/src/index.css) — its tokens apply only while that condition holds; im` |
| `layer-order-conditional-first-declaration` | late is first declared only at ≥1200px, so at 900px early registers first and its bypass wins — the shadow computation (all conditions true) sees the restore win, only ru | FAIL | FAIL | `layer order: cascade layers "late" and "early" are ordered by a condition — ahead of "early" (client/canary/bypass-late.css inside @media (max-width:1024px)) "late" is de` |
| `import-layer-main-sheet` | index.css imports design-system.css with layer(theme): an EARLIER unlayered index.html :root now beats it (unlayered outranks any layer) — rule 3 must see the browser val | FAIL | FAIL | `editorial: --bg differs — design #000000 vs runtime #000001` |
| `import-layer-sibling-loses` | a LATER sibling imported with layer(x) re-declares .chip — the unlayered canonical rule still wins | PASS | PASS | `` |
| `print-shadow-ignored` | a print-only .chip override is not a screen parity surface | PASS | PASS | `` |
| `not-print-shadow-resolves` | @media not print DOES apply on screen — only a print-only query list is excluded | FAIL | FAIL | `shadow rule: @media not print\|\|.chip re-declares font-size for .chip under @media not print — runtime resolves 99px, design resolves 10.5px` |
| `screen-print-list-shadow-resolves` | @media screen, print matches screens too | FAIL | FAIL | `shadow rule: @media screen, print\|\|.chip re-declares font-size for .chip under @media screen, print — runtime resolves 99px, design resolves 10.5px` |
| `nested-descendant-shadow` | CSS Nesting: .page { .chip {} } is .page .chip and outranks the utility | FAIL | FAIL | `shadow rule: .page .chip re-declares font-size for .chip — runtime resolves 99px, design resolves 10.5px` |
| `nested-ampersand-media-shadow` | CSS Nesting: .chip { @media (…) { … } } is a media-scoped .chip rule | FAIL | FAIL | `shadow rule: @media (min-width: 0px)\|\|.chip re-declares font-size for .chip under @media (min-width:0px) — runtime resolves 99px, design resolves 10.5px` |
| `nested-root-media-geometry` | CSS Nesting: :root { @media (tablet) { --shell-sidebar-w } } is the responsive geometry contract | FAIL | FAIL | `responsive geometry: --shell-sidebar-w inside @media (min-width: 768px) and (max-width: 1023px) resolves to 200px but the design uses 240px (tablet 768–1023: the sidebar ` |
| `nested-ampersand-root-token` | CSS Nesting: :root { & { --bg } } is a later :root declaration | FAIL | FAIL | `editorial: --bg differs — design #000000 vs runtime #010204` |
| `universal-important-shadow` | * { font-size !important } outranks every utility rule | FAIL | FAIL | `shadow rule: * re-declares font-size for .chip — runtime resolves 99px !important, design resolves 10.5px` |
| `no-anim-deviation-stale` | the runtime narrows .no-anim * to the design's scope (entry becomes stale) | FAIL | FAIL | `deviation shadow:.no-anim *:transition is stale — no non-canonical rule by that key wins the property any more; drop the entry` |
| `no-anim-deviation-no-longer-holds` | .no-anim * still wins but no longer freezes (the reason cites a blanket freeze) | FAIL | FAIL | `deviation shadow:.no-anim *:transition no longer holds (design transform 220ms cubic-bezier(0.2,0.65,0.3,1),background 220ms ease,border-color 220ms ease,box-shadow 220ms` |
| `extra-tablet-override` | a later tablet media block sets --shell-sidebar-w to 200px | FAIL | FAIL | `responsive geometry: --shell-sidebar-w inside @media (min-width: 768px) and (max-width: 1023px) resolves to 200px but the design uses 240px (tablet 768–1023: the sidebar ` |
| `removed-tablet-override` | the tablet --shell-sidebar-w re-assignment is deleted | FAIL | FAIL | `responsive geometry: --shell-sidebar-w is not re-assigned inside @media (min-width: 768px) and (max-width: 1023px) (tablet 768–1023: the sidebar narrows to the design's t` |
| `changed-media-query` | the tablet query upper bound moves to 1100px | FAIL | FAIL | `responsive geometry: --shell-sidebar-w is not re-assigned inside @media (min-width: 768px) and (max-width: 1023px) (tablet 768–1023: the sidebar narrows to the design's t` |
| `changed-media-value` | the mobile --shell-header-h drops to 60px | FAIL | FAIL | `responsive geometry: --shell-header-h inside @media (max-width: 767px) resolves to 60px but the design uses 56px (mobile <768: the header drops to the design's mobile .he` |
| `tablet-alias-drift` | --shell-sidebar-w-tablet (the var the tablet override resolves through) changes | FAIL | FAIL | `geometry: --shell-sidebar-w-tablet differs in editorial — design 240px vs runtime 220px` |
| `scoped-root-token` | a media-scoped :root re-declares --bg | FAIL | FAIL | `scoped token: @media (max-width: 600px) { :root { --bg: #111111 } } re-declares a tracked token outside the responsive geometry contract — the design has no responsive to` |
| `supports-scoped-token` | an @supports-scoped :root re-declares --surface | FAIL | FAIL | `scoped token: @supports (color: color-mix(in srgb, red, blue)) { :root { --surface: red } } re-declares a tracked token outside the responsive geometry contract — the des` |
| `html-selector-token` | html { --text } re-declares a tracked token | FAIL | FAIL | `single source: html { --text: #ffffff } declares a tracked token outside :root / :root[data-system] / :root[data-accent] — custom properties inherit, so this repaints eve` |
| `universal-token` | * { --bg } re-declares a tracked token on every element | FAIL | FAIL | `single source: * { --bg: #111111 } declares a tracked token outside :root / :root[data-system] / :root[data-accent] — custom properties inherit, so this repaints every el` |
| `component-token` | .page { --radius } re-declares a tracked token for a subtree | FAIL | FAIL | `single source: .page { --radius: 4px } declares a tracked token outside :root / :root[data-system] / :root[data-accent] — custom properties inherit, so this repaints ever` |
| `compound-layer` | :root[data-system][data-accent] compound declares --bg | FAIL | FAIL | `single source: :root[data-system="geist"][data-accent="cyan"] { --bg: #000001 } declares a tracked token outside :root / :root[data-system] / :root[data-accent] — custom ` |
| `accent-block-token` | an accent block re-declares --surface | FAIL | FAIL | `accent "cyan": :root[data-accent="cyan"] re-declares --surface — an accent block may only set --accent/--accent-2` |
| `sibling-root-token` | another client stylesheet declares --bg on :root | FAIL | FAIL | `single source: client/src/styles/canary.css :root { --bg: #111111 } declares a tracked token outside client/src/styles/design-system.css` |
| `sibling-important-root-resolves` | a sibling :root !important --bg also changes what every system RESOLVES (rule 3, not only rule 10) | FAIL | FAIL | `editorial: --bg differs — design #000000 vs runtime #000001 !important` |
| `index-html-early-root-loses` | client/index.html <style> :root --bg (first in document order) loses to design-system.css — rule 10 still flags it, rule 3 must not | FAIL | FAIL | `single source: client/index.html :root { --bg: #000001 } declares a tracked token outside client/src/styles/design-system.css` |
| `sibling-scoped-token` | another client stylesheet re-declares --text under print | FAIL | FAIL | `single source: client/src/index.css @media print { :root } { --text: #000000 } declares a tracked token outside client/src/styles/design-system.css` |
| `value-drift` | geist --surface alpha changes | FAIL | FAIL | `geist: --surface differs — design rgba(255,255,255,0.04) vs runtime rgba(255,255,255,0.05)` |
| `root-value-drift` | root --radius 12px -> 10px (cascades to editorial) | FAIL | FAIL | `editorial: --radius differs — design 12px vs runtime 10px` |
| `missing-token` | root --hairline removed | FAIL | FAIL | `editorial: design token --hairline (rgba(244,243,238,0.06)) is absent from the runtime cascade` |
| `bogus-accent` | extra :root[data-accent="mint"] block | FAIL | FAIL | `runtime declares :root[data-accent="mint"] but the design ships no such accent` |
| `accent-pair-drift` | crimson --accent-2 changed | FAIL | FAIL | `accent:crimson: --accent-2 differs — design #b84dff vs runtime #b84dfe` |
| `stale-deviation` | editorial --text-3 set back to the canonical alpha (entry becomes stale) | FAIL | FAIL | `deviation editorial:--text-3 is stale — --text-3 now matches the design (or is absent on one side); drop the entry` |
| `deviation-no-longer-holds` | editorial --text-3 alpha 0.45 (fails 4.5:1) | FAIL | FAIL | `deviation editorial:--text-3 no longer holds (canonical rgba(244,243,238,0.4) vs runtime rgba(244,243,238,0.45)) — its check returned false; align the value or rewrite th` |
| `registry-default-accent` | registry geist defaultAccent cyan -> matrix | FAIL | FAIL | `registry: default accent for "geist" is matrix in the runtime but cyan in the design` |
| `registry-boot-default` | registry defaultSystem editorial -> swiss | FAIL | FAIL | `registry: boot default is swiss/crimson; the design boots editorial/crimson` |
| `geometry-drift` | --content-max 1240px -> 1280px | FAIL | FAIL | `geometry: --content-max differs in editorial — design 1240px vs runtime 1280px` |
| `geometry-missing` | --footer-pad removed | FAIL | FAIL | `geometry: --footer-pad (48px 40px 32px in the design) is not declared in the runtime's :root` |
| `grain-asset-drift` | .grain background-image swapped to a different data URI | FAIL | FAIL | `utility .grain: background-image differs — design url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMDAnIGhlaWdodD0nMjAwJz48Z` |
| `utility-drift` | .chip font-size 10.5px -> 12px in place | FAIL | FAIL | `utility .chip: font-size differs — design 10.5px vs runtime 12px` |
| `utility-missing` | .hide-tablet rule removed | FAIL | FAIL | `utility @media (max-width: 1024px)\|\|.hide-tablet: rule is missing from the runtime stylesheet` |
| `kbd-deviation-stale` | .kbd font-size 12px -> canonical 10.5px (entry becomes stale) | FAIL | FAIL | `deviation rule:.kbd:font-size is stale — the declaration now matches the design (or the rule is absent); drop the entry` |
| `kbd-deviation-no-longer-holds` | .kbd font-size 12px -> 11px (below the floor the reason cites) | FAIL | FAIL | `deviation rule:.kbd:font-size no longer holds (canonical 10.5px vs runtime 11px) — align the value or rewrite the entry` |
| `canonical-moves` | canonical jsx editorial --bg-2 changed (runtime now behind) | FAIL | FAIL | `editorial: --bg-2 differs — design #070707 vs runtime #070706` |
| `canonical-shape` | the design itself declares a token outside :root | FAIL | FAIL | `canonical shape changed: styles.css .sidebar declares --bg outside :root — extend the cascade model before trusting this gate` |

## What each class of mutation proves

- `later-root-override`, `later-root-important`, `earlier-important-wins`, `later-system-block`: the parser merges EVERY top-level `:root` / `:root[data-system]` occurrence in source order with browser precedence (a later declaration wins unless the earlier one is `!important`). These are the review's first bypass class — the round-1 parser read only the first block per selector.
- `later-utility-override`: a repeated `.chip` rule is merged into the utility rule before the declaration-for-declaration comparison (rule 8) — the review's second bypass.
- `later-utility-under-media`, `descendant-override`, `state-override`: rule 11 — a non-canonical rule that wins a canonical utility's property for that utility's element (media-scoped repeat, descendant, state) changes what the element resolves; the resolved values must agree with the design's wherever such a rule wins on either side (today the design's own per-system overrides, e.g. `[data-system="terminal"] .card { border-radius: 0 !important }`, mirrored by the runtime, plus the documented `.no-anim *` deviation).
- `important-root-vs-system` (review round 3, bypass 1), `important-accent-combo`, `late-system-accent`, `system-geometry-drift`, `sibling-important-root-resolves`: the resolver ranks html-level declarations by importance → layer → specificity → document order → position, so a `:root { … !important }` outranks a later canonical-valued system block (rule 3), a system block that steals `--accent` for one of the 50 combinations — plainly by order or by `!important` — is reported by combination (rule 4), a system block re-declaring a geometry token fails under that system (rule 7), and a sibling sheet's `!important` changes the resolved value (rule 3) as well as breaking the single source (rule 10). `index-html-early-root-loses` is the order control: an `index.html` `:root` comes first in the document, loses to `design-system.css`, and must trip rule 10 only.
- `attribute-class-shadow` (review round 3, bypass 2), `is-shadow`, `not-shadow`, `tag-qualified-shadow`, `where-important-shadow`, `system-scoped-shadow`, `sibling-shadow`, `admin-descendant-shadow`, `universal-important-shadow`: rule 11 candidates are decided by a selector engine on a modelled utility element (unknown type, exactly the utility's classes, no other attribute, unknown position), so `[class~="chip"]`, `:is(.chip)`, `.chip:not(.accent)`, `span.chip`, `:where(.chip) { … !important }`, `[data-system="geist"] .chip`, a later sibling sheet, `.admin-dashboard .chip` and `* { … !important }` are all cascaded against the canonical rule. `where-no-op`, `layered-shadow-no-op` and `print-shadow-ignored` are PASS controls: `:where(.chip)` at zero specificity and an `@layer` copy lose to the canonical rule in the browser, and `@media print` is not a screen parity surface — the engine must not over-report them.
- `no-anim-deviation-stale`, `no-anim-deviation-no-longer-holds`: a `shadow:<rule>:<property>` deviation obeys the same self-expiry contract as token/rule deviations.
- `nested-descendant-shadow`, `nested-ampersand-media-shadow`, `nested-root-media-geometry`, `nested-ampersand-root-token`, `escaped-class-shadow`, `not-print-shadow-resolves`, `screen-print-list-shadow-resolves` (self-review after round 3): the parser sees what the browser sees — CSS Nesting is flattened (`.page { .chip {} }` → `.page .chip`, `.chip { @media (…) {} }` → a media-scoped `.chip`, `:root { @media (tablet) { --shell-sidebar-w } }` → the responsive geometry contract, `:root { & {} }` → a later `:root` declaration), hex escapes are decoded (`.\63 hip` is `.chip`), and only a print-only media list is excluded from the screen surface (`not print` and `screen, print` match screens and are cascaded).
- `extra-tablet-override`, `removed-tablet-override`, `changed-media-query`, `changed-media-value`, `tablet-alias-drift`: rule 9 — the responsive geometry contract (`--shell-sidebar-w` = the design's tablet `.sidebar` width inside the 768–1023 query, `--shell-header-h` = the design's mobile `.header` height below 768) is checked against values parsed from `styles.css`; the review's third bypass (a later tablet override) now fails because scoped `:root` blocks are merged per query too.
- `scoped-root-token`, `supports-scoped-token`: rule 9 — no other @media/@supports/@layer/@container block may re-declare a tracked token.
- `html-selector-token`, `universal-token`, `component-token`, `compound-layer`, `accent-block-token`: rule 10 — tracked tokens may only be declared by the three canonical html-level forms; `html`, `*`, a component class, a compound system+accent selector and an accent block re-declaring a non-accent token all fail (custom properties inherit, so a descendant re-declaration repaints its subtree even though `<html>` still resolves the canonical value).
- `sibling-root-token`, `sibling-scoped-token`: rule 10 across files — every other stylesheet that reaches the document (client/src/**/*.css, the sheets design-system.css @imports, client/index.html `<style>`) is scanned; a tracked token declared there fails regardless of selector or query.
- `value-drift`, `root-value-drift`, `canonical-moves`: rule 3 (shared value differs) for per-system blocks, for the bare root cascading into editorial, and when the DESIGN moves rather than the runtime.
- `missing-token`: rule 2. `bogus-accent`, `accent-pair-drift`: rule 4. `registry-default-accent`, `registry-boot-default`: rule 5.
- `stale-deviation`, `deviation-no-longer-holds`, `kbd-deviation-stale`, `kbd-deviation-no-longer-holds`: rule 6 — a DOCUMENTED_DEVIATIONS entry fails both when the values converge and when its `holds()` proof stops being true.
- `geometry-drift`, `geometry-missing`: rule 7. `grain-asset-drift`, `utility-drift`, `utility-missing`: rule 8.
- `two-layer-important-earlier-wins`, `layer-statement-sets-order-fail`, `anonymous-layers-first-wins`, `nested-sublayer-precedes-parent`, `layered-important-beats-unlayered-important`, `two-layer-normal-later-wins`, `import-layer-main-sheet` (review round 4): the resolver ranks by the document's cascade-layer ORDER, not a layered/unlayered bit — named layers by first appearance across every sheet (statement, `@import … layer()` or block, imports inlined where they sit, bare package imports followed), anonymous layers each their own, sublayers before their parent's direct styles, unlayered last; later layer wins for normal declarations, earlier layer wins under `!important`, unlayered `!important` loses to any layered one. `two-layer-important-canonical-earlier`, `layer-statement-sets-order-pass`, `nested-sublayer-canonical`, `vendor-statement-orders-named-layers`, `import-layer-sibling-loses` and the older `layered-shadow-no-op` are the PASS controls — the browser paints the design's value, so the gate must stay quiet.
- `canonical-shape`: the design side is held to the same cascade model — if `styles.css` ever declares a token outside `:root`, the gate refuses to trust its own model instead of silently comparing the wrong layer.

## The reviews' five file-based bypasses, re-run against `/tmp` copies

Each copy is the live `client/src/styles/design-system.css` plus the review's edit — an appended rule for the round-2 trio (`later-root`, `later-chip`, `tablet-override`), a prepended `:root { --surface: #010203 !important }` plus an appended canonical-valued `:root[data-system="editorial"]` block for `important-root`, and an appended `[class~="chip"] { font-size: 99px }` for `attr-chip` — passed with `--app-css` (canaries are skipped when inputs are overridden, so only the gate verdict is shown). Round 1 passed the first three and round 2 passed the last two; the current gate fails each on the intended rule:

```
### later-root
FAIL deviation editorial:--text-3 no longer holds (canonical rgba(244,243,238,0.4) vs runtime rgba(244,243,238,0.52)) — its check returned false; align the value or rewrite the entry
FAIL editorial: --bg differs — design #000000 vs runtime #123456
FAIL editorial: --text-3 differs — design rgba(244,243,238,0.4) vs runtime rgba(244,243,238,0.52)
FAIL canonical-token-parity (3 failures)
exit=1
### later-chip
FAIL utility .chip: font-size differs — design 10.5px vs runtime 12px
FAIL canonical-token-parity (1 failure)
exit=1
### tablet-override
FAIL responsive geometry: --shell-sidebar-w inside @media (min-width: 768px) and (max-width: 1023px) resolves to 200px but the design uses 240px (tablet 768–1023: the sidebar narrows to the design's tablet .sidebar width)
FAIL canonical-token-parity (1 failure)
exit=1
### important-root
FAIL editorial: --surface differs — design rgba(244,243,238,0.025) vs runtime #010203 !important
FAIL terminal: --surface differs — design rgba(0,255,136,0.012) vs runtime #010203 !important
FAIL geist: --surface differs — design rgba(255,255,255,0.04) vs runtime #010203 !important
FAIL brutalist: --surface differs — design rgba(255,255,255,0.025) vs runtime #010203 !important
FAIL swiss: --surface differs — design rgba(250,250,248,0.018) vs runtime #010203 !important
FAIL canonical-token-parity (5 failures)
exit=1
### attr-chip
FAIL shadow rule: [class~="chip"] re-declares font-size for .chip — runtime resolves 99px, design resolves 10.5px
FAIL shadow rule: [class~="chip"] re-declares font-size for .chip.accent — runtime resolves 99px, design resolves 10.5px
FAIL shadow rule: [class~="chip"] re-declares font-size for .chip.ok — runtime resolves 99px, design resolves 10.5px
FAIL shadow rule: [class~="chip"] re-declares font-size for .chip.warn — runtime resolves 99px, design resolves 10.5px
FAIL shadow rule: [class~="chip"] re-declares font-size for .chip.bad — runtime resolves 99px, design resolves 10.5px
FAIL shadow rule: [class~="chip"] re-declares font-size for .chip.muted — runtime resolves 99px, design resolves 10.5px
FAIL canonical-token-parity (6 failures)
exit=1
```

## Self-review sweep of alternative spellings (after round 3)

Each row is the live `design-system.css` plus the appended rule, passed with `--app-css`; the third column is the gate's first failure line. The three PASS rows are correct by the browser's rules, not gaps: a print-only media list never paints on screen, and class selectors are case-sensitive in standards mode, so `.CHIP` does not match `class="chip"`.

| probe | appended rule | verdict |
|---|---|---|
| `body-child` | `body > .chip { font-size: 99px; }` | exit=1 — `FAIL shadow rule: body > .chip re-declares font-size for .chip` |
| `chip-list-token` | `:root, .zzz { --bg: #010203; }` | exit=1 — `FAIL single source: .zzz { --bg: #010203 } declares a tracked token outside :root / :root[data-system] / :root[data-accent] — custom properties inhe` |
| `double-class` | `.chip.chip { font-size: 99px; }` | exit=1 — `FAIL shadow rule: .chip.chip re-declares font-size for .chip` |
| `escaped` | `.\63 hip { font-size: 99px; }` | exit=1 — `FAIL shadow rule: .\63 hip re-declares font-size for .chip` |
| `has` | `.chip:has(> span) { font-size: 99px; }` | exit=1 — `FAIL shadow rule: .chip:has(> span) re-declares font-size for .chip when :has(> span)` |
| `html-desc` | `html .chip { font-size: 99px; }` | exit=1 — `FAIL shadow rule: html .chip re-declares font-size for .chip` |
| `important-uppercase` | `.chip { font-size: 99px !IMPORTANT; }` | exit=1 — `FAIL utility .chip: font-size differs — design 10.5px vs runtime 99px !IMPORTANT` |
| `layered-important` | `@layer canary { .chip { font-size: 99px !important; } }` | exit=1 — `FAIL shadow rule: @layer canary\|\|.chip re-declares font-size for .chip` |
| `layered-important-token` | `@layer canary { :root { --bg: #010203 !important; } }` | exit=1 — `FAIL scoped token: @layer canary { :root { --bg: #010203 !important } } re-declares a tracked token outside the responsive geometry contract — the d` |
| `list` | `.chip, .zzz-canary { font-size: 99px; }` | exit=1 — `FAIL utility .chip: font-size differs — design 10.5px vs runtime 99px` |
| `media-min0` | `@media (min-width: 0px) { .chip { font-size: 99px; } }` | exit=1 — `FAIL shadow rule: @media (min-width: 0px)\|\|.chip re-declares font-size for .chip under @media (min-width:0px)` |
| `nested-amp` | `.chip { .zzz-canary & { font-size: 99px; } }` | exit=1 — `FAIL shadow rule: .zzz-canary .chip re-declares font-size for .chip` |
| `nested-compound` | `.chip { &.accent { font-size: 99px; } }` | exit=1 — `FAIL utility .chip.accent: runtime adds font-size: 99px that the design rule lacks` |
| `nested` | `.page { .chip { font-size: 99px; } }` | exit=1 — `FAIL shadow rule: .page .chip re-declares font-size for .chip` |
| `nested-deep` | `.page { @supports (display: grid) { .card { & .chip { font-size: 99px; } } } }` | exit=1 — `FAIL shadow rule: @supports (display: grid)\|\|:is(.page .card) .chip re-declares font-size for .chip` |
| `nested-hover` | `.chip { &:hover { font-size: 99px; } }` | exit=1 — `FAIL shadow rule: .chip:hover re-declares font-size for .chip when :hover` |
| `nested-list` | `.page, .zzz { .chip, .kbd { font-size: 99px; } }` | exit=1 — `FAIL shadow rule: :is(.page, .zzz) .chip re-declares font-size for .chip` |
| `nested-media` | `.chip { @media (min-width: 0px) { font-size: 99px; } }` | exit=1 — `FAIL shadow rule: @media (min-width: 0px)\|\|.chip re-declares font-size for .chip under @media (min-width:0px)` |
| `nested-root` | `:root { --bg: #010203; & { --bg: #010204; } }` | exit=1 — `FAIL editorial: --bg differs — design #000000 vs runtime #010204` |
| `nested-root-media` | `:root { @media (min-width: 768px) and (max-width: 1023px) { --shell-sidebar-w: 200px; } }` | exit=1 — `FAIL responsive geometry: --shell-sidebar-w inside @media (min-width: 768px) and (max-width: 1023px) resolves to 200px but the design uses 240px (tabl` |
| `nested-string` | `.chip { --canary: "{ ; }"; & { font-size: 99px; } }` | exit=1 — `FAIL utility .chip: font-size differs — design 10.5px vs runtime 99px` |
| `not-print` | `@media not print { .chip { font-size: 99px; } }` | exit=1 — `FAIL shadow rule: @media not print\|\|.chip re-declares font-size for .chip under @media not print` |
| `nth` | `.chip:nth-child(2n) { font-size: 99px; }` | exit=1 — `FAIL shadow rule: .chip:nth-child(2n) re-declares font-size for .chip when :nth-child(2n)` |
| `only-print` | `@media only print { .chip { font-size: 99px; } }` | exit=0 — PASS |
| `print-only` | `@media print { .chip { font-size: 99px; } }` | exit=0 — PASS |
| `root-desc` | `:root .chip { font-size: 99px; }` | exit=1 — `FAIL shadow rule: :root .chip re-declares font-size for .chip` |
| `root-root` | `:root:root { --bg: #010203; }` | exit=1 — `FAIL single source: :root:root { --bg: #010203 } declares a tracked token outside :root / :root[data-system] / :root[data-accent] — custom propertie` |
| `screen-print` | `@media screen, print { .chip { font-size: 99px; } }` | exit=1 — `FAIL shadow rule: @media screen, print\|\|.chip re-declares font-size for .chip under @media screen, print` |
| `supports` | `@supports (display: grid) { .chip { font-size: 99px; } }` | exit=1 — `FAIL shadow rule: @supports (display: grid)\|\|.chip re-declares font-size for .chip` |
| `uppercase-sel` | `.CHIP { font-size: 99px; }` | exit=0 — PASS |
| `upper-prop` | `.chip { FONT-SIZE: 99px; }` | exit=1 — `FAIL utility .chip: font-size differs — design 10.5px vs runtime 99px` |

(`later-root` also trips the `--text-3` deviation proof: its WCAG check is recomputed over the mutated `--bg`, so the reason legitimately stops holding — the deviation contract is data-driven, not trusted.)

## Review round 4 — cascade layers are ordered, and Chromium agrees

Round 3 ranked layers as one bit (unlayered beats layered, reversed under
`!important`), so two layers always tied and fell through to specificity. The
review's bypass — an EARLIER layer's `:where(.hide-tablet) { display: block
!important }` followed by a LATER layer's `.hide-tablet.hide-tablet { display:
none !important }` — therefore looked like "the specific restore wins" while
the browser paints `block` (important reverses layer order, and every layered
`!important` beats the unlayered canonical one). The resolver now carries the
document's linearised layer order (`LayerOrder`; see the gate header) and the
summary prints it: `base < theme < components < utilities < unlayered`.

The file-based form of the bypass (live `design-system.css` + the two layers
appended, passed with `--app-css`) against the gate as committed before this
round and after:

```
$ node scripts/validation/canonical-token-parity.mjs --app-css /tmp/r4-layer-bypass.css   # HEAD gate before round 4
PASS canonical-token-parity
exit=0

$ node scripts/validation/canonical-token-parity.mjs --app-css /tmp/r4-layer-bypass.css   # round-4 gate
FAIL shadow rule: @media (max-width: 1024px) @layer early||:where(.hide-tablet) re-declares display for .hide-tablet under @media (max-width:1024px) — runtime resolves block !important, design resolves none !important
FAIL canonical-token-parity (1 failure)
exit=1
```

With the round-3 comparator swapped back in (a /tmp copy of the gate where the
layer step is again a layered/unlayered bit), `--canaries-only` reports these
5 escapes — the cases that need ordered layers:
`two-layer-important-earlier-wins`, `layer-statement-sets-order-fail`, `anonymous-layers-first-wins`, `nested-sublayer-precedes-parent`, `two-layer-normal-later-wins`. The PASS controls
pass under both comparators, so they guard against over-correction rather than
discriminate.

### The same stylesheets in real Chromium

`scripts/validation/canonical-token-parity-browser-check.mjs` loads each
`LAYER_CANARIES` sheet (the identical CSS string the gate mutates in) after
the design's `.hide-tablet` / `.chip` rules — plus the raw
`node_modules/tailwindcss/index.css` for the vendor case — in a 900px
Playwright Chromium page and reads `getComputedStyle`; the import case wires
an earlier unlayered `:root { --bg }` against a data-URL `@import … layer(theme)`.
Evidence: `layer-order-browser.json` (regenerated in round 5, 2026-09-12T22:29:48.655Z; the document canaries added then are tabled below).
"gate" is the verdict the canary expects; FAIL must coincide with the browser
painting something other than the design value, PASS with the design value.

| canary | element / property | browser computes | gate | |
|---|---|---|---|---|
| `two-layer-important-earlier-wins` | `.hide-tablet` display | `block` | FAIL | agree |
| `two-layer-important-canonical-earlier` | `.hide-tablet` display | `none` | PASS | agree |
| `layer-statement-sets-order-pass` | `.hide-tablet` display | `none` | PASS | agree |
| `layer-statement-sets-order-fail` | `.hide-tablet` display | `block` | FAIL | agree |
| `anonymous-layers-first-wins` | `.hide-tablet` display | `block` | FAIL | agree |
| `nested-sublayer-precedes-parent` | `.hide-tablet` display | `block` | FAIL | agree |
| `nested-sublayer-canonical` | `.hide-tablet` display | `none` | PASS | agree |
| `layered-important-beats-unlayered-important` | `.hide-tablet` display | `block` | FAIL | agree |
| `two-layer-normal-later-wins` | `.chip` outline-offset | `2px` | FAIL | agree |
| `vendor-statement-orders-named-layers` | `.hide-tablet` display | `none` | PASS | agree |
| `import-layer-main-sheet` | `html` --bg | `#000001` | FAIL | agree |

The same run walks the live app's `document.styleSheets` (Vite dev, `/`) and
lists cascade layers by first appearance: **properties < base < theme < components < utilities**.
The gate models `base < theme < components < utilities` — the same order; `properties` is
emitted by the Tailwind compiler (universal `--tw-*` `@property` fallbacks,
no source rule) and is documented as not modelled in the gate header. The
served bundle confirms the source-order reasoning: `@layer properties;` at
line 2, design-system.css's `@layer base {` at line 138, then Tailwind's
`@layer theme, base, components, utilities;` at line 1730 — `base` is first
because the app's own block precedes the vendor statement.

### Generator (design-system-artifact) parses by brace depth

`scripts/generate-design-system-artifact.mjs` used a first-`}` regex per
selector, so a multi-line `@media (…) { :root { --shell-sidebar-w: 240px } }`
was merged into the top-level `:root` and would have regenerated
`tokens.json` with the tablet value. It now strips comments, splits by
depth, takes only depth-0 rules (at-rules excluded), splits selector lists
(`:root, :host` counts), reads only depth-0 declarations (`;` inside
`url()`/strings is safe, last wins), throws on a missing block, and runs a
self-test on every invocation (media-nested, `@layer`/`@supports`-nested,
CSS-nested `@media` and `& .child` inside `:root`, comment-only block,
list selector, missing selector). Probe: with the two responsive rules of
`design-system.css` reformatted multi-line in a temporary copy, the previous
generator reported the artifact `stale` (it had merged the media values); the
rewritten one reports `up to date`, as it must, and the working tree was
restored byte-identical afterwards.

## Review round 5 — imports are spliced where they sit, and the document is modelled

Round 4 placed each imported sheet BEFORE its importer as a whole, so an
importer's own `@layer` statement written above its imports was registered
too late. The review's bypass — in `client/src/index.css`:

```css
@layer early;
@import '../canary/restore.css' layer(late);   /* @media (max-width: 1024px) { .hide-tablet.hide-tablet { display: none !important } } */
@import '../canary/bypass.css';                /* @media (max-width: 1024px) { @layer early { :where(.hide-tablet) { display: block !important } } } */
```

— registers `early` first in the browser (an importer's pre-import statements
precede the imported sheets), so `early < late` and the early `!important`
bypass beats the late restore: Chromium paints `block` while the round-4 gate
(which saw the `layer(late)` import first) computed `none` and passed.

The document is now walked in source order and every imported sheet is spliced
in at its import's position (`[...importerPosition, importSeq]`); the layer
statements of the importer above the imports therefore rank first, and its
rules below them rank after. Three document rules were added on top of the
model — the main sheet must be reached, unconditionally (rule 12); every
`@import` must be well-placed and single (rule 13); and the layer order must
not depend on which conditional rules currently match (rule 14) — and the
canaries can now rewrite `index.css` itself through an in-memory overlay
(`DOCUMENT_CANARIES`), so the exploit above is a permanent case.

Transcript against a mirror of the repository with the bypass in place
(`/tmp/parity-tokens/r5/mirror`: `client/` + `shared/` copied, `node_modules` and
the design source symlinked, the two canary sheets under `client/canary/`,
the three lines prepended to `client/src/index.css`):

```
$ # client/src/index.css = the round-5 bypass (`@layer early;` + `@import restore layer(late)` + `@import bypass`) prepended to the live file; canaries skipped via --app-css so only the comparison verdict shows
$ node scripts/validation/canonical-token-parity.mjs --app-css client/src/styles/design-system.css   # HEAD gate before round 5
canaries skipped :: probing overridden inputs (pass --canaries-only to run them against these inputs)
PASS canonical-token-parity
exit=0

$ node scripts/validation/canonical-token-parity.mjs --app-css client/src/styles/design-system.css   # round-5 gate
canaries skipped :: probing overridden inputs (pass --canaries-only to run them against these inputs)
FAIL shadow rule: client/canary/bypass.css @media (max-width: 1024px) @layer early||:where(.hide-tablet) re-declares display for .hide-tablet under @media (max-width:1024px) — runtime resolves block !important, design resolves none !important
FAIL canonical-token-parity (1 failure)
exit=1
```

### What the Tailwind compiler does with an @import — and why rule 13 exists

`index.css` is a Tailwind root: `@tailwindcss/vite` hands it (dev and build
alike) to the `tailwindcss` compiler, whose import substitution inlines
EVERY `@import` of the graph where it sits — one that follows another rule,
one nested inside a block (wrapped in the enclosing at-rule), one carrying a
media list / `supports()` / `layer()` (wrapped in `@media` / `@supports` /
`@layer`), and each copy of a sheet imported twice. Measured with
`tailwindcss` 4.3.2's `compile()` over the live `index.css` plus each
variant (the compiled output was searched for the bypass rule and for any raw
`@import` left behind):

| variant of `index.css` | compiled output |
|---|---|
| `@import '../canary/bypass.css'` after the last rule | inlined at the end, no raw `@import` left |
| `@media (max-width: 1024px) { @import '../canary/bypass.css'; }` | inlined inside the media block (nested `@media` × 2) |
| `@import … (min-width: 800px)` / `… print` / `… supports(display: grid)` | inlined wrapped in `@media (min-width: 800px)` / `@media print` / `@supports (display: grid)` |
| `@layer early;` then `@import … layer(late)` then `@import bypass` | `@layer early;` kept first, the restore inside `@layer late { … }`, then the bypass — the browser order `early < late` |
| the same `@import` twice | the sheet inlined twice |
| an `@import` after a rule inside an IMPORTED sheet | inlined there as well |

So the served document keeps a misplaced import, whereas css-syntax,
postcss-import and a browser given the raw sheet drop an `@import` that is
not at the top of its sheet. The gate models what ships (the sheet IS loaded
where it sits, under the enclosing at-rules) AND fails the position (rule 13),
because a misplaced import means a different document per pipeline — the raw
column of the Chromium table below shows exactly that split.

### The document canaries in real Chromium — compiled, and raw

`canonical-token-parity-browser-check.mjs` now serves each `DOCUMENT_CANARIES`
overlay behind a synthetic `client/index.html` on a routed origin: first with
`client/src/index.css` compiled by the same `tailwindcss` `compile()` the app's
Vite pipeline runs (imports resolved with the gate's own resolver over the
byte-identical overlay), then once more RAW (the browser following the
`@import`s itself). "browser" is the compiled document — the one the app
serves — and must match the canary's expectation; "raw" is informational.

| canary | element / property | browser (compiled) | raw | gate | |
|---|---|---|---|---|---|
| `import-layer-statement-above-imports` | `.hide-tablet` display | `block` | `block` | FAIL | agree |
| `import-layer-statement-control` | `.hide-tablet` display | `none` | `none` | PASS | agree |
| `import-layers-without-statement` | `.hide-tablet` display | `none` | `none` | PASS | agree |
| `misplaced-import-after-rule` | `.hide-tablet` display | `block` | `none` | FAIL | agree |
| `misplaced-import-nested-in-media` | `.hide-tablet` display | `block` | `none` | FAIL | agree |
| `duplicate-import` | `.hide-tablet` display | `block` | `block` | FAIL | agree |
| `conditional-import-media-matches` | `.hide-tablet` display | `block` | `block` | FAIL | agree |
| `conditional-import-print-only` | `.hide-tablet` display | `none` | `none` | PASS | agree |
| `main-sheet-import-after-rule` | `.chip` display | `inline-flex` | `inline-flex` | FAIL | agree |
| `main-sheet-import-removed` | `.chip` display | `block` | `block` | FAIL | agree |
| `main-sheet-import-conditional` | `.chip` display | `block` | `block` | FAIL | agree |
| `layer-order-conditional-first-declaration` | `.hide-tablet` display | `block` | `block` | FAIL | agree |

Reading the table: the reviewer's bypass paints `block` in both documents
(early < late); the two misplaced imports load only under the compiler
(`block` vs raw `none`) — modelled as loaded and failed on position; the
doubled import loads twice; `main-sheet-import-after-rule` still paints the
design's `.chip` (`inline-flex`) because the compiler inlines the sheet
lower down — the gate fails it on position, not on reach (raw Chromium agrees
there only because what precedes the moved import is `@theme inline { … }`,
an at-rule the browser does not know and so discards before applying the
"must precede every rule" test — in the compiled document real rules precede it);
`main-sheet-import-removed` and `-conditional` (viewport 900px against
`min-width: 1200px`) paint the unstyled `block`; and
`layer-order-conditional-first-declaration` paints `block` because Chromium
does NOT register a layer whose first declaration sits inside a non-matching
`@media` — at 900px it meets `early` first, so `early < late`, which only
rule 14 can catch (the all-conditions-true shadow computation sees `late <
early` and the restore winning; the canary asserts no shadow line fires).

### Canaries that the round-4 gate could not express

The HEAD gate before this round had no document overlay, so none of the ten
`DOCUMENT_CANARIES` (reviewer bypass + its two PASS controls, misplaced and
doubled imports, media/print-conditioned imports, the main sheet moved,
removed or conditioned, the conditional-first layer) could run against it;
the transcript above is its verdict on the file-based form of the bypass.
