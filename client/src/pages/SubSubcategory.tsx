import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ResourceCard from "@/components/ui/resource-card";
import ResourceListItem from "@/components/ui/resource-list-item";
import ResourceCompactItem from "@/components/ui/resource-compact-item";
import LayoutSwitcher, { LayoutType } from "@/components/ui/layout-switcher";
import Pagination from "@/components/ui/pagination";
import SEOHead from "@/components/layout/SEOHead";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { deslugify, getCategorySlug, cn } from "@/lib/utils";
import { Resource, AwesomeList } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView, trackFilterUsage, trackSortChange } from "@/lib/analytics";
import AnimatedResourceSkeleton from "@/components/ui/animated-resource-skeleton";
import { useBatchLazyLoading } from "@/hooks/use-lazy-loading";

export default function SubSubcategory() {
  const { slug } = useParams<{ slug: string }>();
  const [layout, setLayout] = useState<LayoutType>(() => {
    const saved = sessionStorage.getItem('awesome-layout');
    return (saved as LayoutType) || "cards";
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [sortBy, setSortBy] = useState("category"); // Match homepage default
  const [searchTerm, setSearchTerm] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Fetch awesome list data - use same query as homepage
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;
  
  // Find the current sub-subcategory and its resources
  let currentSubSubcategory = null;
  let parentCategory = null;
  let parentSubcategory = null;
  let baseResources: Resource[] = [];
  
  if (awesomeList && slug) {
    // Find matching sub-subcategory across all categories
    for (const category of awesomeList.categories) {
      for (const subcategory of category.subcategories || []) {
        if ((subcategory as any).subSubcategories) {
          for (const subSubcat of (subcategory as any).subSubcategories) {
            if (subSubcat.slug === slug) {
              currentSubSubcategory = subSubcat;
              parentCategory = category;
              parentSubcategory = subcategory;
              baseResources = subSubcat.resources;
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
  
  // Initialize lazy loading for resources using stable IDs
  const { visibleIds, registerItem } = useBatchLazyLoading(itemsPerPage);
  
  // Effect to handle initial loading state
  useEffect(() => {
    if (!isLoading && awesomeList) {
      setIsInitialLoading(false);
    }
  }, [isLoading, awesomeList]);
  
  // Effect to set itemsPerPage based on saved layout
  useEffect(() => {
    if (layout === 'cards') {
      setItemsPerPage(24);
    } else if (layout === 'list') {
      setItemsPerPage(50);
    } else {
      setItemsPerPage(40);
    }
  }, [layout]);
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('SubSubcategory Debug:', {
      slug,
      currentSubSubcategory: currentSubSubcategory?.name,
      parentCategory: parentCategory?.name,
      parentCategorySlug: parentCategory?.slug,
      parentSubcategory: parentSubcategory?.name,
      parentSubcategorySlug: parentSubcategory?.slug
    });
  }
  
  // Track sub-subcategory view
  useEffect(() => {
    if (subSubcategoryName && !isLoading) {
      trackCategoryView(`${categoryName} > ${subcategoryName} > ${subSubcategoryName}`);
    }
  }, [subSubcategoryName, categoryName, subcategoryName, isLoading]);

  // Handle sort change with analytics
  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    trackSortChange(sort);
  };

  // Handle search with analytics
  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
    if (search.length >= 2) {
      trackFilterUsage("search", search, filteredResources.length);
    }
  };
  
  // Filter resources by search term
  const filteredResources = baseResources.filter(resource => {
    const matchesSearch = searchTerm === "" || 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });
  
  // Sort resources
  const sortedResources = [...filteredResources].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.title.localeCompare(b.title);
      case "name-desc":
        return b.title.localeCompare(a.title);
      case "category":
        return a.category.localeCompare(b.category);
      default:
        return 0;
    }
  });
  
  // Generate stable resource IDs for tracking
  const generateResourceId = (resource: any) => {
    return `${resource.url}|${resource.title}`.replace(/[^a-zA-Z0-9|]/g, '-');
  };
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedResources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedResources = sortedResources.slice(startIndex, endIndex);

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setItemsPerPage(newPageSize);
    setCurrentPage(1);
  };
  
  // Handle layout change with persistence
  const handleLayoutChange = (newLayout: LayoutType) => {
    setLayout(newLayout);
    sessionStorage.setItem('awesome-layout', newLayout);
    
    // Adjust items per page based on layout
    if (newLayout === 'cards') {
      setItemsPerPage(24);
    } else if (newLayout === 'list') {
      setItemsPerPage(50);
    } else {
      setItemsPerPage(40);
    }
    
    setCurrentPage(1); // Reset to first page when changing layout
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
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
        description={`Browse ${sortedResources.length} ${subSubcategoryName} resources in the ${subcategoryName} category.`}
      />
      
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Link href={parentSubcategory?.slug ? `/subcategory/${parentSubcategory.slug}` : "/"}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {subcategoryName || "Home"}
            </Button>
          </Link>
        </div>
        
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {subSubcategoryName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {categoryName} → {subcategoryName}
          </p>
        </div>
        <p className="text-muted-foreground">
          Showing {sortedResources.length} of {baseResources.length} resources
        </p>
      </div>
      
      {/* Search and Controls - Match homepage layout */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search resources..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Layout Switcher */}
            <LayoutSwitcher
              currentLayout={layout}
              onLayoutChange={handleLayoutChange}
            />
            
            {/* Sort */}
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <Select
                value={sortBy}
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="w-32" data-testid="sort-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-testid="sort-select-content">
                  <SelectItem value="category" data-testid="sort-option-category">Category</SelectItem>
                  <SelectItem value="name-asc" data-testid="sort-option-name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc" data-testid="sort-option-name-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Resources Display - Match homepage layout */}
      {sortedResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? `No resources matching "${searchTerm}" in this sub-subcategory.` : 'There are no resources in this sub-subcategory.'}
          </p>
        </div>
      ) : (
        <>
          {/* Regular Resources Display with Loading States */}
          {isInitialLoading ? (
            <AnimatedResourceSkeleton
              count={Math.min(itemsPerPage, paginatedResources.length || itemsPerPage)}
              showTags={true}
              showMetrics={false}
            />
          ) : (
            <>
              {layout === "list" ? (
                <div className="space-y-1 mb-8">
                  {paginatedResources.map((resource, index) => {
                    const resourceId = generateResourceId(resource);
                    return (
                      <div
                        key={resourceId}
                        ref={(el) => registerItem(resourceId, el)}
                        className={cn(
                          "transition-opacity duration-300",
                          visibleIds.has(resourceId) ? "opacity-100" : "opacity-0"
                        )}
                      >
                        {visibleIds.has(resourceId) ? (
                          <ResourceListItem 
                            resource={resource}
                            index={startIndex + index}
                          />
                        ) : (
                          <div className="h-16 bg-muted rounded-lg animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : layout === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {paginatedResources.map((resource, index) => {
                    const resourceId = generateResourceId(resource);
                    return (
                      <div
                        key={resourceId}
                        ref={(el) => registerItem(resourceId, el)}
                        className={cn(
                          "transition-opacity duration-300",
                          visibleIds.has(resourceId) ? "opacity-100" : "opacity-0"
                        )}
                      >
                        {visibleIds.has(resourceId) ? (
                          <ResourceCard 
                            resource={resource}
                            index={startIndex + index}
                          />
                        ) : (
                          <div className="h-32 bg-muted rounded-lg animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                  {paginatedResources.map((resource, index) => {
                    const resourceId = generateResourceId(resource);
                    return (
                      <div
                        key={resourceId}
                        ref={(el) => registerItem(resourceId, el)}
                        className={cn(
                          "transition-opacity duration-300",
                          visibleIds.has(resourceId) ? "opacity-100" : "opacity-0"
                        )}
                      >
                        {visibleIds.has(resourceId) ? (
                          <ResourceCompactItem 
                            resource={resource}
                            index={index}
                          />
                        ) : (
                          <div className="h-24 bg-muted rounded-lg animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={itemsPerPage}
              onPageSizeChange={handlePageSizeChange}
              totalItems={sortedResources.length}
              pageSizeOptions={[12, 24, 48, 96]}
            />
          )}
        </>
      )}
    </div>
  );
}