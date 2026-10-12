# 05 · Theming & switching

> How systems are stored, applied, persisted, and swapped without a flash.

## The applier

```js
applyDesignSystem(systemId, accentId);
```

Effects, in order:

1. Looks up `DESIGN_SYSTEMS[systemId]`. Falls back to `editorial` if unknown.
2. Removes every token that was set by the previous call (so swaps are
   clean — no stale Editorial radii sneaking into your Geist page).
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
/* Editorial: italic display accents and eyebrows take the accent */
[data-system="editorial"] .display-h em,
[data-system="editorial"] .serif-italic { color: var(--accent); }
[data-system="editorial"] .eyebrow { color: var(--accent); font-weight: 700; }

/* Geist: quiet sentence-case chips in the body face */
[data-system="geist"] .btn { font-weight: 500; }
[data-system="geist"] .chip {
  text-transform: none;
  letter-spacing: 0;
  font-family: var(--font-body);
  font-weight: 500;
}
```

These are the *only* place hex codes / px values can live outside
`design-systems.js`. Even there, prefer `var(--text)` etc. when possible.

## Persistence

Store user picks in `localStorage`:

```js
localStorage.setItem('ds-system', 'geist');
localStorage.setItem('ds-accent', 'cyan');
```

(In awesome.video the keys are `ds-system` and `ds-accent` — pick a
namespace and stick with it.)

Only two systems exist: `editorial` (the default) and `geist`. A stored id
that is no longer offered (awesome.video once shipped a larger set) must
resolve to the default pair (Editorial × Crimson) in the pre-paint boot, and the boot rewrites storage so the next
visit is clean. Signed-in preferences saved on a removed system are
rewritten to the same default on the server.

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
  geist:     'cyan',
};
```

This is purely UX: when a user picks a system without specifying an accent
(first visit, or "reset" action), we move them to the system's natural
color so the first impression isn't wrong. After that, accent + system are
independent — if the user picks Violet on Editorial, switching to Geist
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
document.getElementById('geist-btn').onclick = () =>
  applyDesignSystem('geist', 'cyan');
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
    <aside data-system="geist" style="…">
      <button class="btn primary">Run</button>
      <!-- this button is Geist-styled,
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
