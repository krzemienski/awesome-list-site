---
name: Playwright browser version pin
description: Installed Chromium revision ≠ the playwright package's expected revision; launch with an explicit executablePath.
---

The workspace's browser cache and a root or skill-local Playwright package can target different revisions. Plain `chromium.launch()` can then fail with "Executable doesn't exist … npx playwright install". Discover current versions rather than treating an earlier cached revision as permanent.

**Why:** the skill's package.json floats while the downloaded browsers are pinned; reinstalling browsers wastes minutes and can break other harnesses that pin the same cache.

**How to apply:** never reinstall. Check `ls /home/runner/workspace/.cache/ms-playwright/` for the real revision and directory layout (newer revisions use `chrome-linux64/`, older used `chrome-linux/`), then launch with
`chromium.launch({ executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium-<rev>/chrome-linux64/chrome' })`.

**Sandbox rule:** Set `chromiumSandbox: true` when sandboxed Chromium is required. Removing `--no-sandbox` from a custom `args` array does not enable it; Playwright otherwise supplies its own default.

**Why:** A harness review incorrectly inferred sandboxing from the absence of a custom disabling flag. An explicit sandboxed launch succeeded in this workspace.
