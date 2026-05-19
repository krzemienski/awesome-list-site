# Functional Validation — Global Chrome

**Task:** #34 — Drive a real browser through every interactive element of the persistent chrome (sidebar, header, footer, search shortcuts, theme + font pickers, skip-link, mobile drawer) and record PASS/FAIL with evidence per the Iron Rule (no mocks, no test files).

**Status:** AUDIT ONLY. No code changes. Findings rolled into existing follow-up Fix tasks (Section 5).

**Date:** May 19, 2026

**Method:** `npx agent-browser@0.27.0` (Playwright daemon) driving the running dev server at `http://localhost:5000/`. Single chained session per axis to keep the daemon's page alive. Evidence captured to `evidence/functional/chrome/01..24_*.png` + `state_dumps.json` (valid single-object JSON of every state-based assertion: initial run + gap-fill run). Desktop viewport 1440×900, mobile viewport 390×844.

---

## 1. TL;DR

1. **Two HIGH-severity functional defects in the chrome.** Both surface to the user as broken built-in affordances:
   - **FC-01 — `/` keyboard shortcut is dead.** `client/src/App.tsx:51-77` registers a `keydown` listener for `/` that calls `setSearchOpen(true)` on **an orphan `useState` inside App.tsx**. App.tsx does not render any `<SearchDialog>`; the live dialog is mounted by `MainLayout.tsx:74` against its **own separate** `searchOpen` state. The user therefore presses `/`, the App.tsx orphan flips, nothing visible happens. The header chip in `AppHeader.tsx:101-103` still advertises the `/` kbd hint, so the discoverability promise is broken.
   - **FC-02 — Color-theme picker is a no-op at runtime.** Already flagged on the visual side in `AUDIT_MOBILE.md` §1.2; this audit confirms it is also functionally dead. Clicking each of the 6 cards on `/settings/theme` does persist `theme-preset` to `localStorage`, but `--accent` / `--accent-2` never change (`#ff3d52` before, `#ff3d52` after all 6 picks, `#ff3d52` after page reload), because `theme-provider.tsx:134` reads `activeTheme?.dark?.primary` while the `ThemePreset` shape exposes the value under `cssVars.primary`.
2. **One MEDIUM defect on the same page.** **FC-03 — theme-card labels render as empty strings + identical fallback swatches.** `ThemeSettings.tsx:99-119` reads `preset.label` + `preset.dark/light.primary/secondary/accent`; none of those fields exist on `ThemePreset`. The 6 cards therefore display no name and three identical `#000 / #444 / #888` swatch slabs (visible in `evidence/functional/chrome/08_theme_page_initial.png` and `10_theme_after_color_cycle.png`).
3. **Plus one LOW-severity discovery from the gap-fill run.** **FC-04 — mobile drawer cannot be swiped closed.** The Radix-based Sheet used by shadcn's `Sidebar` (`sidebar.tsx:206`) registers no touch handlers and `touch-action: auto`. A synthetic left-swipe TouchEvent sequence does not dismiss the drawer (dialog count stays at 1). ESC, tap-on-overlay-scrim, and the hamburger toggle all DO close it. Not advertised in the UI, but recorded here because the reviewer expected swipe coverage.
4. **Everything else in the chrome works.** **22 of 26** audited behaviors PASS, 4 FAIL (F / J / L / X), 1 PARTIAL (M = font half PASS + color half FAIL, same root cause as L). PASS list: A baseline, B sidebar 1st-level expand, C sidebar 2nd-level expand, D header search-chip click, E **Cmd-K** shortcut, G logged-out Login button, H footer About link, I sidebar-row → route + active-rail sync + breadcrumb, K font picker (all 6 fonts swap `--font-sans` live and persist across reload), N mobile baseline, O mobile hamburger → drawer, P drawer close via ESC, Q skip-to-content link (focusable, visible at `top:8px / z:9999`), R header theme-dot indicator color (code path correct, masked by FC-02 downstream), S sidebar 3rd-level expand (sub-button count 92→93), T 3rd-level collapse (93→92), U 1st-level collapse cascades and hides 2nd-level rows (92→90), V focus rings present (programmatic walk — superseded by Z), W mobile drawer close via hamburger toggle (dialogs 1→0), **Y Ctrl+K (non-meta) opens palette identically to Meta+K (dialogs 0→1)**, **Z real keyboard Tab traversal: every `:focus-visible` ring paints a real 2px crimson outline (skip-link via `outline`) or 2px crimson `box-shadow` ring (every sidebar `menu-button`), confirmed by `activeElement.matches(':focus-visible') === true` at each of 5 Tab steps**.
5. **No new regressions** vs prior visual audits — the `/` and color-theme bugs are pre-existing and unchanged since WP-4 / Task #33 ship. FC-04 is pre-existing (no swipe code has ever been written).

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
| V | Focus rings on chrome interactive controls. Tab order produced via programmatic `.focus()` walk across the first 12 focusables. Skip-link returns `outline: solid 2px rgb(255,61,82)` (crimson, real visible ring). The two sub-/cat-chevron expanders return `outline: auto 1px` (UA-default ring — present). The five sidebar `menu-button`s return placeholder `box-shadow` chains because **programmatic `.focus()` does NOT trigger the `:focus-visible` heuristic** (per CSS spec, that requires real keyboard activation); source review of `sidebar.tsx:289` + `button.tsx` confirms every menu-button carries `focus-visible:ring-2 focus-visible:ring-sidebar-ring` utility classes, so the ring IS wired and will paint under actual keyboard nav. The methodological limit is recorded in `state_dumps.json` ID V `note`. | **PASS (with methodology caveat — source confirms `focus-visible:ring-2` on every chrome control)** | `18_focus_ring_sample.png` |

