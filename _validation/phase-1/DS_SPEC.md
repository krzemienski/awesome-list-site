# Phase 1 · Design-System Spec (DS_SPEC)

> Full extraction of the **Awesome.Video Design System** contract from
> `awesome-list-site-ds/`. This is the *target* spec the rest of the
> migration must converge on. No interpretation, no abridgement — every
> token, class, and rule from the source DS is captured here so later
> phases can reference a single document.
>
> **Sources:** `awesome-list-site-ds/styles.css` (678 lines),
> `awesome-list-site-ds/design-systems.jsx` (347 lines),
> `awesome-list-site-ds/HANDOFF.md` (871 lines),
> `awesome-list-site-ds/docs/{04-tokens, 10-components, 17-accessibility}.md`.

---

## 0 · DECISION REQUIRED — single system vs all five

The upstream DS ships **5 systems × 10 accents = 50 distinct skins**, all
runtime-swappable via `applyDesignSystem(systemId, accentId)`. The user
must pick one of two posture options before Phase 5 implementation:

### Option A — **Ship Terminal only (RECOMMENDED)**

- **Why recommended:**
  1. The current app is already a "pure black cyberpunk" theme with
     `--radius: 0rem`, JetBrains Mono everywhere, neon accents. Terminal
     is the DS system that matches this aesthetic 1:1 (square edges,
     mono everywhere, scanline overlay, accent-as-glow, no shadows).
     Migration is a token rename, not a redesign.
  2. Zero risk of "FOUT across systems" (no need for `themes.css`
     pre-build or boot-script attribute pinning).
  3. Cuts CSS/JS payload to ~6 KB + ~1 KB (HANDOFF §11) vs. ~30 KB
     full kit.
  4. Eliminates the system-picker UI we'd otherwise need to design,
     test, and document.
  5. Replit deploy + admin panel don't benefit from per-user theme
     switching — single-tenant content site.
- **What we keep:** all 30 tokens, the full component class API
  (`.btn`, `.card`, `.chip`, `.eyebrow`, `.field`, `.tabs`, `.table`,
  `.dot`, `.live-dot`, `.sidebar`, `.accordion-*`, `.mobile-drawer`,
  `.modal`, `.kbd`), the 10 accents (so brand color is still a runtime
  choice), the `applyDesignSystem(systemId, accentId)` API surface
  (locked to `systemId='terminal'`), `[data-system="terminal"]` skin
  block.
- **What we drop:** Editorial, Geist, Brutalist, Swiss entries in
  `DESIGN_SYSTEMS`, their skin blocks in `styles.css`, the Fraunces /
  Geist / Instrument Serif / Manrope / Space Grotesk web-font imports
  (keep IBM Plex Mono + the existing JetBrains Mono fallback).

### Option B — **Ship all 5 systems with picker**

- User-facing system picker at `/settings/theme` (route already exists).
- Requires Phase 5 to build the picker UI, persist choice in
  `localStorage`, add no-flash boot script in `client/index.html`
  `<head>`, ship full font kit (~5 families, ~150 KB).
- Each Phase 6 screenshot becomes a 5× matrix (one per system).

### My recommendation

**Option A (Terminal-only).** It's the smallest viable form factor that
preserves the system's contract and matches the app's existing visual
identity. The full 5-system kit is overkill for a single-tenant resource
viewer; the picker would be a feature in search of a user. Default
accent: **Matrix `#00ff88`** (the Terminal default per
`SYSTEM_DEFAULT_ACCENT.terminal`), which is already close to the app's
current cyan accent.

→ **User must confirm A or B before Phase 4 (Remediation Plan).** All
sections below document the *complete* contract so the spec is valid
under either choice.

---

## 1 · Token contract — 30 tokens per page

From `docs/04-tokens.md` + `design-systems.jsx` lines 8-267. Every
component reads tokens via `var(--*)`. **No magic numbers, no hex codes
outside `design-systems.jsx`.**

### 1.1 Surface (8)

