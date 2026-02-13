import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import SEOHead from "@/components/layout/SEOHead";
import AdvancedFilter from "@/components/ui/advanced-filter";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { deslugify } from "@/lib/utils";
import { Resource } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

export default function SubSubcategory() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const getSearchParams = () => new URLSearchParams(window.location.search);

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = getSearchParams().get("tags");
    return tags ? tags.split(",") : [];
  });
  const [sortBy, setSortBy] = useState(() => getSearchParams().get("sortBy") || "default");
  
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
  });
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;
  
  const { data: dbData } = useQuery<{resources: any[], total: number}>({
    queryKey: ['/api/resources', { status: 'approved' }],
    enabled: !!awesomeList,
  });
  
  const dbResources = dbData?.resources || [];
  
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
    const subSubcategoryDbResources = dbResources
      .filter(r => {
        const matchesName = r.subSubcategory === subSubcategoryName;
        const matchesSlug = r.subSubcategory?.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-') === slug;
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

    return [...staticResources, ...subSubcategoryDbResources];
  }, [staticResources, dbResources, subSubcategoryName]);

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
  }, [allResources, selectedTags, sortBy]);
  
  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);

    const newSearch = params.toString();
    const newPath = `/sub-subcategory/${slug}${newSearch ? `?${newSearch}` : ""}`;

    if (location !== newPath) {
      window.history.replaceState({}, "", newPath);
    }
  }, [selectedTags, sortBy, slug, location]);

  useEffect(() => {
    const handlePopState = () => {
      const params = getSearchParams();
      const tags = params.get("tags");
      setSelectedTags(tags ? tags.split(",") : []);
      setSortBy(params.get("sortBy") || "default");
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
        <SEOHead title="Loading..." />
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
        <SEOHead title="Error" />
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
        title={`${subSubcategoryName} Resources - ${subcategoryName} - ${categoryName} - Awesome Video`}
        description={`Browse ${allResources.length} ${subSubcategoryName} resources in the ${subcategoryName} category.`}
      />
      
      <div className="space-y-3 sm:space-y-4">
        <Link href={parentSubcategory?.slug ? `/subcategory/${parentSubcategory.slug}` : "/"}>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-subcategory">
            <ArrowLeft className="h-4 w-4" />
            Back to {subcategoryName || "Home"}
          </Button>
        </Link>
        
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

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate" data-testid="heading-subsubcategory">
              {subSubcategoryName}
            </h1>
          </div>
          <Badge variant="secondary" className="text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 shrink-0" data-testid="badge-count">
            {allResources.length}
          </Badge>
        </div>
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
            {selectedTags.length > 0 && ' (filtered)'}
          </p>
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
          <p className="text-muted-foreground">
            Try adjusting your tag filters to see more results.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredResources.map((resource, index) => {
            const handleResourceClick = () => {
              window.open(resource.url, '_blank', 'noopener,noreferrer');
              
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
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors border border-border bg-card text-card-foreground min-w-0"
                onClick={handleResourceClick}
                data-testid={`card-resource-${index}`}
              >
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-start gap-2">
                    <span className="flex-1 min-w-0 line-clamp-2">{resource.title}</span>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                  </CardTitle>
                  {resource.description && (
                    <CardDescription className="text-xs sm:text-sm line-clamp-2">
                      {resource.description}
                    </CardDescription>
                  )}
                </CardHeader>
                {resource.tags && resource.tags.length > 0 && (
                  <CardContent className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4 md:px-6 md:pb-6">
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                      {resource.tags.slice(0, 3).map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {resource.tags.length > 3 && (
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
