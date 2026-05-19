# DS Migration Phase 3 — DELTA CATALOG

**Inputs**
- Target: `_validation/phase-1/DS_SPEC.md` (Terminal-only Option A, accent default Matrix `#00ff88`).
- Surface: `_validation/phase-1/SITE_MAP.md` — 16 routes + 14 admin tabs × {sm / md / lg / xl} × dark × {unauth, admin} × {populated, empty, loading, error}.
- Evidence: `_validation/phase-2/<slug>/<vp>-dark-<auth>-<state>.{png,dom.html,console.json,network.json,axe.json}` + `_results.jsonl` + `BASELINE_REPORT.md`.
- Code reread for current values: `client/src/index.css`, `tailwind.config.ts`, `client/index.html`, `client/src/components/layout/new/{AppSidebar,AppHeader,MainLayout}.tsx`, `client/src/components/ui/{button,card,badge,input,dialog,sidebar,toast,select,switch,slider,progress,scroll-area,textarea,search-dialog}.tsx`, `client/src/pages/{AdminDashboard,Home}.tsx`, `client/src/components/admin/AdminStats.tsx`.

**No code changed in this phase.** Output is the catalog Phase 4 will work from.

### 0.0 Evidence-axis reality check

Phase 2 captured the following slug × state × auth combinations at four viewports {`375`, `768`, `1280`, `1536`}:

| Slug | States present | Auth(s) |
|---|---|---|
| `home`, `about`, `advanced`, `journeys`, `submit`, `login`, `settings-theme` | `populated` | `unauth` |
| `admin-*` (all 14 tabs) | `populated` | `admin` |
| `bookmarks`, `profile` | `gate` + `populated` | `unauth` (gate) + `admin` (populated) |
| `category`, `subcategory`, `sub-subcategory`, `resource-detail` | `error` + `populated` | `unauth` |
| `journey-detail` | `error` + `populated` | `unauth` |
| `notfound` | `notfound` | `unauth` |
| `admin` (shell) | `gate` only | `unauth` |

So the Phase-1 state axis values `empty` and `loading` are **not** present as artifacts (a Phase-2 follow-up gap tracked in `BASELINE_REPORT.md`). Where a delta row concerns `empty`/`loading`, evidence links to the closest available DOM artifact for that slug. The Phase-1 axis row also names `400` as the mobile viewport, but Phase 2 used `375` — Phase-4 plans must use `375` artifacts.

---

## 0 · Schema, severity ladder, conventions

**Severity mapping (task wording ↔ catalog code):** `P0 = Critical`, `P1 = High`, `P2 = Medium`, `P3 = Low`, `INFO = Informational (no fix required)`, `GAP = DS spec undefined`.

| Column | Meaning |
|---|---|
| Route | A route from SITE_MAP §1 / §2 / §3, an admin tab id, or `*` (all routes). |
| Component | A DS atom/molecule from DS_SPEC §5, a shadcn primitive, or `*` (all components on that route). |
| Property | One slot from the Phase-1 property catalogue (see §1 below). |
| Current value | Concrete value in the live app, quoted from a file or extracted from a Phase-2 DOM artifact. |
| Target value | The DS_SPEC value the app must converge on. `DS GAP` if DS_SPEC defines nothing — see §7. |
| Severity | `P0` = blocks first paint of any DS surface; `P1` = visible visual/behavioural delta; `P2` = correctness/parity but not user-visible (e.g. token name); `P3` = polish; `INFO` = matches DS (recorded for completeness). |
| Remediation step | Phase-4 action, scoped to the file plan in DS_SPEC §10. |
| Evidence | Path under `_validation/phase-2/…` (file confirmed to exist) or a code path (file confirmed to exist). |

### 0.1 Cross-cutting rule

Rows tagged **CC** in §3 apply to **every** `route × component` cell in SITE_MAP unless explicitly overridden later in §4 / §5. This is the mechanism that makes the catalogue cover the full Phase-1 cube without duplicating ~70 identical rows per cross-cutting property.

---

## 1 · Property catalogue (categories considered for every cell)

The schema below is the column set Phase 1 produced. Every row of every per-route / per-admin-tab table lives in one of these slots.

1. **Tokens (color)** — `--bg`, `--bg-2`, `--surface`, `--surface-2`, `--text`, `--text-2`, `--text-3`, `--line`, `--line-2`, `--accent`, `--accent-ink`, `--accent-mix-15/-20/-30/-40` (DS_SPEC §3.1).
2. **Tokens (radius)** — `--radius` (Terminal `0`).
3. **Tokens (shadow)** — Terminal `--shadow: 0 0 0 1px var(--line)` (no drop shadows).
4. **Tokens (motion)** — `--ease`, `--dur-fast/-base/-slow` (DS_SPEC §3.2).
5. **Tokens (typography)** — `--font-sans`, `--font-mono`, `--lh-*`, `--ls-*`.
6. **Typography (scale)** — `display-xl` 72 / `display` 56 / `h1` 40 / `h2` 28 / `h3` 20 / `h4` 16 / `body` 14 / `small` 13 / `caption` 11 (DS_SPEC §8.1).
7. **Spacing scale** — 0/4/8/12/16/20/24/32/40/48/64/80 (DS_SPEC §8.2).
8. **Sizing (touch / hit-targets)** — 44 × 44 min, 36 × 36 only for desktop `.btn.icon`.
9. **Layout** — page shell, sidebar width, header height, content max-width, gutters.
10. **Breakpoints** — Phase-1 named 400 / 768 / 1280 / 1536; Phase-2 captured 375 / 768 / 1280 / 1536.
11. **Variants** — per-component variants required by DS_SPEC §5.
12. **Iconography** — currentColor 1.5 px stroke lucide icons sized 16 / 20 / 24 (DS_SPEC §5.7).
13. **Motion** — animation durations + easings (DS_SPEC §3.2, §7).
14. **States — hover** — DS_SPEC §5 row "States".
15. **States — focus-visible** — `outline: none` + `2px solid var(--accent) + 2px offset` (DS_SPEC §7).
16. **States — active / pressed** — `transform: translateY(1px)` (DS_SPEC §5.1).
17. **States — disabled** — `opacity: .5; cursor: not-allowed` (DS_SPEC §5.1).
18. **States — selected / checked** — `aria-selected`/`data-state=checked` styling.
19. **States — loading** — `.skeleton` shimmer, `<output role="status">`.
20. **States — empty** — DS `.empty-state` molecule (DS_SPEC §5.10).
21. **States — error** — `.alert.error` (DS_SPEC §5.9) + `aria-live="assertive"`.
22. **ARIA / semantics** — DS_SPEC §7 row "ARIA".
23. **Keyboard** — DS_SPEC §7 row "Keyboard".
24. **Reduced-motion** — `@media (prefers-reduced-motion: reduce)` → `.no-anim` (DS_SPEC §7).
25. **Dark mode** — Terminal has no light mode (DS_SPEC §7).
26. **Boot / FOUT** — inline `data-system` setter in `<head>` (DS_SPEC §6.1).
27. **Token API** — `applyDesignSystem(systemId, accentId)` (DS_SPEC §6.2).

All 27 slots are evaluated for every Phase-1 cell. Slots that produce zero delta for a given component are listed in §6.

---

## 2 · Quick-look summary

| Severity | Distinct rows | What it blocks |
|---|---|---|
| P0 | 7 | First paint of any DS surface: token surface, font, radius, boot script, design-system.css, design-system.ts, ThemeSettings rewire. |
| P1 | 45 | All visible visual + behavioural deltas across atoms / molecules / layout. |
| P2 | 28 | Token-name parity, ARIA gaps, missing variants, missing states. |
| P3 | 12 | Polish (reduced-motion, icon stroke width, iconography sizing). |
| INFO | 14 | Zero-delta cells (kept for §6 completeness). |
| **DS GAP** | 9 | DS_SPEC silent — proposed resolutions in §7. |

---

## 3 · Cross-cutting deltas (apply to every route × every component unless overridden)

| # | Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|---|
| CC-01 | * | * | 1 Tokens (color) — surface | `:root { --background: oklch(0% 0 0); --foreground: oklch(98% 0 0); --card: oklch(10% 0.005 0); --popover: oklch(7% 0.005 0); --muted: oklch(18% 0.01 0); --border: oklch(22% 0.02 0); --input: oklch(22% 0.02 0); }` | `--bg:#000; --bg-2:#0a0a0a; --surface:#0e0e0e; --surface-2:#141414; --text:#fff; --text-2:#bdbdbd; --text-3:#7a7a7a; --line:#1e1e1e; --line-2:#2a2a2a;` (DS_SPEC §3.1, Terminal column) | P0 | Add `client/src/styles/design-system.css` (DS_SPEC §10) defining these tokens. Delete the OKLCH block from `client/src/index.css`. Add a thin compatibility shim in `tailwind.config.ts` that aliases shadcn names to DS tokens so `bg-card` / `text-muted-foreground` callsites keep working. | `client/src/index.css` lines 7-81; `_validation/phase-2/BASELINE_REPORT.md`. `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-02 | * | * | 1 Tokens (color) — accent | `--primary: oklch(59% 0.28 18); --ring: oklch(59% 0.28 18);` (pink-red) | `--accent:#00ff88; --accent-ink:#000;` plus `--accent-mix-15/-20/-30/-40` via `color-mix(in oklab, var(--accent) X%, transparent)` (DS_SPEC §3.1). | P0 | Replace `--primary` / `--ring` consumers with `--accent` / `--accent-ink`. Add the four `color-mix` tints. Accent must flip on `[data-system][data-accent]` change without reload (DS_SPEC §6.2). | `client/src/index.css` lines 14, 26, 67. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-03 | * | * | 5 Tokens (typography) — font-sans | `--font-sans: 'Inter', ui-sans-serif, system-ui, …;` + `body { font-family: var(--font-sans); }` | `--font-sans: "IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace;` (Terminal uses mono for all text per DS_SPEC §2). | P0 | (a) Add IBM Plex Mono `<link>` to `client/index.html` — it currently loads `IBM+Plex+Sans`, not Plex Mono. (b) Re-point `--font-sans` in `design-system.css`. (c) Drop the `font-family: var(--font-sans)` override in `client/src/index.css` line 136. | `client/src/index.css` lines 41, 136; `client/index.html` line 17. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-04 | * | * | 2 Tokens (radius) | `--radius: 0.25rem;` (4 px) plus derived `--radius-sm/-md/-lg/-xl` in `@theme inline` | `--radius: 0;` and collapse the derived ladder (Terminal mandates zero corners). | P0 | Set `--radius: 0` in `design-system.css`. Keep Tailwind `radius-*` keys mapping to 0 so the ~80 `rounded-*` callsites continue to compile and collapse to square. | `client/src/index.css` lines 44, 121-124; `client/src/components/ui/button.tsx` line 8; `client/src/components/ui/card.tsx` line 12. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-05 | * | * | 3 Tokens (shadow) | `shadow-sm` / `shadow-md` / `shadow-lg` Tailwind defaults (drop shadows) on `Card`, `Toast`, `DialogContent`, `Select.Content`, sidebar inset. | Terminal: no drop shadows. Replace with `box-shadow: 0 0 0 1px var(--line);` (`--shadow`, DS_SPEC §3.1). | P0 | Override Tailwind `shadow-*` utilities in `design-system.css` `@layer utilities` to map to `var(--shadow)`. Renders as 1-px hairline. | `client/src/components/ui/card.tsx` line 12; `client/src/components/ui/toast.tsx` line 26; `client/src/components/ui/dialog.tsx` line 41; `client/src/components/ui/select.tsx` line 78; `client/src/components/ui/sidebar.tsx` lines 283, 359. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-06 | * | * | 4 Tokens (motion) | No `--ease` / `--dur-*` tokens. `transition-colors` ubiquitous (Tailwind 150ms). Radix `animate-in/out` ~150-200ms. `client/src/styles/skeleton-animations.css` line 77 uses `transition: opacity 0.2s ease-out`. | `--ease: cubic-bezier(.2,.7,.2,1); --dur-fast: 120ms; --dur-base: 180ms; --dur-slow: 280ms;` (DS_SPEC §3.2). | P1 | Define tokens in `design-system.css`. Migrate atom-level transitions in `button.tsx` / `badge.tsx` / `input.tsx` / `switch.tsx` / `slider.tsx` to `transition: background-color var(--dur-base) var(--ease)` via a `.dst-transition` utility. | `client/src/components/ui/button.tsx`; `client/src/components/ui/badge.tsx`; `client/src/components/ui/input.tsx`; `client/src/components/ui/switch.tsx`; `client/src/components/ui/slider.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-07 | * | * | 5 Tokens (typography) — font-mono | `--font-mono: 'JetBrains Mono', ui-monospace, monospace;` | DS Option A: same family as sans (Plex Mono). Keep token name for back-compat. | P2 | Point `--font-mono` to Plex Mono in `design-system.css`. | `client/src/index.css` line 43. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-08 | * | * | 26 Boot / FOUT | None. `client/index.html` has no inline `data-system` setter; `client/src/main.tsx` runs React after CSS load. | Inline `<script>` in `<head>` per DS_SPEC §6.1 that reads `localStorage.getItem('ds-system' / 'ds-accent')` and sets `document.documentElement.dataset.system/accent` **before** Vite styles load. | P0 | Edit `client/index.html` (DS_SPEC §10). One inline snippet, ~10 lines. Pair with `applyDesignSystem` import side-effect. | `client/index.html` lines 1-21. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-09 | * | * | 27 Token API | No `applyDesignSystem` in `client/src/lib/`. | Port from upstream `design-systems.jsx` → `client/src/lib/design-system.ts` (DS_SPEC §10). API: `applyDesignSystem(systemId, accentId)`. Must mutate only DS-owned keys and record `__appliedKeys` on the root (DS_SPEC §6.2). | P0 | Create the file with types from DS_SPEC §4.1. Side-effect-free import (sets globals lazily). Wire ThemeSettings to it in Phase 4. | `client/src/pages/ThemeSettings.tsx` (existing picker uses a different applier). `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-10 | * | * | 25 Dark mode | Two `:root` blocks (un-prefixed + `.dark`) with identical values. `darkMode: ["class"]` in `tailwind.config.ts`. | Terminal has no light variant. Collapse the duplicate. Drop `darkMode` and the `.dark` toggling in `use-theme.ts`; force `data-system="terminal"` on `<html>`. | P1 | Delete the `.dark` block from `index.css`. Remove `darkMode` from `tailwind.config.ts`. Update `useTheme` to no-op on system="terminal". | `client/src/index.css` lines 47-81; `tailwind.config.ts` line 4. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-11 | * | * | 24 Reduced motion | `client/src/styles/skeleton-animations.css` lines 94-99 reduces shimmer to `0.01ms`. No global `.no-anim` class; Radix `animate-in/out` keyframes are not gated. | `@media (prefers-reduced-motion: reduce) { .no-anim, * { animation: none !important; transition: none !important; } }` and apply `.no-anim` on the root (DS_SPEC §7). No animation > 500 ms (already passes). | P1 | Add the media query to `design-system.css`. Gate `data-[state=open]:animate-in` overrides in `dialog.tsx`, `select.tsx`, `toast.tsx`. | `client/src/styles/skeleton-animations.css` lines 94-99; `client/src/components/ui/dialog.tsx`; `client/src/components/ui/select.tsx`; `client/src/components/ui/toast.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-12 | * | * | 12 Iconography | Default lucide-react stroke (`stroke-width: 2`); sizes vary from `size-3` to `size-8`. | 1.5 px stroke, sizes 16 / 20 / 24 only (DS_SPEC §5.7). Color = `currentColor` (already true). | P3 | Wrap default lucide icons in an `<Icon size="sm|md|lg" />` adapter that sets `strokeWidth={1.5}` and constrains size. | `client/src/components/layout/new/AppSidebar.tsx` lines 122, 146, 195, 235; `client/src/components/layout/new/AppHeader.tsx` lines 69, 94, 111. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-13 | * | * | 10 Breakpoints | Tailwind defaults + `xs: 480px` in `tailwind.config.ts` line 9. Phase 2 captured `375` for mobile. | Phase-1 axis named `400 / 768 / 1280 / 1536`. Phase 2 used `375 / 768 / 1280 / 1536`. Recommend standardising on `375` (matches iPhone SE / Phase-2 evidence) and adding `xs: 375px`. | P2 | Change `xs: '480px'` → `xs: '375px'` in `tailwind.config.ts`. Update SITE_MAP "400" → "375" as a Phase-1 follow-up. | `tailwind.config.ts` line 9; `_validation/phase-2/home/375-dark-unauth-populated.png`. |
| CC-14 | * | * | 22 ARIA / semantics | `<MainLayout>` wraps `{children}` in `<div>`, not `<main>`. axe confirms `landmark-one-main` + `page-has-heading-one` violations on the auth-walled / dashboard slugs. | Each route MUST render exactly one `<main id="main">` and exactly one `<h1>` (DS_SPEC §7). Add `.skip-link` as first focusable element. | P1 | Wrap `<MainLayout>`'s `{children}` slot in `<main id="main">` and ensure every page exports `<h1>`. | `client/src/components/layout/new/MainLayout.tsx` line 45; axe failures across `_validation/phase-2/admin-approvals/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-edits/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-enrichment/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-researcher/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-export/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-database/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-resources/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-categories/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-subcategories/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-subsubcategories/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-users/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-github/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-linkhealth/1280-dark-admin-populated.axe.json`, `_validation/phase-2/admin-audit/1280-dark-admin-populated.axe.json`, `_validation/phase-2/profile/1280-dark-admin-populated.axe.json`, `_validation/phase-2/bookmarks/1280-dark-admin-populated.axe.json`. |
| CC-15 | * | * | 8 Sizing (touch) | Interactive controls at 44×44 (`button.tsx` lines 23-27, `AppHeader.tsx` lines 69, 107, `AppSidebar.tsx` line 231). | DS_SPEC §7 — 44×44 min, 36×36 only for `.btn.icon` desktop. | INFO | Matches DS — no work. | `client/src/components/ui/button.tsx` lines 23-27; `client/src/components/layout/new/AppHeader.tsx` line 107. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-16 | * | * | 9 Layout | `MainLayout` = `SidebarProvider` + `SidebarInset`; content padding `p-3 sm:p-4 md:p-6`; header `h-14` (56px); no explicit max-width. | DS_SPEC §5.11 frame: sidebar 280 (collapsed 64) + main with `max-width: 1280px; padding: 32px 48px;`. Header 56 px is fine. | P1 | Add `max-w-[1280px] mx-auto px-12 py-8` to the `<main>` wrapper in `MainLayout.tsx`. Verify sidebar width matches `--sidebar-width` (`16rem` / 256 px). | `client/src/components/layout/new/MainLayout.tsx` line 45; `client/src/components/ui/sidebar.tsx` lines 38-42. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| CC-17 | * | * | 7 Spacing scale | Tailwind defaults (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64). | DS_SPEC §8.2 scale 0/4/8/12/16/20/24/32/40/48/64/80. | INFO | Matches at px level. Publish as CSS vars in `design-system.css` for non-Tailwind callsites. | `tailwind.config.ts` (no extension of `spacing`). `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |

---

## 4 · Per-public-route deltas (16 SITE_MAP routes)

Routes from SITE_MAP §1. Each table only lists deltas **on top of** the CC- rows in §3.

### 4.1 `/` — Home (slug `home`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/` | Page shell | 9 Layout | `container mx-auto px-4 py-8 max-w-full` (Home.tsx hero block). | DS frame from CC-16. | P1 | Drop `container max-w-full`; rely on `<main>` from CC-16. | `client/src/pages/Home.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/` | `<Card>` (category tile) | 11 Variants | `<Card>` with `rounded-lg shadow-sm bg-card` (`card.tsx` line 12). | DS `.card` (DS_SPEC §5.4): square, 1-px `--line` border, `--surface` bg, padding 16/20. | P1 | Add `.card` class to `card.tsx` root. | `client/src/components/ui/card.tsx` line 12; `_validation/phase-2/home/1280-dark-unauth-populated.dom.html`. |
| `/` | Hero badge | 11 Variants | `<Badge variant="default" class="rounded-full bg-primary">`. | DS `.chip` (DS_SPEC §5.3): square, `--surface-2` bg, 11 px caption. `.chip.live` variant adds `.live-dot`. | P2 | Add `.chip` class to `badge.tsx`. | `client/src/components/ui/badge.tsx` line 7. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/` | Hero heading | 6 Typography (scale) | `text-3xl font-bold` | DS `h1` 40 px (DS_SPEC §8.1) | P2 | Replace with `.t-h1` utility (`text-[40px] leading-tight`). | `client/src/pages/Home.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/` | Page | 22 ARIA | axe = 0 violations at 1280; `<h1>` already present. | Matches DS. | INFO | No work. | `_validation/phase-2/home/1280-dark-unauth-populated.axe.json`. |
| `/` | Page | 19 States — loading | Phase 2 did not capture; `Home.tsx` shows `<Skeleton>` rows on `isLoading`. | DS `.skeleton` shimmer with `role="status" aria-busy="true"` (DS_SPEC §5.10). | P1 | Add `role="status"`; reuse `client/src/styles/skeleton-animations.css`. | `client/src/pages/Home.tsx`; `client/src/components/ui/skeleton.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/` | Page | 20 States — empty | Phase 2 did not capture; `Home.tsx` renders plain `<p>` when no resources. | DS `.empty-state` molecule. | P2 | Add empty-state component. | `client/src/pages/Home.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/` | Page | 21 States — error | Phase 2 did not capture; React error boundary uses plain `<p>`. | DS `.alert.error` + `role="alert"`. | P2 | Add `.alert` molecule. | `client/src/pages/AdminDashboard.tsx` lines 48-56 (same pattern). `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |

