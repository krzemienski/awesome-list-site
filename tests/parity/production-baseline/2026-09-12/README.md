# Production baseline — 2026-09-12

What `https://awesome.video` served to an anonymous visitor on
**2026-09-12 between 06:19 and 06:25 UTC**, recorded so every later parity wave
can be diffed against a dated snapshot of production instead of memory.

- Tool commit: `98f1b0cc4806c65b423f09a68650ee50a3c78c40`
  (`scripts/validation/production-baseline-{lib,capture,compare}.mjs` as of the
  `test(parity): capture production regression baseline` commit that adds them —
  the capture ran from the working tree that became that commit).
- Exact command (single invocation, run in the background, 390 s wall clock,
  96 page navigations, 0 throttle retries, 0 failures):

  ```sh
  node scripts/validation/production-baseline-capture.mjs --base https://awesome.video
  ```

  `manifest.json` holds the machine copy of this (argv, commit, tool versions,
  per-route navigation counts, every throttle event, every failure).
- Tools: Node v20.20.0 · Playwright 1.61.1 driving the pinned
  `.cache/ms-playwright/chromium-1223` (Chromium 148.0.7778.96, sandbox ON,
  never `--no-sandbox`, never downloaded) · axe-core 4.13.0 via
  `@axe-core/playwright` · Lighthouse 12.8.2 (mobile preset) attached to the
  same Chromium over `--remote-debugging-port` · sharp for lossless PNG
  recompression.

## Layout

```
inventory.json          routes / endpoints / viewports / axe widths this run covers
manifest.json           one entry per invocation (this baseline: exactly one)
routes/<slug>/
  <slug>@375.png  <slug>@768.png  <slug>@1024.png  <slug>@1440.png   full page, DPR 1
  dom.json              per viewport: title, lang, h1[], canonical, robots meta,
                        description, JSON-LD @types (incl. @graph), <a href> count,
                        visible nav labels, visible data-testids, document height,
                        final URL, client-side navigations, consent-banner record;
                        the widest viewport is promoted to the top level and
                        `viewportDisagreements` lists any width that differs
  status.json           HTTP status, manual redirect chain, x-robots-tag,
                        content-type, cache-control (Node fetch, no cookies)
  axe.json              violations by impact at 375 and 1440 (rule + node counts,
                        top 5 selectors per rule)
routes/sitemap-xml/, routes/robots-txt/
                        status.json + body.<ext> (raw bytes) + dom.json summary
                        (URL count, hosts, lastmod range / directives); machine
                        files get no screenshot and no axe run by design
api/<slug>.json         raw response body, byte-faithful
api/shapes.json         per endpoint: status, cache-control/etag/content-type/
                        x-robots-tag/vary, bytes, sha256, recursive key paths
                        (`[]` = array element, `{*}` = data-keyed map), item
                        count, every top-level array length, first/last id,
                        numeric totals
lighthouse/<slug>.json  full LHR (compact JSON) minus base64 screenshots, the
                        script treemap, internal timings and i18n lookup tables
lighthouse/scores.json  performance / accessibility / best-practices / seo +
                        FCP, LCP, TBT, CLS, Speed Index, TTI per route
```

Slugs: `/` → `home`; otherwise the path with every non-alphanumeric run
replaced by `-` (`/category/community-events?page=2` →
`category-community-events-page-2`); API slugs drop the `api/` prefix.

## Capture protocol

Each route × viewport loads in a **fresh** browser context (DPR 1, `en-US`,
UTC, dark colour scheme, reduced motion, service workers blocked): `load` →
`networkidle` (20 s, tolerant) → `document.fonts.ready` → two animation frames
→ consent banner dismissed through the product's own
`[data-testid="consent-decline"]` control (presence and method recorded in
`dom.json`, never hidden by CSS) → one scroll pass so `loading="lazy"`
thumbnails below the fold are fetched → back to top → full-page PNG with
animations disabled and caret hidden → DOM extraction → axe at 375 and 1440.
Chromium caps a capture at 16 384 px; no route reached it (`screenshot.truncated`
is `false` everywhere). Nothing was signed in, no admin key was sent, nothing
was POSTed.

