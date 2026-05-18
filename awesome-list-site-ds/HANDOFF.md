# HANDOFF.md — Awesome.Video Design System

> **Purpose of this file:** Give an AI agent (or new engineer) everything
> they need to dissect this design system, lift it out of this project, and
> apply it to a new codebase. Read this top to bottom; you'll know what
> every file does, why it exists, and how to wire it elsewhere.
>
> Audience: someone who has never seen the project before and is about to
> port the system to a different site.

---

## 0 · 60-second mental model

This project is a **demo app** (a curated index of video resources at
"awesome.video") built on top of a **multi-personality dark design
system**. The design system is **portable**: pull two files
(`styles.css` + `design-systems.jsx`) into any HTML/React/Vue project,
call one function, get an entire visual identity.

The system ships **five distinct visual languages** — Editorial, Terminal,
Geist, Brutalist, Swiss — that share a single component contract. You
switch personalities by changing one HTML attribute.

```
┌─────────────────────────────────────────────────────────────┐
│ THE SYSTEM (portable)                                       │
│   styles.css            ← tokens + components + skins       │
│   design-systems.jsx    ← 5 system definitions + applier    │
│   docs/*.md             ← portable spec (these files)       │
├─────────────────────────────────────────────────────────────┤
│ THE DEMO APP (uses the system; not portable as-is)          │
│   index.html, app.jsx, layout.jsx, …                        │
│   data.js, pages.jsx, admin.jsx, …                          │
├─────────────────────────────────────────────────────────────┤
│ THE LIVING DOCS (also uses the system)                      │
│   docs.html + docs.jsx + docs-content-{1,2}.jsx             │
│   design-system.html + design-system-showcase.jsx           │
│       + design-system-anatomy.jsx                           │
└─────────────────────────────────────────────────────────────┘
```

**To apply this to a new site, you need 2 files.** Everything else is
examples and documentation.

---

## 1 · File-by-file map

Every file in the project, what it does, whether you need it to ship the
system elsewhere.

### 🟢 THE PORTABLE SYSTEM (copy these to any project)

| File | Lines | Purpose | Required? |
|------|------:|---------|:---------:|
| **`styles.css`** | 678 | The entire CSS contract: tokens on `:root`, component rules, per-system attribute selectors. | ✅ Required |
| **`design-systems.jsx`** | 347 | Defines the 5 systems, 10 accents, smart-defaults map, `applyDesignSystem()`. Plain JS — the `.jsx` extension is a quirk of the demo. | ✅ Required |
| **`docs/*.md`** | 19 files | This folder. The portable spec — read these to understand and apply the system. | 🟡 Recommended |

### 🟡 OPTIONAL HELPERS (lift if useful)

| File | Lines | Purpose | Use elsewhere? |
|------|------:|---------|:--------------:|
| **`tweaks-panel.jsx`** | 426 | A React component for an in-page system/theme picker (the "Tweaks" overlay). Includes drag, persistence, controls (sliders, toggles, color pickers, radio segments). Generic — the only tie-in to the design system is the panel chrome itself. | If you want a runtime theme switcher |
| **`design-system-anatomy.jsx`** | 674 | A React component that renders **flow-diagram primitives** (Node / Decision / Arrow / Lane) in each system's grammar. Useful if your target site has architecture diagrams. | If you ship diagrams |

### 🔴 DEMO-APP-ONLY (don't lift; use as reference)

These files exist to *demonstrate* the system. They don't define it.

