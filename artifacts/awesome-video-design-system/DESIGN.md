# Awesome.Video Design System

This is the first-class Replit design-system artifact for Awesome.Video. It is the
workspace-recognized home of the same federated design system that ships in the app.
There is no separate “Replit theme” and no copied retro/reference implementation.

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
