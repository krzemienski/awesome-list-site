# REMEDIATION_PLAN.md — Editorial + Crimson Migration

**Scope (locked):** apply DS Editorial system + Crimson accent to every route + admin tab + state + breakpoint on the current site. Single personality, no switcher.

**Strategy:** the existing codebase already wires shadcn → DS tokens via `@theme inline`, so this is a **token-value substitution** + targeted skin/composition fixes + per-route validation, not a from-scratch rebuild.

**Gate philosophy:** rendered, content-loaded, screenshot-backed evidence at every gate. No code-only "looks right" passes.

---

## Work-Package index

| WP | Group | Files touched | Gate |
|---|---|---|---|
| **WP-1** | Foundations | `client/src/styles/design-system.css`, `client/src/index.css`, `client/index.html`, `client/src/main.tsx`, `package.json` (font deps) | **Gate 4.1** |
| **WP-2** | Primitives | `client/src/components/ui/*` | **Gate 4.2** |
| **WP-3** | Compositions | `client/src/components/layout/new/*`, `awesome-list-explorer.tsx` | **Gate 4.3** |
| **WP-4** | Public pages | `client/src/pages/{Home,About,Advanced,Login,SubmitResource,Journeys,JourneyDetail,Category,Subcategory,SubSubcategory,ResourceDetail,not-found,ThemeSettings}.tsx` | **Gate 4.4** |
| **WP-5** | Protected pages | `client/src/pages/{Profile,Bookmarks}.tsx` | **Gate 4.5** |
| **WP-6** | Admin (14 tabs) | `client/src/components/admin/*` and `AdminDashboard.tsx` | **Gate 4.6** |
| **WP-7** | Cross-cutting polish | motion, focus, a11y, reduced-motion, responsive sweeps | **Gate 4.7** |
| **WP-8** | Final evidence sweep (Phase 6) | none (capture only) | **Gate 6** |

---

## Phase 2 — Baseline (PRE-WORK, must complete before WP-1)

**Goal:** capture rendered evidence of current (Terminal) state on every route × breakpoint × auth context so we have a before/after diff and catch any pre-existing functional regressions.

**Actions:**
1. Confirm `Start application` workflow is healthy on port 5000.
2. Resolve admin credentials (either provided by user, or reset via `tsx scripts/reset-admin-password.ts` and tell user the new creds).
3. Spawn a Playwright/test subagent to visit each route at viewports **375, 768, 1280, 1536** in both unauthenticated and (where applicable) authenticated contexts.
4. Capture per cell: screenshot → `_validation/p2/<route>/<viewport>-<auth>.png`, console errors, network failures, axe summary.

**Cells:** ~ (15 public routes × 4 viewports × 2 auth) + (2 protected × 4 × 1) + (14 admin tabs × 4 × 1) = **184 cells.**

**Gate 2:** every cell has a screenshot file and a JSON sidecar with console/network/axe results. Any red cell (console errors, broken network, axe critical) is logged in `_validation/p2/BASELINE_REPORT.md` for triage decision before continuing.

---

## WP-1 · Foundations

**Scope:** swap all token values, install + wire fonts, add page atmosphere + grain, set `data-system="editorial"`, fix radius `@theme inline` mappings, add Editorial italic-accent skin.

**Files:**
- `client/src/styles/design-system.css` — rewrite `:root` token block with Editorial values from `DS_SPEC.md §2`; append Editorial skin rules.
- `client/src/index.css` — un-collapse radius keys in `@theme inline` (so shadcn `rounded-*` resolves to Editorial radii); update `::selection`; add `font-feature-settings`.
- `client/index.html` — set `<html data-system="editorial" data-accent="crimson">`.
- `client/src/main.tsx` — import font CSS, remove (or no-op) the matrix-accent dark-class init if redundant.
- `client/src/components/layout/new/MainLayout.tsx` — wrap children in `<div class="page"><div class="grain" />…</div>`.
- `package.json` — add `@fontsource-variable/fraunces`, `@fontsource-variable/inter`, `@fontsource/jetbrains-mono` (via package-management tool, not direct edit).
- `client/src/lib/design-system.ts` — strip Terminal-only logic; keep only the editorial constant. (Optional: delete; consumed nowhere critical after foundation swap.)

