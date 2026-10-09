---
source: awesome-list-site-ds/docs/17-accessibility.md
sha256: f1b0bdaf0b78fb8bcbea5348ea9dadd757cdbffb218de868009d36ebf3659e9e
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

- **Brutalist**: large display sizes need wider letter-spacing for legibility
  at headline scale — `--display-tracking: -0.04em` is intentional but
  borderline. Test specifically with low vision tools.
- **Swiss**: `0.5px` hairlines disappear on some low-DPI screens. Provide a
  `prefers-contrast: more` fallback to `1px`:

  ```css
  @media (prefers-contrast: more) {
    [data-system="swiss"] .card { border-width: 1px; }
  }
  ```

- **Terminal**: mono fonts at body size can be harder to read for some
  users. Offer Editorial / Geist as alternatives — never make Terminal the
  only option.

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
