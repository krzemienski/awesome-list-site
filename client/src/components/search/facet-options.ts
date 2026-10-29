import {
  RESOURCE_FORMAT_LABELS, RESOURCE_PROVIDER_LABELS, RESOURCE_SKILL_LEVEL_LABELS,
  type ResourceSearchFacets,
} from "@shared/resourceFacets-core";
import { tagDisplayNameBranded } from "@shared/seo-templates";
import { normalizeTag } from "@/lib/tags";

export interface FilterState { category: string; subcategory: string; subSubcategory: string; tags: string[]; provider: string; format: string; skillLevel: string; sort: string }
interface FacetCount { value: string; count: number }

// Taxonomy facet values are the canonical names ("FFmpeg-Based Tools"); only
// the placeholder value needs a label. Tags are slugs with their own display names.
export const label = (value: string) => value === "unknown" ? "Not yet classified" : value;
// C3-V1-02: an all-caps tag from the data ("AMD", via a card pill) keeps its
// spelling; title-casing the slug would print "Amd".
// A tag the URL spelled as a plural or mixed-case keeps the visitor's spelling:
// the chip must not print a different word than the one in the address bar
// ("bogus" folds to the slug "bogu").
export const tagLabel = (value: string) => {
  const trimmed = value.trim();
  if (/[A-Z]/.test(trimmed) && trimmed === trimmed.toUpperCase()) return trimmed;
  return normalizeTag(trimmed) === trimmed.toLowerCase() ? tagDisplayNameBranded(normalizeTag(trimmed)) : trimmed;
};
const identity = (value: string) => value;
export const options = (counts: FacetCount[] | undefined, selected: string | string[], labels?: Record<string, string>, toLabel = label, keyOf = identity) => {
  // No facet data (a rejected request, or none loaded yet) has no counts to
  // show; the selected values stay reachable through the active-filter chips
  // instead of appearing here as raw slugs with a made-up zero.
  if (!counts) return [];
  const values = new Map(counts.map(c => [keyOf(c.value), { value: c.value, count: c.count }]));
  const selectedValues = Array.isArray(selected) ? selected : selected ? [selected] : [];
  // C3-V1-02: a selected value joins its facet row by identity (tags: the
  // canonical slug, so "?tags=AMD" is the facet's "amd"), keeping the
  // selected spelling, instead of adding a second zero-count row.
  for (const value of selectedValues) {
    values.set(keyOf(value), { value, count: values.get(keyOf(value))?.count ?? 0 });
  }
  return [...values.values()].map(({ value, count }) => ({ value, count, label: labels?.[value] ?? toLabel(value) }));
};

/** "a, b, or c" for copy that names a list of controls or facets. */
export const orList = (items: string[]) => new Intl.ListFormat("en", { type: "disjunction" }).format(items);

/**
 * The facet groups the filter panel renders for these facets, in panel order.
 * Mirrors FacetList's hide rules, so copy elsewhere names only filters a visitor can see.
 */
export function offeredFacets(facets: ResourceSearchFacets | undefined, state: FilterState, hideTaxonomyFacets = false): string[] {
  const renders = (items: unknown[], value: string, collapseInert = false) =>
    items.length > 0 && !(collapseInert && items.length === 1 && !value);
  const groups: [string, boolean][] = [
    ["category", !hideTaxonomyFacets && renders(options(facets?.categories, state.category), state.category)],
    ["subcategory", !hideTaxonomyFacets && renders(options(facets?.subcategories, state.subcategory), state.subcategory)],
    ["sub-subcategory", !hideTaxonomyFacets && renders(options(facets?.subSubcategories, state.subSubcategory), state.subSubcategory)],
    ["provider", renders(options(facets?.providers, state.provider, RESOURCE_PROVIDER_LABELS), state.provider, true)],
    ["format", renders(options(facets?.formats, state.format, RESOURCE_FORMAT_LABELS), state.format, true)],
    ["skill level", renders(options(facets?.skillLevels, state.skillLevel, RESOURCE_SKILL_LEVEL_LABELS), state.skillLevel, true)],
    ["tag", options(facets?.tags, state.tags, undefined, tagLabel, normalizeTag).length > 0],
  ];
  return groups.filter(([, shown]) => shown).map(([name]) => name);
}