**Acceptance criteria:**
- AC-1.1 `:root` declares every token in `DS_SPEC §2`; no leftover `rgba(0,255,136,…)` references anywhere except inside the file `_planning/`.
- AC-1.2 `<html>` carries `data-system="editorial" data-accent="crimson"` from first paint (verify via `view-source:` and Performance trace — no flash).
- AC-1.3 Fonts load with `font-display: swap`; no missing-font console warnings; Fraunces visible on `.display-h`, Inter on body, JetBrains Mono on `code/pre/kbd`.
- AC-1.4 Visible radius on any shadcn `<Card>`, `<Input>`, `<Dialog>` — values 8 or 12 px confirmed in DevTools.
- AC-1.5 `.grain` overlay visible (opacity 0.32) and `.page` background carries a radial gradient.

**Validation evidence (Gate 4.1):**
- Screenshot of `/` at 1280, with DevTools open showing computed `:root` values and `<html>` attributes.
- Screenshot diff: `_validation/p2/home/1280-unauth.png` vs new `_validation/p5/wp1/home/1280-unauth.png` — must show fonts swapped, accent crimson, radii non-zero, grain present.
- Confirm `/login` (un-styled-by-route) and `/about` (long-form copy) render correctly.

**Rollback:** revert `design-system.css`, `index.css`, `index.html`, `MainLayout.tsx`; uninstall font packages.

---

## WP-2 · Primitives

**Scope:** sweep `components/ui/*` to ensure every primitive renders the Editorial visual language without per-call overrides. Strip any Terminal-specific class hard-coding (`rounded-none`, `font-mono` on body controls, neon-green borders).

**Approach:** one PR-equivalent per primitive group (Button/Card/Badge → Form controls → Overlays → Misc). Render the storybook-equivalent (`/` + `/login` + `/submit` + a category page) after each group to catch knock-on regressions.

**Acceptance criteria per primitive:** matches `DS_SPEC §3` token contract, all variants visible, focus state shows crimson ring, no console warnings.

**Validation evidence (Gate 4.2):**
- Per-primitive isolated render in a temporary `/dev/ui-audit` route (or via Storybook-style page) screenshot at 1280.
- Tab through each focusable primitive; capture focus state screenshot.

---

## WP-3 · Compositions

**Scope:** Header, Sidebar, MobileDrawer, Footer, MainLayout, view-mode toggle on Category.

**Acceptance criteria:** matches `DS_SPEC §3` (sidebar accordion active bar + glow, header blur, mobile drawer slide).

**Validation evidence (Gate 4.3):** screenshot at 375, 768, 1280, 1536 for `/` showing each composition. Mobile drawer open + closed.

---

## WP-4 · Public pages

**Order (lowest blast radius first):** `/login`, `/about`, `/`, `/submit`, `/journeys`, `/journey/:id`, `/category/:slug`, `/subcategory/:slug`, `/sub-subcategory/:slug`, `/resource/:id`, `/advanced`, `/settings/theme`, `*` 404.

**Per page:**
1. Render with real DB content; compare side-by-side with `uploads/` mockup.
2. Substitute hardcoded values per `DELTA_CATALOG §D`.
3. Add `.display-h`, `.eyebrow`, `.serif-italic` where the mockup uses italic accents.
4. Re-render at 4 breakpoints + capture empty / loading / error states where they exist.

**Validation evidence (Gate 4.4):** every cell from `_validation/p2` re-captured to `_validation/p5/wp4/`. Visual diff vs the corresponding `uploads/NN_*.png` mockup must show parity (or annotated divergence with rationale).

---

## WP-5 · Protected pages

**Pre-req:** authenticated session in Playwright (login via local-strategy with seeded admin or test user).

