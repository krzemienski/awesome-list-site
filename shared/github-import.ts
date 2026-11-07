/** Depth of a taxonomy node a GitHub import would create. */
export type TaxonomyLevel = "category" | "subcategory" | "sub-subcategory";

const TAXONOMY_LEVELS: readonly TaxonomyLevel[] = ["category", "subcategory", "sub-subcategory"];

/**
 * "2 categories, 1 subcategory", or null when the import creates none. The
 * dry-run response message and the admin import preview share this wording.
 */
export function describeTaxonomyPlan(nodes: readonly { level: TaxonomyLevel }[]): string | null {
  const parts = TAXONOMY_LEVELS
    .map((level) => [level, nodes.filter((node) => node.level === level).length] as const)
    .filter(([, count]) => count > 0)
    .map(([level, count]) => `${count} ${count === 1 ? level : level.replace(/y$/, "ies")}`);
  return parts.length ? parts.join(", ") : null;
}
