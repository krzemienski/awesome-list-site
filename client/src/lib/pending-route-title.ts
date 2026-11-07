import type { QueryClient } from "@tanstack/react-query";
import { findCachedResource } from "@/lib/cached-resource";
import { findNavNode } from "@/lib/nav-lookup";
import type { AwesomeListNav, ListingLevel } from "@/lib/static-data";

const TAXONOMY_ROUTE = /^\/(category|subcategory|sub-subcategory)\/([^/]+)\/?$/;
const RESOURCE_ROUTE = /^\/resource\/(\d+)\/?$/;

/**
 * The name of the page being opened, from data the app already holds (the
 * cached nav tree, or a list that contained the resource). Loading states use
 * it as their tab title so the tab — and the pageview recorded while the page
 * loads — names the destination instead of a generic "Loading …".
 */
export function pendingRouteTitle(queryClient: QueryClient, pathname: string): string | undefined {
  const taxonomy = TAXONOMY_ROUTE.exec(pathname);
  if (taxonomy) {
    const nav = queryClient.getQueryData<AwesomeListNav>(["awesome-list-nav"]);
    let slug: string;
    try {
      slug = decodeURIComponent(taxonomy[2]);
    } catch {
      return undefined;
    }
    return findNavNode(nav, taxonomy[1] as ListingLevel, slug)?.node.name;
  }
  const resource = RESOURCE_ROUTE.exec(pathname);
  if (resource) {
    return findCachedResource(queryClient, Number(resource[1]), ["/api/resources", resource[1]])?.title;
  }
  return undefined;
}
