import { createHash } from "crypto";
import type { Response } from "express";
import { getPublicCacheValue } from "./cache/publicCache";
import { ResourceRepository } from "./repositories";
import { HomeNavRepository } from "./repositories/HomeNavRepository";
import { loadHomeFeed } from "./routes/domains/home-feed";

/**
 * Shared public Home data loaders. They intentionally call the same backing
 * repositories/cache namespaces as the JSON endpoints, rather than issuing
 * loopback HTTP from document rendering.
 */
/** The nav tree with its serialized body and ETag, as `/api/awesome-list/nav` sends it. */
export function loadCatalogNavPayload() {
  return getPublicCacheValue({
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
}

export async function loadHomeNav() {
  return (await loadCatalogNavPayload()).nav;
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

// Replit's Promote step fails if the homepage takes over 5 s, and on a cold pool
// one database load can wait the full 8 s connect timeout. One deadline per
// homepage request, counted from the request's arrival, bounds both the OG
// metadata lookup and the SSR render so the SPA fallback is always sent in time.
const HOME_RESPONSE_DEADLINE_MS = 3500;
export const HOME_DEADLINE_PASSED = Symbol("home-deadline-passed");

/**
 * Resolves with `work`, or with HOME_DEADLINE_PASSED once this request's
 * homepage deadline is reached. `work` keeps running either way, so a slow load
 * still warms the public cache; the caller decides how to report a late failure.
 */
export function withinHomeDeadline<T>(
  res: Response,
  work: Promise<T>,
): Promise<T | typeof HOME_DEADLINE_PASSED> {
  const requestStartedAt: unknown = res.locals.requestStartedAt;
  const startedAt = typeof requestStartedAt === "number" ? requestStartedAt : Date.now();
  const remainingMs = startedAt + HOME_RESPONSE_DEADLINE_MS - Date.now();
  if (remainingMs <= 0) return Promise.resolve(HOME_DEADLINE_PASSED);
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    work,
    new Promise<typeof HOME_DEADLINE_PASSED>((resolve) => {
      timer = setTimeout(() => resolve(HOME_DEADLINE_PASSED), remainingMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function loadHomeSSRData() {
  const [nav, home, kindCounts] = await Promise.all([
    loadHomeNav(),
    loadHomeFeed(),
    loadHomeKindCounts(),
  ]);
  return { nav, home, kindCounts };
}
