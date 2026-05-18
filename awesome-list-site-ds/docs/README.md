# Awesome.Video Design System

> A token-based, multi-personality dark design system. Five distinct visual
> languages share one component contract — switch them with a single
> attribute.

This folder is the **portable spec** of the design system. The HTML docs at
`/docs.html` are nice, but these `.md` files are what you copy into a new
codebase, share with engineers, paste into an LLM, or check into your design
repo.

Every page is self-contained and small enough to be read in one sitting.

---

## Table of contents

> **🚀 For AI agents / engineers porting this to a new codebase:**
> Read **[../HANDOFF.md](../HANDOFF.md)** first. It's the single
> dissection + playbook document.

### Start here
1. **[Overview](./01-overview.md)** — what this is, what it solves, what's inside.
2. **[Principles](./02-principles.md)** — six rules that hold five personalities together.
3. **[Getting started](./03-getting-started.md)** — the 3-step install for any HTML page.

### Foundations
4. **[Token contract](./04-tokens.md)** — every CSS variable and what it controls.
5. **[Theming & switching](./05-theming.md)** — how systems are applied and persisted.
6. **[Typography](./06-typography.md)** — three families, nine-step scale.
7. **[Color & accent](./07-color.md)** — the ink ladder + 10 accents.
8. **[Spacing & layout](./08-spacing-layout.md)** — the 4px grid and page widths.
9. **[Motion](./09-motion.md)** — durations, easings, reduced-motion.

### Components & patterns
10. **[Components](./10-components.md)** — buttons, cards, forms, nav, lists.
11. **[Patterns](./11-patterns.md)** — flow diagrams, page templates, density.

### Apply it to a site
12. **[Integration: plain HTML](./12-integration-html.md)** — copy-paste install.
13. **[Integration: React](./13-integration-react.md)** — provider + hooks.
14. **[Integration: Next.js](./14-integration-nextjs.md)** — App Router, RSC, no FOUT.
15. **[Integration: Vue / Nuxt](./15-integration-vue.md)** — same primitives in Vue.
16. **[Migrating an existing site](./16-migration.md)** — incremental adoption guide.

### Ship it
17. **[Accessibility](./17-accessibility.md)** — contrast, focus, motion, ARIA.
18. **[Launch checklist](./18-launch-checklist.md)** — final gate before push.

---

## The five systems

| System    | Personality                          | Display font       | Body font       | Edge   | Shadow grammar    |
|-----------|--------------------------------------|--------------------|-----------------|--------|-------------------|
| Editorial | Refined magazine, italic accents     | Fraunces italic    | Inter           | 12px   | soft falloff      |
| Terminal  | Mono CRT, ASCII rules                | IBM Plex Mono      | IBM Plex Mono   | 0px    | accent glow only  |
| Geist     | Vercel-clean, quiet hover            | Geist Sans         | Geist Sans      | 10px   | subtle box ring   |
| Brutalist | Slab serif, hard offset              | Instrument Serif   | Space Grotesk   | 0px    | `4px 4px 0 0`     |
| Swiss     | Hairline grid, tabular numerals      | Manrope            | Manrope         | 4px    | none              |

All five share:
- Flat **#000000** background.
- A 4-tier ink ramp (`--text`, `--text-2/3/4`).
- The same 10 accent palette.
- The same component class names (`.btn`, `.card`, `.chip`, …).

Switching systems means swapping `data-system="editorial"` for
`data-system="terminal"` on `<html>`. CSS variables update; component skins
react via attribute selectors.

---

## The four source files

Everything ships as four files. Drop them into any codebase.

```
styles.css           Tokens, components, per-system skins.    ~22 KB
design-systems.jsx   The 5 system definitions + applier.       ~14 KB
docs.html            (optional) the docs UI for your team.
README.md            (this folder) the portable spec.
```

> **Naming.** Files are `.jsx` so they can be loaded via in-browser Babel for
> the demo, but their contents are framework-agnostic plain JS that exports
> globals on `window`. In a real build, rename to `.js` and bundle normally.

---

## Quick install (literally three lines)

```html
<link rel="stylesheet" href="styles.css">
<script src="design-systems.js"></script>
<script>applyDesignSystem('editorial', 'crimson');</script>
```

That's it. Any element with class `.btn`, `.card`, `.chip`, `.tabs`, `.input`
etc. now inherits the system. See **[03-getting-started](./03-getting-started.md)**.

---

## Conventions used in these docs

- **`--token`** — CSS custom property; lives on `:root`.
- **`[data-system="…"]`** — attribute on `<html>` that selects component skins.
- **`<code>`** vs **`<pre>`** — inline tokens are inline; multi-line examples are
  fenced code blocks.
- A **NOTE** callout looks like:
  > **NOTE:** This is important context.
- A **RULE** callout looks like:
  > **RULE:** This is non-negotiable.

---

## License & attribution

The design system is original work by the Awesome.Video team. Fonts are
loaded from Google Fonts (Fraunces, Inter, Geist, Instrument Serif, Space
Grotesk, IBM Plex Mono, Manrope, JetBrains Mono) under the OFL.
