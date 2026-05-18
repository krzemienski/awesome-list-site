# 10 · Components

> Every primitive in the system, with class API and per-system notes.

The cardinal rule: **components are classes**. No JS, no framework. Apply
classes, get the system's look. The same `<button class="btn primary">`
becomes five different buttons across the five systems.

---

## Buttons — `.btn`

### Variants

```html
<button class="btn primary">Primary action</button>
<button class="btn">Default</button>
<button class="btn ghost">Ghost</button>
<button class="btn danger">Danger</button>
<button class="btn icon ghost" aria-label="search">⌘</button>
```

| Class | Use |
|-------|-----|
| `.btn` | Default — outlined surface. |
| `.btn.primary` | Primary action — filled accent (Geist), outlined accent + glow (Terminal), filled + offset shadow (Brutalist). |
| `.btn.ghost` | Tertiary — transparent until hover. |
| `.btn.danger` | Destructive — accent-tinted with danger affordance. |
| `.btn.icon` | 36×36 square. Combine with `.ghost`. |

### Anatomy

| Spec | Value |
|------|-------|
| Padding | `9px 16px` (default), `36×36` (icon) |
| Gap between icon + label | `8px` |
| Font size | `13px` default, `12px` in Brutalist (uppercase) |
| Font weight | `500` default, `600` primary |
| Radius | `var(--radius-sm)` |

### Per-system notes

- **Terminal**: primary becomes a transparent outline with `text-shadow` glow
  and inset glow on hover.
- **Brutalist**: primary becomes uppercase, 0.04em tracked, with `4px 4px
  0 0 var(--text)` offset shadow.
- **Swiss**: borders drop to `0.5px`, no shadow, transform on hover.

### Rules

> One primary per surface. Never two primaries side-by-side.
>
> Destructive lives on the right of a row, separated by 16px+ from
> confirmations.
>
> Icon-only requires `aria-label`.

---

## Cards — `.card`

```html
<article class="card hoverable glow" style="padding: 22px;">
  <div class="eyebrow">── 03 / ENCODING</div>
  <h3>FFmpeg</h3>
  <p style="color: var(--text-2);">Cross-platform A/V toolchain.</p>
</article>
```

### Variants

| Class | Behavior |
|-------|----------|
| `.card` | Static container. No hover. |
| `.card.hoverable` | Lifts on hover (translate + brighter border + shadow). |
| `.card.glow` | Adds accent halo on hover. Use sparingly. |

### Composition order (top → bottom)

1. **Eyebrow** — `.eyebrow` mono label at the top.
2. **Title** — `<h3>` or `<h4>` depending on context.
3. **Body** — one paragraph max. If you need more, link to a detail page.
4. **Footer meta** — one line of mono / chips.

### Per-system notes

- **Brutalist**: hover translates `(-2px, -2px)` with `6px 6px 0 0 var(--text)`
  shadow. Genuinely springs.
- **Swiss**: hover is a border color change. No transform, no shadow.

---

## Chips — `.chip`

```html
<span class="chip">default</span>
<span class="chip accent">primary</span>
<span class="chip ok">healthy · 12.4k</span>
<span class="chip warn">stale</span>
<span class="chip bad">down</span>
<span class="chip muted">tag</span>
```

### Variants

| Class | Use |
|-------|-----|
| `.chip` | Default — surface fill, mono caps, tracked. |
| `.chip.accent` | Accent — tinted background, accent text. |
| `.chip.ok` | Status — emerald (`#34d08c`). |
| `.chip.warn` | Status — amber (`#ffb84d`). |
| `.chip.bad` | Status — rose (`#ff5c7a`). |
| `.chip.muted` | Tertiary — `text-3` color, regular case. |

### Per-system notes

- **Terminal**: brackets wrap every chip (`[ENCODING]`).
- **Geist**: sentence-case, no tracking, no uppercase.
- **Brutalist**: 1.5px border, uppercase.

---

## Keyboard hint — `.kbd`

```html
<span class="kbd">⌘K</span>
<span class="kbd">esc</span>
```

10.5px mono, hairline border, `text-3` color. Use for shortcut hints in
search bars and tooltips.

---

## Eyebrow — `.eyebrow`

```html
<div class="eyebrow">── 02 / TYPOGRAPHY</div>
```

Mono, 11px (`--mono-size-step`), 0.18em tracked, uppercase, accent color.
Use to label any section, card, or content block. The `──` prefix is
optional but recommended — it gives the system a "broadcast" voice.

---

## Form — `.field`, `.input`, `.select`, `.textarea`

```html
<div class="field">
  <label>Resource title</label>
  <input class="input" type="text" placeholder="ffmpeg…">
</div>

<div class="field">
  <label>Category</label>
  <select class="select">
    <option>Encoding</option>
    <option>Streaming</option>
  </select>
</div>

<div class="field">
  <label>Description</label>
  <textarea class="textarea">A complete cross-platform A/V solution.</textarea>
</div>
```

### Spec

