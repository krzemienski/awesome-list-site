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
    const allResources = await db
      .select()
      .from(resources)
      .where(eq(resources.status, 'approved'))
      .orderBy(asc(resources.title));

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

    // Build hierarchical structure
    const hierarchicalCategories: HierarchicalCategory[] = allCategories.map(cat => {
      // Get resources directly in this category (no subcategory)
      const categoryResources = allResources.filter(
        r => r.category === cat.name && !r.subcategory && !r.subSubcategory
      );

      // Get subcategories for this category
      const categorySubcategories = allSubcategories.filter(
        sub => sub.categoryId === cat.id
      );

      // Build subcategory structure
      const hierarchicalSubcategories: HierarchicalSubcategory[] = categorySubcategories.map(sub => {
        // Get resources in this subcategory (no sub-subcategory)
        const subcategoryResources = allResources.filter(
          r => r.category === cat.name &&
               r.subcategory === sub.name &&
               !r.subSubcategory
        );

        // Get sub-subcategories for this subcategory
        const subcategorySubSubcategories = allSubSubcategories.filter(
          subsub => subsub.subcategoryId === sub.id
        );

        // Build sub-subcategory structure
        const hierarchicalSubSubcategories: HierarchicalSubSubcategory[] = subcategorySubSubcategories.map(subsub => {
          // Get resources in this sub-subcategory
          const subSubcategoryResources = allResources.filter(
            r => r.category === cat.name &&
                 r.subcategory === sub.name &&
                 r.subSubcategory === subsub.name
          );

          return {
            name: subsub.name,
            slug: subsub.slug,
            resources: subSubcategoryResources,
          };
        });

        return {
          name: sub.name,
          slug: sub.slug,
          resources: subcategoryResources,
          subSubcategories: hierarchicalSubSubcategories,
        };
      });

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
