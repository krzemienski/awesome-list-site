---
source: awesome-list-site-ds/docs/07-color.md
sha256: e6320c732732573000f3d8ff76d892c4c13fcbe74983aef69955d0071c1e2dd4
---
# App-runtime accessibility addendum (authoritative for Awesome.Video)

The source text below is historical, verbatim handoff documentation, NOT current runtime contrast guidance. Its 38–42%/40% white and ~6:1 Violet claims are obsolete. Frozen source files remain unchanged.

Live --text-3 is corrected per system; --accent remains decorative. Small accent text uses --accent-ink (75% accent + 25% white in sRGB); filled primary labels use black --on-accent. Terminal retains its outlined grammar. These are approved accessibility deviations, not pixel-parity exceptions.

| System | Live text-3 | Minimum neutral contrast |
|---|---|---:|
| editorial | rgba(244,243,238,0.49) | 4.6728:1 |
| terminal | rgba(232,232,224,0.51) | 4.6253:1 |
| geist | rgba(250,250,250,0.49) | 4.7085:1 |
| brutalist | rgba(245,245,240,0.50) | 4.6763:1 |
| swiss | rgba(250,250,248,0.48) | 4.7518:1 |

All 50 system/accent pairs (minimum across bg, bg-2, surface/surface-2/surface-3 over each base, including 0%, 8% chip and 14% control tints):

| System | Accent | Accent ink minimum | Filled label (Terminal: outlined) |
|---|---|---:|---:|
| editorial | crimson | 5.5597:1 | 6.0413:1 |
| editorial | magenta | 5.6479:1 | 5.9535:1 |
| editorial | orange | 6.8181:1 | 8.1032:1 |
| editorial | amber | 8.5939:1 | 12.2154:1 |
| editorial | emerald | 7.8911:1 | 10.5471:1 |
| editorial | matrix | 9.6218:1 | 15.6595:1 |
| editorial | cyan | 8.8975:1 | 13.1007:1 |
| editorial | violet | 5.0157:1 | 4.5675:1 |
| editorial | lime | 10.1611:1 | 17.0132:1 |
| editorial | rose | 6.9836:1 | 8.4028:1 |
| terminal | crimson | 6.3726:1 | outlined |
| terminal | magenta | 6.4768:1 | outlined |
| terminal | orange | 7.8676:1 | outlined |
| terminal | amber | 9.9710:1 | outlined |
| terminal | emerald | 8.9419:1 | outlined |
| terminal | matrix | 10.8852:1 | outlined |
| terminal | cyan | 10.1712:1 | outlined |
| terminal | violet | 5.6964:1 | outlined |
| terminal | lime | 11.6870:1 | outlined |
| terminal | rose | 8.0738:1 | outlined |
| geist | crimson | 5.0396:1 | 6.0413:1 |
| geist | magenta | 5.1092:1 | 5.9535:1 |
| geist | orange | 6.1394:1 | 8.1032:1 |
| geist | amber | 7.6964:1 | 12.2154:1 |
| geist | emerald | 7.0825:1 | 10.5471:1 |
| geist | matrix | 8.6267:1 | 15.6595:1 |
| geist | cyan | 7.9612:1 | 13.1007:1 |
| geist | violet | 4.5394:1 | 4.5675:1 |
| geist | lime | 9.0859:1 | 17.0132:1 |
| geist | rose | 6.2816:1 | 8.4028:1 |
| brutalist | crimson | 5.0396:1 | 6.0413:1 |
| brutalist | magenta | 5.1092:1 | 5.9535:1 |
| brutalist | orange | 6.1394:1 | 8.1032:1 |
| brutalist | amber | 7.6964:1 | 12.2154:1 |
| brutalist | emerald | 7.0825:1 | 10.5471:1 |
| brutalist | matrix | 8.6267:1 | 15.6595:1 |
| brutalist | cyan | 7.9612:1 | 13.1007:1 |
| brutalist | violet | 4.5394:1 | 4.5675:1 |
| brutalist | lime | 9.0859:1 | 17.0132:1 |
| brutalist | rose | 6.2816:1 | 8.4028:1 |
| swiss | crimson | 5.7757:1 | 6.0413:1 |
| swiss | magenta | 5.8698:1 | 5.9535:1 |
| swiss | orange | 7.1092:1 | 8.1032:1 |
| swiss | amber | 8.9875:1 | 12.2154:1 |
| swiss | emerald | 8.2368:1 | 10.5471:1 |
| swiss | matrix | 10.0526:1 | 15.6595:1 |
| swiss | cyan | 9.2970:1 | 13.1007:1 |
| swiss | violet | 5.2072:1 | 4.5675:1 |
| swiss | lime | 10.6424:1 | 17.0132:1 |
| swiss | rose | 7.2817:1 | 8.4028:1 |

Reproduce: node scripts/validation/app-accent-contrast.mjs --json. WCAG relative luminance, sRGB alpha compositing before linearisation. Values describe token backings, not browser-measured atmosphere/ancestry; browser contrast and axe proof remains required. No claim is made that uncorrected --accent passes small-text AA.

---

# Historical upstream documentation
# 07 · Color & accent

> Black canvas. Alpha-overlay surfaces. One chromatic moment per page.

## The 4-tier ink ladder

All systems use a four-step text ramp. **Don't invent intermediates.**

| Token | Alpha (approx) | Use |
|-------|----------------|-----|
| `--text` | 96-100 % | Primary ink. Headlines, key UI labels. |
| `--text-2` | 62-68 % | Secondary — body copy, table cell values. |
| `--text-3` | 38-42 % | Tertiary — meta, captions, eyebrows. |
| `--text-4` | 20-22 % | Quaternary — disabled, decorative dividers. |

