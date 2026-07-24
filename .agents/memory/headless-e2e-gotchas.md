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
