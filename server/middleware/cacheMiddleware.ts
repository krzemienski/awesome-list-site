import { Request, Response, NextFunction } from 'express';
import { redisCache, CACHE_TTL } from '../cache/redisCache';
import * as crypto from 'crypto';
// Note: Request.user type is declared globally in supabaseAuth.ts

/**
 * HTTP Response Caching Middleware
 *
 * Provides automatic response caching with:
 * - ETag support for conditional requests
 * - Cache-Control headers for browser caching
 * - Redis backend for server-side caching
 * - Stale-while-revalidate support
 */

interface CacheOptions {
  /** TTL in seconds */
  ttl: number;
  /** Include query params in cache key */
  includeQuery?: boolean;
  /** Custom key prefix */
  keyPrefix?: string;
  /** Skip cache for authenticated users */
  skipAuth?: boolean;
  /** Add stale-while-revalidate header */
  staleWhileRevalidate?: number;
}

/**
 * Generate a cache key from request
 */
function generateCacheKey(req: Request, options: CacheOptions): string {
  const parts = [
    options.keyPrefix || 'http',
    req.method,
    req.path,
  ];

  if (options.includeQuery && Object.keys(req.query).length > 0) {
    // Sort query params for consistent keys
    const sortedQuery = Object.keys(req.query)
      .sort()
      .map((k) => `${k}=${req.query[k]}`)
      .join('&');
    parts.push(sortedQuery);
  }

  return parts.join(':');
}

/**
 * Generate ETag from content
 */
function generateETag(content: string | Buffer): string {
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return `"${hash.substring(0, 16)}"`;
}

/**
 * Build Cache-Control header value
 */
function buildCacheControlHeader(options: CacheOptions, isPublic: boolean): string {
  const directives: string[] = [];

  directives.push(isPublic ? 'public' : 'private');
  directives.push(`max-age=${options.ttl}`);

  if (options.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }

  return directives.join(', ');
}

/**
 * Cache middleware factory
 *
 * Usage:
 * ```
 * app.get('/api/categories', cacheMiddleware({ ttl: CACHE_TTL.CATEGORIES }), handler)
 * ```
 */
export function cacheMiddleware(options: CacheOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache for authenticated users if specified
    if (options.skipAuth && req.user) {
      return next();
    }

    const cacheKey = generateCacheKey(req, options);

    try {
      // Try to get cached response
      const cached = await redisCache.get<{
        body: any;
        etag: string;
        contentType: string;
      }>(cacheKey);

      if (cached) {
        // Check If-None-Match header for 304 response
        const clientETag = req.headers['if-none-match'];
        if (clientETag && clientETag === cached.etag) {
          return res.status(304).end();
        }

        // Return cached response
        res.set({
          'Content-Type': cached.contentType,
          'Cache-Control': buildCacheControlHeader(options, !req.user),
          'ETag': cached.etag,
          'X-Cache': 'HIT',
        });

        return res.json(cached.body);
      }
    } catch (error) {
      console.error('[CacheMiddleware] Error fetching cached response:', error);
      // Continue without cache on error
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const bodyStr = JSON.stringify(body);
        const etag = generateETag(bodyStr);

        // Set cache headers
        res.set({
          'Cache-Control': buildCacheControlHeader(options, !req.user),
          'ETag': etag,
          'X-Cache': 'MISS',
        });

        // Store in Redis (async, don't await)
        redisCache
          .set(
            cacheKey,
            {
              body,
              etag,
              contentType: 'application/json',
            },
            options.ttl
          )
          .catch((err) => {
            console.error('[CacheMiddleware] Error caching response:', err);
          });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Preset cache middleware configurations
 */
export const cachePresets = {
  /**
   * Categories - stable data, cache for 1 hour
   */
  categories: cacheMiddleware({
    ttl: CACHE_TTL.CATEGORIES,
    keyPrefix: 'cat',
    staleWhileRevalidate: 60 * 5, // 5 min stale OK
  }),

  /**
   * Resources list - dynamic, cache for 5 minutes
   */
  resources: cacheMiddleware({
    ttl: CACHE_TTL.RESOURCES_LIST,
    keyPrefix: 'res',
    includeQuery: true,
    staleWhileRevalidate: 60, // 1 min stale OK
  }),

  /**
   * Single resource - cache for 10 minutes
   */
  resource: cacheMiddleware({
    ttl: CACHE_TTL.RESOURCE_SINGLE,
    keyPrefix: 'res',
  }),

  /**
   * Journeys list - cache for 30 minutes
   */
  journeys: cacheMiddleware({
    ttl: CACHE_TTL.JOURNEYS_LIST,
    keyPrefix: 'jrn',
    includeQuery: true,
    staleWhileRevalidate: 60 * 5,
  }),

  /**
   * Single journey - cache for 30 minutes
   */
  journey: cacheMiddleware({
    ttl: CACHE_TTL.JOURNEY_SINGLE,
    keyPrefix: 'jrn',
  }),

  /**
   * Subcategories - stable, cache for 1 hour
   */
  subcategories: cacheMiddleware({
    ttl: CACHE_TTL.SUBCATEGORIES,
    keyPrefix: 'subcat',
    includeQuery: true,
    staleWhileRevalidate: 60 * 5,
  }),

  /**
   * Search results - cache for 5 minutes
   */
  search: cacheMiddleware({
    ttl: CACHE_TTL.SEARCH_RESULTS,
    keyPrefix: 'search',
    includeQuery: true,
  }),
};

/**
 * Cache invalidation helper - call after mutations
 */
export async function invalidateRelatedCaches(
  entity: 'resources' | 'categories' | 'journeys' | 'all'
): Promise<void> {
  switch (entity) {
    case 'resources':
      await redisCache.invalidateResources();
      break;
    case 'categories':
      await redisCache.invalidateCategories();
      await redisCache.invalidateResources(); // Categories affect resource filtering
      break;
    case 'journeys':
      await redisCache.invalidateJourneys();
      break;
    case 'all':
      await redisCache.clearAll();
      break;
  }
}

/**
 * Set browser cache headers for static-ish API responses
 */
export function setBrowserCacheHeaders(
  res: Response,
  maxAge: number = 60,
  isPublic: boolean = true
): void {
  res.set({
    'Cache-Control': `${isPublic ? 'public' : 'private'}, max-age=${maxAge}`,
    'Vary': 'Accept-Encoding',
  });
}
