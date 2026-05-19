# DS Migration Phase 4 — REMEDIATION PLAN

**Inputs (locked, do not relitigate)**
- Target contract: `_validation/phase-1/DS_SPEC.md` — **Option A (Terminal-only)**, default accent **Matrix `#00ff88`**.
- Surface inventory: `_validation/phase-1/SITE_MAP.md` — 16 public routes + 14 admin tabs × {375 / 768 / 1280 / 1536} × dark.
- Backlog: `_validation/phase-3/DELTA_CATALOG.md` — 93 deltas (P0=7, P1=45, P2=29, P3=12) + 14 INFO + 9 DS GAPs (GAP-1…GAP-9).
- Evidence baseline: `_validation/phase-2/<slug>/<vp>-dark-<auth>-<state>.{png,dom.html,axe.json}`.

**Severity vocabulary.** This plan uses the Phase-3 canonical labels (`Critical (P0) | High (P1) | Medium (P2) | Low (P3) | INFO | GAP`). No re-mapping.

**Scope.** Plan only. No production code in this phase. No Phase-5 evidence capture in this phase. Phase-5 will create `client/src/lib/design-system.ts` + `client/src/styles/design-system.css` and edit the files named in DS_SPEC §10.

**Out of scope** (carried from DS_SPEC §9 / DELTA_CATALOG §8): light mode (CC-10 collapses to dark), Option-B systems (Editorial / Geist / Brutalist / Swiss), the `awesome-list-site-ds/` demo files.

**Reading order.** §0 conventions → §1–§6 work packages WP-1…WP-6 (each with its own §X.G "Gate" subsection) → §7 Tree-of-Thought decisions → §8 Phase-5 evidence taxonomy → §9 Gate-4 decision block.

---

## 0 · Conventions

### 0.1 Evidence path schema (forward reference to Phase 5)

Every acceptance criterion in §1–§6 cites a concrete path under `_validation/phase-5/`. Phase 5 will produce these artifacts; this plan defines the contract.

```
_validation/phase-5/
├── <slug>/                           # one dir per Phase-2 slug, plus new
│   └── <vp>-dark-<auth>-<state>.{png,dom.html,axe.json,console.json,network.json}
├── tokens/
│   ├── computed-styles.<slug>.<vp>.json   # window.getComputedStyle dumps of :root
│   └── data-attrs.<slug>.<vp>.json        # html[data-system], html[data-accent]
├── motion/
│   └── reduced-motion.<slug>.<vp>.png     # captured with prefers-reduced-motion: reduce
├── focus/
│   └── focus-ring.<slug>.<focus-target>.png
├── overlays/
│   ├── modal.<route>.<vp>.{png,dom.html}
│   ├── dropdown.<route>.<vp>.{png,dom.html}
│   ├── drawer.<route>.<vp>.{png,dom.html}     # mobile drawer at 375
│   ├── toast.<route>.<vp>.{png,dom.html}
│   └── search-palette.<route>.<vp>.{png,dom.html}
├── states/
│   ├── empty.<slug>.<vp>.{png,dom.html}        # backfills Phase-2 gap
│   └── loading.<slug>.<vp>.{png,dom.html}      # backfills Phase-2 gap
└── _results.jsonl                              # one row per captured artifact
```

**Viewport set:** `375`, `768`, `1280`, `1536`. Mobile axis is `375`, not `400` (Phase-2 reality — see DELTA_CATALOG §0.0 and CC-13). Phase-1's `400` label is treated as a documentation rename, handled in WP-1.

### 0.2 Validation-command schema

Each gate cites runnable commands. Two families:

1. **`testing-skill scenario`** — Playwright scenarios named `phase5-WP{n}-{slug}-{check}.spec.ts` invoked via the `.local/skills/testing` `runTest` callback. Pass condition is explicit and observable from the rendered DOM / screenshot diff / axe report.
2. **`shell command`** — for token-layer asserts (`rg`, `jq` over the computed-styles JSON dumps, axe JSON greps). Pass condition is exit-code 0 + the asserted substring/value present.

No "manual visual check" gates. Every gate is mechanically verifiable.

### 0.3 Rollback primitive

Phase 5 will land each work package as one git commit, named `phase5-WP{n}-{short-slug}`. Rollback at any gate = `git revert <sha>` of that commit. Where a WP edits a file already on `main` (vs adding new files), the rollback strategy line of that WP names the edited file and the diff hunks that need un-reverting.

### 0.4 Delta-ID ownership rule + ledger (strict one-owner partition)

**Ownership rule.** Each catalog row has **exactly one owning WP** — the WP whose gate (G4.1…G4.6) closes the row and is the unique place evidence for that row is captured. Predecessor WPs may *enable* the close (e.g., WP-1 creates the `<main>` slot that WP-4/WP-5 fill with `<h1>` content), but only the owning WP's gate is the row's verification point. The ledger below is the binding partition; any inline reference to a row in a later WP's body is non-authoritative shorthand for "consumes the artifact this row's owner produced."