| Token | Editorial default | What it controls |
|---|---|---|
| `--bg` | `#000000` | Page bg. **Always pure black across all 5 systems.** |
| `--bg-2` | `#070706` | Sidebars, code blocks, modal bg. Near-black. |
| `--surface` | `rgba(244,243,238,0.025)` | Card/input idle (~2–4 %). |
| `--surface-2` | `rgba(244,243,238,0.05)` | Card hover, secondary surface (~5–8 %). |
| `--surface-3` | `rgba(244,243,238,0.08)` | Pressed / focused surface (~8–12 %). |
| `--bg-atmosphere` | radial gradient | Bg art behind everything. Terminal = scanlines; Swiss = grid lines; Brutalist = `none`. |
| `--bg-atmosphere-size` | `auto` | Optional sizing for repeating patterns. |
| `--grain-opacity` | `0.32` | Noise overlay strength (`0` Geist, `0.18` Swiss, `0.32` Editorial, `0.5` Terminal, `0.55` Brutalist). |

### 1.2 Border (5)

| Token | Default | Notes |
|---|---|---|
| `--border` | `rgba(244,243,238,0.08)` | Default edge. |
| `--border-strong` | `rgba(244,243,238,0.16)` | Hover/active edge. |
| `--hairline` | `rgba(244,243,238,0.06)` | Table sub-divider. |
| `--border-w` | `1px` | Default border width. **2 px in Brutalist.** |
| `--hairline-w` | `1px` | Sub-divider width. **0.5 px in Swiss.** |

### 1.3 Text (4) — ALWAYS four tiers

| Token | Default | Contrast on `#000` | Use |
|---|---|---|---|
| `--text` | `#f4f3ee` | 14.0:1 (AAA any) | Primary ink, headlines. |
| `--text-2` | `rgba(244,243,238,0.66)` | ~8.5:1 (AAA normal) | Body copy. |
| `--text-3` | `rgba(244,243,238,0.4)` | ~4.6:1 (AA only) | Meta, captions. **Never body.** |
| `--text-4` | `rgba(244,243,238,0.22)` | ~2.7:1 | Decorative / disabled only. |

> **RULE:** Four tiers, no `--text-1.5`. If the layout can't make do, the
> *layout* is wrong, not the system.

### 1.4 Type (9)

| Token | Default | Notes |
|---|---|---|
| `--font-display` | `'Fraunces', Georgia, serif` | Headlines. |
| `--font-body` | `'Inter', system-ui, sans-serif` | UI + prose. |
| `--font-mono` | `'JetBrains Mono', monospace` | Code, eyebrows, keys. |
| `--display-weight` | `500` | 400 (Brutalist) → 700 (Swiss). |
| `--display-tracking` | `-0.02em` | Tight. |
| `--display-leading` | `1.04` | Tight. |
| `--body-leading` | `1.6` | Generous. |
| `--eyebrow-tracking` | `0.18em` | Mono eyebrow letter-spacing. |
| `--mono-size-step` | `11px` | Mono micro-scale base size. |

### 1.5 Shape (3)

| Token | Default | Notes |
|---|---|---|
| `--radius` | `12px` | **0 in Terminal & Brutalist.** |
| `--radius-sm` | `8px` | Chips, inputs. |
| `--radius-pill` | `999px` | Pills. **0 in Terminal & Brutalist.** |

### 1.6 Shadow (4)

| Token | Default | Notes |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Resting. `none` in Terminal & Swiss. |
| `--shadow` | `0 6px 24px -8px rgba(0,0,0,0.5)` | Hover. |
| `--shadow-lg` | `0 24px 60px -20px rgba(0,0,0,0.7)` | Modal / floating. |
| `--shadow-accent` | accent halo | Hover accent glow. |

### 1.7 Accent (2) — set per page, not per system

| Token | Default | Notes |
|---|---|---|
| `--accent` | `#ff3d52` (Crimson) | Primary accent — the chromatic moment. |
| `--accent-2` | `#b84dff` | Companion for gradients & secondary highlights. |

