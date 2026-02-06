# TanStack Query v5 - Data Fetching Patterns & Conventions

Complete guide to TanStack Query usage patterns, conventions, and best practices in the Awesome Video Resource Viewer application.

**Version**: TanStack Query v5
**Purpose**: Server state management, caching, and data synchronization

---

## Table of Contents

1. [Overview](#overview)
2. [Global Configuration](#global-configuration)
3. [Query Key Conventions](#query-key-conventions)
4. [Query Patterns](#query-patterns)
5. [Advanced Query Patterns](#advanced-query-patterns)
6. [Mutation Patterns](#mutation-patterns)
7. [Cache Management](#cache-management)
8. [Error Handling](#error-handling)
9. [Common Hooks Reference](#common-hooks-reference)
10. [Best Practices](#best-practices)
11. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Overview

TanStack Query v5 is used throughout the application for:
- Server state management and caching
- Data fetching with automatic retries
- Optimistic updates
- Cache invalidation after mutations
- Background refetching
- Request deduplication

### Why TanStack Query?

- **Declarative API**: Define what data you need, not how to fetch it
- **Automatic Caching**: Intelligent caching with stale-while-revalidate
- **Optimistic Updates**: Update UI before server responds
- **Performance**: Request deduplication and background updates
- **Developer Experience**: DevTools, TypeScript support, error handling

---

## Global Configuration

All queries and mutations inherit from the global QueryClient configuration defined in `client/src/lib/queryClient.ts`.

### Default Query Options

```typescript
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
```

### Key Defaults

| Option | Value | Rationale |
|--------|-------|-----------|
| `staleTime` | `Infinity` | Data stays fresh indefinitely unless explicitly invalidated |
| `refetchOnWindowFocus` | `false` | Prevent unnecessary refetches when window regains focus |
| `refetchInterval` | `false` | No automatic background polling |
| `retry` | `false` | Fail fast by default (override per query if needed) |

**Important**: These defaults prioritize cache stability. Override them for specific queries that need fresher data or retry logic.

---

## Query Key Conventions

Query keys follow a **strict URL-based convention** for consistency and predictability.

### Standard Format

```typescript
// Format: ['/api/endpoint', ...params]
queryKey: ['/api/auth/user']
queryKey: ['/api/resources', { page: 1, category: 'tools' }]
queryKey: ['/api/journeys', journeyId]
```

### Rules

1. **First element**: Always the API endpoint path as a string
2. **Additional elements**: Parameters, IDs, or filters that make the query unique
3. **Consistency**: Use the same key format across queries and invalidations
4. **Readability**: Keys should be self-documenting

### Examples from Codebase

#### From `useAuth.ts` - Authentication Query Keys

```typescript
// Simple authentication status check
// No parameters needed - endpoint is the complete key
queryKey: ['/api/auth/user']

// Used in useQuery:
const { data } = useQuery<AuthResponse>({
  queryKey: ['/api/auth/user'],
  staleTime: 5 * 60 * 1000, // 5 minutes
  retry: (failureCount, error: any) => {
    if (error?.status === 401) return false;
    return failureCount < 3;
  }
});

// Cache invalidation on logout:
queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
```

**Key Points:**
- Single endpoint path as the entire key
- No additional parameters needed for user session
- Invalidated after mutations (logout, login)
- Custom `staleTime` override (5 min) for session freshness

#### From `useAdmin.ts` - Conditional Query Keys

```typescript
// Admin statistics - only fetched for admin users
queryKey: ["/api/admin/stats"]

// Used with conditional fetching:
const { data: stats } = useQuery<AdminStats>({
  queryKey: ["/api/admin/stats"],
  queryFn: async () => {
    const response = await apiRequest('/api/admin/stats');
    return response;
  },
  enabled: isAdmin, // Only fetch if user is admin
  staleTime: 30000, // 30 seconds
  retry: false, // Don't retry on 403
});
```

**Key Points:**
- Simple endpoint-only key structure
- `enabled` controls when query runs
- Short `staleTime` (30s) for fresh admin data
- No retry on authorization failures

#### From `useAIRecommendations.ts` - Complex Query Keys

```typescript
// Quick recommendations with filters
queryKey: ['/api/recommendations', 'quick', categories, skillLevel]

// Learning path suggestions with parameter object
queryKey: ['/api/learning-paths/suggested', params]

// Where params might be:
const params = {
  userId: 'user123',
  categories: ['javascript', 'react'],
  skillLevel: 'intermediate',
  limit: 10
};

// Cache invalidation after feedback:
queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
// This invalidates ALL recommendation queries regardless of params
```

**Key Points:**
- Multiple parameters make keys unique per query combination
- Parameter objects for complex filters
- Partial key matching for broad cache invalidation
- Different query types share base endpoint key

#### Other Common Patterns

```typescript
// Resources with filters
['/api/resources', { page: 1, limit: 20, category: 'General Tools' }]

// Single resource by ID
['/api/resources', resourceId]

// Journeys
['/api/journeys', journeyId]

// Search with query string
['/api/search', { q: 'react', type: 'video' }]
```

### Why This Convention?

- **Cache Invalidation**: Easy to invalidate related queries using partial matching
- **DevTools**: Query keys are readable in React Query DevTools
- **Consistency**: Developers know exactly how to structure keys
- **Type Safety**: First element is always a string (endpoint path)

---

## Query Patterns

### Basic Query

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/resources'],
  queryFn: async () => {
    const res = await fetch('/api/resources', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  },
});
```

### Query with Parameters

```typescript
const { data } = useQuery({
  queryKey: ['/api/resources', { category, page }],
  queryFn: async () => {
    const params = new URLSearchParams({ category, page: String(page) });
    return apiRequest(`/api/resources?${params}`);
  },
  enabled: !!category, // Only run if category exists
});
```

### Query with Custom staleTime

Override the global `Infinity` default when you need fresher data:

```typescript
// Authentication data - refresh every 5 minutes
const { data } = useQuery<AuthResponse>({
  queryKey: ['/api/auth/user'],
  staleTime: 5 * 60 * 1000, // 5 minutes
  retry: (failureCount, error: any) => {
    if (error?.status === 401) return false; // Don't retry auth failures
    return failureCount < 3;
  }
});
```

**When to set staleTime:**
- **5 minutes**: User session data, preferences
- **1 minute**: Real-time-ish data (stats, notifications)
- **Infinity** (default): Static data, resources, journeys

### Conditional Queries

Use `enabled` to control when queries run:

```typescript
const { data } = useQuery({
  queryKey: ['/api/user/profile', userId],
  queryFn: () => apiRequest(`/api/user/profile/${userId}`),
  enabled: !!userId && isAuthenticated, // Only fetch if user is logged in
});
```

### Dependent Queries

```typescript
// First query
const { data: user } = useQuery({
  queryKey: ['/api/auth/user'],
  staleTime: 5 * 60 * 1000,
});

// Second query depends on first
const { data: recommendations } = useQuery({
  queryKey: ['/api/recommendations', user?.id],
  queryFn: () => apiRequest(`/api/recommendations?userId=${user.id}`),
  enabled: !!user?.id, // Only run after user data loads
});
```

### StaleTime Configuration Guide

`staleTime` determines how long query data is considered "fresh" before it becomes "stale". TanStack Query will not automatically refetch stale data unless explicitly triggered (via invalidation, refetch, or window focus if enabled).

#### Understanding StaleTime

```typescript
staleTime: number | Infinity
```

- **Fresh data**: Won't refetch automatically
- **Stale data**: Will refetch when query mounts or when explicitly triggered
- **Default**: `Infinity` (data never goes stale automatically)

#### When to Use Different StaleTime Values

| StaleTime Value | Use Case | Rationale | Example |
|----------------|----------|-----------|---------|
| `Infinity` | Static/rarely changing data | Data doesn't change frequently; manual invalidation preferred | Static content, resource lists, journey data |
| `1000 * 60 * 60` (1 hour) | Semi-static application data | Large datasets that change infrequently | Awesome list data, category structures |
| `5 * 60 * 1000` (5 minutes) | User session data | Balance between freshness and performance | Authentication status, user preferences |
| `60000` (1 minute) | Frequently updated data | Near real-time without polling overhead | Live dashboards, activity feeds |
| `30000` (30 seconds) | Admin/monitoring data | Fresh data for administrative tasks | Admin statistics, approval queues |
| `0` | Always stale | Immediate refetch on mount (use sparingly) | Critical real-time data (rare) |

#### Real-World Examples from Codebase

##### Example 1: Authentication Data (5 minutes)

**File**: `client/src/hooks/useAuth.ts`

```typescript
const { data, isLoading, error } = useQuery<AuthResponse>({
  queryKey: ['/api/auth/user'],
  staleTime: 5 * 60 * 1000, // 5 minutes
  retry: (failureCount, error: any) => {
    // Don't retry on 401 - user is simply not authenticated
    if (error?.status === 401) return false;
    return failureCount < 3;
  }
});
```

**Why 5 minutes?**
- User session data doesn't change frequently within a single session
- Balance between security (detecting logged-out users) and performance
- Avoids excessive auth checks while keeping session reasonably fresh
- If session changes (logout/login), cache is explicitly invalidated

##### Example 2: Admin Statistics (30 seconds)

**File**: `client/src/hooks/useAdmin.ts`

```typescript
const { data: stats, isLoading, error } = useQuery<AdminStats>({
  queryKey: ["/api/admin/stats"],
  queryFn: async () => {
    const response = await apiRequest('/api/admin/stats');
    return response;
  },
  enabled: isAdmin, // Only fetch if user is admin
  staleTime: 30000, // 30 seconds
  retry: false,
});
```

**Why 30 seconds?**
- Admin needs relatively fresh data for monitoring
- Stats like "pending approvals" change more frequently
- Short enough for admins to see updates without manual refresh
- Long enough to avoid unnecessary API calls during active admin sessions

##### Example 3: Awesome List Data (1 hour)

**File**: `client/src/App.tsx`

```typescript
const { data: rawData, isLoading, error } = useQuery({
  queryKey: ["awesome-list-data"],
  queryFn: fetchStaticAwesomeList,
  staleTime: 1000 * 60 * 60, // 1 hour
});
```

**Why 1 hour?**
- Large dataset that changes infrequently (editorial updates)
- Expensive to fetch and process (performance optimization)
- Content is curated and doesn't require real-time updates
- Users typically browse within the same session
- Reduces server load and improves perceived performance

##### Example 4: Static Content (Infinity - Default)

**File**: `client/src/lib/queryClient.ts` (Global Default)

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Never goes stale automatically
      refetchOnWindowFocus: false,
      refetchInterval: false,
    },
  },
});
```

**Why Infinity?**
- Most application data is static or manually invalidated
- Explicit cache invalidation gives better control
- Prevents unexpected refetches that can cause UI flicker
- Better performance for data that rarely changes
- Forces developers to think about when data should update

#### Decision Framework

Use this flowchart to choose the right `staleTime`:

```
Is the data completely static (never changes)?
├─ YES → Infinity (default)
└─ NO → Does it change multiple times per minute?
    ├─ YES → 30 seconds or less
    └─ NO → Does it change multiple times per hour?
        ├─ YES → 5 minutes
        └─ NO → 1 hour or Infinity with manual invalidation
```

#### Best Practices

**✅ DO:**
- Start with `Infinity` (default) and only override when needed
- Use longer staleTime for expensive queries (large datasets, complex processing)
- Document why you chose a specific staleTime value
- Consider server load when choosing short staleTime values
- Pair short staleTime with `enabled` to prevent unnecessary fetches

**❌ DON'T:**
- Set staleTime to `0` unless absolutely necessary (prefer refetch/invalidation)
- Use very short staleTime as a substitute for real-time features (use WebSockets instead)
- Forget to invalidate cache after mutations even with long staleTime
- Set different staleTime values for the same data in different components
- Use staleTime for data that should update on user action (use mutations + invalidation)

#### StaleTime vs. Manual Invalidation

```typescript
// Option 1: Automatic with staleTime
const { data } = useQuery({
  queryKey: ['/api/admin/stats'],
  staleTime: 30000, // Auto-refetch after 30s
});

// Option 2: Manual with Infinity
const { data } = useQuery({
  queryKey: ['/api/admin/stats'],
  staleTime: Infinity, // Never auto-refresh
});

// Manually trigger refetch when needed
const refreshStats = () => {
  queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
};
```

**When to use each:**
- **staleTime**: Data that naturally expires (sessions, time-sensitive content)
- **Manual invalidation**: Data that updates based on user actions (CRUD operations)

#### Common Patterns

```typescript
// Pattern 1: Session data (5 minutes)
const { data: user } = useQuery({
  queryKey: ['/api/auth/user'],
  staleTime: 5 * 60 * 1000,
});

// Pattern 2: Dashboard/stats (30 seconds - 1 minute)
const { data: stats } = useQuery({
  queryKey: ['/api/dashboard/stats'],
  staleTime: 30000,
  enabled: isVisible, // Only when dashboard is visible
});

// Pattern 3: Large static datasets (1 hour)
const { data: catalog } = useQuery({
  queryKey: ['/api/catalog'],
  staleTime: 60 * 60 * 1000,
});

// Pattern 4: User-editable content (Infinity + manual invalidation)
const { data: resources } = useQuery({
  queryKey: ['/api/resources'],
  staleTime: Infinity,
});

const createResource = useMutation({
  mutationFn: createNewResource,
  onSuccess: () => {
    // Explicit invalidation after mutation
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
  },
});
```

---

## Advanced Query Patterns

### Conditional Query Execution with `enabled`

The `enabled` option controls whether a query should execute. This is critical for:
- Authorization-based queries (only fetch if user has permission)
- Dependent queries (wait for prerequisite data)
- Performance optimization (avoid unnecessary API calls)
- Conditional features (only fetch when feature is active)

#### Pattern 1: Authorization-Based Conditional Fetching

**File**: `client/src/hooks/useAdmin.ts`

Only fetch admin data if the user has admin privileges:

```typescript
export function useAdmin() {
  const { user } = useAuth();
  const isAdmin = Boolean(user && (user as any).role === "admin");

  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      // Use apiRequest to ensure credentials are included
      const response = await apiRequest('/api/admin/stats');
      return response;
    },
    enabled: isAdmin, // Only fetch if user is admin
    staleTime: 30000, // 30 seconds
    retry: false, // Don't retry on 403
  });

  return {
    stats: isAdmin && !error ? stats : undefined,
    isLoading: isAdmin ? isLoading : false,
    error: isAdmin ? error : undefined,
  };
}
```

**Key Points:**
- **`enabled: isAdmin`**: Query only runs when `isAdmin` is `true`
- **Performance**: Prevents unnecessary 403 errors and API calls
- **Security**: Avoids exposing admin endpoints to non-admin users
- **Return values**: Conditionally return stats/loading/error based on admin status
- **No retry**: `retry: false` prevents hammering protected endpoints

**Benefits:**
- ✅ No unnecessary API calls for non-admin users
- ✅ Cleaner error states (no 403 errors for regular users)
- ✅ Better performance (fewer requests)
- ✅ Security best practice (don't expose admin routes)

#### Pattern 2: Dependent Queries

Wait for user data before fetching user-specific resources:

```typescript
// First query: Get user
const { data: user } = useQuery({
  queryKey: ['/api/auth/user'],
  staleTime: 5 * 60 * 1000,
});

// Second query: Only run after user is loaded
const { data: userPreferences } = useQuery({
  queryKey: ['/api/user/preferences', user?.id],
  queryFn: () => apiRequest(`/api/user/preferences/${user.id}`),
  enabled: !!user?.id, // Wait for user.id to exist
});
```

**Key Points:**
- Second query won't run until `user.id` exists
- Prevents API calls with undefined parameters
- Dependencies are clear and explicit

#### Pattern 3: Feature Flags

```typescript
const { data: betaFeatureData } = useQuery({
  queryKey: ['/api/beta/features'],
  queryFn: () => apiRequest('/api/beta/features'),
  enabled: !!user && user.betaAccess === true, // Only for beta users
});
```

#### Pattern 4: Multi-Condition Enabled

```typescript
const { data } = useQuery({
  queryKey: ['/api/recommendations', userId],
  queryFn: () => apiRequest(`/api/recommendations?userId=${userId}`),
  enabled: !!(userId && isAuthenticated && hasSubscription),
  // Only fetch when ALL conditions are met
});
```

#### When to Use `enabled`

**✅ Use `enabled` when:**
- Query depends on user permissions (admin, authenticated, etc.)
- Query requires data from another query
- Query has optional parameters that might be undefined
- You want to manually control when a query runs
- Query should only run when a feature is active

**❌ Don't use `enabled` when:**
- Query should always run on mount
- You're trying to prevent errors (use proper error handling instead)
- The condition never changes (just don't call useQuery)

---

### Custom Query Functions with `getQueryFn`

The application uses a custom query function factory for centralized error handling, performance tracking, and authentication behavior.

#### Default Query Function

**File**: `client/src/lib/queryClient.ts`

```typescript
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
        credentials: "include", // Always include cookies
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Track API performance
      trackApiPerformance(url, responseTime, res.status);

      // Handle 401 based on behavior setting
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
```

**Global Configuration:**

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }), // Default: throw on 401
      // ... other options
    },
  },
});
```

**Features of Custom Query Function:**
1. **Automatic credentials**: All requests include cookies via `credentials: "include"`
2. **Performance tracking**: Measures response time for every request
3. **Error tracking**: Logs errors to analytics
4. **401 handling**: Configurable behavior for unauthorized requests
5. **Query key extraction**: Uses first element of queryKey as URL

#### 401 Behavior Modes

**Mode 1: `on401: "throw"` (Default)**
- Throws error on 401 status
- Used for most queries where auth is required
- Triggers React Query error state

```typescript
queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
    },
  },
});

// In component:
const { data, error } = useQuery({ queryKey: ['/api/protected'] });
// If 401 occurs, error will be set
```

**Mode 2: `on401: "returnNull"`**
- Returns `null` instead of throwing
- Used for optional auth checks
- No error state, just null data

```typescript
// Custom query function for auth check
const authQueryFn = getQueryFn({ on401: "returnNull" });

const { data } = useQuery({
  queryKey: ['/api/auth/user'],
  queryFn: authQueryFn,
});
// data will be null if user is not authenticated (no error state)
```

#### When to Override Default queryFn

**Override with custom queryFn when:**

```typescript
const { data } = useQuery({
  queryKey: ['/api/admin/stats'],
  queryFn: async () => {
    // Custom logic: use apiRequest helper for specific handling
    const response = await apiRequest('/api/admin/stats');
    return response;
  },
  enabled: isAdmin,
});
```

**Reasons to override:**
- Need custom request headers
- Need to transform response before returning
- Need custom error handling logic
- Using POST instead of GET
- Need to pass request body

**When to use default queryFn:**
- Simple GET requests
- Standard authentication behavior
- Want automatic performance tracking
- No custom headers or transformations needed

---

### Credentials and Authentication

All API requests in the application include credentials (cookies) for session-based authentication.

#### `apiRequest` Helper

**File**: `client/src/lib/queryClient.ts`

The `apiRequest` helper is the recommended way to make authenticated API calls:

```typescript
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
    credentials: options?.credentials || "include", // Always include cookies
  });

  await throwIfResNotOk(res);

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  return res;
}
```

**Key Features:**
1. **Automatic credentials**: Defaults to `credentials: "include"`
2. **Content-Type header**: Automatically sets `application/json`
3. **Error handling**: Throws on non-OK responses
4. **JSON parsing**: Auto-parses JSON responses
5. **Flexible**: Can override credentials or headers if needed

#### Using `apiRequest` in Queries

```typescript
// Basic GET request
const { data } = useQuery({
  queryKey: ['/api/resources'],
  queryFn: () => apiRequest('/api/resources'),
});

