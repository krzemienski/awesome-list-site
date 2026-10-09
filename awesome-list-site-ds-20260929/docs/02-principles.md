# 02 · Principles

> Six rules that make five different systems feel like one product.

## 01 · Commit to the personality

A system fails when it hedges. Editorial is *genuinely* soft. Brutalist
*genuinely* yells. Don't average them.

When you add a system, push it further than feels comfortable. If
Brutalist's shadow is `4px 4px`, try `6px 6px`. If Swiss's borders are
`1px`, push them to `0.5px`. Restraint is itself a personality; halfway is
not.

> **RULE:** If two systems feel similar in a side-by-side preview, one of
> them isn't trying hard enough.

## 02 · Black is the canvas, not a color

All five systems use flat `#000000` for `--bg`. Surfaces are *alpha
overlays* on top of that black, so the page **atmosphere** (radial gradient,
scanline, grid lines) shines through.

```css
/* ✅ correct */
--surface: rgba(255, 255, 255, 0.04);

/* ❌ wrong — opaque grays drag the eye and flatten depth */
--surface: #14141a;
```

Atmosphere is the only "background art". Never use a literal background image
behind content.

## 03 · One accent per page

The accent (`--accent`) is reserved. It marks **the active state**, **the
primary action**, **the brand moment** — never decoration.

Concretely, accent appears in:

- Primary buttons (`.btn.primary`).
- The active nav indicator (left rail of the active accordion item).
- Eyebrows (`── 02 / SECTION` mono labels).
- The accent halo on `.card.glow:hover`.
- The blinking caret + text selection.
- The active tab underline.
- The live-dot pulse.

It does **not** appear in:

- Random underlines or bullet markers.
- Chart fills (use ink ramp + status colors instead).
- Tag chips (use `.chip` muted, or status `.chip.ok/warn/bad`).

> **RULE:** If you find yourself reaching for `--accent-2`, ask first
> whether `--text-2` or `--text-3` is what you actually want.

## 04 · Tokens before classes

If a value appears in two places, it's a token. We add tokens *before* we
copy values.

```css
/* ✅ correct */
.my-thing {
  border: var(--border-w) solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

/* ❌ wrong — five hours from now this divergence becomes "the system" */
.my-thing {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
}
```

Hardcoded hex values and px numbers belong in **only two places**:

1. `design-systems.js` — token definitions per system.
2. `styles.css`, inside a `[data-system="…"]` selector — for things that
   genuinely can't be a token (e.g. `box-shadow: 4px 4px 0 0 var(--text)`
   only makes sense in Brutalist).

Everywhere else, you reach a token first.

## 05 · Mono is the meta-language

Anything pointing **at** the page (not part of *the page itself*) is mono:

- Eyebrows like `── 02 / TYPOGRAPHY`.
- Indices, counts, dates.
- Codes, tags, keyboard shortcuts.
- Stats and numerics (use `font-feature-settings: "tnum"`).

This keeps display + body type pure for content, and reads as a quiet,
consistent "system voice" across every system.

## 06 · Density is dignity

An awesome-list site lives or dies on the row. Generous leading, tight
stacking, baseline alignment.

- Body line-height never drops below 1.5.
- Lists use **hairline** dividers, not full borders.
- Numbers are **right-aligned**, text is **left-aligned**, status chips are
  **centered**.
- A row never wraps to a 4th visual line. Cap tags at 4 visible chips, then
  use a `+N` overflow.

> **RULE:** Test every list pattern at three densities — Compact, Default,
> Detail. If a layout breaks at Compact, it's not done.

---

## How to apply these principles in code review

When reviewing a PR that touches the system, ask:

1. Does this make the system **more itself**, or more like other systems?
2. Are surface and ink expressed as **alpha overlays**?
3. Is accent used **exactly once** in the affected view?
4. Did the author add a **token** for any value used twice?
5. Are eyebrows, codes, and numerics **mono**?
6. At Compact density, does the layout still hold?

If five of six aren't yes, request changes.

---

**Next:** **[03 · Getting started →](./03-getting-started.md)**
