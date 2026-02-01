import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/layout/SEOHead";
import TagFilter from "@/components/ui/tag-filter";
import AdvancedFilter from "@/components/ui/advanced-filter";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { deslugify, getCategorySlug } from "@/lib/utils";
import { Resource } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

export default function Subcategory() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Helper to get current URL search params
  const getSearchParams = () => new URLSearchParams(window.location.search);

  // Initialize state from URL params
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = getSearchParams().get("tags");
    return tags ? tags.split(",") : [];
  });
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>(() => {
    const types = getSearchParams().get("resourceType");
    return types ? types.split(",") : [];
  });
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(() => {
    const difficulties = getSearchParams().get("difficulty");
    return difficulties ? difficulties.split(",") : [];
  });
  const [sortBy, setSortBy] = useState(() => getSearchParams().get("sortBy") || "category");
  
  // Fetch awesome list data - use same query as homepage
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;
  
  // Fetch approved database resources
  const { data: dbData } = useQuery<{resources: any[], total: number}>({
    queryKey: ['/api/resources', { status: 'approved' }],
    enabled: !!awesomeList,
  });
  
  const dbResources = dbData?.resources || [];
  
  // Find the current subcategory and its resources
  let currentSubcategory = null;
  let parentCategory = null;
  let staticResources: Resource[] = [];
  
  if (awesomeList && slug) {
    // Find matching subcategory across all categories
    for (const category of awesomeList.categories) {
      const subcategory = category.subcategories.find(sub => 
        sub.slug === slug
      );
      if (subcategory) {
        currentSubcategory = subcategory;
        parentCategory = category;
        
        // Get all resources - subcategory level already includes all nested resources
        staticResources = subcategory.resources;
        
        break;
      }
    }
  }
  
  const subcategoryName = currentSubcategory ? currentSubcategory.name : deslugify(slug || "");
  const categoryName = parentCategory ? parentCategory.name : "";
  
  // Merge static and database resources for this subcategory
  const allResources: Resource[] = useMemo(() => {
    // Filter database resources for this subcategory and map to Resource type (defensive: match by name OR slug)
    const subcategoryDbResources = dbResources
      .filter(r => {
        // Match by display name OR slug
        const matchesName = r.subcategory === subcategoryName;
        const matchesSlug = r.subcategory?.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-') === slug;
        return matchesName || matchesSlug;
      })
      .map(r => ({
        id: `db-${r.id}`,
        title: r.title,
        description: r.description || '',
        url: r.url,
        tags: r.metadata?.tags || [],
        category: r.category,
        subcategory: r.subcategory || undefined,
        subSubcategory: r.subSubcategory || undefined,
      }));

    // Merge and return
    return [...staticResources, ...subcategoryDbResources];
  }, [staticResources, dbResources, subcategoryName]);

  // Calculate resource type counts
  const resourceTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allResources.forEach(resource => {
      const dbId = typeof resource.id === 'string' && resource.id.startsWith('db-')
        ? parseInt(resource.id.replace('db-', ''))
        : resource.id;
      const dbResource = dbResources.find(dr => dr.id === dbId);
      const resourceType = dbResource?.metadata?.resourceType;
      if (resourceType) {
        counts[resourceType] = (counts[resourceType] || 0) + 1;
      }
    });
    return counts;
  }, [allResources, dbResources]);

  // Calculate difficulty counts
  const difficultyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allResources.forEach(resource => {
      const dbId = typeof resource.id === 'string' && resource.id.startsWith('db-')
        ? parseInt(resource.id.replace('db-', ''))
        : resource.id;
      const dbResource = dbResources.find(dr => dr.id === dbId);
      const difficulty = dbResource?.metadata?.difficulty;
      if (difficulty) {
        counts[difficulty] = (counts[difficulty] || 0) + 1;
      }
    });
    return counts;
  }, [allResources, dbResources]);

  // Filter and sort resources
  const filteredResources = useMemo(() => {
    let results = [...allResources];

    // Tag filter
    if (selectedTags.length > 0) {
      results = results.filter(r =>
        r.tags && r.tags.some(tag => selectedTags.includes(tag))
      );
    }

    // Resource type filter
    if (selectedResourceTypes.length > 0) {
      results = results.filter(r => {
        const dbId = typeof r.id === 'string' && r.id.startsWith('db-') ? parseInt(r.id.replace('db-', '')) : r.id;
        const dbResource = dbResources.find(dr => dr.id === dbId);
        const resourceType = dbResource?.metadata?.resourceType;
        return resourceType && selectedResourceTypes.includes(resourceType);
      });
    }

    // Difficulty filter
    if (selectedDifficulties.length > 0) {
      results = results.filter(r => {
        const dbId = typeof r.id === 'string' && r.id.startsWith('db-') ? parseInt(r.id.replace('db-', '')) : r.id;
        const dbResource = dbResources.find(dr => dr.id === dbId);
        const difficulty = dbResource?.metadata?.difficulty;
        return difficulty && selectedDifficulties.includes(difficulty);
      });
    }

    // Sort
    if (sortBy === "name-asc") {
      results.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "name-desc") {
      results.sort((a, b) => b.title.localeCompare(a.title));
    }

    return results;
  }, [allResources, selectedTags, selectedResourceTypes, selectedDifficulties, sortBy, dbResources]);
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (selectedResourceTypes.length > 0) params.set("resourceType", selectedResourceTypes.join(","));
    if (selectedDifficulties.length > 0) params.set("difficulty", selectedDifficulties.join(","));
    if (sortBy && sortBy !== "category") params.set("sortBy", sortBy);

    const newSearch = params.toString();
    const newPath = `/subcategory/${slug}${newSearch ? `?${newSearch}` : ""}`;

    // Only update if the path changed
    if (location !== newPath) {
      window.history.replaceState({}, "", newPath);
    }
  }, [selectedTags, selectedResourceTypes, selectedDifficulties, sortBy, slug, location]);

  // Sync state from URL on popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = getSearchParams();
      const tags = params.get("tags");
      setSelectedTags(tags ? tags.split(",") : []);
      const types = params.get("resourceType");
      setSelectedResourceTypes(types ? types.split(",") : []);
      const difficulties = params.get("difficulty");
      setSelectedDifficulties(difficulties ? difficulties.split(",") : []);
      setSortBy(params.get("sortBy") || "category");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Track subcategory view
  useEffect(() => {
    if (subcategoryName && !isLoading) {
      trackCategoryView(`${categoryName} > ${subcategoryName}`);
    }
  }, [subcategoryName, categoryName, isLoading]);
  
  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy={true} aria-live="polite">
        <SEOHead title="Loading..." />
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
        <SEOHead title="Error" />
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
    <div className="space-y-6">
      {/* SEO Head */}
      <SEOHead 
        title={`${subcategoryName} Resources - ${categoryName} - Awesome Video`}
        description={`Browse ${allResources.length} ${subcategoryName} resources in the ${categoryName} category.`}
      />
      
      {/* Header */}
      <div className="space-y-4">
        <Link href={`/category/${getCategorySlug(categoryName)}`}>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-category">
            <ArrowLeft className="h-4 w-4" />
            Back to {categoryName}
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {subcategoryName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Category: {categoryName}
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2" data-testid="badge-count">
            {allResources.length}
          </Badge>
        </div>
      </div>
      
      {/* Advanced Filter */}
      <AdvancedFilter
        selectedResourceTypes={selectedResourceTypes}
        selectedDifficulties={selectedDifficulties}
        sortBy={sortBy}
        resourceTypeCounts={resourceTypeCounts}
        difficultyCounts={difficultyCounts}
        onResourceTypesChange={setSelectedResourceTypes}
        onDifficultiesChange={setSelectedDifficulties}
        onSortChange={setSortBy}
      />

      {/* Tag Filter */}
      <TagFilter
        resources={allResources}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
      />
      
      {/* Results Count */}
      {allResources.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground" data-testid="text-results-count">
            Showing {filteredResources.length} of {allResources.length} resources
            {selectedTags.length > 0 && ` (filtered by ${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''})`}
          </p>
        </div>
      )}
      
      {/* Resources Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource, index) => {
            const handleResourceClick = () => {
              window.open(resource.url, '_blank', 'noopener,noreferrer');
              
              // Build detailed toast message
              let description = resource.description || '';
              if (!description && resource.tags && resource.tags.length > 0) {
                description = `Tags: ${resource.tags.slice(0, 3).join(', ')}${resource.tags.length > 3 ? ', ...' : ''}`;
              }
              
              toast({
                title: resource.title,
                description: description || 'Opening resource in new tab',
              });
            };
            
            return (
              <Card 
                key={`${resource.url}-${index}`}
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors border border-border bg-card text-card-foreground"
                onClick={handleResourceClick}
                data-testid={`card-resource-${index}`}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-start gap-2">
                    <span className="flex-1">{resource.title}</span>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                  </CardTitle>
                  {resource.description && (
                    <CardDescription className="line-clamp-2">
                      {resource.description}
                    </CardDescription>
                  )}
                </CardHeader>
                {(resource.subSubcategory || (resource.tags && resource.tags.length > 0)) && (
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {resource.subSubcategory && (
                        <Badge variant="outline">{resource.subSubcategory}</Badge>
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
