---
name: Vite watches the whole workspace
description: Writing files into the repo during Playwright runs triggers full-page reloads and ERR_ABORTED flakes; stage outputs in /tmp.
---

# Vite dev watcher covers the entire workspace

The Vite dev server's file watcher is not limited to `client/` — creating,
appending (`tee`), or deleting files anywhere in the repo while a browser
session is open can trigger a full page reload in the SPA.

**Why:** During Playwright verification sweeps, writing evidence/log files into
the repo mid-run caused in-flight navigations to abort (`net::ERR_ABORTED`)
and produced flaky, non-reproducible test failures that looked like app bugs.

**How to apply:** While any Playwright/browser session is live against the dev
server, write script output to `/tmp` first and `cp` it into the repo
(evidence dirs etc.) only after the browser work completes. Same for deleting
temp scripts — do it between runs, not during.
