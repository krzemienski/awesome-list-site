# 11 · Patterns

> Composed solutions for the recurring shapes in a content directory site:
> flow diagrams, page templates, density modes.

---

## Flow diagrams

Each system supplies its own grammar of nodes, decisions, arrows, edge
labels, and lane containers — so any chart you build inherits the
personality automatically.

### Primitives

| Primitive | Use |
|-----------|-----|
| **Node** | Process step. Filled surface, system edge. |
| **Decision** | Branch. Diamond (rotated 45°) in most; `< ?>` brackets in Terminal. |
| **Arrow** | Edge. Straight default; slight curve when crossing rows. |
| **Edge label** | Pill on the arrow midpoint with the condition (`yes`, `apple`). |
| **Lane** | Optional swim-lane container around grouped nodes. |
| **Accent node** | Highlighted current step or output. Filled or outlined accent. |

### Per-system grammar

| System | Node edge | Decision | Arrow head | Lane |
|--------|-----------|----------|------------|------|
| Editorial | 12px radius, soft falloff | Classic diamond | Classic triangle | Soft dashed |
| Terminal | Square, mono caps | `< ?>` brackets | ASCII `▶` | Dashed mono rule |
| Geist | 10px radius, hairline | Rounded diamond | Thin chevron | Soft dashed |
| Brutalist | 0px, 2px border, `4px 4px 0 0` | Square rotated 45° | Block triangle | Hard 2px box |
| Swiss | 4px, 0.5px hairline | Minimal polygon | Thin chevron | Top/bottom hairline |

### Implementation

Flow diagrams aren't pure CSS — they need positioning logic. The demo
ships React components (`FlowNode`, `FlowDecision`, `FlowArrow`,
`FlowLane`, `FlowCanvas`) that read `data-system` and switch primitives.

In a non-React codebase, the same pattern works:

```js
// Pick the system's flow style from a lookup table:
const FLOW = {
  editorial: { radius: 12, border: 1, shadow: 'soft', head: 'classic' },
  terminal:  { radius: 0,  border: 1, shadow: 'none', head: 'ascii' },
  geist:     { radius: 10, border: 1, shadow: 'ring', head: 'thin' },
  brutalist: { radius: 0,  border: 2, shadow: 'offset', head: 'block' },
  swiss:     { radius: 4,  border: 0.5, shadow: 'none', head: 'thin' },
};

function renderNode({ system, x, y, w, h, label }) {
  const s = FLOW[system];
  return `<div style="
    position: absolute; left: ${x}px; top: ${y}px;
    width: ${w}px; height: ${h}px;
    border: ${s.border}px solid var(--border);
    border-radius: ${s.radius}px;
    background: var(--surface);
    ${s.shadow === 'offset' ? 'box-shadow: 4px 4px 0 0 var(--text);' : ''}
    padding: 8px 12px;
  ">${label}</div>`;
}
```

For SVG-based diagrams (e.g. integrating Mermaid, ELK, dagre), inject the
system's stroke + fill tokens at render time:

```js
mermaid.initialize({
  themeVariables: {
    primaryColor: getComputedStyle(document.documentElement)
                    .getPropertyValue('--surface'),
    primaryBorderColor: getComputedStyle(document.documentElement)
                          .getPropertyValue('--border'),
    primaryTextColor: getComputedStyle(document.documentElement)
                        .getPropertyValue('--text'),
    lineColor: getComputedStyle(document.documentElement)
                 .getPropertyValue('--text-3'),
  },
});
```

### When to reach for flow diagrams

- Architecture diagrams — Source → Transcode → Format? → HLS/DASH → CDN.
- Onboarding state — gate, intermediate, success.
- Pipeline status dashboards — current node = accent.
- Decision trees in docs.

---

## Page templates

Four canonical layouts. All share a sticky header, an optional sidebar
accordion, and a centered content column.

### Home — featured + categories

```
┌──────────────────────────────────────────────┐
│ HEADER (sticky)                              │
├────────┬─────────────────────────────────────┤
│        │ HERO (display, eyebrow, stats grid) │
│ SIDE   ├─────────────────────────────────────┤
│ BAR    │ ── FEATURED                         │
│ accord.│ [card] [card] [card] [card]         │
│        ├─────────────────────────────────────┤
│        │ ── ALL CATEGORIES                   │
│        │ [card][card][card][card][card][card]│
│        │ [card][card][card][card][card][card]│
│        ├─────────────────────────────────────┤
│        │ ── RECENTLY UPDATED (list rows)     │
└────────┴─────────────────────────────────────┘
```

### Category — filtered list

```
┌──────────────────────────────────────────────┐
│ HEADER                                       │
├────────┬─────────────────────────────────────┤
│        │ BREADCRUMB + COUNT + SORT CHIPS     │
│ SIDE   ├─────────────────────────────────────┤
│ BAR    │ Tabs (Overview / Subcats / Activity)│
│        ├─────────────────────────────────────┤
│        │ List row 01                         │
│        │ List row 02                         │
│        │ List row 03                         │
│        │ …                                   │
│        ├─────────────────────────────────────┤
│        │ Pagination                          │
└────────┴─────────────────────────────────────┘
```

### Resource detail

```
┌──────────────────────────────────────────────┐
│ HEADER                                       │
├──────────────────────────────────────────────┤
│ EYEBROW · TAGS                               │
│ Resource title (display, 56px)               │
│ Lede paragraph                               │
├──────────────────────────────────────────────┤
│ Stats strip: stars · last update · license  │
├──────────────────────────────────────────────┤
│ Description (640px reading column)           │
│                                              │
│ [link to homepage] [link to repo]            │
├──────────────────────────────────────────────┤
│ ── RELATED                                   │
│ [card] [card] [card]                         │
└──────────────────────────────────────────────┘
```

No sidebar on detail pages. Center the content. 1240px max width but
description column maxes at 640px.

### Submit / admin

```
┌──────────────────────────────────────────────┐
│ HEADER                                       │
├──────────────────────────────────────────────┤
│ Progress chips: [● 1] [○ 2] [○ 3]            │
├─────────────────────────────┬────────────────┤
│ FORM                        │ LIVE PREVIEW   │
│ Name [_________]            │  ┌──────────┐  │
│ Category [select v]         │  │ Card     │  │
│ Description                 │  │ preview  │  │
│ [____________________]      │  └──────────┘  │
│ [____________________]      │                │
│                             │                │
│ [Cancel] [Submit →]         │                │
└─────────────────────────────┴────────────────┘
```

760px max for the form column. Preview column shows the resource card as
the user types.

---

## Density modes

Set on the list parent. Affects row height, line count, visible fields.

### Compact — 44-48px row

```html
<div class="list-row density-compact">
  <code class="mono">01</code>
  <strong>FFmpeg</strong>
  <span class="chip muted">encoding</span>
  <span class="mono">★ 44.2k</span>
