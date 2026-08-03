---
name: Playwright browser version pin
description: Installed Chromium revision ≠ the playwright package's expected revision; launch with an explicit executablePath.
---

The workspace's `.cache/ms-playwright/` holds a pinned Chromium revision (currently `chromium-1223/chrome-linux64/chrome`), but the playwright package in `.local/custom_skills/playwright-skill/node_modules` may expect a NEWER revision (it currently asks for `chromium_headless_shell-1228`). Plain `chromium.launch()` then dies with "Executable doesn't exist … npx playwright install".

**Why:** the skill's package.json floats while the downloaded browsers are pinned; reinstalling browsers wastes minutes and can break other harnesses that pin the same cache.

**How to apply:** never reinstall. Check `ls /home/runner/workspace/.cache/ms-playwright/` for the real revision and directory layout (newer revisions use `chrome-linux64/`, older used `chrome-linux/`), then launch with
`chromium.launch({ executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium-<rev>/chrome-linux64/chrome' })`.
