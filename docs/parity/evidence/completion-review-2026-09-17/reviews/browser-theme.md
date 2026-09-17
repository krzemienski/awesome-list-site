# Scoped native browser verification: browser-theme

MAIN-app theme/font consistency verification passed in a fresh guest context at `http://127.0.0.1:5000`. Two pages were kept open in the same context: `/design-system` (`showcasePage`) and `/settings/theme` (`themePage`). No credentials, storage/DOM/React-state manipulation, source writes, auth, data mutation, or new harness were used.

Verified journey:
- Baseline showcase: Editorial · Crimson, html `data-font="system"`, computed `--font-body` and `[data-testid=ds-token-value-font-body]` both `"'Inter', system-ui, sans-serif"`, body font Inter.
- On the separate visible Theme Settings font picker, selected the nondefault `Source Sans 3` option (`data-testid=font-option-source-sans`) normally. Settings showed it checked and displayed `Font applied — Source Sans 3 is now active.`
- Without reloading or remounting the original showcase, live DOM verification reported:
  - html `data-font="source-sans"`
  - computed `--font-body`: `"'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif"`
  - catalog `[data-testid=ds-token-value-font-body]`: identical value
  - `match: true`
  - body font: `"Source Sans 3", "Source Sans Pro", system-ui, sans-serif`
- Reloaded only the showcase. The saved Source Sans 3 override survived reload with `data-font=source-sans`, matching computed/catalog values, and Editorial · Crimson still active.
- Clicked visible Terminal system control on the showcase. It switched to `Active: Terminal · Matrix`; Source Sans 3 remained manual and consistent. Terminal tokens updated live: `--radius: 0px`, display font `"'IBM Plex Mono', ui-monospace, monospace`.
- Clicked visible Editorial system control. It returned to `Active: Editorial · Crimson`; Source Sans 3 still matched computed/catalog values, while Editorial tokens updated to `--radius: 12px` and display font `"'Fraunces', Georgia, serif"`.
- Restored guest defaults through the visible Theme Settings controls by selecting `System default`. Settings showed System default, Editorial, and Crimson checked with `Font applied — System default is now active.` Final live showcase verification reported `data-font=system`, Inter computed/catalog/body values matching, Editorial radius 12px, Fraunces display font, and active Editorial · Crimson.

Relevant native screenshots:
- `ml83de` — baseline Editorial/Crimson showcase.
- `f1anig` — Source Sans 3 visibly selected with Font applied feedback.
- `oroxxn` — unchanged showcase after cross-page Source Sans propagation.
- `scpqya` — Source Sans 3 settings state and live preview.
- `vgxg7b` / `tob98i` — Terminal/Matrix state and Terminal token verification context.
- `s5wxn0` — Source Sans 3 retained in Terminal live preview.
- `1mgqbi` / `bdxpbh` — Editorial restored while manual Source Sans remained active.
- `ruvqw7` / `xk2x0b` — System default restored in the visible settings picker.
- `jxauor` — final native showcase token-catalog capture showing Typography `--font-body 'Inter', system-ui, sans-serif`, Editorial token values, and final default state.

Browser/application console review: no application errors were observed. Only expected Clerk development-key and analytics-consent notices appeared; the consent banner remained visible and was not interacted with.
