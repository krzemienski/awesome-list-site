---
name: Safe ?next= redirect validation
description: Post-login ?next= paths need the backslash rule, not just a double-slash check
---

Rule: when validating a same-origin redirect path, require it to match `/^\/(?![/\\])/` — a leading `/` followed by neither `/` nor `\`.

**Why:** `startsWith("/") && !startsWith("//")` looks safe but `?next=/\evil.com` passes it, and browsers normalize `\` to `/` during URL parsing, so `location.href = "/\evil.com"` becomes a protocol-relative redirect to `https://evil.com`. Classic open-redirect bypass; caught by architect review in July 2026.

**How to apply:** any place the app assigns user-controlled input to `window.location`/redirects (login `?next=`, OAuth return paths). Regression check: probe `?next=%2F%5Cevil.com` and assert it falls back to the role default (the original one-off harness has been pruned).
