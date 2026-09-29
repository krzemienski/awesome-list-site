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

---

# Awesome-list-site extensions (browser-MCP execution)

> Everything above this line is the upstream skill, verbatim, fetched from
> the design-system project `49c7785a-b6d4-4c30-9d2d-9f0229ebc042`
> (`SKILL-verify-design-system.md`). Everything below is an additive
> extension for this repo. It never relaxes a stage, a severity, a
> prescribed expression, or a verdict threshold above.

Authority for this run: only the three files fetched from that project —
`SKILL-verify-design-system.md`, `design-systems.js`, `styles.css`. Local
copies (`awesome-list-site-ds/`, `.agents/`, `.cache/`, anything in the
repo) are never an authority for tokens, class names, accents or rules.

## A · Execution through browser MCP

The validator drives the **running app** and nothing else.

- **Allowed tools (chrome-devtools browser MCP only):** `new_page`,
  `navigate_page` (including `initScript`), `emulate` / `resize_page`,
  `evaluate_script`, `take_snapshot` + `click` (only to open the first
  resource card), `list_network_requests` / `get_network_request`,
  `take_screenshot` (always with `filePath` inside the validator's private
  evidence dir), then `Read` on each PNG to actually look at it.
- **Forbidden:** reading repo source files, `rg`/`grep` over `src/`,
  `npm` / `node` / Playwright / Puppeteer scripts, curl-driven HTML scraping,
  and editing anything. Every "inspect the source" or shell step in the
  upstream skill is replaced by the browser equivalent in section B.
- **Prescribed expressions are evaluated exactly as written.** The body is
  pasted verbatim into `evaluate_script`; the only permitted wrapping is
  `async () => { <verbatim body>; return <final expression or result
  variable>; }` (the `return` is needed because `evaluate_script` takes a
  function). Stage 2's three lines are returned as a 3-element array. Stage
  8 returns `offenders` (length + a short `tag.class` descriptor per item).
  Stage 11 needs `async` for its `await`. Record the **raw return value**
  (or the raw thrown error) per stage, per cell — never a paraphrase.
- Upstream Stage 1 rule stands: if Stage 1 fails in a cell, stop that
  cell's audit and report it (🔴 BLOCK → FAIL). Other cells still run.
- Wait for the app to settle before each evaluation (network idle plus a
  short fixed wait); a hydrating React page can report stale attributes.

## B · Shell/script → browser-MCP mapping

One row per shell command or "inspect the source" instruction in the
upstream skill. The **preserved property** column is what the replacement
must still prove.

