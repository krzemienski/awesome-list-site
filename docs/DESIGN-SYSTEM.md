# Design System

The authoritative, code-derived catalog of the awesome.video runtime design system:
**5 systems × 10 accents**, switchable live at [`/settings/theme`](/settings/theme) and
presented at the living showcase [`/design-system`](/design-system).

Every value in this document is transcribed from the shipping code. If this document and
the code ever disagree, **the code wins** — fix the doc.

| Source of truth | What it owns |
|---|---|
| `client/src/styles/design-system.css` | All tokens (`:root` + per-system/per-accent overrides), DS component classes, per-system skins, shadcn bridge skins |
| `client/src/index.css` | Tailwind v4 `@theme inline` shadcn↔DS token bridge |
| `client/src/lib/design-system.ts` | System/accent metadata, `applyDesignSystem()`, defaults |
| `client/index.html` | FOUC-free pre-paint boot script (`ds-system` / `ds-accent` / `ds-font-override`) |
| `client/src/lib/font-options.ts` | Font override list + on-demand font loading |
| `client/src/lib/charts/palette.ts` | The single chart color palette (`CHART_PALETTE`) |

Consumption rules for new UI live in [`docs/AGENTS.md`](AGENTS.md). The component
inventory lives in [`docs/COMPONENT-LIBRARY.md`](COMPONENT-LIBRARY.md). The structural
compliance audit is `.agents/skills/verify-design-system/SKILL.md`.

---

## 1. Architecture

The switch is **CSS-attribute-driven** — zero JS is needed to swap personalities:

- Per-system token blocks live as `:root[data-system="…"]` selectors; per-accent
  overrides live as `:root[data-accent="…"]` blocks (attribute-selector specificity
  beats the bare `:root` Editorial defaults).
- `applyDesignSystem(systemId, accentId)` only toggles `data-system` / `data-accent`
  on `<html>` and persists to `localStorage` (keys `ds-system`, `ds-accent`). No inline
  style writes, ever.
- The `client/index.html` boot script reads both keys **pre-paint**, validates them
  against inline system/accent lists, and sets the attributes before any module runs —
  personality swap survives reloads with no FOUC. (It duplicates the valid-ID lists and
  the font-stack map by hand; keep them in sync with `design-system.ts` /
  `font-options.ts` when those change.)
- `design-system.ts` mirrors `DESIGN_SYSTEMS`, `ACCENTS`, `SYSTEM_DEFAULT_ACCENT`, and
  `applyDesignSystem` onto `window.*` for the compliance audit and console debugging.
- **Defaults:** Editorial + Crimson. Each system has a *natural default accent*
  (`SYSTEM_DEFAULT_ACCENT`): editorial→crimson, terminal→matrix, geist→cyan,
  brutalist→amber, swiss→orange. If the user is on a system's natural default and
  switches systems, the accent nudges to the new system's natural default; an explicit
  accent choice carries across.
- **Font override (I1):** a sixth control at `/settings/theme` can override
  `--font-body` at runtime (localStorage key `ds-font-override`); "System default"
  falls back to the active system's bundled face. Only Inter is loaded pre-paint;
  system display fonts and override fonts load on demand.

## 2. The five systems

| id | Name | Tagline | Personality |
|---|---|---|---|
| `editorial` | Editorial | Magazine · Fraunces | Refined editorial — italic Fraunces drops, warm ink, generous leading. |
| `terminal` | Terminal | CRT · IBM Plex Mono | Mono-first terminal — square edges, scanlines, blinking carets. |
| `geist` | Geist | Modern · Geist Sans | Vercel-clean — neutral, soft radii, quiet hover glow. |
| `brutalist` | Brutalist | Slab · Instrument Serif | Concrete slab — hard 2px borders, offset shadows, monumental serif. |
| `swiss` | Swiss | Grid · Manrope | Tight Swiss grid — hairline rules, lining figures, clinical whitespace. |

All five share one component contract; they differ only in **tokens** (section 3) and
**skins** (section 7).

## 3. Token catalog (per system)

Editorial values are the `:root` defaults; the other four systems override them via
`:root[data-system="…"]`. `--accent` / `--accent-2` come from the accent blocks
(section 4) — the values below are what `:root` carries before an accent attribute is set.

