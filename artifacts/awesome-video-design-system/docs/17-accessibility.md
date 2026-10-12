# App-runtime accessibility addendum (authoritative for Awesome.Video)

The source text below is historical, verbatim handoff documentation, NOT current runtime contrast guidance. Its 38–42%/40% white and ~6:1 Violet claims are obsolete. Frozen source files remain unchanged.

Live --text-3 is corrected per system; --accent remains decorative. Small accent text uses --accent-ink: the exact accent where it already passes, otherwise the minimal sRGB white mix per system/accent (share column below); filled primary labels use black --on-accent. These are approved accessibility deviations, not pixel-parity exceptions.

| System | Live text-3 | Minimum neutral contrast |
|---|---|---:|
| editorial | rgba(244,243,238,0.49) | 4.6728:1 |
| geist | rgba(250,250,250,0.49) | 4.7085:1 |

All 20 system/accent pairs (minimum across bg, bg-2, surface/surface-2/surface-3 over each base, including 0%, 8% chip and 14% control tints):

| System | Accent | Ink share | Upstream accent minimum | Accent ink minimum | Filled label |
|---|---|---:|---:|---:|---:|
| editorial | crimson | 92% | 4.3293:1 | 4.6354:1 | 6.0413:1 |
| editorial | magenta | 92% | 4.2254:1 | 4.6035:1 | 5.9535:1 |
| editorial | orange | 100% | 5.4270:1 | 5.4270:1 | 8.1032:1 |
| editorial | amber | 100% | 7.5224:1 | 7.5224:1 | 12.2154:1 |
| editorial | emerald | 100% | 6.7359:1 | 6.7359:1 | 10.5471:1 |
| editorial | matrix | 100% | 9.3766:1 | 9.3766:1 | 15.6595:1 |
| editorial | cyan | 100% | 7.9825:1 | 7.9825:1 | 13.1007:1 |
| editorial | violet | 80% | 3.3154:1 | 4.6151:1 | 4.5675:1 |
| editorial | lime | 100% | 9.8227:1 | 9.8227:1 | 17.0132:1 |
| editorial | rose | 100% | 5.5797:1 | 5.5797:1 | 8.4028:1 |
| geist | crimson | 83% | 3.9243:1 | 4.6014:1 | 6.0413:1 |
| geist | magenta | 83% | 3.8223:1 | 4.6262:1 | 5.9535:1 |
| geist | orange | 100% | 4.8868:1 | 4.8868:1 | 8.1032:1 |
| geist | amber | 100% | 6.7368:1 | 6.7368:1 | 12.2154:1 |
| geist | emerald | 100% | 6.0457:1 | 6.0457:1 | 10.5471:1 |
| geist | matrix | 100% | 8.4068:1 | 8.4068:1 | 15.6595:1 |
| geist | cyan | 100% | 7.1425:1 | 7.1425:1 | 13.1007:1 |
| geist | violet | 74% | 3.0005:1 | 4.6153:1 | 4.5675:1 |
| geist | lime | 100% | 8.7833:1 | 8.7833:1 | 17.0132:1 |
| geist | rose | 100% | 5.0188:1 | 5.0188:1 | 8.4028:1 |

Reproduce: node scripts/generate-design-system-artifact.mjs. WCAG relative luminance, sRGB alpha compositing before linearisation. Values describe token backings, not browser-measured atmosphere/ancestry; browser contrast and axe proof remains required. No claim is made that uncorrected --accent passes small-text AA.

---

# Historical upstream documentation
# 17 · Accessibility

> Dark with confidence — but every system must clear the bar.

## Contrast targets

WCAG AA: 4.5:1 for normal text, 3:1 for large text (≥18pt or bold ≥14pt).
AAA: 7:1 / 4.5:1.

This system aims for **AAA** on body copy and **AA** everywhere else.

