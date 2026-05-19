# Design-System Compliance Audit · Awesome.Video (Editorial + Crimson)

**Verdict: FIX**

System detected: `editorial` × `crimson`
Files audited:
- `client/index.html` (boot script, font preload)
- `client/src/main.tsx` (entry)
- `client/src/index.css` (CSS import chain)
- `client/src/styles/design-system.css` (tokens + components + skin block, 774 lines)
- `client/src/lib/design-system.ts` (runtime applier)
- `client/src/components/layout/new/MainLayout.tsx` (page chrome)
- `client/src/pages/*.tsx`, `client/src/components/**/*.tsx` (hardcoded-value + class-compliance sweep)

Scope note: this project ships a **single-personality** build (Editorial+Crimson only) per WP-1. Other systems (`terminal`/`geist`/`brutalist`/`swiss`) are intentionally removed from the TS applier (`design-system.ts:32-79` defines only `editorial`) but their skin blocks remain in CSS as dead-but-cheap code. Stage 11 (live cycle through systems) is therefore N/A and justified inline.

---

## Per-stage results (1–11)

| # | Stage | Result | Notes |
|---|---|---|---|
| 1 | System files loaded | ✅ PASS | `index.css:5` `@import './styles/design-system.css'` is the first import (before Tailwind). `main.tsx:4` `import './lib/design-system'` registers `window.{DESIGN_SYSTEMS, ACCENTS, SYSTEM_DEFAULT_ACCENT, applyDesignSystem}` (`design-system.ts:152-157`). |
| 2 | A system is applied | ✅ PASS | `client/index.html:21-22` synchronously sets `data-system="editorial"` + `data-accent="crimson"` on `<html>`. `--bg: #000000` resolves via `:root` in `design-system.css:16-68`. |
| 3 | Synchronous boot, no FOUT | ✅ PASS | Apply happens in inline `<script>` in `<head>` (`index.html:17-28`), not deferred/module/useEffect. `design-system.ts` self-init is intentionally no-op for styles (line 150-157 comment), so no race with the CSS layer. |
| 4 | Page chrome present | 🟡 PARTIAL | `.grain` ✅ present (`MainLayout.tsx:38`). `.page` wrapper ❌ absent — atmosphere is instead applied directly to `body` (`design-system.css:72-84`). Visual outcome matches handoff, but the structural contract drifts. See FIX #4. |
| 5 | Hardcoded-value scan | 🟡 4 actionable violations + acceptable exceptions | See FIX #1, #2, #3 and NITs #1–#4. Raw `rg` output in appendix. |
| 6 | Component class compliance | 🟢 Out-of-scope, documented gap | The app uses **shadcn primitives** (`<Button>`, `<Card>`, `<Input>`, `<Badge>`) instead of the handoff's raw `.btn`/`.card`/`.chip`/`.input` classes. shadcn's token bridge in `index.css` maps shadcn vars onto DS tokens. This is an architectural decision, not a per-occurrence violation. See Process note P1 (documentation gap). |
| 7 | Accent discipline (one accent moment per surface) | ✅ PASS (static review) | Static review of `MainLayout.tsx`, `AppHeader.tsx`, `AppSidebar.tsx`, `Home.tsx`, `About.tsx`, `Login.tsx` confirms accent (`--accent` / Editorial crimson) is used only via the documented allow-list: active sidebar nav indicator (`design-system.css:319-326`, `353-356`), `.eyebrow` (`387-397`), `.live-dot` / `.caret` (`128-147`), active tab underline (`429-432`), `.card.glow:hover` halo (`178`), `::selection` (`88`), and `.btn.primary` accent fill (`243-249`). No stray accent on decorative borders, body underlines, or multi-button surfaces was observed in the static sweep. Re-verify under Stage 11 live-switch criteria N/A here. |
| 8 | Text-tier discipline (no `--text-3`/`--text-4` on body copy) | ✅ PASS | Sweep across `client/src/pages/` and `client/src/components/layout/` returned zero hits for raw `text-3`/`text-4` usage on `<p>` / `<li>` body copy. Long-form copy uses `text-muted-foreground` (shadcn → DS bridge), which maps to `--text-2`, not `--text-3`. |
| 9 | Fonts loaded | ✅ PASS | `index.html:102` requests Inter (body), Fraunces (display), JetBrains Mono (mono). Family names in the `<link>` query match the tokens in `design-system.css:35-37`. Four other systems' fonts (Geist/Instrument Serif/Space Grotesk/IBM Plex Mono+Sans/Manrope) are preloaded for any future flip. |
| 10 | Per-system skin block intact | ✅ PASS | `rg -c '\[data-system=' client/src/styles/design-system.css` → **55** selectors (handoff baseline ≥15). All five system blocks present: editorial (546-549), terminal (552-582), geist (585-590), brutalist (593-634), swiss (637-654). |
| 11 | Live switch test across all 5 systems | ⚪ N/A | Single-personality Editorial-only build per WP-1. `DESIGN_SYSTEMS['terminal'/'geist'/'brutalist'/'swiss']` are undefined in the TS applier (`design-system.ts:32-79`); calling `applyDesignSystem('terminal','matrix')` falls back to `editorial` by the `resolvedSystem` guard at `design-system.ts:116`. The cycle test cannot meaningfully run. Skin blocks in CSS are preserved for future re-introduction. |