The exact alpha differs slightly per system to maintain contrast against
each system's atmosphere, but the *role* of each tier is identical.

```css
h1     { color: var(--text); }
p      { color: var(--text-2); }
.meta  { color: var(--text-3); }
[aria-disabled] { color: var(--text-4); }
```

## Surface ladder

Surfaces are alpha overlays on top of `--bg: #000`. Three steps:

| Token | Alpha | Use |
|-------|-------|-----|
| `--surface` | 2-4 % | Card / input idle. |
| `--surface-2` | 5-8 % | Card hover, secondary surface. |
| `--surface-3` | 8-12 % | Pressed / focused, modal interior. |

You almost never set `background: var(--bg)` on anything other than the
page or a backdrop — page bg shines through everything.

## Borders

Same idea, alpha:

| Token | Alpha | Use |
|-------|-------|-----|
| `--hairline` | 5-8 % | Sub-divider, between rows. |
| `--border` | 8-12 % | Default edge. |
| `--border-strong` | 16-22 % | Hover / active. |

Brutalist is the outlier — its `--border` is `rgba(245,245,240,0.85)`, near
pure-white. That's its whole personality.

## The 10-accent palette

| ID | Name | Primary | Secondary |
|----|------|---------|-----------|
| `crimson` | Crimson | `#ff3d52` | `#b84dff` |
| `magenta` | Magenta | `#ec4899` | `#f472b6` |
| `orange` | Orange | `#ff7a3d` | `#ffb84d` |
| `amber` | Amber | `#ffb84d` | `#ffd86b` |
| `emerald` | Emerald | `#34d08c` | `#5ee6b8` |
| `matrix` | Matrix | `#00ff88` | `#39ff14` |
| `cyan` | Cyan | `#5eddf2` | `#7dd3fc` |
| `violet` | Violet | `#9d4edd` | `#c77dff` |
| `lime` | Lime | `#aaff00` | `#00ff88` |
| `rose` | Rose | `#ff7a8a` | `#ffb3c1` |

These are intentionally **saturated**. Dark systems need bright accents to
register — desaturated accents read as gray on black.

## Where accent appears

**Always:**

- `.btn.primary` (filled in most systems, outlined+glow in Terminal,
  filled+offset in Brutalist).
- The active nav indicator (`.accordion-header.active::before`).
- Eyebrows.
- `.chip.accent`.
- `.card.glow:hover` halo.
- `.live-dot` pulse.
- Active `.tab` underline.
- `::selection` background (mixed at 35% with transparent).
- The blinking caret in `.caret::after`.

**Never:**

- Random underlines or list markers.
- Chart fills (use ink ramp).
- Status indicators (use the semantic palette below).
- Regular tags (use `.chip muted`).

## Status palette

Status colors are global — they don't change per system, because "OK" must
mean OK regardless of theme.

| Hex | Token role | Use |
|-----|------------|-----|
| `#34d08c` | OK | Healthy, indexed, up. |
| `#ffb84d` | WARN | Stale, deprecated, archived. |
| `#ff5c7a` | BAD | Broken, down, error. |

These are baked into `.dot.ok`, `.dot.warn`, `.dot.bad`, `.chip.ok` etc.
Don't theme them.

```html
<span class="dot ok"></span>
<span class="chip ok">healthy</span>
<span class="chip warn">stale</span>
<span class="chip bad">down</span>
```

## Using accent in mixed expressions

The CSS function `color-mix()` is your friend. It's how we get
**accent-tinted** surfaces without duplicating tokens per accent.

```css
/* 14 % accent wash for danger button */
.btn.danger {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  color: var(--accent);
}

/* Selection */
::selection {
  background: color-mix(in srgb, var(--accent) 35%, transparent);
  color: #fff;
}

/* Glow halo */
.card.glow:hover {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent),
    0 12px 32px -10px color-mix(in srgb, var(--accent) 35%, transparent);
}
```

> **NOTE:** `color-mix()` needs Chrome 111 / Firefox 113 / Safari 16.2.
> If you must support older browsers, expand to explicit rgba values at
> design-time. We don't.

## Contrast verification

Run these pairs through any WCAG calculator on a `#000` background:

- `--text` → 14:1 (passes AAA at any size).
- `--text-2` → 7-9:1 (passes AAA for normal text).
- `--text-3` → 4.6:1 (passes AA for normal text — **avoid for body
  copy**).
- `--text-4` → ~2.7:1 (UI hints only, never readable copy).
- Each accent vs `#000` → varies; verify each:
  - Crimson, Orange, Magenta, Rose → 6-7:1 ✅
  - Amber, Matrix, Lime → 12-16:1 ✅✅
  - Cyan → ~10:1 ✅
  - Violet → ~6:1 ✅
  - Emerald → ~9:1 ✅

All accents pass WCAG AA on black. **Verify any new accent you add.**

## Anti-patterns

> **ANTI-PATTERN:** A chart with 6 bars colored cyan, magenta, emerald,
> orange, violet, rose. That's not the system's voice — that's
> Tableau-default. Use ink ramp + accent for one highlighted series.

> **ANTI-PATTERN:** Tinting `--surface` with the accent. Surfaces are
> chromatic-neutral on purpose; the accent is precious.

> **ANTI-PATTERN:** Disabled state by reducing opacity on a colored
> element. Use `--text-4` and an outline change instead.

---

**Next:** **[08 · Spacing & layout →](./08-spacing-layout.md)**
