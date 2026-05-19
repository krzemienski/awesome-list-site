# Design-System Compliance Audit · Awesome.Video (Editorial + Crimson)

**Verdict: FIX**

System detected: `editorial` × `crimson`
Files audited:
- `client/index.html` (boot script, fonts)
- `client/src/main.tsx` (entry)
- `client/src/index.css` (CSS import chain)
- `client/src/styles/design-system.css` (tokens + components + skin block, 774 lines)
- `client/src/lib/design-system.ts` (runtime applier)
- `client/src/components/layout/new/MainLayout.tsx` (page chrome)
- `client/src/pages/*.tsx`, `client/src/components/**/*.tsx` (hardcoded-value sweep)

Scope note: this project ships a **single-personality** build (Editorial+Crimson only) per WP-1. The other four systems (terminal/geist/brutalist/swiss) are intentionally removed from the TS applier but their skin blocks remain in CSS as dead-but-cheap code. Stage 10 still verifies the skin block; Stage 11 (live-switch verification across systems) is N/A and justified below.

---

## Findings

### 🔴 BLOCK (0)
_None._

### 🟡 FIX (8)

1. **Stage 5 — `client/src/components/layout/SEOHead.tsx:87`** — `<meta name="theme-color" content="#dc2626" />` is a stale generic crimson, not the Editorial accent. The browser chrome / PWA bar will paint Tailwind red-600 instead of the DS `#ff3d52`. → Replace with the Editorial accent literal `#ff3d52` (meta tags cannot read CSS vars, so a literal is required, but it must match `DESIGN_SYSTEMS.editorial.vars['--accent']` after crimson is applied). Same for line 88 `msapplication-TileColor`.

2. **Stage 5 — `client/src/components/ui/micro-interactions.tsx:232,234`** — bookmark "filled" color is hardcoded `#fbbf24` (Tailwind amber-400). This is a UI affordance, not a global semantic status. → Replace both with `var(--accent)` (or, if a separate "saved/starred" semantic is wanted, introduce a token rather than a hex).

3. **Stage 5 — `client/src/components/admin/LinkHealthDashboard.tsx:345,352,359,366`** — recharts series strokes are hardcoded `#22c55e` / `#ef4444` / `#eab308` / `#f97316`. The first three map naturally onto the DS semantic status palette (`#34d08c` ok, `#ff5c7a` bad, `#ffb84d` warn) which is acceptable per Stage 5's "acceptable hardcoded values" rule. The orange `#f97316` does not map and is a true violation. → Either swap the three to the DS status hexes (still hardcoded but acceptable) and replace `#f97316` with `var(--accent-2)`, or introduce three constants (`STATUS_OK_HEX`, `STATUS_WARN_HEX`, `STATUS_BAD_HEX`) re-exported from one place. Recharts cannot consume CSS vars directly so literals are unavoidable here.

4. **Stage 5 — `client/src/components/ui/analytics-dashboard.tsx:65-66, 360-361, 386, 535-544`** — full chart palette + multiple `<Area>` / `<Bar>` / `<Line>` `stroke`/`fill` props are hardcoded `#3b82f6`, `#10b981`, `#ef4444`, `#f59e0b`, `#8b5cf6`, `#06b6d4`, `#84cc16`, `#f97316`, `#ec4899`, `#6366f1`. Same root cause as #3 (recharts can't read CSS vars). → Centralize a "data-viz palette" derived from `--accent` / `--accent-2` plus the three DS status colors, exported once from `client/src/lib/charts/palette.ts`, and consume by name. Even if the literals remain, at least one source of truth.

5. **Stage 5 — `client/src/components/ui/export-tools.tsx:180-187`** — HTML export template literal contains `#333`, `#666`, `#eee`, `#007acc`, `#f9f9f9`, `#e1e8ed`, `#999`. These are **acceptable per Stage 5 rules** because the output is a standalone exported HTML document that has no relationship to the DS at runtime. → No change required; document as intentional with a `/* DS-OK: standalone export */` comment so future audits don't re-flag.