| # | Upstream step | Browser-MCP replacement | Preserved property |
|---|---------------|-------------------------|--------------------|
| B1 | *How to invoke* 1 — "find the `<head>` of the root layout file plus the main stylesheet" | `evaluate_script`: `fetch(location.href,{cache:'reload'}).then(r=>r.text())` → `DOMParser` → served `<head>`; main stylesheet = the loaded sheet(s) in `document.styleSheets` whose `:root` rule defines `--bg` | Audit targets the real served head and the real token stylesheet, not a file guess |
| B2 | Stage 1 — "Check `<head>` for a `<link rel=stylesheet>` … containing `:root { --bg: … }`" and "a `<script>` loading the systems definitions" | From the served head (B1) list `link[rel~=stylesheet]` hrefs and `script[src]`; then walk `document.styleSheets` (recursively into `cssRules`) for a rule with `selectorText === ':root'` and non-empty `style.getPropertyValue('--bg')`. In a Vite build the CSS may arrive as a hashed `<link>` or an injected `<style>`; either counts if the `:root --bg` rule is live. The JS half is proven by the prescribed Stage 1 expressions | Token CSS and systems JS are actually loaded in the page |
| B3 | Stage 3 — "Inspect the source" (sync `<script>` in `<head>`, not module / deferred / `useEffect`) | **(a) Served-head parse:** same fetch as B1; find an inline `<script>` with no `src`, no `type="module"`, no `defer`, no `async`, positioned **before** the first `link[rel~=stylesheet]` / `<style>` in `<head>`, whose text sets both `data-system` and `data-accent` (via `setAttribute`, `dataset`, or a call to `applyDesignSystem`). **(b) First-paint probe:** `navigate_page` with `initScript` = the probe in §B-3 below, run three times: cold load (new page), cache reload (`navigate_page` type `reload`, `ignoreCache:true`), and with `localStorage` `ds-system=terminal` / `ds-accent=matrix` pre-seeded by the initScript. Pass only if both attributes are present (mutation timestamp or already present at the earliest observation) **before** the first `first-paint` / `first-contentful-paint` entry, and in the third run equal `terminal` / `matrix`. HANDOFF §10.3 sets the attributes from an inline function rather than `window.applyDesignSystem`; that is compliant — the property is "set synchronously in `<head>` before first paint" | No flash of the default theme: system + accent applied synchronously before first paint, including a stored non-default choice |
| B4 | Stage 5 — `rg --type css '#[0-9a-fA-F]{3,8}\b' src/ …` (hex) | §B-5 script: scan every same-origin sheet's **raw text** via `fetch(sheet.href).then(r=>r.text())` (raw text keeps comments so `/* DS-OK */` is honoured) plus inline `<style>` text, per declaration, with pattern `/#[0-9a-fA-F]{3,8}\b/` | Every hex outside the token source and skin block is found |
| B5 | Stage 5 — `rg --type css 'border(-radius)?:\s*\d+px' …` | Same scan, pattern `/border(-radius)?:\s*\d+px/` | Hardcoded border / radius px found |
| B6 | Stage 5 — `rg --type css "font-family:\s*['\"]" …` | Same scan, pattern `/font-family:\s*['"]/` | Literal font families found |
| B7 | Stage 5 — `rg "style=\{?\{[^}]*#[0-9a-fA-F]{3,6}" src/` (inline style hex) | `document.querySelectorAll('[style]')` → `getAttribute('style')` tested against the hex, border-px and font-family patterns. React serialises `style={{color:'#fff'}}` to `rgb(255, 255, 255)`, so a literal `rgb(`/`rgba(`/`hsl(` colour **not inside `var()`** in a style attribute is also a hit. Exclude the custom properties `applyDesignSystem` writes onto `<html>` (they come from `design-systems.js`) | Inline hardcoded colours in rendered markup found |
| B8 | Stage 5 — `rg "color:\s*['\"]#[0-9a-fA-F]{3,6}" src/` | Same style-attribute scan, pattern `/color:\s*(#[0-9a-fA-F]{3,6}\|rgba?\()/` | Inline hardcoded `color:` found |
| B9 | Stage 5 — "Respect intentional escapes" (`/* DS-OK: intentional */`) | In the raw-text scan, skip a declaration if a `/* DS-OK` comment sits inside it, directly before it, or after it on the same line | Intentional escapes skipped, nothing else |
| B10 | Stage 9 — "Check the `<link href=fonts.googleapis.com…>` includes that family" and "Network tab shows no 4xx on the font file" | `evaluate_script` over served head (B1) + live `link[href*="fonts.googleapis.com"]`: decode each `family=` param and check it contains the Stage 9 `family`; `list_network_requests` (`resourceTypes: ["font","stylesheet"]`) → any status ≥ 400 is recorded | Font requested and delivered |
| B11 | Stage 10 — `rg '\[data-system="(editorial\|terminal\|geist\|brutalist\|swiss)"\]' styles.css \| wc -l` | §B-10 script: iterate `document.styleSheets`, recursing into every `cssRules` (incl. `@media`, `@supports`, `@layer`), count rules whose `selectorText` contains `[data-system="editorial\|terminal\|geist\|brutalist\|swiss"]`, per system. Expected **≥ 15 total and every one of the five systems ≥ 1**. Cross-origin sheets that throw are listed, not skipped silently | Per-system skin block present and complete |
| B12 | Stage 11 — "visually inspect the page" / "take a screenshot if you have one available" | `take_screenshot` → `<screen>-<width>-<system>.png` in the private dir, then `Read` the PNG and apply the Stage 11 symptom table | Visual switch test actually looked at |