| Row | Owner | Why this WP closes the row |
|---|---|---|
| CC-01 (token: bg) | WP-1 | Token written in `design-system.css`; verified at G4.1-a. |
| CC-02 (token: accent) | WP-1 | Same. |
| CC-03 (token: font) | WP-1 | Same + IBM Plex Mono link in `index.html`. |
| CC-04 (radius = 0) | WP-1 | `--radius: 0`; G4.1-a + G4.1-f sweep. |
| CC-05 (motion tokens) | WP-1 | G4.1-e reduced-motion. |
| CC-06 (`:active translateY`) | WP-1 | Token + utility live in DS CSS. |
| CC-07 (atmosphere overlay) | WP-1 | Added to DS CSS. |
| CC-08 (localStorage persistence) | WP-1 | Applier + boot script; G4.1-c reload assert. |
| CC-09 (`applyDesignSystem`) | WP-1 | G4.1-c swap assert. |
| CC-10 (dark-only collapse) | WP-1 | `darkMode` removed from `tailwind.config.ts`; G4.1-a. |
| CC-11 (reduced-motion plumbing) | WP-1 | `.no-anim` rule + `prefers-reduced-motion` media query in DS CSS; G4.1-e. WP-6 only *audits coverage*, does not own. |
| CC-12 (icon stroke 1.5) | WP-1 | `LucideProps.defaultProps.strokeWidth=1.5` set in `main.tsx`; G4.1 verifies via spot grep. WP-6 only audits per-instance overrides. |
| CC-13 (breakpoint 375 vs 480) | WP-1 | `xs: 375px`; G4.1-a. |
| CC-14 (single `<main>` + `<h1>`) | **WP-1** for the structural `<main>` landmark (G4.1-d kills `landmark-one-main` globally); **WP-4** for per-public-page `<h1>` content (G4.4-a); **WP-5** for per-admin-tab `<h1>` content (G4.5-a). The row is intrinsically three obligations from a single catalog cell — the partition assigns one obligation per WP, never the same obligation to two WPs. |
| CC-15 (eyebrow / kbd) | WP-1 | Tokens; INFO. |
| CC-16 (container 1280 / 48 gutter) | WP-1 | `MainLayout.tsx` edit; AC-1.6. |
| CC-17 (skip-link) | WP-1 | First focusable in `MainLayout.tsx`. |
| CC-18 (disabled state) | WP-1 | `[aria-disabled]` utility in DS CSS; AC-1.8. |
| GAP-1 (status colors) | WP-2 | Tokens + `.chip.ok/warn/err` molecule. |
| GAP-2 (`.progress`) | WP-2 | New molecule. |
| GAP-3 (`.diff`) | WP-2 | New molecule (consumed by WP-5 admin-edits). |
| GAP-4 (`.menu`) | WP-2 | New molecule (consumed by WP-5 admin-resources). |
| GAP-5 (`.toolbar`) | WP-2 | New molecule. |
| GAP-6 (`.log`) | WP-2 | New molecule. |
| GAP-7 (`.field-error`) | WP-2 | New molecule (consumed by WP-4 `/submit`). |
| GAP-8 (OAuth `.btn.secondary`) | WP-4 | `/login`-local. |
| GAP-9 (stroke-width default) | WP-2 | Set in `main.tsx` (WP-2 edit). |
| §4.1 row 1 (Home `<h1>`) | WP-4 | Page content. |
| §4.1 row 2 (Card→`.card`) | WP-2 | Primitive re-skin; consumed by WP-3 composition. |
| §4.1 row 3 (Badge→`.chip`) | WP-2 | Primitive. |
| §4.1 row 4 (CTA→`.btn.primary`) | WP-4 | Page content. |
| §4.1 row 5 | §6 INFO. |
| §4.1 row 6 (loading status semantics) | WP-2 | `<Skeleton>` wrapped in `<output role=status>`; WP-3 only consumes. |
| §4.1 row 7 (empty state) | WP-2 | `.empty-state` molecule; WP-3 consumes. |
| §4.1 row 8 (error fallback) | WP-2 | `.alert.error` skin; WP-3 consumes. |
| §4.2 row 1 (filter chips) | WP-2 | `.chip` primitive. |
| §4.2 row 2 (cards) | WP-2 | `.card` primitive. |
| §4.2 row 3 (view-toggle) | WP-2 | `.tabs.compact` (ToT-F). |
| §4.2 row 4 (error fallback) | WP-2 | `.empty-state`. |
| §4.2 row 5 | §6 INFO. |
| §4.3 row 1, §4.3 row 2, §4.4 row 1 | WP-2 | Inherit §4.2 primitives; row closes when primitive lands. |
| §4.3 row 3 / §4.4 row 2,3 | §6 INFO. |
| §4.5 row 1 (OG-image radius) | WP-4 | `ResourceDetail.tsx` page edit. |
| §4.5 row 2 (focus-visible) | WP-2 | `button.tsx` re-skin; WP-6 audit-only. |
| §4.5 row 3 (tag chips) | WP-2 | `.chip` primitive. |
| §4.5 row 4 (modal) | WP-2 | `dialog.tsx` re-skin. |
| §4.5 row 5 (error fallback) | WP-2 | `.empty-state`. |
| §4.6 row 1, §4.6 row 3 | §6 INFO. |
| §4.6 row 2 (`<main>`+`<h1>`) | WP-4 | Informational re-statement of CC-14 for the `/about` route; CC-14 itself owns the landmark obligation (in WP-1) and the per-public-page `<h1>` obligation (in WP-4). This row is closed when the WP-4 half of CC-14 is closed at G4.4-a; not separately owner-bearing. |
| §4.6 row 4 (fields) | WP-2 | `.field`. |
| §4.7 row 1 | §6 INFO. |
| §4.7 row 2 | WP-4 | Same pattern as §4.6 row 2 — informational re-statement of the CC-14 per-public-page `<h1>` obligation for `/advanced`; closed at G4.4-a, not separately owner-bearing. |
| §4.7 row 3 (cards) | WP-2 | `.card`. |
| §4.7 row 4 (empty) | WP-2 | `.empty-state`. |
| §4.8 row 1 (Input) | WP-2 | `.field`. |
| §4.8 row 2 (Textarea) | WP-2 | `.field` textarea variant. |
| §4.8 row 3 (Submit button) | WP-4 | Page content. |
| §4.8 row 4 (`<FormMessage>`) | WP-2 | GAP-7 `.field-error`. |
| §4.9 row 1 (Journey card) | WP-2 | `.card`. |
| §4.9 row 2 | §6 INFO. |
| §4.10 row 1 (Progress) | WP-2 | GAP-2 `.progress`. |
| §4.10 row 2 (error fallback) | WP-2 | `.empty-state`. |
| §4.10 row 3 | §6 INFO. |
| §4.11 row 1 (filter chips) | WP-2 | `.chip`. |
| §4.11 row 2 (Slider) | WP-2 | `slider.tsx` re-skin. |
| §4.11 row 3 | §6 INFO. |
| §4.12 row 1 (system picker → `applyDesignSystem`) | **WP-1** (re-assigned from WP-4 to keep all 7 P0 rows in WP-1, satisfying DELTA_CATALOG §8 "all P0 before any P1 visual work"). `ThemeSettings.tsx` edit moved into WP-1 file-touch list. |
| §4.12 row 2 (accent dot square) | WP-2 | Dot atom. |
| §4.12 row 3 | §6 INFO. |
| §4.13 row 1 (Login form) | WP-2 | `.field` / `.btn`. |
| §4.13 row 2 (OAuth) | WP-4 | GAP-8 application. |
| §4.13 row 3 | §6 INFO. |
| §4.14 row 1 (About prose) | WP-4 | Type-scale utilities applied. |
| §4.14 row 2 | §6 INFO. |
| §4.15 row 1 (admin unauth gate) | WP-4 | `.alert.warn` adoption on `AdminDashboard.tsx`. |
| §4.15 row 2 (admin shell `<h1>`) | WP-4 | Token swap. |
| §4.15 row 3 (TabsList) | WP-2 | `tabs.tsx` re-skin. |
| §4.15 row 4 (Stat card) | WP-2 | `.card.stat` molecule. |
| §4.15 row 5 (Stat number) | WP-4 | Page typography. |
| §4.15 row 6 (Loading) | WP-2 | `.skeleton` + `role=status`. |
| §4.15 row 7 (Error) | WP-2 | `.alert.error`. |
| §4.16 row 1 (NotFound) | WP-2 | `.empty-state`. |
| §4.16 row 2 | §6 INFO. |
| §4.17 row 1 (sidebar shell) | WP-2 | `sidebar.tsx` re-skin (ToT-A). WP-3 only *consumes*. |
| §4.17 row 2 (logo tile) | WP-3 | `AppSidebar.tsx` composition tweak. |
| §4.17 row 3 (nav active) | WP-2 | Selector lives in DS CSS via re-skinned primitive. |
| §4.17 row 4 (badge) | WP-2 | `.chip`. |
| §4.17 row 5,6 | §6 INFO. |
| §4.17 row 7 (mobile drawer) | WP-2 | `.mobile-drawer`/`.mobile-overlay` in re-skinned `sidebar.tsx`. |
| §4.18 row 1 (header shell) | WP-3 | `AppHeader.tsx` composition. |
| §4.18 row 2 (search trigger) | WP-3 | `AppHeader.tsx` re-template. |
| §4.18 row 3 (accent dot) | WP-3 | Same file. |
| §4.18 row 4 (breadcrumb) | WP-2 | `breadcrumb.tsx` re-skin. |
| §4.19 | §6 INFO. |
| §5.1 rows 1–3 | WP-5 | Tab body. |
| §5.2 rows 1–2 | WP-5 | Tab body (GAP-3 application). |
| §5.3 rows 1–5 | WP-5 | Tab body. |
| §5.4 rows 1–3 | WP-5 | Tab body (`.table` application). |
| §5.5 rows 1–3 | WP-5 | Tab body. |
| §5.6 rows 1–3 | WP-5 | Tab body. |
| §5.7 rows 1–4 | WP-5 | Tab body. |
| §5.8 rows 1–4 | WP-5 | Tab body. |
| §5.9 rows 1–3 | WP-5 | Tab body. |
| §5.10 rows 1–3 | WP-5 | Tab body. |
| §5.11 rows 1–2 | WP-5 | Tab body. |
| §5.12 rows 1–3 | WP-5 | Tab body. |
| §5.13 rows 1–3 | WP-5 | Tab body. |
| §5.14 rows 1–3 | WP-5 | Tab body. |
| **Polish-only audits (no catalog row of their own — derived obligations):** reduced-motion sweep beyond CC-11, focus-visible uniformity audit beyond §4.5 row 2, ARIA tablist roving audit, color-alone audit, RTL audit, per-instance stroke-width sweep. | WP-6 | These are not catalog rows; they are global re-attestations. Recorded in §6.4. |

**Audit attestation.** Every row above appears once; no row is split between two *primary* owners except CC-14, which is structurally three obligations (landmark, public-`<h1>`, admin-`<h1>`) explicitly assigned one-each to WP-1, WP-4, WP-5 with non-overlapping verification.

§9 (Gate 4) re-attests by walking the catalog row-list and confirming each maps to exactly one owner cell here.

---

## 1 · WP-1 — Foundations *(must land first)*

### 1.1 Scope

Establish the DS token surface, font, radius collapse, motion tokens, boot script, applier, dark-mode collapse, breakpoint rename, container/layout shell, atmosphere layer, **and** wire the `/settings/theme` picker to `applyDesignSystem` (§4.12 row 1 P0, pulled into WP-1 so all seven P0 rows land before any P1 visual work — satisfies DELTA_CATALOG §8). **No component-class skinning yet** — those land in WP-2. This is the substrate every later WP depends on.

### 1.2 Files touched

| File | Action | Why |
|---|---|---|
| `client/src/styles/design-system.css` | **Create** | DS_SPEC §10 — all 35 tokens for Terminal, accent mix scale, `.no-anim` media query, `[disabled]/[aria-disabled]/.is-disabled` utility (CC-18), atmosphere overlay, `.skip-link`. |
| `client/src/lib/design-system.ts` | **Create** | DS_SPEC §10 — port of `awesome-list-site-ds/design-systems.jsx` with §4.1 TS types; exports `DESIGN_SYSTEMS`, `ACCENTS`, `SYSTEM_DEFAULT_ACCENT`, `applyDesignSystem`; tracks `root.__appliedKeys`; side-effect-free import. |
| `client/index.html` | **Edit** | Inline boot script in `<head>` (DS_SPEC §6.1) reading `localStorage` `ds-system` / `ds-accent` → sets `documentElement.dataset.system/accent` before module scripts. Add IBM Plex Mono `<link>`; remove unused Plex Sans link. |
| `client/src/main.tsx` | **Edit** | `import "./styles/design-system.css"` + `import "./lib/design-system"` (side-effect-free; applier exposed lazily). |
| `client/src/index.css` | **Edit** | Delete the OKLCH `:root` + `.dark` blocks; keep Tailwind layers; ensure `--radius` derived ladder all maps to `0`; drop `font-family: var(--font-sans)` override at line 136. |
| `tailwind.config.ts` | **Edit** | Remove `darkMode: ["class"]`; change `xs: '480px'` → `xs: '375px'`; alias shadcn color keys (`background`, `card`, `border`, `muted`, `primary`) to DS tokens via `var(--*)` so existing ~80 `bg-card` / `border-input` callsites compile against DS. |
| `client/src/hooks/use-theme.ts` | **Edit** | No-op when `system === 'terminal'` (Option A locks to Terminal). |
| `client/src/components/layout/new/MainLayout.tsx` | **Edit** | Wrap `{children}` in `<main id="main">…</main>` (CC-14 primitive half) + `max-w-[1280px] mx-auto px-12 py-8` (CC-16). Add `.skip-link` as first focusable element. |
| `client/src/pages/ThemeSettings.tsx` | **Edit** | Replace `useTheme` picker action with direct `applyDesignSystem(systemId, accentId)` call (§4.12 row 1, P0). Under Option A the picker collapses to a single Terminal row showing the 10 accents; clicking an accent updates `--accent` live and persists `ds-accent` to `localStorage`. No system column rendered. |

### 1.3 Delta-row IDs addressed

**Critical (P0):** CC-01, CC-02, CC-03, CC-04, CC-08, CC-09, **§4.12 row 1** *(pulled from WP-4 — see §0.4)*.
**High (P1):** CC-05, CC-06, CC-10, CC-11, CC-14 *(landmark half only; per-page `<h1>` content delegated to WP-4 / WP-5)*, CC-16.
**Medium (P2):** CC-07, CC-13, CC-18.
**Low (P3):** CC-12 *(stroke-width default; per-instance audit delegated to WP-6)*.
**INFO recorded:** CC-15, CC-17.

### 1.4 Acceptance criteria (observable, evidence-pinned)

