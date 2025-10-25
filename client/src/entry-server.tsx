import { renderToString } from "react-dom/server";
import App from "./App";
import { ThemeProvider } from "./components/ui/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { processAwesomeListData } from "@/lib/parser";

export interface SSRContext {
  url: string;
  awesomeListData: any;
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

  // Process the awesome list data
  const awesomeList = context.awesomeListData 
    ? processAwesomeListData(context.awesomeListData)
    : undefined;

  // Pre-populate the query cache with the data
  if (awesomeList) {
    queryClient.setQueryData(["awesome-list-data"], context.awesomeListData);
  }

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
    // Dehydrate the query client state to send to the client
    dehydratedState: {
      queries: [
        {
          queryKey: ["awesome-list-data"],
          queryHash: '["awesome-list-data"]',
          state: {
            data: context.awesomeListData,
            dataUpdateCount: 1,
            dataUpdatedAt: Date.now(),
            error: null,
            errorUpdateCount: 0,
            errorUpdatedAt: 0,
            fetchFailureCount: 0,
            fetchMeta: null,
            isFetching: false,
            isInvalidated: false,
            isPaused: false,
            status: 'success'
          }
        }
      ],
      mutations: []
    }
  };
}