**Apply:** Profile (form pattern), Bookmarks (card-grid pattern).

**Validation evidence (Gate 4.5):** screenshots at 4 breakpoints, authenticated.

---

## WP-6 · Admin (14 tabs)

**Group sub-batches** to keep render cycles tight:
- 6a Queue tabs: Approvals, Edits
- 6b CRUD tabs: Resources, Categories, Subcategories, Sub-Subcats, Users
- 6c AI tabs: Enrichment, Researcher
- 6d Ops tabs: Export, Database, GitHub, Link Health, Audit

Reference `admin.jsx` from the DS bundle for visual idiom on tables, stats cards, queues, filters.

**Per tab:** apply DS table/card/chip primitives, swap any leftover green to crimson, ensure responsive collapse on 768.

**Validation evidence (Gate 4.6):** every admin tab at 1280 (primary) + 768 (verify responsive). Capture interactive states: row hover, bulk-action selection, action menu open, success toast.

---

## WP-7 · Cross-cutting polish

- Motion: verify all transitions match `DS_SPEC §2` durations + easings.
- A11y: axe sweep on every route; resolve criticals; document non-criticals.
- `prefers-reduced-motion`: confirm `.no-anim` rules fire (or implement `@media`).
- Focus ring: tab through 5 representative pages; verify visible crimson outline on every interactive element.
- Touch targets: re-measure on 375 viewport; ensure ≥ 44×44 px.
- SEO: `SEOHead.tsx` outputs per-route titles + descriptions + OG tags (unchanged by DS work, but verify nothing was broken).

**Validation evidence (Gate 4.7):** axe report per route stored alongside screenshots; reduced-motion screenshot of `/` confirming no transforms.

---

## Phase 6 · Final evidence sweep (WP-8)

**Cells:** identical 184-cell matrix as Phase 2, but post-migration. Each cell must have:
- screenshot (real, populated content)
- DOM snapshot (`.html` dump)
- console clean / network 2xx (or expected codes)
- axe pass / justified exceptions
- token-conformance check (sample 3 elements per page, dump computed `--color-*` and verify they resolve to Editorial values)

**Output:** `_validation/p6/FINAL_VALIDATION_REPORT.md` matrix with pass/fail per cell + links. Any red cell blocks completion.

---

## Phase 7 · Handoff

- Update `replit.md` "Recent Changes" with summary + scope.
- Delete `_planning/` (or move to `docs/migrations/2026-05-editorial/`).
- Capture before/after hero shots in handoff for the user.
- List residual risks: light-mode absence, admin mockup gaps (resolved via DS reference), font-licensing if not Google Fonts.

---

## Execution policy

1. **Stop at each Gate.** Do not advance until evidence for the previous gate is captured and linked in `_validation/`.
2. **Real content only.** Never validate against empty seed; ensure DB has its 1,949 approved resources before capture.
3. **Per-route render after each WP.** No batched "trust me" merges.
4. **Token-only first, then skin.** Resist the urge to start rewriting components in WP-2 until WP-1 token swap is fully validated — most "broken" components will simply resolve themselves once tokens are correct.

---

## Estimated effort & order of operations

| Phase / WP | Estimate | Blocks |
|---|---|---|
| Phase 2 baseline | ~30 min (subagent driven) | WP-1 |
| WP-1 Foundations | ~20 min | WP-2..7 |
| WP-2 Primitives | ~30 min | WP-3..6 |
| WP-3 Compositions | ~30 min | WP-4..6 |
| WP-4 Public pages | ~60 min | WP-5..6 |
| WP-5 Protected | ~15 min | — |
| WP-6 Admin | ~60 min | WP-7 |
| WP-7 Polish | ~30 min | Phase 6 |
| Phase 6 sweep | ~30 min | Phase 7 |
| Phase 7 handoff | ~10 min | done |

Total in the ballpark of **4–5 focused hours** of agent work, gated by per-WP evidence capture.
