import type { AwesomeListNav, AwesomeListNavNode, ListingLevel } from "@/lib/static-data";

export interface NavLookup {
  node: AwesomeListNavNode;
  /** The node one level up (category for a subcategory, subcategory for a sub-subcategory). */
  parent?: AwesomeListNavNode;
  /** Nodes that share the parent, excluding the node itself. */
  siblings: AwesomeListNavNode[];
}

/** Locate a taxonomy node by level + slug in the cached nav tree. */
export function findNavNode(
  nav: AwesomeListNav | undefined,
  level: ListingLevel,
  slug: string | undefined,
): NavLookup | undefined {
  if (!nav || !slug) return undefined;
  for (const category of nav.categories) {
    if (level === "category") {
      if (category.slug === slug) {
        return { node: category, siblings: nav.categories.filter((other) => other !== category) };
      }
      continue;
    }
    const subcategories = category.subcategories ?? [];
    for (const subcategory of subcategories) {
      if (level === "subcategory") {
        if (subcategory.slug === slug) {
          return {
            node: subcategory,
            parent: category,
            siblings: subcategories.filter((other) => other !== subcategory),
          };
        }
        continue;
      }
      const nested = subcategory.subSubcategories ?? [];
      const match = nested.find((node) => node.slug === slug);
      if (match) {
        return { node: match, parent: subcategory, siblings: nested.filter((other) => other !== match) };
      }
    }
  }
  return undefined;
}
