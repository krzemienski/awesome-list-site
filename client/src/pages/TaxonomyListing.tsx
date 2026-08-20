import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation, useSearch } from "wouter";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paginator } from "@/components/ui/paginator";
import AdvancedFilter from "@/components/ui/advanced-filter";
import SearchFilters, { ActiveFilters } from "@/components/search/SearchFilters";
import ResourceCard from "@/components/resource/ResourceCard";
import { ResourceListRow, ResourceCompactCard } from "@/components/resource/resource-view-modes";
import { ViewModeToggle, isLayoutViewMode, type ViewMode } from "@/components/ui/view-mode-toggle";
import { PageHeaderSkeleton, ResourceCardSkeleton } from "@/components/ui/skeletons";
import SEOHead from "@/components/layout/SEOHead";
import {
  categorySeoDescription,
  categorySeoTitleCore,
  pagedSeoDescription,
  pagedSeoTitleCore,
  subcategorySeoDescription,
  subcategorySeoTitleCore,
  subSubcategorySeoDescription,
  subSubcategorySeoTitleCore,
} from "@shared/seo-templates";
import NotFound from "@/pages/not-found";
import { parsePageParamStrict, pageNoticeFor } from "@/lib/page-param";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { normalizeTag, parseTagsParam } from "@/lib/tags";
import { apiRequest } from "@/lib/queryClient";
import { trackFilterUsage, trackSearch, trackSortChange, trackTagInteraction } from "@/lib/analytics";
import { useDebounce } from "@/hooks/useDebounce";
import { normalizeSearchQuery } from "@shared/searchNormalize";
import { fetchListingPage, type ListingLevel } from "@/lib/static-data";
import type { ResourceSearchFacets } from "@shared/resourceFacets";

const PAGE_SIZE = 24;
type Props = { level: ListingLevel };

const CANONICAL_SORTS = new Set(["default", "name-asc", "name-desc"]);

function normalizeSort(value: string | null): string {
  if (!value) return "default";
  const normalized = value.toLowerCase();
  if (CANONICAL_SORTS.has(normalized)) return normalized;
  if (normalized === "name" || normalized === "asc") return "name-asc";
  if (normalized === "desc") return "name-desc";
  return "default";
}

interface TaxonomyFilterSnapshot {
  tags: string[];
  provider: string;
  format: string;
  skillLevel: string;
  sort: string;
  selection: string;
}

function taxonomyFilterSignature(next: TaxonomyFilterSnapshot) {
  return JSON.stringify([
    next.selection,
    next.tags.map(normalizeTag).sort(),
    next.provider,
    next.format,
    next.skillLevel,
    next.sort,
  ]);
}

// fetchListingPage throws `Error("HTTP 404 ... from /api/awesome-list/listing…")`
// for an unknown top-level slug. Detect that specific status so an invalid
// category/subcategory renders the polished not-found page instead of the
// transient "Please try again" error state.
function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /^HTTP 404\b/.test(error.message);
}

function routeFor(level: ListingLevel, slug: string) {
  return `/${level === "category" ? "category" : level === "subcategory" ? "subcategory" : "sub-subcategory"}/${slug}`;
}

// P-05: single-resource pages read "1 resources available" / "of 1 resources".
// Pluralize the noun to match the count (the "About this collection" prose
// already does this correctly).
function resourceNoun(count: number): string {
  return count === 1 ? "resource" : "resources";
}