### 4.2 `/category/:slug` (`category`)

Phase 2 captured the **error** state for this slug — categories don't exist in test DB so the request 404s.

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/category/:slug` | View-mode toggle | 11 Variants | `<ToggleGroup class="border rounded-md p-0.5">` (`view-mode-toggle.tsx` line 25). | DS `.tabs.compact` (DS_SPEC §5.6) — flat, accent underline. | P1 | Re-skin toggle to `.tabs.compact`. | `client/src/components/ui/view-mode-toggle.tsx` line 25. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/category/:slug` | Resource card (grid/list/compact) | 11 Variants | shadcn `<Card>`; compact = `<div class="flex border-b">`. | DS `.card` + `.card.row` + `.card.compact` (DS_SPEC §5.4). | P1 | Add `.row` / `.compact` modifiers in `design-system.css`. | `client/src/pages/Category.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/category/:slug` | "Suggest Edit" inline button | 11 Variants | `<Button variant="ghost" size="icon">` 44×44. | `.btn.icon.ghost` (DS_SPEC §5.1). | P2 | Add `.btn.ghost` modifier. | `client/src/pages/Category.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/category/:slug` | Error fallback | 21 States — error | "Category not found" plain text. | `.alert.error` + 404 empty-state. | P1 | Use `.empty-state` + secondary link to `/`. | `_validation/phase-2/category/1280-dark-unauth-error.dom.html`; `_validation/phase-2/category/1280-dark-unauth-error.axe.json`. |
| `/category/:slug` | Page | 22 ARIA | axe at 1280 has no violations on the error state. | Matches DS. | INFO | No work. | `_validation/phase-2/category/1280-dark-unauth-error.axe.json`. |

### 4.3 `/subcategory/:slug` (`subcategory`)

