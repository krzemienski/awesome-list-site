import Redis from 'ioredis';

/**
 * Redis Cache Service - Centralized caching for API responses
 *
 * TTL Strategy (optimized for awesome-list usage patterns):
 * - Categories: 1 hour (rarely changes, high traffic)
 * - Resources list: 5 minutes (frequent updates, paginated)
 * - Individual resource: 10 minutes (moderate access)
 * - Journeys: 30 minutes (infrequent changes)
 * - Admin stats: 2 minutes (needs freshness for dashboards)
 * - AI responses: 1 hour (expensive to generate)
 * - URL analysis: 24 hours (static content analysis)
 *
 * Cache Key Patterns:
 * - cache:categories - hierarchical categories
 * - cache:resources:{page}:{limit}:{filters} - paginated resources
 * - cache:resource:{id} - single resource
 * - cache:journeys - learning journeys list
 * - cache:journey:{id} - single journey with steps
 * - cache:stats - admin statistics
 * - cache:ai:{hash} - AI-generated responses
 */

export interface CacheConfig {
  prefix: string;
  defaultTTL: number; // seconds
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keysCount: number;
  memoryUsage: string;
}

// TTL constants in seconds
export const CACHE_TTL = {
  CATEGORIES: 60 * 60,           // 1 hour - stable, high traffic
  RESOURCES_LIST: 5 * 60,        // 5 minutes - frequently accessed
  RESOURCE_SINGLE: 10 * 60,      // 10 minutes - individual lookups
  JOURNEYS_LIST: 30 * 60,        // 30 minutes - rarely changes
  JOURNEY_SINGLE: 30 * 60,       // 30 minutes
  ADMIN_STATS: 2 * 60,           // 2 minutes - needs freshness
  SUBCATEGORIES: 60 * 60,        // 1 hour - stable
  SUB_SUBCATEGORIES: 60 * 60,    // 1 hour - stable
  AI_RESPONSE: 60 * 60,          // 1 hour - expensive to generate
  AI_URL_ANALYSIS: 24 * 60 * 60, // 24 hours - static analysis
  RECOMMENDATIONS: 5 * 60,       // 5 minutes - personalized
  SEARCH_RESULTS: 5 * 60,        // 5 minutes - dynamic
} as const;

// Cache key prefixes for organization
export const CACHE_KEYS = {
  CATEGORIES: 'cache:categories',
  RESOURCES: 'cache:resources',
  RESOURCE: 'cache:resource',
  JOURNEYS: 'cache:journeys',
  JOURNEY: 'cache:journey',
  STATS: 'cache:stats',
  SUBCATEGORIES: 'cache:subcategories',
  SUB_SUBCATEGORIES: 'cache:subsubcategories',
  AI: 'cache:ai',
  RECOMMENDATIONS: 'cache:recommendations',
} as const;

class RedisCacheService {
  private static instance: RedisCacheService;
  private redis: Redis | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<boolean> | null = null;
  private stats = { hits: 0, misses: 0 };

  private constructor() {
    this.connectionPromise = this.connect();
  }

