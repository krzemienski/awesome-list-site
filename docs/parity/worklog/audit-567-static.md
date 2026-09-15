# Task 567 · Independent static design-system audit

**Audit scope:** source/static only, using
`.agents/skills/verify-design-system/SKILL.md` and `docs/DESIGN-SYSTEM.md`.
The requested browser work was not run; the browser worker owns rendered
Stages 2/4/6/7/9/11. No product code, aggregate parity documentation,
baseline allowlist, or frozen reference was edited.

## Verdict

**Scoped static verdict: FIX.** The registry/token gates all pass, but the
source audit finds Stage 6 canonical-primitive/page-title violations listed
below. This is not a full visual or browser verdict.

**Systems covered:** `editorial`, `terminal`, `geist`, `brutalist`, `swiss` ×
the 10 registered accents.  
**Files audited:** `client/index.html`, `client/src/index.css`,
`client/src/main.tsx`, `client/src/lib/design-system.ts`,
`client/src/lib/font-options.ts`, `client/src/styles/design-system.css`,
`client/src/components/layout/new/MainLayout.tsx`, canonical UI primitives
under `client/src/components/ui/`, app TSX/TS source, and manifest-backed
standalone artifacts under `artifacts/`.

## Exact command evidence

The six requested command transcripts contain the exact command, complete
stdout/stderr, and exit code:

| Check | Command | Result | Evidence |
|---|---|---|---|
| app Stage 5 | `node scripts/validation/palette-drift.mjs` | PASS, exit 0; all five detectors 0 app hits | [palette-drift.txt](../evidence/audit-567-static/palette-drift.txt) |
| registry/accent/font parity | `node scripts/validation/accent-drift.mjs` | PASS, exit 0 | [accent-drift.txt](../evidence/audit-567-static/accent-drift.txt) |
| standalone Stage 5 | `node scripts/validation/standalone-palette-drift.mjs` | PASS, exit 0; 3 roots / 86 files, no new values | [standalone-palette-drift.txt](../evidence/audit-567-static/standalone-palette-drift.txt) |
| live font probe | `npm run validate:webfont-fetch` | PASS, exit 0; 6 stylesheet URLs HTTP 200 and all requested faces served | [webfont-fetch.txt](../evidence/audit-567-static/webfont-fetch.txt) |
| registry type safety | `npm run validate:theme-registry-types` | PASS, exit 0; baseline and six rejection mutations | [theme-registry-types.txt](../evidence/audit-567-static/theme-registry-types.txt) |
| canonical tokens | `npm run validate:canonical-token-parity` | PASS, exit 0; 165 shared values, 0 mismatches/missing | [canonical-token-parity.txt](../evidence/audit-567-static/canonical-token-parity.txt) |

Source command output and the raw button inventory are indexed in
[evidence/audit-567-static/README.md](../evidence/audit-567-static/README.md).

## Stage assessment

### Stage 1 · System files loaded — PASS (source)

- `client/src/main.tsx:3` imports `client/src/index.css`.
- `client/src/index.css:5` imports `./styles/design-system.css` before
  Tailwind (`:10`).
- `client/src/lib/design-system.ts:294-298` mirrors
  `DESIGN_SYSTEMS`, `ACCENTS`, `SYSTEM_DEFAULT_ACCENT`, and
  `applyDesignSystem` onto `window`.
- The module is reachable from `client/src/main.tsx:2` (`App`) and
  `client/src/App.tsx` imports the registry. The source contract is present;
  no browser global assertion was made here.

### Stage 2 · System applied — PASS (source only)

`client/index.html:98-151` contains the inline boot script. It validates
saved IDs and writes `data-system` and `data-accent` at `:123-125`.
`client/src/styles/design-system.css:29-31` provides the default `:root`
`--bg`, and the four peer blocks at `:699-779` plus the Editorial root
cover all five systems. Runtime computed-style confirmation is intentionally
deferred to the browser worker.

### Stage 3 · Synchronous boot — PASS (source only)

The boot is an ordinary inline `<script>` (`client/index.html:98`), not a
module/deferred script, and runs before the module entry
(`client/index.html:374`). Vite derives the placeholder payloads from the
registry (`vite.config.ts:51-72`, `:91-109`), rather than maintaining a
second handwritten ID list. The accent gate independently confirms 5 systems,
10 accents, and both generated fallbacks.

### Stage 4 · Page chrome — PASS (source only)

