# DS_SPEC.md — Awesome.Video Design System (Editorial + Crimson)

**Source:** `/tmp/ds_source/awesome-list-site/project/` (handoff bundle, Claude Design export)
**Scope decision (locked):** apply **Editorial** personality with **Crimson** accent **only**. Do not ship the personality switcher, `design-systems.jsx`, `tweaks-panel.jsx`, or the other four systems (Terminal / Geist / Brutalist / Swiss).

---

## 1. Architecture

The system is **token-driven + class-based**, intentionally framework-agnostic.

```
styles.css (portable, 678 lines)
  ├─ :root tokens (fallback Editorial defaults)
  ├─ component rules (.btn, .card, .chip, .input, .sidebar, .header, .table, ...)
  └─ [data-system="editorial"] skins (italic accents, eyebrow weight)
```

`<html data-system="editorial" data-accent="crimson">` is set once at boot. No JS apply function is needed for our scope (we hard-code Editorial); `data-system="editorial"` is still set so the per-system skins fire.

Page chrome contract:
```html
<body>
  <div class="page">
    <div class="grain"></div>
    <main>…</main>
  </div>
</body>
```
`.page` carries `var(--bg-atmosphere)` (radial gradient for Editorial); `.grain` is a fixed SVG noise overlay at `opacity: 0.32`.

---

## 2. Tokens — Editorial + Crimson (canonical values)

### Color
| Token | Value | Notes |
|---|---|---|
| `--bg` | `#000000` | Page background |
| `--bg-2` | `#0a0a0a` | Popover / modal background |
| `--surface` | `rgba(244,243,238,0.025)` | Card resting |
| `--surface-2` | `rgba(244,243,238,0.05)` | Card hover / secondary |
| `--surface-3` | `rgba(244,243,238,0.08)` | Tertiary surface |
| `--border` | `rgba(244,243,238,0.08)` | Hairline |
| `--border-strong` | `rgba(244,243,238,0.16)` | Visible border |
| `--hairline` | `rgba(244,243,238,0.06)` | Divider |
| `--text` | `#f4f3ee` | Ink (warm off-white — NOT pure white) |
| `--text-2` | `rgba(244,243,238,0.66)` | Secondary ink |
| `--text-3` | `rgba(244,243,238,0.4)` | Tertiary / muted |
| `--text-4` | `rgba(244,243,238,0.22)` | Disabled / faintest |
| `--accent` | `#ff3d52` | **Crimson primary** |
| `--accent-2` | `#b84dff` | Crimson secondary (gradients only) |

Semantic status colors (universal across systems):
- ok: `#34d08c`
- warn: `#ffb84d`
- bad: `#ff5c7a`

### Typography
| Token | Value |
|---|---|
| `--font-display` | `'Fraunces', Georgia, serif` |
| `--font-body` | `'Inter', system-ui, sans-serif` |
| `--font-mono` | `'JetBrains Mono', ui-monospace, monospace` |
| `--display-weight` | `500` |
| `--display-tracking` | `-0.02em` |
| `--display-leading` | `1.04` |
| `--body-leading` | `1.6` |
| `--eyebrow-tracking` | `0.18em` |
| `--mono-size-step` | `11px` |

Scale (from docs/06-typography.md, condensed):
display-xl 72px · display 56px · h1 40px · h2 28px · h3 20px · h4 16px · body 14px · small 13px · caption 11px.

Body feature settings: `font-feature-settings: "ss01", "cv11", "tnum"`.

### Geometry
| Token | Value |
|---|---|
| `--radius` | `12px` |
| `--radius-sm` | `8px` |
| `--radius-pill` | `999px` |
| `--border-w` | `1px` |
| `--hairline-w` | `1px` |

