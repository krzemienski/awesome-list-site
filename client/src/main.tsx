import { hydrateRoot, createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

// Force dark theme immediately
document.documentElement.classList.add('dark');

// Check if we have initial data from SSR
declare global {
  interface Window {
    __INITIAL_DATA__?: any;
    __DEHYDRATED_STATE__?: any;
  }
}

// Pre-populate query cache with SSR data if available
if (window.__INITIAL_DATA__) {
  queryClient.setQueryData(["awesome-list-data"], window.__INITIAL_DATA__);
} else if (window.__DEHYDRATED_STATE__) {
  // Handle dehydrated state from SSR
  const dehydratedState = window.__DEHYDRATED_STATE__;
  if (dehydratedState?.queries) {
    dehydratedState.queries.forEach((query: any) => {
      queryClient.setQueryData(query.queryKey, query.state.data);
    });
  }
}

const rootElement = document.getElementById("root")!;
const AppComponent = (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <App />
    </TooltipProvider>
  </QueryClientProvider>
);

// Use hydration if we have server-rendered content, otherwise use client rendering
if (rootElement.hasChildNodes() && (window.__INITIAL_DATA__ || window.__DEHYDRATED_STATE__)) {
  hydrateRoot(rootElement, AppComponent);
} else {
  createRoot(rootElement).render(AppComponent);
}