// POST request with body
const mutation = useMutation({
  mutationFn: async (newResource: Resource) => {
    return apiRequest('/api/resources', {
      method: 'POST',
      body: JSON.stringify(newResource),
    });
  },
});

// Custom credentials override (if needed)
const { data } = useQuery({
  queryKey: ['/api/public/data'],
  queryFn: () => apiRequest('/api/public/data', {
    credentials: 'omit', // Don't send cookies
  }),
});
```

#### Why `credentials: "include"`?

**Session-based authentication:**
- Application uses HTTP-only cookies for auth tokens
- Cookies must be sent with every request
- `credentials: "include"` sends cookies cross-origin

**Security benefits:**
- HTTP-only cookies prevent XSS attacks
- Secure cookies prevent man-in-the-middle attacks
- Server-side session management
- Automatic CSRF protection

**Alternative for non-cookie auth:**
```typescript
// If using JWT tokens instead
const { data } = useQuery({
  queryKey: ['/api/resources'],
  queryFn: async () => {
    const token = localStorage.getItem('auth_token');
    const res = await fetch('/api/resources', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return res.json();
  },
});
```

**Important:** This application uses **cookie-based auth**, so always use `credentials: "include"`.

#### Default Query Function Credentials

The default `getQueryFn` automatically includes credentials:

```typescript
const res = await fetch(url, {
  credentials: "include", // Automatic for all queries
});
```

This means most queries don't need to specify credentials explicitly.

#### When to Specify Credentials

**Use `apiRequest` (recommended):**
- ✅ Mutations (POST/PUT/DELETE)
- ✅ Custom query functions
- ✅ When you need error handling
- ✅ When you need JSON parsing

**Use default queryFn:**
- ✅ Simple GET requests
- ✅ Standard authentication
- ✅ When you want automatic performance tracking

**Specify `credentials: "omit"`:**
- ❌ Rarely needed - only for public endpoints that explicitly reject cookies
- ❌ External APIs that don't use your session

---

### Performance Tracking

The application automatically tracks API performance metrics for monitoring and debugging.

#### Built-in Performance Tracking

**File**: `client/src/lib/queryClient.ts`

Every query that uses the default `getQueryFn` automatically tracks performance:

```typescript
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const startTime = performance.now(); // Start timer

    try {
      const res = await fetch(url, {
        credentials: "include",
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Track successful requests
      trackApiPerformance(url, responseTime, res.status);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Track failed requests
      trackApiPerformance(url, responseTime, 0); // 0 = failed
      trackError('api_error', `${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      throw error;
    }
  };
```

#### What Gets Tracked

**Successful Requests:**
- **URL**: The API endpoint called
- **Response Time**: Duration in milliseconds
- **Status Code**: HTTP status (200, 201, etc.)

**Failed Requests:**
- **URL**: The API endpoint that failed
- **Response Time**: Duration before failure
- **Status Code**: 0 (indicates network/request failure)
- **Error Message**: Detailed error context

#### Performance Analytics

**Example tracked data:**
```typescript
trackApiPerformance('/api/resources', 245, 200);
// URL: /api/resources
// Response Time: 245ms
// Status: 200 OK

trackApiPerformance('/api/auth/user', 1823, 401);
// URL: /api/auth/user
// Response Time: 1823ms
// Status: 401 Unauthorized

trackError('api_error', '/api/resources: Network request failed');
// Error Type: api_error
// Message: /api/resources: Network request failed
```

#### Using Performance Data

**Monitoring:**
- Track slow API endpoints (response time > 1000ms)
- Identify failing endpoints (status code errors)
- Monitor auth failures (401/403 rates)
- Detect network issues (status 0 failures)

**Debugging:**
- See which endpoints are slowest
- Identify endpoints with high error rates
- Track performance regressions over time

**Optimization:**
- Find candidates for caching improvements
- Identify endpoints that need backend optimization
- Determine optimal `staleTime` values based on actual response times

#### Automatic Tracking Coverage

**✅ Automatically tracked:**
- All queries using default `getQueryFn`
- All queries using `apiRequest` (indirectly via error tracking)
- Both successful and failed requests
- All HTTP status codes

**❌ Not automatically tracked:**
- Custom fetch calls that don't use `apiRequest` or default queryFn
- WebSocket connections
- Non-HTTP requests

#### Custom Performance Tracking

To add custom performance tracking:

```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    const startTime = performance.now();

    try {
      const result = await apiRequest('/api/custom', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const endTime = performance.now();
      trackApiPerformance('/api/custom', endTime - startTime, 200);

      return result;
    } catch (error) {
      const endTime = performance.now();
      trackApiPerformance('/api/custom', endTime - startTime, 0);
      trackError('custom_mutation_error', error.message);
      throw error;
    }
  },
});
```

#### Performance Best Practices

**✅ DO:**
- Use default `getQueryFn` or `apiRequest` for automatic tracking
- Monitor performance metrics in production
- Set `staleTime` based on actual response times
- Cache slow endpoints more aggressively
- Use analytics data to optimize backend

**❌ DON'T:**
- Bypass automatic tracking with custom fetch calls
- Ignore slow endpoints (>2000ms)
- Track personally identifiable information (PII)
- Send excessive tracking data (already built-in)

#### Example: Using Performance Data to Optimize

```typescript
// Endpoint with slow response times (from analytics)
const { data } = useQuery({
  queryKey: ['/api/heavy/report'],
  queryFn: () => apiRequest('/api/heavy/report'),
  staleTime: 60 * 60 * 1000, // 1 hour - cache aggressively
  // Slow endpoint (1500ms avg) -> long cache duration
});

// Endpoint with fast response times
const { data } = useQuery({
  queryKey: ['/api/quick/stats'],
  queryFn: () => apiRequest('/api/quick/stats'),
  staleTime: 30000, // 30 seconds - refresh more often
  // Fast endpoint (50ms avg) -> shorter cache duration
});
```

---

## Mutation Patterns

Mutations in TanStack Query handle data modifications (POST, PUT, DELETE) with powerful lifecycle callbacks for optimistic updates, cache invalidation, and error handling.

### Mutation Lifecycle Overview

Every mutation goes through these phases:

```typescript
const mutation = useMutation({
  mutationFn: async (data) => { /* ... */ },  // 1. Execute mutation
  onMutate: async (variables) => { /* ... */ }, // 2. Before mutation (optimistic updates)
  onError: (error, variables, context) => { /* ... */ }, // 3a. If mutation fails
  onSuccess: (data, variables, context) => { /* ... */ }, // 3b. If mutation succeeds
  onSettled: (data, error, variables, context) => { /* ... */ }, // 4. After success or error
});
```

**Execution order:**
1. **onMutate**: Runs before `mutationFn`, used for optimistic updates
2. **mutationFn**: Executes the actual API request
3. **onError** OR **onSuccess**: Depending on mutation result
4. **onSettled**: Always runs last, regardless of success or failure

### Basic Mutation

The simplest mutation pattern: make an API call and invalidate cache on success.

```typescript
const createResourceMutation = useMutation({
  mutationFn: async (newResource: Resource) => {
    return apiRequest('/api/resources', {
      method: 'POST',
      body: JSON.stringify(newResource),
      credentials: 'include'
    });
  },
  onSuccess: () => {
    // Invalidate and refetch resource list
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });

    toast({
      description: "Resource created successfully",
      duration: 2000
    });
  },
  onError: (error: Error) => {
    toast({
      title: "Error",
      description: error.message || "Failed to create resource",
      variant: "destructive"
    });
  }
});

// Usage
createResourceMutation.mutate({
  title: 'New Resource',
  url: 'https://example.com',
  category: 'tools'
});

// Or with promise-based API
try {
  const result = await createResourceMutation.mutateAsync(newResource);
  console.log('Created:', result);
} catch (error) {
  console.error('Failed:', error);
}
```

**Key Points:**
- `mutationFn`: The API call that performs the mutation
- `onSuccess`: Cache invalidation + success feedback
- `onError`: Error handling + user notification
- `mutate()`: Fire-and-forget (callback-based)
- `mutateAsync()`: Promise-based (can be awaited)

### Real-World Example: Logout Mutation

**File**: `client/src/hooks/useAuth.ts`

```typescript
const logoutMutation = useMutation({
  mutationFn: async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Logout failed');
    }
    return response.json();
  },
  onSuccess: () => {
    // 1. Invalidate auth cache to mark stale
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

    // 2. Immediately set auth state for instant UI update
    queryClient.setQueryData(['/api/auth/user'], {
      user: null,
      isAuthenticated: false
    });

    // 3. Redirect to home page
    window.location.href = '/';
  }
});

// Usage in component
const { logout } = useAuth();
<button onClick={() => logout()}>Logout</button>
```

**Pattern Breakdown:**
- **Immediate cache update**: `setQueryData` provides instant UI feedback
- **Cache invalidation**: `invalidateQueries` ensures future mounts fetch fresh data
- **Multiple cache updates**: Combines direct update + invalidation
- **Side effects**: Redirect after cache is cleared

---

### Optimistic Updates with `onMutate`

Optimistic updates make your UI feel instant by updating the cache **before** the server responds. If the mutation fails, changes are rolled back.

#### Basic Optimistic Update Pattern

```typescript
const toggleFavoriteMutation = useMutation({
  mutationFn: async (resourceId: number) => {
    return apiRequest(`/api/favorites/${resourceId}`, {
      method: 'POST',
      credentials: 'include'
    });
  },
  onMutate: async (resourceId) => {
    // Step 1: Cancel any outgoing refetches to prevent race conditions
    await queryClient.cancelQueries({ queryKey: ['/api/favorites'] });

    // Step 2: Snapshot current cache for potential rollback
    const previousFavorites = queryClient.getQueryData(['/api/favorites']);

    // Step 3: Optimistically update cache
    queryClient.setQueryData(['/api/favorites'], (old: Favorite[] = []) => {
      return [...old, { id: resourceId, createdAt: new Date() }];
    });

    // Step 4: Return context object with snapshot
    return { previousFavorites };
  },
  onError: (error, variables, context) => {
    // Rollback to previous state on error
    if (context?.previousFavorites) {
      queryClient.setQueryData(['/api/favorites'], context.previousFavorites);
    }

    toast({
      title: "Error",
      description: "Failed to add favorite",
      variant: "destructive"
    });
  },
  onSuccess: () => {
    // Refetch to ensure consistency with server
    queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });

    toast({
      description: "Added to favorites",
      duration: 2000
    });
  }
});
```

**Optimistic Update Steps:**
1. **Cancel queries**: Prevent race conditions with in-flight requests
2. **Snapshot cache**: Save current state for rollback
3. **Update cache**: Apply optimistic change immediately
4. **Return context**: Pass snapshot to error handler
5. **Rollback on error**: Revert to snapshot if mutation fails
6. **Sync on success**: Invalidate to get authoritative server state

---

### Real-World Example 1: Bookmark Button with Optimistic Updates

**File**: `client/src/components/resource/BookmarkButton.tsx`

This example shows a sophisticated optimistic update pattern with local state + cache management.

```typescript
const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
const [notes, setNotes] = useState(initialNotes);

const bookmarkMutation = useMutation({
  mutationFn: async (payload?: { notes?: string }) => {
    if (!isBookmarked) {
      // Add bookmark
      return await apiRequest(`/api/bookmarks/${resourceId}`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
        credentials: 'include'
      });
    } else {
      // Remove bookmark
      return await apiRequest(`/api/bookmarks/${resourceId}`, {
        method: "DELETE",
        credentials: 'include'
      });
    }
  },
  onMutate: async () => {
    // Optimistic update: toggle bookmark state immediately
    // Only if we're not showing notes dialog (immediate toggle)
    if (!showNotesDialog || isBookmarked) {
      setIsBookmarked(!isBookmarked);
    }
  },
  onSuccess: (data) => {
    // Update with authoritative server response
    if (data?.isBookmarked !== undefined) {
      setIsBookmarked(data.isBookmarked);
    }
    if (data?.notes !== undefined) {
      setNotes(data.notes);
    }

    // Invalidate related queries (list + detail pages)
    queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
    queryClient.invalidateQueries({ queryKey: [`/api/resources/${resourceId}`] });

    toast({
      description: isBookmarked ? "Bookmark removed" : "Bookmark added",
      duration: 2000
    });

    // Close notes dialog if open
    setNotesDialogOpen(false);
    setTempNotes("");
  },
  onError: (error) => {
    // Revert optimistic update on error
    setIsBookmarked(isBookmarked); // Restore previous state

    toast({
      title: "Error",
      description: "Failed to update bookmark. Please try again.",
      variant: "destructive"
    });

    console.error("Bookmark mutation error:", error);
  }
});

// Usage
const handleClick = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  if (!isBookmarked && showNotesDialog) {
    // Open dialog for notes
    setTempNotes(notes);
    setNotesDialogOpen(true);
  } else {
    // Toggle bookmark directly
    bookmarkMutation.mutate(undefined);
  }
};
```

**Key Patterns:**
- **Local state management**: Uses `useState` for instant UI updates
- **Conditional optimistic update**: Only toggle immediately if no notes dialog
- **Server response sync**: Update state with server response in `onSuccess`
- **Multi-query invalidation**: Invalidates both list and detail queries
- **Error rollback**: Reverts local state on mutation failure
- **Conditional mutation**: ADD vs DELETE based on current bookmark state

**Why this pattern?**
- **Instant feedback**: User sees bookmark toggle immediately
- **Data consistency**: Server response is source of truth
- **Graceful degradation**: Automatic rollback on errors
- **Related cache updates**: Keeps list and detail pages in sync

---

### Real-World Example 2: AI Recommendations Feedback

**File**: `client/src/hooks/useAIRecommendations.ts`

This example shows mutation-based data fetching with feedback tracking.

```typescript
// Recommendation generation mutation
const recommendationsMutation = useMutation({
  mutationFn: async (profile?: UserProfile): Promise<RecommendationsResponse> => {
    const url = `/api/recommendations?limit=${limit}`;
    const finalProfile = profile || userProfile;

    if (finalProfile) {
      return await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(finalProfile)
      });
    } else {
      // Anonymous users get generic recommendations
      return await apiRequest(url, { method: 'GET' });
    }
  },
  onSuccess: (data) => {
    // Cache in React state for immediate access
    setLocalCache(data);

    // Persist to localStorage for cross-session caching
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_recommendations_cache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    }
  }
});

// Feedback tracking mutation
const feedbackMutation = useMutation({
  mutationFn: async ({
    userId,
    resourceId,
    feedback,
    rating
  }: {
    userId: string;
    resourceId: number;
    feedback: 'clicked' | 'dismissed' | 'completed';
    rating?: number;
  }) => {
    return await apiRequest('/api/recommendations/feedback', {
      method: 'POST',
      body: JSON.stringify({ userId, resourceId, feedback, rating })
    });
  },
  onSuccess: () => {
    // Invalidate recommendations cache to refresh with updated feedback
    queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
  }
});

// Hook return value
return {
  // Data
  recommendations: localCache?.recommendations || recommendationsMutation.data?.recommendations || [],
  learningPaths: localCache?.learningPaths || recommendationsMutation.data?.learningPaths || [],

  // Actions
  generateRecommendations: recommendationsMutation.mutate,
  generateRecommendationsAsync: recommendationsMutation.mutateAsync,
  recordFeedback: feedbackMutation.mutate,
  recordFeedbackAsync: feedbackMutation.mutateAsync,

  // State
  isLoading: recommendationsMutation.isPending,
  isError: recommendationsMutation.isError,
  error: recommendationsMutation.error
};
```

**Key Patterns:**
- **Mutation for GET requests**: Uses mutation for user-initiated recommendations (not automatic)
- **Dual caching**: React state + localStorage for persistence
- **Feedback loop**: Separate mutation for tracking user feedback
- **Cache invalidation**: Feedback invalidates recommendations to reflect updates
- **Async variants**: Provides both `mutate` and `mutateAsync` APIs

**Why mutations instead of queries?**
- **User-initiated**: Recommendations are generated on-demand, not automatic
- **Expensive operation**: AI recommendations are resource-intensive
- **Manual triggering**: User explicitly requests recommendations
- **No automatic refetch**: Avoid unnecessary expensive API calls

---

### `onSuccess` Callback - Cache Invalidation & Side Effects

The `onSuccess` callback runs when a mutation completes successfully. Use it for cache invalidation, UI updates, and side effects.

#### Signature

```typescript
onSuccess: (data, variables, context) => {
  // data: Response from mutationFn
  // variables: Arguments passed to mutate()
  // context: Value returned from onMutate
}
```

#### Common Use Cases

##### 1. Single Query Invalidation

```typescript
const deleteMutation = useMutation({
  mutationFn: async (id: number) => {
    return apiRequest(`/api/resources/${id}`, { method: 'DELETE' });
  },
  onSuccess: () => {
    // Invalidate the resources list
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
  }
});
```

##### 2. Multiple Query Invalidation

Invalidate related queries when a mutation affects multiple endpoints:

```typescript
const updateProfileMutation = useMutation({
  mutationFn: async (updates: ProfileUpdates) => {
    return apiRequest('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },
  onSuccess: (updatedProfile) => {
    // Invalidate user profile
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

    // Invalidate user's resources (might include profile info)
    queryClient.invalidateQueries({ queryKey: ['/api/user/resources'] });

    // Invalidate admin user list if applicable
    queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
  }
});
```

##### 3. Direct Cache Update + Invalidation

Combine instant UI update with background refetch:

```typescript
const updateResourceMutation = useMutation({
  mutationFn: async ({ id, updates }: { id: number; updates: Partial<Resource> }) => {
    return apiRequest(`/api/resources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },
  onSuccess: (updatedResource, { id }) => {
    // 1. Instantly update the specific resource cache
    queryClient.setQueryData(['/api/resources', id], updatedResource);

    // 2. Invalidate the list to refetch in background
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
  }
});
```

##### 4. Side Effects (Navigation, Toasts, Analytics)

```typescript
const createResourceMutation = useMutation({
  mutationFn: async (newResource: Resource) => {
    return apiRequest('/api/resources', {
      method: 'POST',
      body: JSON.stringify(newResource)
    });
  },
  onSuccess: (createdResource) => {
    // 1. Cache invalidation
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });

    // 2. Success notification
    toast({
      description: "Resource created successfully!",
      duration: 3000
    });

    // 3. Analytics tracking
    trackEvent('resource_created', {
      resourceId: createdResource.id,
      category: createdResource.category
    });

    // 4. Navigation
    navigate(`/resources/${createdResource.id}`);
  }
});
```

##### 5. Using Server Response Data

```typescript
const bookmarkMutation = useMutation({
  mutationFn: async (resourceId: string) => {
    return apiRequest(`/api/bookmarks/${resourceId}`, { method: 'POST' });
  },
  onSuccess: (serverResponse) => {
    // Server returns the full bookmark object
    if (serverResponse?.isBookmarked !== undefined) {
      setIsBookmarked(serverResponse.isBookmarked);
    }
    if (serverResponse?.notes !== undefined) {
      setNotes(serverResponse.notes);
    }

    queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
  }
});
```

**Best Practices:**
- Always invalidate related queries
- Use `setQueryData` for instant updates before invalidation
- Handle side effects (toasts, navigation, analytics)
- Use server response as source of truth
- Invalidate broadly (prefix matching) to catch all related queries

---

### `onError` Callback - Error Handling & Rollback

The `onError` callback runs when a mutation fails. Use it for error handling, rollback, and user notifications.

#### Signature

```typescript
onError: (error, variables, context) => {
  // error: Error thrown by mutationFn
  // variables: Arguments passed to mutate()
  // context: Value returned from onMutate (for rollback)
}
```

#### Common Use Cases

##### 1. Basic Error Handling

```typescript
const createMutation = useMutation({
  mutationFn: createResource,
  onError: (error: Error) => {
    toast({
      title: "Error",
      description: error.message || "Failed to create resource",
      variant: "destructive"
    });

    console.error("Creation error:", error);
  }
});
```

##### 2. Optimistic Update Rollback

```typescript
const toggleMutation = useMutation({
  mutationFn: async (id: number) => {
    return apiRequest(`/api/favorites/${id}`, { method: 'POST' });
  },
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['/api/favorites'] });

    // Snapshot for rollback
    const previous = queryClient.getQueryData(['/api/favorites']);

    // Optimistic update
    queryClient.setQueryData(['/api/favorites'], (old: any[]) => [...old, { id }]);

    return { previous }; // Pass to onError
  },
  onError: (error, variables, context) => {
    // Rollback to previous state
    if (context?.previous) {
      queryClient.setQueryData(['/api/favorites'], context.previous);
    }

    toast({
      title: "Error",
      description: "Failed to add favorite",
      variant: "destructive"
    });
  }
});
```

##### 3. Local State Rollback

From `BookmarkButton.tsx`:

```typescript
const bookmarkMutation = useMutation({
  mutationFn: toggleBookmark,
  onMutate: async () => {
    // Optimistic update to local state
    setIsBookmarked(!isBookmarked);
  },
  onError: (error) => {
    // Revert local state on error
    setIsBookmarked(isBookmarked); // Restore previous value

    toast({
      title: "Error",
      description: "Failed to update bookmark. Please try again.",
      variant: "destructive"
    });
  }
});
```

##### 4. Error-Specific Handling

```typescript
const updateMutation = useMutation({
  mutationFn: updateResource,
  onError: (error: any, variables, context) => {
    // Handle different error types
    if (error?.status === 401) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue",
        variant: "destructive"
      });
      navigate('/login');
    } else if (error?.status === 403) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to perform this action",
        variant: "destructive"
      });
    } else if (error?.status === 422) {
      toast({
        title: "Validation Error",
        description: error.message || "Please check your input",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }

    // Rollback optimistic update
    if (context?.previous) {
      queryClient.setQueryData(['/api/resources'], context.previous);
    }
  }
});
```

##### 5. Analytics Tracking

```typescript
const mutation = useMutation({
  mutationFn: submitForm,
  onError: (error: Error, variables) => {
    // Track error for monitoring
    trackError('form_submission_failed', {
      errorMessage: error.message,
      formType: variables.type,
      userId: currentUser?.id
    });

    toast({
      title: "Submission Failed",
      description: error.message,
      variant: "destructive"
    });
  }
});
```

**Best Practices:**
- Always rollback optimistic updates on error
- Provide clear, actionable error messages to users
- Log errors for debugging (console.error or analytics)
- Handle specific error cases (401, 403, 422, etc.)
- Use the `context` parameter for rollback data
- Don't expose sensitive error details to users

---

### `onMutate` Callback - Optimistic Updates

The `onMutate` callback runs **before** the mutation executes. Use it for optimistic UI updates to make your app feel instant.

#### Signature

```typescript
onMutate: async (variables) => {
  // variables: Arguments passed to mutate()
  // Return value: Passed to onError and onSuccess as 'context'
}
```

#### Complete Optimistic Update Pattern

```typescript
const mutation = useMutation({
  mutationFn: async (newTodo: Todo) => {
    return apiRequest('/api/todos', {
      method: 'POST',
      body: JSON.stringify(newTodo)
    });
  },
  onMutate: async (newTodo) => {
    // 1. Cancel outgoing queries to prevent race conditions
    await queryClient.cancelQueries({ queryKey: ['/api/todos'] });

    // 2. Snapshot previous state for rollback
    const previousTodos = queryClient.getQueryData<Todo[]>(['/api/todos']);

    // 3. Optimistically update the cache
    queryClient.setQueryData<Todo[]>(['/api/todos'], (old = []) => {
      return [...old, { ...newTodo, id: `temp-${Date.now()}`, isPending: true }];
    });

    // 4. Return context for error/success handlers
    return { previousTodos };
  },
  onError: (error, newTodo, context) => {
    // Rollback to snapshot
    queryClient.setQueryData(['/api/todos'], context?.previousTodos);
  },
  onSuccess: (serverTodo, newTodo, context) => {
    // Replace temp item with server response
    queryClient.setQueryData<Todo[]>(['/api/todos'], (old = []) => {
      return old.map(todo =>
        todo.id === `temp-${Date.now()}` ? serverTodo : todo
      );
    });
  },
  onSettled: () => {
    // Always refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['/api/todos'] });
  }
});
```

#### Why `cancelQueries`?

Prevents race conditions where a background refetch could overwrite your optimistic update:

```typescript
onMutate: async (variables) => {
  // Without this, a background refetch could overwrite optimistic update
  await queryClient.cancelQueries({ queryKey: ['/api/todos'] });

  // Now safe to optimistically update
  queryClient.setQueryData(['/api/todos'], /* ... */);
}
```

**Best Practices:**
- Always cancel queries before optimistic updates
- Return context object with snapshots for rollback
- Use temporary IDs for new items (e.g., `temp-${Date.now()}`)
- Keep optimistic updates simple (complex updates can cause UI bugs)
- Always pair with `onError` for rollback

---

### `onSettled` Callback - Cleanup & Guaranteed Execution

The `onSettled` callback runs **after** `onSuccess` or `onError`, regardless of which one executes. Use it for cleanup and guaranteed refetches.

#### Signature

```typescript
onSettled: (data, error, variables, context) => {
  // Runs after success OR error
  // data: Response from mutationFn (undefined on error)
  // error: Error object (undefined on success)
}
```

#### Common Use Cases

##### 1. Guaranteed Cache Invalidation

```typescript
const mutation = useMutation({
  mutationFn: updateResource,
  onMutate: async (updates) => {
    // Optimistic update
    const previous = queryClient.getQueryData(['/api/resources']);
    queryClient.setQueryData(['/api/resources'], /* ... */);
    return { previous };
  },
  onError: (error, variables, context) => {
    // Rollback
    queryClient.setQueryData(['/api/resources'], context?.previous);
  },
  onSettled: () => {
    // Always refetch, whether success or error
    // Ensures cache is in sync with server
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
  }
});
```

##### 2. Cleanup After Mutation

```typescript
const uploadMutation = useMutation({
  mutationFn: uploadFile,
  onSettled: () => {
    // Clean up temporary files/state regardless of success/failure
    clearTempFiles();
    resetUploadProgress();

    // Always refetch
    queryClient.invalidateQueries({ queryKey: ['/api/files'] });
  }
});
```

##### 3. Loading State Management

```typescript
const [isProcessing, setIsProcessing] = useState(false);