**Contract total — reconciled.** The source `docs/04-tokens.md`
"Reference" block headline reads *"Total: 28 system-defined + 2
accent-defined = 30 active tokens per page"* and its parenthetical adds
*"`design-systems.jsx` defines a few extras like `--bg-atmosphere-size`
that not every system needs; the contract above is the minimum."* The
full enumeration in §1.1–§1.7 above is **35 tokens** (Surface 8 + Border
5 + Text 4 + Type 9 + Shape 3 + Shadow 4 + Accent 2). The discrepancy
is the 5 "atmosphere/widths/grain" extras (`--bg-atmosphere`,
`--bg-atmosphere-size`, `--grain-opacity`, `--border-w`, `--hairline-w`)
which the source treats as optional. **For this migration we treat the
full 35 as in-scope** — every system in `design-systems.jsx` actually
declares all of them (modulo `--bg-atmosphere-size`, set only by Swiss),
and Phase 3 will lint against the 35-token list, not the 30 minimum.

### 1.8 Full per-token × per-system value matrix

> Verbatim from `awesome-list-site-ds/design-systems.jsx` lines 14-267.
> Rows = the 35 tokens in the contract. Columns = the 5 systems. Empty
> cell = system does not explicitly set this token (only `--bg-atmosphere-size`
> qualifies — set by Swiss only). Phase 3 lints the live app's effective
> styles against this matrix.

#### Surface

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| `--bg` | `#000000` | `#000000` | `#000000` | `#000000` | `#000000` |
| `--bg-2` | `#070706` | `#040404` | `#0a0a0a` | `#0a0a0a` | `#050506` |
| `--surface` | `rgba(244,243,238,0.025)` | `rgba(0,255,136,0.012)` | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.025)` | `rgba(250,250,248,0.018)` |
| `--surface-2` | `rgba(244,243,238,0.05)` | `rgba(0,255,136,0.025)` | `rgba(255,255,255,0.07)` | `rgba(255,255,255,0.06)` | `rgba(250,250,248,0.04)` |
| `--surface-3` | `rgba(244,243,238,0.08)` | `rgba(0,255,136,0.05)` | `rgba(255,255,255,0.1)` | `rgba(255,255,255,0.1)` | `rgba(250,250,248,0.07)` |
| `--bg-atmosphere` | radial 1100×700 @ 88%/-8% accent 7% + radial 900×500 @ -8%/110% accent-2 6% | scanline `repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,0.018) 2px, rgba(255,255,255,0.018) 3px)` + radial 800×600 @ 50%/50% accent 4% | radial 1200×800 @ 50%/-20% white 3% | `none` | crossed-grid 1 px `linear-gradient(0deg, transparent calc(100%-1px), rgba(250,250,248,0.04) calc(100%-1px))` × 90deg |
| `--bg-atmosphere-size` | — | — | — | — | `64px 64px, 64px 64px` |
| `--grain-opacity` | `0.32` | `0.5` | `0` | `0.55` | `0.18` |

#### Border

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| `--border` | `rgba(244,243,238,0.08)` | `rgba(232,232,224,0.14)` | `rgba(255,255,255,0.1)` | `rgba(245,245,240,0.85)` | `rgba(250,250,248,0.085)` |
| `--border-strong` | `rgba(244,243,238,0.16)` | `rgba(232,232,224,0.32)` | `rgba(255,255,255,0.18)` | `rgba(245,245,240,1)` | `rgba(250,250,248,0.18)` |
| `--hairline` | `rgba(244,243,238,0.06)` | `rgba(232,232,224,0.08)` | `rgba(255,255,255,0.07)` | `rgba(245,245,240,0.18)` | `rgba(250,250,248,0.05)` |
| `--border-w` | `1px` | `1px` | `1px` | `2px` | `1px` |
| `--hairline-w` | `1px` | `1px` | `1px` | `1px` | `0.5px` |

#### Text

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| `--text` | `#f4f3ee` | `#e8e8e0` | `#fafafa` | `#f5f5f0` | `#fafaf8` |
| `--text-2` | `rgba(244,243,238,0.66)` | `rgba(232,232,224,0.62)` | `rgba(250,250,250,0.62)` | `rgba(245,245,240,0.7)` | `rgba(250,250,248,0.62)` |
| `--text-3` | `rgba(244,243,238,0.4)` | `rgba(232,232,224,0.36)` | `rgba(250,250,250,0.38)` | `rgba(245,245,240,0.4)` | `rgba(250,250,248,0.38)` |
| `--text-4` | `rgba(244,243,238,0.22)` | `rgba(232,232,224,0.2)` | `rgba(250,250,250,0.2)` | `rgba(245,245,240,0.22)` | `rgba(250,250,248,0.2)` |

