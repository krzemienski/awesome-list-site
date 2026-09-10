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
> taste is in `docs/02-principles.md`.

---

## How to invoke this skill

1. Confirm you can see the target files. If the user gave you a single
   page, you need its HTML and any CSS it references. If they gave you a
   whole codebase, find the `<head>` of the root layout file plus the main
   stylesheet.
2. Run the **11 audit stages** below, in order. Don't skip ahead.
3. For each finding, tag with severity: 🔴 **BLOCK**, 🟡 **FIX**, 🟢 **NIT**.
4. At the end, produce the **verdict block** (template at the bottom).

If any 🔴 BLOCK fails, the verdict is **FAIL** — the page is not DS-compliant.
If only 🟡 or 🟢 fail, the verdict is **FIX**. All green → **PASS**.

---

## Stage 1 · Are the system files even loaded?

**Severity if missing: 🔴 BLOCK**

Check `<head>` (or equivalent) for:

- [ ] **CSS:** a `<link rel="stylesheet">` pointing at a file containing
  the `:root { --bg: …; }` token block. Common names:
  `styles.css`, `design-system.css`, `theme.css`.
- [ ] **JS:** a `<script>` tag loading the systems definitions
  (`design-systems.jsx` or `design-system.js`). It should expose
  `window.DESIGN_SYSTEMS`, `window.ACCENTS`,
  `window.SYSTEM_DEFAULT_ACCENT`, `window.applyDesignSystem`.

**How to verify in DevTools:**
```js
typeof window.applyDesignSystem === 'function'  // → true
Object.keys(window.DESIGN_SYSTEMS).length        // → 5
window.ACCENTS.length                            // → 10
```

If false / 0 — the system isn't loaded. Stop the audit and report.

---

## Stage 2 · Is a system actually applied?

**Severity if missing: 🔴 BLOCK**

```js
document.documentElement.getAttribute('data-system')  // → 'editorial' | 'terminal' | 'geist' | 'brutalist' | 'swiss'
document.documentElement.getAttribute('data-accent')  // → one of 10 accent ids
getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()  // → '#000000' or '#000'
```

All three must resolve.

If `--bg` is missing or empty, `applyDesignSystem()` never ran. Common
cause: the call is in a deferred script / `useEffect` running after the
audit, or it's been omitted entirely.

---

## Stage 3 · Is the boot synchronous? (No-FOUT check)

**Severity if deferred: 🟡 FIX**

The apply call must happen **before first paint**. Inspect the source:

✅ **Good** — synchronous `<script>` in `<head>`:
```html
<head>
  <script src="design-systems.js"></script>
  <script>applyDesignSystem('editorial', 'crimson');</script>
</head>
```

❌ **Bad** — deferred / module / `useEffect`:
```html
<script type="module" src="design-systems.js"></script>
<!-- or apply inside a React useEffect — runs after first paint -->
```

If bad, flag: "Page will flash default theme on load. Move
`applyDesignSystem` call into a synchronous inline `<script>` in `<head>`."

---

## Stage 4 · Is the page chrome present?

**Severity if missing: 🟡 FIX**

```js
document.querySelector('.page')   // → element
document.querySelector('.grain')  // → element
```

Both should exist. Without `.page`, the system's atmosphere
(`--bg-atmosphere` radial/scanline/grid) doesn't render. Without
`.grain`, the SVG noise overlay is absent — Brutalist and Terminal lose
their tactility.

---

## Stage 5 · Hardcoded value scan (the big one)

**Severity: 🟡 FIX per occurrence**

This is the most important stage. Every hex code and px number outside
`design-system.js` and the `[data-system="…"]` skin block is a violation.

### How to run

Search all CSS files (excluding the design-system files themselves):

```bash
# Hex colors
rg --type css '#[0-9a-fA-F]{3,8}\b' src/ \
  --glob '!design-system.css' \
  --glob '!design-systems.js'

# Pixel values for spacing/radius/border (be lenient — some pxs are fine)
rg --type css 'border(-radius)?:\s*\d+px' src/ \
  --glob '!design-system.css'

# Font families
rg --type css "font-family:\s*['\"]" src/ \
  --glob '!design-system.css'
```

Search all inline styles in JSX / Vue / HTML:

```bash
rg "style=\{?\{[^}]*#[0-9a-fA-F]{3,6}" src/
rg "color:\s*['\"]#[0-9a-fA-F]{3,6}" src/
```

### Acceptable hardcoded values

These pass:

- `#0a0a0a` inside `.btn.primary { color: #0a0a0a; }` — the text color *on*
  the accent, intentionally dark.
- `#000`, `#fff` in SVG `<svg>` elements that need fixed paint.
- Status colors `#34d08c` / `#ffb84d` / `#ff5c7a` — these are global
  semantics, not theme.
- Anything inside `design-systems.js` (the source of truth).
- Anything inside a `[data-system="…"]` skin block in styles.css —
  intentional per-system overrides.

### Suggest fixes per occurrence

| If you see | Suggest |
|------------|---------|
| `color: #fff` (or near-white) | `color: var(--text)` |
| `color: rgba(255,255,255,0.66)` | `color: var(--text-2)` |
| `color: rgba(255,255,255,0.4)` | `color: var(--text-3)` |
| `background: #14141a` | `background: var(--bg-2)` |
| `background: rgba(255,255,255,0.05)` | `background: var(--surface)` or `--surface-2` |
| `border: 1px solid rgba(255,255,255,0.08)` | `border: var(--border-w) solid var(--border)` |
| `border-radius: 12px` | `border-radius: var(--radius)` |
| `border-radius: 8px` | `border-radius: var(--radius-sm)` |
| `font-family: 'Inter', sans-serif` | `font-family: var(--font-body)` |
| `font-family: 'Fraunces'` | `font-family: var(--font-display)` |
| `box-shadow: 0 6px 24px …` | `box-shadow: var(--shadow)` |