const mutation = useMutation({
  mutationFn: processData,
  onMutate: () => {
    setIsProcessing(true);
  },
  onSettled: () => {
    // Guaranteed to run, whether success or error
    setIsProcessing(false);
  }
});
```

**When to use `onSettled` vs `onSuccess`/`onError`:**
- Use **`onSettled`** for: Cleanup, guaranteed refetches, loading state resets
- Use **`onSuccess`** for: Success-specific logic (navigation, success toasts)
- Use **`onError`** for: Error-specific logic (rollback, error toasts)

---

### Mutation State & Loading Indicators

```typescript
const mutation = useMutation({ /* ... */ });

// State flags
mutation.isPending   // true while mutation is in progress
mutation.isError     // true if mutation failed
mutation.isSuccess   // true if mutation succeeded
mutation.isIdle      // true if mutation hasn't been called yet

// Data and errors
mutation.data        // Response from successful mutation
mutation.error       // Error from failed mutation

// Actions
mutation.mutate(variables)      // Fire and forget
mutation.mutateAsync(variables) // Returns promise
mutation.reset()                // Reset to idle state
```

#### Loading Button Example

```typescript
function CreateButton() {
  const createMutation = useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
    }
  });

  return (
    <Button
      onClick={() => createMutation.mutate(newResource)}
      disabled={createMutation.isPending}
    >
      {createMutation.isPending ? (
        <>
          <Spinner className="mr-2" />
          Creating...
        </>
      ) : (
        'Create Resource'
      )}
    </Button>
  );
}
```

---

### Best Practices Summary

**✅ DO:**
- Always invalidate related queries in `onSuccess`
- Use optimistic updates for instant UI feedback
- Implement rollback in `onError` for optimistic updates
- Provide clear user feedback (toasts, loading states)
- Use `cancelQueries` before optimistic updates
- Return context from `onMutate` for rollback data
- Use `onSettled` for guaranteed cleanup

**❌ DON'T:**
- Forget to invalidate queries after mutations
- Implement optimistic updates without rollback
- Use mutations for GET requests (use queries instead)
- Mutate cache without handling errors
- Skip user feedback on errors
- Perform side effects in `mutationFn` (use callbacks instead)

---

## Cache Management

Cache management is critical for keeping UI state synchronized with server state after mutations. TanStack Query provides two primary methods: **cache invalidation** and **direct cache updates**.

### Cache Invalidation with `invalidateQueries`

Cache invalidation marks queries as stale and triggers a background refetch. This is the **preferred method** for most cache updates after mutations.

#### Basic Invalidation

```typescript
// Invalidate all queries with this key prefix
queryClient.invalidateQueries({ queryKey: ['/api/resources'] });

