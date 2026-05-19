# Functional Validation — Global Chrome

**Task:** #34 — Drive a real browser through every interactive element of the persistent chrome (sidebar, header, footer, search shortcuts, theme + font pickers, skip-link, mobile drawer) and record PASS/FAIL with evidence per the Iron Rule (no mocks, no test files).

**Status:** AUDIT ONLY. No code changes. Findings rolled into existing follow-up Fix tasks (Section 5).

**Date:** May 19, 2026

**Method:** `npx agent-browser@0.27.0` (Playwright daemon) driving the running dev server at `http://localhost:5000/`. Single chained session per axis to keep the daemon's page alive. Evidence captured to `evidence/functional/chrome/01..15_*.png` and inline JSON dumps in this report. Desktop viewport 1440×900, mobile viewport 390×844.

---

## 1. TL;DR

1. **Two HIGH-severity functional defects in the chrome.** Both surface to the user as broken built-in affordances:
   - **FC-01 — `/` keyboard shortcut is dead.** `client/src/App.tsx:51-77` registers a `keydown` listener for `/` that calls `setSearchOpen(true)` on **an orphan `useState` inside App.tsx**. App.tsx does not render any `<SearchDialog>`; the live dialog is mounted by `MainLayout.tsx:74` against its **own separate** `searchOpen` state. The user therefore presses `/`, the App.tsx orphan flips, nothing visible happens. The header chip in `AppHeader.tsx:101-103` still advertises the `/` kbd hint, so the discoverability promise is broken.
   - **FC-02 — Color-theme picker is a no-op at runtime.** Already flagged on the visual side in `AUDIT_MOBILE.md` §1.2; this audit confirms it is also functionally dead. Clicking each of the 6 cards on `/settings/theme` does persist `theme-preset` to `localStorage`, but `--accent` / `--accent-2` never change (`#ff3d52` before, `#ff3d52` after all 6 picks, `#ff3d52` after page reload), because `theme-provider.tsx:134` reads `activeTheme?.dark?.primary` while the `ThemePreset` shape exposes the value under `cssVars.primary`.
2. **One MEDIUM defect on the same page.** **FC-03 — theme-card labels render as empty strings + identical fallback swatches.** `ThemeSettings.tsx:99-119` reads `preset.label` + `preset.dark/light.primary/secondary/accent`; none of those fields exist on `ThemePreset`. The 6 cards therefore display no name and three identical `#000 / #444 / #888` swatch slabs (visible in `evidence/functional/chrome/08_theme_page_initial.png` and `10_theme_after_color_cycle.png`).
3. **Everything else in the chrome works.** 14 of 18 audited behaviors PASS, 3 FAIL (F / J / L), 1 PARTIAL (M = font half PASS + color half FAIL, same root cause as L). PASS list: A baseline, B sidebar 1st-level expand, C sidebar 2nd-level expand, D header search-chip click, E **Cmd-K** shortcut, G logged-out Login button, H footer About link, I sidebar-row → route + active-rail sync + breadcrumb, K font picker (all 6 fonts swap `--font-sans` live and persist across reload), N mobile baseline, O mobile hamburger → drawer, P drawer close via ESC, Q skip-to-content link (focusable, visible at `top:8px / z:9999`), R header theme-dot indicator color (code path correct, masked by FC-02 downstream).
4. **No new regressions** vs prior visual audits — the `/` and color-theme bugs are pre-existing and unchanged since WP-4 / Task #33 ship.

---

## 2. Inventory of chrome interactive elements (what was audited)

Persistent across every route, both viewports unless noted:

