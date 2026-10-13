---
name: No validation tooling — browser-only verification
description: Owner rule (2026-10-11) banning validation scripts, test suites, gates, validation workflows and proof packets in this project.
---
Never create, register or run validation scripts, test suites (vitest/playwright test), drift/pixel/perf gates, validation workflows, CI test jobs, proof packets/PNG evidence sets, or reviewer/consensus subagent panels. All of it was deleted on 2026-10-11.

**Why:** the user asked, after work stalled on validation instead of code fixes ("Remove all those validation scripts immediately ... should never use those types of things again").

**How to apply:** fix the code, then verify by driving the running app in the in-app browser (the testing browser subagent, or the Screenshot tool for static pages). NO Playwright/Node scripts at all, not even throwaway /tmp ones — the user repeated this on 2026-10-12 ("How many times have I told you not to execute scripts, but rather just drive it via MCP tools?"). curl for single API reads is fine. tsc/build are fine. The publish build is scripts/publish-build.sh (build + image trim); it must never open a DB connection or boot the app, because the build container carries prod env vars.