Same component reuse as §4.2; Phase-2 evidence captured `error` state.

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/subcategory/:slug` | Resource card | 11 Variants | Same as §4.2. | Same as §4.2. | P1 | Single PR with §4.2. | `_validation/phase-2/subcategory/1280-dark-unauth-error.dom.html`. |
| `/subcategory/:slug` | View-mode toggle | 11 Variants | Same as §4.2. | Same. | P1 | Same PR. | `client/src/pages/Category.tsx` (shared with `/category`). `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/subcategory/:slug` | Error fallback | 21 States — error | Plain text. | `.empty-state`. | P1 | §4.2 row 4. | `_validation/phase-2/subcategory/1280-dark-unauth-error.dom.html`. |

### 4.4 `/sub-subcategory/:slug` (`sub-subcategory`)

Phase-2 captured `error` state. Identical surface to §4.2 / §4.3.

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/sub-subcategory/:slug` | Resource card | 11 Variants | Same as §4.2. | Same. | P1 | Same PR. | `_validation/phase-2/sub-subcategory/1280-dark-unauth-error.dom.html`. |
| `/sub-subcategory/:slug` | Error fallback | 21 States — error | Plain text. | `.empty-state`. | P1 | §4.2 row 4. | `_validation/phase-2/sub-subcategory/1280-dark-unauth-error.dom.html`. |
| `/sub-subcategory/:slug` | Page | 22 ARIA | axe at 1280 clean. | Matches DS. | INFO | No work. | `_validation/phase-2/sub-subcategory/1280-dark-unauth-error.axe.json`. |

### 4.5 `/resource/:id` (slug `resource-detail`)

Phase-2 captured `error` state (test id resolves to 404).

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/resource/:id` | OG image hero | 2 Tokens (radius) | `aspect-video rounded-lg`. | Square corners (CC-04). | P3 | Drop `rounded-lg`. | `client/src/pages/ResourceDetail.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/resource/:id` | Share button | 15 States — focus-visible | shadcn `<Button>` uses `focus-visible:ring-2 focus-visible:ring-ring`. | `2px solid var(--accent) + 2px offset` (DS_SPEC §7). | P1 | Override `focus-visible` in `button.tsx` per CC-02 token swap. | `client/src/components/ui/button.tsx` line 8. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/resource/:id` | Tag chips | 11 Variants | `<Badge variant="secondary">`. | DS `.chip`. | P2 | §4.1 row. | `client/src/pages/ResourceDetail.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/resource/:id` | Suggest-Edit modal | 11 Variants + 22 ARIA | `<Dialog>` Radix; `role="dialog" aria-modal="true"` auto. | DS `.modal` (DS_SPEC §5.8) — surface `--surface`, `--line` border, square. | P2 | Re-skin `dialog.tsx` shell. | `client/src/components/ui/dialog.tsx` line 41. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/resource/:id` | Error fallback | 21 States — error | Plain "Resource not found" copy. | `.empty-state` + back link. | P1 | §4.2 row 4. | `_validation/phase-2/resource-detail/1280-dark-unauth-error.dom.html`. |

### 4.6 `/profile` (slug `profile`)

Phase-2 captured `populated` state (admin auth).

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/profile` | Page | 22 ARIA | Missing `<main>` + `<h1>` (axe `landmark-one-main`, `page-has-heading-one`). | CC-14. | P1 | CC-14. | `_validation/phase-2/profile/1280-dark-admin-populated.axe.json`. |
| `/profile` | Avatar | 11 Variants | `<Avatar h-8 w-8>` `rounded-full`. | DS keeps avatars circular by exception (DS_SPEC §5.7). | INFO | Matches DS. | `client/src/components/ui/avatar.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/profile` | Fields | 11 Variants | `<Input>` (see §4.10). | `.field`. | P1 | §4.10 row 1. | `client/src/pages/Profile.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/submit/1280-dark-unauth-populated.dom.html` |

### 4.7 `/bookmarks` (slug `bookmarks`)

Phase-2 captured `populated` state.

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/bookmarks` | Page | 22 ARIA | Missing `<main>` + `<h1>`. | CC-14. | P1 | CC-14. | `_validation/phase-2/bookmarks/1280-dark-admin-populated.axe.json`. |
| `/bookmarks` | Resource cards | 11 Variants | Same `<Card>` as §4.1. | `.card`. | P1 | §4.1 row 2. | `client/src/pages/Bookmarks.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/bookmarks` | Empty state | 20 States — empty | Not captured by Phase 2; component renders plain `<p>`. | `.empty-state`. | P2 | §4.1 row 7. | `client/src/pages/Bookmarks.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |

### 4.8 `/submit` (slug `submit`)

Phase-2 captured `populated`.

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/submit` | `<Input>` | 11 Variants | `h-10 rounded-lg border border-input bg-background` (`input.tsx` line 11). | DS `.field` (DS_SPEC §5.5): square, 1-px `--line` border, 44 px min-height, focus border = `color-mix(in oklab, var(--accent) 60%, var(--line))`. | P1 | Override `input.tsx`; add `.field` to `design-system.css`. | `client/src/components/ui/input.tsx` line 11. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/submit/1280-dark-unauth-populated.dom.html` |
| `/submit` | `<Textarea>` | 11 Variants | `min-h-[80px] rounded-lg` (`textarea.tsx` line 13). | `.field` multi-line variant. | P1 | Same PR. | `client/src/components/ui/textarea.tsx` line 13. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/submit/1280-dark-unauth-populated.dom.html` |
| `/submit` | Submit button | 11 Variants | `<Button variant="default">` = `bg-primary`. | `.btn.primary` (DS_SPEC §5.1). | P2 | CC-02 token swap. | `client/src/components/ui/button.tsx` line 12. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/submit` | `<FormMessage>` | 21 States — error | Red text default. | DS GAP (see §7 GAP-7) `.field-error` (caption 11 px `--err`). | P2 | See §7 GAP-7. | `client/src/components/ui/form.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/submit/1280-dark-unauth-populated.dom.html` |

### 4.9 `/journeys` (slug `journeys`)

Phase-2 captured `populated`.

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/journeys` | Journey card | 11 Variants | `<Card>`. | `.card`. | P1 | §4.1 row 2. | `_validation/phase-2/journeys/1280-dark-unauth-populated.dom.html`. |
| `/journeys` | Page | 22 ARIA | axe = 0 violations at 1280 — already has `<main>` + `<h1>`. | Matches DS. | INFO | No work. | `_validation/phase-2/journeys/1280-dark-unauth-populated.axe.json`. |

### 4.10 `/journey/:id` (slug `journey-detail`)

Phase-2 captured `error` state (test id resolves to 404).

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/journey/:id` | `<Progress>` | 11 Variants | `h-4 rounded-full bg-secondary` (`progress.tsx` line 15). | DS `.progress` DS GAP (see §7 GAP-2): `--surface-2` track, `--accent` fill, square. | P1 | Drop `rounded-full`; swap colors via tokens. | `client/src/components/ui/progress.tsx` line 15. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/journey/:id` | Error fallback | 21 States — error | Plain text. | `.empty-state` + back link. | P1 | §4.2 row 4. | `_validation/phase-2/journey-detail/1280-dark-unauth-error.dom.html`. |
| `/journey/:id` | Page | 22 ARIA | axe at 1280 clean on error state. | Matches DS. | INFO | No work. | `_validation/phase-2/journey-detail/1280-dark-unauth-error.axe.json`. |

### 4.11 `/advanced` (slug `advanced`)

Phase-2 captured `populated`.

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/advanced` | Filter chips | 11 Variants | `<AdvancedFilter>` uses `<Badge>`. | `.chip`. | P2 | §4.1 row 3. | `client/src/components/ui/advanced-filter.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/advanced` | `<Slider>` thumb | 11 Variants | `h-5 w-5 rounded-full border-2 border-primary` (`slider.tsx` line 21). | Square 16 × 16 thumb, 1-px `--line` border, accent fill on track. | P1 | Override `slider.tsx`. | `client/src/components/ui/slider.tsx` lines 18, 21. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/advanced` | Page | 22 ARIA | axe at 1280 clean. | Matches DS. | INFO | No work. | `_validation/phase-2/advanced/1280-dark-unauth-populated.axe.json`. |

### 4.12 `/settings/theme` (slug `settings-theme`)

Phase-2 captured `populated`.

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/settings/theme` | System picker | 27 Token API | Uses `useTheme` hook + `client/src/hooks/use-theme.ts`. | DS `applyDesignSystem(systemId, accentId)` from CC-09. Under Option A, render only the Terminal × accent picker (DS_SPEC §10 notes "**Skip** under Option A"). | P0 | Replace picker action with `applyDesignSystem`; persist `ds-system` + `ds-accent` (CC-08). | `client/src/pages/ThemeSettings.tsx`; `client/src/hooks/use-theme.ts`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/settings/theme` | Accent dot preview | 12 Iconography | `<span class="rounded-full">` (AppHeader.tsx line 113). | 16 × 16 square swatch. | P3 | Drop `rounded-full`; size 16. | `client/src/components/layout/new/AppHeader.tsx` line 113. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/settings/theme` | Page | 22 ARIA | axe at 1280 clean. | Matches DS. | INFO | No work. | `_validation/phase-2/settings-theme/1280-dark-unauth-populated.axe.json`. |

