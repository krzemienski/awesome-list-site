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
import type { DehydratedState } from "@tanstack/react-query";
import type { HomeBoot } from "./lib/home-boot";

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
    const isSettled = () =>
      queryClient.getQueryData(["awesome-list-nav"]) !== undefined ||
      queryClient.getQueryState(["awesome-list-nav"])?.status === "error";
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
  <AppProviders
    queryClient={queryClient}
    dehydratedState={homeSsr?.dehydratedState as DehydratedState | undefined}
    homeBoot={homeSsr?.boot as HomeBoot | undefined}
  >
    <App />
  </AppProviders>
);

// Only the server-marked Home tree is hydrated. Crawler-only route HTML keeps
// its established createRoot compatibility path.
if (homeSsr) {
  hydrateRoot(rootElement, AppComponent);
} else {
  createRoot(rootElement).render(AppComponent);
}