| # | Outcome (user-facing) | Evidence artifact |
|---|---|---|
| AC-1.1 | First paint of `/` shows pure-black `#000` background, white `#fff` ink, IBM Plex Mono everywhere, zero rounded corners on any element. No FOUT between pre- and post-React paint. | `_validation/phase-5/home/1280-dark-unauth-populated.png` + `_validation/phase-5/tokens/computed-styles.home.1280.json` shows `--bg: #000`, `--font-sans` resolves to IBM Plex Mono, `--radius: 0`. |
| AC-1.2 | `html` element carries `data-system="terminal"` and `data-accent="matrix"` on every route before any React component mounts. | `_validation/phase-5/tokens/data-attrs.home.1280.json` shows both attributes; capture happens via `document.documentElement.outerHTML.slice(0,300)` at the boot-script breakpoint. |
| AC-1.3 | Calling `window.applyDesignSystem('terminal','cyan')` from devtools swaps `--accent` from `#00ff88` to `#5eddf2` everywhere on screen, without reload, and persists to `localStorage['ds-accent']='cyan'`; a subsequent reload retains cyan. | `_validation/phase-5/tokens/computed-styles.home.1280.cyan.json` shows `--accent: #5eddf2`; testing-skill scenario `phase5-WP1-applier-accent-swap` asserts swap + reload retention. |
| AC-1.4 | Every page renders exactly one `<main id="main">` landmark and the skip-link is the first Tab-stop. axe `landmark-one-main` violations drop to 0 across the 16 axe artifacts that previously failed (per CC-14 evidence list). | `_validation/phase-5/<slug>/1280-dark-<auth>-populated.axe.json` for each of the 14 admin tabs + `/profile` + `/bookmarks` shows zero `landmark-one-main` violations. |
| AC-1.5 | With `prefers-reduced-motion: reduce`, all CSS transitions and Radix `animate-in/out` animations are suppressed; skeleton shimmer is static; live-dot does not pulse. | `_validation/phase-5/motion/reduced-motion.admin-enrichment.1280.png` shows static dot; computed `animation-duration` on `.skeleton` is `0.01ms`. |
| AC-1.6 | Content max-width is 1280 px; gutters are 48 px desktop. `<main>` width measured at 1280 vp = `1184px` content (1280 - 2×48). | DOM measurement in `_validation/phase-5/home/1280-dark-unauth-populated.dom.html`: `<main>` style includes `max-width:1280px;padding:32px 48px`. |
| AC-1.7 | Tailwind `xs:` breakpoint fires at 375 px (not 480). | `_validation/phase-5/home/375-dark-unauth-populated.dom.html` shows `xs:`-prefixed classes active; computed style of an `xs:hidden` element confirms `display:none`. |
| AC-1.8 | Disabled buttons + `[aria-disabled="true"]` controls render at opacity .5 with `cursor: not-allowed`; this includes admin bulk-action buttons when zero rows selected and `/submit`'s submit button while form is invalid. | `_validation/phase-5/admin-resources/1280-dark-admin-populated.dom.html` shows `[aria-disabled="true"]` on bulk buttons; computed style asserts `cursor: not-allowed`. |
| AC-1.9 *(§4.12 row 1 P0)* | `/settings/theme` picker click on any of the 10 accent swatches calls `applyDesignSystem('terminal', <accent>)`, swaps `--accent` live without reload, persists `ds-accent` to `localStorage`; subsequent reload retains the accent. Picker shows only the Terminal system (no system column) per Option A. | `_validation/phase-5/settings-theme/1280-dark-unauth-populated.{png,dom.html}` shows single-system picker; `_validation/phase-5/tokens/computed-styles.settings-theme.1280.<accent>.json` shows the swapped `--accent` for each of the 10 accents; testing-skill scenario `phase5-WP1-theme-picker` asserts swap + reload retention. |

### 1.5 Validation gate G4.1

Run **after** WP-1 commit lands, **before** WP-2 begins.

| # | Command | Pass condition |
|---|---|---|
| G4.1-a | testing-skill scenario `phase5-WP1-tokens` — visits `/`, dumps `getComputedStyle(:root)` to JSON. | JSON contains `--bg:#000`, `--text:#fff`, `--radius:0px`, `--accent:#00ff88`, `--font-sans` matches `/IBM Plex Mono/`. |
| G4.1-b | testing-skill scenario `phase5-WP1-boot-no-fout` — loads `/` with throttled CPU; records 5 screenshots at 50 ms intervals from navigation start. | Frame 0 (pre-React paint) already shows black bg + mono font. No frame shows white-flash or serif fallback. |
| G4.1-c | testing-skill scenario `phase5-WP1-applier-accent-swap` — calls `applyDesignSystem('terminal','cyan')`, asserts `--accent`, reloads, asserts persistence. | Both asserts pass. |
| G4.1-d | `axe-core` re-run on every route — assert `landmark-one-main` violations = 0 globally. | `jq '[.violations[]?|select(.id=="landmark-one-main")]|length' _validation/phase-5/**/*.axe.json` returns `0` on every file. |
| G4.1-e | testing-skill scenario `phase5-WP1-reduced-motion` — sets emulated `prefers-reduced-motion: reduce`, navigates `/admin#enrichment`, captures live-dot. | Computed `animation-name` on `.live-dot` is `none`. |
| G4.1-f | `rg "rounded-(?:sm|md|lg|xl|2xl|3xl|full)" client/src --type tsx --type css` | All hits either are inside `client/src/components/ui/avatar.tsx` (DS exception, INFO) or are inside files queued for WP-2 / WP-3 (manifest match required). Any other hit blocks the gate. |
| G4.1-g | testing-skill scenario `phase5-WP1-theme-picker` — visits `/settings/theme`, clicks each of the 10 accent swatches in turn, asserts `--accent` swaps live and `localStorage['ds-accent']` is set; reloads after the last selection and asserts persistence. Also asserts the picker DOM renders **zero** system options other than Terminal. | All 10 accent swap asserts pass; reload retention passes; system-column count = 0. |

### 1.6 Rollback

`git revert phase5-WP1-foundations`. Because WP-1 only **adds** `design-system.css` + `design-system.ts` and **edits** `index.html`, `main.tsx`, `index.css`, `tailwind.config.ts`, `use-theme.ts`, `MainLayout.tsx`, a revert restores the pre-WP-1 token surface intact. No data migrations, no DB changes. Verify revert with G4.1-a (must fail post-revert — confirms revert undid the changes).

---

## 2 · WP-2 — Primitives

### 2.1 Scope

Re-skin the shadcn primitive atoms so they emit DS class semantics and consume DS tokens introduced in WP-1. Add the DS molecules absent from shadcn (`.eyebrow`, `.kbd`, `.dot`, `.live-dot`, `.empty-state`, `.alert`, `.skeleton`-with-`role=status`) and the 9 DS GAPs. **No page-level edits** — every primitive change is scoped to `client/src/components/ui/*` + `client/src/styles/design-system.css`. WP-2 *supports* CC-14 by shipping the `.t-h1` typography utility that WP-4 / WP-5 consume when they place the per-page `<h1>` content; ownership of CC-14 itself stays with WP-1 / WP-4 / WP-5 per §0.4.

### 2.2 Files touched

| File | Action |
|---|---|
| `client/src/styles/design-system.css` | **Edit** — append `.btn[.primary/.ghost/.danger/.icon/.secondary]`, `.card[.row/.compact/.stat/.hoverable]`, `.chip[.ok/.warn/.err/.muted/.live]`, `.field/.input/.select/.textarea/.field-error`, `.tabs/.tab.active/.tabs.compact`, `.table/.table.mono`, `.eyebrow`, `.kbd`, `.dot/.live-dot`, `.modal/.modal-backdrop/.modal.confirm`, `.mobile-drawer/.mobile-overlay`, `.empty-state`, `.alert/.alert.error/.alert.warn`, `.skeleton[role=status]`, `.progress` (GAP-2), `.diff` (GAP-3), `.menu/.menu-item` (GAP-4), `.toolbar` (GAP-5), `.log` (GAP-6), `.field-error` (GAP-7). |
| `client/src/components/ui/button.tsx` | **Edit** — emit `.btn` + variant modifier; honour `:active { translateY(1px) }`; accent-mix focus-visible ring per DS_SPEC §7 + accessibility §5.1 of catalog (§4.5 row 2). |
| `client/src/components/ui/card.tsx` | **Edit** — emit `.card`; drop `rounded-lg shadow-sm bg-card`; accept `.row`/`.compact`/`.stat`/`.hoverable` via prop. |
| `client/src/components/ui/badge.tsx` | **Edit** — emit `.chip` + variant→{ok/warn/err/muted/accent}; drop `rounded-full`. |
| `client/src/components/ui/input.tsx`, `textarea.tsx`, `select.tsx` | **Edit** — emit `.field .input` / `.field .textarea` / `.field .select`; 44 px min-height; focus uses accent-mix border (not Tailwind `ring`). |
| `client/src/components/ui/tabs.tsx` | **Edit** — emit `.tabs` shell + `.tab.active` underline. Add `.tabs.compact` variant for `view-mode-toggle`. |
| `client/src/components/ui/table.tsx` | **Edit** — emit `.table`; 11 px uppercase mono header, 14 px row, hairline rows, hover bg = `--surface`. |
| `client/src/components/ui/dialog.tsx`, `alert-dialog.tsx` | **Edit** — emit `.modal-backdrop` + `.modal` (+ `.modal.confirm` on alert-dialog); square corners; focus trap retained from Radix; `aria-modal=true` retained. |
| `client/src/components/ui/sidebar.tsx` | **Edit** — emit `.sidebar` + `.accordion-trigger` + `.accordion-content`; mobile sheet emits `.mobile-drawer` + `.mobile-overlay`. (See ToT in §7.1.) |
| `client/src/components/ui/dropdown-menu.tsx` | **Edit** — emit `.menu` + `.menu-item` (GAP-4). |
| `client/src/components/ui/breadcrumb.tsx` | **Edit** — emit `.crumbs`; replace `/` separator with `›`. |
| `client/src/components/ui/toast.tsx` | **Edit** — emit `.alert.error` / `.alert.warn` skins; drop `shadow-lg`. |
| `client/src/components/ui/progress.tsx` | **Edit** — emit `.progress`; square; track `--surface-2`; fill `--accent` (GAP-2). |
| `client/src/components/ui/slider.tsx` | **Edit** — square 16×16 thumb; 1-px `--line` border; accent track fill. |
| `client/src/components/ui/switch.tsx` | **Edit** — square switch; accent fill when checked. |
| `client/src/components/ui/skeleton.tsx` | **Edit** — wrap in `<output role="status" aria-busy="true">`; reuse `client/src/styles/skeleton-animations.css`. |
| `client/src/components/ui/empty-state.tsx` | **Create** — DS `.empty-state` molecule (icon + heading + body + optional `.btn.secondary` action). |
| `client/src/components/ui/alert.tsx` | **Edit** — DS `.alert[.error/.warn]` with `role="alert"` / `aria-live`. |
| `client/src/components/ui/eyebrow.tsx`, `kbd.tsx`, `dot.tsx` | **Create** — DS atoms; `<Dot pulse>` → `.live-dot`. |
| `client/src/main.tsx` | **Edit** — set `LucideProps.defaultProps.strokeWidth = 1.5` once (GAP-9). |

