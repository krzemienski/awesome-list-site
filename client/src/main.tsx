import { hydrateRoot, createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Force dark theme immediately
document.documentElement.classList.add('dark');

// Check if we have initial data from SSR
declare global {
  interface Window {
    __INITIAL_DATA__?: any;
    __DEHYDRATED_STATE__?: any;
  }
}

// Removed static awesome-list-data hydration - using database APIs only
// Components fetch categories and resources from /api/categories and /api/resources

const rootElement = document.getElementById("root")!;
const AppComponent = (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <App />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

// Always use client rendering (SSR disabled 2025-11-30)
// Previously used hydrateRoot() if hasChildNodes(), but <!--app-html--> comment
// triggered hydration against empty content, causing React errors #418, #423
createRoot(rootElement).render(AppComponent);