---

## Findings

### 🔴 BLOCK (0)
_None._

### 🟡 FIX (4)

1. **Stage 5 — `client/src/components/layout/SEOHead.tsx:87`**
   Offending value: `<meta name="theme-color" content="#dc2626" />` (Tailwind red-600, stale).
   Replacement: `<meta name="theme-color" content="#ff3d52" />` (literal required — meta cannot read CSS vars; literal must match `DESIGN_SYSTEMS.editorial.vars['--accent']` in `design-system.ts:32`).

2. **Stage 5 — `client/src/components/layout/SEOHead.tsx:88`**
   Offending value: `<meta name="msapplication-TileColor" content="#dc2626" />` (same stale crimson).
   Replacement: `<meta name="msapplication-TileColor" content="#ff3d52" />`.

3. **Stage 5 — `client/src/components/ui/micro-interactions.tsx:232` and `:234`**
   Offending value: `color: isBookmarked ? "#fbbf24" : "currentColor"` (Tailwind amber-400, not an Editorial token).
   Replacement (both lines): swap the literal for the runtime accent — read `getComputedStyle(document.documentElement).getPropertyValue('--accent')` into a `useEffect`-cached variable, e.g. `color: isBookmarked ? "var(--accent)" : "currentColor"` (motion `animate` accepts CSS var strings).

4. **Stage 4 — `client/src/components/layout/new/MainLayout.tsx:31-79`**
   Offending value: no element carries the `.page` class — atmosphere is applied to `body` instead (`design-system.css:72-84`).
   Replacement: wrap the `SidebarProvider` children in `<div className="page">…</div>` (the `.page` selector at `design-system.css:107-113` is already defined; just needs a host). Alternatively, document this divergence in `replit.md` if intentional, but until then it is a structural drift from the handoff contract.

### 🟢 NIT (10)

1. **Stage 5 — `client/src/components/admin/LinkHealthDashboard.tsx:345,352,359`** — recharts strokes `#22c55e`, `#ef4444`, `#eab308`. The first three are recharts series colors. **Acceptable** per Stage 5 rules (status-semantic), but should match the DS status hexes exactly. → Replace per line: `:345 stroke="#22c55e"` → `stroke="#34d08c"` (DS ok); `:352 stroke="#ef4444"` → `stroke="#ff5c7a"` (DS bad); `:359 stroke="#eab308"` → `stroke="#ffb84d"` (DS warn). Tag with `/* DS-OK: status semantic */`.

2. **Stage 5 — `client/src/components/admin/LinkHealthDashboard.tsx:366`** — `stroke="#f97316"` (Tailwind orange-500) does not map to any DS semantic.
   Replacement: `stroke="#b84dff"` (`DESIGN_SYSTEMS.editorial.vars['--accent-2']` literal — recharts cannot read CSS vars).

