import Fuse from "fuse.js";
import { Resource } from "../types/awesome-list";

// Configure Fuse.js options for search
const fuseOptions = {
  keys: ["title", "description", "category", "subcategory"],
  threshold: 0.4,
  includeScore: true,
  shouldSort: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

/**
 * Create a search index from resources
 */
export function createSearchIndex(resources: Resource[]): Fuse<Resource> {
  return new Fuse(resources, fuseOptions);
}

/**
 * Search resources with Fuse.js
 */
export function searchResources(
  searchIndex: Fuse<Resource>,
  query: string
): Resource[] {
  if (!query.trim()) return [];
  
  const results = searchIndex.search(query);
  return results.map((result) => result.item);
}

/**
 * Filter resources by category
 */
export function filterByCategory(
  resources: Resource[],
  category: string
): Resource[] {
  return resources.filter((resource) => 
    resource.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Filter resources by subcategory
 */
export function filterBySubcategory(
  resources: Resource[],
  category: string,
  subcategory: string
): Resource[] {
  return resources.filter(
    (resource) => 
      resource.category.toLowerCase() === category.toLowerCase() && 
      resource.subcategory?.toLowerCase() === subcategory.toLowerCase()
  );
}