| File | Lines | What it does |
|------|------:|--------------|
| `index.html` | 43 | Entry HTML for the demo app. Loads fonts + system + all JSX modules. Reference for the `<head>` boot sequence. |
| `index.standalone.html` | 184 | A self-contained, fully-inlined snapshot of `index.html` for offline distribution. Generated, not authored. |
| `app.jsx` | 183 | Root React component for the demo. Routes between home / category / detail / submit / admin. Owns the `useTweaks` state that drives system + accent. |
| `data.js` | 207 | Stub dataset — categories, subcategories, resources. Pure content. |
| `layout.jsx` | 371 | Demo's `<Header>`, `<Sidebar>`, `<MobileDrawer>`, `<Icon>` SVG library. Reference implementations of nav patterns. |
| `home-layouts.jsx` | 329 | Four alternative home-page compositions (Featured / Categories / Magazine / Index). Reference for page templates. |
| `pages.jsx` | 284 | The base resource detail / category / submit page shells. |
| `pages-core.jsx` | 290 | Sub-renderers for the core pages. |
| `pages-extra.jsx` | 442 | About / 404 / extra page renderers. |
| `views-1.jsx`, `views-2.jsx` | 184, 395 | List/grid/table view components used by category pages. |
| `admin.jsx` | 718 | A demo admin dashboard — submission queue, stats, settings. Big example of how the system handles a data-dense interior. |
| `design-system.html` + `design-system-showcase.jsx` | 27, 797 | The **showcase page** — interactive demo of tokens, type scale, color, components, flow diagrams. |
| `docs.html` + `docs.jsx` + `docs-content-1.jsx` + `docs-content-2.jsx` | 142, 175, 463, 523 | The **HTML docs site** — hash-routed, sidebar-nav, 21 articles. Renders the same content as the `.md` files but interactively. |

---

## 2 · Inside `styles.css`

Read this file once. It's 678 lines but has a clear structure. Here's the
map:

```
LINES 1-49      :root token defaults (the fallback values if no
                applyDesignSystem call ever runs).
LINES 50-90     Global resets, body styling, scrollbar, selection.
LINES 91-130    .grain overlay + page atmosphere.
LINES 131-160   Animations: glowSoft, borderSweep, caretBlink, shimmer,
                fadeIn. The .caret, .shimmer-line, .live-dot helpers.
LINES 161-200   .card and its hover/glow modifiers.
LINES 201-260   .header (sticky top), .nav-link, .search-input.
LINES 261-320   .btn and its variants (primary, ghost, danger, icon).
LINES 321-360   .chip and its variants.
LINES 361-410   .sidebar, .accordion-*, .sub-item.
LINES 411-460   .icon-rail (collapsed nav), .eyebrow, .kbd, .tabs.
LINES 461-500   .table.
LINES 501-540   .field, .input, .select, .textarea.
LINES 541-560   .dot, .live-dot.
LINES 561-600   Responsive @media rules.
LINES 601-650   .mobile-drawer, .mobile-overlay, .modal-backdrop, .modal.
LINES 651-678   [data-system="…"] PER-SYSTEM SKINS — the magic.
                Plus showcase-page-only helpers (.ds-section etc.).
```

### How tokens flow

```
applyDesignSystem('terminal', 'matrix')
        │
        ├─→ writes ~30 CSS vars onto :root
        │     --bg, --text, --font-display, --radius, --shadow, ...
        │
        ├─→ sets <html data-system="terminal" data-accent="matrix">
        │
        ▼
:root {
  --bg: #000;
  --radius: 0;
  --border-w: 1;
  --font-display: 'IBM Plex Mono', monospace;
  --accent: #00ff88;
  ...
}

.btn {
  /* All values reference tokens.
     When tokens swap, this restyles instantly. */
  background: var(--surface);
  border: var(--border-w) solid var(--border-strong);
  border-radius: var(--radius-sm);
}

/* PER-SYSTEM SKIN: tokens can't express "wrap chips in brackets",
   so we use an attribute selector for those moments. */
[data-system="terminal"] .chip::before { content: '['; }
[data-system="terminal"] .chip::after  { content: ']'; }
```

### What can be a token vs. a skin

**Token** (lives in `design-systems.jsx`):

- Any single value: color, radius, border width, font family, shadow.
- Anything where the *type* is identical across systems and only the
  *value* differs.

**Skin** (lives in `[data-system="…"]` block in `styles.css`):

- Anything *structurally* different per system:
  - Brackets around chips (terminal).
  - Uppercase + tracked buttons (brutalist).
  - Replacing a transform-on-hover with a color-shift-on-hover (swiss).
  - Adding pseudo-elements (`::before { content: '> '; }` in terminal).

Rule of thumb: if you can write it as `var(--anything)`, it's a token.
If it's `content:`, `text-transform:`, or a structural rule change, it's
a skin.