  public static getInstance(): RedisCacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService();
    }
    return RedisCacheService.instance;
  }

  /**
   * Connect to Redis with retry logic
   */
  private async connect(): Promise<boolean> {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.log('[RedisCache] REDIS_URL not configured - caching disabled');
      return false;
    }

    return new Promise((resolve) => {
      try {
        this.redis = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              console.error('[RedisCache] Connection failed after 3 retries');
              return null;
            }
            return Math.min(times * 200, 1000);
          },
          connectTimeout: 5000,
        });

        this.redis.on('ready', () => {
          console.log('[RedisCache] Connected successfully');
          this.isConnected = true;
          resolve(true);
        });

        this.redis.on('error', (err) => {
          console.error('[RedisCache] Error:', err.message);
        });

        this.redis.on('close', () => {
          this.isConnected = false;
          console.log('[RedisCache] Connection closed');
        });

        this.redis.connect().catch((err) => {
          console.error('[RedisCache] Failed to connect:', err.message);
          this.redis = null;
          resolve(false);
        });

        // Timeout fallback
        setTimeout(() => {
          if (!this.isConnected) {
            console.warn('[RedisCache] Connection timeout - caching disabled');
            this.redis?.disconnect();
            this.redis = null;
            resolve(false);
          }
        }, 5000);

      } catch (error) {
        console.error('[RedisCache] Initialization error:', error);
        resolve(false);
      }
    });
  }

  /**
   * Ensure Redis is ready before operations
   */
  private async ensureConnected(): Promise<Redis | null> {
    if (this.connectionPromise) {
      await this.connectionPromise;
    }
    return this.isConnected && this.redis ? this.redis : null;
  }

  /**
   * Check if cache is available
   */
  public isAvailable(): boolean {
    return this.isConnected && this.redis !== null;
  }

  /**
   * Get a value from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    const redis = await this.ensureConnected();
    if (!redis) return null;

    try {
      const value = await redis.get(key);
      if (value) {
        this.stats.hits++;
        return JSON.parse(value) as T;
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error(`[RedisCache] Get error for ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  public async set<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
    const redis = await this.ensureConnected();
    if (!redis) return false;

    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`[RedisCache] Set error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a specific key
   */
  public async delete(key: string): Promise<boolean> {
    const redis = await this.ensureConnected();
    if (!redis) return false;

    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error(`[RedisCache] Delete error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  public async deletePattern(pattern: string): Promise<number> {
    const redis = await this.ensureConnected();
    if (!redis) return 0;

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error(`[RedisCache] DeletePattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate categories cache
   */
  public async invalidateCategories(): Promise<void> {
    await this.delete(CACHE_KEYS.CATEGORIES);
    await this.deletePattern(`${CACHE_KEYS.SUBCATEGORIES}:*`);
    await this.deletePattern(`${CACHE_KEYS.SUB_SUBCATEGORIES}:*`);
  }

  /**
   * Invalidate resources cache (on CRUD operations)
   */
  public async invalidateResources(): Promise<void> {
    await this.deletePattern(`${CACHE_KEYS.RESOURCES}:*`);
    await this.delete(CACHE_KEYS.STATS);
  }

  /**
   * Invalidate single resource cache
   */
  public async invalidateResource(id: string): Promise<void> {
    await this.delete(`${CACHE_KEYS.RESOURCE}:${id}`);
  }

  /**
   * Invalidate journeys cache
   */
  public async invalidateJourneys(): Promise<void> {
    await this.delete(CACHE_KEYS.JOURNEYS);
    await this.deletePattern(`${CACHE_KEYS.JOURNEY}:*`);
  }

  /**
   * Invalidate stats cache
   */
  public async invalidateStats(): Promise<void> {
    await this.delete(CACHE_KEYS.STATS);
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<CacheStats> {
    const redis = await this.ensureConnected();

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    let keysCount = 0;
    let memoryUsage = 'N/A';

    if (redis) {
      try {
        const info = await redis.info('memory');
        const memMatch = info.match(/used_memory_human:([^\r\n]+)/);
        if (memMatch) {
          memoryUsage = memMatch[1];
        }

        const keys = await redis.keys('cache:*');
        keysCount = keys.length;
      } catch (error) {
        console.error('[RedisCache] Stats error:', error);
      }
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      keysCount,
      memoryUsage,
    };
  }

  /**
   * Clear all cache entries
   */
  public async clearAll(): Promise<boolean> {
    const redis = await this.ensureConnected();
    if (!redis) return false;

    try {
      const keys = await redis.keys('cache:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      console.log(`[RedisCache] Cleared ${keys.length} keys`);
      return true;
    } catch (error) {
      console.error('[RedisCache] Clear error:', error);
      return false;
    }
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  public async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute the value
    const value = await fetchFn();

    // Cache it (don't await, fire and forget)
    this.set(key, value, ttlSeconds).catch((err) => {
      console.error(`[RedisCache] Background set error for ${key}:`, err);
    });

    return value;
  }

  /**
   * Build a cache key from components
   */
  public buildKey(...parts: (string | number | undefined | null)[]): string {
    return parts
      .filter((p) => p !== undefined && p !== null && p !== '')
      .join(':');
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const redisCache = RedisCacheService.getInstance();

// Export utility function for building resource list cache keys
export function buildResourcesKey(options: {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  subcategory?: string;
  search?: string;
}): string {
  const { page = 1, limit = 20, status, category, subcategory, search } = options;
  return redisCache.buildKey(
    CACHE_KEYS.RESOURCES,
    `p${page}`,
    `l${limit}`,
    status ? `s-${status}` : undefined,
    category ? `c-${category.substring(0, 20)}` : undefined,
    subcategory ? `sc-${subcategory.substring(0, 20)}` : undefined,
    search ? `q-${search.substring(0, 30)}` : undefined
  );
}