</div>
```

- Single line. No description.
- Use for power users, list views with 50+ rows.

### Default — 76-92px row

```html
<div class="list-row density-default">
  <code class="mono">01</code>
  <div>
    <div>
      <strong>FFmpeg</strong>
      <span class="chip muted">encoding</span>
    </div>
    <p style="color: var(--text-2); font-size: 13px;">
      Cross-platform A/V toolchain.
    </p>
  </div>
  <span class="mono">★ 44.2k</span>
  <span class="mono" style="color: var(--text-3);">2 days ago</span>
</div>
```

- Two lines: title + 1-line description.
- Default for browse pages.

### Detail — 110-130px row

```html
<div class="list-row density-detail">
  <code class="mono">01</code>
  <div>
    <div>
      <strong>FFmpeg</strong>
      <span class="chip muted">encoding</span>
      <span class="chip muted">cli</span>
      <span class="chip muted">cross-platform</span>
      <span class="chip ok">healthy</span>
    </div>
    <p style="color: var(--text-2);">
      A complete, cross-platform solution to record, convert and stream
      audio and video.
    </p>
    <div class="mono" style="color: var(--text-3); font-size: 11px;">
      Updated 2 days ago · Maintained by @ffmpeg · GPL-2.0
    </div>
  </div>
  <span class="mono">★ 44.2k</span>
  <span class="mono" style="color: var(--text-3);">2 days ago</span>
</div>
```

- Three lines: title + tag row + description + meta line.
- Use on resource browsing pages where each row is the "destination".

---

## Empty / loading / error states

Three patterns the system standardizes:

### Empty

```html
<div style="text-align: center; padding: 80px 20px; color: var(--text-3);">
  <div class="mono" style="font-size: 11px; letter-spacing: 0.2em; margin-bottom: 14px;">
    ── NO RESOURCES
  </div>
  <h3 class="display-h" style="font-size: 24px; color: var(--text); margin-bottom: 8px;">
    Nothing here yet.
  </h3>
  <p>Try adjusting filters or submit the first one.</p>
  <button class="btn primary" style="margin-top: 18px;">Submit a resource</button>
</div>
```

### Loading

Use the `shimmer-line` atom under a skeleton:

```html
<div>
  <div style="height: 16px; background: var(--surface-2); border-radius: var(--radius-sm); margin-bottom: 8px; width: 60%;"></div>
  <div style="height: 10px; background: var(--surface); border-radius: var(--radius-sm); width: 90%;"></div>
  <div class="shimmer-line" style="margin-top: 14px;"></div>
</div>
```

### Error

Same shape as empty, but use `chip bad` instead of an eyebrow:

```html
<div style="text-align: center; padding: 80px 20px;">
  <span class="chip bad" style="margin-bottom: 16px;">ERROR · 502</span>
  <h3 class="display-h" style="font-size: 24px;">Couldn't load resources.</h3>
  <button class="btn" style="margin-top: 18px;">Retry</button>
</div>
```

---

**Next:** **[12 · Integration: plain HTML →](./12-integration-html.md)**
