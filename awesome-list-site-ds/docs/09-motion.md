# 09 · Motion

> Confident, brief, structural. Motion clarifies state — it never decorates.

## Durations

| ms | Use |
|----|-----|
| 140 | Pointer feedback — color, opacity. |
| 160 | Focus, hover, simple state. |
| 220 | Card lift, transform. |
| 280 | Drawer open / overlay. |
| 320 | Accordion expand. |
| 1100 | Caret blink (steps). |
| 2000 | Live-dot pulse. |
| 6000 | Border sweep gradient. |

That's the entire vocabulary. If you find yourself reaching for `400ms` or
`500ms`, you probably want `320ms` or `280ms`.

## Easings

| Function | Use |
|----------|-----|
| `cubic-bezier(0.2, 0.65, 0.3, 1)` | **Default.** Snappy with soft landing. |
| `ease` | Opacity-only fades. |
| `steps(1)` | Caret blinks (never tween a binary state). |
| `linear` | Indeterminate loops (shimmer). |

```css
:root {
  --ease: cubic-bezier(0.2, 0.65, 0.3, 1);
}

.card {
  transition:
    transform 220ms var(--ease),
    background 220ms ease,
    border-color 220ms ease,
    box-shadow 220ms ease;
}
```

## Live atoms

Three reusable animated atoms in `styles.css`:

### `.live-dot`

```css
@keyframes glowSoft {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 0.95; }
}

.live-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
  animation: glowSoft 2s ease-in-out infinite;
}
```

Use in: "indexed · live" status line, the admin-section live indicator in
the header. **One per view, max.** A page with three pulsing dots is a slot
machine.

### `.caret`

```css
@keyframes caretBlink {
  0%, 49%   { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.caret::after {
  content: '_';
  margin-left: 2px;
  color: var(--accent);
  animation: caretBlink 1.1s steps(1) infinite;
}
```

Use on terminal-style hero text, command palettes, "type to search" hints.
Always with `steps(1)` — never tween a blink.

### `.shimmer-line`

```css
@keyframes borderSweep {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

.shimmer-line {
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--accent) 30%,
    var(--accent-2) 70%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: borderSweep 6s linear infinite;
}
```

Decorative divider that draws gentle attention. Use under a hero, between
major sections. One per major section, no more.

## Per-system motion grammar

| System | Hover transform | Hover shadow | Notes |
|--------|----------------|--------------|-------|
| Editorial | `translateY(-2px)` | soft falloff | Default — subtle lift. |
| Terminal | `none` | accent glow ring | Glow, not transform. |
| Geist | `none` | 1px ring + soft glow | Quiet. |
| Brutalist | `translate(-2px,-2px)` | `6px 6px 0 0 var(--text)` | Hard, instant. |
| Swiss | `none` | none | Color shift on hover, that's it. |

This is all expressed in `[data-system]` selectors in `styles.css`. You don't
manage it per-component — the system does.

## Stagger on page load

For high-impact moments, stagger entries with `animation-delay`:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.stagger > * {
  opacity: 0;
  animation: fadeIn 320ms var(--ease) forwards;
}
.stagger > *:nth-child(1) { animation-delay:   0ms; }
.stagger > *:nth-child(2) { animation-delay:  40ms; }
.stagger > *:nth-child(3) { animation-delay:  80ms; }
.stagger > *:nth-child(4) { animation-delay: 120ms; }
.stagger > *:nth-child(5) { animation-delay: 160ms; }
```

Use this **once per page**, on the hero / first row of cards. Not on every
list.

## Reduced motion

Honor `prefers-reduced-motion`. Easiest pattern: a body-level
`.no-anim` class plus a CSS opt-out:

```css
@media (prefers-reduced-motion: reduce) {
  body { /* same as .no-anim */
  }
}

.no-anim .shimmer-line { animation: none; }
.no-anim .caret::after { animation: none; opacity: 1; }
.no-anim .live-dot     { animation: none; }
```

Apps that want a "Subtle animations" toggle (we do, in the Tweaks panel) can
add `.no-anim` to `<body>` programmatically.

## Performance

- Animate only `transform`, `opacity`, `box-shadow`, and `background`. The
  rest will jank.
- Don't animate `width`, `height`, `top`, `left`. Use `transform: translate`.
- The grain overlay uses an SVG `<feTurbulence>` filter rendered into a
  background-image. Don't animate the grain.
- Long shadows (`box-shadow`) are expensive in lists of 100+ rows. Limit
  the hover-shadow to the row being hovered (use `:hover` rather than a
  blanket transition).

> **RULE:** No transition longer than `320ms` (except infinite loops).
> Anything longer feels broken.

---

**Next:** **[10 · Components →](./10-components.md)**
