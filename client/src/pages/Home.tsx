import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ResourceCard from "@/components/ui/resource-card";
import { AwesomeList } from "@/types/awesome-list";
import { Helmet } from "react-helmet";

interface HomeProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
}

export default function Home({ awesomeList, isLoading }: HomeProps) {
  const [featuredResources, setFeaturedResources] = useState<any[]>([]);
  
  // Select resources to show on home page (first 12 from different categories)
  useEffect(() => {
    if (awesomeList?.resources && awesomeList.resources.length > 0) {
      const seen = new Set<string>();
      const featured = [];
      
      // Get unique resources from different categories (up to 12)
      for (const resource of awesomeList.resources) {
        const key = `${resource.category}-${resource.subcategory || ''}`;
        if (!seen.has(key) && featured.length < 12) {
          seen.add(key);
          featured.push(resource);
        }
        
        if (featured.length >= 12) break;
      }
      
      setFeaturedResources(featured);
    } else {
      setFeaturedResources([]);
    }
  }, [awesomeList]);
  
  return (
    <div className="flex flex-col">
      {/* SEO Head */}
      <Helmet>
        <title>{awesomeList?.title || "Awesome List"}</title>
        <meta name="description" content={awesomeList?.description || "A curated list of awesome resources"} />
        <meta property="og:title" content={awesomeList?.title || "Awesome List"} />
        <meta property="og:description" content={awesomeList?.description || "A curated list of awesome resources"} />
      </Helmet>
      
      {isLoading ? (
        <>
          <Skeleton className="h-12 w-3/4 mb-2" />
          <Skeleton className="h-6 w-full mb-8" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-muted-foreground mb-8">
            {awesomeList?.description || "A curated list of awesome resources"}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {featuredResources.map((resource, index) => (
              <ResourceCard 
                key={`${resource.title}-${resource.url}`} 
                resource={resource}
                index={index}
              />
            ))}
          </div>
          
          {awesomeList?.categories && awesomeList.categories.length > 0 ? (
            awesomeList.categories.map((category) => (
              <div key={category.name} className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{category.name}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.resources && category.resources.slice(0, 3).map((resource, index) => (
                    <ResourceCard 
                      key={`${resource.title}-${resource.url}`} 
                      resource={resource}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No categories available</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
