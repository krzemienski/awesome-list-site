# SKILL · Verify Design-System Compliance

> **Use this skill when:** a user asks "is this page using our design system
> correctly?", "audit my site against the DS", "did I apply the system
> right?", or you're about to ship a page that should be DS-compliant.
>
> **What it does:** runs a deterministic 11-stage audit against the
> Awesome.Video Design System contract and produces a single verdict
> (PASS / FIX / FAIL) plus a numbered fix-list ranked by severity.
>
> **What it isn't:** a visual reviewer. This is structural/contract. Visual
> taste is in `docs/DESIGN-SYSTEM.md` §8.

**Know your target before you start.** There are two kinds of surface, with
different mechanics but one contract:

1. **The shipped app** (`client/`) — consumes the DS through **shadcn
   primitives + the Tailwind bridge** (`client/src/index.css`), with
   per-system skins keyed on data hooks (`data-ds-variant`, `data-ds="chip"`,
   `data-ds="card-hover"`). There is **no** `design-systems.js` script tag and
   almost no raw `.btn`/`.input` usage — that is correct, not a violation.
2. **Standalone HTML artifacts** (exports, mockups, one-pagers) — load
   `design-system.css` via `<link>` (or inline tokens) and may use the raw DS
   classes (`.btn`, `.chip`, `.card`) directly, per `docs/AGENTS.md` §5.

The consumption contract is `docs/AGENTS.md`; the token catalog is
`docs/DESIGN-SYSTEM.md`. Audit against those, not against the retired handoff
prototype.

---

## How to invoke this skill

1. Confirm you can see the target files. For the app, that's
   `client/index.html`, `client/src/index.css`,
   `client/src/styles/design-system.css`, and the page's components. For a
   standalone artifact, its HTML plus any CSS it references.
2. Run the **11 audit stages** below, in order. Don't skip ahead.
3. For each finding, tag with severity: 🔴 **BLOCK**, 🟡 **FIX**, 🟢 **NIT**.
4. At the end, produce the **verdict block** (template at the bottom).

If any 🔴 BLOCK fails, the verdict is **FAIL** — the page is not DS-compliant.
If only 🟡 or 🟢 fail, the verdict is **FIX**. All green → **PASS**.

Formal audits verify the shipped default (Editorial + Crimson) per
`replit.md`; stage 11 cycles the other four systems.

---

## Stage 1 · Are the system files even loaded?

**Severity if missing: 🔴 BLOCK**

**In the app**, the load path is:

- [ ] **CSS:** `client/src/styles/design-system.css` is imported at the **top**
  of `client/src/index.css` (foundation order — it must precede the Tailwind
  layers or the bridge resolves against nothing). Vite bundles it; in dev it
  arrives as an injected `<style>` tag, so do **not** expect a
  `<link rel="stylesheet">` in the served HTML.
- [ ] **JS:** `client/src/lib/design-system.ts` mirrors the definitions onto
  `window.DESIGN_SYSTEMS`, `window.ACCENTS`, `window.SYSTEM_DEFAULT_ACCENT`,
  and `window.applyDesignSystem` at module load — there is no
  `design-systems.js` script tag, and its absence is not a finding.

**In a standalone artifact**, expect a `<link>` to a stylesheet containing the
`:root { --bg: …; }` token block (or the tokens inlined), per
`docs/AGENTS.md` §5.

**How to verify in DevTools (both targets):**
```js
typeof window.applyDesignSystem === 'function'  // → true (app; artifacts may omit JS)
Object.keys(window.DESIGN_SYSTEMS).length        // → 5
window.ACCENTS.length                            // → 10
getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()  // → '#000000' or '#000'
```

If `--bg` is empty, the stylesheet isn't loaded (or loads after something
that clobbers it). Stop the audit and report.

---

## Stage 2 · Is a system actually applied?

**Severity if missing: 🔴 BLOCK**