### 2.3 Delta-row IDs addressed

**High (P1):** all `11 Variants` rows from §4 / §5 that resolve to a primitive re-skin (catalog rows that cite "§4.1 row 2" / "§4.8 row 1" / "§5.4 row 1" etc. — those upstream references are owned here). Specifically: §4.1 row 2/3, §4.2 row 1/2, §4.5 row 4, §4.8 row 1/2, §4.10 row 1, §4.11 row 2, §4.15 row 3, §4.17 row 1/3/7, §4.18 row 2, §5.4 row 1, §5.6 row 1, §5.7 row 4, §5.8 row 1, §5.13 row 2, §5.14 row 1, and the chip/badge cascade through admin tabs.
**Medium (P2):** §4.1 row 3 (chip cascade), §4.5 row 3/4, §4.8 row 4 (field-error / GAP-7), §4.17 row 4, §4.18 row 4, §5.3 row 2/5, §5.6 row 2, §5.8 row 2/4, §5.9 row 2, §5.10 row 2, §5.11 row 1, §5.12 row 1/2, §5.14 row 2.
**Low (P3):** §4.5 row 1, §4.12 row 2, §4.18 row 3, §5.5 row 2.
**GAPs:** GAP-1, GAP-2, GAP-3, GAP-4, GAP-5, GAP-6, GAP-7, GAP-9.

(See §7 for ambiguous-component ToT decisions on `sidebar.tsx`, `dropdown-menu.tsx`, `toast.tsx`, `table.tsx`.)

### 2.4 Acceptance criteria

| # | Outcome | Evidence artifact |
|---|---|---|
| AC-2.1 | A `<Button>` rendered anywhere shows the `.btn` class in DOM, a 36 / 44 px hit-target per variant, a `translateY(1px)` on active, and an accent-color 2 px focus-visible outline at 2 px offset. | `_validation/phase-5/focus/focus-ring.home.search-trigger.png` shows the accent outline; `_validation/phase-5/home/1280-dark-unauth-populated.dom.html` greps for `class=".*btn.*"`. |
| AC-2.2 | A `<Card>` renders square, 1-px `--line` border, `--surface` bg, 16/20 padding. No drop shadows anywhere. | DOM grep + computed style: `border-radius:0`, `box-shadow:none` (or 1-px hairline), `background-color: #0e0e0e` (≈ `--surface`). Captured at `_validation/phase-5/home/1280-dark-unauth-populated.dom.html`. |
| AC-2.3 | A `<Badge>` is square, mono caps, surface-2 fill; `variant="destructive"` resolves to `.chip.err` (GAP-1) and `variant="default"` on enrichment status resolves to `.chip.ok`. | `_validation/phase-5/admin-enrichment/1280-dark-admin-populated.dom.html` shows `class="chip ok"`; `_validation/phase-5/admin-github/1280-dark-admin-populated.dom.html` shows `.chip.err`/`.chip.warn`. |
| AC-2.4 | Inputs / textareas / selects all hit 44 px min-height, square corners, 1-px `--line` border idle; focus → border `color-mix(in oklab, var(--accent) 60%, var(--line))`. | `_validation/phase-5/submit/1280-dark-unauth-populated.dom.html` + focus capture `_validation/phase-5/focus/focus-ring.submit.url-field.png`. |
| AC-2.5 | A `<Dialog>` opens with `.modal-backdrop` (`rgba(0,0,0,.7)` + 4 px blur) + `.modal` square panel; Esc closes; Tab cycles inside; focus trap intact. | `_validation/phase-5/overlays/modal.resource-detail.1280.{png,dom.html}` + testing-skill scenario `phase5-WP2-modal-keyboard`. |
| AC-2.6 | A `<DropdownMenu>` (admin bulk-action) emits `.menu` + `.menu-item` (GAP-4), 36 px row, square. | `_validation/phase-5/overlays/dropdown.admin-resources.1280.{png,dom.html}`. |
| AC-2.7 | A `<Progress>` is a 4 px square bar (GAP-2): track `--surface-2`, fill `--accent`. | DOM grep on `_validation/phase-5/admin-enrichment/1280-dark-admin-populated.dom.html` + `_validation/phase-5/journey-detail/1280-dark-unauth-populated.dom.html` (re-captured non-error state). |
| AC-2.8 | `<Toast>` triggered on mutation renders `.alert.error` or `.alert.warn` skin with `aria-live="polite"`. | `_validation/phase-5/overlays/toast.admin-database.1280.{png,dom.html}`. |
| AC-2.9 | `<Skeleton>` is wrapped in `<output role="status" aria-busy="true">`; reduced-motion freezes shimmer. | `_validation/phase-5/states/loading.home.1280.dom.html` + `_validation/phase-5/motion/reduced-motion.home.1280.png`. |
| AC-2.10 | DS GAP molecules — `.field-error`, `.diff`, `.toolbar`, `.log`, `.empty-state`, `.alert` — each render at least once across the captured per-page artifacts. | `.field-error`: `_validation/phase-5/submit/1280-dark-unauth-error.dom.html`; `.diff`: `_validation/phase-5/admin-edits/1280-dark-admin-populated.dom.html`; `.toolbar`: `_validation/phase-5/admin-resources/1280-dark-admin-populated.dom.html`; `.log`: `_validation/phase-5/admin-github/1280-dark-admin-populated.dom.html`; `.empty-state`: `_validation/phase-5/states/empty.bookmarks.1280.dom.html`; `.alert`: `_validation/phase-5/overlays/toast.admin-database.1280.dom.html`. DOM grep on each path must find the class. |
| AC-2.11 | All lucide icons render at `stroke-width: 1.5` and constrain to 16 / 20 / 24 sizes (CC-12 / GAP-9). | DOM grep on `_validation/phase-5/home/1280-dark-unauth-populated.dom.html`: all `<svg>` show `stroke-width="1.5"`. |

### 2.5 Validation gate G4.2

| # | Command | Pass condition |
|---|---|---|
| G4.2-a | testing-skill scenario `phase5-WP2-primitives-classes` — visits 5 representative routes (`/`, `/submit`, `/category/web-dev`, `/admin#enrichment`, `/admin#resources`), greps captured DOM for required DS classes. | Every primitive in §2.2 appears with its DS class at least once. |
| G4.2-b | testing-skill scenario `phase5-WP2-modal-keyboard` — opens suggest-edit modal on `/resource/:id`; Tab cycles within modal; Esc closes; focus returns to trigger. | All three asserts pass. |
| G4.2-c | testing-skill scenario `phase5-WP2-disabled-states` — submits empty `/submit` form; opens `/admin#resources` with no rows selected. | Submit button has `aria-disabled="true"` + `cursor: not-allowed` computed style; bulk-action buttons same. |
| G4.2-d | `axe-core` re-run focused on modal / dropdown / toast routes — assert no new violations introduced. | Violations count ≤ pre-WP-2 baseline (and `landmark-one-main` still 0 from WP-1). |
| G4.2-e | `rg "rounded-(?:sm|md|lg|xl|2xl|3xl|full)" client/src/components/ui --type tsx --type css` | Only allowed hit is inside `client/src/components/ui/avatar.tsx` (DS exception). All other UI primitives are square. |
| G4.2-f | `rg "shadow-(?:sm|md|lg)" client/src/components/ui --type tsx` | Zero hits — shadows fully removed. |

### 2.6 Rollback

`git revert phase5-WP2-primitives`. WP-2 edits only `client/src/components/ui/*.tsx`, `client/src/main.tsx` (one line), and appends to `design-system.css` (additive). Revert restores shadcn primitive classes; WP-1 token surface remains intact. Verify revert via G4.2-a (must fail).

---

## 3 · WP-3 — Compositions

### 3.1 Scope

Apply WP-2 primitives to shared layout compositions: header (`AppHeader`), sidebar (`AppSidebar` content — its inner `.sidebar` semantics ride on `sidebar.tsx` from WP-2), footer (`MainLayout` footer slot), breadcrumbs in page chrome, search palette trigger / overlay, mobile drawer integration, list-card / list-row / compact-row presentations on the three category pages (`Category` / `Subcategory` / `SubSubcategory`), `ResourceCard` everywhere it's reused, form shells (`/submit`, `/login`, profile fields), and the empty / error / loading shells across all pages.

WP-3 *consumes* the WP-1 `<main>` landmark slot for shared chrome (header / sidebar / footer / breadcrumbs / search palette / mobile drawer) — i.e., it does not introduce a second landmark and does not place page `<h1>`s. CC-14 ownership remains with WP-1 (landmark) / WP-4 (public `<h1>`) / WP-5 (admin `<h1>`) per §0.4.

### 3.2 Files touched

