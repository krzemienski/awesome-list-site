# Gate map — which gate proves which stage

Read this when a gate fails and you need to know what it was checking, or when
a stage shows UNVERIFIED and you need to know what would verify it.
`node <skill>/scripts/verify-ds.mjs --list` prints the live catalogue.

Stage numbers follow the in-repo rulebook
(`.agents/skills/verify-design-system/SKILL.md`). **Stage 0** is this skill's
addition: parity with the frozen design source, which the rulebook never
invokes but `design-system.css` declares as its contract.

## Contents
- [Stage → gates](#stage--gates)
- [Offline gates](#offline-gates)
- [Live gates](#live-gates)
- [Deep gates](#deep-gates)
- [Environment](#environment)

## Stage → gates

| Stage | Question | Offline | Live |
|---|---|---|---|
| 0 | Do runtime tokens equal the design source? | `token-parity` | — |
| 1 | Are the system files loaded? | `theme-registry-types`, `accent-drift`, `ds-artifact` | `live-probe` |
| 2 | Is a system applied? | `accent-drift` (boot markers) | `live-probe` |
| 3 | Is the boot pre-paint? | `accent-drift` (marker contract) | `live-probe` (scripts blocked), `font-prepaint` |
| 4 | `.page` + `.grain` rendered? | — | `live-probe` |
| 5 | Hardcoded values? | `palette-drift`, `standalone-palette-drift`, `lint-css` | — |
| 6 | Component compliance? | `stage6-contract` (touch targets only) | `ds-button-sweep` |
| 7 | Accent discipline? | — | `ink-accent` |
| 8 | Ink tiers? | — | `ink-accent` |
| 9 | Fonts actually paint? | `accent-drift` (link ↔ stacks) | `live-probe`, `ds-showcase`, `font-prepaint`, `webfont-fetch` |
| 10 | Skin blocks intact? | `skin-blocks`, `token-contract`, `accent-drift`, `lint-css` | — |
| 11 | Do all 5 systems restyle the page? | — | `live-probe`, `ds-showcase`; deep: `parity-systems`, `pixel-parity` |

Stages 4, 7 and 8 have **no offline coverage at all**. An offline run says
nothing about them.

## Offline gates

**`token-parity`** 🔴 — `scripts/validation/canonical-token-parity.mjs`
Resolves the *effective* cascade per system (layers, `!important`,
specificity, import order) on both sides and diffs runtime against
`awesome-list-site-ds/styles.css` + `design-systems.jsx`: every token, all 50
system × accent pairs, canonical utility rules (`.page`, `.grain`, `.card`…)
and per-system skin overrides. `DEVIATION …` lines in a passing log are
documented, reason-carrying differences — not findings. A `FAIL` names system,
token and both values. Fix the runtime, or — only if the difference is
deliberate — add a reasoned entry to `DOCUMENTED_DEVIATIONS` *and*
`docs/parity/assumptions/tokens.md`. Never edit the design source.

**`theme-registry-types`** 🔴 — compile-time proof that
`THEME_FALLBACK_REGISTRY` rejects unknown or duplicate ids. Needs `tsc`.

**`accent-drift`** 🔴 — the registry-mirror gate. Eleven comparisons between
`design-system.ts`, `design-system.css`, `font-options.ts` and
`client/index.html`: accent ids/values, default pair, Vite boot markers, one
token block per offered system, no skins for retired systems, font options ↔
boot data ↔ stylesheets, `SYSTEM_DEFAULT_ACCENT` completeness, and the
always-on font `<link>` byte-equal to the design's. Failure messages say which
two sources disagree.

**`token-contract`** 🔴 — every `:root[data-system]` block declares the token
set its peers agree on (or is listed with a reason in `MINIMAL_TOKEN_SYSTEMS`).

**`skin-blocks`** 🔴 *(built into the runner)* — rulebook stage-10 census on
the comment-stripped stylesheet: `[data-system]` selectors ≥ 60, `data-ds`
hooks ≥ 15, every system has component skins, every non-default system has a
token block. Catches "skins stripped in a refactor" (HANDOFF pitfall 3).

**`palette-drift`** 🟡 — five detectors over `client/src`: hex, `rgb()/rgba()`
not composed from `var(--…)`, Tailwind palette classes, raw radii/borders,
`font-family` literals. Shrink-only baseline keyed by (detector, file, token).
Output gives `file:line` and the matched token. Fix by routing through a token
/ bridge utility; a genuinely unavoidable literal (e.g. a frozen radius that
differs per system) takes `/* DS-OK: written reason */` on the same line or
within the 5 lines above. Palette classes have no escape hatch. Self-tests with
canaries every run.

**`standalone-palette-drift`** 🟡 — same scan over manifest-backed
`artifacts/*`, plus: `awesome-list-site-ds/` still byte-identical to its upload
archive (`attached_assets/*.zip`). A shallow/partial clone without that zip
makes this UNVERIFIED, not failed.

**`lint-css`** 🟡 — `stylelint client/**/*.css` with the token-contract plugin.

**`stage6-contract`** 🟡 — `ds-button-sweep.mjs --contract-only`: Button
primitive keeps the 44×44 floor across sizes and product profiles. This is
*not* the stray-element sweep — that needs the live gate.

**`ds-artifact`** 🟡 — `tokens.json` + generated docs are current. Fails after
any token change until `npm run generate:design-system-artifact`.

## Live gates

All take `BASE_URL` / `AUDIT_BASE_URL` (the runner sets both from `--base-url`).

**`live-probe`** 🔴/🟡 *(this skill)* — per `--routes` entry, in headless
Chromium via the repo's Playwright:
- stage 1 🔴 `window.applyDesignSystem`, 5 systems, 10 accents, `--bg` resolves
- stage 2 🔴 valid `data-system` / `data-accent`
- stage 3 🟡 attributes still set with **every external script aborted** —
  proves the inline boot, not the bundle, decides the theme (a
  "decided-before-the-bundle" proof, not a paint-timing one; pre-paint
  ordering is `font-prepaint`'s job, the script's static shape `accent-drift`'s)
- stage 4 🟡 `.page`, `.grain`
- stage 9 🟡 for each `--font-*` token, the face a real visible element uses
  (its weight + style) is loaded. Tokens nothing paints in are noted, not failed
- stage 11 🔴 cycling five systems flips the attribute and `--radius`,
  `--border-w`, `--font-display` diverge; 🟡 the first visible card, button and
  `h1` actually change computed style (identical across all five = hardcoded)

Evidence: `live-probe/<route>-<system>.png`, `<route>-switch-samples.json`
(the computed values per system — diff these to find the frozen property),
`live-probe.json`. Exit 1 = BLOCK, 2 = FIX only, 70 = could not run.

Limits: it runs signed-out, so `/admin` (and anything behind Clerk) is out of
its reach — those surfaces are covered by `ds-button-sweep` and `ink-accent`.
A route answering HTTP 404 *with the SPA shell* (the not-found page, by
design) is audited as rendered; non-HTML 4xx and 5xx are BLOCK. Every `NOTE …
not sampled` line is a stage the probe could not verify on that route (no
visible card / h1 / element painting in a token) — read them, don't skip them.
Screenshots are viewport-sized on purpose: a fullPage capture rebuilds the
FontFaceSet and would invalidate the stage-9 check taken just before it.

**`font-prepaint`** 🟡 — instruments writes to `data-font` / `--font-body` /
`--font-sans` and proves they land before first paint on every boot path,
including an unknown stored font id.

**`ds-showcase`** 🔴 — drives `/design-system`: each pill flips the attribute,
every token row equals the live computed value, tokens diverge across systems,
and every declared face paints at every inventoried weight — measured by
**rendered width** against the fallback, which is stricter than
`document.fonts.check`. Evidence in `/tmp/validation/ds-showcase`.

**`ds-button-sweep`** 🟡 *(needs `CLERK_SECRET_KEY`, `DATABASE_URL`)* — the six
stage-6 filters on public routes, with overlays open (cmdk, tag popover, mobile
filter sheet), signed-in routes and every admin tab, each with a detector
canary. Also asserts filter-literal parity with the rulebook — a comparison
of the *set* of quoted selector literals/regexes per snippet, so reordered or
inverted logic around the same literals passes it; read the snippet too. A hit prints
testid / aria-label / class / text → walk the stage-6 triage ladder before
calling it a violation.

**`ink-accent`** 🟡 *(needs `CLERK_SECRET_KEY`, `ADMIN_PASSWORD`)* — stages 7/8
over 5 systems × 2 widths × 4 surfaces = 40 rows, comparing **resolved** colors
with alpha. This is the working implementation of the two rulebook snippets
that can't match (see `rulebook-drift.md`). Evidence:
`docs/parity/evidence/audit-567-ink-accent/`.

**`webfont-fetch`** 🟡 *(network)* — every font stylesheet URL answers 200 with
an `@font-face` per requested family. Catches a family misspelled identically
on both sides, which the offline gate can't.

## Deep gates

`--deep` only; tens of minutes; need Clerk + admin env. Both rewrite
**tracked** evidence (`tests/parity/{actual,diff,expected,baseline}`,
`docs/parity/evidence/**`) — leave those out of every commit.

**`parity-systems`** 🔴 — `audit-567-browser.mjs --phase all`: drives
`/settings/theme` through systems × accents, 4 surfaces × 4 widths, axe on
every inventory row. Refuses to run over an existing checkpoint, so the
runner gives every run its own dir (`AUDIT_567_OUT=<evidence>/parity-systems/run`);
by hand, checkpoint in `.cache/audit-567-run` (`--resume` to continue).

**`pixel-parity`** 🟡 — `tests/parity/runner.mjs`: Editorial × Crimson vs the
design reference, pixelmatch threshold 0.1, ≤ 0.5 % differing pixels per
screen × width. Needs BOTH origins: the app (`BASE_URL`) and the design-system
artifact's Vite server (`ARTIFACT_BASE_URL`, workflow
`artifacts/awesome-video-design-system: web`, default :20928 — the runner's
`--artifact-base-url`); UNVERIFIED when the artifact is down. Report:
`docs/parity/REPORT.md`.

## Environment

| Need | Get it |
|---|---|
| deps | `npm ci` |
| Chromium | `npm run test:e2e:browsers` → `.cache/ms-playwright/`, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` |
| running app | `npm run dev` (port 5000, needs `DATABASE_URL`) |
| signed-in gates | `CLERK_SECRET_KEY`, `ADMIN_PASSWORD` (≥ 8 chars), `DATABASE_URL` — gates create and tear down their own `__qa_test_` users |

When one of these is missing the runner reports the gate UNVERIFIED with the
command that fixes it.
