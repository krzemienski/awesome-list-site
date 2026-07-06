/**
 * ============================================================================
 * LEGACY REPOSITORY - Deprecated Methods for Backward Compatibility
 * ============================================================================
 *
 * This module contains legacy methods that exist for backward compatibility.
 * These methods are marked as DEPRECATED and will be removed in a future version.
 *
 * DEPRECATED METHODS:
 * - getAwesomeListFromDatabase(): Builds hierarchical category structure from database
 *   This method is kept for compatibility with existing routes that expect the
 *   legacy AwesomeListData format. New code should query repositories directly.
 *
 * MIGRATION PATH:
 * Instead of using getAwesomeListFromDatabase(), new code should:
 * 1. Query CategoryRepository for categories
 * 2. Query ResourceRepository for resources
 * 3. Build the structure client-side or use specialized endpoints
 *
 * This repository will be removed once all consumers are migrated to direct
 * repository usage or specialized API endpoints.
 * ============================================================================
 */

import {
  categories,
  subcategories,
  subSubcategories,
  resources,
  type Resource,
  type Category,
  type Subcategory,
  type SubSubcategory,
} from "@shared/schema";
import { db } from "../db";
import { eq, asc } from "drizzle-orm";

// Hierarchical category structure types
export interface HierarchicalSubSubcategory {
  name: string;
  slug: string;
  resources: Resource[];
}

export interface HierarchicalSubcategory {
  name: string;
  slug: string;
  resources: Resource[];
  subSubcategories: HierarchicalSubSubcategory[];
}

export interface HierarchicalCategory {
  name: string;
  slug: string;
  resources: Resource[];
  subcategories: HierarchicalSubcategory[];
}

export interface AwesomeListData {
  title: string;
  description: string;
  repoUrl: string;
  resources: Resource[];
  categories: HierarchicalCategory[];
}

/**
 * Repository class for legacy/deprecated database operations
 * @deprecated This repository contains methods that will be removed in future versions
 */
export class LegacyRepository {
  /**
   * Build hierarchical awesome list structure from database
   *
   * @deprecated Use CategoryRepository and ResourceRepository directly instead
   * @returns Complete awesome list data with hierarchical category structure
   *
   * This method queries the database and builds a hierarchical structure of:
   * - Categories (top-level)
   *   - Subcategories (second-level)
   *     - Sub-subcategories (third-level)
   *       - Resources (at any level)
   *
   * Resources are grouped into their respective category levels, and categories
   * without resources are still included in the hierarchy.
   */
  async getAwesomeListFromDatabase(): Promise<AwesomeListData> {
    // Fetch all approved resources
    const allResourcesRaw = await db
      .select()
      .from(resources)
      .where(eq(resources.status, 'approved'))
      .orderBy(asc(resources.title));

    // Dedup by normalized URL (BUG-005). Duplicate rows for the same resource
    // (same URL, different id/description) inflate category/subcategory counts
    // and render twice on prod. This is a no-op on clean data (0 URL dupes on
    // dev) and repairs the rendered tree + counts + sitemap + client on dirty
    // data. One tree is the single source of truth for all of them.
    const seenUrls = new Set<string>();
    const allResources = allResourcesRaw.filter((r) => {
      const raw = typeof r.url === 'string' ? r.url.trim().toLowerCase() : '';
      const key = raw.replace(/\/+$/, '');
      if (!key) return true; // no URL → cannot dedup, keep it
      if (seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    });

    // Fetch all categories, subcategories, and sub-subcategories
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.name));

    const allSubcategories = await db
      .select()
      .from(subcategories)
      .orderBy(asc(subcategories.name));

    const allSubSubcategories = await db
      .select()
      .from(subSubcategories)
      .orderBy(asc(subSubcategories.name));

    // Build hierarchical structure.
    //
    // Completeness invariant (single source of truth for counts): every approved
    // resource whose `category` matches a category MUST land in exactly one node
    // of that category's subtree. A resource is placed in the deepest valid node
    // its (subcategory, subSubcategory) strings map to; if either string does not
    // map to a real node, the resource is folded back into its nearest valid
    // ancestor instead of being silently dropped. This guarantees the recursive
    // tree-sum equals the authoritative DB count `COUNT(*) WHERE category = X`
    // ("mixed" categories that combine direct resources, mapped children, and
    // orphaned references all reconcile), and that no resource is unreachable.
    const hierarchicalCategories: HierarchicalCategory[] = allCategories.map(cat => {
      // Get subcategories for this category
      const categorySubcategories = allSubcategories.filter(
        sub => sub.categoryId === cat.id
      );

      // Track every resource placed somewhere inside this category's subtree so
      // the remaining (true directs + orphans) can be folded into the category.
      const placedIds = new Set<number>();

      // Build subcategory structure
      const hierarchicalSubcategories: HierarchicalSubcategory[] = categorySubcategories.map(sub => {
        // Get sub-subcategories for this subcategory
        const subcategorySubSubcategories = allSubSubcategories.filter(
          subsub => subsub.subcategoryId === sub.id
        );

        // Resources placed into one of THIS subcategory's sub-subcategory nodes.
        const subSubPlacedIds = new Set<number>();

        // Build sub-subcategory structure
        const hierarchicalSubSubcategories: HierarchicalSubSubcategory[] = subcategorySubSubcategories.map(subsub => {
          // Get resources in this sub-subcategory
          const subSubcategoryResources = allResources.filter(
            r => r.category === cat.name &&
                 r.subcategory === sub.name &&
                 r.subSubcategory === subsub.name
          );
          subSubcategoryResources.forEach(r => subSubPlacedIds.add(r.id));
          return {
            name: subsub.name,
            slug: subsub.slug,
            resources: subSubcategoryResources,
          };
        });

        // Resources for this subcategory that did NOT land in one of its
        // sub-subcategory nodes: true sub-level directs (no subSubcategory) plus
        // any resource whose subSubcategory string is unmapped (folded up here,
        // the nearest valid ancestor).
        const subcategoryResources = allResources.filter(
          r => r.category === cat.name &&
               r.subcategory === sub.name &&
               !subSubPlacedIds.has(r.id)
        );
        subcategoryResources.forEach(r => placedIds.add(r.id));
        subSubPlacedIds.forEach(id => placedIds.add(id));

        return {
          name: sub.name,
          slug: sub.slug,
          resources: subcategoryResources,
          subSubcategories: hierarchicalSubSubcategories,
        };
      });

      // Direct category resources = every resource in this category not already
      // placed in a subcategory/sub-subcategory node. Covers true directs (no
      // subcategory) AND orphans whose subcategory string is unmapped, so the
      // subtree stays complete and reachable.
      const categoryResources = allResources.filter(
        r => r.category === cat.name && !placedIds.has(r.id)
      );

      return {
        name: cat.name,
        slug: cat.slug,
        resources: categoryResources,
        subcategories: hierarchicalSubcategories,
      };
    });

    // Return complete awesome list data
    return {
      title: 'Awesome Video',
      description: 'A curated list of awesome video tools, frameworks, libraries, and learning resources',
      repoUrl: 'https://github.com/krzemienski/awesome-video',
      resources: allResources,
      categories: hierarchicalCategories,
    };
  }
}
