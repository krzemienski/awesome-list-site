---
name: Playwright browser version pin
description: Installed Chromium under .cache/ms-playwright/ may not match what the workspace playwright package expects; launch with explicit executablePath after `ls`-ing the dir.
---

The workspace has Chromium/headless-shell installed under `.cache/ms-playwright/` (as of July 12, 2026: **chromium-1223**, previously 1208 — always `ls .cache/ms-playwright/` first), and `chromium.launch()` without an explicit path can fail with "Executable doesn't exist" when the package expects a different revision.

**Why:** browsers were installed once (May 2026 audit harness) and the package has since drifted; re-downloading browsers each session is slow and unnecessary.

**How to apply:** launch with the pinned binary instead of reinstalling:
```js
chromium.launch({ executablePath: '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome' }) // from workspace root
```
Also: scripts importing `playwright` must run from the workspace root (not `/tmp`) or module resolution fails.

Related quirks hit alongside this:
- Anonymous `GET /api/recommendations` takes ~12–15s per call (engine builds from full resource set) — screenshots of `/recommendations` will show skeletons; use Playwright with a long `waitForFunction` to verify the rendered grid.
- API rate limiter uses **hourly** windows — bursts of dev testing (curl loops + repeated page loads) trigger 429s that look like app bugs but aren't; they self-clear.

Exact working launch path (July 12, 2026): executablePath = `<workspace>/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome` — note `chrome-linux64`, NOT `chrome-linux`; and it lives under the workspace `.cache`, not `~/.cache`. Scripts placed in /tmp need `NODE_PATH=<workspace>/node_modules` to resolve the playwright package.
