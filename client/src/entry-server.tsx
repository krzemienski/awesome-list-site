import { renderToString } from "react-dom/server";
import App from "./App";
import { ThemeProvider } from "./components/ui/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
// Removed processAwesomeListData - using database APIs only

export interface SSRContext {
  url: string;
}

export function render(context: SSRContext) {
  // Create a fresh QueryClient for each request
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: false,
      },
    },
  });

  // Removed static awesome-list-data preloading
  // Components fetch from database APIs (/api/categories, /api/resources) directly

  // Render the app to string with the pre-fetched data
  const html = renderToString(
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <App />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

  return {
    html,
    // Removed awesome-list-data dehydration - using database APIs only
    dehydratedState: {
      queries: [],
      mutations: []
    }
  };
}