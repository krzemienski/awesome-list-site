---
name: Platform-edge 429 triage
description: How to tell app-limiter 429s from Replit edge 429s, and what the app can/can't fix
---

# Platform-edge 429 vs app-limiter 429

**Rule:** A bare-text "Too many requests" 429 with NO `Retry-After`/`RateLimit-*`
headers — especially one hitting HTML documents or `/assets/*` chunks — cannot come
from this app. App limiters are mounted on `/api` only and always send
`Retry-After` + `RateLimit-*` with a content-negotiated body (styled HTML page for
`Accept: text/html`, JSON otherwise) via the shared `negotiated429Handler`.

**Why:** The Aug 2026 external audit blamed the app for edge 429s. Prod is fronted by
`server: Google Frontend` / `via: 1.1 google` (Replit Autoscale edge; no Cloudflare on
the apex — only www has a Cloudflare 525 issue). The edge's burst protection fires
under parallel-crawler load, serves bare text, and is invisible to app code. Burst
repro from one shell (24× parallel API/HTML, 16× parallel chunk) got zero 429s.

**How to apply:**
- Triage any 429 report by inspecting response headers first: no RateLimit-* ⇒ edge,
  don't hunt app code. Check `server:`/`via:` headers for the fronting stack.
- The app's job is tolerance, not styling the edge page: chunk 429 → RouteErrorBoundary
  card; API 429 → ApiError.retryAfterSec + capped auto-retry (queries only) → visible
  error card. Keep those paths intact.
- A failed catalog fetch surfaces as the APP-LEVEL ErrorPage (App.tsx gates all routes
  on the shared "awesome-list-data" query) — route-level error cards never mount, and
  `main` is empty while the page is NOT blank. E2E asserts must accept either surface.

**Prod verification note (Aug 2026):** app-level 429s DO occur on prod under heavy
parallel load and always carry `ratelimit-*` + `retry-after` with the negotiated body
(styled HTML w/ `data-testid="rate-limit-page"` for text/html, JSON otherwise).
Autoscale runs the in-memory limiter store PER INSTANCE — a modest burst (260 req)
never trips it and 429 probes only land when they hit an already-throttled instance,
so verifying needs ~1500 parallel reqs + repeated probes.