### Surfaces & borders

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| `--bg` | `#000000` | `#000000` | `#000000` | `#000000` | `#000000` |
| `--bg-2` | `#070706` | `#040404` | `#0a0a0a` | `#0a0a0a` | `#050506` |
| `--surface` | `rgba(244,243,238,.025)` | `rgba(0,255,136,.012)` | `rgba(255,255,255,.04)` | `rgba(255,255,255,.025)` | `rgba(250,250,248,.018)` |
| `--surface-2` | `rgba(244,243,238,.05)` | `rgba(0,255,136,.025)` | `rgba(255,255,255,.07)` | `rgba(255,255,255,.06)` | `rgba(250,250,248,.04)` |
| `--surface-3` | `rgba(244,243,238,.08)` | `rgba(0,255,136,.05)` | `rgba(255,255,255,.1)` | `rgba(255,255,255,.1)` | `rgba(250,250,248,.07)` |
| `--border` | `rgba(244,243,238,.08)` | `rgba(232,232,224,.14)` | `rgba(255,255,255,.1)` | `rgba(245,245,240,.85)` | `rgba(250,250,248,.085)` |
| `--border-strong` | `rgba(244,243,238,.16)` | `rgba(232,232,224,.32)` | `rgba(255,255,255,.18)` | `rgba(245,245,240,1)` | `rgba(250,250,248,.18)` |
| `--hairline` | `rgba(244,243,238,.06)` | `rgba(232,232,224,.08)` | `rgba(255,255,255,.07)` | `rgba(245,245,240,.18)` | `rgba(250,250,248,.05)` |
| `--border-w` | `1px` | `1px` | `1px` | `2px` | `1px` |
| `--hairline-w` | `1px` | `1px` | `1px` | `1px` | `0.5px` |

Every system runs on pure-black `--bg` — surfaces are translucent ink-tinted washes,
never opaque grays. Brutalist's `--border` is near-opaque **ink**, not a gray hairline;
that is its personality.

### Ink tiers

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| `--text` | `#f4f3ee` | `#e8e8e0` | `#fafafa` | `#f5f5f0` | `#fafaf8` |
| `--text-2` | ink @ `.66` | ink @ `.62` | ink @ `.62` | ink @ `.7` | ink @ `.62` |
| `--text-3` | ink @ `.52` | ink @ `.52` | ink @ `.52` | ink @ `.52` | ink @ `.52` |
| `--text-4` | ink @ `.22` | ink @ `.2` | ink @ `.2` | ink @ `.22` | ink @ `.2` |

