# Audit continuation handoff

Status: **all deliverables current on the final build; Lighthouse floors met
for `/category/encoding-codecs` (75 vs 73) and `/resource/185020` (83 vs 77);
`/` is 83 against a floor of 88 (same-day, same-tool production 84) after the
authorized Home first-paint work — recorded with root causes, not waived.**

The detailed verdict, exact capture commands and measured values are in the
continuation sections of `../DS-AUDIT.md`. Current reports, static transcripts,
build logs, Lighthouse runs and the targeted pixel summaries are under
`../evidence/audit-567-continue/`; the five-system smoke set, switch matrix and
axe rows of record are under `../evidence/multi-system/` and `../evidence/axe/`
(run `mu2as1l9-2431`, 2026-09-15T06:35Z, transcript `audit-567-browser.md`).

## Delivered changes

- Corrected Home SSR's missing route stylesheet using Vite's client manifest.
- Prewarmed only the compiled renderer; retained normal production fallback and
  retry behavior. The SSR audit validates assets and fails the actual measured
  Home request if SSR falls through.
- Repaired independent retained-admin references: safe data projection, tag edit
  arrays, scoped dialogs, initial list states and missing retained content.
- Removed ~3s of software raster per Home load: the page atmosphere gradient is
  now painted on `.page::after` and clipped to its visible bands through a
  per-system `--bg-atmosphere-clip` token (`client/src/styles/design-system.css`,
  `shared/styles/product-profiles.css`); the two `.page` background deviations
  are documented and canary-tested in `canonical-token-parity`. Editorial ×
  Crimson Home stays pixel-green at all four widths for both Home rows
  (0.12–0.23%).
- Regenerated the design-system artifact `tokens.json` for the new token.
- Removed the remaining first-frame raster (~350 ms) on Home: the auto-sized
  atmosphere gradient was still tiled over the whole page by the initial
  `background-repeat`; a per-system `--bg-atmosphere-repeat` token (default
  `no-repeat`, Swiss `repeat` for its 64 px grid) is consumed by `.page::after`,
  guarded by `canonical-token-parity` (canary `page-atmosphere-repeat-dropped`)
  and documented in `assumptions/tokens.md` §11. Pixel-identical by
  construction (positioning area = box); Home rows re-verified green.
- Paint before hydrate (authorized entry-bundle change, `vite.config.ts`
  `paint-before-hydrate` build plugin): the built HTML keeps the entry as a
  `modulepreload` and starts its evaluation from a body-end module script one
  presented frame after the first paint (double rAF, 1 s fallback), so the
  complete SSR/prerendered markup is presented before the 185 KB entry
  evaluates and fetches route chunks. Manifest, chunk graph, request order,
  CSP handling and the `server/ssr.ts` anchor are unchanged; dev is untouched.
  Hydration and client navigation verified on the compiled server for all
  three audited routes with zero console/page errors.
- Re-ran the browser evidence runner on the final build: 50/50 switch
  persistence, 80/80 smoke frames with font assertions, 10/10 sidebar + palette
  chrome rows, axe 108/108 rows with 0 serious/critical and 0 incomplete,
  `validate:font-prepaint` PASS. Fixed two runner-only defects (lease deadlock
  before the font-prepaint gate; synchronous palette visibility sample).
- Taxonomy first paint (authorized outside audit-owned files,
  `server/seo-content.ts` only): the crawler prerender's lead copy
  (`p.ssr-lead` and the collection intro) now uses one lead scale, 1.1 rem /
  1.6. The intro is the same sentence the client renders as
  `p.taxonomy-description`; at the shell's old 1 rem / 1.5 it painted six Inter
  lines, marginally smaller than the client paragraph, so the late client
  re-render became the LCP (4.7–5.1 s). It is now the larger block in both the
  fallback font and Inter, the first paint is the LCP, and the category route
  measures 76 (72 / 83 / 76). `npm run check` and `seo-snapshot --gate
  --parity` pass on the change. No client code, token or skin file changed.
- Preserved the frozen source, actual controls, font request and all thresholds.

## Evidence limits

Final quiet Lighthouse medians (three runs each,
`lighthouse-final-paint-first/`) are 83 / 75 / 83 against floors 88 / 73 / 77
(same-day production with the same tool: 84 / 78 / 81). Category and resource
meet their floors; Home rose from 79 to 83 and is within 1 of same-day
production but 5 below the floor derived from the previous day's production
capture. The residual is the loopback font race described in `DS-AUDIT.md`:
with the entry no longer evaluating before the first paint, the three
above-the-fold design faces finish 15–30 ms before the observed FCP and stay
in Lantern's FCP graph; the same build scores 88 when they land after it. The
faces are the design's first-render fonts and the css2 request is frozen.
Whole-page pixel rows for About, the admin tabs, category and resource detail
were never green and remain owned by their page tasks; the full-inventory
`npm run test:parity` is the regression task's gate. `npm run bundle:budget`
fails on `route:journeys` with a JS chunk table byte-identical to the build
before this task's changes (only CSS/HTML changed here).

## Handoffs

- Home performance owner: Lighthouse mobile 83 locally (84 same-day prod, floor
  88) after the raster clip and paint-before-hydrate. The remaining lever on
  the loopback profile is the above-the-fold font set (three `VeryHigh` faces
  before first paint) or a materially smaller entry (Clerk provider/appearance
  and themes are the largest non-React members); the nine-family css2 request
  is frozen and must not be widened or trimmed.
- Journeys page owner: `bundle:budget` `route:journeys` is 38.7 KiB raw /
  14.8 KiB gzip against 36.1 / 13.7 KiB; the closure now pulls the shared
  `select` chunk (23.6 KiB raw). Not caused by, and not fixed in, this audit.
- Taxonomy page owner: the client still re-renders the intro ~4 s after first
  paint behind ~40 route chunks (TBT 655 ms median). Consolidating the route
  closure (`experimentalMinChunkSize` merges dynamic route entries and breaks
  the bundle-budget manifest keys — use explicit `manualChunks` groups instead)
  and lazy-loading `BookmarkNotesDialog` out of `BookmarkButton` are the
  remaining measured levers.
- Page owners for About, admin tabs, category and resource detail: align page
  geometry/content with the independent reference before the full
  `npm run test:parity` gate is run.

## Closure decision

On 2026-09-15 the project owner reviewed the 83 / 75 / 83 result and the
remaining levers (first-render font set vs. the frozen css2 request and the
pixel gate; an entry-bundle cut that lazy-loads the Clerk provider) and chose
to close the audit with Home recorded at 83 — measured, not waived — and the
font/entry levers handed to the Home performance owner.

## Next work

Nothing further inside the audit boundary. Do not retry benchmarks merely to
obtain a favorable sample, warm Home data before measurement, crop height
differences, or copy application CSS into the oracle.