---

## 3 · Inside `design-systems.jsx`

Despite the extension, this file is **plain JavaScript**. It exports four
globals on `window`:

### `window.DESIGN_SYSTEMS`

```js
window.DESIGN_SYSTEMS = {
  editorial: {
    name: 'Editorial',
    tag: 'Magazine · Fraunces',     // ← human-readable subtitle
    desc: 'Refined editorial — …',  // ← one-line description for UI
    vars: {                          // ← THE TOKEN DICT
      '--bg': '#000000',
      '--surface': 'rgba(244,243,238,0.025)',
      '--text': '#f4f3ee',
      '--font-display': "'Fraunces', Georgia, serif",
      '--radius': '12px',
      '--shadow': '0 6px 24px -8px rgba(0,0,0,0.5)',
      // …~30 keys total
    },
  },
  terminal: { /* … */ },
  geist: { /* … */ },
  brutalist: { /* … */ },
  swiss: { /* … */ },
};
```

Every system declares **every** token. Don't let any system omit a key
and rely on fallthrough — `applyDesignSystem` actively clears prior keys
between calls, so a missing key means the stylesheet default (in `:root`)
takes over, which usually means an Editorial value showing up inside
Brutalist.

### `window.ACCENTS`

```js
window.ACCENTS = [
  { id: 'crimson', name: 'Crimson', primary: '#ff3d52', secondary: '#b84dff' },
  { id: 'magenta', name: 'Magenta', primary: '#ec4899', secondary: '#f472b6' },
  // …10 total
];
```

Each accent is two colors. `--accent` is the primary, `--accent-2` is for
gradients and secondary highlights.

### `window.SYSTEM_DEFAULT_ACCENT`

```js
window.SYSTEM_DEFAULT_ACCENT = {
  editorial: 'crimson',
  terminal:  'matrix',
  geist:     'cyan',
  brutalist: 'amber',
  swiss:     'orange',
};
```

When a user picks a fresh system without specifying an accent, this is
the "natural fit" that gets applied. Smart UX behavior — see
`docs/05-theming.md`.

### `window.applyDesignSystem(systemId, accentId)`

The whole apply function (paraphrased):

```js
function applyDesignSystem(systemId, accentId) {
  const sys = DESIGN_SYSTEMS[systemId] || DESIGN_SYSTEMS.editorial;
  const root = document.documentElement;

  // 1. Clear keys from a previous call (so no stale values leak).
  if (root.__appliedKeys) {
    root.__appliedKeys.forEach(k => root.style.removeProperty(k));
  }

  // 2. Write the new system's vars.
  const applied = [];
  Object.entries(sys.vars).forEach(([k, v]) => {
    root.style.setProperty(k, v);
    applied.push(k);
  });
  root.__appliedKeys = applied;

  // 3. Write the accent.
  const a = ACCENTS.find(x => x.id === accentId) || ACCENTS[0];
  root.style.setProperty('--accent', a.primary);
  root.style.setProperty('--accent-2', a.secondary);
  applied.push('--accent', '--accent-2');

  // 4. Set the data attributes (triggers attribute-selector skins).
  root.setAttribute('data-system', systemId);
  root.setAttribute('data-accent', accentId);
}
```

That's it. ~30 lines of imperative DOM. No React, no framework.

---

## 4 · The five systems, dissected

If you'll only ship one or two of these to a new site, here's what each
one actually *commits to*. Knowing this helps you pick.

| | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|-----------|----------|-------|-----------|-------|
| **Mood** | Magazine, refined | CRT terminal | Vercel-clean | Concrete slab | Lab / clinical |
| **Display font** | Fraunces (italic) | IBM Plex Mono | Geist Sans | Instrument Serif | Manrope |
| **Body font** | Inter | IBM Plex Mono | Geist Sans | Space Grotesk | Manrope |
| **Mono font** | JetBrains Mono | IBM Plex Mono | JetBrains Mono | JetBrains Mono | IBM Plex Mono |
| **Radius** | 12 / 8 / pill | 0 / 0 / 0 | 10 / 6 / pill | 0 / 0 / 0 | 4 / 2 / pill |
| **Border w** | 1px | 1px | 1px | **2px** | **0.5px** |
| **Shadow** | Soft falloff | None (glow only) | Box ring | `4px 4px 0 0` hard | None |
| **Hover** | translateY -2px | Glow ring | Glow ring | translate -2 + hard shadow | Color change only |
| **Grain** | 0.32 | 0.5 | **0** | 0.55 | 0.18 |
| **Atmosphere** | Radial gradient | Scanlines | Soft top vignette | None | 64px grid lines |
| **Default accent** | Crimson | Matrix | Cyan | Amber | Orange |
| **Best for** | Editorial sites, blogs, magazines | Dev tools, terminals, retro | Modern dashboards, SaaS, dev docs | Marketing, art, opinionated | Data, charts, reference |

**If you only pick one:** Geist is the safest "modern SaaS" choice;
Editorial is the safest "content-heavy" choice; the other three are
braver picks for products that want strong personality.

---

## 5 · How to apply this system to a new site

This is the playbook. Step-by-step, what to do in what order.

### Phase 1 · Move the files

```bash
# In the target project
mkdir -p src/styles src/lib src/docs

cp /this/project/styles.css            target/src/styles/design-system.css
cp /this/project/design-systems.jsx    target/src/lib/design-system.js
cp -r /this/project/docs/              target/docs/
```

**Rename `design-systems.jsx` → `design-system.js`.** The file has no
JSX inside it. The extension was for the in-browser Babel loader in this
demo. In a real project, it's plain JS.

> **For TypeScript projects:** add a `design-system.d.ts` next to it.
> See `docs/13-integration-react.md` for the type definitions.

### Phase 2 · Pick your fonts strategy

You have three options:

#### Option A — Google Fonts (easy, network dependency)

Add this to your `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Geist:wght@400;500;600;700&family=Instrument+Serif&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap">
```

#### Option B — Self-host (production-grade)

Use `@fontsource/*` packages or download the WOFF2 files and serve them.
You only need the families for the systems you'll ship. If you're only
shipping Geist, you only need Geist + JetBrains Mono.

#### Option C — Trim to one system

If you're committing to one system, remove the others from
`design-system.js`. Less font weight to load.

### Phase 3 · Wire `<head>`

Set up your root HTML / layout file:

```html
<!-- 1. Fonts -->
<link rel="stylesheet" href="…fonts.css…">

<!-- 2. The design system stylesheet -->
<link rel="stylesheet" href="/styles/design-system.css">

<!-- 3. The design system JS -->
<script src="/lib/design-system.js"></script>

<!-- 4. Synchronous boot — runs before first paint -->
<script>
  const sys = localStorage.getItem('ds-system') || 'editorial';
  const acc = localStorage.getItem('ds-accent')
            || SYSTEM_DEFAULT_ACCENT[sys];
  applyDesignSystem(sys, acc);
</script>
```

**Critical:** that last script must be **synchronous** and in `<head>` (or
the very top of `<body>`). If it runs after first paint, users see a
flash of the default theme.

For Next.js / Nuxt / etc., see the integration docs:
- `docs/12-integration-html.md`
- `docs/13-integration-react.md`
- `docs/14-integration-nextjs.md`
- `docs/15-integration-vue.md`

### Phase 4 · Add the page chrome

Every page needs the atmosphere layer:

```html
<body>
  <div class="page">
    <div class="grain"></div>

    <!-- Your app goes here -->
    <main>…</main>

  </div>
</body>
```

- `.page` provides the gradient/scanline atmosphere via
  `background: var(--bg-atmosphere)`.
- `.grain` is a fixed full-viewport SVG noise overlay.

Don't skip these. Without them, the systems lose their depth.

### Phase 5 · Replace existing components

Walk through your existing HTML and substitute:

