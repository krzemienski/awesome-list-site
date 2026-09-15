import { createHash } from "crypto";
import { getPublicCacheValue } from "./cache/publicCache";
import { ResourceRepository } from "./repositories";
import { HomeNavRepository } from "./repositories/HomeNavRepository";
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
      const nav = await new HomeNavRepository().getHomeNav();
      if (!nav.categories.length) throw new Error("No awesome list data available");
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
