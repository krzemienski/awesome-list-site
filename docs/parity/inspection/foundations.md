# Phase 0 foundations inspection (read-only)

## Scope and ledger
The exact owned scope is enumerated in `scope.txt` and recorded in `foundations-read.json`: 94 files (all `client/src/components/ui/**`, `client/src/lib/**`, `client/src/hooks/**`, and every client CSS file including top-level `client/src/index.css`). Each entry has SHA-256, byte count, line count, and complete-read status. No workspace files were modified. The ledger was generated from the complete on-disk bytes; no credentials, env files, or secrets were read.

The requested artifact docs subtree `artifacts/awesome-video-design-system/docs/**` does not exist (explicit missing path). Existing artifact source was read: `DESIGN.md`, `tokens.json`, `src/App.tsx`, `src/index.css`, `src/consumer.ts`, `src/main.tsx`. Artifact source directly imports the shipping runtime CSS/registry rather than duplicating them.

## Authoritative runtime chain
- `client/src/lib/design-system.ts` owns `THEME_FALLBACK_REGISTRY`, five systems, ten accents, defaults, `SYSTEM_DEFAULT_ACCENT`, `THEME_BOOT_DATA`, `applyDesignSystem`, and safe localStorage persistence (`ds-system`, `ds-accent`). Invalid/retired IDs resolve to registry defaults; application is via root data attributes and CSS selectors.
- `client/src/lib/font-options.ts` owns `FONT_OPTIONS`, font IDs/stacks/loaders, `FONT_BOOT_DATA`, and `ds-font-override` handling. The stack and stylesheet maps are coupled by validation; the live webfont fetch probe is explicitly opt-in.
- `client/index.html` prepaint script consumes Vite-injected theme/font boot payload markers, reads localStorage defensively, validates IDs, sets `data-system`, `data-accent`, `data-font`, and font custom properties before paint; it preconnects Google Fonts and loads Inter. This is the runtime boot authority, not a hand-maintained source-design allowlist.
- `client/src/hooks/use-theme.ts` and `client/src/components/ui/theme-provider.tsx` reapply/synchronize theme state, system-specific default accents, font override, storage events, and system-profile behavior after hydration.
- `client/src/styles/design-system.css` is canonical CSS token/component/skin ownership; `client/src/index.css` imports it plus mobile, skeleton, scrolling fixes and Tailwind bridge. CSS has explicit 44px minimum control/focus contracts; retain that contract and existing semantics.
- `artifacts/awesome-video-design-system/src/App.tsx` is a living consumer of the registry (`DESIGN_SYSTEMS`, `ACCENTS`, `PRODUCT_PROFILES`, `SYSTEM_DEFAULT_ACCENT`, `applyDesignSystem`), with `aria-pressed` theme/accent controls. `src/index.css` imports runtime CSS directly. `consumer.ts` re-exports runtime registry. `tokens.json` is generated and identifies runtime CSS/TS/profile CSS as edit sources.

## Design-system implications
Identity is dark-only, Editorial + Crimson by default; personalities are Editorial, Terminal, Geist, Brutalist, Swiss; accents are Crimson, Magenta, Orange, Amber, Emerald, Matrix, Cyan, Violet, Lime, Rose. Product profiles are public-discovery, learning-workspace, admin-operations, standalone-exports, embedded-integrations. Saved choices override profile first-visit defaults. Shared targets remain >=44x44; preserve keyboard focus, ARIA, analytics, test IDs, auth/API behavior.

## Archive/design findings applied
`.local/tasks/verified-app-design-parity-archive-review.md` reports two source generations; modular source is newer (Index/Curated, command palette, full footer, L3 sidebar, persisted rail). Historical standalone captures are not canonical expected renders. Source sample data is not production data. Reference accessibility defects must not be copied. Breakpoint conflict (drawer/sidebar around 768/1024) requires explicit brief contract, not literal source assumptions. Fonts require synchronization of stacks, loaders, prepaint, and artifact projection.

## Limitations / unverified
No product code, tests, browser, server, dev server, or network checks were run, per Phase 0 request. Source inspection cannot prove runtime functionality or parity. The requested `artifacts/awesome-video-design-system/docs` recursion is unavailable; no claims are made about those missing documents. `replit.md` and the supplied brief were read only within tool output limits; omitted portions are not treated as verified. The ledger's complete-byte accounting is explicit, but any file whose rendered output exceeded tool display limits should be re-opened in contiguous chunks before implementation claims.
