import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import SEOHead from "@/components/layout/SEOHead";
import AdvancedFilter from "@/components/ui/advanced-filter";
import ResourceCard from "@/components/resource/ResourceCard";
import { ResourceListRow, ResourceCompactCard } from "@/components/resource/resource-view-modes";
import { ViewModeToggle, ViewMode } from "@/components/ui/view-mode-toggle";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { ArrowLeft, Search } from "lucide-react";
import { deslugify } from "@/lib/utils";
import { Resource } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";

// Run16 BUG-051: same page size as Category so sub-subcategory lists paginate
// instead of rendering hundreds of cards at once.
const PAGE_SIZE = 24;

export default function SubSubcategory() {
  const { slug } = useParams<{ slug: string }>();
  const [location] = useLocation();

  const getSearchParams = () => new URLSearchParams(window.location.search);

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = getSearchParams().get("tags");
    return tags ? tags.split(",") : [];
  });
  const [sortBy, setSortBy] = useState(() => getSearchParams().get("sortBy") || "default");
  const [searchTerm, setSearchTerm] = useState(() => getSearchParams().get("search") || "");
  const [page, setPage] = useState(() => {
    const p = parseInt(getSearchParams().get("page") || "1", 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  // Run16 BUG-050: grid/list/compact toggle, shared preference key with
  // Category so the choice follows the user across taxonomy levels.
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = safeGetItem('awesome-list-view-mode');
    return saved === 'grid' || saved === 'list' || saved === 'compact' ? saved : 'grid';
  });
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    safeSetItem('awesome-list-view-mode', mode);
  };
  
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
  });
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;
  
  let currentSubSubcategory = null;
  let parentCategory = null;
  let parentSubcategory = null;
  let staticResources: Resource[] = [];
  
  if (awesomeList && slug) {
    for (const category of awesomeList.categories) {
      for (const subcategory of category.subcategories || []) {
        if (subcategory.subSubcategories) {
          for (const subSubcat of subcategory.subSubcategories) {
            if (subSubcat.slug === slug) {
              currentSubSubcategory = subSubcat;
              parentCategory = category;
              parentSubcategory = subcategory;
              staticResources = subSubcat.resources;
              break;
            }
          }
        }
        if (currentSubSubcategory) break;
      }
      if (currentSubSubcategory) break;
    }
  }
  
  const subSubcategoryName = currentSubSubcategory ? currentSubSubcategory.name : deslugify(slug || "");
  const categoryName = parentCategory ? parentCategory.name : "";
  const subcategoryName = parentSubcategory ? parentSubcategory.name : "";
  
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

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      results = results.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    }

    if (selectedTags.length > 0) {
      results = results.filter(r =>
        r.tags && r.tags.some(tag => selectedTags.includes(tag))
      );
    }

    if (sortBy === "name-asc") {
      results.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "name-desc") {
      results.sort((a, b) => b.title.localeCompare(a.title));
    }

    return results;
  }, [allResources, searchTerm, selectedTags, sortBy]);

  // ----- Client-side pagination (Run16 BUG-051, mirrors Category BUG-007) -----
  const totalPages = Math.max(1, Math.ceil(filteredResources.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pagedResources = useMemo(
    () => filteredResources.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredResources, currentPage],
  );

  useEffect(() => {
    if (!isLoading && filteredResources.length > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [isLoading, filteredResources.length, page, totalPages]);

  // Run16 BUG-005: tag/sort changes PUSH history entries so Back restores the
  // previous list state; search keystrokes, initial normalization, and the
  // post-popstate re-sync still replace.
  const urlSyncInitializedRef = useRef(false);
  const popNavigationRef = useRef(false);
  const pushSnapshotRef = useRef("");

  useEffect(() => {
    const params = new URLSearchParams();

    if (searchTerm) params.set("search", searchTerm);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);
    if (page > 1) params.set("page", String(page));

    const newSearch = params.toString();
    const newPath = `/sub-subcategory/${slug}${newSearch ? `?${newSearch}` : ""}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;

    const pushSnapshot = JSON.stringify([page, selectedTags, sortBy]);
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
  }, [searchTerm, selectedTags, sortBy, page, slug, location]);

  useEffect(() => {
    const handlePopState = () => {
      popNavigationRef.current = true;
      const params = getSearchParams();
      setSearchTerm(params.get("search") || "");
      const tags = params.get("tags");
      setSelectedTags(tags ? tags.split(",") : []);
      setSortBy(params.get("sortBy") || "default");
      const p = parseInt(params.get("page") || "1", 10);
      setPage(Number.isFinite(p) && p > 0 ? p : 1);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (subSubcategoryName && !isLoading) {
      trackCategoryView(`${categoryName} > ${subcategoryName} > ${subSubcategoryName}`);
    }
  }, [subSubcategoryName, categoryName, subcategoryName, isLoading]);
  
  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy={true} aria-live="polite">
        <h1 className="sr-only">Loading sub-subcategory…</h1>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
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
          <h2 className="text-xl font-semibold mb-2">Error Loading Sub-Subcategory</h2>
          <p className="text-muted-foreground">There was an error loading the sub-subcategory data.</p>
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
  
  if (!currentSubSubcategory && !isLoading) {
    return <NotFound />;
  }
  
  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      <SEOHead
        // BUG-010 (run14): mirror og-middleware's "<name> – <parent>" template
        // exactly (two-pass parity) so same-named nodes get unique titles.
        title={subcategoryName ? `${subSubcategoryName} – ${subcategoryName}` : subSubcategoryName}
        description={`Browse ${allResources.length} curated ${subSubcategoryName.toLowerCase()} resources in the ${subcategoryName} category on Awesome Video.`}
        category={subSubcategoryName}
        resourceCount={allResources.length}
      />
      
      <div className="space-y-3 sm:space-y-4">
        {/* Run16 BUG-049: asChild so the anchor IS the ≥44px button. */}
        <Button asChild variant="ghost" size="sm" className="gap-2 min-h-[44px]">
          <Link
            href={parentSubcategory?.slug ? `/subcategory/${parentSubcategory.slug}` : "/"}
            data-testid="button-back-subcategory"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {subcategoryName || "Home"}
          </Link>
        </Button>
        
        {/* BUG-030 (run13): the app header already renders this exact crumb
            chain on md+ screens — page-level breadcrumbs are now mobile-only
            so desktop doesn't show the trail twice. */}
        <div className="md:hidden">
          <Breadcrumbs
            items={[
              {
                label: categoryName,
                href: parentCategory?.slug ? `/category/${parentCategory.slug}` : undefined,
              },
              {
                label: subcategoryName,
                href: parentSubcategory?.slug ? `/subcategory/${parentSubcategory.slug}` : undefined,
              },
              {
                label: subSubcategoryName,
              },
            ]}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words" data-testid="heading-subsubcategory">
              {subSubcategoryName}
            </h1>
          </div>
          <Badge variant="secondary" className="text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 shrink-0" data-testid="badge-count">
            {allResources.length}
          </Badge>
        </div>
      </div>
      
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          placeholder="Search resources..."
          className="pl-9 min-h-[44px]"
          data-testid="input-search"
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
      
      {allResources.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground min-w-0 truncate" data-testid="text-results-count">
            {/* Run16 BUG-051: show the page range like Category does. */}
            Showing {filteredResources.length === 0
              ? "0"
              : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredResources.length)}`} of {filteredResources.length} resource{filteredResources.length === 1 ? '' : 's'}
            {selectedTags.length > 0 && ' (filtered)'}
          </p>
          {/* Run16 BUG-050: view mode toggle, matching Category. */}
          <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
        </div>
      )}
      
      {allResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            There are no resources in this sub-subcategory yet.
          </p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          {/* BUG-042 (run14): copy matches the control that actually caused
              the empty state (search vs tag filter). */}
          <p className="text-muted-foreground">
            {searchTerm && selectedTags.length > 0
              ? "Try a different search term or adjust your tag filters."
              : searchTerm
                ? `No resources match "${searchTerm}". Try a different search term.`
                : "Try adjusting your tag filters to see more results."}
          </p>
        </div>
      ) : (
        /* BUG-016 (run14): md (768px) drops back to 1 col — sidebar returns
           at md and 2 cols truncated card titles to 3-5 chars. */
        <div className={
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4"
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
