import { hydrateRoot, createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { AppProviders } from "./app-providers";
import { initGA } from "./lib/analytics";
import { initMixpanel } from "./lib/mixpanel";
import { initPosthog } from "./lib/posthog";
import { initAmplitude } from "./lib/amplitude";
import { loadFontOverride } from "./lib/font-options";

function afterFirstPaint(callback: () => void): void {
  const scheduleIdle = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(callback, { timeout: 1500 });
    } else {
      globalThis.setTimeout(callback, 0);
    }
  };

  // rAF callbacks can run before the browser produces an actual paint
  // (notably in headless/background contexts). Use the buffered Paint Timing
  // signal so persisted-consent SDKs cannot race ahead of first content.
  if (performance.getEntriesByName("first-contentful-paint").length > 0) {
    scheduleIdle();
    return;
  }
  const fallback = () => {
    requestAnimationFrame(() => requestAnimationFrame(scheduleIdle));
  };
  if (
    typeof PerformanceObserver !== "undefined" &&
    PerformanceObserver.supportedEntryTypes?.includes("paint")
  ) {
    const observer = new PerformanceObserver((list) => {
      if (!list.getEntries().some((entry) => entry.name === "first-contentful-paint")) return;
      observer.disconnect();
      scheduleIdle();
    });
    try {
      observer.observe({ type: "paint", buffered: true });
      return;
    } catch {
      observer.disconnect();
    }
  }

  // Older browsers without Paint Timing retain the best available handoff.
  fallback();
}

// The inline pre-paint boot has already resolved saved-theme precedence and
// product-profile defaults, and the canonical <link> in index.html carries
// every family the five systems name, so no per-system font work happens
// here; only a saved picker override may still need its stylesheet.
let fontOverrideAtBoot: string | null = null;
try {
  fontOverrideAtBoot = localStorage.getItem("ds-font-override");
} catch {
  // Storage can be unavailable in hardened/private browsing contexts.
}

// Analytics SDKs are all consent-gated and deferred until the first painted
// frame. The consent banner invokes these immediately after an explicit grant.
afterFirstPaint(() => {
  initGA();
  initMixpanel();
  initPosthog();
  initAmplitude();
  if (fontOverrideAtBoot) loadFontOverride(fontOverrideAtBoot);
});

// Force dark theme immediately
document.documentElement.classList.add('dark');
// CC-12 / GAP-9 — lucide icons default to 1.5 stroke per DS spec via CSS
// (`.lucide { stroke-width: 1.5 }` lives in design-system.css). Per-instance
// audit of explicit strokeWidth overrides is deferred to WP-6.

const rootElement = document.getElementById("root")!;
const homeSsr = rootElement.dataset.homeSsr === "true" ? window.__HOME_SSR__ : undefined;

// Start the first route's code request as soon as the entry module evaluates,
// before the SSR hold handoff and provider tree do any work.  The route remains
// code-split (and auth guards remain unchanged); this only overlaps chunk
// transfer with bootstrap on deep links instead of waiting for React.lazy to
// render the route branch.
function preloadInitialRouteChunk() {
  const pathname = window.location.pathname;
  let chunk;
  if (pathname === "/") {
    chunk = import("./pages/Home");
  } else if (/^\/category\/[^/]+$/.test(pathname)) {
    chunk = import("./pages/Category");
  } else if (/^\/subcategory\/[^/]+$/.test(pathname)) {
    chunk = import("./pages/Subcategory");
  } else if (/^\/sub-subcategory\/[^/]+$/.test(pathname)) {
    chunk = import("./pages/SubSubcategory");
  } else if (/^\/resource\/[^/]+$/.test(pathname)) {
    chunk = import("./pages/ResourceDetail");
  }
  // A speculative preload must never create an unhandled rejection.  The
  // route's React.lazy import still observes the same module-cache failure and
  // renders its existing error/retry surface if the chunk is unavailable.
  chunk?.catch(() => undefined);
  return chunk;
}

const initialRouteChunk = preloadInitialRouteChunk();

