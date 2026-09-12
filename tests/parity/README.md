# Independent visual baseline harness

**Current status:** The complete pre-product-change Phase 1 inventory baseline
has run; see `tests/parity/REPORT.md` and `docs/parity/REPORT.md`. Visual
failures are expected baseline results. Missing counterparts, unavailable roles,
and unverified token-only states remain explicit and keep the parity gate open.

This directory contains the real-browser comparator only. It does not start the
application or artifact, alter product/reference source, bypass authentication,
or intercept application responses.

## Run contract

```sh
BASE_URL="https://externally-supplied-app-proxy" \
ARTIFACT_BASE_URL="http://127.0.0.1:<port-from-artifact-status>" \
node tests/parity/runner.mjs
```

Useful diagnostics:

```sh
node tests/parity/runner.mjs --list
node tests/parity/runner.mjs --screen app.home.index --width 375
```

A filtered run is always labelled `filtered-diagnostic-only` and can never
claim the full gate. The runner requires externally supplied running services,
uses the pinned Playwright Chromium already present under `.cache`, and refuses
to download a browser. It stages all PNG and report writes under `/tmp`, closes
the browser and loopback reference server, then copies a never-overwritten run
to `tests/parity/baseline/<run-id>/`.

Both supplied service origins are rejected unless they are credential-free
HTTP loopback origins on the registered ports: app `5000`, artifact `20928`.
Redirects away from those origins are rejected. Chromium launches without
`--no-sandbox`; if the Nix/Replit runtime cannot provide a working Chromium
sandbox, execution must stop and report that environment limitation rather than
silently weakening isolation.

The reference server binds to an ephemeral loopback port and serves only an
in-memory byte snapshot read from `awesome-list-site-ds` before hashing. It
never serves the repository root or re-reads mutable source during a run. Its
sole adapter reads the public
`/api/awesome-list` and `/api/awesome-list/nav` responses without credentials,
records their SHA-256 provenance, and binds that exact approved catalog to the
reference `AV_*` globals before React renders. Production requests and
screenshots remain unaltered. Admin is fail-closed because the reference's demo
users, activity, and statistics are not real application data.

Every declared inventory row is emitted. Missing counterparts, blockers, and
unverified token-only rows remain visible outside the pixel denominator and
keep the full gate unpassed. Missing pairs also produce a non-zero exit.
Exact duplicate full-page capture identities are represented as aliases and
never double the denominator. The runner retains up to eight bounded raw
attempts and admits only two consecutive byte-identical full-page frames.
`OUTPUT-MANIFEST.json` hashes every evidence output, and copied run directories
are made read-only; end-of-run input rehashing marks changed evidence stale.
Expected and actual captures use Chromium, DPR 1, fixed viewport heights,
en-US/UTC, dark mode, reduced motion, loaded fonts, a quiet/stable DOM, and
full-page PNGs. Blank/loading captures are rejected. Images are never resized
or cropped: differing dimensions are padded to a union canvas, unmatched pixels
are counted, and the row fails.

## Comparator choice

The root currently resolves `playwright` 1.61.1 while `@playwright/test` is
pinned at 1.60.0; the harness imports the resolved `playwright` 1.61.1 launcher
and records the actual Chromium version/path in each run. It does not imply that
the two package versions are identical. Pixel comparison uses `pixelmatch`
7.1.0 directly with the
required `threshold: 0.1`; `sharp` (already installed) decodes/encodes PNG data
and constructs the union canvas. Playwright's snapshot matcher was rejected
because its baseline update workflow and project-relative snapshots make it too
easy to replace expected evidence, while this task requires independently
captured immutable reference baselines. ResembleJS and SSIM-only comparators
were rejected because they would introduce another dependency and would not
implement the mandated pixelmatch threshold.

API behavior follows the installed-version Playwright documentation for
`browser.newContext`, `page.screenshot({fullPage:true})`, `document.fonts.ready`,
and reduced-motion emulation. Pixelmatch's documented raw RGBA interface is
used so dimensions and the denominator remain explicit.

The static `inventory.json` incorporates the completed proposed-screen and
admin-section inventories; execution does not depend on `/tmp` helper files.
Equivalent `screen.*` helper names are normalized to one `app.*` identity rather
than emitted as duplicate rows.

`pixelmatch` 7.1.0 is the only additional direct root dependency used by this
harness; `sharp` was already present. The coordinator owns the root npm script.
## Production baseline (`production-baseline/<YYYY-MM-DD>/`)

A separate, dated record of what `https://awesome.video` served an anonymous
visitor — full-page PNGs at 375/768/1024/1440, DOM summaries, HTTP status and
redirect chains, axe results, raw API bodies with shape descriptions, and
mobile Lighthouse reports. It is captured with `npm run baseline:capture`
(`scripts/validation/production-baseline-capture.mjs`, resumable per route ×
viewport as one unit bound by a shared `unitId` and the PNG's sha256,
sandboxed Chromium made read-only by construction — a browser-target `Fetch`
interceptor fails every non-GET request from every target, Lighthouse and
workers included; every page, the one Lighthouse audits too, is a page of a
Playwright context whose init script seals WebSocket/Worker/popup creation in
every document and popup; and Chromium's popup blocker stays on — and a
navigation budget charged before every page load so exit 2 from
`--max-navigations` is exact) and diffed with
`npm run baseline:compare -- --baseline <dir> --against <url>`
(`production-baseline-compare.mjs`, exit 1 on tracked deltas — status,
redirects, final URL, testids, title, h1, axe serious+critical rules and nodes,
document counts and bodies, API status/key paths/counts — with each side's own
origin normalised away; side-by-side strips for eyes only). It is **not** the pixel gate above:
its reference is production, not the design-system artifact. Each baseline's
`README.md` records the date, tool commit, exact command and the production
quirks seen that day.