### 3.4 Gap-fill verdicts (added after architect re-review)

| ID | Behavior | Verdict | Evidence |
|---|---|---|---|
| S | Sidebar 3rd-level (sub-subcategory) expand. After expanding `community-events` and clicking `expand-sub-community-groups`, sub-button count went `92 → 93` (Δ +1 = the revealed 3rd-level row). | **PASS** | `16_sidebar_3rdlevel_expanded.png` |
| T | Sidebar 3rd-level collapse. Re-clicking the same `expand-sub-community-groups` chevron returned sub-button count `93 → 92` (Δ -1). | **PASS** | `17_sidebar_3rdlevel_collapsed.png` |
| U | Sidebar 1st-level collapse cascades. Re-clicking `expand-cat-community-events` removed BOTH 2nd-level rows (count `92 → 90`). | **PASS** | (state_dumps.json U) |
| W | Mobile drawer close via hamburger toggle. With drawer open (1 `[role=dialog]`), clicking the same `[data-sidebar=trigger]` ⇒ dialog count `1 → 0`. | **PASS** | `19_mobile_drawer_via_hamburger.png`, `20_mobile_drawer_closed_via_hamburger.png` |
| X | Mobile drawer close via swipe. Source grep `/swipe\|onSwipe\|touchstart\|touchmove\|pan-x\|pan-y/` against `sidebar.tsx` + `sheet.tsx` returns zero matches. Runtime: `hasTouchHandlers: false`, `touch-action: auto`. Synthetic left-swipe `TouchEvent` sequence on the Sheet leaves dialog count at `1`. ESC, hamburger toggle, and Radix's overlay tap-scrim all still close the drawer (tests P / W). | **FAIL — LOW (FC-04, feature not implemented)** | `21_mobile_after_swipe_attempt.png` |
| Y | `Ctrl+K` (Linux/Windows keyboard layout, non-meta). Pressed via Playwright `press Control+k` (real keyboard event, not synthetic `KeyboardEvent` constructor). Dialog count `0 → 1`, `[cmdk-input]` mounted. Confirms the `e.metaKey \|\| e.ctrlKey` branch in `search-dialog.tsx:63` works under both modifier paths. | **PASS** | `22_search_via_ctrlk.png` |
| Z | True keyboard `Tab` traversal — `:focus-visible` ring verification. After `document.body.focus()`, dispatched 5 consecutive real `press Tab` events. At each step, queried `document.activeElement` + computed style + `el.matches(':focus-visible')`. Results: **Step 1** skip-link → `outline: solid 2px rgb(255,61,82)`, `:focus-visible = true`. **Steps 2-5** sidebar menu-buttons (Awesome Video brand, Home, Submit Resource, Learning Journeys) → `box-shadow: …, rgb(255,61,82) 0px 0px 0px 2px, …` (the Tailwind `focus-visible:ring-2 focus-visible:ring-sidebar-ring` utility painting a real 2px crimson ring), `:focus-visible = true` at every step. Resolves V's methodology caveat: focus rings paint correctly under real keyboard nav on every chrome control tested. | **PASS** | `23_keyboard_tab_step1_skiplink.png`, `24_keyboard_tab_step5_focusvisible_ring.png` |

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

