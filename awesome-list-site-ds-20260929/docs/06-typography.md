# 06 · Typography

> Three families per system. The display does the personality work.

## The three roles

Every system declares three families. They never overlap in purpose:

| Role | Used for | Token |
|------|----------|-------|
| **Display** | h1, h2, hero text, anywhere with voice | `--font-display` |
| **Body** | UI labels, prose, inputs, table cells | `--font-body` |
| **Mono** | Eyebrows, codes, indices, keys, numerics | `--font-mono` |

The boundary between display and body sits at **28px**. Anything ≥28px is
display family; anything smaller is body. (Exception: editorial italic
accents in body copy.)

## Per-system stacks

| System | Display | Body | Mono |
|--------|---------|------|------|
| Editorial | Fraunces (italic accents) | Inter | JetBrains Mono |
| Terminal | IBM Plex Mono | IBM Plex Mono | IBM Plex Mono |
| Geist | Geist Sans | Geist Sans | JetBrains Mono |
| Brutalist | Instrument Serif | Space Grotesk | JetBrains Mono |
| Swiss | Manrope | Manrope | IBM Plex Mono |

Why so many? Because the *typeface* is the personality. If you collapsed
all five into one font stack you'd be left with five color schemes. That's
not a design system, that's a `prefers-color-scheme` toggle.

## Type scale

Nine semantic steps. Use the **name**, not the px.

| Name | px | Family | Use |
|------|----|----|-----|
| `display-xl` | 72 | display | Hero, single-line |
| `display` | 56 | display | Page hero |
| `h1` | 40 | display | Section anchor |
| `h2` | 28 | display | Subsection |
| `h3` | 20 | body | Card heading |
| `h4` | 16 | body | List item title |
| `body` | 14 | body | Prose, default |
| `small` | 13 | body | Meta, secondary |
| `caption` | 11 | mono | Eyebrow, kbd, index |

`display-xl` and `display` use `clamp()` in practice so they shrink on
mobile:

```css
.display-h {
  font-family: var(--font-display);
  font-weight: var(--display-weight);
  letter-spacing: var(--display-tracking);
  line-height: var(--display-leading);
}

/* Use the helper class plus inline size: */
<h1 class="display-h" style="font-size: clamp(40px, 5vw, 64px)">…</h1>
```

## Leading & tracking

Display gets **tight** leading and **negative** tracking:

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|-------|-----------|----------|-------|-----------|-------|
| `--display-weight` | 500 | 600 | 600 | 400 | 700 |
| `--display-tracking` | -0.02em | -0.01em | -0.035em | -0.04em | -0.045em |
| `--display-leading` | 1.04 | 1.1 | 1.05 | 0.92 | 1 |
| `--body-leading` | 1.6 | 1.55 | 1.55 | 1.5 | 1.55 |

Notice Brutalist runs `0.92` leading — letters genuinely overlap, which is
part of its monumental feeling. Swiss tops out at `1` — perfectly stacked.

## The mono micro-scale

Mono is small, with wide tracking. Its base size is `--mono-size-step`,
typically 11px.

```css
.eyebrow {
  font-family: var(--font-mono);
  font-size: var(--mono-size-step);    /* 11px */
  letter-spacing: var(--eyebrow-tracking); /* 0.18em */
  text-transform: uppercase;
  color: var(--accent);
}

.kbd {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0;
  text-transform: none;
  padding: 2px 6px;
  border: var(--hairline-w) solid var(--border);
  border-radius: 4px;
}
```

Other mono uses:

- Indices: `01`, `02`, `03` — 0.1em tracking, `text-3` color.
- Counts: `★ 44.2k`, `+12 today` — `tnum` feature, `text-3` or `text-2`.
- Timestamps: `2 days ago`, `today` — `text-3`, right-aligned.

## OpenType features

Body type uses these features in `:root`:

```css
font-feature-settings: "ss01", "cv11", "tnum";
```

- `ss01` / `cv11` — stylistic alternates in Inter (subtle).
- `tnum` — **tabular numerals**. Always on. This makes columns of numbers
  align. *Critical* for an awesome-list site.

Swiss adds `lnum` (lining figures) for stronger numeric presence.

## Italics

Italics are **reserved** in two of five systems:

- **Editorial** — italic Fraunces *is* the accent. Use it sparingly: one
  italic word per headline, maximum. Italics in body copy mean true
  emphasis (a citation, a foreign word), never decoration.
- **All other systems** — italics are not part of the visual language.
  Don't italicize at all.

```html
<h1 class="display-h">
  A curated <em class="serif-italic" style="color: var(--accent);">atlas</em>
  of video tooling.
</h1>
```

That `.serif-italic` helper class is:

```css
.serif-italic {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 400;
}
```

In Terminal/Geist/Brutalist/Swiss it falls through to whatever the display
font does (most of those mono/sans families have no italic, so it just
renders normal — which is correct behavior).

## Rules

> **RULE:** Headlines never go below 16px. Use small/caption instead.

> **RULE:** Mono caps + tracking for eyebrows. Body sentence-case for
> content. Never mix.

> **RULE:** Use display family **only** for true display sizes (≥28px).
> Below that, body. A 20px Fraunces line is a recipe card, not editorial.

> **RULE:** Brutalist headlines should be **huge** — 80px+ in hero contexts.
> Anything smaller forfeits the monumentality that makes it Brutalist.

## Common patterns

### Eyebrow → headline → lede

```html
<header>
  <div class="eyebrow">── 02 / ENCODING</div>
  <h1 class="display-h" style="font-size: clamp(32px, 4vw, 56px); margin: 12px 0 16px;">
    FFmpeg
  </h1>
  <p style="font-size: 18px; color: var(--text-2); line-height: 1.55; max-width: 600px;">
    A complete, cross-platform solution to record, convert and stream
    audio and video.
  </p>
</header>
```

### Stat block

```html
<div style="font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em; color: var(--text-3); margin-bottom: 8px;">
  TOTAL
</div>
<div class="display-h" style="font-size: 44px;">
  2,418
</div>
<div style="font-size: 13px; color: var(--text-2); margin-top: 6px;">
  +12 indexed today
</div>
```

In Swiss, the `2,418` renders with tabular lining figures and tight
tracking, looking like a Bloomberg terminal. In Editorial it's Inter, softer
and warmer. Same markup.

---

**Next:** **[07 · Color & accent →](./07-color.md)**
