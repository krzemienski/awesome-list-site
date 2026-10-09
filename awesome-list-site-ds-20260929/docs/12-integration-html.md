# 12 · Integration: plain HTML

> Adding the system to a static / server-rendered / no-framework site.

This is the lowest-overhead path. No build tools. No npm. Just HTML, CSS,
and one JS file.

## Files you need

Copy these into your project root (or an `/assets` folder):

```
/styles.css            ← from this design system
/design-systems.js     ← from this design system (renamed from .jsx)
```

## Minimum viable page

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Site</title>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">

  <!-- Design system -->
  <link rel="stylesheet" href="/styles.css">
  <script src="/design-systems.js"></script>
  <script>
    // Synchronous — runs before first paint
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
      <strong style="font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em;">
        SITE.NAME
      </strong>
      <nav class="hide-mobile" style="display: flex; gap: 22px; margin-left: 24px;">
        <a class="nav-link" href="/">Browse</a>
        <a class="nav-link" href="/about.html">About</a>
      </nav>
    </header>

    <main style="max-width: 1240px; margin: 0 auto; padding: 48px 40px;">
      <div class="eyebrow">── 01 / WELCOME</div>
      <h1 class="display-h" style="font-size: clamp(40px, 6vw, 72px); margin: 14px 0 20px;">
        Hello, system.
      </h1>
      <p style="color: var(--text-2); font-size: 17px; max-width: 600px;">
        This is plain HTML using the awesome.video design system.
      </p>
    </main>
  </div>
</body>
</html>
```

That's a fully-themed page. Open it in a browser, change `'editorial'` to
`'terminal'`, refresh — the entire page transforms.

## Multi-page sites

For traditional multi-page sites (Eleventy, Jekyll, Hugo, MkDocs, plain
HTML), put the `<head>` block into a shared layout / template:

### Eleventy (`_includes/base.njk`)

```njk
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title or "Site" }}</title>
  {% include "head-design-system.html" %}
</head>
<body>
  <div class="page">
    <div class="grain"></div>
    {% include "header.html" %}
    <main>{{ content | safe }}</main>
  </div>
</body>
</html>
```

`_includes/head-design-system.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=…">
<link rel="stylesheet" href="/styles.css">
<script src="/design-systems.js"></script>
<script>
  const sys = localStorage.getItem('ds-system') || 'editorial';
  const acc = localStorage.getItem('ds-accent') || SYSTEM_DEFAULT_ACCENT[sys];
  applyDesignSystem(sys, acc);
</script>
```

### Hugo (`layouts/partials/head.html`)

Same idea — drop the design system block into your `head.html` partial,
adjust paths as needed.

### MkDocs

Add to `mkdocs.yml`:

```yaml
extra_css:
  - styles.css
extra_javascript:
  - design-systems.js
  - apply-system.js  # 3-line file that calls applyDesignSystem()
```

(MkDocs doesn't let you put the apply call in `<head>` directly. The flash
on docs sites is usually acceptable. If not, override the theme template.)

## A system-picker UI

For when you want users to pick:

```html
<div class="system-picker" style="
  position: fixed; bottom: 16px; right: 16px;
  display: flex; gap: 6px;
  padding: 8px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  z-index: 50;
">
  <button class="btn ghost" data-sys="editorial">Editorial</button>
  <button class="btn ghost" data-sys="terminal">Terminal</button>
  <button class="btn ghost" data-sys="geist">Geist</button>
  <button class="btn ghost" data-sys="brutalist">Brutalist</button>
  <button class="btn ghost" data-sys="swiss">Swiss</button>
</div>

<script>
  document.querySelectorAll('[data-sys]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.sys;
      const acc = localStorage.getItem('ds-accent')
                || SYSTEM_DEFAULT_ACCENT[id];
      localStorage.setItem('ds-system', id);
      localStorage.setItem('ds-accent', acc);
      applyDesignSystem(id, acc);
    });
  });
</script>
```

## Server-side rendering with a known system

If you know which system to ship (no per-user choice), you can render the
attribute on the server and skip the inline script:

```html
<html lang="en" data-system="brutalist" data-accent="amber">
```

Then in your `<head>`, only load `styles.css` — the attribute selectors
will pick up the system, but **the tokens won't apply** unless something
writes them to `:root`. You have two options:

### Option A: precompile the tokens

Bake the chosen system's tokens directly into a `theme-brutalist.css`:

```css
:root {
  --bg: #000000;
  --surface: rgba(255,255,255,0.025);
  --text: #f5f5f0;
  --font-display: "Instrument Serif", serif;
  --radius: 0px;
  --border-w: 2px;
  /* ...etc, all 30 tokens */
  --accent: #ffb84d;
  --accent-2: #ffd86b;
}
```

Then in HTML:

```html
<link rel="stylesheet" href="/theme-brutalist.css">
<link rel="stylesheet" href="/styles.css">
```

No JS at all. Fastest first paint. Cost: you can't switch systems at
runtime.

### Option B: keep `applyDesignSystem`

Even with SSR, the apply script in `<head>` is fine — it runs synchronously
before paint. This is the recommended path unless you need full SSR
purity.

## Caching

Both `styles.css` and `design-systems.js` are version-stable. Cache them
aggressively:

```
Cache-Control: public, max-age=31536000, immutable
```

When you update them, fingerprint the filenames (`styles.abc123.css`).

---

**Next:** **[13 · Integration: React →](./13-integration-react.md)**
