# NB-001 — lazy-chunk load failure white-screens the app (VG-gate)

## Fix
`RouteErrorBoundary` in `client/src/App.tsx` wraps the lazy-route `Suspense`:
chunk-load failures (regex covers Vite/webpack failure strings) trigger ONE
automatic full reload (fresh HTML → fresh chunk manifest); if the chunk still
fails, a styled in-app retry card renders inside the live app chrome with a
"Reload page" button (`data-testid: route-error-boundary`, `button-route-retry`).

## Regression found by this gate (July 20, 2026) — reload loop
The original one-shot guard was a **boolean flag cleared on every error-free
render**. But the boundary renders error-free while Suspense is still fetching
the chunk, so the flag was wiped before every failure ⇒ every page load
reloaded again. **Proven live: 8 main-frame navigations in 20s** with a blocked
chunk (`loop-probe` before fix). The card only ever flashed between reloads.

**Fix**: timestamp-based guard. `componentDidCatch` reloads only if the last
auto-reload was >60s ago; the retry button *stamps* (not clears) the guard so a
still-failing manual retry lands back on the card. No render-time clearing —
a stale timestamp naturally re-arms auto-reload for future deploy rotations.
Private-mode storage failure skips auto-reload entirely (card directly, no loop).

## Proof (dev, July 20, 2026 — after fix)
Injection harness: Playwright blocks `/src/pages/<Module>.tsx`, SPA-navigates
from home, waits for settle, then unblocks + clicks the retry button.

| Route | blocked reqs | reloads used | card+button visible | chrome alive | recovered |
|---|---|---|---|---|---|
| /journeys | 2 | 2 (SPA fail + 1 auto) | yes | yes | h1 "Learning Journeys" |
| /search | 2 | 2 | yes | yes | h1 "Search" |
| /about | 2 | 2 | yes | yes | h1 "About" |

- Loop probe after fix: **2** main-frame navigations in 20s (initial + single
  auto-reload), card holds steady. Before fix: 8 and climbing.
- Full data: `chunk-inject2.json`; screenshots `inj2-<Module>-blocked.png`
  (card inside live chrome) + `inj2-<Module>-recovered.png` (route rendered).

**PASS.**