### §B-3 · First-paint probe (`initScript`)

```js
(() => {
  window.__dsBoot = { attrs: [], paints: [], seeded: null };
  try {
    if (location.search.includes('dsseed=1')) {
      localStorage.setItem('ds-system', 'terminal');
      localStorage.setItem('ds-accent', 'matrix');
      window.__dsBoot.seeded = 'terminal/matrix';
    }
  } catch (e) { window.__dsBoot.seeded = 'error: ' + e.message; }
  const snap = (why) => {
    const h = document.documentElement;
    window.__dsBoot.attrs.push({
      why, t: performance.now(),
      system: h && h.getAttribute('data-system'),
      accent: h && h.getAttribute('data-accent'),
    });
  };
  new MutationObserver((ms) => {
    if (ms.some((m) => m.type === 'attributes' || m.addedNodes.length)) snap('mutation');
  }).observe(document, { subtree: true, childList: true, attributes: true,
                         attributeFilter: ['data-system', 'data-accent'] });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      snap('at-' + e.name);
      window.__dsBoot.paints.push({ name: e.name, t: e.startTime });
    }
  }).observe({ type: 'paint', buffered: true });
})();
```

The localStorage run navigates to the same URL with `?dsseed=1` so the
seed happens on the app's own origin before any app script runs. After
load, read `window.__dsBoot` with `evaluate_script` and record it raw.
Pass: the first `attrs` entry with both values non-null has `t` earlier
than the `first-paint` entry's `t` (paint entries are timestamped
retroactively, so compare timestamps, not array order).

### §B-5 · Stage 5 stylesheet + inline scan (reference script)

```js
async () => {
  const PATS = { hex: /#[0-9a-fA-F]{3,8}\b/, borderPx: /border(-radius)?:\s*\d+px/,
                 fontFamily: /font-family:\s*['"]/ };
  const STATUS = ['#34d08c', '#ffb84d', '#ff5c7a'];
  const hits = [];
  const sources = [];
  for (const s of document.styleSheets) {
    const node = s.ownerNode;
    if (s.href && new URL(s.href).origin === location.origin) {
      sources.push({ id: s.href, text: await fetch(s.href).then((r) => r.text()) });
    } else if (!s.href && node && node.textContent) {
      sources.push({ id: node.getAttribute('data-vite-dev-id') || 'inline <style>', text: node.textContent });
    }
  }
  for (const { id, text } of sources) {
    const isTokenFile = /:root\s*\{[^}]*--bg\s*:/.test(text);
    const stack = []; let buf = ''; let pre = ''; let line = 1; let paren = 0; let q = null;
    const flush = (endIdx) => {
      const decl = buf.trim(); const sel = stack.join(' » ');
      const tail = text.slice(endIdx, text.indexOf('\n', endIdx) + 1 || undefined);
      buf = '';
      if (!decl || !sel) return;
      if (/DS-OK/.test(decl + pre + tail)) return;
      if (sel.includes('[data-system=')) return;                       // skin rules
      if (isTokenFile && /^:root\b/.test(stack[stack.length - 1]) && decl.startsWith('--')) return;
      for (const [k, re] of Object.entries(PATS)) {
        const m = decl.match(re); if (!m) continue;
        const v = m[0].toLowerCase();
        if (k === 'hex' && STATUS.includes(v)) continue;               // status colours
        if (k === 'hex' && v === '#0a0a0a' && /\.btn\.primary/.test(sel) && /^color\s*:/.test(decl)) continue;
        if (k === 'hex' && ['#000', '#fff'].includes(v) && /\bsvg\b/.test(sel)) continue;
        hits.push({ file: id, line, selector: sel, decl, pattern: k });
      }
    };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '\n') line++;
      if (q) { buf += c; if (c === q && text[i - 1] !== '\\') q = null; continue; }
      if (c === '/' && text[i + 1] === '*') {
        const j = text.indexOf('*/', i + 2); const cm = text.slice(i, j < 0 ? text.length : j + 2);
        pre += cm; line += (cm.match(/\n/g) || []).length; i += cm.length - 1; continue;
      }
      if (c === '"' || c === "'") { q = c; buf += c; continue; }
      if (c === '(') paren++; if (c === ')') paren--;
      if (c === '{' && !paren) { stack.push(buf.trim()); buf = ''; pre = ''; continue; }
      if ((c === ';' || c === '}') && !paren) { flush(i + 1); pre = ''; if (c === '}') stack.pop(); continue; }
      buf += c;
    }
  }
  const inline = [];
  for (const el of document.querySelectorAll('[style]')) {
    if (el === document.documentElement) continue;
    const st = el.getAttribute('style');
    const lit = st.replace(/var\([^)]*\)/g, '');
    const hit = PATS.hex.test(lit) || PATS.borderPx.test(lit) || PATS.fontFamily.test(lit) ||
                /color:\s*(#[0-9a-fA-F]{3,6}|rgba?\(|hsla?\()/.test(lit) ||
                /(^|;)\s*(background|border[-a-z]*|fill|stroke)\s*:[^;]*(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/.test(lit);
    const inSvg = !!el.closest('svg') && /#(000|fff)\b/i.test(lit) && !/rgba?\(|hsla?\(/.test(lit);
    if (hit && !inSvg) inline.push({ el: el.tagName.toLowerCase() + '.' + [...el.classList].join('.'), style: st.slice(0, 160) });
  }
  return { sources: sources.map((s) => s.id), cssHits: hits.length, hits: hits.slice(0, 200), inlineHits: inline.length, inline: inline.slice(0, 100) };
}
```

