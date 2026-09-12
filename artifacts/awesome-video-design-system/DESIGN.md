# Awesome.Video Design System

This is the first-class Replit design-system artifact for Awesome.Video. It is the
workspace-recognized home of the same federated design system that ships in the app.
There is no separate “Replit theme” and no copied retro/reference implementation.

## Reference authority and implementation

The approved visual reference is the newer modular Index/Curated generation of
the supplied design archive (SHA-256
`19f0240c46caf790bfc384e21f123525699e1ff386fe892f8084bf73337302c9`), held
byte-exact in `awesome-list-site-ds/` by the design-source sync recorded in
`docs/parity/DESIGN-SYNC.md`. Its application, showcase, flow anatomy, and
21-page documentation govern the intended presentation; the archive itself is
gitignored, so that directory and its recorded hashes are the durable authority.

The sources below remain the **shipping implementation authority**, not proof
of visual parity. Translate approved reference changes into those sources and
regenerate projections; do not hand-edit generated tokens, import historical
standalone applications into production, or create a second foundation.
Independent captures of this artifact's own running pages must prove its
parity; captures of the main application's `/design-system` cannot.

## Canonical ownership

| Resource | Responsibility |
|---|---|
| `tokens.json` | Generated machine-readable projection for Replit and tooling |
| `src/index.css` | Imports the shipping runtime stylesheet directly |
| `src/App.tsx` | Living reference that imports the shipping runtime registry directly |
| `client/src/styles/design-system.css` | Canonical CSS tokens, component classes, accents, and five personality skins |
| `client/src/lib/design-system.ts` | Canonical runtime metadata, defaults, applier, and product profiles |
| `shared/styles/product-profiles.css` | Canonical cross-product density and motion roles |
| `docs/DESIGN-SYSTEM.md` | Full rationale and token catalog |
| `docs/AGENTS.md` | Consumption contract for agents and contributors |

`tokens.json` is generated from the runtime sources. Never hand-edit it. Run:

```sh
npm run generate:design-system-artifact
```

The artifact refuses to start or build when this projection is stale.

## Identity

- Dark-only; do not invent light tokens.
- Default expression: **Editorial + Crimson**.
- Personalities: Editorial, Terminal, Geist, Brutalist, Swiss.
- Accents: Crimson, Magenta, Orange, Amber, Emerald, Matrix, Cyan, Violet, Lime, Rose.
- Brand identity remains Editorial + Crimson. Other personalities are product themes,
  not alternate brands.

## Token flow

`primitive value → semantic role → component contract → product composition`

Products may select a personality, accent, and approved product profile. They may not
fork foundational values, accessible behavior, status semantics, or motion preferences.


## Canonical parity

The frozen design source (`awesome-list-site-ds/styles.css` for the bare `:root`,
`design-systems.jsx` for per-system overrides, accents and default accents) is the
authority for every painted token. `npm run validate:canonical-token-parity` resolves the
effective cascade for each of the five systems and compares it, plus the ten accent pairs
and the registry defaults, against the design (165 shared values, zero drift allowed). It
also checks the shell geometry tokens below against the numbers the design hard-codes and
holds the canonical utility rules (`.page`, `.grain`, `.card…`, `.chip…`, `.dot…`,
`.eyebrow`, `.kbd`, `.mono`, `.display…`, `.hide-…`, `.show-…`) verbatim, including the
byte-identical base64 grain asset. It reads the stylesheet the way a browser does — every
occurrence of a selector merged last-wins with `!important` precedence, inside any
`@media`/`@supports`/`@layer` — and enforces a single source: a painted token may be
declared only by `:root`, `:root[data-system]` or `:root[data-accent]` in
`design-system.css`, the tablet/mobile geometry overrides must equal the design's own
media values, rules that shadow a utility's properties must match the design's, and an in-memory
canary suite (one mutation per bypass class, PASS controls included) proves each rule on
every run.