`MainLayout` emits `.page` at
`client/src/components/layout/new/MainLayout.tsx:166-170` and `.grain` at
`:171`. The corresponding tokenized styles are in
`client/src/styles/design-system.css:162-177`. DOM presence was not checked
in a browser.

### Stage 5 · Hardcoded values — PASS for app; PASS with pinned legacy debt for standalone

The app palette gate found zero new/present matches for palette classes, hex,
rgb/rgba, raw radii, and font-family detectors. The standalone gate found no
new values and passed its frozen-reference and manifest checks, but retains
98 already-pinned matches:

| Owning path | Pinned residuals |
|---|---|
| `artifacts/mockup-sandbox/src/components/mockups/brand-kit/LogoSystem.tsx` | 1 palette class, 59 hex, 2 rgb, 1 raw radius |
| `artifacts/mockup-sandbox/src/components/mockups/brand-kit/Guidelines.tsx` | 13 hex |
| `artifacts/mockup-sandbox/src/components/mockups/brand-kit/BrandInAction.tsx` | 10 hex |
| `artifacts/mockup-sandbox/public/favicon.svg` | 1 hex |
| `artifacts/mockup-sandbox/src/components/ui/chart.tsx` | 5 hex, 2 raw radii |
| `artifacts/mockup-sandbox/src/components/ui/toast.tsx` | 4 palette classes |

These are pre-existing allowlisted work items, not regressions from this
audit. The baseline was not modified.

### Stage 6 · Canonical primitives — FIX (narrow source findings)

The primitive definitions are correctly wired:

- `client/src/components/ui/button.tsx:7-20,42-50` emits
  `data-ds-variant` and uses bridged tokens.
- `client/src/components/ui/badge.tsx:6-22,34-40` emits `data-ds="chip"`
  only for `chip`/`accent`.
- `client/src/components/ui/input.tsx:5-19`,
  `textarea.tsx:8-21`, and `select.tsx:15-35` use the canonical control
  bridge.
- Interactive-card consumers emit `data-ds="card-hover"` at
  `client/src/components/resource/ResourceCard.tsx:180`,
  `client/src/components/ui/taxonomy-card.tsx:45`, and
  `client/src/pages/DesignSystemShowcase.tsx:488`.

The source input inventory contains the documented hidden/file/checkbox/radio
cases, the sidebar search control under `[data-sidebar]`, and tokenized
native controls carrying `border-input`; the TaxonomyListing native
subcategory select is the documented long-option exception. Existing raw
`.chip`/`.card` classes are excluded by the executable standalone/showcase
filter. The complete native-button inventory and source contexts are in
`evidence/audit-567-static/buttons-static.jsonl` and
`evidence/audit-567-static/raw-button-context.txt`.

#### Proven defects

1. **Simple retry controls bypass `Button` and miss the target floor.**
   `client/src/App.tsx:259-265` and `:282-288` are ordinary primary-action
   buttons with no `data-ds-variant`; their `px-4 py-2` styling also does
   not provide the canonical 44px standalone target. Rebuild them with the
   canonical `Button` primitive.
2. **Auth retry misses the inline text-link target floor.**
   `client/src/App.tsx:640-646` is a raw inline button with no hook,
   padding, or minimum height. Its parent `py-2` does not enlarge the
   button's own hit area; the control is below the required 24px
   text-link floor. Use `Button` (or a fully-tokenized composite with an
   explicit `min-h-6`/equivalent).
3. **The Home kind filter hand-authors a DS hook.**
   `client/src/components/home/HomePresentation.tsx:193-208` is otherwise
   a valid tokenized `aria-pressed` multi-part chip composite, but it puts
   `data-ds="chip"` on a native button. The skill explicitly forbids
   hand-setting DS hooks on non-primitives. This is a narrow hook-contract
   defect, not a finding that the filter needs to become a generic button.
4. **Several visible h1s do not resolve to display tokens.** Source CSS
   inspection separates actual defects from class-name-only candidates:
   `client/src/App.tsx:243,277`,
   `client/src/pages/Bookmarks.tsx:362`,
   `client/src/pages/GuestBookmarks.tsx:104`, and
   `client/src/pages/ContinueLearning.tsx:194` have no display-heading
   class or page selector supplying display metrics. More importantly,
   `client/src/pages/ResourceDetail.tsx:595` is explicitly assigned
   `var(--font-body)` by `client/src/styles/pages/resource.css:12-18`,
   and `client/src/pages/SubmitResource.tsx:532` is assigned
   `var(--font-body)` by `client/src/styles/pages/submit.css:36-44`.
   The earlier `sr-only` exclusions remain valid.
