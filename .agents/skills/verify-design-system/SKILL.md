---
name: verify-design-system
description: Verify Design-System Compliance — runs the Awesome.Video design system's deterministic 11-stage audit against the RUNNING application in a real browser, across all five systems and every key screen, and produces the single PASS / FIX / FAIL verdict block. Use when asked whether the app applies the design system correctly, before shipping a design-system change, or as the acceptance gate for a design-system port.
---

# SKILL · Verify Design-System Compliance (browser edition)

> **Provenance.** This is the design system's own `SKILL-verify-design-system.md`
> (shipped inside the Claude Design project handoff — the copy the repository
> vendors at `awesome-list-site-ds/SKILL-verify-design-system.md` is byte-identical
> to the archive the maintainer supplied for this engagement), extended so that it
> can be executed against a *running* application in a *real browser* instead of
> as a manual, single-page DevTools audit. This tracked file
> (`.agents/skills/verify-design-system/SKILL.md`) is the gate; `.claude/` is
> git-ignored in this repository, so copy it there to invoke it as a Claude
> Code skill.
>
> **Preserved exactly, unchanged:** the 11 stages and their order; every stage's
> DevTools expression and shell command; the 🔴 BLOCK / 🟡 FIX / 🟢 NIT severity
> model; the verdict thresholds (PASS = zero BLOCK and zero FIX); and the
> verdict-block output format. Everything under a **Browser execution** heading,
> and the **Coverage** section, is the extension. Where an extension adds a
> measurement, the original expression is still run and its raw result recorded
> alongside.
>
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

### Browser execution — the procedure this edition adds

You audit the **running app**, not a file. The app must be reachable at a URL
(the dev server `npm run dev` on `http://localhost:5000`, or the production
server `npm run build && npm run start`). The final, gating run is always
against the **production** server.

1. **Drive a real browser.** Chromium via Playwright. The repository ships the
   driver that executes every stage below exactly as written:

   ```bash
   node scripts/validation/verify-design-system.mjs \
     --base-url http://localhost:5000 \
     --out reports/design-system-audit/<run-id>
   # optional: --widths 1440,375  --screens home,about,...  --systems editorial,...
   #           --chromium /path/to/chrome  --proxy http://host:port
   ```

   The driver: opens every key screen at every width; blocks the app bundle and
   records what paints before any JavaScript ran (Stage 3); evaluates the
   stage expressions **in-page, verbatim** (Stages 1, 2, 4, 6, 7, 8, 9, 10);
   runs the repository commands verbatim (Stages 5, 10); cycles the five
   systems live with the Stage 11 loop and takes a full-page screenshot per
   system (Stage 11); and writes `results.json`, `REPORT.md` and
   `screenshots/*.png` into `--out`. It does **not** decide the verdict.
   If you cannot run the driver, do the same steps by hand with Playwright —
   the stage text below says exactly what to evaluate.

2. **Review every screenshot.** Open each PNG the driver produced (all five
   systems × every key screen × every width, plus the Stage 3 pre-bundle
   frames) and look for the Stage 11 symptom table. A machine number is not
   a review; a screenshot you did not open is not evidence.

3. **Write the verdict block** in the exact format at the bottom, citing the
   run directory and the screenshots you reviewed. Report; do not fix.

### Coverage — what a complete run must include