| File | Action |
|---|---|
| `client/src/components/layout/new/AppHeader.tsx` | Drop `backdrop-blur`, replace `border-b` with `box-shadow: 0 1px 0 var(--line)`, retemplate search trigger as `.field.search` + `.kbd`, swap accent-dot to 16×16 square. |
| `client/src/components/layout/new/AppSidebar.tsx` | Adopt `.sidebar` / `.accordion-*` semantics surfaced by re-skinned `sidebar.tsx`; logo tile → `--accent` bg + `--accent-ink` fg, square; nav-item active = 2 px left accent rail + `--accent-mix-15` bg; badges → `.chip`. |
| `client/src/components/layout/new/MainLayout.tsx` | Adopt 1-px `--line` top border on footer (already structural; confirm token only). |
| `client/src/components/ui/view-mode-toggle.tsx` | Adopt `.tabs.compact`. |
| `client/src/components/ui/search-dialog.tsx` | Re-skin palette to `.modal` + `.field.search`; preserve `/` and ⌘K key bindings. |
| `client/src/components/ui/advanced-filter.tsx` | Filter chips → `.chip`. |
| `client/src/components/ui/skeleton.tsx` consumers (Home, Category, Bookmarks, Journeys, admin loading states) | Adopt the `<output role="status">` wrapper from WP-2. |
| `client/src/pages/Home.tsx` (composition only — page-specific deltas in WP-4) | Adopt `.empty-state` / `.alert.error` from WP-2 in loading/empty/error branches. |
| `client/src/components/ResourceCard.tsx` *(or equivalent — Category/Bookmarks reuse)* | Three view-mode renderings adopt `.card`, `.card.row`, `.card.compact`. |

### 3.3 Delta-row IDs addressed

**High (P1):** §4.17 row 1/3 (sidebar shell + active state — composition-level wiring), §4.18 row 1/2 (header shell + search trigger), §4.1 row 6 (loading status semantics), §4.2 row 2 (resource-card variants applied), §4.3 row 1/2, §4.4 row 1.
**Medium (P2):** §4.17 row 2/4/7, §4.18 row 4 (breadcrumbs), §4.11 row 1 (filter chips composition).
**Low (P3):** §4.18 row 3 (accent dot adoption).
**INFO:** §4.17 row 5/6, §4.19 (footer).

### 3.4 Acceptance criteria

| # | Outcome | Evidence artifact |
|---|---|---|
| AC-3.1 | Header is 56 px tall, no backdrop blur, 1-px `--line` bottom hairline (via box-shadow). Search trigger renders as a `.field.search` with a visible `.kbd ⌘K` glyph. | `_validation/phase-5/home/1280-dark-unauth-populated.{png,dom.html}`. |
| AC-3.2 | Sidebar logo tile is square, `--accent` bg, black ink. Active nav row shows a 2-px accent left rail and `--accent-mix-15` bg fill. | `_validation/phase-5/home/1280-dark-unauth-populated.dom.html` (computed style of `[data-active=true]`). |
| AC-3.3 | At 375 px viewport, sidebar collapses to mobile drawer; drawer slides in 280 ms, has 86 % width / 340 px max, locks body scroll, dismisses on overlay click and Esc. | `_validation/phase-5/overlays/drawer.home.375.{png,dom.html}` + testing-skill scenario `phase5-WP3-drawer-dismiss`. |
| AC-3.4 | Search palette opens on `/` and ⌘K, closes on Esc, shows `.modal` skin + `.field.search` input. | `_validation/phase-5/overlays/search-palette.home.1280.{png,dom.html}` + testing-skill scenario `phase5-WP3-search-keys`. |
| AC-3.5 | Category page in `compact` view shows `.card.compact` rows; in `list` view shows `.card.row`; in `grid` view shows `.card`. View-mode toggle is `.tabs.compact`. | `_validation/phase-5/category/1280-dark-unauth-populated.dom.html` captured in all three view modes (one DOM per mode named `*-populated.grid.dom.html` / `.list.dom.html` / `.compact.dom.html`). |
| AC-3.6 | Loading states across `/`, `/category/:slug`, `/bookmarks`, `/journeys` show `.skeleton` shimmer wrapped in `<output role="status" aria-busy="true">`. | `_validation/phase-5/states/loading.{home,category,bookmarks,journeys}.1280.dom.html`. |
| AC-3.7 | Empty states across `/bookmarks` (no bookmarks), `/journeys` (no enrolled), `/advanced` (no results), `/` (no resources) show `.empty-state` molecule. | `_validation/phase-5/states/empty.{bookmarks,journeys,advanced,home}.1280.{png,dom.html}`. |
| AC-3.8 | Error states across `/category/:slug`, `/subcategory/:slug`, `/sub-subcategory/:slug`, `/resource/:id`, `/journey/:id` show `.empty-state` + back-link (per DELTA §4.2 row 4) or `.alert.error`. | `_validation/phase-5/{category,subcategory,sub-subcategory,resource-detail,journey-detail}/1280-dark-unauth-error.{png,dom.html}`. |
| AC-3.9 | Breadcrumbs render with `›` separator (no `/`). | `_validation/phase-5/category/1280-dark-unauth-populated.dom.html` grep for `›`. |

### 3.5 Validation gate G4.3

| # | Command | Pass condition |
|---|---|---|
| G4.3-a | testing-skill scenario `phase5-WP3-drawer-dismiss` — 375 vp, opens drawer, clicks overlay, asserts close; reopens, presses Esc, asserts close. | Both close paths work. |
| G4.3-b | testing-skill scenario `phase5-WP3-search-keys` — focuses body, presses `/`, asserts palette open; presses Esc, asserts close; presses ⌘K (or Ctrl+K), asserts open. | All three asserts pass. |
| G4.3-c | testing-skill scenario `phase5-WP3-view-modes` — navigates `/category/web-dev`, toggles grid → list → compact, captures DOM for each. | Each capture contains the expected `.card[.row?.compact?]` class set. |
| G4.3-d | testing-skill scenario `phase5-WP3-states` — visits four empty-state routes + four loading routes (intercepted to delay), captures. | All `.empty-state` and `.skeleton` molecules render. |
| G4.3-e | `rg -l "backdrop-blur|supports-\[backdrop-filter\]" client/src` | Zero hits. |
| G4.3-f | `axe-core` violation count globally — total violations strictly ≤ post-WP-2 baseline. | Numeric assert via `jq`. |

### 3.6 Rollback

`git revert phase5-WP3-compositions`. WP-3 edits only the composition files listed in §3.2; no new directories. Reverts cleanly because WP-2 primitives still emit DS classes (compositions simply stop *consuming* them, falling back to default styles). Verify revert via G4.3-c (must fail — view-mode toggle reverts to old `<ToggleGroup>` look).

---

## 4 · WP-4 — Public pages (16 routes)

### 4.1 Scope

Apply per-page content edits to the 16 SITE_MAP routes (`/`, `/login`, `/category/:slug`, `/subcategory/:slug`, `/sub-subcategory/:slug`, `/resource/:id`, `/about`, `/advanced`, `/submit`, `/journeys`, `/journey/:id`, `/profile`, `/bookmarks`, `/admin` shell, `/settings/theme`, `*` 404). Each page gets its single `<h1>` (closing the WP-1 CC-14 contract for that page), DS-spec typography scale, DS `.empty-state` / `.alert.error` adoption where page-local, and the page-specific deltas not absorbed by WP-2 / WP-3.

`/settings/theme` picker wiring (§4.12 row 1) **is owned by WP-1** (see §0.4) and lands as part of the foundations commit; WP-4 only re-verifies it via the global AC-4.8 axe sweep on `/settings/theme`. No WP-4 work touches `ThemeSettings.tsx`.

### 4.2 Files touched

`client/src/pages/{Home,Login,Category,Subcategory,SubSubcategory,ResourceDetail,About,Advanced,SubmitResource,Journeys,JourneyDetail,Profile,Bookmarks,AdminDashboard,not-found}.tsx` — 15 files (`ThemeSettings.tsx` is owned by WP-1). Plus `client/src/components/admin/AdminStats.tsx` (stat-card composition on the `/admin` shell row 4/5).

### 4.3 Delta-row IDs addressed

**Critical (P0):** *(none — §4.12 row 1 reassigned to WP-1; all 7 P0 rows now land in WP-1, satisfying DELTA_CATALOG §8.)*
**High (P1):** §4.1 row 1, §4.10 row 1 (page-content adoption of WP-2 progress), §4.15 row 2/5, all CC-14 per-public-page `<h1>` content (the WP-4 half of CC-14).
**Medium (P2):** §4.1 row 3/4/7/8, §4.5 row 3/4, §4.6 row 4, §4.7 row 3, §4.8 row 3/4, §4.13 row 2, §4.14 row 1, §4.15 row 1/2/5/6/7, §4.16 row 1.
**Low (P3):** §4.5 row 1, §4.12 row 2.
**GAP:** GAP-8 (`/login` OAuth buttons).
**INFO recorded:** §4.1 row 5, §4.2 row 5, §4.4 row 3, §4.5 (matches DS rows), §4.6 row 1/3, §4.7 row 1, §4.9 row 2, §4.10 row 3, §4.11 row 3, §4.12 row 3, §4.13 row 3, §4.14 row 2, §4.16 row 2.

### 4.4 Acceptance criteria

