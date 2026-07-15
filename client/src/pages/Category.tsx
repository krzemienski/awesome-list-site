import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useLocation, useSearch, Redirect } from "wouter";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SEOHead from "@/components/layout/SEOHead";
import { categorySeoTitleCore, categorySeoDescription } from "@shared/seo-templates";
import AdvancedFilter from "@/components/ui/advanced-filter";
import { ViewModeToggle, ViewMode } from "@/components/ui/view-mode-toggle";
import { SuggestEditDialog } from "@/components/ui/suggest-edit-dialog";
import { ArrowLeft, Search, ExternalLink, Edit } from "lucide-react";
import { deslugify, slugify } from "@/lib/utils";
import { normalizeTag } from "@/lib/tags";
import { Resource } from "@/types/awesome-list";
import type { Resource as DbResource } from "@shared/schema";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
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
 * ("default", "name-asc", "name-desc", "count-asc", "count-desc") pass through
 * unchanged so a reload/back-button restores the select; the ?sort= alias plus
 * the bare shorthand "name"/"asc"/"desc" map onto name ordering (BUG-006).
 */
const CANONICAL_SORTS = new Set(["default", "name-asc", "name-desc", "count-asc", "count-desc"]);
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState<DbResource | null>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = safeGetItem('awesome-list-view-mode');
      if (saved === 'grid' || saved === 'list' || saved === 'compact') {
        return saved;
      }
    }
    return 'grid';
  });
  
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    safeSetItem('awesome-list-view-mode', mode);
  };
  
  const { toast } = useToast();
  
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
    if (value === "__general__") return; // already in General view
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

  useEffect(() => {
    const params = new URLSearchParams();

    if (searchTerm) params.set("search", searchTerm);
    if (!isGeneralView && selectedSubcategory && selectedSubcategory !== "all") params.set("subcategory", selectedSubcategory);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);
    // Only the canonical ?tags=/?sortBy= params are written, so a ?tag=/?sort=
    // alias used on arrival is normalized away after the first sync.
    if (page > 1) params.set("page", String(page));
    // Preserve the reactive general-view flag so it survives replaceState writes
    // triggered by other filter changes.
    if (isGeneralView) params.set("view", "general");

    const newSearch = params.toString();
    const newPath = `/category/${slug}${newSearch ? `?${newSearch}` : ""}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (currentPath !== newPath) {
      window.history.replaceState({}, "", newPath);
    }
  }, [searchTerm, selectedSubcategory, selectedTags, sortBy, page, slug, location, isGeneralView]);

  useEffect(() => {
    const handlePopState = () => {
      const params = getSearchParams();
      setSearchTerm(params.get("search") || "");
      setSelectedSubcategory(params.get("subcategory") || "all");
      const tags = params.get("tags") || params.get("tag");
      setSelectedTags(tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : []);
      setSortBy(normalizeSort(params.get("sortBy") || params.get("sort")));
      const p = parseInt(params.get("page") || "1", 10);
      setPage(Number.isFinite(p) && p > 0 ? p : 1);
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
  
  const toDbResource = (resource: Resource, dbResource: any): DbResource => ({
    id: getDbId(resource),
    title: resource.title,
    url: resource.url,
    description: resource.description || "",
    category: resource.category || categoryName,
    subcategory: resource.subcategory || null,
    subSubcategory: resource.subSubcategory || null,
    status: "approved",
    submittedBy: dbResource?.submittedBy || null,
    approvedBy: dbResource?.approvedBy || null,
    approvedAt: dbResource?.approvedAt || null,
    githubSynced: dbResource?.githubSynced || false,
    lastSyncedAt: dbResource?.lastSyncedAt || null,
    metadata: dbResource?.metadata || {},
    createdAt: dbResource?.createdAt || new Date(),
    updatedAt: dbResource?.updatedAt || new Date(),
    searchTsv: dbResource?.searchTsv ?? null,
  });
  
  const handleSuggestEdit = (e: React.MouseEvent, resource: Resource) => {
    e.stopPropagation();
    if (!isDbResource(resource)) return;
    
    const dbId = getDbId(resource);
    const dbResource = treeResources.find((r: any) => r.id === dbId);
    setResourceToEdit(toDbResource(resource, dbResource));
    setEditDialogOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy={true} aria-live="polite">
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
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 sm:flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight break-words">
              {categoryName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {allResources.length} resources available
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {subcategories.length > 0 && (
              <Select value={isGeneralView ? "__general__" : selectedSubcategory} onValueChange={handleSubcategoryChange}>
                <SelectTrigger aria-label="Filter by subcategory" className="w-full md:w-[200px]" data-testid="select-subcategory-filter">
                  <SelectValue placeholder="Filter by subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {isGeneralView && (
                    <SelectItem value="__general__">General (no subcategory)</SelectItem>
                  )}
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {subcategories.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Badge
              variant="secondary"
              className="rounded-full text-sm sm:text-base px-3 sm:px-4 py-1 tabular-nums"
              data-testid="badge-count"
            >
              {allResources.length}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
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
        />
      </div>
      
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm text-muted-foreground min-w-0 truncate" data-testid="text-results-count">
          Showing {filteredResources.length} of {allResources.length} resources
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
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0"
            : viewMode === "list"
            ? "flex flex-col gap-2 min-w-0"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 min-w-0"
        }>
          {pagedResources.map((resource, index) => {
            const resourceId = `${slugify(resource.title)}-${index}`;
            
            const handleResourceClick = () => {
              if (isDbResource(resource)) {
                const dbId = getDbId(resource);
                setLocation(`/resource/${dbId}`);
              } else {
                window.open(resource.url, '_blank', 'noopener,noreferrer');
                toast({
                  title: resource.title,
                  description: 'Opening resource in new tab',
                });
              }
            };
            
            const handleExternalLink = (e: React.MouseEvent) => {
              e.stopPropagation();
              window.open(resource.url, '_blank', 'noopener,noreferrer');
              toast({
                title: resource.title,
                description: 'Opening resource in new tab',
              });
            };

            // Run3 audit R3-31: render the card title as a REAL anchor with a
            // stretched-link overlay (after:inset-0) so middle-click / cmd-click /
            // "open in new tab" and crawlers work; action buttons sit above it
            // via relative z-10. The card onClick is kept as a fallback for the
            // non-overlay edge but the anchor stops propagation to avoid a
            // double navigation.
            const titleAnchor = (label: React.ReactNode) =>
              isDbResource(resource) ? (
                <Link
                  href={`/resource/${getDbId(resource)}`}
                  className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[var(--accent)]"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  data-testid={`link-resource-${resourceId}`}
                >
                  {label}
                </Link>
              ) : (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[var(--accent)]"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  data-testid={`link-resource-${resourceId}`}
                >
                  {label}
                </a>
              );

            if (viewMode === "list") {
              return (
                <div
                  key={`${resource.url}-${index}`}
                  className="relative flex items-center gap-4 p-3 rounded-lg border border-border bg-transparent hover:border-[var(--accent)]/30 hover:shadow-md cursor-pointer transition-all min-w-0"
                  onClick={handleResourceClick}
                  data-testid={`card-resource-${resourceId}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{titleAnchor(resource.title)}</span>
                      {isDbResource(resource) && (
                        <Badge
                          variant="outline"
                          className="text-xs border-[color-mix(in_srgb,var(--accent)_30%,transparent)] text-[var(--accent)]"
                        >
                          Details
                        </Badge>
                      )}
                    </div>
                    {resource.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {resource.description}
                      </p>
                    )}
                  </div>
                  <div className="relative z-10 flex items-center gap-1.5 flex-shrink-0">
                    {resource.subcategory && (
                      <Badge variant="outline" className="text-xs hidden md:inline-flex">{resource.subcategory}</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 min-h-[44px] min-w-[44px] touch-manipulation"
                      onClick={handleExternalLink}
                      data-testid={`button-external-${resourceId}`}
                      title="Open in new tab"
                      aria-label="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {isDbResource(resource) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 min-h-[44px] min-w-[44px] touch-manipulation"
                        onClick={(e) => handleSuggestEdit(e, resource)}
                        data-testid={`button-suggest-edit-${resourceId}`}
                        title="Suggest an edit"
                        aria-label="Suggest an edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            }

            if (viewMode === "compact") {
              return (
                <Card
                  key={`${resource.url}-${index}`}
                  className="relative cursor-pointer hover:border-[var(--accent)]/30 hover:shadow-md transition-all border border-border bg-card p-2.5 sm:p-3 min-w-0 touch-manipulation"
                  onClick={handleResourceClick}
                  data-testid={`card-resource-${resourceId}`}
                >
                  <div className="flex items-start gap-1.5 min-w-0">
                    <span className="font-medium text-xs sm:text-sm line-clamp-2 flex-1 min-w-0" title={resource.title}>{titleAnchor(resource.title)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative z-10 h-8 w-8 p-0 shrink-0 touch-manipulation min-h-[44px] min-w-[44px] -mr-1.5"
                      onClick={handleExternalLink}
                      data-testid={`button-external-${resourceId}`}
                      title="Open in new tab"
                      aria-label="Open in new tab"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            }
            
            return (
              <Card
                key={`${resource.url}-${index}`}
                className="relative cursor-pointer hover:border-[var(--accent)]/30 hover:shadow-md transition-all border border-border bg-card text-card-foreground min-w-0 flex flex-col"
                onClick={handleResourceClick}
                data-testid={`card-resource-${resourceId}`}
              >
                <CardHeader className="p-6 space-y-2">
                  <CardTitle className="text-base sm:text-lg flex items-start gap-2">
                    <span className="flex-1 min-w-0 line-clamp-2" title={resource.title}>{titleAnchor(resource.title)}</span>
                    <div className="relative z-10 flex items-center gap-0.5 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 min-h-[44px] min-w-[44px] touch-manipulation"
                        onClick={handleExternalLink}
                        data-testid={`button-external-${resourceId}`}
                        title="Open in new tab"
                        aria-label="Open in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {isDbResource(resource) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 min-h-[44px] min-w-[44px] touch-manipulation"
                          onClick={(e) => handleSuggestEdit(e, resource)}
                          data-testid={`button-suggest-edit-${resourceId}`}
                          title="Suggest an edit"
                          aria-label="Suggest an edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                  {resource.description && (
                    <CardDescription className="text-xs sm:text-sm line-clamp-2">
                      {resource.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="px-6 pb-3 pt-0 flex-1">
                  <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                    {resource.subcategory && (
                      <Badge variant="outline" className="text-xs">{resource.subcategory}</Badge>
                    )}
                    {resource.subSubcategory && (
                      <Badge variant="outline" className="text-xs">{resource.subSubcategory}</Badge>
                    )}
                    {resource.tags && resource.tags.slice(0, 3).map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {resource.tags && resource.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{resource.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <div className="px-6 pb-4 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResourceClick();
                    }}
                    data-testid={`button-view-details-${resourceId}`}
                    className="relative z-10 inline-flex min-h-[44px] items-center gap-1 py-2 -my-2 text-xs font-medium text-[var(--accent)] hover:underline focus:outline-none focus-visible:underline"
                  >
                    {isDbResource(resource) ? "View Details" : "Open Resource"}
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </Card>
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
      
      {resourceToEdit && (
        <SuggestEditDialog
          resource={resourceToEdit}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setResourceToEdit(null);
          }}
        />
      )}
    </div>
  );
}
