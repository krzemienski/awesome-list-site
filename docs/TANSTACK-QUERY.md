# TanStack Query — Project Conventions

How this project uses [TanStack Query v5](https://tanstack.com/query/latest) for
server state. This is **not** a general TanStack tutorial — it documents only the
conventions and helpers that are specific to this codebase. Source of truth:
`client/src/lib/queryClient.ts`.

For general API/hook usage, read the official docs. For how to *fetch data the way
this app expects*, read this page.

---

## The global client

A single `QueryClient` is created in `client/src/lib/queryClient.ts` and provided at
the app root. Its defaults are intentionally cache-stable:

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }), // default fetcher (see below)
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,   // data never goes stale on its own
      retry: false,          // fail fast; opt in per-query if needed
    },
    mutations: {
      retry: false,
    },
  },
});
```

| Default | Value | Why |
|---|---|---|
| `staleTime` | `Infinity` | Data stays fresh until you explicitly `invalidateQueries`. |
| `refetchOnWindowFocus` | `false` | No surprise refetches on tab focus. |
| `refetchInterval` | `false` | No background polling. |
| `retry` | `false` | Errors surface immediately; override per query where a retry makes sense. |

Override any of these on an individual `useQuery` call (e.g. `useAuth` uses a
5-minute `staleTime` and a custom `retry` that never retries a 401).

---

## The default query function

The global `queryFn` is `getQueryFn({ on401: "throw" })`. It builds the request URL
from **`queryKey[0]` only**:

```ts
const url = queryKey[0] as string;
const res = await fetch(url, { credentials: "include" });
```

Consequences you must know:

1. **`queryKey[0]` is the URL.** For a query with no params you can rely entirely on
   the default fetcher — just give it the endpoint path:

   ```ts
   const { data } = useQuery<Resource[]>({ queryKey: ["/api/favorites"] });
   // → GET /api/favorites
   ```

2. **Extra key segments are cache differentiators, NOT request params.** The default
   fetcher ignores everything after `queryKey[0]`. If your request needs an id or
   query string, you have two options:

   - Put the full URL in `queryKey[0]`, or
   - Provide an explicit `queryFn` and keep the extra segments purely for cache
     identity. This is the pattern used across the app:

   ```ts
   // ResourceDetail.tsx — id lives in the key for caching/invalidation,
   // but the real URL is built in the queryFn.
   useQuery<Resource>({
     queryKey: ["/api/resources", id],
     queryFn: async () => {
       const res = await fetch(`/api/resources/${id}`, { credentials: "include" });
       if (!res.ok) throw new Error("Resource not found");
       return res.json();
     },
     enabled: !!id,
   });

   // Search.tsx — paginated search; params are encoded into the URL in the queryFn.
   useQuery({
     queryKey: ["/api/resources", "search", trimmed, page],
     queryFn: async () =>
       apiRequest(`/api/resources?search=${encodeURIComponent(trimmed)}&page=${page}`),
     enabled: trimmed.length === 0 || trimmed.length >= 2,
   });
   ```

3. **`on401` behavior.** The global client uses `on401: "throw"`, so a 401 rejects
   the query. Use `getQueryFn({ on401: "returnNull" })` as an explicit `queryFn` when
   a signed-out user should see `null` instead of an error.

---

## Query keys

- **Always an array.** TanStack v5 requires the object form and array keys.
- **First element = the endpoint path string** (e.g. `"/api/resources"`).
- **Use array segments for variable parts** so invalidation can target them:
  `["/api/resources", id]`, not `` [`/api/resources/${id}`] ``. Segmented keys let
  `invalidateQueries({ queryKey: ["/api/resources"] })` clear every resource query at
  once.
- A few app-level queries use **non-URL keys** with a custom `queryFn`
  (`["awesome-list-nav"]`, `["awesome-list-data"]` in `App.tsx`) because they read the
  prebuilt static corpus/nav rather than a REST endpoint.

---

## Mutations

Mutations use `apiRequest` from `@/lib/queryClient`, then invalidate affected keys in
`onSuccess`.

```ts
import { apiRequest, queryClient } from "@/lib/queryClient";

const updateName = useMutation({
  mutationFn: () =>
    apiRequest("/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ firstName, lastName }),
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  },
});
```

`apiRequest(url, options?)`:

- Signature is `(url, RequestInit)` — **not** `(method, url, data)`. Pass the verb via
  `options.method` and a JSON string via `options.body`.
- Sets `Content-Type: application/json` and `credentials: "include"` for you.
- Throws an `ApiError` on any non-2xx response.
- Returns parsed JSON when the response is JSON, otherwise the raw `Response`.

Show progress with `mutation.isPending`, and disable submit buttons while it is true.

---

## Cache invalidation conventions

- Invalidate by the **same key prefix** the data was fetched with. Because keys are
  segmented, invalidating `["/api/journeys"]` refreshes the list while
  `` [`/api/journeys/${id}`] `` refreshes one journey — call both when a mutation
  affects both (see `JourneyDetail.tsx`).
- Import `queryClient` from `@/lib/queryClient` for invalidation outside a component,
  or use the `queryClient` returned by `useQueryClient()` inside one.
- Because `staleTime` is `Infinity`, **invalidation is the primary way data refreshes.**
  If a mutation changes server state, invalidate — nothing else will.

---

## Error handling

Failed queries/mutations reject with `ApiError` (`client/src/lib/queryClient.ts`):

```ts
export class ApiError extends Error {
  status: number; // HTTP status — check this in retry predicates / 401 handling
  body: string;   // raw server response body (JSON string)
  // .message is a humanized, user-safe string (safe to render in a toast)
}
```

- Read `error.status` for status-specific logic (e.g. don't retry 401s).
- Render `error.message` directly in toasts — it is already humanized. Use `error.body`
  only when you need the structured raw payload (e.g. field-level validation errors).
- 401s are treated as an expected signed-out state and are **not** reported to
  analytics; other errors are tracked via `trackError`.

---

## Loading & pending states

- Queries: gate UI on `isLoading` (first load) and show skeletons from
  `@/components/ui/skeleton`.
- Mutations: gate submit controls on `isPending`.

---

## Quick rules

1. Use the **object form** everywhere (`useQuery({ ... })`) — v5 removed the positional form.
2. `queryKey[0]` is the URL for the default fetcher; add a `queryFn` when the URL needs params.
3. Segmented array keys, not template-literal string keys.
4. Mutate with `apiRequest(url, { method, body })`, then `invalidateQueries`.
5. Override the `Infinity` staleTime only when a view genuinely needs fresher data.

Related: [`docs/API.md`](API.md) for the REST surface, `client/src/hooks/` for
real query/mutation hooks.
