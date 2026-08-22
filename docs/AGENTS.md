# AGENTS.md — Design-System Consumption Contract

How any new page, component, artifact, or mockup **must** consume the awesome.video
design system. The token catalog and rationale live in
[`docs/DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md); this file is the contract you build
against. The structural audit (`.agents/skills/verify-design-system/SKILL.md`) checks
UI work against these rules.

**Scope:** all UI in `client/`, plus any standalone HTML surface (exports, mockups,
one-pagers) that ships to users.

---

## 1. Consume tokens, never raw values

Every color, radius, shadow, and font must resolve through a DS token. Three approved
ways, in order of preference:

1. **Bridged Tailwind utilities** (preferred for shadcn-style code):
   `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`,
   `bg-primary text-primary-foreground`, `border-border`, `border-input`,
   `ring-ring`, `bg-popover`, `rounded-lg` (→ `--radius`), `rounded-sm`
   (→ `--radius-sm`), `font-sans` / `font-mono` / `font-display`.
2. **Arbitrary-value token refs** where no bridged utility fits:
   `bg-[var(--surface-3)]`, `text-[color:var(--text-2)]`,
   `border-[color:var(--border-strong)]`, `rounded-[var(--radius-pill)]`,
   `duration-[var(--motion-fast)]`, `shadow-[var(--shadow-accent)]`.
3. **DS component classes** (`.display-h`, `.eyebrow`, `.kbd`, `.chip`, `.card`,
   `.grain`) where the surface is DS-native chrome rather than a shadcn primitive.

**Forbidden** (audit stage 5 flags these):

- Hardcoded hex/rgb/hsl colors — `#7c3aed`, `rgb(124 58 237)`, `text-red-500`,
  `bg-zinc-900`, or any Tailwind palette color.
- Hardcoded radii/shadows that bypass the ladders — `rounded-[13px]`, `shadow-xl`
  with literal values, `border-radius: 6px`.
- Inline `style={{ color: … }}` with literal colors.
- Raw font-family strings — use the three font tokens.

**Allowed literal exceptions** — always tagged `/* DS-OK: reason */` at the definition
site: the global status constants (`#34d08c` ok, `#ffb84d` warn, `#ff5c7a` bad), the
on-accent inks (`#000000` / `#0a0a0a`), `CHART_PALETTE` entries (recharts can't read
CSS vars from prop strings), the bridge block in `index.css`, and `[data-system]` skin
blocks inside `design-system.css`. If you genuinely need a new escape, tag it `DS-OK`
with a reason or the audit will flag it.

## 2. Build on the approved primitives

- **shadcn primitives first** (`@/components/ui/*` — see
  [`docs/COMPONENT-LIBRARY.md`](COMPONENT-LIBRARY.md)). They are pre-bridged: `Button`
  emits `data-ds-variant`, `Badge` variants `chip`/`accent` emit `data-ds="chip"`, so
  per-system skins (terminal brackets, brutalist slabs, swiss hairlines) apply for
  free. Do **not** hand-roll buttons, dialogs, dropdowns, or tabs.
- **Interactive cards** add `data-ds="card-hover"` so hover behavior follows the
  active system (lift / glow / slab / color-only).
- **Page-title `h1`s use `.display-h`** — never `font-sans` or `font-medium` on them
  (breaks per-system display faces/weights). `<em>` inside display copy is the
  approved accent-emphasis device.
- **Eyebrow labels** use `.eyebrow` (per-system prefixes/casing come from skins).
- Variants belong in the component's `cva()` config; merge classes with `cn()`.
- Icons are lucide (stroke 1.5 is global); icon-only controls need `aria-label`.
- Charts take colors **only** from `CHART_PALETTE`
  (`client/src/lib/charts/palette.ts`) or `--color-chart-*`.

## 3. Respect the visual rules

- **Accent discipline:** ≤1 accent moment per surface, ≈≤8 per viewport. Allowed:
  primary action, active nav, eyebrows, live dots, focus rings, selection, key chart
  points, sparing display-copy emphasis. Everything else is ink.
- **Ink tiers:** body copy = `--text` / `--text-2` only; `--text-3` = meta
  (timestamps, counts, captions); `--text-4` = decorative. Never paragraphs in tier
  3/4.
- **On-accent ink is near-black, always** — `text-primary-foreground` or `#000`
  (DS-OK), in every system × accent.
- **Status colors are semantic constants** — never re-themed, never decorative.
- **Interactive targets ≥ 44×44px** (`min-h-[44px]`, `min-w-[44px]` for icon
  buttons); text links get a ≥24px hit area.
- **Motion** uses `--motion-fast/base/slow` + `--motion-ease`; anything animated must
  respect `prefers-reduced-motion` (the global collapse handles CSS; gate JS-driven
  animation yourself).

## 4. Survive all five systems

Any new surface must remain correct under every `data-system`:

- No assumptions about radius (`0px` in Terminal/Brutalist), border width (`2px`
  Brutalist, `0.5px` Swiss), shadows (none in Swiss), or body face (mono in
  Terminal).
- Don't fight the skins: no `rounded-full`-style hardcoding on chips (use
  `--radius-pill` / the `chip` Badge variant), no overriding button casing.
- Sanity-check by cycling systems at `/settings/theme` or `/design-system`. Formal
  audits verify the shipped default (Editorial + Crimson) per `replit.md`.

## 5. Page chrome & boot requirements

- **In-app pages** render inside `MainLayout` and inherit the atmosphere + `.grain`
  overlay and the shell (60px header, 280px/56px sidebar). Don't add per-page
  backgrounds that occlude the atmosphere.
- **New HTML entry points / standalone artifacts** must:
  1. Load `design-system.css` (or inline its tokens) **before** any other styling —
     foundation order matters for the Tailwind bridge.
  2. Apply `data-system` / `data-accent` on `<html>` **synchronously pre-paint**,
     reading localStorage keys `ds-system` / `ds-accent` with validation and
     Editorial+Crimson fallback — copy the boot script pattern from
     `client/index.html`. FOUC-free boot is non-negotiable.
  3. Keep the inline valid-ID lists and font map in sync with
     `client/src/lib/design-system.ts` / `font-options.ts` (hand-synced by design).
- **New routes** must keep client `SEOHead` and server `og-middleware` staticRoutes in
  lockstep (title parity; `noindex` on both sides for utility pages, or the
  seo-snapshot gate fails).
- Theme switching goes through `applyDesignSystem()` / `ThemeProviderContext` — never
  set `data-system`/`data-accent` or the localStorage keys ad hoc.

## 6. Checklist before you ship UI

- [ ] No unmarked hex/palette colors, raw radii/shadows, or font strings (grep for
      `#[0-9a-f]` and Tailwind palette classes in your diff).
- [ ] shadcn primitives (or DS classes) used; interactive cards carry
      `data-ds="card-hover"`; `h1` uses `.display-h`.
- [ ] Accent moments ≤1 per surface; body copy in tier 1/2 ink.
- [ ] 44px targets; `aria-label` on icon buttons; keyboard focus visible (don't
      suppress the global outline).
- [ ] Renders sanely in all 5 systems; verified in Editorial + Crimson.
- [ ] New route? SEOHead + og-middleware in lockstep.
- [ ] Run the audit when the change is DS-relevant:
      `.agents/skills/verify-design-system/SKILL.md`.
