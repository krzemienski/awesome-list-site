# Design-System Compliance Audit · Awesome Video (http://localhost:5002 · prod build d6db39a1)

**Verdict: PASS**

System detected: `editorial` × `crimson`
Files audited: served `/ds/design-system.css` (sha256 31fde358…9b2070) and `/ds/design-system.js` (sha256 30c37539…0e05bc7c); entry HTML of 8 routes (`/`, `/about`, `/journeys`, `/category/intro-learning`, `/resource/184739`, `/sign-in`, `/settings/theme`, `/this-route-does-not-exist`); 63–98 source modules per screen scanned on dev :5001 at the same revision (0 unreadable), including SEOHead.tsx, brand-mark.ts, app-bridge.css, header.css, sidebar.css, clerk-appearance.ts; live DOM/CSSOM of all 8 screens × {1440×900, 375×667} × 5 systems

## Findings

### 🔴 BLOCK (0)
None.

### 🟡 FIX (0)
None.

### 🟢 NIT (0)
None.

## What's good
- ✅ Stage 1 — `typeof applyDesignSystem === 'function'`, 5 systems, 10 accents, `SYSTEM_DEFAULT_ACCENT` = {editorial:crimson, terminal:matrix, geist:cyan, brutalist:amber, swiss:orange}; token sheet `http://localhost:5002/ds/design-system.css`; `/ds/design-system.js` loaded with no async/defer/module; holds on 8/8 screens at 1440 and 375 [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage1-3-home.json, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-1440.jsonl, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-375.jsonl]
- ✅ Stage 2 — `data-system="editorial"`, `data-accent="crimson"`, `--bg: #000000` on 16/16 screen×width loads [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-1440.jsonl, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-375.jsonl, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/01-home-editorial-1440.png]
- ✅ Stage 3 — (a) served <head>: `/ds/design-system.js` (sync) at head index 44, synchronous inline boot calling `window.applyDesignSystem(sys, acc)` at index 45; no inline hex styles in entry HTML. (b) first-frame capture with seeded `ds-system=brutalist`: first frame already `brutalist`, `--font-display 'Instrument Serif'…`, `--border-w 2px`, 0 later mutations; cold load first frame `editorial` / `'Fraunces'…` / 1px, 0 later mutations → no FOUT [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage1-3-home.json]
- ✅ Stage 4 — `.page` and `.grain` present on 16/16 screen×width loads; atmosphere renders per system in all 80 Stage 11 probes (editorial crimson radial, terminal scanlines, geist white radial, brutalist none, swiss grid) [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-1440.jsonl, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-375.jsonl, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage11-probes.jsonl]
- ✅ Stage 5 — dev :5001 and prod :5002 both report revision d6db39a1239c6997c74ebd2c5e8e3025c42adbe3, and served DS css/js hashes are identical; 63–98 modules per screen scanned, 0 unreadable; 17 unique hardcoded-value hits, all DS-OK-exempt and each confirmed by reading the line (SEOHead.tsx:190,192; brand-mark.ts:45; app-bridge.css:19-23; header.css:27,51,52; sidebar.css:338,363,380,381,628,666); entry HTML `style="…#hex"` / `color:#hex` → none. Out of scope: tailwindcss theme/preflight/utilities (package imports), /shared/styles/product-profiles.css (outside /src/) [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage5-summary.txt, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage5-home.json … raw-stage5-signin.json]
- ✅ Stage 6 — 0 stray `<button>` and 0 stray `<input>/<select>/<textarea>` on 16/16 loads; matched DS classes: btn*, icon-btn, header-search-trigger, user-pill, accordion-header (9), select, input. Excluded element: Clerk's implicit hidden submit `<button type="submit" aria-hidden="true" style="visibility: hidden; position: absolute;">` on /sign-in only [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-1440.jsonl, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-375.jsonl]
- ✅ Stage 7 — max accent users per viewport ≤8 everywhere. At 1440: Home 7, About 3, Journeys 4, Category 5, Resource 6, Sign-in 4, Theme 6, 404 4. At 375: 5/3/2/3/3/3/4/3. Every user is an allowed use: header `av` brand mark, active nav (`sub-item[aria-current]`, `.accordion-header.active::before` rgb(255,61,82)), eyebrows, `.live-dot`, `.caret`, one `.btn.primary` per surface, `.chip.accent`, Editorial serif-italic accent. Theme "Destructive" `.btn.danger` tracks the token (crimson→cyan rgb(94,221,242) when the accent is switched; canonical DS component styles.css:219, docs/07-color.md:119). Clerk `a.cl-internal-knl1ho` is the av brand mark and tracks the accent (magenta test → rgb(236,72,153)). Excluded literal: the Theme page's crimson accent-picker swatch (inline `background: rgb(255,61,82)`, unchanged under cyan; it depicts the palette) [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-1440.jsonl, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-375.jsonl, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/31-theme-editorial-1440.png]
- ✅ Stage 8 — 0 `p, li` long-form offenders on `--text-3` rgba(244,243,238,0.4) / `--text-4` rgba(244,243,238,0.22) on 16/16 loads [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-1440.jsonl, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-375.jsonl]
- ✅ Stage 9 — `document.fonts.check('16px "Fraunces"')` true on 16/16 Editorial loads. On /sign-in at 375 the first check was false (face not yet requested); after `document.fonts.load` settled (result 1) it returned true. Per-system display fonts are true in all 80 Stage 11 probes: IBM Plex Mono, Geist, Instrument Serif, Manrope [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-1440.jsonl, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-375.jsonl, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage11-probes.jsonl]
- ✅ Stage 10 — the served sheet has 55 `[data-system="…"]` selectors (≥15); served css sha256 31fde358…9b2070 and js sha256 30c37539…0e05bc7c match the canonical design-system files. Skin effects were observed live: Terminal chip `::before "["` with radius 0; Brutalist 2px/0 radius with offset shadows; Swiss 0.5px hairlines on cards, Clerk card and inputs [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage1-3-home.json, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage11-probes.jsonl]
- ✅ Stage 11 — `applyDesignSystem(id, SYSTEM_DEFAULT_ACCENT[id])` for all 5 systems × 8 screens × 2 widths. Each was settled (fonts.ready + fonts.load + 800–1200ms), saved and viewed: **80 screenshots in /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/** (01–40 at 1440×900, 41–80 at 375×667), 16 per system. All 80 probes have fontCheck true, overflowX false and bodyBg #000. No symptom-table bug was found:
  - every system looks distinct;
  - Brutalist has 2px borders and 0 radius;
  - Terminal has square corners and chip brackets;
  - atmosphere is present and no font fell back.
  
  The probe flags Swiss 0.5px card borders as "cardOff". That is the intended Swiss hairline skin (docs/02-principles.md "push them to 0.5px"; canonical swiss block), not a bug.
  
  The Clerk sign-in card and inputs follow tokens per system: radius 12/0/10/0/4px, border 1/1/1/2/0.5px, input font Inter/IBM Plex Mono/Geist/Space Grotesk/Manrope.
  
  Reference grounding elements are present on each matching Editorial × Crimson screen:
  - red square `av` logo, rgb(255,61,82), 28px, radius 6px, on all 8 screens;
  - dark surfaces (#000 body) on all 8;
  - crimson primary CTA: Home "Submit a resource", Journeys "Start Journey", Resource "Open resource", 404 "Go home";
  - category sidebar with counts on Home (`aside.home-index-rail`) and Category (9 `.accordion-header` rows with counts 129/579/514/352/297/704/447/467/335).
  
  [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage11-probes.jsonl, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage11-reference-grounding.jsonl]

## Recommended next steps
1. None required. Verdict is PASS with 0 BLOCK / 0 FIX / 0 NIT.
2. Optional polish (not DS-contract findings, since the skill does not grade visuals): at 375 in Terminal, the long mono eyebrows wrap to a second tight line (Journeys, Category), and the Clerk email placeholder clips at the input edge [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/52-journeys-terminal-375.png, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/57-category-terminal-375.png, /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/67-signin-terminal-375.png].
3. Re-run this audit after the next deploy or DS-source sync.

---

## Per-stage findings (detail)

- **Stage 1 (🔴 BLOCK tier):** PASS on 16/16 loads. Raw result from Home at 1440: `{"applyFn":true,"systems":5,"accents":10,"tokenSheets":["http://localhost:5002/ds/design-system.css"],"dsScripts":[{"src":"http://localhost:5002/ds/design-system.js","async":false,"defer":false,"type":""}]}`.
- **Stage 2 (🔴):** PASS. `{"sys":"editorial","acc":"crimson","bg":"#000000"}` on every screen and width.
- **Stage 3 (🔴):** PASS. Source order `{"dsIdx":44,"applyIdx":45,"inHead":"HEAD"}`. Seeded brutalist first frame `{"sys":"brutalist","fd":"'Instrument Serif', 'Times New Roman', serif","bw":"2px","bg":"#000000"}`, `laterMutations:0`. Cold first frame `editorial / 'Fraunces', Georgia, serif / 1px`, `laterMutations:0`.
- **Stage 4 (🔴):** PASS. `{"page":true,"grain":true}` on 16/16.
- **Stage 5 (🟡 per occurrence):** PASS. 0 non-exempt hits (see raw-stage5-summary.txt).
- **Stage 6 (🟡):** PASS. strayBtn [] and strayInput [] on 16/16.
- **Stage 7 (🟡):** PASS. ≤8 per viewport everywhere, and every accent user is in the allowed list.
- **Stage 8 (🟡):** PASS. offenders [] on 16/16.
- **Stage 9 (🟡):** PASS. Fraunces is true on 16/16; the four other system display fonts are true on all 64 non-Editorial Stage 11 probes.
- **Stage 10 (🔴):** PASS. 55 selectors, and the hashes equal canonical.
- **Stage 11 (🔴 if visible bugs):** PASS. 80/80 screenshots viewed, no symptom-table bugs, and all grounding elements present.

### Reference comparison (Stage 11)
Arrangement differences are observations, not findings. Arrangement is governed by docs/11-patterns.md templates and the prototype.
- **Home.** Reference `.cache/ds-fetch-20260929T0714Z/handoff/project/uploads/01_home.png` (same file as `assets/reference/01_home.png`) vs `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/01-home-editorial-1440.png`. Legacy: shadcn left nav, 3×3 category card grid and AI-recommendations block. Live: DS Home template (sidebar accordion with counts, mono hero + stats grid, category columns, RECENTLY INDEXED rail). All four grounding elements present.
- **About.** `…/uploads/02_about.png` vs `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/06-about-editorial-1440.png`. Legacy: sidebar, feature grid and tech stack. Live: eyebrow, serif-italic headline and about cards, with no sidebar. The legacy capture has no CTA. Logo and dark surfaces present.
- **Journeys.** `…/uploads/04_learning_journeys.png` (same as `assets/reference/04_learning_journeys.png`) vs `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/11-journeys-editorial-1440.png`. Legacy: all five "Start Journey" buttons are crimson. Live: the first card is primary crimson and the other four are ghost (one primary per surface). No sidebar live. Grounding present.
- **Category.** `…/uploads/09_category_community-events.png` (nearest usable; `13_category_intro-learning.png` is truncated) vs `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/16-category-editorial-1440.png`. Both have a sidebar with counts and neither has a primary CTA. Legacy: search + resource grid with "View Details". Live: eyebrow/display title, chips, subcategory grid and resource cards.
- **Resource.** `…/uploads/21_resource_detail.png` (same as `assets/reference/21_resource_detail.png`) vs `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/21-resource-editorial-1440.png`. Legacy: two-column layout with a Quick Actions card, crimson tags, two crimson CTAs and a sidebar. Live: single centered column (DS: "No sidebar on detail pages"), one "Open resource" primary and muted chips. Grounding present.
- **Theme.** `…/uploads/08_theme_settings.png` vs `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/31-theme-editorial-1440.png`. Legacy: font picker plus legacy colour-theme cards. Live: pickers for the 5 design systems and 10 accents. The legacy capture has no CTA. Logo and dark surfaces present.
- **404.** `…/uploads/22_404_not_found.png` vs `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/36-404-editorial-1440.png`. Legacy: centered card with a sidebar. Live: centered mono-path eyebrow, Fraunces title, ghost + crimson "Go home" and editorial footer. Grounding present.
- **Unavailable references** (the MCP returned them truncated at 196608 B, so they cannot be compared):
  - `uploads/06_login.png`
  - `uploads/10_category_encoding-codecs.png` through `17_category_standards-industry.png`
  - `uploads/19_sub-subcategory_hls.png` and `20_sub-subcategory_dash.png`
  - `uploads/Screenshot 2026-05-22 at 15.26.17.png`
  - `assets/reference/14_category_media-tools.png`
  - `assets/screenshots/06_login` and `assets/screenshots/13_category`
  
  /sign-in therefore has no usable reference; `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/26-signin-editorial-1440.png` still shows the av logo, dark surfaces and the crimson "Continue" primary.

### Execution notes / deviations (not findings)
1. **375 width.** Set with `emulate` viewport `375x667x1` rather than `resize_page`, which floors the window at innerWidth 500 on this host. The measured innerWidth was 375 (369 without scrollbar) [/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-375.jsonl].
2. **Consent banner.** On the first visit, the analytics consent banner overlays the bottom of shots 01–05. After shot 05 I clicked "Decline" as an end user; localStorage then held `analytics-consent=denied` and `ds-font-override=system`, with no `ds-system`/`ds-accent` keys.
3. **CSP.** The page CSP has no `'unsafe-eval'`. It blocked `(0,eval)` of the stored probe on /sign-in, and on a later hard load of `/`. On those loads the probe bodies were pasted inline as the evaluated function.
4. **Sign-in probe target.** The 375 Editorial sign-in probe first measured the inner `.cl-card` (radius 10.67px, border 0). It was re-measured on the outer `.cl-cardBox` (radius 12px, border 1px), matching the 1440 record and the other systems.
5. **Misplaced probe entries.** Stage 11 probe entries 51–55 were first appended to `.cache/ds-fetch-20260929T0714Z/raw-stage11-probes.jsonl` because of a shell working-directory slip. They were moved into `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage11-probes.jsonl` and that stray file (untracked, created by me) was deleted. No repository file was edited; `git status` is unchanged from the session start.
6. **Final state.** The browser was left on editorial × crimson, with no `ds-system`/`ds-accent` keys in localStorage.

## Evidence index

Directory: `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/` (80 screenshots + raw JSON)

### Screenshots (80)
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/01-home-editorial-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/02-home-terminal-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/03-home-geist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/04-home-brutalist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/05-home-swiss-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/06-about-editorial-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/07-about-terminal-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/08-about-geist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/09-about-brutalist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/10-about-swiss-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/11-journeys-editorial-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/12-journeys-terminal-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/13-journeys-geist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/14-journeys-brutalist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/15-journeys-swiss-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/16-category-editorial-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/17-category-terminal-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/18-category-geist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/19-category-brutalist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/20-category-swiss-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/21-resource-editorial-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/22-resource-terminal-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/23-resource-geist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/24-resource-brutalist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/25-resource-swiss-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/26-signin-editorial-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/27-signin-terminal-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/28-signin-geist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/29-signin-brutalist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/30-signin-swiss-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/31-theme-editorial-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/32-theme-terminal-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/33-theme-geist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/34-theme-brutalist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/35-theme-swiss-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/36-404-editorial-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/37-404-terminal-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/38-404-geist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/39-404-brutalist-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/40-404-swiss-1440.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/41-home-editorial-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/42-home-terminal-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/43-home-geist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/44-home-brutalist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/45-home-swiss-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/46-about-editorial-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/47-about-terminal-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/48-about-geist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/49-about-brutalist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/50-about-swiss-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/51-journeys-editorial-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/52-journeys-terminal-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/53-journeys-geist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/54-journeys-brutalist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/55-journeys-swiss-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/56-category-editorial-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/57-category-terminal-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/58-category-geist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/59-category-brutalist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/60-category-swiss-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/61-resource-editorial-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/62-resource-terminal-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/63-resource-geist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/64-resource-brutalist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/65-resource-swiss-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/66-signin-editorial-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/67-signin-terminal-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/68-signin-geist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/69-signin-brutalist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/70-signin-swiss-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/71-theme-editorial-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/72-theme-terminal-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/73-theme-geist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/74-theme-brutalist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/75-theme-swiss-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/76-404-editorial-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/77-404-terminal-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/78-404-geist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/79-404-brutalist-375.png
- /Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/80-404-swiss-375.png

### Raw JSON (per stage)
- Stages 1–4, 10 (Home 1440) and Stage 3 first-frame/source-order captures: `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage1-3-home.json`
- Stages 1, 2, 4, 6, 7, 8, 9, 10 per screen at 1440: `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-1440.jsonl` (8 lines)
- The same per screen at 375 (emulate note included): `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-pageaudit-375.jsonl` (8 lines)
- Stage 5 scan per screen:
  - `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage5-home.json`
  - `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage5-about.json`
  - `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage5-journeys.json`
  - `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage5-category.json`
  - `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage5-resource.json`
  - `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage5-signin.json`
  - `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage5-theme.json`
  - `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage5-404.json`
  - summary: `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage5-summary.txt`
- Stage 11 switch probes (80 shot entries plus the consent-decline action row): `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage11-probes.jsonl`
- Stage 11 reference grounding and comparison: `/Users/nick/Desktop/awesome-list-site/docs/parity/claude-design-run/evidence/r6-validator-2/raw-stage11-reference-grounding.jsonl`

#### raw-stage1-3-home.json (verbatim)
```json
{"stage1_2_4_10_home_1440":{"url":"http://localhost:5002/","s1":{"applyFn":true,"systems":5,"accents":10,"defAccent":{"editorial":"crimson","terminal":"matrix","geist":"cyan","brutalist":"amber","swiss":"orange"},"tokenSheets":["http://localhost:5002/ds/design-system.css"],"dsScripts":[{"src":"http://localhost:5002/ds/design-system.js","async":false,"defer":false,"type":""}]},"s2":{"sys":"editorial","acc":"crimson","bg":"#000000"},"s4":{"page":true,"grain":true},"s10":{"href":"http://localhost:5002/ds/design-system.css","count":55,"cssSha":"31fde358acc5bea61c68b17025326169fad4e60c62b898fbacf279a9bc9b2070","jsSrc":"http://localhost:5002/ds/design-system.js","jsSha":"30c37539db397941f209055af28a5284fbdd14a3322adb869701c70b0e05bc7c"}},
"stage3a_source_order":{"dsIdx":44,"applyIdx":45,"inHead":"HEAD","applyCalls":["applyDesignSystem(sys, acc)"],"dsScript":{"src":"/ds/design-system.js","async":false,"defer":false,"type":null},"htmlStyleHits":null,"htmlColorHits":null},
"stage3b_seeded_brutalist":{"fp":[{"l":"first-frame","sys":"brutalist","fd":"'Instrument Serif', 'Times New Roman', serif","bw":"2px","bg":"#000000"}],"cur":"brutalist","acc":"amber","laterMutations":0},
"stage3b_cold":{"fp":[{"l":"first-frame","ls":null,"sys":"editorial","fd":"'Fraunces', Georgia, serif","bw":"1px","bg":"#000000"}],"cur":"editorial","acc":"crimson","laterMutations":0},
"initial_storage":{"ls":3,"keys":["__clerk_environment","av-sb-subs","av-sb-cats"],"action":"cleared + reloaded"}
}

```

#### raw-stage5-summary.txt (verbatim)
```
Stage 5 — dev server http://localhost:5001 (revision d6db39a1239c6997c74ebd2c5e8e3025c42adbe3 == prod :5002 revision)
served /ds/design-system.css sha256 dev = prod = 31fde358acc5bea61c68b17025326169fad4e60c62b898fbacf279a9bc9b2070
served /ds/design-system.js  sha256 dev = prod = 30c37539db397941f209055af28a5284fbdd14a3322adb869701c70b0e05bc7c
screen / files scanned / unreadable / hits / non-exempt
/ 73 0 18 0 | /about 66 0 18 0 | /journeys 72 0 18 0 | /category/intro-learning 98 0 18 0
/resource/184739 76 0 18 0 | /settings/theme 68 0 18 0 | /this-route-does-not-exist 66 0 18 0 | /sign-in 63 0 18 0
out of scope: tailwindcss/theme.css, tailwindcss/preflight.css, tailwindcss/utilities.css (package imports); /shared/styles/product-profiles.css (outside /src/)
entry HTML (prod fetch(location.href) and dev fetch('/')): style="...#hex" -> null ; color:#hex -> null
17 unique hits, all exempt, each confirmed by reading the served line:
 SEOHead.tsx:190/192 (preceding-line DS-OK comments: meta can't read CSS vars)
 brand-mark.ts:45 (DS-OK on line), app-bridge.css:19-23 (DS-OK token definitions)
 header.css:27 (trailing DS-OK comment on same line), header.css:51 (DS-OK comment line) / :52 (prev line DS-OK)
 sidebar.css:338,363,380,381,628,666 (DS-OK on line)
```