Exclusions are exactly the fetched acceptable-values list: `#0a0a0a` as
`.btn.primary` text colour; `#000`/`#fff` on SVG; status colours
`#34d08c`/`#ffb84d`/`#ff5c7a`; `design-systems.js` (never scanned — it is
JS, and its values reach the page only as custom properties on `<html>`);
`[data-system="…"]` skin rules; plus the token file's own `:root` custom
property declarations (the CSS mirror of `design-systems.js`). Each hit is
one 🟡 FIX, reported with file, line and the upstream "Suggest fixes"
replacement.

### §B-10 · Stage 10 recursive skin count

```js
() => {
  const re = /\[data-system="(editorial|terminal|geist|brutalist|swiss)"\]/g;
  const per = { editorial: 0, terminal: 0, geist: 0, brutalist: 0, swiss: 0 };
  let total = 0; const unreadable = [];
  const walk = (rules) => {
    for (const r of rules) {
      if (r.selectorText) {
        const ids = new Set([...r.selectorText.matchAll(re)].map((m) => m[1]));
        if (ids.size) { total++; ids.forEach((id) => per[id]++); }
      }
      if (r.cssRules) walk(r.cssRules);
    }
  };
  for (const s of document.styleSheets) {
    try { walk(s.cssRules); } catch (e) { unreadable.push(s.href); }
  }
  return { total, per, unreadable, pass: total >= 15 && Object.values(per).every((n) => n > 0) };
}
```

`rg | wc -l` counted lines; this counts rules. A grouped selector list is
one rule, so the ≥ 15 bar is the same or stricter — never looser.

## C · Stage 6 triage note

Run the Stage 6 expression unchanged and record `stray.length` and a
`tag.classList` descriptor for every stray. A stray is **compliant** only
if its `classList` contains a component class that is actually defined in
the fetched `styles.css`. Classes defined there that legitimately style a
`<button>`:

`btn` (+ `primary`, `ghost`, `icon`, `danger`), `tab`, `icon-btn`,
`accordion-header`, `sub-item`, `nav-link`, `header-search-trigger`,
`user-pill`, `mobile-menu-btn`, `chip`, `card` (+ `hoverable`, `glow`),
`ds-system-pill`.

Anything else is 🟡 FIX per element. Apply the same rule to the other
Stage 6 families, using only classes defined in the fetched `styles.css`:

