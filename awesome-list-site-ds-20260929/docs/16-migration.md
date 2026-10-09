# 16 · Migrating an existing site

> Incremental adoption. Move one page, one component, one screen at a time.

## When to migrate

Good candidates:

- You're already shipping **dark mode** and want to make it dramatic.
- You have a **content directory / reference / index** style of product.
- You want to give power users a **theme picker** without rebuilding everything.

Bad candidates:

- A consumer marketing site with brand colors — this system is
  intentionally dark-only and accent-disciplined. Force it to be lavender
  on cream and it'll resist you.
- A complex SaaS dashboard with 200 bespoke components — porting them all is
  expensive. (You *can* port progressively; see "Strangler pattern" below.)

## Three migration strategies

### A. Strangler — one page at a time

Best for large apps. Migrate route-by-route.

1. Add `styles.css` and `design-systems.js` to your project.
2. On the new route, wrap the page in a `<div data-ds>` and apply the
   system to that subtree. Use a scoped stylesheet that only applies to
   descendants of `[data-ds]`:

   ```css
   [data-ds] .btn { /* ... */ }
   /* etc. — but easier: just don't import styles.css globally;
      instead inline its rules under a [data-ds] parent */
   ```
3. Replace the existing buttons / cards / inputs with design-system classes.
4. Repeat per route until everything's migrated.

The pain point: token names will collide if your existing CSS uses
`--bg`, `--text`, etc. Namespace ours to `--ds-bg`, `--ds-text` during
the migration. After all routes are ported, rename back.

### B. Big-bang — all at once

Best for small apps (<20 routes). Cheaper if you can afford a day or two of
disruption.

1. Drop both files in.
2. Search-replace your CSS:
   - `color: #ffffff` → `color: var(--text)`
   - `background: #1a1a1a` → `background: var(--surface)`
   - `border: 1px solid #333` → `border: var(--border-w) solid var(--border)`
3. Rename your existing button/card classes to `.btn`/`.card` or wrap
   them with both classes during transition.
4. Call `applyDesignSystem` in your entry script.

### C. Fresh layer — additive only

Best when you can't touch the existing site.

1. Add `<div class="ds-zone">` around new sections.
2. Style only inside `.ds-zone`:

   ```css
   .ds-zone { /* import the relevant subset of styles.css here */ }
   ```

3. Use the design system in those zones only. The rest of the site is
   untouched.

This works for embedded widgets, marketing pages added to a legacy app, or
docs sites bolted onto an old SaaS.

## A migration script

For Strangler / Big-bang, a quick search-replace helper:

```bash
# Find color hardcodes you should replace
rg --type css '#(f|F)(f|F){2,5}|rgb\(' src/

# Find border-radius / border-width hardcodes
rg --type css 'border-radius:|border-width:' src/
```

Each hit is a candidate for a token replacement. Use this checklist:

| If you see… | Replace with… |
|-------------|---------------|
| `#000`, `#0a0a0a` (page bg) | `var(--bg)` or `var(--bg-2)` |
| `#fff`, `#f4f3ee` (text) | `var(--text)` |
| Any rgba white 60-70% | `var(--text-2)` |
| Any rgba white 35-45% | `var(--text-3)` |
| Any rgba white 5-10% (surface) | `var(--surface)` |
| Any rgba white 10-15% (surface hover) | `var(--surface-2)` |
| Any rgba white 8% border | `var(--border)` |
| Any rgba white 16%+ border | `var(--border-strong)` |
| `1px solid` | `var(--border-w) solid` |
| `border-radius: 8px` | `var(--radius-sm)` |
| `border-radius: 12px` | `var(--radius)` |
| `font-family: 'Inter'` | `var(--font-body)` |
| Any monospace family | `var(--font-mono)` |

After the replace, run your test suite, then pick a system and look. The
first compile will look weird (Editorial probably won't match your
existing brand). Switch through all five — odds are one of them is close.

## Mapping existing brand colors

If you have a brand accent, treat it as a custom accent:

```js
// Extend the ACCENTS array
window.ACCENTS.push({
  id: 'mybrand',
  name: 'Brand',
  primary: '#7c5cff',
  secondary: '#a78bff',
});

applyDesignSystem('editorial', 'mybrand');
```

The accent palette is just an array — extend it as needed. Verify
contrast against `--bg: #000` before shipping (see
**[17-accessibility](./17-accessibility.md)**).

## Mapping existing fonts

If your brand font is required, override the type tokens for a specific
system:

```js
window.DESIGN_SYSTEMS.editorial.vars['--font-display'] = "'YourBrandSerif', Georgia, serif";
window.DESIGN_SYSTEMS.editorial.vars['--font-body']    = "'YourBrandSans', system-ui, sans-serif";
```

Apply that after the systems are imported but before the first
`applyDesignSystem` call. Now Editorial uses your fonts. Other systems
remain themselves.

## Adding a light mode

This system is dark-only on purpose. To add a light mode, define a sixth
system:

```js
window.DESIGN_SYSTEMS.editorial_light = {
  name: 'Editorial Light',
  tag: 'Print · Fraunces',
  desc: 'Editorial on cream — for print/PDF/marketing.',
  vars: {
    '--bg': '#faf9f5',
    '--bg-2': '#f4f3ee',
    '--surface': 'rgba(0,0,0,0.025)',
    '--surface-2': 'rgba(0,0,0,0.05)',
    '--text': '#0a0a0a',
    '--text-2': 'rgba(10,10,10,0.7)',
    '--text-3': 'rgba(10,10,10,0.4)',
    '--text-4': 'rgba(10,10,10,0.22)',
    '--border': 'rgba(0,0,0,0.08)',
    '--border-strong': 'rgba(0,0,0,0.16)',
    /* … same display + radius + shadow tokens … */
  },
};
```

This route works fine but is a different design system in the abstract.
Be intentional about whether the dark and light systems should feel like
siblings (same fonts, same edges) or distinct identities (different).

## Removing the original CSS

After migration, you almost certainly have orphan CSS rules that nobody
references anymore. Find them:

```bash
# Cards we replaced
rg --type css '\.old-card-class\b' src/
```

If empty, delete the rule. Repeat per class.

A weekend of this leaves a codebase that's pure design-system + page
layout, no legacy chrome.

---

**Next:** **[17 · Accessibility →](./17-accessibility.md)**
