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
---

# Part II · Execution through the browser MCP (awesome-list-site)

> Everything above this line (Part I) is the skill exactly as fetched from the
> claude_design MCP on 2026-09-29 (project 49c7785a-…, sha256
> `37f25dbce6d8e486086eb9f8d66029f335365a636261b4983a8aa84f2f325da6`).
> It is unchanged, byte for byte, and it is the gate.
>
> Part II changes **how** each stage is executed and **what it covers**. It
> never changes a pass criterion, a severity, the verdict thresholds, or the
> verdict-block format. If anything in Part II appears to conflict with a
> criterion in Part I, Part I wins. A property that cannot be observed in the
> browser stays in the audit and is reported as **NOT RUNNABLE** under its
> stage, with its Part I severity. It is never silently passed.

## II-0 · Operating rules

1. **Actor.** Drive the running app as an end user through the browser MCP
   (`mcp__chrome-devtools__*`). Every stage's expression is evaluated in-page
   with `evaluate_script`. Reading repository files is not a substitute for any
   stage. Test runners, Playwright, puppeteer, pixelmatch and repo `validate:*`
   scripts are not evidence.
2. **Targets.** Production: `http://localhost:5002` (`npm run build && PORT=5002 npm run start`).
   Development: `http://localhost:5001` (`PORT=5001 npm run dev`). Port 5000 on
   this machine is taken by macOS AirPlay Receiver, so `localhost:5000` is not
   the app. The run brief names which server is the target. Stage 5 always
   runs its source scan against the dev server at the same commit (see II-5).
3. **Isolation and first load.** Open your first page with
   `new_page({ url, isolatedContext: "<your-validator-name>" })`. A fresh isolated
   context has empty site storage. Confirm it before Stage 3:
   `localStorage.length === 0` → if not 0, run `localStorage.clear(); sessionStorage.clear()`
   and reload. Never share an isolated context with another validator. The
   system choice persists in `localStorage` (`ds-system`, `ds-accent`); a shared
   profile would corrupt parallel runs.
4. **Settle before measuring.** After every navigation or system switch:
   wait for load, then `await document.fonts.ready`, then ~800 ms
   (Part I Stage 11 uses 800 ms), then measure or screenshot.
5. **Screenshots.** Save every screenshot with `take_screenshot({ filePath })`
   under `<evidence-root>/<validator-name>/` using
   `NN-<screen>-<system>-<width>.png`, and view each one (take it without
   `filePath` too, or open the saved file) before you record a judgement about it.
   An unviewed screenshot is not evidence.
6. **Citations.** Every finding and every PASS line cites the stage number,
   the URL, the evaluated expression's result, and the screenshot path(s).
7. **Don't auto-fix** (Part I). Report only.

## II-1 · Coverage (mandatory)

| Dimension | Values |
|-----------|--------|
| Systems (Stage 11 and per-system checks) | `editorial`×`crimson`, `terminal`×`matrix`, `geist`×`cyan`, `brutalist`×`amber`, `swiss`×`orange`, i.e. each at `window.SYSTEM_DEFAULT_ACCENT[id]` |
| Key screens | Home `/` · About `/about` · Learning journeys `/journeys` · Category `/category/intro-learning` · Resource detail `/resource/<id>` (id given in the run brief) · Login `/sign-in` · Theme settings `/settings/theme` · 404 `/this-route-does-not-exist` |
| Widths | Part I specifies none. Use desktop **1440×900** and mobile **375×667** (the iPhone SE size in `docs/18-launch-checklist.md`), set with `resize_page`. |

Stages 1–4, 9 and 10 are page-level. Run them on every key screen at 1440. Stages 5–8 run on every key screen. Stage 11 runs 5 systems × 8 screens × 2 widths, which is 80 screenshots.

## II-2 · Stage-by-stage execution

**Stage 1 (files loaded).** Evaluate Part I's three expressions verbatim. The
`<link rel="stylesheet">` / `<script>` requirement is checked in-page:
```js
() => {
  const sheets = [...document.styleSheets].filter(s => { try { return [...s.cssRules].some(r => r.selectorText === ':root' && r.style.getPropertyValue('--bg')); } catch { return false; } });
  const scripts = [...document.querySelectorAll('head script[src]')].filter(s => /design-systems?\.js/.test(s.src));
  return { tokenSheets: sheets.map(s => s.href), dsScripts: scripts.map(s => ({ src: s.src, async: s.async, defer: s.defer, type: s.type })) };
}
```
PASS needs ≥1 token sheet delivered by a `<link rel="stylesheet">` (non-null `href`) and ≥1 DS script. Record the DS stylesheet href. Stages 5 and 10 use it.