#### Type

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| `--font-body` | `'Inter', system-ui, sans-serif` | `'IBM Plex Mono', ui-monospace, monospace` | `'Geist', 'Inter', system-ui, sans-serif` | `'Space Grotesk', system-ui, sans-serif` | `'Manrope', system-ui, sans-serif` |
| `--font-display` | `'Fraunces', Georgia, serif` | `'IBM Plex Mono', ui-monospace, monospace` | `'Geist', 'Inter', system-ui, sans-serif` | `'Instrument Serif', 'Times New Roman', serif` | `'Manrope', system-ui, sans-serif` |
| `--font-mono` | `'JetBrains Mono', ui-monospace, monospace` | `'IBM Plex Mono', ui-monospace, monospace` | `'JetBrains Mono', ui-monospace, monospace` | `'JetBrains Mono', ui-monospace, monospace` | `'IBM Plex Mono', ui-monospace, monospace` |
| `--display-weight` | `500` | `600` | `600` | `400` | `700` |
| `--display-tracking` | `-0.02em` | `-0.01em` | `-0.035em` | `-0.04em` | `-0.045em` |
| `--display-leading` | `1.04` | `1.1` | `1.05` | `0.92` | `1` |
| `--body-leading` | `1.6` | `1.55` | `1.55` | `1.5` | `1.55` |
| `--eyebrow-tracking` | `0.18em` | `0.2em` | `0.06em` | `0.24em` | `0.14em` |
| `--mono-size-step` | `11px` | `12px` | `11px` | `11px` | `10.5px` |

#### Shape

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| `--radius` | `12px` | `0px` | `10px` | `0px` | `4px` |
| `--radius-sm` | `8px` | `0px` | `6px` | `0px` | `2px` |
| `--radius-pill` | `999px` | `0px` | `999px` | `0px` | `999px` |

#### Shadow

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | `none` | `0 1px 2px rgba(0,0,0,0.4)` | `2px 2px 0 0 var(--text)` | `none` |
| `--shadow` | `0 6px 24px -8px rgba(0,0,0,0.5)` | `none` | `0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.4)` | `4px 4px 0 0 var(--text)` | `none` |
| `--shadow-lg` | `0 24px 60px -20px rgba(0,0,0,0.7)` | `0 0 0 1px var(--accent), inset 0 0 60px color-mix(in srgb, var(--accent) 8%, transparent)` | `0 0 0 1px rgba(255,255,255,0.06), 0 24px 56px rgba(0,0,0,0.55)` | `8px 8px 0 0 var(--text)` | `0 24px 60px rgba(0,0,0,0.5)` |
| `--shadow-accent` | `0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent), 0 12px 36px -12px color-mix(in srgb, var(--accent) 40%, transparent)` | `0 0 0 1px var(--accent), 0 0 24px color-mix(in srgb, var(--accent) 30%, transparent)` | `0 0 0 1px color-mix(in srgb, var(--accent) 50%, transparent), 0 0 32px color-mix(in srgb, var(--accent) 25%, transparent)` | `4px 4px 0 0 var(--accent)` | `0 0 0 1px var(--accent)` |

#### Accent (set per page, not per system)

| Token | All 5 systems |
|---|---|
| `--accent` | One of the 10 `ACCENTS[*].primary` values (default per system = `SYSTEM_DEFAULT_ACCENT[sys]`). |
| `--accent-2` | The matching `ACCENTS[*].secondary` value. |

---

## 2 · The five systems

All five share: pure-black `--bg`, four-tier text ladder, accent-as-runtime
variable. Each overrides ~30 tokens AND sets `<html data-system="...">`
which drives skin selectors in `styles.css`.

### 2.1 Editorial — "Magazine · Fraunces"

> Refined editorial — italic Fraunces drops, warm ink, generous leading.

- Display: Fraunces serif, weight 500, italic accents reserved for `<em>`.
- Body: Inter, 1.6 leading.
- Radius: 12 / 8 / 999 (soft).
- Shadow: soft drop shadows + radial atmosphere.
- Skin highlights: `.eyebrow` is accent + bold 700; `.serif-italic` is accent.