| Family | Compliant classes (fetched `styles.css`) |
|--------|------------------------------------------|
| Inputs (`input`, `select`, `textarea`) | `input`, `select`, `textarea`, `search-input` |
| Clickable hover containers | `card` + `hoverable` (optionally `glow`) |
| Status badges | `chip` + `ok` / `warn` / `bad` / `accent` / `muted`; `dot` + `ok` / `warn` / `bad` |
| Section eyebrows (mono, uppercase labels) | `eyebrow` |
| Keyboard hints | `kbd` |

Hidden inputs (`type=hidden`), checkbox/radio/range controls with no text
entry, and elements inside `.tabs` / `.mobile-drawer` (per the upstream
expression) are recorded but not counted.

## D · Stage 7 note

Run the Stage 7 expression unchanged and record `accentUsers.length`. It
compares a hex slice against computed `rgb()` strings, so it usually
returns 0 even when accent is used — that raw value is still recorded, but
it is not the evidence. The supporting measurement:

```js
() => {
  const probe = document.createElement('span');
  probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  document.body.appendChild(probe);
  const [ar, ag, ab] = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
  probe.remove();
  const parse = (c) => {
    let m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
    m = c.match(/^color\(srgb ([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number);
             return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1].map((v, i) => (i < 3 ? Math.round(v) : v)); }
    return null;
  };
  const PROPS = ['color', 'background-color', 'border-top-color', 'border-right-color',
                 'border-bottom-color', 'border-left-color'];
  const users = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    for (const pseudo of [null, '::before', '::after']) {
      const s = getComputedStyle(el, pseudo);
      if (pseudo && (s.content === 'none' || s.content === 'normal')) continue;
      const props = PROPS.filter((p) => {
        if (p.startsWith('border') && parseFloat(s.getPropertyValue(p.replace('color', 'width'))) === 0) return false;
        const v = parse(s.getPropertyValue(p));
        return v && v[0] === ar && v[1] === ag && v[2] === ab && v[3] >= 0.05;
      });
      if (props.length) users.push({
        el: el.tagName.toLowerCase() + [...el.classList].map((c) => '.' + c).join('') + (pseudo || ''),
        props, viewport: Math.floor((r.top + scrollY) / innerHeight),
      });
    }
  }
  const perViewport = {};
  users.forEach((u) => { perViewport[u.viewport] = (perViewport[u.viewport] || 0) + 1; });
  return { accent: `rgb(${ar}, ${ag}, ${ab})`, total: users.length, perViewport, users: users.slice(0, 150) };
}
```

Any viewport-worth with more than 8 accent users is 🟡 FIX. Every user is
then checked against the fetched reserved list — primary buttons (one per
surface), active nav indicator, eyebrows, `.live-dot`, `.caret`, active
tab underline, `.card.glow:hover` halo, `::selection`. In the fetched
`styles.css` those correspond to `.btn.primary`, `.accordion-header.active::before`
/ `.sub-item.active` / `.icon-rail .icon-btn.active`, `.eyebrow`,
`.live-dot`, `.caret::after`, `.tab.active`, `.card.glow:hover`. Anything
else painting the accent is a violation (🟡 FIX), per upstream "Anything
else using accent is a violation"; more than one `.btn.primary` in a
surface is also a FIX.

## E · Stage 9

Keep ``document.fonts.check(`16px "${family}"`)`` exactly as written for
`--font-display` and record the raw boolean. As supporting evidence only,
repeat the same three lines with `--font-display` replaced by
`--font-body` and record that boolean too; it does not replace the
prescribed result. Then run B10.

## F · Stage 11

1. Run the prescribed loop verbatim in one `async` `evaluate_script`
   (uses `window.SYSTEM_DEFAULT_ACCENT`) and record its raw result or the
   raw thrown error (a `ReferenceError` here is itself evidence for
   Stage 1).
2. For screenshots, unroll the same loop body per system: evaluate
   `applyDesignSystem(id, window.SYSTEM_DEFAULT_ACCENT[id])`, wait the
   loop's own 800 ms, record `data-system`, `data-accent`, `--accent`, then
   `take_screenshot` → `<screen>-<width>-<system>.png`.
3. `Read` every PNG and apply the upstream symptom table. Any visible bug
   from that table is 🔴 BLOCK.

## G · Coverage matrix (mandatory)