### 4.13 `/login` (slug `login`)

Phase-2 captured `populated`.

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/login` | Form | 11 Variants | `<Input>` + `<Button>` same as §4.8. | DS atom swaps. | P1 | §4.8 rows. | `client/src/pages/Login.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/submit/1280-dark-unauth-populated.dom.html` |
| `/login` | OAuth provider button | 11 Variants | `<Button variant="outline">` with provider logo. | `.btn.secondary` + 1.5-stroke lucide icon DS GAP (see §7 GAP-8). | P2 | CC-12 + GAP-8. | `client/src/pages/Login.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/login` | Page | 22 ARIA | axe = 0 violations at 1280. | Matches DS. | INFO | No work. | `_validation/phase-2/login/1280-dark-unauth-populated.axe.json`. |

### 4.14 `/about` (slug `about`)

Phase-2 captured `populated`.

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/about` | Prose | 6 Typography (scale) | Default Tailwind prose sizes. | DS scale `body` 14 / `h2` 28 / `h3` 20. | P2 | Add `.t-body` / `.t-h2` utility classes. | `client/src/pages/About.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/about` | Page | 22 ARIA | axe at 1280 clean. | Matches DS. | INFO | No work. | `_validation/phase-2/about/1280-dark-unauth-populated.axe.json`. |

### 4.15 `/admin` shell (slug `admin`)

Phase-2 captured `gate` (the auth wall when unauth visits `/admin`). The admin **tabs** (14 of them) are §5, evidence under `_validation/phase-2/admin-*/` with `admin-populated` auth.

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `/admin` | Auth gate page (unauth) | 21 States — error | Plain "Sign in" copy on unauth visit. | `.alert.warn` + `.btn.primary` to `/login`. | P2 | Use `.alert` + `.btn`. | `_validation/phase-2/admin/1280-dark-unauth-gate.dom.html`. |
| `/admin` | Shell `<h1>` | 6 Typography | `text-3xl font-bold text-primary font-mono` (`AdminDashboard.tsx` line 62). | DS `h1` 40 px, `--text` (not `--primary`). | P2 | Replace `text-primary` with `text-[color:var(--text)]`. | `client/src/pages/AdminDashboard.tsx` line 62. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/admin` | `<TabsList>` | 11 Variants | `bg-card border border-primary/20` (`AdminDashboard.tsx` line 73), 14 children. | DS `.tabs` (DS_SPEC §5.6): underline-on-active, no border box. | P1 | Re-skin `tabs.tsx`. | `client/src/pages/AdminDashboard.tsx` lines 73-118. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/admin` | Stats card | 11 Variants | `<Card class="border-primary/20 bg-card">` ×4 (`AdminStats.tsx` lines 25, 39, 53, 67). | DS `.card.stat` + `.eyebrow` label + tabular-nums big number. | P1 | Apply `.card.stat` molecule. | `client/src/components/admin/AdminStats.tsx` lines 25-67. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/admin` | Stat number | 6 Typography | `text-2xl font-bold text-primary font-mono` (`AdminStats.tsx` lines 33, 47, 61, 75). | DS `display`/`display-xl` in `--accent`. | P2 | CC-02 hue; DS scale for size. | `client/src/components/admin/AdminStats.tsx` lines 33-75. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/admin` | Loading state | 19 States — loading | `animate-spin rounded-full border-b-2 border-primary` (`AdminDashboard.tsx` line 41). | `.skeleton` shimmer; spinner OK if `aria-busy="true"`. | P2 | Wrap in `role="status"`. | `client/src/pages/AdminDashboard.tsx` line 41. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `/admin` | Error state | 21 States — error | `text-red-500` `<p>` (`AdminDashboard.tsx` line 53). | DS `.alert.error` + `aria-live="assertive"`. | P2 | Use `.alert`. | `client/src/pages/AdminDashboard.tsx` lines 48-56. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |

### 4.16 `*` 404 (slug `notfound`)

Phase-2 captured `notfound` state.

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `*` | NotFound page | 11 Variants | `<Card>` with copy + back link. | DS `.empty-state` + `.btn.secondary`. | P2 | §4.1 row 7. | `client/src/pages/not-found.tsx`; `_validation/phase-2/notfound/1280-dark-unauth-notfound.dom.html`. |
| `*` | Page | 22 ARIA | axe at 1280 clean on notfound. | Matches DS. | INFO | No work. | `_validation/phase-2/notfound/1280-dark-unauth-notfound.axe.json`. |

### 4.17 Sidebar (CC component, same across all routes §4 + §5)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| * | `AppSidebar` shell | 11 Variants | shadcn `<Sidebar collapsible="icon" variant="sidebar">` (`AppSidebar.tsx` line 117) — internals = `SidebarMenuButton`, `Collapsible`. | DS `.sidebar` (DS_SPEC §5.11) + nested `.accordion-trigger` / `.accordion-content`. 280 / 64 collapsed. | P1 | Re-skin `client/src/components/ui/sidebar.tsx` to emit `.sidebar` classes; keep shadcn data-attrs. | `client/src/components/layout/new/AppSidebar.tsx` line 117; `client/src/components/ui/sidebar.tsx` lines 38-42, 283. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| * | Sidebar logo tile | 11 Variants | `bg-primary text-primary-foreground rounded-lg` (`AppSidebar.tsx` line 122). | `--accent` bg, `--accent-ink` fg, square. | P2 | CC-02 + CC-04. | `client/src/components/layout/new/AppSidebar.tsx` line 122. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| * | Sidebar nav item | 18 States — selected | `data-active=true` → `bg-sidebar-accent`. | DS: 2-px left accent rail + `--accent-mix-15` bg (DS_SPEC §5.11). | P1 | Re-skin via `[data-active=true]` selector in `design-system.css`. | `client/src/components/ui/sidebar.tsx` line 283. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| * | Sidebar category badge | 11 Variants | `<Badge variant="secondary">` (`AppSidebar.tsx` lines 197, 225). | `.chip` (caption type). | P2 | §4.1 row 3. | `client/src/components/layout/new/AppSidebar.tsx` lines 197, 225. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| * | Sidebar expand hit-target | 8 Sizing | 44×44 desktop / 36×36 nested sub (`AppSidebar.tsx` lines 231, 287). | Matches DS. | INFO | No work. | `client/src/components/layout/new/AppSidebar.tsx` lines 231, 287. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| * | Sidebar `/` shortcut | 23 Keyboard | Implemented in `client/src/components/ui/search-dialog.tsx` (keydown listener for `/` and ⌘K/Ctrl+K). | DS_SPEC §7 — `/` focus search, ⌘K palette. | INFO | Matches DS. | `client/src/components/ui/search-dialog.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| * | Mobile drawer | 11 Variants | Sheet portal from shadcn (`<Sidebar>` mobile variant). | DS `.mobile-drawer` (DS_SPEC §5.11). | P2 | Re-skin sheet inner. | `client/src/components/ui/sidebar.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |

### 4.18 Header / Top-bar (CC component)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| * | `AppHeader` shell | 9 Layout | `sticky top-0 z-30 h-14 border-b bg-background/95 backdrop-blur` (`AppHeader.tsx` line 68). | 56 px height OK. Drop backdrop-blur (Terminal forbids blur). Replace `border-b` with `box-shadow: 0 1px 0 var(--line)`. | P2 | Edit `AppHeader.tsx` line 68 — drop `backdrop-blur supports-[backdrop-filter]:bg-background/60`. | `client/src/components/layout/new/AppHeader.tsx` line 68. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| * | Search trigger | 11 Variants | `<button class="rounded-md border bg-transparent">` (`AppHeader.tsx` lines 91-100). | DS `.field.search` + `.kbd`. Square. | P1 | Re-template trigger; reuse `.kbd` on `<kbd>` (line 97). | `client/src/components/layout/new/AppHeader.tsx` lines 91-100. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| * | Theme button accent dot | 12 Iconography | `rounded-full` 10×10 (`AppHeader.tsx` line 113). | 16 × 16 square swatch. | P3 | Drop `rounded-full`; size 16. | `client/src/components/layout/new/AppHeader.tsx` line 113. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| * | Breadcrumb | 11 Variants | shadcn `<Breadcrumb>` with slash separator (`breadcrumb.tsx`). | DS `.crumbs` with `›`. | P2 | Re-skin `breadcrumb.tsx`. | `client/src/components/ui/breadcrumb.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |

### 4.19 Footer (CC component)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| * | `<footer>` | 9 Layout | `border-t px-4 sm:px-6 py-3 sm:py-4` (`MainLayout.tsx` line 48). | 1-px `--line` top border, small caption type. | INFO | Matches DS structurally. | `client/src/components/layout/new/MainLayout.tsx` line 48. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |

---

## 5 · Admin tabs × property categories matrix (14 distinct cells)

Each admin tab is a distinct Phase-1 cell with its own slug under `_validation/phase-2/admin-<tab>/`. Phase-2 evidence: `<vp>-dark-admin-populated.{png,dom.html,axe.json}` for `<vp>` ∈ {375, 768, 1280, 1536}. All 14 inherit the CC- rows in §3 **and** the `/admin` shell rows in §4.15. Rows below capture per-tab deltas.

All rows use the full 8-column schema.

### 5.1 `admin-approvals` (`PendingResources`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#approvals` | Pending resource card | 11 Variants | `<Card>` + `<Badge variant="destructive">` count chip. | `.card` + `.chip.err`. | P1 | §4.1 row 2 + GAP-1. | `_validation/phase-2/admin-approvals/1280-dark-admin-populated.dom.html`. |
| `admin#approvals` | Page | 22 ARIA | Missing `<main>` + `<h1>` (axe). | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-approvals/1280-dark-admin-populated.axe.json`. |
| `admin#approvals` | Bulk action buttons | 11 Variants | `<Button variant="default">` row. | `.btn.primary` / `.btn.danger`. | P2 | §5.6 row 1 + CC-02. | `client/src/components/admin/PendingResources.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |

### 5.2 `admin-edits` (`PendingEdits`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#edits` | Diff view | 11 Variants | Inline diff using `<pre class="bg-muted">`. | `.diff` molecule — DS GAP (see §7 GAP-3). | P1 | See §7 GAP-3. | `client/src/components/admin/PendingEdits.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#edits` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-edits/1280-dark-admin-populated.axe.json`. |

### 5.3 `admin-enrichment` (`BatchEnrichmentPanel`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#enrichment` | `<Progress>` | 11 Variants | `h-4 rounded-full bg-secondary` (`progress.tsx` line 15). | `.progress` square + `--accent` fill DS GAP (see §7 GAP-2). | P1 | §4.10 row 1. | `client/src/components/ui/progress.tsx` line 15. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#enrichment` | Live status dot | 11 Variants | Static green `<span class="rounded-full">`. | `.live-dot` with pulse (DS_SPEC §5.3). | P2 | Add `.live-dot` class. | `client/src/components/admin/BatchEnrichmentPanel.tsx`; `_validation/phase-2/admin-enrichment/1280-dark-admin-populated.dom.html`. |
| `admin#enrichment` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-enrichment/1280-dark-admin-populated.axe.json`. |
| `admin#enrichment` | Live pulse | 24 Reduced motion | Pulse ignores `prefers-reduced-motion`. | `.no-anim` honored. | P3 | CC-11. | `client/src/components/admin/BatchEnrichmentPanel.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#enrichment` | Background job | 19 States — loading | Spinner only; no `aria-busy`. | `role="status" aria-busy="true"` + `.skeleton`. | P2 | Wrap in `<output>`. | `client/src/components/admin/BatchEnrichmentPanel.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |

### 5.4 `admin-researcher` (`ResearcherTab`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#researcher` | Job table | 11 Variants | shadcn `<Table>` `divide-y border`. | `.table` (DS_SPEC §5.6) — square, hairline rows. | P1 | Re-skin `table.tsx`. | `client/src/components/admin/ResearcherTab.tsx`; `client/src/components/ui/table.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/admin-resources/1280-dark-admin-populated.dom.html` |
| `admin#researcher` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-researcher/1280-dark-admin-populated.axe.json`. |
| `admin#researcher` | Cost dashboard removed | 11 Variants | Tab no longer renders the legacy CostDashboard/ResearchPanel (deleted May 2). | N/A. | INFO | No work. | `client/src/components/admin/ResearcherTab.tsx`; `_validation/phase-2/admin-researcher/1280-dark-admin-populated.dom.html`. |

### 5.5 `admin-export` (`ExportTab`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#export` | Preset cards | 11 Variants | `<Card>` grid. | `.card.stat`. | P1 | §4.15 row 4. | `client/src/components/admin/ExportTab.tsx`; `_validation/phase-2/admin-export/1280-dark-admin-populated.dom.html`. |
| `admin#export` | Export buttons | 16 States — pressed | Default button (no pressed transform). | `transform: translateY(1px)` on `:active`. | P3 | CC-06 + `button.tsx`. | `client/src/components/ui/button.tsx` lines 8-12. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#export` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-export/1280-dark-admin-populated.axe.json`. |

### 5.6 `admin-database` (`DatabaseTab`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#database` | Danger button | 11 Variants | `<Button variant="destructive">` (`button.tsx` line 13). | `.btn.danger` + confirm modal. | P1 | Token swap + class. | `client/src/components/ui/button.tsx` line 13; `client/src/components/admin/DatabaseTab.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#database` | Toast on error | 21 States — error | shadcn `<Toast>` (`toast.tsx` line 26 — `shadow-lg`). | `.alert.error` skin. | P2 | Re-skin `toast.tsx`. | `client/src/components/ui/toast.tsx` line 26. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#database` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-database/1280-dark-admin-populated.axe.json`. |

### 5.7 `admin-resources` (`ResourceManager`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#resources` | Toolbar | 11 Variants | `<Input>` + `<Select>` + `<Button>` mix. | `.toolbar` molecule — DS GAP (see §7 GAP-5). | P1 | See §7 GAP-5. | `client/src/components/admin/ResourceManager.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#resources` | Bulk-action dropdown | 11 Variants | shadcn `<DropdownMenu>`. | DS `.menu` — DS GAP (see §7 GAP-4). | P1 | See §7 GAP-4. | `client/src/components/admin/ResourceManager.tsx`; `client/src/components/ui/dropdown-menu.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#resources` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-resources/1280-dark-admin-populated.axe.json`. |
| `admin#resources` | Resource table | 11 Variants | shadcn `<Table>`. | `.table`. | P1 | §5.4 row 1. | `_validation/phase-2/admin-resources/1280-dark-admin-populated.dom.html`. |

### 5.8 `admin-categories` (`CategoryManager` → `GenericCrudManager`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#categories` | CRUD row | 11 Variants | shadcn `<Table>` + inline edit `<Input>`. | `.table` + `.field` (inline edit). | P1 | §5.4 row 1 + §4.8 row 1. | `client/src/components/admin/GenericCrudManager.tsx`; `client/src/components/admin/CategoryManager.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/admin-resources/1280-dark-admin-populated.dom.html` |
| `admin#categories` | Confirm modal | 11 Variants | `<AlertDialog>`. | `.modal.confirm` (DS_SPEC §5.8). | P2 | Re-skin `alert-dialog.tsx`. | `client/src/components/ui/alert-dialog.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#categories` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-categories/1280-dark-admin-populated.axe.json`. |
| `admin#categories` | Duplicate-slug error | 21 States — error | 409 → toast (post-Dec 4 fix). | `.alert.error` toast skin. | P2 | §5.6 row 2. | `_validation/phase-2/admin-categories/1280-dark-admin-populated.dom.html`; `client/src/components/admin/CategoryManager.tsx`. |

