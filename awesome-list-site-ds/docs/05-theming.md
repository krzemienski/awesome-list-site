# 05 · Theming & switching

> How systems are stored, applied, persisted, and swapped without a flash.

## The applier

```js
applyDesignSystem(systemId, accentId);
```

Effects, in order:

1. Looks up `DESIGN_SYSTEMS[systemId]`. Falls back to `editorial` if unknown.
2. Removes every token that was set by the previous call (so swaps are
   clean — no stale Editorial radii sneaking into your Terminal page).
3. Writes the new system's tokens onto `:root`.
4. Looks up `ACCENTS.find(a => a.id === accentId)`. Falls back to
   `ACCENTS[0]` (crimson).
5. Writes `--accent` and `--accent-2`.
6. Sets `data-system="<systemId>"` and `data-accent="<accentId>"` on
   `<html>`.

That last step is what makes the per-system component skins activate.

## The data-system attribute

Tokens cover ~90% of system differences. The remaining 10% — *things you
can't express as a single value* — live as `[data-system="…"]` attribute
selectors in `styles.css`:

```css
/* Terminal: bracket every chip */
[data-system="terminal"] .chip::before { content: '['; }
[data-system="terminal"] .chip::after  { content: ']'; }

/* Brutalist: hard offset shadow on hover */
[data-system="brutalist"] .card.hoverable:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 0 var(--text);
}

/* Swiss: replace the box-shadow on hover with a color change */
[data-system="swiss"] .card.hoverable:hover {
  box-shadow: none;
  border-color: var(--text-3);
  transform: none;
}
```

These are the *only* place hex codes / px values can live outside
`design-systems.js`. Even there, prefer `var(--text)` etc. when possible.

## Persistence

Store user picks in `localStorage`:

```js
localStorage.setItem('ds-system', 'terminal');
localStorage.setItem('ds-accent', 'matrix');
```

(In awesome.video we use the keys `av-ds-system` and `av-ds-accent` — pick a
namespace and stick with it.)

## Preventing the flash

The number-one mistake: calling `applyDesignSystem` from a deferred / module
script. By the time it runs, the page has already painted with the default
tokens, and the user sees a 200ms flash before your theme settles.

**Fix:** call it in a synchronous inline script in `<head>`, **after**
`design-systems.js` but **before** any stylesheet that depends on tokens
(actually it doesn't matter for stylesheets — tokens take effect on the next
render — but doing it in `<head>` guarantees first-paint correctness).

```html
<head>
  …
  <link rel="stylesheet" href="styles.css">
  <script src="design-systems.js"></script>
  <script>
    /* sync — runs before first paint */
    const sys = localStorage.getItem('ds-system') || 'editorial';
    const acc = localStorage.getItem('ds-accent')
              || SYSTEM_DEFAULT_ACCENT[sys];
    applyDesignSystem(sys, acc);
  </script>
</head>
```

In Next.js / SSR contexts, see
**[14-integration-nextjs](./14-integration-nextjs.md#no-fout)** for the same
recipe expressed as a `<Script strategy="beforeInteractive">` or a custom
`<head>` injection.

## Smart accent defaults

Each system declares a natural default accent in `SYSTEM_DEFAULT_ACCENT`:

```js
window.SYSTEM_DEFAULT_ACCENT = {
  editorial: 'crimson',
  terminal:  'matrix',
  geist:     'cyan',
  brutalist: 'amber',
  swiss:     'orange',
};
```

This is purely UX: when a user picks a system without specifying an accent
(first visit, or "reset" action), we move them to the system's natural
color so the first impression isn't wrong. After that, accent + system are
independent — if the user picks Violet on Editorial, switching to Brutalist
keeps Violet.

The recommended interaction:

```js
function selectSystem(id) {
  // What's currently stored?
  const currentAccent = localStorage.getItem('ds-accent');
  // What was the previous system's natural?
  const prevSys = localStorage.getItem('ds-system');
  const prevNatural = SYSTEM_DEFAULT_ACCENT[prevSys];

  // Only auto-shift accent if the user hadn't manually changed it.
  let nextAccent = currentAccent;
  if (!currentAccent || currentAccent === prevNatural) {
    nextAccent = SYSTEM_DEFAULT_ACCENT[id];
  }

  localStorage.setItem('ds-system', id);
  localStorage.setItem('ds-accent', nextAccent);
  applyDesignSystem(id, nextAccent);
}
```

## Switching at runtime

Once everything's wired, swaps are trivial:

```js
document.getElementById('terminal-btn').onclick = () =>
  applyDesignSystem('terminal', 'matrix');
```

The whole page reshapes in a single frame because CSS variables are
inherited and `data-system` triggers attribute selectors in the same render
pass.

## Per-component themes (advanced)

You can scope a system to a region by setting `data-system` on a descendant
element instead of `<html>`. Tokens are inherited via the cascade, so
anything inside that region will use that system's tokens — *but* the
attribute selectors in `styles.css` use `[data-system="x"] .thing`, which
matches any `.thing` *descended from* an element with that attribute. So
per-region theming works automatically:

```html
<html data-system="editorial">
  <body>
    <main>…editorial content…</main>
    <aside data-system="terminal" style="…">
      <button class="btn primary">RUN</button>
      <!-- this button is Terminal-styled,
           even though the page is Editorial -->
    </aside>
  </body>
</html>
```

> **CAVEAT:** Tokens on `<html>` set by `applyDesignSystem` *still apply*
> globally. To fully scope, also set the same tokens on the `aside` via
> inline `style="--bg:…;--text:…;"` or by adding a class with those
> overrides. Most apps don't need this — page-level swaps are enough.

---

**Next:** **[06 · Typography →](./06-typography.md)**
