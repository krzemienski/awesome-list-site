import { categories, resources, subcategories, subSubcategories } from "@shared/schema";
import { asc, eq } from "drizzle-orm";
import { db } from "../db";

type HomeNavResource = {
  id: number;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory: string | null;
  subSubcategory: string | null;
};

type HomeNav = {
  title: string;
  totalResources: number;
  categories: Array<{
    name: string;
    slug: string;
    resourceCount: number;
    teaser?: {
      title: string;
      description: string;
    };
    subcategories: Array<{
      name: string;
      slug: string;
      resourceCount: number;
      subSubcategories: Array<{
        name: string;
        slug: string;
        resourceCount: number;
      }>;
    }>;
  }>;
};

function appendToMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const values = map.get(key);
  if (values) {
    values.push(value);
  } else {
    map.set(key, [value]);
  }
}

/**
 * Builds the public Home navigation projection without loading the resource
 * corpus fields that the navigation never serializes.
 *
 * The grouping below intentionally mirrors LegacyRepository's tree placement:
 * resources with a valid subcategory but an unmapped sub-subcategory stay at
 * the subcategory level, and resources with an unmapped subcategory stay at the
 * category level. Resources whose category does not have a taxonomy row still
 * contribute to totalResources, but remain absent from category counts.
 */
