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