| Was | Use |
|-----|-----|
| `<button class="primary-button">` | `<button class="btn primary">` |
| `<button class="secondary-button">` | `<button class="btn">` |
| `<button class="text-button">` | `<button class="btn ghost">` |
| `<div class="card">` (your own) | `<div class="card">` (ours, plus `.hoverable` if interactive) |
| `<span class="badge">` | `<span class="chip">` (or `.chip.ok/.warn/.bad/.accent`) |
| `<input type="text">` | `<input type="text" class="input">` (wrap in `<div class="field">`) |
| Your sidebar nav | Adapt to `.sidebar .accordion-item .accordion-header` pattern |
| Your tabs | `<div class="tabs"><button class="tab active">…</button></div>` |
| Your section labels | `<div class="eyebrow">── 02 / TITLE</div>` |
| Your keyboard hints | `<span class="kbd">⌘K</span>` |

**Tip for AI agents:** when modifying an existing codebase, do this one
component-class at a time. Run the page after each substitution to verify
nothing breaks.

### Phase 6 · Migrate hardcoded values

Find every `#hex` and `Npx` outside `design-system.js` and replace with
a token. Use this lookup table:

| If you see… | Replace with… |
|-------------|---------------|
| `color: #fff`, `#f4f3ee`, near-white | `color: var(--text)` |
| `color: rgba(white, 60-70%)` | `color: var(--text-2)` |
| `color: rgba(white, 35-45%)` | `color: var(--text-3)` |
| `background: #0a0a0a, #14141a` | `background: var(--bg-2)` or `var(--surface)` |
| `background: rgba(white, 2-5%)` | `background: var(--surface)` |
| `background: rgba(white, 5-10%)` | `background: var(--surface-2)` |
| `border: 1px solid rgba(white, 8%)` | `border: var(--border-w) solid var(--border)` |
| `border-radius: 8px` | `border-radius: var(--radius-sm)` |
| `border-radius: 12px` | `border-radius: var(--radius)` |
| `font-family: 'Inter'` | `font-family: var(--font-body)` |
| Any monospace family | `font-family: var(--font-mono)` |
| Any serif headline family | `font-family: var(--font-display)` |
| Custom box-shadow | `box-shadow: var(--shadow)` or `var(--shadow-sm)` |

Run a regex sweep:

```bash
rg --type css '#[0-9a-fA-F]{3,6}\b' src/ \
  | grep -v 'design-system.css' \
  | grep -v 'design-system.js'
```

Every match is a candidate.

### Phase 7 · Verify in all 5 systems

Open your site. Cycle through:

```js
applyDesignSystem('editorial', 'crimson');
applyDesignSystem('terminal', 'matrix');
applyDesignSystem('geist', 'cyan');
applyDesignSystem('brutalist', 'amber');
applyDesignSystem('swiss', 'orange');
```

Each should look **deliberately different**, not broken. If something
looks the same in all five, you've left a hardcoded value somewhere.

### Phase 8 · Add the picker UI (optional)

If you want users to switch:

```html
<div class="system-picker" style="position: fixed; bottom: 20px; right: 20px; padding: 12px; background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius); display: flex; gap: 6px; z-index: 50;">
  <button class="btn ghost" data-sys="editorial">Editorial</button>
  <button class="btn ghost" data-sys="terminal">Terminal</button>
  <button class="btn ghost" data-sys="geist">Geist</button>
  <button class="btn ghost" data-sys="brutalist">Brutalist</button>
  <button class="btn ghost" data-sys="swiss">Swiss</button>
</div>

<script>
  document.querySelectorAll('[data-sys]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.sys;
      const acc = localStorage.getItem('ds-accent') || SYSTEM_DEFAULT_ACCENT[id];
      localStorage.setItem('ds-system', id);
      localStorage.setItem('ds-accent', acc);
      applyDesignSystem(id, acc);
    };
  });
</script>
```

For something fancier (sliders, color swatches, draggable panel), copy
`tweaks-panel.jsx` and customize the controls.

### Phase 9 · Run the launch checklist

Open `docs/18-launch-checklist.md` and run through every box. Don't ship
until they all pass.

---

## 6 · Common pitfalls

### Pitfall 1: The flash of unstyled theme

**Symptom:** Page loads as Editorial+Crimson for a frame, then settles
into the user's chosen system.

