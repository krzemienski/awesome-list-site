import { QueryClient, QueryCache, MutationCache, QueryFunction } from "@tanstack/react-query";
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
  // BUG-001 (Audit 2): server 429s always carry Retry-After; surfacing it here
  // lets the query layer schedule an honest automatic retry instead of
  // hard-failing on the first transient rate-limit response.
  retryAfterSec?: number;
  constructor(status: number, body: string, retryAfterSec?: number) {
    super(humanizeStatusBody(status, body));
    this.status = status;
    this.body = body;
    this.retryAfterSec = retryAfterSec;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const retryAfter = Number(res.headers.get("Retry-After"));
    throw new ApiError(
      res.status,
      text,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    );
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
  // All admin catalog callers (including edits, bulk operations and undo/redo)
  // pass this boundary. Invalidate the whole catalog graph after a successful
  // write, not just whichever manager happens to be mounted.
  if (options?.method && !['GET', 'HEAD'].includes(options.method.toUpperCase()) &&
      /^\/api\/admin\/(?:resources|resource-edits|categories|subcategories|sub-subcategories)(?:\/|$)/.test(url)) {
    void invalidateCatalogQueries();
  }
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  return res;
}

/** Shared content-mutation cache graph, including URL-shaped detail keys. */
export function invalidateCatalogQueries(): Promise<void> {
  const prefixes = [
    '/api/resources', '/api/categories', '/api/subcategories', '/api/sub-subcategories',
    '/api/admin/resources', '/api/admin/pending-resources', '/api/admin/resource-edits',
    '/api/admin/categories', '/api/admin/subcategories', '/api/admin/sub-subcategories',
    '/api/admin/stats', '/api/admin/audit-logs', '/api/search', '/api/tags',
    'awesome-list-nav', 'awesome-list-data', 'awesome-list-listing',
  ];
  return queryClient.invalidateQueries({
    predicate: query => typeof query.queryKey[0] === 'string' &&
      prefixes.some(prefix => query.queryKey[0] === prefix ||
        (query.queryKey[0] as string).startsWith(`${prefix}/`) ||
        (query.queryKey[0] as string).startsWith(`${prefix}?`)),
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";
const getQueryFn: <T>(options: {
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

// BUG-018 (run25): mid-session expiry used to leave protected pages showing a
// dead-end error over stale cached data (staleTime: Infinity keeps prefetched
// admin/user data alive forever). When any protected request 401s while the
// cached auth state still says "signed in", flip that state to signed-out —
// the route guards (AuthGuard/AdminGuard) then render their re-login paths —
// and drop all cached protected data so nothing stale keeps rendering.
// The cache purge is deferred a tick (guards must unmount protected views
// first, or active observers would refetch-loop) and deduped so an expiry
// burst across many queries is handled once.
const PROTECTED_KEY_PREFIXES = [
  "/api/admin",
  "/api/user",
  "/api/bookmarks",
  "/api/collections",
  "/api/favorites",
  "/api/notifications",
  "/api/notification-preferences",
  "/api/digests",
  // C6-V2-06: per-user hidden-choice states; a stale-token 401 after a reconnect
  // must renew the session and re-run this read, not strand /recommendations.
  "/api/recommendations/feedback",
];
let sessionExpiryHandledAt = 0;
let sessionCheckInFlight = false;

// C3-V5A-07: a protected 401 is not proof the session ended. Clerk's
// __session token lives about a minute and is refreshed in the background,
// so after a network drop (or a sleeping tab) the first requests carry an
// expired cookie and 401 although the Clerk session is fine. The app shell
// registers a refresher; a 401 refreshes the token and re-asks the server
// before anything is flipped to signed-out.
type SessionTokenRefresher = () => Promise<string | null>;
let refreshSessionToken: SessionTokenRefresher | null = null;
export function setSessionTokenRefresher(refresher: SessionTokenRefresher | null) {
  refreshSessionToken = refresher;
}

const SESSION_RECHECK_TIMEOUT_MS = 5_000;

/**
 * Ask Clerk for a fresh __session token. True only when Clerk still holds an
 * active session (getToken resolves null for a signed-out visitor), so callers
 * can tell a stale cookie from a real sign-out.
 */
export async function renewSessionToken(): Promise<boolean> {
  if (!refreshSessionToken) return false;
  try {
    const token = await Promise.race([
      refreshSessionToken(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SESSION_RECHECK_TIMEOUT_MS)),
    ]);
    return Boolean(token);
  } catch {
    return false;
  }
}

async function sessionStillValid(): Promise<boolean> {
  try {
    if (!(await renewSessionToken())) return false;
    const res = await fetch("/api/auth/user", {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.timeout(SESSION_RECHECK_TIMEOUT_MS),
    });
    return res.ok && (await res.json())?.isAuthenticated === true;
  } catch {
    return false;
  }
}

function isProtectedKey(key: unknown): boolean {
  return (
    typeof key === "string" &&
    PROTECTED_KEY_PREFIXES.some(
      (p) => key === p || key.startsWith(`${p}/`) || key.startsWith(`${p}?`),
    )
  );
}

function expireSession() {
  const now = Date.now();
  if (now - sessionExpiryHandledAt < 10_000) return;
  sessionExpiryHandledAt = now;
  queryClient.setQueryData(["/api/auth/user"], {
    user: null,
    isAuthenticated: false,
  });
  setTimeout(() => {
    queryClient.removeQueries({ predicate: (q) => isProtectedKey(q.queryKey[0]) });
  }, 0);
}

function handleUnauthorized(sourceKey: unknown) {
  const key = Array.isArray(sourceKey) ? sourceKey[0] : sourceKey;
  if (key === "/api/auth/user") return; // anonymous visitor, not an expiry
  const auth = queryClient.getQueryData<{ isAuthenticated?: boolean }>([
    "/api/auth/user",
  ]);
  if (!auth?.isAuthenticated) return; // already signed out — nothing stale
  if (sessionCheckInFlight) return; // one check covers a burst of 401s
  sessionCheckInFlight = true;
  void sessionStillValid()
    .then((valid) => {
      if (valid) {
        // The token was only stale: re-run the protected reads that failed.
        void queryClient.invalidateQueries({
          predicate: (q) => isProtectedKey(q.queryKey[0]) && q.state.status === "error",
        });
      } else {
        expireSession();
      }
    })
    .finally(() => {
      sessionCheckInFlight = false;
    });
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized(query.queryKey);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized(undefined);
      }
    },
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      // BUG-001 (Audit 2): a transient 429 used to hard-fail on first sight
      // (global retry:false), so a rate-limited burst rendered error states —
      // or with pre-fix silent consumers, EMPTY panels — for data that would
      // have loaded a second later. Queries (idempotent GETs) now retry a 429
      // up to twice, honoring the server's Retry-After when it's short.
      // Long Retry-After values (>10s) fail fast to the visible error/retry
      // card instead of pinning the UI in a skeleton state.
      retry: (failureCount, error) =>
        error instanceof ApiError &&
        error.status === 429 &&
        (error.retryAfterSec ?? 2) <= 10 &&
        failureCount < 2,
      retryDelay: (failureCount, error) =>
        error instanceof ApiError && error.status === 429
          ? Math.min(error.retryAfterSec ?? 2, 10) * 1000
          : Math.min(1000 * 2 ** failureCount, 30_000),
    },
    mutations: {
      // Mutations stay non-retried: they are not guaranteed idempotent.
      retry: false,
    },
  },
});