| # | Outcome | Evidence artifact |
|---|---|---|
| AC-4.1 | Every public route renders exactly one `<h1>` whose computed style matches DS scale (`/` 40 px, `/about` 28 px h2 for subsections, etc.). | `_validation/phase-5/<slug>/1280-dark-<auth>-populated.dom.html` for each of the 16 slugs — `document.querySelectorAll('h1').length === 1`. |
| AC-4.2 | `/settings/theme` page renders the picker shipped by WP-1 cleanly inside the WP-1 chrome (single `<main>`, single `<h1>`, no layout regression). Picker DOM contains exactly one Terminal row with 10 accent swatches; clicking the Matrix swatch sets `--accent` back to `#00ff88`. *(Behaviour verified by WP-1 AC-1.9 + G4.1-g; WP-4 only verifies the page-chrome integration.)* | `_validation/phase-5/settings-theme/1280-dark-unauth-populated.{png,dom.html,axe.json}` + `_validation/phase-5/tokens/computed-styles.settings-theme.1280.matrix.json` shows `--accent: #00ff88`. |
| AC-4.3 | `/login` OAuth provider buttons render as `.btn.secondary` with 16 px brand SVG (GAP-8). | `_validation/phase-5/login/1280-dark-unauth-populated.dom.html`. |
| AC-4.4 | `/submit` form-validation errors render `.field-error` (GAP-7) below the offending field, wired via `aria-describedby`. | `_validation/phase-5/submit/1280-dark-unauth-populated.dom.html` (after intentional invalid submit) + testing-skill scenario `phase5-WP4-submit-error`. |
| AC-4.5 | `/admin` shell tabs render as DS `.tabs` (underline-on-active, no border box); stat cards render as `.card.stat` with `.eyebrow` label + tabular-nums accent number. | `_validation/phase-5/admin/1280-dark-admin-populated.dom.html` *(admin auth)*. |
| AC-4.6 | `/admin` unauth gate shows `.alert.warn` + `.btn.primary` to `/login` (not the legacy plain text). | `_validation/phase-5/admin/1280-dark-unauth-gate.{png,dom.html}`. |
| AC-4.7 | `*` 404 shows `.empty-state` + `.btn.secondary` back-link. | `_validation/phase-5/notfound/1280-dark-unauth-notfound.{png,dom.html}`. |
| AC-4.8 | `axe-core` on every public route at 1280 + 375 vp shows zero violations of `landmark-one-main`, `page-has-heading-one`, `color-contrast`. | `_validation/phase-5/<slug>/{1280,375}-dark-<auth>-populated.axe.json` — `jq` assert per file. |

### 4.5 Validation gate G4.4

| # | Command | Pass condition |
|---|---|---|
| G4.4-a | testing-skill scenario `phase5-WP4-h1-per-page` — visits all 16 routes (with seeded auth where needed), counts `<h1>`. | Every route returns exactly 1. |
| G4.4-b | testing-skill scenario `phase5-WP4-settings-chrome` — visits `/settings/theme`, asserts page renders inside one `<main>` + one `<h1>`, picker shows exactly one Terminal row with 10 accent swatches, no system column. *(Picker behaviour itself is verified by G4.1-g, not re-run here.)* | All asserts pass. |
| G4.4-c | testing-skill scenario `phase5-WP4-submit-error` — submits `/submit` with invalid URL, asserts `.field-error` rendered with matching `aria-describedby`. | Both asserts pass. |
| G4.4-d | `jq '[.violations[]?|select(.id|IN("landmark-one-main","page-has-heading-one","color-contrast"))]|length' _validation/phase-5/<all-public-slugs>/*.axe.json` | All zero. |
| G4.4-e | testing-skill scenario `phase5-WP4-admin-gate` — visits `/admin` unauth, captures DOM. | DOM contains `.alert.warn` + link to `/login`. |

### 4.6 Rollback

`git revert phase5-WP4-public-pages`. Page files are independent — partial revert per-page is supported by splitting WP-4 into 16 sub-commits if needed (Phase 5 implementation choice, not plan-mandated). After full revert, WP-1/2/3 surface still works; pages fall back to pre-WP-4 page-local markup. Verify revert via G4.4-a (most pages will fail h1=1 assert).

---

## 5 · WP-5 — Admin pages (14 tabs)

### 5.1 Scope

Apply DS skin + DS molecules to the 14 admin tab panels. CC-14 `<h1>` lands here for each tab. Tabs share the `.tabs` shell from WP-4 (AdminDashboard), so this WP is body-content only.

### 5.2 Files touched

`client/src/components/admin/{PendingResources,PendingEdits,BatchEnrichmentPanel,ResearcherTab,ExportTab,DatabaseTab,ResourceManager,CategoryManager,SubcategoryManager,SubSubcategoryManager,UsersTab,GitHubSyncPanel,LinkHealthDashboard,AuditTab,GenericCrudManager}.tsx` — 15 files (the 14 tab panels + the shared CRUD manager).

### 5.3 Delta-row IDs addressed

All rows under DELTA §5.1–§5.14 not already absorbed by WP-2 (primitive class) or WP-3 (composition). Includes content-side of CC-14 for every tab.

| Tab | Catalog rows owned |
|---|---|
| approvals (5.1) | row 1 (chip via WP-2), row 2 (`<h1>`), row 3 (bulk buttons applied) |
| edits (5.2) | row 1 (`.diff` GAP-3 applied), row 2 (`<h1>`) |
| enrichment (5.3) | row 1 (progress via WP-2), row 2 (live-dot via WP-2 applied), row 3 (`<h1>`), row 4 (reduced-motion → WP-6), row 5 (`<output role=status>`) |
| researcher (5.4) | row 1 (`.table` applied), row 2 (`<h1>`), row 3 (INFO) |
| export (5.5) | row 1 (`.card.stat` applied), row 2 (`:active translateY` via WP-2), row 3 (`<h1>`) |
| database (5.6) | row 1 (`.btn.danger` + confirm modal), row 2 (`.alert.error` toast skin via WP-2), row 3 (`<h1>`) |
| resources (5.7) | row 1 (`.toolbar` GAP-5 applied), row 2 (`.menu` GAP-4 applied), row 3 (`<h1>`), row 4 (`.table` applied) |
| categories (5.8) | row 1 (`.table` + `.field`), row 2 (`.modal.confirm`), row 3 (`<h1>`), row 4 (`.alert.error` toast) |
| subcategories (5.9) | rows 1–3 (same pattern) |
| subsubcategories (5.10) | rows 1–3 (same pattern) |
| users (5.11) | row 1 (`.chip` variants), row 2 (`<h1>`) |
| github (5.12) | row 1 (`.chip` status), row 2 (`.log` GAP-6), row 3 (`<h1>`) |
| linkhealth (5.13) | row 1 (recharts accent palette), row 2 (`.table` + `.chip.err`), row 3 (`<h1>`) |
| audit (5.14) | row 1 (`.table.mono`), row 2 (`.toolbar` GAP-5), row 3 (`<h1>`) |

### 5.4 Acceptance criteria