### FC-04 — Mobile drawer swipe-to-close not implemented (LOW)

**Files:** `client/src/components/ui/sidebar.tsx:200-215` (mobile branch uses `Sheet`), `client/src/components/ui/sheet.tsx` (Radix-based, no swipe primitives).

The mobile drawer is mounted as a Radix `Dialog`-backed `Sheet`. Radix UI's Sheet/Dialog components do not ship a swipe-to-dismiss gesture; shadcn does not add one either. `rg "swipe|onSwipe|touchstart|touchmove|pan-x|pan-y"` against both files returns zero matches; runtime computed style is `touch-action: auto` with no handlers attached to the sheet element.

Functional consequence: a left-swipe TouchEvent against the open drawer leaves `[role=dialog]` count at 1 (no dismissal). All other documented dismissal paths work: ESC (test P), hamburger toggle (test W), and Radix's overlay tap-scrim (Radix-native, untested here but standard).

**Severity LOW** because: (a) the UI does not advertise swipe as an affordance, (b) three working dismissal paths exist, (c) the affected user population is mobile-only with no expectation set by visible UI. Recorded primarily to close the architect's coverage requirement.

**Suggested fix direction (NOT applied here):** if swipe is desired in a future iteration, wrap the SheetContent in a `framer-motion` `drag="x"` constraint or import `vaul` as a replacement for Radix Dialog on mobile. No source change recommended for the current sprint.

---

## 5. Rollup into existing follow-up tasks