**Stage 2 (system applied).** Part I's three expressions, verbatim.

**Stage 3 (synchronous boot / no FOUT).** Part I says "inspect the source". In-browser mapping, two parts, both required:
- (a) *Source order as served.* `fetch(location.href, {cache:'no-store'}).then(r=>r.text())`, parse with `DOMParser`, and walk `<head>` in order. PASS needs a classic `<script src=…design-system(s).js>` (no `async`, `defer` or `type=module`) followed, still inside `<head>`, by a synchronous inline `<script>` that calls `applyDesignSystem(`.
- (b) *First paint, observed.* Seed a non-default stored system and record the root's state in the first animation frame, which runs before the first paint:
  ```js
  // navigate_page({ type:'url', url, initScript: <this> })
  try { localStorage.setItem('ds-system','brutalist'); localStorage.setItem('ds-accent','amber'); } catch (e) {}
  window.__fp = [];
  const snap = l => { const r = document.documentElement, c = getComputedStyle(r);
    return { l, sys: r.getAttribute('data-system'), fd: c.getPropertyValue('--font-display').trim(), bw: c.getPropertyValue('--border-w').trim(), bg: c.getPropertyValue('--bg').trim() }; };
  requestAnimationFrame(() => window.__fp.push(snap('first-frame')));
  new MutationObserver(() => window.__fp.push(snap('mutation'))).observe(document.documentElement, { attributes: true, attributeFilter: ['data-system'] });
  ```
  After load, read `window.__fp`. PASS needs `first-frame` to show `brutalist` tokens (`--font-display` starting `'Instrument Serif'`, `--border-w` `2px`), with no later mutation to a different system. Then restore: `localStorage.clear()`.
  Also run the cold case: clear storage, reload, and `first-frame` must show the default `editorial` tokens. In a production panel, Stage 3 is judged on the production server.

**Stage 4 (chrome).** Part I's two expressions, verbatim, on every key screen.

