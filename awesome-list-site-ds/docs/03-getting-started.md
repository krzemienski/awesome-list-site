# 03 · Getting started

> The 3-step install. Zero build tools required.

## TL;DR

```html
<link href="…fonts.css…" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
<script src="design-systems.js"></script>
<script>applyDesignSystem('editorial', 'crimson');</script>
```

Then use components with their class names. Done.

---

## Step 1 · Load the fonts

The system uses 6 font families. Easiest: a single Google Fonts request.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Geist:wght@400;500;600;700&family=Instrument+Serif&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap">
```

If you only plan to use **one** system, you can trim to just its families
(see **[06-typography](./06-typography.md)** for the per-system stack).

> **TIP:** `display=swap` is correct here — system fallbacks (`system-ui`,
> `Georgia`) are already in the token stacks, so a FOUT shows readable
> typography instead of invisible text.

## Step 2 · Drop in `styles.css` and `design-systems.js`

```html
<link rel="stylesheet" href="styles.css">
<script src="design-systems.js"></script>
```

`design-systems.js` is the file we ship as `design-systems.jsx` in the demo
project. **There's no JSX in it** — the extension is just a quirk of the
demo loader. Rename to `.js` and load with a normal `<script>` tag.

It exposes four globals:

| Global | What it is |
|--------|------------|
| `window.DESIGN_SYSTEMS` | The five system definitions (tokens). |
| `window.ACCENTS` | The 10 accent colors. |
| `window.SYSTEM_DEFAULT_ACCENT` | Natural-default accent per system. |
| `window.applyDesignSystem(systemId, accentId)` | The applier. |

## Step 3 · Apply a system on load

Before the first paint:

```html
<script>
  applyDesignSystem('editorial', 'crimson');
</script>
```

This does three things:

1. Writes ~36 CSS variables onto `:root`.
2. Sets `data-system="editorial"` and `data-accent="crimson"` on `<html>`.
3. Clears any previously-applied variables from a prior call (so swaps are
   clean).

> **WHY INLINE?** If you call `applyDesignSystem` from a deferred script,
> the page paints once with the default Editorial+Crimson, then re-paints
> with your chosen system. Users see a flash. Run the call **synchronously
> in `<head>`** (or in a small inline script at the top of `<body>`) to
> avoid it.

## Step 4 · Use components

Every component is a class. There's no JSX/JS dependency.

```html
<button class="btn primary">Submit</button>
<button class="btn">Cancel</button>
<button class="btn ghost">Skip</button>

<span class="chip">tag</span>
<span class="chip accent">primary</span>
<span class="chip ok">healthy</span>

<article class="card hoverable glow">
  <div class="eyebrow">── 02 / SECTION</div>
  <h3>Resource title</h3>
  <p>Description.</p>
</article>

<div class="field">
  <label>Name</label>
  <input class="input" type="text" placeholder="ffmpeg…">
</div>
```

See **[10-components](./10-components.md)** for the full inventory.

## Step 5 · (Optional) persist the user's pick

If you want the user to switch systems in your UI:

```js
// Read on load
const sys = localStorage.getItem('ds-system') || 'editorial';
const acc = localStorage.getItem('ds-accent') || SYSTEM_DEFAULT_ACCENT[sys];
applyDesignSystem(sys, acc);

// Write on change
function setSystem(id) {
  localStorage.setItem('ds-system', id);
  const acc = localStorage.getItem('ds-accent') || SYSTEM_DEFAULT_ACCENT[id];
  applyDesignSystem(id, acc);
}
```

The full `<head>` recipe (no-FOUT pre-paint) is in
**[05-theming](./05-theming.md#preventing-the-flash)**.

## Full minimal page

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My Awesome List</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">

  <link rel="stylesheet" href="styles.css">

  <script src="design-systems.js"></script>
  <script>
    const sys = localStorage.getItem('ds-system') || 'editorial';
    const acc = localStorage.getItem('ds-accent')
              || SYSTEM_DEFAULT_ACCENT[sys];
    applyDesignSystem(sys, acc);
  </script>
</head>
<body>
  <div class="page">
    <div class="grain"></div>

    <header class="header">
      <strong>Awesome List</strong>
    </header>

    <main style="padding: 56px 40px; max-width: 1240px; margin: 0 auto;">
      <div class="eyebrow">── INDEX</div>
      <h1 class="display" style="font-size: 56px; margin: 12px 0 24px;">
        A curated atlas.
      </h1>
      <article class="card hoverable" style="padding: 22px;">
        <h3>FFmpeg</h3>
        <p style="color: var(--text-2);">Cross-platform A/V toolchain.</p>
      </article>
    </main>
  </div>
</body>
</html>
```

Save as `index.html`, drop in the two assets, open. You've got a working
design system.

---

**Next:** **[04 · Token contract →](./04-tokens.md)**