Edge throttling (bare 429/503) is retried with exponential backoff (respecting
`retry-after`, max 6 attempts) and is **never** recorded as a route status; a
route that stays throttled is left incomplete and the next resumable run picks
it up. This run saw zero throttle events.

## Production quirks observed on this date

- **`/submit` does not redirect guests.** The brief expected a redirect chain to
  sign-in; production serves `/submit` as 200 with `h1 "Submit a Resource"`, an
  `alert-login-required` banner and a `link-login` control, and no client-side
  navigation happens (`dom.json.clientNavigations` = `["/submit"]`). Both the
  HTTP chain and the browser chain are recorded so a future redirect shows up as
  a delta.
- **`/sign-in` is 200 HTML** (Clerk-hosted UI inside the SPA), `noindex,
  nofollow`, no canonical.
- **`/this-route-does-not-exist` → 404** from the server with `noindex, nofollow`
  meta, `h1 "Page Not Found"`, and no `x-robots-tag` header.
- **Listing endpoint spelling.** `/api/awesome-list/listing?category=…` (the
  form named in the brief) is a `validation_failed` 400 on production and dev
  alike; the working form `?level=category&slug=encoding-codecs` is what this
  baseline records.
- **Cache headers are rewritten at the edge.** Production answers
  `/api/categories`, `/api/subcategories`, `/api/sub-subcategories`, `/api/tags`
  with `cache-control: private, max-age=60, must-revalidate` where the origin
  (and a local dev server) sends `public, …`; `/api/resources*`, `/api/journeys*`
  and `/api/recommendations` are `private` with weak ETags; health endpoints
  are `no-store`. Compare treats cache-control as a *note*, not a tracked delta.
- **www vs apex.** Only the apex `https://awesome.video` is captured. `www` is
  Cloudflare-proxied and answers 525 (origin has no www certificate); apex goes
  straight to the Replit edge. Sitemap `<loc>` hosts are all `awesome.video`.
- **Edge 429s** (bare text, no `RateLimit-*` headers) are a known production
  behaviour under bursts; the capture is sequential (one navigation at a time)
  and none occurred in this run.
- **Data volume.** 3 824 approved resources (`/api/resources` total), 9 / 99 / 32
  categories / subcategories / sub-subcategories, 1 541 tags, 4 487 sitemap
  URLs (lastmod 2026-07-12 … 2026-08-20), `encoding-codecs` listing total 579.
  A local dev database is smaller (1 816 resources on 2026-09-12), so
  `compare` against a dev server always reports count deltas — expected.
- **Axe.** Every route is clean at serious/critical except `/design-system`,
  which reports one `color-contrast` (serious) node
  (`.text-[color:var(--text-4)]`) at both 375 and 1440.
- **Lighthouse (mobile).** `/` 0.85 / 1 / 1 / 1, `/category/encoding-codecs`
  0.78 / 1 / 1 / 1, `/resource/185020` 0.74 / 1 / 0.96 / 1
  (performance / accessibility / best-practices / seo). Performance varies run
  to run by design; `compare` does not gate on it.
- **Size.** 38 MB on disk, 36 MB of which are the 96 lossless full-page PNGs
  (category pages reach ~8 200 px tall at 375). Lighthouse reports are ~170 KB
  each after stripping.

## Re-running and comparing

```sh
# resume / extend today's baseline (skips whatever is already on disk)
npm run baseline:capture
# stay under a short shell budget (exit 2 = stopped early, re-run to resume)
npm run baseline:capture -- --max-navigations 8
# a new dated baseline
npm run baseline:capture -- --date 2026-10-01

# diff a candidate origin against this baseline (exit 1 = deltas, like diff)
npm run baseline:compare -- --baseline tests/parity/production-baseline/2026-09-12 \
  --against http://127.0.0.1:5000 [--routes /,/about] [--out /tmp/dir]
```

`compare` re-captures the candidate with the same library (routes + API, no
Lighthouse), writes `compare-report.md` / `compare-report.json` and one
`strips/<slug>@<w>.png` per route × viewport — baseline on the left, candidate
on the right, on a union canvas. The strips are for eyes only; the pixel gate of
the parity programme is a different tool with a different reference.