**Stage 5 (hardcoded values).** Part I's `rg … src/` mapped to the running dev server. Vite serves every source module's original text at `<url>?raw` as `export default "…"`. Evaluate in-page on the dev server, after visiting the screen so its modules are loaded:
  ```js
  async () => {
    const mods = [...new Set(performance.getEntriesByType('resource').map(e => e.name.split('?')[0])
      .filter(u => /\/src\/.+\.(css|tsx|ts|jsx)$/.test(u)))];
    // `?raw` answers either `export default "<json string>"` (CSS) or the plain source text (TS/TSX).
    const getRaw = async u => { const r = await fetch(u + '?raw'); if (!r.ok) throw new Error(r.status); const t = await r.text();
      const m = t.match(/^export default ("(?:[^"\\]|\\.)*")/); return m ? JSON.parse(m[1]) : t; };
    const skip = u => /design-systems?\.(css|js)$/.test(u) || u.includes('/public/ds/');
    const CSS = [/#[0-9a-fA-F]{3,8}\b/, /border(-radius)?:\s*\d+px/, /font-family:\s*['"]/];
    const TSX = [/style=\{?\{[^}]*#[0-9a-fA-F]{3,6}/, /color:\s*['"]#[0-9a-fA-F]{3,6}/, /(['"`\[]|\s)#[0-9a-fA-F]{3,8}\b/];
    const seen = new Set(), queue = [...mods], hits = [], files = [];
    while (queue.length) { const u = queue.shift(); if (seen.has(u) || skip(u)) continue; seen.add(u);
      let src; try { src = await getRaw(u); } catch { files.push({ u, error: 'unreadable' }); continue; }
      const isCss = u.endsWith('.css'); files.push({ u, lines: src.split('\n').length });
      if (isCss) for (const m of src.matchAll(/@import\s+["']([^"']+\.css)["']/g)) queue.push(new URL(m[1], u).href.split('?')[0]);
      let inSkin = 0; const lines = src.split('\n');
      lines.forEach((line, i) => {
        if (isCss && /\[data-system=/.test(line)) inSkin = 1;               // skin rule: exempt until its block closes
        const exempt = inSkin || /DS-OK/.test(line) || /DS-OK/.test(lines[i - 1] || '');
        for (const re of (isCss ? CSS : TSX)) if (re.test(line)) hits.push({ file: u.replace(location.origin, ''), line: i + 1, rule: String(re), text: line.trim().slice(0, 160), exempt: !!exempt });
        if (inSkin && line.includes('}')) inSkin = 0;
      });
    }
    return { files: files.length, unreadable: files.filter(f => f.error), hits };
  }
  ```
  The script applies Part I's regexes line by line to each file's text (review every hit; `exempt:true` marks skin-block / `DS-OK` lines, which you still confirm by reading the line). `design-system.css` / `design-systems.js` (and `public/ds/*`) are excluded exactly as the `--glob` flags do.
  - CSS: `#[0-9a-fA-F]{3,8}\b` · `border(-radius)?:\s*\d+px` · `font-family:\s*['"]`
  - TSX/JSX: `style=\{?\{[^}]*#[0-9a-fA-F]{3,6}` · `color:\s*['"]#[0-9a-fA-F]{3,6}`. Also report any `#hex` color literal elsewhere in component source (for example Tailwind arbitrary values `bg-[#…]`) as a Stage 5 finding, because Part I's rule is "every hex code … is a violation" and the `rg` lines are how to find them.
  - Also scan the served entry HTML (`fetch('/')` text) for inline-style hex.
  Apply Part I's "Acceptable hardcoded values" list and `/* DS-OK: intentional */` escapes exactly. For each finding report file (`/src/...` path), line number, and the suggested token from Part I's table.
  In a production panel, run the same scan on the dev server at the same commit. Confirm the commit by comparing the served `/ds/design-system.css` bytes (sha-256 via `crypto.subtle`) and the page's build revision on both servers. The production bundle's CSS is minified and has lost its comments, so it cannot carry `DS-OK` escapes.

**Stage 6 (component classes).** Evaluate Part I's expression verbatim on every screen, then do the same for `input, select, textarea` (non-`hidden` types) against `.input/.select/.textarea`.
Clarification (the rule is "use the design-system classes"): a `<button>` whose class list contains a component class defined by the canonical DS stylesheet counts as DS-classed. Those classes are `btn`, `tab`, `icon-btn`, `accordion-header`, `sub-item`, `header-search-trigger`, `user-pill`, `ds-system-pill`, and `select` (for `role=combobox` triggers). Enumerate them from the DS sheet recorded in Stage 1 rather than trusting this list. Stage 6 audits *interactive* elements (Part I). A control that a user cannot perceive or operate is not one: an element whose computed `visibility` is `hidden` or `display` is `none`, that has `aria-hidden="true"` and is not focusable, such as the invisible implicit-submit button some third-party form widgets inject. List every such element you exclude, with its outerHTML, so the exclusion itself is auditable. A control that is visible, focusable, or exposed to assistive technology is always counted. Report every remaining stray element (tag, classes, text, screen). Pass criterion unchanged: 🟡 FIX per offending element.

**Stage 7 (accent discipline).** Part I's expression compares a hex slice against computed colors, which the browser always serializes as `rgb(…)`, so as written it can never match. The execution below makes the comparison actually work, while the criterion (≤8 per viewport-worth, and only the allowed uses) is unchanged:
  ```js
  () => { const probe = document.createElement('i'); probe.style.color = 'var(--accent)'; document.body.append(probe);
    const acc = getComputedStyle(probe).color; probe.remove();
    const users = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) return false;
      const s = getComputedStyle(el); return [s.color, s.backgroundColor, s.borderTopColor, s.borderLeftColor, s.borderBottomColor, s.outlineColor].includes(acc); });
    return { accent: acc, count: users.length, users: users.map(e => ({ tag: e.tagName, cls: e.className?.toString().slice(0, 80), text: e.textContent.trim().slice(0, 40) })) }; }
  ```
  Evaluate per viewport, scrolling by one viewport height until the page end. Ancestors that only inherit `color` from an accent user count once; report both. Classify each user against Part I's allowed list. `docs/02-principles.md` ("the brand moment") and `docs/07-color.md` ("Always" list: `.chip.accent`, active nav, sub-item active) are the sources Part I defers to, so the 28×28 `av` logo mark and `.chip.accent` are allowed uses. Anything else is a violation.

**Stage 8 (ink tier).** Part I compares `getComputedStyle(p).color` with the raw token string, which never matches the computed `rgba(…)` form. Resolve the tokens through a probe element first (as in Stage 7) for `--text-3` and `--text-4`, then apply Part I's filter (`p, li`, `textContent.length > 60`) with both colors. Criterion unchanged.

**Stage 9 (fonts).** Part I's expression verbatim, evaluated in-page. Before it runs, `await document.fonts.ready`, and `await document.fonts.load('16px "<family>"')` with a 3 s timeout, so the result reflects a load that has settled rather than one in flight. Run it once per system, after each switch in Stage 11, on at least Home and About. `true` is required. On `false`, list `network` requests to `fonts.gstatic.com` / `fonts.googleapis.com` (`list_network_requests`) and report any status ≥ 400.

**Stage 10 (skin block).** `rg … styles.css | wc -l` becomes an in-page CSSOM count over the DS stylesheet recorded in Stage 1:
  ```js
  (href) => { const s = [...document.styleSheets].find(x => x.href === href); const re = /\[data-system="(editorial|terminal|geist|brutalist|swiss)"\]/g;
    let n = 0; const walk = rules => { for (const r of rules) { if (r.cssRules) walk(r.cssRules); if (r.selectorText) n += (r.selectorText.match(re) || []).length; } }; walk(s.cssRules); return n; }
  ```
  The count must be ≥ 15. In a production panel, also report whether the served DS stylesheet's sha-256 equals `31fde358acc5bea61c68b17025326169fad4e60c62b898fbacf279a9bc9b2070` (the canonical fetched `styles.css`; the served `design-system.js` must equal `30c37539db397941f209055af28a5284fbdd14a3322adb869701c70b0e05bc7c`). A mismatch is a finding under Stage 10.

**Stage 11 (switch test).** For every key screen × width, run Part I's loop with a screenshot per system, calling `applyDesignSystem(id, SYSTEM_DEFAULT_ACCENT[id])` in-page, settling per II-0 rule 4, then `take_screenshot({ filePath })` and viewing it. Walk Part I's symptom table for every screenshot. Also compare each Editorial screenshot against the fetched references in the run brief (`handoff/project/uploads/*.png`, `assets/reference/*.png`, and the prototype render if provided). Those references are captures of the pre-design-system production site, so use them for structure and content (which regions exist and in what arrangement), and use the fetched design (prototype, docs) for the visual language. Report structural mismatches as Stage 11 findings.

## II-3 · Shell-command → browser-MCP mapping (record)

| Stage | Part I prescribes | Executed through the browser MCP as |
|---|---|---|
| 1 | Inspect `<head>` for stylesheet + script | CSSOM: `document.styleSheets` with a `:root --bg` rule and non-null `href`; `head script[src*=design-system]` attributes |
| 3 | "Inspect the source" | (a) `fetch(location.href)` + `DOMParser` head-order walk; (b) `navigate_page` `initScript` first-animation-frame probe with a seeded stored system, plus a cold-load probe |
| 5 | `rg --type css '#…' src/ --glob …` (×3) and `rg "style=…" src/` (×2) | `performance.getEntriesByType('resource')` module list plus recursive `@import`, raw text via Vite `?raw` fetched in-page, the same regexes applied line by line, the same globs excluded; entry HTML via `fetch('/')` |
| 9 | DevTools console `document.fonts.check` | `evaluate_script` (same expression) after `fonts.ready`; failures traced with `list_network_requests` |
| 10 | `rg '\[data-system=…\]' styles.css \| wc -l` | CSSOM rule walk over the DS stylesheet counting selector matches; the served file's sha-256 via `crypto.subtle` |
| 11 | DevTools loop + "take a screenshot if you have one available" | `evaluate_script` switch + `take_screenshot({ filePath })` per system × screen × width, each viewed |
| All | DevTools console | `evaluate_script` on the live page |

## II-4 · Output

Emit Part I's verdict block **exactly** (same headings, same order). Inside it:
- Each finding line is `<stage> — <description> [url · width · system · evidence path] → <fix>`.
- `## What's good` lists every stage that passed as its own line, `✅ Stage N — <what was observed> [evidence path(s)]`. Stages 3, 9 and 11 must each appear individually, with Stage 11 listing its screenshot directory and count.
- A stage that could not be executed is listed under its Part I severity as `Stage N — NOT RUNNABLE: <exact reason>`. It counts toward the verdict at that severity.
After the verdict block, add `## Evidence index`, listing every screenshot path and the raw JSON returned by each stage's evaluation.