| Element | Source | Behaviors audited |
|---|---|---|
| Sidebar brand button | `AppSidebar.tsx:121` | Click → `/` |
| Sidebar top-level nav items (Home, Submit, Journeys, Advanced, Theme) | `AppSidebar.tsx:108-114` | Click → route, `data-active` rail follows route |
| Sidebar category items + chevron expanders | `AppSidebar.tsx:180-322` | 1st-level expand/collapse, 2nd-level expand/collapse, click row → category route |
| Sidebar footer About | `AppSidebar.tsx:333-336` | Click → `/about` |
| Sidebar hamburger trigger (mobile only) | `SidebarTrigger` in `AppHeader.tsx:68` | Open / close mobile drawer |
| Header search chip + `/` kbd hint | `AppHeader.tsx:93-105` | Click → command palette, `Cmd/Ctrl+K`, `/` |
| Header palette icon (theme link) + accent-color dot | `AppHeader.tsx:108-120` | Click → `/settings/theme`; dot reflects active accent |
| Header Login button | `AppHeader.tsx:158-162` | Visible logged-out; href = `/api/login` |
| Header user avatar dropdown | `AppHeader.tsx:122-156` | Logged-out path only audited (out-of-scope: logged-in menu — Task #35) |
| Breadcrumb | `AppHeader.tsx:71-90` | Renders per route depth |
| Footer React/shadcn/About links | `MainLayout.tsx:62-72` | About link target |
| Skip-to-content link | `MainLayout.tsx:34` | Focusable, `href="#main"`, becomes visible on focus |
| Font picker (6 cards) | `ThemeSettings.tsx:54-87` | Each card click writes `--font-sans` and `localStorage.app-font` |
| Color-theme picker (6 cards) | `ThemeSettings.tsx:96-133` | Each card click should write `--accent`/`--accent-2` and `localStorage.theme-preset` |
| Reload persistence | `theme-provider.tsx:50-70, 125-139` | After reload, picked font + theme reapply |

---

## 3. Per-behavior verdicts

Severity scale: **CRITICAL / HIGH / MEDIUM / LOW / NOTE / PASS**. Evidence column refers to files under `evidence/functional/chrome/`.

### 3.1 Desktop chrome (1440×900)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| A | Home loads, sidebar + header + footer render. Baseline: 33 buttons, 16 sidebar menu buttons, `--font-sans = 'Inter'`, `--accent = #ff3d52` (Editorial crimson default). LS clean (`preset=null, fontLS=null`). | **PASS** | `01_home_desktop.png` |
| B | Sidebar 1st-level expand: clicking `expand-cat-community-events` reveals 2 sub-buttons (was 0). | **PASS** | `02_sidebar_cat_expanded.png` |
| C | Sidebar 2nd-level expand: clicking `expand-sub-community-groups` adds 1 more sub-button (2→3). | **PASS** | `03_sidebar_subcat_expanded.png` |
| D | Header search chip → command palette. Click `button[aria-label="Open search"]` ⇒ 1 `[role=dialog]`, `cmdk-input` present, placeholder `"Search packages, libraries, and tools..."`. | **PASS** | `04_search_dialog_open.png` |
| E | `Cmd/Ctrl+K` shortcut opens palette. After ESC closed the dialog, pressing `Meta+k` ⇒ dialog count 0→1, `cmdk-input` re-mounted. *(Note: handler lives in `search-dialog.tsx:63`, NOT in App.tsx.)* | **PASS** | `05_search_via_cmdk.png` |
| F | `/` shortcut opens palette. After ESC, pressing `/` ⇒ `dialogAfterSlash: 0`. No dialog. Header chip still advertises the `/` kbd hint. Root cause: `App.tsx:51-77` listener calls `setSearchOpen(true)` on a local state with no consumer; `SearchDialog`'s own keydown listener (`search-dialog.tsx:63`) handles only `Cmd/Ctrl+K`, not `/`. | **FAIL — HIGH (FC-01)** | `06_search_via_slash.png` |
| G | Logged-out Login button: visible in header, text `"Login"`, mounted from `AppHeader.tsx:158`. | **PASS** | (visible in `01_home_desktop.png` top-right) |
| H | Footer About link: `<a href="/about">About</a>` found in `<footer>`. | **PASS** | `01_home_desktop.png` (bottom) |
| I | Sidebar nav → route + active rail + breadcrumb. Clicked `Players & Clients221` ⇒ URL `/category/players-clients`; `data-active=true` lives on `Players & Clients221` only; breadcrumb = `["Home", "Category", "Players Clients"]` (separator nodes between each). | **PASS** | `07_category_route.png` |
| J | `/settings/theme` page renders. Font picker grid: 6 cards (`Inter, DM Sans, Source Sans 3, IBM Plex Sans, JetBrains Mono, System Default`). Color-theme grid: 6 cards present (`cyberpunk, limes, black-pink, flat-pink, purples, flat-purples` via `data-testid`), but card body `<span>` labels return empty strings — the `{preset.label}` prop is `undefined`. Swatch slabs render with identical fallback colors `#000 / #444 / #888` (visible in screenshot). | **FAIL — MEDIUM (FC-03)** | `08_theme_page_initial.png` |
| K | Cycle all 6 fonts. For each card click, `--font-sans` updates to the matching family AND `localStorage.app-font` updates. All 6 transitions verified: `inter → 'Inter'…`, `dm-sans → 'DM Sans'…`, `source-sans → 'Source Sans 3'…`, `ibm-plex → 'IBM Plex Sans'…`, `jetbrains → 'JetBrains Mono'…`, `system → ui-sans-serif, system-ui…`. | **PASS** | `09_theme_after_font_cycle.png` |
| L | Cycle all 6 color themes. For each card click, `localStorage.theme-preset` updates correctly (`cyberpunk → limes → black-pink → flat-pink → purples → flat-purples`), BUT `--accent` and `--accent-2` stay locked at `#ff3d52` / `#b84dff` across every pick. Root cause: `theme-provider.tsx:134` reads `activeTheme?.dark?.primary`; `ThemePreset` exposes the value under `cssVars.primary`, so the condition is always falsy and the `style.setProperty` calls never run. | **FAIL — HIGH (FC-02)** | `10_theme_after_color_cycle.png` |
| M | Reload persistence. Seeded `localStorage` with `app-font=dm-sans` + `theme-preset=limes` and reloaded. After reload: `--font-sans = 'DM Sans'…` ✓ (font hydrates correctly), but `--accent = #ff3d52` ✗ (limes accent never applied). LS round-trips correctly for both keys. Same root cause as FC-02. | **PARTIAL (font PASS / color FAIL — same root cause as FC-02)** | `11_after_reload.png` |

### 3.2 Mobile chrome (390×844)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| N | Mobile home loads. Sidebar hidden by default (CSS Grid collapses the rail), hamburger trigger present (`[data-sidebar=trigger]`), no off-canvas sheet open. | **PASS** | `12_mobile_home_closed.png` |
| O | Hamburger → drawer open. Clicking `[data-sidebar=trigger]` mounts a Sheet (`[role=dialog]` count 0→1), `[data-sidebar=sidebar][data-mobile=true]` present, 16 menu buttons visible inside the drawer (parity with desktop). | **PASS** | `13_mobile_drawer_open.png` |
| P | Drawer close via ESC. `dialogsAfterClose: 0`. Native Sheet ESC-to-close path works. | **PASS** | `14_mobile_drawer_closed.png` |

### 3.3 Accessibility / focus chrome

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| Q | Skip-to-content link. `.skip-link` is the first focusable node (`MainLayout.tsx:34`); after `.focus()` the computed style returns `position:absolute, top:8px, left:8px, z-index:9999, opacity:1, clip-path:none, transform:none` — i.e. it pops out of the visually-hidden state and lands in the top-left corner. `href="#main"` matches the `<main id="main">` landmark in `MainLayout.tsx:57`. Visible in screenshot. | **PASS** | `15_skip_link_focused.png` |
| R | Header palette-icon active-accent dot. `AppHeader.tsx:118` reads `activeTheme.preview.accent` (correct field). Inline style on the dot = `background-color: rgb(255, 0, 60)` on baseline. This field IS populated on `ThemePreset`, so the dot itself is wired correctly — but because FC-02 prevents the theme from ever actually changing in the live CSS, the dot only "tracks" what the React state thinks the theme is, which the rest of the page does not honor. **PASS (the indicator code is correct);** downstream effect is masked by FC-02. | **PASS (with FC-02 caveat)** | `04_search_dialog_open.png` (top-right of header) |

---

## 4. Findings — root-cause detail

### FC-01 — `/` shortcut wired to orphan state (HIGH)

**Files:** `client/src/App.tsx:38-77`, `client/src/components/layout/new/MainLayout.tsx:28-79`, `client/src/components/ui/search-dialog.tsx:60-71`.

- `App.tsx:40` declares `const [searchOpen, setSearchOpen] = useState(false);`. App.tsx never renders any `<SearchDialog>` and never passes `searchOpen` / `setSearchOpen` to a child via props or context.
- `App.tsx:51-73` registers the only `/`-key handler in the codebase. It calls `setSearchOpen(true)` on the orphan state.
- The actually-visible `<SearchDialog>` is rendered in `MainLayout.tsx:74` and owns its own `useState("searchOpen")` at `MainLayout.tsx:28`. That state is toggled by (a) the header chip's `onClick`, and (b) `SearchDialog`'s own internal `keydown` listener at `search-dialog.tsx:63` which only matches `Cmd/Ctrl+K`.
- Net effect for the user: pressing `/` does nothing, yet the chip in the header advertises `/` as the keyboard hint (`AppHeader.tsx:101-103`).

**Suggested fix direction (NOT applied here):** delete the dead `searchOpen` state + handler in `App.tsx`, and add a `key === "/"` branch to the existing listener inside `SearchDialog` (mirroring the `Cmd/Ctrl+K` branch already there), gated on `!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)`.

### FC-02 — Color-theme picker has no runtime effect (HIGH)

**File:** `client/src/components/ui/theme-provider.tsx:129-139`.

```ts
useEffect(() => {
  const root = document.documentElement;
  const primary = activeTheme?.dark?.primary || activeTheme?.light?.primary;
  if (primary) {
    root.style.setProperty('--accent', primary);
    root.style.setProperty('--accent-2', primary);
  }
}, [activeTheme]);
```

`ThemePreset` (see `client/src/lib/shadcn-themes.ts`) does not have `.dark` or `.light` fields; it has `name`, `value`, `cssVars: { primary, ... }`, `preview: { accent, ... }`. `activeTheme?.dark?.primary` is therefore always `undefined`, the `if (primary)` guard fails, and the `setProperty` calls never fire. `--accent` / `--accent-2` remain at whatever the CSS layer in `design-system.css` set (the Editorial crimson `#ff3d52` / `#b84dff`).

**Evidence:** test L dumps the same `accent: "#ff3d52", accent2: "#b84dff"` after every one of the 6 picks; test M confirms it stays `#ff3d52` even after `theme-preset=limes` is in `localStorage` and the page is reloaded.

### FC-03 — Theme-card labels and swatches read from wrong fields (MEDIUM)

**File:** `client/src/pages/ThemeSettings.tsx:97-129`.

```ts
const isActive = preset.value === activeTheme.value;
const primary = preset.dark?.primary || preset.light?.primary || "#000";
const secondary = preset.dark?.secondary || preset.light?.secondary || "#444";
const accent = preset.dark?.accent || preset.light?.accent || "#888";
…
<span className="font-semibold text-sm">{preset.label}</span>
```

Same shape mismatch as FC-02. `preset.label` is `undefined` ⇒ the card title is an empty `<span>`; the three swatch slabs always render the `#000 / #444 / #888` fallbacks (visible as one near-black slab + two indistinguishable charcoal slabs on every card in `08_theme_page_initial.png`). The hex code printed under each swatch is therefore always `#000`.

Even after FC-02 is fixed, the picker UI itself would still be unlabeled and visually identical across all 6 presets without fixing FC-03 too.

---

## 5. Rollup into existing follow-up tasks

No new follow-up tasks proposed. All three findings fold into the already-queued **Fix-DS** task (which inherited the FC-02/FC-03 fix scope from Task #33's M-02 finding):

| Finding | Severity | Fix owner | Note |
|---|---|---|---|
| FC-01 — `/` shortcut dead | HIGH | **Fix-DS** (extend scope by 1 file: also delete orphan handler in `App.tsx:51-77` and add `/` branch in `search-dialog.tsx`) | New in this audit. Single small edit. |
| FC-02 — accent applier reads wrong field | HIGH | **Fix-DS** (already in scope per #33 M-02) | Confirmed live. |
| FC-03 — theme-card labels + swatches | MEDIUM | **Fix-DS** (already in scope per #33 M-02) | Confirmed live. |

The pending **Re-validation gate** task should re-run this audit after Fix-DS lands and flip FC-01/02/03 to PASS before merge.

---

## 6. What was NOT audited — explicit coverage gaps

These are **persistent-chrome** behaviors I did not exercise in this run. They remain unverified and are explicitly NOT covered by any PASS verdict in §3:

| Gap | Element | Reason | Where it should land |
|---|---|---|---|
| G1 | Footer external links: `<a>` to `reactjs.org` and `ui.shadcn.com` in `MainLayout.tsx:62-72` | Only the in-app `/about` link was clicked. Targets, `target="_blank"`, `rel="noopener noreferrer"` attribute presence are confirmed in source but no click was dispatched. | Re-validation gate (low risk; static `<a href>` with `target=_blank`) |
| G2 | Logged-in user avatar dropdown (Profile / Bookmarks / Admin / Sign Out) in `AppHeader.tsx:122-156` | Requires authenticated session fixture; not in this audit's setup. | **Task #35** or a dedicated authed-chrome pass |
| G3 | Sidebar 3rd-level (sub-subcategory) expand — only 1st and 2nd levels exercised | Test C verified 2nd-level revealed 3rd-level rows are present, but I did not click into a sub-subcategory route. | Page-interactions audit (Task #35) |
| G4 | Sidebar brand-button click → `/` and Theme-icon click → `/settings/theme` from header | Navigation reached `/settings/theme` via direct `open` not via the header icon click; brand button was never clicked. | Re-validation gate (low risk; identical `setLocation` path as other PASSes) |
| G5 | `Ctrl+K` on a Linux/Windows keyboard layout | Only `Meta+K` (macOS) was dispatched. Implementation in `search-dialog.tsx:63` checks `e.metaKey \|\| e.ctrlKey` so behavior should be identical, but not directly evidenced. | Re-validation gate |
| G6 | Random / custom-hex theme paths in `theme-provider.tsx` | Picker UI doesn't expose them at `/settings/theme` (only the 6 presets), so end users can't reach them today. | Not in scope until UI exposes the affordance |
| G7 | Page-internal interactions (resource cards, filters, AI-rec form, journey checkbox state, admin tabs) | Out of scope per task spec. | **Task #35** |
| G8 | Visual regressions vs the Claude handoff PNGs | Out of scope — covered by `AUDIT_MOBILE.md` / `AUDIT_LANDING.md` / etc. | (already covered) |

---

## 7. Evidence index

All files under `evidence/functional/chrome/`:

| # | File | What it proves |
|---|---|---|
| 01 | `01_home_desktop.png` | Baseline home @ 1440×900, sidebar+header+footer rendered, Login chip top-right |
| 02 | `02_sidebar_cat_expanded.png` | 1st-level category expanded, 2 sub-rows visible |
| 03 | `03_sidebar_subcat_expanded.png` | 2nd-level subcategory expanded, 3rd-level rows visible |
| 04 | `04_search_dialog_open.png` | Command palette open via header chip click |
| 05 | `05_search_via_cmdk.png` | Command palette reopened via `Meta+K` |
| 06 | `06_search_via_slash.png` | After pressing `/`: **no dialog** (FC-01 evidence) |
| 07 | `07_category_route.png` | `/category/players-clients` rendered; active rail on Players & Clients |
| 08 | `08_theme_page_initial.png` | `/settings/theme` — 6 font cards labeled, 6 color cards **unlabeled with identical fallback swatches** (FC-03 evidence) |
| 09 | `09_theme_after_font_cycle.png` | After cycling all 6 fonts, page renders in last-picked font |
| 10 | `10_theme_after_color_cycle.png` | After cycling all 6 themes, accent dot + page chrome still in crimson (FC-02 evidence) |
| 11 | `11_after_reload.png` | After reload with `theme-preset=limes` in LS: font hydrated to DM Sans, accent still crimson (FC-02 evidence) |
| 12 | `12_mobile_home_closed.png` | Mobile home @ 390×844, hamburger visible, sidebar hidden |
| 13 | `13_mobile_drawer_open.png` | Mobile drawer open via hamburger, 16 menu rows visible |
| 14 | `14_mobile_drawer_closed.png` | Drawer closed via ESC |
| 15 | `15_skip_link_focused.png` | Skip-to-content link visible top-left after Tab focus |
| — | `state_dumps.json` | Structured JSON capture of every in-page assertion: computed CSS variables (`--font-sans`, `--accent`, `--accent-2`), `localStorage` values, dialog counts, breadcrumb arrays, active-menu text, font/theme cycle results — i.e., the objective backing for every state-based PASS / FAIL verdict in §3. |
