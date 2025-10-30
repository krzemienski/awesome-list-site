import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/layout/SEOHead";
import { ArrowLeft } from "lucide-react";
import { deslugify, getCategorySlug } from "@/lib/utils";
import { Resource } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";

export default function Subcategory() {
  const { slug } = useParams<{ slug: string }>();
  
  // Fetch awesome list data - use same query as homepage
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;
  
  // Find the current subcategory and its resources
  let currentSubcategory = null;
  let parentCategory = null;
  let allResources: Resource[] = [];
  
  if (awesomeList && slug) {
    // Find matching subcategory across all categories
    for (const category of awesomeList.categories) {
      const subcategory = category.subcategories.find(sub => 
        sub.slug === slug
      );
      if (subcategory) {
        currentSubcategory = subcategory;
        parentCategory = category;
        
        // Collect all resources from this subcategory and its sub-subcategories
        allResources.push(...subcategory.resources);
        
        // Add sub-subcategory resources
        subcategory.subSubcategories?.forEach(subSub => {
          allResources.push(...subSub.resources);
        });
        
        break;
      }
    }
  }
  
  const subcategoryName = currentSubcategory ? currentSubcategory.name : deslugify(slug || "");
  const categoryName = parentCategory ? parentCategory.name : "";
  
  // Track subcategory view
  useEffect(() => {
    if (subcategoryName && !isLoading) {
      trackCategoryView(`${categoryName} > ${subcategoryName}`);
    }
  }, [subcategoryName, categoryName, isLoading]);
  
  if (isLoading) {
    return (
      <div className="space-y-6">
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
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {allResources.length}
          </Badge>
        </div>
      </div>
      
      {/* Resources Grid */}
      {allResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            There are no resources in this subcategory yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allResources.map((resource) => (
            <Card 
              key={resource.url}
              className="hover:bg-accent hover:text-accent-foreground transition-colors border border-border bg-card text-card-foreground"
              data-testid={`card-resource-${resource.url}`}
            >
              <CardHeader>
                <CardTitle className="text-lg">
                  <a 
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline"
                    data-testid={`link-resource-${resource.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {resource.title}
                  </a>
                </CardTitle>
                {resource.description && (
                  <CardDescription className="line-clamp-2">
                    {resource.description}
                  </CardDescription>
                )}
              </CardHeader>
              {resource.subSubcategory && (
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">{resource.subSubcategory}</Badge>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
