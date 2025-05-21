import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ResourceCard from "@/components/ui/resource-card";
import { deslugify } from "@/lib/utils";
import { Resource, AwesomeList } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { Helmet } from "react-helmet";

export default function Subcategory() {
  const { slug } = useParams<{ slug: string }>();
  const [resources, setResources] = useState<Resource[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  
  // Fetch awesome list data
  const { data: awesomeList, isLoading, error } = useQuery<AwesomeList>({
    queryKey: ["/api/awesome-list"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Filter resources by subcategory
  useEffect(() => {
    if (awesomeList && slug) {
      for (const category of awesomeList.categories) {
        for (const subcategory of category.subcategories) {
          const fullSlug = `${category.slug}-${subcategory.slug}`;
          if (fullSlug === slug) {
            setCategoryName(category.name);
            setSubcategoryName(subcategory.name);
            setResources(subcategory.resources);
            return;
          }
        }
      }
    }
  }, [awesomeList, slug]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Skeleton className="h-12 w-1/2 mb-2" />
        <Skeleton className="h-6 w-3/4 mb-8" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!subcategoryName && !isLoading) {
    return <NotFound />;
  }
  
  return (
    <div className="flex flex-col">
      {/* SEO Head */}
      <Helmet>
        <title>{subcategoryName} - {categoryName} - {awesomeList?.title || "Awesome List"}</title>
        <meta 
          name="description" 
          content={`Browse ${resources.length} ${subcategoryName} resources in the ${categoryName} category of ${awesomeList?.title || "Awesome List"}`} 
        />
      </Helmet>
      
      <div className="flex flex-col items-start gap-1 mb-4">
        <h1 className="text-3xl font-bold tracking-tight">
          {subcategoryName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Category: {categoryName}
        </p>
      </div>
      <p className="text-muted-foreground mb-8">
        {resources.length} {resources.length === 1 ? 'resource' : 'resources'} in this subcategory
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource, index) => (
          <ResourceCard 
            key={`${resource.title}-${resource.url}`} 
            resource={resource}
            index={index}
          />
        ))}
      </div>
      
      {resources.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground">There are no resources in this subcategory.</p>
        </div>
      )}
    </div>
  );
}