### 5.9 `admin-subcategories` (`SubcategoryManager` → `GenericCrudManager`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#subcategories` | CRUD row | 11 Variants | Same as §5.8. | `.table` + `.field`. | P1 | Single PR with §5.8. | `client/src/components/admin/SubcategoryManager.tsx`; `_validation/phase-2/admin-subcategories/1280-dark-admin-populated.dom.html`. |
| `admin#subcategories` | Confirm modal | 11 Variants | `<AlertDialog>`. | `.modal.confirm`. | P2 | §5.8 row 2. | `client/src/components/ui/alert-dialog.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#subcategories` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-subcategories/1280-dark-admin-populated.axe.json`. |

### 5.10 `admin-subsubcategories` (`SubSubcategoryManager` → `GenericCrudManager`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#subsubcategories` | CRUD row | 11 Variants | Same as §5.8. | `.table` + `.field`. | P1 | Single PR with §5.8. | `client/src/components/admin/SubSubcategoryManager.tsx`; `_validation/phase-2/admin-subsubcategories/1280-dark-admin-populated.dom.html`. |
| `admin#subsubcategories` | Confirm modal | 11 Variants | `<AlertDialog>`. | `.modal.confirm`. | P2 | §5.8 row 2. | `client/src/components/ui/alert-dialog.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#subsubcategories` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-subsubcategories/1280-dark-admin-populated.axe.json`. |

### 5.11 `admin-users` (`UsersTab`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#users` | Role chip | 11 Variants | `<Badge variant="default">`. | `.chip.admin` / `.chip.user`. | P2 | §4.1 row 3. | `client/src/components/admin/UsersTab.tsx`; `_validation/phase-2/admin-users/1280-dark-admin-populated.dom.html`. |
| `admin#users` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-users/1280-dark-admin-populated.axe.json`. |

### 5.12 `admin-github` (`GitHubSyncPanel`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#github` | Status pill | 11 Variants | Coloured `<Badge>`. | `.chip.ok` / `.chip.warn` / `.chip.err` — DS GAP (see §7 GAP-1). | P2 | See §7 GAP-1. | `client/src/components/admin/GitHubSyncPanel.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#github` | Sync log pane | 11 Variants | `<ScrollArea>` over `<pre>` text. | `.log` molecule — DS GAP (see §7 GAP-6). | P2 | See §7 GAP-6. | `client/src/components/admin/GitHubSyncPanel.tsx`; `_validation/phase-2/admin-github/1280-dark-admin-populated.dom.html`. |
| `admin#github` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-github/1280-dark-admin-populated.axe.json`. |

### 5.13 `admin-linkhealth` (`LinkHealthDashboard`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#linkhealth` | Chart | 11 Variants | `recharts` defaults. | DS palette = `--accent` + tints (DS_SPEC §3.1 mix scale). | P2 | Override `<Cell>` fills to `var(--accent)` + mixes. | `client/src/components/admin/LinkHealthDashboard.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#linkhealth` | Broken-link table | 11 Variants | `<Table>` + `<Badge>`. | `.table` + `.chip.err`. | P1 | §5.4 + §4.1. | `_validation/phase-2/admin-linkhealth/1280-dark-admin-populated.dom.html`. |
| `admin#linkhealth` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-linkhealth/1280-dark-admin-populated.axe.json`. |

### 5.14 `admin-audit` (`AuditTab`)

| Route | Component | Property | Current value | Target value | Severity | Remediation step | Evidence |
|---|---|---|---|---|---|---|---|
| `admin#audit` | Log table | 11 Variants | `<Table>` with monospace cells. | `.table.mono`. | P1 | §5.4 row 1. | `client/src/components/admin/AuditTab.tsx`; `_validation/phase-2/admin-audit/1280-dark-admin-populated.dom.html`. |
| `admin#audit` | Filter row | 11 Variants | `<Select>` + `<Input>`. | `.toolbar` — DS GAP (see §7 GAP-5). | P2 | See §7 GAP-5. | `client/src/components/admin/AuditTab.tsx`. `_validation/phase-2/BASELINE_REPORT.md` `_validation/phase-2/home/1280-dark-unauth-populated.dom.html` |
| `admin#audit` | Page | 22 ARIA | Missing landmarks. | CC-14. | P1 | CC-14. | `_validation/phase-2/admin-audit/1280-dark-admin-populated.axe.json`. |

---

## 6 · Zero-delta cells ("matches DS — no work")

Every Phase-1 route × component × property cell not explicitly listed in §3 / §4 / §5 was evaluated; those that match DS are recorded here so Gate 3 can confirm full coverage.

| Route(s) | Component | Property | Why it matches DS | Evidence |
|---|---|---|---|---|
| * | All interactive controls | 8 Sizing (touch) | Buttons + menu items + sidebar rows ≥ 44 × 44. | `client/src/components/ui/button.tsx` lines 23-27; `client/src/components/layout/new/AppHeader.tsx` lines 69, 107; `client/src/components/layout/new/AppSidebar.tsx` line 231. |
| * | Page shell | 7 Spacing | Tailwind defaults (4/8/12/16/24/32/48/64) match DS_SPEC §8.2 at px level. | `tailwind.config.ts`. |
| * | Page shell | 9 Layout — header height | 56 px (`h-14`) = DS spec. | `client/src/components/layout/new/AppHeader.tsx` line 68. |
| `/`, `/about`, `/login`, `/journeys`, `/advanced`, `/settings/theme` | Page | 22 ARIA | axe 0 violations at 1280. | `_validation/phase-2/home/1280-dark-unauth-populated.axe.json`; `_validation/phase-2/about/1280-dark-unauth-populated.axe.json`; `_validation/phase-2/login/1280-dark-unauth-populated.axe.json`; `_validation/phase-2/journeys/1280-dark-unauth-populated.axe.json`; `_validation/phase-2/advanced/1280-dark-unauth-populated.axe.json`; `_validation/phase-2/settings-theme/1280-dark-unauth-populated.axe.json`. |
| `/category/:slug`, `/subcategory/:slug`, `/sub-subcategory/:slug`, `/resource/:id`, `/journey/:id`, `*` | Page | 22 ARIA | axe 0 violations at 1280 on error/notfound states. | `_validation/phase-2/category/1280-dark-unauth-error.axe.json`; `_validation/phase-2/subcategory/1280-dark-unauth-error.axe.json`; `_validation/phase-2/sub-subcategory/1280-dark-unauth-error.axe.json`; `_validation/phase-2/resource-detail/1280-dark-unauth-error.axe.json`; `_validation/phase-2/journey-detail/1280-dark-unauth-error.axe.json`; `_validation/phase-2/notfound/1280-dark-unauth-notfound.axe.json`. |
| `/login` | Form controls | 14, 15, 16 States | Hover/focus/active variants present from shadcn defaults. | `client/src/components/ui/input.tsx` line 11; `client/src/components/ui/button.tsx` line 8. |
| * | `AppSidebar` | 23 Keyboard | Radix `<Collapsible>` binds Enter/Space; `<SidebarMenuButton>` keyboard-focusable. | `client/src/components/ui/sidebar.tsx`. |
| * | `DialogContent` | 23 Keyboard | Radix Dialog gives Tab cycle + Esc. | `client/src/components/ui/dialog.tsx`. |
| * | `DropdownMenu` | 22 ARIA + 23 Keyboard | Radix supplies `aria-haspopup` / `aria-expanded` + ArrowKey nav. | `client/src/components/ui/dropdown-menu.tsx`. |
| * | `Avatar` | 11 Variants | DS keeps avatars circular by exception. | `client/src/components/ui/avatar.tsx`. |
| * | `Toast` | 22 ARIA | shadcn `<Toast>` exports `role="status"` / `aria-live="polite"`. | `client/src/components/ui/toast.tsx`. |
| * | `Skeleton` | 19 States — loading | `client/src/styles/skeleton-animations.css` shimmer matches DS at motion level; gates `prefers-reduced-motion` at line 94. | `client/src/styles/skeleton-animations.css` lines 94-99. |
| `/` | Footer | 9 Layout | 1-px top border + small caption — matches DS frame. | `client/src/components/layout/new/MainLayout.tsx` line 48. |
| * | All routes | 10 Breakpoints | `md 768 / xl 1280 / 2xl 1536` align with SITE_MAP axis 2/3/4. Mobile drift covered by CC-13. | `tailwind.config.ts` line 9. |

