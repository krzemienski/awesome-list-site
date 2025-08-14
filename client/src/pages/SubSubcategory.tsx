import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Star, User, Calendar, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SEOHead from "@/components/layout/SEOHead";
import ResourceCard from "@/components/ui/resource-card";
import LayoutSwitcher from "@/components/ui/layout-switcher";
import { useState } from "react";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { Resource } from "@/types/awesome-list";


interface SubSubcategoryPageProps {
  params: { slug: string };
}

export default function SubSubcategory() {
  const [, params] = useRoute("/sub-subcategory/:slug");
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"cards" | "list" | "compact">("list");
  const subSubcategorySlug = params?.slug;

  // Fetch awesome list data
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;

  // Find the sub-subcategory and its resources
  let subSubcategory: { name: string; slug: string; resources: Resource[] } | null = null;
  let parentCategory: { name: string; slug: string } | null = null;
  let parentSubcategory: { name: string; slug: string } | null = null;

  if (awesomeList && subSubcategorySlug) {
    // Search through all categories to find the sub-subcategory
    for (const category of awesomeList.categories) {
      for (const subcategory of category.subcategories || []) {
        if ((subcategory as any).subSubcategories) {
          for (const subSubcat of (subcategory as any).subSubcategories) {
            if (subSubcat.slug === subSubcategorySlug) {
              subSubcategory = subSubcat;
              parentCategory = { name: category.name, slug: category.slug };
              parentSubcategory = { name: subcategory.name, slug: subcategory.slug };
              break;
            }
          }
        }
        if (subSubcategory) break;
      }
      if (subSubcategory) break;
    }
  }

  if (isLoading) {
    return (
      <>
        <SEOHead 
          title={`Loading... | ${awesomeList?.title || 'Awesome List'}`}
          description="Loading sub-subcategory resources..."
          keywords="loading, resources, development"
        />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !subSubcategory) {
    return (
      <>
        <SEOHead 
          title={`Not Found | ${awesomeList?.title || 'Awesome List'}`}
          description="Sub-subcategory not found"
          keywords="not found, error, resources"
        />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertDescription>
              {error ? "Error loading data" : "Sub-subcategory not found"}
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title={`${subSubcategory.name} Resources | ${awesomeList?.title || 'Awesome List'}`}
        description={`Explore ${subSubcategory.resources.length} curated ${subSubcategory.name.toLowerCase()} resources for developers`}
        keywords={`${subSubcategory.name.toLowerCase()}, development resources, ${parentCategory?.name.toLowerCase()}, ${parentSubcategory?.name.toLowerCase()}`}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Navigation Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/')}
              className="p-0 h-auto hover:underline"
            >
              Home
            </Button>
            <span>/</span>
            {parentCategory && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLocation(`/category/${parentCategory.slug}`)}
                  className="p-0 h-auto hover:underline"
                >
                  {parentCategory.name}
                </Button>
                <span>/</span>
              </>
            )}
            {parentSubcategory && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLocation(`/subcategory/${parentSubcategory.slug}`)}
                  className="p-0 h-auto hover:underline"
                >
                  {parentSubcategory.name}
                </Button>
                <span>/</span>
              </>
            )}
            <span className="font-medium text-foreground">{subSubcategory.name}</span>
          </div>

          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => history.back()}
                className="shrink-0"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{subSubcategory.name} Resources</h1>
                <p className="text-muted-foreground mt-1">
                  {subSubcategory.resources.length} curated resources in {subSubcategory.name.toLowerCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {subSubcategory.resources.length} resources
                </Badge>
                {parentCategory && (
                  <Badge variant="outline" className="text-sm">
                    {parentCategory.name}
                  </Badge>
                )}
                {parentSubcategory && (
                  <Badge variant="outline" className="text-sm">
                    {parentSubcategory.name}
                  </Badge>
                )}
              </div>
              
              <LayoutSwitcher 
                currentLayout={viewMode}
                onLayoutChange={setViewMode}
              />
            </div>
          </div>

          {/* Resources */}
          {subSubcategory.resources.length > 0 ? (
            <div className={
              viewMode === "cards" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : viewMode === "list"
                ? "space-y-4"
                : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
            }>
              {subSubcategory.resources.map((resource) => (
                <ResourceCard 
                  key={resource.id} 
                  resource={resource}
                />
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No resources found in this sub-subcategory.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </>
  );
}