import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ResourceCard from "@/components/ui/resource-card";
import { deslugify } from "@/lib/utils";
import { Resource, AwesomeList } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { Helmet } from "react-helmet";

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [resources, setResources] = useState<Resource[]>([]);
  const [categoryName, setCategoryName] = useState("");
  
  // Fetch awesome list data
  const { data: awesomeList, isLoading, error } = useQuery<AwesomeList>({
    queryKey: ["/api/awesome-list"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Filter resources by category
  useEffect(() => {
    if (awesomeList && slug) {
      const category = awesomeList.categories.find(
        (cat) => cat.slug === slug
      );
      
      if (category) {
        setCategoryName(category.name);
        setResources(category.resources);
      }
    }
  }, [awesomeList, slug]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Skeleton className="h-12 w-1/2 mb-2" />
        <Skeleton className="h-6 w-3/4 mb-8" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(9).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!categoryName && !isLoading) {
    return <NotFound />;
  }
  
  return (
    <div className="flex flex-col">
      {/* SEO Head */}
      <Helmet>
        <title>{categoryName} - {awesomeList?.title || "Awesome List"}</title>
        <meta 
          name="description" 
          content={`Browse ${resources.length} resources in the ${categoryName} category of ${awesomeList?.title || "Awesome List"}`} 
        />
      </Helmet>
      
      <h1 className="text-3xl font-bold tracking-tight mb-4">
        {categoryName}
      </h1>
      <p className="text-muted-foreground mb-8">
        {resources.length} {resources.length === 1 ? 'resource' : 'resources'} in this category
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
          <p className="text-muted-foreground">There are no resources in this category.</p>
        </div>
      )}
    </div>
  );
}
