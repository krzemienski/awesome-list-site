import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { AppProviders } from "./app-providers";
import type { HomeBoot } from "./lib/home-boot";

export interface HomeSSRContext {
  boot: HomeBoot;
  nav: unknown;
  home: unknown;
  kindCounts: unknown;
}

/**
 * Render precisely the provider/App tree the browser hydrates. The caller owns
 * data loading because it is request-local server work, never an HTTP loopback.
 */
export function renderHome(context: HomeSSRContext) {
  const queryClient = new QueryClient({
    defaultOptions: {
      // Every server-visible Home query must be explicitly hydrated below.
      // A query added to the tree without a matching preload is a rendering
      // defect, not a reason for Node to attempt a browser fetch/retry.
      queries: {
        staleTime: 60_000,
        retry: false,
        queryFn: () => {
          throw new Error("Unprefetched query attempted during Home SSR");
        },
      },
    },
  });
  queryClient.setQueryData(["awesome-list-nav"], context.nav);
  queryClient.setQueryData(["/api/home"], context.home);
  queryClient.setQueryData(["/api/resources/kinds/counts"], context.kindCounts);
  // Anonymous Home SSR may render several `useAuth` consumers. Seed the
  // public signed-out result rather than allowing an observer to fetch.
  queryClient.setQueryData(["/api/auth/user"], { user: null, isAuthenticated: false });

  // The anonymous auth value above exists solely so the server can render the
  // same signed-out branches without a fetch. It must not cross the document
  // boundary: a five-minute client cache could otherwise mask a Clerk session
  // established between render and hydration.
  const dehydratedState = dehydrate(queryClient, {
    shouldDehydrateQuery: (query) => query.queryKey[0] !== "/api/auth/user",
  });
  const html = renderToString(
    <Router ssrPath={context.boot.path} ssrSearch={context.boot.search}>
      <AppProviders
        queryClient={queryClient}
        dehydratedState={dehydratedState}
        homeBoot={context.boot}
      />
    </Router>,
  );

  return { html, dehydratedState };
}