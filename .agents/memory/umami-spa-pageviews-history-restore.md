---
name: Umami SPA pageviews wiped by history restore
description: Why Replit Analytics records only landing pageviews on awesome.video — the SSR-hold cleanup restores history.pushState and drops the Umami hook.
---
- The SSR hold in main.tsx saves `history.pushState/replaceState` at boot and writes them back when the hold is removed. The async Replit (Umami) tracker patches those methods in between, so the restore silently removes its SPA-navigation hook: only the first page of each visit is recorded (pages/session ~1.1–1.6). Confirmed 2026-10-24: /privacy recorded, in-app nav to /terms not.
  **Why:** custom events still arrive (they call `umami.track` directly), so the loss is invisible unless you look at pageviews per session.
  **How to apply:** any code that monkey-patches history must unwrap only its own wrapper (or leave a pass-through), never reassign a saved original.
