# 375px filmstrip — no prepaint flash

CDP `Page.startScreencast` on a cold navigation at 375×812 (mobile emulation, localStorage pre-seeded with `ds-system=editorial`, `ds-accent=crimson`, analytics consent denied). Frames captured before the document's `responseStart` belong to the previous `about:blank` page and are labelled as such. An init-script MutationObserver on `<html>` records `data-system`/`data-accent` at attach time, first rAF, DOMContentLoaded, load and load+1.5s.

| route | first document frame | top-left / gutter / centre px | black fraction | attrs at observer attach | attrs at first rAF | attribute value changes after first paint | verdict |
|---|---|---|---|---|---|---|---|
| `/` | frame 0 @ +193ms after responseStart | #000000 / #000000 / #000000 | 0.892 | editorial/crimson @ 7.3ms | editorial/crimson @ 125.3ms | 0 | PASS |
| `/settings/theme` | frame 1 @ +62ms after responseStart | #000000 / #000000 / #09090c | 0.564 | editorial/crimson @ 8.7ms | editorial/crimson @ 35.4ms | 0 | PASS |

Later `mutation:data-system` / `mutation:data-accent` entries in `filmstrip.json` are React's theme provider re-asserting the SAME values after hydration (system/accent recorded on each entry stay `editorial/crimson`); no frame ever paints a different theme.

- `filmstrip-home-375.png` — first eight unique document frames of `/` (server-injected crawler HTML in final colours → skeleton → hydrated app; every frame black `--bg` with crimson accent).
- `filmstrip-settings-theme-375.png` — same for `/settings/theme`.
- `filmstrip.json` — per-frame timing, sampled pixels, black/white fractions and the attribute timeline.
