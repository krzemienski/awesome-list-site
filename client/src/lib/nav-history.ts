import { useEffect } from "react";

// BUG-013 (run14): window.history.length is useless for "did the user
// navigate inside the app?" — a fresh tab already has about:blank (and the
// browser new-tab page) in its history, so length > 1 sends deep-linked
// visitors to a blank page when they press the in-app Back button.
// Instead, App counts wouter location changes here; only when at least one
// in-app navigation has happened is history.back() guaranteed to land on an
// in-app page.
let locationChanges = 0;

export function noteLocationChange(): void {
  locationChanges += 1;
}

export function hasInAppHistory(): boolean {
  // The first "change" is the initial mount, not a navigation.
  return locationChanges > 1;
}

// Run17 BUG-052: browser-native scroll restoration can't work in this SPA —
// on Back the route content re-renders (often async) at near-zero height, so
// the browser's restore attempt clamps to the top. We take over: positions
// are saved continuously per pathname+search in sessionStorage, and on a
// popstate navigation we re-apply the saved offset once the page has grown
// tall enough (retrying each frame, ~4s budget). Forward (pushState)
// navigations scroll to the top as before.
const SCROLL_KEY_PREFIX = "scrollpos:";

function currentScrollKey(): string {
  return SCROLL_KEY_PREFIX + window.location.pathname + window.location.search;
}

// The pop flag MUST be set before React re-renders for the new location.
// wouter subscribes to popstate during mount, so a listener registered in a
// useEffect lands AFTER wouter's in the dispatch order — React 18 then
// flushes the location render (and this hook's effect) synchronously inside
// wouter's handler, and the effect reads a stale `false`. Registering at
// module load guarantees this listener runs first.
let pendingPop =
  typeof performance !== "undefined" &&
  (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)
    ?.type === "back_forward";

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    pendingPop = true;
  });
}

export function useScrollRestoration(location: string): void {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    let rafPending = false;
    const onScroll = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        try {
          sessionStorage.setItem(currentScrollKey(), String(window.scrollY));
        } catch {
          // Storage full/unavailable — restoration silently degrades to top.
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!pendingPop) {
      window.scrollTo(0, 0);
      return;
    }
    pendingPop = false;

    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(currentScrollKey())) || 0;
    } catch {
      saved = 0;
    }
    if (saved <= 0) {
      window.scrollTo(0, 0);
      return;
    }

    let cancelled = false;
    const deadline = Date.now() + 4000;
    const tryRestore = () => {
      if (cancelled) return;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll >= saved) {
        window.scrollTo(0, saved);
      } else if (Date.now() < deadline) {
        requestAnimationFrame(tryRestore);
      } else {
        // Content never grew that tall (e.g. list shrank) — best effort.
        window.scrollTo(0, Math.max(0, maxScroll));
      }
    };
    requestAnimationFrame(tryRestore);
    return () => {
      cancelled = true;
    };
  }, [location]);
}
