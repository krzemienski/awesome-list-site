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
    document.body.appendChild(overlay);

    const start = Date.now();
    let dataSettledAt = 0;

    const remove = () => {
      clearInterval(timer);
      overlay.remove();
    };
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      // Real listing content rendered → swap immediately.
      if (rootElement.querySelector('[data-testid^="card-resource"]')) {
        return remove();
      }
      // Watch the query cache directly (no body-stream races): the catalog
      // payload lands under ["awesome-list-data"] once fully downloaded+parsed.
      if (
        !dataSettledAt &&
        queryClient.getQueryData(["awesome-list-data"]) !== undefined
      ) {
        dataSettledAt = Date.now();
      }
      const reactCommitted = !!rootElement.firstElementChild;
      // Routes without resource cards (static pages, detail views): once React
      // has committed AND the catalog payload has landed, give one short grace
      // period for the data-driven render, then swap.
      if (
        reactCommitted &&
        dataSettledAt &&
        Date.now() - dataSettledAt > 600 &&
        elapsed > 600
      ) {
        return remove();
      }
      // Hard cap: never trap the user on the static overlay.
      if (elapsed > 8000) return remove();
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
