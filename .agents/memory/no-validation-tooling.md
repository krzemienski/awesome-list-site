---
name: No validation tooling — browser-only verification
description: Owner rule (2026-10-11) banning validation scripts, test suites, gates, validation workflows and proof packets in this project.
---
Never create, register or run validation scripts, test suites (vitest/playwright test), drift/pixel/perf gates, validation workflows, CI test jobs, proof packets/PNG evidence sets, or reviewer/consensus subagent panels. All of it was deleted on 2026-10-11.

**Why:** the user asked, after work stalled on validation instead of code fixes ("Remove all those validation scripts immediately ... should never use those types of things again").

**How to apply:** fix the code, then verify by using the running app — a one-off Playwright script in a dotfile at the repo root, deleted right after (launch with executablePath of .cache/ms-playwright/chromium_headless_shell-1223/...; the installed playwright wants a newer revision that is not downloaded), the Screenshot tool, or curl for APIs. tsc/build are fine. The publish build is scripts/publish-build.sh (build + image trim); it must never open a DB connection or boot the app, because the build container carries prod env vars.
