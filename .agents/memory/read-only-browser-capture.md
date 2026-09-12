---
name: Read-only browser capture guarantees
description: How to make a Playwright/Lighthouse capture provably unable to mutate the origin it measures — which layers cover which realms, and what silently does not.
---

Rule: a capture that must never write to the origin needs THREE layers, and each
one covers something the others cannot.

1. **Browser-target `Fetch` interception** (CDP session on the browser, pattern
   `*`, fail non-GET/HEAD/OPTIONS with `BlockedByClient`) covers every HTTP
   request of every target (pages, popups, iframes, all worker kinds, and pages
   other drivers create). It coexists with `context.route`/puppeteer
   interception on the same request without hangs (the late reply just errors).
   It never sees **WebSocket handshakes**.
2. **Context-level guards** (`context.route`, `context.routeWebSocket`,
   `context.addInitScript(seal)`) reach every page AND every popup of that
   context: Playwright holds a new target paused until they are installed —
   verified for popups from `window.open`, programmatic `<a target=_blank>`
   clicks to a document, `about:blank` and `javascript:` URLs. **Page-scoped**
   hooks (`page.evaluateOnNewDocument`, `page.route`) do NOT reach anchor-opened
   popups (no `window.open` involved) or worker realms; the popup's
   `WebSocket` stays native. Playwright also ignores pages of the default
   browser context, which is where a puppeteer `newPage()` lands.
3. **Sealed window realm** (non-configurable `WebSocket`, `Worker`,
   `SharedWorker`, `window.open`, `serviceWorker.register`) is the only place a
   socket can be refused; realms the script cannot reach must be prevented
   from existing (blob/data worker scripts never touch the network).

**Lighthouse:** its page-mode API needs a puppeteer `Page`, and a puppeteer
`newPage()` is outside every Playwright context. Create the page with
`context.newPage()` in a read-only context (no Playwright viewport — LH sets
its own mobile metrics), navigate it to a one-off `about:blank#<uuid>` marker,
then `puppeteerBrowser.waitForTarget(t => t.url() === marker).page()` and hand
THAT to `lighthouse(url, flags, undefined, page)`. Two CDP clients on one
target work (scores, bf-cache gatherer). LH's bf-cache gatherer re-executes
the page, so window-seal refusals appear twice per audit.

**Popups:** `--block-new-web-contents` is ignored by Playwright's Chromium.
What works: keep Chromium's popup blocker ON (`ignoreDefaultArgs:
["--disable-popup-blocking"]`) — page scripts without user activation cannot
open a window at all. Beware: Playwright's `page.evaluate` runs WITH a user
gesture, so popups opened from evaluate still succeed (one per activation).
Do not auto-close "extra pages" in a `context.on("page")` handler:
`@axe-core/playwright` opens a blank page of the same context to finish a run
and closing it breaks axe with "Target page … has been closed"; also the
primary page's own `page` event fires before `newPage()` resolves. Read
`context.pages()` at read-back time instead.

**Attribution vs enforcement:** read `window.__refused` from every attached
frame (`page.frames()`), not just the main document, or cross-origin iframe
refusals are enforced but invisible. A popup stopped by the blocker leaves no
trace except its absence in the origin log — keep an origin-side request log
in any smoke test (all paths served, every method/upgrade appended).

**Compare-side URL secrets:** redacting every password to one literal makes
password-only changes compare equal. Fingerprint with an HMAC under a random
per-run key (`user:<pw#…>@`): equal within a run, different otherwise,
never printed, never reversible.

**Why:** four review rounds on the production-baseline scripts each found a
realm the previous construction missed; every gap above was confirmed with a
live probe origin before the fix. **How to apply:** any headless capture,
crawler, or audit that touches production must be assembled from all three
layers and smoke-tested against a probe origin that tries POST/PUT/beacon,
WS, blob workers, a cross-origin iframe and the five popup vectors.

**Local Lighthouse through the same harness:** pointing the baseline capture
at the dev server with `--only lighthouse --max-navigations 1` audits just `/`
in ~30 s. Read only per-audit rows (`font-display`, `uses-rel-preconnect`,
CLS…) against the production baseline, never category scores: the sealed
realm makes Vite's HMR client log a refused WebSocket, which alone costs
`errors-in-console` (best-practices 1 → 0.96), and unbundled HTTP/1.1 modules
make every performance number incomparable.