// Invalidate specific resource by ID
queryClient.invalidateQueries({ queryKey: ['/api/resources', resourceId] });

// Invalidate with exact match only (no prefix matching)
queryClient.invalidateQueries({ queryKey: ['/api/recommendations'], exact: true });
```

#### How Invalidation Works

1. **Marks queries as stale**: Queries matching the key are marked stale
2. **Triggers refetch**: If query is currently being observed (component is mounted), it refetches
3. **Background update**: Refetch happens in background, existing data remains visible
4. **Automatic UI update**: Components re-render when fresh data arrives

#### Invalidation Matching Rules

```typescript
// Partial matching (default) - invalidates all queries starting with key
queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
// Matches:
// - ['/api/resources']
// - ['/api/resources', { page: 1 }]
// - ['/api/resources', resourceId]

// Exact matching - invalidates only exact key match
queryClient.invalidateQueries({
  queryKey: ['/api/resources'],
  exact: true
});
// Matches ONLY:
// - ['/api/resources']
```

#### Real-World Example 1: Logout with Cache Invalidation

**File**: `client/src/hooks/useAuth.ts`

After logout, invalidate the auth query to trigger a refetch:

```typescript
const logoutMutation = useMutation({
  mutationFn: async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Logout failed');
    }
    return response.json();
  },
  onSuccess: () => {
    // Step 1: Invalidate to mark stale
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

    // Step 2: Immediately set auth state (instant UI update)
    queryClient.setQueryData(['/api/auth/user'], {
      user: null,
      isAuthenticated: false
    });

    // Step 3: Redirect to home
    window.location.href = '/';
  }
});
```

**Key Points:**
- Combines `invalidateQueries` + `setQueryData` for best UX
- `invalidateQueries` ensures future mounts fetch fresh data
- `setQueryData` provides instant UI feedback
- Redirect happens after cache is cleared

#### Real-World Example 2: Bookmark Mutation with Multi-Query Invalidation

**File**: `client/src/components/resource/BookmarkButton.tsx`

After bookmarking, invalidate multiple related queries:

```typescript
const bookmarkMutation = useMutation({
  mutationFn: async (payload?: { notes?: string }) => {
    if (!isBookmarked) {
      // Add bookmark
      return await apiRequest(`/api/bookmarks/${resourceId}`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
        credentials: 'include'
      });
    } else {
      // Remove bookmark
      return await apiRequest(`/api/bookmarks/${resourceId}`, {
        method: "DELETE",
        credentials: 'include'
      });
    }
  },
  onSuccess: (data) => {
    // Update local state with server response
    if (data?.isBookmarked !== undefined) {
      setIsBookmarked(data.isBookmarked);
    }
    if (data?.notes !== undefined) {
      setNotes(data.notes);
    }

    // Invalidate all bookmark lists
    queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });

    // Invalidate the specific resource detail page
    queryClient.invalidateQueries({ queryKey: [`/api/resources/${resourceId}`] });

    toast({
      description: isBookmarked ? "Bookmark removed" : "Bookmark added",
      duration: 2000
    });
  },
  onError: (error) => {
    // Revert optimistic update on error
    setIsBookmarked(isBookmarked);
    toast({
      title: "Error",
      description: "Failed to update bookmark. Please try again.",
      variant: "destructive"
    });
  }
});
```

**Key Points:**
- Invalidates **multiple** related queries (bookmarks list + resource detail)
- Partial matching: `['/api/bookmarks']` invalidates all bookmark queries
- Specific invalidation: `['/api/resources/${resourceId}']` updates resource detail
- Error handling reverts optimistic updates

#### Real-World Example 3: Feedback Mutation

**File**: `client/src/hooks/useAIRecommendations.ts`

After recording user feedback, invalidate recommendations cache:

```typescript
const feedbackMutation = useMutation({
  mutationFn: async ({
    userId,
    resourceId,
    feedback,
    rating
  }: {
    userId: string;
    resourceId: number;
    feedback: 'clicked' | 'dismissed' | 'completed';
    rating?: number;
  }) => {
    return await apiRequest('/api/recommendations/feedback', {
      method: 'POST',
      body: JSON.stringify({ userId, resourceId, feedback, rating })
    });
  },
  onSuccess: () => {
    // Invalidate all recommendation queries to refresh with updated feedback
    queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
  }
});
```

**Key Points:**
- Broad invalidation: All recommendation queries refresh with new feedback
- Next time recommendations are requested, they'll reflect user's feedback
- Background refetch doesn't disrupt current UI

#### When to Use `invalidateQueries`

**✅ Use invalidateQueries when:**
- You want to refetch data from the server after a mutation
- Multiple queries need to be updated (use prefix matching)
- You want background updates without blocking the UI
- Server state is the source of truth
- You're okay with a brief delay before UI updates

**❌ Don't use invalidateQueries when:**
- You need instant UI updates (use `setQueryData` instead or combine both)
- You know exactly what the new data will be (use `setQueryData`)
- You want to remove data from cache entirely (use `removeQueries`)

---

### Direct Cache Updates with `setQueryData`

`setQueryData` directly updates the cache without making a network request. Use this for **instant UI updates** when you know the new data.

#### Basic Usage

```typescript
// Set data immediately (replaces existing cache)
queryClient.setQueryData(['/api/auth/user'], {
  user: null,
  isAuthenticated: false
});