### 2.2 Terminal — "CRT · IBM Plex Mono" **← recommended default**

> Mono-first terminal — square edges, scanlines, blinking carets.

- Display/body/mono: **all IBM Plex Mono.**
- Radius: `0` everywhere (`--radius`, `--radius-sm`, `--radius-pill` all 0).
- Border: 1 px, slightly stronger (`rgba(232,232,224,0.14/0.32)`).
- Shadow: `none` for sm/md; `--shadow-lg` is accent halo + inset glow.
- Atmosphere: scanline overlay (`repeating-linear-gradient` 2/3 px) +
  faint accent radial.
- Grain: `0.5`.
- Skin: square corners hard-forced; `.chip` uppercase + `[…]` brackets;
  `.btn.primary` is transparent outline with accent text-shadow glow;
  `.eyebrow` prefixed with `>` ; `.card.hoverable` glows accent on hover,
  no transform.
- Default accent: **Matrix `#00ff88`**.

### 2.3 Geist — "Modern · Geist Sans"

> Vercel-clean — neutral, soft 8 px radii, quiet hover glow.

- Display/body: Geist Sans, weight 600 display, tight tracking `-0.035em`.
- Radius: 10 / 6 / 999.
- Shadow: subtle 1 px frame + drop.
- No grain (`--grain-opacity: 0`).
- Skin: cards get neutral box-shadow on hover; `.chip` is sentence-case.
- Default accent: **Cyan `#5eddf2`**.

### 2.4 Brutalist — "Slab · Instrument Serif"

> Concrete slab — hard 2 px borders, offset shadows, monumental serif.

- Display: Instrument Serif, weight 400, tracking `-0.04em`, leading 0.92.
- Body: Space Grotesk.
- Radius: `0` everywhere.
- Border: 2 px, full-ink (`rgba(245,245,240,0.85)`).
- Shadow: hard offset (`4px 4px 0 0 var(--text)`).
- Grain: `0.55` (highest).
- Skin: cards hover with `translate(-2px,-2px)` + `6px 6px 0 0` shadow;
  `.btn` uppercase, 600, 12 px; `.btn.primary` filled accent w/ black ink.
- Default accent: **Amber `#ffb84d`**.

### 2.5 Swiss — "Grid · Manrope"

> Tight Swiss grid — hairline rules, lining figures, clinical whitespace.

- Display/body: Manrope, weight 700 display, tracking `-0.045em`.
- Radius: 4 / 2 / 999 (near-square).
- Border: 1 px, hairline `0.5 px` for sub-dividers.
- Shadow: `none` for sm/md; `--shadow-accent` is 1 px ring.
- Atmosphere: 64 px crossed grid lines (`linear-gradient` × 2).
- Grain: `0.18`.
- Skin: tnum/lnum/ss01 OpenType features on body; cards hover = border-color
  change only, no transform; `.eyebrow` mono + `text-3`.
- Default accent: **Orange `#ff7a3d`**.

### 2.6 Smart-default map (`SYSTEM_DEFAULT_ACCENT`)

```js
{ editorial: 'crimson', terminal: 'matrix', geist: 'cyan',
  brutalist: 'amber', swiss: 'orange' }
```

---

## 3 · Accent palette — 10 accents

From `design-systems.jsx` lines 271-282. Each accent provides `primary`
(used as `--accent`) and `secondary` (used as `--accent-2`). All accents
pass 4.5:1 contrast on `#000` (AA normal text). Test any new accent
against `#000` before adding (`docs/17-accessibility.md`).

| id | name | primary | secondary |
|---|---|---|---|
| `crimson` | Crimson | `#ff3d52` | `#b84dff` |
| `magenta` | Magenta | `#ec4899` | `#f472b6` |
| `orange` | Orange | `#ff7a3d` | `#ffb84d` |
| `amber` | Amber | `#ffb84d` | `#ffd86b` |
| `emerald` | Emerald | `#34d08c` | `#5ee6b8` |
| `matrix` | Matrix | `#00ff88` | `#39ff14` |
| `cyan` | Cyan | `#5eddf2` | `#7dd3fc` |
| `violet` | Violet | `#9d4edd` | `#c77dff` |
| `lime` | Lime | `#aaff00` | `#00ff88` |
| `rose` | Rose | `#ff7a8a` | `#ffb3c1` |

