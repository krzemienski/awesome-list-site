/**
 * The public navigation tree: names, slugs and counts, never resource bodies.
 * One producer builds it (server/repositories/HomeNavRepository.ts) and every
 * consumer reads it: `/api/awesome-list/nav`, Home SSR, og-middleware and the
 * client's `awesome-list-nav` query. Each node carries both counts, so nobody
 * sums a subtree again.
 */
export interface CatalogNavNode {
  name: string;
  slug: string;
  /** Resources filed directly on this node, not in any child. */
  resourceCount: number;
  /** Resources on this node and every descendant. Display this one. */
  totalResourceCount: number;
  subcategories?: CatalogNavNode[];
  subSubcategories?: CatalogNavNode[];
}

export interface CatalogNavCategory extends CatalogNavNode {
  /** The first resource in tree order, so Home cards render a blurb from the nav alone. */
  teaser?: { title: string; description: string };
  subcategories: CatalogNavNode[];
}

export interface CatalogNav {
  title: string;
  totalResources: number;
  categories: CatalogNavCategory[];
}