// Update existing data with updater function
queryClient.setQueryData(['/api/resources'], (old: Resource[]) => {
  return old.map(r => r.id === updatedId ? { ...r, ...updates } : r);
});
```

#### How `setQueryData` Works

1. **Instant update**: Cache is updated synchronously (no network request)
2. **Components re-render**: Any component using this query re-renders immediately
3. **No refetch**: Data is considered fresh (unless explicitly invalidated)
4. **Type-safe**: Updater function receives existing cache data

#### Real-World Example 1: Optimistic Logout

**File**: `client/src/hooks/useAuth.ts`

Immediately set auth state to logged out while logout request is processing:

```typescript
const logoutMutation = useMutation({
  mutationFn: async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Logout failed');
    return response.json();
  },
  onSuccess: () => {
    // Invalidate auth cache to mark stale
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

    // Immediately update cache for instant UI update
    queryClient.setQueryData(['/api/auth/user'], {
      user: null,
      isAuthenticated: false
    });

    window.location.href = '/';
  }
});
```

**Why both `invalidateQueries` + `setQueryData`?**
- `setQueryData`: Instant UI update (user sees logout immediately)
- `invalidateQueries`: Ensures future mounts fetch fresh auth state
- Best of both worlds: instant feedback + cache consistency

#### Real-World Example 2: Optimistic Bookmark Toggle

**File**: `client/src/components/resource/BookmarkButton.tsx`

Update UI optimistically before server responds:

```typescript
const bookmarkMutation = useMutation({
  mutationFn: async (payload?: { notes?: string }) => {
    if (!isBookmarked) {
      return await apiRequest(`/api/bookmarks/${resourceId}`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
      });
    } else {
      return await apiRequest(`/api/bookmarks/${resourceId}`, {
        method: "DELETE",
      });
    }
  },
  onMutate: async () => {
    // Optimistic update for immediate visual feedback
    if (!showNotesDialog || isBookmarked) {
      setIsBookmarked(!isBookmarked);
    }
  },
  onSuccess: (data) => {
    // Update with server response (may differ from optimistic update)
    if (data?.isBookmarked !== undefined) {
      setIsBookmarked(data.isBookmarked);
    }
    if (data?.notes !== undefined) {
      setNotes(data.notes);
    }

    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
    queryClient.invalidateQueries({ queryKey: [`/api/resources/${resourceId}`] });
  },
  onError: (error) => {
    // Revert optimistic update if mutation fails
    setIsBookmarked(isBookmarked);

    toast({
      title: "Error",
      description: "Failed to update bookmark. Please try again.",
      variant: "destructive"
    });
  }
});
```

**Optimistic Update Pattern:**
1. **onMutate**: Update local state immediately (optimistic)
2. **onSuccess**: Update with server response (source of truth)
3. **onError**: Revert optimistic update if mutation fails
4. **Result**: Instant UI feedback with automatic error recovery

#### Advanced Pattern: Optimistic Update with Context

For complex optimistic updates using TanStack Query cache:

```typescript
const mutation = useMutation({
  mutationFn: async (newResource: Resource) => {
    return apiRequest('/api/resources', {
      method: 'POST',
      body: JSON.stringify(newResource),
    });
  },
  onMutate: async (newResource) => {
    // Cancel outgoing refetches (prevent race conditions)
    await queryClient.cancelQueries({ queryKey: ['/api/resources'] });

    // Snapshot previous value for rollback
    const previousResources = queryClient.getQueryData(['/api/resources']);

    // Optimistically update cache
    queryClient.setQueryData(['/api/resources'], (old: Resource[] = []) => {
      return [...old, { ...newResource, id: Date.now() }]; // Temporary ID
    });

    // Return context with snapshot for rollback
    return { previousResources };
  },
  onError: (err, newResource, context) => {
    // Rollback to previous state on error
    if (context?.previousResources) {
      queryClient.setQueryData(['/api/resources'], context.previousResources);
    }
  },
  onSettled: () => {
    // Always refetch after mutation (success or error)
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
  },
});
```

**Advanced Pattern Steps:**
1. **cancelQueries**: Prevent race conditions with in-flight requests
2. **getQueryData**: Snapshot current cache for potential rollback
3. **setQueryData**: Optimistically update cache with new data
4. **Return context**: Pass snapshot to error handler
5. **onError**: Rollback to snapshot if mutation fails
6. **onSettled**: Refetch to sync with server (runs after success or error)

#### When to Use `setQueryData`

**✅ Use setQueryData when:**
- You need instant UI updates (no waiting for network)
- You know exactly what the new data will be
- Implementing optimistic updates
- Setting initial data or defaults
- You want to update cache without a network request

**❌ Don't use setQueryData when:**
- You don't know what the new data will be (use `invalidateQueries`)
- Server response might differ from your update
- You want to refetch from server (use `invalidateQueries`)

---

### Combining `invalidateQueries` + `setQueryData`

The **best practice** is often to combine both methods:

```typescript
const mutation = useMutation({
  mutationFn: updateResource,
  onSuccess: (data) => {
    // 1. Instant UI update
    queryClient.setQueryData(['/api/resources', resourceId], data);

    // 2. Invalidate related queries to refetch
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
  }
});
```

**Benefits:**
- **Instant feedback**: `setQueryData` updates UI immediately
- **Cache consistency**: `invalidateQueries` ensures all related queries refresh
- **Best UX**: No loading state, but still synced with server

**Common Pattern:**
```typescript
onSuccess: (serverData) => {
  // Update specific query instantly
  queryClient.setQueryData(['/api/resource', id], serverData);

  // Invalidate list queries to refetch
  queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
}
```

---

### Cache Removal

Remove queries from cache entirely (rarely needed):

```typescript
// Remove specific query from cache
queryClient.removeQueries({ queryKey: ['/api/resources', resourceId] });

// Clear all queries
queryClient.clear();
```

**When to use:**
- User logs out (clear all user-specific data)
- Navigating away from a feature (cleanup)
- Memory optimization (remove unused queries)

**Warning:** Use sparingly - usually `invalidateQueries` is better since it keeps cache structure.

---

### Local Cache (localStorage)

For persistence across browser sessions (used in AI recommendations):

**File**: `client/src/hooks/useAIRecommendations.ts`

```typescript
const recommendationsMutation = useMutation({
  mutationFn: async (profile?: UserProfile): Promise<RecommendationsResponse> => {
    const url = `/api/recommendations?limit=${limit}`;
    const finalProfile = profile || userProfile;

    if (finalProfile) {
      return await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(finalProfile)
      });
    } else {
      return await apiRequest(url, { method: 'GET' });
    }
  },
  onSuccess: (data) => {
    // Cache in React state
    setLocalCache(data);

    // Cache in localStorage for persistence across sessions
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_recommendations_cache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    }
  }
});

// Load from localStorage on mount
useEffect(() => {
  if (autoLoad && !localCache && typeof window !== 'undefined') {
    const cached = localStorage.getItem('ai_recommendations_cache');
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);

      // Check if cache is still fresh
      if (Date.now() - timestamp < cacheTime) {
        setLocalCache(data);
      } else if (userProfile) {
        // Cache is stale, auto-refresh
        recommendationsMutation.mutate(userProfile);
      }
    } else if (userProfile) {
      // No cache, fetch fresh data
      recommendationsMutation.mutate(userProfile);
    }
  }
}, [autoLoad, userProfile]);

// Clear cache helper
const clearCache = () => {
  setLocalCache(null);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ai_recommendations_cache');
  }
};
```

**When to use localStorage:**
- Data is expensive to fetch (AI recommendations, large datasets)
- Acceptable to show slightly stale data on page load
- User preferences or settings
- Offline-first features

**Best practices:**
- Always store timestamp for cache expiration
- Validate cached data before using
- Provide manual cache clear function
- Handle JSON parse errors gracefully

---

### Cache Management Decision Tree

```
After a mutation, how should you update the cache?

Do you know the exact new data?
├─ YES → Do you need instant UI update?
│   ├─ YES → Use setQueryData + invalidateQueries
│   └─ NO  → Use invalidateQueries only
└─ NO  → Use invalidateQueries only

Do you need to update multiple related queries?
└─ YES → Use prefix matching in invalidateQueries
    Example: { queryKey: ['/api/resources'] }

Should data persist across sessions?
└─ YES → Also cache in localStorage with timestamp
```

---

### Best Practices Summary

**✅ DO:**
- Combine `setQueryData` + `invalidateQueries` for best UX
- Use prefix matching to invalidate related queries
- Implement optimistic updates for better perceived performance
- Always handle `onError` when doing optimistic updates
- Use localStorage for expensive-to-fetch data

**❌ DON'T:**
- Forget to invalidate after mutations
- Use `setQueryData` without knowing the exact new data
- Clear entire cache (`queryClient.clear()`) unless logging out
- Store sensitive data in localStorage
- Use `exact: true` unless you specifically need exact matching

---

## Error Handling

### Retry Strategies

The application follows a **fail-fast approach** by default, with selective retry logic for specific scenarios.

#### Global Default: No Retries

**File**: `client/src/lib/queryClient.ts`

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Fail fast by default
    },
    mutations: {
      retry: false,
    },
  },
});
```

**Rationale:**
- **Predictable behavior**: Errors surface immediately rather than after multiple retry attempts
- **Better UX**: Users get immediate feedback instead of waiting for retries
- **Reduced server load**: Prevents retry storms during outages
- **Explicit control**: Forces developers to consciously decide when retries are appropriate

#### When to Override with Custom Retry Logic

Override the default `retry: false` only when retries make sense for the specific query:

##### Pattern 1: Authentication Queries - Don't Retry 401s

**File**: `client/src/hooks/useAuth.ts`

```typescript
const { data, isLoading, error } = useQuery<AuthResponse>({
  queryKey: ['/api/auth/user'],
  staleTime: 5 * 60 * 1000,
  retry: (failureCount, error: any) => {
    // Don't retry on 401 - user is simply not authenticated
    if (error?.status === 401) return false;
    return failureCount < 3;
  }
});
```

**Why:**
- **401 = Not Authenticated**: This is a valid state, not an error worth retrying
- **Fast failure**: Immediately show login UI instead of retrying
- **Avoid unnecessary API calls**: Auth state won't change without user action
- **Other errors**: Network issues or server errors (5xx) may be transient, so retry up to 3 times

##### Pattern 2: Admin Queries - Don't Retry 403s

**File**: `client/src/hooks/useAdmin.ts`

```typescript
const { data: stats, isLoading, error } = useQuery<AdminStats>({
  queryKey: ["/api/admin/stats"],
  queryFn: async () => {
    const response = await apiRequest('/api/admin/stats');
    return response;
  },
  enabled: isAdmin, // Only fetch if user is admin
  staleTime: 30000,
  retry: false, // Don't retry on 403
});
```

**Why:**
- **403 = Forbidden**: User lacks permissions, retrying won't help
- **Security**: Prevents hammering protected endpoints
- **Clear error state**: Immediately show "access denied" instead of retry loading
- **Performance**: Avoids wasting resources on requests that will always fail

##### Pattern 3: Transient Errors - Retry with Backoff

```typescript
const { data } = useQuery({
  queryKey: ['/api/resources'],
  retry: (failureCount, error: any) => {
    // Don't retry on 4xx errors (client errors)
    // 401 = Unauthorized, 403 = Forbidden, 404 = Not Found, etc.
    if (error?.status >= 400 && error?.status < 500) return false;

    // Retry up to 3 times for 5xx errors (server errors)
    return failureCount < 3;
  },
  retryDelay: (attemptIndex) => {
    // Exponential backoff: 1s, 2s, 4s, capped at 30s
    return Math.min(1000 * 2 ** attemptIndex, 30000);
  }
});
```

**When to use:**
- API calls that might fail due to network issues
- Server errors (5xx) that could be temporary
- Rate-limited endpoints (with appropriate backoff)

**When NOT to use:**
- Authentication/authorization checks (401/403)
- Resource not found (404)
- Validation errors (400, 422)
- Any client error (4xx range)

#### Retry Decision Matrix

| HTTP Status | Retry? | Rationale | Example Use Case |
|-------------|--------|-----------|------------------|
| **401 Unauthorized** | ❌ No | User not authenticated - requires login | `useAuth()` - session expired |
| **403 Forbidden** | ❌ No | User lacks permissions - won't change on retry | `useAdmin()` - non-admin user |
| **404 Not Found** | ❌ No | Resource doesn't exist | Deleted or invalid resource ID |
| **400 Bad Request** | ❌ No | Validation/syntax error in request | Invalid query parameters |
| **422 Unprocessable** | ❌ No | Semantic validation error | Invalid form data |
| **429 Rate Limited** | ⚠️ Maybe | With exponential backoff only | High-frequency API calls |
| **5xx Server Error** | ✅ Yes (limited) | Temporary server issue, may recover | Database timeout, deployment |
| **Network Error** | ✅ Yes (limited) | Transient connectivity issue | Flaky network connection |

#### Real-World Examples from Codebase

##### Example 1: Auth Query with Selective Retry

```typescript
// From useAuth.ts
const { data } = useQuery<AuthResponse>({
  queryKey: ['/api/auth/user'],
  staleTime: 5 * 60 * 1000,
  retry: (failureCount, error: any) => {
    // 401 = user not logged in (valid state)
    if (error?.status === 401) return false;

    // Network errors or 5xx - retry up to 3 times
    return failureCount < 3;
  }
});

// Result: Immediate "not logged in" state for 401, retry for network issues
```

##### Example 2: Admin Query with No Retry

```typescript
// From useAdmin.ts
const { data: stats } = useQuery<AdminStats>({
  queryKey: ["/api/admin/stats"],
  queryFn: async () => apiRequest('/api/admin/stats'),
  enabled: isAdmin,
  staleTime: 30000,
  retry: false, // Don't retry - 403 means user isn't admin
});

// Result: Fast failure on 403, no unnecessary retries
```

##### Example 3: Default No-Retry Behavior

```typescript
// Most queries use the global default
const { data } = useQuery({
  queryKey: ['/api/resources'],
  // retry: false (inherited from global config)
});

// Result: Immediate error surfacing, no retry attempts
```

#### Best Practices

**✅ DO:**
- Keep `retry: false` as the default (already configured globally)
- Only enable retries for queries that benefit from them (network errors, 5xx)
- Always exclude 401/403 from retry logic (auth/permission errors)
- Use exponential backoff when retrying to avoid overwhelming servers
- Document why you're enabling retries in comments

**❌ DON'T:**
- Retry client errors (4xx) - they indicate problems with the request
- Retry 401s in auth queries - this delays showing the login UI
- Retry 403s in protected queries - user permissions won't change
- Use high retry counts (>3) - causes poor UX and server load
- Retry without backoff - can create thundering herd problems

#### Common Retry Patterns

```typescript
// Pattern 1: Auth queries (retry non-auth errors only)
retry: (failureCount, error: any) => {
  if (error?.status === 401) return false;
  return failureCount < 3;
}

// Pattern 2: Admin/protected queries (no retry)
retry: false

// Pattern 3: General API queries (retry server errors only)
retry: (failureCount, error: any) => {
  // Skip all client errors (4xx)
  if (error?.status >= 400 && error?.status < 500) return false;
  // Retry server errors (5xx) and network errors
  return failureCount < 3;
}

// Pattern 4: Critical queries (no retry, fail fast)
retry: false
```

### Error Handling in Components

```typescript
const { data, error, isError, isLoading } = useQuery({
  queryKey: ['/api/resources'],
});

if (isLoading) return <div>Loading...</div>;
if (isError) return <div>Error: {error.message}</div>;
```

### Global Error Handling

Errors are tracked via analytics (see `client/src/lib/queryClient.ts`):

```typescript
try {
  const res = await fetch(url, { credentials: "include" });
  trackApiPerformance(url, responseTime, res.status);
  // ...
} catch (error) {
  trackError('api_error', `${url}: ${error.message}`);
  throw error;
}
```

---

## Common Hooks Reference

### `useAuth()` - Authentication

**Location**: `client/src/hooks/useAuth.ts`

```typescript
const { user, isLoading, isAuthenticated, logout } = useAuth();
```

**Features**:
- 5-minute cache (`staleTime: 5 * 60 * 1000`)
- Custom retry: don't retry 401s
- Invalidates cache on logout

### `useAIRecommendations()` - AI Recommendations

**Location**: `client/src/hooks/useAIRecommendations.ts`

```typescript
const {
  recommendations,
  learningPaths,
  generateRecommendations,
  recordFeedback,
  isLoading,
  clearCache
} = useAIRecommendations(userProfile, { limit: 10, autoLoad: true });
```

**Features**:
- Mutation-based (not query)
- Local cache + localStorage persistence
- Auto-load on mount
- Feedback tracking with cache invalidation

### `useQuickRecommendations()` - Quick Recommendations

```typescript
const { data } = useQuickRecommendations(categories, skillLevel);
```

**Features**:
- Query-based (not mutation)
- 5-minute cache
- Conditional execution (`enabled`)

---

## Best Practices

### 1. Use Consistent Query Keys

✅ **Good**:
```typescript
queryKey: ['/api/resources', { category, page }]
```

❌ **Bad**:
```typescript
queryKey: ['resources', category, page] // Inconsistent format
```

### 2. Override staleTime When Needed

✅ **Good**:
```typescript
// Fresh auth data
useQuery({
  queryKey: ['/api/auth/user'],
  staleTime: 5 * 60 * 1000, // Override default
});
```

❌ **Bad**:
```typescript
// Using Infinity (default) for auth data that should refresh
useQuery({ queryKey: ['/api/auth/user'] });
```

### 3. Invalidate Related Queries After Mutations

✅ **Good**:
```typescript
useMutation({
  mutationFn: createResource,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
  }
});
```

❌ **Bad**:
```typescript
useMutation({
  mutationFn: createResource,
  // No invalidation - UI won't update!
});
```

### 4. Use Conditional Queries

✅ **Good**:
```typescript
useQuery({
  queryKey: ['/api/user/data', userId],
  enabled: !!userId, // Only fetch when userId exists
});
```

❌ **Bad**:
```typescript
useQuery({
  queryKey: ['/api/user/data', userId],
  // Will fail if userId is undefined
});
```

### 5. Handle 401 Errors Properly

✅ **Good**:
```typescript
useQuery({
  queryKey: ['/api/auth/user'],
  retry: (failureCount, error) => {
    if (error?.status === 401) return false; // Don't retry auth failures
    return failureCount < 3;
  }
});
```

❌ **Bad**:
```typescript
useQuery({
  queryKey: ['/api/auth/user'],
  retry: 3, // Will retry 401s unnecessarily
});
```

### 6. Use TypeScript Generics

✅ **Good**:
```typescript
const { data } = useQuery<AuthResponse>({
  queryKey: ['/api/auth/user'],
});
// data is typed as AuthResponse
```

❌ **Bad**:
```typescript
const { data } = useQuery({
  queryKey: ['/api/auth/user'],
});
// data is typed as unknown
```

### 7. Leverage `apiRequest` Helper

✅ **Good**:
```typescript
import { apiRequest } from '@/lib/queryClient';

const { data } = useQuery({
  queryKey: ['/api/resources'],
  queryFn: () => apiRequest('/api/resources'),
});
```

❌ **Bad**:
```typescript
const { data } = useQuery({
  queryKey: ['/api/resources'],
  queryFn: async () => {
    const res = await fetch('/api/resources');
    if (!res.ok) throw new Error('...');
    return res.json();
  },
});
```

**Why?** `apiRequest` handles:
- Content-Type headers
- Credentials (cookies)
- Error handling
- Analytics tracking

---

## Anti-Patterns to Avoid

### ❌ Fetching in useEffect

**Bad**:
```typescript
const [data, setData] = useState(null);
useEffect(() => {
  fetch('/api/resources').then(res => res.json()).then(setData);
}, []);
```

**Good**:
```typescript
const { data } = useQuery({ queryKey: ['/api/resources'] });
```

### ❌ Not Invalidating After Mutations

**Bad**:
```typescript
const mutation = useMutation({
  mutationFn: updateResource,
  // Missing onSuccess - cache won't update!
});
```

**Good**:
```typescript
const mutation = useMutation({
  mutationFn: updateResource,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
  }
});
```

### ❌ Inconsistent Query Keys

**Bad**:
```typescript
// Different places in codebase:
queryKey: ['/api/resources']
queryKey: ['resources']
queryKey: ['/api/resources/']
```

**Good**:
```typescript
// Consistent everywhere:
queryKey: ['/api/resources']
```

### ❌ Ignoring enabled Option

**Bad**:
```typescript
const { data } = useQuery({
  queryKey: ['/api/user/profile', userId],
  queryFn: () => apiRequest(`/api/user/profile/${userId}`),
  // Will fail if userId is undefined/null
});
```

**Good**:
```typescript
const { data } = useQuery({
  queryKey: ['/api/user/profile', userId],
  queryFn: () => apiRequest(`/api/user/profile/${userId}`),
  enabled: !!userId, // Guard condition
});
```

### ❌ Using Mutations for GET Requests

**Bad**:
```typescript
const mutation = useMutation({
  mutationFn: () => fetch('/api/resources').then(r => r.json()),
});
```

**Good**:
```typescript
const { data } = useQuery({
  queryKey: ['/api/resources'],
});
```

**Why?** Queries are for fetching data, mutations are for side effects (POST/PUT/DELETE).

---

## Common Pitfalls & How to Avoid Them

This section covers frequently encountered issues when working with TanStack Query, based on real-world usage patterns in this codebase.

### 1. Cache Invalidation Issues

#### Pitfall: Forgetting to Invalidate After Mutations

**Symptom**: UI doesn't update after creating, updating, or deleting data.

**Problem**:
```typescript
const createResourceMutation = useMutation({
  mutationFn: (data) => apiRequest('/api/resources', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  // ❌ Missing onSuccess - cache won't update!
});
```

**Solution**:
```typescript
const createResourceMutation = useMutation({
  mutationFn: (data) => apiRequest('/api/resources', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  onSuccess: () => {
    // ✅ Invalidate to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
    toast.success('Resource created successfully');
  },
});
```

