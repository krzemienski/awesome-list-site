import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AwesomeList, Category } from "@/types/awesome-list";
import SEOHead from "@/components/layout/SEOHead";
import {
  FileText,
  Video,
  Code,
  Play,
  Settings,
  Package,
  Server,
  Layers,
  Users,
} from "lucide-react";

interface HomeProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
}

const categoryIcons: { [key: string]: any } = {
  "Intro & Learning": FileText,
  "Protocols & Transport": Server,
  "Encoding & Codecs": Code,
  "Players & Clients": Play,
  "Media Tools": Settings,
  "Standards & Industry": Package,
  "Infrastructure & Delivery": Layers,
  "General Tools": Settings,
  "Community & Events": Users,
};

export default function Home({ awesomeList, isLoading }: HomeProps) {
  // Fetch approved database resources (always fetch, React Query handles caching)
  const { data: dbData } = useQuery<{resources: any[], total: number}>({
    queryKey: ['/api/resources', { status: 'approved' }],
  });
  
  const dbResources = dbData?.resources || [];
  
  const filteredCategories = useMemo(() => {
    if (!awesomeList?.categories) return [];
    
    return awesomeList.categories.filter(cat => 
      cat.resources.length > 0 && 
      cat.name !== "Table of contents" && 
      !cat.name.startsWith("List of") &&
      !["Contributing", "License", "External Links", "Anti-features"].includes(cat.name)
    );
  }, [awesomeList?.categories]);

  const calculateTotalCount = (category: Category): number => {
    const staticCount = category.resources.length;
    // Note: DB resources are fetched with pagination, so we can't accurately count per-category
    // from the paginated results. Using static count only for category cards.
    return staticCount;
  };
  
  const totalResourceCount = useMemo(() => {
    const staticCount = awesomeList?.resources.length || 0;
    const dbCount = dbData?.total || 0;
    return staticCount + dbCount;
  }, [awesomeList?.resources.length, dbData?.total]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SEOHead title="Loading - Awesome Video Resources" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-6 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!awesomeList) {
    return (
      <div className="space-y-6">
        <SEOHead title="Error - Awesome Video Resources" />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Resources</h1>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEOHead 
        title="Awesome Video Resources - 2,000+ Curated Development Tools"
        description="Discover 2,000+ curated video development resources including codecs, players, tools, and libraries. Find the perfect solution for your video project."
      />
      
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Awesome Video Resources
        </h1>
        <p className="text-muted-foreground">
          Explore {filteredCategories.length} categories with {totalResourceCount} curated resources
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => {
          const Icon = categoryIcons[category.name] || FileText;
          const totalCount = calculateTotalCount(category);
          
          const firstResource = category.resources[0];
          const description = firstResource?.description 
            ? firstResource.description.length > 100 
              ? `${firstResource.description.substring(0, 100)}...` 
              : firstResource.description
            : '';
          
          return (
            <Link 
              key={category.slug} 
              href={`/category/${category.slug}`}
              aria-label={`View ${category.name} category with ${totalCount} resources`}
              data-testid={`link-category-${category.slug}`}
            >
              <Card 
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors border border-border bg-card text-card-foreground"
                data-testid={`card-category-${category.slug}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6" />
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-count-${category.slug}`}>{totalCount}</Badge>
                  </div>
                  {description && (
                    <CardDescription className="text-sm">
                      {description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