| Class | Notes |
|-------|-------|
| `.field` | Flex column, 8px gap, 12px label. |
| `.input` | Single-line. 10×14px padding, 13px text. |
| `.select` | Native select with same chrome. |
| `.textarea` | Min 96px tall. **Mono font** (it's usually code/markdown). |

### Focus

`border-color → mix(accent 50%, border-strong)`. Always visible. Never use
`outline: none` without a replacement.

### Validation

- Errors: set border-color to `var(--accent)` if your accent is one of
  Crimson/Rose/Magenta. Otherwise use `#ff5c7a` directly.
- Helper text below input: 12px, `var(--text-3)` for hint, error color for
  error.
- **Never** use color alone — pair with iconography or an explicit error
  message.

---

## Tabs — `.tabs` / `.tab`

```html
<div class="tabs">
  <button class="tab active">Overview</button>
  <button class="tab">Subcategories <span class="mono" style="color: var(--text-3);">· 14</span></button>
  <button class="tab">Activity</button>
</div>
```

### Spec

- Flex container, hairline bottom border.
- 12-16px padding per tab.
- Active tab: accent color + 2px accent underline.
- Inactive: `--text-2`, no underline.

---

## Table — `.table`

```html
<table class="table">
  <thead>
    <tr>
      <th>#</th><th>Resource</th><th>Category</th><th>Stars</th><th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="mono" style="color: var(--text-3);">01</td>
      <td>FFmpeg</td>
      <td>Encoding</td>
      <td class="mono">44.2k</td>
      <td><span class="chip ok">ok</span></td>
    </tr>
  </tbody>
</table>
```

### Spec

- 11px uppercase mono header (`text-3`, 0.5px tracking).
- 14px row content, 13px meta.
- Hairline between rows. Row hover → `--surface` bg.
- Right-align numerics. Left-align text. Center status chips.

---

## Status atoms — `.dot`, `.live-dot`

```html
<span class="dot ok"></span>
<span class="dot warn"></span>
<span class="dot bad"></span>

<!-- Animated -->
<span class="live-dot"></span>
```

`.dot` is 8px, no animation. `.live-dot` is 6px, accent color, pulsing.

---

## Sidebar accordion — `.sidebar`, `.accordion-*`

```html
<aside class="sidebar">
  <div class="accordion-item">
    <button class="accordion-header active">
      <span>Encoding</span>
      <span class="mono" style="color: var(--text-3);">312</span>
    </button>
    <div class="accordion-body" style="max-height: 200px;">
      <div class="accordion-body-inner">
        <div class="sub-item active">FFmpeg</div>
        <div class="sub-item">x264</div>
      </div>
    </div>
  </div>
</aside>
```

### Spec

| Spec | Value |
|------|-------|
| Sidebar width | 280px (desktop), 240px (tablet), hidden (mobile) |
| Sub-item height | 7px y-padding, ~32px tall |
| Active mark | 2px accent left rail; glow in Editorial/Geist, hard in Brutalist/Swiss |

The `max-height` on `.accordion-body` is what drives the open/close
animation — set it inline based on the children count.

---

## Mobile drawer — `.mobile-drawer`, `.mobile-overlay`

```html
<div class="mobile-overlay open"></div>
<aside class="mobile-drawer open">…</aside>
```

86% width (max 340px), slides from left, 280ms cubic-bezier. Add `.open`
class to both elements to reveal.

Always:
- Lock body scroll when open.
- Click on `.mobile-overlay` dismisses.
- ESC dismisses.

---

## Modal — `.modal-backdrop`, `.modal`

```html
<div class="modal-backdrop">
  <div class="modal">
    <h3>Confirm submit</h3>
    <p style="color: var(--text-2);">Are you sure?</p>
    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
      <button class="btn ghost">Cancel</button>
      <button class="btn primary">Confirm</button>
    </div>
  </div>
</div>
```

- Backdrop: `rgba(0,0,0,0.7)` + 4px blur.
- Modal: 520px max-width, 90vh max-height, `var(--bg-2)` bg.
- Trap focus inside. ESC closes. Backdrop click closes.

---

## Putting it together: a resource card

```html
<article class="card hoverable glow" style="padding: 22px;">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
    <div style="
      width: 36px; height: 36px;
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      border: 1px solid var(--border);
      display: grid; place-items: center;
      color: var(--accent); font-size: 16px;
    ">◢</div>
    <h3 style="font-size: 17px; flex: 1;">FFmpeg</h3>
    <span class="mono" style="font-size: 11px; color: var(--text-3);">44.2k</span>
  </div>

  <p style="font-size: 13px; color: var(--text-2); line-height: 1.55; margin-bottom: 14px;">
    A complete, cross-platform solution to record, convert and stream audio
    and video.
  </p>

  <div style="display: flex; gap: 6px; flex-wrap: wrap;">
    <span class="chip">encoding</span>
    <span class="chip">cli</span>
    <span class="chip ok">healthy</span>
  </div>
</article>
```

Try that in all five systems. The icon, title, stat, paragraph, and chips
all stay in place — but the **feel** shifts from soft magazine to ASCII
terminal to brutalist slab.

---

**Next:** **[11 · Patterns →](./11-patterns.md)**
