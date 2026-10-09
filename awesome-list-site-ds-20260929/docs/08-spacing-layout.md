# 08 · Spacing & layout

> 4px base scale. 1240px max width. Centered content with hairline rules.

## The 4px scale

| Step | px | Common use |
|------|----|------------|
| `s-0` | 0 | reset |
| `s-1` | 4 | tight inline groups |
| `s-2` | 8 | inside chips, between paired elements |
| `s-3` | 12 | inline gap between buttons |
| `s-4` | 16 | between unrelated items, default card gap |
| `s-5` | 20 | small section padding |
| `s-6` | 24 | section padding, between section groups |
| `s-8` | 32 | before a section head |
| `s-10` | 40 | between major sections |
| `s-12` | 48 | hero padding |
| `s-16` | 64 | between page-level sections |
| `s-20` | 80 | top of hero, page footer |

> The scale jumps `s-6 → s-8 → s-10 → s-12` (not 7-9-11). Geometric-ish
> growth keeps near-values from creating "almost the same" decisions.

Use `gap:` on flex/grid parents whenever possible — never per-child margins.
It's more robust to DOM edits.

## Vertical rhythm

A loose rule of thumb:

| Distance | px |
|----------|----|
| Inside a paired group (label + value) | 6-8 |
| Inside a content block (related items) | 14-16 |
| Between unrelated content blocks | 24-32 |
| Before a section head | 56-64 |
| Between major sections | 80-100 |

For long-form documentation (like these files), `1.6` line-height is the
floor; `1.7` reads better on dark.

## Horizontal rhythm

| Distance | px |
|----------|----|
| Inside a chip / button | 8-10 |
| Between buttons in a row | 12 |
| Between sibling cards in a grid | 14-16 |
| Between a sidebar and content column | 24-32 |

## Page widths

| Use | Max width |
|-----|-----------|
| Prose / reading column | 640-680 |
| Default app content | 1240 |
| Wide dashboard / table | 1400 |
| Hero (within shell) | full bleed of the shell |

```css
.page-content-wrap {
  max-width: 1240px;
  margin: 0 auto;
  padding: 48px 40px; /* desktop */
}

@media (max-width: 768px) {
  .page-content-wrap {
    padding: 24px 14px;
  }
}
```

## The 12-column grid

For complex dashboards, use a 12-column grid with **24px gutters**:

```css
.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

.col-span-4 { grid-column: span 4; }
.col-span-6 { grid-column: span 6; }
.col-span-8 { grid-column: span 8; }
```

Swiss treats the grid as a **visible** substrate (32px hairline lines in
the page background). Other systems treat it as invisible scaffolding.

## The list-pattern grid

The core unit of an awesome-list site. Use a hand-tuned 4-column grid:

```css
.list-row {
  display: grid;
  grid-template-columns: 60px 1fr 140px 100px;
  gap: 24px;
  padding: 20px 22px;
  border-bottom: var(--hairline-w) solid var(--hairline);
  align-items: baseline;
}
```

| Column | Width | Content |
|--------|-------|---------|
| Index | 60px | `01`, `02` — mono `text-3`, 0.1em tracking |
| Content | flex 1 | Title + tag chips inline + 1-line description |
| Stat | 140px | `★ 44.2k` — mono `text-3` |
| Updated | 100px right | `2 days ago` — mono `text-3` |

At narrower breakpoints, collapse to:

```css
@media (max-width: 720px) {
  .list-row {
    grid-template-columns: 40px 1fr;
    grid-template-rows: auto auto;
  }
  .list-row .stat,
  .list-row .updated {
    grid-column: 2;
    color: var(--text-3);
    font-size: 11px;
  }
}
```

## Breakpoints

We use **three**:

| Name | px | Use |
|------|----|-----|
| Mobile | <768 | Single column, mobile drawer for nav. |
| Tablet | 768-1024 | Two columns, sidebar narrows to 240px. |
| Desktop | ≥1025 | Full layout, sidebar at 280px. |

```css
@media (max-width: 1024px) { .sidebar { width: 240px; } }
@media (max-width: 768px) {
  .sidebar { display: none; }
  .header { padding: 0 14px; gap: 10px; height: 56px; }
  .hide-mobile { display: none !important; }
  .mobile-menu-btn { display: flex !important; }
}
@media (min-width: 769px) {
  .mobile-menu-btn { display: none !important; }
  .show-mobile { display: none !important; }
}
```

`.hide-mobile` and `.show-mobile` are the responsive-visibility helpers.

## Stacking context

| Layer | z-index | Use |
|-------|---------|-----|
| `.grain` | 1 | Background grain overlay |
| Page content | 2 | Everything that scrolls |
| `.icon-rail` / `.sidebar` | 5 | Sticky chrome |
| `.header` | 30 | Sticky top |
| `.mobile-overlay` | 99 | Drawer backdrop |
| `.mobile-drawer` | 100 | Drawer panel |
| `.modal-backdrop` / `.modal` | 200 | Modal layer |

Keep within these ranges. Don't invent `z-index: 9999`.

## Density modes

A list can render at three densities — set on the parent:

| Class | Row height | Use |
|-------|------------|-----|
| `.density-compact` | 44-48px | Single line, hide description. Power-user lists. |
| `.density-default` | 76-92px | Two lines, with description. Default. |
| `.density-detail` | 110-130px | Three lines, with status and owner. |

This isn't fully implemented in the demo but is a recommended pattern.

> **RULE:** A row never wraps to a 4th visual line. Cap tags at 4 visible
> chips; show `+N` overflow.

---

**Next:** **[09 · Motion →](./09-motion.md)**