("ink @ α" = the system's `--text` color at that rgba alpha.)

`--text-3` is pinned at `0.52` in **all** systems for accessibility: the handoff's `0.4`
measured ~3.4:1 on `#000`; `0.52` delivers ~5.2:1 (WCAG AA for the small meta text it's
used on). Tier usage rules are in section 8.

### Typography

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| `--font-body` | Inter | IBM Plex Mono | Geist | Space Grotesk | Manrope |
| `--font-display` | Fraunces | IBM Plex Mono | Geist | Instrument Serif | Manrope |
| `--font-mono` | JetBrains Mono | IBM Plex Mono | JetBrains Mono | JetBrains Mono | IBM Plex Mono |
| `--display-weight` | `500` | `600` | `600` | `400` | `700` |
| `--display-tracking` | `-0.02em` | `-0.01em` | `-0.035em` | `-0.04em` | `-0.045em` |
| `--display-leading` | `1.04` | `1.1` | `1.05` | `0.92` | `1` |
| `--body-leading` | `1.6` | `1.55` | `1.55` | `1.5` | `1.55` |
| `--eyebrow-tracking` | `0.18em` | `0.2em` | `0.06em` | `0.24em` | `0.14em` |
| `--mono-size-step` | `11px` | `12px` | `11px` | `11px` | `10.5px` |

(Full stacks carry fallbacks, e.g. `'Inter', system-ui, sans-serif` — see the CSS.)
Page-title `h1`s must use the `.display-h` class so these per-system display metrics
apply; never pin `font-sans` / `font-medium` on them.

### Radius ladder

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| `--radius` | `12px` | `0px` | `10px` | `0px` | `4px` |
| `--radius-sm` | `8px` | `0px` | `6px` | `0px` | `2px` |
| `--radius-xs` | `3px` | `3px`* | `3px`* | `3px`* | `3px`* |
| `--radius-pill` | `999px` | `0px` | `999px` | `0px` | `999px` |

\* `--radius-xs` is a Replit addition defined only at `:root`; the four override blocks
inherit it. In the square systems the skin layer forces `border-radius: 0 !important`
on components, so the inherited 3px never renders on chrome — treat `--radius-xs` as
"Editorial-scale micro radius" and don't rely on it squaring off per system.

### Shadow ladder

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.3)` | `none` | `0 1px 2px rgba(0,0,0,.4)` | `2px 2px 0 0 var(--text)` | `none` |
| `--shadow` | `0 6px 24px -8px rgba(0,0,0,.5)` | `none` | ring + `0 8px 24px rgba(0,0,0,.4)` | `4px 4px 0 0 var(--text)` | `none` |
| `--shadow-lg` | `0 24px 60px -20px rgba(0,0,0,.7)` | accent ring + inset accent glow | ring + `0 24px 56px rgba(0,0,0,.55)` | `8px 8px 0 0 var(--text)` | `0 24px 60px rgba(0,0,0,.5)` |
| `--shadow-accent` | accent ring @25% + accent falloff @40% | accent ring + `0 0 24px` accent glow @30% | accent ring @50% + `0 0 32px` glow @25% | `4px 4px 0 0 var(--accent)` | `0 0 0 1px var(--accent)` |

Shadow personality in one line each: Editorial = soft depth; Terminal = phosphor glow,
no depth; Geist = hairline ring + soft depth; Brutalist = hard offset slabs of ink;
Swiss = essentially none.

### Atmosphere & grain

| Token | Editorial | Terminal | Geist | Brutalist | Swiss |
|---|---|---|---|---|---|
| `--bg-atmosphere` | two radial accent washes (accent @7% top-right, accent-2 @6% bottom-left) | 2px scanlines + centered accent radial @4% | top vignette `rgba(255,255,255,.03)` | `none` | 64px grid lines @ `rgba(250,250,248,.04)` |
| `--bg-atmosphere-size` | `auto` | (auto) | (auto) | (auto) | `64px 64px, 64px 64px` |
| `--grain-opacity` | `0.32` | `0.5` | `0` | `0.55` | `0.18` |

The page chrome renders these via `MainLayout`'s `.grain` overlay div + the `body`
atmosphere background. New full-page surfaces must keep both (see `docs/AGENTS.md`).

### Motion (Replit addition, global)

| Token | Value |
|---|---|
| `--motion-fast` | `160ms` |
| `--motion-base` | `240ms` |
| `--motion-slow` | `400ms` |
| `--motion-ease` | `cubic-bezier(0.2, 0.65, 0.3, 1)` |

`prefers-reduced-motion: reduce` collapses all animation/transition durations globally.

## 4. Accent palette (10 accents, shared by all systems)

Each accent block sets exactly two tokens: `--accent` (primary) and `--accent-2`
(secondary — gradients, the second atmosphere wash, chart slot 2).

| id | Name | `--accent` | `--accent-2` | Natural default of |
|---|---|---|---|---|
| `crimson` | Crimson | `#ff3d52` | `#b84dff` | Editorial (site default) |
| `magenta` | Magenta | `#ec4899` | `#f472b6` | — |
| `orange` | Orange | `#ff7a3d` | `#ffb84d` | Swiss |
| `amber` | Amber | `#ffb84d` | `#ffd86b` | Brutalist |
| `emerald` | Emerald | `#34d08c` | `#5ee6b8` | — |
| `matrix` | Matrix | `#00ff88` | `#39ff14` | Terminal |
| `cyan` | Cyan | `#5eddf2` | `#7dd3fc` | Geist |
| `violet` | Violet | `#9d4edd` | `#c77dff` | — |
| `lime` | Lime | `#aaff00` | `#00ff88` | — |
| `rose` | Rose | `#ff7a8a` | `#ffb3c1` | — |

## 5. Status colors & on-accent ink (global constants)

These are **semantic constants** — identical in every system × accent, and the only hex
literals components may ever carry (always with a `/* DS-OK */` marker):

