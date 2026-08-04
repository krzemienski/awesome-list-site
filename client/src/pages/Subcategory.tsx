import { ResourceCardSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEOHead from "@/components/layout/SEOHead";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ArrowLeft, Search } from "lucide-react";
import AdvancedFilter from "@/components/ui/advanced-filter";
import ResourceCard from "@/components/resource/ResourceCard";
import { ResourceListRow, ResourceCompactCard } from "@/components/resource/resource-view-modes";
import { ViewModeToggle, ViewMode, isLayoutViewMode } from "@/components/ui/view-mode-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paginator } from "@/components/ui/paginator";
import { parsePageParamStrict, pageNoticeFor } from "@/lib/page-param";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { deslugify, getCategorySlug } from "@/lib/utils";
import { normalizeTag, parseTagsParam } from "@/lib/tags";
import { Resource } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";

// Run16 BUG-051: same page size as Category so subcategory lists paginate
// instead of rendering hundreds of cards at once.
const PAGE_SIZE = 24;

export default function Subcategory() {
  const { slug } = useParams<{ slug: string }>();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();

  const getSearchParams = () => new URLSearchParams(window.location.search);

  // audit2 BUG-029/BUG-030: reactive content-filter params (parity with
  // /category). ?subcategory=<name> drills into one sub-subcategory;
  // ?filter=general (legacy alias ?view=general — accepted on arrival,
  // normalized away by the URL-sync effect) shows only rows sitting directly
  // on this subcategory node. ?view= itself is layout-only.
  const arrivalParams = new URLSearchParams(searchString);
  const isGeneralView =
    arrivalParams.get("filter") === "general" ||
    arrivalParams.get("view") === "general";
  const [selectedChild, setSelectedChild] = useState<string>(() => getSearchParams().get("subcategory") || "all");

  // BUG-064 (run27): shared parser — canonical ?tags=, the ?tag= alias,
  // repeated params, comma lists, whitespace chunks all parse identically on
  // every page that accepts a tag filter (?tags=+++ used to keep a " "
  // chunk here and filter everything out).
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    parseTagsParam(getSearchParams()),
  );
  // BUG-064 (run27, parity with Home): a present-but-empty tag filter
  // (?tags=+++ or ?tags=) is ignored — surface a small dismissible note so
  // the visitor knows their link's filter didn't apply.
  const [emptyTagParamNotice, setEmptyTagParamNotice] = useState(() => {
    const params = getSearchParams();
    return (
      (params.has("tags") || params.has("tag")) &&
      parseTagsParam(params).length === 0
    );
  });
  const [sortBy, setSortBy] = useState(() => getSearchParams().get("sortBy") || "default");
  const [searchTerm, setSearchTerm] = useState(() => getSearchParams().get("search") || "");
  // audit2 BUG-022/BUG-023/BUG-027: the shared STRICT taxonomy URL rule
  // (shared/page-param.ts) — the same verdict og-middleware soft-404s on, so
  // non-canonical spellings ("1e3", "007", "abc") and underflow ("0") fall
  // back to page 1 WITH a visible notice instead of a silent rewrite (or,
  // worse, rendering content the crawler pass denies with a 404).
  const [pageInit] = useState(() => parsePageParamStrict(getSearchParams().get("page")));
  const [page, setPage] = useState(pageInit.page);
  const [pageNotice, setPageNotice] = useState<string | null>(() => pageNoticeFor(pageInit));
  // True while a URL-supplied in-range page still awaits the data-loaded
  // over-range check; user-driven page changes never re-arm it.
  const urlPagePendingRef = useRef(pageInit.kind === "valid");

  // Any user-driven filter change resets to page 1 and retires a stale
  // page-correction notice.
  const resetPage = () => {
    setPage(1);
    setPageNotice(null);
    urlPagePendingRef.current = false;
  };
  // Run16 BUG-050: grid/list/compact toggle, shared preference key with
  // Category so the choice follows the user across taxonomy levels.
  // Run22 BUG-026: an explicit ?view=grid|list|compact wins over the saved
  // preference and is persisted back to the URL (also once the user toggles).
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const fromUrl = getSearchParams().get('view');
    if (isLayoutViewMode(fromUrl)) return fromUrl;
    const saved = safeGetItem('awesome-list-view-mode');
    return saved === 'grid' || saved === 'list' || saved === 'compact' ? saved : 'grid';
  });
  const viewParamExplicitRef = useRef(isLayoutViewMode(getSearchParams().get('view')));
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    safeSetItem('awesome-list-view-mode', mode);
    viewParamExplicitRef.current = true;
  };
  
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
  });
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;
  
  let currentSubcategory = null;
  let parentCategory = null;
  let staticResources: Resource[] = [];
  
  if (awesomeList && slug) {
    for (const category of awesomeList.categories) {
      const subcategory = category.subcategories.find(sub => 
        sub.slug === slug
      );
      if (subcategory) {
        currentSubcategory = subcategory;
        parentCategory = category;
        staticResources = [
          ...subcategory.resources,
          ...(subcategory.subSubcategories || []).flatMap((ss) => ss.resources),
        ];
        break;
      }
    }
  }
  
  const subcategoryName = currentSubcategory ? currentSubcategory.name : deslugify(slug || "");
  const categoryName = parentCategory ? parentCategory.name : "";
  
  const allResources: Resource[] = useMemo(() => {
    const seen = new Set<string>();
    const normalized: Resource[] = [];
    for (const r of staticResources) {
      const key = `${r.id ?? ""}|${r.url ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push({
        ...r,
        tags: (r.tags && r.tags.length > 0)
          ? r.tags
          : (Array.isArray(r.metadata?.tags) ? (r.metadata.tags as string[]) : []),
      });
    }
    return normalized;
  }, [staticResources]);

  // audit2 BUG-029: drill-down options over this subcategory's
  // sub-subcategories — taxonomy TREE nodes with identity-match counts, the
  // same rule /category uses (option label always equals result-set size).
  const childOptions = useMemo(() => {
    const opts: Array<{ value: string; count: number }> = [];
    if (!currentSubcategory) return opts;
    const subs = [...((((currentSubcategory as any).subSubcategories as any[]) || []))].sort(
      (a: any, b: any) => String(a.name).localeCompare(String(b.name)),
    );
    for (const ss of subs) {
      const count = allResources.filter((r) => r.subSubcategory === ss.name).length;
      if (count > 0) opts.push({ value: ss.name, count });
    }
    return opts;
  }, [currentSubcategory, allResources]);

  const childByValue = useMemo(
    () => new Map(childOptions.map((o) => [o.value, o])),
    [childOptions],
  );

  // audit2 BUG-031 (level parity): the "Uncategorized" bucket is the identity
  // set of rows sitting DIRECTLY on this subcategory node — the same set the
  // sidebar's counts use — never `!r.subSubcategory`.
  const generalIdentitySet = useMemo(() => {
    const s = new Set<string>();
    for (const r of (((currentSubcategory as any)?.resources as any[]) || [])) {
      s.add(`${r.id ?? ""}|${r.url ?? ""}`);
    }
    return s;
  }, [currentSubcategory]);

  // Unknown deep-linked ?subcategory= value → ignored with an explicit notice
  // (mirrors /category BUG-059) instead of a false empty state.
  const childUnknown =
    !isGeneralView &&
    selectedChild !== "all" &&
    selectedChild !== "__general__" &&
    !!currentSubcategory &&
    !childByValue.has(selectedChild);

  // URL forced ?filter=general but every resource here sits under a
  // sub-subcategory — ignore the filter and say so (never "0 of 0").
  const generalFilterEmpty =
    isGeneralView && !isLoading && !!currentSubcategory && generalIdentitySet.size === 0;

  const availableTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    allResources.forEach((r) => {
      const tags = r.tags || [];
      tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [allResources]);

  const filteredResources = useMemo(() => {
    let results = [...allResources];

    // BUG-060 (run27): whitespace-only input is NO search — "   " used to
    // match literally and hide every resource ("Showing 0 of 0").
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      results = results.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    }

    // audit2 BUG-029/030/031: level-consistent content filters (parity with
    // /category) — drill into one sub-subcategory by node identity, or show
    // the General bucket (rows directly on this node). An empty General set
    // is ignored (notice renders instead — never a "0 of 0" dead-end).
    if (isGeneralView) {
      if (generalIdentitySet.size > 0) {
        results = results.filter((r) => generalIdentitySet.has(`${r.id ?? ""}|${r.url ?? ""}`));
      }
    } else if (selectedChild !== "all" && !childUnknown && childByValue.has(selectedChild)) {
      results = results.filter((r) => r.subSubcategory === selectedChild);
    }

    if (selectedTags.length > 0) {
      // NB-011 (run23): case-insensitive tag matching — parity with
      // Home/Category, so ?tags=av1 and ?tags=AV1 return identical results.
      const wanted = selectedTags.map(normalizeTag);
      results = results.filter(r =>
        r.tags && r.tags.some(tag => wanted.includes(normalizeTag(tag)))
      );
    }

    if (sortBy === "name-asc") {
      results.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "name-desc") {
      results.sort((a, b) => b.title.localeCompare(a.title));
    }

    return results;
  }, [allResources, searchTerm, selectedTags, sortBy, isGeneralView, generalIdentitySet, selectedChild, childUnknown, childByValue]);

  // ----- Client-side pagination (Run16 BUG-051, mirrors Category BUG-007) -----
  const totalPages = Math.max(1, Math.ceil(filteredResources.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pagedResources = useMemo(
    () => filteredResources.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredResources, currentPage],
  );

  // Guarded on loaded + node found (NOT non-empty results): a zero-match
  // filter has exactly one empty page, and ?page=2 on it must still correct
  // visibly instead of lingering in the URL.
  useEffect(() => {
    if (!isLoading && currentSubcategory) {
      if (page > totalPages) {
        // audit2 BUG-023: when the out-of-range page came from the URL, say so
        // instead of silently rewriting; user-driven shrinks stay silent.
        if (urlPagePendingRef.current) {
          setPageNotice(pageNoticeFor({ page, kind: "valid", raw: String(page) }, totalPages));
        }
        setPage(totalPages);
      }
      urlPagePendingRef.current = false;
    }
  }, [isLoading, currentSubcategory, page, totalPages]);

  // audit2 BUG-032: numbered paginator helpers — real hrefs merge ?page=N into
  // the current query (filters survive open-in-new-tab); plain SPA clicks go
  // through goToPage so history semantics stay with the URL-sync effect.
  const makePageHref = (n: number) => {
    const params = new URLSearchParams(window.location.search);
    if (n > 1) params.set("page", String(n));
    else params.delete("page");
    const qs = params.toString();
    return `/subcategory/${slug}${qs ? `?${qs}` : ""}`;
  };
  const goToPage = (n: number) => {
    setPage(n);
    setPageNotice(null);
    urlPagePendingRef.current = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // audit2 BUG-029: the drill-down Select is also the way OUT of General view
  // (URL-driven via ?filter=general) — navigating without the flag recomputes
  // the reactive isGeneralView. "__general__" is the selected sentinel while
  // in General view, so any other pick is a genuine change.
  const handleChildChange = (value: string) => {
    if (value === "__general__") {
      if (isGeneralView) return; // already in General view
      setSelectedChild("all");
      resetPage();
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("search", searchTerm);
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);
      // audit2 BUG-030: content filter key, decoupled from layout ?view=.
      params.set("filter", "general");
      if (viewParamExplicitRef.current) params.set("view", viewMode);
      setLocation(`/subcategory/${slug}?${params.toString()}`);
      return;
    }
    setSelectedChild(value);
    resetPage();
    if (isGeneralView) {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("search", searchTerm);
      if (value && value !== "all") params.set("subcategory", value);
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);
      if (viewParamExplicitRef.current) params.set("view", viewMode);
      const qs = params.toString();
      setLocation(`/subcategory/${slug}${qs ? `?${qs}` : ""}`);
    }
  };

  // Run16 BUG-005: tag/sort changes PUSH history entries so Back restores the
  // previous list state; search keystrokes, initial normalization, and the
  // post-popstate re-sync still replace.
  const urlSyncInitializedRef = useRef(false);
  const popNavigationRef = useRef(false);
  const pushSnapshotRef = useRef("");

  useEffect(() => {
    // Run23 NB-033: bail when Back/Forward has already moved the browser URL
    // off this page — otherwise this effect's final run (location dep) writes
    // this page's path over the destination history entry.
    if (window.location.pathname !== `/subcategory/${slug}`) return;
    const params = new URLSearchParams();

    // BUG-060 (run27): drop ?search= when the box holds only whitespace.
    if (searchTerm.trim()) params.set("search", searchTerm);
    // audit2 BUG-029: persist the sub-subcategory drill-down.
    if (!isGeneralView && selectedChild && selectedChild !== "all") params.set("subcategory", selectedChild);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);
    if (page > 1) params.set("page", String(page));
    // audit2 BUG-030: canonical content-filter key (?filter=general); a legacy
    // ?view=general arrival is normalized here. Independently (Run22 BUG-026)
    // persist an explicitly chosen layout view — the two params coexist.
    if (isGeneralView) params.set("filter", "general");
    if (viewParamExplicitRef.current) params.set("view", viewMode);

    const newSearch = params.toString();
    const newPath = `/subcategory/${slug}${newSearch ? `?${newSearch}` : ""}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;

    const pushSnapshot = JSON.stringify([page, selectedChild, selectedTags, sortBy, isGeneralView, viewMode]);
    if (currentPath !== newPath) {
      const shouldPush =
        urlSyncInitializedRef.current &&
        !popNavigationRef.current &&
        pushSnapshotRef.current !== pushSnapshot;
      if (shouldPush) {
        window.history.pushState({}, "", newPath);
      } else {
        window.history.replaceState({}, "", newPath);
      }
    }
    urlSyncInitializedRef.current = true;
    popNavigationRef.current = false;
    pushSnapshotRef.current = pushSnapshot;
  }, [searchTerm, selectedChild, selectedTags, sortBy, page, slug, location, isGeneralView, viewMode]);

  useEffect(() => {
    const handlePopState = () => {
      popNavigationRef.current = true;
      const params = getSearchParams();
      setSearchTerm(params.get("search") || "");
      // audit2 BUG-029: restore the drill-down carried by this history entry.
      setSelectedChild(params.get("subcategory") || "all");
      // BUG-064 (run27): same shared parser as the initializer.
      setSelectedTags(parseTagsParam(params));
      setSortBy(params.get("sortBy") || "default");
      // audit2 BUG-022/023: same shared page rule as the initializer, with the
      // same visible feedback when this history entry carries a bad value.
      const parsed = parsePageParamStrict(params.get("page"));
      setPage(parsed.page);
      setPageNotice(pageNoticeFor(parsed));
      urlPagePendingRef.current = parsed.kind === "valid";
      // Run22 BUG-026: restore the layout view carried by this history entry.
      const v = params.get("view");
      if (isLayoutViewMode(v)) {
        setViewMode(v);
        viewParamExplicitRef.current = true;
      } else {
        viewParamExplicitRef.current = false;
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (subcategoryName && !isLoading) {
      trackCategoryView(`${categoryName} > ${subcategoryName}`);
    }
  }, [subcategoryName, categoryName, isLoading]);
  
  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy={true} aria-live="polite">
        {/* BUG-031 (run22): head swaps with the route immediately. */}
        <SEOHead title="Loading subcategory" description="Loading subcategory resources on Awesome Video." />
        <h1 className="sr-only">Loading subcategory…</h1>
        <div className="space-y-4">
          <PageHeaderSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <ResourceCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="sr-only">Subcategory error</h1>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Error Loading Subcategory</h2>
          <p className="text-muted-foreground">There was an error loading the subcategory data.</p>
          <Link href="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  if (!currentSubcategory && !isLoading) {
    return <NotFound />;
  }
  
  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      <SEOHead
        title={subcategoryName}
        description={`Browse ${allResources.length} curated ${subcategoryName.toLowerCase()} resources in the ${categoryName} category on Awesome Video.`}
        category={subcategoryName}
        resourceCount={allResources.length}
        // BUG-012 (audit 2): page 2+ self-canonicalizes (?page=N), mirroring
        // og-middleware's paginated canonical (two-pass parity).
        pageParam={currentPage}
      />

      {/* BUG-030 (run13): the app header already renders this exact crumb
          chain on md+ screens — page-level breadcrumbs are now mobile-only so
          desktop doesn't show the trail twice. */}
      <div className="md:hidden">
        <Breadcrumbs
          items={[
            {
              label: categoryName,
              href: `/category/${getCategorySlug(categoryName)}`,
            },
            {
              label: subcategoryName,
            },
          ]}
        />
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* Run16 BUG-049: asChild so the anchor IS the ≥44px button. */}
        <Button asChild variant="ghost" size="sm" className="gap-2 min-h-[44px]">
          <Link href={`/category/${getCategorySlug(categoryName)}`} data-testid="button-back-category">
            <ArrowLeft className="h-4 w-4" />
            Back to {categoryName}
          </Link>
        </Button>
        
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="display-h text-xl sm:text-2xl md:text-3xl break-words">
              {subcategoryName}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Category: {categoryName}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* audit2 BUG-029: drill-down filter over this subcategory's
                sub-subcategories (parity with /category), driven by
                ?subcategory= so deep links filter too. */}
            {childOptions.length > 0 && (
              <Select value={isGeneralView ? "__general__" : selectedChild} onValueChange={handleChildChange}>
                <SelectTrigger aria-label="Filter by sub-subcategory" className="w-full md:w-[200px]" data-testid="select-subcategory-filter">
                  <SelectValue placeholder="Filter by sub-subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {/* Only when the bucket is non-empty (audit2 BUG-031) —
                      kept listed while a URL forces the filter so the
                      trigger stays honest. */}
                  {(generalIdentitySet.size > 0 || isGeneralView) && (
                    <SelectItem value="__general__">Uncategorized ({generalIdentitySet.size})</SelectItem>
                  )}
                  <SelectItem value="all">All Sub-subcategories</SelectItem>
                  {childOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.value} ({opt.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Run22 BUG-025: badge tracks the active filter result count. */}
            <Badge variant="secondary" className="no-print text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 shrink-0" data-testid="badge-count">
              {filteredResources.length}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
          placeholder="Search resources..."
          className="pl-9 min-h-[44px]"
          data-testid="input-search"
        />
      </div>

      <AdvancedFilter
        selectedTags={selectedTags}
        sortBy={sortBy}
        availableTags={availableTags}
        onTagsChange={(tags) => { setSelectedTags(tags); resetPage(); }}
        onSortChange={(value) => { setSortBy(value); resetPage(); }}
        showCountSorts={false}
      />
      
      {/* BUG-064 (run27, parity with Home): honest feedback when the link
          carried a tag param that parsed to nothing (?tags=+++ / ?tags=). */}
      {emptyTagParamNotice && selectedTags.length === 0 && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] px-4 py-2 text-sm text-[color:var(--text-2)]"
          role="status"
          data-testid="notice-empty-tag-param"
        >
          <span>The tag filter in the link you followed was empty, so it was ignored.</span>
          <button
            type="button"
            className="underline underline-offset-2 min-h-8"
            onClick={() => setEmptyTagParamNotice(false)}
            data-testid="button-dismiss-empty-tag-param"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* audit2 BUG-023: visible feedback whenever a URL-supplied page value
          was corrected — never a silent rewrite. */}
      {pageNotice && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] px-4 py-2 text-sm text-muted-foreground"
          role="status"
          data-testid="notice-page-adjusted"
        >
          <span>{pageNotice}</span>
          <button
            type="button"
            className="underline underline-offset-2 min-h-8"
            onClick={() => setPageNotice(null)}
            data-testid="button-dismiss-page-notice"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* audit2 BUG-031: never dead-end the Uncategorized view. */}
      {generalFilterEmpty && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] px-4 py-2 text-sm text-muted-foreground"
          role="status"
          data-testid="notice-general-empty"
        >
          <span>
            {subcategoryName} has no uncategorized resources, so the filter was ignored and all {filteredResources.length} are shown.
          </span>
          <button
            type="button"
            className="underline underline-offset-2 min-h-8"
            onClick={() => handleChildChange("all")}
            data-testid="button-clear-general-filter"
          >
            Remove filter
          </button>
        </div>
      )}

      {/* audit2 BUG-029: explicit feedback instead of a false empty state
          when the URL named a sub-subcategory that doesn't exist here. */}
      {childUnknown && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] px-4 py-2 text-sm text-muted-foreground"
          role="status"
          data-testid="notice-unknown-subcategory"
        >
          <span>
            “{selectedChild}” isn't a sub-subcategory of {subcategoryName}, so that filter was ignored.
          </span>
          <button
            type="button"
            className="underline underline-offset-2 min-h-8"
            onClick={() => setSelectedChild("all")}
            data-testid="button-clear-unknown-subcategory"
          >
            Remove it
          </button>
        </div>
      )}

      {allResources.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          {/* NB-051 (run18): let the position label wrap at narrow widths instead
              of truncating to "…of 11 resou…"; keep it readable at 375px. */}
          <p className="text-sm text-muted-foreground min-w-0 whitespace-normal break-words" data-testid="text-results-count">
            {/* Run16 BUG-051: show the page range like Category does. */}
            Showing {filteredResources.length === 0
              ? "0"
              : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredResources.length)}`} of {filteredResources.length} resource{filteredResources.length === 1 ? '' : 's'}
            {selectedTags.length > 0 && ` (filtered by ${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''})`}
          </p>
          {/* Run16 BUG-050: view mode toggle, matching Category. */}
          <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
        </div>
      )}
      
      {allResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            There are no resources in this subcategory yet.
          </p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          {/* BUG-042 (run14): copy matches the control that actually caused
              the empty state (search vs tag filter). */}
          <p className="text-muted-foreground">
            {searchTerm.trim() && selectedTags.length > 0
              ? "Try a different search term or adjust your tag filters."
              : searchTerm.trim()
                ? `No resources match "${searchTerm.trim()}". Try a different search term.`
                : "Try adjusting your tag filters to see more results."}
          </p>
        </div>
      ) : (
        /* BUG-016 (run14): md (768px) drops back to 1 col — the sidebar
           reappears at md and a 2-col grid left ~60px titles ("Adv…"). */
        <div className={
          viewMode === "grid"
            // BUG-003 (run22): 3 cols only from xl — same lg squeeze as /category.
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4"
            : viewMode === "list"
            ? "flex flex-col gap-2 min-w-0"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 min-w-0"
        }>
          {pagedResources.map((resource, index) => {
            const normalized = {
              id: resource.id != null ? String(resource.id) : "",
              title: resource.title,
              url: resource.url,
              description: resource.description,
            };
            if (viewMode === "list") {
              return <ResourceListRow key={`${resource.id ?? resource.url}-${index}`} resource={normalized} />;
            }
            if (viewMode === "compact") {
              return <ResourceCompactCard key={`${resource.id ?? resource.url}-${index}`} resource={normalized} />;
            }
            return (
              <ResourceCard
                key={`${resource.id ?? resource.url}-${index}`}
                resource={{
                  id: normalized.id,
                  name: resource.title,
                  url: resource.url,
                  description: resource.description,
                  category: resource.subSubcategory || undefined,
                  tags: resource.tags,
                }}
                onTagClick={(tag) => {
                  setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
                  resetPage();
                }}
              />
            );
          })}
        </div>
      )}

      {/* audit2 BUG-032: numbered pages + jump box — any page in ≤2 interactions. */}
      <Paginator
        currentPage={currentPage}
        totalPages={totalPages}
        makeHref={makePageHref}
        onNavigate={goToPage}
      />
    </div>
  );
}
