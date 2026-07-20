# Run24C — Task #181 Client UX & State Fixes — Verification Evidence

All repros run in a real Chromium browser (Playwright, workspace chromium-1223) against
the live dev app at localhost:5000. Scripts staged in /tmp/r24c/ (v1–v12).
tsc clean. QA user teardown net-zero (`__qa_test%` users/resources/journeys = 0).

## Per-finding results

| Finding | Fix | Evidence |
|---|---|---|
| R4-017 / R5-017 / R5-043 / R5-025 | code edits (prior session, tsc clean) | code review + tsc |
| R5-018 / R5-024 | Categories error card + retry; Sort hidden on error/empty | v3: route abort → `categories-error-card` shown, sort hidden, sidebar subtitle error; retry → card gone, 26 categories render |
| BUG-015 (verify-only) | deep-link `?sort=most-resources` | v3: select shows "Most resources", URL preserved |
| BUG-021 | XSS-param strip boot script (index.html, first head script) | v3: `?q=<script>` payload stripped via replaceState on both `/` and search routes; app renders |
| BUG-024 | perceived load ≤1.5s | v3: h1 at 620ms, resource links at 913ms |
| BUG-006 | Login replit.com reachability probe | v3: online → navigates to /api/login; blocked → warning "replit.com looks unreachable…", stays on login |
| BUG-012 | account dropdown overflow at 375px | v4 + `bug012-375.png`: long email break-all fits in menu, 0px document overflow |
| BUG-038 | no console.error on 401 | v5: anon /profile → 0 console errors |
| NB-024/NB-059 | latest-wins toggles (FavoriteButton, BookmarkButton, JourneyDetail, **ResourceDetail inline mutations — added this session**) | v11: ResourceDetail 3 rapid clicks under 1.5s latency → exactly POST+DELETE (1 converging follow-up), UI==server; ResourceCard FavoriteButton 4 clicks → POST+DELETE, parity ok. v12: journey step 3 rapid clicks → 1 PUT, UI+server consistent, cleanup net-zero |
| BUG-048 | ≥24px link tap-targets | v12 at 375px: /privacy, /about, /forgot-password — all links ≥24px |
| NB-001 regression check | chunk-failure guard unchanged | v5: injected chunk abort on /advanced → 1 auto-reload then retry card (no loop) |

## Key discovery this session
The resource detail page's favorite/bookmark buttons are **inline mutations in
`ResourceDetail.tsx`**, not the shared `FavoriteButton`/`BookmarkButton` components —
the initial rapid-click repro proved the old drop-while-pending behavior was still live
at the audited surface. Both inline mutations were converted to the latest-wins
`desiredRef` + optimistic cache-flip + onSettled-converge pattern (and the BUG-038
401 console-skip applied there too). Also note: plain Playwright `.click()` serialized
"rapid" clicks ~2s apart via actionability waits — real MouseEvent dispatch was needed
for a true rapid-click repro.

## Code-review follow-ups (July 20, 2026)

### BUG-006 — preflight now fails CLOSED on hanging networks
- Old: `Promise.race` with 4s timeout resolved → redirected to /api/login even when replit.com hung (fail-open).
- New (`client/src/pages/Login.tsx`): AbortController with 4s abort; ONLY a successful fetch redirects. Timeout/abort/rejection → inline warning, user stays on /login.
- Verified live (Chromium 1223):
  - Hanging network sim (`page.route` on replit.com that never fulfills/aborts): after click + 6s → still on /login, warning `text-replit-unreachable` shown ("replit.com looks unreachable…"). No redirect. (/tmp/r24c/v13.mjs)
  - Online: click → probe succeeds (67ms) → navigates through /api/login to the real replit.com OIDC authorize page. (/tmp/r24c/v19.mjs)
  - Test gotcha: registering ANY page.route() enables full network interception which made the cross-origin no-cors probe reject with no request event — online path must be verified with zero routes registered.

### R5-018 — reload guard now records WHICH URL was auto-reloaded
- `CHUNK_RELOAD_FLAG` value is now `timestamp|href`. Auto-reload is skipped only when within the 60s cooldown AND the current href matches the last reloaded href; a different route gets its own one-shot reload. Retry button stamps the same format (never clears — NB-001 trap preserved).
- Verified live: blocked /advanced chunk → exactly 1 auto-reload → retry card; then navigating to blocked /journeys within cooldown → its own single auto-reload → retry card (not starved by the /advanced stamp, not looping). (/tmp/r24c/v14.mjs)
- tsc clean after both fixes.

### NB-024/NB-059 review fix — pending-click baseline (July 20, 2026)
- Bug (caught in code review): while the first request was in flight, a 2nd rapid click computed its target from the STALE query cache (`!shown`) — same target as click 1, so even click counts didn't undo. Fixed in `ResourceDetail.tsx`: baseline for the first pending click is now the in-flight mutation's target (`!mutation.variables`, variables = remove), never the cache.
- Verified live (Chromium 1223, 1500ms injected latency, MouseEvent-dispatched clicks ~120ms apart, /tmp/r24c/v21.mjs):
  - favorite 2 clicks: POST+DELETE, ends unfavorited, UI==server ✓
  - favorite 3 clicks: exactly 1 POST, ends favorited, UI==server ✓
  - favorite 4 clicks: POST+DELETE, ends unfavorited, UI==server ✓
  - bookmark 2 clicks: POST+DELETE, ends unbookmarked, UI==server ✓
- Test gotchas: /api/auth/local/login is burst-rate-limited — login ONCE and reuse storageState across contexts; in-memory limiter clears on server restart.
