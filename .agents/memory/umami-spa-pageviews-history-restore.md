---
name: Umami SPA pageviews wiped by history restore
description: Why Replit Analytics records only landing pageviews on awesome.video — the SSR-hold cleanup restores history.pushState and drops the Umami hook; and why Back/Forward went unrecorded (the tracker has no popstate listener).
---
- The SSR hold in main.tsx saves `history.pushState/replaceState` at boot and writes them back when the hold is removed. The async Replit (Umami) tracker patches those methods in between, so the restore silently removes its SPA-navigation hook: only the first page of each visit is recorded (pages/session ~1.1–1.6). Confirmed 2026-10-24: /privacy recorded, in-app nav to /terms not.
  **Why:** custom events still arrive (they call `umami.track` directly), so the loss is invisible unless you look at pageviews per session.
  **How to apply:** any code that monkey-patches history must unwrap only its own wrapper (or leave a pass-through), never reassign a saved original.
- Fixed 2026-10-24: the hold now restores only when `history.pushState` is still its own wrapper; otherwise its wrapper stays in the chain as a no-op pass-through. The Replit tracker is injected only on the published site, so the end-to-end check (3 pageviews per 3-page visit) can only be confirmed after publishing.
- Second gap, found 2026-10-26 in a production HAR: the tracker hooks only `pushState`/`replaceState` and has no `popstate` listener (`curl -s https://i.replit.com/script.js | grep -c popstate` → 0). After Back/Forward it sent no pageview and every later custom event carried the previous page's URL (e.g. `resource_viewed` for a resource tagged `/category/...`).
  **Fix:** `use-analytics.tsx` calls `history.replaceState(history.state, '', location.href)` on every `popstate`, which runs the tracker's own wrapper: it updates its current URL and referrer and sends one pageview, still honouring `umami.disabled` and skipping when the URL is unchanged. The router sees a same-URL replace and does nothing.
  **How to apply:** to tell the tracker about a navigation, go through its history hook; never call `umami.track()` with a hand-built pageview.
