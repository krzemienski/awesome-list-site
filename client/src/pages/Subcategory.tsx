import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEOHead from "@/components/layout/SEOHead";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ArrowLeft, Search } from "lucide-react";
import AdvancedFilter from "@/components/ui/advanced-filter";
import ResourceCard from "@/components/resource/ResourceCard";
import { deslugify, getCategorySlug } from "@/lib/utils";
import { Resource } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";

export default function Subcategory() {
  const { slug } = useParams<{ slug: string }>();
  const [location] = useLocation();

  const getSearchParams = () => new URLSearchParams(window.location.search);

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = getSearchParams().get("tags");
    return tags ? tags.split(",") : [];
  });
  const [sortBy, setSortBy] = useState(() => getSearchParams().get("sortBy") || "default");
  const [searchTerm, setSearchTerm] = useState(() => getSearchParams().get("search") || "");
  
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
  });
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;
  
  // Fetch the full resource set (default pagination returns only 20 rows, which
  // silently undercounts the client-side subcategory filter below — e.g. Codecs
  // showed 12 of its real 27). limit=2000 covers the whole seeded corpus.
  const { data: dbData } = useQuery<{resources: any[], total: number}>({
    queryKey: ['/api/resources?limit=2000'],
    enabled: !!awesomeList,
  });

  const dbResources = dbData?.resources || [];

  let currentSubcategory = null;
  let parentCategory = null;

  if (awesomeList && slug) {
    for (const category of awesomeList.categories) {
      const subcategory = category.subcategories.find(sub =>
        sub.slug === slug
      );
      if (subcategory) {
        currentSubcategory = subcategory;
        parentCategory = category;
        break;
      }
    }
  }
  
  const subcategoryName = currentSubcategory ? currentSubcategory.name : deslugify(slug || "");
  const categoryName = parentCategory ? parentCategory.name : "";
  
  const allResources: Resource[] = useMemo(() => {
    const subcategoryDbResources = dbResources
      .filter(r => {
        const matchesName = r.subcategory === subcategoryName;
        const matchesSlug = r.subcategory?.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-') === slug;
        return matchesName || matchesSlug;
      })
      .map(r => ({
        id: `db-${r.id}`,
        title: r.title,
        description: r.description || '',
        url: r.url,
        tags: Array.isArray(r.metadata?.tags) ? r.metadata.tags as string[] : [],
        category: r.category,
        subcategory: r.subcategory || undefined,
        subSubcategory: r.subSubcategory || undefined,
      }));

    // DB is the single source of truth for counts (matches Category.tsx and the
    // sidebar badges). Merging the legacy static JSON here double-counted every
    // resource that exists in both — Codecs showed 38 instead of its real 27.
    return subcategoryDbResources;
  }, [dbResources, subcategoryName, slug]);

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
  
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchTerm) params.set("search", searchTerm);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);

    const newSearch = params.toString();
    const newPath = `/subcategory/${slug}${newSearch ? `?${newSearch}` : ""}`;

    if (location !== newPath) {
      window.history.replaceState({}, "", newPath);
    }
  }, [searchTerm, selectedTags, sortBy, slug, location]);

  useEffect(() => {
    const handlePopState = () => {
      const params = getSearchParams();
      setSearchTerm(params.get("search") || "");
      const tags = params.get("tags");
      setSelectedTags(tags ? tags.split(",") : []);
      setSortBy(params.get("sortBy") || "default");
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
    // Skeleton mirrors the loaded layout's vertical rhythm (breadcrumb, back
    // button, title block, filter bar, results-count) so the card grid starts
    // at the same Y offset — otherwise the header pops in on load and shoves
    // the grid down (large cumulative layout shift).
    return (
      <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full" aria-busy={true} aria-live="polite">
        <SEOHead title="Loading..." />
        <h1 className="sr-only">Loading subcategory…</h1>
        <Skeleton className="h-5 w-48" />
        <div className="space-y-3 sm:space-y-4">
          <Skeleton className="h-9 w-40" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-10 w-12 shrink-0" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-5 w-56" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <SEOHead title="Error" />
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
        title={`${subcategoryName} Resources - ${categoryName} - Awesome Video`}
        description={`Browse ${allResources.length} ${subcategoryName} resources in the ${categoryName} category.`}
      />

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

      <div className="space-y-3 sm:space-y-4">
        <Link href={`/category/${getCategorySlug(categoryName)}`}>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-category">
            <ArrowLeft className="h-4 w-4" />
            Back to {categoryName}
          </Button>
        </Link>
        
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
              {subcategoryName}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Category: {categoryName}
            </p>
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
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search resources..."
          className="pl-9 min-h-[44px]"
          data-testid="input-search"
        />
      </div>

      <AdvancedFilter
        selectedTags={selectedTags}
        sortBy={sortBy}
        availableTags={availableTags}
        onTagsChange={setSelectedTags}
        onSortChange={setSortBy}
      />
      
      {allResources.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground" data-testid="text-results-count">
            Showing {filteredResources.length} of {allResources.length} resources
            {selectedTags.length > 0 && ` (filtered by ${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''})`}
          </p>
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
          <p className="text-muted-foreground">
            Try adjusting your tag filters to see more results.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredResources.map((resource, index) => {
            // Every resource here is DB backed (id is "db-<n>", see allResources
            // above), so the card body navigates to the internal detail page —
            // matching Category.tsx. The external URL stays on its own button.
            const dbId = parseInt(String(resource.id).replace(/^db-/, ""), 10);

            const handleResourceClick = () => {
              if (Number.isFinite(dbId)) {
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

            return (
              <Card
                key={`${resource.url}-${index}`}
                className="cursor-pointer hover:border-[var(--accent)]/30 hover:shadow-md transition-all border border-border bg-card text-card-foreground min-w-0"
                onClick={handleResourceClick}
                data-testid={`card-resource-${dbId}`}
              >
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-base sm:text-lg flex items-start gap-2">
                    <span className="flex-1 min-w-0 line-clamp-2">{resource.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 flex-shrink-0 -mt-1 -mr-1 touch-manipulation"
                      onClick={handleExternalLink}
                      data-testid={`button-external-${dbId}`}
                      title="Open in new tab"
                      aria-label="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  {resource.description && (
                    <CardDescription className="text-xs sm:text-sm line-clamp-2">
                      {resource.description}
                    </CardDescription>
                  )}
                </CardHeader>
                {(resource.subSubcategory || (resource.tags && resource.tags.length > 0)) && (
                  <CardContent className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
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
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
