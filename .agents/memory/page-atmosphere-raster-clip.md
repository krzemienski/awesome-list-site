---
name: Page atmosphere raster clip
description: Historical. The .page::before/::after atmosphere clip and --bg-atmosphere-clip token no longer exist in the CSS; the atmosphere is .page's own background.
---
The `.page::before` / `.page::after` split and the `--bg-atmosphere-clip` and repeat tokens described here earlier are gone from the shipped CSS (no matches in `client/` on 2026-10-25). The atmosphere is now painted as `.page`'s own background (`client/public/ds/design-system.css`, `.page` rules).

**Why:** this note told agents to keep and extend CSS that no longer exists.

**How to apply:** if long pages show seconds of raster again, measure first; the earlier finding still holds as a technique (a full-box radial gradient that is transparent in the middle can be clipped or set to `no-repeat` with identical pixels), but re-derive it against the current `.page` rules.
