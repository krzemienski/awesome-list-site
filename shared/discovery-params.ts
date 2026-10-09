import { parsePageNumber } from "./page-param";
import { parseTagFilterValues } from "./tagNormalize";
import { normalizeSearchQuery, isSearchableQuery, SEARCH_QUERY_MAX_LENGTH } from "./searchNormalize";
import { RESOURCE_SEARCH_SORT_VALUES, RESOURCE_PROVIDER_VALUES, RESOURCE_FORMAT_VALUES, RESOURCE_SKILL_LEVEL_VALUES } from "./resourceFacets";

export function readSearchState(search: string) {
  const p = new URLSearchParams(search);
  return {
    q: (p.has("q") ? p.get("q") : p.get("search")) ?? "",
    category: p.get("category") ?? "",
    subcategory: p.get("subcategory") ?? "",
    subSubcategory: p.get("subSubcategory") ?? "",
    tags: parseTagFilterValues([...p.getAll("tags"), ...p.getAll("tag")]),
    provider: p.get("provider") ?? "",
    format: p.get("format") ?? "",
    skillLevel: p.get("skillLevel") ?? "",
    sort: p.get("sort") ?? "relevance",
    page: Math.max(1, parsePageNumber(p.get("page")) ?? 1),
  };
}

export function searchStateValid(state: ReturnType<typeof readSearchState>): boolean {
  return normalizeSearchQuery(state.q).length <= SEARCH_QUERY_MAX_LENGTH
    && RESOURCE_SEARCH_SORT_VALUES.includes(state.sort as typeof RESOURCE_SEARCH_SORT_VALUES[number])
    && (!state.provider || RESOURCE_PROVIDER_VALUES.includes(state.provider as typeof RESOURCE_PROVIDER_VALUES[number]))
    && (!state.format || RESOURCE_FORMAT_VALUES.includes(state.format as typeof RESOURCE_FORMAT_VALUES[number]))
    && (!state.skillLevel || RESOURCE_SKILL_LEVEL_VALUES.includes(state.skillLevel as typeof RESOURCE_SKILL_LEVEL_VALUES[number]))
    && state.tags.length <= 10;
}

export function searchCanBrowse(state: ReturnType<typeof readSearchState>): boolean {
  return [state.category, state.subcategory, state.subSubcategory, state.provider, state.format, state.skillLevel].some(Boolean)
    || state.tags.length > 0 || state.sort !== "relevance";
}

export function searchApiParams(state: ReturnType<typeof readSearchState>, limit = 24): URLSearchParams {
  const p = new URLSearchParams({ page: String(state.page), limit: String(limit), facets: "true" });
  const query = normalizeSearchQuery(state.q);
  if (isSearchableQuery(query)) p.set("search", query);
  for (const key of ["category", "subcategory", "subSubcategory", "provider", "format", "skillLevel"] as const) {
    if (state[key]) p.set(key, state[key]);
  }
  if (state.tags.length) p.set("tags", state.tags.join(","));
  if (state.sort !== "relevance") p.set("sort", state.sort);
  return p;
}

/** Compatibility redirects preserve only destination-supported discovery state. */
export function discoveryRedirect(path: string, search: string): string {
  const source = new URLSearchParams(search);
  const target = new URLSearchParams();
  const keys = ["q", "search", "category", "subcategory", "subSubcategory", "tags", "tag", "provider", "format", "skillLevel", "sort", "sortBy", "kind", "page", "filter", "view"];
  for (const key of keys) for (const value of source.getAll(key)) target.append(key, value);
  const query = target.toString();
  return path + (query ? `?${query}` : "");
}
