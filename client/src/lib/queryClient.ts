import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { trackApiPerformance, trackError } from "./analytics";
import { humanizeStatusBody } from "./apiError";

// NB-028 (run18): errors must carry the HTTP status as a real property —
// retry predicates checking `'status' in error` silently failed against the
// plain Error thrown before, so 401s retried like transient faults.
// Run22 BUG-039: `message` is now the humanized user-safe copy (many toast
// sites render error.message directly, which used to expose raw JSON like
// '401: {"message":"..."}'). The raw server body is preserved on `.body` for
// structured consumers (extractFieldErrors, humanizeApiError).
export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(humanizeStatusBody(status, body));
    this.status = status;
    this.body = body;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new ApiError(res.status, text);
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: options?.credentials || "include",
  });

  await throwIfResNotOk(res);
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const startTime = performance.now();
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Track API performance
      trackApiPerformance(url, responseTime, res.status);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Track API errors
      trackApiPerformance(url, responseTime, 0);
      // BUG-038 (run24): a 401 is an expected signed-out/expired-session
      // outcome, not an application error — don't report it to analytics.
      const is401 = error instanceof ApiError && error.status === 401;
      if (!is401) {
        trackError('api_error', `${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