**Cause:** `applyDesignSystem` is running in a deferred script (e.g.
React `useEffect`, ES module import) instead of synchronously in `<head>`.

**Fix:** Move the boot call to a sync inline `<script>` in `<head>` after
loading `design-system.js`.

### Pitfall 2: Components look the same in every system

**Symptom:** Switching systems changes colors but not edges, type, or
shadow personality.

**Cause:** Your component CSS is hardcoded — not using tokens.

**Fix:** Replace hex codes and px values with `var(--*)`. See Phase 6.

### Pitfall 3: Brutalist looks broken

**Symptom:** In Brutalist, buttons have 2px borders but no offset shadow.

**Cause:** You stripped `[data-system="brutalist"]` selectors from
`styles.css`. The skin block at the bottom of the file is **not**
optional.

**Fix:** Keep the entire `PER-SYSTEM SKINS` block (lines ~651-678 of
`styles.css`). It's where the personality lives beyond tokens.

### Pitfall 4: `color-mix()` doesn't work

**Symptom:** Buttons and chips look gray on certain browsers.

**Cause:** `color-mix()` requires Chrome 111+, Firefox 113+, Safari 16.2+.

**Fix:** Either bump your browser support floor, or write a build-time
expander that resolves `color-mix()` expressions into explicit rgba
values for the active accent.

### Pitfall 5: Tokens leak between system switches

**Symptom:** Switching from Editorial to Brutalist, but Editorial's
radius is still in effect on some elements.

**Cause:** Probably never happens — `applyDesignSystem` actively clears
prior keys. **But** if you ever set tokens directly with
`document.documentElement.style.setProperty` outside of the applier, that
bypasses the clearing.

**Fix:** Always set system-level tokens via `applyDesignSystem`. Never
set them by hand.

### Pitfall 6: `--accent` is undefined in print/PDF/email

**Symptom:** Exported PDFs render with `currentColor` or transparent
where accent should be.

**Cause:** The applier runs in JS; SSR / static export doesn't trigger it.

**Fix:** For SSR, write the chosen system + accent to `<html data-system
data-accent>` on the server, and ship a pre-built `themes.css` that
declares tokens scoped by attribute. See
`docs/14-integration-nextjs.md#no-fout`.

---

## 7 · How to **extend** the system

### Add a new system

1. Open `design-system.js`.
2. Copy the entire `editorial` entry; rename the key.
3. Edit all ~30 token values. **Edit all of them** — don't omit any.
4. Pick a smart accent default and add it to `SYSTEM_DEFAULT_ACCENT`.
5. (Optional) add a `[data-system="your-id"]` skin block in
   `styles.css` for anything structural.
6. Test by calling `applyDesignSystem('your-id', 'cyan')` in DevTools.

### Add a new accent

1. Open `design-system.js`.
2. Add an object to `ACCENTS`:
   ```js
   { id: 'teal', name: 'Teal', primary: '#14b8a6', secondary: '#5eead4' }
   ```
3. Verify it passes 4.5:1 against `#000`.
4. (Optional) update `SYSTEM_DEFAULT_ACCENT` for any system that should
   default to this accent.

### Add a new token

1. Decide whether it belongs in the contract (used by ≥2 components) or as
   a one-off (used by one).
2. If contract: add it to **every** system's `vars` dict. Update
   `docs/04-tokens.md`.
3. Reference it via `var(--your-token)` in `styles.css`.

### Add a new component

1. Write the rule in `styles.css`. **Reference tokens exclusively.**
2. If a system needs a structural override, add a `[data-system="…"]`
   selector in the skin block.
3. Document the class in `docs/10-components.md`.

---

## 8 · Files to leave behind

When you port to a new project, **do not bring these**:

- `index.html`, `index.standalone.html` — demo entry; you have your own.
- `app.jsx`, `layout.jsx`, `home-layouts.jsx`, `pages*.jsx`,
  `views-*.jsx`, `admin.jsx`, `data.js` — demo content.
- `design-system.html`, `design-system-showcase.jsx`,
  `design-system-anatomy.jsx` — demo showcase (the showcase is content,
  not the system).