```js
document.documentElement.getAttribute('data-system')  // → 'editorial' | 'terminal' | 'geist' | 'brutalist' | 'swiss'
document.documentElement.getAttribute('data-accent')  // → one of 10 accent ids
getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()  // → '#000000' or '#000'
```

All three must resolve.

In the app the attributes are set by the pre-paint boot script in
`client/index.html` (stage 3), **not** by `applyDesignSystem()` — that
function only runs when the user switches themes. If the attributes are
missing, the boot script was removed or errored.

---

## Stage 3 · Is the boot synchronous? (No-FOUC check)

**Severity if deferred: 🟡 FIX**

`data-system` / `data-accent` must be on `<html>` **before first paint**.

✅ **Good** — the app's pattern (inline synchronous `<script>` in
`client/index.html`): reads localStorage keys `ds-system` / `ds-accent`
(plus `ds-font-override`), validates against **inline** system/accent ID
lists, falls back to Editorial + Crimson, and sets the attributes before any
module loads. The inline ID lists and font map are hand-synced with
`client/src/lib/design-system.ts` / `font-options.ts` — flag drift between
them.

❌ **Bad** — applying the system from a deferred/module script or inside a
React `useEffect` (runs after first paint → theme flash), or an inline boot
that depends on `window.applyDesignSystem` (which only exists after module
load).

New HTML entry points must copy the `client/index.html` boot pattern —
FOUC-free boot is non-negotiable (`docs/AGENTS.md` §5).

---

## Stage 4 · Is the page chrome present?

**Severity if missing: 🟡 FIX**

```js
document.querySelector('.page')   // → element
document.querySelector('.grain')  // → element
```

In the app, `MainLayout` renders both — every in-app page inherits them.
Standalone artifacts must render their own. Without `.page`, the system's
atmosphere (`--bg-atmosphere` radial/scanline/grid) doesn't render. Without
`.grain`, the SVG noise overlay is absent — Brutalist and Terminal lose
their tactility.

Also flag per-page backgrounds that occlude the atmosphere
(`docs/AGENTS.md` §5).

---

## Stage 5 · Hardcoded value scan (the big one)

**Severity: 🟡 FIX per occurrence**

This is the most important stage. Every color, radius, shadow, and font must
resolve through a DS token — via bridged Tailwind utilities (`bg-card`,
`text-muted-foreground`, `rounded-lg`…), arbitrary-value token refs
(`bg-[var(--surface-3)]`), or DS component classes. See `docs/AGENTS.md` §1.

### How to run

```bash
# Hex colors in app code (excluding the DS sources of truth)
rg '#[0-9a-fA-F]{3,8}\b' client/src \
  --glob '!client/src/styles/design-system.css' \
  --glob '!client/src/index.css' \
  --glob '!client/src/lib/charts/palette.ts'

# Tailwind palette classes (bg-zinc-900, text-red-500, …) — forbidden
rg -n '\b(bg|text|border|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b' client/src

# Raw radii / borders that bypass the ladders
rg 'border(-radius)?:\s*\d+px|rounded-\[\d+px\]' client/src \
  --glob '!client/src/styles/design-system.css'

# Raw font-family strings
rg "font-family:\s*['\"]" client/src \
  --glob '!client/src/styles/design-system.css' \
  --glob '!client/index.html'
```

For standalone artifacts, run the same scans over the artifact's files,
excluding the design-system stylesheet itself.

### Acceptable hardcoded values

These pass — each is tagged `/* DS-OK: reason */` at its definition site:

- The global status constants `#34d08c` (ok) / `#ffb84d` (warn) / `#ff5c7a`
  (bad) — semantics, not theme.