3. **Stage 5 — `client/src/components/ui/analytics-dashboard.tsx:65-66`** — palette array of 10 Tailwind hexes.
   Replacement: extract to `client/src/lib/charts/palette.ts` exporting `export const CHART_PALETTE = ['#ff3d52', '#b84dff', '#34d08c', '#ffb84d', '#5eddf2', '#ff5c7a', '#9d4edd', '#f4f3ee', '#34d08c', '#b84dff']` (literals derived from `DESIGN_SYSTEMS.editorial.vars` + status colors). Then `import { CHART_PALETTE } from '@/lib/charts/palette'` and `const COLORS = CHART_PALETTE`. Same import then drives lines `:360-361` (`<Area stroke fill>`), `:386` (`<Bar fill>`), `:535-544` (`<Line stroke dot.fill>`).

4. **Stage 5 — `client/src/components/ui/export-tools.tsx:180-187`** — hexes `#333`/`#666`/`#eee`/`#007acc`/`#f9f9f9`/`#e1e8ed`/`#999` and `border-radius: 3px` inside an HTML export template literal. **Acceptable** per Stage 5 — the output is a standalone exported document with no DS at runtime.
   Replacement: prepend `/* DS-OK: standalone exported HTML, no runtime DS */` comment above the template literal.

5. **Stage 5 — `client/src/lib/shadcn-themes.ts:16,50,84,118,152,186,286,335`** and `client/src/pages/ThemeSettings.tsx:99-101` — hex literals in a **theme-preset registry** + fallback colors for theme-picker preview swatches. **Acceptable** by definition (this file *describes* alternative themes; ThemeSettings is the theme picker UI).
   Replacement: prepend `/* DS-OK: alternative theme registry */` at top of `shadcn-themes.ts`; `/* DS-OK: preview-only theme picker */` above the `ThemeSettings.tsx:99-101` fallback block.

6. **Stage 5 — `client/src/components/ui/chart.tsx:55`** — `#ccc`/`#fff` inside attribute selectors (`[stroke='#ccc']`) targeting recharts-injected SVG. **Acceptable** — selector strings matching recharts' own internal paint, not author paint.
   Replacement: `/* DS-OK: recharts internal selector matchers */` comment above the line.

7. **Stage 5 — `client/src/index.css:25,32,33,38-41,45`** — eight hex literals declared as `--color-*` CSS custom properties (e.g. `--color-destructive: #ff5c7a`, `--color-chart-2: #34d08c`). **Acceptable** — this is the shadcn↔DS token bridge; the literals are the *source* of tokens consumed elsewhere, and three of them (`#ff5c7a`, `#34d08c`, `#ffb84d`) are the DS status colors verbatim. The remaining (`#000000`, `#5eddf2`, `#9d4edd`) are also DS-aligned (text-on-accent black + accent-2 palette extension).
   Replacement: prepend `/* DS-OK: shadcn↔DS token bridge */` comment above the `--color-*` block.

8. **Stage 5 — `client/src/components/ui/theme-provider.tsx:59`** — `safeGetItem("theme-custom-hex") || "#3b82f6"` (UX default for a custom-color picker). **Acceptable** — pure UX fallback inside theme-tooling, not paint of the live DS surface.
   Replacement: `/* DS-OK: color-picker default seed */` comment above the line.

9. **Stage 5 — `client/src/components/ui/color-palette-generator.tsx:397,587`** — color-picker default `"#3b82f6"` and palette-export fallback `"#ffffff"`. **Acceptable** — same rationale as NIT #8 (theme-tooling defaults).
   Replacement: `/* DS-OK: palette-generator defaults */` comments above each line.

10. **Stage 5 — `client/src/styles/scrolling-fix.css:45`** — `border-radius: 3px` on a scrollbar-thumb fix. The DS radii are `var(--radius)` (12px) / `var(--radius-sm)` (8px) / `var(--radius-pill)` (999px); 3px does not map cleanly.
    Replacement: introduce a `--radius-xs: 3px` token in `design-system.css :root` (or use `calc(var(--radius-sm) / 2.6)`), then change `scrolling-fix.css:45` to `border-radius: var(--radius-xs);`. If a new token is undesirable, tag `/* DS-OK: scrollbar-thumb micro-radius */` and document the intentional escape.

---

## Process notes (not findings)

