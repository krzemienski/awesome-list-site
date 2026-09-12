# Gates run for the tokens task

All commands run from the repo root against the dev server on
`http://127.0.0.1:5000` (workflow "Start application"), after the last CSS
edit. Full logs stayed in `/tmp/parity-tokens/gate-<name>.log`; only the
verdict and the summary line are recorded here.

| gate | command | result | summary |
|---|---|---|---|
| canonical-token-parity (new) | `npm run validate:canonical-token-parity` | PASS | 5 systems, 10 accents, 165 shared values, 0 mismatches, 0 missing, 6 deviations honoured, 5 runtime-only, geometry 9/9, utilities 26/26 (86 declarations) |
| canonical-token-parity (validation step) | `startValidationRun` on the registered step | PASS | 513 ms |
| check | `npm run check` | PASS | tsc clean |
| lint:css | `npm run lint:css` | PASS | stylelint clean |
| validate:stylelint-system-tokens | `npm run validate:stylelint-system-tokens` | PASS | |
| validate:design-system-artifact | `npm run validate:design-system-artifact` | PASS | tokens.json up to date after `generate:design-system-artifact` |
| theme-registry-types | `npm run validate:theme-registry-types` | PASS | |
| palette-drift | `node scripts/validation/palette-drift.mjs` | PASS | |
| standalone-palette-drift | `node scripts/validation/standalone-palette-drift.mjs` | PASS | |
| accent-drift | `node scripts/validation/accent-drift.mjs` | PASS | |
| font-prepaint | `npm run validate:font-prepaint` | PASS | |
| root-script-drift | `node scripts/validation/root-script-drift.mjs` | PASS | |
| dead-exports | `node scripts/validation/dead-exports.mjs` | PASS | every export of the new gate has an importer (the gate itself / probes use the CLI) |
| test:unit | `npm run test:unit` | PASS | |
| ds-showcase | `node scripts/validation/design-system-showcase.mjs` | PASS | 20 s |
| ds-button-sweep | `node scripts/validation/ds-button-sweep.mjs` | PASS | 90 s |
| sticky-preview-audit | `node scripts/validation/sticky-preview-audit.mjs` | PASS | 5 s |
| responsive-audit | `node scripts/validation/responsive-audit.mjs` | PASS | 40 s |
| tablet-audit | `node scripts/validation/tablet-audit.mjs` | PASS | 37 s |
| print-audit | `node scripts/validation/print-audit.mjs` | PASS | 38 s |
| baseline:compare | `npm run baseline:compare -- --baseline tests/parity/production-baseline/2026-09-12 --against http://127.0.0.1:5000 --routes /,/category/encoding-codecs,/settings/theme` | exit 1 (deltas exist, as before) | route rows (`status`, redirects, testids ±, title, h1, axe 0/0) and all 12 API rows are **identical** to the committed pre-task local compare (`../prod-baseline/compare-local-2026-09-12-recheck.md`); deltas are the known dev-DB counts (1816 vs 3824 resources) and dev cache-control headers. Report: `baseline-compare-report.md` |
| lint | `npm run lint` | FAIL — pre-existing baseline | 5566 errors, of which 257 are the typed-lint "was not found by the project service" parse error that hits every `.mjs` script (103 files, including the sibling `generate-design-system-artifact.mjs`); the new gate contributes exactly one such line and nothing else. Under `@eslint/js` recommended rules the new file reports 0 problems (`eslint --no-config-lookup -c <recommended>`), while the pre-existing `accent-drift.mjs` reports 1. |
| test:e2e `sidebar-ux.spec.ts` | `npx playwright test tests/e2e/sidebar-ux.spec.ts --project=chromium` | 2 passed (desktop-1440), 4 failed (tablet-768, mobile-375 × BUG-007/BUG-043) — pre-existing | Re-run with the previous commit's `design-system.css` swapped in (HMR, then restored; SHA verified): **identical** 2 passed / 4 failed. The failing step is `waitForSelector('[data-testid^="toggle-cat-"]', visible)` at 768/375, where the sidebar lives in a drawer; unrelated to tokens. |
| test:e2e `search.spec.ts` | `npx playwright test tests/e2e/search.spec.ts --project=chromium` | 14 passed, 13 failed — stale spec | Every failing wait targets markup that exists in neither tree: `[data-testid^="card-category-"]`, heading /Search Resources/, buttons /Back to all categories/ and /Cancel/ (0 hits in `client/src` at HEAD and in this tree; removed in commit `dfb94b00`). |