- The on-accent inks `#000000` / `#0a0a0a` (text sitting on accent fills).
- `CHART_PALETTE` entries in `client/src/lib/charts/palette.ts` (recharts
  can't read CSS vars from prop strings).
- The bridge block in `client/src/index.css`.
- `[data-system="…"]` skin blocks inside
  `client/src/styles/design-system.css` — intentional per-system overrides.
- The hand-synced font map in the `client/index.html` boot script.
- `#000`/`#fff` in SVG elements that need fixed paint.

An untagged literal is a finding even if it happens to match a token value.
If you find a `/* DS-OK: … */` comment, skip it.

### Suggest fixes per occurrence

| If you see | Suggest |
|------------|---------|
| `color: #fff` (or near-white) | `text-foreground` / `color: var(--text)` |
| `color: rgba(255,255,255,0.66)` | `text-[color:var(--text-2)]` |
| `background: #14141a` | `bg-[var(--bg-2)]` |
| `background: rgba(255,255,255,0.05)` | `bg-card` / `bg-[var(--surface)]` |
| `border: 1px solid rgba(255,255,255,0.08)` | `border border-border` (bridge) |
| `border-radius: 12px` / `rounded-[12px]` | `rounded-lg` (→ `--radius`) |
| `border-radius: 8px` | `rounded-sm` (→ `--radius-sm`) |
| `rounded-full` on chips | `rounded-[var(--radius-pill)]` / Badge `chip` variant |
| `text-red-500`, `bg-zinc-900`, … | status constant or bridge utility |
| `font-family: 'Inter', sans-serif` | `font-sans` (→ `--font-body`) |
| `font-family: 'Fraunces'` | `font-display` / `.display-h` |
| `box-shadow: 0 6px 24px …` | `shadow-[var(--shadow)]` |

---

## Stage 6 · Component compliance (the app contract)

**Severity: 🟡 FIX per offending element**

The app never uses raw `.btn`/`.input`/`.chip` classes — shadcn primitives
from `@/components/ui/*` are pre-bridged, and per-system skins key on data
hooks emitted by those primitives:

| Hook | Emitted by | Meaning |
|---|---|---|
| `data-ds-variant="<variant>"` | every `Button` (and `AlertDialogAction`/`AlertDialogCancel`, which compose `buttonVariants()`) | button skins; primary extras target `default`/`outline` |
| `data-ds="chip"` | `Badge` variants `chip` / `accent` **only** | chip skins (Terminal brackets, Geist sentence case…) |
| `data-ds="card-hover"` | interactive cards (`ResourceCard`, `TaxonomyCard`, showcase specimens) | per-system hover (lift / glow / slab / color-only) |

### Button sweep

```js
const stray = [...document.querySelectorAll('button')].filter(b =>
  /* 1 · shadcn Button / buttonVariants() — skins hook on this */
  !b.hasAttribute('data-ds-variant') &&
  /* 2 · other shadcn/Radix primitives from @/components/ui
         (tabs, switch, checkbox, select, accordion, cmdk, carousel…) */
  !b.matches('[data-state], [data-radix-collection-item], [cmdk-item], [role="switch"], [role="checkbox"], [role="tab"], [role="combobox"]') &&
  !b.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper]') &&
  !(b.closest('[role="dialog"]') && b.querySelector('.sr-only')) && // Dialog/Sheet close ✕
  /* 3 · known composite chrome (verified compliant — list below) */
  !b.closest('.accordion-item') &&                        // AppSidebar taxonomy rows
  b.getAttribute('aria-label') !== 'Open search' &&       // AppHeader search chip
  !b.hasAttribute('aria-pressed') &&                      // facet/tag filter toggle rows
  !b.closest('[data-testid="active-filter-chips"]') &&    // active-filter removal chips
  !/^Remove .+ filter$/.test(b.getAttribute('aria-label') || '') && // ditto (advanced filter)
  !b.closest('[data-ds="card-hover"]') &&                 // in-card chrome (tag expanders)
  !['footer-cookie-settings',                             // small tokenized text buttons
    'button-clear-recent-searches',
    'button-dismiss-scrubbed-params'].includes(b.getAttribute('data-testid')) &&
  /* 4 · raw DS classes (standalone artifacts / showcase helpers) */
  ![...b.classList].some(c => /^(btn|tab|icon-btn)/.test(c))
);
stray  // → [] expected on the app's public routes; triage any hit with the ladder below
```

> **This filter is enforced automatically.** The `ds-button-sweep` validation
> gate runs this exact filter headlessly on the key public routes:
> `scripts/validation/ds-button-filter.mjs` is the executable copy of the
> snippet above, and `scripts/validation/ds-button-sweep.mjs` verifies the
> two stay literal-for-literal in sync (the gate fails on drift). If you
> change any exclusion here — including the known-composite-chrome list —
> update `ds-button-filter.mjs` in the same commit, and vice versa.

A remaining hit is an **automatic 🟡 FIX only if it carries palette classes,
literal hex/rgb colors, or raw radii** (cross-check with stage 5). A hit
styled entirely through bridge utilities / `var(--token)` refs is *candidate
composite chrome* — walk the ladder, and if it qualifies, add it to the
known list below instead of re-flagging it every run.

### Triage ladder for a hit — walk it before calling anything a violation

1. **Does it render from `@/components/ui/*`?** (trace via `data-testid` or
   React DevTools). shadcn primitives are compliant by construction — e.g.
   the Dialog close ✕. Not a finding.
2. **Is it on the known-composite-chrome list below?** Not a finding.
3. **Is it fully tokenized composite chrome?** A raw `<button>`/`<a>` is
   compliant when (a) its layout can't be expressed by the `Button`
   primitive (multi-part rows, pill with embedded `<kbd>`…), **and** (b)
   every color/border/radius resolves through bridge utilities or
   `var(--token)` refs, **and** (c) it keeps the global focus-visible ring
   and meets its target floor: **≥44px for standalone controls**, or the
   **≥24px text-link hit area** (`docs/AGENTS.md` §3) for inline
   text-link-style buttons (plain/underlined text inside banners, footers,
   list headers). If it merely duplicates a plain button role, suggest the
   primitive as a 🟢 NIT — not a FIX.
4. **Otherwise** it's a 🟡 FIX: rebuild on the primitive, or tokenize.

### Known composite chrome — recognized compliant, do NOT re-flag

- **AppSidebar taxonomy rows**
  (`client/src/components/layout/new/AppSidebar.tsx`): the accordion
  category/subcategory rows and their chevron disclosure buttons
  (`data-testid="toggle-cat-*"`, `"expand-sub-*"`), sub-item links, and the
  nav-error Retry button. Fully tokenized; a `Button` can't express these
  multi-part rows.
- **AppHeader search trigger chip**
  (`client/src/components/layout/new/AppHeader.tsx`,
  `aria-label="Open search"`): tokenized pill with embedded `<kbd>` hint.
- **Filter facet/tag toggle rows**
  (`client/src/components/search/SearchFilters.tsx`,
  `client/src/components/ui/advanced-filter.tsx`): full-width
  checkbox-style rows with counts, marked `aria-pressed`; tokenized
  (`hover:bg-muted`, `var(--accent)` refs, on-accent `text-black`).
- **Active-filter removal chips** — only render once a filter is applied,
  so sweep with a facet/tag active too: the chip strip inside
  `data-testid="active-filter-chips"` (`SearchFilters.ActiveFilters`,
  tokenized `var(--surface)`/`var(--border)`/`var(--accent)`, `min-h-11`)
  and the `aria-label="Remove <tag> filter"` chips in
  `advanced-filter.tsx` (bridge `bg-primary`, `min-h-11`).
- **In-card tag expanders** (`ResourceCard`'s "+N more",
  `data-testid="button-more-tags-*"`): inline text buttons inside
  `data-ds="card-hover"` cards.
- **Small tokenized text buttons** in DS-owned chrome — inline
  text-link-style controls that follow the ≥24px text-link hit-area floor
  (`docs/AGENTS.md` §3), not the 44px standalone floor:
  - the footer "Cookie settings" button (`MainLayout`,
    `data-testid="footer-cookie-settings"`, 44px),
  - the search dialog's "Clear" recent-searches button
    (`data-testid="button-clear-recent-searches"`, `min-h-6` = 24px),
  - the scrubbed-params banner Dismiss
    (`data-testid="button-dismiss-scrubbed-params"`, `min-h-8` = 32px —
    meets the text-link floor).

### Same idea for the rest

- **Inputs:** `<input>`/`<select>`/`<textarea>` should be the shadcn
  `Input`/`Select`/`Textarea` primitives (bridge classes like
  `border-input`). Raw `.input`/`.select` classes belong to standalone
  artifacts only.
- **Badges:** DS chips must be `Badge` variant `chip`/`accent` (emits
  `data-ds="chip"`). Admin status badges intentionally keep plain shadcn
  variants (`replit.md` MR-DS-13 #5) — not a finding. Per the canonical
  `.chip` → `Badge` mapping in `replit.md`, ANY `Badge` variant is the
  compliant primitive; the violation is a pill styled by hand on a raw
  `<span>`/`<div>`.
- **Cards:** any clickable/hoverable card carries `data-ds="card-hover"`.
- **Section labels:** mono uppercase eyebrows use `.eyebrow`.
- **Page titles:** `h1`s use `.display-h` (never `font-sans`/`font-medium`
  pinned on them).
- **Keyboard hints:** `.kbd`, or a fully tokenized `<kbd>` (the header's
  `/` hint is the reference).

The input/chip/card halves of this are enforced automatically by the same
`ds-button-sweep` gate as the button filter: the three snippets below have
executable copies in `scripts/validation/ds-button-filter.mjs`
(`collectStrayInputs` / `collectStrayChips` / `collectStrayCards`, between
the `STAGE6-INPUT-FILTER` / `STAGE6-CHIP-FILTER` / `STAGE6-CARD-FILTER`
markers), and the gate fails if the literals here and there drift apart.
Change both files in the same commit.

### Input sweep

```js
const stray = [...document.querySelectorAll('input, select, textarea')].filter(el =>
  /* 1 · shadcn Input / Textarea / SelectTrigger — bridge border classes */
  !el.classList.contains('border-input') &&
  !el.classList.contains('border-[var(--border-strong)]') &&
  /* 2 · primitives / non-text controls that legitimately wrap raw inputs */
  !el.matches('[cmdk-input], [type="hidden"], [type="checkbox"], [type="radio"], [type="range"], [type="file"]') &&
  !el.classList.contains('sr-only') &&                    // peer-hidden toggle inputs
  !el.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper]') &&
  /* 3 · known tokenized native controls (verified compliant — list below) */
  el.getAttribute('data-testid') !== 'select-subcategory-filter' && // TaxonomyListing scope filter
  /* 4 · raw DS classes (standalone artifacts / showcase helpers) */
  ![...el.classList].some(c => /^(input|select|textarea)$/.test(c))
);
stray  // → [] expected; triage hits with the stage-6 ladder above
```

Known tokenized native controls (the input analogue of the composite-chrome
list): the `TaxonomyListing` subcategory scope filter
(`data-testid="select-subcategory-filter"`) is a native `<select>` — fully
tokenized (`min-h-11 rounded-md border bg-background`), and shadcn's
`SelectTrigger` is a combobox `<button>`, so this native control keeps
plain-option semantics for its long, count-annotated option list.

### Chip sweep

```js
const chipShaped = (el) => {
  if (el.childElementCount > 2) return false;
  const text = (el.textContent || '').trim();
  if (!text || text.length > 40) return false;
  const s = getComputedStyle(el);
  const h = el.getBoundingClientRect().height;
  if (h === 0 || h > 40) return false;                    // chips are small
  if ((parseFloat(s.borderRadius) || 0) < h / 2 - 1) return false; // pill radius
  if (parseFloat(s.fontSize) > 13) return false;          // text-xs and below
  if (!/^(inline|flex)/.test(s.display)) return false;
  return s.backgroundColor !== 'rgba(0, 0, 0, 0)' ||      // filled or bordered
    (parseFloat(s.borderTopWidth) > 0 && s.borderTopColor !== 'rgba(0, 0, 0, 0)');
};
const stray = [...document.querySelectorAll('span, div, a')].filter(el =>
  chipShaped(el) &&
  /* 1 · DS chips — Badge chip/accent variants, skins hook on this */
  el.getAttribute('data-ds') !== 'chip' &&
  /* 2 · plain shadcn Badge variants — intentional divergence (MR-DS-13 #5) */
  !(el.classList.contains('rounded-full') && el.classList.contains('focus:ring-ring')) &&
  /* 3 · shadcn/Radix chrome that renders pill-shaped bits */
  !el.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper]') &&
  /* 4 · raw DS classes (standalone artifacts / showcase helpers) */
  !el.classList.contains('chip') &&
  !el.classList.contains('kbd')
);
stray  // → [] expected; a hit is a hand-rolled pill that skipped Badge
```

Exclusion 2 encodes MR-DS-13 #5 up front: plain-variant `Badge`s (admin
status badges, count badges, the difficulty/`View Details` chips) keep
shadcn styling by design — `rounded-full` + `focus:ring-ring` together are
the `badgeVariants` base signature, so anything built on the primitive is
excluded and only hand-styled pills remain.

### Card sweep

```js
const stray = [...document.querySelectorAll('*')].filter(el =>
  /* candidates: shadcn Card / bg-card surfaces */
  el.classList.contains('bg-card') &&
  /* interactive = clickable or link-wrapped (static cards are fine bare) */
  (getComputedStyle(el).cursor === 'pointer' ||
    !!el.closest('a, button') ||
    el.matches('[role="button"], [role="link"], [tabindex]:not([tabindex="-1"])')) &&
  /* 1 · the hook itself — per-system hover skins key on this */
  el.getAttribute('data-ds') !== 'card-hover' &&
  !el.closest('[data-ds="card-hover"]') &&                // inner bg-card bits of a hooked card
  /* 2 · shadcn/Radix chrome (popovers, dialogs, sidebar) */
  !el.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper], [role="dialog"]') &&
  /* 3 · raw DS classes (standalone artifacts / showcase helpers) */
  !el.classList.contains('card')
);
stray  // → [] expected; a hit is an interactive card missing data-ds="card-hover"
```

### Forbidden patterns

- ❌ Hand-rolled buttons, dialogs, dropdowns, or tabs that duplicate a shadcn
  primitive with their own colors (`.my-blue-btn`, `.action`).
- ❌ Hardcoded badges (`<span style="background: red">`, palette-class
  badges).
- ❌ Setting `data-ds` / `data-ds-variant` by hand on non-primitive elements
  to silence the audit — the hooks are emitted by the primitives.

### Intentional divergences — never flag (per `replit.md` MR-DS-13 #5)

- `secondary`/`ghost`/`destructive` buttons keep plain shadcn styling (skins
  only restyle `default`/`outline`).
- Non-DS admin badge variants.
- The BrandMark tile stays rounded in 0-radius systems (brand kit, not a
  radius bug).

---

## Stage 7 · The accent discipline check

**Severity: 🟡 FIX**

One accent moment per surface. Check the page for accent overuse:

```js
/* Find elements using --accent */
const all = [...document.querySelectorAll('*')];
const accentUsers = all.filter(el => {
  const s = getComputedStyle(el);
  const accent = getComputedStyle(document.documentElement)
                   .getPropertyValue('--accent').trim().toLowerCase();
  return [s.color, s.backgroundColor, s.borderColor].some(c =>
    c.toLowerCase().includes(accent.replace('#', '').slice(0, 6))
  );
});
accentUsers.length  // → should be small (≤8 per viewport-worth of content)
```

If you find accent applied to: random underlines, all chips, multiple
buttons, decorative borders — flag it. Accent is reserved for:

- Primary buttons (one per surface).
- Active nav indicator.
- Eyebrows.
- `.live-dot`, `.caret`, live indicators.
- Active tab underline.
- Focus rings, `::selection`.
- Key data points in charts; sparing `<em>` emphasis in display copy.

Anything else using accent is a violation.

---

## Stage 8 · Text contrast / ink tier check

**Severity: 🟡 FIX**

Body copy must not use `--text-3` or `--text-4`. Scan for:

```js
const paragraphs = document.querySelectorAll('p, li');
const text3 = getComputedStyle(document.documentElement)
                .getPropertyValue('--text-3').trim();
const offenders = [...paragraphs].filter(p =>
  getComputedStyle(p).color === text3 &&
  p.textContent.length > 60  /* long-form copy */
);
```

Each offender is a 🟡 FIX: bump to `--text-2`.

Tertiary tokens (`--text-3`, `--text-4`) are for **meta** (timestamps,
counts, captions), never body copy.

---

## Stage 9 · Font check

**Severity: 🟡 FIX**

Verify the active system's fonts actually loaded. Note the app's loading
model: **only Inter loads pre-paint** (`client/index.html`); the active
system's display/body faces and any font override load on demand via
`client/src/lib/font-options.ts`. So wait for loading to settle first:

```js
await document.fonts.ready;
const stack = getComputedStyle(document.documentElement)
                .getPropertyValue('--font-display').trim();
const family = stack.split(',')[0].replace(/['"]/g, '').trim();
document.fonts.check(`16px "${family}"`);  // → true
```

If false, the font failed to load. Check:
- `FONT_URLS` in `client/src/lib/font-options.ts` has an entry for the
  active system, and the family name in the URL matches the token's family.
- Network tab shows no 4xx on the font request.
- For standalone artifacts: the `<link
  href="https://fonts.googleapis.com/…">` includes that family.

Common miss: shipping Editorial but failing the Fraunces request; Fraunces
falls back to Georgia and the whole magazine vibe collapses.

---

## Stage 10 · Per-system skin blocks intact?

**Severity: 🔴 BLOCK**

Skins live in `client/src/styles/design-system.css` in **two parallel
forms**, and both must survive:

1. **Raw DS-class skins** (`[data-system="…"] .chip/.btn/.card…`) — for
   static surfaces and showcase helpers.
2. **Shadcn bridge skins** (`[data-system="…"] [data-ds-variant=…]`,
   `[data-ds="chip"]`, `[data-ds="card-hover"]`) — the same extras for the
   app's primitives.

Without them: Terminal chips lose their `[brackets]`, Brutalist cards lose
the `4px 4px 0 0` offset slab, Swiss falls back from hairlines to 1px
borders — the systems collapse to generic.

Verify by counting:

```bash
rg '\[data-system="(editorial|terminal|geist|brutalist|swiss)"\]' \
  client/src/styles/design-system.css | wc -l   # expected ≥ 60 (~80 today)

rg 'data-ds' client/src/styles/design-system.css | wc -l   # expected ≥ 15 (~25 today)
```

If either count is 0 or collapses, a skin layer was stripped during a
refactor. If only the second is low, shadcn primitives silently lose their
per-system extras even though raw-class skins look intact.

---

## Stage 11 · Switch test (live verification)

**Severity: 🔴 BLOCK if visible bugs**

The real test: cycle through all five systems. Run in DevTools (or cycle at
`/settings/theme` / `/design-system`):

```js
for (const id of ['editorial','terminal','geist','brutalist','swiss']) {
  applyDesignSystem(id, window.SYSTEM_DEFAULT_ACCENT[id]);
  /* visually inspect the page */
  /* take a screenshot if you have one available */
  await new Promise(r => setTimeout(r, 800));
}
```

Restore Editorial + Crimson when done — it's the shipped default.

What to look for:

| Symptom | Diagnosis | Fix |
|---------|-----------|-----|
| Page looks the same in all 5 | Components have hardcoded styles — Stage 5 was incomplete. | Re-run hardcoded-value scan, replace with tokens. |
| Some elements break only in Brutalist | Border-width token (`--border-w`) is being ignored — element has a hardcoded `1px` border. | Token-ize the border. |
| Square corners appear only in Terminal but not Brutalist | `--radius` token unused; element has hardcoded `border-radius`. | Replace with `rounded-lg`/`rounded-sm` or `var(--radius)`. |
| Chip brackets missing in Terminal on shadcn Badges | Bridge skins stripped, or the Badge isn't the `chip`/`accent` variant (no `data-ds="chip"`). | Stage 10 / Stage 6 fix. |
| Page looks black/empty | `--bg-atmosphere` not rendering — `.page` wrapper missing. | Stage 4 fix. |
| Font reverts to fallback | Family failed to load. | Stage 9 fix. |

---

## The verdict block

After running all 11 stages, emit this exact format:

```markdown
# Design-System Compliance Audit · <PAGE/SITE NAME>

**Verdict: PASS / FIX / FAIL**

System detected: `<editorial|terminal|geist|brutalist|swiss>` × `<accent-id>`
Files audited: <list>

## Findings

### 🔴 BLOCK (n)
1. <stage> — <description> → <fix>
2. …

### 🟡 FIX (n)
1. <stage> — <description> → <fix>
2. …

### 🟢 NIT (n)
1. <stage> — <description> → <fix>
2. …

## What's good
- <green checkmark list of stages that passed>

## Recommended next steps
1. <first thing to fix>
2. <second>
3. …
```

### Verdict thresholds

- **PASS** → zero BLOCK, zero FIX. Ship it.
- **FIX** → zero BLOCK, ≥1 FIX. Address before shipping but not blocking.
- **FAIL** → ≥1 BLOCK. Page is not DS-compliant; fix immediately.

NITs never gate. They're polish.

---

## Quick reference · the audit one-liners

If the user wants a fast smoke-test rather than the full audit, run these
five lines in DevTools. All five must be truthy:

```js
typeof window.applyDesignSystem === 'function'                          // 1. JS loaded
!!document.documentElement.getAttribute('data-system')                  // 2. system applied
!!getComputedStyle(document.documentElement).getPropertyValue('--bg')   // 3. tokens applied
!!document.querySelector('.page') && !!document.querySelector('.grain') // 4. chrome present
[...document.querySelectorAll('style')].some(s =>                       // 5. skin blocks present
  s.textContent.includes('[data-system=')) ||
[...document.styleSheets].some(s => {
  try { return [...s.cssRules].some(r =>
    r.selectorText && r.selectorText.includes('[data-system='))
  } catch (e) { return false; }
})
```

(Check `<style>` textContent first: Vite-injected sheets can be opaque to
CSSOM `cssRules` in dev.)

Five `true` → "looks plausible, run the full audit before shipping."
Any `false` → start at the failing stage.

---

## Notes for the AI agent running this skill

- **Don't auto-fix.** Report findings; let the user (or a separate skill)
  apply fixes. Auto-edits to legacy CSS frequently break adjacent things.
- **Be specific.** Don't say "use tokens." Say `replace #f4f3ee with
  var(--text) on line 247 of client/src/pages/Home.tsx`.
- **Cite stages.** Each finding includes the stage number so the user can
  re-read the rule.
- **Don't grade visuals.** This skill is structural. If the user wants
  "does this look good," that's a separate evaluation.
- **Respect intentional escapes.** `/* DS-OK: … */` comments, the stage-6
  known composite chrome, and the `replit.md` MR-DS-13 intentional
  divergences are all deliberate — check them before flagging.

---

## When to *not* run this skill

- The user has explicitly opted into a partial DS adoption (e.g.
  "we only use the buttons"). Run only the relevant stages.
- The page is a third-party embed or iframe — out of scope.
- The user is asking about visual design, not implementation.

---

**Source of truth:** `docs/DESIGN-SYSTEM.md` (token catalog),
`docs/AGENTS.md` (consumption contract), and
`docs/COMPONENT-LIBRARY.md` (component inventory) — and the code wins over
all docs. If this skill conflicts with those, those win and this file
should be updated.
