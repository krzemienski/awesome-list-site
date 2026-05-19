# DELTA_CATALOG.md — Current Site (Terminal/Matrix) → Target (Editorial/Crimson)

**Format:** scope · property · current · target · severity · remediation

Severity legend: **P0** blocking visual identity · **P1** structural delta · **P2** polish/state · **P3** nice-to-have / DS gap.

The current site already wires shadcn keys to DS tokens via `@theme inline`, so most of the work is **token-value substitution** + a handful of structural changes (radius, fonts, atmosphere, italic accent rule).

---

## A. FOUNDATIONS — `client/src/styles/design-system.css` + `client/src/index.css`

| # | Property | Current | Target | Sev | Step |
|---|---|---|---|---|---|
| F-01 | `<html>` attribute | (none) | `data-system="editorial" data-accent="crimson"` | P0 | Set once in `index.html` and in app boot |
| F-02 | `--bg` | `#000000` | `#000000` | — | keep |
| F-03 | `--bg-2` | `#040404` | `#0a0a0a` | P1 | swap value |
| F-04 | `--surface` family | green-tinted alpha (`rgba(0,255,136,…)`) | warm-ink alpha (`rgba(244,243,238,…)`) | P0 | swap all 3 surface tokens |
| F-05 | `--border` family | `rgba(232,232,224,…)` | `rgba(244,243,238,…)` | P1 | swap all 3 border tokens |
| F-06 | `--text` family | `#e8e8e0` ladder | `#f4f3ee` ladder (0.66/0.4/0.22) | P0 | swap 4 text tokens |
| F-07 | `--accent` | `#00ff88` (matrix) | `#ff3d52` (crimson) | P0 | swap |
| F-08 | `--accent-2` | `#39ff14` | `#b84dff` | P0 | swap |
| F-09 | `--font-body` | IBM Plex Mono | `'Inter', system-ui, sans-serif` | P0 | swap + load font |
| F-10 | `--font-display` | IBM Plex Mono | `'Fraunces', Georgia, serif` | P0 | swap + load font |
| F-11 | `--font-mono` | IBM Plex Mono | `'JetBrains Mono', ui-monospace, monospace` | P0 | swap + load font |
| F-12 | `--radius` | `0` | `12px` | P0 | swap |
| F-13 | `--radius-sm` | `0` | `8px` | P0 | swap |
| F-14 | `--radius-pill` | (n/a) | `999px` | P1 | add |
| F-15 | shadow tokens | minimal | `--shadow-sm`, `--shadow`, `--shadow-lg`, `--shadow-accent` per DS | P1 | add full set |
| F-16 | `--bg-atmosphere` | none | soft radial gradient (Editorial) | P1 | add |
| F-17 | `--grain-opacity` | n/a | `0.32` | P1 | add token + `.grain` overlay |
| F-18 | `@theme inline` radius keys | all `0` | `--radius-sm: var(--radius-sm); --radius-md: var(--radius); --radius-lg: var(--radius);` | P0 | un-collapse so shadcn `rounded-*` matches Editorial |
| F-19 | Font loading | none / system fallback | self-host via `@fontsource/{fraunces,inter,jetbrains-mono}` | P0 | install packages + import in `main.tsx` |
| F-20 | Page wrapper | direct `<MainLayout>` | wrap in `<div class="page"><div class="grain"/>…</div>` | P1 | adjust `MainLayout` |
| F-21 | `body` font-features | (default) | `"ss01", "cv11", "tnum"` | P2 | add to base layer |
| F-22 | `::selection` | accent bg + black ink | `color-mix(in srgb, var(--accent) 35%, transparent)` + `#fff` | P2 | swap |
| F-23 | Editorial italic-accent rule | absent | `[data-system="editorial"] .display-h em, .serif-italic { color: var(--accent); }` | P1 | add |
| F-24 | Editorial eyebrow weight | absent | `[data-system="editorial"] .eyebrow { color: var(--accent); font-weight: 700; }` | P1 | add |

---

## B. PRIMITIVES — `client/src/components/ui/*`

Goal: every shadcn primitive renders the Editorial visual language without per-call class overrides. With tokens swapped, most primitives need only a 1-line audit.