**Screens** (slug used in filenames):

| Slug | Route | Notes |
|------|-------|-------|
| `home` | `/` | |
| `about` | `/about` | |
| `journeys` | `/journeys` | learning journeys |
| `category` | `/category/community-events` | |
| `resource` | opened from `category` | `take_snapshot`, `click` the first resource card, record the resulting URL |
| `login` | `/login` | record the final URL after settle (redirect target) |
| `theme-settings` | `/settings/theme` | |
| `404` | `/this-route-does-not-exist` | |

**Systems** — all five, each with its default accent quoted from the
fetched `design-systems.js` `window.SYSTEM_DEFAULT_ACCENT`:

| System | Default accent |
|--------|----------------|
| `editorial` | `crimson` |
| `terminal` | `matrix` |
| `geist` | `cyan` |
| `brutalist` | `amber` |
| `swiss` | `orange` |

**Accents** — all ten from the fetched `window.ACCENTS`, applied on `home`
in the default system (via `applyDesignSystem(<current system>, id)` when
Stage 1 proves it exists, otherwise through the app's own theme control on
`/settings/theme`; record which path). After each, `--accent` and
`--accent-2` (computed on `<html>`, lower-cased) must equal:

| id | `--accent` (primary) | `--accent-2` (secondary) |
|----|----------------------|--------------------------|
| `crimson` | `#ff3d52` | `#b84dff` |
| `magenta` | `#ec4899` | `#f472b6` |
| `orange` | `#ff7a3d` | `#ffb84d` |
| `amber` | `#ffb84d` | `#ffd86b` |
| `emerald` | `#34d08c` | `#5ee6b8` |
| `matrix` | `#00ff88` | `#39ff14` |
| `cyan` | `#5eddf2` | `#7dd3fc` |
| `violet` | `#9d4edd` | `#c77dff` |
| `lime` | `#aaff00` | `#00ff88` |
| `rose` | `#ff7a8a` | `#ffb3c1` |

A mismatch is 🔴 BLOCK under Stage 2 (tokens not applied as defined).

**Widths** — set with `emulate` `viewport`: `375x812x1,mobile,touch`,
`768x1024x1`, `1440x900x1`, `1920x1080x1` (1920×1080 is the reference-image
viewport).

**Cells:**

- Stages 1–10: every screen × every width, in the default system
  (whatever Stage 2 reports on cold load) — 8 × 4 = 32 cells. Stage 3's
  three-run probe is per screen at 1440 (it is width-independent) and
  repeated at 375 on `home`.
- Stage 11: every screen × every system at 1440 and 375 — 8 × 5 × 2 = 80
  screenshots, named `<screen>-<width>-<system>.png`
  (e.g. `category-375-brutalist.png`).
- Accents: 10 checks on `home` at 1440, each with a screenshot
  `home-1440-<default-system>-<accent>.png`.

The verdict is computed over the union of all cells; a BLOCK in any cell
makes the overall verdict FAIL.

## H · Reference access

Validators cannot call DesignSync. The orchestrator supplies reference
PNGs at
`/Users/nick/Desktop/awesome-list-site/.cache/ds-fetch-20260929T0640Z/assets/`
(`reference/` and `screenshots/`). Use only files that open as valid PNGs
with `Read`; list any that do not. They are for visual comparison in
Stage 11 only — never a source of tokens, classes or rules, and never a
substitute for a fresh screenshot of the running app.

## I · Output

1. The upstream **verdict block**, exactly as templated above, with the
   thresholds unchanged: PASS = zero BLOCK and zero FIX; FIX = zero BLOCK
   and ≥ 1 FIX; FAIL = ≥ 1 BLOCK; NITs never gate.
2. A per-stage findings table:

   | Stage | Result (🔴/🟡/🟢/✅) | Cells affected | Raw return (short) | Evidence paths |
   |-------|----------------------|----------------|--------------------|----------------|

   Evidence paths are full absolute paths to the saved screenshots,
   raw-return JSON files and network listings in the private dir.
3. The complete screenshot list (full paths), grouped by screen, plus the
   list of reference PNGs actually compared.
