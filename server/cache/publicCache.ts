/**
 * The process-local public cache has one policy for every public catalog
 * representation. It never stores moderation/admin/session data.
 *
 * Policy:
 * - schema version is embedded in every key
 * - values expire after their caller-supplied TTL (normally 60 seconds)
 * - identical misses coalesce into one loader
 * - invalidation increments a generation and clears all public entries
 * - an in-flight loader from an older generation is discarded and retried
 * - loader failures are never replaced with invented/stale success data
 * - committed entries, approximate bytes, and concurrent rebuilds are bounded
 */
import { ServiceUnavailableError } from "../middleware/errors";

export const PUBLIC_CACHE_SCHEMA_VERSION = 1;

export type PublicCacheNamespace =
  | "catalog-body"
  | "catalog-nav"
  | "catalog-taxonomy"
  | "catalog-tree"
  | "route-meta";

export type PublicCacheInvalidationReason =
  | "category-mutation"
  | "manual"
  | "resource-mutation"
  | "seed-mutation"
  | "tag-mutation";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  bytes: number;
  generation: number;
};

type CacheMetrics = {
  hits: number;
  misses: number;
  coalesced: number;
  rebuilds: number;
  rebuildFailures: number;
  discardedRebuilds: number;
  rejectedRebuilds: number;
};

const MAX_ENTRIES = 512;
const MAX_BYTES = 24 * 1024 * 1024;
const MAX_IN_FLIGHT = 64;

const entries = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();
const metrics = new Map<PublicCacheNamespace, CacheMetrics>();
const invalidations: Record<PublicCacheInvalidationReason, number> = {
  "category-mutation": 0,
  manual: 0,
  "resource-mutation": 0,
  "seed-mutation": 0,
  "tag-mutation": 0,
};
let generation = 1;
let bytes = 0;
let evictions = 0;

function namespaceMetrics(namespace: PublicCacheNamespace): CacheMetrics {
  const current = metrics.get(namespace) ?? {
    hits: 0,
    misses: 0,
    coalesced: 0,
    rebuilds: 0,
    rebuildFailures: 0,
    discardedRebuilds: 0,
    rejectedRebuilds: 0,
  };
  metrics.set(namespace, current);
  return current;
}

function fullKey(namespace: PublicCacheNamespace, key: string): string {
  return `public:v${PUBLIC_CACHE_SCHEMA_VERSION}:${namespace}:${key}`;
}

function estimateBytes(value: unknown): number {
  if (typeof value === "string") return Buffer.byteLength(value);
  try {
    return Buffer.byteLength(JSON.stringify(value));
  } catch {
    return 1024;
  }
}

function removeEntry(key: string): void {
  const existing = entries.get(key);
  if (!existing) return;
  bytes = Math.max(0, bytes - existing.bytes);
  entries.delete(key);
}

function evictToBounds(): void {
  while (entries.size > MAX_ENTRIES || bytes > MAX_BYTES) {
    const oldest = entries.keys().next().value as string | undefined;
    if (!oldest) break;
    removeEntry(oldest);
    evictions++;
  }
}

export async function getPublicCacheValue<T>(options: {
  namespace: PublicCacheNamespace;
  key: string;
  ttlMs: number;
  load: () => Promise<T>;
}): Promise<T> {
  const key = fullKey(options.namespace, options.key);
  const stats = namespaceMetrics(options.namespace);

  // Retry if a successful mutation changes the generation while a rebuild is
  // in flight. This prevents an old result from either repopulating the cache
  // or being returned after the mutation has completed.
  for (;;) {
    const requestGeneration = generation;
    const now = Date.now();
    const cached = entries.get(key) as CacheEntry<T> | undefined;
    if (
      cached &&
      cached.generation === requestGeneration &&
      cached.expiresAt > now
    ) {
      stats.hits++;
      // Refresh insertion order for simple LRU eviction.
      entries.delete(key);
      entries.set(key, cached);
      return cached.value;
    }
    if (cached) removeEntry(key);
    stats.misses++;

    const flightKey = `${requestGeneration}:${key}`;
    let loader = inFlight.get(flightKey) as Promise<T> | undefined;
    if (loader) {
      stats.coalesced++;
    } else {
      if (inFlight.size >= MAX_IN_FLIGHT) {
        stats.rejectedRebuilds++;
        throw new ServiceUnavailableError(
          "Public cache rebuild capacity is temporarily full",
        );
      }
      stats.rebuilds++;
      loader = options.load();
      inFlight.set(flightKey, loader);
    }

    try {
      const value = await loader;
      if (generation !== requestGeneration) {
        stats.discardedRebuilds++;
        continue;
      }

      const entry: CacheEntry<T> = {
        value,
        expiresAt: Date.now() + options.ttlMs,
        bytes: estimateBytes(value),
        generation: requestGeneration,
      };
      removeEntry(key);
      entries.set(key, entry);
      bytes += entry.bytes;
      evictToBounds();
      return value;
    } catch (error) {
      stats.rebuildFailures++;
      throw error;
    } finally {
      if (inFlight.get(flightKey) === loader) inFlight.delete(flightKey);
    }
  }
}

export function invalidatePublicCache(reason: PublicCacheInvalidationReason): void {
  generation++;
  invalidations[reason]++;
  entries.clear();
  bytes = 0;
  console.log(
    JSON.stringify({
      event: "ops.public_cache_invalidated",
      reason,
      generation,
    }),
  );
}

export function getPublicCacheSnapshot() {
  return {
    policy: {
      schemaVersion: PUBLIC_CACHE_SCHEMA_VERSION,
      maxEntries: MAX_ENTRIES,
      maxBytes: MAX_BYTES,
      maxInFlight: MAX_IN_FLIGHT,
      staleOnError: false,
      processLocal: true,
    },
    generation,
    entries: entries.size,
    bytes,
    inFlight: inFlight.size,
    evictions,
    invalidations: { ...invalidations },
    namespaces: Object.fromEntries(metrics.entries()),
  };
}