| Pair | Ratio (on #000) | Verdict |
|------|------------------|---------|
| `--text` (#f4f3ee) | **14.0:1** | AAA, any size |
| `--text-2` (66% white) | ~8.5:1 | AAA, normal text |
| `--text-3` (40% white) | ~4.6:1 | AA only — never for body copy |
| `--text-4` (22% white) | ~2.7:1 | Decorative only |
| `--accent` (varies) | 6-16:1 | All 10 accents pass AA |
| `chip.ok` (#34d08c) | 11.5:1 | AAA |
| `chip.warn` (#ffb84d) | 12.8:1 | AAA |
| `chip.bad` (#ff5c7a) | 7.2:1 | AAA |

### Critical rule

> **RULE:** `--text-3` is for meta and captions. **Never** use it for body
> copy or any text users need to read in flow. It passes AA but only just
> — drop to `--text-3` only when the text is genuinely tertiary.

### Verifying a new accent

Test it against `#000` for normal text (4.5:1 needed). Tools:

- Browser DevTools "Inspect → Accessibility → Color contrast"
- https://contrast.tools
- WCAG Color Contrast Checker

Reject any accent that fails 4.5:1 on black.

## Focus

Every interactive element shows a visible focus state. We use the
accent-mixed border:

```css
.input:focus, .select:focus, .textarea:focus, .search-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 50%, var(--border-strong));
}
```

For buttons, use a focus-visible ring:

```css
.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

> **RULE:** `outline: none` is **always** paired with a replacement focus
> indicator. Never naked.

### Skip links

Add at the top of every page:

```html
<a href="#main-content" class="skip-link">Skip to content</a>

<style>
  .skip-link {
    position: absolute;
    left: -9999px;
    top: 0;
    background: var(--accent);
    color: #000;
    padding: 12px 18px;
    font-family: var(--font-mono);
    font-size: 12px;
    z-index: 1000;
  }
  .skip-link:focus {
    left: 16px;
    top: 16px;
  }
</style>
```

## Reduced motion

Respect `prefers-reduced-motion: reduce`. The system ships a `.no-anim`
escape hatch:

```css
@media (prefers-reduced-motion: reduce) {
  body { /* …apply .no-anim rules */ }
}

.no-anim .shimmer-line { animation: none; }
.no-anim .caret::after { animation: none; opacity: 1; }
.no-anim .live-dot     { animation: none; }
```

For any new animated element, add a corresponding `.no-anim` rule.

### Avoid

- Parallax background motion.
- Autoplaying video.
- Auto-rotating carousels.
- Long entrance animations that delay content (>500ms).

## ARIA

| Component | ARIA pattern |
|-----------|--------------|
| Icon-only button | `aria-label="…"` |
| Tabs | `<div role="tablist">`, `<button role="tab" aria-selected>`, `<div role="tabpanel">` |
| Accordion | `<button aria-expanded aria-controls="…">`, body has the matching `id` |
| Modal | `role="dialog" aria-modal="true" aria-labelledby="…"`, focus trapped |
| Live dot | `aria-label="indexed live"` on the parent, or a `<span class="sr-only">live</span>` next to the dot |
| Search | `<input type="search" aria-label="…">` |

### `sr-only` helper

```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
```

## Keyboard support

Everything that's clickable must be reachable by keyboard.

| Element | Keys |
|---------|------|
| Tabs | Left/Right to navigate, Home/End for first/last |
| Accordion | Enter / Space to toggle |
| Modal | Tab cycles within modal; Esc closes |
| Drawer | Esc closes; focus trapped while open |
| Search | / to focus (with `aria-keyshortcuts="/"`) |
| Command palette | ⌘K / Ctrl+K to open |

Implementation lives in your framework code, not the design system itself.

## Don't rely on color alone

```html
<!-- Bad: only color signals error -->
<input class="input" style="border-color: #ff5c7a;">

<!-- Good: color + chip + text -->
<input class="input" style="border-color: #ff5c7a;">
<div class="chip bad" style="margin-top: 6px;">Required</div>
<div style="font-size: 12px; color: #ff5c7a; margin-top: 4px;">
  Please enter a name.
</div>
```

## Touch targets

| Element | Min size |
|---------|----------|
| Buttons | 44×44 px (36×36 for `.btn.icon` is borderline — only use on desktop) |
| Tap rows in mobile drawer | 44 px |
| Icon-only nav links | wrap in 44×44 container |

Run a mobile audit before shipping. Stuff that's beautiful on desktop can
be unhittable on phone.

## Per-system caveats

- **Geist**: display headlines run tight tracking (`-0.04em` on
  `.display-h`) — intentional but borderline at large sizes. Test
  specifically with low vision tools.
- **Geist**: `--grain-opacity` is `0`, so the only depth cue is the alpha
  surface ladder. Check card and input edges against `--border` at
  `prefers-contrast: more`.

## Audit checklist

Before shipping a new system × accent pair:

- [ ] All four text tiers pass their contrast thresholds.
- [ ] Accent passes 4.5:1 on `#000`.
- [ ] Focus visible on every interactive element.
- [ ] No animation longer than 500ms.
- [ ] `prefers-reduced-motion` honored.
- [ ] All icon buttons have `aria-label`.
- [ ] Modals trap focus and respond to Esc.
- [ ] Skip link works.
- [ ] Run axe-core or WAVE — zero violations.
- [ ] Run NVDA / VoiceOver smoke test on homepage and one form.

---

**Next:** **[18 · Launch checklist →](./18-launch-checklist.md)**
