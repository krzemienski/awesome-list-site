---
name: Page atmosphere raster clip
description: The full-page radial-gradient atmosphere costs seconds of software raster on long pages; clip it to its visible bands via a per-system token instead of removing it.
---
`--bg-atmosphere` (two radial ellipses ending at `transparent 60%`) painted over the whole `.page` box rasterised ~4.6s per Home load on a 6000px page even though everything between the top ~420px and bottom ~300px is exactly transparent. Paint `var(--bg)` on `.page::before` and the atmosphere on `.page::after` (both `z-index:-1`), clip only `::after` with `--bg-atmosphere-clip`, and make every system that redefines `--bg-atmosphere` redeclare the clip for its own geometry (`none` for full-page atmospheres).

Clipping alone is not enough: the auto-sized gradient is still TILED over the whole box by the initial `background-repeat: repeat` (~350ms of first-frame raster on the compiled Home). Add a per-system repeat token (`no-repeat` default; a grid-pattern system like Swiss re-declares `repeat`) — pixel-identical because an auto-sized gradient's tile equals its positioning area.

**Why:** pixels are identical by construction (verified pixel PASS at 375/768/1024/1440), while raster fell to ~1s; `in srgb`, will-change, blend/grain removal and `background-attachment` changes measured no gain.

**How to apply:** `.page` must stay transparent (documented deviations `rule:.page:background*` in canonical-token-parity, with canaries); regenerate the design-system artifact tokens after adding a token or `product-profile-browser` fails "artifact tokens are stale".
