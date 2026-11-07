/**
 * The only place catalog tree arithmetic lives: subtree resource totals,
 * nested-group counts, and which top-level entries are real categories.
 *
 * Two tree shapes exist and both nest `subcategories` and `subSubcategories`:
 * - the nav projection (`/api/awesome-list/nav`, HomeNavRepository) stores each
 *   node's DIRECT count in `resourceCount`;
 * - the corpus tree (`/api/awesome-list`) stores `resources` arrays.
 * A node's total is its own resources plus every descendant's. Reading one
 * level (`category.resources.length`) under-counts, which shipped as wrong
 * card, sidebar and SEO counts more than once. Import from here instead of
 * writing another recursive sum; the guard lint rule fails a new one.
 */

interface TreeNode<N> {
  subcategories?: readonly N[] | null;
  subSubcategories?: readonly N[] | null;
}

export interface NavCountNode extends TreeNode<NavCountNode> {
  resourceCount?: number | null;
}

export interface CorpusCountNode extends TreeNode<CorpusCountNode> {
  resources?: readonly unknown[] | null;
}

function subtreeTotal<N extends TreeNode<N>>(node: N, own: (node: N) => number): number {
  let total = own(node);
  for (const child of node.subcategories ?? []) total += subtreeTotal(child, own);
  for (const child of node.subSubcategories ?? []) total += subtreeTotal(child, own);
  return total;
}

/** Resources in a nav node and all its descendants. */
export function navTotalCount(node: NavCountNode): number {
  return subtreeTotal(node, (n) => n.resourceCount ?? 0);
}

/** Resources in a corpus-tree node and all its descendants, optionally only those matching. */
export function corpusTotalCount(node: CorpusCountNode, matches?: (resource: unknown) => boolean): number {
  return subtreeTotal(node, (n) =>
    matches ? (n.resources ?? []).filter(matches).length : (n.resources?.length ?? 0),
  );
}

/** Subcategories of the given (already visible) categories. */
export function countVisibleSubcategories(categories: readonly TreeNode<unknown>[]): number {
  let total = 0;
  for (const category of categories) total += category.subcategories?.length ?? 0;
  return total;
}

/** Sub-subcategory groups, whether filed under a category or a subcategory. */
export function countNestedGroups(categories: readonly TreeNode<TreeNode<unknown>>[]): number {
  let total = 0;
  for (const category of categories) {
    total += category.subSubcategories?.length ?? 0;
    for (const sub of category.subcategories ?? []) total += sub.subSubcategories?.length ?? 0;
  }
  return total;
}

const NON_CATEGORY_NAMES = ["Table of contents", "Contributing", "License", "External Links", "Anti-features"];

/** README sections imported as top-level entries that are not categories. */
export function isRealCategory(name: string): boolean {
  return !NON_CATEGORY_NAMES.includes(name) && !name.startsWith("List of");
}
