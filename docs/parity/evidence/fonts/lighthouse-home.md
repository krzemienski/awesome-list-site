# Lighthouse (mobile preset) — font-related audits, `/`

Baseline: `tests/parity/production-baseline/2026-09-12/lighthouse/home.json` (https://awesome.video, captured 2026-09-12T06:25:30.372Z).
After: local dev server http://127.0.0.1:5000 with the canonical font link (captured 2026-09-12T19:00:10.114Z, `node scripts/validation/production-baseline-capture.mjs --base http://127.0.0.1:5000 --out /tmp/fonts-evidence/lighthouse-after --only lighthouse --max-navigations 1`). Lighthouse 12.8.2 on both sides.

Performance-class numbers are not comparable across the two origins (the dev server serves unbundled Vite modules over HTTP/1.1 with no CDN); the rows that matter for this task are the font audits and CLS.

| Audit | Production baseline | After (local dev) |
|---|---|---|
| `font-display` | 1 | 1 |
| `uses-rel-preconnect` | 1 | 1 |
| `render-blocking-resources` | 0.5 (Est savings of 0 ms) | 0 (Est savings of 1,340 ms) |
| `cumulative-layout-shift` | 0.99 (0.052) | 0.99 (0.044) |
| `first-contentful-paint` | 0.43 (3.2 s) | 0.64 (2.6 s) |
| `largest-contentful-paint` | 0.7 (3.3 s) | 0 (9.9 s) |
| category `best-practices` | 1 | 0.96 |
| category `accessibility` | 1 | 1 |
| category `seo` | 1 | 1 |

Best-practices audits below 1 — baseline: valid-source-maps=0; after: errors-in-console=0.
The only after-side deduction is `errors-in-console`, and both console errors are environment noise the read-only capture harness itself causes on a dev server (it seals `WebSocket`, so the Vite HMR client logs a refused connection, and the Clerk development instance logs a failed fetch). Neither mentions fonts; production serves no HMR client.

`render-blocking-resources` lists the font stylesheet on both sides (production: the old two-link pair, one shown; after: the single canonical link). The estimated saving is a dev-server artefact (1,340 ms locally vs 0 ms in production) — the link was render-blocking before as well, and it is `display=swap` on both sides.

## Font network requests seen by Lighthouse

Production baseline:
- 200 Stylesheet `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`
- 200 Font `https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2`
- 200 Stylesheet `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=JetBrains+Mono:wght@400;500;600;700&display=swap`
- 200 Font `https://fonts.gstatic.com/s/fraunces/v38/6NU78FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0KxC9TeP2Xz5c.woff2`

After:
- 200 Stylesheet `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600;700&family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap`
- 200 Font `https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2`
- 200 Font `https://fonts.gstatic.com/s/fraunces/v38/6NUu8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nib14c7qv8oRcTn.woff2`

Two font files download on `/` after the change (Inter 400–800 variable subset, Fraunces `ital,wght` variable subset) against two files plus a second stylesheet before (Inter, Fraunces `opsz,wght`); the other seven families are declared but no face of theirs is used on `/`, so nothing downloads for them.