`--json` dumps of the gate before and after the change are
`token-diff-before.json` and `token-diff-after.json`; the extracted models are
`canonical-tokens.json` and `app-tokens-after.json`.

## Review round 2 re-runs

After the cascade-aware gate rewrite, the `.admin-dashboard` measure change,
the artifact generator fix and the regenerated `tokens.json`. Logs stayed in
`/tmp/parity-tokens/r2/<name>.log`.

| gate | command | result | summary |
|---|---|---|---|
| canonical-token-parity | `npm run validate:canonical-token-parity` | PASS | 165 shared values, 0 mismatches, 6 deviations honoured, 6 runtime-only, geometry 9/9, responsive 2/2, utilities 26/26, 20/20 shadow rules, 7 sibling stylesheets (0 tracked), `PASS canaries :: 40 in-memory mutations … (control passes)` |
| canonical-token-parity (validation step) | `startValidationRun` on the registered step | PASSED | 1.7 s |
| review bypasses via `--app-css` | `later-root`, `later-chip`, `tablet-override` `/tmp` copies | all FAIL (exit 1) | rule 3 (+ `--text-3` proof), rule 8, rule 9 — `gate-mutations.md` |
| validate:design-system-artifact | `npm run validate:design-system-artifact` | PASS | tokens.json up to date after the merged-block generator regenerated it (+`--shell-footer-measure`) |
| product-profile-browser | `npm run validate:product-profile-browser` | PASS | 5 approved profiles; 18 route scenarios; cross-tab theme and font sync (20 s) |
| theme-registry-types | `npm run validate:theme-registry-types` | PASS | |
| palette-drift / standalone-palette-drift / accent-drift | `node scripts/validation/<name>.mjs` | PASS / PASS / PASS | |
| font-prepaint | `npm run validate:font-prepaint` | PASS | 6 saved font ids + unknown-id fallback |
| stylelint-system-tokens | `npm run validate:stylelint-system-tokens` | PASS | |
| check / lint:css / test:unit | `npm run check` / `npm run lint:css` / `npm run test:unit` | PASS / PASS / PASS | 270 unit tests, 13 files |
| root-script-drift / dead-exports | `node scripts/validation/<name>.mjs` | PASS / PASS | 27 root scripts, 0 stray; 781 exports, 731 imported, 50 pinned |
| ds-showcase / ds-button-sweep | `node scripts/validation/<name>.mjs` | PASS / PASS | 20 s; 284 checks (83 s) |
| sticky-preview-audit / tablet-audit / responsive-audit / print-audit | `node scripts/validation/<name>.mjs` | PASS ×4 | 30 / 32 / 49 checks, 0 failures |
| seo-snapshot (first completion run) | `node scripts/validation/seo-snapshot.mjs --gate --parity` | FAIL once → PASS solo | one `/tag/open-source` hydration-parity flake under gate contention; re-run alone 20/20 |

## Review round 3 re-runs

After the importance-aware resolver over every sheet, the selector-engine
shadow detection, the nesting/escape/media-list parser fixes and the 67-canary
suite. Same dev server; logs stayed in `/tmp/parity-tokens/r3/<name>.log`.