| # | Primitive | Delta | Sev | Step |
|---|---|---|---|---|
| P-01 | `button.tsx` | currently relies on `rounded-none` from collapsed radius | P0 | rely on `var(--radius-sm)` → `8px`; verify primary uses crimson, hover lifts |
| P-02 | `card.tsx` | flat, no hover lift | P1 | apply `.hoverable` behaviour: `translateY(-2px)` + surface→surface-2 + `--shadow` |
| P-03 | `badge.tsx` | terminal `[bracket]` styling possibly via skin | P1 | strip terminal brackets; pill chip with accent/ok/warn/bad variants |
| P-04 | `input.tsx` / `textarea.tsx` | mono everywhere | P1 | body font; textarea remains mono |
| P-05 | `tabs.tsx` | underline likely matrix green | P0 | underline = `var(--accent)` (crimson); active label colour swap |
| P-06 | `dialog.tsx` (modal) | square, neon | P0 | radius 12px; backdrop blur 4px; border-strong |
| P-07 | `select.tsx` / `dropdown-menu.tsx` | square | P1 | radius-sm 8px; surface-2 hover |
| P-08 | `skeleton.tsx` | green shimmer | P2 | swap shimmer to neutral surface-2/3 |
| P-09 | `kbd` (anywhere ⌘K renders) | mono, neon border | P2 | hairline border, surface bg, mono 10.5px |
| P-10 | `tooltip.tsx` | green | P2 | `--bg-2` bg, text-2 ink |
| P-11 | `popover.tsx` | green | P2 | `--bg-2` bg, border-strong |
| P-12 | `eyebrow` helper | not extracted | P1 | add `.eyebrow` utility class or shadcn `<Eyebrow>` component |

---

## C. COMPOSITIONS — `client/src/components/layout/new/*`, `components/ui/awesome-list-explorer.tsx`

| # | Composition | Delta | Sev | Step |
|---|---|---|---|---|
| C-01 | `AppHeader.tsx` | flat, mono nav | P0 | sticky 60px, `backdrop-filter: blur(14px)`, hairline bottom, Inter nav links 13px, search input with focus-accent border |
| C-02 | `AppSidebar.tsx` | mono, neon active bar | P0 | 280px (240 ≤1024), accordion-item with active 2px accent bar + 8px glow; sub-item hover `translateX(2px)` |
| C-03 | mobile drawer | n/a or basic | P1 | left-slide 86% width max 340, backdrop blur 2px, 280ms ease |
| C-04 | `Footer.tsx` | mono | P2 | Inter, text-2 ink, hairline top |
| C-05 | `MainLayout.tsx` | direct children | P1 | wrap in `.page` + `.grain` overlay |
| C-06 | resource list views (grid/list/compact toggle on Category) | mono uppercase chips | P0 | adopt `.card.hoverable`, `.chip` palette |
| C-07 | tabs in `AdminDashboard.tsx` | current | P1 | `.tabs` + `.tab` with accent underline |
| C-08 | empty/loading skeletons across grids | green pulse | P2 | re-skin |

---

## D. PUBLIC PAGES (1 row per route × salient states)

For each public route the goal is **token-conformant rendering at 375/768/1280/1536** in default and (where applicable) empty/loading/error/auth states. Detailed cell checklist lives in Phase 6 evidence matrix; below are the headline visual deltas vs. the supplied `uploads/*.png` mockups.

| # | Route | Headline delta | Sev |
|---|---|---|---|
| D-01 | `/` Home | hero must use `.display-h` with italic accent word; section eyebrows in crimson; featured cards adopt `.card.hoverable.glow` | P0 |
| D-02 | `/about` | long-form Fraunces display heads + Inter body; section dividers `--hairline` | P0 |
| D-03 | `/advanced` | filter chips → `.chip` palette; analytics cards → `.card`; charts re-skinned to neutral ink with crimson accent | P1 |
| D-04 | `/journeys` | journey cards `.card.hoverable`; step counts use `.chip.accent` | P1 |
| D-05 | `/journey/:id` | stepper uses `.dot` for state, accent bar for current step | P1 |
| D-06 | `/login` | centered card on `.page` atmosphere; primary CTA in crimson; secondary login providers as `.btn.ghost` | P0 |
| D-07 | `/submit` (unauth gate) | empty-state pattern: eyebrow + display headline + primary CTA | P0 |
| D-08 | `/settings/theme` | **decide**: repurpose as crimson-only "Accent" page, or remove. Default: convert to a single-accent showcase (read-only) | P2 |
| D-09 | `/category/:slug` (×9 mockups) | grid/list/compact toggles via tabs; category eyebrow; cards lift on hover | P0 |
| D-10 | `/subcategory/:slug` | mirror category visual contract | P0 |
| D-11 | `/sub-subcategory/:slug` (×2 mockups) | same as category | P0 |
| D-12 | `/resource/:id` | hero with OG image + display headline + accent eyebrow; metadata chips; related cards | P0 |
| D-13 | `*` 404 | `.display-h` with italic accent word; `.btn.primary` to home | P1 |