| Semantic | Hex | Where it's defined |
|---|---|---|
| ok / success | `#34d08c` | `.chip.ok`, `.dot` glow, chart palette |
| warn / attention | `#ffb84d` | `.chip.warn`, chart palette |
| bad / error / destructive | `#ff5c7a` | `.chip.bad`, bridge `--color-destructive`, chart palette |
| info (charts) | `#5eddf2`, `#9d4edd` | `CHART_PALETTE` |
| **on-accent ink** | `#000000` (or `#0a0a0a`) | bridge `--color-primary-foreground`, skins, `.skip-link` |

**On-accent ink rule:** text/icons sitting on an accent-filled surface are always
near-black. Accents span light greens to deep violets; near-black is the only ink that
holds contrast across all ten.

## 6. The shadcn↔DS bridge (`client/src/index.css`)

Tailwind v4 `@theme inline` aliases every shadcn key to a DS token, so all existing
`bg-card` / `text-primary` / `border-input` usage resolves against the active system:

| shadcn key | DS token |
|---|---|
| `--color-background` / `--color-foreground` | `var(--bg)` / `var(--text)` |
| `--color-card` / `--color-card-foreground` | `var(--surface)` / `var(--text)` |
| `--color-popover` / `--color-popover-foreground` | `var(--bg-2)` / `var(--text)` |
| `--color-primary` / `--color-primary-foreground` | `var(--accent)` / `#000000` (on-accent ink) |
| `--color-secondary` / `--color-secondary-foreground` | `var(--surface-2)` / `var(--text)` |
| `--color-muted` / `--color-muted-foreground` | `var(--surface)` / `var(--text-2)` |
| `--color-accent` / `--color-accent-foreground` | `var(--surface-2)` / `var(--text)` — shadcn "accent" = hover wash, **not** the DS accent |
| `--color-destructive` / `--color-destructive-foreground` | `#ff5c7a` / `#000000` (status constants) |
| `--color-border` / `--color-input` | `var(--border)` |
| `--color-ring` | `var(--accent)` |
| `--color-chart-1…5` | `var(--accent)`, `#34d08c`, `#5eddf2`, `#ffb84d`, `#9d4edd` |
| `--color-sidebar*` | `var(--bg)` / `var(--text)` / `var(--accent)` / `var(--surface-2)` / `var(--border)` |
| `--font-sans` / `--font-mono` / `--font-serif` | `var(--font-body)` / `var(--font-mono)` / `var(--font-display)` |
| `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-xl` | `var(--radius-sm)` / `var(--radius)` / `var(--radius)` / `var(--radius)` |

The hex literals in the bridge are the section-5 constants, marked `DS-OK` in the file.
`design-system.css` **must** be imported before Tailwind (foundation order comment at
the top of `index.css`).

## 7. Per-system skins

Tokens carry personality *values*; skins carry what tokens can't express (brackets,
uppercase, pseudo-elements, hover structure). Skins exist in two parallel forms:

1. **Raw DS-class skins** (`[data-system="…"] .chip/.btn/.card…`) — for the handoff's
   DS classes, used by static surfaces and the showcase helpers.
2. **Shadcn bridge skins (T229)** — the same extras re-expressed via data hooks,
   because shadcn primitives never emit raw DS classes:
   - `data-ds="chip"` — emitted by `Badge` for variants `chip` | `accent` only.
   - `data-ds-variant="<variant>"` — emitted by every `Button` (and
     `AlertDialogAction`/`AlertDialogCancel`, which compose `buttonVariants()`
     directly); primary-button extras target `default` / `outline` only.
   - `data-ds="card-hover"` — interactive cards (`ResourceCard`, `TaxonomyCard`,
     showcase specimens).

What each skin changes:

| System | Structural extras |
|---|---|
| Editorial | `.display-h em` / `.serif-italic` tint accent; eyebrows accent-colored bold; cards lift −2px on hover with soft shadow. |
| Terminal | `border-radius: 0 !important` across chrome; chips uppercase with `[` `]` pseudo-brackets; eyebrows get a `> ` prompt; primary buttons become accent-outlined with text glow; card hover = accent ring glow, no lift. |
| Geist | Chips drop mono/uppercase for quiet body-face sentence case; buttons weight 500; card hover = ring + large soft shadow; display tracking tightens. |
| Brutalist | Radius 0; buttons/inputs 2px ink borders, uppercase, 12px tracked; hover translate(−2px,−2px) + `4px 4px 0 0 var(--text)` slab; primary button = accent fill + `#000` ink; card hover = 6px slab; mono eyebrows at 700. |
| Swiss | 0.5px borders on cards/buttons/inputs; hover states are **color-only** (no transform, no shadow); eyebrows demote to `--text-3` mono at 500; `tnum`/`lnum` numerals on body. |

