import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import AnimatedResourceSkeleton from "@/components/ui/animated-resource-skeleton";
import ResourceCard from "@/components/ui/resource-card";
import ResourceListItem from "@/components/ui/resource-list-item";
import ResourceCompactItem from "@/components/ui/resource-compact-item";
import LayoutSwitcher from "@/components/ui/layout-switcher";
import Pagination from "@/components/ui/pagination";
import SEOHead from "@/components/layout/SEOHead";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { deslugify, slugify, cn } from "@/lib/utils";
import { Resource, AwesomeList } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView, trackFilterUsage, trackSortChange } from "@/lib/analytics";
import { useBatchLazyLoading } from "@/hooks/use-lazy-loading";

type LayoutType = "cards" | "list" | "compact";

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [layout, setLayout] = useState<LayoutType>(() => {
    // Persist layout preference in sessionStorage
    const saved = sessionStorage.getItem('awesome-layout');
    return (saved as LayoutType) || "cards";
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [sortBy, setSortBy] = useState("category"); // Match homepage default
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [isFilterChanging, setIsFilterChanging] = useState(false);
  
  // Fetch awesome list data - use same query as homepage
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;
  
  // Find the current category and its resources
  const currentCategory = awesomeList?.categories.find(cat => 
    cat.slug === slug
  );
  
  const categoryName = currentCategory ? currentCategory.name : deslugify(slug || "");
  const baseResources = currentCategory ? currentCategory.resources : [];
  
  // Initialize lazy loading for resources
  const { visibleItems, registerItem } = useBatchLazyLoading(itemsPerPage);
  
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
  
  // Track category view
  useEffect(() => {
    if (categoryName && !isLoading) {
      trackCategoryView(categoryName);
    }
  }, [categoryName, isLoading]);

  // Handle category change with analytics
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category !== "all") {
      trackCategoryView(category);
      trackFilterUsage("category", category, filteredResources.length);
    }
  };

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

  // Handle subcategory filter change
  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setCurrentPage(1); // Reset to first page
    if (subcategory !== "all") {
      trackFilterUsage("subcategory", subcategory, filteredResources.length);
    }
  };
  
  // Filter resources by search term and subcategory
  const filteredResources = baseResources.filter(resource => {
    const matchesSearch = searchTerm === "" || 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubcategory = selectedSubcategory === "all" || 
      resource.subcategory === selectedSubcategory;
    
    return matchesSearch && matchesSubcategory;
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
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedResources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedResources = sortedResources.slice(startIndex, endIndex);

  // Handle page changes
  const handlePageChange = (page: number) => {
    setIsPageChanging(true);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setIsPageChanging(false), 300);
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
          <Skeleton className="h-5 w-48" />
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(9).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Error Loading Category</h2>
        <p className="text-muted-foreground">There was an error loading the category data.</p>
      </div>
    );
  }
  
  if (!currentCategory && !isLoading) {
    return <NotFound />;
  }
  
  return (
    <div className="space-y-6">
      {/* SEO Head */}
      <SEOHead 
        title={`${categoryName} Resources - Awesome Video`}
        description={`Browse ${sortedResources.length} video development resources in the ${categoryName} category.`}
      />
      
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight">
          {categoryName}
        </h1>
        <p className="text-muted-foreground">
          Showing {sortedResources.length} of {sortedResources.length} resources
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

            {/* Subcategory Filter */}
            {currentCategory && currentCategory.subcategories.length > 0 && (
              <div className="flex gap-2 items-center">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter:</span>
                <Select
                  value={selectedSubcategory}
                  onValueChange={handleSubcategoryChange}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All subcategories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All subcategories</SelectItem>
                    {currentCategory.subcategories.map((subcategory) => (
                      <SelectItem key={subcategory.slug} value={subcategory.name}>
                        {subcategory.name} ({subcategory.resources.length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
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
            {searchTerm ? `No resources matching "${searchTerm}" in this category.` : 'There are no resources in this category.'}
          </p>
        </div>
      ) : (
        <>
          {/* Regular Resources Display with Loading States */}
          {(isInitialLoading || isPageChanging) ? (
            <AnimatedResourceSkeleton
              count={Math.min(itemsPerPage, paginatedResources.length || itemsPerPage)}
              showTags={true}
              showMetrics={false}
            />
          ) : (
            <>
              {layout === "list" ? (
                <div className="space-y-1 mb-8">
                  {paginatedResources.map((resource, index) => (
                    <div
                      key={`${resource.title}-${resource.url}-${index}`}
                      ref={(el) => registerItem(index, el)}
                      className={cn(
                        "transition-opacity duration-300",
                        visibleItems.has(index) ? "opacity-100" : "opacity-0"
                      )}
                    >
                      {visibleItems.has(index) ? (
                        <ResourceListItem 
                          resource={resource}
                          index={startIndex + index}
                        />
                      ) : (
                        <div className="h-16" />
                      )}
                    </div>
                  ))}
                </div>
              ) : layout === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {paginatedResources.map((resource, index) => (
                    <div
                      key={`${resource.title}-${resource.url}-${index}`}
                      ref={(el) => registerItem(index, el)}
                      className={cn(
                        "transition-opacity duration-300",
                        visibleItems.has(index) ? "opacity-100" : "opacity-0"
                      )}
                    >
                      {visibleItems.has(index) ? (
                        <ResourceCard 
                          resource={resource}
                          index={startIndex + index}
                        />
                      ) : (
                        <div className="h-32" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                  {paginatedResources.map((resource, index) => (
                    <div
                      key={`${resource.title}-${resource.url}-${index}`}
                      ref={(el) => registerItem(index, el)}
                      className={cn(
                        "transition-opacity duration-300",
                        visibleItems.has(index) ? "opacity-100" : "opacity-0"
                      )}
                    >
                      {visibleItems.has(index) ? (
                        <ResourceCompactItem 
                          resource={resource}
                          index={startIndex + index}
                        />
                      ) : (
                        <div className="h-24" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
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