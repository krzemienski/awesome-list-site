import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/layout/SEOHead";
import TagFilter from "@/components/ui/tag-filter";
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
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
  
  // Find the current sub-subcategory and its resources
  let currentSubSubcategory = null;
  let parentCategory = null;
  let parentSubcategory = null;
  let staticResources: Resource[] = [];
  
  if (awesomeList && slug) {
    // Find matching sub-subcategory across all categories
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
  
  // Merge static and database resources for this sub-subcategory
  const allResources: Resource[] = useMemo(() => {
    // Filter database resources for this sub-subcategory and map to Resource type (defensive: match by name OR slug)
    const subSubcategoryDbResources = dbResources
      .filter(r => {
        // Match by display name OR slug
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
    
    // Merge and return
    return [...staticResources, ...subSubcategoryDbResources];
  }, [staticResources, dbResources, subSubcategoryName]);
  
  // Filter resources by selected tags
  const filteredResources = useMemo(() => {
    if (selectedTags.length === 0) {
      return allResources;
    }
    return allResources.filter(r => 
      r.tags && r.tags.some(tag => selectedTags.includes(tag))
    );
  }, [allResources, selectedTags]);
  
  // Track sub-subcategory view
  useEffect(() => {
    if (subSubcategoryName && !isLoading) {
      trackCategoryView(`${categoryName} > ${subcategoryName} > ${subSubcategoryName}`);
    }
  }, [subSubcategoryName, categoryName, subcategoryName, isLoading]);
  
  if (isLoading) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
      {/* SEO Head */}
      <SEOHead 
        title={`${subSubcategoryName} Resources - ${subcategoryName} - ${categoryName} - Awesome Video`}
        description={`Browse ${allResources.length} ${subSubcategoryName} resources in the ${subcategoryName} category.`}
      />
      
      {/* Header */}
      <div className="space-y-4">
        <Link href={parentSubcategory?.slug ? `/subcategory/${parentSubcategory.slug}` : "/"}>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-subcategory">
            <ArrowLeft className="h-4 w-4" />
            Back to {subcategoryName || "Home"}
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-subsubcategory">
              {subSubcategoryName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-breadcrumb">
              {categoryName} → {subcategoryName}
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2" data-testid="badge-count">
            {allResources.length}
          </Badge>
        </div>
      </div>
      
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
                {resource.tags && resource.tags.length > 0 && (
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
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
