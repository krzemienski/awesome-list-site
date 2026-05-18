# 18 · Launch checklist

> The final gate. Run this before pushing the design system into production.

Print this. Tape it next to your monitor.

---

## Tokens

- [ ] All five systems define every token in the contract — no missing keys.
  See [04-tokens.md](./04-tokens.md#reference-complete-token-list) for the
  full list.
- [ ] `SYSTEM_DEFAULT_ACCENT` has an entry for every system.
- [ ] No hex values outside `design-systems.js`.
- [ ] No `px` numbers outside `design-systems.js` and the
  `[data-system="…"]` skin section of `styles.css`.
- [ ] Every accent has a verified contrast ratio against `--bg: #000`.

## Components

- [ ] **Buttons**: `.btn`, `.btn.primary`, `.btn.ghost`, `.btn.danger`,
  `.btn.icon` — tested in all 5 systems × at least 3 accents.
- [ ] **Cards**: `.card`, `.card.hoverable`, `.card.glow` — hover state
  visible in all 5 systems.
- [ ] **Chips**: `.chip` and all status variants render correctly.
- [ ] **Inputs**: `.input`, `.select`, `.textarea` — focus state visible in
  every system × every accent.
- [ ] **Tabs**: active state has accent underline.
- [ ] **Tables**: hover row, hairline rules, right-aligned numerics.
- [ ] **Sidebar accordion**: open/close animation runs in 320ms.
- [ ] **Mobile drawer**: slides in <300ms, traps body scroll, dismisses on
  backdrop click + Esc.
- [ ] **Modal**: traps focus, dismisses on Esc + backdrop click.

## Layout

- [ ] Page padding `14-24px` on mobile (≤768px).
- [ ] Page padding `40-64px` on desktop.
- [ ] Header sticks correctly at top with `position: sticky`.
- [ ] Mobile drawer works at <768px; sidebar visible at ≥1025px.
- [ ] Lists tested at three densities (compact / default / detail) — none
  wrap to a fourth visual line.
- [ ] Tag overflow shows `+N`, never wraps.

## Motion

- [ ] `prefers-reduced-motion: reduce` honored — caret, live-dot, shimmer
  all disabled.
- [ ] No transition longer than `320ms` (except infinite loops).
- [ ] No autoplay video, no parallax.
- [ ] Hover transforms snap back without jank when the cursor leaves.

## Typography

- [ ] Body line-height ≥1.5 in every system.
- [ ] Display headlines never below 16px — small/caption used instead.
- [ ] Eyebrows are mono, caps, 0.18em tracked.
- [ ] Numerics use `font-feature-settings: "tnum"`.
- [ ] Italic Fraunces appears **only** in Editorial.

## Color

- [ ] `--text-3` not used for body copy.
- [ ] `--text-4` not used for any readable copy (decorative only).
- [ ] Status chips use the global semantic palette
  (`#34d08c` / `#ffb84d` / `#ff5c7a`), not accent.
- [ ] All 10 accents verified at 4.5:1+ on `#000`.

## Accessibility

- [ ] Every interactive element has a visible focus state.
- [ ] Every icon-only button has `aria-label`.
- [ ] Tabs use `role="tab" aria-selected`.
- [ ] Accordion uses `aria-expanded aria-controls`.
- [ ] Modal uses `role="dialog" aria-modal aria-labelledby`.
- [ ] Skip link present and keyboard-reachable.
- [ ] axe-core or WAVE pass with zero violations.
- [ ] NVDA / VoiceOver smoke test on homepage + one form.
- [ ] Touch targets ≥44×44 on mobile.

## Performance

- [ ] Fonts loaded with `display=swap`.
- [ ] Critical CSS (the tokens + first-paint subset) is inlined or in a
  blocking `<link>`.
- [ ] `applyDesignSystem` (or its pre-built CSS equivalent) runs **before
  first paint** — no flash of default theme.
- [ ] Grain is SVG data URI, not an external image.
- [ ] No animation hits `width`, `height`, `top`, `left` — only `transform`
  and `opacity`.
- [ ] List pages with 50+ rows tested for hover-shadow performance.
- [ ] LCP <2.5s, FID <100ms, CLS <0.1 on the homepage.

## Browser support

- [ ] Chrome 111+ (`color-mix` support).
- [ ] Firefox 113+.
- [ ] Safari 16.2+.
- [ ] Tested on iPhone Safari and Android Chrome.
- [ ] Tested at 1280×800, 1440×900, 1920×1080, 375×667 (iPhone SE).

## Theming

- [ ] localStorage keys namespaced (e.g. `ds-system` / `ds-accent` or
  app-specific).
- [ ] First-visit user lands on a sensible default (Editorial + Crimson, or
  app's pinned default).
- [ ] System picker UI exists somewhere users can find (Tweaks panel,
  settings, footer).
- [ ] Switching is instant — no full-page reload.
- [ ] System-picker UI shows tag / personality hint
  (e.g. "Magazine · Fraunces") so users know what they're picking.

## Documentation

- [ ] The 18 `.md` files in `/docs` are present and link-checked.
- [ ] The HTML showcase (`design-system.html`) renders.
- [ ] The HTML docs site (`docs.html`) renders.
- [ ] README points to docs.

## Code health

- [ ] No `console.log` left in `design-systems.js` or `styles.css`.
- [ ] TypeScript types exported for `SystemId`, `AccentId`.
- [ ] No `!important` outside the `__om-edit-overrides` block (or
  equivalent legacy-shim area).
- [ ] All `[data-system]` selectors documented in styles.css comments.

---

## When every box is checked

You've shipped a **system**, not a stylesheet. Push it.

---

### Quick command reference

```bash
# Lint for hardcoded values that should be tokens
rg --type css '#[0-9a-f]{3,6}\b' src/styles.css | grep -v design-systems

# Find missing aria-labels
rg 'btn icon' src/ | grep -v 'aria-label'

# Run axe via Playwright
npx playwright test --grep accessibility

# Check bundle size
gzip -c styles.css | wc -c       # should be ~6 KB
gzip -c design-systems.js | wc -c # should be ~4 KB
```

---

**End of the spec.** ← back to **[README](./README.md)**
