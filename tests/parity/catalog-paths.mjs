// The public tree already folds orphan taxonomy assignments into their nearest
// valid ancestor. Use its actual resource placement, not stale raw row labels.
export function indexCatalogPaths(catalog, navigation) {
  if (!Array.isArray(catalog.categories)) throw new Error("Public catalog tree is required for identity alignment");
  const byResourceId = new Map();
  const navCategory = new Map(navigation.map((category) => [category.slug, category]));
  const addResources = (node, placement) => {
    for (const resource of node.resources || []) {
      const key = String(resource.id);
      if (byResourceId.has(key)) throw new Error(`Public tree contains resource ${key} more than once`);
      byResourceId.set(key, placement);
    }
  };
  for (const category of catalog.categories) {
    const nav = navCategory.get(category.slug);
    if (!nav || nav.name !== category.name) throw new Error(`Catalog/navigation category mismatch: ${category.slug}`);
    const categoryPlacement = { category: nav, subcategory: null, leaf: null };
    addResources(category, categoryPlacement);
    for (const subcategory of category.subcategories || []) {
      const navSub = nav.subcategories?.find((item) => item.slug === subcategory.slug && item.name === subcategory.name);
      if (!navSub) throw new Error(`Catalog/navigation subcategory mismatch: ${subcategory.slug}`);
      addResources(subcategory, { ...categoryPlacement, subcategory: navSub });
      for (const leaf of subcategory.subSubcategories || []) {
        const navLeaf = navSub.subSubcategories?.find((item) => item.slug === leaf.slug && item.name === leaf.name);
        if (!navLeaf) throw new Error(`Catalog/navigation leaf mismatch: ${leaf.slug}`);
        addResources(leaf, { category: nav, subcategory: navSub, leaf: navLeaf });
      }
    }
  }
  const reconciledPaths = [];
  const ids = new Set();
  for (const resource of catalog.resources || []) {
    const id = String(resource.id);
    if (ids.has(id)) throw new Error(`Flat catalog contains resource ${id} more than once`);
    ids.add(id);
    const placement = byResourceId.get(id);
    if (!placement) throw new Error(`Resource ${id} has no authoritative public-tree placement`);
    const raw = [resource.category ?? null, resource.subcategory ?? null, resource.subSubcategory ?? null];
    const resolved = [placement.category.name, placement.subcategory?.name ?? null, placement.leaf?.name ?? null];
    if (JSON.stringify(raw) !== JSON.stringify(resolved)) {
      reconciledPaths.push({ resourceId: resource.id, raw, publicTree: resolved });
    }
  }
  if (ids.size && ids.size !== byResourceId.size) throw new Error("Public tree and flat catalog have different resource sets");
  return { byResourceId, reconciledPaths };
}