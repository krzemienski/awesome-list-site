---
name: Theme storage denial gates
description: How to isolate product-theme storage failures from third-party session storage in browser validation.
---

Product-profile storage-denial gates should reject the app-owned theme keys while leaving third-party session keys alone, unless Clerk compatibility is the explicit subject of the test.

**Why:** Replacing all of `localStorage` with a throwing object prevents Clerk from mounting its provider, so a focused theme-default gate fails before React can verify the app-owned fallback behavior.

**How to apply:** Install the denial shim before navigation, throw for both reads and writes of the theme keys, and separately assert pre-paint attributes, post-mount attributes, density roles, and denied call counts.