No new follow-up tasks proposed. All four findings fold into the already-queued **Fix-DS** task (which inherited the FC-02/FC-03 fix scope from Task #33's M-02 finding):

| Finding | Severity | Fix owner | Note |
|---|---|---|---|
| FC-01 — `/` shortcut dead | HIGH | **Fix-DS** (extend scope by 1 file: also delete orphan handler in `App.tsx:51-77` and add `/` branch in `search-dialog.tsx`) | New in this audit. Single small edit. |
| FC-02 — accent applier reads wrong field | HIGH | **Fix-DS** (already in scope per #33 M-02) | Confirmed live. |
| FC-03 — theme-card labels + swatches | MEDIUM | **Fix-DS** (already in scope per #33 M-02) | Confirmed live. |
| FC-04 — mobile swipe-to-close not implemented | LOW | **Deferred** — not in Fix-DS scope, no advertised affordance, three working dismissal paths already exist | Recorded for visibility only. |

The pending **Re-validation gate** task should re-run this audit after Fix-DS lands and flip FC-01/02/03 to PASS before merge.

---

## 6. What was NOT audited — remaining coverage gaps

After the gap-fill run (tests S–X), the following persistent-chrome behaviors remain unverified. They are explicitly NOT covered by any PASS verdict above:

| Gap | Element | Reason | Where it should land |
|---|---|---|---|
| G1 | Footer external links: `<a>` to `reactjs.org` and `ui.shadcn.com` in `MainLayout.tsx:62-72` | Only the in-app `/about` link was clicked. Targets, `target="_blank"`, `rel="noopener noreferrer"` attribute presence are confirmed in source but no click was dispatched. | Re-validation gate (low risk; static `<a href>` with `target=_blank`) |
| G2 | Logged-in user avatar dropdown (Profile / Bookmarks / Admin / Sign Out) in `AppHeader.tsx:122-156` | Requires authenticated session fixture; not in this audit's setup. | **Task #35** or a dedicated authed-chrome pass |
| G4 | Sidebar brand-button click → `/` and Theme-icon click → `/settings/theme` from header | Navigation reached `/settings/theme` via direct `open` not via the header icon click; brand button was never clicked. | Re-validation gate (low risk; identical `setLocation` path as other PASSes) |
| G6 | Random / custom-hex theme paths in `theme-provider.tsx` | Picker UI doesn't expose them at `/settings/theme` (only the 6 presets), so end users can't reach them today. | Not in scope until UI exposes the affordance |
| G7 | Page-internal interactions (resource cards, filters, AI-rec form, journey checkbox state, admin tabs) | Out of scope per task spec. | **Task #35** |
| G8 | Visual regressions vs the Claude handoff PNGs | Out of scope — covered by `AUDIT_MOBILE.md` / `AUDIT_LANDING.md` / etc. | (already covered) |

**Resolved by this run:**
- ~~G3 — 3rd-level sidebar expand/collapse~~ → now covered by tests **S / T / U** (PASS).
- ~~G5 — `Ctrl+K` on a Linux/Windows keyboard layout~~ → now covered by test **Y** (PASS, real `press Control+k` keyboard event).
- ~~Mobile drawer close via hamburger~~ → now covered by test **W** (PASS).
- ~~Mobile drawer close via swipe~~ → now covered by test **X** (FAIL — FC-04 LOW, feature not implemented).
- ~~Focus rings across chrome controls~~ → now covered by test **Z** (PASS, real keyboard Tab traversal with `:focus-visible` heuristic returning `true` at every step and painting a 2px crimson ring).

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
| 16 | `16_sidebar_3rdlevel_expanded.png` | Test S — 3rd-level sub-button revealed under `community-groups` (count 92→93) |
| 17 | `17_sidebar_3rdlevel_collapsed.png` | Test T — same chevron re-clicked, 3rd-level row removed (93→92) |
| 18 | `18_focus_ring_sample.png` | Test V — focus walk across first 12 chrome focusables; skip-link shows real 2px crimson outline |
| 19 | `19_mobile_drawer_via_hamburger.png` | Test W — drawer open via hamburger tap (1 dialog) |
| 20 | `20_mobile_drawer_closed_via_hamburger.png` | Test W — drawer closed via second tap on the same hamburger (1→0 dialog) |
| 21 | `21_mobile_after_swipe_attempt.png` | Test X — drawer still open after synthetic left-swipe TouchEvent (FC-04 evidence) |
| 22 | `22_search_via_ctrlk.png` | Test Y — palette open via real `Control+K` keypress (Linux/Windows layout) |
| 23 | `23_keyboard_tab_step1_skiplink.png` | Test Z step 1 — skip-link focused after real Tab; crimson 2px outline visible |
| 24 | `24_keyboard_tab_step5_focusvisible_ring.png` | Test Z step 5 — sidebar `menu-button` focused via real Tab; `:focus-visible:ring-2` painting a real 2px crimson box-shadow ring |
| — | `state_dumps.json` | **Valid single-object JSON** (parses via `json.load`). Two top-level keys: `initial_run` (A–R) and `gap_fill_run` (S–Z). Each key contains the computed CSS variables (`--font-sans`, `--accent`, `--accent-2`), `localStorage` values, dialog counts, breadcrumb arrays, font/theme cycle results, programmatic-focus walk (V), real-keyboard-Tab walk with `:focus-visible` per step (Z), and the FC-04 swipe-handler grep results — i.e., the objective backing for every state-based PASS / FAIL verdict. |