---

## 4 · `applyDesignSystem(systemId, accentId)` contract

From `design-systems.jsx` lines 322-346. **Single entry point** for all
system + accent switching.

### 4.1 Signature

```ts
type SystemId = 'editorial' | 'terminal' | 'geist' | 'brutalist' | 'swiss';
type AccentId =
  | 'crimson' | 'magenta' | 'orange' | 'amber' | 'emerald'
  | 'matrix'  | 'cyan'    | 'violet' | 'lime'  | 'rose';

window.applyDesignSystem(systemId: SystemId, accentId: AccentId): void;
```

### 4.2 Side effects (in order)

1. **Clear prior tokens.** Walks `root.__appliedKeys` (a tracked list of
   every CSS property previously set) and calls `removeProperty(k)` for
   each. Prevents token leak when switching systems (Pitfall 5).
2. **Apply system tokens.** For every entry in `DESIGN_SYSTEMS[id].vars`,
   `root.style.setProperty(k, v)`. Pushes each key onto `__appliedKeys`.
3. **Apply accent.** Looks up accent by id (falls back to first if not
   found), sets `--accent` and `--accent-2` on `:root`. Pushes both onto
   `__appliedKeys`.
4. **Set HTML attributes.** `html.setAttribute('data-system', id)` +
   `html.setAttribute('data-accent', accentId)`. These drive per-system
   skin selectors in `styles.css` (e.g. `[data-system="terminal"] .chip`)
   and per-accent overrides in the static `themes.css` (if pre-built).

### 4.3 Rules

- **Never set system-level tokens by hand.** Always go through the
  applier — bypassing it skips the clearing step and leaks tokens
  across switches.
- **A system must define every token.** Don't omit any. Falling through
  to defaults means Editorial's values, which is almost never intended.
- **Persistence is the caller's job.** The applier doesn't touch
  `localStorage`. The boot script reads `ds-system` / `ds-accent` from
  `localStorage` before any paint (see §6).

---

## 5 · Component class API

From `docs/10-components.md` + `styles.css`. **Cardinal rule: components
are classes.** No JS, no framework. Same markup, different system =
different skin.

