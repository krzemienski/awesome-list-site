# 01 · Overview

> Five distinct dark design systems behind one component contract. Switch
> personalities with a single HTML attribute.

## What this is

A token-driven, opinion-heavy design system for content directories and
reference tools — built originally for **awesome.video**, a curated index of
~2,000 video resources.

It ships with **five** complete visual languages:

| ID | Name | One-line |
|----|------|----------|
| `editorial` | Editorial | Refined magazine. Italic Fraunces accents on Inter body. Soft, generous, warm ink. |
| `terminal`  | Terminal  | Pure mono. Square edges. ASCII rules and brackets. Scanline overlay. |
| `geist`     | Geist     | Vercel-clean. Geist Sans, neutral grays, soft 10px radii, quiet hover glow. |
| `brutalist` | Brutalist | Slab. Instrument Serif headlines. Hard 2px borders. `4px 4px 0 0` offset shadow. |
| `swiss`     | Swiss     | Tight grid. Manrope, hairline 0.5px borders, tabular numerals, no shadow. |

Each system is more than a recolor: it changes edges, type stacks, surface
treatments, shadow grammars, and component skins.

## What it isn't

- ❌ Not a UI library you `npm install`. It's a stylesheet + a tiny JS file.
- ❌ Not light-mode-aware. Every system is dark. Backgrounds are flat
  `#000000`. (See **[16-migration](./16-migration.md)** for how to extend with light themes.)
- ❌ Not opinionated about your framework. Works in plain HTML, React, Vue,
  Svelte, Astro — anything that can attach a class.

## What problem it solves

Building a reference-style site (awesome list, atlas, directory, internal
dashboard) where:

- You want **strong personality** but might not know which one yet.
- You want **dense, scannable** layouts (tables, lists of resources).
- You want **one place to change** the entire feel without touching pages.

Most design systems give you one polite voice. This one gives you five
distinct voices and lets the user (or you) pick on demand.

## What's inside

- ~36 design tokens per system (~180 total), all exposed as CSS variables.
- 10 accent colors with smart per-system defaults.
- Component CSS for `.btn`, `.card`, `.chip`, `.input`, `.select`, `.textarea`,
  `.tabs`, `.table`, `.kbd`, `.eyebrow`, `.dot`, `.live-dot`,
  `.shimmer-line`, `.sidebar`, `.accordion-*`, `.mobile-drawer`, `.modal`.
- Per-system attribute selectors that reshape components beyond what tokens
  can express (square corners, brackets on chips, offset shadows).
- A flow-diagram grammar (nodes / decisions / arrows / lanes) that adapts to
  the active system.

## A 30-second example

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <button class="btn primary">Submit</button>
  <span class="chip accent">live</span>

  <script src="design-systems.js"></script>
  <script>applyDesignSystem('brutalist', 'amber');</script>
</body>
</html>
```

That button is now a hard 2px-bordered Space Grotesk slab with `4px 4px 0 0`
amber offset shadow. Change `'brutalist'` to `'editorial'` and you get a soft
12px-radius Inter button with crimson accent glow on hover. Same HTML.

## Pre-reqs

- Modern browser (Chrome 111+, Firefox 113+, Safari 16.2+) — we use
  `color-mix()` and CSS custom properties extensively.
- A way to load fonts (Google Fonts CSS, or self-hosted).
- That's it. No build step required.

---

**Next:** **[02 · Principles →](./02-principles.md)**