---

## Stage 6 · Component class compliance

**Severity: 🟡 FIX per offending element**

Audit interactive elements. Use the design-system classes:

```js
/* Buttons */
const buttons = document.querySelectorAll('button');
const stray = [...buttons].filter(b =>
  !b.closest('.tabs') && /* tabs use .tab */
  !b.closest('.mobile-drawer') &&
  ![...b.classList].some(c => c.startsWith('btn') || c.startsWith('tab') || c.startsWith('icon-btn'))
);
stray.length  // → should be 0
```

Same for:

- **Inputs:** any `<input>` / `<select>` / `<textarea>` must have `.input` /
  `.select` / `.textarea` class.
- **Cards:** any clickable container with a hover state should be `.card
  .hoverable`.
- **Status badges:** use `.chip` (+`.ok/.warn/.bad/.accent/.muted`).
- **Section labels:** mono uppercase eyebrows should use `.eyebrow`.
- **Keyboard hints:** use `.kbd`.

### Forbidden patterns

- ❌ Custom button classes with their own colors (`.my-blue-btn`,
  `.action`).
- ❌ Hardcoded badges (`<span style="background: red">`).
- ❌ `<div class="section-title">` instead of `<div class="eyebrow">`.

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
- `.live-dot`, `.caret`.
- Active tab underline.
- `.card.glow:hover` halo.
- `::selection`.

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

Verify the active system's fonts are actually loaded. In DevTools:

```js
const sys = document.documentElement.getAttribute('data-system');
const stack = getComputedStyle(document.documentElement)
                .getPropertyValue('--font-display').trim();
const family = stack.split(',')[0].replace(/['"]/g, '').trim();
document.fonts.check(`16px "${family}"`);  // → true
```

If false, the font failed to load. Check:
- The `<link href="https://fonts.googleapis.com/…">` includes that family.
- The family name in the link query matches the token's family name.
- Network tab shows no 4xx on the font file.

Common miss: shipping Editorial but forgetting Fraunces in the Google
Fonts request; Fraunces falls back to Georgia and the whole magazine vibe
collapses.

---

## Stage 10 · Per-system skin block intact?

**Severity: 🔴 BLOCK**

The `[data-system="…"]` block at the bottom of `styles.css` (~lines
650-678) must exist. Without it:

- Terminal chips lose their `[brackets]`.
- Brutalist cards lose the `4px 4px 0 0` offset shadow on hover.
- Swiss switches from hairlines to 1px borders (the system collapses to
  generic).

Verify by searching:

```bash
rg '\[data-system="(editorial|terminal|geist|brutalist|swiss)"\]' styles.css | wc -l
```

Expected: ≥ 15 (each system has multiple selectors).

If the count is 0 or very low, the skin block was stripped during a
minification or refactor. Restore from `design-system.css` upstream.

---

## Stage 11 · Switch test (live verification)

**Severity: 🔴 BLOCK if visible bugs**

The real test: cycle through all five systems. Run in DevTools:

```js
for (const id of ['editorial','terminal','geist','brutalist','swiss']) {
  applyDesignSystem(id, window.SYSTEM_DEFAULT_ACCENT[id]);
  /* visually inspect the page */
  /* take a screenshot if you have one available */
  await new Promise(r => setTimeout(r, 800));
}
```

What to look for:

| Symptom | Diagnosis | Fix |
|---------|-----------|-----|
| Page looks the same in all 5 | Components have hardcoded styles — Stage 5 was incomplete. | Re-run hardcoded-value scan, replace with tokens. |
| Some elements break only in Brutalist | Border-width token (`--border-w`) is being ignored — element has a hardcoded `1px` border. | Token-ize the border. |
| Square corners appear only in Terminal but not Brutalist | `--radius` token unused; element has hardcoded `border-radius`. | Replace with `var(--radius)` or `var(--radius-sm)`. |
| Chip brackets missing in Terminal | Per-system skin block stripped. | Stage 10 fix. |
| Page looks black/empty | `--bg-atmosphere` not rendering — `.page` wrapper missing. | Stage 4 fix. |
| Font reverts to fallback | Family not in fonts request. | Stage 9 fix. |

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
[...document.styleSheets].some(s => {                                   // 5. skin block present
  try { return [...s.cssRules].some(r =>
    r.selectorText && r.selectorText.includes('[data-system='))
  } catch (e) { return false; }
})
```

Five `true` → "looks plausible, run the full audit before shipping."
Any `false` → start at the failing stage.

---

## Notes for the AI agent running this skill

- **Don't auto-fix.** Report findings; let the user (or a separate skill)
  apply fixes. Auto-edits to legacy CSS frequently break adjacent things.
- **Be specific.** Don't say "use tokens." Say `replace #f4f3ee with
  var(--text) on line 247 of app-styles.css`.
- **Cite stages.** Each finding includes the stage number so the user can
  re-read the rule.
- **Don't grade visuals.** This skill is structural. If the user wants
  "does this look good," that's a separate evaluation.
- **Respect intentional escapes.** If you find a `/* DS-OK: intentional */`
  comment near a hardcoded value, skip it.

---

## When to *not* run this skill

- The user has explicitly opted into a partial DS adoption (e.g.
  "we only use the buttons"). Run only the relevant stages.
- The page is a third-party embed or iframe — out of scope.
- The user is asking about visual design, not implementation.

---

**Source of truth:** the design system specs in `/docs` and the
contract in `HANDOFF.md`. If this skill conflicts with those, those win
and this file should be updated.
