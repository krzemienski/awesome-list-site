import { hydrateRoot, createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/design-system";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { initGA } from "./lib/analytics";
import { needsCorpusRoute } from "./lib/static-data";

// Initialize GA before React renders so window.gtag exists in time for the very
// first page_view (React runs child effects before parent effects, so App's
// mount effect fires too late for Router/useAnalytics's initial page_view).
initGA();

// Force dark theme immediately
document.documentElement.classList.add('dark');
// CC-12 / GAP-9 — lucide icons default to 1.5 stroke per DS spec via CSS
// (`.lucide { stroke-width: 1.5 }` lives in design-system.css). Per-instance
// audit of explicit strokeWidth overrides is deferred to WP-6.

// Types for SSR data
interface QueryState {
  queryKey: unknown[];
  queryHash: string;
  state: {
    data: unknown;
    dataUpdateCount: number;
    dataUpdatedAt: number;
    error: unknown;
    errorUpdateCount: number;
    errorUpdatedAt: number;
    fetchFailureCount: number;
    fetchMeta: unknown;
    isFetching: boolean;
    isInvalidated: boolean;
    isPaused: boolean;
    status: 'success' | 'error' | 'pending';
  };
}

interface DehydratedState {
  queries: QueryState[];
  mutations: unknown[];
}

// Check if we have initial data from SSR
declare global {
  interface Window {
    __INITIAL_DATA__?: unknown;
    __DEHYDRATED_STATE__?: DehydratedState;
  }
}

// Pre-populate query cache with SSR data if available
if (window.__INITIAL_DATA__) {
  queryClient.setQueryData(["awesome-list-data"], window.__INITIAL_DATA__);
} else if (window.__DEHYDRATED_STATE__) {
  // Handle dehydrated state from SSR
  const dehydratedState = window.__DEHYDRATED_STATE__;
  if (dehydratedState?.queries) {
    dehydratedState.queries.forEach((query) => {
      queryClient.setQueryData(query.queryKey, query.state.data);
    });
  }
}

const rootElement = document.getElementById("root")!;

// Task #172 — kill the paint→blank→paint flash on slow connections.
// og-middleware injects real SEO content (#ssr-seo-content + its scoped
// <style>) into #root. createRoot().render() wipes #root, so on throttled
// loads users saw content appear (~0.7s), vanish at React mount (~1.5s), and
// reappear as cards (~1.8s). Fix: BEFORE React mounts, move the injected
// nodes into a fixed full-viewport overlay so the pixels never disappear;
// React mounts underneath, and the overlay is removed only once the app has
// real content to show. We still never hydrate this markup (see
// .agents/memory/spa-crawler-prerender.md).
(function holdSsrContent() {
  const ssr = rootElement.querySelector("#ssr-seo-content");
  if (!ssr) return;
  try {
    const overlay = document.createElement("div");
    overlay.id = "ssr-seo-hold";
    overlay.setAttribute(
      "style",
      "position:fixed;inset:0;z-index:2147483000;background:#000;overflow:auto;overscroll-behavior:contain",
    );
    // Move the scoped <style> siblings too, so the overlay keeps its styling.
    const nodes = Array.from(rootElement.childNodes);
    for (const n of nodes) overlay.appendChild(n);
    // Run22 BUG-009 + Run23 NB-035: once React renders the page's real <h1>
    // underneath the overlay, the overlay's SSR <h1> would make the DOM
    // contain two H1s — so it gets demoted to a visually-identical <div>
    // (.ssr-h1 rule ships in the injected scoped <style>). Run22 demoted it
    // EAGERLY at boot, which opened a zero-h1 window (~460ms; ~1s on slow-3G)
    // between boot and React's first h1 commit. Now a MutationObserver
    // demotes it at the exact moment React's h1 appears — observers fire as
    // microtasks after the DOM mutation, BEFORE the next paint, so no painted
    // frame ever shows zero or two H1s. Non-JS crawlers never execute any of
    // this and still see the semantic <h1> in the raw HTML.
    const demoteSsrH1 = () => {
      const ssrH1 = overlay.querySelector("h1");
      if (!ssrH1) return;
      const div = document.createElement("div");
      div.className = "ssr-h1";
      while (ssrH1.firstChild) div.appendChild(ssrH1.firstChild);
      ssrH1.replaceWith(div);
    };
    const h1Observer = new MutationObserver(() => {
      if (rootElement.querySelector("h1")) {
        demoteSsrH1();
        h1Observer.disconnect();
      }
    });
    h1Observer.observe(rootElement, { childList: true, subtree: true });
    document.body.appendChild(overlay);

    const start = Date.now();
    let dataSettledAt = 0;

    const remove = () => {
      clearInterval(timer);
      h1Observer.disconnect();
      overlay.remove();
    };
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      // Real listing content rendered → swap immediately. Run23 NB-017: home
      // and /categories render TaxonomyCards (link-category-* /
      // category-card-*), not ResourceCards — match those too so the overlay
      // lifts on first paint instead of waiting out the settle grace below.
      if (
        rootElement.querySelector(
          '[data-testid^="card-resource"], [data-testid^="link-category-"], [data-testid^="category-card-"]',
        )
      ) {
        return remove();
      }
      // Watch the query cache directly (no body-stream races). Run22 BUG-008:
      // listing routes settle on the full catalog under ["awesome-list-data"];
      // all other routes no longer fetch the corpus, so they settle on the
      // lightweight nav tree under ["awesome-list-nav"] instead.
      const settleKey = needsCorpusRoute(window.location.pathname)
        ? ["awesome-list-data"]
        : ["awesome-list-nav"];
      if (
        !dataSettledAt &&
        queryClient.getQueryData(settleKey) !== undefined
      ) {
        dataSettledAt = Date.now();
      }
      // R5-006 (run24): the catalog query FAILING must also lift the hold —
      // the SPA renders its styled error card + Retry underneath, and the
      // overlay used to sit on top of it until the hard cap, trapping users
      // on a frozen unstyled snapshot during outages.
      if (queryClient.getQueryState(settleKey)?.status === "error") {
        return remove();
      }
      const reactCommitted = !!rootElement.firstElementChild;
      // Routes without resource cards (static pages, detail views): once React
      // has committed AND the catalog payload has landed, the data-driven
      // render commits within a tick — swap on the next poll. Run23 NB-017:
      // grace trimmed 600ms → 100ms (plus the 100ms poll interval) so the
      // overlay stops eating clicks ~840ms after the app was ready.
      if (
        reactCommitted &&
        dataSettledAt &&
        Date.now() - dataSettledAt > 100
      ) {
        return remove();
      }
      // Hard cap: never trap the user on the static overlay. R5-006: 8s → 3s;
      // with the error-path lift above this only fires for hung requests, and
      // 3s of skeleton beats 8s of frozen snapshot.
      if (elapsed > 3000) return remove();
    }, 100);
  } catch {
    // If anything goes wrong, fall back to the old behavior (React wipes #root).
  }
})();
const AppComponent = (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <App />
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

// Use hydration if we have server-rendered content, otherwise use client rendering
if (rootElement.hasChildNodes() && (window.__INITIAL_DATA__ || window.__DEHYDRATED_STATE__)) {
  hydrateRoot(rootElement, AppComponent);
} else {
  createRoot(rootElement).render(AppComponent);
}