5. **Existing display-h classes are overridden by page CSS.** This is an
   effective-token finding, not a demand that every page use the same
   heading layout: `client/src/pages/AdminDashboard.tsx:247` is overridden
   by `.admin-dashboard__masthead h1` in `admin-shell.css:9-15`;
   `client/src/pages/About.tsx:77` by `.about-title` in `about.css:41-48`;
   and `Terms.tsx:17`, `Privacy.tsx:17`, and `CodeOfConduct.tsx:18` by
   `.legal-title` in `system-legal.css:21-32`. Each selector assigns
   `var(--font-body)` over the `.display-h` declaration. These are
   canonical display-token defects even though the class-name sweep would
   miss them.

#### Downgraded / not proven defects

- `client/src/pages/ThemeSettings.tsx:215-238`, `:258-281`, and
  `:311-336` are custom roving `role="radio"` cards. Their multi-part
  layouts cannot be expressed by a plain `Button`; all colors/radii use DS
  tokens, each has an explicit focus ring, and the card content exceeds the
  target floor. They qualify under the Stage 6 composite ladder; no
  primitive violation is proven from source.
- `client/src/pages/About.tsx:485-509` is a 56px tokenized accordion row
  with explicit focus treatment and a multi-part chevron/panel layout. It
  qualifies as composite chrome under the ladder; do not demand a broad
  Accordion migration from this static audit.
- `client/src/pages/Bookmarks.tsx:413-428` is a 72px tokenized
  multi-part interactive card row with the required `card-hover` hook and
  global focus ring. Its hand-applied card hook is analogous to the
  `Card` consumers (Card itself accepts the hook as a prop); the prior
  report's “hand-authored hook” finding is downgraded, pending rendered
  verification.

The static TypeScript inventory found 56 native `<button>` nodes and 40
literal candidates after the skill's browser-filter exclusions. These
classifications deliberately avoid turning every composite/Radix/admin
control into a redesign request. Effective-CSS evidence is recorded in
`evidence/audit-567-static/stage6-effective-css.txt`.

### Stage 7 · Accent discipline — PASS (source/token assessment; browser count pending)

No app Stage 5 hit uses a raw accent literal, and all registry/CSS pairs agree
for all 50 system × accent combinations (`canonical-token-parity` 50/50;
`accent-drift` 10/10 accents). The source scan has 387 token-reference
matches outside token sources; representative output is captured in
`accent-usage-source.txt` and resolves through `var(--accent)` /
`var(--accent-2)` or the documented picker/showcase swatches. A per-viewport
accent-user count and visual “one moment per surface” judgment are
browser-only and were not claimed here.

### Stage 10 · Per-system skins — PASS

`client/src/styles/design-system.css` contains 80
`[data-system="…"]` selectors (skill threshold ≥60) and 26 `data-ds`
references (threshold ≥15). The source count by system is Editorial 3,
Terminal 26, Geist 8, Brutalist 26, Swiss 17; Editorial's lower count is
the intentional bare `:root` default plus its component skins. The bridge
skins are present at `:917-991` for Terminal, Geist, Brutalist, and Swiss,
with the shared chip hook at `:929-930`; raw class skins are at `:808-915`.
`accent-drift` also reports 76 component skin rules naming only offered
systems.

## Recommended ownership handoff

1. `client/src/App.tsx`, `pages/Bookmarks.tsx`, `pages/GuestBookmarks.tsx`,
   `pages/ContinueLearning.tsx`, `pages/ResourceDetail.tsx`,
   `pages/SubmitResource.tsx`, `pages/About.tsx`, the legal pages, and the
   admin masthead: repair the proven display-token defects first.
2. `client/src/App.tsx` and
   `components/home/HomePresentation.tsx`: repair the narrow raw-control
   target/hook defects. ThemeSettings, About FAQ, and Bookmarks composites
   are not edit requests from this static pass.
3. `artifacts/mockup-sandbox/...`: ratchet the 98 pinned standalone values
   only in a dedicated cleanup task; do not change the allowlist as part of
   this audit.
4. Run the browser-owned Stage 6/7/9/11 checks after fixes; this static
   report deliberately does not substitute for those checks.