- `docs.html`, `docs.jsx`, `docs-content-*.jsx` — the interactive HTML
  docs. **Bring `docs/*.md` instead** — those are the portable spec.

You're left with **two files** (`styles.css` + `design-system.js`) plus
**one folder** (`docs/`). That's the system.

---

## 9 · How to read the rest of the docs

After this file, read in this order. Each is 200-400 lines and stands
alone.

| Path | When to read |
|------|--------------|
| `docs/README.md` | Skim — it's the index. |
| `docs/01-overview.md` | What this is + what it's not. |
| `docs/02-principles.md` | The six rules. Internalize these. |
| `docs/03-getting-started.md` | The 3-step install. Walk through it. |
| `docs/04-tokens.md` | Every token, what it controls. Reference doc. |
| `docs/05-theming.md` | The apply protocol + no-flash boot. |
| `docs/06-typography.md` | Per-system type stack + scale + rules. |
| `docs/07-color.md` | Ink ladder, accent palette, status colors. |
| `docs/08-spacing-layout.md` | 4px scale, page widths, breakpoints. |
| `docs/09-motion.md` | Durations, easings, live atoms. |
| `docs/10-components.md` | Every class, API, anatomy. |
| `docs/11-patterns.md` | Flow diagrams, page templates, density. |
| `docs/12-integration-html.md` | Static HTML / Eleventy / Hugo / MkDocs. |
| `docs/13-integration-react.md` | Provider + hooks for plain React. |
| `docs/14-integration-nextjs.md` | App Router + zero-flash SSR. |
| `docs/15-integration-vue.md` | Vue 3 + Nuxt. |
| `docs/16-migration.md` | Strangler / big-bang / fresh-layer strategies. |
| `docs/17-accessibility.md` | Contrast, focus, motion, ARIA. |
| `docs/18-launch-checklist.md` | The final pre-ship gate. |

---

## 10 · A worked example — porting to a Next.js 14 app

Concrete, end-to-end:

### 10.1 Copy the files

```bash
cp styles.css            target-app/styles/design-system.css
cp design-systems.jsx    target-app/lib/design-system.js
cp -r docs/              target-app/docs/
```

### 10.2 Add TS types

`target-app/lib/design-system.d.ts`:

```ts
export type SystemId = 'editorial' | 'terminal' | 'geist' | 'brutalist' | 'swiss';
export type AccentId =
  | 'crimson' | 'magenta' | 'orange' | 'amber' | 'emerald'
  | 'matrix' | 'cyan' | 'violet' | 'lime' | 'rose';

declare global {
  interface Window {
    DESIGN_SYSTEMS: Record<SystemId, { name: string; tag: string; desc: string; vars: Record<string, string> }>;
    ACCENTS: { id: AccentId; name: string; primary: string; secondary: string }[];
    SYSTEM_DEFAULT_ACCENT: Record<SystemId, AccentId>;
    applyDesignSystem: (s: SystemId, a: AccentId) => void;
  }
}
export {};
```

### 10.3 Boot in `app/layout.tsx`

```tsx
import './globals.css';                       // your own
import '@/styles/design-system.css';          // our system
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const inlineBoot = `
(function () {
  var SD = { editorial:'crimson', terminal:'matrix', geist:'cyan', brutalist:'amber', swiss:'orange' };
  try {
    var s = localStorage.getItem('ds-system') || 'editorial';
    var a = localStorage.getItem('ds-accent') || SD[s];
    document.documentElement.setAttribute('data-system', s);
    document.documentElement.setAttribute('data-accent', a);
  } catch (e) {}
})();`;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital@0;1&family=Inter:wght@400;500;600&family=JetBrains+Mono&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: inlineBoot }} />
      </head>
      <body>
        <div className="page">
          <div className="grain" />
          {children}
        </div>
        <Script src="/lib/design-system.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
```

### 10.4 Build the themes.css for zero flash

