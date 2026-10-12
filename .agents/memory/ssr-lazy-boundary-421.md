---
name: Lazy components inside the SSR Home tree
description: Why an env-gated React.lazy component in the shell throws React #421/#419 on Home only, and how to mount such hosts.
---
Any `lazy()` + `<Suspense>` inside the hydrated Home tree is server-rendered as a (possibly empty) boundary. On the client the boundary stays dehydrated until its chunk arrives; any context/state update that reaches it first throws React #421 (or #419) and client-renders the boundary. Only Home hydrates, so other routes never show it.

**Why:** the contact dialog host is gated on VITE_CONTACT_VARIANT; once the shared env set it (uncommitted .replit userenv), 4/5 Home loads threw #421 locally while production (no variant) was clean — it looked like an unrelated regression.

**How to apply:** closed-by-default overlays/hosts that lazy-load must mount client-only (useEffect mounted flag) so the server emits no boundary. When a local-vs-prod difference appears, diff env-gated features (`.replit` userenv) before bisecting code; compare `<!--$-->` counts in the SSR HTML.

**Second variant — the route Suspense itself.** Even with the Home component resolved before `hydrateRoot`, a server-rendered `<Suspense>` wrapping it is hydrated in a deferred (Offscreen-priority) pass after the shell commits. React Query updates are sync (useSyncExternalStore), so auth/config responses re-rendering Router push new children into the still-dehydrated boundary → #421. Chromium usually wins the race (0/10); WebKit loses ~2/5. Fix: render the already-resolved hydrated page outside any boundary on BOTH server and client; keep Suspense only for the lazy SPA path.
**How to apply:** test hydration races in WebKit, not just Chromium; a request timeline (chunk + /api timestamps vs the pageerror) shows which update hit the boundary.
