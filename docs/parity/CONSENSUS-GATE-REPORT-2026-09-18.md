# Design-system consensus gate — 2026-09-18

Branch: `ds-consensus-gate` (off `main` @ `0809fa33`). Commits: `55773697`, `63d0d585`, `e834be72` (post-code-review hardening), plus this report and its tracked evidence under `docs/parity/evidence/consensus-gate-2026-09-18/`.
Source of truth: the attached zip, unpacked as the frozen `awesome-list-site-ds/` reference (not modified; no file under it was written).

## 1. State found

- `client/src/styles/design-system.css` already IS the port of the zip's five systems (Editorial, Terminal, Geist, Brutalist, Swiss) and ten accents. The only token deviation from the zip is the documented, approved Editorial `--text-3` alpha (0.40 → 0.52) for AA contrast (recorded in `docs/parity` and the parity reference adapter). Nothing was rewritten.
- The runtime exposes `applyDesignSystem`, `DESIGN_SYSTEMS`, `ACCENTS`, `SYSTEM_DEFAULT_ACCENT`; the inline synchronous `<head>` boot sets `data-system`/`data-accent` before first paint in dev and prod.
- `.agents/skills/verify-design-system/SKILL.md` described the 11 stages as console/grep one-liners with no protocol for running them in a real browser, no coverage matrix, and two stage rows whose prescribed proof was wrong in practice (Stage 3 keyed on a module global; Stage 9 used `document.fonts.check()`, which returns `false` for loaded families whose requested weight/subset is unused — evidence-verified against dev).
- `npm run test:parity` on `main` was a `SyntaxError` (`tests/parity/report.mjs` L130: unescaped backticks inside a template literal) — the pixel-parity runner could not start at all.
- Pixel parity on `main` (independent of this branch, verified by diffing `tests/parity/baseline/2026-09-17T11-42-39-272Z-11572` against the current tree): `app.resource.detail` and `app.about` rows now FAIL because commit `e83db51c` (2026-09-17, user-requested product repairs: "Restored visible detail actions, metadata and related content", About FAQ/intro copy from live data) removed the "More" `<details>` fold and changed About intro copy. The diff images show the divergence starting below the h1 (About) and at the always-expanded action/OG/related sections (resource detail); the About eyebrow row changed by 0 pixels. See §6.
- `npm run lint` has never been green on this repo (5,288 pre-existing errors on `main`); unchanged by this branch.

## 2. Changes (files + why)

| File | Change | Why |
|---|---|---|
| `.agents/skills/verify-design-system/SKILL.md` | +179/−5 lines: new "Browser execution protocol" (runtime, per-stage browser mechanics, 8×2×5 coverage matrix, prod-build rerun, wait for DS globals — prod prerenders `.page` before the bundle runs), evidence appendix under the verdict block, Stage 3 row rewritten to the real proof (inline synchronous head script + MutationObserver on `document`), Stage 9 row rewritten to `document.fonts.load()` non-empty result, narrow positive Stage 6 exclusions (see §3). Post-review (`e834be72`): Stage 3 proves `data-accent` as well as `data-system` (both before first paint, saved pair `terminal`/`matrix`), the Stage 9 contract snippet itself is the two-family `fonts.load()` proof (`check()` demoted to diagnostic), Clerk exclusions are per-control, ResourceDetail label exclusion checks face + 10px + `--accent`, false "bare `playwright` unresolvable" claim removed | Make the skill executable by an independent agent driving a real browser without reading the app source, with proofs that are true for this app. |
| `scripts/validation/ds-button-filter.mjs` | Stage 6 filters kept literal-identical with the skill snippets: About FAQ `<summary>` disclosure exclusion, Clerk `.cl-rootBox` positive check (buttons/inputs must paint `--accent`/`--font-display`), frozen resource-detail h1 body-face rule, Clerk `h1.cl-headerTitle` display-face rule, eyebrow `closest('[data-ds="chip"], .chip')` + frozen resource-detail h2 mono rule; post-review the Clerk clause also requires **the excluded control itself** to paint in a DS face (a Clerk button forced to a vendor font becomes a stray — verified live on prod, `evidence/…/harness/clerk-probe.mjs`), and the h2 clause also requires 10px + `--accent` ink; the two "list below"/"list in SKILL.md" comment differences (pre-existing on main) were unified | The repo gate (`ds-button-sweep`) and the skill must flag the same things; result 284/284 checks pass (`.cache/preflight/ds-sweep.log`). |
| `client/src/pages/About.tsx` | Eyebrow `<div className="about-eyebrow">` → `className="eyebrow about-eyebrow"` | Consume the DS `.eyebrow` helper (the page-local `.about-eyebrow` rule remains for its layout-only properties); pixel-neutral at that row (parity diff shows no change on the eyebrow line). |
| `client/src/pages/ThemeSettings.tsx` | Option radio-cards carry `data-ds="card-hover"`; font-sample caption dropped the hand-pinned `uppercase tracking-wider` | Cards get the contract hover treatment; the caption was a page-local eyebrow imitation outside the DS. |
| `tests/parity/report.mjs` | Escaped two backticks in a template literal | The parity runner was a hard `SyntaxError` on `main`. |

No back-end, schema, workflow, secret, or repo-structure changes. `awesome-list-site-ds/` untouched.

## 3. Skill improvements — changed vs preserved

Preserved verbatim: the 11 stages, their order and titles; the 🔴 BLOCK / 🟡 FIX / 🟢 NIT severity model and the per-stage severity assignments; the thresholds (PASS = zero BLOCK and zero FIX); the verdict block template and its section order; the "Acceptable hardcoded values" and "Intentional divergences" lists. The "Known composite chrome" list was **extended** (About FAQ disclosure rows, theme-picker option cards, Clerk widget, frozen ResourceDetail typography) — existing entries unchanged.