| gate | command | result | summary |
|---|---|---|---|
| canonical-token-parity | `npm run validate:canonical-token-parity` | PASS | 165 shared values, 0 mismatches, 0 missing, 7 deviations honoured, 13 runtime-only (sibling-owned skeleton/profile tokens now counted), geometry 9/9, responsive 2/2, 50/50 accent combos, utilities 26/26, 67/67 canaries; ≈4 s |
| review bypasses via `--app-css` | `important-root`, `attr-chip` (+ the round-2 trio) `/tmp` copies | all FAIL (exit 1) | rule 3 ×5 systems; rule 11 ×6 utilities — `gate-mutations.md` |
| self-review sweep via `--app-css` | 31 alternative spellings (`/tmp/parity-tokens/bypass/x-*.css`) | 28 FAIL, 3 correct PASS | nesting, hex escape and `not print` slipped through the first round-3 gate and are fixed + canaried; the PASS rows are print-only lists and `.CHIP` (case-sensitive) — `gate-mutations.md` |
| validate:design-system-artifact | `npm run validate:design-system-artifact` | PASS | tokens.json up to date |
| check / lint:css / test:unit | `npm run check` / `npm run lint:css` / `npm run test:unit` | PASS / PASS / PASS | 271 unit tests, 13 files |
| theme-registry-types / stylelint-system-tokens / font-prepaint | `npm run validate:<name>` | PASS ×3 | |
| palette-drift / standalone-palette-drift / accent-drift | `node scripts/validation/<name>.mjs` | PASS ×3 | |
| dead-exports / root-script-drift | `node scripts/validation/<name>.mjs` | PASS / PASS | 781 exports, 731 imported, 50 pinned; 27 root scripts |
| response-contract-drift | `npm run validate:response-contracts` | FAIL once → PASS solo | the completion run hit `GET /api/admin/contact-submissions` 500 while main's migration 0048 columns were not yet in the dev DB; 15/15 endpoint checks solo |
| ds-showcase / product-profile-browser | `node scripts/validation/design-system-showcase.mjs` / `npm run validate:product-profile-browser` | PASS / PASS | 20 checks; 5 profiles × 18 route scenarios |
| sticky-preview-audit / tablet-audit / responsive-audit / print-audit | `node scripts/validation/<name>.mjs` | PASS ×4 | 7 / 30 / 32 / 49 checks, 0 failures |
| ds-button-sweep | `node scripts/validation/ds-button-sweep.mjs` | FAIL once → see rerun below | first run: 211/212, `authed-scenario` Clerk headless sign-in `locator.waitFor` 30 s timeout (throwaway user); every CSS/DS check passed |
| ds-button-sweep (rerun) | `node scripts/validation/ds-button-sweep.mjs` | PASS | 284/284 checks on the third run; a trimmed debug copy that reached the authed scenario first also passed it, so the two earlier `authed-scenario` timeouts were Clerk dev-instance sign-in timing after ~60 s of public-route Clerk loads, not a DS or token regression |

## Review round 4 re-runs

After the ordered-cascade-layer resolver (`LayerOrder`, vendor sheet followed
through `node_modules`), the twelve layer/import canaries (79 total), the
depth-aware artifact generator and the memory scrub. No file under `client/`,
`shared/` or `artifacts/` changed in this round (scripts, evidence, docs and
memory only), so the round-3 e2e baseline (`sidebar-ux.spec.ts` desktop half
green, tablet/mobile half and `search.spec.ts` pre-existing red with the
identical failing set under `git show HEAD:` of the CSS) stands unchanged.
Same dev server; logs in `/tmp/parity-tokens/r4/<name>.log`.

| gate | command | result | summary |
|---|---|---|---|
| canonical-token-parity | `npm run validate:canonical-token-parity` | PASS | 165 shared values, 0 mismatches, 0 missing, 7 deviations honoured, 13 runtime-only, geometry 9/9, responsive 2/2, 50/50 accent combos, utilities 26/26, 8 sibling sheets (vendor `tailwindcss/index.css` now included), cascade layers `base < theme < components < utilities < unlayered`, 79/79 canaries; ≈13 s cold |
| round-4 review bypass via `--app-css` | live CSS + `@layer early { :where(.hide-tablet){display:block !important} } @layer late { .hide-tablet.hide-tablet{display:none !important} }` | gate before this round: PASS (exit 0) → round-4 gate: FAIL (exit 1) | rule 11: runtime resolves `block !important`, design `none !important` — transcript in `gate-mutations.md` |
| round-3 comparator regression probe | `--canaries-only` on a `/tmp` copy with the layered/unlayered bit restored | 5 canaries escape | `two-layer-important-earlier-wins`, `layer-statement-sets-order-fail`, `anonymous-layers-first-wins`, `nested-sublayer-precedes-parent`, `two-layer-normal-later-wins`; all 79 behave under the shipped comparator |
| browser agreement | `node scripts/validation/canonical-token-parity-browser-check.mjs` (dev server on the app port) | 11/11 agree | each layer canary's CSS rendered in Chromium at 900px; live `document.styleSheets` order `properties < base < theme < components < utilities` — `layer-order-browser.json` |
| validate:design-system-artifact | `npm run validate:design-system-artifact` | PASS | reader self-test (7 cases) + tokens.json up to date; old generator reported `stale` on a multi-line media-rule reformat, new one `up to date` |
| check / lint:css / test:unit | `npm run check` / `npm run lint:css` / `npm run test:unit` | PASS / PASS / PASS | 299 unit tests, 15 files |
| theme-registry-types / stylelint-system-tokens / font-prepaint | `npm run validate:<name>` | PASS ×3 | 6 saved font ids + unknown-id fallback |
| palette-drift / standalone-palette-drift / accent-drift | `node scripts/validation/<name>.mjs` | PASS ×3 | standalone: 3 roots, 82 source files |
| dead-exports / root-script-drift | `node scripts/validation/<name>.mjs` | PASS / PASS | 796 exports, 746 imported, 50 pinned; 27 root + active scripts, 0 stray |
| ds-showcase / ds-button-sweep | `node scripts/validation/design-system-showcase.mjs` / `node scripts/validation/ds-button-sweep.mjs` | PASS / PASS | 20 checks; 284 checks (QA admin torn down) |
| sticky-preview-audit / tablet-audit / responsive-audit / print-audit | `node scripts/validation/<name>.mjs` | PASS ×4 | 7 / 30 / 32 / 49 checks, 0 failures |
| eslint on the three scripts | `npx eslint -c /tmp/parity-tokens/eslint.mjs.config.mjs scripts/validation/canonical-token-parity.mjs scripts/validation/canonical-token-parity-browser-check.mjs scripts/generate-design-system-artifact.mjs` | PASS | repo `eslint .` stays pre-existing red on every `.mjs` (measured in round 1) |

