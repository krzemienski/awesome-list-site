import StatePanel from "@/components/layout/StatePanel";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
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
import { findTaxonomySuggestion } from "@/lib/not-found-suggestion";
import { findNavNode } from "@/lib/nav-lookup";
import ErrorPage from "@/pages/ErrorPage";
import { useHeldError } from "@/hooks/useHeldError";
import OfflinePageState from "@/components/layout/OfflinePageState";
import { queryUnavailableReason } from "@/lib/query-availability";
import { resolveSiteIdentity } from "@shared/site-identity";
import "@/styles/pages/taxonomy.css";
import { strictUrlPage } from "@/lib/page-param";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { normalizeTag, parseTagsParam } from "@/lib/tags";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { useDebounce } from "@/hooks/useDebounce";
import { useContactConfig } from "@/lib/contact";
import { normalizeSearchQuery } from "@shared/searchNormalize";
import { fetchAwesomeListNav, fetchListingPage, navTotalCount, type AwesomeListNav, type ListingLevel } from "@/lib/static-data";
import type { ResourceSearchFacets } from "@shared/resourceFacets";
import { RESOURCE_KIND_VALUES, type ResourceKind } from "@shared/resourceKinds";
import { trackCategoryView, trackFilterUsage, trackSearch, trackSortChange, trackTagInteraction } from "@/lib/analytics";

const PAGE_SIZE = 24;
type Props = { level: ListingLevel };
import { CATEGORY_GLYPHS as categoryMarks } from "@/lib/category-glyph";
import { scrollBehavior } from "@/lib/scroll-behavior";

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
  kind: ResourceKind | null;
}

function taxonomyFilterSignature(next: TaxonomyFilterSnapshot) {
  return JSON.stringify([
    next.selection,
    next.tags.map(normalizeTag).sort(),
    next.provider,
    next.format,
    next.skillLevel,
    next.sort,
    next.kind,
  ]);
}

function parseKindParam(value: string | null): ResourceKind | null {
  return value && (RESOURCE_KIND_VALUES as readonly string[]).includes(value)
    ? value as ResourceKind
    : null;
}

// fetchListingPage throws `Error("HTTP 404 ... from /api/awesome-list/listing…")`
// for an unknown top-level slug. Detect that specific status so an invalid
// category/subcategory renders the polished not-found page instead of the
// transient "Please try again" error state.
function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /^HTTP 404\b/.test(error.message);
}

// Both listing queries key the node at [1] (level) and [2] (slug). Paging,
// filtering and sorting one node holds its previous result on screen; another
// node's heading, cards, totals and facets must never render under this one.
function holdWithinNode(level: ListingLevel, slug: string) {
  return <T,>(previous: T | undefined, previousQuery?: { queryKey: readonly unknown[] }) =>
    previousQuery?.queryKey[1] === level && previousQuery.queryKey[2] === slug ? previous : undefined;
}

function routeFor(level: ListingLevel, slug: string) {
  return `/${level === "category" ? "category" : level === "subcategory" ? "subcategory" : "sub-subcategory"}/${slug}`;
}

function samePath(a: string, b: string) {
  const norm = (p: string) => {
    const trimmed = p.length > 1 ? p.replace(/\/+$/, "") : p;
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  };
  return norm(a) === norm(b);
}
interface ListingUrlState {
  searchTerm: string;
  selection: string;
  general: boolean;
  tags: string[];
  provider: string;
  format: string;
  skillLevel: string;
  sort: string;
  kind: ResourceKind | null;
  page: number;
  view: ViewMode;
}

/** The canonical query string for the listing's visible state. */
function listingQuery(state: ListingUrlState): URLSearchParams {
  const next = new URLSearchParams();
  if (state.searchTerm.trim()) next.set("search", state.searchTerm);
  if (state.selection !== "all" && !state.general) next.set("subcategory", state.selection);
  if (state.tags.length) next.set("tags", state.tags.join(","));
  if (state.provider) next.set("provider", state.provider);
  if (state.format) next.set("format", state.format);
  if (state.skillLevel) next.set("skillLevel", state.skillLevel);
  if (state.sort !== "default") next.set("sortBy", state.sort);
  if (state.kind) next.set("kind", state.kind);
  if (state.page > 1) next.set("page", String(state.page));
  if (state.general) next.set("filter", "general");
  if (state.view !== "grid") next.set("view", state.view);
  return next;
}

function resourceNoun(count: number): string {
  return count === 1 ? "resource" : "resources";
}

