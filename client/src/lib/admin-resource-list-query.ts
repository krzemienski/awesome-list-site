import { parsePageFromSearch } from "@/lib/page-param";

/**
 * The admin resource table's list state lives only in the query string, so a
 * reload, a shared link or Back restores the same filtered page. Defaults are
 * omitted from the URL.
 */
export const RESOURCE_SORTS = ["newest", "oldest", "name-asc", "name-desc"] as const;
export type ResourceSort = (typeof RESOURCE_SORTS)[number];

export const RESOURCE_PAGE_SIZES = [25, 50, 100] as const;

export interface ResourceListQuery {
  search: string;
  category: string;
  /** "approved" (default), "all", or one of the filterable statuses. */
  status: string;
  sort: ResourceSort;
  featured: boolean;
  page: number;
  limit: number;
}

const DEFAULTS: ResourceListQuery = {
  search: "",
  category: "",
  status: "approved",
  sort: "newest",
  featured: false,
  page: 1,
  limit: 25,
};

export function parseResourceListQuery(
  searchString: string,
  statuses: readonly string[],
): ResourceListQuery {
  const params = new URLSearchParams(searchString);
  const status = params.get("status");
  const sort = params.get("sort");
  const limit = Number(params.get("limit"));
  return {
    search: params.get("search") ?? DEFAULTS.search,
    category: params.get("category") ?? DEFAULTS.category,
    status: status && (status === "all" || statuses.includes(status)) ? status : DEFAULTS.status,
    sort: RESOURCE_SORTS.find((s) => s === sort) ?? DEFAULTS.sort,
    featured: params.get("featured") === "true",
    page: parsePageFromSearch(searchString).page,
    limit: RESOURCE_PAGE_SIZES.find((n) => n === limit) ?? DEFAULTS.limit,
  };
}

/**
 * Merge `patch` into the current URL's list state. Any change that does not
 * name a page starts over on page 1, so a deep page index never survives into
 * a smaller result set. replaceState: list tweaks are not history entries.
 */
export function updateResourceListQuery(
  patch: Partial<ResourceListQuery>,
  statuses: readonly string[],
): void {
  const next = {
    ...parseResourceListQuery(window.location.search, statuses),
    page: 1,
    ...patch,
  };
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const write = (key: keyof ResourceListQuery, value: string) => {
    if (next[key] === DEFAULTS[key]) params.delete(key);
    else params.set(key, value);
  };
  write("search", next.search);
  write("category", next.category);
  write("status", next.status);
  write("sort", next.sort);
  write("featured", "true");
  write("page", String(next.page));
  write("limit", String(next.limit));
  const href = url.pathname + url.search + url.hash;
  if (href !== window.location.pathname + window.location.search + window.location.hash) {
    window.history.replaceState(window.history.state, "", href);
  }
}
