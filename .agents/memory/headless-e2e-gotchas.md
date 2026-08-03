---
name: Headless E2E gotchas on this app
description: Recurring traps when driving the live app headlessly (consent banner, toast selector, agent-browser lifecycle)
---

- **Consent banner overlays /submit's submit button** in fresh headless sessions — clicks silently hit the banner ("dead click"). Always dismiss it (click "Decline") before interacting with the form.
  - **Why:** cost a full false "submit form broken" finding in one audit cycle before root-causing.
  - **How to apply:** any scripted flow that clicks near the page bottom on a fresh profile: dismiss consent first.
- **Toast selector is `li[data-state]`**, not `ol li` (the latter matches the breadcrumb "Home" and yields false positives).
- **agent-browser daemon dies between bash calls** and sessions lose auth — for anything multi-step (login → act → assert), use direct Playwright in ONE `node -e` script run from the project root (module resolution fails from /tmp). Inject admin auth via `connect.sid` cookie from a curl login jar.
- Screenshot pipelines can lie: agent-browser captured a "blank" toast that direct Playwright proved renders fine. Before logging a render bug from a screenshot, reproduce with a second capture method.
- **Working invocation for throwaway ESM Playwright scripts**: keep the script in /tmp but run it as `VW=... OUT=... node --input-type=module < /tmp/script.mjs` from the project root — stdin eval resolves `import 'playwright'` from cwd, args pass via env vars (`node --input-type=module /tmp/x.mjs` errors: flag only valid with stdin/--eval).
- **Prod login endpoint is `/api/auth/local/login`** — `/api/auth/login` is a deliberate 405 decoy for auditors (see routes.ts); scripts hitting the decoy get 405 + no cookie.

- **`page.goto(..., waitUntil: "networkidle")` can hang forever on this app** — some pages hold a keep-alive/streaming connection so networkidle never fires (goto timeout at 30s). Use `domcontentloaded` + an explicit `waitForSelector` on the element under test instead.

## Scroll-into-view probes (2026-08)
- `scroll-behavior: smooth` (site-wide) makes `scrollIntoView` **async**: a probe that scrolls then immediately measures/`elementFromPoint`s sees the pre-scroll position ("below fold", empty hit chain). Always pass `behavior: 'instant'` in harness scrolls.
- "Click dispatched but dialog never opened" at exactly ONE viewport -> `elementFromPoint` the target center first. Fixed bottom banners (consent) eat clicks parked under them: native scroll-into-view (Tab focus, `scrollIntoViewIfNeeded`, anchor nav) stops once the element is inside the viewport even if an overlay covers it. App-side fix that also helps keyboard users: `* { scroll-margin-bottom: var(--banner-height-var, 0px) }` — scroll algorithms honor scroll-margin, so targets settle flush with the banner top. Playwright `force: true` still does REAL browser hit-testing (it only skips actionability pre-checks), and a "passing" sibling check may just have hit the banner's Decline button and dismissed it — check for accidental-dismiss when later checks inexplicably pass.