export class HomeNavRepository {
  async getHomeNav(): Promise<HomeNav> {
    const [resourceRows, categoryRows, subcategoryRows, subSubcategoryRows] = await Promise.all([
      db
        .select({
          id: resources.id,
          title: resources.title,
          url: resources.url,
          description: resources.description,
          category: resources.category,
          subcategory: resources.subcategory,
          subSubcategory: resources.subSubcategory,
        })
        .from(resources)
        .where(eq(resources.status, "approved"))
        .orderBy(asc(resources.title), asc(resources.id)),
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        })
        .from(categories)
        .orderBy(asc(categories.name)),
      db
        .select({
          id: subcategories.id,
          name: subcategories.name,
          slug: subcategories.slug,
          categoryId: subcategories.categoryId,
        })
        .from(subcategories)
        .orderBy(asc(subcategories.name)),
      db
        .select({
          id: subSubcategories.id,
          name: subSubcategories.name,
          slug: subSubcategories.slug,
          subcategoryId: subSubcategories.subcategoryId,
        })
        .from(subSubcategories)
        .orderBy(asc(subSubcategories.name)),
    ]);

    // Keep the same first-row-wins URL deduplication and title/id ordering as
    // LegacyRepository. The projection contains exactly the fields needed for
    // this dedupe and the nav teaser/tree placement.
    const seenUrls = new Set<string>();
    const allResources = resourceRows.filter((resource) => {
      const raw = typeof resource.url === "string" ? resource.url.trim().toLowerCase() : "";
      const key = raw.replace(/\/+$/, "");
      if (!key) return true;
      if (seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    });

    const subcategoriesByCategoryId = new Map<number, Array<(typeof subcategoryRows)[number]>>();
    for (const subcategory of subcategoryRows) {
      if (subcategory.categoryId == null) continue;
      appendToMap(subcategoriesByCategoryId, subcategory.categoryId, subcategory);
    }

    const subSubcategoriesBySubcategoryId = new Map<
      number,
      Array<(typeof subSubcategoryRows)[number]>
    >();
    for (const subSubcategory of subSubcategoryRows) {
      if (subSubcategory.subcategoryId == null) continue;
      appendToMap(subSubcategoriesBySubcategoryId, subSubcategory.subcategoryId, subSubcategory);
    }

    // These maps retain the global title/id resource order because each row is
    // appended exactly once while walking the ordered projection.
    const resourcesByCategory = new Map<string, HomeNavResource[]>();
    const resourcesBySubcategory = new Map<string, Map<string | null, HomeNavResource[]>>();
    const resourcesBySubSubcategory = new Map<
      string,
      Map<string | null, Map<string | null, HomeNavResource[]>>
    >();
    for (const resource of allResources) {
      appendToMap(resourcesByCategory, resource.category, resource);

      let bySubcategory = resourcesBySubcategory.get(resource.category);
      if (!bySubcategory) {
        bySubcategory = new Map();
        resourcesBySubcategory.set(resource.category, bySubcategory);
      }
      appendToMap(bySubcategory, resource.subcategory, resource);

      let bySubSubcategory = resourcesBySubSubcategory.get(resource.category);
      if (!bySubSubcategory) {
        bySubSubcategory = new Map();
        resourcesBySubSubcategory.set(resource.category, bySubSubcategory);
      }
      let bySubcategoryName = bySubSubcategory.get(resource.subcategory);
      if (!bySubcategoryName) {
        bySubcategoryName = new Map();
        bySubSubcategory.set(resource.subcategory, bySubcategoryName);
      }
      appendToMap(bySubcategoryName, resource.subSubcategory, resource);
    }

    const navCategories = categoryRows.map((category) => {
      const placedIds = new Set<number>();
      const categorySubcategories = subcategoriesByCategoryId.get(category.id) ?? [];
      const bySubcategory = resourcesBySubcategory.get(category.name);
      const bySubSubcategory = resourcesBySubSubcategory.get(category.name);

      const navSubcategories = categorySubcategories.map((subcategory) => {
        const subcategorySubSubcategories =
          subSubcategoriesBySubcategoryId.get(subcategory.id) ?? [];
        const bySubcategoryName = bySubSubcategory?.get(subcategory.name);
        const subSubcategoryPlacedIds = new Set<number>();

        const navSubSubcategories = subcategorySubSubcategories.map((subSubcategory) => {
          const subSubcategoryResources = bySubcategoryName?.get(subSubcategory.name) ?? [];
          for (const resource of subSubcategoryResources) {
            subSubcategoryPlacedIds.add(resource.id);
          }
          return {
            name: subSubcategory.name,
            slug: subSubcategory.slug,
            resourceCount: subSubcategoryResources.length,
          };
        });

        const subcategoryResources = (bySubcategory?.get(subcategory.name) ?? []).filter(
          (resource) => !subSubcategoryPlacedIds.has(resource.id),
        );
        for (const resource of subcategoryResources) {
          placedIds.add(resource.id);
        }
        for (const resourceId of subSubcategoryPlacedIds) {
          placedIds.add(resourceId);
        }

        return {
          name: subcategory.name,
          slug: subcategory.slug,
          resourceCount: subcategoryResources.length,
          subSubcategories: navSubSubcategories,
          resources: subcategoryResources,
          subSubcategoryResources: subcategorySubSubcategories.map(
            (subSubcategory) => bySubcategoryName?.get(subSubcategory.name) ?? [],
          ),
        };
      });

      const categoryResources = (resourcesByCategory.get(category.name) ?? []).filter(
        (resource) => !placedIds.has(resource.id),
      );

      const first =
        categoryResources[0] ??
        navSubcategories
          .flatMap((subcategory) => [
            ...subcategory.resources,
            ...subcategory.subSubcategoryResources.flatMap((resources) => resources),
          ])
          .find(Boolean);

      return {
        name: category.name,
        slug: category.slug,
        resourceCount: categoryResources.length,
        teaser: first
          ? {
              title: String(first.title || ""),
              description: String(first.description || "").slice(0, 200),
            }
          : undefined,
        subcategories: navSubcategories.map((subcategory) => ({
          name: subcategory.name,
          slug: subcategory.slug,
          resourceCount: subcategory.resourceCount,
          subSubcategories: subcategory.subSubcategories,
        })),
      };
    });

    return {
      title: "Awesome Video",
      totalResources: allResources.length,
      categories: navCategories,
    };
  }
}