### Shadow
| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--shadow` | `0 6px 24px -8px rgba(0,0,0,0.5)` |
| `--shadow-lg` | `0 24px 60px -20px rgba(0,0,0,0.7)` |
| `--shadow-accent` | `0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent), 0 12px 36px -12px color-mix(in srgb, var(--accent) 40%, transparent)` |

### Atmosphere (Editorial-specific)
- `--bg-atmosphere`: soft radial gradient at top (per HANDOFF §4)
- `--grain-opacity`: `0.32`

### Motion
- 160ms — hover/colour transitions
- 220ms cubic-bezier(0.2,0.65,0.3,1) — card transform / background
- 280ms — drawer slide
- 320ms cubic-bezier(0.2,0.65,0.3,1) — accordion max-height

### Breakpoints
- ≤768px — mobile (sidebar hidden, mobile drawer, header 56px)
- ≤1024px — sidebar narrows to 240px
- ≥769px — `.show-mobile` hidden

---

## 3. Primitives (class contract)

| Primitive | Base class | Variants / states | Editorial skin |
|---|---|---|---|
| Button | `.btn` | `.primary` `.ghost` `.danger` `.icon` ; hover lifts -1px | (none beyond tokens) |
| Card | `.card` | `.hoverable` (lift -2px, surface→surface-2), `.glow` (accent shadow on hover) | (none) |
| Chip | `.chip` | `.accent` `.ok` `.warn` `.bad` `.muted` ; mono, uppercase, pill | (none) |
| Input | `.input` `.select` `.textarea` (wrapped in `.field`) | focus = accent-tinted border | textarea uses mono |
| Header | `.header` | sticky, 60px, blur 14px, hairline bottom | n/a |
| Search | `.search-input` | focus accent border | n/a |
| Sidebar | `.sidebar` | width 280px (240 ≤1024), sticky, hairline right | n/a |
| Accordion | `.accordion-item / -header / -body / -body-inner` | active state shows 2px accent bar w/ glow on left | n/a |
| Sub-item | `.sub-item` | hover translateX +2; active = accent ink + accent-tinted bg | n/a |
| Icon rail | `.icon-rail` `.icon-btn` | 56px collapsed nav | n/a |
| Tabs | `.tabs` `.tab` | active underline = accent, 2px | n/a |
| Table | `.table` | uppercase th, row hover = surface | n/a |
| Eyebrow | `.eyebrow` | mono, 11px, tracked 0.18em, **accent colour** | weight 700 |
| Kbd | `.kbd` | mono 10.5px, hairline, surface | n/a |
| Status dot | `.dot.ok / .warn / .bad` | `.live-dot` (accent, pulse) | n/a |
| Mobile drawer | `.mobile-drawer` `.mobile-overlay` | slide-in left, 86% width | n/a |
| Modal | `.modal-backdrop` `.modal` | center, blur backdrop | n/a |
| Caret | `.caret` | blinking `_` after text (rare; CRT detail) | n/a |
| Shimmer line | `.shimmer-line` | animated gradient stripe | n/a |
| Display heading | `.display-h` | font-display, weight 500, tracking -0.02, leading 1.04 | `em` and `.serif-italic` rendered in **accent** colour |

### Editorial-only skins (from styles.css lines 512–515)
```css
[data-system="editorial"] .display-h em,
[data-system="editorial"] .serif-italic { color: var(--accent); }
[data-system="editorial"] .eyebrow { color: var(--accent); font-weight: 700; }
```

---

## 4. Compositions (reference screens in bundle)

| File | Demonstrates |
|---|---|
| `home-layouts.jsx` | 4 home variants: Featured · Categories · Magazine · Index |
| `layout.jsx` | Header, Sidebar, MobileDrawer, Icon SVG library |
| `pages.jsx` + `pages-core.jsx` | Resource detail, category, submit shells |
| `pages-extra.jsx` | About, 404 |
| `views-1.jsx` `views-2.jsx` | List / Grid / Table view modes for categories |
| `admin.jsx` | Data-dense admin: stats cards, queue table, tabs |
| `design-system-showcase.jsx` | Token + component gallery (reference only) |
| `docs.jsx` + `docs-content-{1,2}.jsx` | Hash-routed docs site (reference only) |

---

## 5. Visual references (mockups in `uploads/`)

The user provided 22 numbered screenshots showing the target rendering of every page on the current site:

| # | File | Maps to current-site route |
|---|---|---|
| 01 | `01_home.png` | `/` |
| 02 | `02_about.png` | `/about` |
| 03 | `03_advanced.png` | `/advanced` |
| 04 | `04_learning_journeys.png` | `/journeys` |
| 05 | `05_journey_detail.png` | `/journey/:id` |
| 06 | `06_login.png` | `/login` |
| 07 | `07_submit_resource_authgate.png` | `/submit` (unauth) |
| 08 | `08_theme_settings.png` | `/settings/theme` |
| 09–17 | `09…17_category_*.png` | `/category/:slug` (9 categories) |
| 18 | `18_subcategory_ai-ml-tools.png` | `/subcategory/:slug` |
| 19–20 | `19_sub-subcategory_hls.png`, `20_…dash.png` | `/sub-subcategory/:slug` |
| 21 | `21_resource_detail.png` | `/resource/:id` |
| 22 | `22_404_not_found.png` | `*` |

Missing from the upload set (no target mockup, must derive from DS primitives + reference admin):
- `/profile` `/bookmarks` `/admin` (and all 14 admin tabs)

---

## 6. Open questions / DS gaps

1. **No light mode tokens.** System is dark-only. Acceptable — current site is also dark-locked.
2. **Admin surface mockups are missing** from `uploads/`. The DS provides `admin.jsx` as a generic reference (stats cards, tables, tabs, queue) — we will lift its visual language pattern-by-pattern for all 14 admin tabs and confirm with the user during Phase 5.
3. **`color-mix()`** requires Chrome 111+ / FF 113+ / Safari 16.2+. Acceptable for our audience; no fallback planned unless requested.
4. **Auth-gated screens** in admin/profile/bookmarks need admin credentials for Phase 2 evidence capture. Action: confirm credentials or use `scripts/reset-admin-password.ts`.
5. **Font loading strategy.** Recommend Option B (self-host via `@fontsource/fraunces`, `@fontsource/inter`, `@fontsource/jetbrains-mono`) to avoid Google Fonts dependency and reduce CLS.