---

## E. PROTECTED PAGES (`/profile`, `/bookmarks`)

No mockup supplied. Apply primitive + composition contract:
| # | Route | Pattern | Sev |
|---|---|---|---|
| E-01 | `/profile` | Two-column on desktop: form fields (`.field`/`.input`) left, summary card right | P1 |
| E-02 | `/bookmarks` | Same card grid as Category page; empty state with eyebrow + CTA | P1 |

---

## F. ADMIN (`/admin` × 14 tabs)

No mockups supplied — reference `admin.jsx` in DS bundle for the visual idiom (stats cards, queue table, tabs, filters). One row per tab, headline delta only.

| # | Tab | Headline delta | Sev |
|---|---|---|---|
| F-01 | Approvals | `.table` with row hover; bulk-action `.btn.primary` / `.btn.danger` | P1 |
| F-02 | Edits | side-by-side diff in `.card`; accept/reject buttons | P1 |
| F-03 | Enrichment | progress bar with crimson fill; per-batch `.card` rows | P1 |
| F-04 | Researcher | job queue `.table` + result `.card` | P1 |
| F-05 | Export | format selector tabs; download `.btn.primary` | P2 |
| F-06 | Database | stats `.card` grid; danger zone `.btn.danger` | P1 |
| F-07 | Resources | dense `.table` with column tools; row CRUD buttons | P1 |
| F-08 | Categories | same pattern as Resources | P1 |
| F-09 | Subcategories | same | P1 |
| F-10 | Sub-Subcats | same | P1 |
| F-11 | Users | `.table` + role chips (`.chip.accent`) | P1 |
| F-12 | GitHub | sync status with `.live-dot`; commit log `.table` | P1 |
| F-13 | Link Health | per-link status `.dot.ok/warn/bad`; filter chips | P1 |
| F-14 | Audit | log feed in `.card` rows, timestamps in mono | P1 |

---

## G. CROSS-CUTTING (motion, a11y, responsive)

| # | Concern | Delta | Sev |
|---|---|---|---|
| G-01 | Hover lift on cards | absent | P1 | implement transform + transition |
| G-02 | Accordion animation | likely instant | P1 | 320ms `max-height` transition |
| G-03 | Mobile drawer animation | n/a | P1 | 280ms transform |
| G-04 | `prefers-reduced-motion` | unverified | P1 | add `.no-anim` rules from styles.css or `@media (prefers-reduced-motion: reduce)` global |
| G-05 | Focus rings | accent currently green | P0 | swap to crimson via `--color-ring` token (already aliased) |
| G-06 | Touch target sizes | current claims 44×44 | P2 | re-verify after radius reintroduction |
| G-07 | Contrast | text-3 at 40% on `#000` needs AA verification at 14px body | P1 | spot-check with axe; bump weight if needed |
| G-08 | Console errors / hydration warnings on every route | unknown | P1 | capture during Phase 2 baseline |
| G-09 | Font CLS | likely high without preloads | P1 | `@fontsource` self-host avoids; add `font-display: swap` |

---

## Count & coverage

- **Foundations:** 24 rows (F-01..F-24)
- **Primitives:** 12 rows
- **Compositions:** 8 rows
- **Public pages:** 13 rows (covers 16 route slots)
- **Protected pages:** 2 rows
- **Admin tabs:** 14 rows
- **Cross-cutting:** 9 rows
- **Total deltas:** **82**

This catalog will be revised during Phase 2 (baseline capture may reveal more state-level deltas — empty/loading/error variants per route).
