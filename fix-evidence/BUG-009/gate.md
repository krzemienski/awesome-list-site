# VG-009 — Duplicate H1 during hydration — PASS

**Root causes (two independent H1 duplications):**
1. **SSR HTML (all routes)**: `client/index.html`'s `<noscript>` fallback block carried its own `<h1>Awesome Video</h1>` alongside the route H1 that og-middleware injects into `#root` — raw served HTML contained 2 H1s on every route.
2. **Browser DOM during hydration (resource pages)**: the anti-flash hold overlay (`#ssr-seo-hold`, Task #172) moves the injected SSR block — including its `<h1>` — to body level while React mounts underneath. On `/resource/:id`, React's loading state renders its own H1 ("Loading resource…") while the overlay H1 is still shown → 2 H1s in the live DOM (reproduced pre-fix: `maxH1=2` at t≈2.5s).

**Fixes:**
- `client/index.html`: noscript `<h1>` demoted to a visually-equivalent `<p>` (bold, same size). Non-JS users see identical rendering; served HTML now has exactly one H1.
- `client/src/main.tsx`: when the hold overlay is created (i.e., JS is running and React will render the page's real H1), the overlay's SSR `<h1>` is demoted to `<div class="ssr-h1">` preserving children. Non-JS crawlers never execute this script and still receive the semantic `<h1>` in the raw HTML.
- `server/seo-content.ts`: injected scoped stylesheet extended so `.ssr-h1` mirrors the `h1` rule — the demotion is pixel-identical.

## Evidence

### SSR H1 counts (curl, post-fix) — `ssr-h1-counts.txt`
| Route | H1 count | H1 content |
|---|---|---|
| `/` | 1 | `Awesome Video` |
| `/category/intro-learning` | 1 | `Intro &amp; Learning` |
| `/resource/185020` | 1 | `100ms: RTMP vs WebRTC vs HLS - Live Video Streaming Protocols Compared` |

(Pre-fix: all three routes returned 2 H1s.)

### Browser DOM polling (Playwright, 40ms interval, ~2.5s from navigation start)
```
ROUTE /:                          samples=24 maxH1=1 multiSamples=0
ROUTE /category/intro-learning:   samples=30 maxH1=1 multiSamples=0
ROUTE /resource/185020:           samples=35 maxH1=1 multiSamples=0
```
Pre-fix baseline on /resource/185020: `maxH1=2 multiSamples=1` — `["Loading resource…","100ms: RTMP vs WebRTC vs HLS…"]`.

### Final settled DOM (after data loads + overlay removal, +4s)
```
FINAL /:                          count=1 ["Awesome Video Resources"]
FINAL /category/intro-learning:   count=1 ["Intro & Learning"]
FINAL /resource/185020:           count=1 ["100ms: RTMP vs WebRTC vs HLS - Live Video Streaming Protocol"]
```

## Verdict
| Criterion | Result |
|---|---|
| SSR output contains zero or one H1, never two | PASS (1 on all three route types) |
| Browser polling never observes two H1 elements | PASS (maxH1=1 across 89 samples) |
| Final rendered page contains exactly one H1 | PASS (all routes) |

**VG-009: PASS** → proceed to BUG-010.
