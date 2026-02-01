import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AwesomeList, Category, Resource } from "@/types/awesome-list";
import SEOHead from "@/components/layout/SEOHead";
import AdvancedFilter from "@/components/ui/advanced-filter";
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
  const [location, setLocation] = useLocation();

  // Helper to get current URL search params
  const getSearchParams = () => new URLSearchParams(window.location.search);

  // Initialize state from URL params
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>(() => {
    const types = getSearchParams().get("resourceType");
    return types ? types.split(",") : [];
  });
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(() => {
    const difficulties = getSearchParams().get("difficulty");
    return difficulties ? difficulties.split(",") : [];
  });
  const [sortBy, setSortBy] = useState(() => getSearchParams().get("sortBy") || "category");

  // Fetch approved database resources (always fetch, React Query handles caching)
  const { data: dbData } = useQuery<{resources: any[], total: number}>({
    queryKey: ['/api/resources', { status: 'approved' }],
  });

  const dbResources = dbData?.resources || [];

  // Helper function to merge static and DB resources for a category
  const getCategoryResources = (category: Category): Resource[] => {
    const staticResources = category.resources;

    // Filter database resources for this category and map to Resource type
    const categoryDbResources = dbResources
      .filter(r => {
        const matchesName = r.category === category.name;
        const matchesSlug = r.category?.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-') === category.slug;
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

    return [...staticResources, ...categoryDbResources];
  };

  // Helper function to apply advanced filters to resources
  const applyAdvancedFilters = (resources: Resource[]): Resource[] => {
    let results = [...resources];

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

    return results;
  };

  const filteredCategories = useMemo(() => {
    if (!awesomeList?.categories) return [];

    return awesomeList.categories
      .filter(cat =>
        cat.resources.length > 0 &&
        cat.name !== "Table of contents" &&
        !cat.name.startsWith("List of") &&
        !["Contributing", "License", "External Links", "Anti-features"].includes(cat.name)
      )
      .map(cat => {
        const allResources = getCategoryResources(cat);
        const filtered = applyAdvancedFilters(allResources);
        return { ...cat, filteredCount: filtered.length };
      })
      .filter(cat => cat.filteredCount > 0); // Only show categories with matching resources
  }, [awesomeList?.categories, dbResources, selectedResourceTypes, selectedDifficulties]);

  // Calculate resource type counts
  const resourceTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCategories.forEach(category => {
      const categoryResources = applyAdvancedFilters(
        getCategoryResources(category)
      );
      categoryResources.forEach(resource => {
        const dbId = typeof resource.id === 'string' && resource.id.startsWith('db-')
          ? parseInt(resource.id.replace('db-', ''))
          : resource.id;
        const dbResource = dbResources.find(dr => dr.id === dbId);
        const resourceType = dbResource?.metadata?.resourceType;
        if (resourceType) {
          counts[resourceType] = (counts[resourceType] || 0) + 1;
        }
      });
    });
    return counts;
  }, [filteredCategories, dbResources, selectedResourceTypes, selectedDifficulties]);

  // Calculate difficulty counts
  const difficultyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCategories.forEach(category => {
      const categoryResources = applyAdvancedFilters(
        getCategoryResources(category)
      );
      categoryResources.forEach(resource => {
        const dbId = typeof resource.id === 'string' && resource.id.startsWith('db-')
          ? parseInt(resource.id.replace('db-', ''))
          : resource.id;
        const dbResource = dbResources.find(dr => dr.id === dbId);
        const difficulty = dbResource?.metadata?.difficulty;
        if (difficulty) {
          counts[difficulty] = (counts[difficulty] || 0) + 1;
        }
      });
    });
    return counts;
  }, [filteredCategories, dbResources, selectedResourceTypes, selectedDifficulties]);

  const calculateTotalCount = (category: Category & { filteredCount?: number }): number => {
    return category.filteredCount || category.resources.length;
  };
  
  const totalResourceCount = useMemo(() => {
    const staticCount = awesomeList?.resources.length || 0;
    const dbCount = dbData?.total || 0;
    return staticCount + dbCount;
  }, [awesomeList?.resources.length, dbData?.total]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedResourceTypes.length > 0) params.set("resourceType", selectedResourceTypes.join(","));
    if (selectedDifficulties.length > 0) params.set("difficulty", selectedDifficulties.join(","));
    if (sortBy && sortBy !== "category") params.set("sortBy", sortBy);

    const newSearch = params.toString();
    const newPath = `/${newSearch ? `?${newSearch}` : ""}`;

    // Only update if the path changed
    if (location !== newPath) {
      window.history.replaceState({}, "", newPath);
    }
  }, [selectedResourceTypes, selectedDifficulties, sortBy, location]);

  // Sync state from URL on popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = getSearchParams();
      const types = params.get("resourceType");
      setSelectedResourceTypes(types ? types.split(",") : []);
      const difficulties = params.get("difficulty");
      setSelectedDifficulties(difficulties ? difficulties.split(",") : []);
      setSortBy(params.get("sortBy") || "category");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy={true} aria-live="polite">
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
