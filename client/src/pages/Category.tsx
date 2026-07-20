import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useLocation, useSearch, Redirect } from "wouter";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SEOHead from "@/components/layout/SEOHead";
import { categorySeoTitleCore, categorySeoDescription } from "@shared/seo-templates";
import AdvancedFilter from "@/components/ui/advanced-filter";
import { ViewModeToggle, ViewMode, isLayoutViewMode } from "@/components/ui/view-mode-toggle";
import ResourceCard from "@/components/resource/ResourceCard";
import { ResourceListRow, ResourceCompactCard } from "@/components/resource/resource-view-modes";
import { ArrowLeft, Search } from "lucide-react";
import { deslugify } from "@/lib/utils";
import { normalizeTag } from "@/lib/tags";
import { Resource } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";

/** Classic Levenshtein edit distance (small inputs only — slugs/tokens). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * "Did you mean …?" — fuzzy-match a bad category slug against the real
 * category slugs (full slug AND each hyphen token, so "comunity" still
 * finds "community-events") with edit distance ≤ 2.
 */
function findCategorySuggestion(
  slug: string | undefined,
  categories: Array<{ name: string; slug: string }>,
): { label: string; href: string } | undefined {
  if (!slug) return undefined;
  const needle = slug.toLowerCase();
  let best: { name: string; slug: string; dist: number } | undefined;
  for (const cat of categories) {
    const candidates = [cat.slug, ...cat.slug.split("-")];
    const dist = Math.min(...candidates.map((c) => levenshtein(needle, c)));
    if (dist <= 2 && (!best || dist < best.dist)) {
      best = { name: cat.name, slug: cat.slug, dist };
    }
  }
  return best
    ? { label: `Did you mean ${best.name}?`, href: `/category/${best.slug}` }
    : undefined;
}

/** How many resource cards render per page (BUG-007 client-side pagination). */
const PAGE_SIZE = 24;

/**
 * Normalize the sort URL param. The canonical AdvancedFilter values
 * ("default", "name-asc", "name-desc") pass through unchanged so a
 * reload/back-button restores the select; the ?sort= alias plus the bare
 * shorthand "name"/"asc"/"desc" map onto name ordering (BUG-006).
 * BUG-003 (run14): count-asc/count-desc are no longer offered on resource
 * lists (they only sort category grids) — legacy URLs fold to "default".
 */