**Prevention Checklist**:
- [ ] Every mutation has `onSuccess` callback
- [ ] All affected query keys are invalidated
- [ ] Related list queries are invalidated (e.g., invalidate `/api/resources` when updating single resource)
- [ ] User gets feedback (toast notification)

#### Pitfall: Partial Invalidation Misses Related Data

**Symptom**: Some parts of UI update but others don't.

**Problem**:
```typescript
// User updates a resource
onSuccess: (data) => {
  // ❌ Only invalidates the single resource
  queryClient.invalidateQueries({
    queryKey: ['/api/resources', data.id],
    exact: true // Prevents invalidating the list!
  });
}
```

**Solution**:
```typescript
onSuccess: (data) => {
  // ✅ Invalidate both the single resource and the list
  queryClient.invalidateQueries({
    queryKey: ['/api/resources', data.id]
  });
  queryClient.invalidateQueries({
    queryKey: ['/api/resources']
  });
  // Or use prefix matching:
  // queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
}
```

**When to Invalidate Multiple Keys**:
- Single resource + list of resources
- Resource + related recommendations
- User data + user statistics
- Category data + resource counts

### 2. Query Key Inconsistencies

#### Pitfall: Different Key Formats for Same Data

**Symptom**: Cache misses, duplicate network requests, stale data.

**Problem**:
```typescript
// ❌ In useResourceList.ts
queryKey: ['resources', { page: 1 }]

// ❌ In ResourceDetail.tsx
queryKey: ['/api/resources', resourceId]

// ❌ In mutations
queryClient.invalidateQueries({ queryKey: ['/api/resource'] }); // Typo!
```

**Solution**:
```typescript
// ✅ Consistent format everywhere
// In useResourceList.ts
queryKey: ['/api/resources', { page: 1 }]

// In ResourceDetail.tsx
queryKey: ['/api/resources', resourceId]

// In mutations
queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
```

**Best Practice**: Create a key factory for complex queries:
```typescript
// lib/queryKeys.ts
export const resourceKeys = {
  all: ['/api/resources'] as const,
  lists: () => [...resourceKeys.all, 'list'] as const,
  list: (filters: ResourceFilters) => [...resourceKeys.lists(), filters] as const,
  details: () => [...resourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...resourceKeys.details(), id] as const,
};

// Usage:
queryKey: resourceKeys.detail(resourceId)
queryClient.invalidateQueries({ queryKey: resourceKeys.all })
```

### 3. Stale Data Management

#### Pitfall: Using Default `staleTime: Infinity` for Time-Sensitive Data

**Symptom**: User sees outdated data (e.g., old session, stale statistics).

**Problem**:
```typescript
// ❌ Auth data never refreshes
const { data: user } = useQuery({
  queryKey: ['/api/auth/user'],
  // Uses default staleTime: Infinity
});
```

**Solution**:
```typescript
// ✅ Set appropriate staleTime for auth data
const { data: user } = useQuery({
  queryKey: ['/api/auth/user'],
  staleTime: 5 * 60 * 1000, // 5 minutes
  retry: (failureCount, error: any) => {
    if (error?.status === 401) return false;
    return failureCount < 3;
  }
});
```

**Guidelines by Data Type**:
| Data Type | Recommended `staleTime` | Rationale |
|-----------|------------------------|-----------|
| User session | 5 minutes | Balance between freshness and server load |
| Admin stats | 30-60 seconds | Moderately fresh for dashboards |
| Static content | `Infinity` | Changes only via mutations |
| Real-time data | Use WebSockets | Don't abuse short staleTime |
| Search results | 2-5 minutes | Results change slowly |

#### Pitfall: Over-Fetching with Short `staleTime`

**Symptom**: High server load, slow performance, unnecessary network requests.

**Problem**:
```typescript
// ❌ Refetches every second - server overload!
const { data } = useQuery({
  queryKey: ['/api/admin/stats'],
  staleTime: 1000,
});
```

**Solution**:
```typescript
// ✅ Use longer staleTime + manual refresh
const { data } = useQuery({
  queryKey: ['/api/admin/stats'],
  staleTime: 30000, // 30 seconds
});

// Provide manual refresh button
const refreshStats = () => {
  queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
};

return (
  <div>
    <Button onClick={refreshStats}>Refresh</Button>
    <AdminStats data={data} />
  </div>
);
```

### 4. Authentication & Authorization Issues

#### Pitfall: Retrying 401/403 Errors

**Symptom**: Login UI delays, unnecessary server load, poor UX.

**Problem**:
```typescript
// ❌ Retries auth failures
const { data } = useQuery({
  queryKey: ['/api/auth/user'],
  retry: 3, // Will retry 401s three times!
});
```

**Solution**:
```typescript
// ✅ Don't retry auth failures
const { data } = useQuery({
  queryKey: ['/api/auth/user'],
  retry: (failureCount, error: any) => {
    // Never retry authentication errors
    if (error?.status === 401 || error?.status === 403) {
      return false;
    }
    // Retry other errors up to 3 times
    return failureCount < 3;
  },
});
```

**Why**: 401/403 errors indicate:
- User is not authenticated (401) → Show login UI immediately
- User lacks permissions (403) → No retry will fix this
- Server is working correctly → Retrying wastes resources

#### Pitfall: Not Using `enabled` for Protected Queries

**Symptom**: Failed requests for unauthenticated users, console errors.

**Problem**:
```typescript
// ❌ Tries to fetch admin data even when user isn't admin
const { data: adminStats } = useQuery({
  queryKey: ['/api/admin/stats'],
});
```

**Solution**:
```typescript
// ✅ Only fetch when user is authenticated and authorized
const { data: user } = useAuth();
const isAdmin = user?.role === 'admin';

const { data: adminStats } = useQuery({
  queryKey: ['/api/admin/stats'],
  enabled: isAdmin, // Guard condition
  retry: false, // Don't retry 403s
});

if (!isAdmin) {
  return <div>Access denied</div>;
}
```

### 5. Race Conditions & Dependent Queries

#### Pitfall: Fetching Without Dependencies

**Symptom**: Errors from undefined IDs, failed requests.

**Problem**:
```typescript
// ❌ userId might be undefined on initial render
const { data: userProfile } = useQuery({
  queryKey: ['/api/user/profile', userId],
  queryFn: () => apiRequest(`/api/user/profile/${userId}`),
});
```

**Solution**:
```typescript
// ✅ Use enabled to wait for dependencies
const { data: userProfile } = useQuery({
  queryKey: ['/api/user/profile', userId],
  queryFn: () => apiRequest(`/api/user/profile/${userId}`),
  enabled: !!userId, // Only fetch when userId exists
});
```

#### Pitfall: Sequential Dependent Queries

**Symptom**: Slow page load, waterfall requests.

**Problem**:
```typescript
// ❌ Second query waits for first to complete
const { data: user } = useQuery({
  queryKey: ['/api/auth/user'],
});

const { data: preferences } = useQuery({
  queryKey: ['/api/user/preferences', user?.id],
  enabled: !!user?.id,
});

const { data: recommendations } = useQuery({
  queryKey: ['/api/recommendations', preferences?.categories],
  enabled: !!preferences?.categories,
});
```

**Solution (if possible)**:
```typescript
// ✅ Fetch in parallel or combine server-side
const { data } = useQuery({
  queryKey: ['/api/user/dashboard'],
  queryFn: async () => {
    // Server returns user, preferences, and recommendations together
    return apiRequest('/api/user/dashboard');
  },
});
```

**When Sequential is Necessary**: Use the dependent pattern above, but:
- Document why dependencies are needed
- Consider server-side aggregation
- Show loading states for better UX

### 6. Optimistic Updates Gone Wrong

#### Pitfall: Optimistic Update Without Rollback

**Symptom**: UI shows success but mutation fails, data becomes inconsistent.

**Problem**:
```typescript
const likeMutation = useMutation({
  mutationFn: (resourceId) => apiRequest(`/api/resources/${resourceId}/like`, {
    method: 'POST',
  }),
  onMutate: async (resourceId) => {
    // ❌ Updates cache but doesn't save previous value
    queryClient.setQueryData(['/api/resources', resourceId], (old: any) => ({
      ...old,
      likes: old.likes + 1,
    }));
  },
  // ❌ Missing onError - if mutation fails, cache stays incorrect!
});
```

**Solution**:
```typescript
const likeMutation = useMutation({
  mutationFn: (resourceId) => apiRequest(`/api/resources/${resourceId}/like`, {
    method: 'POST',
  }),
  onMutate: async (resourceId) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['/api/resources', resourceId] });

    // Save previous value for rollback
    const previousData = queryClient.getQueryData(['/api/resources', resourceId]);

    // Optimistically update
    queryClient.setQueryData(['/api/resources', resourceId], (old: any) => ({
      ...old,
      likes: old.likes + 1,
      isLiked: true,
    }));

    // ✅ Return context for rollback
    return { previousData };
  },
  onError: (err, resourceId, context) => {
    // ✅ Rollback on error
    if (context?.previousData) {
      queryClient.setQueryData(['/api/resources', resourceId], context.previousData);
    }
    toast.error('Failed to like resource');
  },
  onSuccess: () => {
    toast.success('Resource liked!');
  },
  onSettled: (data, error, resourceId) => {
    // ✅ Always refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['/api/resources', resourceId] });
  },
});
```

**Optimistic Update Checklist**:
- [ ] `onMutate` saves previous data to context
- [ ] `onMutate` cancels outgoing queries
- [ ] `onError` rolls back using context
- [ ] `onSettled` refetches to ensure consistency
- [ ] User gets error feedback

### 7. Memory Leaks & Performance

#### Pitfall: Forgetting to Cleanup

**Symptom**: Memory grows over time, performance degrades.

**Problem**:
```typescript
// ❌ Query keeps running even when user isn't admin anymore
const { data: adminStats } = useQuery({
  queryKey: ['/api/admin/stats'],
  staleTime: 10000,
  refetchInterval: 10000, // Polls every 10 seconds forever!
});
```

**Solution**:
```typescript
// ✅ Only poll when user is admin
const { data: user } = useAuth();
const isAdmin = user?.role === 'admin';

const { data: adminStats } = useQuery({
  queryKey: ['/api/admin/stats'],
  enabled: isAdmin,
  staleTime: 10000,
  refetchInterval: isAdmin ? 10000 : false, // Stop polling when not admin
});
```

#### Pitfall: Too Many Simultaneous Queries

**Symptom**: Slow initial page load, network congestion.

**Problem**:
```typescript
// ❌ Fetches 50 resources individually
{resources.map(r => (
  <ResourceCard key={r.id} resourceId={r.id} />
))}

// In ResourceCard:
const { data } = useQuery({
  queryKey: ['/api/resources', resourceId],
});
```

**Solution**:
```typescript
// ✅ Fetch list with all needed data
const { data: resources } = useQuery({
  queryKey: ['/api/resources', { include: 'details' }],
  queryFn: () => apiRequest('/api/resources?include=details'),
});

// In ResourceCard:
<ResourceCard key={r.id} resource={r} /> // Pass data as prop
```

**Performance Tips**:
- Batch requests server-side when possible
- Use pagination/virtualization for long lists
- Prefetch predictable navigation (next page, related items)
- Set appropriate `staleTime` to reduce refetches

### 8. Error Handling Gaps

#### Pitfall: Silent Failures

**Symptom**: Users don't know why actions failed.

**Problem**:
```typescript
const mutation = useMutation({
  mutationFn: createResource,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
  },
  // ❌ No onError - failures are silent!
});
```

**Solution**:
```typescript
const mutation = useMutation({
  mutationFn: createResource,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
    toast.success('Resource created successfully!');
  },
  onError: (error: any) => {
    // ✅ Show user-friendly error message
    const message = error?.message || 'Failed to create resource';
    toast.error(message);

    // Optional: Track error for debugging
    trackError('create_resource_failed', message);
  },
});
```