| # | Outcome | Evidence artifact |
|---|---|---|
| AC-5.1 | Each of the 14 admin tab panels renders exactly one `<h1>` (the tab title) under the single `<main>` from WP-1. | `_validation/phase-5/admin-<tab>/1280-dark-admin-populated.dom.html` × 14. |
| AC-5.2 | `admin#edits` diff view uses `.diff` (GAP-3) with `--accent-mix-15` insert rows and `--err`-mix delete rows. | `_validation/phase-5/admin-edits/1280-dark-admin-populated.{png,dom.html}`. |
| AC-5.3 | `admin#enrichment` progress bar is square, accent-filled; live-dot pulses (or doesn't under reduced motion); job state announces via `aria-busy`. | `_validation/phase-5/admin-enrichment/1280-dark-admin-populated.{png,dom.html}` + WP-6 reduced-motion capture. |
| AC-5.4 | `admin#resources` toolbar uses `.toolbar` (GAP-5) + `.menu` dropdown (GAP-4); table uses `.table`. | `_validation/phase-5/admin-resources/1280-dark-admin-populated.dom.html` + `_validation/phase-5/overlays/dropdown.admin-resources.1280.dom.html`. |
| AC-5.5 | `admin#github` sync log uses `.log` (GAP-6) — monospace, `--bg-2` bg, scroll. | `_validation/phase-5/admin-github/1280-dark-admin-populated.{png,dom.html}`. |
| AC-5.6 | `admin#linkhealth` chart fills use only `var(--accent)` + the four `--accent-mix-*` tints; broken-link table uses `.table` + `.chip.err`. | `_validation/phase-5/admin-linkhealth/1280-dark-admin-populated.{png,dom.html}` + DOM grep for `var(--accent`. |
| AC-5.7 | `axe-core` on each admin tab at 1280 vp returns zero `landmark-one-main` + zero `page-has-heading-one` violations. | `_validation/phase-5/admin-<tab>/1280-dark-admin-populated.axe.json` × 14. |
| AC-5.8 | Confirm-delete modal in CRUD tabs uses `.modal.confirm`, focus trap, Esc dismiss. | `_validation/phase-5/overlays/modal.admin-categories.1280.{png,dom.html}` + testing-skill scenario `phase5-WP5-confirm-keyboard`. |

### 5.5 Validation gate G4.5

| # | Command | Pass condition |
|---|---|---|
| G4.5-a | testing-skill scenario `phase5-WP5-admin-tabs-h1` — admin-authed sweep across all 14 hash tabs, counts `<h1>` per tab. | Each tab = 1. |
| G4.5-b | testing-skill scenario `phase5-WP5-confirm-keyboard` — opens delete confirm on a seed category, asserts focus trap + Esc dismiss + Tab cycle. | All asserts pass. |
| G4.5-c | testing-skill scenario `phase5-WP5-bulk-disabled` — selects zero rows in `admin#resources`, asserts bulk buttons render `aria-disabled="true"` + `.btn.disabled` skin (CC-18). | Both asserts pass. |
| G4.5-d | `jq` over all 14 admin axe JSONs — `landmark-one-main` + `page-has-heading-one` = 0 across all. | All zero. |
| G4.5-e | DOM grep: `_validation/phase-5/admin-edits/*.dom.html` contains `class=".*\bdiff\b"`; `admin-github/*.dom.html` contains `class=".*\blog\b"`; `admin-resources/*.dom.html` contains `class=".*\btoolbar\b"` and `class=".*\bmenu\b"`. | All present. |

### 5.6 Rollback

`git revert phase5-WP5-admin-pages`. Admin components are independent of public pages. After revert, the WP-1/2/3/4 surface still serves public routes; admin tabs return to their pre-WP-5 markup but still consume WP-1 tokens (legacy-mapped via the Tailwind shim) so they remain visually coherent (just not DS-class-emitting). Verify revert via G4.5-a (most tabs fail h1=1).

---

## 6 · WP-6 — Motion / a11y / cross-cutting polish

### 6.1 Scope

Final pass that lands the items WP-1…WP-5 deferred: reduced-motion gating on Radix animate-in/out keyframes that escaped CC-11's first pass, focus-visible audit on every interactive control, keyboard-tabs ARIA tablist pattern audit on `.tabs` consumers, color-alone audit (every chip / dot accompanies a label or icon — DS_SPEC §7 "Color-alone: Never"), live-dot pulse honouring `prefers-reduced-motion`, RTL audit (mark non-applicable if the app is LTR-only — confirm via site copy), final axe sweep, and the iconography stroke-width audit applied retroactively to any callsites the WP-2 default-prop change didn't reach (per-instance `strokeWidth` overrides).

### 6.2 Files touched

| File | Action |
|---|---|
| `client/src/styles/skeleton-animations.css` | Confirm `prefers-reduced-motion` already gated (it is, lines 94-99) — no change unless audit reveals new shimmer source. |
| `client/src/styles/design-system.css` | Audit `.no-anim` selector — extend to cover any animation keyframe in Radix-emitted classes the audit finds escaping the first-pass `.no-anim *` rule. |
| Per-component `data-[state=open]:animate-*` callsites in `dialog.tsx`, `select.tsx`, `toast.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `sheet.tsx` | Gate via `motion-safe:` Tailwind variant or `.no-anim` class on root. |
| `client/src/components/admin/BatchEnrichmentPanel.tsx` | Live-dot honours reduced-motion (no pulse) — confirm WP-2 `.live-dot` class respects it. |
| Lucide-icon callsites with explicit `strokeWidth` prop overriding WP-2 default | Sweep + remove unless DS-justified. |
| `client/src/components/auth/AuthGuard.tsx` toast on protected-route deny | Confirm toast uses WP-2 `.alert.warn` skin. |

### 6.3 Delta-row IDs addressed

**Low (P3):** CC-11 (re-attest), CC-12 (re-attest at instance level), §5.3 row 4 (live-dot reduced-motion).
**Cross-cutting a11y polish** not absorbed by earlier WPs: focus-visible ring uniformity across all interactive types, tablist roving-tabindex audit, color-alone audit.

### 6.4 Acceptance criteria

| # | Outcome | Evidence artifact |
|---|---|---|
| AC-6.1 | With `prefers-reduced-motion: reduce`, no `animation-duration > 0.01ms` exists on any element across `/`, `/admin#enrichment`, `/category/web-dev`, overlays (modal, dropdown, toast, drawer, search palette). | testing-skill scenario `phase5-WP6-reduced-motion-sweep`, dumps computed `animation-duration` of every element on each route → asserts all ≤ 0.01ms. |
| AC-6.2 | Focus-visible ring on every interactive control (button, link, input, tab, menu-item, switch, slider thumb, sidebar nav row) is the DS spec (`2px solid var(--accent) + 2px offset` for buttons; accent-mix border for fields). | `_validation/phase-5/focus/focus-ring.<route>.<target>.png` × the 10 target classes — captured with `page.keyboard.press('Tab')` walks. |
| AC-6.3 | Every status chip / dot is accompanied by a visible text label or `sr-only` label (color-alone audit). | DOM grep on `_validation/phase-5/admin-enrichment/*.dom.html`, `admin-github/*.dom.html`, `admin-linkhealth/*.dom.html` — every `.dot` / `.live-dot` / `.chip.{ok,warn,err}` has a sibling text node or aria-label. |
| AC-6.4 | `.tabs` consumers (`/admin` shell, `view-mode-toggle`) implement the full ARIA tablist pattern: `role=tablist`, `role=tab`, `aria-selected`, `aria-controls`, Arrow-key roving tabindex, Home/End. | testing-skill scenario `phase5-WP6-tablist-keyboard` — Arrow-Left/Right + Home + End on `/admin` tabs and `view-mode-toggle`. |
| AC-6.5 | Final axe-core sweep across all 16 public routes + 14 admin tabs + 4 viewports = zero violations across the canonical rule subset (`landmark-one-main`, `page-has-heading-one`, `color-contrast`, `button-name`, `link-name`, `aria-required-attr`, `aria-valid-attr-value`, `region`). | `jq` aggregate over `_validation/phase-5/**/*.axe.json` returns 0 across the rule list. |
| AC-6.6 | RTL audit — explicit non-applicability call-out: app copy is English-only; no `dir="rtl"` consumers in `client/src/`; logical-property usage (`margin-inline`, `padding-inline`) reserved for future i18n; **WP-6 records this as N/A, not a deferred TODO.** | `_validation/phase-5/audits/rtl-audit.json` — produced by Phase 5 as a JSON record with shape `{"applicability":"N/A","dir_rtl_consumers":0,"locale_strings":"en-only","decision":"deferred-to-future-i18n-task"}`; written once by the WP-6 commit and ingested by `_results.jsonl`. |

### 6.5 Validation gate G4.6

| # | Command | Pass condition |
|---|---|---|
| G4.6-a | testing-skill scenario `phase5-WP6-reduced-motion-sweep` (per AC-6.1). | All asserts pass. |
| G4.6-b | testing-skill scenario `phase5-WP6-focus-walk` — Tab-walks each of 5 representative routes, captures focus-ring screenshot at every stop. | Every screenshot shows accent-color ring matching DS_SPEC §7. |
| G4.6-c | testing-skill scenario `phase5-WP6-tablist-keyboard` (per AC-6.4). | All asserts pass. |
| G4.6-d | Final aggregate axe assert (per AC-6.5). | All zero. |
| G4.6-e | `rg "strokeWidth" client/src --type tsx` | All hits either absent or `strokeWidth={1.5}` (DS) or `={1.25}` / `={2}` only with a code comment citing a DS exception (none expected). |

### 6.6 Rollback

`git revert phase5-WP6-polish`. WP-6 is purely additive (a11y attributes, `motion-safe:` variants, focus ring polish). Revert removes the polish but cannot break the surface; all prior WP gates remain green. Verify revert via G4.6-d (axe count will increase but `landmark-one-main` will still be 0 because WP-1 owns that fix).

---

## 7 · Tree-of-Thought decisions on ambiguous component groups

For each component group where DS_SPEC and the current code suggest more than one plausible Phase-5 strategy, this section evaluates three candidates — **(a) direct port** from `awesome-list-site-ds/styles.css`, **(b) adapter / wrapper** around the existing shadcn primitive, **(c) rebuild current surface using DS primitives** — and locks one with explicit fidelity / risk / effort / maintainability rationale.

### 7.1 ToT-A — `sidebar.tsx` (DS `.sidebar` + `.accordion-*`)

| Strategy | Fidelity | Risk | Effort | Maintainability | Notes |
|---|---|---|---|---|---|
| (a) **Direct port** — replace `sidebar.tsx` with a hand-written `.sidebar` component, dropping shadcn's `<SidebarProvider>` / `<SidebarMenuButton>` machinery. | High (1:1 DS) | **High** — `AppSidebar.tsx`, `MainLayout.tsx`, and the `SidebarInset` consumer in every route depend on shadcn's context APIs; replacing breaks the entire sidebar/main grid contract. | Large | Low — we'd lose Radix's keyboard/a11y behaviour and have to re-implement collapsible + mobile-sheet logic. | Reject. |
| (b) **Adapter / wrapper** — keep `sidebar.tsx`'s context + components; override their `className` outputs to emit DS classes (`.sidebar`, `.accordion-trigger`, `.accordion-content`, `.mobile-drawer`) alongside shadcn data-attrs. | High (visual 1:1; semantics inherited) | Low — purely additive class strings; existing context APIs unchanged. | Medium | High — future shadcn upgrades still work; DS classes can be removed without touching consumers. | **LOCKED** ✅ |
| (c) **Rebuild via DS primitives** — keep `MainLayout`'s grid, but rewrite `AppSidebar.tsx` and inline `.sidebar` directly without going through `client/src/components/ui/sidebar.tsx`. | Medium — duplicates structure across the app. | Medium — touches `MainLayout.tsx` + every nav consumer. | Medium | Low — two ways to render a sidebar in the codebase is a smell. | Reject. |

**Rationale.** The adapter (b) gets DS fidelity at minimum risk because Radix Collapsible already supplies the keyboard / aria-expanded semantics DS_SPEC §5.11 requires; we only need to swap class strings. Direct port (a) is rejected on integration risk, rebuild (c) on duplication smell.

### 7.2 ToT-B — `dropdown-menu.tsx` (DS GAP-4 `.menu`)

| Strategy | Fidelity | Risk | Effort | Maintainability | Notes |
|---|---|---|---|---|---|
| (a) Direct port — write a bespoke `.menu` component without Radix `DropdownMenu`. | High | High — loses Radix portaling + keyboard + focus-trap. | Large | Low. | Reject. |
| (b) **Adapter** — keep Radix `DropdownMenu` primitives; override `DropdownMenuContent` / `DropdownMenuItem` classNames to emit `.menu` / `.menu-item`. | High | Low | Small | High | **LOCKED** ✅ |
| (c) Rebuild via DS primitives — replace each callsite with a custom popover + button trio. | Medium | Medium — N callsites. | Medium | Low. | Reject. |

**Rationale.** GAP-4 is purely a skin gap; Radix's behaviour is correct.

### 7.3 ToT-C — `toast.tsx` (DS `.alert.error`/`.warn` skin)

| Strategy | Fidelity | Risk | Effort | Maintainability | Notes |
|---|---|---|---|---|---|
| (a) Direct port — replace shadcn `<Toaster>` with a hand-rolled toast portal. | High | High — re-implements portal + dismiss + stacking. | Large | Low. | Reject. |
| (b) **Adapter** — keep Radix `Toast` (`@radix-ui/react-toast`); override class outputs to emit `.alert.error` / `.alert.warn`; drop `shadow-lg`; preserve `role=status` + `aria-live`. | High | Low | Small | High | **LOCKED** ✅ |
| (c) Rebuild via DS primitives — `.alert` rendered statically on the page. | Low — loses async/dismiss semantics. | Low | Medium | Medium. | Reject. |

### 7.4 ToT-D — `table.tsx` (DS `.table` / `.table.mono`)

| Strategy | Fidelity | Risk | Effort | Maintainability | Notes |
|---|---|---|---|---|---|
| (a) **Direct port** — `client/src/components/ui/table.tsx` is a thin shadcn wrapper over native `<table>`. Replace with a thin DS `.table`-class wrapper. | High | Low | Small | High | **LOCKED** ✅ |
| (b) Adapter — keep shadcn classnames + append `.table`. | High | Very Low | Trivial | Medium — double-class duplication. | Acceptable fallback if (a) shows regressions in admin tabs. |
| (c) Rebuild via DS primitives — replace `<Table>` with hand-rolled `<div role="table">` grids per page. | Low | High | Large | Low. | Reject. |

**Rationale.** Unlike sidebar / dropdown / toast, the shadcn `<Table>` adds *no* behavioural value over a native `<table>` — it's classnames only. The direct port is the smallest-surface change here.

### 7.5 ToT-E — `tabs.tsx` (DS `.tabs` + `.tab.active`, plus `.tabs.compact` variant)

| Strategy | Fidelity | Risk | Effort | Maintainability | Notes |
|---|---|---|---|---|---|
| (a) Direct port — replace Radix `Tabs` with hand-rolled roving-tabindex tablist. | High | High — re-implements full ARIA tablist + keyboard. | Large | Low. | Reject. |
| (b) **Adapter** — keep Radix `Tabs`; override classNames; add a `compact` size prop that switches between `.tabs` and `.tabs.compact`. | High | Low | Small | High | **LOCKED** ✅ |
| (c) Rebuild — two separate components for the two tab variants. | Medium | Medium | Medium | Low. | Reject. |

### 7.6 ToT-F — `view-mode-toggle.tsx` (re-skin to `.tabs.compact`)

| Strategy | Fidelity | Risk | Effort | Maintainability | Notes |
|---|---|---|---|---|---|
| (a) Direct port — drop Radix `<ToggleGroup>` and render three `<button>`s with manual `aria-pressed`. | High | Medium — loses Radix's group keyboard semantics. | Medium | Medium. | Reject. |
| (b) **Adapter** — keep `<ToggleGroup>`, override classNames to emit `.tabs.compact` + `.tab.active`; preserve Radix `data-state=on/off`. | High | Low | Small | High | **LOCKED** ✅ |
| (c) Rebuild — reuse the WP-2 `.tabs.compact` `<Tabs>` component instead of `<ToggleGroup>`. | High | Medium — changes URL/state contract from "value" to "tab id"; requires touching `Category.tsx` consumer. | Medium | Medium. | Reject. |

### 7.7 ToT-G — `.diff` molecule (GAP-3) for `admin#edits`

| Strategy | Fidelity | Risk | Effort | Maintainability | Notes |
|---|---|---|---|---|---|
| (a) **Direct port** — implement `.diff` as a small DS-class component in `design-system.css` with `--accent-mix-15` / `--err-mix` row backgrounds, used by `PendingEdits.tsx`. | High | Low | Small | High | **LOCKED** ✅ |
| (b) Adapter — wrap a diff library (e.g., `diff` + Highlight.js) with DS classes. | High | Medium — adds dependency. | Medium | Medium. | Reject (over-engineering for the current single use site). |
| (c) Rebuild — render diffs as side-by-side `<pre>` blocks. | Low | Low | Small | Low. | Reject. |

### 7.8 ToT-H — `applyDesignSystem` SPA hook-in (CC-09)

| Strategy | Fidelity | Risk | Effort | Maintainability | Notes |
|---|---|---|---|---|---|
| (a) **Direct port** — copy `awesome-list-site-ds/design-systems.jsx` verbatim into `client/src/lib/design-system.ts`, add §4.1 TS types, expose `window.applyDesignSystem` once at boot. | High (contract 1:1) | Low | Small | High — single source of truth. | **LOCKED** ✅ |
| (b) Adapter — wrap `applyDesignSystem` in a React hook that mutates a context provider. | Medium — adds React indirection; risks FOUT (DS_SPEC §6.4 "Don't put `applyDesignSystem` in a `useEffect`"). | Medium | Medium | Medium. | Reject — DS_SPEC explicitly forbids the React-effect wrap. |
| (c) Rebuild — re-write the applier as a Vite plugin that pre-compiles `themes.css`. | High (under Option B) | High — Option B is locked-out. | Large | Low. | Reject — Option-B-only. |

---

## 8 · Phase-5 evidence taxonomy summary

Every acceptance criterion in §1–§6 cites at least one artifact path under `_validation/phase-5/`. The complete set of paths Phase 5 must produce:

- **Per slug × viewport × auth × state** — `.png`, `.dom.html`, `.axe.json` triplets matching Phase-2's schema (same naming) for: 16 public slugs + 14 admin slugs × 4 viewports × the same {populated, empty, loading, error, gate, notfound} subset Phase-2 captured. Plus the **empty** and **loading** captures Phase 2 missed (logged in DELTA §0.0; backfilled here under `_validation/phase-5/states/`).
- **Per overlay** — modal, dropdown, drawer, toast, search-palette captures per route under `_validation/phase-5/overlays/`.
- **Per focus target** — accent-ring captures under `_validation/phase-5/focus/`.
- **Per motion check** — reduced-motion captures under `_validation/phase-5/motion/`.
- **Per token check** — JSON dumps of computed root styles + `data-system` / `data-accent` attribute snapshots under `_validation/phase-5/tokens/`.
- **`_results.jsonl`** — one row per captured artifact, matching Phase-2 schema, for the Phase-6 evidence sweep to ingest.

Phase 5 produces these files; this plan only specifies their contracts.

---

## 9 · Gate 4 decision

### 9.1 Coverage attestation — every catalog row maps to exactly one WP

The §0.4 ledger is the binding partition. Walking it:

- **§3 cross-cutting (CC-01…CC-18):** CC-01/02/03/04/05/06/07/08/09/10/11/12/13/15/16/17/18 → **WP-1 (single owner)**. CC-11 and CC-12 explicitly note "WP-6 audits only, does not own" to dispel any inference of split ownership. CC-14 is a single catalog cell containing three structurally distinct obligations (landmark, public `<h1>`, admin `<h1>`); §0.4 assigns one obligation per WP (WP-1 / WP-4 / WP-5) with non-overlapping verification gates — never the same obligation to two WPs. 18 / 18 ✅
- **§4 per-route (§4.1…§4.19):** every row maps to exactly one of WP-2 / WP-3 / WP-4 / §6 INFO in §0.4. Spot-checked previously-ambiguous rows: §4.1 row 6 → WP-2 only; §4.17 row 1 → WP-2 only; §4.12 row 1 → **WP-1** (reassigned from WP-4 to satisfy DELTA_CATALOG §8 P0-before-P1 rule); §4.12 row 2 → WP-2 only; §4.5 row 2 → WP-2 only. 19 / 19 ✅
- **§5 per-admin-tab (§5.1…§5.14):** every row → WP-5 (the tab body is the only place those rows can render). 14 / 14 ✅
- **§6 zero-delta cells:** 14 INFO references carried in §0.4 ledger as `§6 INFO` rows or attached to their parent route. 14 / 14 ✅
- **§7 DS GAPs (GAP-1…GAP-9):** GAP-1/2/3/4/5/6/7/9 → WP-2; GAP-8 → WP-4. 9 / 9 ✅
- **WP-6 polish audits** are not catalog rows — they are derived global re-attestations explicitly labelled as such in §0.4.

**Partition verdict:** Every one of 93 deltas + 14 INFO + 9 GAPs maps to **exactly one** owning WP. Zero orphans, zero double-counts. CC-14 is the only catalog cell with multiple owners and is structurally three sub-obligations assigned one-each.

### 9.2 Validatability attestation — every acceptance criterion is observable through rendered output

Walking §1.4 → §6.4:

- **9 + 11 + 9 + 8 + 8 + 6 = 51 acceptance criteria.** Each cites at least one concrete artifact path under `_validation/phase-5/` (often plus a testing-skill scenario name or a shell command).
- **Zero criteria are "manual visual check" / "looks right" / "matches design intent without a referenced artifact."** Spot-checked the three previously-flagged criteria: AC-2.10 now enumerates six concrete `.dom.html` paths (one per GAP molecule); AC-4.2 cites `_validation/phase-5/settings-theme/...` + `_validation/phase-5/tokens/computed-styles.settings-theme.1280.matrix.json`; AC-6.6 cites `_validation/phase-5/audits/rtl-audit.json` with a defined JSON shape.
- **Every validation gate G4.1…G4.6 has a pass condition that returns a boolean from `testing-skill runTest` or `jq` / `rg` exit code.**

**Validatability verdict:** All 51 acceptance criteria are mechanically verifiable from rendered output Phase 5 will capture under `_validation/phase-5/`.

### 9.3 Sequencing attestation

- **All seven P0 rows land in WP-1.** CC-01, CC-02, CC-03, CC-04, CC-08, CC-09, and §4.12 row 1 are all owned by WP-1, satisfying DELTA_CATALOG §8's "all P0 before any P1 visual work" rule. §4.12 row 1's `ThemeSettings.tsx` edit was pulled into WP-1's file-touch list and AC-1.9 / G4.1-g verify it.
- Sequencing chain: WP-1 → WP-2 → WP-3 → WP-4 → WP-5 → WP-6. Gates G4.1 → G4.6 enforce the chain.
- No WP-N task references a file owned by WP-M for M > N. Spot-checked file-touch lists §1.2 / §2.2 / §3.2 / §4.2 / §5.2 / §6.2.

### 9.4 Decision

**Gate 4: PASS.** This Remediation Plan partitions every Phase-3 catalog row into a six-stage implementation sequence with observable, evidence-pinned acceptance criteria and mechanically-verifiable validation gates. Phase 5 may begin work-package WP-1.

The seven Critical (P0) rows that must land first — CC-01, CC-02, CC-03, CC-04, CC-08, CC-09, §4.12 row 1 — are all owned by WP-1, satisfying DELTA_CATALOG §8's "all P0 before any P1 visual work" rule.

**Out of scope for Phase 4** (re-attested from DS_SPEC §9 / DELTA_CATALOG §8): light mode, Option-B systems (Editorial / Geist / Brutalist / Swiss / Lumen), the `awesome-list-site-ds/` demo files, RTL (recorded N/A in AC-6.6 — not deferred).

---

*End of REMEDIATION_PLAN.md — Phase 4.*
