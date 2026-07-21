---
name: Playwright audit batching
description: How to run multi-route/multi-viewport Playwright sweeps without hitting the 120s bash timeout
---

Large Playwright sweeps (routes × viewports) silently die at the 120s bash timeout with exit code -1 and NO output if the script only prints at the end.

**Why:** each `page.goto` on this app can take 10–15s at wide viewports (more images render); ~30+ page loads per invocation exceeds the cap, and buffered output is lost on kill.

**How to apply:**
- Batch sweeps per-viewport (≤ ~8 page loads per bash invocation).
- Print progress per route (not only a final summary) so partial results survive a timeout.
- Use `waitUntil: "domcontentloaded"` + short fixed wait instead of `networkidle` for overflow/layout checks.
- Launch: executablePath `.cache/ms-playwright/chromium-1208/chrome-linux64/chrome` + `--no-sandbox`.

## SPA client-side nav makes large sweeps ~5x faster

For SPA apps that fetch ONE large shared payload and cache it (e.g. a 3MB `/api/awesome-list` tree cached by React Query), a full `page.goto` per route refetches + reparses that payload every time (~4s/route). Instead:
- Do ONE initial `page.goto`, then navigate client-side in the SAME page via `page.evaluate(u => { history.pushState({}, '', u); window.dispatchEvent(new PopStateEvent('popstate')); }, url)`. wouter re-renders from the cached tree in ~0.75s/route (works for category/subcategory/resource/search/static routes alike).
- This reuses the cache AND exercises real SPA routing. With it ~100 routes fit under the 120s bash cap (vs ≤8 for full `goto`); a 269-route × 3-viewport sweep (807 inspections) ran in ~90s chunks.
- Reset per-route console/pageerror/response trackers right before each pushState nav so errors attribute to the correct route.
- Count parity: read `[data-testid="text-results-count"]` ("Showing X of Y") and compare to a nested count computed from the tree (each resource lives at exactly ONE node → sum direct + all descendants). Viewport only affects layout/overflow, never counts, so run the count check once per route across viewports.
- `st=undefined` for SPA-navigated routes is expected (no HTTP response object) — confirm render via `<h1>`/title/badge instead.

## Synthetic popstate nav caveat (July 2026)
Synthetic `history.pushState + dispatch PopStateEvent` navigation FALSELY FAILS on lazy-loaded (React.lazy/Suspense) and auth-guarded routes — they stick at "Loading…" or render blank (body len 0) no matter the wait. Public taxonomy routes work fine with it. For lazy/guarded routes use real `page.goto` instead, wrapped in retry-once/twice: Vite dev intermittently throws transient `net::ERR_ABORTED`/timeout on goto even when curl shows the route serves 200 in <50ms.
Also: log results incrementally (inside the check helper), never only at script end — a 120s bash kill otherwise leaves ZERO output to triage.

## Collapsed-accordion click targets false-FAIL (July 2026)
Children inside a collapsed `overflow:hidden` accordion (maxHeight:0 on the parent) still report full bounding boxes, so a "visible items" filter by getBoundingClientRect picks clipped items from the WRONG section, and `page.click` then times out 30s (element never receives pointer events). Scope sub-item selectors to the expanded container (e.g. `#accordion-body-<slug> [data-testid^="sub-"]`) instead of filtering globally by box size. A click timeout on a resolvable locator is usually clipping, not a broken app.

## One chromium at a time
Two concurrent headless chromium instances (parallel bash calls) OOM/kill each other mid-run ("Target page, context or browser has been closed"). Run audit batches sequentially.

## Guard UX varies per route — don't assume redirect
`/profile` and `/bookmarks` bounce anon users to `/`; `/admin` intentionally stays put and renders AdminGuard's in-place denial panel (h1 "Admin Dashboard" + "must be signed in as an administrator" + sign-in link). A harness that expects a redirect will false-FAIL `/admin`. Correct check: admin children never mount and zero `/api/admin/*` requests fire (server-side 401/403 gates are the real security boundary).

## networkidle hang on polling pages
Pages with background polling/long-lived requests (e.g. /journeys, /admin dashboard) may NEVER reach Playwright's `networkidle` (needs 500ms of zero network) — `goto` hangs silently until the ~120s shell budget kills the run with NO output. Use `waitUntil: "domcontentloaded"` + a fixed `waitForTimeout` for those routes; keep `networkidle` only for static-ish pages.

**Harness cwd gotcha:** the playwright-skill runner executes from the skill directory, so relative screenshot/output paths land inside `.local/custom_skills/playwright-skill/…`, not the project root. Always write artifacts to `/tmp` or absolute workspace paths, then `cp` into the evidence dir.