| Axis | Required set |
|------|--------------|
| Systems | all five: `editorial`, `terminal`, `geist`, `brutalist`, `swiss`, each with its `SYSTEM_DEFAULT_ACCENT` (crimson, matrix, cyan, amber, orange) — this is the Stage 11 loop |
| Key screens | home `/`, about `/about`, learning journeys `/journeys`, a category page `/category/<slug>`, resource detail `/resource/<id>`, login `/login` (→ `/sign-in`), theme settings `/settings/theme`, the 404 page (any unknown route) |
| Widths | desktop `1440` and phone `375` (the design's tablet cut is exercised by the 375 drawer and the 1440 sidebar; add `768` when a finding is width-specific) |
| Extras | the mobile drawer open at 375 (every system) and the ⌘K command palette open on home at 1440 (every system) |
| Boot | Stage 3 runs once per stored system on every screen × width |

A verdict that does not cover this matrix is not a verdict for the site; say
what was skipped and why.

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

**Browser execution.** Evaluate the three expressions above in-page after the
app has loaded (the driver waits for `window.applyDesignSystem`). For the CSS
check, walk `document.styleSheets` and require at least one sheet whose
`:root` rule declares `--bg` — in a bundled app the token block is compiled
into the app stylesheet (production: a `<link>` to `/assets/*.css`; Vite dev:
an injected `<style>`), and the JS definitions are compiled into the bundle,
which is what "loaded" means here.

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

**Browser execution.** Evaluate verbatim on load, and again after every
system switch in the Stage 11 loop (the attribute must equal the system just
applied and the accent its default).

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

**Browser execution.** A source read alone cannot prove "before first paint";
the driver proves it three ways for **each stored system** (localStorage
`ds-system` / `ds-accent` seeded before navigation):

1. *Bundle-blocked paint* — the app entry script is blocked at the network
   layer and the document is loaded: `html[data-system]` / `[data-accent]`
   must already equal the stored pair, and (in production, where the token
   stylesheet is a `<link>`) `--bg` must resolve. A viewport screenshot of
   this state is saved as `<screen>__<width>__<system>__stage3-prebundle.png`.
2. *Real load* — an init script records the same attributes at
   `DOMContentLoaded` and at the first animation frame; both must equal the
   stored pair.
3. *Source shape* — the `<head>` script that reads `ds-system` must be an
   inline script with no `type="module"`, `defer` or `async`.

A React `useEffect` that re-applies the same pair afterwards is fine (see
`docs/13-integration-react.md`); a mismatch in (1) or (2) is the flash.

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

**Browser execution.** Evaluate verbatim on every screen. The driver also
records that `.grain` has a non-`none` `background-image` and its computed
opacity, and that the atmosphere image resolves on `.page` (or on its
`::after`, where a port paints it), so a present-but-empty wrapper is caught.

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

**Browser execution.** This stage runs against the repository, not the page.
The driver runs the five commands above verbatim with `src/` =
`client/src` and the design-system stylesheet excluded, then classifies each
hit against the *Acceptable hardcoded values* list plus the skill's own
"intentional escape" rule (a `DS-OK:` comment on the line or within the three
lines above). Every remaining hit is listed as a **candidate**; each candidate
you cannot justify from the list is one 🟡 FIX. Read the acceptable hits too —
a `DS-OK` comment must state a reason that fits the list (on-accent ink, fixed
SVG paint, status semantics, print media, a value the design itself fixes).

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

**Browser execution.** Evaluated on every screen, in every system, after each
Stage 11 switch (Radix portals mount lazily, so the drawer and palette extras
are evaluated open).

- *Buttons.* The expression above is run verbatim and its count recorded as
  `strayExact`. Its class-prefix list is narrower than the design's own
  markup: `styles.css` and the handoff `layout.jsx` render `<button>`s with
  `.accordion-header`, `.header-search-trigger`, `.user-pill`,
  `.mobile-menu-btn` and `.ds-system-pill`, a clickable card is a `<button
  class="card hoverable">` by the *Cards* rule, `.chip` is the class for an
  interactive chip, `.nav-link`/`.footer-link` and `.sub-item` are the nav
  rows, and a Radix `role="combobox"` trigger is the `.select` control. A
  button carrying any of these design-system component classes is therefore
  compliant; the driver reports the remainder as `strayExtended`, and **that**
  list is the finding: one 🟡 FIX per element. (A button with none of the
  design's classes — Tailwind-only or a bespoke class — is exactly the
  forbidden pattern.)
- *Inputs.* Text-entry controls only (`type` empty/text/search/email/url/
  password/number/tel/date/time…) must carry `.input` (the header/drawer
  search field is `.search-input`); every `<select>` and every
  `role="combobox"` trigger must carry `.select`; every `<textarea>` must
  carry `.textarea`. `hidden`, checkbox/radio/range/file/colour inputs are not
  text controls and are not counted. The ⌘K command palette's field
  (`[cmdk-input]`) is the one class-less text input: the design's own
  `CmdPalette` (`layout.jsx`) renders it bare and skins it through the palette
  rule, and the app does the same (`.search-palette [cmdk-input]`), so it is
  recognised as the design's field, not a stray.
- *Keyboard hints.* Every `<kbd>` must carry `.kbd` (the command palette's own
  `.search-palette kbd` rule is the design's palette skin).
- *Cards / section labels.* The driver lists heuristic candidates (bordered
  clickable containers ≥160×72 without `.card`; mono, uppercase, tracked,
  ≤12px labels without `.eyebrow`). Judge each against the rule text: a label
  that names a **content section, card or block** is an eyebrow; a nav-group
  heading, table header, count or timestamp is meta (docs/06 "mono is the
  meta-language") and is not a finding.

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

**Browser execution.** The expression is run verbatim and its count recorded
(`exactExpressionCount`). Note that browsers report computed colours as
`rgb()` strings, so the hex-substring comparison in the expression cannot
match a rendered colour; the driver therefore also resolves `--accent` through
the CSSOM to its `rgb()` form and counts **accent moments**: rendered elements
that *introduce* the accent (text colour not inherited from an accent-coloured
ancestor, or an accent background/border), excluding off-document elements
such as a parked skip-link. One component repeated down a list — every card's
mark, every card's CTA, every row's live-dot — is the design's own anatomy
(docs/10 "Putting it together: a resource card") and counts as **one** accent
pattern, so moments are de-duplicated by element tag + class signature. The
"≤ 8 per viewport-worth of content" rule is then applied as the maximum number
of distinct patterns inside any viewport-sized window down the page
(`maxPerViewport`; the raw instance count is reported alongside). Over 8 →
🟡 FIX; the driver lists the patterns so you can name which are outside the
reserved list, and a pattern outside that list is a finding regardless of the
count (accent on random underlines, chips, decorative borders or bullets).

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

**Browser execution.** Run verbatim (`exactExpressionCount`), then again with
the token normalised through the CSSOM (the authored `rgba(244,243,238,0.52)`
and the computed `rgba(244, 243, 238, 0.52)` differ only in whitespace, so
the literal comparison misses real offenders). The normalised list — rendered
`p`/`li` over 60 characters in `--text-3` **or** `--text-4` — is the finding.

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

**Browser execution.** Run verbatim for the display family after each Stage
11 switch. `document.fonts.check()` also returns `true` when *no* face for
the family exists (nothing to load), so the driver additionally requires, for
the display, body **and** mono family of the active system, a `FontFace` in
`document.fonts` with `status === 'loaded'` (it renders a probe glyph in each
family and waits up to 15 s for the faces), and confirms the Google Fonts
`<link>` declares each family. All three families loaded → PASS; a family
with no face or a face that never loads → 🟡 FIX. The audit browser must be
able to reach `fonts.googleapis.com` and `fonts.gstatic.com`; if it cannot,
say so — a network-blocked font is an environment fact, not a site finding,
and the run is incomplete for this stage.

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

**Browser execution.** The command is run verbatim against the app's
design-system stylesheet (`client/src/styles/design-system.css`), and the
same count is taken in the browser from `document.styleSheets` (rules whose
selector contains `[data-system=`) so a stripped production build is caught
even when the source file is intact. Both must be ≥ 15.

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

**Browser execution.** The loop above is run verbatim on every screen × width,
and after each 800 ms wait the driver takes a **full-page screenshot**
(`<screen>__<width>__<system>.png`) and evaluates Stages 2, 6, 7, 8 and 9 in
that system. It also records a component signature per system (the token
values and the computed radius / border-width / shadow / family of the first
`.card`, `.btn`, `.chip`, `.input` and `main h1`) and flags **"looks the same in
every system"** when the five signatures are identical, plus the symptom-table
checks it can measure (card radius 0 in Terminal/Brutalist, 2px card border in
Brutalist, `[` bracket on Terminal chips, the display family per system).
The screenshots are the evidence for this stage: open all of them. Any symptom
from the table that you can see, or that the driver measured, is a 🔴 BLOCK.

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

**Browser execution — filling the block for a whole site.** `System
detected` is the pair the site booted into for a fresh visitor (Stage 2 on
load); the five systems you cycled are listed under *What's good* for Stage 11.
`Files audited` lists the run directory, the URL and build revision audited,
the key screens × widths, and every screenshot path you reviewed (or the
directory plus the count, when you reviewed all of them). Every finding names
the stage, the screen(s), the width and the system(s) it appeared in. A stage
that passed on every screen and in every system is one line under *What's
good* naming the coverage; a stage that could not be executed is reported as
such under *Recommended next steps* — never as PASS.

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
- **Browser edition additions.** Run the driver yourself against the URL you
  were given; do not reuse another run's directory. Open the screenshots.
  Quote the driver's numbers in your findings, but the verdict is yours: if
  a screenshot contradicts a machine PASS, the screenshot wins and you say
  so. If the environment blocked something (fonts, a route, the browser),
  report the stage as not executed rather than guessing.

---

## When to *not* run this skill

- The user has explicitly opted into a partial DS adoption (e.g.
  "we only use the buttons"). Run only the relevant stages.
- The page is a third-party embed or iframe — out of scope.
- The user is asking about visual design, not implementation.

---

**Source of truth:** the design system specs in `/docs` and the
contract in `HANDOFF.md`. If this skill conflicts with those, those win
and this file should be updated. (In this repository those are the
handoff files vendored under `awesome-list-site-ds/`, identical to the
maintainer-supplied archive.)

---

## Appendix · Repository automation hooks (not part of the 11 stages)

The eleven stages above are the design system's own, unchanged. This
appendix carries the repository's *additional* static detectors, which two
checked-in gates parse out of this file and keep literal-for-literal in sync
with their executable copies:

- `scripts/validation/palette-drift.mjs` reads the Stage 5 supplement below
  (the Tailwind palette-class command) and ratchets every hit against
  `scripts/validation/palette-drift-baseline.json`.
- `scripts/validation/ds-button-sweep.mjs` reads the six `### … sweep`
  snippets below and compares their string/regex literals with
  `scripts/validation/ds-button-filter.mjs`.

Nothing here changes a stage's severity, threshold or verdict. A hit from a
supplement is triaged exactly like the stage it supplements (Stage 5 → 🟡 FIX
per occurrence; Stage 6 → 🟡 FIX per offending element, after the ladder).

### Stage 5 supplement — the repository's scan set

```bash
# Hex colors in app code (excluding the DS sources of truth)
rg '#[0-9a-fA-F]{3,8}\b' client/src \
  --glob '!client/src/styles/design-system.css' \
  --glob '!client/src/index.css' \
  --glob '!client/src/lib/charts/palette.ts'

# Tailwind palette classes (bg-zinc-900, text-red-500, …) — forbidden
rg -n '\b(bg|text|border(?:-[xytrblse])?|ring|fill|stroke|from|via|to|divide|outline|decoration|shadow|accent|caret|placeholder|ring-offset|inset-ring|inset-shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b' client/src

# Raw radii / borders that bypass the ladders
rg 'border(-radius)?:\s*\d+px|rounded-\[\d+px\]' client/src \
  --glob '!client/src/styles/design-system.css'

# Raw font-family strings
rg "font-family:\s*['\"]" client/src \
  --glob '!client/src/styles/design-system.css' \
  --glob '!client/index.html'

# rgb()/rgba() literals (inline style values included) — off-system colors
# hiding from the hex scan. rgba(var(--…))-composed values are on-system.
rg -i '\brgba?\(' client/src \
  --glob '!client/src/styles/design-system.css' \
  --glob '!client/src/index.css' \
  --glob '!client/src/lib/charts/palette.ts' \
  | rg -v 'var\(\s*--'
```

> **These scans are enforced automatically for the app.** The
> `palette-drift` validation gate (`scripts/validation/palette-drift.mjs`)
> runs all five regexes above over `client/src` on every validation run and
> fails on any NEW hit. Pre-existing hits (the site-wide sweep is landing
> incrementally) are pinned in
> `scripts/validation/palette-drift-baseline.json` keyed by
> (detector, file, matched token) with per-token counts — every individual
> match counts, so appending a second forbidden class to a line that already
> carries a legacy hit, or swapping a legacy token for a different forbidden
> one, fails even though line totals are unchanged. The baseline is an
> explicit allowlist that may only shrink: cleaning hits makes the gate
> demand `node scripts/validation/palette-drift.mjs --update-baseline`
> (commit the shrunken baseline alongside), and that command itself refuses
> to write while any count sits above the baseline, so it cannot launder new
> violations in. Lines tagged `/* DS-OK: reason */` — with a written reason
> after `DS-OK` — on the same line or within the previous 5 lines are exempt,
> matching the "Acceptable hardcoded values" list below. A bare `DS-OK` tag,
> or one followed only by punctuation/whitespace, is not an exemption and is
> reported as a hit missing its written reason. 3–4-digit all-numeric
> `#307`-style issue references are ignored. All four value scans — hex, rgb/rgba, raw radii/borders and
> font-family — honor the same tag, so a value that genuinely cannot ride
> the token ladder (a webkit scrollbar thumb, a forced-colors border, a
> literal stack in a standalone export document) can stay put with a written
> reason instead of being converted or hidden behind a whole-file exclusion,
> which would also mask every future violation in that file. Raw Tailwind
> palette classes are the one detector with no escape hatch — there is
> nothing to justify. The 5-line lookback is a hard cap: a tag further above
> does not reach the hit, so a long justified block needs a tag roughly
> every 5 entries, and the tag's own prose is scanned too (describe values
> by name, not by literal). The rgb()/rgba() scan additionally
> whitelists token-derived composition by construction — any match whose
> body references `var(--…)` (e.g. `rgba(var(--accent-rgb), 0.4)`) is
> on-system, since the color comes FROM a token; its match identity strips
> whitespace and lowercases, so reformatting a pinned literal never churns
> the baseline. The gate self-tests its detectors and ratchet classifier
> against known-bad/known-good canary samples on every run, so a regex
> regression cannot pass vacuously. A manual stage-5 audit still adds value
> for standalone artifacts, run
> `npm run validate:standalone-palette-drift`. That check discovers every
> manifest-backed root under `artifacts/`, excludes only the token source
> stylesheets, and fails on bare or punctuation-only `DS-OK` markers with the
> same written-reason rule. It also fails when a source-bearing top-level
> `artifacts/` directory has no artifact manifest. Exact-path exclusions are
> reserved for non-UI evidence bundles and must include a written reason in
> the executable scope contract. The canonical design archive
> `awesome-list-site-ds/` is a *frozen reference root*: it is never served,
> is contractually byte-identical to the upload recorded in
> `docs/parity/source-sync.json`, and is validated through the registered
> artifact that ports it — so the gate does not scan it, but it does verify
> on every run that the directory still matches the archive file for file;
> any edit there fails the gate until it is restored or moved into the
> artifact. Its executable scope contract is checked against this guidance on
> every run:
>
> <!-- standalone-palette-drift-scope
> roots = ["artifacts/*/.replit-artifact/artifact.toml"]
> sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".scss", ".html", ".svg", ".md"]
> ignoredDirectories = [".git", "dist", "node_modules", "uploads", "docs"]
> tokenSourceExclusions = ["**/design-system.css", "artifacts/*/src/index.css"]
> unmanifestedArtifactExclusions = [{"path":"artifacts/r6","reason":"release-audit evidence bundle containing claims Markdown and screenshots, not a runnable UI artifact"}]
> frozenReferenceRoots = [{"path":"awesome-list-site-ds","reason":"canonical design archive kept byte-identical to the upload; validated through its registered artifact port"}]
> -->


### Stage 6 supplement — DOM sweeps

Since the primitives in `client/src/components/ui/*` emit the design
system's class API directly (`Button` → `.btn`, `Badge` → `.chip`,
`Card` → `.card`, `Input`/`Textarea`/`SelectTrigger` → `.input`/`.textarea`/
`.select`, `Tabs` → `.tabs`/`.tab`), the Stage 6 expression in the stage
itself is authoritative. The sweeps below are the older, broader detectors the
`ds-button-sweep` gate still runs across public, overlay-open, signed-in and
admin routes; they stay so that gate keeps working. Triage a hit with the
ladder:

1. **Does it render from `client/src/components/ui/*`?** The primitives emit
   the class API and are compliant by construction. Not a finding.
2. **Is it on the known composite chrome list?** Not a finding. The list is
   the exclusions written into the snippets: the AppSidebar taxonomy rows and
   their disclosure buttons, the header search trigger (`aria-label="Open
   search"`), `aria-pressed` facet/tag rows, active-filter removal chips, in-card
   tag expanders, and the three small text buttons named by `data-testid`.
3. **Is it fully tokenized composite chrome?** A hand-written control is
   compliant when its layout cannot be expressed by the primitive, every
   color/border/radius resolves through `var(--token)` refs or the class API,
   and it keeps the focus ring and its hit-area floor (≥44px standalone,
   ≥24px inline text link). Suggest the primitive as a 🟢 NIT.
4. **Otherwise** it is a 🟡 FIX: rebuild on the primitive, or tokenize.

### Button sweep

```js
const stray = [...document.querySelectorAll('button')].filter(b =>
  /* 1 · the Button primitive (emits .btn + data-ds-variant) */
  !b.hasAttribute('data-ds-variant') &&
  /* 2 · other shadcn/Radix primitives from @/components/ui
         (tabs, switch, checkbox, select, accordion, cmdk, carousel…).
         NB: overlay CONTAINERS (cmdk palette, popover/dropdown popper
         content) are NOT blanket-excluded — a button inside an open
         overlay must qualify one-by-one like everything else, so rogues
         in dialogs/popovers/menus are reportable. */
  !b.matches('[data-state], [data-radix-collection-item], [cmdk-item], [role="switch"], [role="checkbox"], [role="tab"], [role="combobox"]') &&
  !b.closest('[data-sidebar]') &&
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
  /* 4 · the DS class API on hand-written markup */
  ![...b.classList].some(c => /^(btn|tab|icon-btn)/.test(c))
);
stray  // → [] expected on the app's public routes; triage any hit with the ladder below
```

