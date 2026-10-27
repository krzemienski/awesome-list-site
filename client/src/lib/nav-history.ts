import { useEffect, useRef } from "react";
import { focusElement } from "@/hooks/focus-handoff";

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

// `location` is wouter's path; `search` its query. Positions are keyed by
// both, so a Back/Forward that only changes the query (?page=2 → ?page=3)
// must re-run the restore too. Forward query-only changes (filters, typing,
// the paginator's own smooth scroll) keep the current offset; only a path
// change starts at the top.
export function useScrollRestoration(location: string, search: string): void {
  const lastPath = useRef(location);
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
    const pathChanged = lastPath.current !== location;
    lastPath.current = location;
    if (!pendingPop) {
      if (pathChanged) window.scrollTo(0, 0);
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
  }, [location, search]);
}

// A path change moves focus to the new page's <h1>, or to the element a
// #fragment names, so a screen reader names the page and Tab continues from
// there, as after a full page load. Query-only changes (filters, paging) keep
// the page's own focus handling. The hand-off retries each frame while the
// page renders: a loading heading that is replaced, a fragment target that
// renders after the heading, or a dialog that restores focus to its opener,
// gets focus moved to the current target. The budget runs on while <main>
// shows a loading state, so a slow lazy route still gets its heading; if focus
// is still outside <main> when it runs out (no h1 rendered), <main> takes it.
// It ends early when the page focuses something in <main> itself, or on any
// key or pointer input (so the skip link keeps working).
const ROUTE_FOCUS_BUDGET_MS = 4000;
const ROUTE_FOCUS_BUSY_LIMIT_MS = 20000;
// Marks focus this hook placed, so only that focus drops the ring
// (app-bridge.css). Keyboard hand-offs to the same heading keep their ring.
const ROUTE_FOCUS_ATTR = "data-route-focus";

// A suspended route keeps the previous page's h1 in the DOM, hidden
// (display: none), so only a rendered h1 counts.
function visibleHeading(): HTMLElement | undefined {
  const main = document.getElementById("main");
  return Array.from(main?.querySelectorAll<HTMLElement>("h1") ?? []).find(
    (h1) => h1.getClientRects().length > 0,
  );
}

// The outgoing page's heading, captured when the path changes and before
// React renders the next route (registered at module load for the same
// ordering reason as the pop flag above). While <main> is still loading, a
// page showing this exact heading, same node and same text, has not rendered
// the new route yet. Once settled, the heading is the new route's even when
// it reads the same (one "You're offline" state replacing another).
let outgoingHeading: { el: HTMLElement; text: string | null } | null = null;
let lastPathname = typeof window !== "undefined" ? window.location.pathname : "";

if (typeof window !== "undefined") {
  for (const type of ["popstate", "pushState", "replaceState"]) {
    window.addEventListener(type, () => {
      if (window.location.pathname === lastPathname) return;
      lastPathname = window.location.pathname;
      const el = visibleHeading();
      outgoingHeading = el ? { el, text: el.textContent } : null;
    });
  }
}

function fragmentId(): string {
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return "";
  }
}

function focusForRoute(el: HTMLElement): boolean {
  // focusElement makes a non-focusable target programmatically focusable; the
  // tabindex it adds must not outlive the focus, or a fragment section stays
  // a focus stop for later scripts and a11y tooling.
  const addedTabindex = !el.hasAttribute("tabindex");
  el.setAttribute(ROUTE_FOCUS_ATTR, "");
  if (!focusElement(el, { preventScroll: true })) {
    el.removeAttribute(ROUTE_FOCUS_ATTR);
    if (addedTabindex && el.getAttribute("tabindex") === "-1") el.removeAttribute("tabindex");
    return false;
  }
  el.addEventListener("blur", () => {
    el.removeAttribute(ROUTE_FOCUS_ATTR);
    if (addedTabindex && el.getAttribute("tabindex") === "-1") el.removeAttribute("tabindex");
  }, { once: true });
  return true;
}

function isTextEntry(element: Element | null): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}

export function useRouteFocus(location: string): void {
  const lastPath = useRef(location);
  useEffect(() => {
    if (lastPath.current === location) return;
    lastPath.current = location;
    // A page that mounted in this same commit may already have focused its
    // search box (a clicked link is never a text field).
    if (isTextEntry(document.activeElement)) return;

    const outgoing = outgoingHeading;
    const fragment = fragmentId();
    let placed: HTMLElement | null = null;
    let frame = 0;
    const startedAt = Date.now();
    function stop() {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("keydown", stop, true);
      window.removeEventListener("pointerdown", stop, true);
    }
    // Focus this hook places carries ROUTE_FOCUS_ATTR; any other focus inside
    // <main> is the page's own and ends the hand-off.
    function onFocusIn(event: FocusEvent) {
      const target = event.target as Element;
      const main = document.getElementById("main");
      if (!target.hasAttribute?.(ROUTE_FOCUS_ATTR) && main?.contains(target)) stop();
    }
    function routeTarget(main: HTMLElement | null, loading: boolean): HTMLElement | null {
      const heading = visibleHeading();
      if (loading && heading && heading === outgoing?.el && heading.textContent === outgoing.text) return null;
      const section = fragment ? document.getElementById(fragment) : null;
      return (section && main?.contains(section) ? section : null) ?? heading ?? null;
    }
    function tick() {
      const main = document.getElementById("main");
      const loading = document.querySelector('#main [aria-busy="true"]') !== null;
      const next = routeTarget(main, loading);
      const active = document.activeElement;
      if (next && next !== active && (!placed || active === placed || !main?.contains(active)) && focusForRoute(next)) {
        placed = next;
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed < ROUTE_FOCUS_BUDGET_MS || (loading && elapsed < ROUTE_FOCUS_BUSY_LIMIT_MS)) {
        frame = requestAnimationFrame(tick);
        return;
      }
      stop();
      if (main && !main.contains(document.activeElement)) focusForRoute(main);
    }
    document.addEventListener("focusin", onFocusIn);
    window.addEventListener("keydown", stop, true);
    window.addEventListener("pointerdown", stop, true);
    frame = requestAnimationFrame(tick);
    return stop;
  }, [location]);
}

// In-app links to a page section (/settings#notification-settings) arrive via
// pushState, which never jumps to a fragment, and the route-change effect above
// scrolls to the top anyway. Once the caller's content has loaded, bring the
// fragment's element into view (waiting a few frames for it to render).
export function useScrollToHash(ready: boolean): void {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!ready || !id) return;

    let cancelled = false;
    const deadline = Date.now() + 4000;
    const tryScroll = () => {
      if (cancelled) return;
      const section = document.getElementById(id);
      if (section) {
        section.scrollIntoView({ block: "start" });
      } else if (Date.now() < deadline) {
        requestAnimationFrame(tryScroll);
      }
    };
    requestAnimationFrame(tryScroll);
    return () => {
      cancelled = true;
    };
  }, [ready]);
}
