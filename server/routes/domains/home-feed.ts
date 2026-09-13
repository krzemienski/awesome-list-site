import type { Express, RequestHandler } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { resources } from "@shared/schema";
import { db } from "../../db";
import { getPublicCacheValue } from "../../cache/publicCache";
import { CATALOG_CACHE_CONTROL } from "../../http-cache-policy";
import { stripInternalResourceFields } from "../../lib/publicResource";
import { isDatabaseUnavailableError } from "../../db/errors";
import { ServiceUnavailableError } from "../../middleware/errors";
import { asyncHandler } from "../../middleware/asyncHandler";

/** Home-only public projection: bounded feeds, no corpus download or per-row queries. */
export function registerHomeFeed(app: Express, limiter: RequestHandler) {
  app.get("/api/home", limiter, asyncHandler(async (_req, res) => {
    try {
      const payload = await getPublicCacheValue({
        namespace: "catalog-body",
        key: "home-feed-v1",
        ttlMs: 60_000,
        load: async () => {
          const approved = eq(resources.status, "approved");
          const featured = sql`${resources.metadata}->'featured' = 'true'::jsonb`;
          // Older imports have no approval timestamp; their creation time is
          // the only available indexing date. Updates never make a row recent.
          const indexedAt = sql`coalesce(${resources.approvedAt}, ${resources.createdAt})`;
          const [stats, recent, picks] = await Promise.all([
            db.select({
              total: sql<number>`count(*)::int`,
              approvedThisWeek: sql<number>`count(*) filter (where ${indexedAt} >= now() - interval '7 days' and ${indexedAt} <= now())::int`,
              featuredCount: sql<number>`count(*) filter (where ${featured})::int`,
            }).from(resources).where(approved),
            db.select().from(resources).where(approved)
              .orderBy(sql`${indexedAt} desc nulls last`, desc(resources.id)).limit(5),
            db.select().from(resources).where(and(approved, featured))
              .orderBy(sql`${indexedAt} desc nulls last`, desc(resources.id)).limit(6),
          ]);
          return {
            ...stats[0],
            recent: recent.map(stripInternalResourceFields),
            featured: picks.map(stripInternalResourceFields),
          };
        },
      });
      res.set("Cache-Control", CATALOG_CACHE_CONTROL).json(payload);
    } catch (error) {
      if (error instanceof ServiceUnavailableError || isDatabaseUnavailableError(error)) {
        res.status(503).set("Retry-After", "1").json({ message: "Service is temporarily unavailable" });
      } else {
        console.error("Home feed failed", error);
        res.status(500).json({ message: "Could not load the home feed" });
      }
    }
  }));
}