These are project-level documentation gaps surfaced by the audit, separated from per-line findings to keep the FIX list strictly code-value:

- **P1. `replit.md` "Design-System scope" section is missing.** There is no in-repo record of (a) shadcn primitives replacing raw `.btn`/`.card`/`.chip`/`.input` classes (Stage 6), (b) body-level atmosphere replacing the `.page` wrapper (Stage 4), (c) single-personality Editorial-only build (Stage 11). Without this, every future Stage-6 sweep will keep flagging thousands of "stray" buttons as false positives. Action: add a "Design-System scope" section to `replit.md` listing the three intentional divergences with rationale plus the canonical shadcn↔DS mapping (e.g. shadcn `<Button variant="default">` ⇄ DS `.btn.primary`).

---

## What's good

- ✅ **Stage 1** — DS CSS loaded before Tailwind, applier globals registered (see Stage table).
- ✅ **Stage 2** — Editorial+Crimson applied on `<html>` synchronously.
- ✅ **Stage 3** — Inline-script boot, no FOUT path.
- ✅ **Stage 7** — Accent discipline upheld (single accent moment per surface in static review).
- ✅ **Stage 8** — No body-copy use of `--text-3` / `--text-4`.
- ✅ **Stage 9** — Inter / Fraunces / JetBrains Mono all loaded via Google Fonts; family names match tokens.
- ✅ **Stage 10** — 55 `[data-system=...]` selectors (well above ≥15 baseline); all five skin blocks intact.
- ✅ **Status semantics** (`#34d08c` ok / `#ffb84d` warn / `#ff5c7a` bad) properly tokenized in `design-system.css:280-282, 475-477`.
- ✅ **Login.tsx:209** uses `var(--warn, #ffb84d)` — exemplary token-with-fallback pattern; should be the project standard.

---

## Recommended next steps

1. **FIX #1 + #2** — two-line literal swap in `SEOHead.tsx:87,88` (`#dc2626` → `#ff3d52`). Eliminates the only DS mismatch that paints outside the React tree (PWA/browser chrome).
2. **FIX #3** — token-swap `#fbbf24` → `var(--accent)` in `micro-interactions.tsx:232,234`. Trivial.
3. **FIX #4** — wrap `MainLayout` children in `<div className="page">`. One-line restoration of the structural contract.
4. **Process note P1** — add "Design-System scope" section to `replit.md` documenting the three intentional divergences. Eliminates Stage-6 false-positive noise for all future audits.
5. **NIT #1–#10** — apply per-line replacements/tags above and prepend `/* DS-OK: <reason> */` to remaining intentional escapes so the next Stage-5 rg sweep auto-skips them.

---

## Appendix · Raw `rg` output (Stage 5 hardcoded-value sweep)

