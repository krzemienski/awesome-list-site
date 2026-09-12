# Visual before/after at 1440 — zero delta

Full-page PNG captures (1440×900 viewport, `deviceScaleFactor` 1, stored
preferences `editorial/crimson`, analytics consent denied, admin captured with
the audit-key header on every same-origin request) taken with
`/tmp/parity-tokens/capture.mjs` before the first CSS edit and again after the
last one. The PNG files are byte-identical per route, so only the AFTER copies
are committed here (as JPEG to keep the folder small).

| route | before SHA-256 (PNG) | after SHA-256 (PNG) | identical | page height | committed copy |
|---|---|---|---|---|---|
| `/` | `6416cfe5f207…` | `6416cfe5f207…` | yes | 1278px | `after-home-1440.jpg` |
| `/category/encoding-codecs` | `9bc1e0aeb9b3…` | `9bc1e0aeb9b3…` | yes | 3788px | `after-category-encoding-codecs-1440.jpg` |
| `/admin` | `1943dd9341c0…` | `1943dd9341c0…` | yes | 2287px | `after-admin-1440.jpg` |

Why zero delta is the expected result: the only token value that differs from
the design (`--text-3`) was already in production and is kept; the nine shell
geometry tokens have no consumers except the admin measure below;
`--shell-footer-measure` resolves to the same 1240px through
`var(--content-max)`; `.chip` (10.5px) has no raw consumer in TSX;
`.hide-tablet`/`.show-tablet` are unused; the `.grain` asset decodes to the
same SVG bytes.

## Admin measure (review round 2)

`.admin-dashboard` now reads `var(--content-max-admin, 80rem)` (1400px)
instead of `var(--content-max, 80rem)`. `admin-measure.json` records the
computed `max-width` and the rendered width of `.admin-dashboard` at 1920 and
1440 under the live rule, the round-1 rule and the pre-task rule (injected as
`!important` overrides on the same page): `max-width` is 1400 / 1240 / 1280px,
the rendered width is 1184px at 1920 and 1064px at 1440 in all three, because
the shell's page column caps the admin content first. `after-admin-1920.jpg`
is the live capture at 1920.