6. **Stage 5 — `client/src/pages/ThemeSettings.tsx:99-101`** — Theme-preset preview swatches fall back to `"#000"` / `"#444"` / `"#888"` when a preset has no dark/light primary defined. These are last-ditch fallbacks inside a theme-picker that previews **non-Editorial themes**, so the hardcoded fallbacks are intentional. → Acceptable; add `/* DS-OK: preview-only theme picker */` comment.

7. **Stage 4 — `client/src/components/layout/new/MainLayout.tsx`** — `.grain` is present (line 38) but no element carries the `.page` class. The atmospheric radial gradient is instead applied directly to `body` in `design-system.css:72-83`. This works (body atmosphere paints) but diverges from the handoff contract that asks for an explicit `.page` wrapper. → Either wrap the entire layout (`<SidebarProvider>` children) in a single `<div className="page">…</div>`, or document this as an intentional structural divergence in `replit.md` (current state: undocumented). Severity 🟡 because the visual outcome matches, but a future system switch that relies on `.page` would break silently.

8. **Stage 6 — Component class compliance, widespread** — The handoff DS publishes `.btn`, `.btn.primary`, `.btn.ghost`, `.btn.icon`, `.chip`, `.card`, `.input`, `.tab`, `.eyebrow`, `.kbd` etc. as the canonical component layer. The Replit app uses **shadcn primitives** (`<Button>`, `<Card>`, `<Input>`, `<Badge>`) instead, with shadcn's own token bridge in `client/src/index.css`. The bridge appears to map shadcn vars to DS tokens, so the visual result is close, but the two component systems are not 1:1 (e.g. shadcn `<Button variant="default">` ≠ DS `.btn.primary` in border/weight/hover behavior). → This is an architectural choice not a defect, but it should be documented in `replit.md` under "DS adoption scope" so future audits know to skip raw `.btn`/`.chip` lookups. Severity 🟡 because the audit's Stage 6 selectors will keep returning thousands of "stray" buttons until the scope is recorded.

### 🟢 NIT (3)

1. **Stage 5 — `client/src/lib/shadcn-themes.ts`** (lines 16, 50, 84, 118, 152, 186, 286, 335) — Hex literals inside a **theme-preset registry** consumed only by `/settings/theme`. Intentional by definition (the file describes alternative themes). → No fix; tag with `/* DS-OK: alternative theme registry */` to suppress future false positives.

2. **Stage 5 — `client/src/components/ui/theme-provider.tsx:59`** and `color-palette-generator.tsx:397,587` — Default seed colors `#3b82f6` / `#ffffff` for color pickers and palette generators. Pure UX defaults inside theme tooling. → Acceptable.

3. **Stage 5 — `client/src/components/ui/chart.tsx:55`** — `#ccc` / `#fff` appear inside attribute selectors targeting recharts-injected SVG nodes (e.g. `[stroke='#ccc']`). These are selector strings matching recharts' own internal paint — not styles we author. → Acceptable; no change needed.

---

## What's good

