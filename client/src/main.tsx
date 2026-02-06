import { hydrateRoot, createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";

// Force dark theme immediately
document.documentElement.classList.add('dark');

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
const AppComponent = (
  <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
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