| Class | Variants | Anatomy |
|---|---|---|
| `.btn` | `.primary`, `.ghost`, `.danger`, `.icon` | `9×16px` pad, 13 px / weight 500, `--radius-sm`. Icon = 36×36. |
| `.card` | `.hoverable`, `.glow` | Token-driven bg/border/radius/shadow. Composition: eyebrow → title → body (1 ¶ max) → footer meta. |
| `.chip` | `.accent`, `.ok` (#34d08c), `.warn` (#ffb84d), `.bad` (#ff5c7a), `.muted` | Mono caps tracked, surface fill. |
| `.kbd` | — | 10.5 px mono, hairline border, `--text-3`. |
| `.eyebrow` | — | Mono 11 px, `0.18em` tracked, uppercase, accent color. `── prefix` optional but recommended. |
| `.field` + `.input` / `.select` / `.textarea` | — | Flex col, 8 px gap, 12 px label. Input 10×14 pad, 13 px. Textarea uses mono. Focus → `mix(accent 50%, border-strong)`. |
| `.tabs` / `.tab.active` | — | Hairline bottom, 12–16 px pad. Active = accent + 2 px accent underline. |
| `.table` | — | 11 px uppercase mono header, 14 px row, hairline rows, hover bg = `--surface`. Right-align numerics. |
| `.dot` / `.live-dot` | `.ok` / `.warn` / `.bad` | 8 px static / 6 px pulsing. |
| `.sidebar` + `.accordion-item` / `.accordion-header.active` / `.accordion-body` + `.sub-item.active` | — | 280 px desktop / 240 tablet / hidden mobile. `max-height` on body drives anim. 2 px accent left rail on active. |
| `.mobile-drawer` + `.mobile-overlay` | `.open` on both | 86 % width, max 340 px, slides 280 ms cubic-bezier. Lock body scroll, overlay-click + Esc dismiss. |
| `.modal-backdrop` + `.modal` | — | Backdrop `rgba(0,0,0,0.7)` + 4 px blur. Modal 520 px / 90vh, `--bg-2` bg. Focus trap + Esc. |

### 5.1 Per-system skin highlights

(Distilled from `styles.css` lines 506-621 — the `PER-SYSTEM SKINS`
block. **Do not strip this block** — it carries personality tokens can't
express.)

- **Editorial**: italic accents on `.display-h em` + `.serif-italic`;
  eyebrow accent-bold.
- **Terminal**: `border-radius: 0 !important` on card/btn/chip/input/
  select/textarea/search-input/modal/kbd; chips wrapped in `[…]`;
  `.btn.primary` = transparent outline + glow; eyebrow prefixed `>`;
  card hover = accent ring, no transform.
- **Geist**: card hover = neutral 1 px border + drop; `.chip`
  sentence-case (no tracking, body font).
- **Brutalist**: 2 px borders forced to `var(--text)` on cards;
  card hover = `translate(-2px,-2px)` + `6px 6px 0 0 var(--text)`; btn
  uppercase 600 12 px; `.btn.primary` filled accent on black ink.
- **Swiss**: 0.5 px borders on card/btn/input/search-input; OpenType
  features `ss01 tnum lnum kern` on body; card hover = border-color only.

---

## 6 · No-FOUT (Flash of Unstyled Theme) — Vite-adapted

Source brief (HANDOFF §6 Pitfall 1 + §10.3 / §10.4) was Next.js-centric.
Here is the **Vite equivalent** we will implement in Phase 5:

### 6.1 Inline boot script in `client/index.html` `<head>`

Placed **before** any module script tag so it runs synchronously before
React mounts and before any styled element paints.

```html
<script>
  (function () {
    var SD = { editorial:'crimson', terminal:'matrix',
               geist:'cyan',      brutalist:'amber', swiss:'orange' };
    try {
      var s = localStorage.getItem('ds-system') || 'terminal';     // Option A default
      var a = localStorage.getItem('ds-accent') || SD[s] || 'matrix';
      document.documentElement.setAttribute('data-system', s);
      document.documentElement.setAttribute('data-accent', a);
    } catch (e) {
      document.documentElement.setAttribute('data-system', 'terminal');
      document.documentElement.setAttribute('data-accent', 'matrix');
    }
  })();
</script>
```

### 6.2 Pre-built static `themes.css` (Option B only)

If we ship all 5 systems, a build-time script (Vite plugin or
`prebuild`) walks `DESIGN_SYSTEMS` and emits one rule per system /
accent, scoped by attribute. Loaded via Vite CSS import. Then the boot
script's `data-system="..."` flips all 30 tokens via pure CSS, with no
JS race.

Option A skips this — single system means one `:root { ... }` block,
no attribute scoping needed.

### 6.3 `applyDesignSystem` rewires for SPA

The applier still runs (once at boot to assert + later on user picker
interaction), but the boot script ensures the *first paint* already has
the right tokens. On every system change we also persist:

```ts
localStorage.setItem('ds-system', systemId);
localStorage.setItem('ds-accent', accentId);
```

### 6.4 Forbidden FOUT vectors

- **Don't** put `applyDesignSystem` in a React `useEffect`. That defers
  past first paint → flash.
- **Don't** import `design-system.js` as an ES module without also
  running the inline `data-system` setter — module evaluation is
  deferred.
- **Don't** mutate `--accent` directly outside the applier —
  bypasses `__appliedKeys` tracking → leaks across switches.

---

## 7 · Accessibility contract

From `docs/17-accessibility.md`. **AAA on body copy, AA elsewhere.**
Every accent passes 4.5:1 on `#000`.

| Requirement | Spec |
|---|---|
| Contrast | `--text` 14:1, `--text-2` 8.5:1, `--text-3` 4.6:1 (meta only), accents 6–16:1. |
| Focus | `outline: none` ALWAYS paired with a replacement (accent-mix border for inputs, `2px solid var(--accent) + 2px offset` for buttons). |
| Skip link | First focusable element on every page, `.skip-link` class, accent bg on black ink. |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` → `.no-anim` class disables shimmer, caret blink, live-dot pulse. No animation > 500 ms. |
| ARIA | Icon btn = `aria-label`; tabs = full tablist pattern; accordion = `aria-expanded/controls`; modal = `role="dialog" aria-modal="true"` + focus trap; live-dot = `aria-label="live"` or `<span class="sr-only">live</span>`; search = `<input type="search" aria-label>`. |
| Keyboard | Tabs L/R + Home/End; Accordion Enter/Space; Modal Tab cycle + Esc; Drawer Esc + focus trap; `/` to focus search; ⌘K / Ctrl+K to open palette. |
| Color-alone | Never. Pair with chip / icon / explicit text. |
| Touch targets | Buttons 44×44 min (36×36 only for `.btn.icon` on desktop); mobile drawer rows 44 px; nav links wrap in 44×44. |
| Per-system caveat | Brutalist display tracking borderline at headline scale; Swiss 0.5 px hairlines need `@media (prefers-contrast: more)` fallback to 1 px; Terminal mono body harder for some users — never the *only* option. |

---

## 8 · Type scale + spacing scale

From `design-systems.jsx` lines 294-320 (semantic; used by the
showcase + components).

### 8.1 Type scale

| name | px | use |
|---|---|---|
| `display-xl` | 72 | Hero, single-line |
| `display` | 56 | Page hero |
| `h1` | 40 | Section anchor |
| `h2` | 28 | Subsection |
| `h3` | 20 | Card heading |
| `h4` | 16 | List item title |
| `body` | 14 | Prose, default |
| `small` | 13 | Meta, secondary |
| `caption` | 11 | Mono, eyebrow, kbd |

### 8.2 Spacing scale (4 px base)

`0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80` — referenced as
`SPACE_SCALE` names `0` / `1` / `2` / `3` / `4` / `5` / `6` / `8` / `10`
/ `12` / `16` / `20`.

---

## 9 · Outside the contract (do NOT ship)

From `HANDOFF.md §8`. These files in `awesome-list-site-ds/` are demo
scaffolding, not the system:

- `index.html`, `index.standalone.html` — demo entry.
- `app.jsx`, `layout.jsx`, `home-layouts.jsx`, `pages*.jsx`,
  `views-*.jsx`, `admin.jsx`, `data.js` — demo content.
- `design-system.html`, `design-system-showcase.jsx`,
  `design-system-anatomy.jsx` — interactive showcase.
- `docs.html`, `docs.jsx`, `docs-content-*.jsx` — interactive docs.

**Ship only:** `styles.css` (or its Terminal-pruned subset under
Option A) + `design-systems.jsx` (renamed to `design-system.ts` with
the TS types from §4.1) + `docs/*.md` for reference.

---

## 10 · Phase 5 file plan (preview)

| New file | Source |
|---|---|
| `client/src/styles/design-system.css` | Copy of `awesome-list-site-ds/styles.css`, optionally Terminal-only (Option A). |
| `client/src/lib/design-system.ts` | Port of `design-systems.jsx` with TS types (§4.1). Exports `DESIGN_SYSTEMS`, `ACCENTS`, `SYSTEM_DEFAULT_ACCENT`, `applyDesignSystem`. Side-effect-free import (sets globals lazily). |
| `client/index.html` | **Edit** — add inline boot script (§6.1) to `<head>`. Add font `<link>` for IBM Plex Mono (+ others if Option B). |
| `client/src/main.tsx` | **Edit** — `import "./styles/design-system.css"` + `import "./lib/design-system"`. |
| `client/src/index.css` | **Edit** — strip current OKLCH/shadcn theme vars that conflict with DS tokens; keep Tailwind layers + `--radius: 0rem` enforcement. |
| `client/src/pages/ThemeSettings.tsx` | **Edit** (Option B) — wire 5-system × 10-accent picker to `applyDesignSystem` + localStorage. **Skip** under Option A. |

---

**End of DS_SPEC.** This document is the contract Phases 2–6 measure
against. Any divergence in implementation = a delta tracked in Phase 3.