export default function TaxonomyListing({ level }: Props) {
  const { slug = "" } = useParams<{ slug: string }>();
  const [location] = useLocation();
  const search = useSearch();
  const { data: publicConfig } = useContactConfig(true);
  const siteName = publicConfig ? resolveSiteIdentity({ name: publicConfig.site.title }).name : "the catalog";
  const params = new URLSearchParams(search);
  const [page, setPage] = useState(() => strictUrlPage(params.get("page")) ?? 1);
  // The URL's ?page= is a spelling og-middleware 404s ("abc", "0", "1e3").
  const pageRejected = strictUrlPage(params.get("page")) === null;
  const [searchTerm, setSearchTerm] = useState(params.get("search") ?? "");
  const [tags, setTags] = useState(() => parseTagsParam(params));
  const [provider, setProvider] = useState(params.get("provider") ?? "");
  const [format, setFormat] = useState(params.get("format") ?? "");
  const [skillLevel, setSkillLevel] = useState(params.get("skillLevel") ?? "");
  const [kind, setKind] = useState<ResourceKind | null>(() => parseKindParam(params.get("kind")));
  const [sort, setSort] = useState(() =>
    normalizeSort(params.get("sortBy") || params.get("sort")),
  );
  const [view, setView] = useState<ViewMode>(() => {
    const fromUrl = params.get("view");
    if (isLayoutViewMode(fromUrl)) return fromUrl;
    const saved = safeGetItem("awesome-list-view-mode");
    return isLayoutViewMode(saved) ? saved : "grid";
  });
  const [notice, setNotice] = useState<string | null>(null);
  const initialGeneral =
    params.get("filter") === "general" || params.get("view") === "general" || params.get("subcategory") === "__general__";
  const [selection, setSelection] = useState(initialGeneral ? "__general__" : params.get("subcategory") ?? "all");
  const [general, setGeneral] = useState(initialGeneral);
  const [toolsOpen, setToolsOpen] = useState(false);

  // Every navigation (link, Back/Forward) reaches this mounted listing as a
  // new route key. Rehydrate from it during render, not in an effect: the
  // commit delivering the URL would otherwise run the URL-sync effect on the
  // previous route's state and overwrite the requested URL.
  const routeKey = `${routeFor(level, slug)}?${search}`;
  const [hydratedRoute, setHydratedRoute] = useState(routeKey);
  const stateQuery = listingQuery({ searchTerm, selection, general, tags, provider, format, skillLevel, sort, kind, page, view });
  if (hydratedRoute !== routeKey) {
    setHydratedRoute(routeKey);
    // C8-V1-02: wouter reports our own canonicalising rewrite (?sort=asc ->
    // ?sortBy=name-asc) back as a navigation; state already matches it, and
    // rehydrating would wipe the page-clamp notice set just before it.
    if (routeKey !== `${routeFor(level, slug)}?${stateQuery}`) {
      const nextGeneral =
        params.get("filter") === "general" ||
        params.get("view") === "general" ||
        params.get("subcategory") === "__general__";
      setSearchTerm(params.get("search") ?? "");
      setSelection(nextGeneral ? "__general__" : params.get("subcategory") ?? "all");
      setGeneral(nextGeneral);
      setTags(parseTagsParam(params));
      setProvider(params.get("provider") ?? "");
      setFormat(params.get("format") ?? "");
      setSkillLevel(params.get("skillLevel") ?? "");
      setKind(parseKindParam(params.get("kind")));
      setSort(normalizeSort(params.get("sortBy") || params.get("sort")));
      setPage(strictUrlPage(params.get("page")) ?? 1);
      setNotice(null);
      const nextView = params.get("view");
      setView(isLayoutViewMode(nextView) ? nextView : "grid");
    }
  }

  const normalizedSearch = normalizeSearchQuery(searchTerm);
  const debouncedSearch = normalizeSearchQuery(useDebounce(searchTerm, 300));
  const serverSearchActive = debouncedSearch.length > 0;
  const serverFilterActive = Boolean(debouncedSearch || tags.length || provider || format || skillLevel || kind || sort !== "default");
  const pageOptions = useMemo(() => {
    if (level === "category") {
      const [subcategory, subSubcategory] = selection.split(" › ");
      return {
        // A child name is only unique within its parent. Send both identities
        // so the server can validate and scope “Parent › Child” deep links.
        subcategory: selection !== "all" && selection !== "__general__" ? subcategory : undefined,
        subSubcategory: subSubcategory || undefined,
        general,
        kind,
      };
    }
    return {
      subcategory: level === "subcategory" && selection !== "all" && selection !== "__general__" ? selection : undefined,
      general,
      kind,
    };
  }, [general, kind, level, selection]);

  // Shared with the sidebar (same key), so the "Did you mean" lookup on an
  // unknown slug costs no extra request.
  const { data: nav } = useQuery<AwesomeListNav>({
    queryKey: ["awesome-list-nav"],
    queryFn: fetchAwesomeListNav,
    staleTime: 1000 * 60 * 60,
  });
  const listing = useQuery({
    queryKey: ["awesome-list-listing", level, slug, page, pageOptions],
    queryFn: () => fetchListingPage(level, slug, page, pageOptions),
    enabled: !pageRejected,
    staleTime: 60_000,
    placeholderData: holdWithinNode(level, slug),
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
    if (kind) query.set("kind", kind);
    return `/api/resources?${query.toString()}`;
  }, [debouncedSearch, format, general, kind, level, listingData, page, provider, selection, skillLevel, slug, sort, tags]);
  // The unfiltered listing renders from /api/awesome-list/listing alone; the
  // faceted /api/resources response only feeds the (closed-by-default)
  // filter panel and the filtered result set. Fetch it once either is in
  // play instead of on every listing load — it cost a request plus a full
  // listing re-render on the mobile critical path.
  const taxonomySearchEnabled = Boolean(taxonomySearchUrl) && (serverFilterActive || toolsOpen);
  const taxonomySearch = useQuery<{
    resources: any[];
    total: number;
    search?: { mode: "fts" | "fuzzy"; suggestion?: string };
    facets?: ResourceSearchFacets;
  }>({
    queryKey: [taxonomySearchUrl, level, slug],
    queryFn: () => apiRequest(taxonomySearchUrl, { method: "GET" }),
    enabled: taxonomySearchEnabled,
    staleTime: 60_000,
    placeholderData: holdWithinNode(level, slug),
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
  const displayName = name;
  // A facets error cached from an earlier panel opening must not replace a
  // healthy listing once the query is idle again (e.g. Back to this page with
  // the panel closed): only a live, enabled request can fail the page.
  const taxonomySearchError = taxonomySearchEnabled ? taxonomySearch.error : null;
  // A 400 means the link carries a filter value the API rejects (a stale or
  // edited deep link). The listing itself loaded, so keep the page and offer
  // the recovery /search offers; Retry would only repeat the same 400.
  const invalidFilters = taxonomySearchError instanceof ApiError && taxonomySearchError.status === 400 ? taxonomySearchError : null;
  // Held through the refetch so ErrorPage (and its retry budget) outlives it.
  const pageError = useHeldError(
    listing.error ?? (taxonomySearchError && !invalidFilters ? taxonomySearchError : null),
    listing.isFetching || taxonomySearch.isFetching,
    JSON.stringify([level, slug, page, pageOptions, taxonomySearchUrl]),
  );
  const loading = listing.isLoading && !listingData && !pageError;
  // Placeholder cards belong to the previous page or scope; never show them
  // under a URL that asks for another one.
  const resultsLoading = serverFilterActive
    ? taxonomySearch.isLoading || taxonomySearch.isPlaceholderData
    : listing.isPlaceholderData;
  // While the debounce lags the URL's search, neither total describes the
  // URL, so the clamp-or-404 decision waits.
  const searchSettled = debouncedSearch === normalizedSearch;
  const paginationReady = searchSettled && (serverFilterActive
    ? Boolean(taxonomySearch.data && !taxonomySearch.isPlaceholderData)
    : Boolean(listingData && !listing.isPlaceholderData));
  // Same split as resolveTaxonomyPage: a narrowed view clamps a page past the
  // end, the plain listing 404s it (BUG-027).
  const listingFiltered = serverFilterActive || selection !== "all" || general;
  const pageNotFound = pageRejected || (!listingFiltered && paginationReady && page > totalPages);
  const lastTrackedSearchIntentRef = useRef("");
  const trackedCategoryViewRef = useRef("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pendingResultsFocusRef = useRef(false);
  const pendingAnalyticsRef = useRef<{
    signature: string;
    type: string;
    value: string;
    kind: "filter" | "sort" | "tag";
    tagAction?: "apply" | "remove";
  } | null>(null);
  const currentFilterState = { tags, provider, format, skillLevel, sort, selection, kind };
  const currentFilterSignature = taxonomyFilterSignature(currentFilterState);
  const requestResultsFocus = () => {
    pendingResultsFocusRef.current = true;
  };

  // Task #393: GA4 `category_view` / Mixpanel `category_viewed`. Keyed on the
  // node being viewed, so paging, filtering and re-renders never re-fire it,
  // and a sibling navigation (same component, new slug) does. Only the real
  // (non-placeholder) listing names the node.
  useEffect(() => {
    if (!name || listing.isPlaceholderData || pageNotFound) return;
    const key = `${level}:${slug}`;
    if (trackedCategoryViewRef.current === key) return;
    trackedCategoryViewRef.current = key;
    trackCategoryView(name);
  }, [level, listing.isPlaceholderData, name, pageNotFound, slug]);

  useEffect(() => {
    if (serverSearchActive && taxonomySearch.data && !taxonomySearch.isPlaceholderData) {
      const intent = JSON.stringify([debouncedSearch, level, slug, general, selection, tags, provider, format, skillLevel, sort, kind]);
      if (lastTrackedSearchIntentRef.current === intent) return;
      lastTrackedSearchIntentRef.current = intent;
      trackSearch(debouncedSearch, taxonomySearch.data.total, `taxonomy_${level}`);
    }
  }, [debouncedSearch, format, general, kind, level, provider, selection, serverSearchActive, skillLevel, slug, sort, tags, taxonomySearch.data, taxonomySearch.isPlaceholderData]);

  useEffect(() => {
    if (!pendingResultsFocusRef.current || loading || resultsLoading || listing.isPlaceholderData) return;
    pendingResultsFocusRef.current = false;
    const timer = window.setTimeout(() => resultsHeadingRef.current?.focus({ preventScroll: true }), 250);
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
  const syncedRoute = useRef(hydratedRoute);
  const replaceNextUrlSync = useRef(false);
  const pushSnapshot = useRef("");
  useEffect(() => {
    if (listingFiltered && page > totalPages && paginationReady) {
      // Correct the URL in place: Back to it would only clamp again.
      replaceNextUrlSync.current = true;
      setNotice(`Page ${page} is not available; showing page ${totalPages} instead.`);
      setPage(totalPages);
    }
  }, [listingFiltered, page, paginationReady, totalPages]);
  const stateHref = `${routeFor(level, slug)}${stateQuery.size ? `?${stateQuery}` : ""}`;
  // Search text is left out so typing replaces the entry instead of pushing.
  const snapshot = JSON.stringify([page, selection, tags, provider, format, skillLevel, sort, kind, general, view]);
  useEffect(() => {
    // State just hydrated from a navigation (link, Back/Forward) may still be
    // canonicalised, but that rewrite must not add a history entry.
    const fromUrl = syncedRoute.current !== hydratedRoute;
    const current = `${window.location.pathname}${window.location.search}`;
    // Browser Back/Forward to another route fires this effect (location dep)
    // while this listing is still mounted. Writing our href then would
    // overwrite the entry the user just navigated to and trap them here
    // (Back from a category never reached Home). Only sync while the
    // document is still on this listing's own path.
    if (!samePath(window.location.pathname, routeFor(level, slug))) return;
    // A 404 keeps the requested URL, exactly as the server answered it. A
    // linked page past 1 may still turn out to be one, so wait for its total.
    if (pageNotFound) return;
    if (page > 1 && !paginationReady && strictUrlPage(new URLSearchParams(window.location.search).get("page")) === page) return;
    if (current !== stateHref) {
      const shouldPush = urlSyncInitialized.current && !fromUrl && !replaceNextUrlSync.current && pushSnapshot.current !== snapshot;
      window.history[shouldPush ? "pushState" : "replaceState"]({}, "", stateHref);
      // Cleared only by the write it was set for: the page clamp sets it in
      // the same commit as a sync that has nothing to write yet.
      replaceNextUrlSync.current = false;
    }
    urlSyncInitialized.current = true;
    syncedRoute.current = hydratedRoute;
    pushSnapshot.current = snapshot;
  }, [hydratedRoute, level, location, page, pageNotFound, paginationReady, slug, snapshot, stateHref]);

  // An empty tile is a dead end: a subcategory with no approved resources, or
  // one the kind filter has ruled out. The crawler HTML hides them too.
  const childTiles = listingData?.children.filter((child) => child.count > 0) ?? [];

  const navPlacement = level === "category" ? undefined : findNavNode(nav, level, slug);
  const siblingParent = navPlacement?.parent?.slug ? navPlacement.parent : undefined;
  const siblingTiles = (navPlacement?.siblings ?? [])
    .filter((sibling) => sibling.slug && navTotalCount(sibling) > 0)
    .sort((a, b) => navTotalCount(b) - navTotalCount(a))
    .slice(0, 8);

  if (pageNotFound) return <NotFound />;
  if (loading) return <div className={`taxonomy-page taxonomy-page--${level}`} aria-busy="true"><SEOHead title={findNavNode(nav, level, slug)?.node.name ?? "Loading resources"} description="Loading catalog resources." loading /><div className="taxonomy-loading-header"><PageHeaderSkeleton /></div><div className="taxonomy-grid">{Array.from({ length: 9 }).map((_, i) => <ResourceCardSkeleton key={i} />)}</div></div>;
  // An unknown top-level slug 404s from the listing endpoint. Treat that as a
  // real not-found page (with navigation), not a transient "please try again"
  // error — matching the resource-detail 404 UX. Genuine 5xx/network errors
  // still surface the retry-able error state.
  if (isNotFoundError(listing.error)) return <NotFound suggestion={findTaxonomySuggestion(nav, level, slug)} />;
  if (pageError) {
    return (
      <ErrorPage
        error={pageError}
        retrying={listing.isFetching || taxonomySearch.isFetching}
        onRetry={() => { void (listing.error || !listingData ? listing : taxonomySearch).refetch(); }}
      />
    );
  }
  // A filtered view's results come from the search query, so its pause is the
  // page's too. Held placeholder results render as a loading skeleton here, so
  // a paused fetch behind them (paging offline) is offline as well.
  const resultsQuery = serverFilterActive ? taxonomySearch : listing;
  const resultsOffline = queryUnavailableReason(resultsQuery) === "offline" || (resultsQuery.isPlaceholderData && resultsQuery.isPaused);
  if (queryUnavailableReason(listing) === "offline" || resultsOffline) {
    return <OfflinePageState onRetry={() => { void listing.refetch(); if (resultsQuery !== listing) void resultsQuery.refetch(); }} testId="taxonomy-offline" />;
  }
  if (!listingData || !name) return <NotFound />;

  // C3-V1-01: the active selection keeps its option even when the kind filter
  // empties it ("Codecs (0)"); otherwise the select falls back to its first
  // option and claims "All subcategories" while the URL still filters by it.
  const selectedChild = selection.split(" › ")[0];
  const optionChildren = (listingData.children ?? [])
    .filter((child) => child.count > 0 || child.name === selectedChild)
    .flatMap((child: any) => [
      { value: child.name, count: child.count },
      ...((child.subSubcategories ?? [])
        .filter((subSub: any) => subSub.count > 0 || `${child.name} › ${subSub.name}` === selection)
        .map((subSub: any) => ({ value: `${child.name} › ${subSub.name}`, count: subSub.count }))),
    ]);
  const showScopeSelect = level !== "sub-subcategory" && optionChildren.length > 0;
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
  // One path for the subcategory select and the "Uncategorized" tile, so both
  // set the same URL state, analytics event and focus target.
  const applySelection = (nextSelection: string) => {
    const next = { ...currentFilterState, selection: nextSelection };
    setSelection(nextSelection);
    setGeneral(nextSelection === "__general__");
    setPage(1);
    queueAnalytics(next, "taxonomy_scope", nextSelection);
    requestResultsFocus();
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
    const next = { ...currentFilterState, tags: [], provider: "", format: "", skillLevel: "", kind: null, sort: "default" };
    setTags([]);
    setProvider("");
    setFormat("");
    setSkillLevel("");
    setKind(null);
    setSort("default");
    setPage(1);
    queueAnalytics(next, "all", "cleared");
    requestResultsFocus();
  };
  // Replaces the rejected URL rather than pushing, so Back doesn't return to it.
  const clearInvalidFilters = () => {
    replaceNextUrlSync.current = true;
    setSearchTerm("");
    setTags([]);
    setProvider("");
    setFormat("");
    setSkillLevel("");
    setKind(null);
    setSort("default");
    setPage(1);
    requestResultsFocus();
  };
  // C10-V1-01: the active-filter row's "Clear all" also removes the search chip.
  const clearAllFilters = () => {
    setSearchTerm("");
    clearFacetFilters();
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
    // The header, filters and child tiles above the results don't change with
    // the page, so the top of the window would show none of the new cards.
    resultsRef.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
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
    ? categorySeoDescription(name, slug, total)
    : level === "subcategory"
      ? subcategorySeoDescription(name, parentCategory?.name ?? "", total)
      : subSubcategorySeoDescription(name, parentSubcategory?.name ?? "", total);
  const filterState = {
    category: "",
    subcategory: "",
    subSubcategory: "",
    tags,
    provider,
    format,
    skillLevel,
    kind,
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
  // C3-V1-03: an empty search/filter result is "Resources (0)"; "Coming soon"
  // is only for a category with nothing in it.
  const scopeNarrowed = selection !== "all" || general;
  const narrowed = serverFilterActive || scopeNarrowed;
  const scopeLabel = general ? "Uncategorized" : selection;
  // V19: an unfiltered collection with zero approved resources is empty, not a
  // filter miss — "No resources match this combination" told visitors to clear
  // filters they never set.
  const emptyCollection = listingData.totalAll === 0 && !narrowed && !normalizedSearch;
  const kindLabel = kind ? kind.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "";

  return <div className={`taxonomy-page taxonomy-page--${level}`}>
    {/* LOCKSTEP: og-middleware marks a taxonomy page with nothing approved in it noindex, follow. */}
    <SEOHead title={pagedSeoTitleCore(seoCore, currentPage)} description={pagedSeoDescription(seoDescription, currentPage, totalPages)} category={name} resourceCount={listingData.totalAll} pageParam={currentPage} noindex={listingData.totalAll === 0} follow={listingData.totalAll === 0} />
    {level === "category" ? <Button asChild variant="ghost" size="sm" className="taxonomy-back"><Link href="/categories"><ArrowLeft size={12} aria-hidden="true" />Browse</Link></Button> :
      <nav className="taxonomy-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span>
        {parentCategory && <><Link href={routeFor("category", parentCategory.slug)}>{parentCategory.name}</Link><span aria-hidden="true">/</span></>}
        {level === "sub-subcategory" && parentSubcategory && <><Link href={routeFor("subcategory", parentSubcategory.slug)}>{parentSubcategory.name}</Link><span aria-hidden="true">/</span></>}
        <span aria-current="page">{name}</span>
      </nav>}
    <header className="taxonomy-header">
      {level === "category" && <div className="eyebrow taxonomy-eyebrow"><span aria-hidden="true">{categoryMarks[slug] ?? name.slice(0, 1)}</span>CATEGORY · {name.toUpperCase()}</div>}
      <h1 className="taxonomy-title page-title">{level === "category" ? name : <><span className="serif-italic taxonomy-title-accent">{displayName!.split(" ")[0]}</span>{displayName!.includes(" ") ? ` ${displayName!.split(" ").slice(1).join(" ")}` : ""}</>}</h1>
    <section aria-labelledby="taxonomy-scope-heading" data-seo-section="taxonomy-intro">
      <h2 id="taxonomy-scope-heading" className="sr-only">About this collection</h2>
      {/* Every level carries the same collection introduction as the crawler
          markup (text parity), but the frozen design paints it only on the
          category page; below that it stays screen-reader-only. */}
      <p className={level === "category" ? "taxonomy-description" : "sr-only"}>{listingData.scopeIntro}</p>
    </section>
     <div className="taxonomy-summary"><span className="chip accent">{listingData.totalAll} {resourceNoun(listingData.totalAll)}</span>{kind && <span className="chip">Kind: {kindLabel}</span>}{level === "category" && childTiles.length > 0 && <span className="chip">{childTiles.length} {childTiles.length === 1 ? "subcategory" : "subcategories"}</span>}{level !== "category" && parentCategory && <span>in {parentCategory.name}</span>}<button type="button" className="btn ghost taxonomy-tools-toggle" aria-expanded={toolsOpen} aria-controls="taxonomy-tools-panel" onClick={() => setToolsOpen(value => !value)}><SlidersHorizontal className="taxonomy-tools-toggle__icon" aria-hidden="true" /><span className="taxonomy-tools-toggle__label">{toolsOpen ? "Close filters" : "Filters & view"}</span></button></div>
    </header>
    {/* Directly under the header's toggle: after the subcategory tiles the
        opened panel landed below the fold at 1440x900 and the click looked inert. */}
    <div id="taxonomy-tools-panel" className={`taxonomy-controls taxonomy-production-controls ${toolsOpen ? "taxonomy-production-controls--open" : ""} flex flex-col gap-4`}><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input ref={searchInputRef} className="pl-10" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder={`Search in ${name}...`} aria-label={`Search in ${name}`} data-testid="input-search-resources" /></div>
       {showScopeSelect && <select className="select min-h-11" aria-label={`Limit ${name} by subcategory`} value={selection} onChange={(event) => applySelection(event.target.value)} data-testid="select-subcategory-filter"><option value="all">All subcategories</option>{listingData.generalCount > 0 && <option value="__general__">Uncategorized ({listingData.generalCount})</option>}{optionChildren.map((item) => <option key={item.value} value={item.value}>{item.value} ({item.count})</option>)}</select>}
       <select className="select min-h-11" aria-label="Limit by resource kind" value={kind ?? ""} onChange={(event) => { const nextKind = parseKindParam(event.target.value); setKind(nextKind); setPage(1); requestResultsFocus(); }} data-testid="select-kind-filter"><option value="">All resource kinds</option>{RESOURCE_KIND_VALUES.map((value) => <option key={value} value={value}>{value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}</select>
       <AdvancedFilter selectedTags={tags} sortBy={sort} availableTags={listingData.tags} onTagsChange={(value) => onFacetChange("tags", value)} onSortChange={(value) => onFacetChange("sort", value)} showCountSorts={false} showTagFilter={false} />
       <div className="taxonomy-view-toggle-row" aria-label="View mode">
         <span className="eyebrow">View</span>
         <ViewModeToggle
           value={view}
           onChange={(mode) => {
             setView(mode);
             safeSetItem("awesome-list-view-mode", mode);
           }}
         />
       </div>
    </div>
    {level !== "sub-subcategory" && childTiles.length > 0 && <section className="taxonomy-children" aria-labelledby="taxonomy-children-heading"><h2 id="taxonomy-children-heading">{level === "category" ? "Subcategories" : "Topics"}</h2><div className="taxonomy-child-grid">{childTiles.map((child, index) => <Link key={child.slug} className="taxonomy-child card hoverable" style={{ animationDelay: `${index * 30}ms` }} href={`${routeFor(level === "category" ? "subcategory" : "sub-subcategory", child.slug)}${kind ? `?kind=${kind}` : ""}`}><span>{child.name}</span><span className="chip mono">{child.count}</span></Link>)}{/* Resources filed directly under this collection have no child page;
        without this tile the grid summed short of the category total. */}{listingData.generalCount > 0 && <button type="button" className="taxonomy-child card hoverable" style={{ animationDelay: `${childTiles.length * 30}ms` }} aria-pressed={general} onClick={() => applySelection(general ? "all" : "__general__")} data-testid="taxonomy-child-uncategorized"><span>Uncategorized</span><span className={`chip mono${general ? " accent" : ""}`}>{listingData.generalCount}</span></button>}</div></section>}
    {/* C9-V1-02: active filters stay visible while the tools panel is closed. */}
    <div className="taxonomy-active-filters">{!toolsOpen && scopeNarrowed && <button type="button" className="btn ghost search-filter-chip" aria-label={`Remove filter “${scopeLabel}”`} onClick={broadenScope} data-testid="chip-taxonomy-scope">{scopeLabel}<X className="h-3.5 w-3.5" aria-hidden="true" /></button>}{!toolsOpen && normalizedSearch && <button type="button" className="btn ghost search-filter-chip" aria-label={`Remove search “${normalizedSearch}”`} onClick={() => { setSearchTerm(""); setPage(1); requestResultsFocus(); }}>Search: “{normalizedSearch}”<X className="h-3.5 w-3.5" aria-hidden="true" /></button>}<ActiveFilters state={filterState} onChange={onFacetChange} onClear={clearAllFilters} defaultSort="default" /></div>
    <div className="taxonomy-results-layout">
      <div className={`taxonomy-production-controls ${toolsOpen ? "taxonomy-production-controls--open" : ""}`} aria-busy={toolsOpen && taxonomySearch.isLoading}><SearchFilters state={filterState} facets={taxonomySearch.data?.facets} onChange={onFacetChange} onClear={clearFacetFilters} hideTaxonomyFacets otherControls={["search", ...(showScopeSelect ? ["subcategory"] : []), "resource kind", "sort"]} /></div>
      <div className="min-w-0 flex-1">
        <div ref={resultsRef} tabIndex={-1} className="space-y-4 outline-none" aria-busy={resultsLoading} aria-labelledby="taxonomy-results-heading" data-testid="taxonomy-results-region">
          {/* The listing's single count statement: visible range, matching total,
              and — only while a filter narrows the collection — what it was
              narrowed from. */}
           {/* Below the category level the count stays screen-reader-only until
               something narrows the list; a scope selection narrows it too. */}
           <div className={`taxonomy-results-heading-row${narrowed ? " taxonomy-results-heading-row--narrowed" : ""}`}><h2 ref={resultsHeadingRef} tabIndex={-1} id="taxonomy-results-heading" data-testid="text-results-count" data-total={total}>{level === "category" ? (total > 0 || narrowed ? `Resources (${total})` : "Coming soon") : narrowed ? `${total} of ${listingData.totalAll} ${resourceNoun(listingData.totalAll)} match` : <span className="sr-only">{total} {resourceNoun(total)}</span>}</h2></div>
          {notice && <div role="status" data-testid="notice-page-adjusted" className="rounded border p-3 text-sm">{notice}<button type="button" className="btn ghost ml-2 min-h-8" onClick={() => { setNotice(null); /* C6-SWEEP-07: notice unmounts; focus the results region */ resultsRef.current?.focus({ preventScroll: true }); }}>Dismiss</button></div>}
          {(listingData.scope.ignoredSubcategory || listingData.scope.ignoredSubSubcategory) && <div role="status" data-testid="notice-unknown-subcategory" className="rounded border p-3 text-sm">“{selection}” isn't a subcategory of {name}, so that filter was ignored.<button type="button" className="btn ghost ml-2 min-h-8" onClick={broadenScope}>Remove it</button></div>}
          {serverSearchActive && !taxonomySearch.isPlaceholderData && taxonomySearch.data?.search?.mode === "fuzzy" && taxonomySearch.data.search.suggestion && <div className="flex flex-wrap items-center justify-center gap-2 rounded border p-3 text-sm" role="status" data-testid="notice-taxonomy-search-suggestion"><span>No exact matches. Did you mean</span><Button variant="link" className="h-auto p-0" onClick={() => { setSearchTerm(taxonomySearch.data!.search!.suggestion!); setPage(1); /* C6-SWEEP-08: the notice unmounts with this button; the input is display:none while the tools panel is closed, so fall back to the results region */ const input = searchInputRef.current; if (input && input.offsetParent !== null) input.focus(); else resultsRef.current?.focus({ preventScroll: true }); }}>{taxonomySearch.data.search.suggestion}</Button><span>?</span></div>}
          {invalidFilters ? <StatePanel tone="error" label="Invalid filters" title="These filters can’t be applied" inline testId="taxonomy-invalid-filters" actions={<Button variant="outline" onClick={clearInvalidFilters} data-testid="button-clear-invalid-filters">Clear invalid filters</Button>}>{invalidFilters.message}</StatePanel>
             : resultsLoading ? <div className="taxonomy-grid" data-testid="taxonomy-results-loading">{Array.from({ length: 6 }).map((_, index) => <ResourceCardSkeleton key={index} />)}</div>
             : resources.length === 0 ? <StatePanel tone="empty" label={emptyCollection ? "No resources" : "No matches"} title={emptyCollection ? "No resources here yet" : "No resources match this combination"} inline testId="empty-resources" actions={<>{(tags.length > 0 || provider || format || skillLevel || kind || sort !== "default") && <Button variant="outline" onClick={clearFacetFilters} data-testid="button-clear-taxonomy-filters">Clear filters</Button>}{normalizedSearch && <Button variant="ghost" onClick={() => { setSearchTerm(""); setPage(1); requestResultsFocus(); }} data-testid="button-clear-taxonomy-search">Clear search</Button>}{(selection !== "all" || general) ? <Button variant="secondary" onClick={broadenScope} data-testid="button-broaden-taxonomy-scope">Show all in {name}</Button> : <Button asChild variant="secondary"><Link href={broadenHref} data-testid="link-broaden-taxonomy-scope">{level === "category" ? `Search all of ${siteName}` : "Search the broader category"}</Link></Button>}</>}>{emptyCollection ? `Nothing has been approved for this ${level === "category" ? "category" : "collection"} yet. Browse the wider catalog in the meantime.` : "Clear a filter, remove the search, or broaden where you're looking."}</StatePanel> :
            <div className={view === "grid" ? "taxonomy-grid" : view === "list" ? "flex flex-col gap-2" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"}>{resources.map((resource: any, index: number) => {
               const normalized = {
                 ...resource,
                 id: String(resource.id ?? ""),
                 title: resource.title,
                 url: resource.url,
                 description: resource.description ?? "",
                 name: resource.title,
                 category: level === "category" ? name : parentCategory?.name,
                 tags: resource.tags ?? resource.metadata?.tags ?? [],
               };
              if (view === "list") return <ResourceListRow key={`${normalized.id}-${index}`} resource={normalized} />;
              if (view === "compact") return <ResourceCompactCard key={`${normalized.id}-${index}`} resource={normalized} />;
                return <ResourceCard key={`${normalized.id}-${index}`} variant="taxonomy" showPersonalActions={false} resource={normalized} fullResource={resource} onTagClick={(tag) => onFacetChange("tags", tags.some(old => normalizeTag(old) === normalizeTag(tag)) ? tags : [...tags, tag])} />;
            })}</div>}
          {/* Page navigation stays visible whenever the collection spans more
              than one page: it is primary navigation, not a filter tool. */}
          {totalPages > 1 && <div className="taxonomy-pagination"><Paginator currentPage={currentPage} totalPages={totalPages} makeHref={makeHref} onNavigate={onPage} /></div>}
        </div>
      </div>
    </div>
    {/* Where next: most visitors who land on a subcollection leave from it,
        and below lg the sidebar listing its neighbours is hidden. */}
    {level !== "category" && siblingParent && siblingTiles.length > 0 && <section className="taxonomy-children taxonomy-siblings" aria-labelledby="taxonomy-siblings-heading" data-testid="taxonomy-siblings"><h2 id="taxonomy-siblings-heading">More in {siblingParent.name}</h2><div className="taxonomy-child-grid">{siblingTiles.map((sibling) => <Link key={sibling.slug} className="taxonomy-child card hoverable" href={routeFor(level, sibling.slug!)}><span>{sibling.name}</span><span className="chip mono">{navTotalCount(sibling)}</span></Link>)}<Link className="taxonomy-child card hoverable" href={routeFor(level === "subcategory" ? "category" : "subcategory", siblingParent.slug!)} data-testid="taxonomy-siblings-parent"><span>All of {siblingParent.name}</span><span aria-hidden="true">→</span></Link></div></section>}
  </div>;
}
