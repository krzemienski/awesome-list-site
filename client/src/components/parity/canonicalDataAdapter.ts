import type { AwesomeListNav, AwesomeListNavNode } from "@/lib/static-data";
import type { Resource } from "@/types/awesome-list";
import type { ResourceKind } from "./HomePresentation";

export type CanonicalHomeResource = Resource & {
  featured?: boolean;
  kind?: ResourceKind | null;
  resolvedKind?: ResourceKind | null;
};

export interface CanonicalHomeCategory {
  name: string;
  slug: string;
  displayCount: number;
  preview: CanonicalHomeResource[];
}

/** Bounded, read-only response contract for GET /api/home-index. */
export interface CanonicalHomePayload {
  summary: {
    totalResources: number;
    totalCategories: number;
    totalSubcategories: number;
    nestedGroupCount: number;
    featuredCount: number;
  };
  kindCounts: Record<ResourceKind, number>;
  categories: CanonicalHomeCategory[];
  featured: CanonicalHomeResource[];
  recent: CanonicalHomeResource[];
}

export interface CanonicalHomeModel extends CanonicalHomePayload {
  categories: Array<CanonicalHomeCategory & { subcategories?: AwesomeListNavNode[] }>;
}

/**
 * Joins bounded server rows to the existing navigation tree. Counts, sorting,
 * filtering, featured selection and recent selection remain server-owned so
 * the browser never downloads the multi-megabyte corpus for Home.
 */
export function adaptCanonicalHomePayload(
  payload: CanonicalHomePayload,
  nav: AwesomeListNav,
): CanonicalHomeModel {
  return {
    ...payload,
    categories: payload.categories.map((category) => ({
      ...category,
      subcategories: nav.categories.find((item) => item.slug === category.slug)?.subcategories,
    })),
  };
}