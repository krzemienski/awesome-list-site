import { createHash } from "crypto";
import { storage } from "./storage";
import { getPublicCacheValue } from "./cache/publicCache";
import { ResourceRepository } from "./repositories";
import { loadHomeFeed } from "./routes/domains/home-feed";

/**
 * Shared public Home data loaders. They intentionally call the same backing
 * repositories/cache namespaces as the JSON endpoints, rather than issuing
 * loopback HTTP from document rendering.
 */
export async function loadHomeNav() {
  const payload = await getPublicCacheValue({
    namespace: "catalog-nav",
    key: "complete",
    ttlMs: 60_000,
    load: async () => {
      const data = await storage.getAwesomeListFromDatabase();
      if (!data?.categories?.length) throw new Error("No awesome list data available");
      const nav = {
        title: data.title,
        totalResources: (data.resources || []).length,
        categories: (data.categories || []).map((cat: any) => {
          const first =
            cat.resources?.[0] ??
            (cat.subcategories || [])
              .flatMap((sub: any) => [
                ...(sub.resources || []),
                ...(sub.subSubcategories || []).flatMap((ss: any) => ss.resources || []),
              ])
              .find(Boolean);
          return {
            name: cat.name,
            slug: cat.slug,
            resourceCount: (cat.resources || []).length,
            teaser: first
              ? {
                  title: String(first.title || ""),
                  description: String(first.description || "").slice(0, 200),
                }
              : undefined,
            subcategories: (cat.subcategories || []).map((sub: any) => ({
              name: sub.name,
              slug: sub.slug,
              resourceCount: (sub.resources || []).length,
              subSubcategories: (sub.subSubcategories || []).map((ss: any) => ({
                name: ss.name,
                slug: ss.slug,
                resourceCount: (ss.resources || []).length,
              })),
            })),
          };
        }),
      };
      const body = JSON.stringify(nav);
      return { nav, body, etag: `"${createHash("sha1").update(body).digest("hex")}"` };
    },
  });
  // The existing API endpoint populated this namespace before SSR existed and
  // stores only {body, etag}; accept that established cache shape too.
  return payload.nav ?? JSON.parse(payload.body);
}

export async function loadHomeKindCounts() {
  const resourceRepo = new ResourceRepository();
  return getPublicCacheValue({
    namespace: "catalog-taxonomy",
    key: "kind-counts:",
    ttlMs: 60_000,
    load: () => resourceRepo.getResourceKindCounts({ category: undefined }),
  });
}

export async function loadHomeSSRData() {
  const [nav, home, kindCounts] = await Promise.all([
    loadHomeNav(),
    loadHomeFeed(),
    loadHomeKindCounts(),
  ]);
  return { nav, home, kindCounts };
}