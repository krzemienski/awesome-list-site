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
import { initMixpanel } from "./lib/mixpanel";
import { initPosthog } from "./lib/posthog";
import { initAmplitude } from "./lib/amplitude";
import { needsCorpusRoute } from "./lib/static-data";
import { loadDesignSystemFont, loadFontOverride } from "./lib/font-options";

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

let selectedSystemAtBoot: string | null = null;
let fontOverrideAtBoot: string | null = null;
try {
  selectedSystemAtBoot = localStorage.getItem("ds-system");
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
  if (selectedSystemAtBoot) loadDesignSystemFont(selectedSystemAtBoot);
  if (fontOverrideAtBoot) loadFontOverride(fontOverrideAtBoot);
});

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
    // JavaScript clients only see this visual hold; crawlers retain the raw
    // semantic h1. Demote before React mounts so the live DOM never has two h1s.
    const ssrH1 = overlay.querySelector("h1");
    if (ssrH1) {
      const div = document.createElement("div");
      div.className = "ssr-h1";
      while (ssrH1.firstChild) div.appendChild(ssrH1.firstChild);
      ssrH1.replaceWith(div);
    }
    document.body.appendChild(overlay);

    const remove = () => {
      unsubscribe();
      window.clearTimeout(timeout);
      overlay.remove();
    };
    const isSettled = () => {
      const taxonomy = /^\/(category|subcategory|sub-subcategory)\//.test(window.location.pathname);
      const settleKey = taxonomy
        ? undefined
        : needsCorpusRoute(window.location.pathname) ? ["awesome-list-data"] : ["awesome-list-nav"];
      const matchingQueries = taxonomy
        ? queryClient.getQueryCache().findAll({ queryKey: ["awesome-list-listing"] })
        : [];
      return taxonomy
        ? matchingQueries.some((query) => query.state.data !== undefined || query.state.status === "error")
        : !!settleKey && (
          queryClient.getQueryData(settleKey) !== undefined ||
          queryClient.getQueryState(settleKey)?.status === "error"
        );
    };
    const handoff = () => {
      if (isSettled()) requestAnimationFrame(remove);
    };
    const unsubscribe = queryClient.getQueryCache().subscribe(handoff);
    const timeout = window.setTimeout(remove, 3000);
    handoff();
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
