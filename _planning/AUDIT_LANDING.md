# AUDIT_LANDING — Visual diff for landing pages

> Task #29 deliverable. Audit only — no fixes. Pairs the running app
> (`http://localhost:5000`) against the Editorial + Crimson handoff
> references at three breakpoints (400 / 768 / 1280).
> Rubric: `.agents/skills/visual-inspection/SKILL.md`
> (layout · type · contrast · touch targets · dark-mode · overflow · spacing · a11y).

## Reference & methodology

- **Current screenshots** captured by `agent-browser` against the running dev
  server. Viewport set via `agent-browser set viewport <w> 900` before each
  `open` + `wait 1800ms` + `screenshot --full --jpeg`.
- **Reference screenshots** = authoritative `uploads/0N_*.png` PNGs from
  `/tmp/handoff/awesome-list-site/project/uploads/`, per
  `_planning/REFERENCE_MAP.md` ("Use the PNGs in `uploads/` as the
  authoritative reference; only fall back to live-rendering the bundle when
  a PNG is missing or you need a hover/focus state").
- The handoff PNGs were captured at **1920×1080 desktop** against the
  production reference `new.awesome.video`. They are therefore reused as the
  reference frame at 400 / 768 / 1280 with the explicit caveat that the
  handoff bundle does not ship per-breakpoint reference renders. Layout
  divergences at 400 / 768 are scored against the same desktop reference,
  noting where a finding is purely a responsive-fold problem on the current
  app vs. a static parity problem also visible at 1280.
- Severity scale: **CRITICAL** (breaks the page or makes a token / element
  unreadable), **HIGH** (clearly off-brand vs. handoff, will be noticed
  immediately), **MEDIUM** (token/treatment mismatch that drifts from the
  Editorial DS but is not jarring), **LOW** (polish nit).
- Verdict per pair: **PASS** (parity, only LOW or no findings), **FIX**
  (HIGH/MEDIUM divergence requires work), **FAIL** (CRITICAL — broken).

All paths are relative to the repo root.

---

## TL;DR

| Page                    | 400  | 768  | 1280 | Worst severity                                               |
|-------------------------|------|------|------|--------------------------------------------------------------|
| Home (`/`)              | FIX  | FIX  | FIX  | HIGH — sidebar "NAVIGATION/CATEGORIES" rendered as crimson uppercase eyebrows vs. plain muted "Navigation/Categories"; brand uppercase eyebrow vs. plain lowercase. |
| About (`/about`)        | FIX  | FIX  | FIX  | HIGH — hero h1 oversized (`text-4xl sm:text-5xl`) vs. reference single-step heading; every section `CardTitle` icon is crimson, reference uses muted gray icons for non-hero card headers. |
| Login (`/login`)        | FIX  | FIX  | FIX  | HIGH — crimson icon wrapped in 12 % accent bubble with glow ring vs. plain crimson icon; "Sign in" button has accent glow; default-admin block missing the `Default admin credentials:` label row. |
| Submit auth-gate (`/submit`) | FIX  | FIX  | FIX  | MEDIUM — `bg-primary/10` icon bubble + `text-primary` use the legacy shadcn `--primary` chain instead of `var(--accent)`; "Login with Replit" button visually correct but elevated/glow vs. flat reference. |
| Theme settings (`/settings/theme`) | **FAIL** | **FAIL** | **FAIL** | **CRITICAL** — Color Theme preset cards render with NO visible label, NO description, NO color-dot row at the bottom. Reference shows label + 1-line description + swatch ladder + 3 colored dots. Currently the card body is a near-black swatch + `#000` mono caption only. |
| 404 (`/this-route-does-not-exist`) | FIX | FIX | FIX | MEDIUM — `Browse Categories` outline button uses default border weight (looks heavier than reference flat outline); `Go Home` primary button has accent glow; AlertCircle uses `text-destructive` (orange-red) vs. reference's pure crimson accent. |

**Net (per-pair)**: 0 PASS, **15 FIX**, **3 FAIL** (Theme picker × 400 / 768 / 1280).
Downstream fix task ("Fix — landing pages + Theme") is already queued by the
planner.

---

## 1. Home — `/`

| Width | Current                                              | Reference                       |
|------:|------------------------------------------------------|---------------------------------|
| 400   | `screenshots/audit/landing/home_400_current.jpg`     | `screenshots/audit/landing/home_400_reference.jpg`  |
| 768   | `screenshots/audit/landing/home_768_current.jpg`     | `screenshots/audit/landing/home_768_reference.jpg`  |
| 1280  | `screenshots/audit/landing/home_1280_current.jpg`    | `screenshots/audit/landing/home_1280_reference.jpg` |

### Side-by-side reasoning (1280 representative)

Hero (`h1` "Awesome Video Resources" + lead) and the 3×3 category card grid
have correct **layout, type scale, dark-mode, and overflow** parity with the
reference. Cards: same icon-left / count-badge-right header arrangement,
same body description preview, same column counts at the three breakpoints
(1 col @ 400, 2 col @ 768, 3 col @ 1280). The AI-Powered Recommendations
section heading + body and the unauthenticated CTA card match in structure
and copy. No overflow at 400. Touch targets on the filter bar and category
cards are ≥ 44 px.

### Divergences

| ID    | Width | Rubric             | Severity | Finding |
|-------|-------|--------------------|----------|---------|
| H-01  | all   | type               | HIGH     | Sidebar `SidebarGroupLabel`s render `NAVIGATION` / `CATEGORIES` as crimson, uppercase, letter-spaced eyebrows (the `.eyebrow` token applied in WP-3). Reference renders them as **plain lowercase muted** "Navigation" / "Categories" (no crimson, no caps). |
| H-02  | all   | type               | HIGH     | Sidebar brand: current shows `Awesome Video` in `font-sans text-sm font-semibold` PLUS a crimson `1952 RESOURCES` uppercase eyebrow under it. Reference shows `Awesome Video` (white) + `1953 resources` (lowercase, muted) — no eyebrow at all. |
| H-03  | 1280  | spacing            | MEDIUM   | Category cards have heavier internal padding than reference (rows feel taller, ~ 110 px vs. ~ 90 px) and the inter-row gap is `gap-4` vs. visually tighter gap in reference. |
| H-04  | 1280  | layout             | LOW      | Filter bar `Default` Select trigger has a chevron right edge styled differently from reference (looks heavier border). |
| H-05  | all   | type               | LOW      | Lead text wraps to 2 lines at 1280 ("Explore 9 categories with 1712 curated resources **for engineers building the modern video stack**"). Reference is a single line (only "Explore 9 categories with 1713 curated resources"). |
| H-06  | 400   | layout             | LOW      | Stacked cards at 400 px look correct, no overflow, no horizontal scroll. Sidebar hidden behind sheet trigger as expected. |

**Verdict 400 / 768 / 1280: FIX** (H-01 + H-02 are global sidebar tokens —
fix once, parity recovers on every page).

---

## 2. About — `/about`

| Width | Current                                               | Reference                       |
|------:|-------------------------------------------------------|---------------------------------|
| 400   | `screenshots/audit/landing/about_400_current.jpg`     | `screenshots/audit/landing/about_400_reference.jpg`  |
| 768   | `screenshots/audit/landing/about_768_current.jpg`     | `screenshots/audit/landing/about_768_reference.jpg`  |
| 1280  | `screenshots/audit/landing/about_1280_current.jpg`    | `screenshots/audit/landing/about_1280_reference.jpg` |

### Side-by-side reasoning (1280 representative)

Page composition (hero + 5 cards: What is this / Features / Tech Stack /
Accessibility / Credits) matches the reference 1:1. Dark-mode parity OK.
No overflow at 400 / 768. The Features grid drops from `lg:grid-cols-4` →
`md:grid-cols-2` → 1-col correctly. Credits row stays 3-col at 1280, stacks
at 400. Touch targets on the three credit anchors are ≥ 44 px tall.

### Divergences

| ID    | Width | Rubric    | Severity | Finding |
|-------|-------|-----------|----------|---------|
| A-01  | all   | type      | HIGH     | Hero `h1` is `text-4xl sm:text-5xl` ("About" reads at ~ 48 px @ 1280). Reference renders the heading at ~ 28-30 px — one step smaller than ours, and the Sparkles icon is correspondingly smaller (`h-5 w-5` rather than `h-7 w-7`). |
| A-02  | all   | contrast  | HIGH     | Every section `CardTitle` icon is rendered crimson (`text-[var(--accent)]`). Reference uses **muted gray icons** for the section headers ("Features" Zap, "Accessibility First" Accessibility, "Credits" Heart all neutral; only the "What is this?" Rocket icon and the page-hero Sparkles use crimson). Crimson is overused as a section-title affordance. |
| A-03  | all   | contrast  | MEDIUM   | Features grid icons (Wind, Rocket, Search, Palette, etc.) are all crimson in current. Reference renders most of them in **neutral/muted** with only the first row tinted — the per-tile icon should NOT inherit accent. |
| A-04  | all   | contrast  | MEDIUM   | Tech Stack bullets alternate `bg-primary` / `bg-accent` which under the cyberpunk preset both resolve to the same crimson, producing a uniform red-dot column. Reference shows red dots for some rows and **unfilled / outlined dots** for others as a visual rhythm. |
| A-05  | 1280  | spacing   | LOW      | Cards have `mb-6` between them; reference appears tighter (`mb-4`/`mb-5` worth). |
| A-06  | 400 / 768 | layout | LOW    | At 400 px the hero icon + h1 stack acceptably (no overflow). At 768 the Features grid is 2-col, matching reference cadence. |

**Verdict 400 / 768 / 1280: FIX** (A-01 and A-02 are dominant.)

---

## 3. Login — `/login`

| Width | Current                                                | Reference                       |
|------:|--------------------------------------------------------|---------------------------------|
| 400   | `screenshots/audit/landing/login_400_current.jpg`      | `screenshots/audit/landing/login_400_reference.jpg`  |
| 768   | `screenshots/audit/landing/login_768_current.jpg`      | `screenshots/audit/landing/login_768_reference.jpg`  |
| 1280  | `screenshots/audit/landing/login_1280_current.jpg`     | `screenshots/audit/landing/login_1280_reference.jpg` |

### Side-by-side reasoning (1280 representative)

Card centering, max-width, email/password fields, "Or continue with"
separator, and the 2-up Google + GitHub OAuth grid all parity-match the
reference. Form labels, placeholders, autocomplete attributes correct.
Touch targets ≥ 44 px on all controls. No overflow at 400; card scales
correctly across breakpoints.

### Divergences

| ID    | Width | Rubric          | Severity | Finding |
|-------|-------|-----------------|----------|---------|
| L-01  | all   | dark-mode         | HIGH     | Header `LogIn` icon is wrapped in a `bg-[color-mix(in srgb,var(--accent) 12%,transparent)]` round bubble with a 1 px crimson ring. Reference shows **just the crimson icon glyph** floating on the card surface — no bubble, no ring. |
| L-02  | all   | contrast          | HIGH     | The "Sign in" submit `Button` (and the "Login with Replit" button on Submit auth-gate) renders with a perceptible accent glow / 3D feel (looks like our shadcn primary has `box-shadow`). Reference renders these as **flat crimson fills** with no glow. |
| L-03  | all   | type              | MEDIUM   | Default-admin block: current renders one paragraph `Default admin: admin@example.com / admin123` then a tinted warning line. Reference renders **two stacked rows**: a label row "Default admin credentials:" (muted) followed by a mono-formatted `admin@example.com / admin123` row, then the warning row with an explicit warning glyph. |
| L-04  | all   | type            | LOW      | `Welcome back` h1 in current is `text-3xl` and looks ~ 30 px; reference looks ~ 22-24 px (one step smaller). Subtitle is a parity match. |
| L-05  | 400   | spacing         | LOW      | Card has visible 16 px page padding via `min-h-[calc(100vh-12rem)] p-4` wrapper — reference card sits at the same offset. OK. |

**Verdict 400 / 768 / 1280: FIX**.

---

## 4. Submit Resource auth-gate — `/submit` (unauthenticated)

| Width | Current                                                | Reference                       |
|------:|--------------------------------------------------------|---------------------------------|
| 400   | `screenshots/audit/landing/submit_400_current.jpg`     | `screenshots/audit/landing/submit_400_reference.jpg`  |
| 768   | `screenshots/audit/landing/submit_768_current.jpg`     | `screenshots/audit/landing/submit_768_reference.jpg`  |
| 1280  | `screenshots/audit/landing/submit_1280_current.jpg`    | `screenshots/audit/landing/submit_1280_reference.jpg` |

### Side-by-side reasoning (1280 representative)

Card composition (centered card, LogIn icon, "Authentication Required"
title, helper copy, primary "Login with Replit" + outline "Back to Home")
matches the reference exactly. Card border-color uses
`border-primary/20` which renders crimson-tinted as expected. Touch
targets ≥ 44 px on both buttons. No overflow at any width.

### Divergences

| ID    | Width | Rubric        | Severity | Finding |
|-------|-------|---------------|----------|---------|
| S-01  | all   | contrast      | MEDIUM   | Code uses `bg-primary/10`, `text-primary`, and `border-primary/20` (shadcn `--primary` chain) instead of the design-system `var(--accent)` chain. Visually they coincide today because cyberpunk preset has primary == accent ≈ `#ff3d52`, but this drifts the moment the user picks a non-cyberpunk preset — accent will move but `primary` won't, breaking the gate. |
| S-02  | all   | contrast      | MEDIUM   | The icon bubble (`bg-primary/10` 4-padding `rounded-full`) renders larger / lighter than reference. Reference shows a tight crimson circular icon (no perceptible bubble fill). |
| S-03  | all   | type          | LOW      | "Authentication Required" h1 currently `text-2xl`; reference visually ~ 20 px (one step smaller). Body copy is a parity match. |
| S-04  | all   | contrast      | LOW      | "Login with Replit" button shows the same accent glow finding as L-02. Same root cause. |
| S-05  | 400   | layout        | LOW      | Card stacks correctly. No overflow. |

**Verdict 400 / 768 / 1280: FIX**.

---

## 5. Theme Settings — `/settings/theme`

| Width | Current                                                | Reference                       |
|------:|--------------------------------------------------------|---------------------------------|
| 400   | `screenshots/audit/landing/theme_400_current.jpg`      | `screenshots/audit/landing/theme_400_reference.jpg`  |
| 768   | `screenshots/audit/landing/theme_768_current.jpg`      | `screenshots/audit/landing/theme_768_reference.jpg`  |
| 1280  | `screenshots/audit/landing/theme_1280_current.jpg`     | `screenshots/audit/landing/theme_1280_reference.jpg` |

### Side-by-side reasoning (1280 representative)

The page scaffold (back link, hero "Theme Settings" with Palette icon,
"Customize the font and color theme…" lead, Font section, Color Theme
section) is structurally present. The Font picker grid (6 tiles, 3 × 2 at
1280, 2-col at 768, 1-col at 400) and the per-tile sample sentence render
correctly and match the reference within minor type ordering. The active
selection ring + Check glyph wires up correctly on Font (Inter is active).

**However**, the Color Theme grid below is functionally broken vs.
reference — see T-01 below — and this finding is the most severe in the
landing-pages cohort.

### Divergences

| ID    | Width | Rubric                  | Severity     | Finding |
|-------|-------|-------------------------|--------------|---------|
| T-01  | all   | layout / a11y           | **CRITICAL** | Color Theme cards render with **no visible label**, **no description**, **no row of 3 color dots**. The card body collapses to a near-black 40 px swatch bar + the literal text `#000` in the mono caption. Reference shows: bold preset label ("Cyberpunk", "Limes", "Black & Pink", "Flat Pink", "Purples", "Flat Purples") + a 1-line description ("Neon red on deep black — high contrast terminal aesthetic" etc.) + a swatch bar with three differently-coloured cells + an underline row of 3 colored dots indicating primary / secondary / accent. The active state should also show a Check glyph in the top-right of the active tile (currently invisible because no label row renders). **Root cause = `ThemePreset` shape mismatch.** `client/src/lib/shadcn-themes.ts` defines `themePresets` with fields `{ name, value, description, preview, cssVars }` (see lines 1-6 + entries at 13, 47, 81, 115, 149, 183). `client/src/pages/ThemeSettings.tsx` reads `preset.label`, `preset.dark?.primary`, `preset.dark?.secondary`, `preset.dark?.accent`, `preset.light?.primary` — all of which are `undefined`. `client/src/components/ui/theme-provider.tsx:134` also reads `activeTheme?.dark?.primary || activeTheme?.light?.primary` for accent application — also `undefined`. The fix path is to read `preset.name`, `preset.description`, and `preset.preview.{accent,secondary,bg}` (or the corresponding `cssVars` entries) rather than the non-existent `label/dark/light` shape; that will surface the labels, descriptions, and real swatch colours. |
| T-02  | all   | type                    | MEDIUM       | Font picker tile order is *name → sample sentence → description*. Reference is *name → description → sample sentence* (description sits one line under the name as a subhead, sample is the bottom region). |
| T-03  | all   | type                    | LOW          | Sample sentence is `"The quick brown fox jumps over the lazy dog"`. Reference appends digits: `"The quick brown fox jumps over the lazy dog. 0123456789"` — proves numeric glyph treatment per font. |
| T-04  | all   | type                    | LOW          | Section heading "Theme Settings" current size `text-3xl sm:text-4xl` (~ 36 px @ 1280) larger than reference (~ 24 px). |
| T-05  | all   | type                    | LOW          | Header copy in reference shows the active preset value next to the lead ("Customize colors and fonts. Active: Cyberpunk"). Current copy omits the active-preset readout. |
| T-06  | 400   | layout                  | MEDIUM       | At 400 px Color Theme cards are still broken (T-01) — stacks 1-col without labels, same root cause. |

**Verdict 400 / 768 / 1280: FAIL** (T-01 is a CRITICAL: the picker is not
usable in its current state — a user cannot distinguish presets visually
because every card is the same nearly-black swatch with a `#000` caption
and no name).

---

## 6. 404 Not Found — `/this-route-does-not-exist`

| Width | Current                                                    | Reference                       |
|------:|------------------------------------------------------------|---------------------------------|
| 400   | `screenshots/audit/landing/notfound_400_current.jpg`       | `screenshots/audit/landing/notfound_400_reference.jpg`  |
| 768   | `screenshots/audit/landing/notfound_768_current.jpg`       | `screenshots/audit/landing/notfound_768_reference.jpg`  |
| 1280  | `screenshots/audit/landing/notfound_1280_current.jpg`      | `screenshots/audit/landing/notfound_1280_reference.jpg` |

### Side-by-side reasoning (1280 representative)

Centered card with AlertCircle + "Page Not Found" title, two-paragraph
body, and bottom-right action row (`Browse Categories` outline + `Go Home`
primary). Card width, vertical centering, and helper-copy line breaks
match the reference. Touch targets ≥ 44 px on both action buttons. Dark
background and surface card parity OK. No overflow.

### Divergences

| ID    | Width | Rubric  | Severity | Finding |
|-------|-------|---------|----------|---------|
| N-01  | all   | contrast| MEDIUM   | AlertCircle uses `text-destructive` (the shadcn destructive token, which renders an orange-tinted red under the current OKLCH theme) rather than `text-[var(--accent)]` crimson. Reference uses pure crimson. |
| N-02  | all   | contrast| MEDIUM   | `Go Home` primary button has the same accent glow finding as L-02 / S-04. |
| N-03  | all   | spacing | LOW      | Card has wider max-width (`max-w-md`) and CardFooter `justify-end gap-4`. Reference renders the same 2-button row but tighter (`gap-2`/`gap-3`). |
| N-04  | all   | type    | LOW      | "Page Not Found" CardTitle uses the default `CardTitle` size; reference appears one step smaller. |
| N-05  | 400   | layout  | LOW      | Card stacks correctly, both buttons full-width side-by-side or wrap — reference behaves the same. |

**Verdict 400 / 768 / 1280: FIX**.

---

## Findings by severity (planner intake)

- **CRITICAL (1)**: T-01 — Color Theme picker reads non-existent
  `preset.label / preset.dark / preset.light` instead of the actual
  `name / description / preview / cssVars` shape from
  `client/src/lib/shadcn-themes.ts`. Same shape mismatch in
  `theme-provider.tsx:134` (`activeTheme?.dark?.primary`).
- **HIGH (6)**: H-01, H-02 (sidebar eyebrows + brand styling — global),
  A-01 (About hero size), A-02 (over-use of crimson on section CardTitle
  icons), L-01 (Login icon bubble + ring), L-02 (primary button glow —
  recurs in S-04 and N-02).
- **MEDIUM (10)**: H-03, A-03, A-04, L-03, S-01, S-02, T-02, T-06, N-01,
  N-02.
- **LOW (16)**: H-04, H-05, H-06, A-05, A-06, L-04, L-05, S-03, S-04, S-05,
  T-03, T-04, T-05, N-03, N-04, N-05.

(The downstream "Fix — landing pages + Theme" task already queued by the
planner will pick these up; this audit is intentionally read-only.)

## Methodology notes / known limits

1. Per `_planning/REFERENCE_MAP.md` (Routing caveat), the handoff bundle
   does not ship per-breakpoint reference renders; 400 / 768 columns reuse
   the 1920×1080 desktop PNGs as the reference frame. Findings tagged with
   `width = 400 / 768` therefore evaluate the responsive collapse of the
   *current* app against the *desktop* reference and only flag responsive
   issues that would also be flagged at 1280.
2. The mobile-fold-only category (where the reference simply has no
   responsive intent we can score against) is captured as LOW-only findings
   (e.g. H-06, A-06, L-05, S-05, N-05) — there is nothing to "fix" against
   the reference at those rows, they are recorded for completeness.
3. The current screenshots include the Replit dev-bar artifact in the
   bottom-right of some captures; that is dev-only and ignored.
