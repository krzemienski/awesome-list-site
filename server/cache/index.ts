/**
 * Cache Module - Redis-backed caching for API responses
 *
 * This module provides:
 * - Centralized Redis cache service
 * - HTTP response caching middleware with ETag support
 * - Cache invalidation helpers
 * - TTL configuration constants
 *
 * Usage:
 * ```typescript
 * import { redisCache, CACHE_TTL, CACHE_KEYS } from './cache';
 * import { cachePresets, invalidateRelatedCaches } from './cache';
 * ```
 */

export {
  redisCache,
  CACHE_TTL,
  CACHE_KEYS,
  buildResourcesKey,
  type CacheConfig,
  type CacheStats,
} from './redisCache';