const CANONICAL_SORTS = new Set(["default", "name-asc", "name-desc"]);
function normalizeSort(value: string | null): string {
  if (!value) return "default";
  const v = value.toLowerCase();
  if (CANONICAL_SORTS.has(v)) return v;
  if (v === "name" || v === "asc") return "name-asc";
  if (v === "desc") return "name-desc";
  return "default";
}

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();

  const getSearchParams = () => new URLSearchParams(window.location.search);

  // "General" view = resources assigned to this category but no subcategory.
  // Driven by the reactive ?view=general query param (from the sidebar "General"
  // row) so it updates even when only the query string changes.
  const viewFilter = new URLSearchParams(searchString).get("view") || "";
  const isGeneralView = viewFilter === "general";

  const [searchTerm, setSearchTerm] = useState(() => getSearchParams().get("search") || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(() => getSearchParams().get("subcategory") || "all");
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    // Canonical ?tags= (comma-separated) OR the ?tag= singular alias (BUG-005).
    const tags = getSearchParams().get("tags") || getSearchParams().get("tag");
    return tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  });
  // Canonical ?sortBy= OR the ?sort= alias / bare "name" (BUG-006), normalized.
  const [sortBy, setSortBy] = useState(() => normalizeSort(getSearchParams().get("sortBy") || getSearchParams().get("sort")));
  const [page, setPage] = useState(() => {
    const p = parseInt(getSearchParams().get("page") || "1", 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  
  // Run22 BUG-026: an explicit ?view=grid|list|compact wins over the saved
  // preference, and once the user toggles (or arrived with ?view=) we keep
  // writing the choice back to the URL so reload/Back/Forward preserve it.
  // ?view=general (Category's no-subcategory bucket) keeps precedence.
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const fromUrl = getSearchParams().get('view');
      if (isLayoutViewMode(fromUrl)) return fromUrl;
      const saved = safeGetItem('awesome-list-view-mode');
      if (saved === 'grid' || saved === 'list' || saved === 'compact') {
        return saved;
      }
    }
    return 'grid';
  });
  const viewParamExplicitRef = useRef(
    typeof window !== 'undefined' && isLayoutViewMode(getSearchParams().get('view')),
  );

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
  
  const currentCategory = awesomeList?.categories.find(cat =>
    cat.slug === slug
  );

  const categoryName = currentCategory ? currentCategory.name : deslugify(slug || "");

  // Source of truth: the single deduplicated tree (GET /api/awesome-list), the
  // same source the sidebar, header, home cards, and SSR use. Flatten every
  // approved resource under this category (direct + subcategory + sub-sub) so the
  // count and the rendered list match everywhere and no near-duplicate URL rows
  // (which the raw resources table still carries) render as duplicate cards.
  const treeResources = useMemo(() => {
    if (!currentCategory) return [] as any[];
    const flat = [
      ...(((currentCategory as any).resources as any[]) || []),
      ...((((currentCategory as any).subcategories as any[]) || []).flatMap((sub: any) => [
        ...((sub.resources as any[]) || []),
        ...(((sub.subSubcategories as any[]) || []).flatMap(
          (ss: any) => (ss.resources as any[]) || [],
        )),
      ])),
    ];
    const seen = new Set<string>();
    const out: any[] = [];
    for (const r of flat) {
      const key = `${r.id ?? ""}|${r.url ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }, [currentCategory]);

  const allResources: Resource[] = useMemo(() => {
    return treeResources.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      url: r.url,
      tags: Array.isArray(r.metadata?.tags) ? (r.metadata.tags as string[]) : [],
      category: r.category,
      subcategory: r.subcategory || undefined,
      subSubcategory: r.subSubcategory || undefined,
    }));
  }, [treeResources]);
  
  const subcategories = useMemo(() => {
    const uniqueSubcategories = new Set<string>();
    allResources.forEach(resource => {
      if (resource.subcategory) {
        uniqueSubcategories.add(resource.subcategory);
      }
    });
    return Array.from(uniqueSubcategories).sort();
  }, [allResources]);

  const availableTags = useMemo(() => {
    // Canonicalize tag variants (space/underscore/case → hyphenated lowercase)
    // so "open-source" and "open source" collapse into one chip with a summed
    // count. Mirrors the /api/tags SQL normalization — keep in lockstep.
    const tagCounts: Record<string, number> = {};
    allResources.forEach((r) => {
      const tags = r.tags || [];
      const seen = new Set<string>();
      tags.forEach((tag: string) => {
        const canonical = normalizeTag(tag);
        if (!canonical || seen.has(canonical)) return;
        seen.add(canonical);
        tagCounts[canonical] = (tagCounts[canonical] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [allResources]);
  
  const filteredResources = useMemo(() => {
    let results = [...allResources];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(r =>
        r.title.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
      );
    }

    if (isGeneralView) {
      // NOTE: the sidebar "General" badge counts direct resources PLUS any
      // folded-back orphans (resources whose subcategory string maps to no real
      // subcategory row — see LegacyRepository). This view shows only rows with
      // no subcategory (!r.subcategory). Today the orphan set is empty so the two
      // agree exactly; a resource written with an unmapped subcategory string
      // would inflate the badge without appearing here.
      results = results.filter(r => !r.subcategory);
    } else if (selectedSubcategory !== "all") {
      results = results.filter(r => r.subcategory === selectedSubcategory);
    }

    if (selectedTags.length > 0) {
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
  }, [allResources, searchTerm, selectedSubcategory, selectedTags, sortBy, isGeneralView]);

  // ----- Client-side pagination (BUG-007) -----
  const totalPages = Math.max(1, Math.ceil(filteredResources.length / PAGE_SIZE));
  // Clamp for RENDERING only; the raw `page` state (which may briefly exceed the
  // range while data loads or filters shrink) is preserved so deep-linked ?page=
  // survives the initial empty render.
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pagedResources = useMemo(
    () => filteredResources.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredResources, currentPage],
  );

  // Once real data is present, pull an out-of-range page back into bounds so the
  // URL/controls never reference a page that no longer exists. Guarded on loaded,
  // non-empty results so it never clobbers a deep link during the loading render.
  useEffect(() => {
    // filteredResources derives from the deduplicated tree (isLoading covers it).
    if (!isLoading && filteredResources.length > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [isLoading, filteredResources.length, page, totalPages]);

  // The subcategory dropdown must also be the way OUT of "General" view (which is
  // URL-driven via ?view=general). Navigating without the flag makes the reactive
  // isGeneralView recompute to false. The sentinel "__general__" is the currently
  // selected value while in General view, so picking "All Subcategories" or any
  // real subcategory is always a genuine change that fires onValueChange.
  const handleSubcategoryChange = (value: string) => {
    // BUG-055 (run14): "General (no subcategory)" is now a first-class,
    // always-listed option — selecting it navigates INTO ?view=general
    // (previously the sentinel was display-only and the bucket was reachable
    // only via the sidebar link).
    if (value === "__general__") {
      if (isGeneralView) return; // already in General view
      setSelectedSubcategory("all");
      setPage(1);
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);
      params.set("view", "general");
      setLocation(`/category/${slug}?${params.toString()}`);
      return;
    }
    setSelectedSubcategory(value);
    setPage(1);
    if (isGeneralView) {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (value && value !== "all") params.set("subcategory", value);
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);
      const qs = params.toString();
      setLocation(`/category/${slug}${qs ? `?${qs}` : ""}`);
    }
  };

  // Run16 BUG-005: list-state changes (page, subcategory, tags, sort) must
  // PUSH history entries so browser Back returns to the previous in-app state
  // instead of leaving the page. Search keystrokes still replace (a push per
  // keystroke would spam history), as do the initial-mount URL normalization
  // and the re-sync that follows a popstate restore.
  const urlSyncInitializedRef = useRef(false);
  const popNavigationRef = useRef(false);
  const pushSnapshotRef = useRef("");

  useEffect(() => {
    // Run23 NB-033: when Back/Forward leaves this page entirely, wouter's
    // location change re-fires this effect ONE more time while the component
    // is still mounted — and the write below would stamp this category's path
    // over the DESTINATION history entry (Back looked dead; scroll restore
    // never ran). Bail unless the browser URL still points at this page.
    if (window.location.pathname !== `/category/${slug}`) return;
    const params = new URLSearchParams();

    if (searchTerm) params.set("search", searchTerm);
    if (!isGeneralView && selectedSubcategory && selectedSubcategory !== "all") params.set("subcategory", selectedSubcategory);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);
    // Only the canonical ?tags=/?sortBy= params are written, so a ?tag=/?sort=
    // alias used on arrival is normalized away after the first sync.
    if (page > 1) params.set("page", String(page));
    // Preserve the reactive general-view flag so it survives history writes
    // triggered by other filter changes. Otherwise (Run22 BUG-026) persist an
    // explicitly chosen layout view so it survives reload/Back/Forward.
    if (isGeneralView) params.set("view", "general");
    else if (viewParamExplicitRef.current) params.set("view", viewMode);

    const newSearch = params.toString();
    const newPath = `/category/${slug}${newSearch ? `?${newSearch}` : ""}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;

    const pushSnapshot = JSON.stringify([page, selectedSubcategory, selectedTags, sortBy, isGeneralView, viewMode]);
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
  }, [searchTerm, selectedSubcategory, selectedTags, sortBy, page, slug, location, isGeneralView, viewMode]);

  useEffect(() => {
    const handlePopState = () => {
      popNavigationRef.current = true;
      const params = getSearchParams();
      setSearchTerm(params.get("search") || "");
      setSelectedSubcategory(params.get("subcategory") || "all");
      const tags = params.get("tags") || params.get("tag");
      setSelectedTags(tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : []);
      setSortBy(normalizeSort(params.get("sortBy") || params.get("sort")));
      const p = parseInt(params.get("page") || "1", 10);
      setPage(Number.isFinite(p) && p > 0 ? p : 1);
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
    if (categoryName && !isLoading) {
      trackCategoryView(categoryName);
    }
  }, [categoryName, isLoading]);
  
  const isDbResource = (resource: Resource) => {
    const idStr = String(resource.id);
    return typeof resource.id === 'number' || /^\d+$/.test(idStr) || idStr.startsWith('db-');
  };
  
  const getDbId = (resource: Resource) => {
    const idStr = String(resource.id);
    if (typeof resource.id === 'number') return resource.id;
    if (idStr.startsWith('db-')) return parseInt(idStr.substring(3), 10);
    return parseInt(idStr, 10);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy={true} aria-live="polite">
        {/* BUG-031 (run22): head swaps with the route immediately — a soft nav
            must never leave the previous page's title/canonical up mid-load. */}
        <SEOHead title="Loading category" description="Loading category resources on Awesome Video." />
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Error Loading Category</h2>
          <p className="text-muted-foreground">There was an error loading the category data.</p>
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
  
  if (!currentCategory && !isLoading) {
    // Slug tolerance: the slug may belong to a subcategory or sub-subcategory
    // (e.g. someone hand-edited /category/intro-learning → a sub slug).
    // Redirect to the canonical page instead of 404ing.
    if (awesomeList && slug) {
      for (const cat of awesomeList.categories) {
        for (const sub of cat.subcategories ?? []) {
          if (sub.slug === slug) {
            return <Redirect to={`/subcategory/${slug}`} replace />;
          }
          for (const subSub of sub.subSubcategories ?? []) {
            if (subSub.slug === slug) {
              return <Redirect to={`/sub-subcategory/${slug}`} replace />;
            }
          }
        }
      }
    }
    return (
      <NotFound
        heading="This page doesn't exist."
        suggestion={findCategorySuggestion(slug, awesomeList?.categories ?? [])}
      />
    );
  }
  
  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      <SEOHead
        title={categorySeoTitleCore(categoryName, slug)}
        description={categorySeoDescription(categoryName, slug, allResources.length)}
        category={categoryName}
        resourceCount={allResources.length}
      />
      
      <div className="space-y-3 sm:space-y-4">
        {/* Run16 BUG-049: asChild so the anchor IS the ≥44px button (the
            wrapping-Link pattern produced a 20px-tall anchor box). */}
        <Button asChild variant="ghost" size="sm" className="gap-2 min-h-[44px]">
          <Link href="/" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="min-w-0 lg:flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight break-words">
              {categoryName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {/* Run17 BUG-059: header count follows the active filter instead of
                  contradicting the "Showing 1-N of M" line below. */}
              {filteredResources.length === allResources.length
                ? `${allResources.length} resources available`
                : `${filteredResources.length} of ${allResources.length} resources shown`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {subcategories.length > 0 && (
              <Select value={isGeneralView ? "__general__" : selectedSubcategory} onValueChange={handleSubcategoryChange}>
                <SelectTrigger aria-label="Filter by subcategory" className="w-full md:w-[200px]" data-testid="select-subcategory-filter">
                  <SelectValue placeholder="Filter by subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {/* BUG-055 (run14): always selectable, not just visible while
                      already in General view. */}
                  <SelectItem value="__general__">Uncategorized</SelectItem>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {subcategories.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Run22 BUG-025: badge tracks the ACTIVE filter result count, not
                the unfiltered total (which the header line already shows). */}
            <Badge
              variant="secondary"
              className="rounded-full text-sm sm:text-base px-3 sm:px-4 py-1 tabular-nums"
              data-testid="badge-count"
            >
              {filteredResources.length}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {/* BUG-035 (run19): scope the in-page search explicitly — a bare
              "Search resources..." box under the global ⌘K reads as site-wide. */}
          <Input
            placeholder={`Search in ${categoryName}...`}
            aria-label={`Search resources in ${categoryName}`}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="pl-10"
            data-testid="input-search-resources"
          />
        </div>

        <AdvancedFilter
          selectedTags={selectedTags}
          sortBy={sortBy}
          availableTags={availableTags}
          onTagsChange={(tags) => { setSelectedTags(tags); setPage(1); }}
          onSortChange={(value) => { setSortBy(value); setPage(1); }}
          showCountSorts={false}
        />
      </div>
      
      <div className="flex items-center justify-between gap-2">
        {/* NB-051 (run18): let the position label wrap at narrow widths instead
            of truncating to "…of 11 resou…"; keep it readable at 375px. */}
        <p className="text-xs sm:text-sm text-muted-foreground min-w-0 whitespace-normal break-words" data-testid="text-results-count">
          {/* BUG-v3-M33 (run12): show the actual page range, not page-size-as-subset */}
          Showing {filteredResources.length === 0
            ? "0"
            : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredResources.length)}`} of {filteredResources.length} resource{filteredResources.length === 1 ? "" : "s"}
          {selectedTags.length > 0 && ` (${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''})`}
        </p>
        <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
      </div>
      
      {filteredResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedSubcategory !== "all" || selectedTags.length > 0
              ? "Try adjusting your filters to see more results."
              : "There are no resources in this category yet."}
          </p>
          {(searchTerm || selectedSubcategory !== "all" || selectedTags.length > 0) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedSubcategory("all");
                setSelectedTags([]);
                setPage(1);
              }}
            >
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === "grid"
            // BUG-016 (run14): md drops to 1 col — sidebar returns at 768px.
            // BUG-003 (run22): 3 cols only from xl — at lg (1024–1279) three
            // columns beside the pinned 256px sidebar left headings ~65px
            // wide, clipping titles mid-word inside the line-clamp.
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 min-w-0"
            : viewMode === "list"
            ? "flex flex-col gap-2 min-w-0"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 min-w-0"
        }>
          {/* R-08 (run23): category pages render the SAME shared card trio as
              /subcategory and /sub-subcategory — ResourceCard (grid, with
              favorite/bookmark/Open Link/Suggest Edit), ResourceListRow and
              ResourceCompactCard — instead of a bespoke inline card set, so
              one card design exists everywhere. */}
          {pagedResources.map((resource, index) => {
            const normalized = {
              id: isDbResource(resource) ? String(getDbId(resource)) : "",
              title: resource.title,
              url: resource.url,
              description: resource.description,
            };
            if (viewMode === "list") {
              return <ResourceListRow key={`${resource.url}-${index}`} resource={normalized} />;
            }
            if (viewMode === "compact") {
              return <ResourceCompactCard key={`${resource.url}-${index}`} resource={normalized} />;
            }
            return (
              <ResourceCard
                key={`${resource.url}-${index}`}
                resource={{
                  id: normalized.id,
                  name: resource.title,
                  url: resource.url,
                  description: resource.description,
                  category: resource.subcategory || resource.subSubcategory || undefined,
                  tags: resource.tags,
                }}
                onTagClick={(tag) => {
                  setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
                  setPage(1);
                }}
              />
            );
          })}
        </div>
      )}


      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6" data-testid="pagination-controls">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground" data-testid="text-page-indicator">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
