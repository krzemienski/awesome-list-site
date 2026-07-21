---
name: Toast dropped by full-page nav
description: In-memory toasts are lost when navigating via window.location; use a query param handshake instead.
---

**Rule:** A toast fired immediately before `window.location.href = ...` never renders — the full-page navigation tears down the React tree (and the toast store) before paint. SPA `navigate()` keeps it alive; hard navigation does not.

**Why:** The register success flow fired a welcome toast then did `window.location.href = "/"` (needed to re-bootstrap the authed session), so users saw no feedback and an audit filed it as "no success feedback after registration".

**How to apply:** When a hard navigation is required after an action, pass a one-shot query param (e.g. `/?welcome=1`); the destination page fires the toast on mount and strips the param from the URL (replaceState). Verify with a browser test that polls for the toast on the *destination* page, and use `waitForURL` in Playwright — polling `page.evaluate` across the navigation throws "execution context destroyed".
