# Claude Design system run — report

Branch `ds-mcp-rebuild-20260929`, cut from `ds-mcp-pixel-parity` @ `a552d76a` (itself 24 commits ahead of `main` @ `6462b2bd`). Not merged to `main`.

> Status: the validator panel result is recorded in the "Consensus panel" section below; this report is only complete when that section holds three verbatim verdicts.

## 1. Source of truth: claude_design MCP fetch

- **Project:** `49c7785a-b6d4-4c30-9d2d-9f0229ebc042` ("Awesome.Video Design System", `PROJECT_TYPE_DESIGN_SYSTEM`), fetched through the claude_design MCP (`DesignSync get_project`, `list_files`, then `get_file` for each path).
- **When:** 2026-09-29, first file 07:14:58Z, last 07:22:44Z. 166 files. 148 were fetched by a sub-agent (`ds-fetcher`, 148/148 calls succeeded, 0 errors); the root contract files, `HANDOFF.md`, the skill and docs 01–18 were fetched directly by the lead.
- **Provenance:** every file was written to disk byte-exact from the MCP responses recorded in the session transcripts (`.cache/run-20260929/extract_ds.py`); nothing was retyped. Location: `.cache/ds-fetch-20260929T0714Z/`, with `MANIFEST.md` (path, bytes, sha256, truncation flag, fetch time).
- **No cached copy was the source of truth.** Earlier fetches (`.cache/ds-fetch-20260929T0640Z/`, which had retyped files) and the repo's `awesome-list-site-ds/` folder were not used as the contract.
- **Truncation (MCP 256 KiB cap):** `_ds_bundle.js` and 15 reference PNGs came back truncated and are not usable as images: `assets/reference/14_category_media-tools.png`, `assets/screenshots/06_login.png`, `assets/screenshots/13_category.png`, `handoff/project/uploads/06_login.png`, `10_…`–`17_category_*.png` (8 files), `19_sub-subcategory_hls.png`, `20_sub-subcategory_dash.png`, and `Screenshot 2026-05-22 at 15.26.17.png`. Every text file (css, js, jsx, md, json, html) came back complete.
- **Contract hashes:** `styles.css` = `components.css` = `handoff/project/styles.css` sha256 `31fde358…2070`; `design-system.js` = `design-systems.js` sha256 `30c37539…c7bc`; `SKILL-verify-design-system.md` sha256 `37f25dbc…fa6` (root and `handoff/project/` copies byte-identical).

## 2. State found

- The app ran locally with the repo's `.env` (Neon `DATABASE_URL`, Clerk keys and others; values never printed). There was no environment block. Port 5000 is taken by macOS AirPlay Receiver, so dev ran on `PORT=5001` and production on `PORT=5002`. The server reads `PORT` (`server/index.ts:635`).
- **The legacy design layer:**
  - `client/src/styles/design-system.css` (1,253 lines) was a derivative of `styles.css`, with tokens scoped to `:root[data-system]`/`[data-accent]` and app rules mixed in.
  - `client/src/lib/design-system.ts` held its own system registry without `vars`, and an `applyDesignSystem` that only toggled attributes.
  - The `client/index.html` boot was attribute-only, forced `background-color: #000`, and picked a different default system per route ("product profiles": learning → Geist, admin → Swiss).
  - shadcn primitives (`Button`, `Badge`, `Card`, `Input`, `Textarea`, `SelectTrigger`) carried no design-system classes, and a parallel `data-ds` hook layer re-created the per-system skins.
- A previous session left uncommitted primitive edits on `ds-mcp-pixel-parity`. They were stashed (`stash@{0}`), used as a reference for Phase 5, and not applied wholesale.
- Parity acceptance was documented as blocked (`docs/parity/REPORT.md`, `VERIFICATION.md`).

## 3. Sub-agents dispatched

| Agent | Scope | Outcome |
|---|---|---|
| `ds-fetcher` | Fetch 148 listed paths through the MCP; no reading or rewriting | 148/148 calls OK, 15 PNGs truncated (listed above). Stopped once complete. |
| `ds-foundation` | HANDOFF phases 1–4: verbatim `/ds/*` files, fonts, synchronous head boot, `.page`/`.grain`, remove legacy CSS into `app-bridge.css` | Produced the phase 1–4 working tree. Lead check found a regression: the design system's unlayered `* { padding: 0 }` reset zeroed every Tailwind padding utility. The user then asked for the team to be stopped and the work finished inline, so the agent was stopped before it filed a final report. The lead fixed the regression, verified and committed (`90c50398`). |
| `validator-1/2/3` | The consensus panel: each received only the improved skill, the production URL and the browser MCP | See section 7. |