Intentional divergences (per `replit.md` MR-DS-13 #5): non-DS badge variants (admin
status badges) and secondary/ghost/destructive buttons keep plain shadcn styling; the
BrandMark tile stays rounded in 0-radius systems (brand kit, not a radius bug).

## 8. Rules

1. **Accent discipline — one accent moment per surface.** Allowed accent uses: primary
   action, active nav state, eyebrows/labels, live indicators (`.dot`), focus rings,
   selection, key data points in charts, sparing text emphasis (`em` in display copy).
   Roughly ≤8 accent moments per viewport (audit stage 7). Everything else is ink.
2. **Ink tiers.** Body copy uses `--text` (primary) or `--text-2` (secondary/muted long
   form). `--text-3` is for meta only — timestamps, counts, captions, eyebrows.
   `--text-4` is decorative (dividers, ghost text). Never set paragraphs in
   `--text-3`/`--text-4` (audit stage 8).
3. **On-accent ink is always near-black** (section 5).
4. **Status semantics are global** — ok/warn/bad hexes never re-theme per system and
   are never repurposed decoratively.
5. **No hardcoded colors/radii/shadows in app code.** Consume tokens via Tailwind
   bridge utilities or `var(--token)` arbitrary values. Allowed literal exceptions
   (each marked `DS-OK` at the definition site): the section-5 constants, the bridge
   block itself, `[data-system]` skin blocks inside `design-system.css`, and
   `CHART_PALETTE` (recharts cannot read CSS vars from prop strings).
6. **FOUC-free boot is non-negotiable.** Any new HTML entry point must apply
   `data-system`/`data-accent` synchronously pre-paint (see `client/index.html`).
7. **Survive all five systems.** New components must tolerate radius 0, 2px ink
   borders, 0.5px hairlines, and mono body faces — cycle systems at `/settings/theme`
   or `/design-system` before shipping. (Formal verification target is the shipped
   default, Editorial + Crimson.)

## 9. Accessibility & polish layer (Replit additions)

Defined at the bottom of `design-system.css`, global across systems:

- **`.skip-link`** — 44px-tall accent skip target, revealed on focus.
- **Keyboard focus** — a single authoritative `:focus-visible` indicator:
  `2px solid var(--accent)` outline, offset 2px, on every interactive element.
- **Disabled** — `[disabled]`/`[aria-disabled="true"]`/`.is-disabled` = opacity 0.5 +
  `not-allowed` cursor.
- **Icons** — lucide stroke-width pinned at 1.5.
- **Press feedback** — `:active` translateY(1px) on buttons.
- **Reduced motion** — global animation/transition collapse.
- Buttons meet the 44×44px touch-target floor via `min-h-[44px]` sizes (`button.tsx`).

## 10. Living surfaces

- **`/settings/theme`** — the picker: 5 system cards, 10 accent swatches, font
  override, and an inert live-preview specimen card.
- **`/design-system`** — the showcase (Task #346): live-resolved token catalog, type
  scale, ink tiers, accent ramp, core-component specimens, and per-system skin notes.
  Both routes are `noindex` (client `SEOHead` + server `og-middleware` in lockstep).
- **`.ds-*` helper classes** (`.ds-shell`, `.ds-section`, `.ds-token-row`, `.ds-swatch`,
  `.ds-system-pill`) exist in `design-system.css` for standalone/static showcase
  surfaces (e.g. exported HTML one-pagers).

## 11. History

Ported 1:1 from the Claude Design handoff (`awesome-list-site-ds/HANDOFF.md` —
`project/styles.css` + `project/design-systems.jsx`), then production-hardened on
Replit: shadcn bridge + data-hook skins (T229), a11y bumps (`--text-3` 0.4→0.52, focus
ring, skip link, 44px targets), motion tokens, and the runtime 5×10 switcher (May 23,
2026). The legacy OKLCH light/dark theme documented in earlier revisions of this file
is **gone** — do not reintroduce it.
