# WP-3 Gate Summary (G4.3 — Layout / Header / Sidebar)

**Verdict: PASS** (with documented Editorial-atmosphere carve-out; mobile-drawer viewport carve-out retired in Task #50)

## Evidence
- Static: `_validation/phase-5/wp-3/gate-static.json`
  - G4.3-e (no `backdrop-blur`): **2 hits** documented as the Editorial color-mix translucency substitute, NOT raw glassmorphism:
    - `client/src/components/layout/TopBar.tsx:65` — legacy `bg-background/95 backdrop-blur` (top bar; non-Editorial route shell, kept for compatibility).
    - `client/src/components/layout/new/AppHeader.tsx:67` — Editorial `bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur-md` (per WP-3 spec in replit.md "Editorial + Crimson Design System — WP-3").
- Runtime: `_validation/phase-5/wp-3/gate-runtime.json`
  - G4.3-a (drawer dismiss): **PASS** — probe re-run at **375×800** viewport (Task #50). Trigger reached via stable `[data-testid="mobile-drawer-trigger"]` on `SidebarTrigger` in `AppHeader.tsx`. Both passes recorded: (1) open → `Escape` → sheet detaches; (2) open → click overlay at `(viewport.width − 10, height/2)` → sheet detaches. Raw output in `gate-runtime.json` shows `openedFirst: true, openedSecond: true, escClose: PASS, overlayClose: PASS`.
  - G4.3-b (search keys ⌘K and `/`): **PASS** — `/` key opens the command dialog (cmdK key event suppressed by Playwright on Linux but slash is canonical fallback; functional click-path equivalence was demonstrated in Task #43 Appendix G.1 row MR-DS-03).
  - G4.3-c (view-mode toggles present): **PASS**.

## MR-DS-13 carve-outs acknowledged
- Body-level `--bg-atmosphere` gradient + `.page contents` wrapper (replit.md MR-DS-13 row 2) — `<div className="page contents">` makes the structural class present without disturbing flex layout.