## Review round 5 — after the spliced-import document model

After `documentOrder` splices each imported sheet at its `@import`'s position,
the three document rules (main sheet reached unconditionally; every `@import`
well-placed and single; layer order independent of conditional groups), the
twelve overlay canaries (91 total) and the compiled-vs-raw browser check. No
file under `client/`, `shared/` or `artifacts/` changed apart from the
count-free wording in `DESIGN.md`, so the round-3 e2e baseline stands. Same
dev server; logs in `/tmp/parity-tokens/r5/<name>.log`.

| gate | command | result | summary |
|---|---|---|---|
| canonical-token-parity | `npm run validate:canonical-token-parity` | PASS | 165 shared values, 0 mismatches, 0 missing, 7 deviations honoured, 13 runtime-only, geometry 9/9, responsive 2/2, 50/50 accent combos, utilities 26/26, 8 sibling sheets, cascade layers `base < theme < components < utilities < unlayered` over 9 sheets, document: main sheet reached, 0 misplaced / unresolved / duplicate imports, 91/91 canaries |
| round-5 review bypass on a repository mirror | `index.css` = `@layer early;` + `@import restore layer(late)` + `@import bypass` prepended (`/tmp/parity-tokens/r5/mirror`, canaries skipped via `--app-css`) | gate before this round: PASS (exit 0) → round-5 gate: FAIL (exit 1) | rule 11: `client/canary/bypass.css @media (max-width: 1024px) @layer early` — runtime `block !important`, design `none !important`; transcript in `gate-mutations.md` |
| Tailwind import substitution | `tailwindcss` 4.3.2 `compile()` over the live entry + each variant | measured | misplaced, nested, media/supports/layer-conditioned and doubled `@import`s are all inlined where they sit; table in `gate-mutations.md` |
| browser agreement | `node scripts/validation/canonical-token-parity-browser-check.mjs` (dev server on the app port) | 23/23 agree | 11 layer canaries + 12 document canaries (compiled `index.css` served on a routed origin; raw pass recorded) — `layer-order-browser.json` |
| validate:design-system-artifact | `npm run validate:design-system-artifact` | PASS | reader self-test + tokens.json up to date |
| check / lint:css / test:unit | `npm run check` / `npm run lint:css` / `npm run test:unit` | PASS / PASS / PASS | 299 unit tests, 15 files |
| theme-registry-types / stylelint-system-tokens / font-prepaint | `npm run validate:<name>` | PASS ×3 | 6 saved font ids + unknown-id fallback |
| palette-drift / standalone-palette-drift / accent-drift | `node scripts/validation/<name>.mjs` | PASS ×3 | frozen reference byte-identical to the zip (103 files) |
| dead-exports / root-script-drift | `node scripts/validation/<name>.mjs` | PASS / PASS | 796 exports, 746 imported, 50 pinned; 27 root + active scripts, 0 stray |
| ds-showcase / ds-button-sweep | `node scripts/validation/design-system-showcase.mjs` / `node scripts/validation/ds-button-sweep.mjs` | PASS / PASS | 20 checks; 284 checks |
| sticky-preview-audit / tablet-audit / responsive-audit / print-audit | `node scripts/validation/<name>.mjs` | PASS ×4 | 7 / 30 / 32 / 49 checks, 0 failures |
| eslint on the two scripts + `git diff --check` | `npx eslint -c /tmp/parity-tokens/eslint.mjs.config.mjs scripts/validation/canonical-token-parity.mjs scripts/validation/canonical-token-parity-browser-check.mjs` | PASS | repo `eslint .` stays pre-existing red on every `.mjs` |