export default function TaxonomyListing({ level }: Props) {
  const { slug = "" } = useParams<{ slug: string }>();
  const [location] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialPage = parsePageParamStrict(params.get("page"));
  const [page, setPage] = useState(initialPage.page);
  const [searchTerm, setSearchTerm] = useState(params.get("search") ?? "");
  const [tags, setTags] = useState(() => parseTagsParam(params));
  const [provider, setProvider] = useState(params.get("provider") ?? "");
  const [format, setFormat] = useState(params.get("format") ?? "");
  const [skillLevel, setSkillLevel] = useState(params.get("skillLevel") ?? "");
  const [sort, setSort] = useState(() =>
    normalizeSort(params.get("sortBy") || params.get("sort")),
  );
  const [view, setView] = useState<ViewMode>(() => {
    const fromUrl = params.get("view");
    if (isLayoutViewMode(fromUrl)) return fromUrl;
    const saved = safeGetItem("awesome-list-view-mode");
    return isLayoutViewMode(saved) ? saved : "grid";
  });
  const [notice, setNotice] = useState<string | null>(pageNoticeFor(initialPage));
  const [selection, setSelection] = useState(params.get("subcategory") ?? "all");
  const [general, setGeneral] = useState(
    params.get("filter") === "general" || params.get("view") === "general" || params.get("subcategory") === "__general__",
  );
  const normalizedSearch = normalizeSearchQuery(searchTerm);
  const debouncedSearch = normalizeSearchQuery(useDebounce(searchTerm, 300));
  const serverSearchActive = debouncedSearch.length > 0;
  const serverFilterActive = Boolean(debouncedSearch || tags.length || provider || format || skillLevel || sort !== "default");
  const pageOptions = useMemo(() => {
    if (level === "category") {
      const [subcategory, subSubcategory] = selection.split(" › ");
      return {
        // A child name is only unique within its parent. Send both identities
        // so the server can validate and scope “Parent › Child” deep links.
        subcategory: selection !== "all" && selection !== "__general__" ? subcategory : undefined,
        subSubcategory: subSubcategory || undefined,
        general,
      };
    }
    return { subcategory: level === "subcategory" && selection !== "all" ? selection : undefined, general };
  }, [general, level, selection]);

  const listing = useQuery({
    queryKey: ["awesome-list-listing", level, slug, page, pageOptions],
    queryFn: () => fetchListingPage(level, slug, page, pageOptions),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const listingData = listing.data;
  const taxonomySearchUrl = useMemo(() => {
    if (!listingData) return "";
    const query = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      facets: "true",
    });
    if (debouncedSearch) query.set("search", debouncedSearch);
    if (level === "category") {
      query.set("category", slug);
      if (general) query.set("generalScope", "category");
      else if (selection !== "all" && !listingData.scope.ignoredSubcategory) {
        const [subcategory, subSubcategory] = selection.split(" › ");
        query.set("subcategory", subcategory);
        if (subSubcategory && !listingData.scope.ignoredSubSubcategory) {
          query.set("subSubcategory", subSubcategory);
        }
      }
    } else if (level === "subcategory") {
      if (listingData.parents.category?.slug) query.set("category", listingData.parents.category.slug);
      query.set("subcategory", slug);
      if (general) query.set("generalScope", "subcategory");
      else if (selection !== "all" && !listingData.scope.ignoredSubcategory) {
        query.set("subSubcategory", selection);
      }
    } else {
      if (listingData.parents.category?.name) query.set("category", listingData.parents.category.name);
      if (listingData.parents.subcategory?.name) query.set("subcategory", listingData.parents.subcategory.name);
      query.set("subSubcategory", listingData.node.name);
    }
    if (tags.length) query.set("tags", tags.join(","));
    if (provider) query.set("provider", provider);
    if (format) query.set("format", format);
    if (skillLevel) query.set("skillLevel", skillLevel);
    if (sort !== "default") query.set("sort", sort);
    return `/api/resources?${query.toString()}`;
  }, [debouncedSearch, format, general, level, listingData, page, provider, selection, skillLevel, slug, sort, tags]);
  const taxonomySearch = useQuery<{
    resources: any[];
    total: number;
    search?: { mode: "fts" | "fuzzy"; suggestion?: string };
    facets?: ResourceSearchFacets;
  }>({
    queryKey: [taxonomySearchUrl],
    queryFn: () => apiRequest(taxonomySearchUrl, { method: "GET" }),
    enabled: Boolean(taxonomySearchUrl),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const total = serverFilterActive ? taxonomySearch.data?.total ?? 0 : listingData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const resources = useMemo(
    () => serverFilterActive ? taxonomySearch.data?.resources ?? [] : listingData?.resources ?? [],
    [listingData?.resources, serverFilterActive, taxonomySearch.data?.resources],
  );
  const name = listingData?.node.name;
  const parentCategory = listingData?.parents.category;
  const parentSubcategory = listingData?.parents.subcategory;
  const loading = listing.isLoading && !listingData;
  const resultsLoading = serverFilterActive && (taxonomySearch.isLoading || taxonomySearch.isPlaceholderData);
  const paginationReady = serverFilterActive
    ? Boolean(taxonomySearch.data && !taxonomySearch.isPlaceholderData)
    : Boolean(listingData && !listing.isPlaceholderData);
  const lastTrackedSearchIntentRef = useRef("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const pendingResultsFocusRef = useRef(false);
  const pendingAnalyticsRef = useRef<{
    signature: string;
    type: string;
    value: string;
    kind: "filter" | "sort" | "tag";
    tagAction?: "apply" | "remove";
  } | null>(null);
  const currentFilterState = { tags, provider, format, skillLevel, sort, selection };
  const currentFilterSignature = taxonomyFilterSignature(currentFilterState);
  const requestResultsFocus = () => {
    pendingResultsFocusRef.current = true;
  };

  useEffect(() => {
    if (serverSearchActive && taxonomySearch.data && !taxonomySearch.isPlaceholderData) {
      const intent = JSON.stringify([debouncedSearch, level, slug, general, selection, tags, provider, format, skillLevel, sort]);
      if (lastTrackedSearchIntentRef.current === intent) return;
      lastTrackedSearchIntentRef.current = intent;
      trackSearch(debouncedSearch, taxonomySearch.data.total, `taxonomy_${level}`);
    }
  }, [debouncedSearch, format, general, level, provider, selection, serverSearchActive, skillLevel, slug, sort, tags, taxonomySearch.data, taxonomySearch.isPlaceholderData]);

  useEffect(() => {
    if (!pendingResultsFocusRef.current || loading || resultsLoading || listing.isPlaceholderData) return;
    pendingResultsFocusRef.current = false;
    const timer = window.setTimeout(() => resultsRef.current?.focus({ preventScroll: true }), 250);
    return () => window.clearTimeout(timer);
  }, [loading, listing.isPlaceholderData, resultsLoading, resources, total]);

  useEffect(() => {
    const pending = pendingAnalyticsRef.current;
    if (!pending || !taxonomySearch.data || taxonomySearch.isPlaceholderData) return;
    if (pending.signature !== currentFilterSignature) return;
    const surface = `taxonomy_${level}`;
    if (pending.kind === "sort") trackSortChange(pending.value, surface, taxonomySearch.data.total);
    else if (pending.kind === "tag") trackTagInteraction(pending.value, pending.tagAction ?? "apply", surface, taxonomySearch.data.total);
    else trackFilterUsage(pending.type, pending.value, taxonomySearch.data.total, surface);
    pendingAnalyticsRef.current = null;
  }, [currentFilterSignature, level, taxonomySearch.data, taxonomySearch.isPlaceholderData]);

  const urlSyncInitialized = useRef(false);
  const popNavigation = useRef(false);
  const pushSnapshot = useRef("");
  useEffect(() => {
    if (page > totalPages && paginationReady) {
      setNotice(`Page ${page} is not available; showing page ${totalPages} instead.`);
      setPage(totalPages);
    }
  }, [page, paginationReady, totalPages]);
  useEffect(() => {
    const next = new URLSearchParams();
    if (searchTerm.trim()) next.set("search", searchTerm);
    if (selection !== "all" && !general) next.set("subcategory", selection);
    if (tags.length) next.set("tags", tags.join(","));
    if (provider) next.set("provider", provider);
    if (format) next.set("format", format);
    if (skillLevel) next.set("skillLevel", skillLevel);
    if (sort !== "default") next.set("sortBy", sort);
    if (page > 1) next.set("page", String(page));
    if (general) next.set("filter", "general");
    if (view !== "grid") next.set("view", view);
    const href = `${routeFor(level, slug)}${next.size ? `?${next}` : ""}`;
    const current = `${window.location.pathname}${window.location.search}`;
    const snapshot = JSON.stringify([page, selection, tags, provider, format, skillLevel, sort, general, view]);
    if (current !== href) {
      const shouldPush = urlSyncInitialized.current && !popNavigation.current && pushSnapshot.current !== snapshot;
      window.history[shouldPush ? "pushState" : "replaceState"]({}, "", href);
    }
    urlSyncInitialized.current = true;
    popNavigation.current = false;
    pushSnapshot.current = snapshot;
  }, [format, general, level, location, page, provider, searchTerm, selection, skillLevel, slug, sort, tags, view]);
  useEffect(() => {
    const onPopState = () => {
      popNavigation.current = true;
      const next = new URLSearchParams(window.location.search);
      const nextGeneral = next.get("filter") === "general" || next.get("view") === "general";
      setSearchTerm(next.get("search") ?? "");
      setSelection(nextGeneral ? "__general__" : next.get("subcategory") ?? "all");
      setGeneral(nextGeneral);
      setTags(parseTagsParam(next));
      setProvider(next.get("provider") ?? "");
      setFormat(next.get("format") ?? "");
      setSkillLevel(next.get("skillLevel") ?? "");
      setSort(normalizeSort(next.get("sortBy") || next.get("sort")));
      const parsed = parsePageParamStrict(next.get("page"));
      setPage(parsed.page);
      setNotice(pageNoticeFor(parsed));
      const nextView = next.get("view");
      setView(isLayoutViewMode(nextView) ? nextView : "grid");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (loading) return <div className="space-y-6" aria-busy="true"><SEOHead title="Loading resources" description="Loading Awesome Video resources." /><PageHeaderSkeleton /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 9 }).map((_, i) => <ResourceCardSkeleton key={i} />)}</div></div>;
  // An unknown top-level slug 404s from the listing endpoint. Treat that as a
  // real not-found page (with navigation), not a transient "please try again"
  // error — matching the resource-detail 404 UX. Genuine 5xx/network errors
  // still surface the retry-able error state.
  if (isNotFoundError(listing.error)) return <NotFound />;
  if (listing.error || taxonomySearch.error) return <div className="py-12 text-center"><h2 className="text-xl font-semibold">Error Loading Resources</h2><p className="text-muted-foreground">Please try again.</p></div>;
  if (!listingData || !name) return <NotFound />;

  const optionChildren = listingData.children.flatMap((child: any) => [
    { value: child.name, count: child.count },
    ...((child.subSubcategories ?? []).map((subSub: any) => ({ value: `${child.name} › ${subSub.name}`, count: subSub.count }))),
  ]);
  const backSlug = level === "subcategory" ? parentCategory?.slug : parentSubcategory?.slug;
  const back = level === "category" || !backSlug
    ? "/"
    : routeFor(level === "subcategory" ? "category" : "subcategory", backSlug);
  type FacetKey = "category" | "subcategory" | "subSubcategory" | "tags" | "provider" | "format" | "skillLevel" | "sort";
  const queueAnalytics = (
    next: typeof currentFilterState,
    type: string,
    value: string,
    kind: "filter" | "sort" | "tag" = "filter",
    tagAction?: "apply" | "remove",
  ) => {
    pendingAnalyticsRef.current = {
      signature: taxonomyFilterSignature(next),
      type,
      value,
      kind,
      tagAction,
    };
  };
  const onFacetChange = (key: FacetKey, value: string | string[]) => {
    const next = { ...currentFilterState };
    if (key === "tags" && Array.isArray(value)) {
      const previous = new Set(tags.map(normalizeTag));
      const incoming = new Set(value.map(normalizeTag));
      const added = value.find(tag => !previous.has(normalizeTag(tag)));
      const removed = tags.find(tag => !incoming.has(normalizeTag(tag)));
      next.tags = value;
      setTags(value);
      queueAnalytics(next, "tag", added ?? removed ?? "multiple", "tag", added ? "apply" : "remove");
    } else if (typeof value === "string" && key === "provider") {
      next.provider = value;
      setProvider(value);
      queueAnalytics(next, key, value || "cleared");
    } else if (typeof value === "string" && key === "format") {
      next.format = value;
      setFormat(value);
      queueAnalytics(next, key, value || "cleared");
    } else if (typeof value === "string" && key === "skillLevel") {
      next.skillLevel = value;
      setSkillLevel(value);
      queueAnalytics(next, key, value || "cleared");
    } else if (typeof value === "string" && key === "sort") {
      next.sort = value;
      setSort(value);
      queueAnalytics(next, "sort", value, "sort");
    } else {
      return;
    }
    setPage(1);
    requestResultsFocus();
  };
  const clearFacetFilters = () => {
    const next = { ...currentFilterState, tags: [], provider: "", format: "", skillLevel: "", sort: "default" };
    setTags([]);
    setProvider("");
    setFormat("");
    setSkillLevel("");
    setSort("default");
    setPage(1);
    queueAnalytics(next, "all", "cleared");
    requestResultsFocus();
  };
  const broadenScope = () => {
    const next = { ...currentFilterState, selection: "all" };
    setSelection("all");
    setGeneral(false);
    setPage(1);
    queueAnalytics(next, "taxonomy_scope", "all");
    requestResultsFocus();
  };
  const onPage = (nextPage: number) => {
    setPage(nextPage);
    requestResultsFocus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const makeHref = (nextPage: number) => {
    const next = new URLSearchParams(window.location.search);
    if (nextPage > 1) next.set("page", String(nextPage)); else next.delete("page");
    return `${routeFor(level, slug)}${next.size ? `?${next}` : ""}`;
  };

  const seoCore = level === "category"
    ? categorySeoTitleCore(name, slug)
    : level === "subcategory"
      ? subcategorySeoTitleCore(name, parentCategory?.name ?? "", parentCategory?.slug)
      : subSubcategorySeoTitleCore(name, parentSubcategory?.name);
  const seoDescription = level === "category"
    ? categorySeoDescription(name, slug, listingData.totalAll)
    : level === "subcategory"
      ? subcategorySeoDescription(name, parentCategory?.name ?? "", listingData.totalAll)
      : subSubcategorySeoDescription(name, parentSubcategory?.name ?? "", listingData.totalAll);
  const filterState = {
    category: "",
    subcategory: "",
    subSubcategory: "",
    tags,
    provider,
    format,
    skillLevel,
    sort,
  };
  const broadenParams = new URLSearchParams();
  if (searchTerm.trim()) broadenParams.set(level === "category" ? "q" : "search", searchTerm);
  if (tags.length) broadenParams.set("tags", tags.join(","));
  if (provider) broadenParams.set("provider", provider);
  if (format) broadenParams.set("format", format);
  if (skillLevel) broadenParams.set("skillLevel", skillLevel);
  if (sort !== "default") broadenParams.set(level === "category" ? "sort" : "sortBy", sort);
  const broadenBase = level === "category" ? "/search" : back;
  const broadenHref = `${broadenBase}${broadenParams.size ? `?${broadenParams}` : ""}`;

  return <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
    <SEOHead title={pagedSeoTitleCore(seoCore, currentPage)} description={pagedSeoDescription(seoDescription, currentPage, totalPages)} category={name} resourceCount={listingData.totalAll} pageParam={currentPage} />
    <Button asChild variant="ghost" size="sm" className="gap-2 min-h-[44px]"><Link href={back}><ArrowLeft className="h-4 w-4" />Back to {level === "category" ? "Home" : parentCategory?.name ?? "Category"}</Link></Button>
    <div className="flex items-start justify-between gap-3"><div><h1 className="display-h text-2xl sm:text-3xl">{name}</h1><p className="text-sm text-muted-foreground">{total === listingData.totalAll ? `${total} ${resourceNoun(total)} available` : `${total} of ${listingData.totalAll} ${resourceNoun(listingData.totalAll)} shown`}</p></div><Badge variant="secondary" className="no-print" data-testid="badge-count">{total}</Badge></div>
    <section aria-labelledby="taxonomy-scope-heading" data-seo-section="taxonomy-intro">
      <h2 id="taxonomy-scope-heading" className="text-base font-semibold">About this collection</h2>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{listingData.scopeIntro}</p>
    </section>
    <div className="flex flex-col gap-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder={`Search in ${name}...`} aria-label={`Search in ${name}`} data-testid="input-search-resources" /></div>
      {level !== "sub-subcategory" && optionChildren.length > 0 && <select className="min-h-11 rounded-md border bg-background px-3" aria-label={`Limit ${name} by subcategory`} value={selection} onChange={(event) => { const nextSelection = event.target.value; const next = { ...currentFilterState, selection: nextSelection }; setSelection(nextSelection); setGeneral(nextSelection === "__general__"); setPage(1); queueAnalytics(next, "taxonomy_scope", nextSelection); requestResultsFocus(); }} data-testid="select-subcategory-filter"><option value="all">All subcategories</option>{listingData.generalCount > 0 && <option value="__general__">Uncategorized ({listingData.generalCount})</option>}{optionChildren.map((item) => <option key={item.value} value={item.value}>{item.value} ({item.count})</option>)}</select>}
      <AdvancedFilter selectedTags={tags} sortBy={sort} availableTags={listingData.tags} onTagsChange={(value) => onFacetChange("tags", value)} onSortChange={(value) => onFacetChange("sort", value)} showCountSorts={false} showTagFilter={false} />
    </div>
    <ActiveFilters state={filterState} onChange={onFacetChange} onClear={clearFacetFilters} defaultSort="default" />
    <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-start lg:gap-6">
      <SearchFilters state={filterState} facets={taxonomySearch.data?.facets} onChange={onFacetChange} onClear={clearFacetFilters} hideTaxonomyFacets />
      <main className="min-w-0 flex-1">
        <div ref={resultsRef} tabIndex={-1} className="space-y-4 outline-none" aria-busy={resultsLoading} aria-labelledby="taxonomy-results-heading" data-testid="taxonomy-results-region">
          <div className="flex items-center justify-between gap-2"><h2 id="taxonomy-results-heading" className="text-sm font-medium text-muted-foreground" data-testid="text-results-count">Showing {total === 0 ? "0" : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, total)}`} of {total} {resourceNoun(total)}</h2><ViewModeToggle value={view} onChange={(mode) => { setView(mode); safeSetItem("awesome-list-view-mode", mode); }} /></div>
          {notice && <div role="status" data-testid="notice-page-adjusted" className="rounded border p-3 text-sm">{notice}<button className="ml-2 min-h-8 underline" onClick={() => setNotice(null)}>Dismiss</button></div>}
          {(listingData.scope.ignoredSubcategory || listingData.scope.ignoredSubSubcategory) && <div role="status" data-testid="notice-unknown-subcategory" className="rounded border p-3 text-sm">“{selection}” isn't a subcategory of {name}, so that filter was ignored.<button className="ml-2 min-h-8 underline" onClick={broadenScope}>Remove it</button></div>}
          {serverSearchActive && !taxonomySearch.isPlaceholderData && taxonomySearch.data?.search?.mode === "fuzzy" && taxonomySearch.data.search.suggestion && <div className="flex flex-wrap items-center justify-center gap-2 rounded border p-3 text-sm" role="status" data-testid="notice-taxonomy-search-suggestion"><span>No exact matches. Did you mean</span><Button variant="link" className="h-auto p-0" onClick={() => { setSearchTerm(taxonomySearch.data!.search!.suggestion!); setPage(1); }}>{taxonomySearch.data.search.suggestion}</Button><span>?</span></div>}
          {resultsLoading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="taxonomy-results-loading">{Array.from({ length: 6 }).map((_, index) => <ResourceCardSkeleton key={index} />)}</div>
          : resources.length === 0 ? <div className="flex flex-col items-center gap-3 py-12 text-center" data-testid="empty-resources"><h3 className="text-lg font-semibold">No resources match this combination</h3><p className="text-muted-foreground">Clear a filter, remove the search, or broaden where you're looking.</p><div className="flex flex-wrap justify-center gap-2">{(tags.length > 0 || provider || format || skillLevel || sort !== "default") && <Button variant="outline" onClick={clearFacetFilters} data-testid="button-clear-taxonomy-filters">Clear filters</Button>}{normalizedSearch && <Button variant="ghost" onClick={() => { setSearchTerm(""); setPage(1); requestResultsFocus(); }} data-testid="button-clear-taxonomy-search">Clear search</Button>}{(selection !== "all" || general) ? <Button variant="secondary" onClick={broadenScope} data-testid="button-broaden-taxonomy-scope">Show all in {name}</Button> : <Button asChild variant="secondary"><Link href={broadenHref} data-testid="link-broaden-taxonomy-scope">{level === "category" ? "Search all of Awesome Video" : "Search the broader category"}</Link></Button>}</div></div> :
            <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4" : view === "list" ? "flex flex-col gap-2" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"}>{resources.map((resource: any, index: number) => {
              const normalized = { id: String(resource.id ?? ""), title: resource.title, url: resource.url, description: resource.description ?? "" };
              if (view === "list") return <ResourceListRow key={`${normalized.id}-${index}`} resource={normalized} />;
              if (view === "compact") return <ResourceCompactCard key={`${normalized.id}-${index}`} resource={normalized} />;
              return <ResourceCard key={`${normalized.id}-${index}`} resource={{ id: normalized.id, name: normalized.title, url: normalized.url, description: normalized.description, tags: resource.tags ?? resource.metadata?.tags ?? [] }} onTagClick={(tag) => onFacetChange("tags", tags.some(old => normalizeTag(old) === normalizeTag(tag)) ? tags : [...tags, tag])} />;
            })}</div>}
          <Paginator currentPage={currentPage} totalPages={totalPages} makeHref={makeHref} onNavigate={onPage} />
        </div>
      </main>
    </div>
  </div>;
}