After the user asked to stop the team, phases 5 and 6 and all fixes were done inline by the lead, with a browser-MCP check after each change.

## 4. What changed, and why

| Commit | Change | Why |
|---|---|---|
| `d16bf98b`, `9f25b167` (plus skill edits in `0a361b23`, `922f70ff`, `e8fe9b5b`) | `docs/parity/SKILL-verify-design-system.md`: Part I is the fetched skill, byte-identical; Part II is the browser-MCP execution appendix | The gate, improved to run through the browser (section 5) |
| `90c50398` | `client/public/ds/design-system.{css,js}` are verbatim copies of the fetched `styles.css` / `design-system.js`. `index.html` loads both synchronously in `<head>` and calls `applyDesignSystem(sys, acc)` before first paint (HANDOFF Phase 3 recipe). `design-system.ts` became a typed wrapper over the window globals, with the docs/05 smart-accent selection. The legacy CSS, attribute-only boot, per-profile default system and forced `#000` were removed. App-only rules moved to `app-bridge.css`, token-only. Tailwind utilities load unlayered. The error route got the `.page`/`.grain` chrome. | HANDOFF phases 1–4. Pitfall 1 (flash): tokens are now written before paint. Pitfall 5 (leak): only the applier writes system tokens. |
| `0a361b23` | `Button` → `.btn` (+`primary`/`ghost`/`danger`), `Badge` → `.chip` (+status), `Card` → `.card` (+`hoverable`), `Input`/`Textarea`/`SelectTrigger` → `.input`/`.textarea`/`.select`; `ChipButton` → `.btn`; Clerk → `.btn`/`.btn.primary`/`.input` via appearance classes, and its sheet is no longer layered; the `data-ds` skin duplicate was deleted | HANDOFF Phase 5, one class at a time with a browser check after each. Pitfalls 2–3: the canonical skins now reach the primitives directly. The layered Clerk sheet had been losing all its spacing to the unlayered design-system reset. |
| `922f70ff` | 241 status-hue literals → `--status-*` tokens; chart and agent-graph palettes read tokens through SVG `fill`/`stroke`; print paint uses `Canvas`/`CanvasText`/`GrayText`; the entry-HTML skeleton and `<noscript>` paint from tokens | HANDOFF Phase 6 regex sweep and lookup table. The repo-wide scan now has 0 non-exempt hits. |
| `e8fe9b5b` | Accent kept to the reserved moments: journey CTAs are non-primary, journey icons and difficulty chips are ink, the header avatar, footer "indexed live" and Clerk "Sign up" link read ink, the home eyebrow's duplicate live-dot was removed, and BrandMark paints `currentColor` | Stage 7 accent discipline, docs/02 principle 03, docs/09 (one live-dot per view) |

## 5. How the skill was improved (and what was preserved)

**Preserved exactly (Part I, byte-identical, sha256 `37f25dbc…`):** the 11 stages in order, the 🔴 BLOCK / 🟡 FIX / 🟢 NIT model, the verdict thresholds (PASS = zero BLOCK and zero FIX), and the verdict-block format. Part II states that Part I wins any conflict, and that a stage which can't be observed is reported as NOT RUNNABLE at its Part I severity. It is never passed.

**Execution (Part II):** validators drive `http://localhost:5002` (production) through `mcp__chrome-devtools__*` in their own isolated context, starting from empty storage. Every stage expression runs in-page through `evaluate_script`. Screenshots are taken at every system switch and must be viewed.

**Coverage:**
- Five systems at `SYSTEM_DEFAULT_ACCENT`: editorial×crimson, terminal×matrix, geist×cyan, brutalist×amber, swiss×orange.
- Eight screens: `/`, `/about`, `/journeys`, `/category/intro-learning`, `/resource/184739`, `/sign-in`, `/settings/theme`, and a 404 route.
- Two widths: 1440×900 and 375×667. The skill specifies none, so desktop plus the checklist's iPhone SE size.
- Stage 11 alone is 80 screenshots.

**Shell/script → browser-MCP mappings:**