### Input sweep

```js
const stray = [...document.querySelectorAll('input, select, textarea')].filter(el =>
  /* 1 · legacy bridge border classes still used by admin/third-party surfaces */
  !el.classList.contains('border-input') &&
  !el.classList.contains('border-[var(--border-strong)]') &&
  /* 2 · primitives / non-text controls that legitimately wrap raw inputs */
  !el.matches('[cmdk-input], [type="hidden"], [type="checkbox"], [type="radio"], [type="range"], [type="file"], select[aria-hidden="true"]') &&
  !el.classList.contains('sr-only') &&                    // peer-hidden toggle inputs (select[aria-hidden] = Radix Select's off-screen native bridge)
  !el.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper]') &&
  /* 3 · known tokenized native controls (verified compliant — list below) */
  el.getAttribute('data-testid') !== 'select-subcategory-filter' && // TaxonomyListing scope filter
  /* 4 · the DS class API on hand-written markup */
  ![...el.classList].some(c => /^(input|search-input|select|textarea)$/.test(c))
);
stray  // → [] expected; triage hits with the stage-6 ladder above
```

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
  /* 2 · legacy badgeVariants signature (rounded-full + focus:ring-ring) */
  !(el.classList.contains('rounded-full') && el.classList.contains('focus:ring-ring')) &&
  /* 3 · shadcn/Radix chrome that renders pill-shaped bits */
  !el.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper]') &&
  /* 4 · known composite chrome (verified compliant — list in SKILL.md) */
  el.getAttribute('data-testid') !== 'badge-notification-count' && // AppHeader bell unread count dot
  /* 5 · the DS class API (.chip / .kbd) */
  !el.classList.contains('chip') &&
  !el.classList.contains('kbd')
);
stray  // → [] expected; a hit is a hand-rolled pill that skipped Badge
```

### Card sweep

```js
const stray = [...document.querySelectorAll('*')].filter(el =>
  /* candidates: legacy bg-card surfaces (the Card primitive now emits .card) */
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
  /* 3 · the DS class API (.card) */
  !el.classList.contains('card')
);
stray  // → [] expected; a hit is an interactive card missing data-ds="card-hover"
```

### Page-title sweep

```js
const stray = [...document.querySelectorAll('h1')].filter(h =>
  /* 1 · the DS display-heading helper — per-system display fonts key on it,
         and pinning font-sans/font-medium over it defeats the tokens */
  (!h.classList.contains('display-h') ||
    h.classList.contains('font-sans') ||
    h.classList.contains('font-medium')) &&
  /* 2 · screen-reader-only page titles (invisible — nothing to switch) */
  !h.classList.contains('sr-only')
);
stray  // → [] expected; a hit is a page title that skips the display tokens
```

### Eyebrow sweep

```js
const eyebrowish = (el) => {
  if (el.childElementCount > 2) return false;
  const text = (el.textContent || '').trim();
  if (!text || text.length > 60) return false;             // labels are short
  const s = getComputedStyle(el);
  if (s.textTransform !== 'uppercase') return false;        // all-caps via CSS
  if (!/mono|menlo|consolas|courier/i.test(s.fontFamily)) return false;
  if (parseFloat(s.fontSize) > 14) return false;            // label scale
  return el.getBoundingClientRect().height > 0;             // visible
};
const stray = [...document.querySelectorAll('p, div, span, a, h2, h3, h4, h5, h6, legend, figcaption')].filter(el =>
  eyebrowish(el) &&
  /* 1 · the DS eyebrow helper (self, or child bits like the ── dash) */
  !el.closest('.eyebrow') &&
  /* 2 · chips/badges — mono+uppercase comes from the Badge primitive */
  !el.closest('[data-ds="chip"]') &&
  !(el.classList.contains('rounded-full') && el.classList.contains('focus:ring-ring')) &&
  /* 3 · keyboard hints + code samples — mono by nature, not section labels
         (covers the <kbd> itself, wrappers around one, and sibling captions
         like the search dialog's "esc · to close") */
  !el.closest('code, pre, kbd, .kbd') &&
  !el.querySelector('kbd, .kbd') &&
  !(el.parentElement && el.parentElement.querySelector(':scope > kbd, :scope > .kbd')) &&
  /* 4 · shadcn/Radix + reference sidebar chrome */
  !el.closest('[data-sidebar], [cmdk-root], [data-radix-popper-content-wrapper]')
);
stray  // → [] expected; a hit is a hand-pinned mono-uppercase label that skipped .eyebrow
```
