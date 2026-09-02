---
name: Vite SPA curl smoke checks
description: Avoid false failures when smoke-testing client-rendered Vite routes with curl.
---

When smoke-testing a Vite SPA with curl, assert the HTTP status and static HTML shell markers such as the title or root element. Do not assert text that React renders after hydration.

**Why:** A healthy dev server can return the correct SPA shell while a curl-only check falsely fails because curl does not execute the client bundle.

**How to apply:** Use curl for server startup, base-path, and SPA fallback checks. Use a real browser only when the validation criterion depends on client-rendered content or behavior.