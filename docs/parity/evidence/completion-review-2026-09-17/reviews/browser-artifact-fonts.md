# Scoped native browser verification: browser-artifact-fonts

Focused artifact-only font journey passed at `http://127.0.0.1:20928` in a fresh guest context. No MAIN-app navigation, source writes, storage manipulation, auth, or new harness was used.

Navigation and theme flow:
- Visible Showcase `Docs ↗` navigated to exact `#docs-overview`.
- Visible Docs `Typography` chapter navigated to exact `#docs-typography`.
- Visible `← AWESOME.VIDEO` returned to exact `#showcase`.
- Visible Terminal control switched Showcase to Terminal/Matrix; screenshot `22jv5l` shows the real CRT/monospace surface.
- Visible Docs → Typography navigation returned to exact `#docs-typography` in Terminal styling; screenshot `lphi8i` captures the Terminal Typography page.
- Browser reload on exact `#docs-typography` preserved the Terminal theme and Typography route. Screenshot `utux2n` captures the reloaded Terminal Typography page.
- Visible `← AWESOME.VIDEO` returned to Showcase, then visible Editorial and visible Crimson controls restored Editorial/Crimson. Final Showcase screenshot is `tnspbz` (also `wkdgqf`/`l49b5t`).

Canonical Google Fonts contract:
Every checked view kept exactly one identical Google Fonts `css2` stylesheet link. The exact href was:
`https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600;700&family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap`

Observed on Showcase, Docs Overview, and Docs Typography:
- css2 link count: `1`
- decoded family count: `9`
- families: Inter, Fraunces, JetBrains Mono, Geist, Instrument Serif, Space Grotesk, IBM Plex Mono, IBM Plex Sans, Manrope
- IBM Plex Sans present: true
- canonical resource entry present: true
- no narrower Docs font request observed
- `document.fonts.status`: `loaded`
- no failed font response or browser error was observed; browser logs only contained normal Vite/React DevTools messages.

Loaded face checks (separate from first-paint timing):
- Editorial Showcase: real hero heading computed `Fraunces, Georgia, serif`, weight 500; `document.fonts.check('500 40px Fraunces')` returned true.
- Editorial Docs Typography: real `Typography` heading computed `Fraunces, Georgia, serif`, weight 500; the same weight-appropriate check returned true.
- Terminal Docs Typography: real `Typography` heading computed `"IBM Plex Mono", ui-monospace, monospace`, weight 600; both quoted/plain IBM Plex Mono checks returned true, and `All three: IBM Plex Mono` was present in the real page content.
- After Terminal Typography reload: URL remained `#docs-typography`, Typography stayed active, heading remained IBM Plex Mono at weight 600, `document.fonts.check` stayed true, `document.fonts.status` stayed loaded, and css2 link count stayed 1.

No first-paint, boot-flash, or flash-timing claim is made. The only initial probe discrepancy was an intentionally corrected 400-weight Fraunces check; the actual Editorial heading renders at weight 500 and passed the weight-appropriate check. Final state is restored to Editorial/Magazine/Fraunces with Crimson active at exact `#showcase`.
