import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { trackApiPerformance, trackError } from "./analytics";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
      trackError('api_error', `${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
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