Changed / added:
- "Browser execution protocol": Playwright Chromium from `@playwright/test`, 1440×900 and 375×812, `networkidle` + `document.fonts.ready` + `.page` + `typeof window.applyDesignSystem === 'function'` before evaluating; `/login` follows the server redirect to `/sign-in`; a per-stage table saying exactly what browser mechanic proves each stage; the coverage matrix (home, about, journeys, category, resource detail, login, /settings/theme, 404 × 2 widths × 5 systems = 80 captures named `<screen>/<width>/<system>.png`); rerun against `npm run build && npm run start`.
- Stage 3 proof = inline synchronous `<head>` script that sets **both** `data-system` and `data-accent` and does not call the module's `applyDesignSystem`, plus MutationObserver on `document` (subtree) timing the later of the two attribute sets against first paint, for a fresh profile and a saved non-default pair (`terminal`/`matrix`).
- Stage 9 proof = the stage's own snippet now runs `document.fonts.load('16px "<family>"')` for the active display **and** body families and requires a non-empty, all-`loaded` face list for both (`fonts.check()` is false for unused weights/subsets and was producing false FIX findings; it is now diagnostic only).
- Stage 6 positive exclusions, each with the reason and mirrored in `ds-button-filter.mjs`: About FAQ disclosure trigger (not a `.btn`), Clerk-hosted widget (excluded per control, only while the widget's primary paints `--accent` AND that control paints in a DS face; the header must paint `--font-display`), frozen resource-detail title/section typography (h1 must paint `--font-body`; card-label h2s must paint `--font-mono` at 10px in `--accent`) — pixel-gated against the reference.
- Evidence appendix under the verdict block: target + commit, screenshot dir + count, Stage 3 timings, Stage 9 per-system faces, Stage 6 hits per cell, blocked/not-executed list.

## 4. Pre-flight commands and output (final tree)

```
$ npm run check
> rest-express@1.0.0 check
> tsc
EXIT=0
```

```
$ npm run lint      (pre-existing on main; unchanged by this branch — see §6)
> rest-express@1.0.0 lint
… 6312 lines omitted …
✖ 5311 problems (5288 errors, 23 warnings)
  332 errors and 2 warnings potentially fixable with the `--fix` option.

EXIT=1
```

```
$ npm run lint:css
> rest-express@1.0.0 lint:css
> stylelint "client/**/*.css"
EXIT=0
```

```
$ npm run validate:stylelint-system-tokens
> rest-express@1.0.0 validate:stylelint-system-tokens
> node scripts/validation/stylelint-design-system-token-contract.mjs
PASS stylelint-design-system-token-contract :: complete, partial, empty, valid-minimal, blank-reason, and stale-minimal editor diagnostics verified
EXIT=0
```

```
$ npm run build
> rest-express@1.0.0 build
> export BUILD_REVISION="${BUILD_REVISION:-$(git rev-parse HEAD 2>/dev/null)}" && if [ -z "$BUILD_REVISION" ]; then echo 'BUILD_REVISION is required when git metadata is unavailable' >&2; exit 1; fi && vite build && vite build --ssr src/entry-server.tsx --outDir ../dist/ssr --emptyOutDir false && esbuild server/index.ts --platform=node --packages=external --external:./vite-dev --bundle --format=esm --outdir=dist --define:process.env.BUILD_REVISION="$(node -p 'JSON.stringify(process.env.BUILD_REVISION)')"
…
../dist/ssr/entry-server.js                                          355.14 kB
../dist/ssr/assets/AdminDashboard-uTyMn5uo.js                        677.31 kB
✓ built in 2.24s
  dist/index.js  1.2mb ⚠️
⚡ Done in 50ms
EXIT=0
```

Additional gates run (final tree, `e834be72`): `node scripts/validation/ds-button-sweep.mjs` → ALL 284 CHECKS PASSED, including the six SKILL.md↔filter literal-parity checks (`evidence/…/preflight/ds-button-sweep.log`); own 80-capture harness (`evidence/…/harness/harness.mjs`) → FINDINGS 0 against dev and against the production build with the hardened Stage 3 (system+accent) and Stage 6 checks (`harness/dev-results.json`, `harness/prod-results.json`, `dev.log`, `prod.log`). `npm run check`, `lint:css` and `validate:stylelint-system-tokens` were unaffected by the post-review commit (it touched only the skill markdown and the filter script, which the sweep gate re-executed).

## 5. The gate — nine independent auditors across three panels, unanimous PASS

Each auditor received only the skill path, the app URL and a private output directory (`.cache/ds-consensus/task-template.md`, copied to `evidence/…/task-template.md`), drove Playwright Chromium through all 11 stages, cycled all five systems on the eight coverage screens at both widths, and reviewed a sample of its own captures. Panel 1 ran against the dev server and panel 2 against the production build, both with the skill at `63d0d585`. After the code review hardened the skill (`e834be72`: Stage 3 accent proof, Stage 9 snippet, per-control Stage 6 exclusions) a fresh panel 3 re-audited the production build with the final skill — the shipped artifact was unchanged (the post-review commit touched no client code), so the same `npm run build` output on port 5055 was audited.

| Auditor | Target | Skill @ | Verdict | BLOCK / FIX / NIT | Stage 3 | Stage 9 | Stage 11 | PNGs |
|---|---|---|---|---|---|---|---|---|
| ds-auditor-dev-a | dev :5000 | 63d0d585 | **PASS** | 0 / 0 / 0 | PASS | PASS | PASS | 95 |
| ds-auditor-dev-b | dev :5000 | 63d0d585 | **PASS** | 0 / 0 / 0 | PASS | PASS | PASS | 83 |
| ds-auditor-dev-c | dev :5000 | 63d0d585 | **PASS** | 0 / 0 / 0 | PASS | PASS | PASS | 114 |
| ds-auditor-prod-a | prod :5055 | 63d0d585 | **PASS** | 0 / 0 / 0 | PASS | PASS | PASS | 260 |
| ds-auditor-prod-b | prod :5055 | 63d0d585 | **PASS** | 0 / 0 / 0 | PASS | PASS | PASS | 260 |
| ds-auditor-prod-c | prod :5055 | 63d0d585 | **PASS** | 0 / 0 / 0 | PASS | PASS | PASS | 260 |
| ds-auditor-prod2-a | prod :5055 | e834be72 (final) | **PASS** | 0 / 0 / 0 | PASS | PASS | PASS | 260 |
| ds-auditor-prod2-b | prod :5055 | e834be72 (final) | **PASS** | 0 / 0 / 0 | PASS | PASS | PASS | 160 |
| ds-auditor-prod2-c | prod :5055 | e834be72 (final) | **PASS** | 0 / 0 / 0 | PASS | PASS | PASS | 83 |

Screenshot roots: `.cache/ds-consensus/<auditor>/<screen>/<width>/<system>.png` (auditors named widths `desktop`/`mobile` or `1440`/`375`; every root holds all 80 matrix cells plus hover/focus proofs; the per-auditor file lists are tracked as `evidence/…/auditors/<auditor>/png-manifest.txt`). PNG counts per auditor:

```
ds-auditor-dev-a 95
ds-auditor-dev-b 83
ds-auditor-dev-c 114
ds-auditor-prod-a 260
ds-auditor-prod-b 260
ds-auditor-prod-c 260
ds-auditor-prod2-a 260
ds-auditor-prod2-b 160
ds-auditor-prod2-c 83
```

### ds-auditor-dev-a — dev server http://127.0.0.1:5000, skill @ 63d0d585

Verbatim final message (stored at `docs/parity/evidence/consensus-gate-2026-09-18/auditors/ds-auditor-dev-a/VERDICT.md`; screenshots under `.cache/ds-consensus/ds-auditor-dev-a/`, manifest in `png-manifest.txt`):

> # Design-System Compliance Audit · Awesome.Video
> 
> **Verdict: PASS**
> 
> System detected: `editorial` × `crimson`
> Files audited: `client/index.html`, `client/src/index.css`, `client/src/styles/design-system.css`, `client/src`, `scripts/validation/palette-drift.mjs`, and all 8 required runtime routes
> 
> ## Findings
> 
> ### 🔴 BLOCK (0)
> None.
> 
> ### 🟡 FIX (0)
> None.
> 
> ### 🟢 NIT (0)
> None.
> 
> ## What's good
> - Stage 1 passed: function, 5 systems, 10 accents, tokens, and system rules loaded.
> - Stage 2 passed across all 80 matrix combinations.
> - Stage 3 passed: fresh `68.2ms ≤ 264ms`; saved Terminal `32.8ms ≤ 48ms`.
> - Stage 4 passed: `.page`, `.grain`, and atmosphere present throughout.
> - Stage 5 passed: palette-drift reported zero off-system drift.
> - Stage 6 passed: zero hits from all six filters across the full matrix.
> - Stage 7 passed: scan count 0 (threshold ≤8); real primary/card hover and keyboard-focus screenshots captured.
> - Stage 8 passed: zero long-copy `--text-3` offenders.
> - Stage 9 passed: all display/body font loads succeeded in all 80 combinations.
> - Stage 10 passed: 80 system rules and 26 `data-ds` rules; active rules reachable throughout.
> - Stage 11 passed: all 80 required captures completed; every screen/width group produced five distinct hashes.
> 
> ## Recommended next steps
> 1. Ship; no DS-contract remediation is required.
> 
> ## Evidence
> - Target: http://127.0.0.1:5000 (dev, commit `63d0d5852462f47cf45f0368a28767c37653b68b`)
> - Screenshots: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-dev-a/` — 95 files (80 matrix + 15 interaction proofs)
> - Stage 3 proof: attr-set 68.2ms ≤ first-paint 264ms (fresh) · 32.8ms ≤ 48ms (saved Terminal)
> - Stage 9 proof: Editorial Fraunces/Inter → true/true; Terminal IBM Plex Mono/IBM Plex Mono → true/true; Geist Geist/Geist → true/true; Brutalist Instrument Serif/Space Grotesk → true/true; Swiss Manrope/Manrope → true/true, on every screen and width
> - Stage 6 hits per screen/width/system: none
> - Visual sample: Editorial showed crimson rounded editorial styling; Terminal switched to green monospace square chrome; Brutalist showed amber, zero-radius, thick-border/slab styling; Swiss mobile used compact orange Swiss styling. The login Clerk card and mobile DS 404 page rendered coherently.
> - Blocked / not executed: none
> 
> | Stage | Result | One-line evidence |
> |---:|:---:|---|
> | 1 | PASS | `applyDesignSystem` true; systems=5; accents=10; `--bg=#000000`; system rule reachable. |
> | 2 | PASS | System, default accent, and non-empty `--bg` resolved in every matrix entry. |
> | 3 | PASS | Inline synchronous head boot sets the system without calling the module global; both first mutations preceded paint. |
> | 4 | PASS | `.page`, `.grain`, and non-empty `--bg-atmosphere` found in all 80 combinations. |
> | 5 | PASS | `palette-drift.mjs` passed all five detectors with zero drift beyond baseline. |
> | 6 | PASS | Buttons, inputs, chips, cards, h1s, and eyebrows produced zero stray hits across 8×2×5. |
> | 7 | PASS | Accent count was 0 throughout; real hover/focus proofs are under `interactions/`. |
> | 8 | PASS | No long `p`/`li` painted with `--text-3`. |
> | 9 | PASS | `document.fonts.load()` returned loaded faces for both active families in every system. |
> | 10 | PASS | Source counts were 80 system selectors and 26 bridge hooks; each active rule was reachable in-page. |
> | 11 | PASS | 80/80 required screenshots captured; five distinct hashes for each of 16 screen/width groups, with no symptom-table breakage observed. |
> 
> Absolute output directory: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-dev-a/`
> 
> PNG count: **95**

### ds-auditor-dev-b — dev server http://127.0.0.1:5000, skill @ 63d0d585

Verbatim final message (stored at `docs/parity/evidence/consensus-gate-2026-09-18/auditors/ds-auditor-dev-b/VERDICT.md`; screenshots under `.cache/ds-consensus/ds-auditor-dev-b/`, manifest in `png-manifest.txt`):

> # Design-System Compliance Audit · Awesome.Video
> 
> **Verdict: PASS**
> 
> System detected: `editorial` × `crimson`
> Files audited: `client/index.html`, `client/src/index.css`, `client/src/styles/design-system.css`, `client/src`, and `/`, `/about`, `/journeys`, `/category/community-events`, `/resource/185563`, `/login` → `/sign-in`, `/settings/theme`, `/this-route-does-not-exist-404`
> 
> ## Findings
> 
> ### 🔴 BLOCK (0)
> None.
> 
> ### 🟡 FIX (0)
> None.
> 
> ### 🟢 NIT (0)
> None.
> 
> ## What's good
> - ✅ Stage 1 — Runtime exposed `applyDesignSystem`, 5 systems, 10 accents, `--bg`, and system rules.
> - ✅ Stage 2 — All 80 states resolved the requested system, default accent, and `--bg`.
> - ✅ Stage 3 — Editorial attr-set 55.1 ms ≤ first-paint 176.0 ms; saved Terminal 47.9 ms ≤ 148.0 ms.
> - ✅ Stage 4 — `.page`, `.grain`, and `--bg-atmosphere` passed all 80 states.
> - ✅ Stage 5 — Canonical palette-drift gate passed all five detectors.
> - ✅ Stage 6 — All six component filters returned zero hits across 80 states.
> - ✅ Stage 7 — Prescribed accent scan was ≤8; real hover/focus evidence captured.
> - ✅ Stage 8 — Zero long-copy `--text-3` offenders.
> - ✅ Stage 9 — Forced display/body font loads passed every state.
> - ✅ Stage 10 — 80 system selectors, 26 `data-ds` selectors, and browser-reachable active rules.
> - ✅ Stage 11 — 80 matrix captures completed with distinct cross-system hashes and no visible symptom-table failures.
> 
> ## Recommended next steps
> 1. Ship with existing DS validation gates retained.
> 2. Preserve this evidence for commit `63d0d5852462f47cf45f0368a28767c37653b68b`.
> 
> ## Evidence
> - Target: http://127.0.0.1:5000 (dev, commit `63d0d5852462f47cf45f0368a28767c37653b68b`)
> - Screenshots: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-dev-b` — 83 files (80 matrix + 3 interaction captures)
> - Stage 3 proof: attr-set 55.1 ms ≤ first-paint 176.0 ms (fresh) · 47.9 ms ≤ 148.0 ms (saved Terminal)
> - Stage 9 proof: Editorial Fraunces/Inter true/true; Terminal IBM Plex Mono/IBM Plex Mono true/true; Geist Geist/Geist true/true; Brutalist Instrument Serif/Space Grotesk true/true; Swiss Manrope/Manrope true/true.
> - Stage 6 hits per screen/width/system: none.
> - Blocked / not executed: none.
> - Representative inspection: Brutalist showed heavy square borders; Swiss showed restrained hairlines; Terminal showed green mono/bracket styling; Geist showed cyan rounded surfaces; Editorial retained display typography and themed Clerk UI. No black/empty pages, fallback fonts, missing Terminal treatment, or visual collapse appeared.
> 
> ## Per-stage results
> 
> | Stage | Result | One-line evidence |
> |---|---|---|
> | 1 | PASS | Function/5 systems/10 accents/`#000000` `--bg`/rule presence passed; DS CSS import is first. |
> | 2 | PASS | System, accent, and `--bg` resolved in all 80 states. |
> | 3 | PASS | Inline synchronous boot: 55.1≤176.0 ms fresh; 47.9≤148.0 ms saved Terminal. |
> | 4 | PASS | `.page`, `.grain`, and atmosphere present throughout. |
> | 5 | PASS | Palette-drift passed hex, palette, rgb(a), radius, and font detectors. |
> | 6 | PASS | Button/input/chip/card/h1/eyebrow filters: zero hits. |
> | 7 | PASS | Accent scan ≤8; primary hover, card hover, and keyboard-focus screenshots captured. |
> | 8 | PASS | Zero long-copy tertiary-ink offenders. |
> | 9 | PASS | `fonts.load()` returned non-empty loaded faces for both families in every state. |
> | 10 | PASS | Source counts 80/26; matching active rules browser-reachable everywhere. |
> | 11 | PASS | 80 required captures, no identical cross-system hashes, no sampled visual failures. |
> 
> Absolute output directory: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-dev-b/`
> 
> PNG count: **83**

### ds-auditor-dev-c — dev server http://127.0.0.1:5000, skill @ 63d0d585

Verbatim final message (stored at `docs/parity/evidence/consensus-gate-2026-09-18/auditors/ds-auditor-dev-c/VERDICT.md`; screenshots under `.cache/ds-consensus/ds-auditor-dev-c/`, manifest in `png-manifest.txt`):

> # Design-System Compliance Audit · Awesome.Video
> 
> **Verdict: PASS**
> 
> System detected: `editorial` × `crimson`
> Files audited: `client/index.html`, `client/src/index.css`, `client/src/styles/design-system.css`, `client/src`, and all required runtime routes
> 
> ## Findings
> 
> ### 🔴 BLOCK (0)
> None.
> 
> ### 🟡 FIX (0)
> None.
> 
> ### 🟢 NIT (0)
> None.
> 
> ## What's good
> - ✅ Stage 1: Runtime exposes 5 systems, 10 accents, `applyDesignSystem`, tokens, and reachable system rules.
> - ✅ Stage 2: Every matrix capture had a system, default accent, and non-empty `--bg`.
> - ✅ Stage 3: Synchronous inline boot passed; fresh `36.3ms ≤ 96ms` first paint and saved Terminal `40.1ms ≤ 108ms`.
> - ✅ Stage 4: `.page`, `.grain`, and `--bg-atmosphere` were present throughout.
> - ✅ Stage 5: Palette-drift gate passed all five detectors with no unapproved drift.
> - ✅ Stage 6: All six filters returned zero hits across 80 screen/width/system combinations.
> - ✅ Stage 7: Accent scan stayed within threshold; real hover and keyboard focus proofs were captured.
> - ✅ Stage 8: Zero long-copy `--text-3` offenders.
> - ✅ Stage 9: Display/body `document.fonts.load()` proofs passed in every system and matrix row.
> - ✅ Stage 10: 80 system rules and 26 `data-ds` source hits; active rules were reachable in every row.
> - ✅ Stage 11: All 80 required captures completed; each screen/width produced five distinct hashes, and sampled captures showed distinct, intact systems.
> 
> ## Recommended next steps
> 1. Ship; no BLOCK or FIX findings were found.
> 
> ## Evidence
> - Target: http://127.0.0.1:5000 (dev, commit `63d0d5852462f47cf45f0368a28767c37653b68b`)
> - Screenshots: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-dev-c` — 114 PNG files (80 required matrix captures plus 34 hover/focus proofs)
> - Stage 3 proof: attr-set `36.3ms ≤ 96ms` (fresh) · `40.1ms ≤ 108ms` (saved Terminal)
> - Stage 9 proof: Editorial `Fraunces/Inter → true`; Terminal `IBM Plex Mono/IBM Plex Mono → true`; Geist `Geist/Geist → true`; Brutalist `Instrument Serif/Space Grotesk → true`; Swiss `Manrope/Manrope → true`, across all screens and widths
> - Stage 6 hits per screen/width/system: none
> - Blocked / not executed: none
> - Representative image review: Home Editorial/Terminal/Brutalist visibly differed; Swiss mobile remained structured; Brutalist category cards, Geist Theme Settings, Terminal 404, Clerk sign-in, mobile resource, and Swiss journeys appeared intact. See `notes.txt`.
> 
> | Stage | Result | One-line evidence |
> |---:|:---:|---|
> | 1 | PASS | `applyDesignSystem=true`, systems=5, accents=10, `--bg=#000000`, rules reachable. |
> | 2 | PASS | System/accent/background resolved in all 80 rows. |
> | 3 | PASS | Inline synchronous boot and both pre-paint timing proofs passed. |
> | 4 | PASS | `.page`, `.grain`, and atmosphere present in all rows. |
> | 5 | PASS | `palette-drift.mjs` passed; evidence in `stage5-gate.txt` and `stage5-rg.txt`. |
> | 6 | PASS | Zero button/input/chip/card/h1/eyebrow filter hits. |
> | 7 | PASS | Accent count ≤8 everywhere; real hover/focus screenshots captured. |
> | 8 | PASS | Zero tertiary-ink long-copy offenders. |
> | 9 | PASS | Both active families loaded successfully in all five systems and 80 rows. |
> | 10 | PASS | Source counts 80/26 and active CSS rules reachable in-page. |
> | 11 | PASS | 8 screens × 2 widths × 5 systems captured; five unique hashes per screen/width. |
> 
> Output directory: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-dev-c`
> 
> PNG count: **114**

### ds-auditor-prod-a — production build http://127.0.0.1:5055, skill @ 63d0d585

Verbatim final message (stored at `docs/parity/evidence/consensus-gate-2026-09-18/auditors/ds-auditor-prod-a/VERDICT.md`; screenshots under `.cache/ds-consensus/ds-auditor-prod-a/`, manifest in `png-manifest.txt`):

> # Design-System Compliance Audit · Awesome.Video production site
> 
> **Verdict: PASS**
> 
> System detected: `editorial` × `crimson`
> Files audited: `client/index.html`; `client/src/index.css`; `client/src/styles/design-system.css`; `client/src` (Stage 5 scans); `/`, `/about`, `/journeys`, `/category/community-events`, `/resource/185563`, `/login` → `/sign-in`, `/settings/theme`, and `/this-route-does-not-exist-404`
> 
> ## Findings
> 
> ### 🔴 BLOCK (0)
> None.
> 
> ### 🟡 FIX (0)
> None.
> 
> ### 🟢 NIT (0)
> None.
> 
> ## What's good
> - ✅ Stage 1 passed: runtime exposes five systems, ten accents, `applyDesignSystem`, tokens, and system rules.
> - ✅ Stage 2 passed: every matrix case resolved system, default accent, and `--bg`.
> - ✅ Stage 3 passed: synchronous inline boot; fresh `64.8 ms ≤ 292 ms` first paint and saved Terminal `47.8 ms ≤ 188 ms`.
> - ✅ Stage 4 passed: `.page`, `.grain`, and atmosphere token were present throughout.
> - ✅ Stage 5 passed: `palette-drift` reported zero off-system drift.
> - ✅ Stage 6 passed: all six filters produced zero hits across 80 cases.
> - ✅ Stage 7 passed: accent scan produced no overuse; real button/card hover and keyboard-focus captures were taken where applicable.
> - ✅ Stage 8 passed: zero long-copy `--text-3` offenders.
> - ✅ Stage 9 passed: display/body faces loaded in every system and matrix case.
> - ✅ Stage 10 passed: 80 system selectors, 26 `data-ds` lines, and reachable active rules.
> - ✅ Stage 11 passed: all 80 required captures were taken; every screen/width had five distinct hashes. Sample inspection showed clearly distinct Editorial, Terminal, Geist, Brutalist, and Swiss treatments, intact mobile layout, themed Clerk UI, and the DS 404 page.
> 
> ## Recommended next steps
> 1. None — ship it.
> 
> ## Evidence
> - Target: http://127.0.0.1:5055 (production build, commit `63d0d5852462f47cf45f0368a28767c37653b68b`)
> - Screenshots: `.cache/ds-consensus/ds-auditor-prod-a/` — 260 PNGs total, including 80 required matrix captures (8 screens × 2 widths × 5 systems) and 180 interaction captures.
> - Stage 3 proof: attr-set `64.8 ms ≤ 292 ms` first-paint (fresh) · `47.8 ms ≤ 188 ms` (saved Terminal).
> - Stage 9 proof: Editorial Fraunces/Inter → true; Terminal IBM Plex Mono/IBM Plex Mono → true; Geist Geist/Geist → true; Brutalist Instrument Serif/Space Grotesk → true; Swiss Manrope/Manrope → true. Category, resource, and login had no `.display-h` consumer; other screens’ computed consumers were recorded in `summary.txt`.
> - Stage 6 hits per screen/width/system: none.
> - Blocked / not executed: none.
> 
> | Stage | Result | One-line evidence |
> |---:|:---:|---|
> | 1 | PASS | Function + 5 systems + 10 accents + `#000` background + reachable system CSS. |
> | 2 | PASS | All 80 cases had the requested system, mapped accent, and non-empty `--bg`. |
> | 3 | PASS | Static synchronous head boot and both pre-paint runtime timings passed. |
> | 4 | PASS | `.page`, `.grain`, and non-empty `--bg-atmosphere` in all cases. |
> | 5 | PASS | Source gate passed all five detectors with zero drift. |
> | 6 | PASS | Buttons, inputs, chips, cards, titles, and eyebrows: zero hits. |
> | 7 | PASS | Accent count ≤8 (maximum 0); real hover/focus evidence captured. |
> | 8 | PASS | Zero long-copy tertiary-ink offenders. |
> | 9 | PASS | Forced `document.fonts.load()` returned loaded faces for both families in all cases. |
> | 10 | PASS | Source counts 80/26 and active-system CSSOM reachability passed. |
> | 11 | PASS | 80/80 matrix PNGs; five unique system hashes per screen/width; sample visually inspected. |
> 
> Absolute output directory: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod-a`
> 
> PNG count: **260**

### ds-auditor-prod-b — production build http://127.0.0.1:5055, skill @ 63d0d585

Verbatim final message (stored at `docs/parity/evidence/consensus-gate-2026-09-18/auditors/ds-auditor-prod-b/VERDICT.md`; screenshots under `.cache/ds-consensus/ds-auditor-prod-b/`, manifest in `png-manifest.txt`):

> # Design-System Compliance Audit · Awesome.Video production site
> 
> **Verdict: PASS**
> 
> System detected: `editorial` × `crimson`
> Files audited: `client/index.html`, `client/src/index.css`, `client/src/styles/design-system.css`, `client/src`, `scripts/validation/palette-drift.mjs`, and the 8-screen production coverage matrix at `http://127.0.0.1:5055`
> 
> ## Findings
> 
> ### 🔴 BLOCK (0)
> None.
> 
> ### 🟡 FIX (0)
> None.
> 
> ### 🟢 NIT (0)
> None.
> 
> ## What's good
> - Stage 1 — Runtime exposed all 5 systems, 10 accents, `applyDesignSystem`, `--bg`, and reachable skin rules.
> - Stage 2 — System, accent, and background tokens resolved in all 80 combinations.
> - Stage 3 — Synchronous inline head boot passed; fresh Editorial was set at 63.9 ms ≤ first paint 304 ms, and saved Terminal at 40.9 ms ≤ 176 ms.
> - Stage 4 — `.page`, `.grain`, and non-empty `--bg-atmosphere` passed throughout the matrix.
> - Stage 5 — `palette-drift.mjs` passed all five detectors and canaries with no unallowlisted drift.
> - Stage 6 — All six component filters returned zero hits across 80 combinations.
> - Stage 7 — The contract accent scan returned 0 (≤8) across all 80 combinations; real hover/focus proofs were captured where applicable.
> - Stage 8 — No body-copy violation remained after triage; raw matches were hidden `print-only` URL metadata, for which tertiary ink is permitted.
> - Stage 9 — Forced font loads passed: Editorial Fraunces/Inter; Terminal IBM Plex Mono/IBM Plex Mono; Geist Geist/Geist; Brutalist Instrument Serif/Space Grotesk; Swiss Manrope/Manrope. Display consumers were also recorded per screen.
> - Stage 10 — Source counts were 80 system-selector lines and 26 `data-ds` lines; every active system also had an in-page reachable skin rule.
> - Stage 11 — All 80 canonical captures were pixel-distinct across systems. Sample inspection confirmed Editorial’s crimson rounded treatment, Terminal’s green mono/bracket treatment, Brutalist’s amber square/high-border treatment, and Swiss/Geist mobile typography and accent changes without collapse.
> 
> ## Recommended next steps
> 1. Ship it.
> 
> ## Evidence
> - Target: http://127.0.0.1:5055 (production build, commit `63d0d5852462f47cf45f0368a28767c37653b68b`)
> - Screenshots: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod-b` — 260 PNG files (80 canonical matrix captures plus 180 hover/focus proofs)
> - Stage 3 proof: attr-set 63.9 ms ≤ first-paint 304 ms (fresh) · 40.9 ms ≤ 176 ms (saved terminal)
> - Stage 9 proof: `editorial → Fraunces/Inter → true/true`; `terminal → IBM Plex Mono/IBM Plex Mono → true/true`; `geist → Geist/Geist → true/true`; `brutalist → Instrument Serif/Space Grotesk → true/true`; `swiss → Manrope/Manrope → true/true`
> - Stage 6 hits per screen/width/system: none across 80 combinations
> - Blocked / not executed: none
> 
> | Stage | Status | One-line evidence |
> |---:|:---:|---|
> | 1 | PASS | Browser runtime: function present, 5 systems, 10 accents, `--bg: #000`, skin rule reachable. |
> | 2 | PASS | All 80 rows had non-empty `data-system`, `data-accent`, and `--bg`. |
> | 3 | PASS | Static synchronous head setter plus pre-paint fresh and saved-choice runtime proofs passed. |
> | 4 | PASS | `.page`, `.grain`, and atmosphere token present in every matrix row. |
> | 5 | PASS | Palette-drift gate passed all five regex detectors, parity checks, and canaries. |
> | 6 | PASS | Buttons, inputs, chips, cards, H1s, and eyebrows: zero strays in all 80 rows. |
> | 7 | PASS | Exact accent-user snippet: maximum 0; 80 button-hover and 80 keyboard-focus proofs plus 20 available card-hover proofs captured. |
> | 8 | PASS | Only hidden print URL metadata matched; no long-form body copy used tertiary ink. |
> | 9 | PASS | Both first-family faces loaded with non-empty, all-loaded face arrays for all five systems. |
> | 10 | PASS | Source counts 80/26 and active-system CSS reachability passed in all 80 rows. |
> | 11 | PASS | 8 screens × 2 widths × 5 systems captured; no identical five-system set and no symptom-table failure observed. |
> 
> Output directory: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod-b`
> 
> PNG count: **260**

### ds-auditor-prod-c — production build http://127.0.0.1:5055, skill @ 63d0d585

Verbatim final message (stored at `docs/parity/evidence/consensus-gate-2026-09-18/auditors/ds-auditor-prod-c/VERDICT.md`; screenshots under `.cache/ds-consensus/ds-auditor-prod-c/`, manifest in `png-manifest.txt`):

> # Design-System Compliance Audit · Awesome.Video production site
> 
> **Verdict: PASS**
> 
> System detected: `editorial` × `crimson`
> Files audited: `client/index.html`, `client/src/index.css`, `client/src/styles/design-system.css`, `client/src`, `scripts/validation/palette-drift.mjs`, and the rendered coverage routes
> 
> ## Findings
> 
> ### 🔴 BLOCK (0)
> None.
> 
> ### 🟡 FIX (0)
> None.
> 
> ### 🟢 NIT (0)
> None.
> 
> ## What's good
> - Stage 1 passed: DS globals, five systems, ten accents, tokens, and system rules loaded.
> - Stage 2 passed: system, accent, and `--bg` resolved in all 80 matrix cells.
> - Stage 3 passed: inline synchronous head boot; fresh `37.0ms ≤ 180.0ms` first paint and saved Terminal `42.4ms ≤ 172.0ms`.
> - Stage 4 passed: `.page`, `.grain`, and atmosphere token present throughout.
> - Stage 5 passed: palette-drift gate reported zero unapproved color/radius/font drift.
> - Stage 6 passed: all six filters produced zero hits across 80 cells.
> - Stage 7 passed: contract accent-user count was 0 throughout; real hover/focus evidence was captured and all 80 keyboard checks showed a visible 2px accent outline.
> - Stage 8 passed: zero long-copy `--text-3` offenders.
> - Stage 9 passed: all active display/body faces loaded in every cell: Editorial `Fraunces/Inter`, Terminal `IBM Plex Mono/IBM Plex Mono`, Geist `Geist/Geist`, Brutalist `Instrument Serif/Space Grotesk`, Swiss `Manrope/Manrope`.
> - Stage 10 passed: 80 system selectors and 26 `data-ds` source rules; an active-system rule was reachable in all 80 cells.
> - Stage 11 passed: all five systems rendered distinctly on every screen and width; no identical screenshot hashes or symptom-table failures.
> 
> ## Recommended next steps
> 1. Ship the audited production build.
> 
> ## Evidence
> - Target: http://127.0.0.1:5055 (production build, commit `63d0d5852462f47cf45f0368a28767c37653b68b`)
> - Screenshots: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod-c/` — 260 PNGs, including all 80 required matrix captures (8 screens × 2 widths × 5 systems) plus hover/focus evidence.
> - Stage 3 proof: attr-set `37.0ms ≤ 180.0ms` (fresh) · `42.4ms ≤ 172.0ms` (saved Terminal).
> - Stage 9 proof: Editorial `Fraunces/Inter → true/true`; Terminal `IBM Plex Mono/IBM Plex Mono → true/true`; Geist `Geist/Geist → true/true`; Brutalist `Instrument Serif/Space Grotesk → true/true`; Swiss `Manrope/Manrope → true/true`.
> - Stage 6 hits per screen/width/system: none.
> - Blocked / not executed: none.
> 
> | Stage | Result | One-line evidence |
> |---:|:---:|---|
> | 1 | PASS | Browser reported function=true, systems=5, accents=10, `--bg=#000`, rule=true. |
> | 2 | PASS | All 80 cells had valid system/default accent and non-empty `--bg`. |
> | 3 | PASS | Synchronous inline head script; both fresh and saved themes preceded first paint. |
> | 4 | PASS | `.page`, `.grain`, and `--bg-atmosphere` passed in all cells. |
> | 5 | PASS | `palette-drift.mjs` passed every detector and canary with zero unapproved drift. |
> | 6 | PASS | Buttons, inputs, chips, cards, titles, and eyebrows: zero hits in 80 cells. |
> | 7 | PASS | Exact scan ≤8 everywhere; 80 button-hover, 20 applicable card-hover, and 80 focus captures. |
> | 8 | PASS | Zero long-form `--text-3` matches. |
> | 9 | PASS | Forced `document.fonts.load()` returned loaded faces for both families in all 80 cells. |
> | 10 | PASS | Source counts 80/26; runtime active-system selector reachable everywhere. |
> | 11 | PASS | 80 required captures exist, systems differ by hash, and representative images were inspected. |
> 
> Absolute output directory: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod-c/`
> 
> PNG count: **260**

### ds-auditor-prod2-a — production build http://127.0.0.1:5055, skill @ e834be72 (final)

Verbatim final message (stored at `docs/parity/evidence/consensus-gate-2026-09-18/auditors/ds-auditor-prod2-a/VERDICT.md`; screenshots under `.cache/ds-consensus/ds-auditor-prod2-a/`, manifest in `png-manifest.txt`):

> # Design-System Compliance Audit · Awesome.Video
> 
> **Verdict: PASS**
> 
> System detected: `editorial` × `crimson`
> Files audited: `client/index.html`, `client/src/index.css`, `client/src/styles/design-system.css`, `client/src`, and runtime screens `/`, `/about`, `/journeys`, `/category/community-events`, `/resource/185563`, `/login` → `/sign-in`, `/settings/theme`, `/this-route-does-not-exist-404`
> 
> ## Findings
> 
> ### 🔴 BLOCK (0)
> None.
> 
> ### 🟡 FIX (0)
> None.
> 
> ### 🟢 NIT (0)
> None.
> 
> ## What's good
> - ✅ Stage 1: DS globals, tokens, and system rules loaded.
> - ✅ Stage 2: system, accent, and `--bg` resolved in all 80 matrix cells.
> - ✅ Stage 3: synchronous boot proved at system 56.5 ms / accent 56.5 ms ≤ first-paint 188 ms; saved Terminal/Matrix 65.8 ms / 65.8 ms ≤ 204 ms.
> - ✅ Stage 4: `.page`, `.grain`, and atmosphere token present throughout.
> - ✅ Stage 5: palette-drift gate passed with no unallowlisted drift.
> - ✅ Stage 6: all six sweeps produced zero hits; every cell rendered an `h1`.
> - ✅ Stage 7: zero over-threshold accent scans; real hover/focus captures recorded.
> - ✅ Stage 8: zero long-copy `--text-3` offenders.
> - ✅ Stage 9: all display/body font loads passed in every system and screen.
> - ✅ Stage 10: 80 system selectors, 26 `data-ds` lines, and reachable active-system CSS in every cell.
> - ✅ Stage 11: all 80 required captures completed; each screen/width had five distinct hashes and no listed switch symptom was observed.
> 
> ## Recommended next steps
> 1. Ship it; retain this evidence bundle with the release record.
> 
> ## Evidence
> - Target: http://127.0.0.1:5055 (production build, commit `e834be72b736cf0ca3596dcd89f8a3954b99d3a3`)
> - Screenshots: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod2-a/` — 260 PNGs total: 80 required matrix captures (8 screens × 2 widths × 5 systems) plus 180 hover/focus proofs.
> - Stage 3 proof: system 56.5 ms / accent 56.5 ms ≤ first-paint 188 ms (fresh) · system 65.8 ms / accent 65.8 ms ≤ 204 ms (saved Terminal/Matrix). Static proof found one matching synchronous inline head script setting both attributes without calling `applyDesignSystem`.
> - Stage 9 proof: Editorial → Fraunces/Inter → true/true; Terminal → IBM Plex Mono/IBM Plex Mono → true/true; Geist → Geist/Geist → true/true; Brutalist → Instrument Serif/Space Grotesk → true/true; Swiss → Manrope/Manrope → true/true. Per-screen `.display-h` consumers are recorded in `summary.json`; category, resource, and login correctly report no display-face consumer.
> - Stage 6 hits per screen/width/system: none across buttons, inputs, chips, cards, page titles, and eyebrows.
> - Blocked / not executed: none.
> - Representative image review: Home captures for all five desktop systems plus sampled About, category, login, theme-settings, and 404 captures were inspected. They visibly differed in accent, typography, border weight, corner geometry, and card/chip treatment. Terminal showed green mono outlines; Brutalist amber heavy square borders; Geist cyan restrained geometry; Swiss orange hairlines; Editorial crimson editorial styling. Sampled mobile pages remained contained, with no missing atmosphere, missing Terminal treatment, fallback font, or identical-system rendering.
> 
> | Stage | Result | One-line evidence |
> |---:|:---:|---|
> | 1 | PASS | Browser returned function/5 systems/10 accents/`#000` background/reachable system rule; foundation import is first in `index.css`. |
> | 2 | PASS | All 80 cells had the requested system, default accent, and non-empty `--bg`. |
> | 3 | PASS | Static synchronous head boot passed; fresh 56.5/56.5 ≤ 188 ms and saved 65.8/65.8 ≤ 204 ms. |
> | 4 | PASS | `.page`, `.grain`, and non-empty `--bg-atmosphere` passed 80/80. |
> | 5 | PASS | All five source scans were classified by `palette-drift`; gate reported no drift beyond the pinned allowlist. |
> | 6 | PASS | Six literal contract filters × 80 cells found zero strays; zero vacuous `h1` screens. |
> | 7 | PASS | Accent-user count was 0 (≤8) in all cells; primary hover 80/80, card hover on all 20 cells containing a candidate, and keyboard focus 80/80. |
> | 8 | PASS | Long-copy tertiary-ink scan found zero offenders across 80 cells. |
> | 9 | PASS | `document.fonts.load()` returned loaded faces for both roles in every system/cell. |
> | 10 | PASS | Source counts were 80/26; an active-system selector was reachable in-page 80/80. |
> | 11 | PASS | 80/80 required screenshots exist; all 16 screen/width groups contain five distinct image hashes and sampled captures showed no symptom-table failure. |
> 
> **Output directory:** `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod2-a/`  
> **PNG count:** `260`

### ds-auditor-prod2-b — production build http://127.0.0.1:5055, skill @ e834be72 (final)

Verbatim final message (stored at `docs/parity/evidence/consensus-gate-2026-09-18/auditors/ds-auditor-prod2-b/VERDICT.md`; screenshots under `.cache/ds-consensus/ds-auditor-prod2-b/`, manifest in `png-manifest.txt`):

> # Design-System Compliance Audit · Awesome.Video
> 
> **Verdict: PASS**
> 
> System detected: `editorial` × `crimson`
> Files audited: served production DOM for `/`, `/about`, `/journeys`, `/category/community-events`, `/resource/185563`, `/login` → `/sign-in`, `/settings/theme`, and `/this-route-does-not-exist-404`; `client/src`; `client/src/styles/design-system.css`; `client/index.html`
> 
> ## Findings
> 
> ### 🔴 BLOCK (0)
> None.
> 
> ### 🟡 FIX (0)
> None.
> 
> ### 🟢 NIT (0)
> None.
> 
> ## What's good
> - ✅ Stage 1 — DS globals, 5 systems, 10 accents, tokens, and system rules loaded.
> - ✅ Stage 2 — system, accent, and `--bg` resolved in all 80 matrix states.
> - ✅ Stage 3 — synchronous inline boot passed: fresh system 42.6 ms / accent 42.6 ms ≤ first-paint 176 ms; saved Terminal/Matrix system 41.3 ms / accent 41.3 ms ≤ first-paint 156 ms.
> - ✅ Stage 4 — `.page`, `.grain`, and `--bg-atmosphere` existed throughout.
> - ✅ Stage 5 — palette-drift gate passed all five detectors with zero unallowed drift.
> - ✅ Stage 6 — all six filters returned zero hits across 80 states.
> - ✅ Stage 7 — accent scan stayed ≤8; real primary/card hovers and keyboard focus proofs were captured where applicable.
> - ✅ Stage 8 — zero long-copy `--text-3` offenders.
> - ✅ Stage 9 — `document.fonts.load()` passed display and body faces in every system/state.
> - ✅ Stage 10 — 80 system selectors, 26 `data-ds` rules, and an active reachable skin rule in every state.
> - ✅ Stage 11 — all 80 required captures completed; each screen/width had five distinct hashes. Representative review showed clear typography, accent, border, radius, and surface changes without collapsed or empty pages.
> 
> ## Recommended next steps
> 1. Ship it.
> 
> ## Evidence
> - Target: http://127.0.0.1:5055 (production build, commit `e834be72b736cf0ca3596dcd89f8a3954b99d3a3`)
> - Screenshots: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod2-b` — 160 files (80 required matrix captures + 80 hover/focus captures)
> - Stage 3 proof: system 42.6 ms / accent 42.6 ms ≤ first-paint 176 ms (fresh) · system 41.3 ms / accent 41.3 ms ≤ 156 ms (saved Terminal/Matrix)
> - Stage 9 proof: Editorial → Fraunces/Inter → true/true; Terminal → IBM Plex Mono/IBM Plex Mono → true/true; Geist → Geist/Geist → true/true; Brutalist → Instrument Serif/Space Grotesk → true/true; Swiss → Manrope/Manrope → true/true. Per-screen `.display-h` consumers are recorded in `audit.json`; category, resource, and login had no display-face consumer.
> - Stage 6 hits per screen/width/system: none.
> - Blocked / not executed: none.
> 
> | Stage | Status | One-line evidence |
> |---:|:---:|---|
> | 1 | PASS | `applyDesignSystem` function; 5 systems; 10 accents; `--bg=#000`; system rules reachable. |
> | 2 | PASS | All 80 states had valid system/accent attributes and non-empty `--bg`. |
> | 3 | PASS | Static synchronous inline boot qualified; both fresh and saved attributes preceded first paint. |
> | 4 | PASS | `.page`, `.grain`, and atmosphere token passed in all states. |
> | 5 | PASS | `palette-drift.mjs` passed palette, hex, rgb, radii, and font-family gates. |
> | 6 | PASS | Buttons, inputs, chips, cards, titles, and eyebrows: zero filter hits. |
> | 7 | PASS | Exact accent-user scan max was 0; 80 primary hovers, 20 applicable card hovers, and 80 Tab-focus proofs captured. |
> | 8 | PASS | Zero long-form paragraphs/list items painted with `--text-3`. |
> | 9 | PASS | Forced display/body font loads returned loaded faces for every system in all 80 states. |
> | 10 | PASS | Source counts 80/26 exceeded thresholds; every active system had an in-page rule. |
> | 11 | PASS | 8 screens × 2 widths × 5 systems captured; all 16 groups had five distinct image hashes. |
> 
> Output directory: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod2-b/`
> 
> PNG count: **160**

### ds-auditor-prod2-c — production build http://127.0.0.1:5055, skill @ e834be72 (final)

Verbatim final message (stored at `docs/parity/evidence/consensus-gate-2026-09-18/auditors/ds-auditor-prod2-c/VERDICT.md`; screenshots under `.cache/ds-consensus/ds-auditor-prod2-c/`, manifest in `png-manifest.txt`):

> # Design-System Compliance Audit · Awesome.Video
> 
> **Verdict: PASS**
> 
> System detected: `editorial` × `crimson`
> Files audited: `client/index.html`, `client/src/index.css`, `client/src/styles/design-system.css`, `client/src/lib/design-system.ts`, covered runtime page DOM, `scripts/validation/ds-button-filter.mjs`, `scripts/validation/palette-drift.mjs`
> 
> ## Findings
> 
> ### 🔴 BLOCK (0)
> None.
> 
> ### 🟡 FIX (0)
> None.
> 
> ### 🟢 NIT (0)
> None.
> 
> ## What's good
> - ✅ Stage 1 — DS globals, five systems, ten accents, tokens, and skin rules loaded.
> - ✅ Stage 2 — system, accent, and `--bg` resolved in all 80 combinations.
> - ✅ Stage 3 — synchronous inline boot; fresh system 67.5 ms / accent 67.5 ms ≤ first-paint 284 ms; saved Terminal/Matrix 40 ms / 40 ms ≤ 176 ms.
> - ✅ Stage 4 — `.page`, `.grain`, and `--bg-atmosphere` present throughout.
> - ✅ Stage 5 — palette-drift gate passed with zero unexempted violations.
> - ✅ Stage 6 — all six filters returned no hits across the full matrix.
> - ✅ Stage 7 — accent scan stayed ≤8; real primary/card hover and keyboard-focus captures were inspected.
> - ✅ Stage 8 — no long-copy `--text-3` offenders.
> - ✅ Stage 9 — every `document.fonts.load()` proof passed: Editorial Fraunces/Inter; Terminal IBM Plex Mono/IBM Plex Mono; Geist Geist/Geist; Brutalist Instrument Serif/Space Grotesk; Swiss Manrope/Manrope.
> - ✅ Stage 10 — 80 system selectors and 26 `data-ds` source lines; active-system rules reachable throughout.
> - ✅ Stage 11 — all 80 matrix captures completed and each five-system set had distinct hashes; representative captures showed distinct type, borders, accents, and Terminal bracket treatments without symptom-table failures.
> 
> ## Recommended next steps
> 1. None — ship it.
> 
> ## Evidence
> - Target: http://127.0.0.1:5055 (production build, commit `e834be72b736cf0ca3596dcd89f8a3954b99d3a3`)
> - Screenshots: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod2-c` — 80 matrix files (8 screens × 2 widths × 5 systems), plus 3 interaction proofs
> - Stage 3 proof: system 67.5 ms / accent 67.5 ms ≤ first-paint 284 ms (fresh) · system 40 ms / accent 40 ms ≤ 176 ms (saved terminal/matrix)
> - Stage 9 proof: Editorial → Fraunces/Inter → true/true; Terminal → IBM Plex Mono/IBM Plex Mono → true/true; Geist → Geist/Geist → true/true; Brutalist → Instrument Serif/Space Grotesk → true/true; Swiss → Manrope/Manrope → true/true, on every screen and width
> - Stage 6 hits per screen/width/system: none
> - Blocked / not executed: none
> 
> | Stage | Status | One-line evidence |
> |---:|:---:|---|
> | 1 | PASS | Browser reported callable `applyDesignSystem`, 5 systems, 10 accents, nonempty tokens, and reachable skin rules. |
> | 2 | PASS | `data-system`, `data-accent`, and `--bg` were nonempty in all 80 combinations. |
> | 3 | PASS | Qualifying synchronous head boot found; both fresh and saved attributes landed before first paint. |
> | 4 | PASS | `.page`, `.grain`, and nonempty page atmosphere were present throughout. |
> | 5 | PASS | Canonical palette-drift gate passed all five detectors and canaries with zero unexempted hits. |
> | 6 | PASS | Buttons, inputs, chips, cards, page titles, and eyebrows produced zero filter hits across the matrix. |
> | 7 | PASS | Accent count was 0 by the prescribed scan; hover/focus proofs: `interaction-primary-hover.png`, `interaction-card-hover.png`, `interaction-focus-tab.png`. |
> | 8 | PASS | Prescribed scan found zero long-form paragraphs/list items painted with `--text-3`. |
> | 9 | PASS | Display and body faces loaded successfully via `document.fonts.load()` for every system/screen/width. |
> | 10 | PASS | Source counts 80/26 exceeded thresholds; every active system had an in-page matching rule. |
> | 11 | PASS | 80 required captures exist, no five-system set contained duplicate hashes, and representative visual inspection found no listed symptom. |
> 
> Output directory: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod2-c`
> 
> PNG count: **83** total (**80** coverage-matrix + **3** interaction evidence).

## 6. Left out, and why

- **Pixel-parity rows `app.about` and `app.resource.detail`** fail on `main` today (2.9% / 6.3% and 55.6% / 65.9% at 375 / 1440; run `tests/parity/baseline/2026-09-18T05-10-49-263Z-10039`). Cause: the 2026-09-17 user-requested product repairs (`e83db51c`) deliberately un-folded the resource-detail actions/OG/related/metadata sections and changed About intro/FAQ copy; the frozen prototype paints neither. Per the repo's contract-over-reference rule these rows are recorded rather than "fixed" by reverting requested product behaviour, editing the frozen source, or relaxing thresholds — all out of scope for a design-system pass. The About eyebrow change in this branch is pixel-neutral (the diff image is clean on that row).
- **`npm run lint`** stays red: 5,288 pre-existing errors across the repo predate this branch and are unrelated to design-system work; fixing them is a repo-wide lint campaign, not a DS change.
- **Consent banner** overlays the bottom of every capture (analytics consent not pre-seeded in the auditors' fresh profiles). It is DS-styled and passed every stage; it was left visible rather than dismissed so the captures show the true first-visit state.
- **Screenshots are not tracked**: ~1,600 PNGs (~1 GB) stay under the ignored `.cache/ds-consensus/`; every verdict, per-auditor results JSON/summary, PNG manifest, pre-flight log, harness and harness results are tracked under `docs/parity/evidence/consensus-gate-2026-09-18/` so the proof survives sharing the branch.
- **Code-review round**: an architect review of the branch raised five findings (Stage 3 ignored `data-accent`; Clerk/ResourceDetail exclusions not fail-closed; Stage 9 snippet still keyed on `check()`; comment-level non-identity between skill and filter; report claims about "verbatim" lists / `.cache`-only evidence). All five were fixed in `e834be72` and this revision of the report; the reviewer's note that the sweep gate's literal-parity check compares token sets rather than full snippet text is a pre-existing property of `ds-button-sweep.mjs` and was left as is (no gate weakening; a stricter comparator is a follow-up).
- **Not simulated**: no stage was inferred from source where the skill prescribes an in-page proof; every auditor reported "Blocked / not executed: none".