### Hex literals in `client/src` (excluding `design-system.css` / `design-system.ts`)
```
client/src/index.css:25:  --color-primary-foreground: #000000;
client/src/index.css:32:  --color-destructive: #ff5c7a;
client/src/index.css:33:  --color-destructive-foreground: #000000;
client/src/index.css:38:  --color-chart-2: #34d08c;
client/src/index.css:39:  --color-chart-3: #5eddf2;
client/src/index.css:40:  --color-chart-4: #ffb84d;
client/src/index.css:41:  --color-chart-5: #9d4edd;
client/src/index.css:45:  --color-sidebar-primary-foreground: #000000;
client/src/pages/ThemeSettings.tsx:99:            const primary = preset.dark?.primary || preset.light?.primary || "#000";
client/src/pages/ThemeSettings.tsx:100:            const secondary = preset.dark?.secondary || preset.light?.secondary || "#444";
client/src/pages/ThemeSettings.tsx:101:            const accent = preset.dark?.accent || preset.light?.accent || "#888";
client/src/pages/Login.tsx:209:            <p className="text-[color:var(--warn,#ffb84d)]">
client/src/lib/shadcn-themes.ts:16: preview: { bg: "#000000", sidebar: "#0a0a0a", accent: "#ff003c", text: "#ffffff", secondary: "#1a1a2e" }
client/src/lib/shadcn-themes.ts:50: preview: { bg: "#09090b", sidebar: "#0a0a0a", accent: "#65a30d", text: "#fafafa", secondary: "#1c1c22" }
client/src/lib/shadcn-themes.ts:84: preview: { bg: "#09090b", sidebar: "#0a0a0a", accent: "#ec4899", text: "#fafafa", secondary: "#1c1c22" }
client/src/lib/shadcn-themes.ts:118: preview: { bg: "#0c0a09", sidebar: "#1c1917", accent: "#f472b6", text: "#fafaf9", secondary: "#292524" }
client/src/lib/shadcn-themes.ts:152: preview: { bg: "#09090b", sidebar: "#0f0f23", accent: "#a855f7", text: "#fafafa", secondary: "#1e1b4b" }
client/src/lib/shadcn-themes.ts:186: preview: { bg: "#0c0a09", sidebar: "#1c1917", accent: "#8b5cf6", text: "#fafaf9", secondary: "#292524" }
client/src/lib/shadcn-themes.ts:286: preview: { bg: "#0a0a0a", sidebar: "#0a0a0a", accent: hex, text: "#fafafa", secondary: "#1c1c22" }
client/src/lib/shadcn-themes.ts:335: preview: { bg: "#0a0a0a", sidebar: "#0a0a0a", accent: hex, text: "#fafafa", secondary: "#1c1c22" }
client/src/components/admin/LinkHealthDashboard.tsx:345:                  stroke="#22c55e"
client/src/components/admin/LinkHealthDashboard.tsx:352:                  stroke="#ef4444"
client/src/components/admin/LinkHealthDashboard.tsx:359:                  stroke="#eab308"
client/src/components/admin/LinkHealthDashboard.tsx:366:                  stroke="#f97316"
client/src/components/layout/SEOHead.tsx:87:      <meta name="theme-color" content="#dc2626" />
client/src/components/layout/SEOHead.tsx:88:      <meta name="msapplication-TileColor" content="#dc2626" />
client/src/components/ui/theme-provider.tsx:59:      const hex = safeGetItem("theme-custom-hex") || "#3b82f6";
client/src/components/ui/analytics-dashboard.tsx:65:  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
client/src/components/ui/analytics-dashboard.tsx:66:  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
client/src/components/ui/analytics-dashboard.tsx:360: <Area type="monotone" dataKey="views" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
client/src/components/ui/analytics-dashboard.tsx:361: <Area type="monotone" dataKey="clicks" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
client/src/components/ui/analytics-dashboard.tsx:386: <Bar dataKey="usage" fill="#8b5cf6" />
client/src/components/ui/analytics-dashboard.tsx:535-544: <Line stroke="#3b82f6" dot={{ fill: '#3b82f6' }} … stroke="#10b981" dot={{ fill: '#10b981' }} />
client/src/components/ui/color-palette-generator.tsx:397: value={options.baseColor || "#3b82f6"}
client/src/components/ui/color-palette-generator.tsx:587: color: selectedPalette.colors[4] || '#ffffff'
client/src/components/ui/export-tools.tsx:180-187: (HTML export template literal: #333,#666,#eee,#007acc,#f9f9f9,#e1e8ed,#999)
client/src/components/ui/micro-interactions.tsx:232: color: isBookmarked ? "#fbbf24" : "currentColor"
client/src/components/ui/micro-interactions.tsx:234: color: isBookmarked ? "#fbbf24" : "currentColor"
client/src/components/ui/chart.tsx:55: (recharts attribute-selector strings: [stroke='#ccc'], [stroke='#fff'])
```

### Hardcoded `font-family: '…'` outside DS files
```
(none found)
```

### Hardcoded `border-radius: <N>px` outside DS files
```
client/src/styles/scrolling-fix.css:45:  border-radius: 3px;
client/src/components/ui/export-tools.tsx:186:  border-radius: 3px;   (inside HTML export template — DS-OK)
```

### Inline `style={{…}}` with hex literals in JSX
```
(none found)
```

### `rgba(255,255,255,…)` (whiteish hardcodes) outside DS files
```
(none found)
```

### Skin-block selector count
```
client/src/styles/design-system.css: 55  ([data-system="editorial|terminal|geist|brutalist|swiss"] selectors)
```