Two deviations are deliberate and self-expiring (each carries a reason and a machine check
in the gate's `DOCUMENTED_DEVIATIONS`; see `docs/parity/assumptions/tokens.md`):

- `--text-3` keeps `0.52` alpha in all five systems (design: `0.36`–`0.4`). The design
  documents 4.6:1 AA contrast for this role, but its literal alpha resolves to ~3.4:1; the
  runtime value is the one that delivers the documented contract.
- `.kbd` renders at `12px` (design: `10.5px`) — the 12px microtext legibility floor the
  tablet/mobile audits enforce.

Tokens the runtime adds beyond the design (`--radius-xs`, `--motion-*`) are reported by
the gate, never failed.

## Product profiles

- `public-discovery`: editorial hierarchy and comfortable browsing.
- `learning-workspace`: focused progress and balanced task density.
- `admin-operations`: dense operational tables, bulk actions, and audit status.
- `standalone-exports`: document-oriented, self-contained output.
- `embedded-integrations`: compact and host-neutral; inherits host accent.

Saved user theme choices always win over first-visit profile defaults.

## Build rules

1. Consume semantic CSS variables or the Tailwind/shadcn bridge—never raw design values.
2. Use shared primitives for buttons, fields, dialogs, tabs, badges, and cards.
3. Keep all targets at least 44×44 CSS pixels and preserve visible focus.
4. Never convey state with color alone.
5. Respect `prefers-reduced-motion`.
6. Verify all five personalities and the default Editorial + Crimson expression.
7. New products compose approved patterns; they do not create a sixth foundation.

See `docs/AGENTS.md` for the enforceable contract and
`.agents/skills/verify-design-system/SKILL.md` for the compliance gate.
## Living manual routes

The registered artifact is a single, hash-routed modular manual. Its routes are stable
capture and deep-link targets rather than duplicate applications:

- `#showcase` (or `/`) — canonical systems, accents, foundations, components, and ownership.
- `#anatomy` — a genuine section route composed from the canonical switcher, exact flow-diagram anatomy section, and canonical footer. It does not count the full showcase twice or invent replacement content.
- `#docs-<chapter>` — 21 genuine chapters grouped under Start, Foundations,
  Components, Patterns, and Apply. Chapter ids match `tests/parity/inventory.json`.

Examples in component and pattern chapters are explicitly labeled documentation.
They demonstrate component structure and state, not operational catalog data. Product
surface comparisons must continue to use real application data.

## Reference reconciliation hooks

The artifact preserves canonical content and composition while correcting prototype
accessibility defects. The reference capture must apply the same non-content adapter:

- Render accent circles inside `.ds-accent-target` 44×44 buttons; keep the painted
  circle at 18×18 and preserve non-overlapping spacing.
- Give `.btn`, `.tab`, `.ds-system-pill`, `.docs-nav-item`, `.input`, `.select`, and
  navigation links a 44px minimum target.
- Preserve the shipping runtime's higher-contrast `--text-3` value (`0.52` alpha).
  Do not restore the prototype's failing `0.4` value to manufacture a pixel pass.
- `data-canonical-section="anatomy"` is the stable, nonvisual reference-adapter hook.
  The `#anatomy` route composes the actual canonical `SystemSwitcher`,
  `FlowDiagramsSection`, and `Footer`; it does not duplicate the full showcase or
  introduce substitute flow content.

These changes intentionally require the same adapter on expected captures. Any baseline
change must be independently reviewed as accessibility reconciliation, not accepted as
an arbitrary visual update.

## Shell geometry

Layout measurements live as tokens in the first `:root` of `design-system.css` so shell
and page work can consume them instead of restating numbers:

| Token | Value | Design source |
|---|---|---|
| `--shell-sidebar-w` | `280px` (resolves to the tablet value at 768–1023) | `styles.css .sidebar` |
| `--shell-sidebar-w-tablet` | `240px` | `styles.css @media (max-width: 1024px) .sidebar` |
| `--shell-rail-w` | `56px` | `styles.css .icon-rail` |
| `--shell-header-h` | `60px` (`56px` below 768) | `styles.css .header` |
| `--page-pad-y` / `--page-pad-x` | `48px` / `40px` | `app.jsx` comfortable page padding |
| `--content-max` | `1240px` | `app.jsx` page measure |
| `--content-max-admin` | `1400px` | `app.jsx` admin measure |
| `--footer-pad` | `48px 40px 32px` | `layout.jsx` footer |

Breakpoints: mobile `<768`, tablet `768–1023`, desktop `>=1024`. The canonical
`.hide-tablet` / `.show-tablet` utilities keep the design's own 1024/1025 edge.
`--shell-footer-measure` is a compatibility alias of `--content-max` (it is declared in a
second `:root` block beside the footer rules, which is why it appears in `tokens.json`
foundations). `--content-max-admin` is consumed by the admin dashboard measure; the other
geometry tokens are consumed by the shell components as they move onto them.
