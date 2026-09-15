---
name: URL-sync effects vs history navigation
description: Why a page's "mirror state into the URL" effect can trap the user (Back never leaves the page) and the guard that prevents it.
---

**Rule:** a `useEffect` that writes the page's own URL (`pushState`/`replaceState`) from component state must no-op once `window.location.pathname` is no longer that page's route (compare percent-decoded, trailing-slash tolerant).
**Why:** listing the router `location` as a dependency means the effect re-runs on popstate while the old page is still mounted; it sees the document at the new route, "corrects" it back to its own href, and overwrites the entry the user navigated to (history.length unchanged, next Back lands on `about:blank`). wouter observes `replaceState`, so the old page even re-renders — no console error, no failed request; only a Back that "does nothing" reveals it.
**How to apply:** any listing/filter page with URL-mirrored state. Verify with a probe that counts `pushState` calls and checks `history.length` after Back; the built-in tester's first report called it "timing" — ask it to reproduce before accepting a navigation workaround (brand link) as a pass.