```js
// scripts/build-themes.mjs (run prebuild)
import { writeFileSync } from 'node:fs';
import vm from 'node:vm';
import fs from 'node:fs';

// Evaluate the JS file in a Node sandbox to read the globals.
const code = fs.readFileSync('./lib/design-system.js', 'utf8');
const ctx = { window: {}, document: { documentElement: {} } };
vm.createContext(ctx);
vm.runInContext(code, ctx);
const { DESIGN_SYSTEMS, ACCENTS } = ctx.window;

let css = '';
for (const [id, sys] of Object.entries(DESIGN_SYSTEMS)) {
  css += `[data-system="${id}"] {\n`;
  for (const [k, v] of Object.entries(sys.vars)) css += `  ${k}: ${v};\n`;
  css += `}\n\n`;
}
for (const a of ACCENTS) {
  css += `[data-accent="${a.id}"] { --accent: ${a.primary}; --accent-2: ${a.secondary}; }\n`;
}
writeFileSync('./styles/themes.css', css);
```

```json
// package.json
{
  "scripts": {
    "prebuild": "node scripts/build-themes.mjs",
    "build": "next build"
  }
}
```

Import `themes.css` in `layout.tsx`. Now `data-system="terminal"` flips
all tokens via pure CSS — no JS race.

### 10.5 Use components

```tsx
// app/page.tsx (server component — no client JS needed for layout)
export default function Page() {
  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 40px' }}>
      <div className="eyebrow">── INDEX</div>
      <h1 className="display-h" style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>
        Resources
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        <article className="card hoverable">
          <h3>FFmpeg</h3>
          <p style={{ color: 'var(--text-2)' }}>Cross-platform A/V toolchain.</p>
        </article>
      </div>
    </main>
  );
}
```

### 10.6 Add the picker (client component)

```tsx
'use client';
import { useEffect } from 'react';

export function SystemPicker() {
  useEffect(() => {
    // Pre-script set the attributes; tokens already in themes.css.
    // Only thing left to do client-side: persist on change.
  }, []);

  function pick(id: string) {
    const sd: Record<string, string> = {
      editorial: 'crimson', terminal: 'matrix',
      geist: 'cyan', brutalist: 'amber', swiss: 'orange',
    };
    const acc = localStorage.getItem('ds-accent') || sd[id];
    localStorage.setItem('ds-system', id);
    localStorage.setItem('ds-accent', acc);
    document.documentElement.setAttribute('data-system', id);
    document.documentElement.setAttribute('data-accent', acc);
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {['editorial','terminal','geist','brutalist','swiss'].map(id => (
        <button key={id} className="btn ghost" onClick={() => pick(id)}>
          {id}
        </button>
      ))}
    </div>
  );
}
```

Done. Five-personality theming, zero flash, SSR-safe.

---

## 11 · TL;DR for an AI agent on a fresh project

If you're an AI agent reading this for the first time and you need to
apply the system to a new site **right now**:

1. Copy these two files into the project: `styles.css`,
   `design-systems.jsx` (rename the latter to `design-system.js`).
2. Copy the `docs/` folder for reference.
3. In the project's root HTML / layout, add the fonts link, the
   `<link rel="stylesheet" href="design-system.css">`, the
   `<script src="design-system.js"></script>`, and a synchronous
   `<script>applyDesignSystem('editorial', 'crimson')</script>` — all in
   `<head>`.
4. Wrap the app body in `<div class="page"><div class="grain"></div>…</div>`.
5. Replace existing components with the class API:
   `.btn` / `.btn.primary` / `.card` / `.card.hoverable` / `.chip` /
   `.eyebrow` / `.tabs` / `.field` + `.input` etc.
6. Run a regex sweep for hardcoded hex/px values; replace with tokens
   (see Phase 6 table above).
7. Cycle through all five systems via DevTools or a picker; fix anything
   that doesn't visibly change.
8. Run the launch checklist in `docs/18-launch-checklist.md`.

If the user said *"keep it simple, just pick one system"* — apply the
above but only ship that system's tokens and skin block. Delete the other
four from `design-system.js`. You'll lose the switcher but cut the system
to its smallest viable form (~6KB CSS + ~1KB JS).

---

**End of HANDOFF.**

Questions? Read the numbered docs in `/docs`. Need to ship? Run
`docs/18-launch-checklist.md`. Need to convince stakeholders?
`docs/01-overview.md` + `docs/02-principles.md`.