- ✅ **Stage 1 — System files loaded.** `client/src/index.css:5` `@import './styles/design-system.css'` is the first import (before Tailwind). `client/src/main.tsx:4` `import './lib/design-system'` registers `window.DESIGN_SYSTEMS`, `window.ACCENTS`, `window.SYSTEM_DEFAULT_ACCENT`, `window.applyDesignSystem`.
- ✅ **Stage 2 — System applied.** `client/index.html:21-22` synchronously sets `data-system="editorial"` and `data-accent="crimson"` on `<html>` before any module loads. `--bg` resolves via the `:root` block in `design-system.css:16-68`.
- ✅ **Stage 3 — Synchronous boot, no FOUT.** The apply happens in an inline `<script>` in `<head>` (`client/index.html:17-28`), not in a deferred module or `useEffect`. `design-system.ts` self-init at line 152-157 is no-op for styles (only registers `window` globals), confirming no race.
- ✅ **Stage 4 — `.grain` overlay present.** `MainLayout.tsx:38` renders `<div className="grain" aria-hidden="true" />`. Body-level atmosphere via `design-system.css:72-84` (instead of `.page` wrapper, see FIX #7).
- ✅ **Stage 9 — Fonts loaded.** `client/index.html:102` requests Inter, Fraunces, JetBrains Mono (plus the four other systems' fonts preloaded for future flips). `--font-display: 'Fraunces'`, `--font-body: 'Inter'`, `--font-mono: 'JetBrains Mono'` all match.
- ✅ **Stage 10 — Per-system skin block intact.** `rg -c '\[data-system=' client/src/styles/design-system.css` returns **55** selectors (handoff baseline ≥15). Editorial / Terminal / Geist / Brutalist / Swiss blocks all present (lines 546-654).
- ✅ **Stage 11 — N/A justified.** This is a single-personality Editorial+Crimson build per WP-1; the four other systems are intentionally dormant in the TS applier (`design-system.ts:32-79` defines only `editorial`). The live cycle-through-systems test cannot run because `DESIGN_SYSTEMS['terminal']` etc. are undefined. The skin block in CSS is preserved for future re-introduction; no failure to report.
- ✅ **Stage 8 — Ink-tier discipline.** No `text-3` / `text-4` token misuse found on body copy in the `client/src/pages/` and `client/src/components/layout/` sweep. The few `text-muted-foreground` usages go through the shadcn→DS bridge, not raw `--text-3`.
- ✅ **Status semantics** `#34d08c` / `#ffb84d` / `#ff5c7a` are properly tokenized as the DS status colors in `design-system.css:280-282` (chip variants) and `475-477` (dot variants).
- ✅ **Login.tsx:209** uses `var(--warn, #ffb84d)` — exemplary token-with-fallback pattern; should be the project standard.

---

## Recommended next steps

1. **Fix FIX #1** (SEOHead.tsx theme-color): one-line literal swap, eliminates the only DS-mismatch that paints outside the React tree.
2. **Fix FIX #2** (micro-interactions bookmark color): replace `#fbbf24` with `var(--accent)`; trivial token swap, removes a stray accent-like color from running UI.
3. **Centralize chart palette** (FIX #3 + #4): create `client/src/lib/charts/palette.ts` exporting `CHART_PALETTE`, `STATUS_OK_HEX`, `STATUS_WARN_HEX`, `STATUS_BAD_HEX` (literals required by recharts), then refactor `LinkHealthDashboard.tsx` and `analytics-dashboard.tsx` to import from it. Single source of truth.
4. **Document the DS adoption scope** (FIX #7 + #8) in `replit.md` under a new "Design-System scope" section: (a) body-level atmosphere replaces `.page` wrapper, (b) shadcn primitives replace `.btn`/`.card`/`.chip` classes, (c) Editorial-only single-personality build. This prevents future audits from re-raising the same structural divergences.
5. **Tag intentional escapes** (FIX #5, #6, NIT #1, #3) with `/* DS-OK: <reason> */` comments so the next Stage-5 rg sweep auto-skips them.

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
client/src/lib/shadcn-themes.ts:16,50,84,118,152,186,286,335:  (theme-preset registry hexes)
client/src/components/admin/LinkHealthDashboard.tsx:345: stroke="#22c55e"
client/src/components/admin/LinkHealthDashboard.tsx:352: stroke="#ef4444"
client/src/components/admin/LinkHealthDashboard.tsx:359: stroke="#eab308"
client/src/components/admin/LinkHealthDashboard.tsx:366: stroke="#f97316"
client/src/components/layout/SEOHead.tsx:87: <meta name="theme-color" content="#dc2626" />
client/src/components/layout/SEOHead.tsx:88: <meta name="msapplication-TileColor" content="#dc2626" />
client/src/components/ui/theme-provider.tsx:59:   const hex = safeGetItem("theme-custom-hex") || "#3b82f6";
client/src/components/ui/analytics-dashboard.tsx:65-66,360-361,386,535-544: (chart palette + recharts props)
client/src/components/ui/color-palette-generator.tsx:397,587: (color-picker default + fallback white)
client/src/components/ui/export-tools.tsx:180-187: (HTML export template literal)
client/src/components/ui/micro-interactions.tsx:232,234: color: isBookmarked ? "#fbbf24" : "currentColor"
client/src/components/ui/chart.tsx:55: (recharts selector strings, not authored paint)
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
