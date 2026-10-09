import { storage } from "../storage";
import { CategoryRepository } from "../repositories/CategoryRepository";
import type { ListResourceOptions } from "../repositories/ResourceRepository";
import { readSearchState, searchStateValid, searchApiParams } from "@shared/discovery-params";
import { flattenListingResources, scopeTaxonomyResources, type ListingLevel, type TaxonomyMatch } from "../seo-content";
import { resourceKindSchema } from "@shared/resourceKinds";
import { resolveResourceKind } from "../lib/resourceKinds";
import { normalizeSearchQuery } from "@shared/searchNormalize";

/** Same slug-to-name boundary and repository query as the public resource API. */
export async function listDiscoveryResources(search: string, page: number) {
  const state = readSearchState(search);
  if (!searchStateValid(state)) throw new Error("Invalid discovery filters");
  const params = searchApiParams({ ...state, page });
  const source = new URLSearchParams(search);
  const kind = source.get("kind") ? resourceKindSchema.parse(source.get("kind")) : undefined;
  const generalScope = source.get("generalScope");
  const categories = new CategoryRepository();
  let category = state.category || undefined;
  let subcategory = state.subcategory || undefined;
  let categoryId: number | undefined;
  if (category && /^[a-z0-9-]+$/.test(category)) {
    const match = await categories.getCategoryBySlug(category);
    if (match) { category = match.name; categoryId = match.id; }
  }
  if (subcategory && /^[a-z0-9-]+$/.test(subcategory)) {
    const match = categoryId
      ? await categories.getSubcategoryBySlug(subcategory, categoryId)
      : await categories.getSubcategoryBySlugGlobal(subcategory);
    if (match) subcategory = match.name;
  }
  const options: ListResourceOptions = {
    page, limit: 24, status: "approved", category, subcategory,
    subSubcategory: state.subSubcategory || undefined,
    search: params.get("search") || undefined,
    tags: state.tags,
    provider: state.provider as ListResourceOptions["provider"] || undefined,
    resourceFormat: state.format as ListResourceOptions["resourceFormat"] || undefined,
    skillLevel: state.skillLevel as ListResourceOptions["skillLevel"] || undefined,
    sort: (state.sort === "relevance" ? undefined : state.sort) as ListResourceOptions["sort"],
    kind,
    generalScope: generalScope === "category" || generalScope === "subcategory" ? generalScope : undefined,
  };
  return storage.listResources(options);
}

export async function resolveTaxonomyPage(match: TaxonomyMatch, level: ListingLevel, search: string, requestedPage: number) {
  const params = new URLSearchParams(search);
  const parsedKind = resourceKindSchema.safeParse(params.get("kind"));
  const kind = parsedKind.success ? parsedKind.data : undefined;
  const allResources = flattenListingResources(match.node, level)
    .filter(item => !kind || resolveResourceKind(item).kind === kind);
  const general = params.get("filter") === "general" || params.get("view") === "general" || params.get("subcategory") === "__general__";
  const selection = params.get("subcategory") ?? "all";
  const [subcategory, subSubcategory] = selection.split(" › ");
  const scope = scopeTaxonomyResources(match.node, level, allResources, {
    subcategory: selection === "all" || general ? undefined : subcategory,
    subSubcategory,
    general,
  });
  const rawSort = (params.get("sortBy") || params.get("sort") || "default").toLowerCase();
  const sort = ["name-asc", "name", "asc"].includes(rawSort) ? "name-asc"
    : ["name-desc", "desc"].includes(rawSort) ? "name-desc" : "default";
  const state = readSearchState(search);
  const query = normalizeSearchQuery(params.get("search") ?? "");
  const serverFilterActive = Boolean(query || state.tags.length || state.provider || state.format || state.skillLevel || kind || sort !== "default");
  const filtered = serverFilterActive || selection !== "all" || general;
  if (!serverFilterActive) {
    const total = scope.resources.length;
    const totalPages = Math.max(1, Math.ceil(total / 24));
    const page = filtered ? Math.min(requestedPage, totalPages) : requestedPage;
    return { allResources, resources: scope.resources.slice((page - 1) * 24, page * 24), total, totalPages, page, filtered };
  }
  const api = new URLSearchParams(search);
  api.delete("kind");
  api.delete("q");
  api.delete("subcategory");
  api.delete("subSubcategory");
  api.set("search", query);
  sort === "default" ? api.delete("sort") : api.set("sort", sort);
  if (kind) api.set("kind", kind);
  if (level === "category") {
    api.set("category", match.node.slug);
    if (general) api.set("generalScope", "category");
    else if (selection !== "all" && !scope.ignoredSubcategory) {
      api.set("subcategory", subcategory);
      if (subSubcategory && !scope.ignoredSubSubcategory) api.set("subSubcategory", subSubcategory);
    }
  } else if (level === "subcategory") {
    api.set("category", match.category.slug);
    api.set("subcategory", match.node.slug);
    if (general) api.set("generalScope", "subcategory");
    else if (selection !== "all" && !scope.ignoredSubcategory) api.set("subSubcategory", selection);
  } else {
    api.set("category", match.category.name);
    api.set("subcategory", match.subcategory.name);
    api.set("subSubcategory", match.name);
  }
  let result = await listDiscoveryResources(api.toString(), requestedPage);
  const totalPages = Math.max(1, Math.ceil(result.total / 24));
  const page = Math.min(requestedPage, totalPages);
  if (page !== requestedPage) result = await listDiscoveryResources(api.toString(), page);
  return { allResources, resources: result.resources, total: result.total, totalPages, page, filtered };
}
