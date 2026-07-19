# Task 169 — Cold first-load of heavy category pages (BUG-024 carry-over)

## What changed (all client-side; no server/schema changes)

1. **Early auth fetch** (`client/index.html`): `/api/auth/user` now fires from an inline
   script alongside the existing `/api/awesome-list` early fetch, into
   `window.__authUserEarlyFetch`. `useAuth` (`client/src/hooks/useAuth.ts`) consumes the
   promise once via a custom `queryFn`. Before: the auth request waited for full bundle
   download + parse + React mount (~1.1–1.5s throttled) before starting.
2. **App-wide auth skeleton gate removed** (`client/src/App.tsx`): public routes render
   immediately; `AuthGuard`/`AdminGuard` own their loading UI. Before: ALL content
   (including public category pages) was gated behind the auth response.
3. **Parser memoization** (`client/src/lib/parser.ts`): `processAwesomeListData` is
   memoized via WeakMap — was re-processing 2,300 resources on every render in App and
   again in each category page.
4. **Route-level code splitting** (`client/src/App.tsx`): only hot surfaces stay in the
   entry chunk (Home, Category/Subcategory/SubSubcategory, Categories, ResourceDetail,
   404). 17 routes lazy-loaded (auth forms, Profile, Bookmarks, SubmitResource + zod,
   Journeys, Search, Settings, Theme, legal/static). Suspense fallback = the familiar
   page skeleton; chrome stays mounted.

Main bundle: **953KB → 734KB** (gzip 271KB → 220KB; wire transfer per cold page load
258KB → 211KB JS).

## Measurement methodology

- All scripts in this directory; Chromium via Playwright, cache disabled via CDP,
  fresh browser context per page load.
- **Two content signals exist on this app** (see `visibility-trace.mjs`): og-middleware
  injects full SEO content (h1 + resource links) into `<!--app-html-->` for ALL user
  agents — visible ~714ms (throttled) — then React mount wipes it and re-renders real
  cards. Honest React-paint metric = `[data-testid^="card-resource"]` visible
  (`measure-cards.mjs`). `measure-cold.mjs`/`measure-local.mjs` (older selector
  `a[href^="/resource/"]`) can match the injected HTML — treat those numbers as
  "first meaningful content visible", which is what a user actually sees.

## Results

### Prod baseline (before code, live https://awesome.video, `prod-before.jsonl`)
| Page | contentMs (2 passes) |
|---|---|
| /category/intro-learning | 1755, 1572 (earlier session: 2206) |
| /category/encoding-codecs | 1277, 1168 |
| /subcategory/smart-tv-players | 1225, 1095 |

### Local prod build, network-throttled 100ms RTT / 8Mbps, React cards visible (`before-cards.jsonl` / `after-cards.jsonl`, 3 passes each)
| Page | BEFORE median | AFTER median |
|---|---|---|
| intro-learning | 1638 | 1718 |
| encoding-codecs | 1851 | 1726 |
| smart-tv-players | 1869 | 1579 |
| **all-runs mean** | **1773** | **1719** |

Structural wins (deterministic, not noise):
- `/api/auth/user` start: **~1137–1461ms → ~166–369ms** (parallel with awesome-list).
- BEFORE, card paint was serialized ~340–710ms *behind* the auth request; AFTER, cards
  render with no auth dependency (matters more on prod where auth = session lookup).
- JS on the cold path: **258KB → 211KB** wire; entry parse/eval smaller by ~220KB raw.
- SSR-injected content (what the user first sees) visible at **~714ms** throttled,
  unaffected by React timing.

### Unthrottled local (before-local.jsonl / after-local.jsonl)
Statistically a wash (~1.0–1.7s both) — localhost RTT ≈ 0 hides the serialization win.

## Verification
- tsc clean (before-state build and after-state build).
- 21-route sweep on the production build (`route-sweep.mjs`): every route incl. all 17
  lazy ones renders, **zero page errors**.
- Dev workflow: /journeys (lazy) renders with full chrome; migration-drift clean.
- /admin logged-out → /login?next=%2Fadmin — identical to prod, pre-existing.

## NEEDS REPUBLISH — post-republish verification
Prod still runs the before code. After republish, run from workspace root:
```
node evidence/run21/measure-cold.mjs
```
Expect: contentMs for all three pages comfortably < 2s (intro-learning was the worst
at 2206ms in the original baseline); in DevTools, `/api/auth/user` should start
within ~50ms of `/api/awesome-list` (both from inline HTML script, pre-bundle).

## Task #172 — SSR-content flash eliminated (July 19, 2026)
Fix: client/src/main.tsx moves the server-injected #ssr-seo-content (+scoped style) out of #root into a fixed overlay (#ssr-seo-hold) before React mounts; overlay removed when a real resource card renders (or data-settled+600ms grace on card-less routes; 8s hard cap). Server injection unchanged (crawler HTML identical).
Verified throttled (100ms RTT, prod build @3001, evidence/run21/flash-trace.mjs + overlay-check.mjs): /category/intro-learning content@651ms, 0 disappearances, cards@1880ms, overlay removed @1952ms. Dev sweep: /about, /, /resource/185228 all clear overlay with real content, 0 console errors.
