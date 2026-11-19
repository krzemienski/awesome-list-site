import type { AwesomeListNav, AwesomeListNavNode, ListingLevel } from "@/lib/static-data";
import { discoveryRedirect, searchPageQuery } from "@shared/discovery-params";

const MAX_DISTANCE = 2;

// Public pages a visitor might mistype. Auth-gated and admin pages are left
// out so a typo never suggests a page the visitor can't open.
const PUBLIC_PAGES: Array<{ path: string; name: string }> = [
  { path: "categories", name: "Categories" },
  { path: "search", name: "Search" },
  { path: "about", name: "About" },
  { path: "submit", name: "Submit a resource" },
  { path: "journeys", name: "Learning journeys" },
  { path: "recommendations", name: "Recommendations" },
  { path: "advanced", name: "Advanced explorer" },
  { path: "bookmarks", name: "Bookmarks" },
  { path: "settings", name: "Settings" },
  { path: "terms", name: "Terms" },
  { path: "privacy", name: "Privacy" },
  { path: "code-of-conduct", name: "Code of conduct" },
  { path: "design-system", name: "Design system" },
];

/** Classic Levenshtein edit distance (small inputs only — slugs/tokens). */
function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

function nodesAtLevel(nav: AwesomeListNav, level: ListingLevel): AwesomeListNavNode[] {
  if (level === "category") return nav.categories;
  const subs = nav.categories.flatMap((c) => c.subcategories ?? []);
  return level === "subcategory" ? subs : subs.flatMap((s) => s.subSubcategories ?? []);
}

/**
 * "Did you mean …?" for a mistyped taxonomy slug: the closest real slug at
 * the same level, matched on the full slug and each hyphen token so
 * "comunity" still finds "community-events". When `search` is given, the
 * visitor's destination-supported discovery state (discoveryRedirect's
 * allowlist: search/q, filters, tags, sort, kind, page, view) rides along.
 */
export function findTaxonomySuggestion(
  nav: AwesomeListNav | undefined,
  level: ListingLevel,
  slug: string | undefined,
  search = "",
): { label: string; href: string } | undefined {
  if (!nav || !slug) return undefined;
  const needle = slug.toLowerCase();
  let best: { node: AwesomeListNavNode; dist: number } | undefined;
  for (const node of nodesAtLevel(nav, level)) {
    if (!node.slug) continue;
    const candidates = [node.slug, ...node.slug.split("-")];
    const dist = Math.min(...candidates.map((c) => levenshtein(needle, c)));
    if (dist <= MAX_DISTANCE && (!best || dist < best.dist)) best = { node, dist };
  }
  return best
    ? { label: `Did you mean ${best.node.name}?`, href: discoveryRedirect(`/${level}/${best.node.slug}`, search) }
    : undefined;
}

/**
 * Match a single segment to a public page first, then to a category slug.
 * Search and category corrections keep discovery parameters; other pages start fresh.
 */
export function findRouteSuggestion(
  pathname: string,
  nav: AwesomeListNav | undefined,
  search = "",
): { label: string; href: string } | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return undefined;
  const needle = segments[0].toLowerCase();
  let best: { page: (typeof PUBLIC_PAGES)[number]; dist: number } | undefined;
  for (const page of PUBLIC_PAGES) {
    const dist = levenshtein(needle, page.path);
    if (dist <= MAX_DISTANCE && (!best || dist < best.dist)) best = { page, dist };
  }
  if (best) {
    const state = best.page.path === "search" ? searchPageQuery(search) : "";
    return { label: `Did you mean ${best.page.name}?`, href: `/${best.page.path}${state}` };
  }
  return findTaxonomySuggestion(nav, "category", needle, search);
}
