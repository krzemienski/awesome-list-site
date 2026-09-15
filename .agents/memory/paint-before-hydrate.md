---
name: Paint before hydrate (Vite head module entry)
description: Vite's <head> module entry evaluates before the first frame of complete SSR/prerendered markup on fast origins; the build plugin that defers it, and the constraints it must keep.
---
A deferred `<script type="module">` in `<head>` runs as soon as parsing ends. When the whole SSR document arrives in one chunk there is no rendering opportunity first, so the 185KB entry evaluates (~40–80ms) and kicks off the route-chunk fetch BEFORE the already-complete markup is presented. Fix: keep the entry as `modulepreload` (same request/priority/start), start evaluation from a body-end inline module after double `requestAnimationFrame` (single rAF or rAF+setTimeout(0) still runs before the frame is *presented*), with a 1s fallback and immediate start when `visibilityState === "hidden"`.

**Why:** Home Lighthouse mobile 79→83 with no chunk/manifest change; hydration verified within 0.25–1s on all routes. Lantern classifies a script as render-blocking when its evaluation STARTS before the observed FCP timestamp (presentation time), so ordering matters even though presentation is not main-thread-blocked.

**How to apply:** do it as a build-only Vite `transformIndexHtml` (`order: "post"`, `apply: "build"`) so dev HTML stays untouched. Keep EXACTLY one `<script type="module"` in the built template: `server/ssr.ts` asserts the count and injects `window.__HOME_SSR__` right before it (at body end that is still ahead of the loader). Inline module scripts receive the CSP nonce like any inline script; the dynamically appended `src` script is covered by `'self'`. Do not drop the modulepreload to move the download after FCP — that trades real hydration latency for a metric.
