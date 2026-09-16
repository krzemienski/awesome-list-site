---
name: Route page remounts on Router re-render
description: Two app-wide causes of whole-page remounts shortly after load (scroll/tab/input state lost, flaky captures) and how to prove them.
---

Rule: a wouter `<Route component={() => <Guard><Page/></Guard>}>` inline arrow is a NEW component type on every Router render, so any auth/nav/query state change under Router remounts the entire page. Use the children form (`<Route path><Guard><Page/></Guard></Route>`) or a hoisted component; read query strings through `useSearch()` instead of `window.location` at mount.

Rule: a "clear the query cache when Clerk first reports a restored user" hook must `invalidateQueries()`, never `queryClient.clear()` — clear() also drops `/api/auth/user`, so every AuthGuard/AdminGuard flashes its spinner and the mounted page tree is torn down 50–400 ms after load. Keep `clear()` only for a genuine identity switch.

**Why:** admin tab strips captured at scrollLeft 0 on ~1/3 of loads (Playwright's hit-target retry then re-scrolled with a different alignment); the parity harness read it as a layout defect for weeks. No resize/focus/hash event accompanied it under a fixed clock.

**How to apply:** when a DOM node is "replaced" shortly after load, watch it with a MutationObserver that logs (a) whether the node vanished first and the visible loading copy at that instant, and (b) the topmost ancestor that changed identity. Spinner copy → cache/auth reset; atomic replacement at the route root → inline route component.

Rule: a "reveal the active tab" effect that observes its scroller with a ResizeObserver must disconnect after the first successful reveal. A full-page capture resizes the viewport (1×1 → W×H twice per shot), which re-fires the observer and re-scrolls the strip with a *different* alignment than the reference's one-shot scrollIntoView.

**How to apply:** any scroll-position side effect keyed off layout observation must be one-shot; a capture harness that resizes the viewport is a legitimate later resize.