// Preserve crawler-injected content until React Query has supplied the page's
// real data. This is event-driven: no DOM MutationObserver or 100ms polling is
// left running during boot.
// og-middleware injects real SEO content (#ssr-seo-content + its scoped
// <style>) into #root. createRoot().render() wipes #root, so on throttled
// loads users saw content appear (~0.7s), vanish at React mount (~1.5s), and
// reappear as cards (~1.8s). Fix: BEFORE React mounts, move the injected
// nodes into a fixed full-viewport overlay so the pixels never disappear;
// React mounts underneath, and the overlay is removed only once the app has
// real content to show. We still never hydrate this markup (see
// .agents/memory/spa-crawler-prerender.md).
(function holdSsrContent() {
  if (homeSsr) return;
  // The inline pre-boot script in index.html normally builds this overlay
  // before the first paint (see its comment: a later re-insertion would date
  // the route's LCP to the bundle instead of the document). Adopt it here and
  // only wire the removal; build it ourselves when that script did not run.
  const prebootHold = document.getElementById("ssr-seo-hold");
  const ssr = prebootHold
    ? prebootHold.querySelector("#ssr-seo-content")
    : rootElement.querySelector("#ssr-seo-content");
  if (!ssr) return;
  try {
    // This is the URL whose crawler markup is being held.  Do not evaluate
    // readiness against a later SPA location: that would let an unrelated
    // route's query settle the old overlay while its links remain on screen.
    const initialPathname = prebootHold?.getAttribute("data-pathname") || window.location.pathname;
    const overlay = prebootHold ?? document.createElement("div");
    // Both paths start from an overlay that is neither aria-hidden nor inert;
    // disposal restores that state.
    const previousAriaHidden: string | null = null;
    const previousInert = false;
    if (!prebootHold) {
      overlay.id = "ssr-seo-hold";
      overlay.setAttribute(
        "style",
        "position:fixed;inset:0;z-index:2147483000;background:#000;overflow:auto;overscroll-behavior:contain",
      );
      // Move the scoped <style> siblings too, so the overlay keeps its styling.
      const nodes = Array.from(rootElement.childNodes);
      for (const n of nodes) overlay.appendChild(n);
    }
    // React mounts the live tree underneath this visual hold.  From here on
    // the crawler markup is visual-only while both trees coexist; exposing it
    // would create duplicate landmarks, headings, and interactive controls.
    // (The pre-boot overlay deliberately stays semantic until this point so a
    // bundle that never runs still leaves a usable page.)
    overlay.setAttribute("aria-hidden", "true");
    overlay.inert = true;
    // JavaScript clients only see this visual hold; crawlers retain the raw
    // semantic h1. Demote before React mounts so the live DOM never has two h1s.
    const ssrH1 = overlay.querySelector("h1");
    if (ssrH1) {
      const div = document.createElement("div");
      div.className = "ssr-h1";
      while (ssrH1.firstChild) div.appendChild(ssrH1.firstChild);
      ssrH1.replaceWith(div);
    }
    if (!prebootHold) document.body.appendChild(overlay);

    const remove = () => {
      if (!overlay.isConnected) return;
      unsubscribe();
      window.clearTimeout(timeout);
      window.removeEventListener("popstate", remove);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      // Restore the attributes before disposal so cleanup is complete even
      // when a browser retains a detached node for inspection/extensions.
      if (previousAriaHidden === null) overlay.removeAttribute("aria-hidden");
      else overlay.setAttribute("aria-hidden", previousAriaHidden);
      overlay.inert = previousInert;
      overlay.remove();
    };
    const isSettled = () => {
      const taxonomyMatch = /^\/(category|subcategory|sub-subcategory)\/([^/]+)$/.exec(
        initialPathname,
      );
      const routeQueries = queryClient.getQueryCache().findAll();
      if (taxonomyMatch) {
        const level = taxonomyMatch[1];
        let slug = taxonomyMatch[2];
        try {
          slug = decodeURIComponent(slug);
        } catch {
          // Keep the raw segment. A malformed URL must not strand the hold.
        }
        return routeQueries.some(
          (query) =>
            query.queryKey[0] === "awesome-list-listing" &&
            query.queryKey[1] === level &&
            query.queryKey[2] === slug &&
            query.state.status !== "pending",
        );
      }
      const resourceMatch = /^\/resource\/([^/]+)$/.exec(initialPathname);
      if (resourceMatch) {
        let id = resourceMatch[1];
        try {
          id = decodeURIComponent(id);
        } catch {
          // Keep the raw segment. A malformed URL must not strand the hold.
        }
        return routeQueries.some(
          (query) =>
            query.queryKey[0] === "/api/resources" &&
            query.queryKey[1] === id &&
            query.queryKey.length === 2 &&
            query.state.status !== "pending",
        );
      }
      return (
        queryClient.getQueryData(["awesome-list-nav"]) !== undefined ||
        queryClient.getQueryState(["awesome-list-nav"])?.status === "error"
      );
    };
    const handoff = () => {
      if (isSettled()) requestAnimationFrame(remove);
    };
    const unsubscribe = queryClient.getQueryCache().subscribe(handoff);
    const timeout = window.setTimeout(remove, 3000);
    // Wouter's pushState navigations do not emit popstate. Remove the old
    // visual tree synchronously for both navigation forms, then restore the
    // native methods during normal handoff/timeout cleanup.
    // Preserve the exact pre-existing methods so other navigation shims are
    // restored byte-for-byte when this short-lived hold is disposed.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalPushState = history.pushState;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalReplaceState = history.replaceState;
    history.pushState = function (data, unused, url) {
      const result = originalPushState.call(history, data, unused, url);
      remove();
      return result;
    };
    history.replaceState = function (data, unused, url) {
      const result = originalReplaceState.call(history, data, unused, url);
      remove();
      return result;
    };
    window.addEventListener("popstate", remove);
    handoff();
  } catch {
    // If anything goes wrong, fall back to the old behavior (React wipes #root).
  }
})();

// Only the server-marked Home tree is hydrated. Crawler-only route HTML keeps
// its established createRoot compatibility path.
if (homeSsr) {
  // The server rendered Home directly, rather than through App's lazy wrapper.
  // Resolve that same component before hydration so React sees the identical
  // tree instead of first suspending on LazyHomeRoute and remounting the SSR
  // boundary.
  void (initialRouteChunk ?? import("./pages/Home")).then(({ default: Home }) => {
    hydrateRoot(
      rootElement,
      <AppProviders
        queryClient={queryClient}
        dehydratedState={homeSsr.dehydratedState}
        homeBoot={homeSsr.boot}
      >
        <App homeComponent={Home} />
      </AppProviders>,
    );
  }).catch((error) => {
    // Let the normal route error boundary render its existing failure/retry
    // surface if the SSR hydration chunk cannot be loaded. Keep the error
    // explicit: the SSR document was not hydrated successfully.
    console.error("[app] Home SSR hydration import failed; rendering SPA fallback", error);
    createRoot(rootElement).render(
      <AppProviders queryClient={queryClient}>
        <App />
      </AppProviders>,
    );
  });
} else {
  // Non-SSR routes retain App's lazy Home route and do not load Home here.
  createRoot(rootElement).render(
    <AppProviders queryClient={queryClient}>
      <App />
    </AppProviders>,
  );
}
