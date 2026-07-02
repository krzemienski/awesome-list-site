import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useLocation, Redirect } from "wouter";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SEOHead from "@/components/layout/SEOHead";
import AdvancedFilter from "@/components/ui/advanced-filter";
import { ViewModeToggle, ViewMode } from "@/components/ui/view-mode-toggle";
import { SuggestEditDialog } from "@/components/ui/suggest-edit-dialog";
import { ArrowLeft, Search, ExternalLink, Edit } from "lucide-react";
import { deslugify, slugify } from "@/lib/utils";
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

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  const getSearchParams = () => new URLSearchParams(window.location.search);

  const [searchTerm, setSearchTerm] = useState(() => getSearchParams().get("search") || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(() => getSearchParams().get("subcategory") || "all");
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = getSearchParams().get("tags");
    return tags ? tags.split(",") : [];
  });
  const [sortBy, setSortBy] = useState(() => getSearchParams().get("sortBy") || "default");
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

  // Source of truth: the resources table, scoped to this category server-side.
  // The server filters by the category NAME and returns every approved resource
  // assigned to it (including those that live under subcategories), so the count
  // here matches the database and the sidebar — not just the direct/top-level
  // resources carried by the static awesome-list tree.
  const { data: dbData, isLoading: dbLoading } = useQuery<{resources: any[], total: number}>({
    queryKey: [`/api/resources?category=${encodeURIComponent(categoryName)}&limit=2000`],
    enabled: !!categoryName,
  });

  const allResources: Resource[] = useMemo(() => {
    const rows = dbData?.resources || [];
    return rows.map(r => ({
      id: `db-${r.id}`,
      title: r.title,
      description: r.description || '',
      url: r.url,
      tags: Array.isArray(r.metadata?.tags) ? r.metadata.tags as string[] : [],
      category: r.category,
      subcategory: r.subcategory || undefined,
      subSubcategory: r.subSubcategory || undefined,
    }));
  }, [dbData]);
  
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
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(r =>
        r.title.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedSubcategory !== "all") {
      results = results.filter(r => r.subcategory === selectedSubcategory);
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
  }, [allResources, searchTerm, selectedSubcategory, selectedTags, sortBy]);
  
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchTerm) params.set("search", searchTerm);
    if (selectedSubcategory && selectedSubcategory !== "all") params.set("subcategory", selectedSubcategory);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);

    const newSearch = params.toString();
    const newPath = `/category/${slug}${newSearch ? `?${newSearch}` : ""}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (currentPath !== newPath) {
      window.history.replaceState({}, "", newPath);
    }
  }, [searchTerm, selectedSubcategory, selectedTags, sortBy, slug, location]);

  useEffect(() => {
    const handlePopState = () => {
      const params = getSearchParams();
      setSearchTerm(params.get("search") || "");
      setSelectedSubcategory(params.get("subcategory") || "all");
      const tags = params.get("tags");
      setSelectedTags(tags ? tags.split(",") : []);
      setSortBy(params.get("sortBy") || "default");
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
  });
  
  const handleSuggestEdit = (e: React.MouseEvent, resource: Resource) => {
    e.stopPropagation();
    if (!isDbResource(resource)) return;
    
    const dbId = getDbId(resource);
    const dbResource = (dbData?.resources || []).find((r: any) => r.id === dbId);
    setResourceToEdit(toDbResource(resource, dbResource));
    setEditDialogOpen(true);
  };
  
  if (isLoading || dbLoading) {
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
        title={categoryName}
        description={`Browse ${allResources.length} curated ${categoryName.toLowerCase()} resources for video development on Awesome Video.`}
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
        
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight truncate">
              {categoryName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {allResources.length} resources available
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {subcategories.length > 0 && (
              <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                <SelectTrigger aria-label="Filter by subcategory" className="w-full md:w-[200px]" data-testid="select-subcategory-filter">
                  <SelectValue placeholder="Filter by subcategory" />
                </SelectTrigger>
                <SelectContent>
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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-resources"
          />
        </div>

        <AdvancedFilter
          selectedTags={selectedTags}
          sortBy={sortBy}
          availableTags={availableTags}
          onTagsChange={setSelectedTags}
          onSortChange={setSortBy}
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
          {filteredResources.map((resource, index) => {
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
            
            if (viewMode === "list") {
              return (
                <div
                  key={`${resource.url}-${index}`}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border bg-transparent hover:border-[var(--accent)]/30 hover:shadow-md cursor-pointer transition-all min-w-0"
                  onClick={handleResourceClick}
                  data-testid={`card-resource-${resourceId}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{resource.title}</span>
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
                  <div className="flex items-center gap-1.5 flex-shrink-0">
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
                  className="cursor-pointer hover:border-[var(--accent)]/30 hover:shadow-md transition-all border border-border bg-card p-2.5 sm:p-3 min-w-0 touch-manipulation"
                  onClick={handleResourceClick}
                  data-testid={`card-resource-${resourceId}`}
                >
                  <div className="flex items-start gap-1.5 min-w-0">
                    <span className="font-medium text-xs sm:text-sm line-clamp-2 flex-1 min-w-0">{resource.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0 touch-manipulation min-h-[44px] min-w-[44px] -mr-1.5"
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
                className="cursor-pointer hover:border-[var(--accent)]/30 hover:shadow-md transition-all border border-border bg-card text-card-foreground min-w-0 flex flex-col"
                onClick={handleResourceClick}
                data-testid={`card-resource-${resourceId}`}
              >
                <CardHeader className="p-6 space-y-2">
                  <CardTitle className="text-base sm:text-lg flex items-start gap-2">
                    <span className="flex-1 min-w-0 line-clamp-2">{resource.title}</span>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
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
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline focus:outline-none focus-visible:underline"
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