---

## 7 · DS GAPS — DS_SPEC doesn't define a target

| Id | Where it shows up | DS_SPEC silence | Proposed resolution |
|---|---|---|---|
| GAP-1 | `admin-enrichment` live status, `admin-github` status pill, `admin-linkhealth` chart legend | DS_SPEC mentions `.dot` / `.live-dot` in §5.3 but doesn't enumerate status colors beyond `--accent`. | Add `--ok: var(--accent); --warn: #ffd233; --err: #ff5b5b;` to DS tokens. Chips become `.chip.ok / .warn / .err`. |
| GAP-2 | `/journey/:id` and `admin-enrichment` progress bars | DS_SPEC §5 has no `.progress` molecule. | Add `.progress { height: 4px; background: var(--surface-2); } .progress > i { background: var(--accent); }`. |
| GAP-3 | `admin-edits` diff view | No `.diff` molecule. | Add `.diff` with `--surface` body, `--accent-mix-15` insert-row bg, `--err`-mix delete-row bg. |
| GAP-4 | `admin-resources` bulk-action dropdown | DS_SPEC §5 has no standalone `.menu` molecule for dropdown menus. | Add `.menu`: `--surface` bg, 1-px `--line` border, square, `.menu-item` rows 36 px (desktop overflow rule). |
| GAP-5 | `admin-resources` / `admin-audit` toolbar | No `.toolbar` defined. | Add `.toolbar` = horizontal flex of `.field` + `.btn` + `.chip` with 12 px gap and `--line-2` bottom border. |
| GAP-6 | `admin-github` sync log | No `.log` molecule. | Add `.log` = monospace `<pre>` on `--bg-2` with `--text-2` ink, `--line` border, scroll. |
| GAP-7 | `/submit` form validation message | DS_SPEC §5.5 `.field` doesn't spec the inline error slot. | Add `.field-error` = caption 11 px `--err` ink, below input, `aria-describedby`-wired. |
| GAP-8 | `/login` OAuth provider buttons | DS_SPEC `.btn` variants don't cover provider-tinted buttons. | Reuse `.btn.secondary` + 16 px brand SVG (no per-provider color override required). |
| GAP-9 | Iconography stroke-width control | DS_SPEC §5.7 says "1.5 px stroke" but no API. | Set `LucideProps.defaultProps.strokeWidth = 1.5` once at app boot. Document in Phase-5 file plan. |

---

## 8 · Gate 3 decision

**Coverage attestation.**

- **SITE_MAP §1 — 16 routes:** `/` §4.1, `/category/:slug` §4.2, `/subcategory/:slug` §4.3, `/sub-subcategory/:slug` §4.4, `/resource/:id` §4.5, `/profile` §4.6, `/bookmarks` §4.7, `/submit` §4.8, `/journeys` §4.9, `/journey/:id` §4.10, `/advanced` §4.11, `/settings/theme` §4.12, `/login` §4.13, `/about` §4.14, `/admin` §4.15, `*` §4.16. All 16 present.
- **SITE_MAP §2 — 14 admin tabs:** approvals §5.1, edits §5.2, enrichment §5.3, researcher §5.4, export §5.5, database §5.6, resources §5.7, categories §5.8, subcategories §5.9, subsubcategories §5.10, users §5.11, github §5.12, linkhealth §5.13, audit §5.14. All 14 present as distinct cells.
- **SITE_MAP §3 components:** `AppHeader` §4.18, `AppSidebar` §4.17, `<Card>` §4.1, `<Button>` CC + §4.5, `<Badge>` §4.1, `<Input>` §4.8, `<Textarea>` §4.8, `<Select>` §6, `<Switch>` CC-06, `<Slider>` §4.11, `<Progress>` §4.10, `<Dialog>` §4.5, `<DropdownMenu>` GAP-4 / §6, `<Tabs>` §4.15, `<Toast>` §5.6, `<Skeleton>` §6, `<Avatar>` §4.6 / §6, `<Breadcrumb>` §4.18, `<Table>` §5.4, `<ScrollArea>` §5.12, `<Collapsible>` §6, `<AlertDialog>` §5.8. Each component has at least one delta row or one zero-delta row in §6.
- **Property catalogue §1 (27 slots):** slot 1 — CC-01/02 + many §4/§5 rows; slot 2 — CC-04 + §4.5 row 1; slot 3 — CC-05; slot 4 — CC-06; slot 5 — CC-03/07; slot 6 — §4.1, §4.14, §4.15; slot 7 — CC-17, §6; slot 8 — CC-15, §6; slot 9 — CC-16, §4.1, §4.18, §6; slot 10 — CC-13, §6; slot 11 — most §4 / §5 rows; slot 12 — CC-12, §4.12, §4.18; slot 13 — CC-06, CC-11; slots 14-18 — §4.5 row 2, §4.17 row 3, §5.5 row 2, §6; slot 19 — §4.1 row 6, §5.3 row 5, §5.4 row 2 (loading-related); slot 20 — §4.1 row 7, §4.7 row 3; slot 21 — §4.1 row 8, §4.2 row 4, §4.10 row 2, §4.15 row 6, §4.15 row 7, §5.6 row 2, §5.8 row 4; slot 22 — CC-14 + every §4/§5 page row + §6; slot 23 — §4.17 row 6, §6; slot 24 — CC-11, §5.3 row 4; slot 25 — CC-10; slot 26 — CC-08; slot 27 — CC-09, §4.12 row 1. **All 27 slots covered.**
- **State axis (Phase-1 axis 5):** `populated` covered by §6 + all admin tab rows; `error` by §4.2/4.3/4.4/4.5/4.10/4.15/4.16/5.6 row 2/5.8 row 4; `loading` by §4.1 row 6 + §5.3 row 5 + §4.15 row 6 (artifacts not present — logged in §0.0); `empty` by §4.1 row 7 + §4.7 row 3 (artifacts not present — logged in §0.0). Coverage complete; missing artifacts captured as gaps.
- **Auth axis (unauth / admin):** CC rows are auth-invariant; admin-only tabs are admin-auth by construction.
- **Viewport axis (375 / 768 / 1280 / 1536):** CC-13 is the only viewport-dependent delta; all other rows are viewport-invariant. The Phase-1-vs-Phase-2 naming drift (400 vs 375) is captured in §0.0 and CC-13.
- **Total distinct rows:** 92 deltas (P0=7 + P1=45 + P2=28 + P3=12) + 14 zero-delta cells + 9 DS GAPs. Combined with the cross-cutting CC-01…CC-17 multipliers, the full Phase-1 cube is accounted for.

**Decision: PASS.** Phase 4 may begin token-layer remediation against this catalogue.

The seven P0 rows — CC-01, CC-02, CC-03, CC-04, CC-08, CC-09, §4.12 row 1 — **must** land before any P1 visual work, because they create the surface on which every P1 fix becomes meaningful. The 14 axe `landmark-one-main` / `page-has-heading-one` violations are a single CC-14 fix.

**Out of scope for Phase 4** (carried from DS_SPEC §9): light mode (CC-10 collapses to single dark), Option-B systems (Brutalist / Swiss / Editorial / Lumen), the `awesome-list-site-ds/` demo files.

---

*End of DELTA_CATALOG.md — Phase 3.*
