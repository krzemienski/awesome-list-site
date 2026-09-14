import type { ReactNode } from "react";
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query";
import App from "./App";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { HomeBootProvider, type HomeBoot } from "@/lib/home-boot";

/**
 * The only provider order used by either Home SSR or browser hydration.
 * Keeping it shared prevents a seemingly harmless provider-order difference
 * from forcing React to discard the server tree.
 */
export function AppProviders({
  queryClient,
  dehydratedState,
  homeBoot = null,
  children,
}: {
  queryClient: QueryClient;
  dehydratedState?: DehydratedState;
  homeBoot?: HomeBoot | null;
  children?: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <HomeBootProvider value={homeBoot}>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              {children ?? <App />}
            </TooltipProvider>
          </ThemeProvider>
        </HomeBootProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}