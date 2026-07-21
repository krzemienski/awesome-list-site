---
name: Suspense renders error-free while loading
description: Why one-shot guards in error boundaries must never be cleared on a clean render — use timestamps.
---

# Error boundary "clean render" ≠ guarded resource loaded

An error boundary wrapping `<Suspense>` renders **error-free while the lazy chunk is still fetching** — the fallback path is a normal, non-error render.

**Why:** A one-shot auto-reload guard (e.g. "reload once on chunk failure") implemented as a boolean that is cleared on any error-free render will clear itself *during* the chunk fetch, before the failure fires. Result: every chunk failure looks like the first one → **infinite reload loop** (proven live: 8 full page reloads in 20s on a blocked chunk).

**How to apply:**
- Never clear reload/retry guards in `render()` or on componentDidUpdate of an error boundary — there is no render-time signal that the guarded resource actually loaded.
- Use a persisted **timestamp + cooldown** (e.g. sessionStorage, 60s): `componentDidCatch` checks `now - last > cooldown` before reloading, and stamps. A manual Retry button should also *stamp* (not clear) so a click can't re-arm an immediate auto-reload.
- When verifying this class of fix, the injection gate must count navigations over time (e.g. ≤2 navs/20s), not just check that a retry card appears once.