**Error Handling Best Practices**:
- Always implement `onError` for mutations
- Show user-friendly error messages (not raw server errors)
- Provide actionable next steps when possible
- Track errors for debugging (but don't expose sensitive data)
- Use error boundaries for query errors in critical components

---

## Troubleshooting Guide

Quick solutions to common TanStack Query problems encountered in development.

### Problem: Query Not Refetching After Mutation

**Symptoms**:
- UI doesn't update after creating/updating/deleting data
- Data is stale even after successful mutation
- Manual page refresh shows updated data

**Debugging Steps**:

1. **Check if invalidation is called**:
```typescript
const mutation = useMutation({
  mutationFn: updateResource,
  onSuccess: () => {
    console.log('Before invalidation'); // Add this
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
    console.log('After invalidation'); // Add this
  },
});
```

2. **Verify query key matches**:
```typescript
// Query
queryKey: ['/api/resources', { category: 'tools' }]

// Invalidation - will this match?
queryKey: ['/api/resources'] // ✅ Yes (prefix match)
queryKey: ['/api/resource']  // ❌ No (typo!)
queryKey: ['/api/resources', { category: 'tools' }] // ✅ Yes (exact match)
```

3. **Check if query is enabled**:
```typescript
const { data } = useQuery({
  queryKey: ['/api/resources'],
  enabled: false, // ❌ Won't refetch even when invalidated!
});
```

4. **Use React Query DevTools**:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

**Common Causes & Fixes**:

| Cause | Fix |
|-------|-----|
| Typo in query key | Ensure exact match between query and invalidation |
| `enabled: false` | Only invalidate when query is enabled |
| Query unmounted | Invalidation only refetches mounted queries |
| Cache time expired | Query was garbage collected; it will refetch on next mount |
| Wrong `queryClient` instance | Use the same instance everywhere |

**Solution Template**:
```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    const response = await apiRequest('/api/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  },
  onSuccess: () => {
    // Invalidate all resource queries
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });

    // Also invalidate related queries if needed
    queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });

    // Provide user feedback
    toast.success('Resource created successfully');
  },
  onError: (error: any) => {
    toast.error(error?.message || 'Failed to create resource');
  },
});
```

### Problem: Infinite Loading State

**Symptoms**:
- Component stuck in loading state forever
- Spinner never disappears
- `isLoading` is always `true`

**Debugging Steps**:

1. **Check network tab**:
   - Is request completing?
   - What's the status code?
   - Is there a CORS error?

2. **Check query configuration**:
```typescript
const { data, isLoading, isError, error } = useQuery({
  queryKey: ['/api/resources'],
});

console.log({ isLoading, isError, error }); // Debug current state
```

3. **Check for promise resolution**:
```typescript
// ❌ Bad - queryFn doesn't return promise
queryFn: async () => {
  fetch('/api/resources'); // Missing return!
}

// ✅ Good
queryFn: async () => {
  return fetch('/api/resources').then(r => r.json());
}
```

**Common Causes & Fixes**:

| Cause | Fix |
|-------|-----|
| queryFn not returning | Add `return` statement |
| Network request failing silently | Check error state: `isError`, `error` |
| Query depends on undefined param | Use `enabled: !!param` |
| Global queryFn override | Provide explicit `queryFn` for the query |
| Request hangs indefinitely | Set timeout in fetch options |

**Solution Template**:
```typescript
const { data, isLoading, isError, error } = useQuery({
  queryKey: ['/api/resources', resourceId],
  queryFn: async () => {
    // ✅ Always return the promise
    return apiRequest(`/api/resources/${resourceId}`);
  },
  enabled: !!resourceId, // ✅ Guard against undefined params
  retry: false, // ✅ Fail fast for debugging
});

// ✅ Handle all states
if (isLoading) return <LoadingSpinner />;
if (isError) return <ErrorMessage error={error} />;
if (!data) return <div>No data</div>;

return <ResourceView data={data} />;
```

### Problem: Data Not Updating After Login/Logout

**Symptoms**:
- Old user data persists after logout
- New user data doesn't load after login
- Mixed data from different users

**Solution**:

```typescript
// In logout handler
const logout = async () => {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });

    // ✅ Clear all queries on logout
    queryClient.clear();

    // Alternative: Remove specific queries only
    // queryClient.removeQueries({ queryKey: ['/api/auth/user'] });
    // queryClient.removeQueries({ queryKey: ['/api/user/'] });

    toast.success('Logged out successfully');
    navigate('/login');
  } catch (error) {
    toast.error('Logout failed');
  }
};

// In login handler
const login = async (credentials) => {
  try {
    const user = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // ✅ Invalidate user query to fetch fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

    toast.success('Logged in successfully');
    navigate('/');
  } catch (error) {
    toast.error('Login failed');
  }
};
```

**Important**: Use `queryClient.clear()` on logout to remove all cached data, preventing data leaks between user sessions.

### Problem: 401 Errors Keep Retrying

**Symptoms**:
- Login UI is delayed
- Multiple failed 401 requests in network tab
- Poor user experience during auth failures

**Solution**:

```typescript
// ✅ Configure retry logic to skip auth errors
const { data } = useQuery({
  queryKey: ['/api/auth/user'],
  retry: (failureCount, error: any) => {
    // Never retry authentication/authorization errors
    if (error?.status === 401 || error?.status === 403) {
      return false;
    }
    // Retry other errors (network, 5xx) up to 3 times
    return failureCount < 3;
  },
});
```

**Global Configuration** (already in place):
```typescript
// client/src/lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Default: no retries
    },
  },
});
```

**When to Override**:
- Only enable retry for queries that benefit from it
- Always exclude 401/403 from retry logic
- Document why retry is enabled

### Problem: Stale Data After Navigation

**Symptoms**:
- Old data shows briefly after navigation
- Flash of incorrect content
- Data from previous page persists

**Causes**:
1. **Shared query keys** - Different pages using same key
2. **Long `staleTime`** - Data marked fresh longer than needed
3. **Missing invalidation** - Related queries not invalidated

**Solution**:

```typescript
// Option 1: Use unique query keys per page/view
const { data } = useQuery({
  queryKey: ['/api/resources', { page, category, view: 'list' }],
  //                                              ^^^^^^^^^^^^^ Unique per view
});

// Option 2: Invalidate on navigation
useEffect(() => {
  // Invalidate when component unmounts
  return () => {
    queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
  };
}, []);

// Option 3: Prefetch new data before navigation
const navigate = useNavigate();
const prefetchAndNavigate = async (path: string) => {
  await queryClient.prefetchQuery({
    queryKey: ['/api/resources', { page: 1 }],
    queryFn: () => apiRequest('/api/resources?page=1'),
  });
  navigate(path);
};
```

### Problem: Query Runs When It Shouldn't

**Symptoms**:
- Query executes even though conditions aren't met
- Errors from undefined/null parameters
- Unnecessary network requests

**Solution**:

```typescript
// ❌ Problem: Query runs even when userId is undefined
const { data } = useQuery({
  queryKey: ['/api/user/profile', userId],
  queryFn: () => apiRequest(`/api/user/profile/${userId}`),
});

// ✅ Solution: Use enabled to control execution
const { data } = useQuery({
  queryKey: ['/api/user/profile', userId],
  queryFn: () => apiRequest(`/api/user/profile/${userId}`),
  enabled: !!userId && isAuthenticated, // Multiple conditions
});
```

**Complex Conditions**:
```typescript
const shouldFetch = useMemo(() => {
  return (
    !!userId &&
    isAuthenticated &&
    !isLoading &&
    hasPermission('view_profile')
  );
}, [userId, isAuthenticated, isLoading, hasPermission]);

const { data } = useQuery({
  queryKey: ['/api/user/profile', userId],
  enabled: shouldFetch,
});
```

### Problem: Mutation Success but UI Not Updating

**Symptoms**:
- Server confirms success (200 OK)
- Database shows updated data
- UI still shows old data

**Debugging Checklist**:

- [ ] Is `onSuccess` being called?
- [ ] Are you invalidating the correct query keys?
- [ ] Is the component still mounted?
- [ ] Are you using the same `queryClient` instance?
- [ ] Is the query enabled?

**Solution**:

```typescript
const updateMutation = useMutation({
  mutationFn: (data) => apiRequest(`/api/resources/${data.id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  onSuccess: (updatedResource) => {
    // ✅ Method 1: Invalidate to refetch
    queryClient.invalidateQueries({
      queryKey: ['/api/resources'] // Invalidate list
    });
    queryClient.invalidateQueries({
      queryKey: ['/api/resources', updatedResource.id] // Invalidate detail
    });

    // ✅ Method 2: Update cache directly (faster UX)
    queryClient.setQueryData(
      ['/api/resources', updatedResource.id],
      updatedResource
    );

    // Then invalidate list to be safe
    queryClient.invalidateQueries({
      queryKey: ['/api/resources'],
      exact: false,
    });

    toast.success('Resource updated successfully');
  },
});
```

### Problem: DevTools Not Showing

**Symptoms**:
- React Query DevTools don't appear
- No floating icon in corner
- Can't inspect cache

**Solutions**:

1. **Check DevTools are installed**:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} /> {/* Add this */}
    </QueryClientProvider>
  );
}
```

2. **Check production build**:
DevTools are automatically excluded in production builds. To include them:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Force enable in production (not recommended)
<ReactQueryDevtools initialIsOpen={false} />
```

3. **Check z-index conflicts**:
```css
/* DevTools might be behind other elements */
/* Inspect with browser DevTools and adjust z-index if needed */
```

### Problem: Type Errors with Query Data

**Symptoms**:
- TypeScript errors: `Object is possibly 'undefined'`
- Data type is `unknown`
- No autocomplete for data properties

**Solution**:

```typescript
// ❌ Problem: data is typed as unknown
const { data } = useQuery({
  queryKey: ['/api/resources'],
});

// ✅ Solution: Provide generic type
interface Resource {
  id: string;
  title: string;
  category: string;
}

const { data } = useQuery<Resource[]>({
  queryKey: ['/api/resources'],
});

// ✅ Handle undefined state
if (!data) return <div>Loading...</div>;

// Now data is typed as Resource[] and TypeScript is happy
data.map(r => r.title); // ✅ Autocomplete works
```

**For Mutations**:
```typescript
interface CreateResourceInput {
  title: string;
  url: string;
}

interface Resource {
  id: string;
  title: string;
  url: string;
}

const mutation = useMutation<
  Resource,              // TData - response type
  Error,                 // TError - error type
  CreateResourceInput,   // TVariables - input type
  unknown                // TContext - onMutate context type
>({
  mutationFn: (input) => apiRequest('/api/resources', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
});

// Now fully typed:
mutation.mutate({ title: 'Test', url: 'https://example.com' });
```

### Quick Debugging Commands

```typescript
// Log all queries in cache
console.log(queryClient.getQueryCache().getAll());

// Log specific query state
console.log(queryClient.getQueryState(['/api/resources']));

// Log specific query data
console.log(queryClient.getQueryData(['/api/resources']));

// Check if query is fetching
console.log(queryClient.isFetching({ queryKey: ['/api/resources'] }));

// Get all query keys
const queries = queryClient.getQueryCache().getAll();
console.log(queries.map(q => q.queryKey));

// Force refetch specific query
queryClient.refetchQueries({ queryKey: ['/api/resources'] });

// Remove query from cache
queryClient.removeQueries({ queryKey: ['/api/resources'] });
```

### Getting Help

If you're still stuck after trying these solutions:

1. **Check React Query DevTools**: Inspect query state, cache, and mutations
2. **Check Network Tab**: Verify requests are being sent and responses received
3. **Check Console**: Look for errors or warnings
4. **Add Debug Logging**: Log query states, data, and errors
5. **Simplify**: Remove options one by one to isolate the issue
6. **Review Documentation**: Check [TanStack Query docs](https://tanstack.com/query/latest/docs/react/overview) for the specific feature
7. **Check Version**: Ensure you're using TanStack Query v5 (breaking changes from v4)

**Common Documentation Links**:
- [Query Keys](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [Query Functions](https://tanstack.com/query/latest/docs/react/guides/query-functions)
- [Invalidations](https://tanstack.com/query/latest/docs/react/guides/query-invalidation)
- [Mutations](https://tanstack.com/query/latest/docs/react/guides/mutations)
- [Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)

---

## Summary

### Quick Reference Card

| Pattern | Use Case | Example |
|---------|----------|---------|
| `useQuery` | Fetch data | `useQuery({ queryKey: ['/api/resources'] })` |
| `useMutation` | Modify data | `useMutation({ mutationFn: createResource })` |
| `invalidateQueries` | Refetch stale data | `queryClient.invalidateQueries({ queryKey: ['/api/resources'] })` |
| `setQueryData` | Update cache directly | `queryClient.setQueryData(['/api/auth/user'], newData)` |
| `enabled` | Conditional fetch | `useQuery({ ..., enabled: !!userId })` |
| `staleTime` | Cache duration | `useQuery({ ..., staleTime: 5 * 60 * 1000 })` |
| `retry` | Error retry logic | `retry: (count, err) => err.status !== 401 && count < 3` |

### Key Takeaways

1. **Query keys** use `/api/endpoint` format
2. **Default staleTime** is `Infinity` - override when you need fresher data
3. **Always invalidate** related queries after mutations
4. **Use `enabled`** for conditional queries
5. **Don't retry 401s** - they indicate auth failures, not transient errors
6. **Use `apiRequest`** helper for consistent error handling and analytics

---

**Related Documentation**:
- [API Reference](./API.md) - Complete API endpoint documentation
- [Architecture Overview](./ARCHITECTURE.md) - System architecture and data flow
- [Code Map](./CODE-MAP.md) - Codebase navigation guide