| Stage | Fetched skill prescribes | Executed as |
|---|---|---|
| 1 | Inspect `<head>` | CSSOM: a stylesheet with a `:root --bg` rule served by a `<link>` (non-null `href`), and the DS `<script src>` attributes |
| 3 | "Inspect the source" | (a) `fetch(location.href)` + `DOMParser` walk of `<head>` order; (b) `navigate_page` `initScript` probe that seeds a stored system and records the root in the first animation frame, plus a cold-load probe |
| 5 | `rg --type css … src/` ×3, `rg "style=…" src/` ×2 | Module list from `performance` resource entries plus `@import`s under `src/`; raw text through Vite `?raw` (double- or single-quoted wrapper decoded); Part I's regexes applied line by line; the same globs excluded; entry HTML fetched and scanned; tied to the production build through `/api/version` |
| 9 | DevTools console `document.fonts.check` | The same expression after `fonts.ready` and `fonts.load`; failures traced with `list_network_requests` |
| 10 | `rg '\[data-system=…\]' styles.css \| wc -l` | CSSOM rule walk over the DS sheet counting selector matches, plus the served file's sha256 compared with the fetched `styles.css` |
| 11 | DevTools loop and "take a screenshot if available" | `evaluate_script` switch plus `take_screenshot({filePath})` per system × screen × width, each viewed |
| all | DevTools console | `evaluate_script` on the live page |

**Execution corrections that do not change any criterion:**
- Stage 7's hex-slice comparison could never match a computed `rgb()`. It now uses a probe element. It counts a border or outline only when drawn, and `color` only where it is set rather than inherited, applying Part I's own "count once" intent.
- Stage 8 resolves `--text-3`/`--text-4` through a probe for the same reason.
- Stage 6 counts every design-system component class defined in the canonical sheet. That covers `.accordion-header`, `.header-search-trigger` and `.user-pill`, which the fetched prototype itself renders on `<button>`s.
- Stage 6 lists, rather than counts, controls a user cannot perceive or operate (hidden, `aria-hidden`, not focusable).
- Stage 11 compares Editorial × Crimson with the fetched captures for the grounding elements the fetched README names.

## 6. Lead browser checks (browser MCP)

Screenshots are under `.cache/run-20260929/`:
- Baseline before changes: `baseline/01-home-legacy-editorial-1440.png`, `baseline/21-resource-legacy-1920.png`.
- Lead checks, dev and prod: `lead-check/01-home-editorial-1440.png` and `02-home-brutalist-1440.png` (foundation; exposed the padding regression), `03-prod-about-brutalist-1440.png` (production, :5002), `04-theme-buttons-editorial.png`, `05-signin-editorial-1440.png`, `06-theme-buttons-terminal.png`, `07-home-brutalist-375.png`, `08-journeys-swiss-1440.jpeg`.

Observed in-page:
- **Production first paint:** with `ds-system=brutalist` stored, the first animation frame already has `--font-display: 'Instrument Serif'…` and `--border-w: 2px`, with no later switch.
- **Fonts:** `document.fonts.check` is true for Fraunces, IBM Plex Mono, Geist, Instrument Serif and Manrope.
- **Chrome and tokens:** `.page` ×1, `.grain` ×1 and editorial×crimson with `--bg: #000000` on all eight screens.
- **Stage 6:** no stray controls on the key screens after Phase 5.
- **Stage 8:** 0 offenders.
- **Stage 7:** ≤8 per viewport on every key screen.
- **Theme picker:** it switches systems and persists the choice across a reload.

## 7. Consensus panel

(Filled in from the validators' verbatim responses; see `validator-1.md`, `validator-2.md`, `validator-3.md`.)

## 8. Omissions and blockers

- The 15 truncated reference PNGs, which include the login and category captures, cannot be compared as images; the MCP caps `get_file` at 256 KiB.
- **Consequence of removing the legacy layer, not fixed (outside the front-end app scope):**
  - The separate showcase workspace `artifacts/awesome-video-design-system` imports `ACCENTS` / `DESIGN_SYSTEMS` from `client/src/lib/design-system.ts` in `src/consumer.ts`, `src/canonical/CanonicalShowcase.tsx` and `src/canonical/DocsContent.tsx`. Those exports are gone now that the fetched `design-system.js` globals are the single source. That workspace's own `build`/`typecheck` will fail until it reads the globals (or a generated `themes` module) instead. The app's `npm run build` is unaffected.
  - Repo scripts written against the legacy file still reference `client/src/styles/design-system.css` or `THEME_BOOT_DATA` / `THEME_FALLBACK_REGISTRY`: `scripts/validation/{canonical-token-parity,accent-drift,palette-drift,product-profile-drift}.mjs`, `scripts/generate-design-system-artifact.mjs`, `scripts/audit-567-browser.mjs` and `scripts/brand/build-brand-assets.mjs`. They need retargeting at `client/public/ds/*`.
  - The one CI-wired validator, `validate:standalone-palette-drift`, already fails on a missing `attached_assets/*.zip`, which predates this run.
- Pixel-exact matching of the legacy captures (`uploads/*.png`) was not a goal. The fetched README describes them as grounding for the look and feel, and the page arrangement follows the design system's own templates and prototype.
