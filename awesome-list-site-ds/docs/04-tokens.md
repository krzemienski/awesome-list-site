# 04 · Token contract

> Every CSS variable a system can override. Adding a new system means
> filling out this form.

A token is a CSS custom property defined on `:root` by
`applyDesignSystem()`. Every component reads tokens — never hardcodes
values. There are six groups: **surface, border, text, type, shape, shadow**,
plus a couple of atmosphere extras.

## Surface

| Token | Default (editorial) | What it is |
|-------|---------------------|------------|
| `--bg` | `#000000` | Page background. **Always pure black.** |
| `--bg-2` | `#070706` | Slightly raised areas — sidebars, code blocks. Near-black. |
| `--surface` | `rgba(244,243,238,0.025)` | Card / input idle. Alpha overlay ~2–4 %. |
| `--surface-2` | `rgba(244,243,238,0.05)` | Card hover, secondary surface. ~5–8 %. |
| `--surface-3` | `rgba(244,243,238,0.08)` | Pressed / focused surface. ~8–12 %. |
| `--bg-atmosphere` | `radial-gradient(…)` | Background art behind everything. |
| `--bg-atmosphere-size` | `auto` | Optional sizing for repeating patterns (Swiss grid). |
| `--grain-opacity` | `0.32` | Strength of the noise overlay (0 in Geist, 0.55 in Brutalist). |

## Border

| Token | Default | What it is |
|-------|---------|------------|
| `--border` | `rgba(244,243,238,0.08)` | Default edge. |
| `--border-strong` | `rgba(244,243,238,0.16)` | Hover / active edge. |
| `--hairline` | `rgba(244,243,238,0.06)` | Sub-divider edge (between table rows). |
| `--border-w` | `1px` | Default border width. `2px` in Brutalist. |
| `--hairline-w` | `1px` | Sub-divider width. `0.5px` in Swiss. |

## Text

| Token | Default | What it is |
|-------|---------|------------|
| `--text` | `#f4f3ee` | Primary ink. Headlines, key UI labels. |
| `--text-2` | `rgba(244,243,238,0.66)` | Secondary — body copy. |
| `--text-3` | `rgba(244,243,238,0.4)` | Tertiary — meta, captions. |
| `--text-4` | `rgba(244,243,238,0.22)` | Quaternary — disabled, decorative. |

> **NOTE:** Always four tiers. Resist the urge to invent a `--text-1.5`.
> If you can't make a layout work with four, the layout — not the system —
> is wrong.

## Type

| Token | Default | What it is |
|-------|---------|------------|
| `--font-display` | `'Fraunces', Georgia, serif` | Display family — headlines. |
| `--font-body` | `'Inter', system-ui, sans-serif` | Body family — UI + prose. |
| `--font-mono` | `'JetBrains Mono', monospace` | Mono family — code, eyebrows, keys. |
| `--display-weight` | `500` | Display weight. 400 (Brutalist) → 700 (Swiss). |
| `--display-tracking` | `-0.02em` | Display letter-spacing (tight). |
| `--display-leading` | `1.04` | Display line-height (tight). |
| `--body-leading` | `1.6` | Body line-height (generous). |
| `--eyebrow-tracking` | `0.18em` | Mono eyebrow letter-spacing. |
| `--mono-size-step` | `11px` | Mono micro-scale base size. |

## Shape

| Token | Default | What it is |
|-------|---------|------------|
| `--radius` | `12px` | Default radius. 0 in Terminal/Brutalist. |
| `--radius-sm` | `8px` | Small radius — chips, inputs. |
| `--radius-pill` | `999px` | Pill / circle. `0px` in Terminal/Brutalist. |

## Shadow

| Token | Default | What it is |
|-------|---------|------------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Resting shadow. `none` in Terminal/Swiss. |
| `--shadow` | `0 6px 24px -8px rgba(0,0,0,0.5)` | Hover shadow. |
| `--shadow-lg` | `0 24px 60px -20px rgba(0,0,0,0.7)` | Modal / floating panel. |
| `--shadow-accent` | (accent halo) | Accent glow on hover. |

## Accent (set per page, not per system)

| Token | Default | What it is |
|-------|---------|------------|
| `--accent` | `#ff3d52` | Primary accent — the chromatic moment. |
| `--accent-2` | `#b84dff` | Accent companion — used for gradients & secondary highlights. |

---

## How the contract is enforced

Every component CSS rule references tokens:

```css
.card {
  background: var(--surface);
  border: var(--border-w) solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #0a0a0a;
}

.eyebrow {
  font-family: var(--font-mono);
  font-size: var(--mono-size-step);
  letter-spacing: var(--eyebrow-tracking);
  color: var(--accent);
}
```

No magic numbers, no hex codes outside `design-systems.js`.

## Adding a new token

1. Add it to **all five systems** in `design-systems.js`. Don't add it to
   one and let the others fall through to default — every system must
   declare every token.
2. Reference it in `styles.css` with `var(--your-token)`.
3. Document it here.

## Adding a new system

1. Copy any existing entry in `DESIGN_SYSTEMS`.
2. Give it a unique key and `name`, `tag`, `desc`.
3. Fill in all the same keys. **Don't omit any** — `applyDesignSystem` clears
   prior tokens between switches, so missing keys fall through to the
   stylesheet defaults, which usually means Editorial. That's almost never
   what you want.
4. Pick a smart accent default in `SYSTEM_DEFAULT_ACCENT`.
5. (Optional) add `[data-system="your-id"]` skin selectors in `styles.css`
   for anything tokens can't express.

See **[05-theming](./05-theming.md)** for the full apply protocol.

---

## Reference: complete token list

```
SURFACE      --bg --bg-2 --surface --surface-2 --surface-3
             --bg-atmosphere --bg-atmosphere-size --grain-opacity

BORDER       --border --border-strong --hairline
             --border-w --hairline-w

TEXT         --text --text-2 --text-3 --text-4

TYPE         --font-body --font-display --font-mono
             --display-weight --display-tracking --display-leading
             --body-leading --eyebrow-tracking --mono-size-step

SHAPE        --radius --radius-sm --radius-pill

SHADOW       --shadow-sm --shadow --shadow-lg --shadow-accent

ACCENT       --accent --accent-2
```

**Total: 28 system-defined + 2 accent-defined = 30 active tokens per page.**

(`design-systems.js` defines a few extras like `--bg-atmosphere-size` that
not every system needs; the contract above is the minimum.)

---

**Next:** **[05 · Theming & switching →](./05-theming.md)**
